#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const eventAssets = require('../src/events/eventAssets.js');
const engine = require('../src/events/eventEngine.js');

const registry = require('../data/event-assets.registry.json');
const gapList = require('../data/event-assets.gaps.json');

eventAssets.setDraftRegistry(registry);
eventAssets.setGapListDraft(gapList);

function createStateLike(overrides = {}) {
  return {
    status: {
      water: 85,
      nutrition: 52,
      health: 80,
      stress: 30,
      risk: 26,
      growth: 34,
      ...(overrides.status || {})
    },
    plant: {
      phase: 'vegetative',
      stageIndex: 3,
      stageProgress: 0.4,
      ...(overrides.plant || {})
    },
    simulation: {
      simDay: 8,
      simTimeMs: 2 * 24 * 60 * 60 * 1000,
      tickCount: 90,
      isDaytime: true,
      ...(overrides.simulation || {})
    },
    setup: {
      growMode: 'indoor',
      ...(overrides.setup || {})
    },
    environmentControls: {
      temperatureC: 24,
      humidityPercent: 57,
      airflowPercent: 58,
      ph: 6.0,
      ec: 1.4,
      ...(overrides.environmentControls || {})
    },
    climate: {
      tent: {
        temperatureC: 24,
        humidityPercent: 57,
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
      machineState: 'activeEvent',
      activeEventId: 'v2_water_overwater_warning',
      activeEventTitle: 'Too Much Water',
      activeEventText: 'The medium is staying saturated for too long.',
      activeLearningNote: 'Watch moisture and root oxygen together.',
      activeSeverity: 2,
      activeCategory: 'water',
      activeImagePath: '',
      activeOptions: [
        { id: 'drain_pot', label: 'Drain Pot' }
      ],
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
        categoryCooldowns: {}
      },
      catalog: [{
        id: 'v2_water_overwater_warning',
        category: 'water',
        options: [
          { id: 'drain_pot', effects: { stress: -3, risk: -5, health: 1 } }
        ],
        triggers: {
          all: [{ field: 'status.water', op: '>=', value: 80 }]
        }
      }],
      ...(overrides.events || {})
    }
  };
}

(function testExplicitAssetMappingHit() {
  const media = eventAssets.buildMediaModel({
    eventId: 'v2_water_overwater_warning',
    category: 'water',
    title: 'Too Much Water',
    stateTone: 'warning'
  });

  assert.strictEqual(media.kind, 'image');
  assert.strictEqual(media.assetId, 'event-overwatering');
  assert.strictEqual(media.fallbackOrigin, 'explicit_event_mapping');
  assert.ok(String(media.src || '').includes('assets/events/event-overwatering'));
})();

(function testCategoryFallbackHit() {
  const media = eventAssets.buildMediaModel({
    eventId: 'unknown_water_issue',
    category: 'water',
    title: 'Water Stress',
    stateTone: 'active'
  });

  assert.strictEqual(media.assetId, 'event-overwatering');
  assert.strictEqual(media.fallbackOrigin, 'category_fallback');
})();

(function testGenericPlaceholderFallback() {
  const localRegistry = {
    schemaVersion: 1,
    assets: {},
    eventMappings: {},
    categoryFallbacks: {},
    placeholder: {}
  };
  eventAssets.setDraftRegistry(localRegistry);

  const media = eventAssets.buildMediaModel({
    eventId: 'missing_event',
    category: 'rare',
    title: 'Missing Visual Event',
    stateTone: 'active'
  });

  assert.strictEqual(media.kind, 'placeholder');
  assert.strictEqual(media.fallbackOrigin, 'generic_placeholder');
  assert.strictEqual(media.title, 'Missing Visual Event');

  eventAssets.setDraftRegistry(registry);
})();

(function testGapListAddsDevNotes() {
  const media = eventAssets.buildMediaModel({
    eventId: 'v2_outdoor_storm_front',
    category: 'environment',
    title: 'Storm Front',
    stateTone: 'warning'
  });

  assert.ok(Array.isArray(media.devNotes));
  assert.ok(media.devNotes.length >= 1);
})();

(function testPhase2CoreEventMappingsPreferExplicitVisuals() {
  const explicitCases = [
    ['v2_water_late_watering_pattern', 'event-drought-stress'],
    ['v2_nutrition_ph_drift_slow', 'event-nutrient-lockout'],
    ['v2_climate_rh_night_high', 'event-fungus-infection'],
    ['v2_light_lamp_too_close', 'event-light-burn']
  ];

  explicitCases.forEach(([eventId, expectedAssetId]) => {
    const media = eventAssets.buildMediaModel({
      eventId,
      category: 'generic',
      title: eventId,
      stateTone: 'resolved'
    });

    assert.strictEqual(media.fallbackOrigin, 'explicit_event_mapping', `${eventId} should use explicit mapping`);
    assert.strictEqual(media.assetId, expectedAssetId, `${eventId} should resolve to ${expectedAssetId}`);
  });
})();

(function testEngineUiModelPackagesMediaAndShadowSummary() {
  featureFlag.setModeForTesting('shadow');
  const state = createStateLike();
  const uiModel = engine.getUiModel(state);

  assert.ok(uiModel);
  assert.ok(uiModel.popup);
  assert.ok(uiModel.detail);
  assert.ok(uiModel.media);
  assert.strictEqual(uiModel.media.assetId, 'event-overwatering');
  assert.ok(Object.prototype.hasOwnProperty.call(uiModel.popup, 'shadowSummary'));

  featureFlag.resetModeForTesting();
})();

(function testIndexHtmlContainsMediaAndInsightHooks() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('id="eventVisualPlaceholder"'));
  assert.ok(html.includes('id="eventVisualStateBadge"'));
  assert.ok(html.includes('id="eventVisualOriginBadge"'));
  assert.ok(html.includes('id="eventInsightBlock"'));
})();

(function testStylesSupportSquareMediaAndFallbackStates() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

  assert.ok(css.includes('aspect-ratio: 1 / 1;'));
  assert.ok(css.includes('.event-visual-image--icon'));
  assert.ok(css.includes('.event-visual-placeholder'));
  assert.ok(css.includes('.event-center-card'));
})();

(function testLegacyRuntimeStaysAuthoritative() {
  featureFlag.setModeForTesting('shadow');
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });

  const state = createStateLike();
  const result = engine.routeChoice('drain_pot', state);

  assert.strictEqual(result.result, 'legacy-choice:drain_pot');
  assert.strictEqual(result.delegated, 'legacy');
  assert.ok(result.diagnostics);

  featureFlag.resetModeForTesting();
})();

console.log('event-phase9a-ui-media tests passed');
