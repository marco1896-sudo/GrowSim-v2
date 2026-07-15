'use strict';

(function attachGrowSimCareSafetyRules(globalScope) {
  const ACTION_CATALOG = Object.freeze({
    start_daily_check: { id: 'start_daily_check', interventionRisk: 'low', reversible: true, controlWindowHours: 24 },
    check_substrate_moisture: { id: 'check_substrate_moisture', interventionRisk: 'low', reversible: true, controlWindowHours: 24 },
    avoid_watering_today: { id: 'avoid_watering_today', interventionRisk: 'low', reversible: true, controlWindowHours: 24 },
    water_if_dry: { id: 'water_if_dry', interventionRisk: 'medium', reversible: false, controlWindowHours: 24 },
    reduce_midday_light: { id: 'reduce_midday_light', interventionRisk: 'low', reversible: true, controlWindowHours: 48 },
    observe_before_feeding: { id: 'observe_before_feeding', interventionRisk: 'low', reversible: true, controlWindowHours: 48 },
    pause_feeding: { id: 'pause_feeding', interventionRisk: 'low', reversible: true, controlWindowHours: 48 },
    observe_two_days: { id: 'observe_two_days', interventionRisk: 'low', reversible: true, controlWindowHours: 48 },
    check_leaf_undersides: { id: 'check_leaf_undersides', interventionRisk: 'low', reversible: true, controlWindowHours: 24 },
    document_before_adjusting: { id: 'document_before_adjusting', interventionRisk: 'low', reversible: true, controlWindowHours: 48 },
    observe_after_change: { id: 'observe_after_change', interventionRisk: 'low', reversible: true, controlWindowHours: 48 },
    review_action_effect: { id: 'review_action_effect', interventionRisk: 'low', reversible: true, controlWindowHours: 1 }
  });

  function toArray(value) { return Array.isArray(value) ? value : []; }

  function actionDefinition(actionId, priority) {
    const base = ACTION_CATALOG[actionId] || ACTION_CATALOG.observe_two_days;
    return Object.freeze({
      ...base,
      titleKey: `buddyCare.intelligence.action.${base.id}`,
      reasonKey: `buddyCare.intelligence.actionReason.${base.id}`,
      priority
    });
  }

  function applyCareSafetyRules(candidateActionIds, context, trend, causes, priority) {
    const check = context && context.currentCheck || {};
    const activeActions = toArray(context && context.actions).filter((action) => !['improved', 'unchanged', 'worsened', 'cancelled'].includes(String(action && action.status || '')));
    const recentFailed = toArray(context && context.actions).filter((action) => ['unchanged', 'worsened'].includes(String(action && action.status || ''))
      && Number(context && context.generatedAt || Date.now()) - Number(action.updatedAt || 0) <= 14 * 24 * 60 * 60 * 1000);
    const recentHelped = toArray(context && context.actions).filter((action) => String(action && action.status || '') === 'improved'
      && Number(context && context.generatedAt || Date.now()) - Number(action.updatedAt || 0) <= 7 * 24 * 60 * 60 * 1000);
    const causeIds = new Set(toArray(causes).map((cause) => cause && cause.id));
    const confidence = toArray(causes)[0] ? Number(causes[0].confidence || 0) : 0;
    const safetyNotes = [];
    const deduped = [];

    toArray(candidateActionIds).forEach((rawId) => {
      const actionId = String(rawId || '').trim();
      if (!actionId || deduped.includes(actionId)) return;
      if (activeActions.some((action) => action.actionId === actionId)) { safetyNotes.push('action_already_open'); return; }
      if (recentFailed.some((action) => action.actionId === actionId)) { safetyNotes.push('action_failed_recently'); return; }
      if (recentHelped.some((action) => action.actionId === actionId)) { safetyNotes.push('action_recently_helped_wait'); return; }
      if (causeIds.has('wet_root_zone') && actionId === 'water_if_dry') { safetyNotes.push('no_watering_with_wet_root_suspicion'); return; }
      if ((causeIds.has('possible_overfeeding') || check.mediumMoisture === 'wet') && ['feed', 'light_feed', 'balanced_feed'].includes(actionId)) {
        safetyNotes.push('no_feeding_with_overfeeding_or_wet_substrate'); return;
      }
      const definition = ACTION_CATALOG[actionId] || ACTION_CATALOG.observe_two_days;
      if (confidence < 0.45 && definition.interventionRisk !== 'low') { safetyNotes.push('low_confidence_blocks_intervention'); return; }
      deduped.push(actionId);
    });

    const strongImmediateSignal = check.pestsVisible === 'yes'
      || (check.mediumMoisture === 'dry' && check.leafState === 'hanging')
      || (trend && trend.direction === 'worsening' && Number(trend.confidence || 0) >= 0.65);
    if (!deduped.length || (context && context.currentCheck && confidence < 0.38 && !strongImmediateSignal)) {
      if (!deduped.includes('observe_two_days')) deduped.unshift('observe_two_days');
      safetyNotes.push('observation_safer_than_intervention');
    }
    if (check.mediumMoisture === 'wet'
      && !deduped.includes('avoid_watering_today')
      && !activeActions.some((action) => action.actionId === 'avoid_watering_today')
      && !recentFailed.some((action) => action.actionId === 'avoid_watering_today')
      && !recentHelped.some((action) => action.actionId === 'avoid_watering_today')) {
      deduped.unshift('avoid_watering_today');
    }

    return Object.freeze({
      actions: Object.freeze(deduped.slice(0, 3).map((id) => actionDefinition(id, priority && priority.level || 'observe'))),
      safetyNotes: Object.freeze(Array.from(new Set(safetyNotes)))
    });
  }

  const api = Object.freeze({ ACTION_CATALOG, applyCareSafetyRules });
  globalScope.GrowSimCareSafetyRules = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
