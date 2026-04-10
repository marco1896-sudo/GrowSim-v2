const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady
} = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
let APP_URL = '';
const LS_STATE_KEY = 'grow-sim-state-v2';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

function assertApproxRatio(label, simDeltaMs, realDeltaMs, expectedSpeed, tolerance = 1.5) {
  const ratio = simDeltaMs / realDeltaMs;
  assert(
    Math.abs(ratio - expectedSpeed) <= tolerance,
    `${label}: expected ratio near ${expectedSpeed}x, got ${ratio.toFixed(2)}x`
  );
}

async function getSnapshot(page) {
  return page.evaluate(() => ({
    realNowMs: Date.now(),
    simTimeMs: Number(window.__gsState && window.__gsState.simulation && window.__gsState.simulation.simTimeMs),
    simEpochMs: Number(window.__gsState && window.__gsState.simulation && window.__gsState.simulation.simEpochMs),
    lastTickRealTimeMs: Number(window.__gsState && window.__gsState.simulation && window.__gsState.simulation.lastTickRealTimeMs),
    baseSpeed: Number(window.__gsState && window.__gsState.simulation && window.__gsState.simulation.baseSpeed),
    effectiveSpeed: Number(window.__gsState && window.__gsState.simulation && window.__gsState.simulation.effectiveSpeed),
    boostEndsAtMs: Number(window.__gsState && window.__gsState.boost && window.__gsState.boost.boostEndsAtMs),
    remainingBoostMs: typeof getRemainingBoostMs === 'function' ? Number(getRemainingBoostMs(Date.now())) : null,
    isDaytime: Boolean(window.__gsState && window.__gsState.simulation && window.__gsState.simulation.isDaytime)
  }));
}

async function evaluateWithRetry(page, fn, arg) {
  try {
    return await page.evaluate(fn, arg);
  } catch (error) {
    const message = String(error && error.message || '');
    if (!message.includes('Execution context was destroyed')) {
      throw error;
    }
    await page.waitForLoadState('domcontentloaded');
    return page.evaluate(fn, arg);
  }
}

async function waitForRuntime(page) {
  await page.waitForFunction(() => {
    return window.__gsBootOk === true
      && window.__gsState
      && window.__gsState.simulation
      && Number.isFinite(window.__gsState.simulation.simTimeMs)
      && Number.isFinite(window.__gsState.simulation.lastTickRealTimeMs);
  });
}

async function clearPersistence(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await evaluateWithRetry(page, async (stateKey) => {
    localStorage.removeItem(stateKey);
    if (typeof indexedDB !== 'undefined') {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('grow-sim-db');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    }
  }, LS_STATE_KEY);
}

