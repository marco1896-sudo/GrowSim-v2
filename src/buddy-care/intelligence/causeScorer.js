'use strict';

(function attachGrowSimCareCauseScorer(globalScope) {
  function toArray(value) { return Array.isArray(value) ? value : []; }
  function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

  const CAUSES = Object.freeze([
    { id: 'wet_root_zone', titleKey: 'buddyCare.intelligence.cause.wet_root_zone', safeCheckId: 'check_substrate_moisture', actionId: 'avoid_watering_today', cap: 0.88 },
    { id: 'dry_root_zone', titleKey: 'buddyCare.intelligence.cause.dry_root_zone', safeCheckId: 'check_substrate_moisture', actionId: 'water_if_dry', cap: 0.9 },
    { id: 'heat_or_light_stress', titleKey: 'buddyCare.intelligence.cause.heat_or_light_stress', safeCheckId: 'check_heat_exposure', actionId: 'reduce_midday_light', cap: 0.82 },
    { id: 'possible_nutrient_shortage', titleKey: 'buddyCare.intelligence.cause.possible_nutrient_shortage', safeCheckId: 'check_leaf_area', actionId: 'observe_before_feeding', cap: 0.58 },
    { id: 'possible_overfeeding', titleKey: 'buddyCare.intelligence.cause.possible_overfeeding', safeCheckId: 'check_recent_feeding', actionId: 'pause_feeding', cap: 0.72 },
    { id: 'normal_leaf_turnover', titleKey: 'buddyCare.intelligence.cause.normal_leaf_turnover', safeCheckId: 'check_leaf_area', actionId: 'observe_two_days', cap: 0.64 },
    { id: 'possible_pest_pressure', titleKey: 'buddyCare.intelligence.cause.possible_pest_pressure', safeCheckId: 'check_leaf_undersides', actionId: 'check_leaf_undersides', cap: 0.93 },
    { id: 'possible_ph_uptake_range', titleKey: 'buddyCare.intelligence.cause.possible_ph_uptake_range', safeCheckId: 'check_substrate_and_inputs', actionId: 'document_before_adjusting', cap: 0.48 },
    { id: 'transplant_or_location_stress', titleKey: 'buddyCare.intelligence.cause.transplant_or_location_stress', safeCheckId: 'check_recent_change', actionId: 'observe_after_change', cap: 0.56 }
  ]);

  function createDraft(definition) {
    return { ...definition, score: 0, supportingSignals: [], contradictingSignals: [], missingData: [] };
  }

  function support(draft, id, weight) {
    draft.score += weight;
    draft.supportingSignals.push(id);
  }

  function contradict(draft, id, weight) {
    draft.score -= weight;
    draft.contradictingSignals.push(id);
  }

  function missing(draft, id) {
    if (!draft.missingData.includes(id)) draft.missingData.push(id);
  }

  function scoreCause(definition, context, trend) {
    const draft = createDraft(definition);
    const rawCheck = context && context.currentCheck || {};
    const answers = context && context.answers || {};
    const check = {
      ...rawCheck,
      mediumMoisture: (!rawCheck.mediumMoisture || rawCheck.mediumMoisture === 'unknown') && answers.medium_moisture
        ? answers.medium_moisture
        : rawCheck.mediumMoisture,
      pestsVisible: rawCheck.pestsVisible === 'unsure' && answers.pests_visible
        ? answers.pests_visible
        : rawCheck.pestsVisible
    };
    const recurring = new Set(toArray(trend && trend.recurringPatterns));
    const trendSignals = new Set(toArray(trend && trend.signals));
    const profile = context && context.profile || {};
    const note = String(check.note || '').trim().toLowerCase();

    switch (definition.id) {
      case 'wet_root_zone':
        if (check.mediumMoisture === 'wet') support(draft, 'current_wet_substrate', 3.2);
        else if (check.mediumMoisture === 'dry') contradict(draft, 'current_dry_substrate', 4);
        else if (!check.mediumMoisture || check.mediumMoisture === 'unknown') missing(draft, 'medium_moisture');
        if (check.leafState === 'hanging') support(draft, 'hanging_leaves', 1.4);
        if (recurring.has('repeated_wet')) support(draft, 'repeated_wet_substrate', 1.5);
        if (trendSignals.has('growth_stagnating')) support(draft, 'growth_stagnating', 0.6);
        break;
      case 'dry_root_zone':
        if (check.mediumMoisture === 'dry') support(draft, 'current_dry_substrate', 3.4);
        else if (check.mediumMoisture === 'wet') contradict(draft, 'current_wet_substrate', 4);
        else if (!check.mediumMoisture || check.mediumMoisture === 'unknown') missing(draft, 'medium_moisture');
        if (check.leafState === 'hanging') support(draft, 'hanging_leaves', 1.5);
        if (recurring.has('repeated_dry')) support(draft, 'repeated_dry_substrate', 1.5);
        break;
      case 'heat_or_light_stress':
        if (check.environmentStress === 'hot') support(draft, 'heat_reported', 3.2);
        else if (check.environmentStress === 'normal') contradict(draft, 'environment_reported_normal', 0.8);
        else if (!check.environmentStress || check.environmentStress === 'unknown') missing(draft, 'heat_exposure');
        if (answers.heat_exposure === 'yes') support(draft, 'recent_heat_exposure', 2);
        if (answers.heat_exposure === 'no') contradict(draft, 'no_recent_heat_exposure', 1.6);
        if (check.leafState === 'curling') support(draft, 'curling_leaves', 1);
        break;
      case 'possible_nutrient_shortage':
        if (check.leafState === 'yellowing') support(draft, 'yellowing_leaves', 1.8);
        if (answers.leaf_area === 'lower') support(draft, 'lower_leaves_affected', 1.4);
        if (check.growthState === 'slow') support(draft, 'slow_growth', 0.9);
        if (!answers.leaf_area && check.leafState === 'yellowing') missing(draft, 'leaf_area');
        if (check.mediumMoisture === 'wet') contradict(draft, 'wet_root_zone_alternative', 1.2);
        break;
      case 'possible_overfeeding':
        if (answers.recent_feeding === 'yes') support(draft, 'recent_feeding', 2.6);
        else if (answers.recent_feeding === 'no') contradict(draft, 'no_recent_feeding', 2.5);
        else missing(draft, 'recent_feeding');
        if (check.leafState === 'curling' || check.leafState === 'spots') support(draft, 'leaf_change_after_feeding_possible', 1.1);
        if (check.growthState === 'slow') support(draft, 'slow_growth', 0.5);
        break;
      case 'normal_leaf_turnover':
        if (check.leafState === 'yellowing') support(draft, 'yellowing_leaves', 1.5);
        if (answers.leaf_area === 'lower') support(draft, 'lower_leaves_affected', 1.2);
        if (['flower', 'flowering', 'ripening', 'harvest_window', 'harvest'].includes(profile.phase)) support(draft, 'later_growth_phase', 1.1);
        if (trend && trend.direction === 'stable') support(draft, 'overall_stable', 0.6);
        if (trend && trend.direction === 'worsening') contradict(draft, 'progressive_worsening', 2);
        if (!answers.leaf_area && check.leafState === 'yellowing') missing(draft, 'leaf_area');
        break;
      case 'possible_pest_pressure':
        if (check.pestsVisible === 'yes') support(draft, 'pests_visible', 4.5);
        if (check.pestsVisible === 'unsure') support(draft, 'pests_uncertain', 1.2);
        if (check.pestsVisible === 'no') contradict(draft, 'no_pests_visible', 1.8);
        if (answers.pests_visible === 'yes') support(draft, 'pest_answer_yes', 2.4);
        if (answers.pests_visible === 'no') contradict(draft, 'pest_answer_no', 1.8);
        if (check.leafState === 'spots') support(draft, 'leaf_spots', 0.9);
        break;
      case 'possible_ph_uptake_range':
        if (check.leafState === 'yellowing' || check.leafState === 'spots') support(draft, 'leaf_discoloration', 1.1);
        if (check.growthState === 'slow') support(draft, 'slow_growth', 0.8);
        if (recurring.has('repeated_wet')) support(draft, 'wet_root_zone_may_limit_uptake', 0.5);
        missing(draft, 'ph_or_input_data');
        break;
      case 'transplant_or_location_stress':
        if (/umgetopft|standortwechsel|moved|transplant/.test(note)) support(draft, 'recent_change_noted', 2.5);
        if (answers.symptom_onset === 'sudden') support(draft, 'sudden_change', 0.8);
        if (!/umgetopft|standortwechsel|moved|transplant/.test(note)) missing(draft, 'recent_location_or_transplant_change');
        break;
      default:
        break;
    }

    const knownFields = ['mediumMoisture', 'leafState', 'growthState', 'environmentStress', 'pestsVisible']
      .filter((field) => check[field] && !['unknown', 'unsure'].includes(check[field])).length;
    const dataQuality = 0.45 + (knownFields * 0.1) + Math.min(0.15, Number(context && context.derived && context.derived.checkCount || 0) * 0.03);
    const specificity = Math.min(0.22, draft.supportingSignals.length * 0.055);
    let confidence = clamp01(((Math.max(0, draft.score) / 7) * 0.72 + specificity) * Math.min(1, dataQuality));
    confidence = Math.min(definition.cap, confidence);
    if (toArray(trend && trend.contradictions).length) confidence = Math.max(0, confidence - 0.12);

    return Object.freeze({
      id: definition.id,
      titleKey: definition.titleKey,
      score: Math.round(draft.score * 100) / 100,
      confidence: Math.round(confidence * 1000) / 1000,
      supportingSignals: Object.freeze(Array.from(new Set(draft.supportingSignals))),
      contradictingSignals: Object.freeze(Array.from(new Set(draft.contradictingSignals))),
      missingData: Object.freeze(draft.missingData.slice()),
      safeCheckId: definition.safeCheckId,
      actionId: definition.actionId
    });
  }

  function scorePossibleCauses(context, trend) {
    const check = context && context.currentCheck;
    if (!check) {
      return Object.freeze([Object.freeze({
        id: 'insufficient_data',
        titleKey: 'buddyCare.intelligence.cause.insufficient_data',
        score: 0,
        confidence: 0,
        supportingSignals: Object.freeze([]),
        contradictingSignals: Object.freeze([]),
        missingData: Object.freeze(['daily_check']),
        safeCheckId: 'start_daily_check',
        actionId: 'start_daily_check'
      })]);
    }
    const scored = CAUSES.map((definition) => scoreCause(definition, context, trend))
      .filter((cause) => cause.score >= 2.2 && cause.confidence >= 0.28)
      .sort((left, right) => right.score - left.score || right.confidence - left.confidence)
      .slice(0, 3);
    if (scored.length) return Object.freeze(scored);
    return Object.freeze([Object.freeze({
      id: 'insufficient_data',
      titleKey: 'buddyCare.intelligence.cause.insufficient_data',
      score: 0,
      confidence: 0.15,
      supportingSignals: Object.freeze([]),
      contradictingSignals: Object.freeze([]),
      missingData: Object.freeze(['decisive_signal']),
      safeCheckId: check.mediumMoisture === 'unknown' ? 'check_substrate_moisture' : 'observe_change',
      actionId: 'observe_two_days'
    })]);
  }

  const api = Object.freeze({ CAUSES, scorePossibleCauses });
  globalScope.GrowSimCareCauseScorer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
