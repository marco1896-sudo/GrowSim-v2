'use strict';

(function attachCareMapping(globalScope) {
  function clampPercent(value) {
    const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
    return Math.max(0, Math.min(100, numeric));
  }

  function deriveGlobalRiskLevel(riskValue) {
    const safeRisk = clampPercent(riskValue);
    if (safeRisk >= 75) return 'high';
    if (safeRisk >= 50) return 'elevated';
    if (safeRisk >= 25) return 'medium';
    return 'low';
  }

  function mapPhaseLabel(stageIndex, plantPhase) {
    const safePhase = String(plantPhase || '').trim().toLowerCase();
    const safeStageIndex = Number.isFinite(Number(stageIndex)) ? Number(stageIndex) : 0;
    if (safePhase.includes('late')) return 'late_flower';
    if (safePhase.includes('flower') || safeStageIndex >= 7) return 'flower';
    if (safePhase.includes('stretch') || safeStageIndex >= 5) return 'stretch';
    return 'vegetative';
  }

  const categoryOrder = Object.freeze(['watering', 'fertilizing', 'training', 'environment']);
  const categoryLabels = Object.freeze({
    watering: 'Bewässerung',
    fertilizing: 'Nährstoffe',
    training: 'Training',
    environment: 'Umgebung'
  });

  const tabCategoryMap = Object.freeze({
    water: ['watering'],
    feed: ['fertilizing'],
    routine: ['training', 'environment'],
    diagnosis: []
  });

  const careMapping = Object.freeze({
    id: 'care',
    reads: Object.freeze([
      'ui.care.selectedStudioTab',
      'ui.care.selectedCategory',
      'ui.care.selectedActionId',
      'ui.care.feedback',
      'actions.catalog',
      'actions.byId',
      'actions.cooldowns',
      'actions.lastResult',
      'simulation.nowMs',
      'simulation.isDaytime',
      'plant.stageIndex',
      'plant.phase',
      'status.water',
      'status.nutrition',
      'status.growth',
      'status.stress',
      'status.risk',
      'status.health',
      'care',
      'climate.tent.temperatureC',
      'climate.tent.humidityPercent',
      'climate.tent.vpdKpa',
      'climate.tent.airflowScore',
      'climate.tent.airflowLabel'
    ]),
    toViewModel(state) {
      const safeState = state && typeof state === 'object' ? state : {};
      const ui = safeState.ui || {};
      const careUi = ui.care || {};
      const actions = safeState.actions || {};
      const plant = safeState.plant || {};
      const status = safeState.status || {};
      const simulation = safeState.simulation || {};
      const care = safeState.care && typeof safeState.care === 'object' ? safeState.care : {};
      const tentClimate = safeState.climate && safeState.climate.tent && typeof safeState.climate.tent === 'object'
        ? safeState.climate.tent
        : {};
      const catalog = Array.isArray(actions.catalog) ? actions.catalog.slice() : [];
      const nowMs = Date.now();
      const hintApi = globalScope.GrowSimCareActionHints;
      const careApi = globalScope.GrowSimCareModel;
      const careMethodsApi = globalScope.GrowSimCareMethods;
      const stageIndex = Number(plant.stageIndex || 0);
      const plantPhase = String(plant.phase || '');
      const normalizedCare = careApi && typeof careApi.normalizeCareState === 'function'
        ? careApi.normalizeCareState(care, safeState)
        : care;
      const careSummary = careApi && typeof careApi.deriveCareSummary === 'function'
        ? careApi.deriveCareSummary(normalizedCare, safeState)
        : (normalizedCare.summary || {});
      const careReadiness = careApi && typeof careApi.getCareReadiness === 'function'
        ? careApi.getCareReadiness({ ...safeState, care: normalizedCare })
        : null;

      const methodDefinitions = careMethodsApi && typeof careMethodsApi.getAvailableCareMethods === 'function'
        ? careMethodsApi.getAvailableCareMethods(safeState)
        : [];
      const derivedCategories = categoryOrder.filter((category) => methodDefinitions.some((method) => method && method.category === category));
      const availableCategories = derivedCategories.length
        ? derivedCategories
        : categoryOrder.filter((category) => catalog.some((action) => action && action.category === category));

      const selectedTab = typeof careUi.selectedStudioTab === 'string' ? careUi.selectedStudioTab : 'water';
      const selectedActionId = careUi.selectedActionId || null;
      const selectedMethod = careMethodsApi && typeof careMethodsApi.getCareMethodById === 'function'
        ? careMethodsApi.getCareMethodById(selectedActionId)
        : null;
      const selectedLegacyAction = selectedMethod && actions.byId && selectedMethod.legacyFallbackActionId
        ? actions.byId[selectedMethod.legacyFallbackActionId] || null
        : null;
      const actionPreview = selectedMethod && careMethodsApi && typeof careMethodsApi.getCareMethodPreview === 'function'
        ? careMethodsApi.getCareMethodPreview({ ...safeState, care: normalizedCare }, selectedMethod, { legacyAction: selectedLegacyAction })
        : null;

      const activeCategories = tabCategoryMap[selectedTab] || [];
      const visibleActions = methodDefinitions
        .filter((method) => selectedTab === 'diagnosis' ? false : activeCategories.includes(String(method.category || '')))
        .map((method) => ({
          id: String(method.id || ''),
          labelKey: String(method.labelKey || ''),
          shortKey: String(method.shortKey || ''),
          descriptionKey: String(method.descriptionKey || ''),
          successKey: String(method.successKey || ''),
          category: String(method.category || ''),
          type: String(method.type || 'observe'),
          intensity: String(method.intensity || 'light'),
          cooldownRealMinutes: Math.max(0, Math.round(Number(method.cooldownHours || 0) * 60)),
          cooldownUntil: Number(actions.cooldowns && actions.cooldowns[method.id] || 0),
          cooldownLeftMs: Math.max(0, Number(actions.cooldowns && actions.cooldowns[method.id] || 0) - nowMs),
          riskProfile: String(method.riskProfile || 'safe'),
          legacyFallbackActionId: method.legacyFallbackActionId || null,
          isCareMethod: true
        }));

      const context = {
        stageIndex,
        plantPhase,
        phaseModel: hintApi && typeof hintApi.mapPlantProgressPhase === 'function'
          ? hintApi.mapPlantProgressPhase(stageIndex, plantPhase)
          : 'vegetative',
        isDaytime: Boolean(simulation.isDaytime),
        health: Number(status.health || 0),
        water: Number(status.water || 0),
        nutrition: Number(status.nutrition || 0),
        growth: Number(status.growth || 0),
        stress: Number(status.stress || 0),
        risk: Number(status.risk || 0),
        climate: {
          temperatureC: Number.isFinite(Number(tentClimate.temperatureC)) ? Number(tentClimate.temperatureC) : null,
          humidityPercent: Number.isFinite(Number(tentClimate.humidityPercent)) ? Number(tentClimate.humidityPercent) : null,
          vpdKpa: Number.isFinite(Number(tentClimate.vpdKpa)) ? Number(tentClimate.vpdKpa) : null,
          airflowScore: Number.isFinite(Number(tentClimate.airflowScore)) ? Number(tentClimate.airflowScore) : null,
          airflowLabel: tentClimate.airflowLabel ? String(tentClimate.airflowLabel) : ''
        }
      };

      const nutrientModel = normalizedCare && normalizedCare.nutrients && typeof normalizedCare.nutrients === 'object'
        ? normalizedCare.nutrients
        : {};
      const lastFeedback = normalizedCare && normalizedCare.feedback && typeof normalizedCare.feedback === 'object'
        ? normalizedCare.feedback
        : {};
      const summaryDisplayMoisture = careSummary && Number.isFinite(Number(careSummary.displayMoisture))
        ? Number(careSummary.displayMoisture)
        : (careSummary && Number.isFinite(Number(careSummary.substrateMoisture))
          ? Number(careSummary.substrateMoisture)
          : (normalizedCare && normalizedCare.water && Number.isFinite(Number(normalizedCare.water.substrateMoisture))
            ? Number(normalizedCare.water.substrateMoisture)
            : Number(status.water || 0)));
      const summaryRiskScore = careSummary && Number.isFinite(Number(careSummary.riskScore))
        ? Number(careSummary.riskScore)
        : Number(status.risk || 0);
      const summaryRiskLevel = careSummary && typeof careSummary.riskLevel === 'string' && careSummary.riskLevel.trim()
        ? careSummary.riskLevel.trim()
        : deriveGlobalRiskLevel(summaryRiskScore);
      const globalStatus = Object.freeze({
        water: clampPercent(summaryDisplayMoisture),
        nutrition: clampPercent(status.nutrition),
        stress: clampPercent(status.stress),
        risk: clampPercent(summaryRiskScore),
        riskLevel: summaryRiskLevel
      });

      return {
        open: ui.openSheet === 'care',
        selectedStudioTab: selectedTab,
        selectedCategory: availableCategories.includes(careUi.selectedCategory)
          ? careUi.selectedCategory
          : (availableCategories[0] || null),
        selectedActionId,
        selectedAction: selectedMethod,
        feedback: careUi.feedback || { kind: 'info', text: 'Wähle eine Methode.' },
        categoryOrder,
        categoryLabels,
        availableCategories,
        actions: visibleActions,
        context,
        care: {
          model: normalizedCare,
          summary: careSummary,
          globalStatus,
          readiness: careReadiness,
          moistureStatus: careSummary.moistureBand || 'stable',
          rootZoneHint: careSummary.rootZoneHint || 'care.hint.root_zone_balanced',
          wateringRecommendation: careSummary.wateringRecommendation || null,
          feedingRecommendation: careSummary.feedingRecommendation || null,
          riskLevel: careSummary.riskLevel || 'low',
          nextCareFocus: careSummary.nextCareFocus || 'routine',
          buddyHintKey: careSummary.buddyHintKey || 'care.buddy.observe',
          phaseLabel: mapPhaseLabel(stageIndex, plantPhase),
          drybackRatePerHour: Number(normalizedCare && normalizedCare.water ? normalizedCare.water.drybackRatePerHour : 0) || 0,
          nutrientBars: [
            { key: 'n', value: Math.round(Number(nutrientModel.n || 0)) },
            { key: 'p', value: Math.round(Number(nutrientModel.p || 0)) },
            { key: 'k', value: Math.round(Number(nutrientModel.k || 0)) },
            { key: 'micro', value: Math.round(Number(nutrientModel.micro || 0)) }
          ],
          saltLoad: Math.round(Number(nutrientModel.saltLoad || 0)),
          actionPreview,
          lastFeedback,
          diagnosis: careSummary.diagnosis || null
        }
      };
    }
  });

  globalScope.GrowSimScreenMappings = Object.assign({}, globalScope.GrowSimScreenMappings, {
    care: careMapping
  });
})(window);