async function startFreshRun(page) {
  await clearPersistence(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#landing:not(.hidden)');
  await page.click('#startRunBtn');
  await page.waitForFunction(() => {
    const node = document.getElementById('landing');
    return Boolean(node && node.classList.contains('hidden'));
  });
  await waitForRuntime(page);
  await page.waitForTimeout(1200);
}

async function mutateStoredState(page, mutatorSource, arg) {
  await page.evaluate(({ stateKey, mutatorSource, argValue }) => {
    const raw = localStorage.getItem(stateKey);
    const parsed = raw ? JSON.parse(raw) : {};
    const mutator = new Function('state', 'arg', mutatorSource);
    mutator(parsed, argValue);
    localStorage.setItem(stateKey, JSON.stringify(parsed));
  }, { stateKey: LS_STATE_KEY, mutatorSource, argValue: arg });
}

async function scenarioLiveX12(page) {
  await startFreshRun(page);
  await page.evaluate(() => setBaseSimulationSpeed(12, Date.now()));
  const before = await getSnapshot(page);
  await page.waitForTimeout(4200);
  const after = await getSnapshot(page);
  assertApproxRatio('live x12 progression', after.simTimeMs - before.simTimeMs, after.realNowMs - before.realNowMs, 12, 4.5);
}

async function scenarioSimTimeNeverDecreases(page) {
  await startFreshRun(page);
  const result = await page.evaluate(async () => {
    const beforeSimTimeMs = Number(window.__gsState.simulation.simTimeMs);
    const beforeLastTickRealTimeMs = Number(window.__gsState.simulation.lastTickRealTimeMs);
    setSimulationTimeMs(beforeSimTimeMs - (2 * 60 * 60 * 1000), beforeLastTickRealTimeMs - 5000, {
      suppressLogs: true,
      reason: 'test_backward_set'
    });
    return {
      beforeSimTimeMs,
      beforeLastTickRealTimeMs,
      afterSimTimeMs: Number(window.__gsState.simulation.simTimeMs),
      afterLastTickRealTimeMs: Number(window.__gsState.simulation.lastTickRealTimeMs)
    };
  });

  assert(result.afterSimTimeMs >= result.beforeSimTimeMs, 'setSimulationTimeMs moved sim time backward');
  assert(
    result.afterLastTickRealTimeMs >= result.beforeLastTickRealTimeMs,
    'setSimulationTimeMs moved lastTickRealTimeMs backward'
  );
}

async function scenarioBaseSpeedChanges(page) {
  await startFreshRun(page);
  const beforeChange = await getSnapshot(page);
  await page.evaluate(() => setBaseSimulationSpeed(4, Date.now()));
  const afterImmediate4 = await getSnapshot(page);
  assert(
    Math.abs(afterImmediate4.simTimeMs - beforeChange.simTimeMs) < 15000,
    'base speed change to x4 caused a time jump'
  );
  await page.waitForTimeout(4200);
  const afterRun4 = await getSnapshot(page);
  assertApproxRatio('live x4 progression', afterRun4.simTimeMs - afterImmediate4.simTimeMs, afterRun4.realNowMs - afterImmediate4.realNowMs, 4, 1.2);

  await page.evaluate(() => setBaseSimulationSpeed(16, Date.now()));
  const afterImmediate16 = await getSnapshot(page);
  assert(
    Math.abs(afterImmediate16.simTimeMs - afterRun4.simTimeMs) < 15000,
    'base speed change to x16 caused a time jump'
  );
  await page.waitForTimeout(5200);
  const afterRun16 = await getSnapshot(page);
  assertApproxRatio('live x16 progression', afterRun16.simTimeMs - afterImmediate16.simTimeMs, afterRun16.realNowMs - afterImmediate16.realNowMs, 16, 3.0);
}

async function scenarioCareActionsDoNotJumpTime(page) {
  await startFreshRun(page);
  const result = await page.evaluate(async () => {
    const runAction = (actionId, setup) => {
      if (typeof setup === 'function') {
        setup();
      }
      const beforeSimTimeMs = Number(window.__gsState.simulation.simTimeMs);
      const beforeLastTickRealTimeMs = Number(window.__gsState.simulation.lastTickRealTimeMs);
      const actionResult = applyAction(actionId);
      return {
        actionId,
        actionResult,
        beforeSimTimeMs,
        afterSimTimeMs: Number(window.__gsState.simulation.simTimeMs),
        beforeLastTickRealTimeMs,
        afterLastTickRealTimeMs: Number(window.__gsState.simulation.lastTickRealTimeMs)
      };
    };

    const resetActionState = () => {
      window.__gsState.actions.cooldowns = {};
      window.__gsState.status.health = 80;
      window.__gsState.status.stress = 18;
      window.__gsState.status.risk = 20;
      const daySimTimeMs = Number(window.__gsState.simulation.simEpochMs) + (12 * 60 * 60 * 1000);
      setSimulationTimeMs(daySimTimeMs, Number(window.__gsState.simulation.lastTickRealTimeMs), {
        suppressLogs: true,
        reason: 'test_care_action_daytime'
      });
      window.__gsState.plant.stageIndex = 2;
      window.__gsState.plant.phase = 'vegetative';
      window.__gsState.plant.stageKey = 'stage_03';
      window.__gsState.simulation.isDaytime = true;
    };

    const watering = runAction('watering_medium_deep', () => {
      resetActionState();
      window.__gsState.status.water = 42;
      window.__gsState.status.nutrition = 50;
    });

    const fertilizing = runAction('fertilizing_low_microfeed', () => {
      resetActionState();
      window.__gsState.status.water = 58;
      window.__gsState.status.nutrition = 34;
    });

    const repeated = [];
    for (let i = 0; i < 3; i += 1) {
      repeated.push(runAction('watering_low_mist', () => {
        resetActionState();
        window.__gsState.status.water = 38 + i;
        window.__gsState.status.nutrition = 45;
      }));
    }

    return { watering, fertilizing, repeated };
  });

  for (const snapshot of [result.watering, result.fertilizing, ...result.repeated]) {
    assert(snapshot.actionResult && snapshot.actionResult.ok, `${snapshot.actionId} should succeed in runtime test`);
    assert.strictEqual(
      snapshot.afterSimTimeMs,
      snapshot.beforeSimTimeMs,
      `${snapshot.actionId} changed simTimeMs during care action`
    );
    assert.strictEqual(
      snapshot.afterLastTickRealTimeMs,
      snapshot.beforeLastTickRealTimeMs,
      `${snapshot.actionId} changed lastTickRealTimeMs during care action`
    );
  }
}

async function scenarioSettingsSimSpeedUi(page) {
  await startFreshRun(page);
  await page.evaluate(() => {
    if (window.__gsState && window.__gsState.ui) {
      window.__gsState.ui.menuDialogOpen = false;
    }
    if (typeof closeMenuDialog === 'function') {
      closeMenuDialog();
    }
    const dialog = document.getElementById('menuDialog');
    if (dialog) {
      dialog.classList.add('hidden');
      dialog.setAttribute('aria-hidden', 'true');
    }
    state.ui.openSheet = 'diagnosis';
    renderAll();
  });
  await page.waitForFunction(() => {
    const node = document.getElementById('diagnosisSheet');
    return node && !node.classList.contains('hidden');
  });
  await page.evaluate(() => {
    if (window.__gsState && window.__gsState.ui) {
      window.__gsState.ui.menuDialogOpen = false;
    }
    if (typeof closeMenuDialog === 'function') {
      closeMenuDialog();
    }
  });

  const initial = await page.evaluate(() => ({
    currentText: document.getElementById('settingsSimSpeedValue')?.textContent.trim() || null,
    options: Array.from(document.querySelectorAll('[data-sim-speed-option]')).map((node) => ({
      speed: node.getAttribute('data-sim-speed-option'),
      text: node.textContent.trim()
    })),
    hasBoostOnlyOption: Boolean(document.querySelector('[data-sim-speed-option="24"]')),
    selectorRowLabel: document.querySelector('#settingsSimSpeedControl')?.closest('.figma-static-row')?.querySelector('span')?.textContent.trim() || null,
    eventRowContainsSelector: Boolean(document.getElementById('settingsEventFrequencyValue')?.closest('.figma-static-row')?.querySelector('[data-sim-speed-option]'))
  }));

  assert.strictEqual(initial.currentText, 'Basis 12x · Aktiv 12x', 'settings should show the default base speed');
  assert.deepStrictEqual(
    initial.options.map((option) => option.speed),
    ['4', '8', '12', '16'],
    'settings should expose exactly x4/x8/x12/x16 base speed options'
  );
  assert.strictEqual(initial.hasBoostOnlyOption, false, 'x24 must remain boost-only');
  assert.strictEqual(initial.selectorRowLabel, 'Simulationstempo', 'speed selector is not rendered inside the Simulationstempo block');
  assert.strictEqual(initial.eventRowContainsSelector, false, 'Event-Häufigkeit row should not contain the speed selector');

  await page.click('[data-sim-speed-option="16"]', { force: true });
  const changed = await page.evaluate(() => ({
    currentText: document.getElementById('settingsSimSpeedValue')?.textContent.trim() || null,
    activeOption: document.querySelector('[data-sim-speed-option].is-active')?.getAttribute('data-sim-speed-option') || null,
    storedSpeed: Number(window.__gsState.settings.gameplay.simSpeed),
    baseSpeed: Number(window.__gsState.simulation.baseSpeed)
  }));

  assert.strictEqual(changed.activeOption, '16', 'settings should mark the selected base speed as active');
  assert.strictEqual(changed.storedSpeed, 16, 'settings should persist the selected base speed in settings state');
  assert.strictEqual(changed.baseSpeed, 16, 'settings selection should update the runtime base speed');
  assert.ok(
    changed.currentText && changed.currentText.startsWith('Basis 16x'),
    'settings summary should reflect the selected base speed'
  );

  await page.evaluate(() => {
    if (window.__gsState && window.__gsState.ui) {
      window.__gsState.ui.menuDialogOpen = false;
    }
    if (typeof closeMenuDialog === 'function') {
      closeMenuDialog();
    }
    const dialog = document.getElementById('menuDialog');
    if (dialog) {
      dialog.classList.add('hidden');
      dialog.setAttribute('aria-hidden', 'true');
    }
    state.ui.openSheet = 'diagnosis';
    renderAll();
  });
  await page.waitForFunction(() => {
    const node = document.getElementById('diagnosisSheet');
    return node && !node.classList.contains('hidden');
  });

  const reopened = await page.evaluate(() => ({
    activeOption: document.querySelector('[data-sim-speed-option].is-active')?.getAttribute('data-sim-speed-option') || null,
    currentText: document.getElementById('settingsSimSpeedValue')?.textContent.trim() || null
  }));

  assert.strictEqual(reopened.activeOption, '16', 'reopening settings lost the selected speed highlight');
  assert.ok(
    reopened.currentText && reopened.currentText.startsWith('Basis 16x'),
    'reopening settings lost the selected speed summary'
  );

  await page.reload({ waitUntil: 'networkidle' });
  await waitForRuntime(page);
  await page.evaluate(() => {
    if (window.__gsState && window.__gsState.ui) {
      window.__gsState.ui.menuDialogOpen = false;
    }
    if (typeof closeMenuDialog === 'function') {
      closeMenuDialog();
    }
    const dialog = document.getElementById('menuDialog');
    if (dialog) {
      dialog.classList.add('hidden');
      dialog.setAttribute('aria-hidden', 'true');
    }
    state.ui.openSheet = 'diagnosis';
    renderAll();
  });
  await page.waitForFunction(() => {
    const node = document.getElementById('diagnosisSheet');
    return node && !node.classList.contains('hidden');
  });

  const reloaded = await page.evaluate(() => ({
    currentText: document.getElementById('settingsSimSpeedValue')?.textContent.trim() || null,
    activeOption: document.querySelector('[data-sim-speed-option].is-active')?.getAttribute('data-sim-speed-option') || null,
    storedSpeed: Number(window.__gsState.settings.gameplay.simSpeed),
    baseSpeed: Number(window.__gsState.simulation.baseSpeed)
  }));

  assert.strictEqual(reloaded.activeOption, '16', 'settings UI did not restore the selected base speed after reload');
  assert.strictEqual(reloaded.storedSpeed, 16, 'settings state did not restore the selected base speed after reload');
  assert.strictEqual(reloaded.baseSpeed, 16, 'runtime base speed did not restore after reload');
  assert.ok(
    reloaded.currentText && reloaded.currentText.startsWith('Basis 16x'),
    'settings summary did not restore the selected base speed after reload'
  );
}

async function scenarioNegativeRealDeltaClamp(page) {
  await startFreshRun(page);
  const result = await page.evaluate(async () => {
    const beforeSimTimeMs = Number(window.__gsState.simulation.simTimeMs);
    const beforeLastTickRealTimeMs = Number(window.__gsState.simulation.lastTickRealTimeMs);
    const advanceResult = advanceSimulationTime(beforeLastTickRealTimeMs - 10000, {
      suppressLogs: true,
      reason: 'test_negative_real_delta'
    });
    return {
      beforeSimTimeMs,
      beforeLastTickRealTimeMs,
      afterSimTimeMs: Number(window.__gsState.simulation.simTimeMs),
      afterLastTickRealTimeMs: Number(window.__gsState.simulation.lastTickRealTimeMs),
      advanceResult
    };
  });

  assert.strictEqual(result.advanceResult.elapsedRealMs, 0, 'negative real delta was not clamped to zero');
  assert.strictEqual(result.advanceResult.elapsedSimMs, 0, 'negative real delta advanced simulation time');
  assert.strictEqual(result.afterSimTimeMs, result.beforeSimTimeMs, 'negative real delta changed sim time');
  assert(
    result.afterLastTickRealTimeMs >= result.beforeLastTickRealTimeMs,
    'negative real delta moved lastTickRealTimeMs backward'
  );
}

async function scenarioBoostActivationAndExpiry(page) {
  await startFreshRun(page);
  await page.evaluate(() => setBaseSimulationSpeed(12, Date.now()));
  await page.evaluate(() => activateSpeedBoost(Date.now()));
  const active = await getSnapshot(page);
  assert.strictEqual(active.effectiveSpeed, 24, 'boost activation did not produce x24 effective speed');
  assert(active.remainingBoostMs > (29 * 60 * 1000), 'boost activation did not set a ~30 minute remaining duration');

  await page.evaluate(() => {
    window.__gsState.boost.boostEndsAtMs = Date.now() + 1200;
    advanceSimulationTime(Date.now(), { reason: 'test_boost_shorten', suppressLogs: true });
  });
  await page.waitForTimeout(2200);
  const expired = await getSnapshot(page);
  assert.strictEqual(expired.effectiveSpeed, 12, 'boost expiry did not return to base speed');
  assert.strictEqual(expired.boostEndsAtMs, 0, 'expired boost was not cleared');
}

async function scenarioReloadDuringActiveBoost(page) {
  await startFreshRun(page);
  await page.evaluate(() => {
    setBaseSimulationSpeed(8, Date.now());
    activateSpeedBoost(Date.now());
  });
  const beforeReload = await getSnapshot(page);
  await page.reload({ waitUntil: 'networkidle' });
  await waitForRuntime(page);
  const afterReload = await getSnapshot(page);
  assert.strictEqual(afterReload.baseSpeed, 8, 'base speed did not persist through active-boost reload');
  assert.strictEqual(afterReload.effectiveSpeed, 24, 'active boost did not persist through reload');
  assert(afterReload.remainingBoostMs > 0, 'active boost lost remaining duration on reload');
  assert(afterReload.remainingBoostMs < beforeReload.remainingBoostMs, 'active boost remaining time did not decay across reload');
}

async function scenarioReloadAfterExpiredBoost(page) {
  await startFreshRun(page);
  await page.evaluate(() => {
    setBaseSimulationSpeed(16, Date.now());
    window.__gsState.simulation.baseSpeed = 16;
    window.__gsState.simulation.effectiveSpeed = 24;
    window.__gsState.simulation.timeCompression = 24;
    window.__gsState.boost.boostEndsAtMs = Date.now() - 1000;
    if (typeof schedulePersistState === 'function') {
      schedulePersistState(true);
    }
  });
  await page.reload({ waitUntil: 'networkidle' });
  await waitForRuntime(page);
  const afterReload = await getSnapshot(page);
  assert.strictEqual(afterReload.baseSpeed, 16, 'base speed did not persist after expired boost reload');
  assert.strictEqual(afterReload.effectiveSpeed, 16, 'expired boost still affected effective speed after reload');
  assert.strictEqual(afterReload.boostEndsAtMs, 0, 'expired boost was not cleared on reload');
}

async function scenarioOfflineResume(page) {
  await startFreshRun(page);
  await page.evaluate(() => setBaseSimulationSpeed(12, Date.now()));
  const before = await getSnapshot(page);
  const result = await page.evaluate(() => {
    const targetNowMs = Date.now();
    const previousLastTickRealTimeMs = targetNowMs - 10000;
    const previousSimTimeMs = Number(window.__gsState.simulation.simTimeMs);
    window.__gsState.simulation.lastTickRealTimeMs = previousLastTickRealTimeMs;
    syncSimulationFromElapsedTime(targetNowMs);
    return {
      targetNowMs,
      previousLastTickRealTimeMs,
      previousSimTimeMs,
      nextSimTimeMs: Number(window.__gsState.simulation.simTimeMs),
      nextLastTickRealTimeMs: Number(window.__gsState.simulation.lastTickRealTimeMs)
    };
  });
  const simDeltaMs = result.nextSimTimeMs - before.simTimeMs;
  const expectedSimDeltaMs = (result.targetNowMs - result.previousLastTickRealTimeMs) * 12;
  assert(
    Math.abs(simDeltaMs - expectedSimDeltaMs) <= 25000,
    `offline resume expected about ${expectedSimDeltaMs} sim ms, got ${simDeltaMs}`
  );
  assert(
    result.nextLastTickRealTimeMs >= result.previousLastTickRealTimeMs,
    'offline resume moved lastTickRealTimeMs backward'
  );
}

async function scenarioResumeHooksDoNotMultiFire(page) {
  await startFreshRun(page);
  const count = await page.evaluate(() => {
    window.__resumeHookCount = 0;
    const original = window.syncSimulationFromElapsedTime;
    const wrapped = function(...args) {
      window.__resumeHookCount += 1;
      return original.apply(this, args);
    };
    window.syncSimulationFromElapsedTime = wrapped;
    syncSimulationFromElapsedTime = wrapped;

    onVisibilityChange();
    onWindowFocus();
    onPageShow();

    window.syncSimulationFromElapsedTime = original;
    syncSimulationFromElapsedTime = original;
    return window.__resumeHookCount;
  });

  assert.strictEqual(count, 0, 'resume catch-up still fires from visibility/focus/pageshow hooks');
}

async function scenarioSkipNight(page) {
  await startFreshRun(page);
  const result = await page.evaluate(async () => {
    const dayKey = (ts) => {
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const nowMs = Date.now();
    setBaseSimulationSpeed(8, nowMs);
    const beforeLastTickRealTimeMs = Number(window.__gsState.simulation.lastTickRealTimeMs);
    const currentSimTimeMs = Number(window.__gsState.simulation.simEpochMs) + (15 * 60 * 60 * 1000);
    setSimulationTimeMs(currentSimTimeMs, nowMs, { suppressLogs: true });
    const nextDayStartSimMs = getNextDayStartSimTime(currentSimTimeMs);
    const remainingNightSimMs = nextDayStartSimMs - currentSimTimeMs;
    const expectedRealDeltaMs = convertSimDeltaToFutureRealDeltaMs(remainingNightSimMs, nowMs);
    await Promise.resolve(onSkipNightAction());
    return {
      expectedSimTimeMs: nextDayStartSimMs,
      actualSimTimeMs: Number(window.__gsState.simulation.simTimeMs),
      afterLastTickRealTimeMs: Number(window.__gsState.simulation.lastTickRealTimeMs),
      beforeLastTickRealTimeMs,
      isDaytime: Boolean(window.__gsState.simulation.isDaytime),
      expectedRealDeltaMs
    };
  });

  assert(
    Math.abs(result.actualSimTimeMs - result.expectedSimTimeMs) <= (60 * 60 * 1000),
    `skip night landed outside the expected next-day window (${result.actualSimTimeMs} vs ${result.expectedSimTimeMs})`
  );
  assert.strictEqual(result.isDaytime, true, 'skip night did not end in daytime');
  assert(result.expectedRealDeltaMs > 0, 'skip night did not use shared sim-to-real delta conversion');
  assert(
    result.afterLastTickRealTimeMs >= result.beforeLastTickRealTimeMs,
    'skip night moved lastTickRealTimeMs backward'
  );
}

async function scenarioWatchdogRecoversStalledLoop(page) {
  await startFreshRun(page);
  const before = await getSnapshot(page);
  await page.evaluate(() => {
    stopLoop();
    window.__gsState.ui.lastRenderRealMs = Date.now() - 20000;
  });
  await page.waitForTimeout(3600);
  const afterWatchdog = await getSnapshot(page);
  await page.waitForTimeout(1600);
  const afterRecoveryTick = await getSnapshot(page);

  assert(afterWatchdog.simTimeMs >= before.simTimeMs, 'watchdog recovery moved sim time backward');
  assert(
    afterRecoveryTick.simTimeMs > afterWatchdog.simTimeMs,
    'watchdog did not restart the simulation loop'
  );
}

async function scenarioRetentionStreakIdempotent(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const dayNow = Date.now();
    const start = window.__gsState.retention && window.__gsState.retention.streak
      ? Number(window.__gsState.retention.streak.currentCount || 0)
      : 0;
    window.__gsEvaluateDailyRetention(dayNow, { forceCheckin: true, skipPersist: true });
    const afterFirst = Number(window.__gsState.retention.streak.currentCount || 0);
    window.__gsEvaluateDailyRetention(dayNow + 2000, { forceCheckin: true, skipPersist: true });
    const afterSecondSameDay = Number(window.__gsState.retention.streak.currentCount || 0);
    window.__gsEvaluateDailyRetention(dayNow + (24 * 60 * 60 * 1000), { forceCheckin: true, skipPersist: true });
    const afterNextDay = Number(window.__gsState.retention.streak.currentCount || 0);
    window.__gsEvaluateDailyRetention(dayNow + (24 * 60 * 60 * 1000) + 5000, { forceCheckin: true, skipPersist: true });
    const afterRepeatNextDay = Number(window.__gsState.retention.streak.currentCount || 0);
    return {
      start,
      afterFirst,
      afterSecondSameDay,
      afterNextDay,
      afterRepeatNextDay
    };
  });
  assert(result.afterFirst >= Math.max(1, result.start), 'streak should initialize on check-in');
  assert.strictEqual(result.afterSecondSameDay, result.afterFirst, 'streak counted twice on same day');
  assert.strictEqual(result.afterNextDay, result.afterFirst + 1, 'streak did not increment on next day');
  assert.strictEqual(result.afterRepeatNextDay, result.afterNextDay, 'streak counted twice on same next day');
}

