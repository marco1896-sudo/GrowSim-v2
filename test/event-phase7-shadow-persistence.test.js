#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const engine = require('../src/events/eventEngine.js');
const persistence = require('../src/events/eventPersistenceAdapter.js');

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

function buildStorageContext(savedSnapshot = null) {
  const storageSource = fs.readFileSync(path.join(__dirname, '..', 'storage.js'), 'utf8');
  const persisted = { value: null };
  const restored = { payload: null };

  const context = {
    console,
    Date,
    Math,
    JSON,
    Promise,
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    storageAdapter: {
      async get() {
        return savedSnapshot;
      },
      async set(value) {
        persisted.value = JSON.parse(JSON.stringify(value));
      }
    },
    window: {
      GrowSimEventEngine: {
        exportShadowRuntimeState(currentState) {
          return {
            version: 1,
            kind: 'grow-simulator-shadow-runtime',
            savedAtSimTimeMs: Number(currentState && currentState.simulation && currentState.simulation.simTimeMs || 0),
            previousPressures: { water: 22 },
            previousSimTimeMs: Number(currentState && currentState.simulation && currentState.simulation.simTimeMs || 0),
            trackedEvents: {},
            reward: {
              cooldownUntilSimTimeMs: 0,
              lastRewardClass: null,
              stableWindow: { startSimTimeMs: null, stableHours: 0, lastStableSimTimeMs: null }
            },
            recentResolutions: [],
            chains: { recentContexts: [] }
          };
        },
        restoreShadowRuntimeState(currentState, payload) {
          restored.payload = payload;
          return {
            restored: Boolean(payload),
            versionLoaded: payload && payload.version || null,
            defaultsApplied: payload ? [] : ['missing_shadow_payload'],
            migrationsApplied: [],
            prunedFragments: [],
            resetReason: payload ? null : 'missing_shadow_payload'
          };
        }
      }
    },
    LS_STATE_KEY: 'grow-sim-state-v2',
    MODE: 'prod',
    UI_TICK_INTERVAL_MS: 1000,
    SIM_TIME_COMPRESSION: 12,
    SIM_START_HOUR: 8,
    SIM_DAY_START_HOUR: 6,
    SIM_NIGHT_START_HOUR: 22,
    SIM_GLOBAL_SEED: 'grow-sim-v1-seed',
    SIM_PLANT_ID: 'plant-001',
    TOTAL_LIFECYCLE_SIM_DAYS: 88,
    EVENT_ROLL_MIN_REAL_MS: 30 * 60 * 1000,
    PERSIST_THROTTLE_MS: 100,
    MAX_HISTORY_LOG: 50,
    MAX_EVENT_HISTORY: 20,
    MAX_SYSTEM_HISTORY: 20,
    MAX_ACTION_HISTORY: 20,
    dayStamp: () => '2026-04-08',
    alignToSimStartHour: () => 1_000,
    isDaytimeAtSimTime: () => true,
    normalizeAction: (action) => action,
    simDayFloat: () => 0,
    simHour: () => 8,
    round2: (value) => Math.round((Number(value) || 0) * 100) / 100,
    clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
    clampInt: (value, min, max) => Math.min(max, Math.max(min, Math.trunc(Number(value) || 0))),
    plantAssetPath: (stageKey) => `assets/${stageKey || 'stage_01'}.png`,
    stageAssetKeyForIndex: (stageIndex) => `stage_${String(Number(stageIndex || 0) + 1).padStart(2, '0')}`,
    normalizeStageKey: (stageKey) => String(stageKey || 'stage_01'),
    getStageTimeline: () => [{ simDayStart: 0 }],
    clampStatus: () => {},
    computeGrowthPercent: () => 0,
    state: {
      schemaVersion: '1.0.0',
      simulation: {},
      plant: {},
      events: {},
      history: {},
      meta: {},
      settings: {},
      status: {},
      boost: {},
      actions: {},
      ui: {},
      climate: {},
      environmentControls: {}
    }
  };

  vm.createContext(context);
  vm.runInContext(storageSource, context, { filename: 'storage.js' });

  return { context, persisted, restored };
}

