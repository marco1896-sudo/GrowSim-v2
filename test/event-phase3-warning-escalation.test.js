#!/usr/bin/env node
'use strict';

const assert = require('assert');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const eligibility = require('../src/events/eventEligibility.js');
const pressure = require('../src/events/eventPressure.js');
const activation = require('../src/events/eventActivation.js');
const escalation = require('../src/events/eventEscalation.js');
const engine = require('../src/events/eventEngine.js');

function createBaseState(overrides = {}) {
  const base = {
    seed: 'phase3-seed',
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

function buildShadowInputs(state, catalog, previousPressures, previousSimTimeMs) {
  const eligibilityResult = eligibility.evaluateCatalog(catalog, state);
  const pressureResult = pressure.evaluateLatentPressures(state, {
    snapshot: eligibilityResult.snapshot,
    previousPressures,
    previousSimTimeMs
  });
  const activationResult = activation.activateCandidate({
    state,
    snapshot: eligibilityResult.snapshot,
    eligibleEntries: eligibilityResult.eligible,
    pressureState: pressureResult
  });
  return {
    eligibilityResult,
    pressureResult,
    activationResult
  };
}

(function testWarningStateCanExistWithoutActiveState() {
  const state = createBaseState({
    status: {
      water: 40,
      stress: 26,
      risk: 22
    },
    climate: {
      tent: {
        temperatureC: 26,
        humidityPercent: 54,
        vpdKpa: 1.28,
        airflowScore: 52,
        instabilityScore: 18
      }
    }
  });
  const catalog = [{
    id: 'water_dryback_warning',
    category: 'water',
    triggers: {
      all: [{ field: 'status.water', op: '<=', value: 45 }]
    }
  }];

  const { activationResult } = buildShadowInputs(state, catalog);
  assert.strictEqual(activationResult.activeCandidates.length, 0);
  assert.strictEqual(activationResult.warnings.length, 1);
  assert.strictEqual(activationResult.warnings[0].eventId, 'water_dryback_warning');
})();

(function testWarningAndActiveThresholdsStaySeparated() {
  const eventDef = {
    id: 'environment_heat_spike',
    category: 'environment',
    weight: 1,
    triggers: {
      all: [{ field: 'env.temperatureC', op: '>=', value: 28 }]
    }
  };

  const warningState = createBaseState({
    climate: {
      tent: {
        temperatureC: 28.2,
        humidityPercent: 48,
        vpdKpa: 1.45,
        airflowScore: 48,
        instabilityScore: 20
      }
    },
    status: {
      stress: 28,
      risk: 24
    }
  });
  const activeState = createBaseState({
    climate: {
      tent: {
        temperatureC: 31.5,
        humidityPercent: 34,
        vpdKpa: 1.95,
        airflowScore: 32,
        instabilityScore: 52
      }
    },
    status: {
      stress: 60,
      risk: 56
    }
  });

  const warningResult = buildShadowInputs(warningState, [eventDef]).activationResult;
  const activeResult = buildShadowInputs(activeState, [eventDef]).activationResult;

  assert.strictEqual(warningResult.warnings.length, 1);
  assert.strictEqual(warningResult.activeCandidates.length, 0);
  assert.strictEqual(activeResult.activeCandidates.length, 1);
  assert.strictEqual(activeResult.activeCandidates[0].eventId, eventDef.id);
})();

(function testEscalationRequiresSustainedPressure() {
  const eventDef = {
    id: 'environment_heat_spike',
    category: 'environment',
    triggers: {
      all: [{ field: 'env.temperatureC', op: '>=', value: 29 }]
    }
  };

  const firstState = createBaseState({
    simulation: {
      simTimeMs: 20 * 24 * 60 * 60 * 1000
    },
    climate: {
      tent: {
        temperatureC: 30.2,
        humidityPercent: 36,
        vpdKpa: 1.82,
        airflowScore: 36,
        instabilityScore: 44
      }
    },
    status: {
      stress: 56,
      risk: 48
    }
  });

  const first = buildShadowInputs(firstState, [eventDef]);
  const firstEscalation = escalation.evaluateEscalation({
    snapshot: first.eligibilityResult.snapshot,
    activationResult: first.activationResult,
    previousState: { trackedEvents: {} }
  });

  assert.strictEqual(firstEscalation.escalating, false);
  assert.strictEqual(firstEscalation.escalated, false);

  const secondState = createBaseState({
    simulation: {
      simTimeMs: (20 * 24 + 8) * 60 * 60 * 1000
    },
    climate: {
      tent: {
        temperatureC: 32.2,
        humidityPercent: 33,
        vpdKpa: 2.0,
        airflowScore: 30,
        instabilityScore: 56
      }
    },
    status: {
      stress: 64,
      risk: 58
    }
  });

  const second = buildShadowInputs(
    secondState,
    [eventDef],
    first.pressureResult.latentPressures,
    firstState.simulation.simTimeMs
  );
  const secondEscalation = escalation.evaluateEscalation({
    snapshot: second.eligibilityResult.snapshot,
    activationResult: second.activationResult,
    previousState: { trackedEvents: firstEscalation.trackedEvents }
  });

  assert.ok(secondEscalation.escalating || secondEscalation.escalated);
})();

(function testCooldownAndBusyRuntimeSuppressWarnings() {
  const simTimeMs = 22 * 24 * 60 * 60 * 1000;
  const state = createBaseState({
    simulation: {
      simTimeMs
    },
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_mold_alert',
      scheduler: {
        eventCooldownsSim: {
          water_dryback_warning: simTimeMs + 5_000
        }
      }
    }
  });
  const result = eligibility.evaluateEvent({
    id: 'water_dryback_warning',
    category: 'water',
    triggers: {
      all: [{ field: 'status.water', op: '<=', value: 65 }]
    }
  }, state);

  assert.strictEqual(result.eligible, false);
  assert.ok(result.reasons.includes('event_cooldown'));
  assert.ok(result.reasons.includes('runtime_busy'));
})();

(function testEscalationClassificationIsDeterministic() {
  const candidate = {
    eventId: 'environment_heat_spike',
    category: 'environment',
    activationState: 'active',
    activationScore: 83
  };
  const previous = {
    activationScore: 72,
    warningSinceSimTimeMs: 0
  };

  const first = escalation.classifyEscalationStage(candidate, previous, 8 * 60 * 60 * 1000);
  const second = escalation.classifyEscalationStage(candidate, previous, 8 * 60 * 60 * 1000);
  assert.deepStrictEqual(first, second);
})();

(function testShadowDiagnosticsExplainDivergence() {
  featureFlag.setModeForTesting('shadow');
  const state = createBaseState({
    status: {
      water: 40,
      stress: 26,
      risk: 22
    },
    events: {
      activeEventId: 'legacy_heat_spike',
      catalog: [
        {
          id: 'legacy_heat_spike',
          category: 'environment',
          triggers: {
            all: [{ field: 'env.temperatureC', op: '>=', value: 40 }]
          }
        },
        {
          id: 'water_dryback_warning',
          category: 'water',
          triggers: {
            all: [{ field: 'status.water', op: '<=', value: 65 }]
          }
        }
      ]
    }
  });

  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy'; },
    onEventOptionClick() { return 'legacy-choice'; }
  });

  const routed = engine.routeTick(state.simulation.simTimeMs, state);
  const diagnostics = routed.diagnostics;

  assert.ok(diagnostics.activation.warningIds.includes('water_dryback_warning'));
  assert.strictEqual(diagnostics.comparison.kind, 'partial');
  assert.ok(diagnostics.comparison.legacyDivergence);
  assert.strictEqual(diagnostics.comparison.legacyDivergence.reason, 'eligibility_mismatch');

  featureFlag.resetModeForTesting();
})();
