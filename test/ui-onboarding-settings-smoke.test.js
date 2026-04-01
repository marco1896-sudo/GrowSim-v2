#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const HOST = '0.0.0.0';
const CLIENT_HOST = '127.0.0.1';
const PORT = 4176;

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const byExt = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.webp': 'image/webp'
  };
  return byExt[ext] || 'application/octet-stream';
}

function createStaticServer(rootDir) {
  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const relativePath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const safeRelativePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(rootDir, safeRelativePath);

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(error.code === 'ENOENT' ? 404 : 500);
        res.end(error.code === 'ENOENT' ? 'Not found' : 'Internal server error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
      res.end(data);
    });
  });
}

async function clearClientStorage(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.removeItem('grow-sim-state-v2');
    sessionStorage.clear();

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('indexedDB' in window) {
      await new Promise((resolve) => {
        const request = indexedDB.open('grow-sim-db', 1);
        request.onerror = () => resolve();
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('kv')) {
            db.createObjectStore('kv');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          try {
            const tx = db.transaction('kv', 'readwrite');
            const store = tx.objectStore('kv');
            store.delete('state-v2');
            tx.oncomplete = tx.onerror = tx.onabort = () => {
              db.close();
              resolve();
            };
          } catch (_error) {
            db.close();
            resolve();
          }
        };
      });
    }
  });
}

async function waitForBoot(page) {
  await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: 10000 });
}

