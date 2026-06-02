#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady,
  clearClientStorage: resetClientStorage,
  advanceOnboardingToStart
} = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function startFreshRun(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForBootReady(page, 25000);
  await resetClientStorage(page, { preserveLocalStorageKeys: [AUTH_TOKEN_KEY] });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForBootReady(page, 25000);
  await advanceOnboardingToStart(page);
  await page.click('#startRunBtn');
  await page.waitForFunction(() => {
    const node = document.getElementById('landing');
    return Boolean(node && node.classList.contains('hidden'));
  }, null, { timeout: 10000 });
}

async function scenarioDailyUiShowsAuthoritativeStates(page) {
  const snapshot = await page.evaluate(() => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [
      {
        id: 'water_once',
        taskId: 'water_once',
        type: 'water_once',
        title: 'Einmal giessen',
        description: 'desc',
        dayKey,
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 25,
        claimKey: `daily:task:${dayKey}:water_once`
      },
      {
        id: 'resolve_one_event',
        taskId: 'resolve_one_event',
        type: 'resolve_one_event',
        title: 'Event loesen',
        description: 'desc',
        dayKey,
        progress: 1,
        target: 1,
        completed: true,
        claimed: false,
        completedAt: nowMs - 200,
        rewardCoins: 35,
        claimKey: `daily:task:${dayKey}:resolve_one_event`
      },
      {
        id: 'open_app_twice',
        taskId: 'open_app_twice',
        type: 'open_app_twice',
        title: 'Zwei Sessions',
        description: 'desc',
        dayKey,
        progress: 2,
        target: 2,
        completed: true,
        claimed: true,
        completedAt: nowMs - 500,
        claimedAt: nowMs - 100,
        rewardGrantedAt: nowMs - 100,
        rewardCoins: 30,
        claimKey: `daily:task:${dayKey}:open_app_twice`
      }
    ];
    window.__gsState.retention.dailyCare.completedCount = 2;
    window.__gsState.retention.dailyCare.allCompleteClaimed = false;
    window.__gsState.retention.streak.currentCount = 3;
    window.__gsState.retention.streak.lastQualifiedDayKey = dayKey;
    window.__gsState.ui.openSheet = 'missions';
    if (typeof window.renderMissionsSheet === 'function') {
      window.renderMissionsSheet();
    }

    const rows = Array.from(document.querySelectorAll('#missionsDailyCareList .retention-task-row'));
    const stateByTitle = {};
    const rowClassByTitle = {};
    const claimButtons = [];
    for (const row of rows) {
      const title = String((row.querySelector('.retention-task-copy strong') || {}).textContent || '').trim();
      const stateLabel = String((row.querySelector('.retention-task-state') || {}).textContent || '').trim();
      const claimBtn = row.querySelector('[data-retention-claim-task]');
      stateByTitle[title] = stateLabel;
      rowClassByTitle[title] = String(row.className || '');
      if (claimBtn) {
        claimButtons.push(String(claimBtn.getAttribute('data-retention-claim-task') || ''));
      }
    }

    return {
      rowCount: rows.length,
      stateByTitle,
      rowClassByTitle,
      claimButtons,
      streakText: String((document.querySelector('#missionsStreakBlock strong') || {}).textContent || '').trim(),
      progressText: String((document.querySelector('#missionsDailyCareProgress') || {}).textContent || '').trim()
    };
  });

  assert(snapshot.rowCount >= 3, `expected at least 3 daily rows, got ${snapshot.rowCount}`);
  assert.strictEqual(snapshot.stateByTitle['Einmal giessen'], 'Offen', 'open task should show Offen');
  assert.strictEqual(snapshot.stateByTitle['Event loesen'], 'Claimbar', 'completed unclaimed task should show Claimbar');
  assert.strictEqual(snapshot.stateByTitle['Zwei Sessions'], 'Abgeholt', 'claimed task should show Abgeholt');
  assert(/retention-task-row--open/.test(snapshot.rowClassByTitle['Einmal giessen']), 'open task row should carry open class');
  assert(/retention-task-row--claimable/.test(snapshot.rowClassByTitle['Event loesen']), 'claimable task row should carry claimable class');
  assert(/retention-task-row--claimed/.test(snapshot.rowClassByTitle['Zwei Sessions']), 'claimed task row should carry claimed class');
  assert(snapshot.claimButtons.includes('resolve_one_event'), 'claim button should exist for claimable task');
  assert(/Daily Streak 3/.test(snapshot.streakText), `unexpected streak text: ${snapshot.streakText}`);
  assert(snapshot.progressText.length > 0, 'daily progress text should be present');
}

