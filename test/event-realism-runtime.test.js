#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const plantStateApi = require('../src/simulation/plantState.js');
const flagsApi = require('../src/events/eventFlags.js');
const memoryApi = require('../src/events/eventMemory.js');
const analysisApi = require('../src/events/eventAnalysis.js');
const resolverApi = require('../src/events/eventResolver.js');

const ROOT = path.join(__dirname, '..');
const NEW_EVENT_IDS = [
  'v2_water_late_watering_pattern',
  'v2_water_poor_dryback',
  'v2_water_root_oxygen_debt',
  'v2_root_zone_cold_warning',
  'v2_nutrition_ph_drift_slow',
  'v2_nutrition_salt_buildup',
  'v2_nutrition_n_excess_transition',
  'v2_nutrition_k_demand_early_flower',
  'v2_climate_rh_night_high',
  'v2_climate_weak_air_movement',
  'v2_light_lamp_too_close',
  'v2_structure_stretch_surge',
  'v2_structure_canopy_density_warning',
  'v2_structure_support_needed'
];

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function createContext(overrides = {}) {
  const source = fs.readFileSync(path.join(ROOT, 'events.js'), 'utf8');
  const state = {
    status: { water: 52, nutrition: 58, health: 82, stress: 18, risk: 18, growth: 22, ...(overrides.status || {}) },
    plant: { phase: 'vegetative', stageIndex: 4, stageKey: 'veg', stageProgress: 0.4, lifecycle: { qualityScore: 60 }, ...(overrides.plant || {}) },
    simulation: { isDaytime: true, nowMs: 10_000, simTimeMs: 5_000, tickCount: 42, simDay: 18, ...(overrides.simulation || {}) },
    setup: { mode: 'indoor', light: 'high', medium: 'soil', ...(overrides.setup || {}) },
    climate: {
      tent: {
        temperatureC: 26,
        humidityPercent: 58,
        vpdKpa: 1.1,
        airflowScore: 62,
        instabilityScore: 10,
        ...(((overrides.climate || {}).tent) || {})
      },
      runtime: { eventTelemetry: { instabilityScore: 10 } }
    },
    environmentControls: { temperatureC: 26, humidityPercent: 58, airflowPercent: 62, ph: 6.0, ec: 1.4, ...(overrides.environmentControls || {}) },
    history: { events: [] },
    ui: { openSheet: null },
    events: {
      machineState: 'idle',
      scheduler: {
        nextEventRealTimeMs: 0,
        nextEventSimTimeMs: 0,
        eventCooldowns: {},
        categoryCooldowns: {},
        eventCooldownsSim: {},
        categoryCooldownsSim: {}
      },
      foundation: { flags: {}, memory: { events: [], decisions: [], pendingChains: {} }, analysis: [] },
      catalog: []
    }
  };

  const context = {
    console,
    Date,
    Math,
    JSON,
    Number,
    Object,
    Array,
    String,
    Boolean,
    setTimeout,
    clearTimeout,
    STAGE_DEFS: new Array(12).fill(null),
    clamp: (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0)),
    clampInt: (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0)),
    round2: (v) => Math.round(Number(v || 0) * 100) / 100,
    deterministicUnitFloat: () => 0,
    deterministicRoll: () => 0,
    deterministicEventDelayMs: () => 60 * 1000,
    simDayFloat: () => 18,
    simHour: () => (state.simulation.isDaytime ? 12 : 2),
    deriveEnvironmentReadout: () => ({
      temperatureC: Number((state.climate && state.climate.tent && state.climate.tent.temperatureC) || state.environmentControls.temperatureC || 26),
      humidityPercent: Number((state.climate && state.climate.tent && state.climate.tent.humidityPercent) || state.environmentControls.humidityPercent || 58),
      vpdKpa: Number((state.climate && state.climate.tent && state.climate.tent.vpdKpa) || 1.1),
      airflowScore: Number((state.climate && state.climate.tent && state.climate.tent.airflowScore) || state.environmentControls.airflowPercent || 60),
      instabilityScore: Number((state.climate && state.climate.tent && state.climate.tent.instabilityScore) || 10)
    }),
    deriveRootZoneReadout: () => ({
      ph: Number(state.environmentControls.ph || 6),
      ec: Number(state.environmentControls.ec || 1.4),
      oxygen: '68%',
      rootHealth: '82%'
    }),
    eventThreshold: () => 1,
    EVENT_COOLDOWN_MS: 30 * 60 * 1000,
    EVENT_ROLL_MIN_REAL_MS: 1 * 60 * 1000,
    EVENT_ROLL_MAX_REAL_MS: 2 * 60 * 1000,
    nextDaytimeRealMs: (nowMs) => nowMs,
    schedulePushIfAllowed: () => {},
    schedulePersistState: () => {},
    renderAll: () => {},
    notifyPlantNeedsCare: () => {},
    addLog: () => {},
    isPlantDead: () => false,
    clampStatus: () => {},
    syncCanonicalStateShape: () => {},
    state,
    window: {
      GrowSimPlantState: plantStateApi,
      GrowSimEventFlags: flagsApi,
      GrowSimEventMemory: memoryApi,
      GrowSimEventAnalysis: analysisApi,
      GrowSimEventResolver: resolverApi
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'events.js' });
  return context;
}

