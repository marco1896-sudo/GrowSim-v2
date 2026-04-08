'use strict';

(function initEventResolution(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;

  function describeContract() {
    return Object.freeze({
      phase: 'shadow',
      responsibility: 'shadow-only resolution and outcome grading'
    });
  }

  function getEventOptions(eventDef) {
    if (eventDef && Array.isArray(eventDef.options)) return eventDef.options.slice();
    if (eventDef && Array.isArray(eventDef.choices)) return eventDef.choices.slice();
    return [];
  }

  function findOptionById(eventDef, optionId) {
    const targetId = String(optionId || '').trim();
    if (!targetId) {
      return null;
    }
    return getEventOptions(eventDef).find((option) => String(option && option.id || '') === targetId) || null;
  }

  function classifyProblemPole(eventDef, shadowEvent) {
    const id = String(eventDef && eventDef.id || '').toLowerCase();
    const category = String(eventDef && eventDef.category || 'generic').toLowerCase();
    const specificPressure = Number(shadowEvent && shadowEvent.specificPressure || 0);

    if (category === 'water') {
      if (id.includes('dry') || id.includes('drought') || id.includes('pot') || id.includes('rehyd')) return 'dry';
      if (id.includes('wet') || id.includes('overwater') || id.includes('root') || specificPressure >= 35) return 'wet';
      return 'unknown';
    }
    if (category === 'nutrition') {
      if (id.includes('lockout') || id.includes('salt') || id.includes('ph')) return 'lockout';
      if (id.includes('deficit') || id.includes('low')) return 'deficit';
      return 'unknown';
    }
    return category;
  }

  function getStagePenaltyMultiplier(shadowStage) {
    const stage = String(shadowStage || 'warning');
    if (stage === 'escalated') return 0.55;
    if (stage === 'escalating') return 0.72;
    if (stage === 'active') return 0.88;
    return 1;
  }

  function scoreGenericOptionFit(option, shadowEvent) {
    const effects = option && option.effects && typeof option.effects === 'object' ? option.effects : {};
    let score = 0;
    score += Number(effects.stress || 0) < 0 ? 10 : 0;
    score += Number(effects.risk || 0) < 0 ? 12 : 0;
    score += Number(effects.health || 0) > 0 ? 8 : 0;
    score -= Number(effects.stress || 0) > 0 ? 10 : 0;
    score -= Number(effects.risk || 0) > 0 ? 12 : 0;
    score -= Number(effects.health || 0) < 0 ? 10 : 0;
    if (String(shadowEvent && shadowEvent.activationState || '') === 'warning' && Number(effects.growth || 0) > 1.5) {
      score -= 4;
    }
    return score;
  }

  function scoreWaterFit(option, pole) {
    const effects = option && option.effects && typeof option.effects === 'object' ? option.effects : {};
    let score = 0;
    const water = Number(effects.water || 0);
    const stress = Number(effects.stress || 0);
    const risk = Number(effects.risk || 0);
    const health = Number(effects.health || 0);

    if (pole === 'dry') {
      if (water >= 6 && water <= 16) score += 26;
      else if (water > 16) score += 8;
      else if (water <= 0) score -= 24;
    }
    if (pole === 'wet') {
      if (water <= -4) score += 26;
      else if (water > 0) score -= 24;
    }

    if (stress < 0) score += 8;
    if (risk < 0) score += 10;
    if (health > 0) score += 4;
    if (risk > 0) score -= 8;
    if (stress > 0) score -= 6;
    return score;
  }

  function scoreNutritionFit(option, pole) {
    const effects = option && option.effects && typeof option.effects === 'object' ? option.effects : {};
    let score = 0;
    const nutrition = Number(effects.nutrition || 0);
    const water = Number(effects.water || 0);
    const risk = Number(effects.risk || 0);
    const stress = Number(effects.stress || 0);

    if (pole === 'deficit') {
      if (nutrition >= 6 && nutrition <= 12) score += 24;
      else if (nutrition > 12) score += 10;
      else if (nutrition <= 0) score -= 18;
    }
    if (pole === 'lockout') {
      if (nutrition < 0 || water > 0) score += 22;
      if (nutrition > 0 && water <= 0) score -= 18;
    }

    if (risk < 0) score += 8;
    if (stress < 0) score += 6;
    if (risk > 0) score -= 8;
    if (stress > 0) score -= 6;
    return score;
  }

  function scoreClimateFit(option) {
    const effects = option && option.effects && typeof option.effects === 'object' ? option.effects : {};
    let score = 0;
    if (Number(effects.stress || 0) < 0) score += 14;
    if (Number(effects.risk || 0) < 0) score += 10;
    if (Number(effects.health || 0) > 0) score += 4;
    if (Number(effects.stress || 0) > 0) score -= 10;
    if (Number(effects.risk || 0) > 0) score -= 8;
    return score;
  }

  function scoreRiskControlFit(option) {
    const effects = option && option.effects && typeof option.effects === 'object' ? option.effects : {};
    let score = 0;
    if (Number(effects.risk || 0) <= -4) score += 24;
    else if (Number(effects.risk || 0) < 0) score += 14;
    if (Number(effects.health || 0) > 0) score += 4;
    if (Number(effects.stress || 0) <= 0) score += 4;
    if (Number(effects.risk || 0) > 0) score -= 14;
    if (Number(effects.health || 0) < 0) score -= 10;
    return score;
  }

  function scoreOptionFit(eventDef, shadowEvent, option, pathKind) {
    if (pathKind === 'no_action') {
      return -28;
    }
    if (!option) {
      return -20;
    }

    const pole = classifyProblemPole(eventDef, shadowEvent);
    const category = String(eventDef && eventDef.category || 'generic').toLowerCase();
    let score = scoreGenericOptionFit(option, shadowEvent);

    if (category === 'water') score += scoreWaterFit(option, pole);
    else if (category === 'nutrition') score += scoreNutritionFit(option, pole);
    else if (category === 'environment') score += scoreClimateFit(option);
    else if (category === 'disease' || category === 'pest') score += scoreRiskControlFit(option);

    const optionId = String(option && option.id || '').toLowerCase();
    if (optionId.includes('ignore') || optionId.includes('wait') || optionId.includes('monitor_only') || optionId.includes('no_action')) {
      score -= 16;
    }
    if (optionId.includes('rescue') || optionId.includes('reduce') || optionId.includes('stabilize') || optionId.includes('recover')) {
      score += 6;
    }

    return shared.round2(score);
  }

  function computeDirectDeltas(option, shadowStage, fitScore, pathKind) {
    const rawEffects = option && option.effects && typeof option.effects === 'object' ? option.effects : {};
    const multiplier = getStagePenaltyMultiplier(shadowStage);
    const modeled = {};
    for (const [key, value] of Object.entries(rawEffects)) {
      modeled[key] = shared.round2(Number(value || 0) * multiplier);
    }

    if (pathKind === 'no_action') {
      modeled.stress = shared.round2(Number(modeled.stress || 0) + 3);
      modeled.risk = shared.round2(Number(modeled.risk || 0) + 4);
      modeled.health = shared.round2(Number(modeled.health || 0) - 2);
    }

    if (fitScore <= -12) modeled.futureEscalationTendency = 10;
    else if (fitScore >= 18) modeled.futureEscalationTendency = -10;
    else modeled.futureEscalationTendency = -2;

    return modeled;
  }

  function computePressureDelta(shadowEvent, directDeltas, fitScore, pathKind) {
    const stage = String(shadowEvent && shadowEvent.shadowStage || shadowEvent && shadowEvent.activationState || 'warning');
    const pressureShift = (Number(directDeltas.risk || 0) * 1.4)
      + (Number(directDeltas.stress || 0) * 1.1)
      - (Number(directDeltas.health || 0) * 0.8);
    let modeledDelta = shared.round2(shared.clamp((-fitScore * 0.45) + pressureShift, -28, 28));
    if (pathKind === 'no_action') {
      modeledDelta = shared.round2(modeledDelta + (stage === 'warning' ? 4 : 8));
    }
    return modeledDelta;
  }

  function classifyOutcomeStatus(shadowEvent, fitScore, pressureDelta, pathKind) {
    const stage = String(shadowEvent && shadowEvent.shadowStage || shadowEvent && shadowEvent.activationState || 'warning');
    if (pathKind === 'no_action' && (stage === 'escalating' || stage === 'escalated')) {
      return 'escalated';
    }
    if (fitScore >= 22 && pressureDelta <= -10) return 'improved';
    if (fitScore >= 8 && pressureDelta <= -3) return 'stabilized';
    if (fitScore <= -18 || pressureDelta >= 10) {
      return stage === 'escalating' || stage === 'escalated' ? 'escalated' : 'worsened';
    }
    return 'unresolved';
  }

  function classifyOutcomeQuality(outcomeStatus, fitScore, pressureDelta, contradictionPenalty) {
    if ((outcomeStatus === 'improved' || outcomeStatus === 'stabilized') && fitScore >= 10 && pressureDelta < 0 && contradictionPenalty === 0) {
      return 'good';
    }
    if (outcomeStatus === 'worsened' || outcomeStatus === 'escalated' || fitScore <= -12 || contradictionPenalty > 0) {
      return 'poor';
    }
    return 'neutral';
  }

  function buildPrimaryReasons(outcomeStatus, fitScore, shadowEvent, pathKind) {
    const reasons = [];
    if (pathKind === 'no_action') reasons.push('no_action_left_pressure_unchecked');
    if (fitScore >= 18) reasons.push('choice_fit_event_context');
    if (fitScore <= -12) reasons.push('choice_misfit_event_context');
    if (String(shadowEvent && shadowEvent.shadowStage || '') === 'escalating' || String(shadowEvent && shadowEvent.shadowStage || '') === 'escalated') {
      reasons.push('late_stage_response_penalty');
    }
    if (outcomeStatus === 'improved') reasons.push('modeled_pressure_reduction');
    if (outcomeStatus === 'stabilized') reasons.push('pressure_contained_but_not_cleared');
    if (outcomeStatus === 'unresolved') reasons.push('pressure_not_reduced_enough');
    if (outcomeStatus === 'worsened' || outcomeStatus === 'escalated') reasons.push('pressure_or_risk_trended_up');
    return reasons;
  }

  function buildSideEffectNotes(directDeltas, pressureDelta) {
    const notes = [];
    if (Number(directDeltas.stress || 0) > 0) notes.push('stress_side_effect_increase');
    if (Number(directDeltas.risk || 0) > 0) notes.push('risk_side_effect_increase');
    if (Number(directDeltas.health || 0) < 0) notes.push('health_side_effect_drop');
    if (Number(directDeltas.growth || 0) < 0) notes.push('growth_tradeoff_detected');
    if (pressureDelta < 0) notes.push('escalation_risk_reduced');
    if (pressureDelta > 0) notes.push('escalation_risk_increased');
    return notes;
  }

  function getFollowUpPlausibility(eventDef, outcomeStatus, shadowStage, fitScore) {
    const category = String(eventDef && eventDef.category || 'generic').toLowerCase();
    const plausible = outcomeStatus === 'worsened' || outcomeStatus === 'escalated' || fitScore <= -12;
    if (!plausible) return [];
    if (category === 'water') return ['root_zone_followup_possible', 'pressure_retention_possible'];
    if (category === 'disease') return ['disease_spread_followup_possible'];
    if (category === 'pest') return ['population_recheck_followup_possible'];
    if (category === 'environment') {
      return shadowStage === 'warning'
        ? ['instability_rebound_followup_possible']
        : ['stress_damage_followup_possible'];
    }
    return ['generic_followup_possible'];
  }

  function resolveChoice(input) {
    const shadowEvent = input && input.shadowEvent ? input.shadowEvent : null;
    const eventDef = shadowEvent && shadowEvent.eventDef ? shadowEvent.eventDef : (input && input.eventDef ? input.eventDef : null);
    const optionId = input && input.optionId ? String(input.optionId) : '';
    const pathKind = input && input.pathKind ? String(input.pathKind) : (optionId ? 'choice' : 'no_action');
    const option = pathKind === 'choice' ? findOptionById(eventDef, optionId) : null;
    const shadowStage = String(shadowEvent && shadowEvent.shadowStage || shadowEvent && shadowEvent.activationState || 'warning');
    const contradictionPenalty = 0;

    if (!shadowEvent || !eventDef || !eventDef.id) {
      return {
        resolved: false,
        reason: 'missing_shadow_event_context'
      };
    }

    const fitScore = scoreOptionFit(eventDef, shadowEvent, option, pathKind);
    const directDeltas = computeDirectDeltas(option, shadowStage, fitScore, pathKind);
    const categoryPressureDelta = computePressureDelta(shadowEvent, directDeltas, fitScore, pathKind);
    const outcomeStatus = classifyOutcomeStatus(shadowEvent, fitScore, categoryPressureDelta, pathKind);
    const quality = classifyOutcomeQuality(outcomeStatus, fitScore, categoryPressureDelta, contradictionPenalty);
    const primaryReasons = buildPrimaryReasons(outcomeStatus, fitScore, shadowEvent, pathKind);
    const sideEffectNotes = buildSideEffectNotes(directDeltas, categoryPressureDelta);
    const followUpHooks = getFollowUpPlausibility(eventDef, outcomeStatus, shadowStage, fitScore);

    return {
      resolved: true,
      eventId: eventDef.id,
      category: String(eventDef.category || 'generic'),
      optionId: option ? String(option.id || '') : null,
      pathKind,
      shadowStage,
      outcomeStatus,
      quality,
      fitScore,
      primaryReasons,
      sideEffectNotes,
      directDeltas,
      categoryPressureDelta,
      escalationRiskShift: categoryPressureDelta,
      followUpHooks,
      plausibleFollowUp: followUpHooks.length > 0,
      contradictionPenalty
    };
  }

  const api = Object.freeze({
    describeContract,
    getEventOptions,
    findOptionById,
    classifyProblemPole,
    scoreOptionFit,
    classifyOutcomeStatus,
    classifyOutcomeQuality,
    resolveChoice
  });

  globalScope.GrowSimEventResolution = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
