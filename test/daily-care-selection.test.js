#!/usr/bin/env node
'use strict';

const assert = require('assert');
const de = require('../src/i18n/locales/de.json');
const en = require('../src/i18n/locales/en.json');
const es = require('../src/i18n/locales/es.json');
const selectionApi = require('../src/gameplay/dailyCareSelection.js');

function buildSnapshot(overrides = {}) {
  const base = {
    simulation: {
      simDay: 12
    },
    plant: {
      phase: 'vegetative'
    },
    status: {
      water: 52,
      nutrition: 64,
      stress: 18,
      risk: 14,
      health: 82
    },
    events: {
      machineState: 'idle'
    }
  };
  return {
    ...base,
    ...overrides,
    simulation: { ...base.simulation, ...(overrides.simulation || {}) },
    plant: { ...base.plant, ...(overrides.plant || {}) },
    status: { ...base.status, ...(overrides.status || {}) },
    events: { ...base.events, ...(overrides.events || {}) }
  };
}

(function testCatalogHasHealthyVariantRange() {
  const catalog = selectionApi.createCatalog();
  assert.strictEqual(catalog.length, 18, `expected 18 daily templates, got ${catalog.length}`);
})();

(function testAllTemplatesHavePlayerFacingI18nCopy() {
  const catalog = selectionApi.createCatalog();
  for (const template of catalog) {
    const taskId = String(template.id || '').trim();
    assert(taskId, 'template id missing');
    assert.ok(de.daily && de.daily.task && de.daily.task[taskId], `missing de daily task copy for ${taskId}`);
    assert.ok(en.daily && en.daily.task && en.daily.task[taskId], `missing en daily task copy for ${taskId}`);
    assert.ok(es.daily && es.daily.task && es.daily.task[taskId], `missing es daily task copy for ${taskId}`);
    for (const locale of [de, en, es]) {
      assert(String(locale.daily.task[taskId].title || '').trim().length > 0, `missing title for ${taskId}`);
      assert(String(locale.daily.task[taskId].description || '').trim().length > 0, `missing description for ${taskId}`);
    }
  }
})();

(function testSelectionUsesPhaseAndPressureSignals() {
  const selected = selectionApi.buildDailyCareSelection(buildSnapshot({
    simulation: { simDay: 5 },
    plant: { phase: 'seedling' },
    status: { water: 44, nutrition: 60, stress: 16, risk: 12 }
  }), {
    dayKey: '2026-06-07',
    maxTasks: 3,
    recentTaskIds: []
  });

  assert.strictEqual(selected.length, 3, 'selection should always return 3 tasks');
  assert(selected.some((task) => task.id === 'seedling_moisture_round'), 'seedling low-water state should prioritize moisture task');
  assert(selected.some((task) => task.id === 'seedling_stability_check'), 'seedling state should surface a seedling-specific task');
})();

(function testRecentHistoryAvoidsFullRepeatWhenAlternativesExist() {
  const first = selectionApi.buildDailyCareSelection(buildSnapshot({
    simulation: { simDay: 20 },
    plant: { phase: 'vegetative' },
    status: { water: 70, nutrition: 68, stress: 22, risk: 18 }
  }), {
    dayKey: '2026-06-07',
    maxTasks: 3,
    recentTaskIds: []
  });
  const second = selectionApi.buildDailyCareSelection(buildSnapshot({
    simulation: { simDay: 21 },
    plant: { phase: 'vegetative' },
    status: { water: 70, nutrition: 68, stress: 22, risk: 18 }
  }), {
    dayKey: '2026-06-08',
    maxTasks: 3,
    recentTaskIds: first.map((task) => task.id)
  });

  assert.strictEqual(second.length, 3, 'next-day selection should still return 3 tasks');
  const overlap = second.filter((task) => first.some((previous) => previous.id === task.id));
  assert(overlap.length < 3, 'recent history should avoid a full identical repeat');
})();

console.log('daily-care-selection.test.js passed');
