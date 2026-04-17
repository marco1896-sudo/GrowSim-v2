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
      plant: { phase: 'vegetative', stageIndex: 3, stageKey: 'veg', stageProgress: 0.4, lifecycle: { qualityScore: 60 } },
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
  const currentPhase = String(overrides.currentPhase || 'vegetative');
  const currentStageIndex = Math.max(0, Math.trunc(Number(overrides.currentStageIndex != null ? overrides.currentStageIndex : 3) || 0));
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
    bySimDay: { 12: Number(totals.activated || 0) },
    outcomes,
    followUps: { byTargetId: {}, bySourceId: {} },
    guardInterventions,
    gaps,
    recent,
    dominantCategory,
    dominantCategoryCount,
    currentPhase,
    currentStageIndex,
    currentStageProgress: 0.4,
    leadingOutcome: '',
    totalActivated: Math.max(0, Math.trunc(Number(totals.activated) || 0)),
    totalResolved: Math.max(0, Math.trunc(Number(totals.resolved) || 0)),
    stabilizationRatio: totalNegative > 0 ? Math.round((totalPositive / totalNegative) * 100) / 100 : (totalPositive > 0 ? totalPositive : 0),
    shortGapClusterCount: Math.max(0, Math.trunc(Number(gaps.shortGapClusterCount) || 0)),
    longGapCount: Math.max(0, Math.trunc(Number(gaps.longGapCount) || 0)),
    meanGapSimMs: Math.max(0, Math.trunc(Number(gaps.meanSimMs) || 0))
  };
}

(function testSingleShortGapAtThreeActivationsDoesNotBecomeDense() {
  const api = loadEventsApi();
  const interpretation = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 3, resolved: 2 },
    byCategory: { water: 2, nutrition: 1 },
    byEventId: { a: 1, b: 1, c: 1 },
    outcomes: { worsened: 1, stabilized: 1 },
    gaps: { meanSimMs: 100 * 60 * 1000, shortGapClusterCount: 1, longGapCount: 0 }
  }));

  assert.notStrictEqual(interpretation.primaryState, 'dense');
  assert.strictEqual(interpretation.densityState, 'balanced');
})();

(function testSmallNegativeLeadDoesNotOvercallVulnerable() {
  const api = loadEventsApi();
  const interpretation = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 4, resolved: 3, queuedFollowUps: 1, activatedFollowUps: 1, expiredFollowUps: 0 },
    byCategory: { water: 2, environment: 2 },
    byEventId: { a: 1, b: 1, c: 1, d: 1 },
    outcomes: { worsened: 2, stabilized: 1 },
    recent: { outcomes: ['worsened', 'stabilized'], phases: ['vegetative'] }
  }));

  assert.notStrictEqual(interpretation.balanceState, 'vulnerable');
  assert.notStrictEqual(interpretation.primaryState, 'vulnerable');
})();

(function testSameDensityReadsSofterInVegetativeThanFlowering() {
  const api = loadEventsApi();
  const shared = {
    totals: { activated: 5, resolved: 3 },
    byCategory: { environment: 3, water: 2 },
    byEventId: { a: 1, b: 1, c: 1, d: 1, e: 1 },
    outcomes: { worsened: 1, stabilized: 1 },
    gaps: { meanSimMs: 80 * 60 * 1000, shortGapClusterCount: 2, longGapCount: 0 }
  };
  const vegetative = api.getEventAuditInterpretation(buildSnapshot({
    ...shared,
    currentPhase: 'vegetative',
    currentStageIndex: 3,
    recent: { outcomes: ['stabilized'], phases: ['vegetative'] }
  }));
  const flowering = api.getEventAuditInterpretation(buildSnapshot({
    ...shared,
    currentPhase: 'flowering',
    currentStageIndex: 8,
    recent: { outcomes: ['stabilized'], phases: ['flowering'] }
  }));

  assert.notStrictEqual(vegetative.densityState, 'dense');
  assert.strictEqual(flowering.densityState, 'dense');
})();

(function testSameFollowUpLoadIsToleratedMoreInFlowering() {
  const api = loadEventsApi();
  const shared = {
    totals: { activated: 6, resolved: 4, queuedFollowUps: 2, activatedFollowUps: 1, expiredFollowUps: 0 },
    byCategory: { environment: 4, disease: 2 },
    byEventId: { a: 2, b: 1, c: 1, d: 1, e: 1 },
    outcomes: { worsened: 2, stabilized: 1, improved: 1 },
    recent: { outcomes: ['worsened'], phases: ['vegetative'] }
  };
  const vegetative = api.getEventAuditInterpretation(buildSnapshot({
    ...shared,
    currentPhase: 'vegetative',
    currentStageIndex: 3
  }));
  const flowering = api.getEventAuditInterpretation(buildSnapshot({
    ...shared,
    currentPhase: 'flowering',
    currentStageIndex: 8,
    recent: { outcomes: ['worsened'], phases: ['flowering'] }
  }));

  assert.strictEqual(vegetative.followUpState, 'building');
  assert.notStrictEqual(flowering.followUpState, 'building');
})();

(function testStabilizingRemainsDistinctFromBalanced() {
  const api = loadEventsApi();
  const balanced = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 5, resolved: 4, queuedFollowUps: 2, activatedFollowUps: 1, expiredFollowUps: 0 },
    byCategory: { water: 3, positive: 2 },
    byEventId: { a: 1, b: 1, c: 1, d: 1, e: 1 },
    outcomes: { improved: 1, stabilized: 1, worsened: 1, escalated: 1 },
    recent: { outcomes: ['worsened', 'stabilized'], phases: ['vegetative'] }
  }));
  const stabilizing = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 6, resolved: 5, queuedFollowUps: 2, activatedFollowUps: 2, expiredFollowUps: 0 },
    byCategory: { water: 3, positive: 3 },
    byEventId: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 },
    outcomes: { improved: 2, stabilized: 2, worsened: 1 },
    recent: { outcomes: ['worsened', 'improved', 'stabilized'], phases: ['vegetative'] }
  }));

  assert.strictEqual(balanced.balanceState, 'balanced');
  assert.strictEqual(stabilizing.balanceState, 'stabilizing');
})();

(function testMixedRunCanRecoverFromEarlierNegativeBias() {
  const api = loadEventsApi();
  const interpretation = api.getEventAuditInterpretation(buildSnapshot({
    totals: { activated: 6, resolved: 5, queuedFollowUps: 3, activatedFollowUps: 2, expiredFollowUps: 0 },
    byCategory: { water: 3, positive: 2, environment: 1 },
    byEventId: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 },
    outcomes: { improved: 2, stabilized: 2, worsened: 1 },
    recent: { outcomes: ['worsened', 'improved', 'stabilized'], phases: ['vegetative'] }
  }));

  assert.notStrictEqual(interpretation.primaryState, 'vulnerable');
  assert.strictEqual(interpretation.primaryState, 'stabilizing');
})();

(function testAppContainsPhaseAwareRunTendencyLanguage() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(appJs.includes('function describeEventAuditPhaseTone('));
  assert.ok(appJs.includes('Noch wenige Eventdaten'));
  assert.ok(appJs.includes('ruhig gefuehrt'));
  assert.ok(appJs.includes('Stabilisierung sichtbar'));
})();

console.log('event phase16 real-run tuning tests passed');
