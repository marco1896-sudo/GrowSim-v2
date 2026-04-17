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

function loadEventsContext() {
  const eventsSource = fs.readFileSync(path.join(__dirname, '..', 'events.js'), 'utf8');

  const context = {
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    round2: (v) => Math.round(Number(v || 0) * 100) / 100,
    deterministicUnitFloat: () => 0,
    deterministicRoll: () => 0,
    simDayFloat: () => 1,
    simHour: () => 12,
    eventThreshold: () => 1,
    EVENT_COOLDOWN_MS: 30 * 60 * 1000,
    EVENT_ROLL_MIN_REAL_MS: 1 * 60 * 1000,
    EVENT_ROLL_MAX_REAL_MS: 2 * 60 * 1000,
    nextDaytimeRealMs: (nowMs) => nowMs,
    schedulePushIfAllowed: () => {},
    schedulePersistState: () => {},
    renderAll: () => {},
    notifyPlantNeedsCare: () => {},
    addLog: () => {},
    isPlantDead: () => false,
    clampStatus: () => {},
    syncCanonicalStateShape: () => {},
    window: {
      GrowSimPlantState: plantStateApi,
      GrowSimEventFlags: flagsApi,
      GrowSimEventMemory: memoryApi,
      GrowSimEventAnalysis: analysisApi,
      GrowSimEventResolver: resolverApi
    },
    state: {
      status: { water: 90, nutrition: 60, health: 80, stress: 30, risk: 30, growth: 0 },
      plant: { phase: 'vegetative', stageIndex: 1, stageKey: 'veg', lifecycle: { qualityScore: 55 } },
      simulation: { isDaytime: true, nowMs: 10_000, simTimeMs: 5_000, tickCount: 42 },
      setup: { mode: 'soil' },
      history: { events: [] },
      ui: { openSheet: null },
      events: {
        machineState: 'activeEvent',
        activeEventId: 'drooping_leaves_warning',
        activeCategory: 'water',
        activeLearningNote: 'Drainage early.',
        activeOptions: [
          { id: 'ignore_signals', label: 'Ignore signs', effects: { stress: 5, risk: 6 }, followUps: ['set_flag:root_stress_pending'] }
        ],
        scheduler: {
          nextEventRealTimeMs: 0,
          eventCooldowns: {},
          categoryCooldowns: {},
          lastEventId: null,
          lastEventRealTimeMs: 0
        },
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
        ],
        foundation: {
          flags: {},
          memory: { events: [], decisions: [], pendingChains: {} },
          analysis: []
        },
        history: []
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(eventsSource, context, { filename: 'events.js' });
  return context;
}

(function testEventFlowIntegration() {
  const ctx = loadEventsContext();
  const eventsApi = ctx.window.GrowSimEvents;

  eventsApi.onEventOptionClick('ignore_signals');

  assert.strictEqual(ctx.state.events.machineState, 'resolving', 'decision should enter resolving state first');
  assert(ctx.state.events.pendingResolution, 'decision should persist pending resolution metadata');
  assert.strictEqual(
    Number(ctx.state.events.audit && ctx.state.events.audit.totals && ctx.state.events.audit.totals.resolvingStarted || 0),
    1,
    'audit should count resolving decisions as soon as the timer starts'
  );
  assert.strictEqual(
    memoryApi.getPendingChain(ctx.state.events, 'root_stress_followup'),
    null,
    'follow-up chain should not exist before timer-based resolution completes'
  );
  const lastDecision = memoryApi.getLastDecision(ctx.state.events);
  assert(lastDecision, 'decision should be stored in foundation memory');
  assert.strictEqual(lastDecision.eventId, 'drooping_leaves_warning');
  assert.strictEqual(lastDecision.optionId, 'ignore_signals');
  assert.strictEqual(lastDecision.analysisId, undefined, 'analysis should not exist before delayed resolution');

  assert.strictEqual(
    analysisApi.getLatestAnalysis(ctx.state.events),
    null,
    'analysis should only be generated after the resolve timer'
  );

  ctx.state.simulation.simTimeMs = Number(ctx.state.events.resolvingUntilSimTimeMs || 0) + 1;
  ctx.state.simulation.nowMs += Number(ctx.state.events.pendingResolution.resolveTimeRealMs || 0) + 1;
  eventsApi.runEventStateMachine(ctx.state.simulation.nowMs);

  assert.strictEqual(ctx.state.events.machineState, 'resolved', 'outcome should resolve only after the timer expires');
  assert(ctx.state.events.resolvedOutcome, 'resolved outcome should be stored after delayed resolution');
  assert(ctx.state.events.resolvedOutcome.explanationText, 'resolved outcome should include explanation text');
  assert(ctx.state.events.resolvedOutcome.causeText, 'resolved outcome should explain the cause');
  assert(ctx.state.events.resolvedOutcome.resultText, 'resolved outcome should explain the result');

  const pendingAfterResolution = memoryApi.getPendingChain(ctx.state.events, 'root_stress_followup');
  assert(pendingAfterResolution, 'resolution should queue the logical follow-up chain');
  assert.strictEqual(flagsApi.hasFlag(ctx.state.events, 'root_stress_pending'), true, 'resolution should still set the root stress flag');

  const latestAnalysis = analysisApi.getLatestAnalysis(ctx.state.events);
  assert(latestAnalysis, 'analysis should be generated and stored');
  assert.strictEqual(latestAnalysis.eventId, 'drooping_leaves_warning');
  assert.strictEqual(latestAnalysis.optionId, 'ignore_signals');
  assert.strictEqual(latestAnalysis.relatedChainId, 'root_stress_followup', 'analysis should keep queued follow-up causal context');
  assert.strictEqual(
    latestAnalysis.resultText,
    ctx.state.events.resolvedOutcome.resultText,
    'analysis should reuse the resolved outcome result narrative'
  );
  assert.strictEqual(
    latestAnalysis.causeText,
    ctx.state.events.resolvedOutcome.causeText,
    'analysis should reuse the resolved outcome cause narrative'
  );

  const resolvedDecision = memoryApi.getLastDecision(ctx.state.events);
  assert(resolvedDecision.analysisId, 'resolved decision should be linked to generated analysis');
  const latestHistory = ctx.state.events.history[ctx.state.events.history.length - 1];
  assert(latestHistory.explanationText, 'history entry should persist resolved explanation text');
  assert.deepStrictEqual(
    Array.from(latestHistory.followUpIds || []),
    ['root_stress_followup'],
    'history entry should persist queued follow-up ids for UI rendering'
  );
  assert.strictEqual(
    Number(ctx.state.events.audit && ctx.state.events.audit.totals && ctx.state.events.audit.totals.queuedFollowUps || 0),
    1,
    'audit should count queued follow-ups after delayed resolution'
  );
  assert.strictEqual(
    Number(ctx.state.events.audit && ctx.state.events.audit.outcomes && ctx.state.events.audit.outcomes.worsened || 0)
      + Number(ctx.state.events.audit && ctx.state.events.audit.outcomes && ctx.state.events.audit.outcomes.escalated || 0),
    1,
    'audit should track resolved negative outcome distribution'
  );

  eventsApi.runEventStateMachine(ctx.state.simulation.nowMs + 1);
  assert.strictEqual(ctx.state.events.machineState, 'resolved', 'resolved state should remain visible until the user closes it');

  ctx.state.events.machineState = 'idle';
  ctx.state.simulation.nowMs += 1;
  ctx.state.events.scheduler.nextEventRealTimeMs = 0;

  const activated = eventsApi.activateEvent(ctx.state.simulation.nowMs);
  assert.strictEqual(activated, true, 'scheduler-like activation should select a follow-up event');
  assert.strictEqual(ctx.state.events.activeEventId, 'root_stress_followup', 'follow-up event should be activated');

  const pendingAfterActivation = memoryApi.getPendingChain(ctx.state.events, 'root_stress_followup');
  assert.strictEqual(pendingAfterActivation, null, 'pending chain should be consumed on follow-up activation');

  const lastEvent = memoryApi.getLastEvents(ctx.state.events, 1)[0];
  assert(lastEvent, 'activated follow-up should be recorded in event memory');
  assert.strictEqual(lastEvent.eventId, 'root_stress_followup');
  assert.strictEqual(lastEvent.meta.consumedChainId, 'root_stress_followup', 'event memory should keep consumed chain id');
  assert.strictEqual(lastEvent.meta.sourceEventId, 'drooping_leaves_warning', 'event memory should keep source event causal link');
  const auditSnapshot = eventsApi.getEventAuditSnapshot();
  assert.strictEqual(auditSnapshot.totals.activated, 1, 'audit should count follow-up activation when the base event was preloaded');
  assert.strictEqual(auditSnapshot.totals.activatedFollowUps, 1, 'audit should count consumed follow-up activations');
  assert.strictEqual(auditSnapshot.byCategory.disease, 1, 'audit should include follow-up category distribution');
  assert.strictEqual(auditSnapshot.byPhase.vegetative, 1, 'audit should retain phase counts for real activations');

  const resolverCandidateAfterConsume = eventsApi.resolveFoundationCandidateEvent();
  assert.notStrictEqual(
    resolverCandidateAfterConsume && resolverCandidateAfterConsume.reason,
    'pending_chain:root_stress_followup',
    'resolver should not keep stale pending-chain pressure after consume'
  );

  console.log('event-flow integration test passed');
})();