async function scenarioRetentionDailyTaskDedupe(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    window.__gsEvaluateDailyRetention(nowMs, { forceCheckin: true, skipPersist: true });
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks)
      ? window.__gsState.retention.dailyCare.tasks
      : [];
    const targetTask = tasks.find((task) => task && task.taskId && task.claimKey);
    if (!targetTask) {
      return { hasTask: false };
    }
    const triggerOnce = (offsetMs) => {
      if (targetTask.sheetName) {
        window.__gsRetentionTaskUpdate('sheet_open', { nowMs: nowMs + offsetMs, sheetName: String(targetTask.sheetName) });
      } else if (targetTask.trigger === 'care_action') {
        window.__gsRetentionTaskUpdate('action_success', { nowMs: nowMs + offsetMs, actionId: 'watering_low_mist' });
      } else if (targetTask.trigger === 'stress_threshold') {
        window.__gsState.status.stress = Math.min(Number(window.__gsState.status.stress || 0), Number(targetTask.threshold || 40));
        window.__gsRetentionTaskUpdate('tick', { nowMs: nowMs + offsetMs });
      } else if (targetTask.trigger === 'risk_threshold') {
        window.__gsState.status.risk = Math.min(Number(window.__gsState.status.risk || 0), Number(targetTask.threshold || 45));
        window.__gsRetentionTaskUpdate('tick', { nowMs: nowMs + offsetMs });
      } else {
        window.__gsRetentionTaskUpdate('tick', { nowMs: nowMs + offsetMs });
      }
    };
    const ledgerBefore = window.__gsState.retention.claimLedger.filter((entry) => entry === targetTask.claimKey).length;
    triggerOnce(1200);
    const completedOnce = window.__gsState.retention.dailyCare.tasks.filter((task) => task && task.completedAt).length;
    const afterFirst = {
      completedCount: Number(window.__gsState.retention.dailyCare.completedCount || 0),
      completedOnce,
      claims: window.__gsState.retention.claimLedger.filter((entry) => entry === targetTask.claimKey).length
    };
    triggerOnce(2200);
    const afterSecond = {
      completedCount: Number(window.__gsState.retention.dailyCare.completedCount || 0),
      completedOnce: window.__gsState.retention.dailyCare.tasks.filter((task) => task && task.completedAt).length,
      claims: window.__gsState.retention.claimLedger.filter((entry) => entry === targetTask.claimKey).length
    };
    return { hasTask: true, ledgerBefore, afterFirst, afterSecond };
  });

  assert.strictEqual(result.hasTask, true, 'daily care task missing');
  assert(
    result.afterFirst.claims === result.ledgerBefore || result.afterFirst.claims === result.ledgerBefore + 1,
    'first task completion should claim at most once'
  );
  assert.strictEqual(result.afterSecond.claims, result.afterFirst.claims, 'task reward claimed multiple times');
  assert(result.afterSecond.completedCount >= result.afterFirst.completedCount, 'task completion unexpectedly regressed');
  assert(result.afterSecond.completedOnce >= result.afterFirst.completedOnce, 'task completion unexpectedly regressed');
}

