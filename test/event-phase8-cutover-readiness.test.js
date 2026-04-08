#!/usr/bin/env node
'use strict';

const assert = require('assert');

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

(function testReadinessStatusGeneration() {
  featureFlag.setModeForTesting('shadow');
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });

  const state = createStateLike();
  const diagnostics = engine.computeShadowState(state);

  assert.ok(diagnostics.readiness);
  assert.ok(diagnostics.status);
  assert.ok(diagnostics.routing);
  assert.strictEqual(diagnostics.status.liveAuthority, 'legacy');
  assert.strictEqual(diagnostics.status.newEngineLive, false);
  assert.strictEqual(diagnostics.readiness.readinessLevel, 'limited_internal_cutover_testing_only');

  featureFlag.resetModeForTesting();
})();

(function testParityDiagnosticStructureForDivergence() {
  featureFlag.setModeForTesting('shadow');
  const state = createStateLike({
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_other_issue',
      activeCategory: 'environment'
    }
  });
  const diagnostics = engine.computeShadowState(state);

  assert.ok(diagnostics.comparison);
  assert.ok(diagnostics.comparison.sections);
  assert.ok(diagnostics.comparison.sections.activeEvent);
  assert.ok(diagnostics.comparison.sections.warnings);
  assert.ok(diagnostics.comparison.sections.blockedDeferred);
  assert.ok(Array.isArray(diagnostics.comparison.unresolvedMismatchReasons));
  assert.ok(diagnostics.comparison.unresolvedMismatchReasons.some((reason) => String(reason).startsWith('active:') || String(reason).startsWith('warning:')));

  featureFlag.resetModeForTesting();
})();

(function testGuardrailsBlockWhenParityUnresolved() {
  featureFlag.setModeForTesting('shadow');
  const state = createStateLike({
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_other_issue',
      activeCategory: 'environment'
    }
  });
  const diagnostics = engine.computeShadowState(state);

  assert.strictEqual(diagnostics.readiness.readinessLevel, 'not_ready');
  assert.ok(diagnostics.readiness.blockers.some((reason) => String(reason).startsWith('parity:')));

  featureFlag.resetModeForTesting();
})();

(function testRollbackPreparationHooksStaySafe() {
  featureFlag.setModeForTesting('new');
  const state = createStateLike();
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });

  const routing = engine.getRoutingPlan(state);
  const rollback = engine.prepareRollbackHooks(state);
  const routed = engine.routeTick(Date.now(), state);

  assert.strictEqual(routing.currentAuthority, 'legacy');
  assert.strictEqual(routing.liveNewRuntimeAllowed, false);
  assert.strictEqual(rollback.rollbackAvailable, true);
  assert.strictEqual(rollback.fallbackAuthority, 'legacy');
  assert.strictEqual(routed.result, 'legacy-tick');

  featureFlag.resetModeForTesting();
})();

(function testRuntimeStatusIsNonInvasiveInLegacyMode() {
  featureFlag.setModeForTesting('legacy');
  const state = createStateLike();
  const before = JSON.stringify(state.events);
  const status = engine.getRuntimeStatus(state);
  const after = JSON.stringify(state.events);

  assert.strictEqual(status.mode, 'legacy');
  assert.strictEqual(status.shadowEnabled, false);
  assert.strictEqual(status.liveAuthority, 'legacy');
  assert.strictEqual(before, after);

  featureFlag.resetModeForTesting();
})();

(function testPersistenceReadinessCompatibility() {
  featureFlag.setModeForTesting('shadow');
  const original = createStateLike();
  engine.computeShadowState(original);
  const payload = engine.exportShadowRuntimeState(original);

  const restored = createStateLike();
  const restoreDiagnostics = engine.restoreShadowRuntimeState(restored, payload);
  const status = engine.getRuntimeStatus(restored);
  const readiness = engine.getCutoverReadiness(restored);

  assert.strictEqual(restoreDiagnostics.versionLoaded, 1);
  assert.strictEqual(status.persistenceVersion, 1);
  assert.strictEqual(status.lastRestoreVersion, 1);
  assert.strictEqual(readiness.persistence.requiredStatePresent, true);

  featureFlag.resetModeForTesting();
})();

console.log('event-phase8-cutover-readiness tests passed');
