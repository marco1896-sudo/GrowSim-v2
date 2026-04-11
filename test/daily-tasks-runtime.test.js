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

async function triggerDailyTaskByType(page, task, nowMs) {
  return page.evaluate(({ taskDef, ts }) => {
    if (!taskDef || typeof taskDef !== 'object') {
      return { ok: false };
    }
    if (taskDef.sheetName === 'dashboard') {
      window.__gsRetentionTaskUpdate('sheet_open', { nowMs: ts, sheetName: 'dashboard' });
      return { ok: true, mode: 'sheet_dashboard' };
    }
    if (taskDef.sheetName === 'climate') {
      window.__gsRetentionTaskUpdate('sheet_open', { nowMs: ts, sheetName: 'climate' });
      return { ok: true, mode: 'sheet_climate' };
    }
    if (taskDef.trigger === 'care_action') {
      window.__gsRetentionTaskUpdate('action_success', { nowMs: ts, actionId: 'watering_low_mist' });
      return { ok: true, mode: 'action_success' };
    }
    if (taskDef.trigger === 'stress_threshold') {
      window.__gsState.status.stress = Math.min(Number(window.__gsState.status.stress || 0), Number(taskDef.threshold || 40));
      window.__gsRetentionTaskUpdate('tick', { nowMs: ts });
      return { ok: true, mode: 'stress_threshold' };
    }
    if (taskDef.trigger === 'risk_threshold') {
      window.__gsState.status.risk = Math.min(Number(window.__gsState.status.risk || 0), Number(taskDef.threshold || 45));
      window.__gsRetentionTaskUpdate('tick', { nowMs: ts });
      return { ok: true, mode: 'risk_threshold' };
    }
    window.__gsRetentionTaskUpdate('tick', { nowMs: ts });
    return { ok: true, mode: 'tick' };
  }, { taskDef: task, ts: nowMs });
}

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

async function scenarioDailyTaskCompletionAndDedupe(page) {
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    window.__gsEvaluateDailyRetention(nowMs, { forceCheckin: true, skipPersist: true });
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks.slice() : [];
    return {
      nowMs,
      tasks
    };
  });
  const tasks = result.tasks;
  assert(tasks.length >= 3, `expected daily tasks, got ${tasks.length}`);

  let offset = 1000;
  for (const task of tasks) {
    await triggerDailyTaskByType(page, task, result.nowMs + offset);
    offset += 250;
  }

  const afterFirst = await page.evaluate(() => {
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks : [];
    const ledger = Array.isArray(window.__gsState.retention.claimLedger) ? window.__gsState.retention.claimLedger : [];
    return {
      completedCount: Number(window.__gsState.retention.dailyCare.completedCount || 0),
      tasks: tasks.map((task) => ({
        taskId: String(task.taskId || ''),
        claimKey: String(task.claimKey || ''),
        completedAt: Number(task.completedAt || 0),
        rewardGrantedAt: Number(task.rewardGrantedAt || 0),
        claimCount: ledger.filter((entry) => entry === task.claimKey).length
      }))
    };
  });

  assert(afterFirst.completedCount > 0, 'at least one daily task should complete after valid triggers');
  for (const task of afterFirst.tasks) {
    if (!task.completedAt) {
      continue;
    }
    assert(task.rewardGrantedAt > 0, `completed task should have reward settlement timestamp (${task.taskId})`);
    assert(task.claimCount <= 1, `task reward must not claim multiple times (${task.taskId})`);
  }

  for (const task of tasks) {
    await triggerDailyTaskByType(page, task, result.nowMs + offset);
    offset += 250;
  }

  const afterSecond = await page.evaluate(() => {
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks : [];
    const ledger = Array.isArray(window.__gsState.retention.claimLedger) ? window.__gsState.retention.claimLedger : [];
    return tasks.map((task) => ({
      taskId: String(task.taskId || ''),
      claimKey: String(task.claimKey || ''),
      claimCount: ledger.filter((entry) => entry === task.claimKey).length
    }));
  });
  for (const task of afterSecond) {
    assert(task.claimCount <= 1, `task reward duplicated after repeated trigger (${task.taskId})`);
  }
}

