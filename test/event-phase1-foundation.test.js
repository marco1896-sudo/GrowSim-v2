#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const eventEngine = require('../src/events/eventEngine.js');
const eventAssetsModule = require('../src/events/eventAssets.js');
const persistenceAdapter = require('../src/events/eventPersistenceAdapter.js');

(function testFeatureFlagDefaultsToLegacy() {
  featureFlag.resetModeForTesting();
  assert.strictEqual(featureFlag.getMode(), 'legacy', 'Phase 1 feature flag must default to legacy runtime');
})();

(function testEngineUiModelIsPassive() {
  const uiModel = eventEngine.getUiModel({
    events: {
      machineState: 'activeEvent',
      activeEventTitle: 'Heat spike',
      activeEventText: 'The tent got hot.',
      activeCategory: 'environment',
      activeSeverity: 4,
      activeLearningNote: 'Watch heat buildup.',
      activeOptions: [{ id: 'vent', label: 'Increase airflow' }],
      activeImagePath: 'assets/events/event-heat-wave.png'
    }
  });

  assert.strictEqual(uiModel.popup.machineState, 'activeEvent');
  assert.strictEqual(uiModel.media.kind, 'image');
  assert.strictEqual(uiModel.media.src, 'assets/events/event-heat-wave.png');
})();

(function testPersistenceAdapterSnapshotIsAdditive() {
  const snapshot = persistenceAdapter.buildContractSnapshot({
    machineState: 'idle',
    scheduler: { nextEventSimTimeMs: 10 },
    activeCategory: 'generic'
  });

  assert.strictEqual(snapshot.version, 'legacy-compatible-v1');
  assert.strictEqual(snapshot.machineState, 'idle');
  assert.ok(snapshot.scheduler && typeof snapshot.scheduler === 'object');
})();

(function testRegistryDraftExistsAndIsDataOnly() {
  const registryPath = path.join(__dirname, '..', 'data', 'event-assets.registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  eventAssetsModule.setDraftRegistry(registry);

  assert.strictEqual(registry.schemaVersion, 1);
  assert.strictEqual(registry.inventorySummary.totalAssets, 66);
  assert.strictEqual(registry.placeholder.image, 'event-slow-growth-period');
})();

(function testIndexLoadsPassivePhase1ModulesBeforeLegacyRuntime() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const eventsIndex = html.indexOf("{ src: 'events.js' }");
  const engineIndex = html.indexOf("{ src: 'src/events/eventEngine.js' }");
  const featureFlagIndex = html.indexOf("{ src: 'src/events/eventFeatureFlag.js' }");

  assert.ok(featureFlagIndex >= 0, 'feature flag script must be present in the loader list');
  assert.ok(engineIndex >= 0, 'engine script must be present in the loader list');
  assert.ok(featureFlagIndex < eventsIndex, 'feature flag script must load before legacy runtime');
  assert.ok(engineIndex < eventsIndex, 'engine script must load before legacy runtime');
})();

(function testLegacyRuntimeCanRegisterWithoutActivatingNewPath() {
  const context = {
    console,
    window: {},
    globalThis: null
  };
  context.globalThis = context.window;
  vm.createContext(context);

  const featureFlagSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'events', 'eventFeatureFlag.js'), 'utf8');
  const engineSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'events', 'eventEngine.js'), 'utf8');

  vm.runInContext(featureFlagSource, context, { filename: 'eventFeatureFlag.js' });
  vm.runInContext(engineSource, context, { filename: 'eventEngine.js' });

  context.window.GrowSimEvents = Object.freeze({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick() { return 'legacy-choice'; }
  });

  context.window.GrowSimEventEngine.registerLegacyRuntime(context.window.GrowSimEvents);

  const routedTick = context.window.GrowSimEventEngine.routeTick();
  assert.strictEqual(routedTick.delegated, 'legacy');
  assert.strictEqual(routedTick.mode, 'legacy');
})();