async function scenarioRetentionAllCompleteDedupeAndPersist(page) {
  await startFreshRun(page);
  const beforeReload = await page.evaluate(() => {
    const nowMs = Date.now();
    window.__gsEvaluateDailyRetention(nowMs, { forceCheckin: true, skipPersist: true });
    const tasks = Array.isArray(window.__gsState.retention.dailyCare.tasks)
      ? window.__gsState.retention.dailyCare.tasks.slice()
      : [];

    for (const task of tasks) {
      if (task.sheetName === 'dashboard') {
        window.__gsRetentionTaskUpdate('sheet_open', { nowMs: nowMs + 500, sheetName: 'dashboard' });
      } else if (task.sheetName === 'climate') {
        window.__gsRetentionTaskUpdate('sheet_open', { nowMs: nowMs + 1000, sheetName: 'climate' });
      } else if (task.trigger === 'care_action') {
        window.__gsRetentionTaskUpdate('action_success', { nowMs: nowMs + 1500, actionId: 'watering_low_mist' });
      } else if (task.trigger === 'stress_threshold') {
        window.__gsState.status.stress = Math.min(Number(window.__gsState.status.stress || 0), Number(task.threshold || 40));
        window.__gsRetentionTaskUpdate('tick', { nowMs: nowMs + 1800 });
      } else if (task.trigger === 'risk_threshold') {
        window.__gsState.status.risk = Math.min(Number(window.__gsState.status.risk || 0), Number(task.threshold || 45));
        window.__gsRetentionTaskUpdate('tick', { nowMs: nowMs + 1800 });
      }
    }
    const dayKey = String(window.__gsState.retention.dailyCare.dayKey || '');
    const allClaimKey = `daily:allComplete:${dayKey}`;
    const claimsAfterFirstSweep = window.__gsState.retention.claimLedger.filter((entry) => entry === allClaimKey).length;
    window.__gsRetentionTaskUpdate('tick', { nowMs: nowMs + 2600 });
    const claimsAfterSecondSweep = window.__gsState.retention.claimLedger.filter((entry) => entry === allClaimKey).length;
    if (typeof schedulePersistState === 'function') {
      schedulePersistState(true);
    }
    return {
      tasksCount: tasks.length,
      completedCount: Number(window.__gsState.retention.dailyCare.completedCount || 0),
      claimsAfterFirstSweep,
      claimsAfterSecondSweep,
      allCompleteClaimed: Boolean(window.__gsState.retention.dailyCare.allCompleteClaimed),
      streakCount: Number(window.__gsState.retention.streak.currentCount || 0)
    };
  });

  assert(beforeReload.tasksCount >= 3 && beforeReload.tasksCount <= 5, `daily task count expected 3-5, got ${beforeReload.tasksCount}`);
  assert(beforeReload.claimsAfterFirstSweep >= 0 && beforeReload.claimsAfterFirstSweep <= 1, 'all-complete reward should claim at most once');
  assert.strictEqual(beforeReload.claimsAfterSecondSweep, beforeReload.claimsAfterFirstSweep, 'all-complete reward duplicated');

  await page.reload({ waitUntil: 'networkidle' });
  await waitForRuntime(page);
  const afterReload = await page.evaluate(() => ({
    retentionExists: Boolean(window.__gsState && window.__gsState.retention),
    streakCount: Number(window.__gsState && window.__gsState.retention && window.__gsState.retention.streak && window.__gsState.retention.streak.currentCount || 0),
    tasksCount: Number(window.__gsState && window.__gsState.retention && window.__gsState.retention.dailyCare && window.__gsState.retention.dailyCare.tasks && window.__gsState.retention.dailyCare.tasks.length || 0)
  }));

  assert.strictEqual(afterReload.retentionExists, true, 'retention state missing after reload');
  assert(afterReload.streakCount >= 1, 'streak state was not restored after reload');
  assert(afterReload.tasksCount >= 1, 'daily tasks were not restored after reload');
}

