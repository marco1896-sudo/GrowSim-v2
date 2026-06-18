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
const FIXED_NOW_SESSION_KEY = '__gs_test_fixed_now_ms';

async function armFixedNowForNextReload(page, fixedNowMs) {
  await page.addInitScript((sessionKey) => {
    const rawValue = sessionStorage.getItem(sessionKey);
    if (rawValue === null || String(rawValue).trim() === '') {
      return;
    }
    const fixedNow = Number(rawValue);
    if (!Number.isFinite(fixedNow)) {
      return;
    }
    const RealDate = Date;
    function MockDate(...args) {
      if (new.target) {
        return args.length === 0 ? new RealDate(fixedNow) : new RealDate(...args);
      }
      return args.length === 0 ? new RealDate(fixedNow).toString() : RealDate(...args);
    }
    Object.setPrototypeOf(MockDate, RealDate);
    MockDate.prototype = RealDate.prototype;
    MockDate.now = () => fixedNow;
    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;
    globalThis.__gsRealDate = RealDate;
    globalThis.Date = MockDate;
  }, FIXED_NOW_SESSION_KEY);
  await page.evaluate(([sessionKey, nowMs]) => {
    sessionStorage.setItem(sessionKey, String(nowMs));
  }, [FIXED_NOW_SESSION_KEY, fixedNowMs]);
}

async function clearFixedNowOverride(page) {
  await page.evaluate((sessionKey) => {
    sessionStorage.removeItem(sessionKey);
    if (typeof globalThis.__gsRealDate === 'function') {
      globalThis.Date = globalThis.__gsRealDate;
      delete globalThis.__gsRealDate;
    }
  }, FIXED_NOW_SESSION_KEY);
}

async function clearBlockingGuidanceUi(page) {
  await page.evaluate(() => {
    if (typeof getFirstRunIntroState === 'function') {
      const intro = getFirstRunIntroState(window.__gsState);
      intro.active = false;
      intro.completed = true;
      intro.dashboardFollowupShown = true;
    }
    if (window.__gsState && window.__gsState.ui) {
      window.__gsState.ui.menuDialogOpen = false;
    }
    if (typeof closeMenuDialog === 'function') {
      closeMenuDialog();
    }
    if (typeof renderFirstRunIntroOverlay === 'function') {
      renderFirstRunIntroOverlay();
    }
    if (typeof renderFirstRunDashboardFollowupOverlay === 'function') {
      renderFirstRunDashboardFollowupOverlay();
    }
    if (typeof renderGameMenu === 'function') {
      renderGameMenu();
    }
  });
}

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
  await clearBlockingGuidanceUi(page);
}

