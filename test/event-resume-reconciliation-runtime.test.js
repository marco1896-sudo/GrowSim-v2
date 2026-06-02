const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  installAuthHarness: setupAuthHarness,
  advanceOnboardingToStart
} = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
let APP_URL = '';
const LS_STATE_KEY = 'grow-sim-state-v2';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function waitForRuntime(page) {
  await page.waitForFunction(() => {
    return window.__gsBootOk === true
      && window.__gsState
      && window.__gsState.simulation
      && window.__gsState.events
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
  await advanceOnboardingToStart(page);
  await page.click('#startRunBtn');
  await page.waitForFunction(() => {
    const node = document.getElementById('landing');
    return Boolean(node && node.classList.contains('hidden'));
  });
  await waitForRuntime(page);
  await page.waitForTimeout(1200);
}

async function withCatalogRoutes(page, catalog, callback) {
  await page.addInitScript(({ injectedCatalog }) => {
    window.__GS_TEST_EVENT_CATALOG_OVERRIDE__ = Array.isArray(injectedCatalog) ? injectedCatalog : [];
    if (window.__GS_TEST_FETCH_PATCHED__) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const request = args[0];
      const requestUrl = typeof request === 'string'
        ? request
        : (request && typeof request.url === 'string' ? request.url : '');
      if (requestUrl.includes('/data/events.json')) {
        return new Response(JSON.stringify(window.__GS_TEST_EVENT_CATALOG_OVERRIDE__ || []), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (requestUrl.includes('/data/events.foundation.json') || requestUrl.includes('/data/events.v2.json')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(...args);
    };

    window.__GS_TEST_FETCH_PATCHED__ = true;
  }, { injectedCatalog: catalog });

  return callback();
}

function buildSimpleCatalog(eventId) {
  return [
    {
      id: String(eventId || 'audit_event'),
      category: 'generic',
      title: 'Audit Event',
      description: 'Audit runtime event',
      learningNote: '',
      severity: 2,
      cooldownRealMinutes: 120,
      resolveTimeMinutes: 60,
      tags: [],
      allowedPhases: ['seedling', 'vegetative', 'flowering', 'harvest'],
      triggers: {},
      constraints: null,
      options: [
        {
          id: 'option_safe',
          label: 'Safe Option',
          effects: { health: 1 },
          sideEffects: [],
          followUps: []
        }
      ]
    }
  ];
}

async function scenarioOverdueResolvingResume(page) {
  await startFreshRun(page);
  const result = await page.evaluate(({ catalog }) => {
    const nowMs = Date.now();
    const eventId = catalog[0].id;
    const currentSimTimeMs = Number(window.__gsState.simulation.simEpochMs) + (4 * 60 * 60 * 1000);
    setSimulationTimeMs(currentSimTimeMs, nowMs, { suppressLogs: true, reason: 'test_resume_resolving' });
    window.__gsState.events.catalog = catalog;
    window.__gsState.events.machineState = 'resolving';
    window.__gsState.events.active = {
      id: eventId,
      title: 'Audit Event',
      description: 'Audit runtime event',
      category: 'generic',
      learningNote: ''
    };
    window.__gsState.events.activeEventId = eventId;
    window.__gsState.events.activeEventTitle = 'Audit Event';
    window.__gsState.events.activeEventText = 'Audit runtime event';
    window.__gsState.events.activeLearningNote = '';
    window.__gsState.events.activeOptions = catalog[0].options;
    window.__gsState.events.activeCategory = 'generic';
    window.__gsState.events.pendingResolution = {
      eventId,
      eventTitle: 'Audit Event',
      eventCategory: 'generic',
      optionId: 'option_safe',
      optionLabel: 'Safe Option',
      learningNote: '',
      chosenAtRealTimeMs: nowMs - 10000,
      chosenAtSimTimeMs: currentSimTimeMs - 60000,
      resolveTimeMinutes: 1,
      resolveTimeRealMs: 60000,
      resolveAtSimTimeMs: currentSimTimeMs - 1000,
      rawChoiceEffects: { health: 1 },
      triggerSnapshot: {}
    };
    window.__gsState.events.pendingOutcome = {
      eventId,
      eventTitle: 'Audit Event',
      optionId: 'option_safe',
      optionLabel: 'Safe Option',
      observationText: 'pending'
    };
    window.__gsState.events.resolvingUntilSimTimeMs = currentSimTimeMs - 1000;
    window.__gsState.events.resolvingUntilMs = nowMs - 1000;
    window.__gsState.events.scheduler.nextEventSimTimeMs = currentSimTimeMs + (2 * 60 * 60 * 1000);
    window.__gsState.simulation.lastTickRealTimeMs = nowMs - 10000;
    syncSimulationFromElapsedTime(nowMs);
    return {
      machineState: String(window.__gsState.events.machineState || ''),
      pendingResolution: window.__gsState.events.pendingResolution,
      resolvedOutcome: Boolean(window.__gsState.events.resolvedOutcome),
      cooldownUntilSimTimeMs: Number(window.__gsState.events.cooldownUntilSimTimeMs || 0),
      simTimeMs: Number(window.__gsState.simulation.simTimeMs || 0)
    };
  }, { catalog: buildSimpleCatalog('resume_resolving_event') });

  assert.strictEqual(result.machineState, 'cooldown', 'overdue resolving event should advance into cooldown on resume');
  assert.strictEqual(result.pendingResolution, null, 'pendingResolution should be cleared after overdue resume resolution');
  assert.strictEqual(result.resolvedOutcome, true, 'resolved outcome should be materialized during resume reconciliation');
  assert(result.cooldownUntilSimTimeMs > result.simTimeMs, 'cooldown deadline should be scheduled after overdue resolution');
}

async function scenarioOverdueCooldownResume(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    const currentSimTimeMs = Number(window.__gsState.simulation.simEpochMs) + (4 * 60 * 60 * 1000);
    setSimulationTimeMs(currentSimTimeMs, nowMs, { suppressLogs: true, reason: 'test_resume_cooldown' });
    window.__gsState.events.machineState = 'cooldown';
    window.__gsState.events.cooldownUntilSimTimeMs = currentSimTimeMs - 1000;
    window.__gsState.events.cooldownUntilMs = nowMs - 1000;
    window.__gsState.events.scheduler.nextEventSimTimeMs = currentSimTimeMs + (2 * 60 * 60 * 1000);
    window.__gsState.simulation.lastTickRealTimeMs = nowMs - 10000;
    syncSimulationFromElapsedTime(nowMs);
    return {
      machineState: String(window.__gsState.events.machineState || ''),
      cooldownUntilSimTimeMs: Number(window.__gsState.events.cooldownUntilSimTimeMs || 0),
      simTimeMs: Number(window.__gsState.simulation.simTimeMs || 0)
    };
  });

  assert.strictEqual(result.machineState, 'idle', 'overdue cooldown should end on resume');
  assert(result.cooldownUntilSimTimeMs <= result.simTimeMs, 'expired cooldown should stay in the past after reconciliation');
}

async function scenarioOverdueIdleActivationResume(page) {
  await startFreshRun(page);
  const result = await page.evaluate(({ catalog }) => {
    const nowMs = Date.now();
    const currentSimTimeMs = Number(window.__gsState.simulation.simEpochMs) + (4 * 60 * 60 * 1000);
    setSimulationTimeMs(currentSimTimeMs, nowMs, { suppressLogs: true, reason: 'test_resume_idle' });
    window.__gsState.events.catalog = catalog;
    window.__gsState.events.machineState = 'idle';
    window.__gsState.events.scheduler.eventCooldownsSim = {};
    window.__gsState.events.scheduler.categoryCooldownsSim = {};
    window.__gsState.events.scheduler.nextEventSimTimeMs = currentSimTimeMs - 1000;
    window.__gsState.simulation.lastTickRealTimeMs = nowMs - 10000;
    syncSimulationFromElapsedTime(nowMs);
    return {
      machineState: String(window.__gsState.events.machineState || ''),
      activeEventId: String(window.__gsState.events.activeEventId || ''),
      activatedCount: Number(window.__gsState.events.audit && window.__gsState.events.audit.totals && window.__gsState.events.audit.totals.activated || 0)
    };
  }, { catalog: buildSimpleCatalog('resume_idle_event') });

  assert.strictEqual(result.machineState, 'activeEvent', 'overdue idle event should activate on resume');
  assert.strictEqual(result.activeEventId, 'resume_idle_event', 'resume activation should produce the eligible event');
  assert.strictEqual(result.activatedCount, 1, 'resume reconciliation should activate at most one event for a single overdue slot');
}

async function scenarioReloadRestoresOverdueResolving(page) {
  await startFreshRun(page);
  const catalog = buildSimpleCatalog('reload_resolving_event');
  await page.evaluate(async ({ catalog }) => {
    const nowMs = Date.now();
    const resumeAnchorRealMs = nowMs - 60000;
    const eventId = catalog[0].id;
    const currentSimTimeMs = Number(window.__gsState.simulation.simEpochMs) + (4 * 60 * 60 * 1000);
    setSimulationTimeMs(currentSimTimeMs, nowMs, { suppressLogs: true, reason: 'test_reload_resolving' });
    window.__gsState.events.catalog = catalog;
    window.__gsState.events.machineState = 'resolving';
    window.__gsState.events.activeEventId = eventId;
    window.__gsState.events.activeEventTitle = 'Audit Event';
    window.__gsState.events.activeEventText = 'Audit runtime event';
    window.__gsState.events.activeLearningNote = '';
    window.__gsState.events.activeOptions = catalog[0].options;
    window.__gsState.events.activeCategory = 'generic';
    window.__gsState.events.pendingResolution = {
      eventId,
      eventTitle: 'Audit Event',
      eventCategory: 'generic',
      optionId: 'option_safe',
      optionLabel: 'Safe Option',
      learningNote: '',
      chosenAtRealTimeMs: nowMs - 10000,
      chosenAtSimTimeMs: currentSimTimeMs - 60000,
      resolveTimeMinutes: 1,
      resolveTimeRealMs: 60000,
      resolveAtSimTimeMs: currentSimTimeMs - 1000,
      rawChoiceEffects: { health: 1 },
      triggerSnapshot: {}
    };
    window.__gsState.events.pendingOutcome = {
      eventId,
      eventTitle: 'Audit Event',
      optionId: 'option_safe',
      optionLabel: 'Safe Option',
      observationText: 'pending'
    };
    window.__gsState.events.resolvingUntilSimTimeMs = currentSimTimeMs - 1000;
    window.__gsState.events.resolvingUntilMs = nowMs - 1000;
    window.__gsState.events.scheduler.nextEventSimTimeMs = currentSimTimeMs + (2 * 60 * 60 * 1000);
    window.__gsState.simulation.lastTickRealTimeMs = resumeAnchorRealMs;
    window.__gsState.simulation.nowMs = resumeAnchorRealMs;
    syncCanonicalStateShape();
    if (typeof persistState === 'function') {
      await persistState();
    } else {
      schedulePersistState(true);
    }
  }, { catalog });
  await page.waitForTimeout(6000);

  await withCatalogRoutes(page, catalog, async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await waitForRuntime(page);
  });
  await waitForRuntime(page);
  const result = await page.evaluate(() => ({
    machineState: String(window.__gsState.events.machineState || ''),
    pendingResolution: window.__gsState.events.pendingResolution,
    resolvedOutcome: Boolean(window.__gsState.events.resolvedOutcome)
  }));

  assert.strictEqual(result.machineState, 'cooldown', 'reload should reconcile overdue resolving events into cooldown');
  assert.strictEqual(result.pendingResolution, null, 'reload reconciliation should clear pendingResolution');
  assert.strictEqual(result.resolvedOutcome, true, 'reload reconciliation should materialize the resolved outcome');
}

async function scenarioReloadRestoresOverdueIdleActivation(page) {
  await startFreshRun(page);
  const catalog = buildSimpleCatalog('reload_idle_event');
  await page.evaluate(async ({ catalog }) => {
    const nowMs = Date.now();
    const resumeAnchorRealMs = nowMs - 60000;
    const currentSimTimeMs = Number(window.__gsState.simulation.simEpochMs) + (4 * 60 * 60 * 1000);
    setSimulationTimeMs(currentSimTimeMs, nowMs, { suppressLogs: true, reason: 'test_reload_idle' });
    window.__gsState.events.catalog = catalog;
    window.__gsState.events.machineState = 'idle';
    window.__gsState.events.scheduler.eventCooldownsSim = {};
    window.__gsState.events.scheduler.categoryCooldownsSim = {};
    window.__gsState.events.scheduler.nextEventSimTimeMs = currentSimTimeMs - 1000;
    window.__gsState.simulation.lastTickRealTimeMs = resumeAnchorRealMs;
    window.__gsState.simulation.nowMs = resumeAnchorRealMs;
    syncCanonicalStateShape();
    if (typeof persistState === 'function') {
      await persistState();
    } else {
      schedulePersistState(true);
    }
  }, { catalog });
  await page.waitForTimeout(6000);

  await withCatalogRoutes(page, catalog, async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await waitForRuntime(page);
  });
  await waitForRuntime(page);
  const result = await page.evaluate(() => ({
    machineState: String(window.__gsState.events.machineState || ''),
    activeEventId: String(window.__gsState.events.activeEventId || ''),
    activatedCount: Number(window.__gsState.events.audit && window.__gsState.events.audit.totals && window.__gsState.events.audit.totals.activated || 0),
    catalogHasActiveEvent: Boolean(
      Array.isArray(window.__gsState.events.catalog)
      && window.__gsState.events.catalog.some((eventDef) => eventDef && eventDef.id === window.__gsState.events.activeEventId)
    )
  }));

  assert.strictEqual(result.machineState, 'activeEvent', 'reload should activate exactly one overdue idle event');
  assert.strictEqual(result.activeEventId, 'reload_idle_event', 'reload should restore the overdue idle activation target');
  assert.strictEqual(result.catalogHasActiveEvent, true, 'reload should activate an event that exists in the loaded runtime catalog');
  assert.strictEqual(result.activatedCount, 1, 'reload reconciliation should not spam multiple activations');
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST, undefined, {
    defaultHeaders: { 'Cache-Control': 'no-store' }
  });
  APP_URL = `${baseUrl}/`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  await setupAuthHarness(page, AUTH_TOKEN_KEY, {
    email: 'resume@test.local',
    displayName: 'Resume Test'
  });

  try {
    await scenarioOverdueResolvingResume(page);
    await scenarioOverdueCooldownResume(page);
    await scenarioOverdueIdleActivationResume(page);
    await scenarioReloadRestoresOverdueResolving(page);
    console.log('event-resume-reconciliation-runtime: all scenarios passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
