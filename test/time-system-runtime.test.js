const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = '0.0.0.0';
const CLIENT_HOST = '127.0.0.1';
const PORT = 4176;
const APP_URL = `http://${CLIENT_HOST}:${PORT}/`;
const LS_STATE_KEY = 'grow-sim-state-v2';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

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

      res.writeHead(200, {
        'Content-Type': contentTypeFor(filePath),
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  });
}

async function installAuthHarness(page) {
  await page.addInitScript((tokenKey) => {
    localStorage.setItem(tokenKey, 'test-auth-token');
  }, AUTH_TOKEN_KEY);

  await page.route('https://api.growsimulator.tech/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user',
            email: 'time@test.local',
            displayName: 'Time Test'
          }
        })
      });
      return;
    }

    if (url.pathname === '/api/save') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: request.method() === 'GET'
          ? JSON.stringify({ save: null })
          : JSON.stringify({ ok: true })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unhandled test route' })
    });
  });
}

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
  const result = await page.evaluate(() => {
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
  const result = await page.evaluate(() => {
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
  const result = await page.evaluate(() => {
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
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    setBaseSimulationSpeed(8, nowMs);
    const beforeLastTickRealTimeMs = Number(window.__gsState.simulation.lastTickRealTimeMs);
    const currentSimTimeMs = Number(window.__gsState.simulation.simEpochMs) + (15 * 60 * 60 * 1000);
    setSimulationTimeMs(currentSimTimeMs, nowMs, { suppressLogs: true });
    const nextDayStartSimMs = getNextDayStartSimTime(currentSimTimeMs);
    const remainingNightSimMs = nextDayStartSimMs - currentSimTimeMs;
    const expectedRealDeltaMs = convertSimDeltaToFutureRealDeltaMs(remainingNightSimMs, nowMs);
    onSkipNightAction();
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

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await installAuthHarness(page);

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
    console.log('time-system-runtime: all scenarios passed');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
