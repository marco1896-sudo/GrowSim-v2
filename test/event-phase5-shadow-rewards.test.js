#!/usr/bin/env node
'use strict';

const assert = require('assert');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const rewards = require('../src/events/eventRewards.js');
const engine = require('../src/events/eventEngine.js');

function createSnapshot(overrides = {}) {
  const base = {
    status: {
      stress: 12,
      risk: 10,
      water: 60,
      nutrition: 58,
      health: 84
    },
    simulation: {
      simTimeMs: 20 * 60 * 60 * 1000
    },
    environment: {
      instabilityScore: 12
    }
  };

  return {
    ...base,
    ...overrides,
    status: { ...base.status, ...(overrides.status || {}) },
    simulation: { ...base.simulation, ...(overrides.simulation || {}) },
    environment: { ...base.environment, ...(overrides.environment || {}) }
  };
}

function createPressureState(overrides = {}) {
  return {
    latentPressures: {
      water: 10,
      nutrition: 8,
      environment: 12,
      disease: 9,
      pest: 7,
      positive: 80,
      ...(overrides.latentPressures || {})
    }
  };
}

(function testStabilityRewardEligibility() {
  const snapshot = createSnapshot({
    simulation: { simTimeMs: 20 * 60 * 60 * 1000 }
  });
  const result = rewards.evaluateRewardWindow({
    snapshot,
    pressureState: createPressureState(),
    escalationResult: { escalatingCandidates: [], escalatedCandidates: [] },
    previousState: {
      stableWindow: {
        startSimTimeMs: 11 * 60 * 60 * 1000,
        stableHours: 9,
        lastStableSimTimeMs: 19 * 60 * 60 * 1000
      },
      recentResolutions: []
    }
  });

  assert.strictEqual(result.rewardEligible, true);
  assert.strictEqual(result.rewardClass, 'stability_reward');
})();

(function testRecoveryRewardEligibility() {
  const snapshot = createSnapshot({
    simulation: { simTimeMs: 24 * 60 * 60 * 1000 }
  });
  const result = rewards.evaluateRewardWindow({
    snapshot,
    pressureState: createPressureState({
      latentPressures: {
        water: 14,
        nutrition: 10,
        environment: 16,
        disease: 12,
        pest: 10
      }
    }),
    escalationResult: { escalatingCandidates: [], escalatedCandidates: [] },
    previousState: {
      stableWindow: {
        startSimTimeMs: 21.5 * 60 * 60 * 1000,
        stableHours: 2.5,
        lastStableSimTimeMs: 23.5 * 60 * 60 * 1000
      },
      recentResolutions: [{
        eventId: 'heat_spike',
        category: 'environment',
        shadowStage: 'active',
        outcomeStatus: 'improved',
        quality: 'good',
        fitScore: 24,
        escalationRiskShift: -10,
        plausibleFollowUp: false,
        atSimTimeMs: 22.5 * 60 * 60 * 1000
      }]
    }
  });

  assert.strictEqual(result.rewardEligible, true);
  assert.strictEqual(result.rewardClass, 'recovery_reward');
})();

(function testExecutionRewardEligibility() {
  const snapshot = createSnapshot({
    simulation: { simTimeMs: 14 * 60 * 60 * 1000 }
  });
  const result = rewards.evaluateRewardWindow({
    snapshot,
    pressureState: createPressureState({
      latentPressures: {
        water: 16,
        nutrition: 11,
        environment: 17,
        disease: 12,
        pest: 10
      }
    }),
    escalationResult: { escalatingCandidates: [], escalatedCandidates: [] },
    previousState: {
      stableWindow: {
        startSimTimeMs: 13 * 60 * 60 * 1000,
        stableHours: 1,
        lastStableSimTimeMs: 13.5 * 60 * 60 * 1000
      },
      recentResolutions: [{
        eventId: 'water_overwater_warning',
        category: 'water',
        shadowStage: 'warning',
        outcomeStatus: 'improved',
        quality: 'good',
        fitScore: 28,
        escalationRiskShift: -12,
        plausibleFollowUp: false,
        atSimTimeMs: 13 * 60 * 60 * 1000
      }]
    }
  });

  assert.strictEqual(result.rewardEligible, true);
  assert.strictEqual(result.rewardClass, 'execution_reward');
})();

