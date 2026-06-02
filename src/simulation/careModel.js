'use strict';

(function initCareModel(globalScope) {
  function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function clamp(value, min, max) {
    const numeric = toFiniteNumber(value, min);
    return Math.max(min, Math.min(max, numeric));
  }

  function clampInt(value, min, max) {
    return Math.trunc(clamp(value, min, max));
  }

  function round2(value) {
    return Math.round(toFiniteNumber(value, 0) * 100) / 100;
  }

  function getRootState(baseState) {
    return baseState && typeof baseState === 'object' ? baseState : {};
  }

  function getStatus(baseState) {
    const root = getRootState(baseState);
    return root.status && typeof root.status === 'object' ? root.status : {};
  }

  function getPlant(baseState) {
    const root = getRootState(baseState);
    return root.plant && typeof root.plant === 'object' ? root.plant : {};
  }

  function getSimulation(baseState) {
    const root = getRootState(baseState);
    return root.simulation && typeof root.simulation === 'object' ? root.simulation : {};
  }

  function getEnvironmentControls(baseState) {
    const root = getRootState(baseState);
    return root.environmentControls && typeof root.environmentControls === 'object' ? root.environmentControls : {};
  }

  function getSetup(baseState) {
    const root = getRootState(baseState);
    return root.setup && typeof root.setup === 'object' ? root.setup : {};
  }

  function getActionCategory(action) {
    return String(action && action.category || '').trim().toLowerCase();
  }

  function getActionIntensity(action) {
    return String(action && action.intensity || 'medium').trim().toLowerCase();
  }

  function getActionIntensityWeight(action) {
    const intensity = getActionIntensity(action);
    if (intensity === 'low') return 0.82;
    if (intensity === 'high') return 1.24;
    return 1;
  }

  function mapPhaseLabel(stageIndex, phase) {
    const safeStageIndex = Math.max(0, Math.floor(toFiniteNumber(stageIndex, 0)));
    const safePhase = String(phase || '').trim().toLowerCase();
    if (safePhase.includes('late')) return 'late_flower';
    if (safePhase.includes('flower') || safeStageIndex >= 7) return 'flower';
    if (safePhase.includes('stretch') || safeStageIndex >= 5) return 'stretch';
    return 'vegetative';
  }

  function getPotDrybackModifier(potSize) {
    const normalized = String(potSize || '').trim().toLowerCase();
    if (normalized === 'small' || normalized === 's') return 1.18;
    if (normalized === 'medium' || normalized === 'm') return 1;
    if (normalized === 'large' || normalized === 'l') return 0.84;
    if (normalized === 'xl' || normalized === 'extra_large') return 0.74;
    return 1;
  }

  function getAverageNutritionValue(nutrients) {
    const safeNutrients = nutrients && typeof nutrients === 'object' ? nutrients : {};
    return (
      toFiniteNumber(safeNutrients.n, 0)
      + toFiniteNumber(safeNutrients.p, 0)
      + toFiniteNumber(safeNutrients.k, 0)
      + toFiniteNumber(safeNutrients.micro, 0)
    ) / 4;
  }

  function pushUniqueReason(list, key) {
    if (!Array.isArray(list) || !key || list.includes(key)) {
      return;
    }
    list.push(key);
  }

  function getPhaseNutritionProfile(stageIndex, phase) {
    const safeStageIndex = Math.max(0, Math.floor(toFiniteNumber(stageIndex, 0)));
    const safePhase = String(phase || '').trim().toLowerCase();
    if (safePhase === 'harvest' || safeStageIndex >= 10) {
      return { n: 0.82, p: 1.02, k: 1.08, micro: 0.94 };
    }
    if (safePhase === 'flowering' || safeStageIndex >= 7) {
      return { n: 0.88, p: 1.04, k: 1.08, micro: 0.98 };
    }
    if (safeStageIndex <= 1 || safePhase === 'seedling') {
      return { n: 0.9, p: 0.84, k: 0.82, micro: 0.9 };
    }
    return { n: 1.08, p: 0.92, k: 0.96, micro: 0.98 };
  }

  function estimateDrybackRate(state) {
    const status = getStatus(state);
    const plant = getPlant(state);
    const controls = getEnvironmentControls(state);
    const setup = getSetup(state);
    const stageIndex = Math.max(0, Math.floor(toFiniteNumber(plant.stageIndex, 0)));
    const airflowPercent = clamp(toFiniteNumber(controls.airflowPercent, 70), 0, 100);
    const humidityPercent = clamp(toFiniteNumber(controls.humidityPercent, 60), 20, 95);
    const temperatureC = clamp(toFiniteNumber(controls.temperatureC, 25), 10, 40);
    const stageFactor = 0.65 + Math.min(1, stageIndex / 8) * 0.7;
    const waterDemand = 0.8 + (clamp(toFiniteNumber(status.growth, 0), 0, 100) / 100) * 0.35;
    const airflowFactor = 0.78 + (airflowPercent / 100) * 0.52;
    const humidityFactor = 0.82 + ((70 - humidityPercent) / 100) * 0.48;
    const tempFactor = 0.88 + ((temperatureC - 24) / 20) * 0.24;
    const potModifier = getPotDrybackModifier(setup.potSize);
    return Math.round(clamp(stageFactor * waterDemand * airflowFactor * humidityFactor * tempFactor * potModifier, 0.4, 3.6) * 100) / 100;
  }

  function getCareTrendMetricKeys() {
    return ['substrateMoisture', 'rootZoneMoisture', 'surfaceMoisture', 'saltLoad', 'stress', 'risk', 'nutrition'];
  }

  function getCareTrendDeltaKeys() {
    return ['moisture', 'rootZone', 'surface', 'saltLoad', 'stress', 'risk', 'nutrition'];
  }

  function captureCareTrendSnapshot(state) {
    const rootState = getRootState(state);
    const safeCare = rootState.care && typeof rootState.care === 'object' ? rootState.care : {};
    const safeWater = safeCare.water && typeof safeCare.water === 'object' ? safeCare.water : {};
    const safeNutrients = safeCare.nutrients && typeof safeCare.nutrients === 'object' ? safeCare.nutrients : {};
    const status = getStatus(rootState);
    const sim = getSimulation(rootState);
    const fallbackWater = clamp(toFiniteNumber(status.water, 70), 0, 100);
    const fallbackRootZone = clamp(fallbackWater + 4, 0, 100);
    const fallbackSurface = clamp(fallbackWater - 8, 0, 100);
    const fallbackSaltLoad = clamp((clamp(toFiniteNumber(status.nutrition, 65), 0, 100) - 50) * 0.3, 0, 100);
    return {
      atSimMs: Math.max(0, toFiniteNumber(sim.simTimeMs, 0)),
      values: {
        substrateMoisture: round2(clamp(toFiniteNumber(safeWater.substrateMoisture, fallbackWater), 0, 100)),
        rootZoneMoisture: round2(clamp(toFiniteNumber(safeWater.rootZoneMoisture, fallbackRootZone), 0, 100)),
        surfaceMoisture: round2(clamp(toFiniteNumber(safeWater.surfaceMoisture, fallbackSurface), 0, 100)),
        saltLoad: round2(clamp(toFiniteNumber(safeNutrients.saltLoad, fallbackSaltLoad), 0, 100)),
        stress: round2(toFiniteNumber(status.stress, 0)),
        risk: round2(toFiniteNumber(status.risk, 0)),
        nutrition: round2(toFiniteNumber(status.nutrition, 0))
      }
    };
  }

  function createDefaultCareTrends(baseState) {
    const snapshot = captureCareTrendSnapshot(baseState);
    return {
      version: 1,
      lastSnapshotAtSimMs: snapshot.atSimMs,
      previous: {
        substrateMoisture: null,
        rootZoneMoisture: null,
        surfaceMoisture: null,
        saltLoad: null,
        stress: null,
        risk: null,
        nutrition: null
      },
      current: {
        substrateMoisture: snapshot.values.substrateMoisture,
        rootZoneMoisture: snapshot.values.rootZoneMoisture,
        surfaceMoisture: snapshot.values.surfaceMoisture,
        saltLoad: snapshot.values.saltLoad,
        stress: snapshot.values.stress,
        risk: snapshot.values.risk,
        nutrition: snapshot.values.nutrition
      },
      deltas: {
        moisture: 0,
        rootZone: 0,
        surface: 0,
        saltLoad: 0,
        stress: 0,
        risk: 0,
        nutrition: 0
      }
    };
  }

  function computeCareTrendDeltas(previous, current) {
    const safePrevious = previous && typeof previous === 'object' ? previous : {};
    const safeCurrent = current && typeof current === 'object' ? current : {};
    const previousSubstrate = toFiniteNumber(safePrevious.substrateMoisture, toFiniteNumber(safeCurrent.substrateMoisture, 0));
    const previousRootZone = toFiniteNumber(safePrevious.rootZoneMoisture, toFiniteNumber(safeCurrent.rootZoneMoisture, 0));
    const previousSurface = toFiniteNumber(safePrevious.surfaceMoisture, toFiniteNumber(safeCurrent.surfaceMoisture, 0));
    const previousSaltLoad = toFiniteNumber(safePrevious.saltLoad, toFiniteNumber(safeCurrent.saltLoad, 0));
    const previousStress = toFiniteNumber(safePrevious.stress, toFiniteNumber(safeCurrent.stress, 0));
    const previousRisk = toFiniteNumber(safePrevious.risk, toFiniteNumber(safeCurrent.risk, 0));
    const previousNutrition = toFiniteNumber(safePrevious.nutrition, toFiniteNumber(safeCurrent.nutrition, 0));
    return {
      moisture: round2(toFiniteNumber(safeCurrent.substrateMoisture, 0) - previousSubstrate),
      rootZone: round2(toFiniteNumber(safeCurrent.rootZoneMoisture, 0) - previousRootZone),
      surface: round2(toFiniteNumber(safeCurrent.surfaceMoisture, 0) - previousSurface),
      saltLoad: round2(toFiniteNumber(safeCurrent.saltLoad, 0) - previousSaltLoad),
      stress: round2(toFiniteNumber(safeCurrent.stress, 0) - previousStress),
      risk: round2(toFiniteNumber(safeCurrent.risk, 0) - previousRisk),
      nutrition: round2(toFiniteNumber(safeCurrent.nutrition, 0) - previousNutrition)
    };
  }

  function normalizeCareTrends(trends, baseState) {
    const fallback = createDefaultCareTrends(baseState);
    const safeRoot = trends && typeof trends === 'object' ? trends : {};
    const safePrevious = safeRoot.previous && typeof safeRoot.previous === 'object' ? safeRoot.previous : {};
    const safeCurrent = safeRoot.current && typeof safeRoot.current === 'object' ? safeRoot.current : {};
    const safeDeltas = safeRoot.deltas && typeof safeRoot.deltas === 'object' ? safeRoot.deltas : {};
    const currentSnapshot = captureCareTrendSnapshot(baseState);
    const current = {};
    const previous = {};

    for (const key of getCareTrendMetricKeys()) {
      const currentFallback = currentSnapshot.values[key];
      const currentValue = safeCurrent[key] == null ? currentFallback : toFiniteNumber(safeCurrent[key], currentFallback);
      current[key] = round2(clamp(currentValue, 0, 100));
      previous[key] = safePrevious[key] == null ? null : round2(clamp(toFiniteNumber(safePrevious[key], current[key]), 0, 100));
    }

    const normalized = {
      version: Math.max(1, Math.trunc(toFiniteNumber(safeRoot.version, fallback.version))),
      lastSnapshotAtSimMs: Math.max(0, toFiniteNumber(safeRoot.lastSnapshotAtSimMs, fallback.lastSnapshotAtSimMs)),
      previous,
      current,
      deltas: {
        moisture: round2(toFiniteNumber(safeDeltas.moisture, 0)),
        rootZone: round2(toFiniteNumber(safeDeltas.rootZone, 0)),
        surface: round2(toFiniteNumber(safeDeltas.surface, 0)),
        saltLoad: round2(toFiniteNumber(safeDeltas.saltLoad, 0)),
        stress: round2(toFiniteNumber(safeDeltas.stress, 0)),
        risk: round2(toFiniteNumber(safeDeltas.risk, 0)),
        nutrition: round2(toFiniteNumber(safeDeltas.nutrition, 0))
      }
    };

    normalized.deltas = computeCareTrendDeltas(normalized.previous, normalized.current);
    return normalized;
  }

  function createDefaultCareState(baseState) {
    const status = getStatus(baseState);
    const plant = getPlant(baseState);
    const controls = getEnvironmentControls(baseState);
    const simulation = getSimulation(baseState);
    const waterSummary = clamp(toFiniteNumber(status.water, 70), 0, 100);
    const nutritionSummary = clamp(toFiniteNumber(status.nutrition, 65), 0, 100);
    const stageIndex = Math.max(0, Math.floor(toFiniteNumber(plant.stageIndex, 0)));
    const moistureSpread = clampInt(6 + stageIndex, 4, 14);
    const surfaceMoisture = clamp(waterSummary - moistureSpread, 0, 100);
    const rootZoneMoisture = clamp(waterSummary + Math.round(moistureSpread * 0.55), 0, 100);
    const nutritionProfile = getPhaseNutritionProfile(stageIndex, plant.phase);
    const rootEc = clamp(toFiniteNumber(controls.ec, 1.4), 0.6, 2.8);
    const saltLoad = clampInt(((rootEc - 0.6) / 2.2) * 100 * 0.38 + ((nutritionSummary - 50) * 0.22), 0, 100);
    const drybackRatePerHour = estimateDrybackRate(baseState);
    const dryStressPressure = clampInt(Math.max(0, 42 - waterSummary) * 0.75, 0, 100);
    const overwateringPressure = clampInt(Math.max(0, waterSummary - 76) * 1.15, 0, 100);
    const lastWateredAtSimMs = Number.isFinite(Number(simulation.simTimeMs)) ? Number(simulation.simTimeMs) : 0;
    const baseNutrientValue = nutritionSummary * 0.92;

    return {
      version: 1,
      water: {
        substrateMoisture: waterSummary,
        surfaceMoisture,
        rootZoneMoisture,
        drybackRatePerHour,
        overwateringPressure,
        dryStressPressure,
        lastWateredAtSimMs,
        lastWaterAmountMl: 0,
        lastWaterMethod: null
      },
      nutrients: {
        n: clampInt(baseNutrientValue * nutritionProfile.n, 0, 100),
        p: clampInt(baseNutrientValue * nutritionProfile.p, 0, 100),
        k: clampInt(baseNutrientValue * nutritionProfile.k, 0, 100),
        micro: clampInt(baseNutrientValue * nutritionProfile.micro, 0, 100),
        saltLoad,
        lastFeedAtSimMs: 0,
        lastFeedType: null,
        lastFeedStrength: null
      },
      routine: {
        lastLeafCheckAtSimMs: 0,
        lastPotWeightCheckAtSimMs: 0,
        lastSubstrateCheckAtSimMs: 0,
        careScoreToday: 0
      },
      feedback: {
        lastCareGrade: null,
        lastCareMessageKey: null,
        lastEffects: [],
        lastFocusKey: null,
        lastActionId: null,
        lastUpdatedAtSimMs: 0
      },
      trends: createDefaultCareTrends(baseState)
    };
  }

  function normalizeCareState(care, baseState) {
    const fallback = createDefaultCareState(baseState);
    const root = care && typeof care === 'object' ? care : {};
    const safeWater = root.water && typeof root.water === 'object' ? root.water : {};
    const safeNutrients = root.nutrients && typeof root.nutrients === 'object' ? root.nutrients : {};
    const safeRoutine = root.routine && typeof root.routine === 'object' ? root.routine : {};
    const safeFeedback = root.feedback && typeof root.feedback === 'object' ? root.feedback : {};
    const safeTrends = root.trends && typeof root.trends === 'object' ? root.trends : {};
    const safeLastEffects = Array.isArray(safeFeedback.lastEffects) ? safeFeedback.lastEffects : [];

    const normalized = {
      version: Math.max(1, Math.trunc(toFiniteNumber(root.version, fallback.version))),
      water: {
        substrateMoisture: clamp(toFiniteNumber(safeWater.substrateMoisture, fallback.water.substrateMoisture), 0, 100),
        surfaceMoisture: clamp(toFiniteNumber(safeWater.surfaceMoisture, fallback.water.surfaceMoisture), 0, 100),
        rootZoneMoisture: clamp(toFiniteNumber(safeWater.rootZoneMoisture, fallback.water.rootZoneMoisture), 0, 100),
        drybackRatePerHour: clamp(toFiniteNumber(safeWater.drybackRatePerHour, fallback.water.drybackRatePerHour), 0, 6),
        overwateringPressure: clamp(toFiniteNumber(safeWater.overwateringPressure, fallback.water.overwateringPressure), 0, 100),
        dryStressPressure: clamp(toFiniteNumber(safeWater.dryStressPressure, fallback.water.dryStressPressure), 0, 100),
        lastWateredAtSimMs: Math.max(0, toFiniteNumber(safeWater.lastWateredAtSimMs, fallback.water.lastWateredAtSimMs)),
        lastWaterAmountMl: clamp(toFiniteNumber(safeWater.lastWaterAmountMl, fallback.water.lastWaterAmountMl), 0, 6000),
        lastWaterMethod: typeof safeWater.lastWaterMethod === 'string' && safeWater.lastWaterMethod.trim()
          ? safeWater.lastWaterMethod.trim()
          : null
      },
      nutrients: {
        n: clamp(toFiniteNumber(safeNutrients.n, fallback.nutrients.n), 0, 100),
        p: clamp(toFiniteNumber(safeNutrients.p, fallback.nutrients.p), 0, 100),
        k: clamp(toFiniteNumber(safeNutrients.k, fallback.nutrients.k), 0, 100),
        micro: clamp(toFiniteNumber(safeNutrients.micro, fallback.nutrients.micro), 0, 100),
        saltLoad: clamp(toFiniteNumber(safeNutrients.saltLoad, fallback.nutrients.saltLoad), 0, 100),
        lastFeedAtSimMs: Math.max(0, toFiniteNumber(safeNutrients.lastFeedAtSimMs, fallback.nutrients.lastFeedAtSimMs)),
        lastFeedType: typeof safeNutrients.lastFeedType === 'string' && safeNutrients.lastFeedType.trim()
          ? safeNutrients.lastFeedType.trim()
          : null,
        lastFeedStrength: typeof safeNutrients.lastFeedStrength === 'string' && safeNutrients.lastFeedStrength.trim()
          ? safeNutrients.lastFeedStrength.trim()
          : null
      },
      routine: {
        lastLeafCheckAtSimMs: Math.max(0, toFiniteNumber(safeRoutine.lastLeafCheckAtSimMs, fallback.routine.lastLeafCheckAtSimMs)),
        lastPotWeightCheckAtSimMs: Math.max(0, toFiniteNumber(safeRoutine.lastPotWeightCheckAtSimMs, fallback.routine.lastPotWeightCheckAtSimMs)),
        lastSubstrateCheckAtSimMs: Math.max(0, toFiniteNumber(safeRoutine.lastSubstrateCheckAtSimMs, fallback.routine.lastSubstrateCheckAtSimMs)),
        careScoreToday: clamp(toFiniteNumber(safeRoutine.careScoreToday, fallback.routine.careScoreToday), -100, 100)
      },
      feedback: {
        lastCareGrade: typeof safeFeedback.lastCareGrade === 'string' && safeFeedback.lastCareGrade.trim()
          ? safeFeedback.lastCareGrade.trim()
          : null,
        lastCareMessageKey: typeof safeFeedback.lastCareMessageKey === 'string' && safeFeedback.lastCareMessageKey.trim()
          ? safeFeedback.lastCareMessageKey.trim()
          : null,
        lastEffects: safeLastEffects
          .map((value) => (typeof value === 'string' && value.trim() ? value.trim() : null))
          .filter(Boolean)
          .slice(0, 3),
        lastFocusKey: typeof safeFeedback.lastFocusKey === 'string' && safeFeedback.lastFocusKey.trim()
          ? safeFeedback.lastFocusKey.trim()
          : null,
        lastActionId: typeof safeFeedback.lastActionId === 'string' && safeFeedback.lastActionId.trim()
          ? safeFeedback.lastActionId.trim()
          : null,
        lastUpdatedAtSimMs: Math.max(0, toFiniteNumber(safeFeedback.lastUpdatedAtSimMs, fallback.feedback.lastUpdatedAtSimMs))
      },
      trends: normalizeCareTrends(safeTrends, {
        ...(getRootState(baseState)),
        care: {
          version: root.version,
          water: safeWater,
          nutrients: safeNutrients,
          routine: safeRoutine,
          feedback: safeFeedback
        }
      })
    };

    const averageMoisture = (normalized.water.substrateMoisture + normalized.water.surfaceMoisture + normalized.water.rootZoneMoisture) / 3;
    normalized.water.substrateMoisture = round2(clamp((normalized.water.substrateMoisture * 0.65) + (averageMoisture * 0.35), 0, 100));
    normalized.water.surfaceMoisture = clamp(normalized.water.surfaceMoisture, 0, normalized.water.rootZoneMoisture + 28);
    normalized.water.rootZoneMoisture = clamp(normalized.water.rootZoneMoisture, normalized.water.surfaceMoisture - 28, 100);
    normalized.water.drybackRatePerHour = round2(estimateDrybackRate({
      ...(getRootState(baseState)),
      care: normalized
    }));

    return normalized;
  }

  function getTrendTone(key) {
    if (key === 'root_zone_staying_wet' || key === 'salt_load_rising' || key === 'stress_rising' || key === 'risk_rising') {
      return 'warning';
    }
    if (key === 'root_zone_drying' || key === 'stress_recovering' || key === 'risk_falling' || key === 'nutrition_recovering') {
      return 'positive';
    }
    return 'stable';
  }

  function getTrendLabelKey(key) {
    const map = {
      moisture_falling: 'careStudio.trend.moistureFalling',
      moisture_rising: 'careStudio.trend.moistureRising',
      root_zone_drying: 'careStudio.trend.rootZoneDrying',
      root_zone_staying_wet: 'careStudio.trend.rootZoneStayingWet',
      salt_load_rising: 'careStudio.trend.saltLoadRising',
      salt_load_stable: 'careStudio.trend.saltLoadStable',
      stress_rising: 'careStudio.trend.stressRising',
      stress_recovering: 'careStudio.trend.stressRecovering',
      risk_rising: 'careStudio.trend.riskRising',
      risk_falling: 'careStudio.trend.riskFalling',
      nutrition_depleting: 'careStudio.trend.nutritionDepleting',
      nutrition_recovering: 'careStudio.trend.nutritionRecovering',
      stable_state: 'careStudio.trend.stable'
    };
    return map[key] || 'careStudio.trend.stable';
  }

  function getTrendMessageKey(key) {
    const map = {
      moisture_falling: 'careStudio.trend.message.moistureFalling',
      moisture_rising: 'careStudio.trend.message.moistureRising',
      root_zone_drying: 'careStudio.trend.message.rootZoneDrying',
      root_zone_staying_wet: 'careStudio.trend.message.rootZoneStayingWet',
      salt_load_rising: 'careStudio.trend.message.saltLoadRising',
      salt_load_stable: 'careStudio.trend.message.saltLoadStable',
      stress_rising: 'careStudio.trend.message.stressRising',
      stress_recovering: 'careStudio.trend.message.stressRecovering',
      risk_rising: 'careStudio.trend.message.riskRising',
      risk_falling: 'careStudio.trend.message.riskFalling',
      nutrition_depleting: 'careStudio.trend.message.nutritionDepleting',
      nutrition_recovering: 'careStudio.trend.message.nutritionRecovering',
      stable_state: 'careStudio.trend.message.stable'
    };
    return map[key] || 'careStudio.trend.message.stable';
  }

  function buildTrendSummary(key, deltas, score) {
    return {
      key,
      labelKey: getTrendLabelKey(key),
      messageKey: getTrendMessageKey(key),
      tone: getTrendTone(key),
      score: clampInt(score, 0, 100),
      deltas: {
        moisture: round2(toFiniteNumber(deltas && deltas.moisture, 0)),
        rootZone: round2(toFiniteNumber(deltas && deltas.rootZone, 0)),
        surface: round2(toFiniteNumber(deltas && deltas.surface, 0)),
        saltLoad: round2(toFiniteNumber(deltas && deltas.saltLoad, 0)),
        stress: round2(toFiniteNumber(deltas && deltas.stress, 0)),
        risk: round2(toFiniteNumber(deltas && deltas.risk, 0)),
        nutrition: round2(toFiniteNumber(deltas && deltas.nutrition, 0))
      }
    };
  }

  function deriveCareTrendSummary(state) {
    const rootState = getRootState(state);
    const care = normalizeCareState(rootState.care, rootState);
    const trends = normalizeCareTrends(care.trends, {
      ...rootState,
      care
    });
    const current = trends.current || {};
    const deltas = trends.deltas || {};

    if (!trends.previous || Object.values(trends.previous).every((value) => value == null)) {
      return buildTrendSummary('stable_state', deltas, 36);
    }

    if (toFiniteNumber(current.rootZoneMoisture, 0) >= 78 && toFiniteNumber(deltas.rootZone, 0) >= -2) {
      return buildTrendSummary('root_zone_staying_wet', deltas, 76);
    }
    if (toFiniteNumber(deltas.rootZone, 0) <= -4 && toFiniteNumber(current.rootZoneMoisture, 0) >= 40) {
      return buildTrendSummary('root_zone_drying', deltas, 68);
    }
    if (toFiniteNumber(deltas.saltLoad, 0) >= 4) {
      return buildTrendSummary('salt_load_rising', deltas, 74);
    }
    if (Math.abs(toFiniteNumber(deltas.saltLoad, 0)) <= 2 && toFiniteNumber(current.saltLoad, 0) >= 34) {
      return buildTrendSummary('salt_load_stable', deltas, 54);
    }
    if (toFiniteNumber(deltas.stress, 0) >= 4) {
      return buildTrendSummary('stress_rising', deltas, 72);
    }
    if (toFiniteNumber(deltas.stress, 0) <= -4) {
      return buildTrendSummary('stress_recovering', deltas, 70);
    }
    if (toFiniteNumber(deltas.risk, 0) >= 4) {
      return buildTrendSummary('risk_rising', deltas, 68);
    }
    if (toFiniteNumber(deltas.risk, 0) <= -4) {
      return buildTrendSummary('risk_falling', deltas, 66);
    }
    if (toFiniteNumber(deltas.nutrition, 0) <= -4) {
      return buildTrendSummary('nutrition_depleting', deltas, 62);
    }
    if (toFiniteNumber(deltas.nutrition, 0) >= 4) {
      return buildTrendSummary('nutrition_recovering', deltas, 60);
    }
    if (toFiniteNumber(deltas.moisture, 0) <= -4) {
      return buildTrendSummary('moisture_falling', deltas, 64);
    }
    if (toFiniteNumber(deltas.moisture, 0) >= 4) {
      return buildTrendSummary('moisture_rising', deltas, 58);
    }

    return buildTrendSummary('stable_state', deltas, 42);
  }

  function getCareTrendDiagnosis(state) {
    const summary = deriveCareTrendSummary(state);
    return {
      key: summary.key,
      tone: summary.tone,
      score: summary.score,
      labelKey: summary.labelKey,
      messageKey: summary.messageKey,
      deltas: summary.deltas
    };
  }

  function buildRiskLevel(dryStressPressure, overwateringPressure, saltLoad) {
    const composite = Math.max(dryStressPressure, overwateringPressure, saltLoad * 0.82);
    if (composite >= 72) return 'high';
    if (composite >= 42) return 'medium';
    return 'low';
  }

  function buildCareSummaryRootZoneRiskScore(water) {
    const safeWater = water && typeof water === 'object' ? water : {};
    const overwatering = clamp(toFiniteNumber(safeWater.overwateringPressure, 0), 0, 100);
    const rootZone = clamp(toFiniteNumber(safeWater.rootZoneMoisture, 0), 0, 100);
    const surface = clamp(toFiniteNumber(safeWater.surfaceMoisture, 0), 0, 100);
    const rootWetPressure = rootZone >= 82 ? 42 + ((rootZone - 82) * 2.2) : 0;
    const unevenDrybackPressure = surface <= 34 && rootZone >= 64 ? 28 + ((rootZone - 64) * 0.9) : 0;
    const rootDryPressure = rootZone <= 36 ? 42 + ((36 - rootZone) * 1.2) : 0;
    return clampInt(Math.max(overwatering, rootWetPressure, unevenDrybackPressure, rootDryPressure), 0, 100);
  }

  function buildCareSummaryRiskScore(water, nutrients) {
    const safeWater = water && typeof water === 'object' ? water : {};
    const safeNutrients = nutrients && typeof nutrients === 'object' ? nutrients : {};
    const dryStress = clamp(toFiniteNumber(safeWater.dryStressPressure, 0), 0, 100);
    const saltLoad = clamp(toFiniteNumber(safeNutrients.saltLoad, 0), 0, 100);
    const rootZoneRisk = buildCareSummaryRootZoneRiskScore(safeWater);
    return clampInt(Math.max(
      dryStress,
      saltLoad * 0.82,
      rootZoneRisk
    ), 0, 100);
  }

  function buildCareSummaryRiskLevel(riskScore) {
    const safeScore = clampInt(riskScore, 0, 100);
    if (safeScore >= 72) return 'high';
    if (safeScore >= 42) return 'medium';
    return 'low';
  }

  function severityRank(severity) {
    if (severity === 'high') return 4;
    if (severity === 'medium') return 3;
    if (severity === 'low') return 2;
    return 1;
  }

  function buildDiagnosisResult(definition) {
    const safe = definition && typeof definition === 'object' ? definition : {};
    const causeKeys = Array.isArray(safe.causeKeys) ? safe.causeKeys.filter(Boolean).slice(0, 3) : [];
    const observationKeys = Array.isArray(safe.observationKeys) ? safe.observationKeys.filter(Boolean).slice(0, 3) : [];
    return {
      primaryFocus: String(safe.primaryFocus || 'stable'),
      severity: String(safe.severity || 'none'),
      confidence: clampInt(safe.confidence, 0, 100),
      status: String(safe.status || 'stable'),
      titleKey: String(safe.titleKey || 'careStudio.diagnosis.headline.stable'),
      messageKey: String(safe.messageKey || 'careStudio.diagnosis.message.stable'),
      causeKeys,
      observationKeys,
      suggestedActionCategory: safe.suggestedActionCategory ? String(safe.suggestedActionCategory) : 'stable',
      suggestedActionTone: String(safe.suggestedActionTone || 'wait'),
      linkedRisk: safe.linkedRisk ? String(safe.linkedRisk) : 'none',
      nextCheckHintKey: String(safe.nextCheckHintKey || 'careStudio.diagnosis.nextCheck.monitor'),
      trendKey: safe.trendKey ? String(safe.trendKey) : 'careStudio.trend.stable',
      trendMessageKey: safe.trendMessageKey ? String(safe.trendMessageKey) : 'careStudio.trend.message.stable'
    };
  }

  function selectBestDiagnosis(candidates) {
    const safeCandidates = (Array.isArray(candidates) ? candidates : [])
      .map((candidate) => buildDiagnosisResult(candidate));
    if (!safeCandidates.length) {
      return buildDiagnosisResult(null);
    }
    safeCandidates.sort((a, b) => {
      const severityDiff = severityRank(b.severity) - severityRank(a.severity);
      if (severityDiff !== 0) return severityDiff;
      return Number(b.confidence || 0) - Number(a.confidence || 0);
    });
    return safeCandidates[0];
  }

  function getDiagnosisNextFocus(diagnosis) {
    const suggested = String(diagnosis && diagnosis.suggestedActionCategory || '');
    if (suggested === 'watering') return 'watering';
    if (suggested === 'fertilizing') return 'feeding';
    if (suggested === 'training' || suggested === 'environment' || suggested === 'routine') return 'routine';
    const focus = String(diagnosis && diagnosis.primaryFocus || '');
    if (focus === 'water' || focus === 'rootZone') return 'watering';
    if (focus === 'nutrition' || focus === 'saltLoad') return 'feeding';
    return 'routine';
  }

  function getCareDiagnosis(state) {
    const rootState = getRootState(state);
    const care = normalizeCareState(rootState.care, rootState);
    const water = care.water;
    const nutrients = care.nutrients;
    const status = getStatus(rootState);
    const averageNutrition = getAverageNutritionValue(nutrients);
    const stress = clamp(toFiniteNumber(status.stress, 0), 0, 100);
    const health = clamp(toFiniteNumber(status.health, 100), 0, 100);
    const risk = clamp(toFiniteNumber(status.risk, 0), 0, 100);
    const trend = getCareTrendDiagnosis({
      ...rootState,
      care
    });
    const surfaceDry = water.surfaceMoisture <= 34;
    const rootStable = water.rootZoneMoisture >= 46 && water.rootZoneMoisture <= 72;
    const drybackWindow = surfaceDry && rootStable && water.overwateringPressure <= 18 && water.dryStressPressure <= 44;
    const uptakeReady = rootStable && nutrients.saltLoad <= 44 && water.substrateMoisture >= 38 && water.substrateMoisture <= 72 && stress < 58;
    const candidates = [];

    if (stress >= 68 || health <= 54 || (risk >= 64 && stress >= 56)) {
      candidates.push({
        primaryFocus: 'stress',
        severity: stress >= 78 || health <= 46 ? 'high' : 'medium',
        confidence: clampInt(Math.max(stress, 100 - health, risk), 0, 100),
        status: 'avoid',
        titleKey: 'careStudio.diagnosis.headline.stressHigh',
        messageKey: 'careStudio.diagnosis.message.stressHigh',
        causeKeys: ['careStudio.diagnosis.cause.generalStressLoad'],
        observationKeys: ['careStudio.diagnosis.observe.stabilizeBeforeIntervention'],
        suggestedActionCategory: 'routine',
        suggestedActionTone: 'wait',
        linkedRisk: 'stress',
        nextCheckHintKey: 'careStudio.diagnosis.nextCheck.stress',
        trendKey: trend.labelKey,
        trendMessageKey: trend.messageKey
      });
    }

    if (water.rootZoneMoisture >= 82 || water.overwateringPressure >= 48) {
      candidates.push({
        primaryFocus: 'rootZone',
        severity: water.rootZoneMoisture >= 88 || water.overwateringPressure >= 62 || trend.key === 'root_zone_staying_wet' ? 'high' : 'medium',
        confidence: clampInt(Math.max(water.rootZoneMoisture, water.overwateringPressure + 18, trend.key === 'root_zone_staying_wet' ? 82 : 0), 0, 100),
        status: 'avoid',
        titleKey: 'careStudio.diagnosis.headline.rootZoneWet',
        messageKey: 'careStudio.diagnosis.message.rootZoneWet',
        causeKeys: ['careStudio.diagnosis.cause.rootZoneDrysSlow'],
        observationKeys: ['careStudio.diagnosis.observe.monitorDryback'],
        suggestedActionCategory: 'watering',
        suggestedActionTone: 'wait',
        linkedRisk: 'overwatering',
        nextCheckHintKey: 'careStudio.diagnosis.nextCheck.dryback',
        trendKey: trend.labelKey,
        trendMessageKey: trend.messageKey
      });
    }

    if (nutrients.saltLoad >= 62) {
      candidates.push({
        primaryFocus: 'saltLoad',
        severity: nutrients.saltLoad >= 78 || trend.key === 'salt_load_rising' ? 'high' : 'medium',
        confidence: clampInt(Math.max(nutrients.saltLoad, averageNutrition + 8, trend.key === 'salt_load_rising' ? 78 : 0), 0, 100),
        status: 'avoid',
        titleKey: 'careStudio.diagnosis.headline.saltLoadHigh',
        messageKey: 'careStudio.diagnosis.message.saltLoadHigh',
        causeKeys: ['careStudio.diagnosis.cause.supplyAheadOfDemand'],
        observationKeys: ['careStudio.diagnosis.observe.avoidStrongFeed'],
        suggestedActionCategory: 'fertilizing',
        suggestedActionTone: 'wait',
        linkedRisk: 'saltLoad',
        nextCheckHintKey: 'careStudio.diagnosis.nextCheck.saltLoad',
        trendKey: trend.labelKey,
        trendMessageKey: trend.messageKey
      });
    }

    if (
      water.dryStressPressure >= 46
      || water.substrateMoisture <= 34
      || (water.surfaceMoisture <= 26 && water.rootZoneMoisture <= 42)
    ) {
      candidates.push({
        primaryFocus: 'water',
        severity: water.dryStressPressure >= 62 || water.rootZoneMoisture <= 34 || trend.key === 'moisture_falling' ? 'high' : 'medium',
        confidence: clampInt(Math.max(water.dryStressPressure + 12, 100 - water.substrateMoisture, trend.key === 'moisture_falling' ? 76 : 0), 0, 100),
        status: 'act',
        titleKey: 'careStudio.diagnosis.headline.waterLow',
        messageKey: 'careStudio.diagnosis.message.waterLow',
        causeKeys: ['careStudio.diagnosis.cause.rootZoneLosesBuffer'],
        observationKeys: ['careStudio.diagnosis.observe.recheckAfterWatering'],
        suggestedActionCategory: 'watering',
        suggestedActionTone: 'recommended',
        linkedRisk: 'dryStress',
        nextCheckHintKey: 'careStudio.diagnosis.nextCheck.rootZone',
        trendKey: trend.labelKey,
        trendMessageKey: trend.messageKey
      });
    }

    if (drybackWindow) {
      candidates.push({
        primaryFocus: 'water',
        severity: 'low',
        confidence: clampInt(68 + Math.max(0, 34 - water.surfaceMoisture), 0, 100),
        status: 'watch',
        titleKey: 'careStudio.diagnosis.headline.waterWindow',
        messageKey: 'careStudio.diagnosis.message.waterWindow',
        causeKeys: ['careStudio.diagnosis.cause.surfaceDryRootStable'],
        observationKeys: ['careStudio.diagnosis.observe.monitorDryback'],
        suggestedActionCategory: 'watering',
        suggestedActionTone: 'recommended',
        linkedRisk: 'timing',
        nextCheckHintKey: 'careStudio.diagnosis.nextCheck.dryback',
        trendKey: trend.labelKey,
        trendMessageKey: trend.messageKey
      });
    }

    if (averageNutrition <= 44 && uptakeReady) {
      candidates.push({
        primaryFocus: 'nutrition',
        severity: averageNutrition <= 34 ? 'medium' : 'low',
        confidence: clampInt(Math.max(62, 100 - averageNutrition), 0, 100),
        status: 'act',
        titleKey: 'careStudio.diagnosis.headline.nutritionLow',
        messageKey: 'careStudio.diagnosis.message.nutritionLow',
        causeKeys: ['careStudio.diagnosis.cause.nutrientBufferFalling'],
        observationKeys: ['careStudio.diagnosis.observe.feedModerately'],
        suggestedActionCategory: 'fertilizing',
        suggestedActionTone: 'recommended',
        linkedRisk: 'nutrition',
        nextCheckHintKey: 'careStudio.diagnosis.nextCheck.nutrition',
        trendKey: trend.labelKey,
        trendMessageKey: trend.messageKey
      });
    }

    if (trend.key === 'salt_load_rising' && nutrients.saltLoad >= 46 && nutrients.saltLoad <= 61 && !candidates.length) {
      candidates.push({
        primaryFocus: 'saltLoad',
        severity: 'low',
        confidence: clampInt(Math.max(54, trend.score), 0, 100),
        status: 'watch',
        titleKey: 'careStudio.diagnosis.headline.saltLoadHigh',
        messageKey: 'careStudio.diagnosis.message.saltLoadHigh',
        causeKeys: ['careStudio.diagnosis.cause.supplyAheadOfDemand'],
        observationKeys: ['careStudio.diagnosis.observe.avoidStrongFeed'],
        suggestedActionCategory: 'fertilizing',
        suggestedActionTone: 'wait',
        linkedRisk: 'saltLoad',
        nextCheckHintKey: 'careStudio.diagnosis.nextCheck.saltLoad',
        trendKey: trend.labelKey,
        trendMessageKey: trend.messageKey
      });
    }

    if (!candidates.length || (risk <= 28 && stress <= 26 && water.overwateringPressure <= 18 && water.dryStressPressure <= 22 && nutrients.saltLoad <= 52 && averageNutrition >= 44 && averageNutrition <= 66 && rootStable)) {
      candidates.push({
        primaryFocus: 'stable',
        severity: 'none',
        confidence: trend.key === 'stress_recovering' || trend.key === 'risk_falling' || trend.key === 'stable_state' ? 78 : 70,
        status: trend.key === 'salt_load_rising' ? 'watch' : 'stable',
        titleKey: 'careStudio.diagnosis.headline.stable',
        messageKey: 'careStudio.diagnosis.message.stable',
        causeKeys: ['careStudio.diagnosis.cause.valuesInRange'],
        observationKeys: ['careStudio.diagnosis.observe.monitorDrybackAndSupply'],
        suggestedActionCategory: 'stable',
        suggestedActionTone: 'wait',
        linkedRisk: 'none',
        nextCheckHintKey: 'careStudio.diagnosis.nextCheck.monitor',
        trendKey: trend.labelKey,
        trendMessageKey: trend.messageKey
      });
    }

    return selectBestDiagnosis(candidates);
  }

  function getWateringRecommendation(state) {
    const care = normalizeCareState(getRootState(state).care, state);
    const water = care.water;
    const status = getStatus(state);
    const rootZoneWet = water.overwateringPressure >= 55 || water.rootZoneMoisture >= 82;
    const rootZoneLoaded = water.rootZoneMoisture >= 72 || water.overwateringPressure >= 30;
    const surfaceReady = water.surfaceMoisture <= 34;
    const drybackActive = water.drybackRatePerHour >= 1.15;
    const strongDryStress = water.dryStressPressure >= 48 || water.substrateMoisture <= 34;
    const moderateDryStress = water.dryStressPressure >= 28 || water.substrateMoisture <= 42;
    const plantStressed = Number(status.stress || 0) >= 58;

    if (rootZoneWet) {
      return {
        key: 'wait_dryback',
        level: 'warning',
        actionId: null,
        messageKey: 'care.recommendation.water.wait_dryback',
        reasonKey: 'care.reason.root_zone_wet'
      };
    }
    if (surfaceReady && rootZoneLoaded && !strongDryStress) {
      return {
        key: 'small_sip',
        level: 'caution',
        actionId: 'watering_low_mist',
        messageKey: 'care.recommendation.water.small_sip',
        reasonKey: 'care.reason.surface_dry'
      };
    }
    if (strongDryStress && (surfaceReady || drybackActive || water.rootZoneMoisture <= 58)) {
      return {
        key: 'water_now',
        level: 'positive',
        actionId: 'watering_medium_deep',
        messageKey: 'care.recommendation.water.water_now',
        reasonKey: 'care.reason.substrate_dry'
      };
    }
    if (surfaceReady && water.rootZoneMoisture <= 72 && (drybackActive || plantStressed)) {
      return {
        key: 'water_now',
        level: 'positive',
        actionId: 'watering_medium_deep',
        messageKey: 'care.recommendation.water.water_now',
        reasonKey: 'care.reason.surface_dry'
      };
    }
    if (moderateDryStress && water.rootZoneMoisture <= 64) {
      return {
        key: 'small_sip',
        level: 'caution',
        actionId: 'watering_low_mist',
        messageKey: 'care.recommendation.water.small_sip',
        reasonKey: 'care.reason.surface_dry'
      };
    }
    return {
      key: 'monitor',
      level: 'info',
      actionId: null,
      messageKey: 'care.recommendation.water.monitor',
      reasonKey: 'care.reason.moisture_stable'
    };
  }

  function getFeedingRecommendation(state) {
    const care = normalizeCareState(getRootState(state).care, state);
    const nutrients = care.nutrients;
    const water = care.water;
    const status = getStatus(state);
    const averageNutrition = getAverageNutritionValue(nutrients);
    const plantStress = Number(status.stress || 0);
    const saltPressureHigh = nutrients.saltLoad >= 62;
    const rootZoneTooDry = water.substrateMoisture <= 30 || water.rootZoneMoisture <= 36;
    const rootZoneTooWet = water.rootZoneMoisture >= 84 || water.overwateringPressure >= 42;
    const uptakeReady = (
      water.substrateMoisture >= 38
      && water.substrateMoisture <= 72
      && water.rootZoneMoisture >= 42
      && water.rootZoneMoisture <= 76
      && plantStress < 58
    );

    if (saltPressureHigh) {
      return {
        key: 'hold_feed',
        level: 'warning',
        actionId: null,
        messageKey: 'care.recommendation.feed.hold',
        reasonKey: 'care.reason.salt_pressure'
      };
    }
    if (rootZoneTooDry) {
      return {
        key: 'hydrate_first',
        level: 'caution',
        actionId: 'watering_low_mist',
        messageKey: 'care.recommendation.feed.hydrate_first',
        reasonKey: 'care.reason.medium_too_dry'
      };
    }
    if (rootZoneTooWet) {
      return {
        key: 'wait_root_zone',
        level: 'warning',
        actionId: null,
        messageKey: 'care.recommendation.feed.wait_root_zone',
        reasonKey: 'care.reason.root_zone_wet'
      };
    }
    if (averageNutrition <= 42 && uptakeReady) {
      return {
        key: 'feed_now',
        level: 'positive',
        actionId: 'fertilizing_medium_balanced',
        messageKey: 'care.recommendation.feed.feed_now',
        reasonKey: 'care.reason.nutrient_buffer_low'
      };
    }
    if (averageNutrition <= 50 && uptakeReady && nutrients.saltLoad <= 44) {
      return {
        key: 'feed_now',
        level: 'positive',
        actionId: 'fertilizing_medium_balanced',
        messageKey: 'care.recommendation.feed.feed_now',
        reasonKey: 'care.reason.nutrient_buffer_low'
      };
    }
    return {
      key: 'stable',
      level: 'info',
      actionId: null,
      messageKey: 'care.recommendation.feed.stable',
      reasonKey: 'care.reason.nutrition_stable'
    };
  }

  function getCareReadiness(state) {
    const care = normalizeCareState(getRootState(state).care, state);
    const diagnosis = getCareDiagnosis({
      ...(getRootState(state)),
      care
    });
    const watering = getWateringRecommendation({
      ...(getRootState(state)),
      care
    });
    const feeding = getFeedingRecommendation({
      ...(getRootState(state)),
      care
    });
    return {
      watering,
      feeding,
      riskLevel: buildRiskLevel(care.water.dryStressPressure, care.water.overwateringPressure, care.nutrients.saltLoad),
      nextFocus: getDiagnosisNextFocus(diagnosis),
      diagnosis
    };
  }

  function deriveCareSummary(care, baseState) {
    const normalizedCare = normalizeCareState(care, baseState);
    const readiness = getCareReadiness({
      ...(getRootState(baseState)),
      care: normalizedCare
    });
    const moisture = normalizedCare.water.substrateMoisture;
    const rootZone = normalizedCare.water.rootZoneMoisture;
    const surface = normalizedCare.water.surfaceMoisture;
    const displayMoisture = clampInt((moisture * 0.35) + (surface * 0.25) + (rootZone * 0.4), 0, 100);
    const rootZoneRiskScore = buildCareSummaryRootZoneRiskScore(normalizedCare.water);
    const riskScore = buildCareSummaryRiskScore(normalizedCare.water, normalizedCare.nutrients);
    const riskLevel = buildCareSummaryRiskLevel(riskScore);
    let moistureBand = 'stable';
    if (displayMoisture <= 34 && rootZone <= 58) {
      moistureBand = 'dry';
    } else if (displayMoisture >= 78 || rootZone >= 82) {
      moistureBand = 'wet';
    }

    let rootZoneHint = 'care.hint.root_zone_balanced';
    if (rootZone >= 82) {
      rootZoneHint = 'care.hint.root_zone_wet';
    } else if (surface <= 30 && rootZone >= 55) {
      rootZoneHint = 'care.hint.root_zone_deeper_than_surface';
    } else if (rootZone <= 38) {
      rootZoneHint = 'care.hint.root_zone_dry';
    }

    return {
      moistureBand,
      rootZoneHint,
      wateringRecommendation: readiness.watering,
      feedingRecommendation: readiness.feeding,
      riskLevel,
      riskScore,
      rootZoneRiskScore,
      nextCareFocus: readiness.nextFocus,
      buddyHintKey: wateringVsFeedingBuddyHint(readiness),
      diagnosis: readiness.diagnosis || getCareDiagnosis({
        ...(getRootState(baseState)),
        care: normalizedCare
      }),
      trend: deriveCareTrendSummary({
        ...(getRootState(baseState)),
        care: normalizedCare
      }),
      surfaceMoisture: Math.round(surface),
      rootZoneMoisture: Math.round(rootZone),
      substrateMoisture: Math.round(moisture),
      displayMoisture
    };
  }

  function wateringVsFeedingBuddyHint(readiness) {
    if (readiness.watering.level === 'warning') return 'care.buddy.wait_dryback';
    if (readiness.watering.level === 'positive') return 'care.buddy.water_window';
    if (readiness.feeding.level === 'warning') return 'care.buddy.feed_hold';
    if (readiness.feeding.level === 'positive') return 'care.buddy.feed_window';
    return 'care.buddy.observe';
  }

  function classifyTimingQuality(score) {
    const safeScore = clampInt(score, 0, 100);
    if (safeScore >= 78) return { quality: 'good', labelKey: 'careStudio.preview.timing.good', score: safeScore };
    if (safeScore >= 56) return { quality: 'okay', labelKey: 'careStudio.preview.timing.okay', score: safeScore };
    if (safeScore >= 36) return { quality: 'early', labelKey: 'careStudio.preview.timing.early', score: safeScore };
    return { quality: 'poor', labelKey: 'careStudio.preview.timing.poor', score: safeScore };
  }

  function classifyCareRisk(score, reasons) {
    const safeScore = clampInt(score, 0, 100);
    let level = 'low';
    if (safeScore >= 66) level = 'high';
    else if (safeScore >= 36) level = 'medium';
    return {
      level,
      score: safeScore,
      labelKey: `careStudio.risk.${level}`,
      reasons: Array.isArray(reasons) ? reasons.slice(0, 3) : []
    };
  }

  function classifyRecommendation(timingScore, riskLevel, benefitScore) {
    if (riskLevel === 'high' || timingScore <= 30 || benefitScore <= 26) {
      return { verdict: 'wait', labelKey: 'careStudio.preview.verdict.wait' };
    }
    if (timingScore >= 74 && riskLevel === 'low' && benefitScore >= 52) {
      return { verdict: 'recommended', labelKey: 'careStudio.preview.verdict.recommended' };
    }
    if (riskLevel === 'medium' || timingScore < 58) {
      return { verdict: 'situational', labelKey: 'careStudio.preview.verdict.situational' };
    }
    return { verdict: 'risky', labelKey: 'careStudio.preview.verdict.risky' };
  }

  function buildCareEffectForecast(entries) {
    return (Array.isArray(entries) ? entries : [])
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        return {
          type: String(entry.type || 'system'),
          direction: String(entry.direction || 'neutral'),
          labelKey: String(entry.labelKey || 'careStudio.preview.effect.monitor')
        };
      })
      .filter(Boolean)
      .slice(0, 3);
  }

  function getActionImmediateEffects(action) {
    const immediate = action && action.effects && action.effects.immediate;
    if (immediate && !Array.isArray(immediate) && typeof immediate === 'object') {
      return immediate;
    }
    if (Array.isArray(immediate)) {
      return immediate.reduce((acc, effect) => {
        if (effect && typeof effect === 'object') {
          const stat = String(effect.stat || '').trim();
          if (stat) {
            acc[stat] = toFiniteNumber(effect.value, 0);
          }
        }
        return acc;
      }, {});
    }
    return {};
  }

  function buildForecastDelta(key, value, tone) {
    const normalizedValue = Math.round(toFiniteNumber(value, 0));
    if (!normalizedValue) {
      return null;
    }
    const safeKey = String(key || 'stability');
    return {
      key: safeKey,
      labelKey: `careStudio.delta.${safeKey}`,
      value: normalizedValue,
      direction: normalizedValue > 0 ? 'up' : 'down',
      tone: String(tone || 'neutral')
    };
  }

  function compactForecastDeltas(entries) {
    const seen = new Set();
    return (Array.isArray(entries) ? entries : [])
      .filter(Boolean)
      .filter((entry) => {
        if (!entry || !entry.key || seen.has(entry.key)) {
          return false;
        }
        seen.add(entry.key);
        return true;
      })
      .sort((a, b) => Math.abs(Number(b.value || 0)) - Math.abs(Number(a.value || 0)))
      .slice(0, 4);
  }

  function getForecastTimingFactor(timing, risk) {
    const timingQuality = String(timing && timing.quality || '');
    const riskLevel = String(risk && risk.level || 'low');
    let factor = 1;
    if (timingQuality === 'good') factor += 0.16;
    if (timingQuality === 'early') factor -= 0.18;
    if (timingQuality === 'poor') factor -= 0.28;
    if (riskLevel === 'medium') factor -= 0.08;
    if (riskLevel === 'high') factor -= 0.18;
    return clamp(factor, 0.5, 1.25);
  }

  function buildWateringForecastDeltas(base, action, timing, risk) {
    const effects = getActionImmediateEffects(action);
    const water = base.care.water || {};
    const timingFactor = getForecastTimingFactor(timing, risk);
    const waterDelta = Math.max(2, toFiniteNumber(effects.water, 0) * timingFactor * base.intensityWeight);
    const dryStressRelief = Math.min(18, Math.max(2, waterDelta * 0.48 + toFiniteNumber(water.dryStressPressure, 0) / 18));
    const wetRootRisk = toFiniteNumber(water.rootZoneMoisture, 0) >= 78 ? 5 : 0;
    const overwaterDelta = Math.max(
      0,
      (waterDelta * 0.16)
        + (base.intensityWeight > 1.1 ? 2.5 : 0)
        + wetRootRisk
        + (toFiniteNumber(water.overwateringPressure, 0) >= 40 ? 2 : 0)
    );
    const riskDelta = toFiniteNumber(effects.risk, 0) + (risk.level === 'high' ? 4 : (risk.level === 'medium' ? 2 : 0));

    return compactForecastDeltas([
      buildForecastDelta('moisture', waterDelta, 'positive'),
      buildForecastDelta('dryStress', -dryStressRelief, 'positive'),
      buildForecastDelta('overwatering', overwaterDelta, overwaterDelta >= 6 ? 'warning' : 'neutral'),
      buildForecastDelta('risk', riskDelta, riskDelta > 0 ? 'warning' : 'positive')
    ]);
  }

  function buildFeedingForecastDeltas(base, action, timing, risk) {
    const effects = getActionImmediateEffects(action);
    const nutrients = base.care.nutrients || {};
    const timingFactor = getForecastTimingFactor(timing, risk);
    const nutritionDelta = Math.max(1, toFiniteNumber(effects.nutrition, 0) * timingFactor * base.intensityWeight);
    const saltDelta = Math.max(
      1,
      nutritionDelta * 0.42
        + (base.intensityWeight > 1.1 ? 3 : 0)
        + (toFiniteNumber(nutrients.saltLoad, 0) >= 58 ? 3 : 0)
    );
    const burnRiskDelta = Math.max(0, saltDelta * 0.55 + (risk.level === 'high' ? 4 : (risk.level === 'medium' ? 2 : 0)));
    const growthDelta = Math.max(0, toFiniteNumber(effects.growth, 0) * 10 + (timing.quality === 'good' ? 2 : 0));

    return compactForecastDeltas([
      buildForecastDelta('nutrition', nutritionDelta, 'positive'),
      buildForecastDelta('saltLoad', saltDelta, saltDelta >= 7 ? 'warning' : 'neutral'),
      buildForecastDelta('risk', burnRiskDelta, burnRiskDelta >= 6 ? 'warning' : 'neutral'),
      buildForecastDelta('growth', growthDelta, 'positive')
    ]);
  }

  function buildRoutineForecastDeltas(base, action, timing, risk) {
    const effects = getActionImmediateEffects(action);
    const safeCategory = getActionCategory(action);
    const timingFactor = getForecastTimingFactor(timing, risk);
    const stressEffect = toFiniteNumber(effects.stress, 0);
    const riskEffect = toFiniteNumber(effects.risk, 0);
    const healthEffect = toFiniteNumber(effects.health, 0);
    const stressDelta = stressEffect
      ? stressEffect * timingFactor
      : (safeCategory === 'environment' ? -3 : (risk.level === 'high' ? 3 : -1));
    const riskDelta = riskEffect
      ? riskEffect * (risk.level === 'high' ? 1.25 : 1)
      : (safeCategory === 'environment' ? -2 : (risk.level === 'high' ? 3 : 0));
    const stabilityDelta = Math.max(-8, Math.min(10, (timing.score - 50) / 8 - Math.max(0, riskDelta) * 0.4));
    const healthDelta = healthEffect * timingFactor;

    return compactForecastDeltas([
      buildForecastDelta('stress', stressDelta, stressDelta <= 0 ? 'positive' : 'warning'),
      buildForecastDelta('risk', riskDelta, riskDelta <= 0 ? 'positive' : (riskDelta >= 4 ? 'warning' : 'neutral')),
      buildForecastDelta('stability', stabilityDelta, stabilityDelta >= 0 ? 'positive' : 'warning'),
      buildForecastDelta('health', healthDelta, healthDelta >= 0 ? 'positive' : 'warning')
    ]);
  }

  function buildBuddyCareHint(category, timingQuality, riskLevel, verdict) {
    const safeCategory = String(category || '');
    if (safeCategory === 'watering') {
      if (verdict === 'recommended') return 'careStudio.buddy.waterGoodTiming';
      if (riskLevel === 'high') return 'careStudio.buddy.waterTooSoon';
      if (timingQuality === 'early') return 'careStudio.buddy.waterSmallSip';
      return 'careStudio.buddy.monitorRoots';
    }
    if (safeCategory === 'fertilizing') {
      if (verdict === 'recommended') return 'careStudio.buddy.feedReady';
      if (riskLevel === 'high') return 'careStudio.buddy.feedTooRisky';
      return 'careStudio.buddy.feedLight';
    }
    if (verdict === 'recommended') return 'careStudio.buddy.routineStable';
    if (riskLevel === 'high') return 'careStudio.buddy.stabilizeFirst';
    return 'careStudio.buddy.routineCareful';
  }

  function getActionFeedFamily(action) {
    const actionId = String(action && action.id || '').toLowerCase();
    if (actionId.includes('bloom')) return 'bloom';
    if (actionId.includes('calmag') || actionId.includes('micro')) return 'micro';
    if (actionId.includes('boost')) return 'booster';
    return 'grow';
  }

  function buildBasePreview(state, action) {
    const rootState = getRootState(state);
    const care = normalizeCareState(rootState.care, rootState);
    const status = getStatus(rootState);
    const plant = getPlant(rootState);
    return {
      rootState,
      care,
      status,
      plant,
      phaseLabel: mapPhaseLabel(plant.stageIndex, plant.phase),
      intensityWeight: getActionIntensityWeight(action)
    };
  }

  function getWateringActionPreview(state, action) {
    const base = buildBasePreview(state, action);
    const water = base.care.water;
    const riskReasons = [];
    const benefitEffects = [];
    let timingScore = 50;
    let riskScore = 10;
    let benefitScore = 32;

    if (water.surfaceMoisture <= 34) {
      timingScore += 16;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.surfaceReady');
      benefitEffects.push({ type: 'water', direction: 'up', labelKey: 'careStudio.preview.effect.moistureUp' });
    }
    if (water.rootZoneMoisture <= 72) {
      timingScore += 18;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.rootZoneReady');
    } else {
      timingScore -= 18;
      riskScore += 26;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.rootZoneWet');
    }
    if (water.drybackRatePerHour >= 1.15 && water.surfaceMoisture <= 40 && water.rootZoneMoisture <= 74) {
      timingScore += 10;
      benefitScore += 8;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.surfaceReady');
    }
    if (water.dryStressPressure >= 36 || water.substrateMoisture <= 38) {
      timingScore += 14;
      benefitScore += 22;
      benefitEffects.push({ type: 'stress', direction: 'down', labelKey: 'careStudio.preview.effect.dryStressDown' });
    }
    if (water.overwateringPressure >= 36) {
      riskScore += 22;
      timingScore -= 18;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.overwaterPressure');
      benefitEffects.push({ type: 'risk', direction: 'up', labelKey: 'careStudio.preview.effect.rootStressUp' });
    }
    if (base.intensityWeight > 1.1) {
      benefitScore += 10;
      riskScore += 14;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.strongAction');
    } else if (base.intensityWeight < 1) {
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.smallSipSafer');
    }
    if (Number(base.status.stress || 0) >= 62 && water.dryStressPressure < 36) {
      riskScore += 10;
      timingScore -= 8;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.plantStressed');
    }

    if (!benefitEffects.length) {
      benefitEffects.push({ type: 'water', direction: 'neutral', labelKey: 'careStudio.preview.effect.monitor' });
    }

    const timing = classifyTimingQuality(timingScore);
    const risk = classifyCareRisk(riskScore, riskReasons);
    const benefit = {
      level: benefitScore >= 65 ? 'high' : (benefitScore >= 40 ? 'medium' : 'low'),
      score: clampInt(benefitScore, 0, 100),
      effects: buildCareEffectForecast(benefitEffects)
    };
    const recommendation = classifyRecommendation(timing.score, risk.level, benefit.score);

    return {
      actionId: String(action && action.id || ''),
      category: 'watering',
      timing,
      risk,
      benefit,
      forecastDeltas: buildWateringForecastDeltas(base, action, timing, risk),
      recommendation,
      buddyHintKey: buildBuddyCareHint('watering', timing.quality, risk.level, recommendation.verdict)
    };
  }

  function getFeedingActionPreview(state, action) {
    const base = buildBasePreview(state, action);
    const nutrients = base.care.nutrients;
    const water = base.care.water;
    const riskReasons = [];
    const benefitEffects = [];
    let timingScore = 46;
    let riskScore = 16;
    let benefitScore = 36;
    const averageNutrition = getAverageNutritionValue(nutrients);
    const feedFamily = getActionFeedFamily(action);
    const uptakeReady = (
      water.substrateMoisture >= 38
      && water.substrateMoisture <= 72
      && water.rootZoneMoisture >= 42
      && water.rootZoneMoisture <= 76
      && Number(base.status.stress || 0) < 58
    );

    if (averageNutrition <= 46) {
      timingScore += 16;
      benefitScore += 20;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.nutrientBufferLow');
      benefitEffects.push({ type: 'nutrition', direction: 'up', labelKey: 'careStudio.preview.effect.nutritionUp' });
    } else if (averageNutrition >= 72) {
      timingScore -= 14;
      riskScore += 18;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.feedAlreadyHigh');
    }
    if (nutrients.saltLoad >= 58) {
      timingScore -= 18;
      riskScore += 28;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.saltPressureHigh');
      benefitEffects.push({ type: 'risk', direction: 'up', labelKey: 'careStudio.preview.effect.saltRiskUp' });
    } else if (nutrients.saltLoad <= 34) {
      timingScore += 8;
    }
    if (water.substrateMoisture <= 30) {
      timingScore -= 18;
      riskScore += 18;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.mediumTooDry');
    } else if (water.rootZoneMoisture >= 84) {
      timingScore -= 12;
      riskScore += 14;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.rootZoneWet');
    } else if (uptakeReady) {
      timingScore += 12;
      benefitScore += 8;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.rootZoneReady');
    } else {
      timingScore += 4;
    }
    if (Number(base.status.stress || 0) >= 58) {
      riskScore += 16;
      benefitScore -= 10;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.plantStressed');
    }

    if ((feedFamily === 'grow' || feedFamily === 'micro') && (base.phaseLabel === 'vegetative' || base.phaseLabel === 'stretch')) {
      timingScore += 8;
      benefitEffects.push({ type: 'growth', direction: 'up', labelKey: 'careStudio.preview.effect.growthSupport' });
    } else if (feedFamily === 'grow' && (base.phaseLabel === 'flower' || base.phaseLabel === 'late_flower')) {
      timingScore -= 10;
      riskScore += 8;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.phaseMismatch');
    }
    if ((feedFamily === 'bloom' || feedFamily === 'booster') && (base.phaseLabel === 'flower' || base.phaseLabel === 'late_flower')) {
      timingScore += 8;
      benefitScore += 10;
      benefitEffects.push({ type: 'flower', direction: 'up', labelKey: 'careStudio.preview.effect.flowerSupport' });
    } else if ((feedFamily === 'bloom' || feedFamily === 'booster') && base.phaseLabel === 'vegetative') {
      timingScore -= 12;
      riskScore += 8;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.phaseMismatch');
    }
    if (base.intensityWeight > 1.1) {
      riskScore += 18;
      benefitScore += 10;
      pushUniqueReason(riskReasons, 'careStudio.preview.reason.strongFeed');
      benefitEffects.push({ type: 'risk', direction: 'up', labelKey: 'careStudio.preview.effect.burnRiskUp' });
    }

    if (!benefitEffects.length) {
      benefitEffects.push({ type: 'nutrition', direction: 'neutral', labelKey: 'careStudio.preview.effect.monitor' });
    }

    const timing = classifyTimingQuality(timingScore);
    const risk = classifyCareRisk(riskScore, riskReasons);
    const benefit = {
      level: benefitScore >= 65 ? 'high' : (benefitScore >= 40 ? 'medium' : 'low'),
      score: clampInt(benefitScore, 0, 100),
      effects: buildCareEffectForecast(benefitEffects)
    };
    const recommendation = classifyRecommendation(timing.score, risk.level, benefit.score);

    return {
      actionId: String(action && action.id || ''),
      category: 'fertilizing',
      timing,
      risk,
      benefit,
      forecastDeltas: buildFeedingForecastDeltas(base, action, timing, risk),
      recommendation,
      buddyHintKey: buildBuddyCareHint('fertilizing', timing.quality, risk.level, recommendation.verdict)
    };
  }

  function getRoutineActionPreview(state, action) {
    const base = buildBasePreview(state, action);
    const safeCategory = getActionCategory(action);
    const riskReasons = [];
    const benefitEffects = [];
    let timingScore = 54;
    let riskScore = 14;
    let benefitScore = 34;
    const isInvasive = safeCategory === 'training' && base.intensityWeight >= 1;

    if (Number(base.status.stress || 0) <= 34 && Number(base.status.health || 0) >= 62) {
      timingScore += 16;
      benefitScore += 16;
      riskReasons.push('careStudio.preview.reason.stableCanopy');
      benefitEffects.push({ type: 'routine', direction: 'up', labelKey: 'careStudio.preview.effect.routineStable' });
    } else {
      riskScore += 14;
      timingScore -= 10;
      riskReasons.push('careStudio.preview.reason.plantStressed');
    }
    if (isInvasive) {
      riskScore += 18;
      timingScore -= 8;
      riskReasons.push('careStudio.preview.reason.trainingInvasive');
    }
    if (base.phaseLabel === 'late_flower' && safeCategory === 'training') {
      riskScore += 18;
      timingScore -= 16;
      riskReasons.push('careStudio.preview.reason.lateFlowerSensitive');
    }
    if (safeCategory === 'environment') {
      timingScore += 8;
      benefitScore += 10;
      benefitEffects.push({ type: 'environment', direction: 'up', labelKey: 'careStudio.preview.effect.environmentStable' });
    }

    if (!benefitEffects.length) {
      benefitEffects.push({ type: 'routine', direction: 'neutral', labelKey: 'careStudio.preview.effect.monitor' });
    }

    const timing = classifyTimingQuality(timingScore);
    const risk = classifyCareRisk(riskScore, riskReasons);
    const benefit = {
      level: benefitScore >= 60 ? 'high' : (benefitScore >= 40 ? 'medium' : 'low'),
      score: clampInt(benefitScore, 0, 100),
      effects: buildCareEffectForecast(benefitEffects)
    };
    const recommendation = classifyRecommendation(timing.score, risk.level, benefit.score);

    return {
      actionId: String(action && action.id || ''),
      category: safeCategory || 'routine',
      timing,
      risk,
      benefit,
      forecastDeltas: buildRoutineForecastDeltas(base, action, timing, risk),
      recommendation,
      buddyHintKey: buildBuddyCareHint('routine', timing.quality, risk.level, recommendation.verdict)
    };
  }

  function getCareActionPreview(state, action) {
    const safeAction = action && typeof action === 'object' ? action : null;
    if (!safeAction) {
      return {
        actionId: '',
        category: '',
        timing: classifyTimingQuality(0),
        risk: classifyCareRisk(0, []),
        benefit: {
          level: 'low',
          score: 0,
          effects: buildCareEffectForecast([{ type: 'system', direction: 'neutral', labelKey: 'careStudio.preview.effect.monitor' }])
        },
        forecastDeltas: [],
        recommendation: { verdict: 'wait', labelKey: 'careStudio.preview.verdict.wait' },
        buddyHintKey: 'careStudio.buddy.monitorRoots'
      };
    }

    const category = getActionCategory(safeAction);
    if (category === 'watering') return getWateringActionPreview(state, safeAction);
    if (category === 'fertilizing') return getFeedingActionPreview(state, safeAction);
    return getRoutineActionPreview(state, safeAction);
  }

  function getFocusKeyFromPreview(preview) {
    const safeCategory = String(preview && preview.category || '');
    if (preview && preview.risk && preview.risk.level === 'high') {
      if (previewHasReason(preview, 'careStudio.preview.reason.saltPressureHigh')) {
        return 'careStudio.focus.watchSaltLoad';
      }
      return 'careStudio.focus.stabilizePlant';
    }
    if (safeCategory === 'watering') return 'careStudio.focus.monitorDryback';
    if (safeCategory === 'fertilizing') {
      if (previewHasReason(preview, 'careStudio.preview.reason.saltPressureHigh')) {
        return 'careStudio.focus.watchSaltLoad';
      }
      if (previewHasReason(preview, 'careStudio.preview.reason.rootZoneWet') || previewHasReason(preview, 'careStudio.preview.reason.mediumTooDry')) {
        return 'careStudio.focus.monitorDryback';
      }
      return 'careStudio.focus.watchSaltLoad';
    }
    return 'careStudio.focus.monitorPlant';
  }

  function previewHasReason(preview, reasonKey) {
    const reasons = Array.isArray(preview && preview.risk && preview.risk.reasons) ? preview.risk.reasons : [];
    return reasons.includes(reasonKey);
  }

  function resolveFeedbackMessageKey(action, preview, grade) {
    const category = getActionCategory(action);
    const actionId = String(action && action.id || '').trim().toLowerCase();
    if (actionId === 'water_relieve_root_zone') {
      if (grade === 'good' || grade === 'perfect' || grade === 'okay') return 'careStudio.feedback.rootZoneRelief';
      if (grade === 'risky' || grade === 'bad') return 'careStudio.feedback.rootZoneReliefLimited';
      return 'careStudio.feedback.okayCare';
    }
    if (actionId === 'feed_stabilize_uptake') {
      if (grade === 'good' || grade === 'perfect' || grade === 'okay') return 'careStudio.feedback.uptakeStabilized';
      if (grade === 'risky' || grade === 'bad') return 'careStudio.feedback.uptakeLimited';
      return 'careStudio.feedback.goodCare';
    }
    if (actionId === 'routine_hygiene_round') {
      if (grade === 'good' || grade === 'perfect' || grade === 'okay') return 'careStudio.feedback.hygieneSettled';
      if (grade === 'risky' || grade === 'bad') return 'careStudio.feedback.riskyCare';
      return 'careStudio.feedback.goodCare';
    }
    if (category === 'watering') {
      if (grade === 'perfect') return 'careStudio.feedback.perfectWatering';
      if (grade === 'good') return 'careStudio.feedback.goodWatering';
      if (grade === 'risky') return 'careStudio.feedback.riskyWatering';
      return grade === 'bad' ? 'careStudio.feedback.badCare' : 'careStudio.feedback.okayCare';
    }
    if (category === 'fertilizing') {
      if (grade === 'perfect') return 'careStudio.feedback.perfectCare';
      if (grade === 'good') return 'careStudio.feedback.goodFeeding';
      if (grade === 'risky' || previewHasReason(preview, 'careStudio.preview.reason.saltPressureHigh')) {
        return 'careStudio.feedback.riskyFeeding';
      }
      return grade === 'bad' ? 'careStudio.feedback.badCare' : 'careStudio.feedback.goodCare';
    }
    if (grade === 'perfect') return 'careStudio.feedback.perfectCare';
    if (grade === 'good') return 'careStudio.feedback.goodCare';
    if (grade === 'bad') return 'careStudio.feedback.badCare';
    if (grade === 'risky') return 'careStudio.feedback.riskyCare';
    return 'careStudio.feedback.okayCare';
  }

  function getCareActionFeedback(state, action, result) {
    const safeAction = action && typeof action === 'object' ? action : {};
    const safeResult = result && typeof result === 'object' ? result : {};
    const preview = getCareActionPreview(state, safeAction);
    const deltaSummary = safeResult.deltaSummary && typeof safeResult.deltaSummary === 'object' ? safeResult.deltaSummary : {};
    const waterDelta = toFiniteNumber(deltaSummary.water, 0);
    const nutritionDelta = toFiniteNumber(deltaSummary.nutrition, 0);
    const stressDelta = toFiniteNumber(deltaSummary.stress, 0);
    const riskDelta = toFiniteNumber(deltaSummary.risk, 0);
    const healthDelta = toFiniteNumber(deltaSummary.health, 0);
    const growthDelta = toFiniteNumber(deltaSummary.growth, 0);

    let score = 48;
    if (preview.recommendation.verdict === 'recommended') score += 24;
    else if (preview.recommendation.verdict === 'situational') score += 8;
    else if (preview.recommendation.verdict === 'risky') score -= 10;
    else score -= 20;

    score += Math.max(0, waterDelta) * 0.45;
    score += Math.max(0, nutritionDelta) * 0.42;
    score += Math.max(0, healthDelta) * 4;
    score += Math.max(0, growthDelta) * 8;
    score += Math.max(0, -stressDelta) * 5;
    score -= Math.max(0, stressDelta) * 6;
    score -= Math.max(0, riskDelta) * 7;
    score -= safeResult.soft ? 4 : 0;
    score -= Array.isArray(safeResult.sideEffects) ? safeResult.sideEffects.length * 6 : 0;

    let grade = 'okay';
    if (score >= 86) {
      grade = 'perfect';
    } else if (score >= 68) {
      grade = 'good';
    } else if (score <= 28) {
      grade = 'bad';
    } else if (score <= 44) {
      grade = 'risky';
    }
    const messageKey = resolveFeedbackMessageKey(safeAction, preview, grade);

    const effects = [];
    if (getActionCategory(safeAction) === 'watering' && waterDelta > 0) {
      effects.push('careStudio.feedback.effect.moistureRaised');
    }
    if (getActionCategory(safeAction) === 'fertilizing' && nutritionDelta > 0) {
      effects.push('careStudio.feedback.effect.nutrientSupport');
    }
    if (stressDelta < 0) {
      effects.push('careStudio.feedback.effect.dryStressReduced');
    }
    if (riskDelta > 0) {
      effects.push('careStudio.feedback.effect.riskRaised');
    } else if (riskDelta < 0) {
      effects.push('careStudio.feedback.effect.riskSettled');
    }
    if (!effects.length) {
      effects.push('careStudio.feedback.effect.monitorResponse');
    }

    const focusKey = getFocusKeyFromPreview(preview);
    return {
      grade,
      score: clampInt(score, 0, 100),
      scoreDelta: grade === 'perfect' ? 4 : (grade === 'good' ? 2 : (grade === 'risky' ? -2 : (grade === 'bad' ? -4 : 0))),
      messageKey,
      effects: effects.slice(0, 3),
      nextFocusKey: focusKey,
      buddyHintKey: buildBuddyCareHint(getActionCategory(safeAction), preview.timing.quality, preview.risk.level, preview.recommendation.verdict),
      preview
    };
  }

  const api = Object.freeze({
    createDefaultCareState,
    createDefaultCareTrends,
    normalizeCareState,
    normalizeCareTrends,
    captureCareTrendSnapshot,
    deriveCareTrendSummary,
    getCareTrendDiagnosis,
    deriveCareSummary,
    estimateDrybackRate,
    getCareReadiness,
    getCareDiagnosis,
    getWateringRecommendation,
    getFeedingRecommendation,
    getCareActionPreview,
    getWateringActionPreview,
    getFeedingActionPreview,
    getRoutineActionPreview,
    getCareActionFeedback,
    classifyTimingQuality,
    classifyCareRisk,
    buildCareEffectForecast,
    buildBuddyCareHint
  });

  globalScope.GrowSimCareModel = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
