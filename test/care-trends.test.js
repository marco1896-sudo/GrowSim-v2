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

function withTrend(care, previous, current) {
  return {
    ...care,
    trends: {
      version: 1,
      lastSnapshotAtSimMs: 120000,
      previous,
      current,
      deltas: {}
    }
  };
}

(function testMissingTrendDataDoesNotCrash() {
  const diagnosis = careModel.getCareTrendDiagnosis(buildState({ care: null }));
  assert.strictEqual(typeof diagnosis, 'object', 'missing trend data should still yield an object');
  assert.strictEqual(typeof diagnosis.labelKey, 'string', 'trend diagnosis should expose a label key');
})();

(function testNormalizeCareStateAddsTrendModel() {
  const normalized = careModel.normalizeCareState({
    water: { substrateMoisture: 61 },
    nutrients: { saltLoad: 24 }
  }, buildState());

  assert.ok(normalized.trends && typeof normalized.trends === 'object', 'care normalization should add trends');
  assert.strictEqual(typeof normalized.trends.current.rootZoneMoisture, 'number', 'trend current snapshot should exist');
  assert.strictEqual(typeof normalized.trends.deltas.moisture, 'number', 'trend deltas should exist');
})();

(function testSnapshotReflectsCareStateShift() {
  const beforeState = buildState({
    care: {
      water: {
        substrateMoisture: 40,
        surfaceMoisture: 24,
        rootZoneMoisture: 38,
        drybackRatePerHour: 1.8,
        overwateringPressure: 8,
        dryStressPressure: 42
      },
      nutrients: {
        n: 42, p: 44, k: 46, micro: 40, saltLoad: 24
      }
    }
  });
  const afterState = buildState({
    status: { water: 66, stress: 14, risk: 12 },
    care: {
      water: {
        substrateMoisture: 62,
        surfaceMoisture: 48,
        rootZoneMoisture: 64,
        drybackRatePerHour: 1.1,
        overwateringPressure: 14,
        dryStressPressure: 16
      },
      nutrients: {
        n: 42, p: 44, k: 46, micro: 40, saltLoad: 24
      }
    }
  });

  const beforeSnapshot = careModel.captureCareTrendSnapshot(beforeState);
  const afterSnapshot = careModel.captureCareTrendSnapshot(afterState);
  const normalized = careModel.normalizeCareTrends({
    version: 1,
    lastSnapshotAtSimMs: afterSnapshot.atSimMs,
    previous: beforeSnapshot.values,
    current: afterSnapshot.values,
    deltas: {}
  }, afterState);

  assert.ok(normalized.deltas.moisture > 0, 'watering-like shift should raise moisture delta');
  assert.ok(normalized.deltas.rootZone > 0, 'watering-like shift should raise root zone delta');
})();

(function testSaltLoadRisingTrendIsDetected() {
  const baseCare = careModel.createDefaultCareState(buildState());
  const trend = careModel.deriveCareTrendSummary(buildState({
    care: withTrend(baseCare,
      { substrateMoisture: 56, rootZoneMoisture: 60, surfaceMoisture: 40, saltLoad: 42, stress: 18, risk: 14, nutrition: 54 },
      { substrateMoisture: 54, rootZoneMoisture: 58, surfaceMoisture: 38, saltLoad: 49, stress: 20, risk: 16, nutrition: 58 }
    )
  }));

  assert.strictEqual(trend.key, 'salt_load_rising', 'rising salt load should be recognized');
})();

(function testStressRecoveringTrendIsDetected() {
  const baseCare = careModel.createDefaultCareState(buildState());
  const trend = careModel.deriveCareTrendSummary(buildState({
    status: { stress: 28, risk: 20 },
    care: withTrend(baseCare,
      { substrateMoisture: 54, rootZoneMoisture: 58, surfaceMoisture: 36, saltLoad: 32, stress: 52, risk: 28, nutrition: 54 },
      { substrateMoisture: 56, rootZoneMoisture: 60, surfaceMoisture: 40, saltLoad: 31, stress: 42, risk: 20, nutrition: 55 }
    )
  }));

  assert.strictEqual(trend.key, 'stress_recovering', 'falling stress should be recognized');
})();