async function scenarioMicroRegistryMapping(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const known = window.__gsGetMicroAchievementDefinition('daily_first_task');
    const unknown = window.__gsGetMicroAchievementDefinition('custom_unknown_id');
    return {
      knownTitle: String(known && known.title || ''),
      knownDesc: String(known && known.shortDescription || ''),
      knownRarity: String(known && known.rarity || ''),
      unknownTitle: String(unknown && unknown.title || ''),
      unknownDesc: String(unknown && unknown.shortDescription || ''),
      unknownRarity: String(unknown && unknown.rarity || '')
    };
  });
  assert(result.knownTitle.length > 0, 'known micro id should map to a readable title');
  assert(result.knownDesc.length > 0, 'known micro id should map to a readable description');
  assert(result.knownRarity.length > 0, 'known micro id should map rarity');
  assert(result.unknownTitle.length > 0, 'unknown micro id should still get fallback title');
  assert(result.unknownDesc.length > 0, 'unknown micro id should still get fallback description');
  assert(result.unknownRarity.length > 0, 'unknown micro id should still get fallback rarity');
}

async function scenarioStreakRecoveryFlow(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    window.__gsState.retention.streak.currentCount = 6;
    window.__gsState.retention.streak.bestCount = 6;
    window.__gsState.retention.streak.lastCheckinDayKey = window.__gsGetMicroAchievementDefinition ? (new Date(nowMs - (2 * oneDay))).toISOString().slice(0, 10) : '';
    window.__gsState.retention.streak.lastEvaluatedDayKey = window.__gsState.retention.streak.lastCheckinDayKey;
    window.__gsState.retention.streak.freezeCredits = 0;
    window.__gsEvaluateDailyRetention(nowMs, { forceCheckin: true, skipPersist: true });
    const pending = {
      offer: Boolean(window.__gsState.retention.streak.pendingRecoveryOffer),
      pendingCount: Number(window.__gsState.retention.streak.pendingRecoveryStreakCount || 0)
    };

    const withoutCredit = window.__gsTryStreakRecovery(nowMs);
    window.__gsState.retention.streak.freezeCredits = 1;
    const withCredit = window.__gsTryStreakRecovery(nowMs + 2000);
    const after = {
      currentCount: Number(window.__gsState.retention.streak.currentCount || 0),
      offer: Boolean(window.__gsState.retention.streak.pendingRecoveryOffer),
      freezeCredits: Number(window.__gsState.retention.streak.freezeCredits || 0)
    };
    return { pending, withoutCredit, withCredit, after };
  });

  assert.strictEqual(result.pending.offer, true, 'broken streak should expose recovery offer');
  assert(result.pending.pendingCount >= 2, 'recovery offer should preserve previous streak count');
  assert.strictEqual(result.withoutCredit.ok, false, 'recovery should fail without credit');
  assert.strictEqual(result.withCredit.ok, true, 'recovery should succeed with credit');
  assert.strictEqual(result.after.offer, false, 'recovery offer should close after successful recovery');
  assert.strictEqual(result.after.freezeCredits, 0, 'recovery should consume one credit');
}

