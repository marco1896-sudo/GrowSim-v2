#!/usr/bin/env node
'use strict';

const assert = require('assert');
global.GrowSimCareModel = require('../src/simulation/careModel.js');
const careMethods = require('../src/simulation/careMethods.js');

function buildState(overrides = {}) {
  return {
    status: {
      water: 58,
      nutrition: 46,
      health: 84,
      stress: 18,
      risk: 16,
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
    care: {
      water: {
        substrateMoisture: 56,
        surfaceMoisture: 42,
        rootZoneMoisture: 60,
        drybackRatePerHour: 1.2,
        overwateringPressure: 10,
        dryStressPressure: 12,
        ...(overrides.care && overrides.care.water || {})
      },
      nutrients: {
        n: 40,
        p: 42,
        k: 44,
        micro: 46,
        saltLoad: 24,
        ...(overrides.care && overrides.care.nutrients || {})
      },
      routine: {
        lastLeafCheckAtSimMs: 0,
        lastPotWeightCheckAtSimMs: 0,
        lastSubstrateCheckAtSimMs: 0,
        careScoreToday: 0,
        ...(overrides.care && overrides.care.routine || {})
      }
    }
  };
}

(function testMethodsLoadPerTab() {
  const waterMethods = careMethods.getCareMethodsForTab(buildState(), 'water').map((method) => method.id);
  const feedMethods = careMethods.getCareMethodsForTab(buildState(), 'feed').map((method) => method.id);
  const routineMethods = careMethods.getCareMethodsForTab(buildState(), 'routine').map((method) => method.id);

  assert.ok(waterMethods.includes('water_check_pot_weight'), 'water tab should expose the new diagnostic weight check');
  assert.ok(waterMethods.includes('water_even_watering'), 'water tab should expose the new even watering method');
  assert.ok(feedMethods.includes('feed_phase_supply'), 'feed tab should expose the new phase-aware supply method');
  assert.ok(routineMethods.includes('routine_check_leaves'), 'routine tab should expose the new leaf check method');
  assert.ok(!waterMethods.includes('watering_medium_deep'), 'water tab should not expose the old legacy action ids directly');
})();

(function testAllCareMethodsHavePreviewAndExecutionPlan() {
  for (const method of careMethods.getAvailableCareMethods(buildState())) {
    const preview = careMethods.getCareMethodPreview(buildState(), method);
    const plan = careMethods.buildCareMethodExecutionPlan(buildState(), method);
    assert.ok(preview && typeof preview === 'object', `method ${method.id} should build a preview`);
    assert.ok(Array.isArray(preview.forecastDeltas), `method ${method.id} should expose forecast deltas`);
    assert.ok(plan && typeof plan === 'object', `method ${method.id} should build an execution plan`);
    assert.strictEqual(plan.mode, 'direct', `method ${method.id} should run directly now`);
  }
})();

(function testPriorityMethodsRunDirectlyNow() {
  assert.strictEqual(
    careMethods.mapCareMethodToLegacyAction('water_moisten_surface'),
    null,
    'surface moistening should now run on direct care effects'
  );
  assert.strictEqual(
    careMethods.mapCareMethodToLegacyAction('water_normal_watering'),
    null,
    'normal watering should now run on direct care effects'
  );
  assert.strictEqual(
    careMethods.mapCareMethodToLegacyAction('feed_light_base'),
    null,
    'light base feed should now run on direct care effects'
  );
  assert.strictEqual(
    careMethods.mapCareMethodToLegacyAction('feed_phase_supply'),
    null,
    'phase-aware feeding should now run on direct care effects'
  );
})();

(function testFormerSpecialCasesNowRunDirectly() {
  assert.strictEqual(
    careMethods.mapCareMethodToLegacyAction('water_relieve_root_zone'),
    null,
    'root-zone relief should now run on direct care effects'
  );
  assert.strictEqual(
    careMethods.mapCareMethodToLegacyAction('feed_stabilize_uptake'),
    null,
    'uptake stabilization should now run on direct care effects'
  );
  assert.strictEqual(
    careMethods.mapCareMethodToLegacyAction('routine_hygiene_round'),
    null,
    'hygiene round should now run on direct care effects'
  );
})();

(function testPreviewStillReturnsForecastDeltas() {
  const preview = careMethods.getCareMethodPreview(buildState(), careMethods.getCareMethodById('water_even_watering'));
  assert.ok(preview && typeof preview === 'object', 'method preview should return a stable object');
  assert.ok(Array.isArray(preview.forecastDeltas), 'method preview should expose delta forecast');
  assert.ok(preview.forecastDeltas.some((delta) => delta.key === 'moisture' || delta.key === 'rootZoneMoisture'), 'watering method preview should speak about moisture');
})();

(function testStableStateStaysQuiet() {
  const state = buildState({
    status: {
      water: 62,
      nutrition: 52,
      stress: 10,
      risk: 8
    },
    care: {
      water: {
        substrateMoisture: 58,
        surfaceMoisture: 38,
        rootZoneMoisture: 60,
        dryStressPressure: 14,
        overwateringPressure: 8
      },
      nutrients: {
        saltLoad: 28,
        n: 48,
        p: 50,
        k: 52,
        micro: 50
      }
    }
  });

  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'water_normal_watering').recommendation.verdict,
    'wait',
    'stable plants should not strongly recommend normal watering'
  );
  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'feed_phase_supply').recommendation.verdict,
    'wait',
    'stable plants should not strongly recommend phase feeding'
  );
  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'feed_protect_salt_load').recommendation.verdict,
    'situational',
    'stable plants should not force non-feeding as the top move'
  );
})();

