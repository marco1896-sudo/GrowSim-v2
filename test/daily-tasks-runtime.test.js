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

async function scenarioDailyGenerationAndStability(page) {
  const snapshot = await page.evaluate(() => {
    const nowMs = Date.now();
    window.__gsEvaluateDailyRetention(nowMs, { skipPersist: true, forceCheckin: false });
    const first = window.__gsState.retention.dailyCare.tasks.map((task) => ({
      id: String(task.id || task.taskId || ''),
      type: String(task.type || ''),
      dayKey: String(task.dayKey || ''),
      target: Number(task.target || 0),
      progress: Number(task.progress || 0)
    }));
    window.__gsEvaluateDailyRetention(nowMs + 2000, { skipPersist: true, forceCheckin: false });
    const second = window.__gsState.retention.dailyCare.tasks.map((task) => ({
      id: String(task.id || task.taskId || ''),
      type: String(task.type || '')
    }));
    const tomorrowMs = nowMs + (24 * 60 * 60 * 1000);
    window.__gsEvaluateDailyRetention(tomorrowMs, { skipPersist: true, forceCheckin: false });
    const tomorrow = {
      dayKey: String(window.__gsState.retention.dailyCare.dayKey || ''),
      tasks: window.__gsState.retention.dailyCare.tasks.map((task) => ({
        id: String(task.id || task.taskId || ''),
        type: String(task.type || '')
      }))
    };
    return {
      firstDayKey: String(window.__gsGetLocalDayKey(nowMs)),
      first,
      second,
      tomorrow
    };
  });

  assert.strictEqual(snapshot.first.length, 3, 'daily tasks must generate exactly 3 tasks');
  const types = snapshot.first.map((entry) => entry.type);
  assert.deepStrictEqual(
    types.sort(),
    ['open_app_twice', 'resolve_one_event', 'water_once'].sort(),
    `unexpected daily task types: ${JSON.stringify(types)}`
  );
  assert.deepStrictEqual(snapshot.second, snapshot.first.map((entry) => ({ id: entry.id, type: entry.type })), 'tasks must stay stable during same day');
  assert.strictEqual(snapshot.tomorrow.tasks.length, 3, 'next day must still have exactly 3 tasks');
  assert.notStrictEqual(snapshot.tomorrow.dayKey, snapshot.firstDayKey, 'next day key should rotate');
}

async function scenarioProgressClaimAndCoinDedupe(page) {
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    window.__gsEvaluateDailyRetention(nowMs, { skipPersist: true, forceCheckin: false });
    const retention = window.__gsState.retention;
    const daily = retention.dailyCare;
    const taskByType = Object.fromEntries((daily.tasks || []).map((task) => [String(task.type || ''), task]));

    // water_once
    window.__gsRetentionTaskUpdate('action_success', { nowMs: nowMs + 10, actionId: 'watering_low_mist', category: 'watering' });
    // resolve_one_event
    window.__gsRetentionTaskUpdate('event_resolved', { nowMs: nowMs + 20, eventId: 'e1' });
    // open_app_twice: first rapid call should be debounced, later call should count
    const fastA = window.__gsRecordRetentionSessionStart(nowMs + 30, 'test', { skipPersist: true });
    const fastB = window.__gsRecordRetentionSessionStart(nowMs + 31, 'test', { skipPersist: true });
    const spaced = window.__gsRecordRetentionSessionStart(nowMs + (50 * 1000), 'test', { skipPersist: true });

    const coinsBeforeClaim = Number(window.getCoins());
    const waterTaskId = String(taskByType.water_once.taskId || taskByType.water_once.id || '');
    const firstClaim = window.__gsClaimDailyTask(waterTaskId, nowMs + 60, { skipPersist: true });
    const secondClaim = window.__gsClaimDailyTask(waterTaskId, nowMs + 61, { skipPersist: true });
    const coinsAfterClaim = Number(window.getCoins());
    const tasksAfter = window.__gsState.retention.dailyCare.tasks.slice();
    const byTypeAfter = Object.fromEntries(tasksAfter.map((task) => [String(task.type || ''), task]));
    const claimedTask = tasksAfter.find((task) => String(task.taskId || task.id || '') === waterTaskId);

    return {
      fastA,
      fastB,
      spaced,
      progress: {
        water: Number(byTypeAfter.water_once && byTypeAfter.water_once.progress || 0),
        resolve: Number(byTypeAfter.resolve_one_event && byTypeAfter.resolve_one_event.progress || 0),
        sessions: Number(byTypeAfter.open_app_twice && byTypeAfter.open_app_twice.progress || 0)
      },
      taskState: {
        completed: Boolean(claimedTask && claimedTask.completed),
        claimed: Boolean(claimedTask && claimedTask.claimed),
        claimKey: String(claimedTask && claimedTask.claimKey || '')
      },
      coinsBeforeClaim,
      coinsAfterClaim,
      firstClaim,
      secondClaim,
      claimLedgerHits: (window.__gsState.retention.claimLedger || []).filter((entry) => entry === String(claimedTask && claimedTask.claimKey || '')).length
    };
  });

  assert.strictEqual(result.progress.water, 1, 'water task progress should reach target');
  assert.strictEqual(result.progress.resolve, 1, 'event resolution should progress resolve task');
  assert(result.progress.sessions >= 1, 'session task should progress after counted sessions');
  assert.strictEqual(result.fastB.counted, false, 'rapid duplicate session open should be debounced');
  assert.strictEqual(result.spaced.counted, true, 'spaced session open should count');
  assert.strictEqual(result.firstClaim.ok, true, 'first claim should succeed');
  assert.strictEqual(result.secondClaim.ok, false, 'second claim should be blocked');
  assert.strictEqual(result.secondClaim.reason, 'already_claimed', 'second claim should report already claimed');
  assert(result.coinsAfterClaim > result.coinsBeforeClaim, 'claim should grant coins');
  assert.strictEqual(result.claimLedgerHits, 1, 'claim ledger should only contain a single task claim entry');
}