async function scenarioSheetOpenTriggerThroughController(page) {
  const prepared = await page.evaluate(() => {
    const nowMs = Date.now() + 3500;
    const dayKey = typeof window.__gsGetLocalDayKey === 'function'
      ? window.__gsGetLocalDayKey(nowMs)
      : String(window.__gsState?.retention?.dailyCare?.dayKey || 'test-day');
    const claimKey = `daily:task:${dayKey}:sheet-open-controller`;
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [{
      taskId: 'sheet_open_dashboard_controller',
      title: 'Lage prüfen',
      description: 'Öffne Analyse und checke die Kernwerte.',
      trigger: 'sheet_open',
      sheetName: 'dashboard',
      threshold: null,
      dayKey,
      progressValue: 0,
      targetValue: 1,
      completedAt: null,
      claimKey,
      xp: 8,
      rewardGrantedAt: null
    }];
    window.__gsState.retention.dailyCare.completedCount = 0;
    window.__gsState.retention.dailyCare.allCompleteClaimed = false;
    window.__gsState.retention.claimLedger = window.__gsState.retention.claimLedger.filter((entry) => entry !== claimKey);
    return {
      claimKey,
      nowMs
    };
  });

  const opened = await page.evaluate(() => {
    const controller = window.__gsUiController;
    if (!controller || typeof controller.handleOpenSheet !== 'function') {
      return { ok: false, reason: 'missing_controller' };
    }
    controller.handleOpenSheet('dashboard');
    return { ok: true };
  });
  assert.strictEqual(opened.ok, true, `controller sheet-open path unavailable: ${JSON.stringify(opened)}`);

  const after = await page.evaluate(({ claimKey }) => {
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks : [];
    const ledger = Array.isArray(window.__gsState.retention.claimLedger) ? window.__gsState.retention.claimLedger : [];
    const task = tasks.find((entry) => String(entry.claimKey || '') === String(claimKey || ''));
    return {
      completedAt: Number(task && task.completedAt || 0),
      rewardGrantedAt: Number(task && task.rewardGrantedAt || 0),
      claimCount: ledger.filter((entry) => entry === claimKey).length
    };
  }, { claimKey: prepared.claimKey });

  assert(after.completedAt > 0, 'sheet_open task should complete through real controller openSheet flow');
  assert(after.rewardGrantedAt > 0, 'sheet_open task should settle reward through real controller openSheet flow');
  assert.strictEqual(after.claimCount, 1, 'sheet_open task claim should be exact-once through real controller flow');
}

async function scenarioCompletionFeedbackToast(page) {
  const snapshot = await page.evaluate(() => {
    const nowMs = Date.now() + 4200;
    const dayKey = typeof window.__gsGetLocalDayKey === 'function'
      ? window.__gsGetLocalDayKey(nowMs)
      : String(window.__gsState?.retention?.dailyCare?.dayKey || 'test-day');
    const claimKey = `daily:task:${dayKey}:toast-feedback`;
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [{
      taskId: 'toast_feedback_task',
      title: 'Pflegeimpuls setzen',
      description: 'Führe eine sinnvolle Pflegeaktion aus.',
      trigger: 'care_action',
      sheetName: '',
      threshold: null,
      dayKey,
      progressValue: 0,
      targetValue: 1,
      completedAt: null,
      claimKey,
      xp: 8,
      rewardGrantedAt: null
    }];
    window.__gsState.retention.dailyCare.completedCount = 0;
    window.__gsState.retention.dailyCare.allCompleteClaimed = false;
    window.__gsState.retention.claimLedger = window.__gsState.retention.claimLedger.filter((entry) => entry !== claimKey);
    const existingToast = document.getElementById('retentionToast');
    if (existingToast) {
      existingToast.remove();
    }
    return { nowMs };
  });

  await page.evaluate(({ nowMs }) => {
    window.__gsRetentionTaskUpdate('action_success', {
      nowMs,
      actionId: 'watering_low_mist'
    });
  }, { nowMs: snapshot.nowMs });

  const toastText = await page.evaluate(() => {
    const node = document.getElementById('retentionToast');
    return node ? String(node.textContent || '').trim() : '';
  });

  assert(
    /^Daily geschafft:/.test(toastText),
    `completion feedback toast missing or unclear, got: "${toastText}"`
  );
}