(function testWetRootZoneBlocksNormalWatering() {
  const availability = careMethods.getCareMethodAvailability(buildState({
    care: {
      water: {
        substrateMoisture: 82,
        surfaceMoisture: 68,
        rootZoneMoisture: 90,
        overwateringPressure: 64,
        dryStressPressure: 4
      }
    }
  }), careMethods.getCareMethodById('water_normal_watering'), {
    legacyAction: {
      id: 'watering_medium_deep',
      category: 'watering',
      intensity: 'medium'
    },
    legacyAvailability: { ok: true }
  });

  assert.strictEqual(availability.ok, false, 'wet root zone should block the stronger watering method');
  assert.strictEqual(availability.reason, 'care_method_root_zone_wet', 'wet root zone should explain the block reason');
})();

(function testWetRootZonePrefersReliefAndObservation() {
  const state = buildState({
    care: {
      water: {
        substrateMoisture: 82,
        surfaceMoisture: 68,
        rootZoneMoisture: 90,
        overwateringPressure: 64,
        dryStressPressure: 4
      }
    },
    status: {
      water: 82,
      stress: 34,
      risk: 46
    }
  });

  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'water_relieve_root_zone').recommendation.verdict,
    'recommended',
    'wet root zone should favor relief instead of more watering'
  );
  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'water_even_watering').recommendation.verdict,
    'wait',
    'wet root zone should not recommend even watering'
  );
})();

(function testDryPlantPrefersRealWateringNotRootRelief() {
  const state = buildState({
    care: {
      water: {
        substrateMoisture: 30,
        surfaceMoisture: 18,
        rootZoneMoisture: 34,
        overwateringPressure: 4,
        dryStressPressure: 58
      }
    },
    status: {
      water: 28,
      stress: 42,
      risk: 18
    }
  });

  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'water_even_watering').recommendation.verdict,
    'recommended',
    'dry plants should recommend a meaningful watering method'
  );
  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'water_normal_watering').recommendation.verdict,
    'recommended',
    'dry plants should allow the stronger watering pass when needed'
  );
  assert.strictEqual(
    careMethods.getCareMethodAvailability(state, 'water_relieve_root_zone').ok,
    false,
    'dry plants should not surface root-zone relief as the right move'
  );
})();