(function testNewCoreEventCatalogCoverage() {
  const v2 = loadJson('data/events.v2.json');
  const foundation = loadJson('data/events.foundation.json');
  const legacy = loadJson('data/events.json');
  const allEvents = [
    ...v2.events,
    ...foundation.events,
    ...legacy.events
  ];

  const presentIds = v2.events.filter((event) => NEW_EVENT_IDS.includes(event.id)).map((event) => event.id);
  assert.deepStrictEqual(presentIds.sort(), NEW_EVENT_IDS.slice().sort(), 'all planned realistic core events should exist in v2 catalog');

  for (const eventId of NEW_EVENT_IDS) {
    const event = v2.events.find((entry) => entry.id === eventId);
    assert(event, `missing event: ${eventId}`);
    assert.strictEqual(typeof event.warningText, 'string', `${eventId} should include warning text`);
    assert(event.warningText.length > 10, `${eventId} warning text should be descriptive`);
    assert(Number(event.resolveTimeMinutes) >= 30 && Number(event.resolveTimeMinutes) <= 120, `${eventId} should define a short resolve timer`);
    assert(Array.isArray(event.allowedPhases) && event.allowedPhases.length > 0, `${eventId} should define allowed phases`);
    assert(event.outcomeTexts && typeof event.outcomeTexts === 'object', `${eventId} should define explained outcome texts`);
    assert(event.shadowModel && typeof event.shadowModel === 'object', `${eventId} should define shadow metadata`);
    assert(Array.isArray(event.options) && event.options.length >= 2, `${eventId} should define gameplay choices`);
    for (const option of event.options) {
      assert.strictEqual(typeof option.intent, 'string', `${eventId}/${option.id} should define an intent`);
      assert(Array.isArray(option.contextFit), `${eventId}/${option.id} should define context fit metadata`);
    }

    const followUpRules = event.followUpRules && typeof event.followUpRules === 'object'
      ? event.followUpRules
      : {};
    for (const ids of Object.values(followUpRules)) {
      for (const followUpId of Array.isArray(ids) ? ids : []) {
        assert(
          allEvents.some((candidate) => candidate.id === followUpId),
          `${eventId} references unknown follow-up event ${followUpId}`
        );
      }
    }
  }
})();

(function testPhaseBoundEligibilityUsesStateConditions() {
  const v2 = loadJson('data/events.v2.json');
  const waterEvent = v2.events.find((event) => event.id === 'v2_water_late_watering_pattern');
  const humidityEvent = v2.events.find((event) => event.id === 'v2_climate_rh_night_high');
  const supportEvent = v2.events.find((event) => event.id === 'v2_structure_support_needed');

  const vegetativeCtx = createContext({
    status: { water: 34, stress: 28, risk: 26 },
    plant: { phase: 'vegetative', stageIndex: 4 },
    simulation: { isDaytime: true },
    climate: { tent: { temperatureC: 27, humidityPercent: 56, vpdKpa: 1.15, airflowScore: 60 } }
  });
  assert.strictEqual(
    vegetativeCtx.window.GrowSimEvents.isEventEligible(waterEvent, {}, vegetativeCtx.state.simulation.simTimeMs),
    true,
    'vegetative dryback event should be eligible in matching veg state'
  );

  const wrongPhaseCtx = createContext({
    plant: { phase: 'vegetative', stageIndex: 8 },
    simulation: { isDaytime: false },
    climate: { tent: { humidityPercent: 70, vpdKpa: 0.85, airflowScore: 52 } }
  });
  assert.strictEqual(
    wrongPhaseCtx.window.GrowSimEvents.isEventEligible(humidityEvent, {}, wrongPhaseCtx.state.simulation.simTimeMs),
    false,
    'flower-only night humidity event should not trigger in vegetative phase'
  );
  assert.strictEqual(
    wrongPhaseCtx.window.GrowSimEvents.isEventEligible(supportEvent, {}, wrongPhaseCtx.state.simulation.simTimeMs),
    false,
    'support event should not trigger outside flowering phase'
  );

  const floweringCtx = createContext({
    status: { health: 78, risk: 30 },
    plant: { phase: 'flowering', stageIndex: 8 },
    simulation: { isDaytime: false },
    climate: { tent: { humidityPercent: 70, vpdKpa: 0.85, airflowScore: 52 } }
  });
  assert.strictEqual(
    floweringCtx.window.GrowSimEvents.isEventEligible(humidityEvent, {}, floweringCtx.state.simulation.simTimeMs),
    true,
    'night humidity event should trigger in matching flowering state'
  );

  const supportCtx = createContext({
    status: { health: 80 },
    plant: { phase: 'flowering', stageIndex: 9 },
    simulation: { isDaytime: true },
    climate: { tent: { humidityPercent: 58, vpdKpa: 1.15, airflowScore: 60 } }
  });
  assert.strictEqual(
    supportCtx.window.GrowSimEvents.isEventEligible(supportEvent, {}, supportCtx.state.simulation.simTimeMs),
    true,
    'support event should trigger when late flower structure load matches'
  );
})();

console.log('event-realism runtime tests passed');
