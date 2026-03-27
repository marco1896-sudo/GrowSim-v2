'use strict';

(function attachCareMapping(globalScope) {
  const categoryOrder = Object.freeze(['watering', 'fertilizing', 'training', 'environment']);
  const categoryLabels = Object.freeze({
    watering: 'BewÃ¤sserung',
    fertilizing: 'NÃ¤hrstoffe',
    training: 'Training',
    environment: 'Umgebung'
  });

  const careMapping = Object.freeze({
    id: 'care',
    reads: Object.freeze([
      'ui.care.selectedCategory',
      'ui.care.selectedActionId',
      'ui.care.feedback',
      'actions.catalog',
      'actions.byId',
      'actions.cooldowns',
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
      const tentClimate = safeState.climate && safeState.climate.tent && typeof safeState.climate.tent === 'object'
        ? safeState.climate.tent
        : {};
      const catalog = Array.isArray(actions.catalog) ? actions.catalog.slice() : [];
      const cooldowns = actions.cooldowns || {};
      const nowMs = Date.now();
      const hintApi = globalScope.GrowSimCareActionHints;
      const stageIndex = Number(plant.stageIndex || 0);
      const plantPhase = String(plant.phase || '');

      const availableCategories = categoryOrder.filter((category) => catalog.some((action) => action && action.category === category));
      const selectedCategory = availableCategories.includes(careUi.selectedCategory)
        ? careUi.selectedCategory
        : (availableCategories[0] || null);

      const visibleActions = catalog
        .filter((action) => action && action.category === selectedCategory)
        .map((action) => {
          const cooldownUntil = Number(cooldowns[action.id] || 0);
          return {
            id: String(action.id || ''),
            label: String(action.label || action.id || ''),
            category: String(action.category || ''),
            intensity: String(action.intensity || 'medium'),
            cooldownRealMinutes: Number(action.cooldownRealMinutes || 0),
            cooldownUntil,
            cooldownLeftMs: Math.max(0, cooldownUntil - nowMs),
            uxCopy: action.uxCopy || null,
            effects: action.effects || null
          };
        });

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

      return {
        open: ui.openSheet === 'care',
        selectedCategory,
        selectedActionId: careUi.selectedActionId || null,
        feedback: careUi.feedback || { kind: 'info', text: 'WÃ¤hle eine Aktion.' },
        categoryOrder,
        categoryLabels,
        availableCategories,
        actions: visibleActions,
        context
      };
    }
  });

  globalScope.GrowSimScreenMappings = Object.assign({}, globalScope.GrowSimScreenMappings, {
    care: careMapping
  });
})(window);