async function scenarioPendingClaimRetry(page) {
  const snapshot = await page.evaluate(() => {
    const nowMs = Date.now() + 5000;
    window.__gsEvaluateDailyRetention(nowMs, { forceCheckin: true, skipPersist: true });
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks : [];
    const pendingTask = tasks.find((task) => task && !task.completedAt && (task.sheetName || task.trigger)) || null;
    return {
      nowMs,
      task: pendingTask
    };
  });
  assert(snapshot.task, 'missing task for pending-claim retry scenario');

  await page.evaluate(() => {
    window.__gsProgressionApiBackup = window.GrowSimProgression || null;
    window.GrowSimProgression = null;
  });

  await triggerDailyTaskByType(page, snapshot.task, snapshot.nowMs + 200);

  const pendingState = await page.evaluate(({ claimKey }) => {
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks : [];
    const ledger = Array.isArray(window.__gsState.retention.claimLedger) ? window.__gsState.retention.claimLedger : [];
    const task = tasks.find((entry) => String(entry.claimKey || '') === String(claimKey || ''));
    return {
      exists: Boolean(task),
      completedAt: Number(task && task.completedAt || 0),
      rewardGrantedAt: Number(task && task.rewardGrantedAt || 0),
      claimCount: ledger.filter((entry) => entry === claimKey).length
    };
  }, { claimKey: snapshot.task.claimKey });

  assert.strictEqual(pendingState.exists, true, 'task should still exist in pending state');
  assert(pendingState.completedAt > 0, 'pending task should still be marked completed');
  assert.strictEqual(pendingState.rewardGrantedAt, 0, 'reward settlement must remain pending while progression API is unavailable');
  assert.strictEqual(pendingState.claimCount, 0, 'pending task must not register claim early');

  await page.evaluate(() => {
    window.GrowSimProgression = window.__gsProgressionApiBackup || window.GrowSimProgression;
    delete window.__gsProgressionApiBackup;
  });

  await page.evaluate(({ nowMs }) => {
    window.__gsRetentionTaskUpdate('tick', { nowMs });
  }, { nowMs: snapshot.nowMs + 1000 });

  const settledState = await page.evaluate(({ claimKey }) => {
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks : [];
    const ledger = Array.isArray(window.__gsState.retention.claimLedger) ? window.__gsState.retention.claimLedger : [];
    const task = tasks.find((entry) => String(entry.claimKey || '') === String(claimKey || ''));
    return {
      rewardGrantedAt: Number(task && task.rewardGrantedAt || 0),
      claimCount: ledger.filter((entry) => entry === claimKey).length
    };
  }, { claimKey: snapshot.task.claimKey });

  assert(
    settledState.rewardGrantedAt > 0,
    `pending task should settle reward once progression API recovers: ${JSON.stringify({ pendingState, settledState })}`
  );
  assert.strictEqual(
    settledState.claimCount,
    1,
    `recovered settlement should claim exactly once: ${JSON.stringify({ pendingState, settledState })}`
  );
}

