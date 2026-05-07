'use strict';

(function initCareMethods(globalScope) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, toNumber(value, min)));
  }

  function buildForecastDelta(key, value, tone) {
    const rounded = Math.round(toNumber(value, 0));
    if (!rounded) {
      return null;
    }
    return {
      key,
      labelKey: `careStudio.delta.${key}`,
      value: rounded,
      direction: rounded > 0 ? 'up' : 'down',
      tone: tone || 'neutral'
    };
  }

  function round2(value) {
    return Math.round(toNumber(value, 0) * 100) / 100;
  }

  function clampInt(value, min, max) {
    return Math.round(clamp(value, min, max));
  }

  function getRootState(state) {
    return state && typeof state === 'object' ? state : {};
  }

  function getCareApi() {
    const api = globalScope.GrowSimCareModel;
    return api && typeof api === 'object' ? api : null;
  }

  function getNormalizedCareState(state) {
    const rootState = getRootState(state);
    const careApi = getCareApi();
    if (careApi && typeof careApi.normalizeCareState === 'function') {
      return careApi.normalizeCareState(rootState.care, rootState);
    }
    return rootState.care && typeof rootState.care === 'object' ? clone(rootState.care) : {};
  }

  function getCareDiagnosis(state, care) {
    const careApi = getCareApi();
    if (careApi && typeof careApi.getCareDiagnosis === 'function') {
      return careApi.getCareDiagnosis({
        ...getRootState(state),
        care: care || getNormalizedCareState(state)
      });
    }
    return null;
  }

  function getCareTrend(state, care) {
    const careApi = getCareApi();
    if (careApi && typeof careApi.deriveCareTrendSummary === 'function') {
      return careApi.deriveCareTrendSummary({
        ...getRootState(state),
        care: care || getNormalizedCareState(state)
      });
    }
    return null;
  }

  function getStatus(state) {
    const rootState = getRootState(state);
    return rootState.status && typeof rootState.status === 'object' ? rootState.status : {};
  }

  function getPlant(state) {
    const rootState = getRootState(state);
    return rootState.plant && typeof rootState.plant === 'object' ? rootState.plant : {};
  }

  function getPhaseLabel(state) {
    const plant = getPlant(state);
    const phase = String(plant.phase || '').trim().toLowerCase();
    const stageIndex = Math.max(0, Math.floor(toNumber(plant.stageIndex, 0)));
    if (phase.includes('late')) return 'late_flower';
    if (phase.includes('flower') || stageIndex >= 7) return 'flower';
    if (phase.includes('stretch') || stageIndex >= 5) return 'stretch';
    if (phase.includes('seedling') || stageIndex <= 1) return 'seedling';
    return 'vegetative';
  }

  function getAverageNutrition(nutrients) {
    const safeNutrients = nutrients && typeof nutrients === 'object' ? nutrients : {};
    return (
      toNumber(safeNutrients.n, 0)
      + toNumber(safeNutrients.p, 0)
      + toNumber(safeNutrients.k, 0)
      + toNumber(safeNutrients.micro, 0)
    ) / 4;
  }

  function getPhaseNutritionProfile(state) {
    const phaseLabel = getPhaseLabel(state);
    if (phaseLabel === 'late_flower') return { n: 0.72, p: 1.02, k: 1.1, micro: 0.88 };
    if (phaseLabel === 'flower') return { n: 0.78, p: 1.05, k: 1.12, micro: 0.92 };
    if (phaseLabel === 'stretch') return { n: 0.96, p: 1, k: 1.02, micro: 0.96 };
    if (phaseLabel === 'seedling') return { n: 0.82, p: 0.84, k: 0.82, micro: 0.9 };
    return { n: 1.08, p: 0.92, k: 0.94, micro: 0.96 };
  }

  function buildTrackingFlags(method) {
    const category = String(method && method.category || '').trim().toLowerCase();
    const methodId = String(method && method.id || '').trim().toLowerCase();
    return {
      legacyCategory: category,
      methodType: String(method && method.type || 'observe'),
      countsAsWatering: category === 'watering' && methodId !== 'water_relieve_root_zone',
      countsAsFeeding: category === 'fertilizing',
      countsAsCare: true
    };
  }

  function buildMethodEffectsBundle(status, care, routine, meta = {}) {
    return {
      status: status && typeof status === 'object' ? status : {},
      care: care && typeof care === 'object' ? care : {},
      routine: routine && typeof routine === 'object' ? routine : {},
      meta: meta && typeof meta === 'object' ? meta : {}
    };
  }

  function mapMethodIntensityToLegacyIntensity(intensity) {
    const safeIntensity = String(intensity || '').trim().toLowerCase();
    if (safeIntensity === 'none') return 'low';
    if (safeIntensity === 'light') return 'low';
    if (safeIntensity === 'moderate') return 'medium';
    if (safeIntensity === 'strong') return 'high';
    return safeIntensity || 'medium';
  }

  function deriveWaterMethodEffects(state, method) {
    const care = getNormalizedCareState(state);
    const diagnosis = getCareDiagnosis(state, care);
    const trend = getCareTrend(state, care);
    const water = care && care.water ? care.water : {};
    const status = getStatus(state);
    const rootZoneMoisture = toNumber(water.rootZoneMoisture, 0);
    const surfaceMoisture = toNumber(water.surfaceMoisture, 0);
    const substrateMoisture = toNumber(water.substrateMoisture, 0);
    const dryStressPressure = toNumber(water.dryStressPressure, 0);
    const overwateringPressure = toNumber(water.overwateringPressure, 0);
    const isWetRoot = rootZoneMoisture >= 78;
    const isDryRoot = rootZoneMoisture <= 44;
    const surfaceDryness = clamp((58 - surfaceMoisture) / 22, 0.35, 1.25);
    const rootReadiness = clamp((76 - rootZoneMoisture) / 26, 0.3, 1.2);
    const dryStressFactor = clamp(1 + (dryStressPressure / 90), 0.95, 1.35);
    const trendDryingBonus = trend && trend.key === 'root_zone_drying' ? 1.08 : 1;
    const trendWetPenalty = trend && trend.key === 'root_zone_staying_wet' ? 0.72 : 1;

    if (method.id === 'water_check_pot_weight') {
      return buildMethodEffectsBundle(
        {
          stress: toNumber(status.stress, 0) >= 30 ? -1 : 0,
          risk: (diagnosis && (diagnosis.primaryFocus === 'water' || diagnosis.primaryFocus === 'rootZone')) ? -1 : 0
        },
        {},
        { potWeightCheck: true },
        { confidence: { water: 6 } }
      );
    }

    if (method.id === 'water_relieve_root_zone') {
      const saltLoad = toNumber(care && care.nutrients && care.nutrients.saltLoad, 0);
      const pressureLevel = clampInt(
        (rootZoneMoisture >= 80 ? 2 : (rootZoneMoisture >= 72 ? 1 : 0))
          + (overwateringPressure >= 40 ? 2 : (overwateringPressure >= 26 ? 1 : 0))
          + (saltLoad >= 56 ? 1 : 0)
          + (diagnosis && (diagnosis.primaryFocus === 'rootZone' || diagnosis.primaryFocus === 'saltLoad') ? 1 : 0)
          + (trend && (trend.key === 'root_zone_staying_wet' || trend.key === 'risk_rising') ? 1 : 0),
        0,
        6
      );
      const needed = pressureLevel >= 2;
      const saltRelief = needed ? -clampInt(2 + (pressureLevel / 2), 1, 4) : 0;
      const pressureRelief = needed ? -clampInt(2 + (pressureLevel / 1.8), 2, 5) : 0;
      const riskRelief = needed ? -clampInt(1 + (pressureLevel / 2.2), 1, 3) : 1;
      const stressRelief = needed ? -clampInt(pressureLevel >= 4 ? 2 : 1, 0, 2) : 0;
      const surfaceGain = needed && surfaceMoisture <= 34 ? 2 : (needed && surfaceMoisture <= 46 ? 1 : 0);
      const substrateGain = needed && substrateMoisture <= 42 ? 2 : (surfaceGain > 0 ? 1 : 0);
      const rootGain = needed && rootZoneMoisture <= 52 ? 1 : 0;
      const waterGain = surfaceGain + substrateGain + rootGain;
      return buildMethodEffectsBundle(
        {
          water: waterGain,
          stress: stressRelief,
          risk: riskRelief,
          health: needed && pressureLevel >= 4 ? 1 : 0
        },
        {
          water: {
            substrateMoisture: substrateGain,
            surfaceMoisture: surfaceGain,
            rootZoneMoisture: rootGain,
            dryStressPressure: needed && dryStressPressure >= 46 ? -1 : 0,
            overwateringPressure: pressureRelief
          },
          nutrients: {
            saltLoad: saltRelief
          }
        },
        {},
        { ...buildTrackingFlags(method), needed }
      );
    }

    if (method.id === 'water_moisten_surface') {
      const rootPenalty = isWetRoot ? 0.3 : (rootZoneMoisture >= 70 ? 0.62 : 1);
      const surfaceGain = clampInt(10 * surfaceDryness * rootPenalty, 4, 12);
      const substrateGain = clampInt(surfaceGain * 0.42, 1, 5);
      const rootGain = clampInt(surfaceGain * (isWetRoot ? 0.05 : 0.14), 0, 2);
      const waterGain = clampInt((surfaceGain * 0.45) + (rootGain * 0.4), 3, 8);
      const dryRelief = clampInt((surfaceGain / 4) + (dryStressPressure >= 40 ? 1 : 0), 1, 3);
      const overwaterDelta = isWetRoot ? 1 : 0;
      return buildMethodEffectsBundle(
        {
          water: waterGain,
          stress: dryStressPressure >= 30 ? -1 : 0,
          risk: overwaterDelta
        },
        {
          water: {
            substrateMoisture: substrateGain,
            surfaceMoisture: surfaceGain,
            rootZoneMoisture: rootGain,
            dryStressPressure: -dryRelief,
            overwateringPressure: overwaterDelta
          }
        },
        {},
        buildTrackingFlags(method)
      );
    }

    if (method.id === 'water_even_watering') {
      const readiness = clamp(rootReadiness * surfaceDryness * dryStressFactor * trendDryingBonus * trendWetPenalty, 0.52, 1.28);
      const surfaceGain = clampInt(13 * readiness, 10, 16);
      const rootGain = clampInt(8 * readiness, 6, 10);
      const substrateGain = clampInt((surfaceGain + rootGain) * 0.7, 9, 15);
      const waterGain = clampInt((surfaceGain * 0.55) + (rootGain * 0.7), 10, 16);
      const dryRelief = clampInt(4 + (dryStressPressure >= 36 ? 2 : 0), 3, 6);
      const overwaterDelta = clampInt(
        1
          + (rootZoneMoisture >= 72 ? 2 : 0)
          + (overwateringPressure >= 32 ? 1 : 0),
        1,
        4
      );
      const riskDelta = clampInt(overwaterDelta - (rootZoneMoisture <= 62 ? 1 : 0), 0, 4);
      return buildMethodEffectsBundle(
        {
          water: waterGain,
          health: readiness >= 1 ? 1 : 0,
          stress: -clampInt(dryRelief / 2, 1, 3),
          risk: riskDelta,
          growth: readiness >= 1 ? 0.08 : 0.04
        },
        {
          water: {
            substrateMoisture: substrateGain,
            surfaceMoisture: surfaceGain,
            rootZoneMoisture: rootGain,
            dryStressPressure: -dryRelief,
            overwateringPressure: overwaterDelta
          }
        },
        {},
        buildTrackingFlags(method)
      );
    }

    if (method.id === 'water_normal_watering') {
      const readiness = clamp(rootReadiness * dryStressFactor * trendDryingBonus, 0.48, 1.34);
      const surfaceGain = clampInt(18 * readiness, 15, 22);
      const rootGain = clampInt(14 * readiness, 10, 18);
      const substrateGain = clampInt((surfaceGain + rootGain) * 0.78, 14, 21);
      const waterGain = clampInt((surfaceGain * 0.5) + (rootGain * 0.78), 14, 20);
      const dryRelief = clampInt(6 + (dryStressPressure >= 40 ? 3 : 0), 5, 9);
      const overwaterDelta = clampInt(
        2
          + (rootZoneMoisture >= 74 ? 2 : 0)
          + (rootZoneMoisture >= 80 ? 2 : 0)
          + (overwateringPressure >= 34 ? 2 : 0),
        2,
        8
      );
      const riskDelta = clampInt(overwaterDelta - (isDryRoot ? 1 : 0), 1, 8);
      return buildMethodEffectsBundle(
        {
          water: waterGain,
          health: readiness >= 0.95 ? 1 : 0,
          stress: -clampInt(dryRelief / 2, 2, 4),
          risk: riskDelta,
          growth: readiness >= 1 ? 0.12 : 0.05
        },
        {
          water: {
            substrateMoisture: substrateGain,
            surfaceMoisture: surfaceGain,
            rootZoneMoisture: rootGain,
            dryStressPressure: -dryRelief,
            overwateringPressure: overwaterDelta
          }
        },
        {},
        buildTrackingFlags(method)
      );
    }

    return buildMethodEffectsBundle(
      method.directEffects && method.directEffects.status,
      method.directEffects && method.directEffects.care,
      method.directEffects && method.directEffects.routine,
      buildTrackingFlags(method)
    );
  }

  function deriveFeedMethodEffects(state, method) {
    const care = getNormalizedCareState(state);
    const diagnosis = getCareDiagnosis(state, care);
    const trend = getCareTrend(state, care);
    const status = getStatus(state);
    const water = care && care.water ? care.water : {};
    const nutrients = care && care.nutrients ? care.nutrients : {};
    const rootZoneMoisture = toNumber(water.rootZoneMoisture, 0);
    const saltLoad = toNumber(nutrients.saltLoad, 0);
    const nutritionLevel = toNumber(status.nutrition, getAverageNutrition(nutrients));
    const stress = toNumber(status.stress, 0);
    const phaseProfile = getPhaseNutritionProfile(state);
    const uptakeFactor = clamp(
      1
        - (saltLoad >= 60 ? 0.28 : (saltLoad >= 48 ? 0.14 : 0))
        - (rootZoneMoisture <= 36 ? 0.18 : 0)
        - (rootZoneMoisture >= 78 ? 0.2 : 0)
        - (stress >= 58 ? 0.14 : 0)
        + (trend && trend.key === 'nutrition_depleting' ? 0.08 : 0),
      0.45,
      1.08
    );

    if (method.id === 'feed_check_supply') {
      return buildMethodEffectsBundle(
        {
          stress: stress >= 28 ? -1 : 0,
          risk: (diagnosis && diagnosis.primaryFocus === 'nutrition') ? -1 : 0
        },
        {},
        { leafCheck: true },
        { ...buildTrackingFlags(method), confidence: { nutrition: 6 } }
      );
    }

    if (method.id === 'feed_light_base') {
      const nutritionGain = clampInt(7 * uptakeFactor, 5, 8);
      const saltDelta = clampInt(2 + (saltLoad >= 46 ? 1 : 0), 1, 3);
      const riskDelta = clampInt((saltLoad >= 54 ? 1 : 0) + (rootZoneMoisture <= 34 || rootZoneMoisture >= 80 ? 1 : 0), 0, 2);
      return buildMethodEffectsBundle(
        {
          nutrition: nutritionGain,
          stress: uptakeFactor >= 0.9 ? -1 : 0,
          risk: riskDelta,
          growth: uptakeFactor >= 0.95 ? 0.08 : 0.03
        },
        {
          nutrients: {
            n: clampInt(nutritionGain * 0.9, 3, 7),
            p: clampInt(nutritionGain * 0.75, 3, 6),
            k: clampInt(nutritionGain * 0.8, 3, 6),
            micro: clampInt(nutritionGain * 0.7, 3, 5),
            saltLoad: saltDelta
          }
        },
        {},
        buildTrackingFlags(method)
      );
    }

    if (method.id === 'feed_stabilize_uptake') {
      const saltPenalty = saltLoad >= 64 ? 0.28 : (saltLoad >= 52 ? 0.16 : 0);
      const moisturePenalty = rootZoneMoisture <= 34 || rootZoneMoisture >= 80 ? 0.18 : 0;
      const recoveryBonus = diagnosis && (diagnosis.primaryFocus === 'nutrition' || diagnosis.primaryFocus === 'stress' || diagnosis.primaryFocus === 'saltLoad')
        ? 0.1
        : 0;
      const stabilizationFactor = clamp(0.92 - saltPenalty - moisturePenalty + recoveryBonus, 0.45, 1.08);
      const microGain = clampInt(5 * stabilizationFactor, 3, 6);
      const nutritionGain = clampInt(4 * stabilizationFactor, 2, 5);
      const saltDelta = clampInt(saltLoad >= 60 ? 0 : 1, 0, 1);
      const stressRelief = clampInt(stress >= 48 ? 3 : 2, 1, 3);
      const riskRelief = clampInt((saltLoad >= 52 || rootZoneMoisture >= 78 || rootZoneMoisture <= 36) ? 2 : 1, 1, 2);
      return buildMethodEffectsBundle(
        {
          nutrition: nutritionGain,
          stress: -stressRelief,
          risk: -riskRelief,
          growth: stabilizationFactor >= 0.84 ? 0.05 : 0.02
        },
        {
          nutrients: {
            n: clampInt(nutritionGain * 0.45, 1, 3),
            p: clampInt(nutritionGain * 0.4, 1, 2),
            k: clampInt(nutritionGain * 0.45, 1, 3),
            micro: microGain,
            saltLoad: saltDelta
          }
        },
        {},
        buildTrackingFlags(method)
      );
    }

    if (method.id === 'feed_phase_supply') {
      const nutritionGain = clampInt(10 * uptakeFactor, 8, 12);
      const saltDelta = clampInt(4 + (saltLoad >= 42 ? 1 : 0) + (stress >= 52 ? 1 : 0), 3, 6);
      const riskDelta = clampInt(1 + (saltLoad >= 50 ? 2 : 0) + (stress >= 58 ? 1 : 0) + (rootZoneMoisture >= 78 ? 1 : 0), 1, 5);
      return buildMethodEffectsBundle(
        {
          nutrition: nutritionGain,
          risk: riskDelta,
          stress: uptakeFactor >= 1 ? -1 : 0,
          growth: uptakeFactor >= 0.9 ? 0.14 : 0.05
        },
        {
          nutrients: {
            n: clampInt(nutritionGain * phaseProfile.n, 4, 12),
            p: clampInt(nutritionGain * phaseProfile.p, 4, 12),
            k: clampInt(nutritionGain * phaseProfile.k, 4, 13),
            micro: clampInt(nutritionGain * phaseProfile.micro, 3, 10),
            saltLoad: saltDelta
          }
        },
        {},
        buildTrackingFlags(method)
      );
    }

    if (method.id === 'feed_protect_salt_load') {
      const saltRelief = saltLoad >= 58 ? 3 : (saltLoad >= 42 ? 2 : 1);
      const riskRelief = saltLoad >= 58 ? 3 : 2;
      const stressRelief = stress >= 42 ? 2 : 1;
      return buildMethodEffectsBundle(
        {
          stress: -stressRelief,
          risk: -riskRelief,
          growth: 0.04
        },
        {
          nutrients: {
            saltLoad: -saltRelief
          }
        },
        {},
        buildTrackingFlags(method)
      );
    }

    return buildMethodEffectsBundle(
      method.directEffects && method.directEffects.status,
      method.directEffects && method.directEffects.care,
      method.directEffects && method.directEffects.routine,
      buildTrackingFlags(method)
    );
  }

  function deriveRoutineMethodEffects(state, method) {
    const care = getNormalizedCareState(state);
    const diagnosis = getCareDiagnosis(state, care);
    const status = getStatus(state);
    const water = care && care.water ? care.water : {};
    const uncertainty = Math.abs(toNumber(water.surfaceMoisture, 0) - toNumber(water.rootZoneMoisture, 0));
    const stress = toNumber(status.stress, 0);
    const risk = toNumber(status.risk, 0);

    if (method.id === 'routine_check_leaves') {
      return buildMethodEffectsBundle(
        {
          stress: stress >= 28 ? -1 : 0,
          risk: (diagnosis && diagnosis.primaryFocus === 'stress') || risk >= 28 ? -1 : 0
        },
        {},
        { leafCheck: true },
        { ...buildTrackingFlags(method), confidence: { stress: 6 } }
      );
    }

    if (method.id === 'routine_estimate_pot_weight') {
      return buildMethodEffectsBundle(
        {
          risk: uncertainty >= 14 ? -1 : 0
        },
        {},
        { potWeightCheck: true },
        { ...buildTrackingFlags(method), confidence: { water: 5 } }
      );
    }

    if (method.id === 'routine_check_substrate') {
      return buildMethodEffectsBundle(
        {
          risk: uncertainty >= 16 ? -1 : 0,
          stress: stress >= 48 ? -1 : 0
        },
        {},
        { substrateCheck: true },
        { ...buildTrackingFlags(method), confidence: { rootZone: 6 } }
      );
    }

    if (method.id === 'routine_gentle_stress_check') {
      const stressRelief = stress >= 58 ? 4 : (stress >= 36 ? 3 : 2);
      const riskRelief = risk >= 48 ? 2 : 1;
      return buildMethodEffectsBundle(
        {
          stress: -stressRelief,
          risk: -riskRelief
        },
        {},
        {},
        buildTrackingFlags(method)
      );
    }

    if (method.id === 'routine_hygiene_round') {
      const hygieneNeed = clampInt(
        (risk >= 42 ? 2 : (risk >= 28 ? 1 : 0))
          + (stress >= 48 ? 1 : 0)
          + (diagnosis && (diagnosis.primaryFocus === 'risk' || diagnosis.primaryFocus === 'stress') ? 1 : 0),
        0,
        4
      );
      const riskRelief = -clampInt(2 + hygieneNeed, 2, 4);
      const stressRelief = -clampInt(stress >= 54 ? 2 : (stress >= 32 ? 1 : 0), 0, 2);
      return buildMethodEffectsBundle(
        {
          risk: riskRelief,
          stress: stressRelief,
          health: hygieneNeed >= 2 ? 1 : 0,
          growth: 0.03
        },
        {},
        {},
        buildTrackingFlags(method)
      );
    }

    if (method.id === 'routine_rotate_plant') {
      return buildMethodEffectsBundle(
        {
          growth: stress <= 36 ? 0.12 : 0.06,
          stress: stress >= 60 ? 1 : -1,
          risk: stress >= 60 ? 1 : -1
        },
        {},
        {},
        buildTrackingFlags(method)
      );
    }

    return buildMethodEffectsBundle(
      method.directEffects && method.directEffects.status,
      method.directEffects && method.directEffects.care,
      method.directEffects && method.directEffects.routine,
      buildTrackingFlags(method)
    );
  }

  function deriveCareMethodDirectEffects(state, method) {
    const safeMethod = getCareMethodById(method && typeof method === 'object' ? method.id : method)
      || (method && typeof method === 'object' ? clone(method) : null);
    if (!safeMethod) {
      return buildMethodEffectsBundle({}, {}, {}, {});
    }
    if (safeMethod.category === 'watering') return deriveWaterMethodEffects(state, safeMethod);
    if (safeMethod.category === 'fertilizing') return deriveFeedMethodEffects(state, safeMethod);
    return deriveRoutineMethodEffects(state, safeMethod);
  }

  const CARE_METHODS = Object.freeze([
    {
      id: 'water_check_pot_weight',
      tab: 'water',
      category: 'watering',
      type: 'check',
      intensity: 'none',
      riskProfile: 'safe',
      cooldownHours: 4,
      labelKey: 'careMethod.water.checkPotWeight.label',
      shortKey: 'careMethod.water.checkPotWeight.short',
      descriptionKey: 'careMethod.water.checkPotWeight.description',
      successKey: 'careMethod.water.checkPotWeight.success',
      directEffects: {
        status: { stress: -1, risk: -1 },
        routine: { potWeightCheck: true }
      }
    },
    {
      id: 'water_moisten_surface',
      tab: 'water',
      category: 'watering',
      type: 'correct',
      intensity: 'light',
      riskProfile: 'safe',
      cooldownHours: 6,
      labelKey: 'careMethod.water.moistenSurface.label',
      shortKey: 'careMethod.water.moistenSurface.short',
      descriptionKey: 'careMethod.water.moistenSurface.description',
      successKey: 'careMethod.water.moistenSurface.success'
    },
    {
      id: 'water_even_watering',
      tab: 'water',
      category: 'watering',
      type: 'stabilize',
      intensity: 'moderate',
      riskProfile: 'balanced',
      cooldownHours: 10,
      labelKey: 'careMethod.water.evenWatering.label',
      shortKey: 'careMethod.water.evenWatering.short',
      descriptionKey: 'careMethod.water.evenWatering.description',
      successKey: 'careMethod.water.evenWatering.success'
    },
    {
      id: 'water_normal_watering',
      tab: 'water',
      category: 'watering',
      type: 'stabilize',
      intensity: 'strong',
      riskProfile: 'elevated',
      cooldownHours: 14,
      labelKey: 'careMethod.water.normalWatering.label',
      shortKey: 'careMethod.water.normalWatering.short',
      descriptionKey: 'careMethod.water.normalWatering.description',
      successKey: 'careMethod.water.normalWatering.success'
    },
    {
      id: 'water_relieve_root_zone',
      tab: 'water',
      category: 'watering',
      type: 'stabilize',
      intensity: 'moderate',
      riskProfile: 'restricted',
      cooldownHours: 12,
      labelKey: 'careMethod.water.relieveRootZone.label',
      shortKey: 'careMethod.water.relieveRootZone.short',
      descriptionKey: 'careMethod.water.relieveRootZone.description',
      successKey: 'careMethod.water.relieveRootZone.success'
    },
    {
      id: 'feed_check_supply',
      tab: 'feed',
      category: 'fertilizing',
      type: 'check',
      intensity: 'none',
      riskProfile: 'safe',
      cooldownHours: 4,
      labelKey: 'careMethod.feed.checkSupply.label',
      shortKey: 'careMethod.feed.checkSupply.short',
      descriptionKey: 'careMethod.feed.checkSupply.description',
      successKey: 'careMethod.feed.checkSupply.success',
      directEffects: {
        status: { stress: -1, risk: -1 },
        routine: { leafCheck: true }
      }
    },
    {
      id: 'feed_light_base',
      tab: 'feed',
      category: 'fertilizing',
      type: 'supply',
      intensity: 'light',
      riskProfile: 'safe',
      cooldownHours: 18,
      labelKey: 'careMethod.feed.lightBase.label',
      shortKey: 'careMethod.feed.lightBase.short',
      descriptionKey: 'careMethod.feed.lightBase.description',
      successKey: 'careMethod.feed.lightBase.success'
    },
    {
      id: 'feed_phase_supply',
      tab: 'feed',
      category: 'fertilizing',
      type: 'supply',
      intensity: 'moderate',
      riskProfile: 'balanced',
      cooldownHours: 24,
      labelKey: 'careMethod.feed.phaseSupply.label',
      shortKey: 'careMethod.feed.phaseSupply.short',
      descriptionKey: 'careMethod.feed.phaseSupply.description',
      successKey: 'careMethod.feed.phaseSupply.success'
    },
    {
      id: 'feed_stabilize_uptake',
      tab: 'feed',
      category: 'fertilizing',
      type: 'stabilize',
      intensity: 'light',
      riskProfile: 'safe',
      cooldownHours: 12,
      labelKey: 'careMethod.feed.stabilizeUptake.label',
      shortKey: 'careMethod.feed.stabilizeUptake.short',
      descriptionKey: 'careMethod.feed.stabilizeUptake.description',
      successKey: 'careMethod.feed.stabilizeUptake.success'
    },
    {
      id: 'feed_protect_salt_load',
      tab: 'feed',
      category: 'fertilizing',
      type: 'avoid',
      intensity: 'none',
      riskProfile: 'safe',
      cooldownHours: 8,
      labelKey: 'careMethod.feed.protectSaltLoad.label',
      shortKey: 'careMethod.feed.protectSaltLoad.short',
      descriptionKey: 'careMethod.feed.protectSaltLoad.description',
      successKey: 'careMethod.feed.protectSaltLoad.success'
    },
    {
      id: 'routine_check_leaves',
      tab: 'routine',
      category: 'training',
      type: 'check',
      intensity: 'none',
      riskProfile: 'safe',
      cooldownHours: 4,
      labelKey: 'careMethod.routine.checkLeaves.label',
      shortKey: 'careMethod.routine.checkLeaves.short',
      descriptionKey: 'careMethod.routine.checkLeaves.description',
      successKey: 'careMethod.routine.checkLeaves.success',
      directEffects: {
        status: { stress: -1, risk: -1 },
        routine: { leafCheck: true }
      }
    },
    {
      id: 'routine_estimate_pot_weight',
      tab: 'routine',
      category: 'training',
      type: 'check',
      intensity: 'none',
      riskProfile: 'safe',
      cooldownHours: 4,
      labelKey: 'careMethod.routine.estimatePotWeight.label',
      shortKey: 'careMethod.routine.estimatePotWeight.short',
      descriptionKey: 'careMethod.routine.estimatePotWeight.description',
      successKey: 'careMethod.routine.estimatePotWeight.success',
      directEffects: {
        status: { risk: -1 },
        routine: { potWeightCheck: true }
      }
    },
    {
      id: 'routine_check_substrate',
      tab: 'routine',
      category: 'training',
      type: 'check',
      intensity: 'none',
      riskProfile: 'safe',
      cooldownHours: 4,
      labelKey: 'careMethod.routine.checkSubstrate.label',
      shortKey: 'careMethod.routine.checkSubstrate.short',
      descriptionKey: 'careMethod.routine.checkSubstrate.description',
      successKey: 'careMethod.routine.checkSubstrate.success',
      directEffects: {
        status: { risk: -1 },
        routine: { substrateCheck: true }
      }
    },
    {
      id: 'routine_rotate_plant',
      tab: 'routine',
      category: 'training',
      type: 'stabilize',
      intensity: 'light',
      riskProfile: 'safe',
      cooldownHours: 8,
      labelKey: 'careMethod.routine.rotatePlant.label',
      shortKey: 'careMethod.routine.rotatePlant.short',
      descriptionKey: 'careMethod.routine.rotatePlant.description',
      successKey: 'careMethod.routine.rotatePlant.success',
      directEffects: {
        status: { growth: 0.1, stress: -1, risk: -1 }
      }
    },
    {
      id: 'routine_hygiene_round',
      tab: 'routine',
      category: 'environment',
      type: 'stabilize',
      intensity: 'light',
      riskProfile: 'safe',
      cooldownHours: 8,
      labelKey: 'careMethod.routine.hygieneRound.label',
      shortKey: 'careMethod.routine.hygieneRound.short',
      descriptionKey: 'careMethod.routine.hygieneRound.description',
      successKey: 'careMethod.routine.hygieneRound.success'
    },
    {
      id: 'routine_gentle_stress_check',
      tab: 'routine',
      category: 'environment',
      type: 'observe',
      intensity: 'light',
      riskProfile: 'safe',
      cooldownHours: 4,
      labelKey: 'careMethod.routine.gentleStressCheck.label',
      shortKey: 'careMethod.routine.gentleStressCheck.short',
      descriptionKey: 'careMethod.routine.gentleStressCheck.description',
      successKey: 'careMethod.routine.gentleStressCheck.success',
      directEffects: {
        status: { stress: -2, risk: -1 }
      }
    }
  ]);

  function getCareMethodDefinitions() {
    return CARE_METHODS.map((entry) => clone(entry));
  }

  function getCareMethodById(methodId) {
    const safeId = String(methodId || '').trim();
    if (!safeId) {
      return null;
    }
    const found = CARE_METHODS.find((entry) => entry.id === safeId);
    return found ? clone(found) : null;
  }

  function mapCareMethodToLegacyAction(methodId) {
    const method = getCareMethodById(methodId);
    return method && method.legacyFallbackActionId ? method.legacyFallbackActionId : null;
  }

  function buildActionLikeFromMethod(method, legacyAction, state) {
    const safeMethod = method && typeof method === 'object' ? method : {};
    const safeLegacyAction = legacyAction && typeof legacyAction === 'object' ? legacyAction : null;
    const derivedEffects = safeLegacyAction ? null : deriveCareMethodDirectEffects(state, safeMethod);
    const directStatus = derivedEffects && derivedEffects.status && typeof derivedEffects.status === 'object'
      ? derivedEffects.status
      : (safeMethod.directEffects && safeMethod.directEffects.status && typeof safeMethod.directEffects.status === 'object'
        ? safeMethod.directEffects.status
        : {});
    return {
      id: String(safeMethod.id || ''),
      category: String(safeMethod.category || (safeLegacyAction && safeLegacyAction.category) || 'environment'),
      intensity: String(safeLegacyAction && safeLegacyAction.intensity
        ? safeLegacyAction.intensity
        : mapMethodIntensityToLegacyIntensity(safeMethod.intensity)),
      label: String(safeMethod.id || ''),
      effects: safeLegacyAction && safeLegacyAction.effects
        ? clone(safeLegacyAction.effects)
        : {
          immediate: {
            water: toNumber(directStatus.water, 0),
            nutrition: toNumber(directStatus.nutrition, 0),
            health: toNumber(directStatus.health, 0),
            stress: toNumber(directStatus.stress, 0),
            risk: toNumber(directStatus.risk, 0),
            growth: toNumber(directStatus.growth, 0)
          }
        }
    };
  }

  function buildDiagnosticPreview(method, preview, labelKeys, messageKey) {
    const safePreview = preview && typeof preview === 'object' ? clone(preview) : null;
    if (!safePreview) {
      return safePreview;
    }
    safePreview.recommendation = {
      verdict: 'situational',
      labelKey: 'careStudio.preview.verdict.situational'
    };
    safePreview.benefit = Object.assign({}, safePreview.benefit, {
      level: 'low',
      score: 36
    });
    safePreview.risk = Object.assign({}, safePreview.risk, {
      level: 'low',
      labelKey: 'careStudio.risk.low',
      reasons: Array.isArray(labelKeys) ? labelKeys.slice(0, 2) : []
    });
    safePreview.buddyHintKey = messageKey || safePreview.buddyHintKey;
    safePreview.forecastDeltas = [
      buildForecastDelta('risk', -1, 'positive'),
      buildForecastDelta('stability', 2, 'positive')
    ].filter(Boolean);
    return safePreview;
  }

  function setPreviewRecommendation(preview, verdict) {
    const safePreview = preview && typeof preview === 'object' ? preview : null;
    if (!safePreview) {
      return safePreview;
    }
    const labelMap = {
      recommended: 'careStudio.preview.verdict.recommended',
      situational: 'careStudio.preview.verdict.situational',
      wait: 'careStudio.preview.verdict.wait',
      risky: 'careStudio.preview.verdict.risky',
      avoid: 'careStudio.preview.verdict.avoid',
      blocked: 'careStudio.preview.verdict.wait'
    };
    const safeVerdict = labelMap[verdict] ? verdict : 'situational';
    safePreview.recommendation = {
      verdict: safeVerdict,
      labelKey: labelMap[safeVerdict]
    };
    return safePreview;
  }

  function getMethodContext(state) {
    const care = getNormalizedCareState(state);
    return {
      care,
      water: care && care.water ? care.water : {},
      nutrients: care && care.nutrients ? care.nutrients : {},
      status: getStatus(state),
      diagnosis: getCareDiagnosis(state, care),
      trend: getCareTrend(state, care),
      averageNutrition: getAverageNutrition(care && care.nutrients ? care.nutrients : {})
    };
  }

  function getCareMethodPreview(state, method, options = {}) {
    const safeMethod = getCareMethodById(method && typeof method === 'object' ? method.id : method)
      || (method && typeof method === 'object' ? clone(method) : null);
    if (!safeMethod) {
      return null;
    }
    const legacyAction = options.legacyAction && typeof options.legacyAction === 'object'
      ? options.legacyAction
      : null;
    const careApi = globalScope.GrowSimCareModel;
    const actionLike = buildActionLikeFromMethod(safeMethod, legacyAction, state);
    const preview = careApi && typeof careApi.getCareActionPreview === 'function'
      ? careApi.getCareActionPreview(state, actionLike)
      : null;
    if (!preview) {
      return null;
    }

    const ctx = getMethodContext(state);
    const waterState = ctx.water;
    const nutrientState = ctx.nutrients;
    const statusState = ctx.status;
    const diagnosis = ctx.diagnosis;
    const trend = ctx.trend;
    const uncertainty = Math.abs(toNumber(waterState.surfaceMoisture, 0) - toNumber(waterState.rootZoneMoisture, 0));
    const uptakeReady = (
      toNumber(waterState.substrateMoisture, 0) >= 38
      && toNumber(waterState.substrateMoisture, 0) <= 72
      && toNumber(waterState.rootZoneMoisture, 0) >= 42
      && toNumber(waterState.rootZoneMoisture, 0) <= 76
      && toNumber(statusState.stress, 0) < 58
    );

    if (safeMethod.type === 'check') {
      const diagnosticPreview = buildDiagnosticPreview(
        safeMethod,
        preview,
        [safeMethod.category === 'fertilizing' ? 'careStudio.preview.reason.nutrientBufferLow' : 'careStudio.preview.reason.rootZoneReady'],
        safeMethod.category === 'fertilizing' ? 'careStudio.buddy.feedLight' : 'careStudio.buddy.monitorRoots'
      );
      let diagnosticVerdict = 'situational';
      if (safeMethod.id === 'water_check_pot_weight' && (uncertainty >= 14 || (diagnosis && (diagnosis.primaryFocus === 'water' || diagnosis.primaryFocus === 'rootZone')))) {
        diagnosticVerdict = 'recommended';
      } else if (safeMethod.id === 'feed_check_supply' && (ctx.averageNutrition <= 46 || toNumber(nutrientState.saltLoad, 0) >= 50 || (diagnosis && (diagnosis.primaryFocus === 'nutrition' || diagnosis.primaryFocus === 'saltLoad')))) {
        diagnosticVerdict = 'recommended';
      } else if (safeMethod.id === 'routine_check_leaves' && (toNumber(statusState.stress, 0) >= 30 || (diagnosis && (diagnosis.primaryFocus === 'stress' || diagnosis.primaryFocus === 'nutrition')))) {
        diagnosticVerdict = 'recommended';
      } else if (safeMethod.id === 'routine_estimate_pot_weight' && uncertainty >= 14) {
        diagnosticVerdict = 'recommended';
      } else if (safeMethod.id === 'routine_check_substrate' && (uncertainty >= 14 || (diagnosis && diagnosis.primaryFocus === 'rootZone'))) {
        diagnosticVerdict = 'recommended';
      }
      return setPreviewRecommendation(diagnosticPreview, diagnosticVerdict);
    }
    const derivedEffects = deriveCareMethodDirectEffects(state, safeMethod);
    const directStatus = derivedEffects && derivedEffects.status ? derivedEffects.status : {};
    const directCare = derivedEffects && derivedEffects.care ? derivedEffects.care : {};
    if (!legacyAction) {
      if (safeMethod.id === 'water_relieve_root_zone') {
        const water = directCare.water && typeof directCare.water === 'object' ? directCare.water : {};
        const nutrients = directCare.nutrients && typeof directCare.nutrients === 'object' ? directCare.nutrients : {};
        const risk = toNumber(directStatus.risk, 0);
        const pressure = toNumber(water.overwateringPressure, 0);
        preview.forecastDeltas = [
          buildForecastDelta('saltLoad', toNumber(nutrients.saltLoad, 0), toNumber(nutrients.saltLoad, 0) < 0 ? 'positive' : 'neutral'),
          buildForecastDelta('overwatering', pressure, pressure < 0 ? 'positive' : 'neutral'),
          buildForecastDelta('risk', risk, risk < 0 ? 'positive' : (risk > 0 ? 'warning' : 'neutral')),
          buildForecastDelta('stability', risk < 0 || pressure < 0 ? 3 : 1, 'positive')
        ].filter(Boolean);
        preview.recommendation = {
          verdict: risk < 0 || pressure < 0 ? 'situational' : 'avoid',
          labelKey: risk < 0 || pressure < 0 ? 'careStudio.preview.verdict.situational' : 'careStudio.preview.verdict.avoid'
        };
        if (
          toNumber(waterState.rootZoneMoisture, 0) >= 78
          || toNumber(waterState.overwateringPressure, 0) >= 36
          || toNumber(nutrientState.saltLoad, 0) >= 54
          || (trend && (trend.key === 'root_zone_staying_wet' || trend.key === 'risk_rising'))
        ) {
          setPreviewRecommendation(preview, 'recommended');
        }
        preview.buddyHintKey = 'careStudio.buddy.monitorRoots';
        return preview;
      }
      if (safeMethod.category === 'watering') {
        const water = directCare.water && typeof directCare.water === 'object' ? directCare.water : {};
        const dryStress = toNumber(water.dryStressPressure, 0);
        const overwatering = toNumber(water.overwateringPressure, 0);
        const risk = toNumber(directStatus.risk, 0);
        preview.forecastDeltas = [
          buildForecastDelta('moisture', toNumber(directStatus.water, 0), 'positive'),
          buildForecastDelta('dryStress', dryStress, dryStress < 0 ? 'positive' : 'warning'),
          buildForecastDelta('overwatering', overwatering, overwatering > 1 ? 'warning' : 'neutral'),
          buildForecastDelta('risk', risk, risk > 0 ? 'warning' : (risk < 0 ? 'positive' : 'neutral'))
        ].filter(Boolean);
        if (safeMethod.id === 'water_moisten_surface') {
          if (toNumber(waterState.rootZoneMoisture, 0) >= 76 || toNumber(waterState.overwateringPressure, 0) >= 30) {
            setPreviewRecommendation(preview, 'wait');
          } else if (toNumber(waterState.surfaceMoisture, 0) <= 28 && toNumber(waterState.rootZoneMoisture, 0) >= 48 && toNumber(waterState.rootZoneMoisture, 0) <= 72 && toNumber(waterState.dryStressPressure, 0) < 40) {
            setPreviewRecommendation(preview, 'recommended');
          } else if (toNumber(waterState.surfaceMoisture, 0) <= 36) {
            setPreviewRecommendation(preview, 'situational');
          } else {
            setPreviewRecommendation(preview, 'wait');
          }
        } else if (safeMethod.id === 'water_even_watering') {
          if (toNumber(waterState.rootZoneMoisture, 0) >= 76 || toNumber(waterState.overwateringPressure, 0) >= 32) {
            setPreviewRecommendation(preview, 'wait');
          } else if (toNumber(waterState.dryStressPressure, 0) >= 42 || toNumber(waterState.substrateMoisture, 0) <= 36) {
            setPreviewRecommendation(preview, 'recommended');
          } else if (toNumber(waterState.surfaceMoisture, 0) <= 34 && toNumber(waterState.rootZoneMoisture, 0) <= 70) {
            setPreviewRecommendation(preview, 'recommended');
          } else if (toNumber(waterState.substrateMoisture, 0) >= 52 && toNumber(waterState.rootZoneMoisture, 0) >= 58) {
            setPreviewRecommendation(preview, 'wait');
          } else {
            setPreviewRecommendation(preview, 'situational');
          }
        } else if (safeMethod.id === 'water_normal_watering') {
          if (toNumber(waterState.rootZoneMoisture, 0) >= 74 || toNumber(waterState.overwateringPressure, 0) >= 28) {
            setPreviewRecommendation(preview, 'risky');
          } else if (toNumber(waterState.dryStressPressure, 0) >= 48 || toNumber(waterState.rootZoneMoisture, 0) <= 42 || toNumber(waterState.substrateMoisture, 0) <= 34) {
            setPreviewRecommendation(preview, 'recommended');
          } else if (toNumber(waterState.surfaceMoisture, 0) <= 30 && toNumber(waterState.rootZoneMoisture, 0) <= 56) {
            setPreviewRecommendation(preview, 'situational');
          } else {
            setPreviewRecommendation(preview, 'wait');
          }
        }
      } else if (safeMethod.id === 'feed_stabilize_uptake') {
        const nutrients = directCare.nutrients && typeof directCare.nutrients === 'object' ? directCare.nutrients : {};
        preview.forecastDeltas = [
          buildForecastDelta('nutrition', toNumber(directStatus.nutrition, 0), 'positive'),
          buildForecastDelta('saltLoad', toNumber(nutrients.saltLoad, 0), toNumber(nutrients.saltLoad, 0) > 0 ? 'neutral' : 'positive'),
          buildForecastDelta('stress', toNumber(directStatus.stress, 0), 'positive'),
          buildForecastDelta('risk', toNumber(directStatus.risk, 0), 'positive')
        ].filter(Boolean);
        preview.recommendation = {
          verdict: 'situational',
          labelKey: 'careStudio.preview.verdict.situational'
        };
        if (
          toNumber(statusState.stress, 0) >= 36
          || toNumber(nutrientState.saltLoad, 0) >= 48
          || (diagnosis && ['nutrition', 'stress', 'saltLoad', 'rootZone'].includes(String(diagnosis.primaryFocus || '')))
        ) {
          setPreviewRecommendation(preview, 'recommended');
        }
        preview.buddyHintKey = 'careStudio.buddy.feedLight';
        return preview;
      } else if (safeMethod.category === 'fertilizing') {
        const nutrients = directCare.nutrients && typeof directCare.nutrients === 'object' ? directCare.nutrients : {};
        const saltLoad = toNumber(nutrients.saltLoad, 0);
        const nutrition = toNumber(directStatus.nutrition, 0);
        const risk = toNumber(directStatus.risk, 0);
        const growth = Math.round(toNumber(directStatus.growth, 0) * 10);
        preview.forecastDeltas = [
          buildForecastDelta('nutrition', nutrition, 'positive'),
          buildForecastDelta('saltLoad', saltLoad, saltLoad > 0 ? (saltLoad >= 4 ? 'warning' : 'neutral') : (saltLoad < 0 ? 'positive' : 'neutral')),
          buildForecastDelta('risk', risk, risk > 0 ? 'warning' : (risk < 0 ? 'positive' : 'neutral')),
          buildForecastDelta('growth', growth, growth > 0 ? 'positive' : 'neutral')
        ].filter(Boolean);
        if (safeMethod.id === 'feed_light_base') {
          if (toNumber(nutrientState.saltLoad, 0) >= 54 || toNumber(waterState.rootZoneMoisture, 0) >= 80) {
            setPreviewRecommendation(preview, 'wait');
          } else if (ctx.averageNutrition <= 42 && uptakeReady) {
            setPreviewRecommendation(preview, 'recommended');
          } else if (ctx.averageNutrition <= 50 && uptakeReady) {
            setPreviewRecommendation(preview, 'situational');
          } else {
            setPreviewRecommendation(preview, 'wait');
          }
        } else if (safeMethod.id === 'feed_phase_supply') {
          if (toNumber(nutrientState.saltLoad, 0) >= 54 || toNumber(waterState.rootZoneMoisture, 0) <= 36 || toNumber(waterState.rootZoneMoisture, 0) >= 78 || toNumber(statusState.stress, 0) >= 58) {
            setPreviewRecommendation(preview, 'risky');
          } else if (ctx.averageNutrition <= 30 && uptakeReady && ['stretch', 'flower'].includes(getPhaseLabel(state))) {
            setPreviewRecommendation(preview, 'recommended');
          } else if (ctx.averageNutrition <= 42 && uptakeReady) {
            setPreviewRecommendation(preview, 'situational');
          } else {
            setPreviewRecommendation(preview, 'wait');
          }
        }
      } else if (safeMethod.id === 'routine_rotate_plant') {
        preview.forecastDeltas = [
          buildForecastDelta('stress', toNumber(directStatus.stress, 0), toNumber(directStatus.stress, 0) <= 0 ? 'positive' : 'warning'),
          buildForecastDelta('stability', toNumber(directStatus.risk, 0) <= 0 ? 2 : -1, toNumber(directStatus.risk, 0) <= 0 ? 'positive' : 'warning'),
          buildForecastDelta('growth', Math.round(toNumber(directStatus.growth, 0) * 10), 'positive')
        ].filter(Boolean);
        if (toNumber(statusState.stress, 0) >= 54 || toNumber(statusState.risk, 0) >= 42) {
          setPreviewRecommendation(preview, 'wait');
        } else {
          setPreviewRecommendation(preview, 'situational');
        }
        return preview;
      } else if (safeMethod.id === 'routine_gentle_stress_check') {
        preview.forecastDeltas = [
          buildForecastDelta('stress', toNumber(directStatus.stress, 0), 'positive'),
          buildForecastDelta('risk', toNumber(directStatus.risk, 0), 'positive'),
          buildForecastDelta('stability', 2, 'positive')
        ].filter(Boolean);
        if (toNumber(statusState.stress, 0) >= 42 || toNumber(statusState.risk, 0) >= 36 || (trend && trend.key === 'stress_rising')) {
          setPreviewRecommendation(preview, 'recommended');
        } else {
          setPreviewRecommendation(preview, 'situational');
        }
        return preview;
      } else if (safeMethod.id === 'routine_hygiene_round') {
        preview.forecastDeltas = [
          buildForecastDelta('risk', toNumber(directStatus.risk, 0), 'positive'),
          buildForecastDelta('stress', toNumber(directStatus.stress, 0), toNumber(directStatus.stress, 0) < 0 ? 'positive' : 'neutral'),
          buildForecastDelta('stability', 3, 'positive')
        ].filter(Boolean);
        if (toNumber(statusState.risk, 0) >= 34 || toNumber(statusState.stress, 0) >= 46 || (diagnosis && ['risk', 'stress'].includes(String(diagnosis.primaryFocus || '')))) {
          setPreviewRecommendation(preview, 'recommended');
        } else {
          setPreviewRecommendation(preview, 'situational');
        }
        return preview;
      }
    }
    if (safeMethod.id === 'feed_protect_salt_load') {
      setPreviewRecommendation(preview, (toNumber(nutrientState.saltLoad, 0) >= 48 || (diagnosis && diagnosis.primaryFocus === 'saltLoad') || toNumber(statusState.stress, 0) >= 46) ? 'recommended' : 'situational');
      preview.benefit = Object.assign({}, preview.benefit, { level: 'medium', score: 58 });
      preview.forecastDeltas = [
        buildForecastDelta('saltLoad', 0, 'neutral'),
        buildForecastDelta('risk', -2, 'positive'),
        buildForecastDelta('stability', 3, 'positive')
      ].filter(Boolean);
      preview.risk = Object.assign({}, preview.risk, {
        level: 'low',
        labelKey: 'careStudio.risk.low'
      });
      preview.buddyHintKey = 'careStudio.buddy.feedLight';
      return preview;
    }
    return preview;
  }

  function getCareMethodAvailability(state, method, options = {}) {
    const safeMethod = getCareMethodById(method && typeof method === 'object' ? method.id : method)
      || (method && typeof method === 'object' ? clone(method) : null);
    if (!safeMethod) {
      return { ok: false, reason: 'unknown_method' };
    }
    const rootState = state && typeof state === 'object' ? state : {};
    const careApi = globalScope.GrowSimCareModel;
    const care = careApi && typeof careApi.normalizeCareState === 'function'
      ? careApi.normalizeCareState(rootState.care, rootState)
      : (rootState.care || {});
    const diagnosis = careApi && typeof careApi.getCareDiagnosis === 'function'
      ? careApi.getCareDiagnosis({ ...rootState, care })
      : null;
    const trend = careApi && typeof careApi.deriveCareTrendSummary === 'function'
      ? careApi.deriveCareTrendSummary({ ...rootState, care })
      : null;
    const water = care && care.water ? care.water : {};
    const nutrients = care && care.nutrients ? care.nutrients : {};
    const legacyAction = options.legacyAction && typeof options.legacyAction === 'object' ? options.legacyAction : null;
    const legacyAvailability = options.legacyAvailability && typeof options.legacyAvailability === 'object'
      ? options.legacyAvailability
      : { ok: true };

    if (safeMethod.legacyFallbackActionId && !legacyAction) {
      return { ok: false, reason: 'legacy_missing' };
    }
    if (legacyAction && !legacyAvailability.ok) {
      return legacyAvailability;
    }

    if (safeMethod.id === 'water_relieve_root_zone') {
      const allowed = toNumber(water.rootZoneMoisture, 0) >= 74
        || toNumber(water.overwateringPressure, 0) >= 28
        || toNumber(nutrients.saltLoad, 0) >= 48
        || (diagnosis && (diagnosis.primaryFocus === 'rootZone' || diagnosis.primaryFocus === 'saltLoad' || diagnosis.primaryFocus === 'risk'))
        || (trend && (trend.key === 'root_zone_staying_wet' || trend.key === 'risk_rising'));
      if (!allowed) {
        return { ok: false, reason: 'care_method_not_needed', note: 'Aktuell kaum nötig. Erst beobachten, bevor du die Wurzelzone entlastest.' };
      }
    }
    if (safeMethod.id === 'water_normal_watering' && toNumber(water.rootZoneMoisture, 0) >= 82) {
      return { ok: false, reason: 'care_method_root_zone_wet', note: 'Die Wurzelzone ist dafür noch zu feucht.' };
    }
    if (safeMethod.id === 'water_even_watering' && toNumber(water.surfaceMoisture, 0) >= 70) {
      return { ok: false, reason: 'care_method_surface_still_wet', note: 'Die Oberfläche wirkt dafür noch zu feucht.' };
    }
    if (safeMethod.id === 'water_moisten_surface' && toNumber(water.rootZoneMoisture, 0) >= 84 && toNumber(water.surfaceMoisture, 0) >= 56) {
      return { ok: true, soft: true, note: 'Nur sehr vorsichtig nutzen. Die Wurzelzone ist bereits deutlich feucht.' };
    }
    if (safeMethod.id === 'feed_phase_supply' && toNumber(nutrients.saltLoad, 0) >= 58) {
      return { ok: false, reason: 'care_method_salt_pressure', note: 'Die Salzlast ist dafür gerade zu hoch.' };
    }
    if (safeMethod.id === 'feed_light_base' && toNumber(water.rootZoneMoisture, 0) <= 36) {
      return { ok: false, reason: 'care_method_root_zone_too_dry', note: 'Die Wurzelzone ist dafür gerade zu trocken.' };
    }
    if (safeMethod.id === 'feed_light_base' && toNumber(water.rootZoneMoisture, 0) >= 80) {
      return { ok: false, reason: 'care_method_root_zone_wet', note: 'Die Wurzelzone ist dafür noch zu feucht.' };
    }
    if (safeMethod.id === 'feed_phase_supply' && toNumber(water.rootZoneMoisture, 0) <= 36) {
      return { ok: false, reason: 'care_method_root_zone_too_dry', note: 'Die Wurzelzone ist dafür gerade zu trocken.' };
    }
    if (safeMethod.id === 'feed_phase_supply' && toNumber(water.rootZoneMoisture, 0) >= 78) {
      return { ok: false, reason: 'care_method_root_zone_wet', note: 'Die Wurzelzone ist dafür noch zu feucht.' };
    }
    if (safeMethod.id === 'feed_phase_supply' && toNumber(rootState.status && rootState.status.stress, 0) >= 62) {
      return { ok: true, soft: true, note: 'Die Pflanze wirkt angespannt. Eine sanftere Versorgung passt gerade besser.' };
    }
    if (safeMethod.id === 'feed_stabilize_uptake') {
      if (toNumber(water.rootZoneMoisture, 0) <= 34) {
        return { ok: true, soft: true, note: 'Die Wurzelzone bleibt trocken. Die Wirkung fällt eher sanft aus.' };
      }
      if (toNumber(water.rootZoneMoisture, 0) >= 82) {
        return { ok: true, soft: true, note: 'Die Wurzelzone ist feucht. Aufnahme jetzt nur vorsichtig stabilisieren.' };
      }
      if (diagnosis && diagnosis.primaryFocus === 'saltLoad') {
        return { ok: true, soft: true, note: 'Nur leicht einsetzen, solange die Salzlast erhöht bleibt.' };
      }
    }
    if (safeMethod.id === 'feed_protect_salt_load') {
      return { ok: true, soft: false, note: 'Nicht füttern ist hier eine echte Stabilitätsentscheidung.' };
    }
    if (safeMethod.id === 'routine_hygiene_round' && (toNumber(rootState.status && rootState.status.risk, 0) >= 24 || toNumber(rootState.status && rootState.status.stress, 0) >= 28)) {
      return { ok: true, soft: false, note: 'Eine ruhige Hygiene-Runde kann den Druck etwas senken.' };
    }
    if (safeMethod.type === 'check') {
      return { ok: true, soft: false, note: 'Sichere Diagnose-Methode.' };
    }
    if (trend && trend.key === 'stress_rising' && (safeMethod.category === 'training' || safeMethod.category === 'environment')) {
      return { ok: true, soft: true, note: 'Sanft bleiben, solange der Stress noch steigt.' };
    }
    return { ok: true, soft: false };
  }

  function getCareMethodsForTab(state, tab) {
    const safeTab = String(tab || '').trim().toLowerCase();
    if (!safeTab) {
      return [];
    }
    return CARE_METHODS
      .filter((method) => String(method.tab || '').toLowerCase() === safeTab)
      .map((method) => clone(method));
  }

  function getAvailableCareMethods(state) {
    const tabs = ['water', 'feed', 'routine', 'diagnosis'];
    return tabs.reduce((list, tab) => list.concat(getCareMethodsForTab(state, tab)), []);
  }

  function buildCareMethodExecutionPlan(state, method, options = {}) {
    const safeMethod = getCareMethodById(method && typeof method === 'object' ? method.id : method)
      || (method && typeof method === 'object' ? clone(method) : null);
    if (!safeMethod) {
      return null;
    }
    const legacyAction = options.legacyAction && typeof options.legacyAction === 'object' ? options.legacyAction : null;
    const derivedEffects = deriveCareMethodDirectEffects(state, safeMethod);
    return {
      method: clone(safeMethod),
      mode: safeMethod.legacyFallbackActionId && legacyAction ? 'legacy' : 'direct',
      legacyActionId: safeMethod.legacyFallbackActionId || null,
      actionLike: buildActionLikeFromMethod(safeMethod, legacyAction, state),
      cooldownRealMinutes: Math.max(0, Math.round(toNumber(safeMethod.cooldownHours, 0) * 60)),
      directEffects: clone(derivedEffects || {}),
      trackingCategory: String(safeMethod.category || 'environment'),
      trackingFlags: buildTrackingFlags(safeMethod)
    };
  }

  const api = Object.freeze({
    getCareMethodDefinitions,
    getCareMethodById,
    getAvailableCareMethods,
    getCareMethodsForTab,
    getCareMethodAvailability,
    getCareMethodPreview,
    buildCareMethodExecutionPlan,
    buildActionLikeFromMethod,
    mapCareMethodToLegacyAction,
    deriveCareMethodDirectEffects
  });

  globalScope.GrowSimCareMethods = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