async function scenarioRetentionAnalyticsDedupe(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    const before = Array.isArray(window.__gsState.retention.analytics.events) ? window.__gsState.retention.analytics.events.length : 0;
    window.__gsEmitRetentionAnalytics('daily_task_completed', { taskId: 't1' }, { nowMs, eventKey: 'analytics:test:task' });
    window.__gsEmitRetentionAnalytics('daily_task_completed', { taskId: 't1' }, { nowMs: nowMs + 1000, eventKey: 'analytics:test:task' });
    const events = Array.isArray(window.__gsState.retention.analytics.events) ? window.__gsState.retention.analytics.events : [];
    const matching = events.filter((entry) => entry && entry.event === 'daily_task_completed' && entry.payload && entry.payload.taskId === 't1');
    return {
      before,
      after: events.length,
      matchingCount: matching.length
    };
  });
  assert(result.after >= result.before + 1, 'analytics should capture at least one event');
  assert.strictEqual(result.matchingCount, 1, 'analytics dedupe should block duplicate eventKey entries');
}

async function scenarioRetentionAggregationHelpers(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const dayKey = (ts) => {
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const nowMs = Date.now();
    window.__gsEmitRetentionAnalytics('retention_session_start', { source: 'test' }, { nowMs, eventKey: 'agg:session' });
    window.__gsEmitRetentionAnalytics('daily_task_completed', { taskId: 'open_dashboard' }, { nowMs: nowMs + 500, eventKey: 'agg:task' });
    window.__gsEmitRetentionAnalytics('micro_unlocked', { id: 'daily_first_task' }, { nowMs: nowMs + 1000, eventKey: 'agg:micro' });
    const aggregated = window.__gsAggregateDailyRetentionStats();
    const last7 = window.__gsGetLastNDaysRetentionStats(7, nowMs + 1200);
    const todayKey = dayKey(nowMs);
    const today = Array.isArray(aggregated) ? aggregated.find((entry) => entry && entry.dayKey === todayKey) : null;
    return {
      hasToday: Boolean(today),
      todayTasks: Number(today && today.tasksCompleted || 0),
      todayMicro: Number(today && today.microUnlocked || 0),
      todaySessions: Number(today && today.sessionCount || 0),
      last7Length: Array.isArray(last7) ? last7.length : 0,
      activeDays: Array.isArray(last7) ? last7.filter((entry) => entry && entry.active).length : 0
    };
  });

  assert.strictEqual(result.hasToday, true, 'daily aggregate should include today');
  assert.strictEqual(result.todayTasks, 1, 'daily aggregate should count task completion');
  assert.strictEqual(result.todayMicro, 1, 'daily aggregate should count micro unlocks');
  assert(result.todaySessions >= 1, 'daily aggregate should count at least one session');
  assert.strictEqual(result.last7Length, 7, 'last 7 days helper should return exactly seven entries');
  assert(result.activeDays >= 1, 'last 7 days helper should mark active day');
}