async function scenarioPendingClaimSurvivesReload(page) {
  const snapshot = await page.evaluate(() => {
    const nowMs = Date.now() + 9000;
    window.__gsEvaluateDailyRetention(nowMs, { forceCheckin: true, skipPersist: false });
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks : [];
    const target = tasks.find((task) => task && !task.completedAt && (task.sheetName || task.trigger)) || null;
    return {
      nowMs,
      task: target
    };
  });
  assert(snapshot.task, 'missing task for pending-claim reload scenario');

  await page.evaluate(() => {
    window.__gsProgressionApiBackup = window.GrowSimProgression || null;
    window.GrowSimProgression = null;
  });

  await triggerDailyTaskByType(page, snapshot.task, snapshot.nowMs + 200);

  const pendingBeforeReload = await page.evaluate(({ claimKey }) => {
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks : [];
    const ledger = Array.isArray(window.__gsState.retention.claimLedger) ? window.__gsState.retention.claimLedger : [];
    const task = tasks.find((entry) => String(entry.claimKey || '') === String(claimKey || ''));
    return {
      completedAt: Number(task && task.completedAt || 0),
      rewardGrantedAt: Number(task && task.rewardGrantedAt || 0),
      claimCount: ledger.filter((entry) => entry === claimKey).length
    };
  }, { claimKey: snapshot.task.claimKey });

  assert(pendingBeforeReload.completedAt > 0, 'pending-reload task should be completed before reload');
  assert.strictEqual(pendingBeforeReload.rewardGrantedAt, 0, 'pending-reload task must remain unsettled before reload');
  assert.strictEqual(pendingBeforeReload.claimCount, 0, 'pending-reload task must not claim before reload');

  await page.evaluate(async () => {
    if (window.GrowSimStorage && typeof window.GrowSimStorage.persistState === 'function') {
      await window.GrowSimStorage.persistState();
    }
  });

  await page.reload({ waitUntil: 'networkidle' });
  await waitForBootReady(page, 25000);

  const postReload = await page.evaluate(({ claimKey }) => {
    const nowMs = Date.now() + 12000;
    window.__gsRetentionTaskUpdate('tick', { nowMs });
    window.__gsRetentionTaskUpdate('tick', { nowMs: nowMs + 50 });
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks) ? window.__gsState.retention.dailyCare.tasks : [];
    const ledger = Array.isArray(window.__gsState.retention.claimLedger) ? window.__gsState.retention.claimLedger : [];
    const task = tasks.find((entry) => String(entry.claimKey || '') === String(claimKey || ''));
    return {
      completedAt: Number(task && task.completedAt || 0),
      rewardGrantedAt: Number(task && task.rewardGrantedAt || 0),
      claimCount: ledger.filter((entry) => entry === claimKey).length
    };
  }, { claimKey: snapshot.task.claimKey });

  assert(postReload.completedAt > 0, 'completed state should survive reload before recovery settlement');
  assert(postReload.rewardGrantedAt > 0, 'pending reward should settle after reload/resume');
  assert.strictEqual(postReload.claimCount, 1, 'pending reward settlement after reload must claim exactly once');
}

async function scenarioDayReset(page) {
  const result = await page.evaluate(() => {
    const nowMs = Date.now() + 15000;
    const nextDayMs = nowMs + (24 * 60 * 60 * 1000);
    window.__gsEvaluateDailyRetention(nowMs, { forceCheckin: true, skipPersist: true });
    const before = {
      dayKey: String(window.__gsState.retention.dailyCare.dayKey || ''),
      tasks: (window.__gsState.retention.dailyCare.tasks || []).map((task) => ({
        taskId: String(task.taskId || ''),
        completedAt: Number(task.completedAt || 0),
        rewardGrantedAt: Number(task.rewardGrantedAt || 0)
      }))
    };
    window.__gsEvaluateDailyRetention(nextDayMs, { forceCheckin: true, skipPersist: true });
    const after = {
      dayKey: String(window.__gsState.retention.dailyCare.dayKey || ''),
      tasks: (window.__gsState.retention.dailyCare.tasks || []).map((task) => ({
        taskId: String(task.taskId || ''),
        dayKey: String(task.dayKey || ''),
        completedAt: Number(task.completedAt || 0),
        rewardGrantedAt: Number(task.rewardGrantedAt || 0)
      }))
    };
    return { before, after };
  });

  assert.notStrictEqual(result.before.dayKey, result.after.dayKey, 'daily state should rotate to the new day key');
  assert(result.after.tasks.length >= 3, 'new day should spawn daily task set');
  for (const task of result.after.tasks) {
    assert.strictEqual(task.dayKey, result.after.dayKey, `task dayKey should match new daily key (${task.taskId})`);
    assert.strictEqual(task.completedAt, 0, `new daily task must start uncompleted (${task.taskId})`);
    assert.strictEqual(task.rewardGrantedAt, 0, `new daily task must start unclaimed (${task.taskId})`);
  }
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
    await scenarioCompletionFeedbackToast(page);
    await startFreshRun(page, baseUrl);
    await scenarioSheetOpenTriggerThroughController(page);
    await startFreshRun(page, baseUrl);
    await scenarioDailyTaskCompletionAndDedupe(page);
    await startFreshRun(page, baseUrl);
    await scenarioPendingClaimRetry(page);
    await startFreshRun(page, baseUrl);
    await scenarioPendingClaimSurvivesReload(page);
    await startFreshRun(page, baseUrl);
    await scenarioDayReset(page);
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
