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

function createHistoryMedia(stateTone, eventId = 'root_stress_followup', category = 'water') {
  return eventAssets.buildMediaModel({
    eventId,
    category,
    title: 'History Item',
    stateTone
  });
}

(function testSharedMediaModelSupportsHistoryTones() {
  assert.strictEqual(createHistoryMedia('warning').badge, 'Warnung');
  assert.strictEqual(createHistoryMedia('active').badge, 'Aktiv');
  assert.strictEqual(createHistoryMedia('escalating').badge, 'Eskalation');
  assert.strictEqual(createHistoryMedia('reward', 'stable_growth_reward', 'positive').badge, 'Belohnung');
  assert.strictEqual(createHistoryMedia('followup').badge, 'Folgepfad');
  assert.strictEqual(createHistoryMedia('resolved').badge, 'Verlauf');
})();

(function testAppContainsRecentHistoryHelpers() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.ok(appJs.includes('function deriveHistoryEntryTone('));
  assert.ok(appJs.includes('function buildRecentEventHistoryItems('));
  assert.ok(appJs.includes('function buildRecentEventHistoryMarkup('));
  assert.ok(appJs.includes('${buildRecentEventHistoryMarkup()}'));
})();

(function testStylesContainHistoryListHooks() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

  assert.ok(css.includes('.event-history-list'));
  assert.ok(css.includes('.event-history-item'));
  assert.ok(css.includes('.event-history-item__media'));
  assert.ok(css.includes('.event-history-item__marker'));
  assert.ok(css.includes('.event-history-item__origin'));
})();

(function testHistoryMediaUsesRegistryBackedResolution() {
  const rewardMedia = createHistoryMedia('reward', 'stable_growth_reward', 'positive');
  const followupMedia = createHistoryMedia('followup', 'root_stress_followup', 'water');

  assert.ok(['explicit_event_mapping', 'category_fallback', 'generic_placeholder'].includes(rewardMedia.fallbackOrigin));
  assert.ok(['explicit_event_mapping', 'category_fallback', 'generic_placeholder'].includes(followupMedia.fallbackOrigin));
})();

(function testLegacyRuntimeRemainsAuthoritative() {
  featureFlag.setModeForTesting('shadow');
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });

  const result = engine.routeChoice('drain_pot', {
    events: {
      machineState: 'idle',
      history: [],
      foundation: { flags: {}, memory: { events: [], decisions: [], pendingChains: {} }, analysis: [] },
      scheduler: { eventCooldownsSim: {}, categoryCooldownsSim: {}, eventCooldowns: {}, categoryCooldowns: {} },
      catalog: []
    },
    status: { stress: 20, risk: 20, water: 60, nutrition: 60, health: 80, growth: 30 },
    plant: { phase: 'vegetative', stageIndex: 2, stageProgress: 0.2 },
    simulation: { simDay: 3, simTimeMs: 1000, tickCount: 1, isDaytime: true },
    setup: { growMode: 'indoor' },
    environmentControls: { temperatureC: 24, humidityPercent: 55, airflowPercent: 55, ph: 6.0, ec: 1.4 },
    climate: { tent: { temperatureC: 24, humidityPercent: 55, vpdKpa: 1.1, airflowScore: 55, instabilityScore: 8 }, runtime: { eventTelemetry: { instabilityScore: 8 } } }
  });

  assert.strictEqual(result.result, 'legacy-choice:drain_pot');
  assert.strictEqual(result.delegated, 'legacy');

  featureFlag.resetModeForTesting();
})();

console.log('event-phase9c-history-list tests passed');
