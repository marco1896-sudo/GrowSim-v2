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

function loadEventsContext(overrides = {}) {
  const eventsSource = fs.readFileSync(path.join(__dirname, '..', 'events.js'), 'utf8');
  const now = Date.now();
  const state = {
    status: { water: 72, nutrition: 60, health: 80, stress: 22, risk: 20, growth: 18, ...(overrides.status || {}) },
    plant: { phase: 'vegetative', stageIndex: 3, stageKey: 'veg', lifecycle: { qualityScore: 58 }, ...(overrides.plant || {}) },
    simulation: { isDaytime: true, nowMs: now, simTimeMs: now, tickCount: 10, simDay: 12, ...(overrides.simulation || {}) },
    setup: { mode: 'soil', medium: 'soil', light: 'led', ...(overrides.setup || {}) },
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
      },
      ...(overrides.events || {})
    }
  };

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
    simDayFloat: () => Number(state.simulation.simDay || 0),
    simHour: () => 12,
    eventThreshold: () => 1,
    EVENT_COOLDOWN_MS: 30 * 60 * 1000,
    EVENT_ROLL_MIN_REAL_MS: 60 * 1000,
    EVENT_ROLL_MAX_REAL_MS: 2 * 60 * 1000,
    nextDaytimeRealMs: (nowMsArg) => nowMsArg,
    schedulePushIfAllowed: () => {},
    schedulePersistState: () => {},
    renderAll: () => {},
    notifyPlantNeedsCare: () => {},
    addLog: () => {},
    isPlantDead: () => false,
    clampStatus: () => {},
    syncCanonicalStateShape: () => {},
    state,
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
  return context;
}

(function testAuditTracksExpiredPendingChainsOnTick() {
  const now = Date.now();
  const ctx = loadEventsContext({
    events: {
      foundation: {
        flags: {},
        memory: {
          events: [],
          decisions: [],
          pendingChains: {
            expired_followup: {
              targetEventId: 'root_stress_followup',
              createdAtRealTimeMs: now - 600000,
              activatesAtRealTimeMs: now - 300000,
              expiresAtRealTimeMs: now - 1000
            },
            keep_followup: {
              targetEventId: 'stable_growth_reward',
              createdAtRealTimeMs: now - 120000,
              activatesAtRealTimeMs: now - 60000,
              expiresAtRealTimeMs: now + 600000
            }
          }
        },
        analysis: []
      }
    }
  });

  ctx.window.GrowSimEvents.runEventStateMachine(ctx.state.simulation.nowMs);
  const audit = ctx.window.GrowSimEvents.getEventAuditSnapshot();

  assert.strictEqual(audit.totals.expiredFollowUps, 1, 'expired follow-up chains should be counted once');
  assert.strictEqual(memoryApi.getPendingChain(ctx.state.events, 'expired_followup'), null, 'expired chain should be pruned from memory');
  assert(memoryApi.getPendingChain(ctx.state.events, 'keep_followup'), 'non-expired chain should remain queued');
})();

(function testAuditSnapshotCapturesActivationResolveAndFollowUpMetrics() {
  const ctx = loadEventsContext({
    events: {
      machineState: 'activeEvent',
      activeEventId: 'drooping_leaves_warning',
      activeEventTitle: 'Drooping leaves warning',
      activeEventText: 'Water pressure event',
      activeLearningNote: 'Drainage early.',
      activeCategory: 'water',
      activeOptions: [
        { id: 'ignore_signals', label: 'Ignore signs', effects: { stress: 5, risk: 6 }, followUps: ['set_flag:root_stress_pending'] }
      ],
      catalog: [
        {
          id: 'drooping_leaves_warning',
          title: 'Drooping leaves warning',
          description: 'Water pressure event',
          category: 'water',
          tone: 'warning',
          allowedPhases: ['vegetative'],
          options: [{ id: 'ignore_signals', label: 'Ignore signs', effects: { stress: 5, risk: 6 }, followUps: ['set_flag:root_stress_pending'] }]
        },
        {
          id: 'root_stress_followup',
          title: 'Root stress follow-up',
          description: 'Root stress escalated',
          category: 'disease',
          tone: 'negative',
          isFollowUp: true,
          allowedPhases: ['vegetative'],
          options: [{ id: 'recover_root_zone', label: 'Recover root zone', effects: { stress: -6, risk: -5 }, followUps: ['clear_flag:root_stress_pending'] }]
        }
      ]
    }
  });

  ctx.window.GrowSimEvents.onEventOptionClick('ignore_signals');
  ctx.state.simulation.simTimeMs = Number(ctx.state.events.resolvingUntilSimTimeMs || 0) + 1;
  ctx.state.simulation.nowMs += Number(ctx.state.events.pendingResolution.resolveTimeRealMs || 0) + 1;
  ctx.window.GrowSimEvents.runEventStateMachine(ctx.state.simulation.nowMs);

  ctx.state.events.machineState = 'idle';
  ctx.state.events.scheduler.nextEventRealTimeMs = 0;
  ctx.window.GrowSimEvents.activateEvent(ctx.state.simulation.nowMs + 1);

  const audit = ctx.window.GrowSimEvents.getEventAuditSnapshot();
  assert.strictEqual(audit.totals.resolvingStarted, 1, 'audit should track resolving entry');
  assert.strictEqual(audit.totals.resolved, 1, 'audit should track completed resolution');
  assert.strictEqual(audit.totals.queuedFollowUps, 1, 'audit should track queued follow-ups');
  assert.strictEqual(audit.totals.activatedFollowUps, 1, 'audit should track consumed follow-up activations');
  assert.strictEqual(audit.totals.activated, 1, 'audit should count the real follow-up activation in this harness');
  assert.strictEqual(audit.byPhase.vegetative, 1, 'audit should aggregate activations per phase');
  assert.strictEqual(audit.byCategory.disease, 1, 'follow-up category should be counted');
  assert(Number(audit.meanGapSimMs || 0) >= 0, 'audit should expose a gap metric');
})();

(function testAppContainsAuditRunFeelHook() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(appJs.includes('function getEventAuditViewModel('));
  assert.ok(appJs.includes('function getEventAuditInterpretationView('));
  assert.ok(appJs.includes('auditView.summary'));
  assert.ok(appJs.includes('auditView.support'));
})();

(function testEventsApiExposesAuditInterpretation() {
  const ctx = loadEventsContext();
  assert.strictEqual(typeof ctx.window.GrowSimEvents.getEventAuditInterpretation, 'function');
})();

console.log('event phase14 telemetry/audit tests passed');
