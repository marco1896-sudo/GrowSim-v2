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
      water: 84,
      nutrition: 54,
      health: 81,
      stress: 28,
      risk: 25,
      growth: 35,
      ...(overrides.status || {})
    },
    plant: {
      phase: 'vegetative',
      stageIndex: 3,
      stageProgress: 0.4,
      ...(overrides.plant || {})
    },
    simulation: {
      simDay: 10,
      simTimeMs: 3 * 24 * 60 * 60 * 1000,
      tickCount: 120,
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
      activeOptions: [{ id: 'drain_pot', label: 'Drain Pot' }],
      history: [{
        type: 'event',
        eventId: 'root_stress_followup',
        category: 'water',
        optionId: 'ease_off',
        optionLabel: 'Ease Off',
        learningNote: 'Roots need time and oxygen.',
        analysis: {
          tone: 'mixed',
          resultText: 'The plant stabilized but remained vulnerable.',
          guidanceText: 'Keep the root zone calmer over the next cycle.',
          causeText: 'Earlier saturation kept root oxygen under pressure.'
        },
        atSimTimeMs: 2 * 24 * 60 * 60 * 1000
      }],
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
        options: [{ id: 'drain_pot', effects: { stress: -3, risk: -5, health: 1 } }],
        triggers: {
          all: [{ field: 'status.water', op: '>=', value: 80 }]
        }
      }],
      ...(overrides.events || {})
    }
  };
}

(function testMediaBadgesSupportHistoryAndResolvedStates() {
  const historyMedia = eventAssets.buildMediaModel({
    eventId: 'root_stress_followup',
    category: 'water',
    title: 'Root Stress Followup',
    stateTone: 'history'
  });
  const resolvedMedia = eventAssets.buildMediaModel({
    eventId: 'root_stress_followup',
    category: 'water',
    title: 'Root Stress Followup',
    stateTone: 'resolved'
  });

  assert.strictEqual(historyMedia.badge, 'Analyse');
  assert.strictEqual(resolvedMedia.badge, 'Verlauf');
})();

(function testEngineUiModelStillPackagesSharedMediaSafely() {
  featureFlag.setModeForTesting('shadow');
  const state = createStateLike();
  const uiModel = engine.getUiModel(state);

  assert.ok(uiModel.media);
  assert.ok(uiModel.popup);
  assert.ok(uiModel.detail);
  assert.strictEqual(uiModel.media.fallbackOrigin, 'explicit_event_mapping');

  featureFlag.resetModeForTesting();
})();

(function testAppUsesSharedPresentationHelpersAcrossViews() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.ok(appJs.includes('function resolveSharedEventMediaModel('));
  assert.ok(appJs.includes('function buildEventPresentationSections('));
  assert.ok(appJs.includes('function buildEventHistorySnapshotMarkup('));
  assert.ok(appJs.includes('gs_event_asset_inspect'));
})();

(function testIndexContainsHistoryPresentationHook() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('id="eventHistorySnapshotBlock"'));
})();

(function testStylesContainDistinctStatePresentationHooks() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

  assert.ok(css.includes('.event-detail-section'));
  assert.ok(css.includes('.event-history-card'));
  assert.ok(css.includes('[data-tone="warning"]'));
  assert.ok(css.includes('[data-tone="reward"]'));
  assert.ok(css.includes('.event-center-card__markers'));
  assert.ok(css.includes('.event-center-card__origin'));
})();

(function testLegacyRuntimeRemainsAuthoritative() {
  featureFlag.setModeForTesting('shadow');
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });

  const state = createStateLike();
  const result = engine.routeChoice('drain_pot', state);

  assert.strictEqual(result.result, 'legacy-choice:drain_pot');
  assert.strictEqual(result.delegated, 'legacy');

  featureFlag.resetModeForTesting();
})();

console.log('event-phase9b-event-presentation tests passed');