(function testRewardBlockedByHiddenPressure() {
  const snapshot = createSnapshot();
  const result = rewards.evaluateRewardWindow({
    snapshot,
    pressureState: createPressureState({
      latentPressures: {
        water: 35,
        nutrition: 10,
        environment: 12,
        disease: 10,
        pest: 9
      }
    }),
    escalationResult: { escalatingCandidates: [], escalatedCandidates: [] },
    previousState: {
      stableWindow: {
        startSimTimeMs: 10 * 60 * 60 * 1000,
        stableHours: 10,
        lastStableSimTimeMs: 19 * 60 * 60 * 1000
      },
      recentResolutions: []
    }
  });

  assert.strictEqual(result.rewardEligible, false);
  assert.ok(result.blockers.includes('hidden_negative_pressure_too_high'));
})();

(function testRewardCooldownBehavior() {
  const snapshot = createSnapshot({
    simulation: { simTimeMs: 20 * 60 * 60 * 1000 }
  });
  const result = rewards.evaluateRewardWindow({
    snapshot,
    pressureState: createPressureState(),
    escalationResult: { escalatingCandidates: [], escalatedCandidates: [] },
    previousState: {
      rewardCooldownUntilSimTimeMs: 22 * 60 * 60 * 1000,
      stableWindow: {
        startSimTimeMs: 11 * 60 * 60 * 1000,
        stableHours: 9,
        lastStableSimTimeMs: 19 * 60 * 60 * 1000
      },
      recentResolutions: []
    }
  });

  assert.strictEqual(result.rewardEligible, false);
  assert.ok(result.blockers.includes('reward_cooldown_active'));
})();

(function testRewardClassificationIsDeterministic() {
  const input = {
    snapshot: createSnapshot({
      simulation: { simTimeMs: 24 * 60 * 60 * 1000 }
    }),
    pressureState: createPressureState({
      latentPressures: {
        water: 14,
        nutrition: 10,
        environment: 16,
        disease: 12,
        pest: 10
      }
    }),
    escalationResult: { escalatingCandidates: [], escalatedCandidates: [] },
    previousState: {
      stableWindow: {
        startSimTimeMs: 21.5 * 60 * 60 * 1000,
        stableHours: 2.5,
        lastStableSimTimeMs: 23.5 * 60 * 60 * 1000
      },
      recentResolutions: [{
        eventId: 'heat_spike',
        category: 'environment',
        shadowStage: 'active',
        outcomeStatus: 'improved',
        quality: 'good',
        fitScore: 24,
        escalationRiskShift: -10,
        plausibleFollowUp: false,
        atSimTimeMs: 22.5 * 60 * 60 * 1000
      }]
    }
  };

  const first = rewards.evaluateRewardWindow(input);
  const second = rewards.evaluateRewardWindow(input);
  assert.deepStrictEqual(first.rewardClass, second.rewardClass);
  assert.deepStrictEqual(first.rewardEligible, second.rewardEligible);
})();

(function testEngineRewardModelingIsShadowOnly() {
  featureFlag.setModeForTesting('shadow');
  const state = {
    seed: 'phase5-seed',
    status: {
      water: 60,
      nutrition: 58,
      health: 84,
      stress: 12,
      risk: 10,
      growth: 40
    },
    plant: {
      phase: 'vegetative',
      stageIndex: 3,
      stageProgress: 0.4
    },
    simulation: {
      simDay: 5,
      simTimeMs: 20 * 60 * 60 * 1000,
      tickCount: 50
    },
    setup: {
      growMode: 'indoor'
    },
    environmentControls: {
      temperatureC: 24,
      humidityPercent: 58,
      airflowPercent: 58,
      ph: 6.0,
      ec: 1.4
    },
    climate: {
      tent: {
        temperatureC: 24,
        humidityPercent: 58,
        vpdKpa: 1.1,
        airflowScore: 58,
        instabilityScore: 12
      },
      runtime: {
        eventTelemetry: {
          instabilityScore: 12
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
        categoryCooldowns: {}
      },
      catalog: []
    }
  };

  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick() { return 'legacy-choice'; }
  });

  const before = JSON.stringify(state.status);
  const routed = engine.routeTick(state.simulation.simTimeMs, state);
  const after = JSON.stringify(state.status);

  assert.strictEqual(routed.result, 'legacy-tick');
  assert.strictEqual(before, after);
  assert.ok(routed.diagnostics);
  assert.ok(routed.diagnostics.reward);
  assert.ok(routed.diagnostics.analysis.reward);

  featureFlag.resetModeForTesting();
})();
