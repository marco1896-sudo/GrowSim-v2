#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady,
  clearClientStorage: resetClientStorage
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
  await page.click('#startRunBtn');
  await page.waitForFunction(() => {
    const node = document.getElementById('landing');
    return Boolean(node && node.classList.contains('hidden'));
  }, null, { timeout: 10000 });
}

async function scenarioDailyStatusLabelsFollowRuntimeTruth(page) {
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    const dayKey = typeof window.__gsGetLocalDayKey === 'function'
      ? window.__gsGetLocalDayKey(nowMs)
      : String(window.__gsState?.retention?.dailyCare?.dayKey || 'test-day');

    const fixtures = [
      {
        taskId: 'ui-open',
        title: 'UI Offen',
        description: 'Soll Offen bleiben',
        trigger: 'care_action',
        dayKey,
        progressValue: 0,
        targetValue: 1,
        completedAt: null,
        claimKey: `daily:task:${dayKey}:ui-open`,
        rewardGrantedAt: null
      },
      {
        taskId: 'ui-progress',
        title: 'UI In Arbeit',
        description: 'Soll In Arbeit zeigen',
        trigger: 'stress_threshold',
        threshold: 40,
        dayKey,
        progressValue: 0,
        targetValue: 1,
        completedAt: null,
        claimKey: `daily:task:${dayKey}:ui-progress`,
        rewardGrantedAt: null
      },
      {
        taskId: 'ui-claimable',
        title: 'UI Claimbar',
        description: 'Soll Claimbar zeigen',
        trigger: 'sheet_open',
        sheetName: 'dashboard',
        dayKey,
        progressValue: 1,
        targetValue: 1,
        completedAt: nowMs - 500,
        claimKey: `daily:task:${dayKey}:ui-claimable`,
        rewardGrantedAt: null
      },
      {
        taskId: 'ui-claimed',
        title: 'UI Abgeholt',
        description: 'Soll Abgeholt zeigen',
        trigger: 'sheet_open',
        sheetName: 'climate',
        dayKey,
        progressValue: 1,
        targetValue: 1,
        completedAt: nowMs - 800,
        claimKey: `daily:task:${dayKey}:ui-claimed`,
        rewardGrantedAt: nowMs - 200
      }
    ];

    const retention = window.__gsState.retention;
    retention.dailyCare.dayKey = dayKey;
    retention.dailyCare.tasks = fixtures;
    retention.dailyCare.completedCount = fixtures.filter((task) => Boolean(task.completedAt)).length;
    retention.dailyCare.allCompleteClaimed = false;
    retention.claimLedger = [];

    if (window.__gsState.status && typeof window.__gsState.status === 'object') {
      window.__gsState.status.stress = 45;
      window.__gsState.status.risk = 70;
    }

    window.__gsState.ui.openSheet = 'missions';
    if (typeof window.renderMissionsSheet === 'function') {
      window.renderMissionsSheet();
    }

    const rows = Array.from(document.querySelectorAll('#missionsDailyCareList .retention-task-row')).map((row) => {
      const titleNode = row.querySelector('.retention-task-copy strong');
      const stateNode = row.querySelector('.retention-task-state');
      return {
        title: titleNode ? String(titleNode.textContent || '').trim() : '',
        stateLabel: stateNode ? String(stateNode.textContent || '').trim() : ''
      };
    });

    const byTitle = {};
    for (const row of rows) {
      byTitle[row.title] = row.stateLabel;
    }

    return {
      byTitle,
      taskCount: rows.length,
      runtime: {
        stress: Number(window.__gsState.status?.stress || 0),
        claims: Array.isArray(window.__gsState.retention.claimLedger) ? window.__gsState.retention.claimLedger.slice() : []
      }
    };
  });

  assert(result.taskCount >= 4, `expected at least 4 daily rows, got ${result.taskCount}`);
  assert.strictEqual(result.byTitle['UI Offen'], 'Offen', `expected Offen, got ${JSON.stringify(result.byTitle)}`);
  assert.strictEqual(result.byTitle['UI In Arbeit'], 'In Arbeit', `expected In Arbeit, got ${JSON.stringify(result.byTitle)}`);
  assert.strictEqual(result.byTitle['UI Claimbar'], 'Claimbar', `expected Claimbar, got ${JSON.stringify(result.byTitle)}`);
  assert.strictEqual(result.byTitle['UI Abgeholt'], 'Abgeholt', `expected Abgeholt, got ${JSON.stringify(result.byTitle)}`);
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

  try {
    await setupAuthHarness(page, AUTH_TOKEN_KEY, {
      id: 'daily-ui-status-user',
      email: 'daily-ui-status@test.local',
      displayName: 'Daily UI Status',
      token: 'daily-ui-status-token'
    });
    await startFreshRun(page, baseUrl);
    await scenarioDailyStatusLabelsFollowRuntimeTruth(page);
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
