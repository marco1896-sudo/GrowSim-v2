'use strict';

(function initEventChains(globalScope) {
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
      responsibility: 'shadow-only follow-up suggestion and limited chain-context tracking'
    });
  }

  function describeState(eventsState) {
    const foundation = eventsState && eventsState.foundation && typeof eventsState.foundation === 'object'
      ? eventsState.foundation
      : {};
    const pending = foundation.memory && foundation.memory.pendingChains && typeof foundation.memory.pendingChains === 'object'
      ? foundation.memory.pendingChains
      : {};
    const flags = foundation.flags && typeof foundation.flags === 'object'
      ? foundation.flags
      : {};

    return {
      pending,
      flags
    };
  }

  function getChainFreshnessWindowHours() {
    return 12;
  }

  function buildFollowUpCandidateFromHook(hook, resolutionModel) {
    const category = String(resolutionModel && resolutionModel.category || 'generic').toLowerCase();
    const eventId = String(resolutionModel && resolutionModel.eventId || '');
    const map = {
      root_zone_followup_possible: {
        followUpId: 'root_stress_followup',
        followUpCategory: 'disease',
        plausibilityBoost: 18,
        causeCategory: 'water'
      },
      pressure_retention_possible: {
        followUpId: `${category}_pressure_retention`,
        followUpCategory: category,
        plausibilityBoost: 10,
        causeCategory: category
      },
      disease_spread_followup_possible: {
        followUpId: `${eventId}_spread_followup`,
        followUpCategory: 'disease',
        plausibilityBoost: 16,
        causeCategory: category
      },
      population_recheck_followup_possible: {
        followUpId: `${eventId}_population_recheck`,
        followUpCategory: 'pest',
        plausibilityBoost: 16,
        causeCategory: category
      },
      instability_rebound_followup_possible: {
        followUpId: `${eventId}_instability_rebound`,
        followUpCategory: 'environment',
        plausibilityBoost: 12,
        causeCategory: category
      },
      stress_damage_followup_possible: {
        followUpId: `${eventId}_stress_damage_followup`,
        followUpCategory: 'environment',
        plausibilityBoost: 14,
        causeCategory: category
      },
      generic_followup_possible: {
        followUpId: `${eventId}_generic_followup`,
        followUpCategory: category,
        plausibilityBoost: 8,
        causeCategory: category
      }
    };

    const template = map[String(hook || '')];
    if (!template) {
      return null;
    }

    return {
      sourceEventId: eventId,
      sourceHook: String(hook),
      followUpId: template.followUpId,
      followUpCategory: template.followUpCategory,
      causeCategory: template.causeCategory,
      plausibilityBoost: template.plausibilityBoost
    };
  }

  function getBasePlausibility(resolutionModel) {
    const quality = String(resolutionModel && resolutionModel.quality || 'neutral');
    const outcomeStatus = String(resolutionModel && resolutionModel.outcomeStatus || 'unresolved');
    let score = 0;

    if (quality === 'poor') score += 28;
    else if (quality === 'neutral') score += 10;

    if (outcomeStatus === 'worsened') score += 18;
    if (outcomeStatus === 'escalated') score += 26;
    if (outcomeStatus === 'unresolved') score += 12;
    if (outcomeStatus === 'improved' || outcomeStatus === 'stabilized') score -= 16;

    score += shared.clamp(Number(resolutionModel && resolutionModel.escalationRiskShift || 0), -8, 18);
    return shared.round2(shared.clamp(score, 0, 100));
  }

  function buildChainContext(previousState, resolutionModel, snapshot) {
    const prior = previousState && typeof previousState === 'object' ? previousState : {};
    const currentSimTimeMs = Number(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs || 0);
    const followUpHooks = Array.isArray(resolutionModel && resolutionModel.followUpHooks)
      ? resolutionModel.followUpHooks
      : [];
    const candidates = followUpHooks
      .map((hook) => buildFollowUpCandidateFromHook(hook, resolutionModel))
      .filter(Boolean)
      .map((candidate) => ({
        ...candidate,
        basePlausibility: getBasePlausibility(resolutionModel),
        createdAtSimTimeMs: currentSimTimeMs,
        sourceOutcomeQuality: resolutionModel.quality,
        sourceOutcomeStatus: resolutionModel.outcomeStatus
      }));

    return {
      ...prior,
      recentChainContexts: [{
        sourceEventId: resolutionModel.eventId,
        causeCategory: String(resolutionModel.category || 'generic'),
        priorOutcomeQuality: resolutionModel.quality,
        priorOutcomeStatus: resolutionModel.outcomeStatus,
        plausibilityStrength: getBasePlausibility(resolutionModel),
        createdAtSimTimeMs: currentSimTimeMs,
        candidateHooks: followUpHooks.slice(),
        candidates
      }].concat(Array.isArray(prior.recentChainContexts) ? prior.recentChainContexts.slice(0, 5) : [])
    };
  }

  function getFreshnessFactor(contextEntry, snapshot) {
    const currentSimTimeMs = Number(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs || 0);
    const createdAtSimTimeMs = Number(contextEntry && contextEntry.createdAtSimTimeMs || 0);
    const ageHours = Math.max(0, currentSimTimeMs - createdAtSimTimeMs) / (60 * 60 * 1000);
    const freshnessWindow = getChainFreshnessWindowHours();
    const freshness = shared.clamp(1 - (ageHours / freshnessWindow), 0, 1);
    return {
      ageHours: shared.round2(ageHours),
      freshness: shared.round2(freshness)
    };
  }

  function evaluateChainCandidate(candidate, stateLike, snapshot, pressureState) {
    const blockers = [];
    const suppressors = [];
    const contradictions = contradictionsApi && typeof contradictionsApi.evaluateCandidate === 'function'
      ? contradictionsApi.evaluateCandidate({
        id: candidate.followUpId,
        category: candidate.followUpCategory
      }, stateLike, snapshot)
      : { allowed: true, blockedBy: [] };
    if (!contradictions.allowed) {
      blockers.push(...contradictions.blockedBy);
    }

    const cooldowns = cooldownsApi && typeof cooldownsApi.isEventBlocked === 'function'
      ? cooldownsApi.isEventBlocked({
        id: candidate.followUpId,
        category: candidate.followUpCategory
      }, stateLike, snapshot)
      : { blocked: false, reasons: [] };
    if (cooldowns.blocked) {
      blockers.push(...cooldowns.reasons);
    }

    const latent = pressureState && pressureState.latentPressures && typeof pressureState.latentPressures === 'object'
      ? pressureState.latentPressures
      : {};
    const supportingPressure = Number(latent[String(candidate.followUpCategory || 'generic').toLowerCase()] || 0);
    if (supportingPressure < 16) {
      blockers.push('hidden_pressure_no_longer_supports_followup');
    }

    const freshnessInfo = getFreshnessFactor(candidate, snapshot);
    if (freshnessInfo.freshness <= 0.15) {
      blockers.push('chain_context_stale');
    } else if (freshnessInfo.freshness < 0.45) {
      suppressors.push('chain_context_fading');
    }

    let plausibilityStrength = shared.round2(shared.clamp(
      Number(candidate.basePlausibility || 0)
      + Number(candidate.plausibilityBoost || 0)
      + (supportingPressure * 0.45)
      - ((1 - freshnessInfo.freshness) * 20),
      0,
      100
    ));

    if (plausibilityStrength < 24) {
      blockers.push('followup_plausibility_too_weak');
    }

    if (candidate.sourceOutcomeQuality === 'good' && candidate.sourceOutcomeStatus !== 'escalated') {
      blockers.push('prior_resolution_was_strong_enough');
    }

    return {
      ...candidate,
      blockers: Array.from(new Set(blockers)),
      suppressors: Array.from(new Set(suppressors)),
      supportingPressure: shared.round2(supportingPressure),
      freshnessInfo,
      plausibilityStrength,
      eligible: blockers.length === 0
    };
  }

  function evaluateFollowUps(input) {
    const stateLike = input && input.state ? input.state : {};
    const snapshot = input && input.snapshot ? input.snapshot : { simulation: { simTimeMs: 0 } };
    const pressureState = input && input.pressureState ? input.pressureState : { latentPressures: {} };
    const previousState = input && input.previousState && typeof input.previousState === 'object'
      ? input.previousState
      : {};
    const contexts = Array.isArray(previousState.recentChainContexts) ? previousState.recentChainContexts : [];
    const rawCandidates = [];

    for (const contextEntry of contexts) {
      const candidateList = Array.isArray(contextEntry && contextEntry.candidates) ? contextEntry.candidates : [];
      for (const candidate of candidateList) {
        rawCandidates.push({
          ...candidate,
          sourceOutcomeQuality: contextEntry.priorOutcomeQuality,
          sourceOutcomeStatus: contextEntry.priorOutcomeStatus,
          createdAtSimTimeMs: contextEntry.createdAtSimTimeMs
        });
      }
    }

    const evaluated = rawCandidates.map((candidate) => evaluateChainCandidate(candidate, stateLike, snapshot, pressureState));
    const eligible = evaluated
      .filter((candidate) => candidate.eligible)
      .sort((left, right) => {
        if (Number(right.plausibilityStrength || 0) !== Number(left.plausibilityStrength || 0)) {
          return Number(right.plausibilityStrength || 0) - Number(left.plausibilityStrength || 0);
        }
        return String(left.followUpId || '').localeCompare(String(right.followUpId || ''));
      });

    return {
      hasFollowUp: eligible.length > 0,
      topFollowUp: eligible.length ? eligible[0] : null,
      candidates: eligible,
      evaluated,
      chainTerminates: eligible.length === 0
    };
  }

  const api = Object.freeze({
    describeContract,
    describeState,
    getChainFreshnessWindowHours,
    buildFollowUpCandidateFromHook,
    buildChainContext,
    evaluateFollowUps
  });

  globalScope.GrowSimEventChains = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