(function testMissingShadowPayloadDefaultsSafely() {
  const restored = persistence.deserializeShadowRuntimeState(null, {
    simulation: { simTimeMs: 10_000 }
  });

  assert.strictEqual(restored.runtimeState.rewardCooldownUntilSimTimeMs, 0);
  assert.deepStrictEqual(restored.runtimeState.recentChainContexts, []);
  assert.ok(restored.diagnostics.defaultsApplied.includes('missing_shadow_payload'));
})();

(function testPrunesStaleFragmentsDuringDeserialize() {
  const payload = {
    version: 1,
    previousPressures: { water: 24.4 },
    previousSimTimeMs: 10 * 60 * 60 * 1000,
    trackedEvents: {
      stale_warning: {
        eventId: 'stale_warning',
        category: 'water',
        warningSinceSimTimeMs: 4 * 60 * 60 * 1000,
        unresolvedSinceSimTimeMs: 4 * 60 * 60 * 1000,
        firstObservedSimTimeMs: 4 * 60 * 60 * 1000,
        activationScore: 68,
        stage: 'warning'
      }
    },
    reward: {
      cooldownUntilSimTimeMs: 5 * 60 * 60 * 1000,
      lastRewardClass: 'stability_reward',
      stableWindow: {
        startSimTimeMs: 3 * 60 * 60 * 1000,
        stableHours: 4,
        lastStableSimTimeMs: 3 * 60 * 60 * 1000
      }
    },
    recentResolutions: [{
      eventId: 'old_resolution',
      category: 'water',
      quality: 'good',
      outcomeStatus: 'improved',
      atSimTimeMs: 2 * 60 * 60 * 1000
    }],
    chains: {
      recentContexts: [{
        sourceEventId: 'old_chain',
        causeCategory: 'water',
        createdAtSimTimeMs: 2 * 60 * 60 * 1000,
        candidates: [{ followUpId: 'root_stress_followup', followUpCategory: 'water' }]
      }]
    }
  };

  const restored = persistence.deserializeShadowRuntimeState(payload, {
    simulation: { simTimeMs: 30 * 60 * 60 * 1000 }
  });

  assert.deepStrictEqual(restored.runtimeState.trackedEvents, {});
  assert.deepStrictEqual(restored.runtimeState.recentResolutions, []);
  assert.deepStrictEqual(restored.runtimeState.recentChainContexts, []);
  assert.strictEqual(restored.runtimeState.rewardCooldownUntilSimTimeMs, 0);
  assert.ok(restored.diagnostics.prunedFragments.includes('tracked_event:stale_warning'));
  assert.ok(restored.diagnostics.prunedFragments.includes('chain_context:old_chain'));
})();

(function testPartialOlderPayloadDefaultsSafely() {
  const restored = persistence.deserializeShadowRuntimeState({
    previousPressures: { environment: 18 }
  }, {
    simulation: { simTimeMs: 12_000 }
  });

  assert.strictEqual(restored.runtimeState.previousPressures.environment, 18);
  assert.strictEqual(restored.runtimeState.rewardCooldownUntilSimTimeMs, 0);
  assert.ok(restored.diagnostics.defaultsApplied.includes('missing_shadow_version'));
})();

