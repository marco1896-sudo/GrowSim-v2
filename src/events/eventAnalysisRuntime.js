'use strict';

(function initEventAnalysisRuntime(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;

  function describeContract() {
    return Object.freeze({
      phase: 'shadow',
      responsibility: 'shadow-only outcome-analysis runtime composition'
    });
  }

  function buildReasonNarratives(resolutionModel) {
    const reasons = Array.isArray(resolutionModel && resolutionModel.primaryReasons)
      ? resolutionModel.primaryReasons
      : [];
    return reasons.map((reason) => {
      if (reason === 'choice_fit_event_context') return 'The modeled action matches the event context and likely addresses the main pressure source.';
      if (reason === 'choice_misfit_event_context') return 'The modeled action does not match the likely cause of the event and leaves the main pressure unresolved.';
      if (reason === 'late_stage_response_penalty') return 'The response came at a later warning/escalation stage, so even a decent action is modeled as less effective.';
      if (reason === 'modeled_pressure_reduction') return 'The modeled action reduces pressure enough to plausibly improve the situation.';
      if (reason === 'pressure_contained_but_not_cleared') return 'The action likely limits further deterioration but does not fully clear the underlying pressure.';
      if (reason === 'pressure_not_reduced_enough') return 'The modeled response does not reduce enough pressure to count as a clean recovery.';
      if (reason === 'pressure_or_risk_trended_up') return 'The modeled path increases risk or keeps harmful conditions in place.';
      if (reason === 'no_action_left_pressure_unchecked') return 'Doing nothing leaves the pressure signal active and makes deterioration more likely.';
      return `Reason: ${reason}`;
    });
  }

  function buildShadowAnalysis(input) {
    const resolutionModel = input && input.resolutionModel ? input.resolutionModel : null;
    if (!resolutionModel || !resolutionModel.resolved) {
      return {
        available: false,
        reason: 'missing_resolution_model'
      };
    }

    const fitSignal = Number(resolutionModel.fitScore || 0);
    const escalationRiskShift = Number(resolutionModel.escalationRiskShift || 0);
    return {
      available: true,
      eventId: resolutionModel.eventId,
      optionId: resolutionModel.optionId,
      pathKind: resolutionModel.pathKind,
      outcomeStatus: resolutionModel.outcomeStatus,
      quality: resolutionModel.quality,
      summary: {
        fitSignal: shared ? shared.round2(fitSignal) : fitSignal,
        escalationRiskShift: shared ? shared.round2(escalationRiskShift) : escalationRiskShift,
        plausibleFollowUp: Boolean(resolutionModel.plausibleFollowUp)
      },
      contributingFactors: buildReasonNarratives(resolutionModel),
      sideEffectNotes: Array.isArray(resolutionModel.sideEffectNotes)
        ? resolutionModel.sideEffectNotes.slice()
        : [],
      fitAssessment: fitSignal >= 18
        ? 'strong_fit'
        : (fitSignal <= -12 ? 'misfit' : 'partial_fit'),
      followUpHooks: Array.isArray(resolutionModel.followUpHooks)
        ? resolutionModel.followUpHooks.slice()
        : []
    };
  }

  function buildRewardAnalysis(input) {
    const rewardDiagnostics = input && input.rewardDiagnostics ? input.rewardDiagnostics : null;
    if (!rewardDiagnostics) {
      return {
        available: false,
        reason: 'missing_reward_diagnostics'
      };
    }

    const granted = rewardDiagnostics.rewardGranted;
    const candidate = granted
      ? (Array.isArray(rewardDiagnostics.candidates)
        ? rewardDiagnostics.candidates.find((entry) => entry.rewardClass === granted.rewardClass) || null
        : null)
      : null;

    return {
      available: true,
      rewardEligible: Boolean(rewardDiagnostics.rewardEligible),
      rewardClass: rewardDiagnostics.rewardClass,
      whyEarned: granted ? granted.whyEarned.slice() : [],
      blockedBy: Array.isArray(rewardDiagnostics.blockers) ? rewardDiagnostics.blockers.slice() : [],
      playerDidWell: granted ? granted.whyEarned.slice() : [],
      contributingInputs: rewardDiagnostics.contributingInputs || {},
      modeledEffects: granted ? { ...granted.modeledEffects } : null,
      candidateSummaries: Array.isArray(rewardDiagnostics.candidates)
        ? rewardDiagnostics.candidates.map((entry) => ({
          rewardClass: entry.rewardClass,
          eligible: Boolean(entry.eligible),
          blockers: Array.isArray(entry.blockers) ? entry.blockers.slice() : [],
          whyEarned: Array.isArray(entry.whyEarned) ? entry.whyEarned.slice() : [],
          modeledEffects: entry.modeledEffects ? { ...entry.modeledEffects } : null
        }))
        : [],
      fitAssessment: granted
        ? 'earned'
        : 'blocked',
      recommendedFocus: granted
        ? 'maintain_consistency'
        : 'reduce_hidden_pressure_and_extend_stable_control'
    };
  }

  function buildChainAnalysis(input) {
    const chainDiagnostics = input && input.chainDiagnostics ? input.chainDiagnostics : null;
    if (!chainDiagnostics) {
      return {
        available: false,
        reason: 'missing_chain_diagnostics'
      };
    }

    const top = chainDiagnostics.topFollowUp;
    return {
      available: true,
      hasFollowUp: Boolean(chainDiagnostics.hasFollowUp),
      topFollowUpId: top ? top.followUpId : null,
      whyFollowUpBecamePlausible: top
        ? [
          `Follow-up plausibility came from ${top.sourceEventId}`,
          `Cause category: ${top.causeCategory}`,
          `Freshness: ${top.freshnessInfo ? top.freshnessInfo.freshness : 0}`
        ]
        : [],
      reducedOrPreventedBy: Array.isArray(chainDiagnostics.evaluated)
        ? chainDiagnostics.evaluated
          .filter((entry) => !entry.eligible)
          .map((entry) => ({
            followUpId: entry.followUpId,
            blockers: Array.isArray(entry.blockers) ? entry.blockers.slice() : [],
            suppressors: Array.isArray(entry.suppressors) ? entry.suppressors.slice() : []
          }))
        : [],
      chainPathAssessment: chainDiagnostics.hasFollowUp
        ? 'reinforced_or_persisting'
        : 'prevented_or_softened'
    };
  }

  function buildAnalysisModel(eventsState) {
    const foundation = eventsState && eventsState.foundation && typeof eventsState.foundation === 'object'
      ? eventsState.foundation
      : {};
    return {
      latest: Array.isArray(foundation.analysis) && foundation.analysis.length
        ? foundation.analysis[foundation.analysis.length - 1]
        : null
    };
  }

  const api = Object.freeze({
    describeContract,
    buildReasonNarratives,
    buildShadowAnalysis,
    buildRewardAnalysis,
    buildChainAnalysis,
    buildAnalysisModel
  });

  globalScope.GrowSimEventAnalysisRuntime = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