(function testProtectSaltLoadStaysSafe() {
  const preview = careMethods.getCareMethodPreview(buildState({
    care: {
      nutrients: {
        saltLoad: 72
      }
    }
  }), careMethods.getCareMethodById('feed_protect_salt_load'));

  assert.ok(preview, 'salt-protection method should build a preview');
  assert.ok(Array.isArray(preview.forecastDeltas), 'salt-protection method should include forecast deltas');
  assert.ok(preview.forecastDeltas.some((delta) => delta.key === 'risk'), 'salt-protection preview should show a risk delta');
})();

(function testMoistenSurfaceRunsDirectWithSurfaceBias() {
  const effects = careMethods.deriveCareMethodDirectEffects(buildState({
    care: {
      water: {
        surfaceMoisture: 30,
        rootZoneMoisture: 64,
        substrateMoisture: 50,
        dryStressPressure: 26
      }
    }
  }), 'water_moisten_surface');

  assert.ok(effects && effects.care && effects.care.water, 'surface moistening should expose direct water deltas');
  assert.ok(effects.care.water.surfaceMoisture > effects.care.water.rootZoneMoisture, 'surface moistening should raise the surface more than the root zone');
})();

(function testNormalWateringRaisesRootZoneMoreThanSurfaceMoisten() {
  const state = buildState({
    care: {
      water: {
        surfaceMoisture: 26,
        rootZoneMoisture: 44,
        substrateMoisture: 40,
        dryStressPressure: 34
      }
    }
  });
  const lightEffects = careMethods.deriveCareMethodDirectEffects(state, 'water_moisten_surface');
  const strongEffects = careMethods.deriveCareMethodDirectEffects(state, 'water_normal_watering');

  assert.ok(strongEffects.care.water.rootZoneMoisture > lightEffects.care.water.rootZoneMoisture, 'normal watering should lift the root zone more strongly than surface moistening');
})();

(function testWetRootZoneRaisesNormalWateringRisk() {
  const effects = careMethods.deriveCareMethodDirectEffects(buildState({
    care: {
      water: {
        rootZoneMoisture: 84,
        surfaceMoisture: 48,
        substrateMoisture: 70,
        overwateringPressure: 42
      }
    }
  }), 'water_normal_watering');

  assert.ok(Number(effects.status.risk || 0) >= 4, 'wet root zone should make normal watering clearly riskier');
})();

(function testHighSaltLoadWeakensFeedingAndRaisesRisk() {
  const effects = careMethods.deriveCareMethodDirectEffects(buildState({
    status: { stress: 44 },
    care: {
      water: {
        rootZoneMoisture: 62
      },
      nutrients: {
        saltLoad: 64
      }
    }
  }), 'feed_phase_supply');

  assert.ok(Number(effects.status.nutrition || 0) <= 11, 'high salt load should keep phase feeding from overshooting');
  assert.ok(Number(effects.status.risk || 0) >= 3, 'high salt load should make phase feeding riskier');
})();

(function testHighSaltLoadPrefersProtection() {
  const state = buildState({
    care: {
      nutrients: {
        saltLoad: 70,
        n: 58,
        p: 56,
        k: 60,
        micro: 52
      }
    },
    status: {
      nutrition: 62,
      stress: 36,
      risk: 34
    }
  });

  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'feed_protect_salt_load').recommendation.verdict,
    'recommended',
    'high salt load should recommend protecting salt load'
  );
  assert.strictEqual(
    careMethods.getCareMethodAvailability(state, 'feed_phase_supply').ok,
    false,
    'high salt load should block phase feeding'
  );
})();