(function testWetRootZoneStayingWetRaisesDiagnosisSeverity() {
  const diagnosis = careModel.getCareDiagnosis(buildState({
    status: { water: 84, stress: 30, risk: 42 },
    care: withTrend({
      water: {
        substrateMoisture: 82,
        surfaceMoisture: 72,
        rootZoneMoisture: 88,
        drybackRatePerHour: 0.8,
        overwateringPressure: 60,
        dryStressPressure: 6
      },
      nutrients: {
        n: 56, p: 54, k: 58, micro: 52, saltLoad: 34
      }
    },
    { substrateMoisture: 84, rootZoneMoisture: 90, surfaceMoisture: 76, saltLoad: 34, stress: 28, risk: 38, nutrition: 60 },
    { substrateMoisture: 82, rootZoneMoisture: 88, surfaceMoisture: 72, saltLoad: 35, stress: 30, risk: 42, nutrition: 60 })
  }));

  assert.strictEqual(diagnosis.primaryFocus, 'rootZone', 'wet root zone should remain the focus');
  assert.strictEqual(diagnosis.severity, 'high', 'root zone that stays wet should increase severity');
})();

(function testDryStressAndFallingMoistureStrengthenWaterFocus() {
  const diagnosis = careModel.getCareDiagnosis(buildState({
    status: { water: 28, stress: 48, risk: 22 },
    care: withTrend({
      water: {
        substrateMoisture: 30,
        surfaceMoisture: 18,
        rootZoneMoisture: 34,
        drybackRatePerHour: 2.1,
        overwateringPressure: 4,
        dryStressPressure: 62
      },
      nutrients: {
        n: 40, p: 42, k: 44, micro: 40, saltLoad: 24
      }
    },
    { substrateMoisture: 38, rootZoneMoisture: 42, surfaceMoisture: 24, saltLoad: 22, stress: 44, risk: 18, nutrition: 48 },
    { substrateMoisture: 30, rootZoneMoisture: 34, surfaceMoisture: 18, saltLoad: 24, stress: 48, risk: 22, nutrition: 44 })
  }));

  assert.strictEqual(diagnosis.primaryFocus, 'water', 'falling moisture under dry stress should focus water');
  assert.strictEqual(diagnosis.severity, 'high', 'falling moisture should reinforce water urgency');
})();

(function testStablePlantWithStableTrendsStaysCalm() {
  const diagnosis = careModel.getCareDiagnosis(buildState({
    status: { water: 62, nutrition: 56, stress: 16, risk: 12, health: 88 },
    care: withTrend({
      water: {
        substrateMoisture: 58,
        surfaceMoisture: 40,
        rootZoneMoisture: 60,
        drybackRatePerHour: 1.1,
        overwateringPressure: 10,
        dryStressPressure: 14
      },
      nutrients: {
        n: 52, p: 50, k: 54, micro: 50, saltLoad: 30
      }
    },
    { substrateMoisture: 58, rootZoneMoisture: 60, surfaceMoisture: 41, saltLoad: 30, stress: 18, risk: 14, nutrition: 56 },
    { substrateMoisture: 58, rootZoneMoisture: 60, surfaceMoisture: 40, saltLoad: 30, stress: 16, risk: 12, nutrition: 56 })
  }));

  assert.strictEqual(diagnosis.primaryFocus, 'stable', 'stable values and quiet trends should stay stable');
  assert.ok(
    diagnosis.trendKey === 'careStudio.trend.stable' || diagnosis.trendKey === 'careStudio.trend.riskFalling' || diagnosis.trendKey === 'careStudio.trend.stressRecovering',
    'stable diagnosis should keep a calm trend'
  );
})();

console.log('care trend tests passed');
