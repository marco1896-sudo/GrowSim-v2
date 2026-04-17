#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const memoryApi = require('../src/events/eventMemory.js');
const resolverApi = require('../src/events/eventResolver.js');
const activationApi = require('../src/events/eventActivation.js');

const ROOT = path.join(__dirname, '..');
const SECOND_WAVE_IDS = [
  'v2_water_borderline_irrigation',
  'v2_water_uneven_dryback',
  'v2_water_rootzone_recovery_check',
  'v2_nutrition_post_correction_instability',
  'v2_nutrition_uptake_stabilizing',
  'v2_climate_bud_microclimate_pocket',
  'v2_climate_microclimate_relief',
  'v2_structure_defoliation_window',
  'v2_structure_top_load_shift',
  'v2_structure_support_settled'
];

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function createResolverMemory(eventsState) {
  return {
    getPendingChains: () => memoryApi.getPendingChains(eventsState),
    getLastEvents: () => [],
    getLastDecision: () => null
  };
}

(function testSecondWaveCatalogAndMappingCoverage() {
  const v2 = loadJson('data/events.v2.json');
  const registry = loadJson('data/event-assets.registry.json');
  const ids = new Set(v2.events.map((event) => event.id));
  const mapped = registry.eventMappings || {};

  for (const eventId of SECOND_WAVE_IDS) {
    assert(ids.has(eventId), `missing second-wave event ${eventId}`);
    assert(mapped[eventId], `missing asset mapping for ${eventId}`);
  }
})();

(function testCoreEventsNowExposePositiveFollowUpPaths() {
  const v2 = loadJson('data/events.v2.json');
  const lateWatering = v2.events.find((event) => event.id === 'v2_water_late_watering_pattern');
  const phDrift = v2.events.find((event) => event.id === 'v2_nutrition_ph_drift_slow');
  const canopy = v2.events.find((event) => event.id === 'v2_structure_canopy_density_warning');

  assert.deepStrictEqual(
    lateWatering.followUpRules.improved,
    ['v2_water_rootzone_recovery_check'],
    'late watering pattern should reward a clean recovery path'
  );
  assert.deepStrictEqual(
    phDrift.followUpRules.stabilized,
    ['v2_nutrition_post_correction_instability'],
    'pH drift should preserve a believable post-correction risk path'
  );
  assert.deepStrictEqual(
    canopy.followUpRules.improved,
    ['v2_climate_microclimate_relief'],
    'dense canopy should unlock a visible relief follow-up after a good correction'
  );
})();

(function testFuturePendingChainsDoNotOverrideImmediately() {
  const catalog = [
    {
      id: 'v2_climate_microclimate_relief',
      category: 'positive',
      tone: 'positive',
      isFollowUp: true,
      allowedPhases: ['flowering']
    }
  ];
  const eventsState = {
    foundation: {
      memory: {
        events: [],
        decisions: [],
        pendingChains: {}
      }
    }
  };
  const now = Date.now();
  memoryApi.setPendingChain(eventsState, 'v2_climate_microclimate_relief', {
    targetEventId: 'v2_climate_microclimate_relief',
    createdAtRealTimeMs: now,
    activatesAtRealTimeMs: now + (60 * 60 * 1000),
    expiresAtRealTimeMs: now + (3 * 60 * 60 * 1000)
  });

  const result = resolverApi.resolveNextEventWithTrace({
    state: { phase: 'flowering', water: 60, nutrients: 60, vitality: 80, stress: 18, pestPressure: 0 },
    flags: [],
    memory: createResolverMemory(eventsState),
    catalog,
    random: () => 0.5
  });

  assert.strictEqual(result.trace.pendingChainOverride, false, 'future-dated chain should not preempt activation');
  assert.strictEqual(result.decision.eventId, null, 'future-dated chain should wait until it becomes active');
})();

(function testPendingChainNormalizationKeepsActivationWindowAndDropsExpiredEntries() {
  const now = Date.now();
  const normalized = memoryApi.normalizePendingChainsStore({
    keep_me: {
      targetEventId: 'v2_structure_support_settled',
      createdAtRealTimeMs: now - 1000,
      activatesAtRealTimeMs: now + 5000,
      expiresAtRealTimeMs: now + 10000
    },
    drop_me: {
      targetEventId: 'v2_climate_microclimate_relief',
      createdAtRealTimeMs: now - 1000,
      activatesAtRealTimeMs: now - 5000,
      expiresAtRealTimeMs: now - 1000
    }
  });

  assert(normalized.keep_me, 'non-expired chain should survive normalization');
  assert.strictEqual(typeof normalized.keep_me.activatesAtRealTimeMs, 'number');
  assert.strictEqual(normalized.drop_me, undefined, 'expired chain should be removed during normalization');
})();

(function testReadyPendingChainsStillOverrideDeterministically() {
  const catalog = [
    {
      id: 'v2_climate_microclimate_relief',
      category: 'positive',
      tone: 'positive',
      isFollowUp: true,
      allowedPhases: ['flowering']
    }
  ];
  const eventsState = {
    foundation: {
      memory: {
        events: [],
        decisions: [],
        pendingChains: {}
      }
    }
  };
  const now = Date.now();
  memoryApi.setPendingChain(eventsState, 'v2_climate_microclimate_relief', {
    targetEventId: 'v2_climate_microclimate_relief',
    createdAtRealTimeMs: now - (30 * 60 * 1000),
    activatesAtRealTimeMs: now - (5 * 60 * 1000),
    expiresAtRealTimeMs: now + (2 * 60 * 60 * 1000)
  });

  const result = resolverApi.resolveNextEventWithTrace({
    state: { phase: 'flowering', water: 60, nutrients: 60, vitality: 80, stress: 18, pestPressure: 0 },
    flags: [],
    memory: createResolverMemory(eventsState),
    catalog,
    random: () => 0.5
  });

  assert.strictEqual(result.trace.pendingChainOverride, true, 'ready pending chain should still take priority');
  assert.strictEqual(result.decision.eventId, 'v2_climate_microclimate_relief');
})();

(function testStructureSpecificPressureNoLongerUsesHeatAsPrimaryDriver() {
  const v2 = loadJson('data/events.v2.json');
  const stretch = v2.events.find((event) => event.id === 'v2_structure_stretch_surge');
  const lamp = v2.events.find((event) => event.id === 'v2_light_lamp_too_close');
  const pressureSummary = {
    componentScores: {
      tempMismatch: 82,
      vpdMismatch: 78,
      diseaseHumidity: 57,
      instability: 24
    }
  };

  assert.strictEqual(
    activationApi.deriveEventSpecificPressure(stretch, pressureSummary),
    57,
    'structure events should now follow canopy/microclimate pressure before generic heat pressure'
  );
  assert.strictEqual(
    activationApi.deriveEventSpecificPressure(lamp, pressureSummary),
    82,
    'light-distance events should still respond to the high-heat branch'
  );
})();

console.log('event phase13 balance/chain tests passed');
