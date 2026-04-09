#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const activation = require('../src/events/eventActivation.js');
const contradictions = require('../src/events/eventContradictions.js');
const resolution = require('../src/events/eventResolution.js');
const rewards = require('../src/events/eventRewards.js');
const featureFlag = require('../src/events/eventFeatureFlag.js');
const engine = require('../src/events/eventEngine.js');

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'));
}

function createSnapshot(overrides = {}) {
  return {
    status: {
      stress: 16,
      risk: 14,
      health: 84,
      ...(overrides.status || {})
    },
    simulation: {
      simTimeMs: 12 * 60 * 60 * 1000,
      ...(overrides.simulation || {})
    },
    environment: {
      instabilityScore: 10,
      ...(overrides.environment || {})
    }
  };
}

function createStateLike(overrides = {}) {
  return {
    status: {
      water: 58,
      nutrition: 60,
      health: 84,
      stress: 16,
      risk: 14,
      growth: 30,
      ...(overrides.status || {})
    },
    plant: {
      phase: 'vegetative',
      stageIndex: 3,
      stageProgress: 0.4,
      ...(overrides.plant || {})
    },
    simulation: {
      simDay: 12,
      simTimeMs: 12 * 24 * 60 * 60 * 1000,
      tickCount: 72,
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
        instabilityScore: 10,
        ...((overrides.climate && overrides.climate.tent) || {})
      },
      runtime: {
        eventTelemetry: {
          instabilityScore: 10,
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
      catalog: [],
      ...(overrides.events || {})
    }
  };
}

(function testNormalizedSubsetExistsInDataFiles() {
  const v2 = loadJson('data/events.v2.json');
  const foundation = loadJson('data/events.foundation.json');
  const legacy = loadJson('data/events.json');

  const v2Water = v2.events.find((event) => event.id === 'v2_water_overwater_warning');
  const foundationFollowup = foundation.events.find((event) => event.id === 'root_stress_followup');
  const legacyWet = legacy.events.find((event) => event.id === 'soil_too_wet');

  assert.ok(v2Water.shadowModel);
  assert.strictEqual(v2Water.shadowModel.problemPolarity, 'wet');
  assert.strictEqual(v2Water.options[0].intent, 'oxygen_relief');
  assert.ok(Array.isArray(v2Water.shadowModel.escalationProfile.poorOutcomeHooks));

  assert.ok(foundationFollowup.shadowModel);
  assert.strictEqual(foundationFollowup.shadowModel.conflictGroup, 'disease_root');

  assert.ok(legacyWet.shadowModel);
  assert.strictEqual(legacyWet.shadowModel.problemPolarity, 'wet');
  assert.strictEqual(legacyWet.choices[0].intent, 'oxygen_relief');
})();

(function testExpandedPestDiseaseRootMetadataExists() {
  const v2 = loadJson('data/events.v2.json');
  const legacy = loadJson('data/events.json');

  const mites = v2.events.find((event) => event.id === 'v2_pest_mites_spotted');
  const rootWarning = v2.events.find((event) => event.id === 'v2_disease_root_warning');
  const humidityRisk = v2.events.find((event) => event.id === 'v2_climate_flower_humidity_risk');
  const rootBound = legacy.events.find((event) => event.id === 'root_bound_warning');
  const thripsEarly = legacy.events.find((event) => event.id === 'thrips_early');
  const miteHotspot = legacy.events.find((event) => event.id === 'mite_hotspot');

  assert.strictEqual(mites.shadowModel.problemPolarity, 'population_pressure');
  assert.strictEqual(mites.shadowModel.conflictGroup, 'pest_pressure');
  assert.strictEqual(mites.options[0].intent, 'integrated_control');

  assert.strictEqual(rootWarning.shadowModel.problemPolarity, 'wet');
  assert.ok(rootWarning.shadowModel.escalationProfile.poorOutcomeHooks.includes('root_zone_followup_possible'));
  assert.strictEqual(rootWarning.options[0].intent, 'root_recovery');

  assert.strictEqual(humidityRisk.shadowModel.problemPolarity, 'mold_surface');
  assert.strictEqual(humidityRisk.shadowModel.conflictGroup, 'disease_mold');

  assert.strictEqual(rootBound.shadowModel.problemPolarity, 'root_pressure');
  assert.strictEqual(rootBound.shadowModel.conflictGroup, 'root_pressure');
  assert.strictEqual(rootBound.choices[0].intent, 'root_recovery');

  assert.strictEqual(thripsEarly.shadowModel.problemPolarity, 'population_pressure');
  assert.strictEqual(miteHotspot.shadowModel.conflictGroup, 'pest_pressure');
})();

(function testActivationPrefersExplicitProblemPolarity() {
  const pressureSummary = {
    componentScores: {
      waterDry: 64,
      waterWet: 4,
      vpdMismatch: 18,
      oxygenMismatch: 2
    }
  };
  const eventDef = {
    id: 'custom_water_signal',
    category: 'water',
    shadowModel: {
      problemPolarity: 'dry'
    }
  };

  const specificPressure = activation.deriveEventSpecificPressure(eventDef, pressureSummary);
  assert.strictEqual(specificPressure, 64);
})();

(function testContradictionsPreferExplicitConflictGroup() {
  const eventDef = {
    id: 'custom_alert',
    category: 'environment',
    shadowModel: {
      conflictGroup: 'climate_heat_dry'
    }
  };

  assert.strictEqual(contradictions.deriveConflictGroup(eventDef), 'climate_heat_dry');
})();

(function testResolutionUsesExplicitOptionIntentAndFollowUpMetadata() {
  const shadowEvent = {
    eventDef: {
      id: 'custom_water_issue',
      category: 'water',
      shadowModel: {
        problemPolarity: 'wet',
        escalationProfile: {
          poorOutcomeHooks: ['root_zone_followup_possible'],
          unresolvedHooks: ['pressure_retention_possible']
        },
        rewardProfile: {
          recoverySignificance: 'high',
          executionRelevant: true
        }
      },
      options: [
        {
          id: 'option_relief',
          intent: 'oxygen_relief',
          contextFit: ['wet'],
          effects: { water: -8, risk: -4, stress: -2 }
        },
        {
          id: 'option_bad',
          intent: 'heavy_water_push',
          contextFit: ['dry'],
          effects: { water: 6, risk: 5, stress: 2 }
        }
      ]
    },
    eventId: 'custom_water_issue',
    activationState: 'active',
    shadowStage: 'active',
    specificPressure: 40
  };

  const good = resolution.resolveChoice({
    shadowEvent,
    optionId: 'option_relief',
    pathKind: 'choice'
  });
  const poor = resolution.resolveChoice({
    shadowEvent,
    optionId: 'option_bad',
    pathKind: 'choice'
  });

  assert.strictEqual(good.quality, 'good');
  assert.strictEqual(good.rewardMetadata.recoverySignificance, 'high');
  assert.strictEqual(poor.quality, 'poor');
  assert.ok(poor.followUpHooks.includes('root_zone_followup_possible'));
})();

(function testResolutionUsesExpandedFollowUpMetadataForDiseasePressure() {
  const shadowEvent = {
    eventDef: {
      id: 'custom_mold_pressure',
      category: 'disease',
      shadowModel: {
        problemPolarity: 'mold_surface',
        conflictGroup: 'disease_mold',
        escalationProfile: {
          poorOutcomeHooks: ['disease_spread_followup_possible'],
          unresolvedHooks: ['pressure_retention_possible']
        },
        rewardProfile: {
          recoverySignificance: 'high',
          executionRelevant: true
        }
      },
      options: [
        {
          id: 'dry_the_canopy',
          intent: 'climate_stabilize',
          contextFit: ['mold_surface'],
          effects: { risk: -7, stress: -1, health: 1 }
        },
        {
          id: 'wait_with_humidity',
          intent: 'ignore',
          contextFit: ['mold_surface'],
          effects: { risk: 6, health: -3, stress: 2 }
        }
      ]
    },
    eventId: 'custom_mold_pressure',
    activationState: 'warning',
    shadowStage: 'warning',
    specificPressure: 30
  };

  const result = resolution.resolveChoice({
    shadowEvent,
    optionId: 'wait_with_humidity',
    pathKind: 'choice'
  });

  assert.strictEqual(result.quality, 'poor');
  assert.ok(result.followUpHooks.includes('disease_spread_followup_possible'));
})();

(function testResolutionSupportsRootPressureIntentMatching() {
  const shadowEvent = {
    eventDef: {
      id: 'root_bound_warning',
      category: 'environment',
      shadowModel: {
        problemPolarity: 'root_pressure',
        conflictGroup: 'root_pressure',
        escalationProfile: {
          poorOutcomeHooks: ['pressure_retention_possible'],
          unresolvedHooks: ['pressure_retention_possible']
        },
        rewardProfile: {
          recoverySignificance: 'high',
          executionRelevant: true
        }
      },
      choices: [
        {
          id: 'up_pot_now',
          intent: 'root_recovery',
          contextFit: ['root_pressure'],
          effects: { stress: 5, health: 6, growth: 5, risk: -4 }
        },
        {
          id: 'delay_transplant',
          intent: 'delay_action',
          contextFit: ['root_pressure'],
          effects: { stress: 6, growth: -3, health: -4, risk: 4 }
        }
      ]
    },
    eventId: 'root_bound_warning',
    activationState: 'warning',
    shadowStage: 'active',
    specificPressure: 24
  };

  const good = resolution.resolveChoice({
    shadowEvent,
    optionId: 'up_pot_now',
    pathKind: 'choice'
  });
  const poor = resolution.resolveChoice({
    shadowEvent,
    optionId: 'delay_transplant',
    pathKind: 'choice'
  });

  assert.ok(good.fitScore > poor.fitScore);
})();

(function testResolutionFallsBackWhenMetadataIsAbsent() {
  const shadowEvent = {
    eventDef: {
      id: 'v2_water_overwater_warning',
      category: 'water',
      options: [
        { id: 'ignore_moist', effects: { health: -3, risk: 5, stress: 2 } }
      ]
    },
    eventId: 'v2_water_overwater_warning',
    activationState: 'active',
    shadowStage: 'escalating',
    specificPressure: 42
  };

  const result = resolution.resolveChoice({
    shadowEvent,
    optionId: 'ignore_moist',
    pathKind: 'choice'
  });

  assert.ok(result.followUpHooks.length > 0);
  assert.ok(result.followUpHooks.includes('root_zone_followup_possible') || result.followUpHooks.includes('pressure_retention_possible'));
})();

(function testRewardConsumerPrefersExplicitRewardMetadata() {
  const snapshot = createSnapshot({
    simulation: { simTimeMs: 18 * 60 * 60 * 1000 }
  });
  const rewardState = rewards.appendResolutionRecord({}, {
    eventId: 'custom_minor_issue',
    category: 'water',
    shadowStage: 'warning',
    outcomeStatus: 'improved',
    quality: 'good',
    fitScore: 22,
    escalationRiskShift: -10,
    plausibleFollowUp: false,
    rewardMetadata: {
      recoverySignificance: 'low',
      executionRelevant: false
    }
  }, snapshot);

  const result = rewards.evaluateRewardWindow({
    snapshot: {
      ...snapshot,
      status: { stress: 12, risk: 10 }
    },
    pressureState: {
      latentPressures: {
        water: 6,
        nutrition: 4,
        environment: 4,
        disease: 2,
        pest: 2
      }
    },
    escalationResult: {
      escalatingCandidates: [],
      escalatedCandidates: []
    },
    previousState: {
      ...rewardState,
      stableWindow: {
        startSimTimeMs: 8 * 60 * 60 * 1000,
        lastStableSimTimeMs: 18 * 60 * 60 * 1000,
        stableHours: 10
      }
    }
  });

  const execution = result.candidates.find((entry) => entry.rewardClass === 'execution_reward');
  const recovery = result.candidates.find((entry) => entry.rewardClass === 'recovery_reward');
  assert.ok(execution.blockers.includes('recent_resolution_not_marked_execution_relevant'));
  assert.ok(recovery.blockers.includes('recent_issue_not_severe_enough_for_recovery_reward'));
})();

(function testLegacyRuntimeAuthorityRemainsUnchanged() {
  featureFlag.setModeForTesting('shadow');
  const state = createStateLike({
    events: {
      catalog: [{
        id: 'v2_water_overwater_warning',
        category: 'water',
        shadowModel: {
          problemPolarity: 'wet',
          conflictGroup: 'water_wet_root',
          escalationProfile: {
            poorOutcomeHooks: ['root_zone_followup_possible']
          },
          rewardProfile: {
            recoverySignificance: 'high',
            executionRelevant: true
          }
        },
        options: [
          {
            id: 'aerate_top',
            intent: 'oxygen_relief',
            contextFit: ['wet'],
            effects: { water: -8, risk: -4, stress: -2 }
          }
        ],
        triggers: {
          all: [{ field: 'status.water', op: '>=', value: 80 }]
        }
      }]
    },
    status: {
      water: 86,
      stress: 40,
      risk: 42
    }
  });

  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });

  const before = JSON.stringify(state.events);
  const routed = engine.routeTick(Date.now(), state);
  const after = JSON.stringify(state.events);

  assert.strictEqual(routed.result, 'legacy-tick');
  assert.strictEqual(routed.delegated, 'legacy');
  assert.strictEqual(before, after);

  featureFlag.resetModeForTesting();
})();

console.log('event-phase12-metadata-normalization tests passed');
