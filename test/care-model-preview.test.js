#!/usr/bin/env node
'use strict';

const assert = require('assert');
const careModel = require('../src/simulation/careModel.js');

function deltaKeys(preview) {
  return Array.isArray(preview.forecastDeltas)
    ? preview.forecastDeltas.map((delta) => delta.key)
    : [];
}

function reasonKeys(preview) {
  return preview && preview.risk && Array.isArray(preview.risk.reasons)
    ? preview.risk.reasons
    : [];
}

function buildState(overrides = {}) {
  return {
    status: {
      water: 60,
      nutrition: 55,
      health: 82,
      stress: 18,
      risk: 14,
      growth: 40,
      ...(overrides.status || {})
    },
    plant: {
      stageIndex: 4,
      phase: 'vegetative',
      ...(overrides.plant || {})
    },
    simulation: {
      simTimeMs: 120000,
      ...(overrides.simulation || {})
    },
    environmentControls: {
      airflowPercent: 70,
      humidityPercent: 58,
      temperatureC: 25,
      ec: 1.4,
      ...(overrides.environmentControls || {})
    },
    setup: {
      potSize: 'medium',
      ...(overrides.setup || {})
    },
    care: overrides.care || null
  };
}

(function testPreviewStableWithMissingCare() {
  const preview = careModel.getCareActionPreview(buildState({ care: null }), {
    id: 'watering_medium_deep',
    category: 'watering',
    intensity: 'medium'
  });

  assert.strictEqual(typeof preview, 'object', 'preview should return an object');
  assert.strictEqual(preview.category, 'watering', 'preview should preserve action category');
  assert.strictEqual(typeof preview.timing.score, 'number', 'preview should expose timing score');
  assert.ok(Array.isArray(preview.forecastDeltas), 'preview should expose forecast deltas');
  for (const delta of preview.forecastDeltas) {
    assert.strictEqual(typeof delta.key, 'string', 'forecast delta should expose a key');
    assert.strictEqual(typeof delta.labelKey, 'string', 'forecast delta should expose a label key');
    assert.strictEqual(typeof delta.value, 'number', 'forecast delta should expose a numeric value');
    assert.strictEqual(typeof delta.direction, 'string', 'forecast delta should expose a direction');
    assert.strictEqual(typeof delta.tone, 'string', 'forecast delta should expose a tone');
  }
})();

(function testWateringDryRootRecommended() {
  const preview = careModel.getCareActionPreview(buildState({
    care: {
      water: {
        substrateMoisture: 28,
        surfaceMoisture: 20,
        rootZoneMoisture: 34,
        drybackRatePerHour: 2.2,
        overwateringPressure: 6,
        dryStressPressure: 58
      }
    }
  }), {
    id: 'watering_medium_deep',
    category: 'watering',
    intensity: 'medium'
  });

  assert.strictEqual(preview.recommendation.verdict, 'recommended', 'dry root zone should recommend watering');
  assert.strictEqual(preview.risk.level, 'low', 'dry root zone should keep watering risk low');
  assert.ok(deltaKeys(preview).includes('moisture'), 'watering preview should show moisture delta');
  assert.ok(deltaKeys(preview).includes('dryStress'), 'watering preview should show dry stress delta');
  assert.ok(
    reasonKeys(preview).includes('careStudio.preview.reason.surfaceReady')
      || reasonKeys(preview).includes('careStudio.preview.reason.rootZoneReady'),
    'dryback-ready watering should explain why the timing is positive'
  );
})();

(function testWateringWetRootRiskier() {
  const preview = careModel.getCareActionPreview(buildState({
    care: {
      water: {
        substrateMoisture: 82,
        surfaceMoisture: 70,
        rootZoneMoisture: 91,
        drybackRatePerHour: 0.7,
        overwateringPressure: 62,
        dryStressPressure: 4
      }
    }
  }), {
    id: 'watering_high_flush',
    category: 'watering',
    intensity: 'high'
  });

  assert.ok(['wait', 'risky'].includes(preview.recommendation.verdict), 'wet root zone should not strongly recommend watering');
  assert.strictEqual(preview.risk.level, 'high', 'wet root zone should mark watering as high risk');
  assert.ok(
    reasonKeys(preview).includes('careStudio.preview.reason.rootZoneWet'),
    'wet root zone preview should explain the root-zone risk'
  );
})();

