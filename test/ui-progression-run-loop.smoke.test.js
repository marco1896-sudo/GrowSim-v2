#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const HOST = '0.0.0.0';
const PORT = 4178;

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
        const request = indexedDB.deleteDatabase('grow-sim-db');
        request.onerror = request.onsuccess = request.onblocked = () => resolve();
      });
    }
  });
}

async function waitForBoot(page) {
  await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: 15000 });
}

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    const url = `http://${HOST}:${PORT}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBoot(page);
    await clearClientStorage(page);
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBoot(page);

    for (const selector of [
      '[data-setup-select="setupGenetics"][data-setup-value="indica"]',
      '[data-setup-select="setupMode"][data-setup-value="outdoor"]',
      '[data-setup-select="setupMedium"][data-setup-value="coco"]',
      '[data-setup-select="setupLight"][data-setup-value="high"]'
    ]) {
      const disabled = await page.locator(selector).evaluate((node) => ({
        disabled: Boolean(node.disabled),
        ariaDisabled: node.getAttribute('aria-disabled')
      }));
      assert.strictEqual(disabled.disabled, true, `${selector} should start locked`);
      assert.strictEqual(disabled.ariaDisabled, 'true', `${selector} should expose locked state`);
    }

    const initialStrategyPreview = await page.evaluate(() => ({
      title: document.getElementById('setupStrategyTitle').textContent.trim(),
      tag: document.getElementById('setupStrategyTag').textContent.trim(),
      loadout: document.getElementById('setupStrategyLoadout').textContent.trim()
    }));
    assert.ok(initialStrategyPreview.title.length > 0, 'start flow should show a strategy title');
    assert.ok(initialStrategyPreview.tag.length > 0, 'start flow should show a strategy tag');
    assert.ok(initialStrategyPreview.loadout.length > 0, 'start flow should show a readable loadout summary');

    await page.click('#startRunBtn');
    await page.waitForFunction(() => window.getCanonicalRun().status === 'active');
    const runGoalHud = await page.evaluate(() => ({
      goalId: window.getCanonicalRun().goal && window.getCanonicalRun().goal.id,
      hidden: document.getElementById('homeMetaToggle').classList.contains('hidden'),
      title: document.getElementById('homeMetaGoalCompact').textContent.trim(),
      progress: document.getElementById('homeMetaGoalProgress').textContent.trim(),
      status: document.getElementById('homeMetaGoalStatus').textContent.trim(),
      level: document.getElementById('playerLevelBadge').textContent.trim(),
      xp: document.getElementById('playerXpValue').textContent.trim(),
      playerName: document.getElementById('playerNameValue').textContent.trim(),
      playerRole: document.getElementById('playerRoleValue').textContent.trim()
    }));
    assert.ok(runGoalHud.goalId, 'run start should assign a goal into run state');
    assert.strictEqual(runGoalHud.hidden, false, 'goal strip should be visible during an active run');
    assert.ok(runGoalHud.title.length > 0, 'goal strip should show a title');
    assert.ok(runGoalHud.progress.length > 0, 'goal strip should show progress text');
    assert.ok(runGoalHud.status.length > 0, 'goal strip should show status text');
    assert.ok(runGoalHud.level.length > 0, 'player card should show the current level');
    assert.ok(runGoalHud.xp.length > 0, 'player card should show XP progress');
    assert.ok(runGoalHud.playerName.length > 0, 'player card should show the player name');
    assert.ok(runGoalHud.playerRole.length > 0, 'player card should show the player role');

    await page.evaluate(() => {
      const s = window.__gsState;
      s.status.health = 0;
      s.plant.isDead = true;
      s.plant.phase = 'dead';
      syncCanonicalStateShape();
      renderAll();
    });
    await page.waitForFunction(() => window.getCanonicalRun().status === 'downed');
    await page.waitForFunction(() => !document.getElementById('deathOverlay').classList.contains('hidden'));

    await page.click('#deathRescueBtn');
    await page.waitForFunction(() => window.getCanonicalRun().status === 'active');
    const postRescue = await page.evaluate(() => ({
      xp: window.getCanonicalProfile().totalXp,
      summary: window.getCanonicalProfile().lastRunSummary,
      deathOverlayHidden: document.getElementById('deathOverlay').classList.contains('hidden')
    }));
    assert.strictEqual(postRescue.xp, 0, 'rescue must not grant xp');
    assert.strictEqual(postRescue.summary, null, 'rescue must not create a summary');
    assert.strictEqual(postRescue.deathOverlayHidden, true, 'death overlay should close after rescue');

    await page.evaluate(() => {
      const s = window.__gsState;
      s.status.health = 0;
      s.plant.isDead = true;
      s.plant.phase = 'dead';
      syncCanonicalStateShape();
      renderAll();
    });
    await page.click('#deathResetBtn');
    await page.waitForFunction(() => {
      const confirmBtn = document.getElementById('menuDialogConfirmBtn');
      if (!confirmBtn) return false;
      const isHiddenByClass = confirmBtn.classList.contains('hidden');
      const isVisible = window.getComputedStyle(confirmBtn).display !== 'none'
        && window.getComputedStyle(confirmBtn).visibility !== 'hidden';
      return !isHiddenByClass && isVisible;
    }, null, { timeout: 10000 });
    await page.click('#menuDialogConfirmBtn', { force: true });
    await page.waitForFunction(() => window.getCanonicalRun().status === 'ended');
    await page.waitForFunction(() => !document.getElementById('runSummaryOverlay').classList.contains('hidden'));

    const deathSummary = await page.evaluate(() => {
      const profile = window.getCanonicalProfile();
      const run = window.getCanonicalRun();
      return {
        totalXp: profile.totalXp,
        level: profile.level,
        summaryReason: profile.lastRunSummary && profile.lastRunSummary.endReason,
        runStatus: run.status,
        goalTitle: document.getElementById('runSummaryGoalTitle').textContent.trim(),
        goalStatus: document.getElementById('runSummaryGoalStatus').textContent.trim()
      };
    });
    assert.ok(deathSummary.totalXp > 0, 'death finalization should grant some xp');
    assert.strictEqual(deathSummary.summaryReason, 'death', 'death summary should be persisted');
    assert.strictEqual(deathSummary.runStatus, 'ended', 'death run should finalize into ended state');
    assert.ok(deathSummary.goalTitle.length > 0, 'summary should include the mission-light title');
    assert.ok(deathSummary.goalStatus.length > 0, 'summary should include the mission-light result');

    await page.locator('#runSummaryNewRunBtn').evaluate((node) => node.click());
    await page.waitForFunction(() => document.getElementById('landing') && !document.getElementById('landing').classList.contains('hidden'));
    const preservedProfile = await page.evaluate(() => ({
      totalXp: window.getCanonicalProfile().totalXp,
      lastRunSummary: Boolean(window.getCanonicalProfile().lastRunSummary),
      runStatus: window.getCanonicalRun().status
    }));
    assert.ok(preservedProfile.totalXp > 0, 'profile xp should persist into the next run');
    assert.strictEqual(preservedProfile.lastRunSummary, true, 'last summary should persist outside the run state');
    assert.strictEqual(preservedProfile.runStatus, 'idle', 'after reset the run should return to idle');

    await page.evaluate(() => {
      const profile = window.getCanonicalProfile();
      profile.totalXp = 1500;
      profile.level = window.GrowSimProgression.getLevelForXp(profile.totalXp);
      profile.unlocks.genetics = ['hybrid', 'indica', 'sativa'];
      profile.unlocks.media = ['soil', 'coco'];
      profile.unlocks.lights = ['medium', 'high'];
      renderLanding();
      if (typeof renderSetupOptionLocks === 'function') {
        renderSetupOptionLocks();
      }
      renderAll();
    });
    await page.click('[data-setup-select="setupGenetics"][data-setup-value="sativa"]');
    await page.click('[data-setup-select="setupMedium"][data-setup-value="coco"]');
    await page.click('[data-setup-select="setupLight"][data-setup-value="high"]');
    const upgradedStrategyPreview = await page.evaluate(() => ({
      title: document.getElementById('setupStrategyTitle').textContent.trim(),
      tag: document.getElementById('setupStrategyTag').textContent.trim(),
      tone: document.getElementById('setupStrategyTag').dataset.tone
    }));
    assert.ok(/High Pressure|Fast Cycle|Reactive Feed/.test(upgradedStrategyPreview.title), 'preview should react to strategic start choices');
    assert.ok(['risky', 'fast'].includes(upgradedStrategyPreview.tone), 'upgraded strategy should expose a non-default tone');

    await page.click('#startRunBtn');
    await page.waitForFunction(() => window.getCanonicalRun().status === 'active');

    const harvestResult = await page.evaluate(async () => {
      const s = window.__gsState;
      s.profile.totalXp = 620;
      s.profile.level = window.GrowSimProgression.getLevelForXp(s.profile.totalXp);
      s.run.goal = { id: 'reach_harvest' };
      s.simulation.simDay = 84;
      s.plant.stageIndex = 11;
      s.plant.stageKey = 'stage_12';
      s.plant.phase = 'harvest';
      s.plant.lifecycle.qualityScore = 91;
      s.status.health = 92;
      s.status.stress = 12;
      s.status.risk = 8;
      await window.__gsFinalizeRun('harvest');
      const xpAfterFirst = s.profile.totalXp;
      await window.__gsFinalizeRun('harvest');
      return {
        xpAfterFirst,
        xpAfterSecond: s.profile.totalXp,
        level: s.profile.level,
        unlockedMedia: s.profile.unlocks.media.slice(),
        reason: s.profile.lastRunSummary && s.profile.lastRunSummary.endReason,
        goalStatus: s.profile.lastRunSummary && s.profile.lastRunSummary.goal && s.profile.lastRunSummary.goal.status,
        goalXp: s.profile.lastRunSummary && s.profile.lastRunSummary.xpBreakdown && s.profile.lastRunSummary.xpBreakdown.goal,
        buildTitle: document.getElementById('runSummaryBuild').textContent.trim(),
        feedbackText: Array.from(document.querySelectorAll('#runSummaryHighlights .run-summary-note, #runSummaryMistakes .run-summary-note, #runSummaryPositives .run-summary-note')).map((node) => node.textContent).join(' | ')
      };
    });

    await page.waitForFunction(() => window.getCanonicalRun().status === 'ended');
    await page.waitForFunction(() => !document.getElementById('runSummaryOverlay').classList.contains('hidden'));

    assert.strictEqual(harvestResult.reason, 'harvest', 'harvest should create a harvest summary');
    assert.strictEqual(harvestResult.xpAfterSecond, harvestResult.xpAfterFirst, 'harvest must only finalize once per run');
    assert.ok(harvestResult.level >= 4, 'harvest run should push the profile to at least level 4');
    assert.ok(harvestResult.unlockedMedia.includes('coco'), 'level 4 reward should unlock coco medium');
    assert.strictEqual(harvestResult.goalStatus, 'completed', 'completed goal should appear in the summary data');
    assert.ok(harvestResult.goalXp > 0, 'completed goal should grant bonus xp');
    assert.ok(harvestResult.buildTitle.length > 0 && harvestResult.buildTitle !== '-', 'summary should show the selected build');
    assert.ok(/High Output|Fast Genetics|Hardy Genetics/.test(harvestResult.feedbackText), 'summary feedback should reference the selected setup');

    await page.locator('#runSummaryNewRunBtn').evaluate((node) => node.click());
    await page.waitForFunction(() => document.getElementById('landing') && !document.getElementById('landing').classList.contains('hidden'));
    const unlockedStartOptions = await page.evaluate(() => ({
      cocoDisabled: document.querySelector('[data-setup-select="setupMedium"][data-setup-value="coco"]').disabled,
      highDisabled: document.querySelector('[data-setup-select="setupLight"][data-setup-value="high"]').disabled
    }));

    assert.strictEqual(unlockedStartOptions.cocoDisabled, false, 'level 4 unlock should be selectable on the next run');
    assert.strictEqual(unlockedStartOptions.highDisabled, false, 'level 6 unlock should be selectable after enough profile progress');
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}

main()
  .then(() => {
    console.log('ui-progression-run-loop smoke test passed');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
