#!/usr/bin/env node
'use strict';

const assert = require('assert');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const eligibility = require('../src/events/eventEligibility.js');
const pressure = require('../src/events/eventPressure.js');
const activation = require('../src/events/eventActivation.js');
const engine = require('../src/events/eventEngine.js');

function createBaseState(overrides = {}) {
  const base = {
    seed: 'phase2-seed',
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

(function testEligibilityGatesByPhaseAndSetup() {
  const state = createBaseState();
  const result = eligibility.evaluateEvent({
    id: 'flower_only_event',
    category: 'environment',
    allowedPhases: ['flowering'],
    triggers: {
      setup: {
        growModeIn: ['outdoor']
      }
    }
  }, state);

  assert.strictEqual(result.eligible, false);
  assert.ok(result.reasons.includes('phase_blocked'));
  assert.ok(result.reasons.includes('setup_blocked'));
})();

(function testCooldownBlockingPreventsEligibility() {
  const simTimeMs = 20 * 24 * 60 * 60 * 1000;
  const state = createBaseState({
    simulation: { simDay: 20, simTimeMs },
    events: {
      scheduler: {
        eventCooldownsSim: {
          dryback_warning: simTimeMs + 10_000
        }
      }
    }
  });

  const result = eligibility.evaluateEvent({
    id: 'dryback_warning',
    category: 'water'
  }, state);

  assert.strictEqual(result.eligible, false);
  assert.ok(result.reasons.includes('event_cooldown'));
})();

(function testPressureAccumulatesAndThenDecaysUnderRecovery() {
  const stressedState = createBaseState({
    status: {
      water: 18,
      stress: 62,
      risk: 54
    },
    climate: {
      tent: {
        temperatureC: 31,
        humidityPercent: 34,
        vpdKpa: 1.95,
        airflowScore: 34,
        instabilityScore: 48
      }
    },
    simulation: {
      simTimeMs: 24 * 60 * 60 * 1000
    }
  });

  const first = pressure.evaluateLatentPressures(stressedState);
  assert.ok(first.latentPressures.water > 0);
  assert.ok(first.latentPressures.environment > 0);

  const recoveredState = createBaseState({
    simulation: {
      simTimeMs: (24 + 6) * 60 * 60 * 1000
    }
  });

  const second = pressure.evaluateLatentPressures(recoveredState, {
    previousPressures: first.latentPressures,
    previousSimTimeMs: stressedState.simulation.simTimeMs
  });

  assert.ok(second.pressureSummary.recoveryState, 'expected recovery state to be detected');
  assert.ok(second.latentPressures.water < first.latentPressures.water);
  assert.ok(second.latentPressures.environment < first.latentPressures.environment);
})();

(function testContradictionBlockingPreventsParallelActiveCandidate() {
  const state = createBaseState({
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_heat_spike'
    }
  });
  const result = eligibility.evaluateEvent({
    id: 'new_conflicting_event',
    category: 'environment'
  }, state);

  assert.strictEqual(result.eligible, false);
  assert.ok(result.reasons.includes('runtime_busy'));
})();

(function testActivationIsDeterministicForSameInput() {
  const state = createBaseState({
    status: {
      water: 15,
      stress: 58,
      risk: 52
    },
    climate: {
      tent: {
        temperatureC: 30,
        humidityPercent: 36,
        vpdKpa: 1.88,
        airflowScore: 36,
        instabilityScore: 42
      }
    }
  });

  const dryEvent = {
    id: 'water_dryback_warning',
    category: 'water',
    weight: 1.2,
    triggers: {
      all: [{ field: 'status.water', op: '<=', value: 25 }]
    }
  };
  const heatEvent = {
    id: 'environment_heat_spike',
    category: 'environment',
    weight: 1.1,
    triggers: {
      all: [{ field: 'env.temperatureC', op: '>=', value: 29 }]
    }
  };

  const evalResult = eligibility.evaluateCatalog([dryEvent, heatEvent], state);
  const pressureResult = pressure.evaluateLatentPressures(state, {
    snapshot: evalResult.snapshot
  });

  const first = activation.activateCandidate({
    state,
    snapshot: evalResult.snapshot,
    eligibleEntries: evalResult.eligible,
    pressureState: pressureResult
  });
  const second = activation.activateCandidate({
    state,
    snapshot: evalResult.snapshot,
    eligibleEntries: evalResult.eligible,
    pressureState: pressureResult
  });

  assert.strictEqual(first.topCandidate.eventId, second.topCandidate.eventId);
  assert.strictEqual(first.topCandidate.activationScore, second.topCandidate.activationScore);
})();

(function testShadowRouteIsNonInvasiveAndDelegatesLegacy() {
  featureFlag.setModeForTesting('shadow');
  const state = createBaseState({
    events: {
      catalog: [
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

  const legacyCalls = [];
  engine.registerLegacyRuntime({
    runEventStateMachine(nowMs) {
      legacyCalls.push(nowMs);
      return 'legacy-ok';
    },
    onEventOptionClick(optionId) {
      legacyCalls.push(`choice:${optionId}`);
      return 'legacy-choice';
    }
  });

  const tick = engine.routeTick(state.simulation.simTimeMs, state);
  assert.strictEqual(tick.result, 'legacy-ok');
  assert.strictEqual(tick.delegated, 'legacy');
  assert.ok(tick.diagnostics, 'shadow diagnostics should be present in shadow mode');
  assert.strictEqual(state.events.activeEventId, null, 'shadow mode must not mutate live active event');

  const diagnostics = engine.getShadowDiagnostics(state);
  assert.ok(diagnostics);
  assert.strictEqual(diagnostics.comparison.kind, 'partial');

  const choice = engine.routeChoice('inspect', state);
  assert.strictEqual(choice.result, 'legacy-choice');
  assert.deepStrictEqual(legacyCalls, [state.simulation.simTimeMs, 'choice:inspect']);

  featureFlag.resetModeForTesting();
})();