(function testFeedingHighSaltRiskier() {
  const preview = careModel.getCareActionPreview(buildState({
    care: {
      water: {
        substrateMoisture: 54,
        surfaceMoisture: 42,
        rootZoneMoisture: 58,
        drybackRatePerHour: 1.4,
        overwateringPressure: 10,
        dryStressPressure: 10
      },
      nutrients: {
        n: 72,
        p: 70,
        k: 74,
        micro: 65,
        saltLoad: 78
      }
    }
  }), {
    id: 'fertilizing_high_boost',
    category: 'fertilizing',
    intensity: 'high'
  });

  assert.strictEqual(preview.risk.level, 'high', 'high salt load should mark feeding as high risk');
  assert.ok(deltaKeys(preview).includes('nutrition'), 'feeding preview should show nutrition delta');
  assert.ok(deltaKeys(preview).includes('saltLoad'), 'feeding preview should show salt load delta');
  assert.ok(
    reasonKeys(preview).includes('careStudio.preview.reason.saltPressureHigh'),
    'high salt load preview should explain the salt pressure risk'
  );
})();

(function testFeedingGoodUptakePositiveReason() {
  const preview = careModel.getCareActionPreview(buildState({
    status: {
      nutrition: 38,
      stress: 18
    },
    plant: {
      stageIndex: 4,
      phase: 'vegetative'
    },
    care: {
      water: {
        substrateMoisture: 52,
        surfaceMoisture: 36,
        rootZoneMoisture: 60,
        drybackRatePerHour: 1.3,
        overwateringPressure: 8,
        dryStressPressure: 12
      },
      nutrients: {
        n: 34,
        p: 36,
        k: 38,
        micro: 40,
        saltLoad: 24
      }
    }
  }), {
    id: 'fertilizing_medium_balanced',
    category: 'fertilizing',
    intensity: 'medium'
  });

  assert.ok(
    ['recommended', 'situational'].includes(preview.recommendation.verdict),
    'good uptake conditions should not read as a hard no for feeding'
  );
  assert.ok(
    reasonKeys(preview).includes('careStudio.preview.reason.rootZoneReady')
      || reasonKeys(preview).includes('careStudio.preview.reason.nutrientBufferLow'),
    'good uptake preview should explain why feeding can work now'
  );
})();

(function testRoutineStablePositive() {
  const preview = careModel.getCareActionPreview(buildState({
    status: {
      health: 88,
      stress: 12,
      risk: 8
    }
  }), {
    id: 'environment_hygiene_round',
    category: 'environment',
    intensity: 'low'
  });

  assert.ok(['recommended', 'situational'].includes(preview.recommendation.verdict), 'stable routine care should not read as outright bad');
  assert.notStrictEqual(preview.risk.level, 'high', 'stable routine care should avoid high risk');
  assert.ok(deltaKeys(preview).includes('stress') || deltaKeys(preview).includes('stability'), 'routine preview should show stress or stability delta');
})();

(function testXLargePotSlowsDrybackComparedToLarge() {
  const buildPotState = (potSize) => buildState({
    setup: { potSize },
    care: {
      water: {
        substrateMoisture: 54,
        surfaceMoisture: 40,
        rootZoneMoisture: 58,
        drybackRatePerHour: 1.3,
        overwateringPressure: 8,
        dryStressPressure: 12
      }
    }
  });

  const largeState = buildPotState('large');
  const xlargeState = buildPotState('xlarge');
  const largeDryback = careModel.normalizeCareState(largeState.care, largeState).water.drybackRatePerHour;
  const xlargeDryback = careModel.normalizeCareState(xlargeState.care, xlargeState).water.drybackRatePerHour;

  assert.strictEqual(careModel.estimateDrybackRate(largeState), largeDryback, 'large pot dryback should stay internally consistent');
  assert.strictEqual(careModel.estimateDrybackRate(xlargeState), xlargeDryback, 'xlarge pot dryback should stay internally consistent');
  assert.ok(Number.isFinite(largeDryback) && Number.isFinite(xlargeDryback), 'pot dryback comparison should produce numeric values');
  assert.ok(
    xlargeDryback < largeDryback,
    'xlarge pot should predict a calmer dryback rate than large'
  );
})();

(function testAftercareFeedbackStillReturnsStructuredResult() {
  const feedback = careModel.getCareActionFeedback(buildState({
    care: {
      water: {
        substrateMoisture: 34,
        surfaceMoisture: 26,
        rootZoneMoisture: 42,
        drybackRatePerHour: 1.6,
        overwateringPressure: 6,
        dryStressPressure: 44
      }
    }
  }), {
    id: 'watering_medium_deep',
    category: 'watering',
    intensity: 'medium'
  }, {
    deltaSummary: {
      water: 12,
      stress: -3,
      risk: 0
    }
  });

  assert.strictEqual(typeof feedback.messageKey, 'string', 'aftercare feedback should keep a message key');
  assert.ok(feedback.messageKey.length > 0, 'aftercare feedback should not be empty');
  assert.ok(Array.isArray(feedback.effects), 'aftercare feedback should include effects');
  assert.ok(feedback.effects.length >= 1, 'aftercare feedback should include at least one effect');
  assert.strictEqual(typeof feedback.nextFocusKey, 'string', 'aftercare feedback should keep a next focus key');
})();

console.log('care model preview tests passed');
