#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
      plant: { phase: 'vegetative', stageIndex: 3, stageKey: 'veg', lifecycle: { qualityScore: 60 } },
      simulation: { isDaytime: true, nowMs: now, simTimeMs: now, tickCount: 10, simDay: 12 },
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
    byPhase: { vegetative: Number(totals.activated || 0) },
    byStage: {},
    byEventId,
    bySimDay: { 12: Number(totals.activated || 0) },
    outcomes,
    followUps: { byTargetId: {}, bySourceId: {} },
    guardInterventions,
    gaps,
    recent: {
      eventIds: Object.keys(byEventId),
      categories: Object.keys(byCategory),
      outcomes: Object.keys(outcomes),
      followUps: [],
      phases: ['vegetative']
    },
    dominantCategory,
    dominantCategoryCount,
    leadingOutcome: '',
    totalActivated: Math.max(0, Math.trunc(Number(totals.activated) || 0)),
    totalResolved: Math.max(0, Math.trunc(Number(totals.resolved) || 0)),
    stabilizationRatio: totalNegative > 0 ? Math.round((totalPositive / totalNegative) * 100) / 100 : (totalPositive > 0 ? totalPositive : 0),
    shortGapClusterCount: Math.max(0, Math.trunc(Number(gaps.shortGapClusterCount) || 0)),
    longGapCount: Math.max(0, Math.trunc(Number(gaps.longGapCount) || 0)),
    meanGapSimMs: Math.max(0, Math.trunc(Number(gaps.meanSimMs) || 0))
  };
}

(function testApiExposesPhaseFiveAuditInterpretationHelpers() {
  const api = loadEventsApi();
  assert.strictEqual(typeof api.getEventAuditInterpretation, 'function');
  assert.strictEqual(typeof api.buildEventAuditInterpretation, 'function');
  assert.strictEqual(typeof api.buildEventAuditDerivedMetrics, 'function');
  assert.strictEqual(typeof api.classifyEventRunDensity, 'function');
})();

(function testLowSampleStaysQuietInsteadOfOverreacting() {
  const api = loadEventsApi();
  const interpretation = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 1, resolved: 0 },
    byCategory: { water: 1 },
    byEventId: { v2_water_borderline_irrigation: 1 },
    gaps: { longGapCount: 1 }
  }));

  assert.strictEqual(interpretation.primaryState, 'quiet');
  assert.strictEqual(interpretation.confidence, 'low');
  assert.strictEqual(interpretation.balanceState, 'undetermined');
})();

(function testDenseRunsAreClassifiedFromClusteredGaps() {
  const api = loadEventsApi();
  const interpretation = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 5, resolved: 3 },
    byCategory: { environment: 3, water: 2 },
    byEventId: { a: 1, b: 1, c: 1, d: 1, e: 1 },
    outcomes: { improved: 1, worsened: 1 },
    gaps: { meanSimMs: 60 * 60 * 1000, shortGapClusterCount: 2, longGapCount: 0 }
  }));

  assert.strictEqual(interpretation.densityState, 'dense');
  assert.strictEqual(interpretation.primaryState, 'dense');
  assert.strictEqual(interpretation.confidence, 'high');
})();

(function testPositiveOutcomeWeightShowsStabilizingRun() {
  const api = loadEventsApi();
  const interpretation = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 5, resolved: 4, queuedFollowUps: 2, activatedFollowUps: 2, expiredFollowUps: 0 },
    byCategory: { water: 3, positive: 2 },
    byEventId: { a: 1, b: 1, c: 1, d: 1, e: 1 },
    outcomes: { improved: 2, stabilized: 1, worsened: 1 },
    gaps: { meanSimMs: 150 * 60 * 1000, shortGapClusterCount: 0, longGapCount: 0 }
  }));

  assert.strictEqual(interpretation.balanceState, 'stabilizing');
  assert.strictEqual(interpretation.primaryState, 'stabilizing');
  assert.ok(interpretation.tuningFlags.includes('stabilization_visible'));
})();

(function testNegativeRunWithOpenChainsReadsAsEscalating() {
  const api = loadEventsApi();
  const interpretation = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 6, resolved: 5, queuedFollowUps: 4, activatedFollowUps: 1, expiredFollowUps: 0 },
    byCategory: { environment: 4, disease: 2 },
    byEventId: { a: 2, b: 1, c: 1, d: 1, e: 1 },
    outcomes: { worsened: 2, escalated: 2, stabilized: 1 },
    gaps: { meanSimMs: 95 * 60 * 1000, shortGapClusterCount: 1, longGapCount: 0 }
  }));

  assert.strictEqual(interpretation.balanceState, 'escalating');
  assert.strictEqual(interpretation.followUpState, 'building');
  assert.strictEqual(interpretation.primaryState, 'escalating');
  assert.ok(interpretation.tuningFlags.includes('escalation_visible'));
})();

(function testExpiryDominanceAndRepeatPressureSurfaceAsTuningFlags() {
  const api = loadEventsApi();
  const interpretation = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 6, resolved: 4, queuedFollowUps: 4, activatedFollowUps: 1, expiredFollowUps: 3 },
    byCategory: { environment: 4, water: 2 },
    byEventId: { same_event: 3, other_a: 1, other_b: 1, other_c: 1 },
    outcomes: { improved: 1, worsened: 1 },
    guardInterventions: { repeatGuard: 3, frustrationGuard: 2 },
    gaps: { meanSimMs: 140 * 60 * 1000, shortGapClusterCount: 0, longGapCount: 0 }
  }));

  assert.strictEqual(interpretation.followUpState, 'fading');
  assert.strictEqual(interpretation.guardState, 'high');
  assert.ok(interpretation.tuningFlags.includes('followup_expiry_high'));
  assert.ok(interpretation.tuningFlags.includes('category_dominance'));
  assert.ok(interpretation.tuningFlags.includes('repeat_pressure_high'));
  assert.ok(interpretation.tuningFlags.includes('guard_pressure_high'));
})();

console.log('event phase15 audit interpretation tests passed');
