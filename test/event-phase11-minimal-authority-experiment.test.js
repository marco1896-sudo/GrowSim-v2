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

function registerLegacyRuntime() {
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });
}

(function testLegacyDefaultBehaviorRemainsUnchanged() {
  featureFlag.setModeForTesting('legacy');
  registerLegacyRuntime();
  const state = createStateLike();
  const routed = engine.routeTick(Date.now(), state);

  assert.strictEqual(routed.result, 'legacy-tick');
  assert.strictEqual(routed.delegated, 'legacy');
  assert.deepStrictEqual(routed.authorityExperiment.requestedScope, []);
  assert.deepStrictEqual(routed.authorityExperiment.grantedScope, []);
  assert.strictEqual(routed.authorityExperiment.exercised, false);

  featureFlag.resetModeForTesting();
})();

(function testAuthorityExperimentStaysDisabledWithoutExplicitInternalMode() {
  featureFlag.setModeForTesting('shadow');
  registerLegacyRuntime();
  const state = createStateLike();
  const routed = engine.routeTick(Date.now(), state);

  assert.strictEqual(routed.softCutover.active, false);
  assert.deepStrictEqual(routed.authorityExperiment.requestedScope, []);
  assert.strictEqual(routed.authorityExperiment.exercised, false);

  featureFlag.resetModeForTesting();
})();

(function testGuardrailFailureForcesAuthorityFallback() {
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike({
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_other_issue',
      activeCategory: 'environment'
    }
  });
  const routed = engine.routeTick(Date.now(), state);

  assert.strictEqual(routed.result, 'legacy-tick');
  assert.strictEqual(routed.delegated, 'legacy');
  assert.strictEqual(routed.authorityExperiment.exercised, false);
  assert.strictEqual(routed.authorityExperiment.fallbackOccurred, true);
  assert.ok(routed.authorityExperiment.fallbackReasons.includes('readiness_blocked') || routed.authorityExperiment.fallbackReasons.includes('critical_guardrails_unresolved'));

  featureFlag.resetModeForTesting();
})();

(function testNarrowAuthorityScopeActivatesOnlyAfterBaselineAndConditionsPass() {
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();

  const warmup = engine.routeTick(Date.now(), state);
  assert.deepStrictEqual(warmup.authorityExperiment.requestedScope, ['internal_activation_predecision_authority']);
  assert.deepStrictEqual(warmup.authorityExperiment.grantedScope, []);
  assert.strictEqual(warmup.authorityExperiment.exercised, false);
  assert.ok(warmup.authorityExperiment.fallbackReasons.includes('authority_decision_not_exercised') || warmup.authorityExperiment.fallbackReasons.includes('authority_baseline_diagnostics_missing'));

  const routed = engine.routeTick(Date.now(), state);
  assert.strictEqual(routed.result, 'legacy-tick');
  assert.strictEqual(routed.delegated, 'legacy');
  assert.deepStrictEqual(routed.authorityExperiment.requestedScope, ['internal_activation_predecision_authority']);
  assert.deepStrictEqual(routed.authorityExperiment.grantedScope, ['internal_activation_predecision_authority']);
  assert.strictEqual(routed.authorityExperiment.exercised, true);
  assert.ok(routed.authorityExperiment.decision);
  assert.strictEqual(routed.authorityExperiment.decision.authorityKind, 'activation_predecision');
  assert.strictEqual(routed.routing.currentAuthority, 'legacy');
  assert.deepStrictEqual(routed.routing.grantedAuthorityScope, ['internal_activation_predecision_authority']);
  assert.ok(routed.routing.legacyOwnedAuthorityScope.includes('live_event_triggering'));

  featureFlag.resetModeForTesting();
})();

(function testChoiceRouteDoesNotGainUnrelatedAuthorityScope() {
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();
  engine.routeTick(Date.now(), state);
  const routed = engine.routeChoice('drain_pot', state);

  assert.strictEqual(routed.result, 'legacy-choice:drain_pot');
  assert.strictEqual(routed.delegated, 'legacy');
  assert.deepStrictEqual(routed.authorityExperiment.requestedScope, []);
  assert.deepStrictEqual(routed.authorityExperiment.grantedScope, []);
  assert.strictEqual(routed.authorityExperiment.exercised, false);
  assert.deepStrictEqual(routed.routing.grantedAuthorityScope, []);

  featureFlag.resetModeForTesting();
})();

(function testRuntimeStatusReportsAuthorityExperimentTruthfully() {
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();
  engine.routeTick(Date.now(), state);
  engine.routeTick(Date.now(), state);
  const status = engine.getRuntimeStatus(state);

  assert.strictEqual(status.liveAuthority, 'legacy');
  assert.deepStrictEqual(status.requestedAuthorityScope, ['internal_activation_predecision_authority']);
  assert.deepStrictEqual(status.grantedAuthorityScope, ['internal_activation_predecision_authority']);
  assert.strictEqual(status.authorityExperimentActive, true);
  assert.strictEqual(status.authorityExperimentExercised, true);
  assert.ok(status.legacyOwnedAuthorityScope.includes('event_state_mutation'));

  featureFlag.resetModeForTesting();
})();

console.log('event-phase11-minimal-authority-experiment tests passed');
