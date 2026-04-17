#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { buildSimulationReport } = require('../dev/event_runtime_simulation.js');
const plantStateApi = require('../src/simulation/plantState.js');
const flagsApi = require('../src/events/eventFlags.js');
const memoryApi = require('../src/events/eventMemory.js');
const analysisApi = require('../src/events/eventAnalysis.js');
const resolverApi = require('../src/events/eventResolver.js');

function loadEventsApi() {
  const eventsSource = fs.readFileSync(path.join(__dirname, '..', 'events.js'), 'utf8');
  const now = Date.now();
  const context = {
    console,
    Date,
    Math,
    JSON,
    Number,
    Object,
    Array,
    String,
    Boolean,
    setTimeout,
    clearTimeout,
    clamp: (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0)),
    round2: (v) => Math.round((Number(v) || 0) * 100) / 100,
    deterministicUnitFloat: () => 0,
    deterministicRoll: () => 0,
    simDayFloat: () => 0,
    simHour: () => 12,
    eventThreshold: () => 1,
    EVENT_COOLDOWN_MS: 30 * 60 * 1000,
    EVENT_ROLL_MIN_REAL_MS: 60 * 1000,
    EVENT_ROLL_MAX_REAL_MS: 2 * 60 * 1000,
    nextDaytimeRealMs: (value) => value,
    schedulePushIfAllowed: () => {},
    schedulePersistState: () => {},
    renderAll: () => {},
    notifyPlantNeedsCare: () => {},
    addLog: () => {},
    isPlantDead: () => false,
    clampStatus: () => {},
    syncCanonicalStateShape: () => {},
    state: {
      status: { water: 70, nutrition: 65, health: 80, stress: 20, risk: 18, growth: 22 },
      plant: { phase: 'flowering', stageIndex: 8, stageKey: 'flower', stageProgress: 0.7, lifecycle: { qualityScore: 60 } },
      simulation: { isDaytime: true, nowMs: now, simTimeMs: now, tickCount: 10, simDay: 44 },
      setup: { mode: 'soil', medium: 'soil', light: 'led' },
      history: { events: [] },
      ui: { openSheet: null },
      events: {
        machineState: 'idle',
        scheduler: {
          nextEventRealTimeMs: now + 60000,
          nextEventSimTimeMs: now + 60000,
          eventCooldowns: {},
          categoryCooldowns: {},
          eventCooldownsSim: {},
          categoryCooldownsSim: {},
          lastEventId: null,
          lastEventCategory: null
        },
        catalog: [],
        history: [],
        foundation: {
          flags: {},
          memory: { events: [], decisions: [], pendingChains: {} },
          analysis: []
        }
      }
    },
    window: {
      GrowSimPlantState: plantStateApi,
      GrowSimEventFlags: flagsApi,
      GrowSimEventMemory: memoryApi,
      GrowSimEventAnalysis: analysisApi,
      GrowSimEventResolver: resolverApi
    }
  };

  vm.createContext(context);
  vm.runInContext(eventsSource, context, { filename: 'events.js' });
  return context.window.GrowSimEvents;
}

function buildSnapshot(overrides = {}) {
  const totals = { activated: 0, resolved: 0, queuedFollowUps: 0, activatedFollowUps: 0, expiredFollowUps: 0, ...(overrides.totals || {}) };
  const byCategory = { ...(overrides.byCategory || {}) };
  const byEventId = { ...(overrides.byEventId || {}) };
  const outcomes = { ...(overrides.outcomes || {}) };
  const guardInterventions = { ...(overrides.guardInterventions || {}) };
  const gaps = {
    recentSimMs: [],
    meanSimMs: 0,
    maxSimMs: 0,
    shortGapClusterCount: 0,
    longGapCount: 0,
    ...(overrides.gaps || {})
  };
  const currentPhase = String(overrides.currentPhase || 'flowering');
  const currentStageIndex = Math.max(0, Math.trunc(Number(overrides.currentStageIndex != null ? overrides.currentStageIndex : 8) || 0));
  const recent = {
    eventIds: [],
    categories: [],
    outcomes: [],
    followUps: [],
    phases: [currentPhase],
    ...(overrides.recent || {})
  };
  const dominantCategory = overrides.dominantCategory != null
    ? overrides.dominantCategory
    : (Object.entries(byCategory).sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))[0] || [''])[0];
  const dominantCategoryCount = overrides.dominantCategoryCount != null
    ? overrides.dominantCategoryCount
    : Math.max(0, Math.trunc(Number(byCategory[dominantCategory]) || 0));
  const improved = Math.max(0, Math.trunc(Number(outcomes.improved) || 0));
  const stabilized = Math.max(0, Math.trunc(Number(outcomes.stabilized) || 0));
  const worsened = Math.max(0, Math.trunc(Number(outcomes.worsened) || 0));
  const escalated = Math.max(0, Math.trunc(Number(outcomes.escalated) || 0));
  const totalPositive = improved + stabilized;
  const totalNegative = worsened + escalated;

  return {
    totals,
    byCategory,
    byPhase: { [currentPhase]: Number(totals.activated || 0) },
    byStage: {},
    byEventId,
    bySimDay: { 44: Number(totals.activated || 0) },
    outcomes,
    followUps: { byTargetId: {}, bySourceId: {} },
    guardInterventions,
    gaps,
    recent,
    dominantCategory,
    dominantCategoryCount,
    currentPhase,
    currentStageIndex,
    currentStageProgress: 0.7,
    leadingOutcome: '',
    totalActivated: Math.max(0, Math.trunc(Number(totals.activated) || 0)),
    totalResolved: Math.max(0, Math.trunc(Number(totals.resolved) || 0)),
    stabilizationRatio: totalNegative > 0 ? Math.round((totalPositive / totalNegative) * 100) / 100 : (totalPositive > 0 ? totalPositive : 0),
    shortGapClusterCount: Math.max(0, Math.trunc(Number(gaps.shortGapClusterCount) || 0)),
    longGapCount: Math.max(0, Math.trunc(Number(gaps.longGapCount) || 0)),
    meanGapSimMs: Math.max(0, Math.trunc(Number(gaps.meanSimMs) || 0))
  };
}

