'use strict';

(function initEventEscalation(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;

  function describeContract() {
    return Object.freeze({
      phase: 'shadow',
      responsibility: 'warning escalation and unresolved-state progression for shadow diagnostics'
    });
  }

  function getEscalationThresholds(category) {
    const key = String(category || 'generic').toLowerCase();
    if (key === 'pest' || key === 'disease') {
      return { sustainHours: 4, worseningDelta: 5, escalatingScore: 76, escalatedScore: 84 };
    }
    return { sustainHours: 6, worseningDelta: 6, escalatingScore: 68, escalatedScore: 80 };
  }

  function classifyEscalationStage(candidate, previousEntry, currentSimTimeMs) {
    const thresholds = getEscalationThresholds(candidate.category);
    const previous = previousEntry && typeof previousEntry === 'object' ? previousEntry : {};
    const firstObservedSimTimeMs = Number.isFinite(Number(previous.firstObservedSimTimeMs))
      ? Number(previous.firstObservedSimTimeMs)
      : currentSimTimeMs;
    const warningSinceSimTimeMs = Number.isFinite(Number(previous.warningSinceSimTimeMs))
      ? Number(previous.warningSinceSimTimeMs)
      : currentSimTimeMs;
    const unresolvedSinceSimTimeMs = Number.isFinite(Number(previous.unresolvedSinceSimTimeMs))
      ? Number(previous.unresolvedSinceSimTimeMs)
      : currentSimTimeMs;
    const sustainedHours = shared.round2(Math.max(0, currentSimTimeMs - warningSinceSimTimeMs) / (60 * 60 * 1000));
    const worseningDelta = shared.round2(Number(candidate.activationScore || 0) - Number(previous.activationScore || 0));
    const worsening = worseningDelta >= thresholds.worseningDelta;
    const unresolved = candidate.activationState === 'warning' || candidate.activationState === 'active';
    const score = Number(candidate.activationScore || 0);

    let stage = candidate.activationState === 'active' ? 'active' : 'warning';
    let escalationReason = candidate.activationState === 'active'
      ? 'active_threshold_met'
      : 'warning_threshold_met';

    if (unresolved && sustainedHours >= thresholds.sustainHours && (worsening || score >= thresholds.escalatingScore)) {
      stage = 'escalating';
      escalationReason = worsening
        ? 'sustained_unresolved_pressure_and_worsening'
        : 'sustained_unresolved_pressure';
    }

    if (unresolved && sustainedHours >= (thresholds.sustainHours * 1.5) && score >= thresholds.escalatedScore) {
      stage = 'escalated';
      escalationReason = 'sustained_unresolved_pressure_above_escalated_threshold';
    }

    return {
      eventId: candidate.eventId,
      category: candidate.category,
      activationState: candidate.activationState,
      stage,
      escalationReason,
      sustainedHours,
      worseningDelta,
      worsening,
      unresolved,
      firstObservedSimTimeMs,
      warningSinceSimTimeMs,
      unresolvedSinceSimTimeMs,
      activationScore: candidate.activationScore,
      thresholds
    };
  }

  function evaluateEscalation(input) {
    const snapshot = input && input.snapshot ? input.snapshot : { simulation: { simTimeMs: 0 } };
    const activationResult = input && input.activationResult ? input.activationResult : { rankedCandidates: [] };
    const previousState = input && input.previousState && typeof input.previousState === 'object'
      ? input.previousState
      : { trackedEvents: {} };
    const currentSimTimeMs = Number(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs || 0);
    const trackedEvents = {};
    const modeledWarnings = [];
    const escalating = [];
    const escalated = [];

    for (const candidate of Array.isArray(activationResult.rankedCandidates) ? activationResult.rankedCandidates : []) {
      if (candidate.activationState !== 'warning' && candidate.activationState !== 'active') {
        continue;
      }
      const previousEntry = previousState.trackedEvents && previousState.trackedEvents[candidate.eventId];
      const nextEntry = classifyEscalationStage(candidate, previousEntry, currentSimTimeMs);
      trackedEvents[candidate.eventId] = nextEntry;

      if (candidate.activationState === 'warning') {
        modeledWarnings.push(nextEntry);
      }
      if (nextEntry.stage === 'escalating') {
        escalating.push(nextEntry);
      }
      if (nextEntry.stage === 'escalated') {
        escalated.push(nextEntry);
      }
    }

    return {
      escalated: escalated.length > 0,
      escalating: escalating.length > 0,
      modeledWarnings,
      escalatingCandidates: escalating,
      escalatedCandidates: escalated,
      trackedEvents
    };
  }

  const api = Object.freeze({
    describeContract,
    getEscalationThresholds,
    classifyEscalationStage,
    evaluateEscalation
  });

  globalScope.GrowSimEventEscalation = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
