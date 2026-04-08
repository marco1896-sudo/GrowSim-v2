#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const engine = require('../src/events/eventEngine.js');

function createStateLike(overrides = {}) {
  return {
    status: {
      water: 86,
      nutrition: 58,
      health: 78,
      stress: 34,
      risk: 28,
      growth: 32,
      ...(overrides.status || {})
    },
    plant: {
      phase: 'vegetative',
      stageIndex: 3,
      stageProgress: 0.4,
      ...(overrides.plant || {})
    },
    simulation: {
      simDay: 6,
      simTimeMs: 24 * 60 * 60 * 1000,
      tickCount: 60,
      isDaytime: true,
      ...(overrides.simulation || {})
    },
    setup: {
      growMode: 'indoor',
      ...(overrides.setup || {})
    },
    environmentControls: {
      temperatureC: 24,
      humidityPercent: 58,
      airflowPercent: 58,
      ph: 6.0,
      ec: 1.4,
      ...(overrides.environmentControls || {})
    },
    climate: {
      tent: {
        temperatureC: 24,
        humidityPercent: 58,
        vpdKpa: 1.1,
        airflowScore: 58,
        instabilityScore: 12,
        ...((overrides.climate && overrides.climate.tent) || {})
      },
      runtime: {
        eventTelemetry: {
          instabilityScore: 12,
          ...(((overrides.climate && overrides.climate.runtime) || {}).eventTelemetry || {})
        }
      }
    },
    events: {
      machineState: 'idle',
      activeEventId: null,
      activeCategory: 'generic',
      history: [],
      foundation: {
        flags: {},
        memory: {
          events: [],
          decisions: [],
          pendingChains: {}
        },
        analysis: []
      },
      scheduler: {
        eventCooldownsSim: {},
        categoryCooldownsSim: {},
        eventCooldowns: {},
        categoryCooldowns: {},
        ...((overrides.events && overrides.events.scheduler) || {})
      },
      catalog: [{
        id: 'v2_water_overwater_warning',
        category: 'water',
        options: [
          { id: 'drain_pot', effects: { stress: -3, risk: -5, health: 1 } },
          { id: 'ignore_moist', effects: { stress: 3, risk: 5, health: -2 } }
        ],
        triggers: {
          all: [{ field: 'status.water', op: '>=', value: 80 }]
        }
      }],
      ...(overrides.events || {})
    }
  };
}

function registerLegacyRuntime() {
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });
}

(function testMultiStepSoakAggregationSummaryShape() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();

  for (let index = 0; index < 6; index += 1) {
    state.simulation.tickCount += 1;
    state.simulation.simTimeMs += 1000;
    engine.routeTick(Date.now() + index, state);
  }

  const soak = engine.getQaSoakSummary();
  assert.strictEqual(soak.totalObservations, 6);
  assert.ok(Object.prototype.hasOwnProperty.call(soak, 'activationRate'));
  assert.ok(Object.prototype.hasOwnProperty.call(soak, 'fallbackRate'));
  assert.ok(Object.prototype.hasOwnProperty.call(soak, 'fallbackReasonDistribution'));
  assert.ok(Object.prototype.hasOwnProperty.call(soak, 'readinessLevelCounts'));
  assert.ok(Object.prototype.hasOwnProperty.call(soak, 'routeKindDistribution'));
  assert.ok(Object.prototype.hasOwnProperty.call(soak, 'assessment'));

  featureFlag.resetModeForTesting();
})();

(function testStableForCurrentScopeClassification() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();

  for (let index = 0; index < 7; index += 1) {
    state.simulation.tickCount += 1;
    state.simulation.simTimeMs += 1000;
    engine.routeTick(Date.now() + index, state);
  }

  const soak = engine.getQaSoakSummary();
  assert.strictEqual(soak.assessment, 'stable_for_current_scope');
  assert.strictEqual(soak.activationPattern, 'stable');

  featureFlag.resetModeForTesting();
})();

(function testFallbackDominantClassification() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  for (let index = 0; index < 7; index += 1) {
    const blockedState = createStateLike({
      simulation: { tickCount: 60 + index, simTimeMs: 24 * 60 * 60 * 1000 + (index * 1000) },
      events: {
        machineState: 'activeEvent',
        activeEventId: `legacy_other_issue_${index}`,
        activeCategory: 'environment'
      }
    });
    engine.routeTick(Date.now() + index, blockedState);
  }

  const soak = engine.getQaSoakSummary();
  assert.strictEqual(soak.assessment, 'fallback_dominant');
  assert.ok(soak.fallbackRate >= 0.7);
  assert.ok(soak.fallbackPattern.kind === 'sticky' || soak.fallbackPattern.kind === 'bursty');

  featureFlag.resetModeForTesting();
})();

(function testInsufficientDataClassificationWhenRunIsTooShort() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();

  engine.routeTick(Date.now(), state);
  engine.routeChoice('drain_pot', state);

  const soak = engine.getQaSoakSummary();
  assert.strictEqual(soak.assessment, 'insufficient_data');

  featureFlag.resetModeForTesting();
})();

(function testRestoreResumeAwareSoakValidation() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  const preRestoreState = createStateLike();
  engine.routeTick(Date.now(), preRestoreState);
  const payload = engine.exportShadowRuntimeState(preRestoreState);

  const restoredState = createStateLike({
    simulation: {
      simDay: 7,
      simTimeMs: 25 * 60 * 60 * 1000,
      tickCount: 70,
      isDaytime: true
    }
  });
  const restoreDiagnostics = engine.restoreShadowRuntimeState(restoredState, payload);
  assert.ok(restoreDiagnostics);

  for (let index = 0; index < 5; index += 1) {
    restoredState.simulation.tickCount += 1;
    restoredState.simulation.simTimeMs += 1000;
    engine.routeTick(Date.now() + 100 + index, restoredState);
  }

  const soak = engine.getQaSoakSummary();
  assert.ok(soak.restoreResumeNotes.restored >= 1 || Object.keys(soak.restoreResumeNotes).some((key) => key.startsWith('restore_v')));
  assert.ok(soak.totalObservations >= 6);
  assert.ok(['stable_for_current_scope', 'insufficient_data', 'unstable_guardrails', 'fallback_dominant'].includes(soak.assessment));

  featureFlag.resetModeForTesting();
})();

(function testRuntimeStatusExposesSoakInternallyOnly() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();

  for (let index = 0; index < 5; index += 1) {
    engine.routeTick(Date.now() + index, state);
  }

  const status = engine.getRuntimeStatus(state);
  assert.ok(status.qaSoakInternal);
  assert.strictEqual(status.qaSoakInternal.internalOnly, true);
  assert.ok(!Object.prototype.hasOwnProperty.call(status, 'playerFacingQaSoak'));

  featureFlag.resetModeForTesting();
})();

(function testDocsExplainStableForCurrentScopeLimits() {
  const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'internal-soft-cutover-qa.md'), 'utf8');
  assert.ok(doc.includes('stable_for_current_scope'));
  assert.ok(doc.includes('It does NOT mean'));
  assert.ok(doc.includes('broad cutover is justified'));
})();

(function testLegacyAuthorityRemainsUnchangedDuringSoak() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();
  const before = JSON.stringify(state.events);

  for (let index = 0; index < 6; index += 1) {
    engine.routeTick(Date.now() + index, state);
  }

  const after = JSON.stringify(state.events);
  assert.strictEqual(before, after);

  featureFlag.resetModeForTesting();
})();

console.log('event-phase10c-soak-validation tests passed');