(function testLowNutritionStablePlantPrefersLightBaseSupply() {
  const state = buildState({
    care: {
      nutrients: {
        saltLoad: 24,
        n: 26,
        p: 28,
        k: 29,
        micro: 32
      },
      water: {
        substrateMoisture: 55,
        surfaceMoisture: 36,
        rootZoneMoisture: 60
      }
    },
    status: {
      nutrition: 28,
      stress: 16,
      risk: 10
    }
  });

  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'feed_light_base').recommendation.verdict,
    'recommended',
    'low nutrition with a stable root zone should recommend light base supply'
  );
  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'feed_phase_supply').recommendation.verdict,
    'situational',
    'phase supply should stay more situational than light base supply here'
  );
})();

(function testHighStressPrefersGentleCare() {
  const state = buildState({
    status: {
      stress: 68,
      risk: 42,
      health: 58
    },
    care: {
      water: {
        substrateMoisture: 46,
        surfaceMoisture: 32,
        rootZoneMoisture: 54,
        dryStressPressure: 34
      },
      nutrients: {
        saltLoad: 38
      }
    }
  });

  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'routine_gentle_stress_check').recommendation.verdict,
    'recommended',
    'high stress should recommend gentle stress control'
  );
  assert.strictEqual(
    careMethods.getCareMethodPreview(state, 'routine_hygiene_round').recommendation.verdict,
    'recommended',
    'high stress/risk should make hygiene round a valid stabilizing move'
  );
  assert.ok(
    ['wait', 'risky'].includes(careMethods.getCareMethodPreview(state, 'feed_phase_supply').recommendation.verdict),
    'high stress should not make stronger feeding look cleanly recommended'
  );
})();

(function testProtectSaltLoadDoesNotIncreaseSaltLoad() {
  const effects = careMethods.deriveCareMethodDirectEffects(buildState({
    care: {
      nutrients: {
        saltLoad: 72
      }
    }
  }), 'feed_protect_salt_load');

  assert.ok(Number(effects.care.nutrients.saltLoad || 0) <= 0, 'salt-protection should not raise salt load');
})();

(function testRootZoneReliefStaysLightOnMoistureAndCanReducePressure() {
  const effects = careMethods.deriveCareMethodDirectEffects(buildState({
    care: {
      water: {
        rootZoneMoisture: 84,
        surfaceMoisture: 38,
        substrateMoisture: 74,
        overwateringPressure: 48
      },
      nutrients: {
        saltLoad: 62
      }
    }
  }), 'water_relieve_root_zone');

  assert.ok(Number(effects.care.water.rootZoneMoisture || 0) <= 1, 'root-zone relief should not strongly increase root-zone moisture');
  assert.ok(Number(effects.care.water.overwateringPressure || 0) < 0, 'root-zone relief should lower overwatering pressure when it is actually needed');
  assert.ok(Number(effects.care.nutrients.saltLoad || 0) <= 0, 'root-zone relief should lower or stabilize salt load');
  assert.ok(Number(effects.status.risk || 0) <= 0, 'root-zone relief should not add risk in the right situation');
})();

(function testUptakeStabilizationAddsOnlyMinimalSalt() {
  const effects = careMethods.deriveCareMethodDirectEffects(buildState({
    status: {
      stress: 42
    },
    care: {
      water: {
        rootZoneMoisture: 64
      },
      nutrients: {
        saltLoad: 54
      }
    }
  }), 'feed_stabilize_uptake');

  assert.ok(Number(effects.care.nutrients.saltLoad || 0) <= 1, 'uptake stabilization should add at most a minimal salt load');
  assert.ok(Number(effects.care.nutrients.micro || 0) >= 3, 'uptake stabilization should gently improve micro support');
  assert.ok(Number(effects.status.nutrition || 0) >= 2, 'uptake stabilization should gently support nutrition');
  assert.ok(Number(effects.status.stress || 0) < 0, 'uptake stabilization should slightly calm stress');
})();

