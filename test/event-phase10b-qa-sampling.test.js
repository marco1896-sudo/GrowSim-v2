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

(function testSamplingSummaryCreationAndActivationTracking() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  const readyState = createStateLike();
  engine.routeTick(Date.now(), readyState);
  engine.routeChoice('drain_pot', readyState);

  const summary = engine.getQaSamplingSummary();
  assert.strictEqual(summary.totalRouteObservations, 2);
  assert.strictEqual(summary.softCutoverRequestedCount, 2);
  assert.strictEqual(summary.softCutoverActivatedCount, 2);
  assert.strictEqual(summary.hasActivatedSoftCutoverInSession, true);
  assert.strictEqual(summary.routeKindCounts.tick, 1);
  assert.strictEqual(summary.routeKindCounts.choice, 1);
  assert.strictEqual(summary.routedResponsibilityCounts.shadow_activation_preflight, 1);
  assert.strictEqual(summary.routedResponsibilityCounts.shadow_choice_preview_packaging, 1);

  featureFlag.resetModeForTesting();
})();

(function testFallbackReasonsAggregateAcrossBlockedRoutes() {
  engine.resetQaSamplingForTesting();
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
  engine.routeTick(Date.now() + 1000, blockedState);

  const summary = engine.getQaSamplingSummary();
  assert.strictEqual(summary.fallbackCount, 2);
  assert.ok(summary.fallbackReasonCounts.readiness_blocked >= 2);
  assert.ok(summary.fallbackReasonCounts.critical_guardrails_unresolved >= 2);
  assert.ok(summary.recentFallbackReasons.includes('readiness_blocked'));

  featureFlag.resetModeForTesting();
})();

(function testReadinessDistributionIsTracked() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  engine.routeTick(Date.now(), createStateLike());
  engine.routeTick(Date.now() + 1000, createStateLike({
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_other_issue',
      activeCategory: 'environment'
    }
  }));

  const summary = engine.getQaSamplingSummary();
  assert.ok(summary.readinessLevelCounts.limited_internal_cutover_testing_only >= 1);
  assert.ok(summary.readinessLevelCounts.not_ready >= 1);
  assert.ok(summary.recentReadinessStates.length >= 2);

  featureFlag.resetModeForTesting();
})();

(function testRuntimeStatusExposesInternalOnlyQaSummary() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();

  engine.routeTick(Date.now(), state);
  const status = engine.getRuntimeStatus(state);

  assert.ok(status.qaSamplingInternal);
  assert.strictEqual(status.qaSamplingInternal.internalOnly, true);
  assert.ok(!Object.prototype.hasOwnProperty.call(status, 'playerFacingQaSampling'));

  featureFlag.resetModeForTesting();
})();

(function testDocsDescribeInternalUsageOnly() {
  const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'internal-soft-cutover-qa.md'), 'utf8');

  assert.ok(doc.includes('internal-soft-cutover'));
  assert.ok(doc.includes('Current allowed internal soft-cutover scope'));
  assert.ok(doc.includes('Legacy remains the live authority'));
})();

(function testLegacyAuthorityRemainsUnchangedWhileSampling() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();
  const before = JSON.stringify(state.events);
  const routed = engine.routeChoice('drain_pot', state);
  const after = JSON.stringify(state.events);

  assert.strictEqual(routed.result, 'legacy-choice:drain_pot');
  assert.strictEqual(routed.delegated, 'legacy');
  assert.strictEqual(before, after);

  featureFlag.resetModeForTesting();
})();

console.log('event-phase10b-qa-sampling tests passed');
