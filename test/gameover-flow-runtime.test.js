#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  advanceOnboardingToStart,
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady
} = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';
const OFFLINE_RESCUE_TEXT = 'Offline-Nacht: Pflanze knapp überlebt und ist kritisch.';

async function startFreshRun(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForBootReady(page);
  await page.waitForSelector('#landing:not(.hidden)');
  await advanceOnboardingToStart(page);
  await page.click('#startRunBtn');
  await page.waitForFunction(() => {
    const landing = document.getElementById('landing');
    return Boolean(landing && landing.classList.contains('hidden'));
  });
}

async function forceDeathState(page, options = {}) {
  await page.evaluate(({ rescueText }) => {
    const state = window.__gsState;
    state.status.health = 0;
    state.status.risk = 100;
    state.plant.isDead = true;
    state.plant.phase = 'dead';
    state.ui.openSheet = null;
    state.ui.menuOpen = false;
    state.ui.menuDialogOpen = false;
    state.ui.deathOverlayOpen = true;
    state.ui.deathOverlayAcknowledged = false;
    state.meta.rescue.used = false;
    state.meta.rescue.usedAtRealMs = null;
    state.meta.rescue.lastResult = rescueText || null;
    if (state.run && state.run.status === 'active') {
      state.run.status = 'downed';
    }
    window.syncCanonicalStateShape();
    window.renderAll();
  }, {
    rescueText: options.rescueText || null
  });

  await page.waitForFunction(() => {
    const overlay = document.getElementById('deathOverlay');
    return Boolean(overlay && !overlay.classList.contains('hidden'));
  });
}

async function assertClickableTopTarget(page, selector, label) {
  const snapshot = await page.locator(selector).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const x = rect.left + (rect.width / 2);
    const y = rect.top + (rect.height / 2);
    const top = document.elementFromPoint(x, y);
    return {
      disabled: Boolean(node.disabled),
      visible: rect.width > 0 && rect.height > 0,
      topId: top ? top.id || '' : '',
      topTag: top ? top.tagName : '',
      sameNode: top === node || Boolean(top && node.contains(top))
    };
  });

  assert.strictEqual(snapshot.disabled, false, `${label} should not be disabled`);
  assert.strictEqual(snapshot.visible, true, `${label} should be visible`);
  assert.strictEqual(snapshot.sameNode, true, `${label} should be the top clickable target, got ${snapshot.topTag}#${snapshot.topId}`);
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST, undefined, {
    defaultHeaders: { 'Cache-Control': 'no-store' }
  });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  const consoleErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error && error.message ? error.message : String(error));
  });

  await setupAuthHarness(page, AUTH_TOKEN_KEY, {
    email: 'gameover@test.local',
    displayName: 'Gameover Test'
  });

  try {
    await startFreshRun(page, baseUrl);

    await forceDeathState(page, { rescueText: OFFLINE_RESCUE_TEXT });
    const deathCopy = await page.evaluate((offlineText) => {
      const overlay = document.getElementById('deathOverlay');
      const text = overlay ? overlay.textContent : '';
      return {
        analyzeText: document.getElementById('deathAnalyzeBtn')?.textContent.trim() || '',
        offlineTextCount: text.split(offlineText).length - 1
      };
    }, OFFLINE_RESCUE_TEXT);

    assert.strictEqual(deathCopy.analyzeText, 'Analyse öffnen', 'death overlay should render correct Analyse öffnen encoding');
    assert.strictEqual(deathCopy.offlineTextCount, 1, 'offline rescue message should appear once in the death overlay');

    await assertClickableTopTarget(page, '#deathAnalyzeBtn', 'Death analysis button');
    await page.click('#deathAnalyzeBtn');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('deathOverlay');
      const dashboard = document.getElementById('dashboardSheet');
      return Boolean(
        overlay
        && dashboard
        && overlay.classList.contains('hidden')
        && !dashboard.classList.contains('hidden')
        && window.__gsState.ui.openSheet === 'dashboard'
      );
    });

    await forceDeathState(page, { rescueText: OFFLINE_RESCUE_TEXT });
    await assertClickableTopTarget(page, '#deathResetBtn', 'Death reset button');
    await page.click('#deathResetBtn');
    await page.waitForFunction(() => {
      const menu = document.getElementById('gameMenu');
      const dialog = document.getElementById('menuDialog');
      const confirm = document.getElementById('menuDialogConfirmBtn');
      return Boolean(
        menu
        && dialog
        && confirm
        && !menu.classList.contains('hidden')
        && !dialog.classList.contains('hidden')
        && !confirm.classList.contains('hidden')
        && !confirm.disabled
        && window.__gsState.ui.menuOpen === true
        && window.__gsState.ui.menuDialogOpen === true
      );
    });
    await assertClickableTopTarget(page, '#menuDialogConfirmBtn', 'Death reset confirm button');
    await page.click('#menuDialogConfirmBtn');
    await page.waitForFunction(() => {
      const death = document.getElementById('deathOverlay');
      const summary = document.getElementById('runSummaryOverlay');
      return Boolean(
        death
        && summary
        && death.classList.contains('hidden')
        && !summary.classList.contains('hidden')
        && window.getCanonicalRun().status === 'finished'
      );
    });

    await page.click('#runSummaryNewRunBtn');
    await page.waitForFunction(() => {
      const summary = document.getElementById('runSummaryOverlay');
      const landing = document.getElementById('landing');
      return Boolean(
        summary
        && summary.classList.contains('hidden')
        && landing
        && !landing.classList.contains('hidden')
        && window.__gsState.plant.isDead === false
        && window.__gsState.plant.phase !== 'dead'
      );
    });

    const relevantErrors = consoleErrors.filter((entry) => (
      !entry.includes('[sw-update]')
      && !entry.includes('404')
      && !entry.includes('favicon')
    ));
    assert.deepStrictEqual(relevantErrors, [], `unexpected console errors: ${relevantErrors.join('\n')}`);
    console.log('gameover-flow-runtime: all scenarios passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