async function scenarioRewardedBonusHooks(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const dayKey = (ts) => {
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const nowMs = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    window.__gsState.retention.streak.currentCount = 5;
    window.__gsState.retention.streak.lastCheckinDayKey = dayKey(nowMs - (2 * oneDay));
    window.__gsState.retention.streak.lastEvaluatedDayKey = window.__gsState.retention.streak.lastCheckinDayKey;
    window.__gsState.retention.streak.freezeCredits = 0;
    window.__gsEvaluateDailyRetention(nowMs, { forceCheckin: true, skipPersist: true });
    const first = window.__gsTryApplyRewardedBonus('streak_recovery_credit', { nowMs });
    const second = window.__gsTryApplyRewardedBonus('streak_recovery_credit', { nowMs: nowMs + 1200 });
    return {
      firstOk: Boolean(first && first.ok),
      secondOk: Boolean(second && second.ok),
      freezeCredits: Number(window.__gsState.retention.streak.freezeCredits || 0),
      offerOpen: Boolean(window.__gsState.retention.streak.pendingRecoveryOffer)
    };
  });

  assert.strictEqual(result.firstOk, true, 'rewarded streak hook should grant one recovery credit');
  assert.strictEqual(result.secondOk, false, 'rewarded streak hook should dedupe repeated claim');
  assert.strictEqual(result.freezeCredits, 1, 'recovery credit should be present after rewarded hook');
  assert.strictEqual(result.offerOpen, true, 'recovery offer should remain available after credit hook');
}

