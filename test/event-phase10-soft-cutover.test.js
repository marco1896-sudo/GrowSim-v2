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

function registerLegacyRuntime() {
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });
}

(function testLegacyDefaultRemainsUnchanged() {
  featureFlag.setModeForTesting('legacy');
  registerLegacyRuntime();
  const state = createStateLike();
  const before = JSON.stringify(state.events);
  const routed = engine.routeTick(Date.now(), state);
  const after = JSON.stringify(state.events);

  assert.strictEqual(routed.result, 'legacy-tick');
  assert.strictEqual(routed.delegated, 'legacy');
  assert.strictEqual(routed.softCutover.active, false);
  assert.strictEqual(before, after);

  featureFlag.resetModeForTesting();
})();

(function testSoftCutoverDisabledWithoutExplicitInternalMode() {
  featureFlag.setModeForTesting('shadow');
  registerLegacyRuntime();
  const state = createStateLike();
  const routed = engine.routeTick(Date.now(), state);

  assert.strictEqual(routed.softCutover.active, false);
  assert.ok(routed.routing.fallbackReasons.includes('explicit_internal_mode_required'));

  featureFlag.resetModeForTesting();
})();

(function testGuardrailBlockedInternalModeFallsBackToLegacy() {
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
  assert.strictEqual(routed.softCutover.active, false);
  assert.strictEqual(routed.softCutover.fallbackOccurred, true);
  assert.ok(routed.softCutover.fallbackReasons.includes('readiness_blocked'));
  assert.ok(routed.routing.fallbackReasons.includes('critical_guardrails_unresolved'));

  featureFlag.resetModeForTesting();
})();

(function testAllowedInternalTickScopeActivatesOnlyWhenReady() {
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();
  const routed = engine.routeTick(Date.now(), state);
  const status = engine.getRuntimeStatus(state);

  assert.strictEqual(routed.result, 'legacy-tick');
  assert.strictEqual(routed.delegated, 'legacy');
  assert.strictEqual(routed.softCutover.active, true);
  assert.deepStrictEqual(routed.softCutover.routedResponsibilities, ['shadow_activation_preflight']);
  assert.strictEqual(routed.routing.currentAuthority, 'legacy');
  assert.strictEqual(status.softCutoverActive, true);
  assert.deepStrictEqual(status.internallyRoutedResponsibilities, ['shadow_activation_preflight']);

  featureFlag.resetModeForTesting();
})();

(function testAllowedInternalChoiceScopeActivatesOnlyWhenReady() {
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();
  const routed = engine.routeChoice('drain_pot', state);

  assert.strictEqual(routed.result, 'legacy-choice:drain_pot');
  assert.strictEqual(routed.delegated, 'legacy');
  assert.strictEqual(routed.softCutover.active, true);
  assert.deepStrictEqual(routed.softCutover.routedResponsibilities, ['shadow_choice_preview_packaging']);
  assert.ok(routed.diagnostics);

  featureFlag.resetModeForTesting();
})();

(function testRuntimeStatusReportsTruthfulFallbackState() {
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const blockedState = createStateLike({
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_other_issue',
      activeCategory: 'environment'
    }
  });

  engine.routeTick(Date.now(), blockedState);
  const status = engine.getRuntimeStatus(blockedState);

  assert.strictEqual(status.mode, 'internal-soft-cutover');
  assert.strictEqual(status.liveAuthority, 'legacy');
  assert.strictEqual(status.softCutoverRequested, true);
  assert.strictEqual(status.softCutoverActive, false);
  assert.strictEqual(status.fallbackOccurred, true);
  assert.ok(status.fallbackReasons.includes('critical_guardrails_unresolved'));

  featureFlag.resetModeForTesting();
})();

console.log('event-phase10-soft-cutover tests passed');
