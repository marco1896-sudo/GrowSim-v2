const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = '0.0.0.0';
const CLIENT_HOST = '127.0.0.1';
const PORT = 4177;
const APP_URL = `http://${CLIENT_HOST}:${PORT}/`;
const LS_STATE_KEY = 'grow-sim-state-v2';

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

async function waitForRuntime(page) {
  await page.waitForFunction(() => {
    return window.__gsBootOk === true
      && window.__gsState
      && window.__gsState.simulation
      && window.__gsState.events
      && window.__gsState.events.scheduler
      && Number.isFinite(window.__gsState.simulation.simTimeMs);
  });
}

async function evaluateWithRetry(page, fn, arg) {
  try {
    return await page.evaluate(fn, arg);
  } catch (error) {
    const message = String((error && error.message) || '');
    if (!message.includes('Execution context was destroyed')) {
      throw error;
    }
    await page.waitForLoadState('domcontentloaded');
    return page.evaluate(fn, arg);
  }
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

async function getEventSnapshot(page) {
  return page.evaluate(() => ({
    realNowMs: Date.now(),
    simTimeMs: Number(window.__gsState.simulation.simTimeMs || 0),
    baseSpeed: Number(window.__gsState.simulation.baseSpeed || 0),
    effectiveSpeed: Number(window.__gsState.simulation.effectiveSpeed || 0),
    machineState: String(window.__gsState.events.machineState || ''),
    nextEventSimTimeMs: Number(window.__gsState.events.scheduler.nextEventSimTimeMs || 0),
    cooldownUntilSimTimeMs: Number(window.__gsState.events.cooldownUntilSimTimeMs || 0),
    nextEventRealTimeMs: Number(window.__gsState.events.scheduler.nextEventRealTimeMs || 0)
  }));
}

async function scenarioSchedulerCountdownUsesSimTime(page) {
  await startFreshRun(page);
  const before = await page.evaluate(() => {
    const nowMs = Date.now();
    setBaseSimulationSpeed(12, nowMs);
    const midday = new Date(window.__gsState.simulation.simTimeMs);
    midday.setHours(12, 0, 0, 0);
    const middaySimMs = midday.getTime();
    setSimulationTimeMs(middaySimMs, nowMs, { suppressLogs: true });
    window.__gsState.events.machineState = 'idle';
    window.GrowSimEvents.scheduleNextEventRoll(nowMs, 'test_countdown');
    return {
      simTimeMs: Number(window.__gsState.simulation.simTimeMs),
      nextEventSimTimeMs: Number(window.__gsState.events.scheduler.nextEventSimTimeMs)
    };
  });

  await page.waitForTimeout(2500);
  const after = await getEventSnapshot(page);
  const simDeltaMs = after.simTimeMs - before.simTimeMs;
  const remainingBeforeMs = before.nextEventSimTimeMs - before.simTimeMs;
  const remainingAfterMs = after.nextEventSimTimeMs - after.simTimeMs;
  const countdownDeltaMs = remainingBeforeMs - remainingAfterMs;

  assert(remainingAfterMs < remainingBeforeMs, 'event countdown did not decrease with sim time');
  assert(
    Math.abs(countdownDeltaMs - simDeltaMs) <= 15000,
    `event countdown diverged from sim progression (${countdownDeltaMs} vs ${simDeltaMs})`
  );
}

async function scenarioSpeedChangeKeepsDeadlineStable(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    setBaseSimulationSpeed(4, nowMs);
    const midday = new Date(window.__gsState.simulation.simTimeMs);
    midday.setHours(12, 0, 0, 0);
    const middaySimMs = midday.getTime();
    setSimulationTimeMs(middaySimMs, nowMs, { suppressLogs: true });
    window.__gsState.events.machineState = 'idle';
    window.GrowSimEvents.scheduleNextEventRoll(nowMs, 'test_speed_stability');
    const beforeDeadline = Number(window.__gsState.events.scheduler.nextEventSimTimeMs);
    setBaseSimulationSpeed(16, Date.now());
    const afterDeadline = Number(window.__gsState.events.scheduler.nextEventSimTimeMs);
    return { beforeDeadline, afterDeadline };
  });

  assert(
    Math.abs(result.afterDeadline - result.beforeDeadline) < 1000,
    'base speed change shifted an already scheduled event deadline'
  );
}

