'use strict';

(function attachGrowSimCareQuestionEngine(globalScope) {
  const QUESTIONS = Object.freeze({
    medium_moisture: Object.freeze({
      id: 'medium_moisture', promptKey: 'buddyCare.intelligence.question.medium_moisture.prompt', reasonKey: 'buddyCare.intelligence.question.medium_moisture.reason',
      options: Object.freeze(['dry', 'moist', 'wet', 'unknown'])
    }),
    leaf_area: Object.freeze({
      id: 'leaf_area', promptKey: 'buddyCare.intelligence.question.leaf_area.prompt', reasonKey: 'buddyCare.intelligence.question.leaf_area.reason',
      options: Object.freeze(['upper', 'lower', 'all', 'unknown'])
    }),
    recent_feeding: Object.freeze({
      id: 'recent_feeding', promptKey: 'buddyCare.intelligence.question.recent_feeding.prompt', reasonKey: 'buddyCare.intelligence.question.recent_feeding.reason',
      options: Object.freeze(['yes', 'no', 'unknown'])
    }),
    heat_exposure: Object.freeze({
      id: 'heat_exposure', promptKey: 'buddyCare.intelligence.question.heat_exposure.prompt', reasonKey: 'buddyCare.intelligence.question.heat_exposure.reason',
      options: Object.freeze(['yes', 'no', 'unknown'])
    }),
    pests_visible: Object.freeze({
      id: 'pests_visible', promptKey: 'buddyCare.intelligence.question.pests_visible.prompt', reasonKey: 'buddyCare.intelligence.question.pests_visible.reason',
      options: Object.freeze(['yes', 'no', 'unknown'])
    }),
    symptom_onset: Object.freeze({
      id: 'symptom_onset', promptKey: 'buddyCare.intelligence.question.symptom_onset.prompt', reasonKey: 'buddyCare.intelligence.question.symptom_onset.reason',
      options: Object.freeze(['sudden', 'gradual', 'unknown'])
    }),
    problem_spread: Object.freeze({
      id: 'problem_spread', promptKey: 'buddyCare.intelligence.question.problem_spread.prompt', reasonKey: 'buddyCare.intelligence.question.problem_spread.reason',
      options: Object.freeze(['yes', 'no', 'unknown'])
    }),
    leaf_texture: Object.freeze({
      id: 'leaf_texture', promptKey: 'buddyCare.intelligence.question.leaf_texture.prompt', reasonKey: 'buddyCare.intelligence.question.leaf_texture.reason',
      options: Object.freeze(['soft', 'dry', 'drooping', 'unknown'])
    })
  });

  function toArray(value) { return Array.isArray(value) ? value : []; }

  function presentQuestion(definition) {
    return Object.freeze({
      id: definition.id,
      promptKey: definition.promptKey,
      reasonKey: definition.reasonKey,
      options: Object.freeze(definition.options.map((value) => Object.freeze({
        value,
        labelKey: `buddyCare.intelligence.option.${value}`
      })))
    });
  }

  function selectPrimaryCareQuestion(context, causes, trend) {
    const check = context && context.currentCheck || null;
    const answers = context && context.answers || {};
    if (!check) return Object.freeze({ primaryQuestion: null, secondaryQuestion: null });
    const topCause = toArray(causes)[0] || null;
    const candidates = [];
    const add = (id, score) => {
      if (!QUESTIONS[id] || answers[id] || candidates.some((entry) => entry.id === id)) return;
      candidates.push({ id, score });
    };

    if (!check.mediumMoisture || check.mediumMoisture === 'unknown') add('medium_moisture', 100);
    if (toArray(trend && trend.contradictions).includes('moisture_changed_quickly')) add('medium_moisture', 96);
    if (check.pestsVisible === 'unsure') add('pests_visible', 90);
    if (check.leafState === 'yellowing') add('leaf_area', 82);
    if (check.leafState === 'hanging') add('leaf_texture', 70);
    if (check.environmentStress === 'hot' || check.leafState === 'curling') add('heat_exposure', 76);
    if (['spots', 'yellowing', 'curling'].includes(check.leafState)) add('recent_feeding', 68);
    if (toArray(trend && trend.signals).includes('new_issue')) add('symptom_onset', 64);
    if (toArray(trend && trend.signals).includes('same_leaf_issue_recurring') || (trend && trend.direction === 'worsening')) add('problem_spread', 72);

    toArray(topCause && topCause.missingData).forEach((missingId) => {
      const map = {
        medium_moisture: 'medium_moisture',
        leaf_area: 'leaf_area',
        recent_feeding: 'recent_feeding',
        heat_exposure: 'heat_exposure',
        recent_location_or_transplant_change: 'symptom_onset'
      };
      if (map[missingId]) add(map[missingId], 88);
    });

    const hasEnoughData = topCause && Number(topCause.confidence || 0) >= 0.65 && !toArray(topCause.missingData).length;
    if (hasEnoughData || !candidates.length) return Object.freeze({ primaryQuestion: null, secondaryQuestion: null });
    candidates.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
    return Object.freeze({ primaryQuestion: presentQuestion(QUESTIONS[candidates[0].id]), secondaryQuestion: null });
  }

  const api = Object.freeze({ QUESTIONS, selectPrimaryCareQuestion });
  globalScope.GrowSimCareQuestionEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
