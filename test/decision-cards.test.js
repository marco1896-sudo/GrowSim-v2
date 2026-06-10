#!/usr/bin/env node
'use strict';

const assert = require('assert');
const de = require('../src/i18n/locales/de.json');
const en = require('../src/i18n/locales/en.json');
const es = require('../src/i18n/locales/es.json');
const decisionApi = require('../src/gameplay/decisionCards.js');

function buildSnapshot(overrides = {}) {
  const base = {
    simulation: {
      simDay: 16
    },
    plant: {
      phase: 'vegetative'
    },
    status: {
      water: 62,
      nutrition: 64,
      stress: 18,
      risk: 14,
      health: 82
    },
    events: {
      machineState: 'idle'
    },
    retention: {
      dailyCare: {
        dayKey: '2026-06-09',
        buddyCheck: {
          category: '',
          primaryTaskId: ''
        },
        tasks: []
      },
      weekly: {
        weekKey: '2026-06-08',
        missionId: ''
      }
    }
  };

  return {
    ...base,
    ...overrides,
    simulation: { ...base.simulation, ...(overrides.simulation || {}) },
    plant: { ...base.plant, ...(overrides.plant || {}) },
    status: { ...base.status, ...(overrides.status || {}) },
    events: { ...base.events, ...(overrides.events || {}) },
    retention: {
      ...base.retention,
      ...(overrides.retention || {}),
      dailyCare: {
        ...base.retention.dailyCare,
        ...(((overrides.retention || {}).dailyCare) || {}),
        buddyCheck: {
          ...base.retention.dailyCare.buddyCheck,
          ...((((overrides.retention || {}).dailyCare || {}).buddyCheck) || {})
        }
      },
      weekly: {
        ...base.retention.weekly,
        ...(((overrides.retention || {}).weekly) || {})
      }
    }
  };
}

(function testCatalogHasExpectedRangeAndI18nCoverage() {
  const catalog = decisionApi.createCatalog();
  assert.strictEqual(catalog.length, 6, `expected 6 decision cards, got ${catalog.length}`);

  for (const template of catalog) {
    const cardId = String(template.id || '').trim();
    assert(cardId, 'decision card id missing');
    for (const locale of [de, en, es]) {
      const cardCopy = locale.daily && locale.daily.decision && locale.daily.decision.card && locale.daily.decision.card[cardId];
      assert(cardCopy, `missing locale copy for card ${cardId}`);
      assert(String(cardCopy.title || '').trim().length > 0, `missing title for card ${cardId}`);
      assert(String(cardCopy.description || '').trim().length > 0, `missing description for card ${cardId}`);
      for (const option of template.options || []) {
        const optionId = String(option.id || '').trim();
        assert(String(cardCopy.option && cardCopy.option[optionId] && cardCopy.option[optionId].label || '').trim().length > 0, `missing option label for ${cardId}.${optionId}`);
        assert(String(cardCopy.option && cardCopy.option[optionId] && cardCopy.option[optionId].description || '').trim().length > 0, `missing option description for ${cardId}.${optionId}`);
        assert(String(cardCopy.result && cardCopy.result[optionId] || '').trim().length > 0, `missing result copy for ${cardId}.${optionId}`);
      }
    }
  }
})();

(function testNeutralStateCanProduceNoDecisionCard() {
  const selected = decisionApi.selectDecisionCard(buildSnapshot({
    simulation: { simDay: 4 },
    plant: { phase: 'seedling' },
    status: { water: 74, nutrition: 66, stress: 18, risk: 12, health: 86 },
    retention: {
      dailyCare: {
        tasks: []
      }
    }
  }), {
    dayKey: '2026-06-09',
    weekKey: '2026-06-08',
    recentCardIds: []
  });

  assert.strictEqual(selected, null, 'neutral state should not force a decision card');
})();