async function expectDisabled(page, selector) {
  const state = await page.locator(selector).evaluate((node) => ({
    disabled: Boolean(node.disabled),
    ariaDisabled: node.getAttribute('aria-disabled')
  }));

  assert.strictEqual(state.disabled, true, `${selector} should be disabled`);
  assert.strictEqual(state.ariaDisabled, 'true', `${selector} should expose disabled state`);
}

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    const url = `http://${CLIENT_HOST}:${PORT}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBoot(page);
    await clearClientStorage(page);
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBoot(page);

    const landingState = await page.locator('#landing').evaluate((node) => ({
      hasHiddenClass: node.classList.contains('hidden'),
      ariaHidden: node.getAttribute('aria-hidden')
    }));
    assert.strictEqual(landingState.hasHiddenClass, false, 'landing overlay should be visible before the first run');
    assert.strictEqual(landingState.ariaHidden, 'false', 'landing overlay should expose its visible state');

    const hudState = await page.locator('#app-hud').evaluate((node) => ({
      ariaHidden: node.getAttribute('aria-hidden'),
      inert: Boolean(node.inert),
      blocked: node.classList.contains('app-hud--blocked')
    }));
    assert.strictEqual(hudState.ariaHidden, 'true', 'hud should be hidden from assistive tech while onboarding is open');
    assert.ok(hudState.inert || hudState.blocked, 'hud should not be interactable while onboarding is open');

    await expectDisabled(page, '#setupBackBtn');
    await expectDisabled(page, '#setupPresetBtn');

    await page.click('#startRunBtn');
    await page.waitForFunction(() => document.getElementById('landing').classList.contains('hidden'));

    await page.evaluate(() => {
      state.ui.openSheet = 'diagnosis';
      renderAll();
    });
    await page.waitForFunction(() => {
      const node = document.getElementById('diagnosisSheet');
      return node && !node.classList.contains('hidden');
    });

    const cloudSync = await page.locator('#settingsCloudSyncValue').evaluate((node) => ({
      text: node.textContent.trim(),
      className: node.className,
      title: node.getAttribute('title')
    }));
    assert.strictEqual(cloudSync.text, 'Lokal', 'settings should describe persistence as local-only');
    assert.ok(cloudSync.className.includes('value_gold'), 'local-only persistence should not be styled as connected');
    assert.strictEqual(cloudSync.title, 'Speicherung erfolgt aktuell nur lokal im Browser.', 'storage status should explain the local-only persistence path');

    const runtimeSettings = await page.evaluate(() => ({
      simSpeed: document.getElementById('settingsSimSpeedValue')?.textContent.trim() || null,
      eventWindow: document.getElementById('settingsEventFrequencyValue')?.textContent.trim() || null,
      tutorial: document.getElementById('settingsTutorialValue')?.textContent.trim() || null,
      autosave: document.getElementById('settingsAutosaveValue')?.textContent.trim() || null,
      volume: document.getElementById('settingsVolumeValue')?.textContent.trim() || null
    }));
    assert.ok(
      runtimeSettings.simSpeed === 'Basis 12x · Aktiv 12x' || runtimeSettings.simSpeed === 'Basis 12x Â· Aktiv 12x',
      `simulation speed should reflect base and active runtime state, got: ${runtimeSettings.simSpeed}`
    );
    assert.strictEqual(runtimeSettings.eventWindow, 'Fix 30-90m', 'event frequency should reflect the fixed runtime window');
    assert.strictEqual(runtimeSettings.tutorial, 'Vorbereitet', 'tutorial setting should be marked as prepared only');
    assert.strictEqual(runtimeSettings.autosave, 'Lokal 3s', 'autosave should reflect the local persistence interval');
    assert.strictEqual(runtimeSettings.volume, 'Vorbereitet', 'audio settings should be marked as prepared only');

    await page.click('#diagnosisSheet [data-close-sheet]');
    await page.click('#menuToggleBtn');

    const menuState = await page.evaluate(() => ({
      statsLabel: document.querySelector('#menuStatsBtn span')?.textContent.trim() || null,
      rescueLabel: document.querySelector('#menuRescueBtn span')?.textContent.trim() || null,
      rescueSubtitle: document.querySelector('#menuRescueBtn small')?.textContent.trim() || null,
      rescueTitle: document.getElementById('menuRescueBtn')?.getAttribute('title') || null,
      statsTitle: document.getElementById('menuStatsBtn')?.getAttribute('title') || null,
      missionsSubtitle: document.querySelector('#menuSupportBtn small')?.textContent.trim() || null,
      aboutLabel: document.querySelector('#menuAboutBtn span')?.textContent.trim() || null,
      quickHomeDisabled: Boolean(document.getElementById('menuAchievementsBtn')?.disabled),
      quickOpsDisabled: Boolean(document.getElementById('menuLeaderboardBtn')?.disabled),
      quickHomeTitle: document.getElementById('menuAchievementsBtn')?.getAttribute('title') || null,
      resetTitle: document.getElementById('analysisResetBtn')?.getAttribute('title') || null
    }));
    assert.strictEqual(menuState.statsLabel, 'Analyse', 'menu analysis entry should describe the actual dashboard path');
    assert.strictEqual(menuState.statsTitle, 'Öffnet denselben Analyse-Report wie Analyse-Button und Death-Flow.', 'menu analysis entry should explain the shared report path');
    assert.strictEqual(menuState.rescueLabel, 'Notfallrettung', 'menu rescue entry should describe the actual rescue mechanic');
    assert.strictEqual(menuState.rescueSubtitle, '1× pro Run bei kritischem Zustand.', 'menu rescue subtitle should describe the actual availability');
    assert.strictEqual(menuState.rescueTitle, 'Kein Inventarsystem. Startet die gleiche einmalige Notfallrettung wie im Death-Overlay.', 'menu rescue entry should explain that it is the same rescue path');
    assert.strictEqual(menuState.missionsSubtitle, 'Missionen & Fortschritt', 'missions entry should describe the real missions sheet');
    assert.strictEqual(menuState.aboutLabel, 'Projektinfo', 'about entry should not pretend to be a full tutorial');
    assert.strictEqual(menuState.quickHomeDisabled, true, 'prepared quick action should be non-interactive');
    assert.strictEqual(menuState.quickOpsDisabled, true, 'prepared quick action should be non-interactive');
    assert.strictEqual(menuState.quickHomeTitle, 'Vorbereitet, aktuell ohne Funktion.', 'prepared quick action should explain its status');
    assert.strictEqual(menuState.resetTitle, 'Setzt den aktuellen Run nach Bestätigung vollständig zurück.', 'reset action should describe its destructive scope');

    await page.click('#menuStatsBtn');
    await page.waitForFunction(() => {
      const node = document.getElementById('dashboardSheet');
      return node && !node.classList.contains('hidden');
    });
    const analysisState = await page.evaluate(() => ({
      subtitle: document.querySelector('#dashboardSheet .figma-top-player-subtitle')?.textContent.trim() || null,
      overviewLabel: document.getElementById('analysisTabOverview')?.textContent.trim() || null,
      diagnosisLabel: document.getElementById('analysisTabDiagnosis')?.textContent.trim() || null,
      timelineLabel: document.getElementById('analysisTabTimeline')?.textContent.trim() || null,
      timelineTitle: document.getElementById('analysisTabTimeline')?.getAttribute('title') || null
    }));
    assert.strictEqual(analysisState.subtitle, 'Run-Report & Verlauf', 'analysis sheet should describe the real report scope');
    assert.strictEqual(analysisState.overviewLabel, 'Report', 'overview tab should remain the report entry');
    assert.strictEqual(analysisState.diagnosisLabel, 'Treiber', 'diagnosis tab should describe driver analysis instead of filters');
    assert.strictEqual(analysisState.timelineLabel, 'Verlauf', 'timeline tab should not promise export');
    assert.strictEqual(analysisState.timelineTitle, 'Kein Dateiexport. Zeigt den letzten protokollierten Run-Verlauf.', 'timeline tab should explain its real scope');

    await page.click('#analysisTabTimeline');
    await page.waitForFunction(() => document.getElementById('analysisPanelTimeline') && !document.getElementById('analysisPanelTimeline').classList.contains('hidden'));
    const timelinePanelTitle = await page.evaluate(() => document.getElementById('analysisPanelTimeline')?.getAttribute('title') || null);
    assert.strictEqual(timelinePanelTitle, 'Zeigt die letzten protokollierten Aktionen, Ereignisse und Systemeintraege. Kein Dateiexport.', 'timeline panel should describe the real history view');
    await page.click('#dashboardSheet [data-close-sheet]');

    await page.click('#menuToggleBtn');
    await page.click('#menuRescueBtn');
    const rescueStatus = await page.evaluate(() => ({
      subtitle: document.getElementById('menuRescueSubtext')?.textContent.trim() || null,
      deathVisible: document.getElementById('deathOverlay')?.classList.contains('hidden') === false
    }));
    assert.strictEqual(rescueStatus.subtitle, 'Notfallrettung ist aktuell nicht erforderlich.', 'menu rescue should report the same no-op message as the rescue runtime path');
    assert.strictEqual(rescueStatus.deathVisible, false, 'menu rescue should not open the death overlay when the run is not critical');

    await page.click('#menuLanguageBtn');
    await page.waitForFunction(() => {
      const node = document.getElementById('diagnosisSheet');
      return node && !node.classList.contains('hidden');
    });
    await page.click('#diagnosisSheet [data-close-sheet]');

    await page.click('#menuToggleBtn');
    await page.click('#menuSupportBtn');
    await page.waitForFunction(() => {
      const node = document.getElementById('missionsSheet');
      return node && !node.classList.contains('hidden');
    });
    await page.click('#missionsSheet [data-close-sheet]');

    await page.reload({ waitUntil: 'networkidle' });
    await waitForBoot(page);

    const transientUiState = await page.evaluate(() => ({
      menuOpen: document.getElementById('gameMenu').classList.contains('hidden') === false,
      dialogOpen: document.getElementById('menuDialog').classList.contains('hidden') === false,
      landingVisible: document.getElementById('landing').classList.contains('hidden') === false
    }));
    assert.strictEqual(transientUiState.menuOpen, false, 'menu should not restore as open after reload');
    assert.strictEqual(transientUiState.dialogOpen, false, 'menu dialog should not restore as open after reload');
    assert.strictEqual(transientUiState.landingVisible, false, 'landing should stay hidden after a restored run');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('ui onboarding/settings smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
