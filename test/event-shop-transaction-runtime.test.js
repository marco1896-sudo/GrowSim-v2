const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const { installAuthHarness: setupAuthHarness } = require('./support/browserRuntime');

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
  await page.click('#startRunBtn');
  await page.waitForFunction(() => {
    const node = document.getElementById('landing');
    return Boolean(node && node.classList.contains('hidden'));
  });
  await waitForRuntime(page);
  await page.waitForTimeout(1200);
}

function buildSimpleCatalog(ids) {
  return ids.map((id) => ({
    id: String(id),
    category: 'generic',
    title: `Event ${String(id)}`,
    description: `Runtime event ${String(id)}`,
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
  }));
}

function buildActiveEventStateFromCatalogItem(item) {
  return {
    machineState: 'activeEvent',
    active: {
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      learningNote: item.learningNote
    },
    activeEventId: item.id,
    activeEventTitle: item.title,
    activeEventText: item.description,
    activeLearningNote: item.learningNote,
    activeOptions: item.options,
    activeSeverity: item.severity,
    activeCooldownRealMinutes: item.cooldownRealMinutes,
    activeResolveTimeMinutes: item.resolveTimeMinutes,
    activeCategory: item.category,
    activeTags: item.tags,
    activeImagePath: ''
  };
}

async function scenarioNightEventStartSucceeds(page) {
  await startFreshRun(page);
  const result = await page.evaluate(({ catalog }) => {
    const nowMs = Date.now();
    grantCoins(500, 'event_start_test_setup', 'test:event-start-success');
    const nightSimTimeMs = Number(window.__gsState.simulation.simEpochMs) + (15 * 60 * 60 * 1000);
    setSimulationTimeMs(nightSimTimeMs, nowMs, { suppressLogs: true, reason: 'test_event_start_night' });
    window.__gsState.events.catalog = catalog;
    window.__gsState.events.scheduler.eventCooldownsSim = {};
    window.__gsState.events.scheduler.categoryCooldownsSim = {};
    window.__gsState.events.scheduler.nextEventSimTimeMs = nightSimTimeMs + (60 * 60 * 1000);
    const beforeCoins = Number(window.__gsState.status.coins || 0);
    return Promise.resolve(triggerRewardAction('event_start', { source: 'runtime_test' })).then((actionResult) => ({
      actionResult,
      beforeCoins,
      afterCoins: Number(window.__gsState.status.coins || 0),
      machineState: String(window.__gsState.events.machineState || ''),
      activeEventId: String(window.__gsState.events.activeEventId || ''),
      openSheet: String(window.__gsState.ui.openSheet || ''),
      isDaytime: Boolean(window.__gsState.simulation.isDaytime)
    }));
  }, { catalog: buildSimpleCatalog(['night_start_event']) });

  assert.strictEqual(result.actionResult.ok, true, 'night event start should succeed');
  assert.strictEqual(result.machineState, 'activeEvent', 'night event start should leave an active event');
  assert.strictEqual(result.activeEventId, 'night_start_event', 'night event start should activate the expected event');
  assert.strictEqual(result.afterCoins, result.beforeCoins - 80, 'night event start should spend the configured coin cost once');
  assert.strictEqual(result.openSheet, 'event', 'night event start should surface the event sheet');
  assert.strictEqual(result.isDaytime, false, 'night event start should not globally flip the simulation to daytime');
}

async function scenarioEventStartRefundsOnFailure(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    grantCoins(500, 'event_start_test_setup', 'test:event-start-failure');
    const beforeCoins = Number(window.__gsState.status.coins || 0);
    window.__gsState.events.catalog = [];
    window.__gsState.events.machineState = 'idle';
    window.__gsState.events.scheduler.eventCooldownsSim = {};
    window.__gsState.events.scheduler.categoryCooldownsSim = {};
    window.__gsState.events.scheduler.nextEventSimTimeMs = Number(window.__gsState.simulation.simTimeMs || 0);
    return Promise.resolve(triggerRewardAction('event_start', { source: 'runtime_test' })).then((actionResult) => ({
      actionResult,
      beforeCoins,
      afterCoins: Number(window.__gsState.status.coins || 0),
      machineState: String(window.__gsState.events.machineState || ''),
      activeEventId: String(window.__gsState.events.activeEventId || '')
    }));
  });

  assert.strictEqual(result.actionResult.ok, false, 'event start should fail when no event can be activated');
  assert.strictEqual(result.actionResult.reason, 'event_start_activation_failed', 'event start failure should use the authoritative failure reason');
  assert.strictEqual(result.afterCoins, result.beforeCoins, 'failed event start must not consume coins');
  assert.notStrictEqual(result.machineState, 'activeEvent', 'failed event start must not leave a fake active event');
  assert.strictEqual(result.activeEventId, '', 'failed event start must not set an activeEventId');
}

