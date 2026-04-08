'use strict';

(function initEventEligibility(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;
  const cooldownsApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventCooldowns.js')
    : globalScope.GrowSimEventCooldowns;
  const contradictionsApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventContradictions.js')
    : globalScope.GrowSimEventContradictions;

  function describeContract() {
    return Object.freeze({
      phase: 'shadow',
      responsibility: 'deterministic shadow eligibility checks',
      inputs: ['state', 'eventDef', 'context'],
      outputs: ['eligible', 'reasons']
    });
  }

  function evaluateEvent(eventDef, stateLike, context = {}) {
    const snapshot = context.snapshot || shared.buildShadowSnapshot(stateLike);
    const reasons = [];

    if (!eventDef || typeof eventDef !== 'object' || !eventDef.id) {
      reasons.push('invalid_event');
      return {
        eligible: false,
        reasons,
        signalScore: 0,
        snapshot
      };
    }

    if (!shared.isPhaseAllowed(eventDef, snapshot)) {
      reasons.push('phase_blocked');
    }

    if (!shared.evaluateEventConstraints(snapshot, eventDef)) {
      reasons.push('constraint_blocked');
    }

    const triggers = eventDef.triggers && typeof eventDef.triggers === 'object' ? eventDef.triggers : {};
    if (triggers.stage && typeof triggers.stage === 'object') {
      if (Number.isFinite(Number(triggers.stage.min)) && snapshot.plant.stageIndexOneBased < Number(triggers.stage.min)) {
        reasons.push('stage_min_blocked');
      }
      if (Number.isFinite(Number(triggers.stage.max)) && snapshot.plant.stageIndexOneBased > Number(triggers.stage.max)) {
        reasons.push('stage_max_blocked');
      }
    }

    if (triggers.setup && typeof triggers.setup === 'object' && !shared.evaluateSetupConstraints(snapshot, triggers.setup)) {
      reasons.push('setup_blocked');
    }

    const signalScore = shared.getTriggerSignalScore(snapshot, triggers);
    if (signalScore <= 0) {
      reasons.push('trigger_blocked');
    }

    const cooldownCheck = cooldownsApi && typeof cooldownsApi.isEventBlocked === 'function'
      ? cooldownsApi.isEventBlocked(eventDef, stateLike, snapshot)
      : { blocked: false, reasons: [], repetitionPenalty: 0 };
    reasons.push(...cooldownCheck.reasons);

    const contradictionCheck = contradictionsApi && typeof contradictionsApi.evaluateCandidate === 'function'
      ? contradictionsApi.evaluateCandidate(eventDef, stateLike, snapshot)
      : { allowed: true, blockedBy: [] };
    reasons.push(...contradictionCheck.blockedBy);

    const category = String(eventDef.category || 'generic').toLowerCase();
    if (category === 'positive' && context.allowPositive !== true) {
      reasons.push('positive_deferred');
    }
    if (snapshot.simulation.simDay <= 10 && (category === 'pest' || category === 'disease') && Number(snapshot.status.risk || 0) < 65) {
      reasons.push('early_severe_guard');
    }

    return {
      eligible: reasons.length === 0,
      reasons: Array.from(new Set(reasons)),
      signalScore: shared.round2(signalScore),
      snapshot,
      cooldownCheck,
      contradictionCheck
    };
  }

  function evaluateCatalog(catalog, stateLike, context = {}) {
    const snapshot = context.snapshot || shared.buildShadowSnapshot(stateLike);
    const list = Array.isArray(catalog) ? catalog : [];
    const evaluations = list.map((eventDef) => ({
      eventId: eventDef && eventDef.id ? String(eventDef.id) : null,
      eventDef,
      ...evaluateEvent(eventDef, stateLike, { ...context, snapshot })
    }));

    return {
      snapshot,
      evaluations,
      eligible: evaluations.filter((entry) => entry.eligible)
    };
  }

  const api = Object.freeze({
    describeContract,
    evaluateEvent,
    evaluateCatalog
  });

  globalScope.GrowSimEventEligibility = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
