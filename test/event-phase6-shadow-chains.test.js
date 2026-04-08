#!/usr/bin/env node
'use strict';

const assert = require('assert');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const chains = require('../src/events/eventChains.js');
const engine = require('../src/events/eventEngine.js');

function createSnapshot(overrides = {}) {
  const base = {
    status: {
      stress: 36,
      risk: 34
    },
    simulation: {
      simTimeMs: 24 * 60 * 60 * 1000
    },
    environment: {
      instabilityScore: 18
    },
    events: {
      machineState: 'idle',
      activeEventId: null
    }
  };

  return {
    ...base,
    ...overrides,
    status: { ...base.status, ...(overrides.status || {}) },
    simulation: { ...base.simulation, ...(overrides.simulation || {}) },
    environment: { ...base.environment, ...(overrides.environment || {}) },
    events: { ...base.events, ...(overrides.events || {}) }
  };
}

function createStateLike(overrides = {}) {
  return {
    status: {
      water: 86,
      nutrition: 58,
      health: 78,
      stress: 36,
      risk: 34,
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
        instabilityScore: 18,
        ...((overrides.climate && overrides.climate.tent) || {})
      },
      runtime: {
        eventTelemetry: {
          instabilityScore: 18,
          ...(((overrides.climate && overrides.climate.runtime) || {}).eventTelemetry || {})
        }
      }
    },
    events: {
      machineState: 'idle',
      activeEventId: null,
      activeCategory: 'generic',
      history: [],
      scheduler: {
        eventCooldownsSim: {},
        categoryCooldownsSim: {},
        eventCooldowns: {},
        categoryCooldowns: {},
        ...((overrides.events && overrides.events.scheduler) || {})
      },
      catalog: [],
      ...(overrides.events || {})
    }
  };
}

(function testDeterministicFollowUpCandidateGeneration() {
  const snapshot = createSnapshot();
  const resolutionModel = {
    eventId: 'v2_water_overwater_warning',
    category: 'water',
    quality: 'poor',
    outcomeStatus: 'worsened',
    escalationRiskShift: 14,
    followUpHooks: ['root_zone_followup_possible'],
    plausibleFollowUp: true
  };

  const firstState = chains.buildChainContext({}, resolutionModel, snapshot);
  const secondState = chains.buildChainContext({}, resolutionModel, snapshot);

  const first = chains.evaluateFollowUps({
    state: createStateLike(),
    snapshot,
    pressureState: {
      latentPressures: {
        water: 32,
        disease: 28
      }
    },
    previousState: firstState
  });
  const second = chains.evaluateFollowUps({
    state: createStateLike(),
    snapshot,
    pressureState: {
      latentPressures: {
        water: 32,
        disease: 28
      }
    },
    previousState: secondState
  });

  assert.deepStrictEqual(first.topFollowUp.followUpId, second.topFollowUp.followUpId);
  assert.deepStrictEqual(first.topFollowUp.plausibilityStrength, second.topFollowUp.plausibilityStrength);
})();

(function testGoodResolutionBlocksFollowUp() {
  const snapshot = createSnapshot();
  const resolutionModel = {
    eventId: 'v2_water_overwater_warning',
    category: 'water',
    quality: 'good',
    outcomeStatus: 'improved',
    escalationRiskShift: -12,
    followUpHooks: ['root_zone_followup_possible'],
    plausibleFollowUp: true
  };
  const chainState = chains.buildChainContext({}, resolutionModel, snapshot);
  const result = chains.evaluateFollowUps({
    state: createStateLike(),
    snapshot,
    pressureState: {
      latentPressures: {
        water: 24,
        disease: 24
      }
    },
    previousState: chainState
  });

  assert.strictEqual(result.hasFollowUp, false);
  assert.ok(result.evaluated[0].blockers.includes('prior_resolution_was_strong_enough'));
})();