(function testHygieneRoundStaysOffWaterAndNutrients() {
  const effects = careMethods.deriveCareMethodDirectEffects(buildState({
    status: {
      stress: 38,
      risk: 44
    }
  }), 'routine_hygiene_round');

  assert.ok(Number(effects.status.risk || 0) < 0, 'hygiene round should lower risk a little');
  assert.ok(Number(effects.status.stress || 0) <= 0, 'hygiene round should not raise stress');
  assert.ok(!effects.care.water, 'hygiene round should not directly change water values');
  assert.ok(!effects.care.nutrients, 'hygiene round should not directly change nutrient values');
})();

(function testRootZoneReliefDoesNotCountAsRegularWatering() {
  const plan = careMethods.buildCareMethodExecutionPlan(buildState(), careMethods.getCareMethodById('water_relieve_root_zone'));
  assert.ok(plan, 'root-zone relief should still build an execution plan');
  assert.strictEqual(plan.mode, 'direct', 'root-zone relief should run directly now');
  assert.strictEqual(Boolean(plan.trackingFlags && plan.trackingFlags.countsAsWatering), false, 'root-zone relief should not count like a normal watering method');
})();

(function testSpecialCaseAftercareUsesMethodSpecificCopy() {
  const rootState = buildState({
    care: {
      water: {
        rootZoneMoisture: 84,
        overwateringPressure: 44
      },
      nutrients: {
        saltLoad: 58
      }
    }
  });
  const rootPlan = careMethods.buildCareMethodExecutionPlan(rootState, careMethods.getCareMethodById('water_relieve_root_zone'));
  const rootFeedback = global.GrowSimCareModel.getCareActionFeedback(rootState, rootPlan.actionLike, {
    deltaSummary: rootPlan.actionLike.effects.immediate
  });
  assert.ok(
    ['careStudio.feedback.rootZoneRelief', 'careStudio.feedback.rootZoneReliefLimited'].includes(rootFeedback.messageKey),
    'root-zone relief should use method-specific aftercare copy'
  );

  const uptakeState = buildState({
    status: { stress: 42 },
    care: {
      nutrients: { saltLoad: 52 }
    }
  });
  const uptakePlan = careMethods.buildCareMethodExecutionPlan(uptakeState, careMethods.getCareMethodById('feed_stabilize_uptake'));
  const uptakeFeedback = global.GrowSimCareModel.getCareActionFeedback(uptakeState, uptakePlan.actionLike, {
    deltaSummary: uptakePlan.actionLike.effects.immediate
  });
  assert.strictEqual(uptakeFeedback.messageKey, 'careStudio.feedback.uptakeStabilized', 'uptake stabilization should use method-specific aftercare copy');

  const hygieneState = buildState({
    status: { risk: 46, stress: 36 }
  });
  const hygienePlan = careMethods.buildCareMethodExecutionPlan(hygieneState, careMethods.getCareMethodById('routine_hygiene_round'));
  const hygieneFeedback = global.GrowSimCareModel.getCareActionFeedback(hygieneState, hygienePlan.actionLike, {
    deltaSummary: hygienePlan.actionLike.effects.immediate
  });
  assert.strictEqual(hygieneFeedback.messageKey, 'careStudio.feedback.hygieneSettled', 'hygiene round should use method-specific aftercare copy');
})();

(function testExecutionPlanUsesDirectModeForConvertedMethods() {
  const plan = careMethods.buildCareMethodExecutionPlan(buildState(), careMethods.getCareMethodById('feed_light_base'));
  assert.ok(plan, 'execution plan should be created');
  assert.strictEqual(plan.mode, 'direct', 'converted feed method should run directly');
  assert.ok(plan.directEffects && plan.directEffects.care && plan.directEffects.care.nutrients, 'direct execution plan should carry nutrient deltas');
})();

(function testUnknownMethodFailsSafely() {
  const availability = careMethods.getCareMethodAvailability(buildState(), 'missing_method');
  assert.strictEqual(availability.ok, false, 'missing method should fail safely');
})();

console.log('care methods tests passed');
