'use strict';

(function initEventActivation(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;
  const contradictionsApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventContradictions.js')
    : globalScope.GrowSimEventContradictions;
  const cooldownsApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventCooldowns.js')
    : globalScope.GrowSimEventCooldowns;

  function describeContract() {
    return Object.freeze({
      phase: 'shadow',
      responsibility: 'warning and active-candidate selection for shadow diagnostics'
    });
  }

  function getShadowModel(eventDef) {
    return eventDef && eventDef.shadowModel && typeof eventDef.shadowModel === 'object'
      ? eventDef.shadowModel
      : {};
  }

  function getExplicitProblemPolarity(eventDef) {
    const shadowModel = getShadowModel(eventDef);
    return String(shadowModel.problemPolarity || '').trim().toLowerCase();
  }

  function deriveEventSpecificPressure(eventDef, pressureSummary) {
    const category = String(eventDef && eventDef.category || 'generic').toLowerCase();
    const id = String(eventDef && eventDef.id || '').toLowerCase();
    const tags = shared.normalizeStringArray(eventDef && eventDef.tags).map((entry) => entry.toLowerCase());
    const components = pressureSummary && pressureSummary.componentScores ? pressureSummary.componentScores : {};
    const explicitPolarity = getExplicitProblemPolarity(eventDef);

    if (category === 'water') {
      if (explicitPolarity === 'dry') return Math.max(components.waterDry || 0, components.vpdMismatch || 0);
      if (explicitPolarity === 'wet') return Math.max(components.waterWet || 0, components.oxygenMismatch || 0);
      if (id.includes('dry') || id.includes('drought') || id.includes('gap')) return Math.max(components.waterDry || 0, components.vpdMismatch || 0);
      return Math.max(components.waterWet || 0, components.oxygenMismatch || 0);
    }
    if (category === 'nutrition') {
      if (explicitPolarity === 'lockout') {
        return Math.max(components.phMismatch || 0, components.ecMismatch || 0, components.nutritionHigh || 0);
      }
      if (explicitPolarity === 'deficit') {
        return Math.max(components.nutritionLow || 0, components.nutritionHigh || 0);
      }
      if (id.includes('lockout') || id.includes('salt') || id.includes('ph') || tags.includes('ph')) {
        return Math.max(components.phMismatch || 0, components.ecMismatch || 0, components.nutritionHigh || 0);
      }
      return Math.max(components.nutritionLow || 0, components.nutritionHigh || 0);
    }
    if (category === 'disease') {
      if (explicitPolarity === 'mold_surface' || explicitPolarity === 'mold') {
        return Math.max(components.diseaseHumidity || 0, components.oxygenMismatch || 0);
      }
      if (id.includes('mold') || tags.includes('mold') || id.includes('fung') || tags.includes('fungal')) {
        return Math.max(components.diseaseHumidity || 0, components.oxygenMismatch || 0);
      }
      return Math.max(components.oxygenMismatch || 0, components.risk || 0);
    }
    if (category === 'pest') {
      return Math.max(components.pestWindow || 0, components.risk || 0);
    }
    if (category === 'environment') {
      if (explicitPolarity === 'cold') return Math.max(components.tempMismatch || 0, components.instability || 0);
      if (explicitPolarity === 'heat_dry') return Math.max(components.tempMismatch || 0, components.vpdMismatch || 0, components.instability || 0);
      if (id.includes('cold') || id.includes('night')) return Math.max(components.tempMismatch || 0, components.instability || 0);
      return Math.max(components.tempMismatch || 0, components.vpdMismatch || 0, components.instability || 0);
    }
    return 0;
  }

  function getThresholdsForCategory(category) {
    const key = String(category || 'generic').toLowerCase();
    if (key === 'pest' || key === 'disease') {
      return { warning: 55, active: 70, escalation: 82 };
    }
    return { warning: 45, active: 60, escalation: 74 };
  }

  function scoreCandidate(eventDef, evaluation, pressureState, stateLike) {
    const pressureSummary = pressureState && pressureState.pressureSummary ? pressureState.pressureSummary : {};
    const category = String(eventDef && eventDef.category || 'generic').toLowerCase();
    const categoryPressure = Number(pressureState && pressureState.latentPressures && pressureState.latentPressures[category] || 0);
    const triggerSignal = shared.clamp(Number(evaluation && evaluation.signalScore || 0) * 100, 0, 100);
    const specificPressure = deriveEventSpecificPressure(eventDef, pressureSummary);
    const repetitionPenalty = cooldownsApi && typeof cooldownsApi.getRepetitionPenalty === 'function'
      ? cooldownsApi.getRepetitionPenalty(eventDef, stateLike)
      : 0;
    const weightInfluence = shared.clamp(Number(eventDef && eventDef.weight || 1), 0.25, 3);

    return shared.round2(shared.clamp(
      (categoryPressure * 0.45)
      + (triggerSignal * 0.4)
      + (specificPressure * 0.15)
      + ((weightInfluence - 1) * 10)
      - repetitionPenalty,
      0,
      100
    ));
  }

  function classifyActivationState(activationScore, thresholds) {
    const score = Number(activationScore || 0);
    if (score >= Number(thresholds.active || 0)) {
      return {
        activationState: 'active',
        thresholdReason: 'meets_active_threshold'
      };
    }
    if (score >= Number(thresholds.warning || 0)) {
      return {
        activationState: 'warning',
        thresholdReason: 'pressure_below_active_threshold'
      };
    }
    return {
      activationState: 'latent',
      thresholdReason: 'pressure_below_warning_threshold'
    };
  }

  function buildCandidateRecord(eventDef, evaluation, pressureState, stateLike, snapshot) {
    const thresholds = getThresholdsForCategory(eventDef.category);
    const category = String(eventDef.category || 'generic');
    const activationScore = scoreCandidate(eventDef, evaluation, pressureState, stateLike);
    const stateResult = classifyActivationState(activationScore, thresholds);
    const categoryPressure = Number(pressureState && pressureState.latentPressures && pressureState.latentPressures[String(category).toLowerCase()] || 0);
    const specificPressure = deriveEventSpecificPressure(eventDef, pressureState && pressureState.pressureSummary);
    const repetitionPenalty = cooldownsApi && typeof cooldownsApi.getRepetitionPenalty === 'function'
      ? cooldownsApi.getRepetitionPenalty(eventDef, stateLike)
      : 0;

    return {
      eventId: eventDef.id,
      eventDef,
      category,
      signalScore: Number(evaluation && evaluation.signalScore || 0),
      categoryPressure: shared.round2(categoryPressure),
      specificPressure: shared.round2(specificPressure),
      repetitionPenalty: shared.round2(repetitionPenalty),
      thresholds,
      activationScore,
      activationState: stateResult.activationState,
      thresholdReason: stateResult.thresholdReason,
      conflictGroup: String(evaluation && evaluation.contradictionCheck && evaluation.contradictionCheck.conflictGroup || ''),
      tieBreaker: shared.deterministicUnit(stateLike, `shadow_activation:${eventDef.id}:${snapshot.simulation.tickCount}`),
      diagnosticReasons: []
    };
  }

  function activateCandidate(input) {
    const stateLike = input && input.state ? input.state : {};
    const snapshot = input && input.snapshot ? input.snapshot : shared.buildShadowSnapshot(stateLike);
    const eligibleEntries = Array.isArray(input && input.eligibleEntries) ? input.eligibleEntries : [];
    const pressureState = input && input.pressureState ? input.pressureState : { latentPressures: {}, pressureSummary: { componentScores: {} } };

    const candidates = [];
    const deferred = [];
    const suppressed = [];

    for (const entry of eligibleEntries) {
      const eventDef = entry.eventDef;
      if (!eventDef || !eventDef.id) {
        continue;
      }

      if (String(eventDef.category || '').toLowerCase() === 'positive') {
        deferred.push({ eventId: eventDef.id, reason: 'reward_phase_deferred' });
        continue;
      }

      candidates.push(buildCandidateRecord(eventDef, entry, pressureState, stateLike, snapshot));
    }

    const conflictResolution = contradictionsApi && typeof contradictionsApi.resolveCandidateConflicts === 'function'
      ? contradictionsApi.resolveCandidateConflicts(candidates)
      : { kept: candidates, suppressed: [] };
    suppressed.push(...conflictResolution.suppressed);

    const ordered = conflictResolution.kept
      .slice()
      .sort((left, right) => {
        if (Number(right.activationScore || 0) !== Number(left.activationScore || 0)) {
          return Number(right.activationScore || 0) - Number(left.activationScore || 0);
        }
        if (String(right.activationState) !== String(left.activationState)) {
          return String(right.activationState) === 'active' ? 1 : -1;
        }
        if (Number(left.tieBreaker || 0) !== Number(right.tieBreaker || 0)) {
          return Number(left.tieBreaker || 0) - Number(right.tieBreaker || 0);
        }
        return String(left.eventId || '').localeCompare(String(right.eventId || ''));
      });

    const activeCandidates = ordered.filter((entry) => entry.activationState === 'active');
    const warningCandidates = ordered.filter((entry) => entry.activationState === 'warning');
    const latentCandidates = ordered.filter((entry) => entry.activationState === 'latent');

    return {
      activated: activeCandidates.length > 0,
      topCandidate: activeCandidates.length ? activeCandidates[0] : (warningCandidates.length ? warningCandidates[0] : (ordered.length ? ordered[0] : null)),
      activeCandidates,
      warnings: warningCandidates,
      latentCandidates,
      rankedCandidates: ordered,
      suppressed,
      deferred
    };
  }

  function buildActivationDiagnostics(input) {
    const result = activateCandidate(input);
    return {
      topCandidateId: result.topCandidate ? result.topCandidate.eventId : null,
      activeIds: result.activeCandidates.map((entry) => entry.eventId),
      warningIds: result.warnings.map((entry) => entry.eventId),
      latentIds: result.latentCandidates.map((entry) => entry.eventId),
      suppressedIds: result.suppressed.map((entry) => entry.eventId),
      deferred: result.deferred.slice()
    };
  }

  const api = Object.freeze({
    describeContract,
    deriveEventSpecificPressure,
    getThresholdsForCategory,
    classifyActivationState,
    buildCandidateRecord,
    scoreCandidate,
    activateCandidate,
    buildActivationDiagnostics
  });

  globalScope.GrowSimEventActivation = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