function createStorageContext() {
  const storageSource = fs.readFileSync(path.join(__dirname, '..', 'storage.js'), 'utf8');
  const messages = [];
  const consoleMock = {
    info: (...args) => messages.push({ level: 'info', text: args.join(' ') }),
    warn: (...args) => messages.push({ level: 'warn', text: args.join(' ') }),
    error: (...args) => messages.push({ level: 'error', text: args.join(' ') }),
    log: (...args) => messages.push({ level: 'log', text: args.join(' ') })
  };
  const storageStore = new Map();
  const context = {
    console: consoleMock,
    Date,
    Math,
    JSON,
    Number,
    Object,
    Array,
    String,
    Boolean,
    Promise,
    setTimeout,
    clearTimeout,
    LS_STATE_KEY: 'gs_test',
    MODE: 'test',
    UI_TICK_INTERVAL_MS: 1000,
    SIM_TIME_COMPRESSION: 60,
    SIM_GLOBAL_SEED: 'seed',
    SIM_PLANT_ID: 'plant',
    SIM_START_HOUR: 7,
    SIM_DAY_START_HOUR: 7,
    SIM_NIGHT_START_HOUR: 22,
    EVENT_ROLL_MIN_REAL_MS: 60 * 1000,
    EVENT_ROLL_MAX_REAL_MS: 2 * 60 * 1000,
    EVENT_COOLDOWN_MS: 30 * 60 * 1000,
    TOTAL_LIFECYCLE_SIM_DAYS: 90,
    PERSIST_THROTTLE_MS: 100,
    MAX_HISTORY_LOG: 50,
    MAX_EVENT_HISTORY: 20,
    MAX_SYSTEM_HISTORY: 20,
    MAX_ACTION_HISTORY: 20,
    clampInt: (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0)),
    clamp: (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0)),
    round2: (v) => Math.round((Number(v) || 0) * 100) / 100,
    deterministicUnitFloat: () => 0,
    deterministicRoll: () => 0,
    deterministicEventDelayMs: () => 60 * 1000,
    simDayFloat: () => 1,
    simHour: () => 12,
    eventThreshold: () => 1,
    alignToSimStartHour: (x) => x,
    isDaytimeAtSimTime: () => true,
    dayStamp: () => 'd1',
    computeGrowthPercent: () => 0,
    getStageTimeline: () => [{ phase: 'vegetative', simDayStart: 0 }],
    normalizeStageKey: (v) => String(v || 'stage_01'),
    stageAssetKeyForIndex: () => 'stage_01',
    plantAssetPath: () => 'assets/plant_growth/plant_growth_sprite.png#frame_016',
    nextDaytimeRealMs: (nowMs) => nowMs,
    schedulePushIfAllowed: () => {},
    schedulePersistState: () => {},
    renderAll: () => {},
    notifyPlantNeedsCare: () => {},
    addLog: () => {},
    isPlantDead: () => false,
    clampStatus: () => {},
    localStorage: {
      getItem: (key) => (storageStore.has(key) ? storageStore.get(key) : null),
      setItem: (key, value) => storageStore.set(key, value)
    },
    state: {
      schemaVersion: '1.0.0',
      simulation: { nowMs: 1000, simTimeMs: 1000, simDay: 1, simHour: 12, simMinute: 0, tickCount: 1, isDaytime: true },
      plant: { phase: 'vegetative', stageIndex: 1, stageKey: 'veg', stageProgress: 0.2, lifecycle: {} },
      status: { water: 80, nutrition: 80, health: 80, stress: 20, risk: 20, growth: 10 },
      setup: { mode: 'soil' },
      history: { actions: [], events: [], system: [], systemLog: [] },
      ui: {},
      settings: { notifications: { enabled: false, types: { events: true, critical: true, reminder: true }, runtime: {} } },
      meta: {},
      actions: { catalog: [] },
      boost: { active: {}, cooldowns: {} },
      events: {
        machineState: 'idle',
        scheduler: { eventCooldowns: {}, categoryCooldowns: {}, lastEventId: null, lastEventCategory: null, windowRealMinutes: { min: 30, max: 90 } },
        catalog: [],
        history: [],
        foundation: { flags: {}, memory: { events: [], decisions: [], pendingChains: {} }, analysis: [] }
      }
    },
    window: {
      GrowSimPlantState: plantStateApi,
      GrowSimEventFlags: flagsApi,
      GrowSimEventMemory: memoryApi,
      GrowSimEventAnalysis: analysisApi,
      GrowSimEventResolver: resolverApi
    }
  };

  vm.createContext(context);
  vm.runInContext(storageSource, context, { filename: 'storage.js' });
  return { storage: context.window.GrowSimStorage, messages };
}