async function scenarioHomeTeaserPremiumState(page) {
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [
      {
        id: 'water_once',
        taskId: 'water_once',
        type: 'water_once',
        title: 'Einmal giessen',
        dayKey,
        progress: 1,
        target: 1,
        completed: true,
        claimed: false,
        rewardCoins: 25,
        claimKey: `daily:task:${dayKey}:water_once`
      },
      {
        id: 'resolve_one_event',
        taskId: 'resolve_one_event',
        type: 'resolve_one_event',
        title: 'Event loesen',
        dayKey,
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 35,
        claimKey: `daily:task:${dayKey}:resolve_one_event`
      },
      {
        id: 'open_app_twice',
        taskId: 'open_app_twice',
        type: 'open_app_twice',
        title: 'Zwei Sessions',
        dayKey,
        progress: 1,
        target: 2,
        completed: false,
        claimed: false,
        rewardCoins: 30,
        claimKey: `daily:task:${dayKey}:open_app_twice`
      }
    ];
    window.__gsState.retention.dailyCare.completedCount = 1;
    window.__gsState.retention.dailyCare.allCompleteClaimed = false;
    window.__gsState.retention.streak.currentCount = 4;
    window.__gsState.retention.streak.bestCount = 6;
    window.__gsState.retention.streak.lastQualifiedDayKey = dayKey;
    window.__gsState.ui.openSheet = null;
    if (typeof window.renderAll === 'function') {
      window.renderAll();
    }

    const teaserNode = document.getElementById('homeMetaRetentionTeaser');
    const cardNode = teaserNode ? teaserNode.querySelector('.home-retention-card') : null;
    const beforeOpenSheet = String(window.__gsState.ui.openSheet || '');
    if (teaserNode) {
      teaserNode.click();
    }
    const afterOpenSheet = String(window.__gsState.ui.openSheet || '');

    return {
      teaserExists: Boolean(teaserNode),
      cardExists: Boolean(cardNode),
      cardStateClass: cardNode ? String(cardNode.className || '') : '',
      teaserText: teaserNode ? String(teaserNode.textContent || '').trim() : '',
      beforeOpenSheet,
      afterOpenSheet
    };
  });

  assert.strictEqual(result.teaserExists, true, 'home retention teaser should exist');
  assert.strictEqual(result.cardExists, true, 'home teaser should render premium retention card');
  assert(/home-retention-card/.test(result.cardStateClass), 'teaser card class missing');
  assert(/claimable|in_progress|open|claimed/.test(result.cardStateClass), 'teaser card should expose retention state class');
  assert(/Heute/.test(result.teaserText), `teaser should include daily headline, got: ${result.teaserText}`);
  assert.strictEqual(result.beforeOpenSheet, '', 'precondition: sheet should be closed');
  assert.strictEqual(result.afterOpenSheet, 'missions', 'tapping home teaser should open missions sheet');
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

  try {
    await setupAuthHarness(page, AUTH_TOKEN_KEY, {
      id: 'daily-ui-user',
      email: 'daily-ui@test.local',
      displayName: 'Daily UI',
      token: 'daily-ui-token'
    });
    await startFreshRun(page, baseUrl);
    await scenarioDailyUiShowsAuthoritativeStates(page);
    await scenarioHomeTeaserPremiumState(page);
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().then(() => {
  console.log('daily-tasks-ui-state.test.js passed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
