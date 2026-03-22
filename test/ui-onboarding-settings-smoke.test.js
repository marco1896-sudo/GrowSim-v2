#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = 4174;

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
    sessionStorage.clear();

    if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
      const databases = await indexedDB.databases();
      await Promise.all(
        databases
          .map((entry) => entry && entry.name)
          .filter(Boolean)
          .map((name) => new Promise((resolve) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = request.onerror = request.onblocked = () => resolve();
          }))
      );
    }
  });
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
    const url = `http://${HOST}:${PORT}/`;
    await page.goto(url);
    await clearClientStorage(page);
    await page.goto(url, { waitUntil: 'networkidle' });

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

    await page.click('#openDiagnosisBtn');
    await page.waitForFunction(() => {
      const node = document.getElementById('diagnosisSheet');
      return node && !node.classList.contains('hidden');
    });

    const cloudSync = await page.locator('#settingsCloudSyncValue').evaluate((node) => ({
      text: node.textContent.trim(),
      className: node.className
    }));
    assert.strictEqual(cloudSync.text, 'Lokal', 'settings should describe persistence as local-only');
    assert.ok(cloudSync.className.includes('value_gold'), 'local-only persistence should not be styled as connected');

    await page.click('#diagnosisSheet [data-close-sheet]');
    await page.click('#menuToggleBtn');
    await page.click('#menuSupportBtn');
    await page.reload({ waitUntil: 'networkidle' });

    const transientUiState = await page.evaluate(() => ({
      menuOpen: document.getElementById('gameMenu').classList.contains('hidden') === false,
      dialogOpen: document.getElementById('menuDialog').classList.contains('hidden') === false
    }));
    assert.strictEqual(transientUiState.menuOpen, false, 'menu should not restore as open after reload');
    assert.strictEqual(transientUiState.dialogOpen, false, 'menu dialog should not restore as open after reload');
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