(function testEngineRoundTripRestoreIsDeterministicEnoughForResume() {
  featureFlag.setModeForTesting('shadow');
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });

  const baseCatalog = [{
    id: 'v2_water_overwater_warning',
    category: 'water',
    options: [
      { id: 'drain_pot', effects: { stress: -3, risk: -5, health: 1 } },
      { id: 'ignore_moist', effects: { stress: 3, risk: 5, health: -2 } }
    ],
    triggers: {
      all: [{ field: 'status.water', op: '>=', value: 80 }]
    }
  }];

  const originalState = createStateLike({
    status: { water: 90, stress: 30, risk: 26 },
    events: { catalog: baseCatalog }
  });

  const firstDiagnostics = engine.computeShadowState(originalState);
  assert.ok(firstDiagnostics.enabled);

  const choicePreview = engine.routeChoice('ignore_moist', originalState);
  assert.strictEqual(choicePreview.result, 'legacy-choice:ignore_moist');

  const payload = engine.exportShadowRuntimeState(originalState);
  assert.strictEqual(payload.version, 1);
  assert.ok(Array.isArray(payload.recentResolutions));

  const restoredState = createStateLike({
    status: { water: 90, stress: 30, risk: 26 },
    events: { catalog: baseCatalog }
  });

  const restoreDiagnostics = engine.restoreShadowRuntimeState(restoredState, payload);
  assert.strictEqual(restoreDiagnostics.restored, true);
  assert.strictEqual(restoreDiagnostics.versionLoaded, 1);

  const resumedDiagnostics = engine.computeShadowState(restoredState);
  assert.strictEqual(resumedDiagnostics.activation.topCandidate.eventId, firstDiagnostics.activation.topCandidate.eventId);
  assert.ok(resumedDiagnostics.persistence);

  featureFlag.resetModeForTesting();
})();

(async function testStoragePersistsAndRestoresSeparatedShadowPayload() {
  const savedSnapshot = {
    simulation: { simTimeMs: 25_000 },
    plant: { phase: 'vegetative', stageIndex: 3, stageKey: 'stage_04', averageHealth: 80, averageStress: 18, lifecycle: { qualityTier: 'normal' } },
    status: { health: 84, stress: 12, water: 78, nutrition: 64, risk: 8 },
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_water_event',
      activeCategory: 'water',
      scheduler: { nextEventRealTimeMs: 0, eventCooldowns: {}, categoryCooldowns: {}, eventCooldownsSim: {}, categoryCooldownsSim: {} },
      history: [],
      foundation: { flags: {}, memory: { events: [], decisions: [], pendingChains: {} }, analysis: [] },
      shadowRuntime: {
        version: 1,
        previousPressures: { water: 22 },
        previousSimTimeMs: 25_000,
        trackedEvents: {},
        reward: {
          cooldownUntilSimTimeMs: 0,
          lastRewardClass: null,
          stableWindow: { startSimTimeMs: null, stableHours: 0, lastStableSimTimeMs: null }
        },
        recentResolutions: [],
        chains: { recentContexts: [] }
      }
    }
  };

  const { context, persisted, restored } = buildStorageContext(savedSnapshot);
  context.resetStateToDefaults();
  context.state.events.activeEventId = 'legacy_water_event';

  await context.persistState();
  assert.ok(persisted.value);
  assert.ok(persisted.value.events.shadowRuntime);
  assert.strictEqual(persisted.value.events.activeEventId, 'legacy_water_event');

  await context.restoreState();
  assert.ok(restored.payload);
  assert.strictEqual(restored.payload.version, 1);
  assert.strictEqual(context.state.events.activeEventId, 'legacy_water_event');
})();

(async function testStorageRestoreToleratesMissingShadowPayload() {
  const savedSnapshot = {
    simulation: { simTimeMs: 25_000 },
    plant: { phase: 'vegetative', stageIndex: 3, stageKey: 'stage_04', averageHealth: 80, averageStress: 18, lifecycle: { qualityTier: 'normal' } },
    status: { health: 84, stress: 12, water: 78, nutrition: 64, risk: 8 },
    events: {
      machineState: 'idle',
      activeEventId: null,
      activeCategory: 'generic',
      scheduler: { nextEventRealTimeMs: 0, eventCooldowns: {}, categoryCooldowns: {}, eventCooldownsSim: {}, categoryCooldownsSim: {} },
      history: [],
      foundation: { flags: {}, memory: { events: [], decisions: [], pendingChains: {} }, analysis: [] }
    }
  };
  const { context, restored } = buildStorageContext(savedSnapshot);

  context.resetStateToDefaults();
  await context.restoreState();

  assert.strictEqual(restored.payload, null);
  assert.strictEqual(context.state.events.activeEventId, null);
})();

console.log('event-phase7-shadow-persistence tests passed');