(function testWaterLowPrefersWaterDecisionAndResolvesFocus() {
  const snapshot = buildSnapshot({
    simulation: { simDay: 6 },
    plant: { phase: 'seedling' },
    status: { water: 43, nutrition: 62, stress: 20, risk: 16, health: 80 },
    retention: {
      dailyCare: {
        buddyCheck: {
          category: 'water_focus',
          primaryTaskId: 'seedling_moisture_round'
        },
        tasks: [
          { id: 'seedling_moisture_round', progress: 0, target: 1, claimed: false },
          { id: 'care_sheet_check', progress: 0, target: 1, claimed: false },
          { id: 'open_app_twice', progress: 0, target: 2, claimed: false }
        ]
      }
    }
  });

  const selected = decisionApi.selectDecisionCard(snapshot, {
    dayKey: '2026-06-09',
    weekKey: '2026-06-08',
    recentCardIds: []
  });

  assert(selected, 'low-water state should offer a decision card');
  assert.strictEqual(selected.id, 'water_low', `expected water_low card, got ${selected && selected.id}`);
  const resolution = decisionApi.buildDecisionCardResolution(snapshot, selected.id, 'careful_water', {
    dayKey: '2026-06-09',
    weekKey: '2026-06-08',
    primaryTaskId: selected.primaryTaskId
  });
  assert.strictEqual(resolution.focusTaskId, 'seedling_moisture_round', 'careful water should focus the moisture task');
  assert.strictEqual(resolution.suggestedCoinActionId, '', 'careful water should not suggest a coin action');
})();

(function testRepeatProtectionCanMoveToAnotherEligibleCard() {
  const snapshot = buildSnapshot({
    simulation: { simDay: 18 },
    plant: { phase: 'vegetative' },
    status: { water: 44, nutrition: 60, stress: 52, risk: 18, health: 74 },
    retention: {
      dailyCare: {
        buddyCheck: {
          category: 'water_focus',
          primaryTaskId: 'seedling_moisture_round'
        },
        tasks: [
          { id: 'seedling_moisture_round', progress: 0, target: 1, claimed: false },
          { id: 'climate_pressure_relief', progress: 0, target: 1, claimed: false },
          { id: 'analysis_sheet_check', progress: 0, target: 1, claimed: false }
        ]
      }
    }
  });

  const first = decisionApi.selectDecisionCard(snapshot, {
    dayKey: '2026-06-09',
    weekKey: '2026-06-08',
    recentCardIds: []
  });
  const second = decisionApi.selectDecisionCard(snapshot, {
    dayKey: '2026-06-10',
    weekKey: '2026-06-08',
    recentCardIds: ['water_low']
  });

  assert(first, 'first eligible decision card should exist');
  assert.strictEqual(first.id, 'water_low', `expected water_low first, got ${first.id}`);
  assert(second, 'second eligible decision card should still exist');
  assert.strictEqual(second.id, 'stress_elevated', `repeat protection should allow another eligible card, got ${second.id}`);
})();

(function testTimeboostChoiceCanSuggestSafeBoostCheck() {
  const snapshot = buildSnapshot({
    simulation: { simDay: 8 },
    plant: { phase: 'seedling' },
    status: { water: 63, nutrition: 65, stress: 22, risk: 20, health: 81 },
    retention: {
      dailyCare: {
        buddyCheck: {
          category: 'timeboost_safe',
          primaryTaskId: 'stable_climate_window'
        },
        tasks: [
          { id: 'stable_climate_window', progress: 0, target: 1, claimed: false },
          { id: 'open_app_twice', progress: 0, target: 2, claimed: false }
        ]
      }
    }
  });

  const selected = decisionApi.selectDecisionCard(snapshot, {
    dayKey: '2026-06-09',
    weekKey: '2026-06-08',
    recentCardIds: []
  });
  assert(selected, 'timeboost-safe state should offer a card');
  const resolution = decisionApi.buildDecisionCardResolution(snapshot, selected.id, 'use_safe_boost_check', {
    dayKey: '2026-06-09',
    weekKey: '2026-06-08',
    primaryTaskId: selected.primaryTaskId
  });

  assert.strictEqual(selected.id, 'timeboost_choice', `expected timeboost_choice, got ${selected.id}`);
  assert.strictEqual(resolution.suggestedCoinActionId, 'safe_boost_check', 'timeboost choice should suggest safe boost check');
})();