async function scenarioReloadResumeKeepsCooldownDeterministic(page) {
  await startFreshRun(page);
  const before = await page.evaluate(() => {
    const nowMs = Date.now();
    setBaseSimulationSpeed(12, nowMs);
    const midday = new Date(window.__gsState.simulation.simTimeMs);
    midday.setHours(12, 0, 0, 0);
    const middaySimMs = midday.getTime();
    setSimulationTimeMs(middaySimMs, nowMs, { suppressLogs: true });
    window.__gsState.events.machineState = 'cooldown';
    window.__gsState.events.cooldownUntilSimTimeMs = Number(window.__gsState.simulation.simTimeMs) + (2 * 60 * 60 * 1000);
    if (typeof normalizeEventTimingState === 'function') {
      normalizeEventTimingState(nowMs);
    }
    return {
      beforeSimTimeMs: Number(window.__gsState.simulation.simTimeMs),
      cooldownUntilSimTimeMs: Number(window.__gsState.events.cooldownUntilSimTimeMs)
    };
  });

  const oldLastTickMs = Date.now() - 10000;
  await page.evaluate((timestamp) => {
    window.__gsState.simulation.lastTickRealTimeMs = timestamp;
    if (typeof syncCanonicalStateShape === 'function') {
      syncCanonicalStateShape();
    }
    if (typeof schedulePersistState === 'function') {
      schedulePersistState(true);
    }
  }, oldLastTickMs);

  await page.reload({ waitUntil: 'networkidle' });
  await waitForRuntime(page);
  const after = await getEventSnapshot(page);
  const expectedRemainingMs = (before.cooldownUntilSimTimeMs - before.beforeSimTimeMs) - (after.simTimeMs - before.beforeSimTimeMs);
  const actualRemainingMs = after.cooldownUntilSimTimeMs - after.simTimeMs;

  assert.strictEqual(after.machineState, 'cooldown', 'cooldown state was lost across reload');
  assert(
    Math.abs(actualRemainingMs - expectedRemainingMs) <= 15000,
    `cooldown remaining sim time diverged after reload (${actualRemainingMs} vs ${expectedRemainingMs})`
  );
}

async function scenarioNightDeferralUsesSimDeadline(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    const night = new Date(window.__gsState.simulation.simTimeMs);
    night.setHours(23, 0, 0, 0);
    const nightSimMs = night.getTime();
    setSimulationTimeMs(nightSimMs, nowMs, { suppressLogs: true });
    window.__gsState.events.machineState = 'idle';
    window.__gsState.events.scheduler.nextEventSimTimeMs = Number(window.__gsState.simulation.simTimeMs);
    window.GrowSimEvents.runEventStateMachine(nowMs);
    return {
      currentSimTimeMs: Number(window.__gsState.simulation.simTimeMs),
      deferredSimTimeMs: Number(window.__gsState.events.scheduler.nextEventSimTimeMs),
      expectedSimTimeMs: getNextDayStartSimTime(nightSimMs)
    };
  });

  assert.strictEqual(result.deferredSimTimeMs, result.expectedSimTimeMs, 'night deferral did not snap to next daytime sim deadline');
  assert(result.deferredSimTimeMs > result.currentSimTimeMs, 'night deferral did not move the event deadline forward');
}

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await scenarioSchedulerCountdownUsesSimTime(page);
    await scenarioSpeedChangeKeepsDeadlineStable(page);
    await scenarioReloadResumeKeepsCooldownDeterministic(page);
    await scenarioNightDeferralUsesSimDeadline(page);
    console.log('event-scheduler-runtime: all scenarios passed');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