function testRuntimeSimulationStaysWithinReleaseSafeBounds() {
  const report = buildSimulationReport();

  assert.strictEqual(report.perSeed.length, 4, 'release soak suite should cover the standard four seeds');
  assert(report.aggregate.totalEventsTriggered > 1000, 'long-run suite should produce a meaningful amount of event traffic');
  assert(report.aggregate.averageMinutesBetweenEvents >= 45, 'average event gap should not collapse into spam');
  assert(report.aggregate.averageMinutesBetweenEvents <= 90, 'average event gap should not drift into dead zones');
  assert(report.aggregate.repeatedEvents <= 2, 'long-run suite should not show material repeat spam');
  assert(report.aggregate.followUpChainsConsumed <= report.aggregate.followUpChainsTriggered, 'consumed followups cannot exceed queued chains');
  assert(
    (report.aggregate.followUpChainsTriggered - report.aggregate.followUpChainsConsumed) <= 2,
    'long-run suite should not leave many followup chains hanging'
  );
  assert(report.aggregate.pendingChainsRemainingMax <= 1, 'pending chains should drain cleanly by the end of the soak run');
  assert(report.aggregate.dominantCategorySharePercentMax < 40, 'no single category should dominate the long-run release suite');
}

function testMixedLongRunCanRecoverOutOfEarlierNegativePressure() {
  const api = loadEventsApi();
  const interpretation = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 12, resolved: 9, queuedFollowUps: 5, activatedFollowUps: 3, expiredFollowUps: 2 },
    byCategory: { environment: 4, disease: 3, positive: 3, water: 2 },
    byEventId: { a: 2, b: 2, c: 1, d: 1, e: 1, f: 1, g: 1, h: 1, i: 1, j: 1 },
    outcomes: { worsened: 2, escalated: 1, improved: 3, stabilized: 3 },
    gaps: { meanSimMs: 95 * 60 * 1000, shortGapClusterCount: 1, longGapCount: 0 },
    currentPhase: 'flowering',
    currentStageIndex: 9,
    recent: {
      outcomes: ['worsened', 'improved', 'stabilized', 'improved', 'stabilized'],
      phases: ['flowering']
    }
  }));

  assert.notStrictEqual(interpretation.primaryState, 'escalating', 'recovery-capable runs should not stay hard negative');
  assert(['balanced', 'stabilizing', 'reactive'].includes(interpretation.primaryState), 'recovery should surface as a calmer late-run state');
}

async function testRemotePersistenceFallsBackCleanlyWithoutFetch() {
  const { storage, messages } = createStorageContext();
  const loaded = await storage.loadRemoteSave({ force: true });
  const saved = await storage.saveRemoteState({ schemaVersion: '1.0.0', status: {}, plant: {}, simulation: {}, events: {} });

  assert.strictEqual(loaded, null, 'remote load should fall back cleanly when fetch is unavailable');
  assert.strictEqual(saved, false, 'remote save should fall back cleanly when fetch is unavailable');
  assert(messages.some((entry) => entry.text.includes('[remote-load] fallback (fetch unavailable)')), 'remote load fallback should be explicit');
  assert(messages.some((entry) => entry.text.includes('[remote-save] fallback (fetch unavailable)')), 'remote save fallback should be explicit');
  assert(messages.every((entry) => !entry.text.includes('[remote-load] failed')), 'fetch-unavailable fallback should not emit a failure warning');
  assert(messages.every((entry) => !entry.text.includes('[remote-save] failed')), 'fetch-unavailable fallback should not emit a failure warning');
}

(async function main() {
  testRuntimeSimulationStaysWithinReleaseSafeBounds();
  testMixedLongRunCanRecoverOutOfEarlierNegativePressure();
  await testRemotePersistenceFallsBackCleanlyWithoutFetch();
  console.log('Phase 17 release-readiness checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