async function scenarioStreakRules(page) {
  const streak = await page.evaluate(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    window.__gsState.retention.streak.currentCount = 0;
    window.__gsState.retention.streak.bestCount = 0;
    window.__gsState.retention.streak.lastQualifiedDayKey = '';
    window.__gsState.retention.streak.lastClaimDayKey = '';
    window.__gsState.retention.streak.lastCheckinDayKey = '';
    window.__gsState.retention.streak.lastEvaluatedDayKey = '';
    window.__gsEvaluateDailyRetention(nowMs, { skipPersist: true, forceCheckin: false });
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    const day1Claim = window.__gsClaimDailyCheckin(nowMs + 20, { skipPersist: true });
    const day1Again = window.__gsClaimDailyCheckin(nowMs + 21, { skipPersist: true });

    const day2Now = nowMs + oneDay;
    window.__gsEvaluateDailyRetention(day2Now, { skipPersist: true, forceCheckin: false });
    const day2Claim = window.__gsClaimDailyCheckin(day2Now + 20, { skipPersist: true });

    const day4Now = nowMs + (3 * oneDay);
    window.__gsEvaluateDailyRetention(day4Now, { skipPersist: true, forceCheckin: false });
    const day4Claim = window.__gsClaimDailyCheckin(day4Now + 20, { skipPersist: true });

    return {
      dayKey,
      day1Claim,
      day1Again,
      day2Claim,
      day4Claim,
      current: Number(window.__gsState.retention.streak.currentCount || 0),
      best: Number(window.__gsState.retention.streak.bestCount || 0),
      lastQualifiedDate: String(window.__gsState.retention.streak.lastQualifiedDayKey || ''),
      lastClaimDate: String(window.__gsState.retention.streak.lastClaimDayKey || '')
    };
  });

  assert.strictEqual(streak.day1Claim.ok, true, 'first day claim should qualify streak');
  assert.strictEqual(streak.day1Claim.current, 1, 'first streak day should be 1');
  assert.strictEqual(streak.day1Again.ok, false, 'same day claim should not count streak twice');
  assert.strictEqual(streak.day2Claim.ok, true, 'next day claim should qualify streak');
  assert.strictEqual(streak.day2Claim.current, 2, 'second streak day should be 2');
  assert.strictEqual(streak.day4Claim.ok, true, 'later day claim should still work');
  assert.strictEqual(streak.day4Claim.current, 1, 'missed day should reset streak to 1');
  assert(streak.best >= 2, 'best streak should preserve previous higher streak');
  assert(streak.lastQualifiedDate.length > 0, 'lastQualifiedDate should be populated');
  assert(streak.lastClaimDate.length > 0, 'lastClaimDate should be populated');
}

async function scenarioRetentionMigrationCompatibility(page) {
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    window.__gsState.retention = {
      version: 1,
      streak: {
        currentCount: 2,
        bestCount: 2,
        lastCheckinDayKey: dayKey
      },
      dailyCare: {
        dayKey,
        tasks: [{
          taskId: 'water_once',
          title: 'Legacy Task',
          description: 'legacy',
          trigger: 'water_once',
          dayKey,
          claimKey: `daily:task:${dayKey}:water_once`,
          completedAt: nowMs - 500
        }]
      }
    };
    window.__gsEvaluateDailyRetention(nowMs, { skipPersist: true, forceCheckin: false });
    const retention = window.__gsState.retention;
    const task = retention.dailyCare.tasks[0] || {};
    return {
      version: Number(retention.version || 0),
      hasSession: Boolean(retention.session && typeof retention.session === 'object'),
      hasLastQualified: typeof retention.streak.lastQualifiedDayKey === 'string',
      taskShape: {
        id: String(task.id || task.taskId || ''),
        type: String(task.type || ''),
        target: Number(task.target || 0),
        progress: Number(task.progress || 0),
        completed: Boolean(task.completed)
      }
    };
  });

  assert(result.version >= 1, 'retention version should stay valid after migration');
  assert.strictEqual(result.hasSession, true, 'migration should initialize session state');
  assert.strictEqual(result.hasLastQualified, true, 'migration should initialize streak date fields');
  assert(result.taskShape.id.length > 0, 'legacy task should remain addressable');
  assert(result.taskShape.target >= 1, 'legacy task should normalize target');
  assert.strictEqual(result.taskShape.completed, true, 'legacy completed task should stay completed');
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

  try {
    await setupAuthHarness(page, AUTH_TOKEN_KEY, {
      id: 'daily-runtime-user',
      email: 'daily-runtime@test.local',
      displayName: 'Daily Runtime',
      token: 'daily-runtime-token'
    });
    await startFreshRun(page, baseUrl);
    await scenarioDailyGenerationAndStability(page);
    await scenarioProgressClaimAndCoinDedupe(page);
    await scenarioStreakRules(page);
    await scenarioRetentionMigrationCompatibility(page);
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().then(() => {
  console.log('daily-tasks-runtime.test.js passed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