async function scenarioDailyGenerationAndStability(page) {
  const snapshot = await page.evaluate(() => {
    const nowMs = Date.now();
    window.__gsState.simulation.simDay = 6;
    window.__gsState.plant.phase = 'seedling';
    window.__gsState.status.water = 46;
    window.__gsState.status.nutrition = 63;
    window.__gsState.status.stress = 18;
    window.__gsState.status.risk = 14;
    window.__gsState.events.machineState = 'idle';
    window.__gsEvaluateDailyRetention(nowMs, { skipPersist: true, forceCheckin: false });
    const first = window.__gsState.retention.dailyCare.tasks.map((task) => ({
      id: String(task.id || task.taskId || ''),
      type: String(task.type || ''),
      trigger: String(task.trigger || ''),
      dayKey: String(task.dayKey || ''),
      target: Number(task.target || 0),
      progress: Number(task.progress || 0)
    }));
    const firstBuddy = {
      dayKey: String(window.__gsState.retention.dailyCare.buddyCheck && window.__gsState.retention.dailyCare.buddyCheck.dayKey || ''),
      category: String(window.__gsState.retention.dailyCare.buddyCheck && window.__gsState.retention.dailyCare.buddyCheck.category || ''),
      textKey: String(window.__gsState.retention.dailyCare.buddyCheck && window.__gsState.retention.dailyCare.buddyCheck.textKey || ''),
      primaryTaskId: String(window.__gsState.retention.dailyCare.buddyCheck && window.__gsState.retention.dailyCare.buddyCheck.primaryTaskId || '')
    };
    const firstDecision = {
      dayKey: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.dayKey || ''),
      cardId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.cardId || ''),
      primaryTaskId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.primaryTaskId || '')
    };
    window.__gsEvaluateDailyRetention(nowMs + 2000, { skipPersist: true, forceCheckin: false });
    const second = window.__gsState.retention.dailyCare.tasks.map((task) => ({
      id: String(task.id || task.taskId || ''),
      type: String(task.type || '')
    }));
    const secondBuddy = {
      category: String(window.__gsState.retention.dailyCare.buddyCheck && window.__gsState.retention.dailyCare.buddyCheck.category || ''),
      textKey: String(window.__gsState.retention.dailyCare.buddyCheck && window.__gsState.retention.dailyCare.buddyCheck.textKey || '')
    };
    const secondDecision = {
      cardId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.cardId || ''),
      primaryTaskId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.primaryTaskId || '')
    };
    const tomorrowMs = nowMs + (24 * 60 * 60 * 1000);
    window.__gsEvaluateDailyRetention(tomorrowMs, { skipPersist: true, forceCheckin: false });
    const tomorrow = {
      dayKey: String(window.__gsState.retention.dailyCare.dayKey || ''),
      buddyCheck: {
        dayKey: String(window.__gsState.retention.dailyCare.buddyCheck && window.__gsState.retention.dailyCare.buddyCheck.dayKey || ''),
        category: String(window.__gsState.retention.dailyCare.buddyCheck && window.__gsState.retention.dailyCare.buddyCheck.category || ''),
        textKey: String(window.__gsState.retention.dailyCare.buddyCheck && window.__gsState.retention.dailyCare.buddyCheck.textKey || '')
      },
      recentTaskIds: Array.isArray(window.__gsState.retention.dailyCare.recentTaskIds)
        ? window.__gsState.retention.dailyCare.recentTaskIds.slice()
        : [],
      decisionCards: {
        dayKey: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.dayKey || ''),
        cardId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.cardId || ''),
        recentCardIds: Array.isArray(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.recentCardIds)
          ? window.__gsState.retention.decisionCards.recentCardIds.slice()
          : []
      },
      tasks: window.__gsState.retention.dailyCare.tasks.map((task) => ({
        id: String(task.id || task.taskId || ''),
        type: String(task.type || ''),
        trigger: String(task.trigger || '')
      }))
    };
    return {
      firstDayKey: String(window.__gsGetLocalDayKey(nowMs)),
      first,
      firstBuddy,
      firstDecision,
      second,
      secondBuddy,
      secondDecision,
      tomorrow
    };
  });

  assert.strictEqual(snapshot.first.length, 3, 'daily tasks must generate exactly 3 tasks');
  const firstIds = snapshot.first.map((entry) => entry.id);
  const firstTriggers = snapshot.first.map((entry) => entry.trigger);
  assert.strictEqual(new Set(firstIds).size, 3, `expected unique daily ids, got ${JSON.stringify(firstIds)}`);
  assert(firstIds.includes('seedling_moisture_round'), `expected seedling moisture task, got ${JSON.stringify(firstIds)}`);
  assert(firstIds.includes('seedling_stability_check'), `expected seedling stability task, got ${JSON.stringify(firstIds)}`);
  assert(firstTriggers.includes('open_app_twice') || firstTriggers.includes('care_sheet_check') || firstTriggers.includes('analysis_sheet_check'), 'expected an engagement-oriented daily task');
  assert.strictEqual(snapshot.firstBuddy.dayKey, snapshot.firstDayKey, 'buddy check should be generated for the same day');
  assert.strictEqual(snapshot.firstBuddy.category, 'water_focus', `expected water-focused buddy check, got ${snapshot.firstBuddy.category}`);
  assert.strictEqual(snapshot.firstBuddy.primaryTaskId, 'seedling_moisture_round', 'buddy check should point to the moisture task');
  assert.strictEqual(snapshot.firstDecision.dayKey, snapshot.firstDayKey, 'decision card should align with the same day');
  assert.strictEqual(snapshot.firstDecision.cardId, 'water_low', `expected low-water decision card, got ${snapshot.firstDecision.cardId}`);
  assert.strictEqual(snapshot.firstDecision.primaryTaskId, 'seedling_moisture_round', 'decision card should inherit the primary daily task');
  assert.deepStrictEqual(snapshot.second, snapshot.first.map((entry) => ({ id: entry.id, type: entry.type })), 'tasks must stay stable during same day');
  assert.deepStrictEqual(snapshot.secondBuddy, {
    category: snapshot.firstBuddy.category,
    textKey: snapshot.firstBuddy.textKey
  }, 'buddy check must stay stable during same day');
  assert.deepStrictEqual(snapshot.secondDecision, {
    cardId: snapshot.firstDecision.cardId,
    primaryTaskId: snapshot.firstDecision.primaryTaskId
  }, 'decision card must stay stable during same day');
  assert.strictEqual(snapshot.tomorrow.tasks.length, 3, 'next day must still have exactly 3 tasks');
  assert.notStrictEqual(snapshot.tomorrow.dayKey, snapshot.firstDayKey, 'next day key should rotate');
  assert.strictEqual(snapshot.tomorrow.buddyCheck.dayKey, snapshot.tomorrow.dayKey, 'next-day buddy check should rotate with the day');
  assert(snapshot.tomorrow.buddyCheck.textKey.length > 0, 'next day should still have a buddy check');
  assert(snapshot.tomorrow.recentTaskIds.length >= 3, 'recent task history should store prior day tasks');
  assert.strictEqual(snapshot.tomorrow.decisionCards.dayKey, snapshot.tomorrow.dayKey, 'decision card state should rotate with the day');
  assert(snapshot.tomorrow.decisionCards.recentCardIds.length >= 1, 'decision cards should remember recent history');
  const repeatedIds = snapshot.tomorrow.tasks.filter((entry) => firstIds.includes(entry.id));
  assert(repeatedIds.length < 3, 'repeat protection should avoid a full identical next-day set');
}

