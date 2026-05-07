#!/usr/bin/env node
'use strict';

const assert = require('assert');
const careModel = require('../src/simulation/careModel.js');

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

(function testDiagnosisStableObjectWithMissingCare() {
  const diagnosis = careModel.getCareDiagnosis(buildState({ care: null }));
  assert.strictEqual(typeof diagnosis, 'object', 'diagnosis should return an object');
  assert.strictEqual(typeof diagnosis.primaryFocus, 'string', 'diagnosis should expose a primary focus');
  assert.strictEqual(typeof diagnosis.titleKey, 'string', 'diagnosis should expose a title key');
  assert.ok(Array.isArray(diagnosis.causeKeys), 'diagnosis should expose cause keys');
  assert.ok(Array.isArray(diagnosis.observationKeys), 'diagnosis should expose observation keys');
})();

(function testStablePlantReturnsStableFocus() {
  const diagnosis = careModel.getCareDiagnosis(buildState({
    status: { water: 64, nutrition: 58, stress: 16, risk: 12, health: 88 },
    care: {
      water: {
        substrateMoisture: 58,
        surfaceMoisture: 42,
        rootZoneMoisture: 60,
        drybackRatePerHour: 1.1,
        overwateringPressure: 10,
        dryStressPressure: 12
      },
      nutrients: {
        n: 52, p: 50, k: 54, micro: 50, saltLoad: 28
      }
    }
  }));

  assert.strictEqual(diagnosis.primaryFocus, 'stable', 'stable plant should resolve to stable focus');
  assert.strictEqual(diagnosis.status, 'stable', 'stable plant should stay stable');
})();

(function testWetRootZoneDiagnosisMatchesPreview() {
  const state = buildState({
    care: {
      water: {
        substrateMoisture: 82,
        surfaceMoisture: 72,
        rootZoneMoisture: 91,
        drybackRatePerHour: 0.7,
        overwateringPressure: 66,
        dryStressPressure: 4
      }
    }
  });
  const diagnosis = careModel.getCareDiagnosis(state);
  const preview = careModel.getCareActionPreview(state, {
    id: 'watering_high_flush',
    category: 'watering',
    intensity: 'high'
  });

  assert.strictEqual(diagnosis.primaryFocus, 'rootZone', 'wet root zone should focus the root zone');
  assert.ok(['avoid', 'watch'].includes(diagnosis.status), 'wet root zone should not encourage direct watering');
  assert.ok(['wait', 'risky'].includes(preview.recommendation.verdict), 'preview should not recommend watering into a wet root zone');
})();

(function testDryStressFocusesWater() {
  const diagnosis = careModel.getCareDiagnosis(buildState({
    status: { water: 28, stress: 52 },
    care: {
      water: {
        substrateMoisture: 30,
        surfaceMoisture: 18,
        rootZoneMoisture: 34,
        drybackRatePerHour: 2.1,
        overwateringPressure: 4,
        dryStressPressure: 62
      }
    }
  }));

  assert.strictEqual(diagnosis.primaryFocus, 'water', 'dry stress should focus water');
  assert.strictEqual(diagnosis.status, 'act', 'dry stress should ask for action');
})();

(function testHighSaltFocusesSaltLoad() {
  const state = buildState({
    care: {
      water: {
        substrateMoisture: 56,
        surfaceMoisture: 40,
        rootZoneMoisture: 60,
        drybackRatePerHour: 1.2,
        overwateringPressure: 12,
        dryStressPressure: 10
      },
      nutrients: {
        n: 70, p: 68, k: 72, micro: 64, saltLoad: 82
      }
    }
  });
  const diagnosis = careModel.getCareDiagnosis(state);
  const preview = careModel.getCareActionPreview(state, {
    id: 'fertilizing_high_boost',
    category: 'fertilizing',
    intensity: 'high'
  });

  assert.strictEqual(diagnosis.primaryFocus, 'saltLoad', 'high salt should focus salt load');
  assert.strictEqual(preview.risk.level, 'high', 'preview should stay risky under high salt load');
})();

(function testLowNutritionFocusesNutrition() {
  const diagnosis = careModel.getCareDiagnosis(buildState({
    status: { nutrition: 34, stress: 18, risk: 16 },
    care: {
      water: {
        substrateMoisture: 52,
        surfaceMoisture: 38,
        rootZoneMoisture: 58,
        drybackRatePerHour: 1.2,
        overwateringPressure: 10,
        dryStressPressure: 12
      },
      nutrients: {
        n: 32, p: 36, k: 34, micro: 38, saltLoad: 24
      }
    }
  }));

  assert.strictEqual(diagnosis.primaryFocus, 'nutrition', 'low nutrition with low salt should focus nutrition');
  assert.strictEqual(diagnosis.suggestedActionCategory, 'fertilizing', 'nutrition diagnosis should point toward feeding');
})();

(function testHighStressFocusesStress() {
  const diagnosis = careModel.getCareDiagnosis(buildState({
    status: { stress: 76, health: 48, risk: 66 },
    care: {
      water: {
        substrateMoisture: 54,
        surfaceMoisture: 40,
        rootZoneMoisture: 62,
        drybackRatePerHour: 1.1,
        overwateringPressure: 10,
        dryStressPressure: 20
      },
      nutrients: {
        n: 56, p: 54, k: 58, micro: 52, saltLoad: 34
      }
    }
  }));

  assert.strictEqual(diagnosis.primaryFocus, 'stress', 'high stress should focus stress');
  assert.strictEqual(diagnosis.suggestedActionCategory, 'routine', 'stress diagnosis should bias toward gentle routine care');
})();

console.log('care diagnosis tests passed');