(function testStressWeekDoesNotForceRiskCardWithoutRiskSignals() {
  const selected = decisionApi.selectDecisionCard(buildSnapshot({
    simulation: { simDay: 24 },
    plant: { phase: 'stretch' },
    status: { water: 60, nutrition: 62, stress: 58, risk: 28, health: 80 },
    retention: {
      dailyCare: {
        buddyCheck: {
          category: 'stress_focus',
          primaryTaskId: 'climate_pressure_relief'
        },
        tasks: [
          { id: 'climate_pressure_relief', progress: 0, target: 1, claimed: false },
          { id: 'veg_training_review', progress: 0, target: 1, claimed: false },
          { id: 'open_app_twice', progress: 0, target: 2, claimed: false }
        ]
      },
      weekly: {
        weekKey: '2026-06-08',
        missionId: 'risk_reset'
      }
    }
  }), {
    dayKey: '2026-06-09',
    weekKey: '2026-06-08',
    recentCardIds: []
  });

  assert(selected, 'stress-heavy state should still offer a decision card');
  assert.strictEqual(selected.id, 'stress_elevated', `stress-heavy state should prefer stress_elevated, got ${selected.id}`);
})();

(function testStableFlowerDayCanStayBloomFocused() {
  const selected = decisionApi.selectDecisionCard(buildSnapshot({
    simulation: { simDay: 43 },
    plant: { phase: 'flowering' },
    status: { water: 66, nutrition: 63, stress: 22, risk: 20, health: 82 },
    retention: {
      dailyCare: {
        buddyCheck: {
          category: 'bloom_focus',
          primaryTaskId: 'flower_climate_tune'
        },
        tasks: [
          { id: 'flower_climate_tune', progress: 0, target: 1, claimed: false },
          { id: 'stable_climate_window', progress: 0, target: 1, claimed: false },
          { id: 'flower_mold_watch', progress: 0, target: 1, claimed: false }
        ]
      }
    }
  }), {
    dayKey: '2026-06-09',
    weekKey: '2026-06-08',
    recentCardIds: []
  });

  assert(selected, 'stable flowering state should still offer a decision card');
  assert.strictEqual(selected.id, 'bloom_watch', `stable flowering state should prefer bloom_watch, got ${selected.id}`);
})();

(function testHighRiskDayCanOverrideRepeatPenalty() {
  const selected = decisionApi.selectDecisionCard(buildSnapshot({
    simulation: { simDay: 47 },
    plant: { phase: 'flowering' },
    status: { water: 57, nutrition: 59, stress: 40, risk: 58, health: 76 },
    events: {
      machineState: 'activeEvent'
    },
    retention: {
      dailyCare: {
        buddyCheck: {
          category: 'risk_focus',
          primaryTaskId: 'resolve_pending_pressure'
        },
        tasks: [
          { id: 'resolve_pending_pressure', progress: 0, target: 1, claimed: false },
          { id: 'flower_climate_tune', progress: 0, target: 1, claimed: false },
          { id: 'analysis_sheet_check', progress: 0, target: 1, claimed: false }
        ]
      }
    }
  }), {
    dayKey: '2026-06-10',
    weekKey: '2026-06-08',
    recentCardIds: ['risk_focus']
  });

  assert(selected, 'high-risk state should still offer a decision card');
  assert.strictEqual(selected.id, 'risk_focus', `high-risk state should override repeat penalty, got ${selected.id}`);
})();

console.log('decision-cards.test.js passed');