async function scenarioEventRerollSucceedsAtomically(page) {
  await startFreshRun(page);
  const catalog = buildSimpleCatalog(['event_alpha', 'event_beta']);
  const activeEventState = buildActiveEventStateFromCatalogItem(catalog[0]);
  const result = await page.evaluate(({ catalog, activeEventState }) => {
    grantCoins(500, 'event_reroll_test_setup', 'test:event-reroll-success');
    window.__gsState.events.catalog = catalog;
    window.__gsState.events.scheduler.eventCooldownsSim = {};
    window.__gsState.events.scheduler.categoryCooldownsSim = {};
    Object.assign(window.__gsState.events, activeEventState);
    window.__gsState.ui.openSheet = 'event';
    const beforeCoins = Number(window.__gsState.status.coins || 0);
    return Promise.resolve(triggerRewardAction('event_reroll', { source: 'runtime_test' })).then((actionResult) => ({
      actionResult,
      beforeCoins,
      afterCoins: Number(window.__gsState.status.coins || 0),
      machineState: String(window.__gsState.events.machineState || ''),
      activeEventId: String(window.__gsState.events.activeEventId || ''),
      previousEventBlockedUntil: Number(window.__gsState.events.scheduler.eventCooldownsSim.event_alpha || 0)
    }));
  }, { catalog, activeEventState });

  assert.strictEqual(result.actionResult.ok, true, 'event reroll should succeed with a valid replacement');
  assert.strictEqual(result.machineState, 'activeEvent', 'successful reroll should leave an active event');
  assert.strictEqual(result.activeEventId, 'event_beta', 'successful reroll should activate the replacement event');
  assert.strictEqual(result.afterCoins, result.beforeCoins - 100, 'successful reroll should spend the configured reroll cost once');
  assert(result.previousEventBlockedUntil > 0, 'successful reroll should keep the old event on cooldown');
}

async function scenarioEventRerollRestoresOnFailure(page) {
  await startFreshRun(page);
  const catalog = buildSimpleCatalog(['event_alpha']);
  const activeEventState = buildActiveEventStateFromCatalogItem(catalog[0]);
  const result = await page.evaluate(({ catalog, activeEventState }) => {
    grantCoins(500, 'event_reroll_test_setup', 'test:event-reroll-failure');
    window.__gsState.events.catalog = catalog;
    window.__gsState.events.scheduler.eventCooldownsSim = {};
    window.__gsState.events.scheduler.categoryCooldownsSim = {};
    Object.assign(window.__gsState.events, activeEventState);
    window.__gsState.ui.openSheet = 'event';
    const beforeCoins = Number(window.__gsState.status.coins || 0);
    return Promise.resolve(triggerRewardAction('event_reroll', { source: 'runtime_test' })).then((actionResult) => ({
      actionResult,
      beforeCoins,
      afterCoins: Number(window.__gsState.status.coins || 0),
      machineState: String(window.__gsState.events.machineState || ''),
      activeEventId: String(window.__gsState.events.activeEventId || ''),
      activeEventTitle: String(window.__gsState.events.activeEventTitle || ''),
      openSheet: String(window.__gsState.ui.openSheet || '')
    }));
  }, { catalog, activeEventState });

  assert.strictEqual(result.actionResult.ok, false, 'event reroll should fail when no replacement exists');
  assert.strictEqual(result.actionResult.reason, 'event_reroll_activation_failed', 'reroll failure should use the authoritative activation failure reason');
  assert.strictEqual(result.afterCoins, result.beforeCoins, 'failed reroll must not consume coins');
  assert.strictEqual(result.machineState, 'activeEvent', 'failed reroll must restore the previous active event');
  assert.strictEqual(result.activeEventId, 'event_alpha', 'failed reroll must restore the previous event id');
  assert.strictEqual(result.activeEventTitle, 'Event event_alpha', 'failed reroll must restore the previous event content');
  assert.strictEqual(result.openSheet, 'event', 'failed reroll must restore the event sheet visibility');
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST, undefined, {
    defaultHeaders: { 'Cache-Control': 'no-store' }
  });
  APP_URL = `${baseUrl}/`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await setupAuthHarness(page, AUTH_TOKEN_KEY, {
    email: 'event-shop@test.local',
    displayName: 'Event Shop Test'
  });

  try {
    await scenarioNightEventStartSucceeds(page);
    await scenarioEventStartRefundsOnFailure(page);
    await scenarioEventRerollSucceedsAtomically(page);
    await scenarioEventRerollRestoresOnFailure(page);
    console.log('event-shop-transaction-runtime: all scenarios passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
