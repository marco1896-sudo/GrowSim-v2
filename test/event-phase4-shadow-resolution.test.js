#!/usr/bin/env node
'use strict';

const assert = require('assert');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const eligibility = require('../src/events/eventEligibility.js');
const pressure = require('../src/events/eventPressure.js');
const activation = require('../src/events/eventActivation.js');
const escalation = require('../src/events/eventEscalation.js');
const resolution = require('../src/events/eventResolution.js');
const analysisRuntime = require('../src/events/eventAnalysisRuntime.js');
const engine = require('../src/events/eventEngine.js');

function createBaseState(overrides = {}) {
  const base = {
    seed: 'phase4-seed',
    status: {
      water: 60,
      nutrition: 58,
      health: 82,
      stress: 18,
      risk: 16,
      growth: 35
    },
    plant: {
      phase: 'vegetative',
      stageIndex: 2,
      stageProgress: 0.45
    },
    simulation: {
      simDay: 18,
      simTimeMs: 18 * 24 * 60 * 60 * 1000,
      tickCount: 120
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

  return {
    ...base,
    ...overrides,
    status: { ...base.status, ...(overrides.status || {}) },
    plant: { ...base.plant, ...(overrides.plant || {}) },
    simulation: { ...base.simulation, ...(overrides.simulation || {}) },
    setup: { ...base.setup, ...(overrides.setup || {}) },
    environmentControls: { ...base.environmentControls, ...(overrides.environmentControls || {}) },
    climate: {
      ...base.climate,
      ...(overrides.climate || {}),
      tent: { ...base.climate.tent, ...((overrides.climate && overrides.climate.tent) || {}) },
      runtime: {
        ...base.climate.runtime,
        ...((overrides.climate && overrides.climate.runtime) || {}),
        eventTelemetry: {
          ...base.climate.runtime.eventTelemetry,
          ...(((overrides.climate && overrides.climate.runtime) || {}).eventTelemetry || {})
        }
      }
    },
    events: {
      ...base.events,
      ...(overrides.events || {}),
      scheduler: { ...base.events.scheduler, ...((overrides.events && overrides.events.scheduler) || {}) },
      history: Array.isArray(overrides.events && overrides.events.history) ? overrides.events.history.slice() : base.events.history.slice(),
      catalog: Array.isArray(overrides.events && overrides.events.catalog) ? overrides.events.catalog.slice() : base.events.catalog.slice()
    }
  };
}

function buildPrimaryShadowEvent(state, catalog, previousState) {
  const eligibilityResult = eligibility.evaluateCatalog(catalog, state);
  const pressureResult = pressure.evaluateLatentPressures(state, {
    snapshot: eligibilityResult.snapshot
  });
  const activationResult = activation.activateCandidate({
    state,
    snapshot: eligibilityResult.snapshot,
    eligibleEntries: eligibilityResult.eligible,
    pressureState: pressureResult
  });
  const escalationResult = escalation.evaluateEscalation({
    snapshot: eligibilityResult.snapshot,
    activationResult,
    previousState: previousState || { trackedEvents: {} }
  });
  const primaryCandidate = activationResult.topCandidate;
  return {
    eligibilityResult,
    pressureResult,
    activationResult,
    escalationResult,
    shadowEvent: primaryCandidate ? {
      ...primaryCandidate,
      shadowStage: escalationResult.trackedEvents[primaryCandidate.eventId]
        ? escalationResult.trackedEvents[primaryCandidate.eventId].stage
        : primaryCandidate.activationState
    } : null
  };
}

(function testResolutionIsDeterministic() {
  const eventDef = {
    id: 'v2_water_dry_pot',
    category: 'water',
    options: [
      { id: 'water_slow', effects: { water: 14, stress: -3, risk: -1 } },
      { id: 'wait_cycle', effects: { health: -2, stress: 3, risk: 2 } }
    ],
    triggers: {
      all: [{ field: 'status.water', op: '<=', value: 30 }]
    }
  };
  const state = createBaseState({
    status: { water: 22, stress: 38, risk: 24 }
  });
  const model = buildPrimaryShadowEvent(state, [eventDef]);

  const first = resolution.resolveChoice({
    shadowEvent: model.shadowEvent,
    optionId: 'water_slow',
    pathKind: 'choice'
  });
  const second = resolution.resolveChoice({
    shadowEvent: model.shadowEvent,
    optionId: 'water_slow',
    pathKind: 'choice'
  });

  assert.deepStrictEqual(first, second);
})();

(function testOutcomeQualityClassifiesGoodVsPoor() {
  const eventDef = {
    id: 'v2_water_overwater_warning',
    category: 'water',
    options: [
      { id: 'aerate_top', effects: { water: -8, risk: -4, stress: -2 } },
      { id: 'ignore_moist', effects: { health: -3, risk: 5, stress: 2 } }
    ],
    triggers: {
      all: [{ field: 'status.water', op: '>=', value: 80 }]
    }
  };
  const state = createBaseState({
    status: { water: 86, stress: 40, risk: 42 }
  });
  const model = buildPrimaryShadowEvent(state, [eventDef]);

  const good = resolution.resolveChoice({
    shadowEvent: model.shadowEvent,
    optionId: 'aerate_top',
    pathKind: 'choice'
  });
  const poor = resolution.resolveChoice({
    shadowEvent: model.shadowEvent,
    optionId: 'ignore_moist',
    pathKind: 'choice'
  });

  assert.strictEqual(good.quality, 'good');
  assert.ok(good.outcomeStatus === 'improved' || good.outcomeStatus === 'stabilized');
  assert.strictEqual(poor.quality, 'poor');
  assert.ok(poor.outcomeStatus === 'worsened' || poor.outcomeStatus === 'escalated');
})();

(function testNoActionWorsensWhenPressurePersists() {
  const eventDef = {
    id: 'v2_climate_heat_stress',
    category: 'environment',
    options: [
      { id: 'reduce_heat_load', effects: { stress: -3, risk: -1, growth: -0.4 } }
    ],
    triggers: {
      all: [{ field: 'env.temperatureC', op: '>=', value: 29 }]
    }
  };
  const state = createBaseState({
    climate: {
      tent: {
        temperatureC: 31.5,
        humidityPercent: 36,
        vpdKpa: 1.95,
        airflowScore: 34,
        instabilityScore: 48
      }
    },
    status: { stress: 58, risk: 52 }
  });
  const model = buildPrimaryShadowEvent(state, [eventDef]);

  const noAction = resolution.resolveChoice({
    shadowEvent: model.shadowEvent,
    pathKind: 'no_action'
  });

  assert.strictEqual(noAction.quality, 'poor');
  assert.ok(noAction.outcomeStatus === 'worsened' || noAction.outcomeStatus === 'escalated');
  assert.ok(noAction.sideEffectNotes.includes('escalation_risk_increased'));
})();

(function testEscalationSensitiveOutcomesDiffer() {
  const eventDef = {
    id: 'v2_climate_heat_stress',
    category: 'environment',
    options: [
      { id: 'reduce_heat_load', effects: { stress: -3, risk: -1, growth: -0.4 } }
    ],
    triggers: {
      all: [{ field: 'env.temperatureC', op: '>=', value: 29 }]
    }
  };
  const state = createBaseState({
    climate: {
      tent: {
        temperatureC: 31.5,
        humidityPercent: 36,
        vpdKpa: 1.95,
        airflowScore: 34,
        instabilityScore: 48
      }
    },
    status: { stress: 58, risk: 52 }
  });
  const model = buildPrimaryShadowEvent(state, [eventDef]);

  const warningResolution = resolution.resolveChoice({
    shadowEvent: { ...model.shadowEvent, shadowStage: 'warning' },
    optionId: 'reduce_heat_load',
    pathKind: 'choice'
  });
  const escalatedResolution = resolution.resolveChoice({
    shadowEvent: { ...model.shadowEvent, shadowStage: 'escalated' },
    optionId: 'reduce_heat_load',
    pathKind: 'choice'
  });

  assert.ok(warningResolution.categoryPressureDelta <= escalatedResolution.categoryPressureDelta);
})();

(function testAnalysisIncludesContributingFactorsAndFollowUpHooks() {
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
  const analysis = analysisRuntime.buildShadowAnalysis({ resolutionModel: result });

  assert.ok(Array.isArray(analysis.contributingFactors));
  assert.ok(analysis.contributingFactors.length > 0);
  assert.ok(Array.isArray(analysis.followUpHooks));
  assert.ok(analysis.followUpHooks.length > 0);
})();

(function testEngineChoicePreviewIsNonInvasive() {
  featureFlag.setModeForTesting('shadow');
  const state = createBaseState({
    status: { water: 86, stress: 40, risk: 42 },
    events: {
      catalog: [
        {
          id: 'v2_water_overwater_warning',
          category: 'water',
          options: [
            { id: 'aerate_top', effects: { water: -8, risk: -4, stress: -2 } },
            { id: 'ignore_moist', effects: { health: -3, risk: 5, stress: 2 } }
          ],
          triggers: {
            all: [{ field: 'status.water', op: '>=', value: 80 }]
          }
        }
      ]
    }
  });

  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });

  const before = JSON.stringify(state.status);
  const routed = engine.routeChoice('aerate_top', state);
  const after = JSON.stringify(state.status);

  assert.strictEqual(routed.result, 'legacy-choice:aerate_top');
  assert.strictEqual(before, after, 'shadow choice modeling must not mutate live state');
  assert.ok(routed.diagnostics);
  assert.ok(routed.diagnostics.resolution.choicePreview);
  assert.ok(routed.diagnostics.analysis.choice);

  featureFlag.resetModeForTesting();
})();