async function scenarioDecisionCardReloadAndDedupe(page) {
  const beforeReload = await page.evaluate(async () => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    window.__gsState.simulation.simDay = 14;
    window.__gsState.plant.phase = 'vegetative';
    window.__gsState.status.water = 45;
    window.__gsState.status.nutrition = 64;
    window.__gsState.status.stress = 18;
    window.__gsState.status.risk = 16;
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [
      {
        id: 'water_recovery_round',
        taskId: 'water_recovery_round',
        type: 'water_recovery_round',
        title: 'daily.task.water_recovery_round.title',
        description: 'daily.task.water_recovery_round.description',
        dayKey,
        trigger: 'water_once',
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 28,
        claimKey: `daily:task:${dayKey}:water_recovery_round`
      },
      {
        id: 'care_sheet_check',
        taskId: 'care_sheet_check',
        type: 'care_sheet_check',
        title: 'daily.task.care_sheet_check.title',
        description: 'daily.task.care_sheet_check.description',
        dayKey,
        trigger: 'care_sheet_check',
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 20,
        claimKey: `daily:task:${dayKey}:care_sheet_check`
      }
    ];
    window.__gsState.retention.dailyCare.buddyCheck = {
      dayKey,
      category: 'water_focus',
      textKey: 'daily.buddy.comment.water_focus.1',
      primaryTaskId: 'water_recovery_round',
      secondaryTaskId: 'care_sheet_check',
      generatedAtMs: nowMs - 400
    };
    window.__gsState.retention.decisionCards = {
      dayKey: '',
      activeCard: {},
      recentCardIds: [],
      history: []
    };

    const evaluated = window.__gsEvaluateDecisionCard(nowMs, { skipPersist: true });
    const firstAnswer = window.__gsAnswerDecisionCard('careful_water', nowMs + 25, { skipPersist: true });
    const secondAnswer = window.__gsAnswerDecisionCard('check_later', nowMs + 26, { skipPersist: true });
    await window.persistState();
    return {
      evaluatedCardId: String(evaluated && evaluated.activeCard && evaluated.activeCard.cardId || ''),
      firstAnswer,
      secondAnswer,
      activeCard: {
        cardId: String(window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.cardId || ''),
        chosenOptionId: String(window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.chosenOptionId || ''),
        answeredAtMs: Number(window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.answeredAtMs || 0),
        focusTaskId: String(window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.focusTaskId || '')
      },
      historyCount: Array.isArray(window.__gsState.retention.decisionCards.history) ? window.__gsState.retention.decisionCards.history.length : 0
    };
  });

  await page.reload({ waitUntil: 'networkidle' });
  await waitForBootReady(page, 25000);

  const afterReload = await page.evaluate(() => {
    const nowMs = Date.now();
    const thirdAnswer = window.__gsAnswerDecisionCard('check_later', nowMs + 10, { skipPersist: true });
    window.__gsEvaluateDecisionCard(nowMs + 20, { skipPersist: true });
    return {
      activeCard: {
        dayKey: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.dayKey || ''),
        cardId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.cardId || ''),
        chosenOptionId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.chosenOptionId || ''),
        answeredAtMs: Number(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.answeredAtMs || 0),
        focusTaskId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.focusTaskId || '')
      },
      historyCount: Array.isArray(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.history)
        ? window.__gsState.retention.decisionCards.history.length
        : 0,
      thirdAnswer
    };
  });

  assert.strictEqual(beforeReload.evaluatedCardId, 'water_low', `expected water_low decision before reload, got ${beforeReload.evaluatedCardId}`);
  assert.strictEqual(beforeReload.firstAnswer.ok, true, 'first decision answer should succeed');
  assert.strictEqual(beforeReload.secondAnswer.ok, false, 'second decision answer should be blocked');
  assert.strictEqual(beforeReload.secondAnswer.reason, 'already_answered', 'decision answer should only apply once per day');
  assert.strictEqual(beforeReload.activeCard.chosenOptionId, 'careful_water', 'selected option should persist before reload');
  assert(beforeReload.activeCard.answeredAtMs > 0, 'decision answer should mark answered time');
  assert.strictEqual(beforeReload.activeCard.focusTaskId, 'water_recovery_round', 'decision answer should focus a safe task');
  assert.strictEqual(beforeReload.historyCount, 1, 'decision history should only record one answer');
  assert.strictEqual(afterReload.activeCard.cardId, 'water_low', 'decision card should survive reload');
  assert.strictEqual(afterReload.activeCard.chosenOptionId, 'careful_water', 'decision choice should survive reload');
  assert(afterReload.activeCard.answeredAtMs > 0, 'decision answered timestamp should survive reload');
  assert.strictEqual(afterReload.activeCard.focusTaskId, 'water_recovery_round', 'decision focus should survive reload');
  assert.strictEqual(afterReload.historyCount, 1, 'reload should not duplicate history entries');
  assert.strictEqual(afterReload.thirdAnswer.ok, false, 're-answer after reload should stay blocked');
  assert.strictEqual(afterReload.thirdAnswer.reason, 'already_answered', 'reload should not reapply decision effects');
}