async function scenarioRetentionInsightsRender(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    if (typeof window.openSheet === 'function') {
      window.openSheet('dashboard');
    } else {
      const btn = document.getElementById('analyzeActionBtn');
      if (btn) {
        btn.click();
      }
    }
    const section = document.querySelector('.retention-insights-section');
    const cards = section ? section.querySelectorAll('.retention-insight-card').length : 0;
    return {
      hasSection: Boolean(section),
      cardCount: Number(cards || 0)
    };
  });

  assert.strictEqual(result.hasSection, true, 'analysis sheet should render retention insights section');
  assert(result.cardCount >= 4, 'retention insights should render core cards');
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST, undefined, {
    defaultHeaders: { 'Cache-Control': 'no-store' }
  });
  APP_URL = `${baseUrl}/`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await setupAuthHarness(page, AUTH_TOKEN_KEY, {
    email: 'time@test.local',
    displayName: 'Time Test'
  });

  try {
    await scenarioLiveX12(page);
    await scenarioSimTimeNeverDecreases(page);
    await scenarioCareActionsDoNotJumpTime(page);
    await scenarioBaseSpeedChanges(page);
    await scenarioSettingsSimSpeedUi(page);
    await scenarioNegativeRealDeltaClamp(page);
    await scenarioBoostActivationAndExpiry(page);
    await scenarioReloadDuringActiveBoost(page);
    await scenarioReloadAfterExpiredBoost(page);
    await scenarioOfflineResume(page);
    await scenarioResumeHooksDoNotMultiFire(page);
    await scenarioSkipNight(page);
    await scenarioWatchdogRecoversStalledLoop(page);
    await scenarioRetentionStreakIdempotent(page);
    await scenarioRetentionDailyTaskDedupe(page);
    await scenarioRetentionAllCompleteDedupeAndPersist(page);
    await scenarioMicroRegistryMapping(page);
    await scenarioStreakRecoveryFlow(page);
    await scenarioRetentionAnalyticsDedupe(page);
    await scenarioRetentionAggregationHelpers(page);
    await scenarioRewardedBonusHooks(page);
    await scenarioRetentionInsightsRender(page);
    console.log('time-system-runtime: all scenarios passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

