#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const engine = require('../src/events/eventEngine.js');

function createStateLike(overrides = {}) {
  return {
    status: {
      water: 82,
      nutrition: 52,
      health: 80,
      stress: 26,
      risk: 24,
      growth: 38,
      ...(overrides.status || {})
    },
    plant: {
      phase: 'vegetative',
      stageIndex: 3,
      ...(overrides.plant || {})
    },
    simulation: {
      simDay: 9,
      simTimeMs: 2 * 24 * 60 * 60 * 1000,
      tickCount: 96,
      isDaytime: true,
      ...(overrides.simulation || {})
    },
    setup: {
      growMode: 'indoor',
      ...(overrides.setup || {})
    },
    climate: {
      tent: {
        temperatureC: 24,
        humidityPercent: 58,
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
    environmentControls: {
      temperatureC: 24,
      humidityPercent: 58,
      airflowPercent: 58,
      ph: 6.1,
      ec: 1.4,
      ...(overrides.environmentControls || {})
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
      scheduler: {
        eventCooldownsSim: {},
        categoryCooldownsSim: {},
        eventCooldowns: {},
        categoryCooldowns: {}
      },
      foundation: {
        flags: {},
        memory: { events: [], decisions: [], pendingChains: {} },
        analysis: []
      },
      history: [],
      catalog: [{
        id: 'v2_water_overwater_warning',
        category: 'water',
        options: [{ id: 'drain_pot', effects: { stress: -3, risk: -4 } }],
        triggers: {
          all: [{ field: 'status.water', op: '>=', value: 80 }]
        }
      }],
      ...(overrides.events || {})
    },
    ui: {
      openSheet: 'event',
      ...(overrides.ui || {})
    }
  };
}

(function testAppPublishesExclusiveModernEventUiState() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.ok(appJs.includes('function setEventPresentationExclusiveState('));
  assert.ok(appJs.includes('eventSheet.dataset.eventUiMode = enabled ? \'modern-exclusive\' : \'legacy\''));
  assert.ok(appJs.includes('window.__GS_EVENT_UI_EXCLUSIVE_ACTIVE = enabled;'));
  assert.ok(appJs.includes('modernRoot.classList.toggle(\'hidden\', !enabled);'));
  assert.ok(appJs.includes('legacyRoot.classList.toggle(\'hidden\', enabled);'));
})();

(function testLegacyUiRendererHonorsExclusiveModernGate() {
  const uiJs = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');

  assert.ok(uiJs.includes('function isModernEventPresentationExclusiveActive('));
  assert.ok(uiJs.includes('if (isModernEventPresentationExclusiveActive()) {'));
  assert.ok(uiJs.includes('event-sheet--legacy-suppressed'));
})();

(function testIndexDefinesSeparateModernAndLegacyEventRoots() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('id="eventSheetModernRoot"'));
  assert.ok(html.includes('id="eventSheetLegacyRoot"'));
})();

(function testModernRendererOwnsItsSubtreeWithReplacement() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.ok(appJs.includes('function renderModernEventSheetContent('));
  assert.ok(appJs.includes('modernRoot.replaceChildren(template.content.cloneNode(true));'));
  assert.ok(appJs.includes('modernRoot.replaceChildren();'));
})();

(function testStylesContainExclusiveContainmentHooks() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

  assert.ok(css.includes('.event-ui-modern-active #eventSheet.event-sheet--modern-exclusive'));
  assert.ok(css.includes('isolation: isolate;'));
  assert.ok(css.includes('.event-sheet-legacy-root'));
  assert.ok(css.includes('.event-sheet-modern-root'));
  assert.ok(css.includes('display: none !important;'));
})();

(function testLegacyBehaviorCanStillExistWhenModernUiIsInactive() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.ok(appJs.includes('eventSheet.dataset.eventUiMode = enabled ? \'modern-exclusive\' : \'legacy\''));
  assert.ok(appJs.includes('legacyRoot.classList.toggle(\'hidden\', enabled);'));
})();

(function testLegacyRuntimeAuthorityRemainsUnchanged() {
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

console.log('event-ui-exclusive-rendering tests passed');
