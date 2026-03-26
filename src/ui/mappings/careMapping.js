'use strict';

(function attachCareMapping(globalScope) {
  const categoryOrder = Object.freeze(['watering', 'fertilizing', 'training', 'environment']);
  const categoryLabels = Object.freeze({
    watering: 'Bewässerung',
    fertilizing: 'Nährstoffe',
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
      'status.water',
      'status.nutrition',
      'status.growth',
      'status.stress',
      'status.risk'
    ]),
    toViewModel(state) {
      const safeState = state && typeof state === 'object' ? state : {};
      const ui = safeState.ui || {};
      const careUi = ui.care || {};
      const actions = safeState.actions || {};
      const catalog = Array.isArray(actions.catalog) ? actions.catalog.slice() : [];
      const cooldowns = actions.cooldowns || {};
      const nowMs = Date.now();

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

      return {
        open: ui.openSheet === 'care',
        selectedCategory,
        selectedActionId: careUi.selectedActionId || null,
        feedback: careUi.feedback || { kind: 'info', text: 'Wähle eine Aktion.' },
        categoryOrder,
        categoryLabels,
        availableCategories,
        actions: visibleActions
      };
    }
  });

  globalScope.GrowSimScreenMappings = Object.assign({}, globalScope.GrowSimScreenMappings, {
    care: careMapping
  });
})(window);