async function scenarioProgressClaimAndCoinDedupe(page) {
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [
      {
        id: 'seedling_moisture_round',
        taskId: 'seedling_moisture_round',
        type: 'seedling_moisture_round',
        title: 'Seedling moisture round',
        description: 'desc',
        dayKey,
        trigger: 'water_once',
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 28,
        claimKey: `daily:task:${dayKey}:seedling_moisture_round`
      },
      {
        id: 'resolve_pending_pressure',
        taskId: 'resolve_pending_pressure',
        type: 'resolve_pending_pressure',
        title: 'Resolve pending pressure',
        description: 'desc',
        dayKey,
        trigger: 'resolve_one_event',
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 35,
        claimKey: `daily:task:${dayKey}:resolve_pending_pressure`
      },
      {
        id: 'open_app_twice',
        taskId: 'open_app_twice',
        type: 'open_app_twice',
        title: 'Open app twice',
        description: 'desc',
        dayKey,
        trigger: 'open_app_twice',
        progress: 0,
        target: 2,
        completed: false,
        claimed: false,
        rewardCoins: 30,
        claimKey: `daily:task:${dayKey}:open_app_twice`
      }
    ];
    window.__gsState.retention.dailyCare.completedCount = 0;
    window.__gsState.retention.dailyCare.allCompleteClaimed = false;

    // water_once
    window.__gsRetentionTaskUpdate('action_success', { nowMs: nowMs + 10, actionId: 'watering_low_mist', category: 'watering' });
    // resolve_one_event
    window.__gsRetentionTaskUpdate('event_resolved', { nowMs: nowMs + 20, eventId: 'e1' });
    // open_app_twice: first rapid call should be debounced, later call should count
    const fastA = window.__gsRecordRetentionSessionStart(nowMs + 30, 'test', { skipPersist: true });
    const fastB = window.__gsRecordRetentionSessionStart(nowMs + 31, 'test', { skipPersist: true });
    const spaced = window.__gsRecordRetentionSessionStart(nowMs + (50 * 1000), 'test', { skipPersist: true });

    const coinsBeforeClaim = Number(window.getCoins());
    const waterTaskId = 'seedling_moisture_round';
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
        water: Number(byTypeAfter.seedling_moisture_round && byTypeAfter.seedling_moisture_round.progress || 0),
        resolve: Number(byTypeAfter.resolve_pending_pressure && byTypeAfter.resolve_pending_pressure.progress || 0),
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

async function scenarioReloadSafetyAndMissionCoexistence(page) {
  await page.evaluate(async () => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [
      {
        id: 'care_sheet_check',
        taskId: 'care_sheet_check',
        type: 'care_sheet_check',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        trigger: 'care_sheet_check',
        progress: 1,
        target: 1,
        completed: true,
        claimed: true,
        completedAt: nowMs - 500,
        claimedAt: nowMs - 300,
        rewardGrantedAt: nowMs - 300,
        rewardCoins: 20,
        claimKey: `daily:task:${dayKey}:care_sheet_check`
      },
      {
        id: 'analysis_sheet_check',
        taskId: 'analysis_sheet_check',
        type: 'analysis_sheet_check',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        trigger: 'analysis_sheet_check',
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 22,
        claimKey: `daily:task:${dayKey}:analysis_sheet_check`
      },
      {
        id: 'missions_board_check',
        taskId: 'missions_board_check',
        type: 'missions_board_check',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        trigger: 'missions_board_check',
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 20,
        claimKey: `daily:task:${dayKey}:missions_board_check`
      }
    ];
    window.__gsState.retention.dailyCare.completedCount = 1;
    window.__gsState.retention.dailyCare.allCompleteClaimed = false;
    window.__gsState.retention.dailyCare.buddyCheck = {
      dayKey,
      category: 'daily_task_hint',
      textKey: 'daily.buddy.comment.daily_task_hint.1',
      primaryTaskId: 'care_sheet_check',
      secondaryTaskId: 'analysis_sheet_check',
      generatedAtMs: nowMs - 700
    };
    window.__gsState.retention.claimLedger = Array.from(new Set(
      (window.__gsState.retention.claimLedger || []).concat([`daily:task:${dayKey}:care_sheet_check`])
    ));
    await window.persistState();
  });

  await page.reload({ waitUntil: 'networkidle' });
  await waitForBootReady(page, 25000);

  const snapshot = await page.evaluate(() => {
    const retention = window.__gsState.retention || {};
    const daily = retention.dailyCare || {};
    const claimedTask = (daily.tasks || []).find((task) => String(task.taskId || task.id || '') === 'care_sheet_check') || null;
    window.__gsState.simulation.simDay = 3;
    if (typeof window.checkMissions === 'function') {
      window.checkMissions('tick');
    }
    return {
      dailyCount: Array.isArray(daily.tasks) ? daily.tasks.length : 0,
      buddyCheck: {
        dayKey: String(daily.buddyCheck && daily.buddyCheck.dayKey || ''),
        category: String(daily.buddyCheck && daily.buddyCheck.category || ''),
        textKey: String(daily.buddyCheck && daily.buddyCheck.textKey || ''),
        primaryTaskId: String(daily.buddyCheck && daily.buddyCheck.primaryTaskId || '')
      },
      normalizedTitles: (daily.tasks || []).map((task) => String(task.title || '')),
      normalizedDescriptions: (daily.tasks || []).map((task) => String(task.description || '')),
      claimedTask: {
        claimed: Boolean(claimedTask && claimedTask.claimed),
        rewardGrantedAt: Number(claimedTask && claimedTask.rewardGrantedAt || 0),
        ledgerHits: (retention.claimLedger || []).filter((entry) => entry === String(claimedTask && claimedTask.claimKey || '')).length
      },
      missionCompleted: Array.isArray(window.__gsState.missions && window.__gsState.missions.completed)
        ? window.__gsState.missions.completed.includes('mission_001')
        : false
    };
  });

  assert.strictEqual(snapshot.dailyCount, 3, 'reload should preserve daily task count');
  assert.strictEqual(snapshot.buddyCheck.category, 'daily_task_hint', 'buddy check category should survive reload');
  assert.strictEqual(snapshot.buddyCheck.primaryTaskId, 'care_sheet_check', 'buddy check should preserve task context');
  assert(snapshot.buddyCheck.textKey.length > 0, 'buddy check text key should survive reload');
  assert(snapshot.normalizedTitles.every((entry) => /^daily\.task\./.test(entry)), `generic saved titles should normalize to task keys, got ${JSON.stringify(snapshot.normalizedTitles)}`);
  assert(snapshot.normalizedDescriptions.every((entry) => /^daily\.task\./.test(entry)), `generic saved descriptions should normalize to task keys, got ${JSON.stringify(snapshot.normalizedDescriptions)}`);
  assert.strictEqual(snapshot.claimedTask.claimed, true, 'claimed task should remain claimed after reload');
  assert(snapshot.claimedTask.rewardGrantedAt > 0, 'claimed task should keep reward grant timestamp after reload');
  assert.strictEqual(snapshot.claimedTask.ledgerHits, 1, 'claim ledger should keep a single persisted entry');
  assert.strictEqual(snapshot.missionCompleted, true, 'legacy missions should still complete alongside daily care');
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

async function scenarioWeeklyMissionProgressClaimAndReload(page) {
  const reloadNowMs = new Date('2026-06-11T12:00:00').getTime() + 200;
  const result = await page.evaluate(async () => {
    const nowMs = new Date('2026-06-11T12:00:00').getTime();
    const weekKey = '2026-06-08';
    window.__gsState.retention.weekly = undefined;
    window.__gsState.retention.claimLedger = [];
    window.__gsState.retention.dailyCare.dayKey = '2026-06-11';
    window.__gsState.retention.dailyCare.tasks = [];
    window.__gsState.retention.dailyCare.completedCount = 0;
    window.__gsState.retention.dailyCare.allCompleteClaimed = false;
    window.__gsState.retention.coinActions.weeklyPush = {};
    window.__gsState.retention.streak.currentCount = 3;
    window.__gsState.retention.analytics.dailyStats = [
      { dayKey: '2026-06-08', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 },
      { dayKey: '2026-06-09', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 },
      { dayKey: '2026-06-10', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 }
    ];
    window.__gsState.plant.phase = 'vegetative';
    window.__gsState.simulation.simDay = 24;
    window.__gsState.status.water = 64;
    window.__gsState.status.nutrition = 66;
    window.__gsState.status.stress = 24;
    window.__gsState.status.risk = 18;
    const evaluation = window.__gsEvaluateWeeklyMission(nowMs, { skipPersist: true });
    const confirmedEvaluation = window.__gsEvaluateWeeklyMission(nowMs + 1, { skipPersist: true });
    const beforeClaim = {
      weekKey: String(window.__gsState.retention.weekly && window.__gsState.retention.weekly.weekKey || ''),
      missionId: String(window.__gsState.retention.weekly && window.__gsState.retention.weekly.missionId || ''),
      completedAtMs: Number(window.__gsState.retention.weekly && window.__gsState.retention.weekly.completedAtMs || 0),
      rewardCoins: Number(window.__gsState.retention.weekly && window.__gsState.retention.weekly.rewardCoins || 0),
      progressCompleted: Boolean(
        (evaluation && evaluation.progress && evaluation.progress.completed)
        || (confirmedEvaluation && confirmedEvaluation.progress && confirmedEvaluation.progress.completed)
      )
    };
    const coinsBefore = Number(window.getCoins());
    const firstClaim = window.__gsClaimWeeklyMission(nowMs + 100, { skipPersist: true });
    const secondClaim = window.__gsClaimWeeklyMission(nowMs + 101, { skipPersist: true });
    const coinsAfter = Number(window.getCoins());
    const ledgerKey = `weekly:mission:${weekKey}:${beforeClaim.missionId}`;
    await window.persistState();
    return {
      beforeClaim,
      firstClaim,
      secondClaim,
      coinsBefore,
      coinsAfter,
      ledgerHits: (window.__gsState.retention.claimLedger || []).filter((entry) => entry === ledgerKey).length,
      history: Array.isArray(window.__gsState.retention.weekly && window.__gsState.retention.weekly.history)
        ? window.__gsState.retention.weekly.history.slice()
        : []
    };
  });
  await armFixedNowForNextReload(page, reloadNowMs);
  await page.reload({ waitUntil: 'networkidle' });
  await waitForBootReady(page, 25000);
  const afterReload = await page.evaluate(() => ({
    weekKey: String(window.__gsState.retention.weekly && window.__gsState.retention.weekly.weekKey || ''),
    missionId: String(window.__gsState.retention.weekly && window.__gsState.retention.weekly.missionId || ''),
    claimedAtMs: Number(window.__gsState.retention.weekly && window.__gsState.retention.weekly.claimedAtMs || 0),
    historyCount: Array.isArray(window.__gsState.retention.weekly && window.__gsState.retention.weekly.history)
      ? window.__gsState.retention.weekly.history.length
      : 0
  }));
  await clearFixedNowOverride(page);

  assert.strictEqual(result.beforeClaim.weekKey, '2026-06-08', 'weekly mission should initialize with the current week key');
  assert.strictEqual(result.beforeClaim.missionId, 'growth_focus', `expected growth weekly in vegetative phase, got ${result.beforeClaim.missionId}`);
  assert.strictEqual(result.beforeClaim.progressCompleted, true, 'weekly mission should complete from aggregated daily stats');
  assert(result.beforeClaim.rewardCoins > 0, 'weekly mission should carry a reward');
  assert.strictEqual(result.firstClaim.ok, true, 'first weekly claim should succeed');
  assert.strictEqual(result.secondClaim.ok, false, 'second weekly claim should be blocked');
  assert.strictEqual(result.secondClaim.reason, 'already_claimed', 'second weekly claim should report already claimed');
  assert(result.coinsAfter > result.coinsBefore, 'weekly claim should grant coins');
  assert.strictEqual(result.ledgerHits, 1, 'weekly claim should only register one ledger entry');
  assert.strictEqual(afterReload.weekKey, '2026-06-08', 'weekly mission week key should survive reload');
  assert.strictEqual(afterReload.missionId, 'growth_focus', 'weekly mission id should survive reload');
  assert(afterReload.claimedAtMs > 0, 'weekly claim timestamp should survive reload');
}

async function scenarioCoinActionsSpendReloadAndDedupe(page) {
  const purchase = await page.evaluate(async () => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    const weekKey = window.GrowSimWeeklyMissions.getWeekKey(nowMs);
    const weekDate = new Date(`${weekKey}T12:00:00`);
    const plusDays = (offset) => {
      const date = new Date(weekDate.getTime());
      date.setDate(date.getDate() + offset);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    window.__gsState.status.coins = 200;
    window.__gsState.retention.claimLedger = [];
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [
      {
        id: 'veg_feed_support',
        taskId: 'veg_feed_support',
        type: 'veg_feed_support',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        trigger: 'fertilizing_once',
        progress: 1,
        target: 1,
        completed: true,
        claimed: false,
        rewardCoins: 28,
        claimKey: `daily:task:${dayKey}:veg_feed_support`
      },
      {
        id: 'care_sheet_check',
        taskId: 'care_sheet_check',
        type: 'care_sheet_check',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        trigger: 'care_sheet_check',
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 20,
        claimKey: `daily:task:${dayKey}:care_sheet_check`
      },
      {
        id: 'open_app_twice',
        taskId: 'open_app_twice',
        type: 'open_app_twice',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        trigger: 'open_app_twice',
        progress: 1,
        target: 2,
        completed: false,
        claimed: false,
        rewardCoins: 30,
        claimKey: `daily:task:${dayKey}:open_app_twice`
      }
    ];
    window.__gsState.retention.dailyCare.completedCount = 1;
    window.__gsState.retention.dailyCare.buddyCheck = {
      dayKey,
      category: 'nutrient_focus',
      textKey: 'daily.buddy.comment.nutrient_focus.1',
      primaryTaskId: 'veg_feed_support',
      secondaryTaskId: 'care_sheet_check',
      generatedAtMs: nowMs - 500
    };
    window.__gsState.retention.weekly = {
      weekKey,
      missionId: 'growth_focus',
      rewardCoins: 170,
      generatedAtMs: nowMs - 800,
      completedAtMs: 0,
      claimedAtMs: 0,
      history: []
    };
    window.__gsState.retention.analytics.dailyStats = [
      { dayKey: plusDays(0), tasksCompleted: 2, sessionCount: 1, streakContinued: 1 },
      { dayKey: plusDays(1), tasksCompleted: 1, sessionCount: 1, streakContinued: 1 },
      { dayKey: plusDays(2), tasksCompleted: 1, sessionCount: 1, streakContinued: 1 }
    ];
    window.__gsState.retention.streak.currentCount = 3;
    window.__gsState.status.water = 64;
    window.__gsState.status.nutrition = 66;
    window.__gsState.status.stress = 24;
    window.__gsState.status.risk = 18;

    const buddyTip = window.__gsUseCoinAction('buddy_extra_tip', nowMs + 10, { skipPersist: true });
    const buddyTipAgain = window.__gsUseCoinAction('buddy_extra_tip', nowMs + 11, { skipPersist: true });
    const focusBoost = window.__gsUseCoinAction('daily_focus_boost', nowMs + 20, { skipPersist: true });
    const weeklyPush = window.__gsUseCoinAction('weekly_push', nowMs + 30, { skipPersist: true });
    const weeklyPushAgain = window.__gsUseCoinAction('weekly_push', nowMs + 31, { skipPersist: true });
    const safeBoost = window.__gsUseCoinAction('safe_boost_check', nowMs + 40, { skipPersist: true });
    const safeBoostStatus = String(window.__gsState.retention.coinActions.safeBoostCheck && window.__gsState.retention.coinActions.safeBoostCheck.statusKey || '');
    const buddyTipTextKey = String(window.__gsState.retention.coinActions.buddyTip && window.__gsState.retention.coinActions.buddyTip.textKey || '');
    const coinsAfterBuys = Number(window.getCoins());
    const weeklyProgress = window.__gsEvaluateWeeklyMission(nowMs + 50, { skipPersist: true });
    const claim = window.__gsClaimDailyTask('veg_feed_support', nowMs + 60, { skipPersist: true });
    const secondClaim = window.__gsClaimDailyTask('veg_feed_support', nowMs + 61, { skipPersist: true });
    const focusState = window.__gsState.retention.coinActions.focusBoost || {};
    const spendBlockedByCoins = (() => {
      window.__gsState.retention.coinActions.buddyTip = {
        dayKey: '',
        category: '',
        textKey: '',
        primaryTaskId: '',
        weeklyMissionId: '',
        purchasedAtMs: 0
      };
      window.__gsState.status.coins = 0;
      return window.__gsUseCoinAction('buddy_extra_tip', nowMs + 70, { skipPersist: true });
    })();
    await window.persistState();
    return {
      buddyTip,
      buddyTipAgain,
      focusBoost,
      weeklyPush,
      weeklyPushAgain,
      safeBoost,
      claim,
      secondClaim,
      coinsAfterBuys,
      weeklyProgressCompleted: Boolean(weeklyProgress && weeklyProgress.progress && weeklyProgress.progress.completed),
      weeklyTaskCount: (() => {
        const objective = (weeklyProgress && weeklyProgress.progress && Array.isArray(weeklyProgress.progress.objectives))
          ? weeklyProgress.progress.objectives.find((entry) => entry.metric === 'tasks_completed_week')
          : null;
        return Number(objective && objective.current || 0);
      })(),
      focusClaimedAtMs: Number(focusState.claimedAtMs || 0),
      buddyTipTextKey,
      safeBoostStatus,
      spendBlockedByCoins
    };
  });

  await page.reload({ waitUntil: 'networkidle' });
  await waitForBootReady(page, 25000);
  const afterReload = await page.evaluate(() => ({
    buddyTipDayKey: String(window.__gsState.retention.coinActions && window.__gsState.retention.coinActions.buddyTip && window.__gsState.retention.coinActions.buddyTip.dayKey || ''),
    focusClaimedAtMs: Number(window.__gsState.retention.coinActions && window.__gsState.retention.coinActions.focusBoost && window.__gsState.retention.coinActions.focusBoost.claimedAtMs || 0),
    weeklyPushWeekKey: String(window.__gsState.retention.coinActions && window.__gsState.retention.coinActions.weeklyPush && window.__gsState.retention.coinActions.weeklyPush.weekKey || ''),
    safeBoostStatus: String(window.__gsState.retention.coinActions && window.__gsState.retention.coinActions.safeBoostCheck && window.__gsState.retention.coinActions.safeBoostCheck.statusKey || '')
  }));

  assert.strictEqual(purchase.buddyTip.ok, true, 'buddy extra tip purchase should succeed');
  assert.strictEqual(purchase.buddyTipAgain.ok, false, 'buddy extra tip should only be purchasable once per day');
  assert.strictEqual(purchase.focusBoost.ok, true, 'daily focus boost should succeed');
  assert.strictEqual(purchase.weeklyPush.ok, true, 'weekly push should succeed once');
  assert.strictEqual(purchase.weeklyPushAgain.ok, false, 'weekly push should only work once per week');
  assert.strictEqual(purchase.safeBoost.ok, true, 'safe boost check should succeed');
  assert(purchase.buddyTipTextKey.length > 0, 'buddy extra tip should persist a text key');
  assert(['safe', 'caution', 'unsafe'].includes(purchase.safeBoostStatus), 'safe boost check should persist a safety state');
  assert.strictEqual(purchase.weeklyTaskCount, 5, 'weekly push should add exactly one weekly task count');
  assert.strictEqual(purchase.weeklyProgressCompleted, true, 'weekly push should be able to finish a nearly complete weekly mission');
  assert.strictEqual(purchase.claim.ok, true, 'focused task claim should succeed');
  assert.strictEqual(purchase.claim.focusBonus, 8, 'focused claim should grant the configured focus bonus');
  assert.strictEqual(purchase.secondClaim.ok, false, 'focused task should still only claim once');
  assert(purchase.focusClaimedAtMs > 0, 'focus boost should mark itself consumed after claim');
  assert.strictEqual(purchase.spendBlockedByCoins.ok, false, 'coin action should be blocked when coins are missing');
  assert.strictEqual(purchase.spendBlockedByCoins.reason, 'insufficient_coins', 'missing coins should return the existing spend reason');
  assert(afterReload.weeklyPushWeekKey.length > 0, 'weekly push state should survive reload');
  assert(afterReload.focusClaimedAtMs > 0, 'focus boost consumption should survive reload');
  assert(afterReload.safeBoostStatus.length > 0, 'safe boost check result should survive reload');
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
      hasWeekly: Boolean(retention.weekly && typeof retention.weekly === 'object'),
      hasDecisionCards: Boolean(retention.decisionCards && typeof retention.decisionCards === 'object'),
      hasCoinActions: Boolean(retention.coinActions && typeof retention.coinActions === 'object'),
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
  assert.strictEqual(result.hasWeekly, true, 'migration should initialize weekly state');
  assert.strictEqual(result.hasDecisionCards, true, 'migration should initialize decision card state');
  assert.strictEqual(result.hasCoinActions, true, 'migration should initialize coin action state');
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
    await scenarioWeeklyMissionProgressClaimAndReload(page);
    await scenarioCoinActionsSpendReloadAndDedupe(page);
    await scenarioDecisionCardReloadAndDedupe(page);
    await scenarioRetentionMigrationCompatibility(page);
    await scenarioReloadSafetyAndMissionCoexistence(page);
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