(function testFollowUpFromWorseningPath() {
  const snapshot = createSnapshot();
  const resolutionModel = {
    eventId: 'v2_water_overwater_warning',
    category: 'water',
    quality: 'poor',
    outcomeStatus: 'worsened',
    escalationRiskShift: 12,
    followUpHooks: ['root_zone_followup_possible'],
    plausibleFollowUp: true
  };
  const chainState = chains.buildChainContext({}, resolutionModel, snapshot);
  const result = chains.evaluateFollowUps({
    state: createStateLike(),
    snapshot,
    pressureState: {
      latentPressures: {
        water: 30,
        disease: 28
      }
    },
    previousState: chainState
  });

  assert.strictEqual(result.hasFollowUp, true);
  assert.strictEqual(result.topFollowUp.followUpId, 'root_stress_followup');
})();

(function testCooldownAndContradictionBlockingForFollowUps() {
  const simTimeMs = 24 * 60 * 60 * 1000;
  const snapshot = createSnapshot({
    simulation: { simTimeMs },
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_other_issue'
    }
  });
  const resolutionModel = {
    eventId: 'v2_water_overwater_warning',
    category: 'water',
    quality: 'poor',
    outcomeStatus: 'worsened',
    escalationRiskShift: 12,
    followUpHooks: ['root_zone_followup_possible'],
    plausibleFollowUp: true
  };
  const chainState = chains.buildChainContext({}, resolutionModel, snapshot);
  const result = chains.evaluateFollowUps({
    state: createStateLike({
      simulation: { simTimeMs },
      events: {
        machineState: 'activeEvent',
        activeEventId: 'legacy_other_issue',
        scheduler: {
          eventCooldownsSim: {
            root_stress_followup: simTimeMs + 10_000
          }
        }
      }
    }),
    snapshot,
    pressureState: {
      latentPressures: {
        water: 30,
        disease: 28
      }
    },
    previousState: chainState
  });

  assert.strictEqual(result.hasFollowUp, false);
  assert.ok(result.evaluated[0].blockers.includes('runtime_busy'));
  assert.ok(result.evaluated[0].blockers.includes('event_cooldown'));
})();

(function testStaleChainContextSuppression() {
  const snapshot = createSnapshot({
    simulation: { simTimeMs: 40 * 60 * 60 * 1000 }
  });
  const resolutionModel = {
    eventId: 'v2_water_overwater_warning',
    category: 'water',
    quality: 'poor',
    outcomeStatus: 'worsened',
    escalationRiskShift: 12,
    followUpHooks: ['root_zone_followup_possible'],
    plausibleFollowUp: true
  };
  const chainState = chains.buildChainContext({}, resolutionModel, createSnapshot({
    simulation: { simTimeMs: 20 * 60 * 60 * 1000 }
  }));
  const result = chains.evaluateFollowUps({
    state: createStateLike({
      simulation: { simTimeMs: 40 * 60 * 60 * 1000 }
    }),
    snapshot,
    pressureState: {
      latentPressures: {
        water: 30,
        disease: 28
      }
    },
    previousState: chainState
  });

  assert.strictEqual(result.hasFollowUp, false);
  assert.ok(result.evaluated[0].blockers.includes('chain_context_stale'));
})();

(function testEngineChainDiagnosticsAreShadowOnly() {
  featureFlag.setModeForTesting('shadow');
  const state = createStateLike({
    events: {
      catalog: [{
        id: 'v2_water_overwater_warning',
        category: 'water',
        options: [
          { id: 'ignore_moist', effects: { health: -3, risk: 5, stress: 2 } }
        ],
        triggers: {
          all: [{ field: 'status.water', op: '>=', value: 80 }]
        }
      }]
    }
  });

  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });

  const before = JSON.stringify(state.status);
  const routed = engine.routeChoice('ignore_moist', state);
  const after = JSON.stringify(state.status);

  assert.strictEqual(routed.result, 'legacy-choice:ignore_moist');
  assert.strictEqual(before, after);
  assert.ok(routed.diagnostics);
  assert.ok(routed.diagnostics.chains);
  assert.ok(routed.diagnostics.analysis.chain);

  featureFlag.resetModeForTesting();
})();
