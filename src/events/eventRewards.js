'use strict';

(function initEventRewards(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;

  function describeContract() {
    return Object.freeze({
      phase: 'shadow',
      responsibility: 'earned reward-event checks using stress, risk, stable windows, and recent shadow outcomes'
    });
  }

  function getRewardCooldownHours() {
    return 12;
  }

  function getNegativePressureSummary(pressureState) {
    const latent = pressureState && pressureState.latentPressures && typeof pressureState.latentPressures === 'object'
      ? pressureState.latentPressures
      : {};
    return {
      maxNegativePressure: Math.max(
        Number(latent.water || 0),
        Number(latent.nutrition || 0),
        Number(latent.environment || 0),
        Number(latent.disease || 0),
        Number(latent.pest || 0)
      ),
      totalNegativePressure: shared.round2(
        Number(latent.water || 0)
        + Number(latent.nutrition || 0)
        + Number(latent.environment || 0)
        + Number(latent.disease || 0)
        + Number(latent.pest || 0)
      )
    };
  }

  function buildRewardState(previousState, snapshot, pressureState, escalationResult) {
    const prior = previousState && typeof previousState === 'object' ? previousState : {};
    const negativePressure = getNegativePressureSummary(pressureState);
    const currentSimTimeMs = Number(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs || 0);
    const stableNow = Number(snapshot.status.stress || 0) <= 22
      && Number(snapshot.status.risk || 0) <= 20
      && negativePressure.maxNegativePressure <= 18
      && (!escalationResult || !Array.isArray(escalationResult.escalatingCandidates) || escalationResult.escalatingCandidates.length === 0)
      && (!escalationResult || !Array.isArray(escalationResult.escalatedCandidates) || escalationResult.escalatedCandidates.length === 0);

    const stableWindow = prior.stableWindow && typeof prior.stableWindow === 'object'
      ? { ...prior.stableWindow }
      : { startSimTimeMs: null, stableHours: 0, lastStableSimTimeMs: null };

    if (stableNow) {
      const startSimTimeMs = Number.isFinite(Number(stableWindow.startSimTimeMs))
        ? Number(stableWindow.startSimTimeMs)
        : currentSimTimeMs;
      stableWindow.startSimTimeMs = startSimTimeMs;
      stableWindow.lastStableSimTimeMs = currentSimTimeMs;
      stableWindow.stableHours = shared.round2(Math.max(0, currentSimTimeMs - startSimTimeMs) / (60 * 60 * 1000));
    } else {
      stableWindow.startSimTimeMs = null;
      stableWindow.lastStableSimTimeMs = null;
      stableWindow.stableHours = 0;
    }

    return {
      rewardCooldownUntilSimTimeMs: Number(prior.rewardCooldownUntilSimTimeMs || 0),
      lastRewardClass: prior.lastRewardClass || null,
      recentResolutions: Array.isArray(prior.recentResolutions) ? prior.recentResolutions.slice(-8) : [],
      stableWindow,
      lastEvaluatedSimTimeMs: currentSimTimeMs
    };
  }

  function appendResolutionRecord(previousState, resolutionModel, snapshot) {
    const prior = previousState && typeof previousState === 'object' ? previousState : {};
    const currentSimTimeMs = Number(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs || 0);
    const recent = Array.isArray(prior.recentResolutions) ? prior.recentResolutions.slice(-7) : [];
    recent.push({
      eventId: resolutionModel.eventId,
      category: resolutionModel.category,
      shadowStage: resolutionModel.shadowStage,
      outcomeStatus: resolutionModel.outcomeStatus,
      quality: resolutionModel.quality,
      fitScore: Number(resolutionModel.fitScore || 0),
      escalationRiskShift: Number(resolutionModel.escalationRiskShift || 0),
      plausibleFollowUp: Boolean(resolutionModel.plausibleFollowUp),
      atSimTimeMs: currentSimTimeMs
    });

    return {
      ...prior,
      recentResolutions: recent
    };
  }

  function getLatestGoodResolution(rewardState) {
    const recent = Array.isArray(rewardState && rewardState.recentResolutions) ? rewardState.recentResolutions : [];
    for (let index = recent.length - 1; index >= 0; index -= 1) {
      const entry = recent[index];
      if (entry && entry.quality === 'good') {
        return entry;
      }
    }
    return null;
  }

  function isRewardCoolingDown(rewardState, snapshot) {
    const currentSimTimeMs = Number(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs || 0);
    return Number(rewardState && rewardState.rewardCooldownUntilSimTimeMs || 0) > currentSimTimeMs;
  }

  function buildBlockers(input) {
    const rewardState = input.rewardState;
    const snapshot = input.snapshot;
    const pressureState = input.pressureState;
    const escalationResult = input.escalationResult;
    const negativePressure = getNegativePressureSummary(pressureState);
    const blockers = [];

    if (negativePressure.maxNegativePressure > 24) blockers.push('hidden_negative_pressure_too_high');
    if (Array.isArray(escalationResult && escalationResult.escalatingCandidates) && escalationResult.escalatingCandidates.length) blockers.push('unresolved_shadow_escalation_present');
    if (Array.isArray(escalationResult && escalationResult.escalatedCandidates) && escalationResult.escalatedCandidates.length) blockers.push('escalated_shadow_issue_present');
    if (Number(snapshot.environment.instabilityScore || 0) > 34) blockers.push('major_instability_present');
    if (isRewardCoolingDown(rewardState, snapshot)) blockers.push('reward_cooldown_active');

    return {
      blockers,
      negativePressure
    };
  }

  function evaluateStabilityReward(input, rewardState, blockerInfo) {
    const stableHours = Number(rewardState && rewardState.stableWindow && rewardState.stableWindow.stableHours || 0);
    const blockers = [];
    if (stableHours < 8) blockers.push('stable_window_too_short');
    if (blockerInfo.negativePressure.maxNegativePressure > 18) blockers.push('stability_too_shallow');

    return {
      rewardClass: 'stability_reward',
      eligible: blockers.length === 0,
      blockers,
      contributingInputs: {
        stableHours,
        stress: input.snapshot.status.stress,
        risk: input.snapshot.status.risk,
        maxNegativePressure: blockerInfo.negativePressure.maxNegativePressure
      },
      whyEarned: [
        'Sustained low stress and low risk control window',
        'Hidden negative pressure remained contained'
      ],
      modeledEffects: {
        stressEase: -1,
        riskEase: -1,
        calmWindowHours: 2,
        note: 'stable_control_acknowledged'
      }
    };
  }

  function evaluateRecoveryReward(input, rewardState, blockerInfo) {
    const latestGood = getLatestGoodResolution(rewardState);
    const blockers = [];
    const currentSimTimeMs = Number(input.snapshot && input.snapshot.simulation && input.snapshot.simulation.simTimeMs || 0);

    if (!latestGood) blockers.push('no_recent_good_negative_resolution');
    if (latestGood && !['active', 'escalating', 'escalated'].includes(String(latestGood.shadowStage || ''))) blockers.push('recent_issue_not_severe_enough_for_recovery_reward');
    if (latestGood && latestGood.escalationRiskShift > -6) blockers.push('recovery_improvement_too_shallow');
    if (latestGood && ((currentSimTimeMs - Number(latestGood.atSimTimeMs || 0)) / (60 * 60 * 1000)) > 8) blockers.push('recovery_window_expired');
    if (Number(rewardState && rewardState.stableWindow && rewardState.stableWindow.stableHours || 0) < 2) blockers.push('post_recovery_stability_too_brief');

    return {
      rewardClass: 'recovery_reward',
      eligible: blockers.length === 0,
      blockers,
      contributingInputs: {
        recentResolution: latestGood,
        stableHours: Number(rewardState && rewardState.stableWindow && rewardState.stableWindow.stableHours || 0),
        maxNegativePressure: blockerInfo.negativePressure.maxNegativePressure
      },
      whyEarned: [
        'Good modeled recovery after a meaningful negative issue',
        'Control was re-established after the issue'
      ],
      modeledEffects: {
        stressEase: -1,
        riskEase: -2,
        calmWindowHours: 1.5,
        note: 'recovery_acknowledged'
      }
    };
  }

  function evaluateExecutionReward(input, rewardState, blockerInfo) {
    const latestGood = getLatestGoodResolution(rewardState);
    const blockers = [];
    const currentSimTimeMs = Number(input.snapshot && input.snapshot.simulation && input.snapshot.simulation.simTimeMs || 0);

    if (!latestGood) blockers.push('no_recent_good_execution');
    if (latestGood && latestGood.escalationRiskShift > -8) blockers.push('execution_did_not_reduce_escalation_enough');
    if (latestGood && latestGood.plausibleFollowUp) blockers.push('followup_pressure_still_plausible');
    if (latestGood && ((currentSimTimeMs - Number(latestGood.atSimTimeMs || 0)) / (60 * 60 * 1000)) > 4) blockers.push('execution_window_expired');

    return {
      rewardClass: 'execution_reward',
      eligible: blockers.length === 0,
      blockers,
      contributingInputs: {
        recentResolution: latestGood,
        stableHours: Number(rewardState && rewardState.stableWindow && rewardState.stableWindow.stableHours || 0),
        maxNegativePressure: blockerInfo.negativePressure.maxNegativePressure
      },
      whyEarned: [
        'A good modeled action prevented worsening',
        'Escalation tendency was reduced meaningfully'
      ],
      modeledEffects: {
        stressEase: 0,
        riskEase: -1,
        calmWindowHours: 1,
        note: 'execution_acknowledged'
      }
    };
  }

  function chooseRewardCandidate(candidates) {
    const eligible = (Array.isArray(candidates) ? candidates : []).filter((candidate) => candidate && candidate.eligible);
    if (!eligible.length) {
      return null;
    }

    const priority = {
      recovery_reward: 3,
      execution_reward: 2,
      stability_reward: 1
    };

    return eligible
      .slice()
      .sort((left, right) => {
        const leftPriority = Number(priority[left.rewardClass] || 0);
        const rightPriority = Number(priority[right.rewardClass] || 0);
        if (rightPriority !== leftPriority) return rightPriority - leftPriority;
        return String(left.rewardClass || '').localeCompare(String(right.rewardClass || ''));
      })[0];
  }

  function evaluateRewardWindow(input) {
    const snapshot = input && input.snapshot ? input.snapshot : null;
    const pressureState = input && input.pressureState ? input.pressureState : { latentPressures: {} };
    const escalationResult = input && input.escalationResult ? input.escalationResult : { escalatingCandidates: [], escalatedCandidates: [] };
    const previousState = input && input.previousState ? input.previousState : {};
    const rewardState = buildRewardState(previousState, snapshot, pressureState, escalationResult);
    const blockerInfo = buildBlockers({
      rewardState,
      snapshot,
      pressureState,
      escalationResult
    });

    const stability = evaluateStabilityReward(input, rewardState, blockerInfo);
    const recovery = evaluateRecoveryReward(input, rewardState, blockerInfo);
    const execution = evaluateExecutionReward(input, rewardState, blockerInfo);
    const baseBlockers = blockerInfo.blockers.slice();
    const chosen = chooseRewardCandidate([stability, recovery, execution]);
    const rewardEligible = Boolean(chosen) && baseBlockers.length === 0;

    let rewardGranted = null;
    if (rewardEligible && chosen) {
      rewardGranted = {
        rewardClass: chosen.rewardClass,
        whyEarned: chosen.whyEarned.slice(),
        modeledEffects: { ...chosen.modeledEffects }
      };
      rewardState.rewardCooldownUntilSimTimeMs = Number(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs || 0)
        + (getRewardCooldownHours() * 60 * 60 * 1000);
      rewardState.lastRewardClass = chosen.rewardClass;
    }

    return {
      rewardEligible,
      rewardClass: rewardGranted ? rewardGranted.rewardClass : null,
      rewardGranted,
      blockers: rewardEligible ? [] : baseBlockers.slice(),
      candidates: [stability, recovery, execution],
      contributingInputs: {
        stress: Number(snapshot && snapshot.status && snapshot.status.stress || 0),
        risk: Number(snapshot && snapshot.status && snapshot.status.risk || 0),
        stableHours: Number(rewardState && rewardState.stableWindow && rewardState.stableWindow.stableHours || 0),
        negativePressure: blockerInfo.negativePressure,
        latestGoodResolution: getLatestGoodResolution(rewardState)
      },
      nextRewardState: rewardState
    };
  }

  const api = Object.freeze({
    describeContract,
    getRewardCooldownHours,
    getNegativePressureSummary,
    buildRewardState,
    appendResolutionRecord,
    isRewardCoolingDown,
    evaluateRewardWindow
  });

  globalScope.GrowSimEventRewards = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
