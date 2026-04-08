'use strict';

(function initEventEngine(globalScope) {
  const featureFlagApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventFeatureFlag.js')
    : (globalScope.GrowSimEventFeatureFlag || null);
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;
  const eligibilityApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventEligibility.js')
    : globalScope.GrowSimEventEligibility;
  const pressureApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventPressure.js')
    : globalScope.GrowSimEventPressure;
  const activationApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventActivation.js')
    : globalScope.GrowSimEventActivation;
  const escalationApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventEscalation.js')
    : globalScope.GrowSimEventEscalation;
  const resolutionApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventResolution.js')
    : globalScope.GrowSimEventResolution;
  const rewardsApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventRewards.js')
    : globalScope.GrowSimEventRewards;
  const chainsApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventChains.js')
    : globalScope.GrowSimEventChains;
  const analysisApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventAnalysisRuntime.js')
    : globalScope.GrowSimEventAnalysisRuntime;
  const eventAssetsApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventAssets.js')
    : globalScope.GrowSimEventAssetsModule;
  const persistenceApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventPersistenceAdapter.js')
    : globalScope.GrowSimEventPersistenceAdapter;
  const cooldownsApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventCooldowns.js')
    : globalScope.GrowSimEventCooldowns;
  const contradictionsApi = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventContradictions.js')
    : globalScope.GrowSimEventContradictions;

  const engineState = {
    legacyRuntime: null,
    shadowByState: typeof WeakMap !== 'undefined' ? new WeakMap() : null,
    qaScenarioByState: typeof WeakMap !== 'undefined' ? new WeakMap() : null,
    lastShadow: null,
    lastRoutingReport: null,
    qaSampling: {
      totalRouteObservations: 0,
      softCutoverRequestedCount: 0,
      softCutoverActivatedCount: 0,
      fallbackCount: 0,
      fallbackReasonCounts: {},
      routedResponsibilityCounts: {},
      readinessLevelCounts: {},
      routeKindCounts: {},
      restoreInteractionCounts: {},
      recentRouteOutcomes: [],
      recentFallbackReasons: [],
      recentReadinessStates: [],
      hasActivatedSoftCutoverInSession: false,
      scenarioCounts: {},
      scenarioSummaries: {}
    }
  };

  const SOFT_CUTOVER_SCOPE = Object.freeze({
    TICK: Object.freeze(['shadow_activation_preflight']),
    CHOICE: Object.freeze(['shadow_choice_preview_packaging']),
    UI: Object.freeze(['ui_model_packaging'])
  });

  const QA_SAMPLING_LIMIT = 12;
  const QA_SCENARIO_LABELS = Object.freeze([
    'stable_allowed',
    'guardrail_blocked',
    'mixed_fluctuating',
    'restore_resume_heavy'
  ]);

  function getMode() {
    return featureFlagApi && typeof featureFlagApi.getMode === 'function'
      ? featureFlagApi.getMode()
      : 'legacy';
  }

  function getModeStatus() {
    return featureFlagApi && typeof featureFlagApi.describeModeStatus === 'function'
      ? featureFlagApi.describeModeStatus()
      : {
        mode: getMode(),
        shadowEnabled: getMode() === 'shadow' || getMode() === 'new' || getMode() === 'internal-soft-cutover',
        newEngineRequested: getMode() === 'new',
        softCutoverRequested: getMode() === 'internal-soft-cutover',
        newEngineLive: false,
        liveAuthority: 'legacy',
        rollbackAvailable: true,
        notes: ['Legacy runtime remains authoritative.']
      };
  }

  function registerLegacyRuntime(runtime) {
    engineState.legacyRuntime = runtime && typeof runtime === 'object' ? runtime : null;
    return engineState.legacyRuntime;
  }

  function getLegacyRuntime() {
    return engineState.legacyRuntime;
  }

  function getShadowBucket(stateLike) {
    const bucket = {
      previousPressures: {},
      previousSimTimeMs: null,
      shadowRuntimeState: persistenceApi && typeof persistenceApi.buildDefaultShadowRuntimeState === 'function'
        ? persistenceApi.buildDefaultShadowRuntimeState()
        : { trackedEvents: {} },
      diagnostics: null,
      persistence: persistenceApi && typeof persistenceApi.buildEmptyPersistenceDiagnostics === 'function'
        ? persistenceApi.buildEmptyPersistenceDiagnostics('shadow_bucket_initialized')
        : null
    };

    if (!stateLike || typeof stateLike !== 'object') {
      return bucket;
    }
    if (!engineState.shadowByState) {
      return engineState.lastShadow || bucket;
    }

    if (!engineState.shadowByState.has(stateLike)) {
      engineState.shadowByState.set(stateLike, bucket);
    }
    return engineState.shadowByState.get(stateLike);
  }

  function setShadowBucket(stateLike, bucket) {
    if (!stateLike || typeof stateLike !== 'object') {
      engineState.lastShadow = bucket;
      return bucket;
    }
    if (!engineState.shadowByState) {
      engineState.lastShadow = bucket;
      return bucket;
    }
    engineState.shadowByState.set(stateLike, bucket);
    return bucket;
  }

  function normalizeQaScenarioLabel(value) {
    const safe = String(value || '').trim().toLowerCase();
    if (QA_SCENARIO_LABELS.includes(safe)) {
      return safe;
    }
    return 'unlabeled';
  }

  function setQaScenarioLabelForTesting(stateLike, label) {
    const normalized = normalizeQaScenarioLabel(label);
    if (!stateLike || typeof stateLike !== 'object') {
      return normalized;
    }
    if (!engineState.qaScenarioByState) {
      stateLike.__qaScenarioLabel = normalized;
      return normalized;
    }
    engineState.qaScenarioByState.set(stateLike, normalized);
    return normalized;
  }

  function getQaScenarioLabel(stateLike) {
    if (!stateLike || typeof stateLike !== 'object') {
      return 'unlabeled';
    }
    if (engineState.qaScenarioByState && engineState.qaScenarioByState.has(stateLike)) {
      return normalizeQaScenarioLabel(engineState.qaScenarioByState.get(stateLike));
    }
    if (Object.prototype.hasOwnProperty.call(stateLike, '__qaScenarioLabel')) {
      return normalizeQaScenarioLabel(stateLike.__qaScenarioLabel);
    }
    return 'unlabeled';
  }

  function canComputeShadow() {
    return Boolean(
      shared
      && eligibilityApi
      && pressureApi
      && activationApi
      && escalationApi
      && resolutionApi
      && rewardsApi
      && chainsApi
      && analysisApi
      && eventAssetsApi
      && persistenceApi
      && cooldownsApi
      && contradictionsApi
    );
  }

  function buildPersistableRuntimeState(bucket, snapshot) {
    const runtimeState = bucket && bucket.shadowRuntimeState && typeof bucket.shadowRuntimeState === 'object'
      ? bucket.shadowRuntimeState
      : {};
    const baseState = persistenceApi && typeof persistenceApi.buildDefaultShadowRuntimeState === 'function'
      ? persistenceApi.buildDefaultShadowRuntimeState()
      : { trackedEvents: {} };

    return {
      ...baseState,
      ...runtimeState,
      previousPressures: bucket && bucket.previousPressures && typeof bucket.previousPressures === 'object'
        ? { ...bucket.previousPressures }
        : {},
      previousSimTimeMs: bucket && Number.isFinite(Number(bucket.previousSimTimeMs))
        ? Number(bucket.previousSimTimeMs)
        : Number(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs || 0),
      trackedEvents: runtimeState && runtimeState.trackedEvents && typeof runtimeState.trackedEvents === 'object'
        ? { ...runtimeState.trackedEvents }
        : {}
    };
  }

  function pushBoundedEntry(list, entry, limit = QA_SAMPLING_LIMIT) {
    const target = Array.isArray(list) ? list : [];
    target.push(entry);
    while (target.length > limit) {
      target.shift();
    }
    return target;
  }

  function incrementCounter(map, key, amount = 1) {
    const safeMap = map && typeof map === 'object' ? map : {};
    const safeKey = String(key || '').trim();
    if (!safeKey) {
      return safeMap;
    }
    safeMap[safeKey] = Number(safeMap[safeKey] || 0) + Number(amount || 1);
    return safeMap;
  }

  function buildEmptyQaSamplingState() {
    return {
      totalRouteObservations: 0,
      softCutoverRequestedCount: 0,
      softCutoverActivatedCount: 0,
      fallbackCount: 0,
      fallbackReasonCounts: {},
      routedResponsibilityCounts: {},
      readinessLevelCounts: {},
      routeKindCounts: {},
      restoreInteractionCounts: {},
      recentRouteOutcomes: [],
      recentFallbackReasons: [],
      recentReadinessStates: [],
      hasActivatedSoftCutoverInSession: false,
      scenarioCounts: {},
      scenarioSummaries: {}
    };
  }

  function getQaScenarioSamplingBucket(label) {
    const normalized = normalizeQaScenarioLabel(label);
    const qa = engineState.qaSampling;
    if (!qa.scenarioSummaries || typeof qa.scenarioSummaries !== 'object') {
      qa.scenarioSummaries = {};
    }
    if (!qa.scenarioSummaries[normalized]) {
      qa.scenarioSummaries[normalized] = {
        totalRouteObservations: 0,
        softCutoverRequestedCount: 0,
        softCutoverActivatedCount: 0,
        fallbackCount: 0,
        fallbackReasonCounts: {},
        routedResponsibilityCounts: {},
        readinessLevelCounts: {},
        routeKindCounts: {},
        restoreInteractionCounts: {},
        recentRouteOutcomes: [],
        recentFallbackReasons: [],
        recentReadinessStates: [],
        hasActivatedSoftCutoverInSession: false,
        scenarioLabel: normalized
      };
    }
    return qa.scenarioSummaries[normalized];
  }

  function applyQaRouteObservationToBucket(bucket, observation) {
    const qa = bucket && typeof bucket === 'object' ? bucket : buildEmptyQaSamplingState();
    const safe = observation && typeof observation === 'object' ? observation : {};

    qa.totalRouteObservations += 1;
    incrementCounter(qa.routeKindCounts, safe.routeKind || 'unknown');

    if (safe.softCutoverRequested) {
      qa.softCutoverRequestedCount += 1;
    }
    if (safe.softCutoverActive) {
      qa.softCutoverActivatedCount += 1;
      qa.hasActivatedSoftCutoverInSession = true;
    }
    if (safe.fallbackOccurred) {
      qa.fallbackCount += 1;
      (Array.isArray(safe.fallbackReasons) ? safe.fallbackReasons : []).forEach((reason) => {
        incrementCounter(qa.fallbackReasonCounts, reason);
        pushBoundedEntry(qa.recentFallbackReasons, String(reason || ''));
      });
    }
    (Array.isArray(safe.routedResponsibilities) ? safe.routedResponsibilities : []).forEach((responsibility) => {
      incrementCounter(qa.routedResponsibilityCounts, responsibility);
    });
    incrementCounter(qa.readinessLevelCounts, safe.readinessLevel || 'unknown');
    if (safe.restoreState) {
      incrementCounter(qa.restoreInteractionCounts, safe.restoreState);
    }

    pushBoundedEntry(qa.recentReadinessStates, {
      routeKind: String(safe.routeKind || 'unknown'),
      readinessLevel: String(safe.readinessLevel || 'unknown'),
      softCutoverRequested: Boolean(safe.softCutoverRequested),
      softCutoverActive: Boolean(safe.softCutoverActive),
      fallbackOccurred: Boolean(safe.fallbackOccurred)
    });

    pushBoundedEntry(qa.recentRouteOutcomes, {
      routeKind: String(safe.routeKind || 'unknown'),
      requestedMode: String(safe.requestedMode || 'legacy'),
      routeDecision: String(safe.routeDecision || 'delegate_legacy'),
      readinessLevel: String(safe.readinessLevel || 'unknown'),
      softCutoverRequested: Boolean(safe.softCutoverRequested),
      softCutoverActive: Boolean(safe.softCutoverActive),
      fallbackOccurred: Boolean(safe.fallbackOccurred),
      fallbackReasons: Array.isArray(safe.fallbackReasons) ? safe.fallbackReasons.slice() : [],
      routedResponsibilities: Array.isArray(safe.routedResponsibilities) ? safe.routedResponsibilities.slice() : []
    });
  }

  function recordQaRouteObservation(observation) {
    const qa = engineState.qaSampling;
    const safe = observation && typeof observation === 'object' ? observation : {};
    const scenarioLabel = normalizeQaScenarioLabel(safe.scenarioLabel);

    applyQaRouteObservationToBucket(qa, safe);
    incrementCounter(qa.scenarioCounts, scenarioLabel);
    applyQaRouteObservationToBucket(getQaScenarioSamplingBucket(scenarioLabel), {
      ...safe,
      scenarioLabel
    });
  }

  function buildQaSamplingSummaryFromBucket(bucket, options = {}) {
    const qa = bucket && typeof bucket === 'object' ? bucket : buildEmptyQaSamplingState();
    return {
      totalRouteObservations: Number(qa.totalRouteObservations || 0),
      softCutoverRequestedCount: Number(qa.softCutoverRequestedCount || 0),
      softCutoverActivatedCount: Number(qa.softCutoverActivatedCount || 0),
      fallbackCount: Number(qa.fallbackCount || 0),
      fallbackReasonCounts: { ...(qa.fallbackReasonCounts || {}) },
      routedResponsibilityCounts: { ...(qa.routedResponsibilityCounts || {}) },
      readinessLevelCounts: { ...(qa.readinessLevelCounts || {}) },
      routeKindCounts: { ...(qa.routeKindCounts || {}) },
      restoreInteractionCounts: { ...(qa.restoreInteractionCounts || {}) },
      recentRouteOutcomes: Array.isArray(qa.recentRouteOutcomes) ? qa.recentRouteOutcomes.map((entry) => ({ ...entry, fallbackReasons: Array.isArray(entry.fallbackReasons) ? entry.fallbackReasons.slice() : [], routedResponsibilities: Array.isArray(entry.routedResponsibilities) ? entry.routedResponsibilities.slice() : [] })) : [],
      recentFallbackReasons: Array.isArray(qa.recentFallbackReasons) ? qa.recentFallbackReasons.slice() : [],
      recentReadinessStates: Array.isArray(qa.recentReadinessStates) ? qa.recentReadinessStates.map((entry) => ({ ...entry })) : [],
      hasActivatedSoftCutoverInSession: Boolean(qa.hasActivatedSoftCutoverInSession),
      scenarioLabel: options.scenarioLabel ? normalizeQaScenarioLabel(options.scenarioLabel) : (qa.scenarioLabel || null),
      scenarioCounts: { ...(qa.scenarioCounts || {}) },
      internalOnly: true,
      notes: ['QA/session sampling is internal-only and not surfaced through normal player UI.']
    };
  }

  function getQaSamplingSummary() {
    return buildQaSamplingSummaryFromBucket(engineState.qaSampling);
  }

  function buildRate(numerator, denominator) {
    if (!Number.isFinite(Number(denominator)) || Number(denominator) <= 0) {
      return 0;
    }
    return Number(numerator || 0) / Number(denominator || 0);
  }

  function computeFallbackPattern(recentRouteOutcomes) {
    const safe = Array.isArray(recentRouteOutcomes) ? recentRouteOutcomes : [];
    if (!safe.length) {
      return {
        kind: 'none',
        longestStreak: 0,
        burstCount: 0
      };
    }

    let longestStreak = 0;
    let currentStreak = 0;
    let burstCount = 0;
    let previousWasFallback = false;

    safe.forEach((entry) => {
      const isFallback = Boolean(entry && entry.fallbackOccurred);
      if (isFallback) {
        currentStreak += 1;
        if (!previousWasFallback) {
          burstCount += 1;
        }
      } else {
        currentStreak = 0;
      }
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
      previousWasFallback = isFallback;
    });

    return {
      kind: longestStreak >= 3 ? 'sticky' : (burstCount > 0 ? 'bursty' : 'none'),
      longestStreak,
      burstCount
    };
  }

  function assessQaSoakSummary(summary) {
    const safe = summary && typeof summary === 'object' ? summary : {};
    const total = Number(safe.totalObservations || 0);
    const activationRate = Number(safe.activationRate || 0);
    const fallbackRate = Number(safe.fallbackRate || 0);
    const readinessCounts = safe.readinessLevelCounts && typeof safe.readinessLevelCounts === 'object'
      ? safe.readinessLevelCounts
      : {};
    const readinessStates = Object.keys(readinessCounts).filter((key) => Number(readinessCounts[key] || 0) > 0);
    const fallbackPattern = safe.fallbackPattern && typeof safe.fallbackPattern === 'object'
      ? safe.fallbackPattern
      : { kind: 'none', longestStreak: 0, burstCount: 0 };
    const allowedResponsibilities = getSoftCutoverScope('tick')
      .concat(getSoftCutoverScope('choice'))
      .concat(getSoftCutoverScope('ui'));
    const routedResponsibilities = safe.routedResponsibilityCounts && typeof safe.routedResponsibilityCounts === 'object'
      ? Object.keys(safe.routedResponsibilityCounts)
      : [];
    const outOfScopeResponsibilities = routedResponsibilities.filter((responsibility) => !allowedResponsibilities.includes(responsibility));

    if (total < 5) {
      return {
        assessment: 'insufficient_data',
        reasons: ['not_enough_observations'],
        notes: ['Soak assessment stays conservative until enough route observations exist.']
      };
    }

    if (outOfScopeResponsibilities.length) {
      return {
        assessment: 'unstable_guardrails',
        reasons: [`out_of_scope_responsibilities:${outOfScopeResponsibilities.join(',')}`],
        notes: ['Observed routed responsibilities exceeded the currently allowed internal soft-cutover scope.']
      };
    }

    if (fallbackRate >= 0.7 || fallbackPattern.kind === 'sticky') {
      return {
        assessment: 'fallback_dominant',
        reasons: ['fallback_rate_high_or_sticky'],
        notes: ['Fallback dominated the observed run, so the current scope should not be widened.']
      };
    }

    if (readinessStates.length > 1 && fallbackRate > 0.3) {
      return {
        assessment: 'unstable_guardrails',
        reasons: ['readiness_fluctuated_with_material_fallback'],
        notes: ['Readiness changed materially across the observed run, so the current scope is not yet stable enough.']
      };
    }

    if (activationRate >= 0.6 && fallbackRate <= 0.25) {
      return {
        assessment: 'stable_for_current_scope',
        reasons: ['activation_consistent_with_low_fallback'],
        notes: ['This only indicates stability for the current narrow internal scope. It does not justify broad cutover.']
      };
    }

    return {
      assessment: 'insufficient_data',
      reasons: ['mixed_signal_not_conclusive'],
      notes: ['Observed results were not clearly unstable, but they are not strong enough to claim current-scope stability.']
    };
  }

  function buildQaSoakSummaryFromSampling(sampling, options = {}) {
    const safeSampling = sampling && typeof sampling === 'object'
      ? sampling
      : buildQaSamplingSummaryFromBucket(buildEmptyQaSamplingState());
    const total = Number(safeSampling.totalRouteObservations || 0);
    const activated = Number(safeSampling.softCutoverActivatedCount || 0);
    const fallback = Number(safeSampling.fallbackCount || 0);
    const fallbackPattern = computeFallbackPattern(safeSampling.recentRouteOutcomes);
    const activationRate = buildRate(activated, total);
    const fallbackRate = buildRate(fallback, total);
    const readinessCounts = safeSampling.readinessLevelCounts && typeof safeSampling.readinessLevelCounts === 'object'
      ? { ...safeSampling.readinessLevelCounts }
      : {};
    const restoreCounts = safeSampling.restoreInteractionCounts && typeof safeSampling.restoreInteractionCounts === 'object'
      ? { ...safeSampling.restoreInteractionCounts }
      : {};
    const summary = {
      totalObservations: total,
      activationRate,
      fallbackRate,
      fallbackReasonDistribution: safeSampling.fallbackReasonCounts && typeof safeSampling.fallbackReasonCounts === 'object'
        ? { ...safeSampling.fallbackReasonCounts }
        : {},
      readinessLevelCounts: readinessCounts,
      routedResponsibilityCounts: safeSampling.routedResponsibilityCounts && typeof safeSampling.routedResponsibilityCounts === 'object'
        ? { ...safeSampling.routedResponsibilityCounts }
        : {},
      routeKindDistribution: safeSampling.routeKindCounts && typeof safeSampling.routeKindCounts === 'object'
        ? { ...safeSampling.routeKindCounts }
        : {},
      restoreResumeNotes: restoreCounts,
      activationPattern: activated > 0 && activated === total
        ? 'stable'
        : (activated > 0 ? 'sporadic' : 'inactive'),
      fallbackPattern,
      recentRouteOutcomes: Array.isArray(safeSampling.recentRouteOutcomes) ? safeSampling.recentRouteOutcomes.map((entry) => ({ ...entry, fallbackReasons: Array.isArray(entry.fallbackReasons) ? entry.fallbackReasons.slice() : [], routedResponsibilities: Array.isArray(entry.routedResponsibilities) ? entry.routedResponsibilities.slice() : [] })) : [],
      recentReadinessStates: Array.isArray(safeSampling.recentReadinessStates) ? safeSampling.recentReadinessStates.map((entry) => ({ ...entry })) : [],
      hasActivatedSoftCutoverInSession: Boolean(safeSampling.hasActivatedSoftCutoverInSession),
      scenarioLabel: options.scenarioLabel ? normalizeQaScenarioLabel(options.scenarioLabel) : (safeSampling.scenarioLabel || null),
      internalOnly: true
    };
    const assessment = assessQaSoakSummary(summary);
    return {
      ...summary,
      assessment: assessment.assessment,
      assessmentReasons: assessment.reasons.slice(),
      notes: assessment.notes.slice()
    };
  }

  function getQaSoakSummary() {
    return buildQaSoakSummaryFromSampling(getQaSamplingSummary());
  }

  function getQaScenarioSummaries() {
    const qa = engineState.qaSampling;
    const scenarioSummaries = qa.scenarioSummaries && typeof qa.scenarioSummaries === 'object'
      ? qa.scenarioSummaries
      : {};
    const result = {};

    Object.keys(scenarioSummaries).sort().forEach((label) => {
      result[label] = buildQaSoakSummaryFromSampling(
        buildQaSamplingSummaryFromBucket(scenarioSummaries[label], { scenarioLabel: label }),
        { scenarioLabel: label }
      );
    });

    return result;
  }

  function compareQaScenarioSummaries() {
    const scenarios = getQaScenarioSummaries();
    const labels = Object.keys(scenarios).sort();
    const comparison = {
      scenarioCount: labels.length,
      scenarioLabels: labels.slice(),
      highestFallbackRateScenario: null,
      stableScenarios: [],
      fallbackDominantScenarios: [],
      insufficientDataScenarios: [],
      unstableGuardrailScenarios: [],
      restoreHeavyComparison: null,
      internalOnly: true,
      notes: ['Scenario comparison is internal-only and conservative. It does not justify broad cutover on its own.']
    };

    let highestFallbackRate = -1;
    labels.forEach((label) => {
      const summary = scenarios[label];
      const fallbackRate = Number(summary && summary.fallbackRate || 0);
      if (fallbackRate > highestFallbackRate) {
        highestFallbackRate = fallbackRate;
        comparison.highestFallbackRateScenario = { label, fallbackRate };
      }
      if (summary.assessment === 'stable_for_current_scope') comparison.stableScenarios.push(label);
      if (summary.assessment === 'fallback_dominant') comparison.fallbackDominantScenarios.push(label);
      if (summary.assessment === 'insufficient_data') comparison.insufficientDataScenarios.push(label);
      if (summary.assessment === 'unstable_guardrails') comparison.unstableGuardrailScenarios.push(label);
    });

    if (scenarios.restore_resume_heavy) {
      const restoreHeavy = scenarios.restore_resume_heavy;
      const baseline = scenarios.stable_allowed || null;
      comparison.restoreHeavyComparison = {
        label: 'restore_resume_heavy',
        assessment: restoreHeavy.assessment,
        fallbackRate: restoreHeavy.fallbackRate,
        materiallyDifferentFromStableAllowed: Boolean(
          baseline && (
            restoreHeavy.assessment !== baseline.assessment
            || Math.abs(Number(restoreHeavy.fallbackRate || 0) - Number(baseline.fallbackRate || 0)) >= 0.2
          )
        ),
        baselineLabel: baseline ? 'stable_allowed' : null
      };
    }

    return comparison;
  }

  function exportQaScenarioReport() {
    return {
      kind: 'internal-soft-cutover-qa-report',
      mode: getMode(),
      generatedAt: new Date().toISOString(),
      overall: getQaSoakSummary(),
      scenarios: getQaScenarioSummaries(),
      comparison: compareQaScenarioSummaries(),
      internalOnly: true,
      notes: ['This report is internal-only. Legacy remains authoritative and no broad cutover is implied.']
    };
  }

  function buildQaScenarioMarkdownReport() {
    const report = exportQaScenarioReport();
    const lines = [
      '# Internal Soft-Cutover Scenario Report',
      '',
      `Mode: ${report.mode}`,
      `Overall assessment: ${report.overall.assessment}`,
      `Observations: ${report.overall.totalObservations}`,
      ''
    ];

    Object.keys(report.scenarios).sort().forEach((label) => {
      const summary = report.scenarios[label];
      lines.push(`## ${label}`);
      lines.push(`- Assessment: ${summary.assessment}`);
      lines.push(`- Observations: ${summary.totalObservations}`);
      lines.push(`- Activation rate: ${Number(summary.activationRate || 0).toFixed(2)}`);
      lines.push(`- Fallback rate: ${Number(summary.fallbackRate || 0).toFixed(2)}`);
      lines.push(`- Activation pattern: ${summary.activationPattern}`);
      lines.push(`- Fallback pattern: ${summary.fallbackPattern && summary.fallbackPattern.kind ? summary.fallbackPattern.kind : 'none'}`);
      lines.push('');
    });

    lines.push('## Comparison');
    lines.push(`- Highest fallback scenario: ${report.comparison.highestFallbackRateScenario ? report.comparison.highestFallbackRateScenario.label : 'none'}`);
    lines.push(`- Stable scenarios: ${report.comparison.stableScenarios.length ? report.comparison.stableScenarios.join(', ') : 'none'}`);
    lines.push(`- Fallback dominant scenarios: ${report.comparison.fallbackDominantScenarios.length ? report.comparison.fallbackDominantScenarios.join(', ') : 'none'}`);
    lines.push(`- Insufficient-data scenarios: ${report.comparison.insufficientDataScenarios.length ? report.comparison.insufficientDataScenarios.join(', ') : 'none'}`);
    lines.push('');
    lines.push('This remains internal-only and does not justify broad cutover.');

    return lines.join('\n');
  }

  function buildEmptyMultiRunScenarioAggregate(label) {
    return {
      label: normalizeQaScenarioLabel(label),
      runCount: 0,
      stableForCurrentScopeCount: 0,
      fallbackDominantCount: 0,
      unstableGuardrailsCount: 0,
      insufficientDataCount: 0,
      activationRateSum: 0,
      fallbackRateSum: 0,
      activationRateAverage: 0,
      fallbackRateAverage: 0,
      assessments: {}
    };
  }

  function aggregateQaScenarioReports(reports) {
    const safeReports = Array.isArray(reports) ? reports.filter((entry) => entry && typeof entry === 'object') : [];
    const scenarioRollups = {};
    const assessmentCounts = {};
    let restoreHeavyDifferentCount = 0;
    let restoreHeavyObservedCount = 0;

    safeReports.forEach((report) => {
      const scenarios = report.scenarios && typeof report.scenarios === 'object' ? report.scenarios : {};
      const comparison = report.comparison && typeof report.comparison === 'object' ? report.comparison : {};
      if (comparison.restoreHeavyComparison && typeof comparison.restoreHeavyComparison === 'object') {
        restoreHeavyObservedCount += 1;
        if (comparison.restoreHeavyComparison.materiallyDifferentFromStableAllowed) {
          restoreHeavyDifferentCount += 1;
        }
      }

      Object.keys(scenarios).forEach((label) => {
        const summary = scenarios[label];
        if (!scenarioRollups[label]) {
          scenarioRollups[label] = buildEmptyMultiRunScenarioAggregate(label);
        }
        const rollup = scenarioRollups[label];
        const assessment = String(summary && summary.assessment || 'insufficient_data');
        rollup.runCount += 1;
        rollup.activationRateSum += Number(summary && summary.activationRate || 0);
        rollup.fallbackRateSum += Number(summary && summary.fallbackRate || 0);
        incrementCounter(rollup.assessments, assessment);
        incrementCounter(assessmentCounts, assessment);

        if (assessment === 'stable_for_current_scope') rollup.stableForCurrentScopeCount += 1;
        if (assessment === 'fallback_dominant') rollup.fallbackDominantCount += 1;
        if (assessment === 'unstable_guardrails') rollup.unstableGuardrailsCount += 1;
        if (assessment === 'insufficient_data') rollup.insufficientDataCount += 1;
      });
    });

    Object.keys(scenarioRollups).forEach((label) => {
      const rollup = scenarioRollups[label];
      const runCount = Number(rollup.runCount || 0);
      rollup.activationRateAverage = runCount > 0 ? rollup.activationRateSum / runCount : 0;
      rollup.fallbackRateAverage = runCount > 0 ? rollup.fallbackRateSum / runCount : 0;
      delete rollup.activationRateSum;
      delete rollup.fallbackRateSum;
    });

    let mostStableScenario = null;
    let mostFallbackDominantScenario = null;
    Object.keys(scenarioRollups).forEach((label) => {
      const rollup = scenarioRollups[label];
      if (!mostStableScenario || rollup.stableForCurrentScopeCount > mostStableScenario.stableForCurrentScopeCount) {
        mostStableScenario = {
          label,
          stableForCurrentScopeCount: rollup.stableForCurrentScopeCount,
          runCount: rollup.runCount
        };
      }
      if (!mostFallbackDominantScenario || rollup.fallbackDominantCount > mostFallbackDominantScenario.fallbackDominantCount) {
        mostFallbackDominantScenario = {
          label,
          fallbackDominantCount: rollup.fallbackDominantCount,
          runCount: rollup.runCount
        };
      }
    });

    return {
      kind: 'internal-soft-cutover-qa-multi-run-report',
      runCount: safeReports.length,
      scenarioLabels: Object.keys(scenarioRollups).sort(),
      scenarioRollups,
      assessmentCounts,
      mostStableScenario,
      mostFallbackDominantScenario,
      restoreHeavySummary: {
        observedRunCount: restoreHeavyObservedCount,
        materiallyDifferentCount: restoreHeavyDifferentCount
      },
      internalOnly: true,
      notes: ['Repeated-run aggregation is internal-only and remains conservative about cutover confidence.']
    };
  }

  function buildQaMultiRunMarkdownReport(reports) {
    const combined = aggregateQaScenarioReports(reports);
    const lines = [
      '# Internal Soft-Cutover Multi-Run Report',
      '',
      `Runs compared: ${combined.runCount}`,
      `Scenarios: ${combined.scenarioLabels.length ? combined.scenarioLabels.join(', ') : 'none'}`,
      ''
    ];

    combined.scenarioLabels.forEach((label) => {
      const rollup = combined.scenarioRollups[label];
      lines.push(`## ${label}`);
      lines.push(`- Runs observed: ${rollup.runCount}`);
      lines.push(`- Stable for current scope: ${rollup.stableForCurrentScopeCount}`);
      lines.push(`- Fallback dominant: ${rollup.fallbackDominantCount}`);
      lines.push(`- Unstable guardrails: ${rollup.unstableGuardrailsCount}`);
      lines.push(`- Insufficient data: ${rollup.insufficientDataCount}`);
      lines.push(`- Avg activation rate: ${Number(rollup.activationRateAverage || 0).toFixed(2)}`);
      lines.push(`- Avg fallback rate: ${Number(rollup.fallbackRateAverage || 0).toFixed(2)}`);
      lines.push('');
    });

    lines.push('## Comparison');
    lines.push(`- Most often stable: ${combined.mostStableScenario ? combined.mostStableScenario.label : 'none'}`);
    lines.push(`- Most often fallback dominant: ${combined.mostFallbackDominantScenario ? combined.mostFallbackDominantScenario.label : 'none'}`);
    lines.push(`- Restore-heavy materially different runs: ${combined.restoreHeavySummary.materiallyDifferentCount}/${combined.restoreHeavySummary.observedRunCount}`);
    lines.push('');
    lines.push('Repeated stability still does not justify broad cutover by itself.');

    return lines.join('\n');
  }

  function resetQaSamplingForTesting() {
    engineState.qaSampling = buildEmptyQaSamplingState();
    return getQaSamplingSummary();
  }

  function exportShadowRuntimeState(stateLike, options = {}) {
    if (!persistenceApi || typeof persistenceApi.serializeShadowRuntimeState !== 'function') {
      return null;
    }
    const bucket = getShadowBucket(stateLike);
    const snapshot = options.snapshot || (shared && typeof shared.buildShadowSnapshot === 'function'
      ? shared.buildShadowSnapshot(stateLike)
      : null);
    return persistenceApi.serializeShadowRuntimeState(buildPersistableRuntimeState(bucket, snapshot), snapshot);
  }

  function restoreShadowRuntimeState(stateLike, payload, options = {}) {
    if (!persistenceApi || typeof persistenceApi.deserializeShadowRuntimeState !== 'function') {
      return null;
    }
    const snapshot = options.snapshot || (shared && typeof shared.buildShadowSnapshot === 'function'
      ? shared.buildShadowSnapshot(stateLike)
      : null);
    const restored = persistenceApi.deserializeShadowRuntimeState(payload, snapshot);
    const runtimeState = restored && restored.runtimeState
      ? restored.runtimeState
      : (persistenceApi.buildDefaultShadowRuntimeState ? persistenceApi.buildDefaultShadowRuntimeState() : { trackedEvents: {} });
    const diagnostics = restored && restored.diagnostics
      ? restored.diagnostics
      : null;

    setShadowBucket(stateLike, {
      previousPressures: runtimeState.previousPressures && typeof runtimeState.previousPressures === 'object'
        ? { ...runtimeState.previousPressures }
        : {},
      previousSimTimeMs: Number.isFinite(Number(runtimeState.previousSimTimeMs))
        ? Number(runtimeState.previousSimTimeMs)
        : Number(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs || 0),
      shadowRuntimeState: {
        ...runtimeState
      },
      diagnostics: null,
      persistence: diagnostics
    });

    const qa = engineState.qaSampling;
    if (diagnostics && diagnostics.restored) {
      incrementCounter(qa.restoreInteractionCounts, 'restored');
    } else if (diagnostics && diagnostics.resetReason) {
      incrementCounter(qa.restoreInteractionCounts, `reset:${diagnostics.resetReason}`);
    } else {
      incrementCounter(qa.restoreInteractionCounts, 'defaulted');
    }

    return diagnostics;
  }

  function getPersistenceDiagnostics(stateLike) {
    const bucket = getShadowBucket(stateLike);
    return bucket && bucket.persistence ? bucket.persistence : null;
  }

  function buildSubsystemCoverage() {
    const dependencies = {
      eligibility: Boolean(eligibilityApi && typeof eligibilityApi.evaluateCatalog === 'function'),
      pressure: Boolean(pressureApi && typeof pressureApi.evaluateLatentPressures === 'function'),
      activation: Boolean(activationApi && typeof activationApi.activateCandidate === 'function'),
      escalation: Boolean(escalationApi && typeof escalationApi.evaluateEscalation === 'function'),
      resolution: Boolean(resolutionApi && typeof resolutionApi.resolveChoice === 'function'),
      rewards: Boolean(rewardsApi && typeof rewardsApi.evaluateRewardWindow === 'function'),
      chains: Boolean(chainsApi && typeof chainsApi.evaluateFollowUps === 'function'),
      analysis: Boolean(analysisApi && typeof analysisApi.buildShadowAnalysis === 'function'),
      persistence: Boolean(persistenceApi && typeof persistenceApi.serializeShadowRuntimeState === 'function' && typeof persistenceApi.deserializeShadowRuntimeState === 'function'),
      cooldowns: Boolean(cooldownsApi && typeof cooldownsApi.buildCooldownDiagnostics === 'function'),
      contradictions: Boolean(contradictionsApi && typeof contradictionsApi.evaluateCandidate === 'function')
    };

    const coverage = {
      eligibility: { implemented: dependencies.eligibility, runtimeStatus: 'shadow-only' },
      pressure: { implemented: dependencies.pressure, runtimeStatus: 'shadow-only' },
      activation: { implemented: dependencies.activation, runtimeStatus: 'shadow-only' },
      escalation: { implemented: dependencies.escalation, runtimeStatus: 'shadow-only' },
      resolution: { implemented: dependencies.resolution, runtimeStatus: 'shadow-only' },
      rewards: { implemented: dependencies.rewards, runtimeStatus: 'shadow-only' },
      chains: { implemented: dependencies.chains, runtimeStatus: 'shadow-only' },
      analysis: { implemented: dependencies.analysis, runtimeStatus: 'shadow-only' },
      persistence: { implemented: dependencies.persistence, runtimeStatus: 'shadow-only' },
      routing: { implemented: true, runtimeStatus: 'legacy-authoritative' },
      rollback: { implemented: true, runtimeStatus: 'prepared-only' }
    };

    const implementedCount = Object.values(coverage).filter((entry) => entry && entry.implemented).length;
    const totalCount = Object.keys(coverage).length;

    return {
      completenessStatus: implementedCount === totalCount
        ? 'shadow_runtime_foundation_complete'
        : 'shadow_runtime_incomplete',
      implementedCount,
      totalCount,
      subsystems: coverage
    };
  }

  function countReasonOccurrences(entries, selector) {
    const counts = {};
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const reasons = selector(entry);
      (Array.isArray(reasons) ? reasons : []).forEach((reason) => {
        const key = String(reason || '').trim();
        if (!key) {
          return;
        }
        counts[key] = Number(counts[key] || 0) + 1;
      });
    });
    return counts;
  }

  function buildRewardParityInspection(stateLike, rewardDiagnostics) {
    const events = stateLike && stateLike.events && typeof stateLike.events === 'object'
      ? stateLike.events
      : {};
    const legacyActiveCategory = String(events.activeCategory || 'generic');
    const legacyPositiveEventId = legacyActiveCategory === 'positive' && typeof events.activeEventId === 'string'
      ? events.activeEventId
      : null;
    const shadowRewardEligible = Boolean(rewardDiagnostics && rewardDiagnostics.rewardEligible);
    const unresolvedReasons = [];

    if (shadowRewardEligible && !legacyPositiveEventId) {
      unresolvedReasons.push('shadow_reward_has_no_legacy_reward_baseline');
    }
    if (!shadowRewardEligible && legacyPositiveEventId) {
      unresolvedReasons.push('legacy_positive_event_not_explained_by_shadow_reward_model');
    }

    return {
      kind: 'partial-shadow-only',
      shadowRewardEligible,
      shadowRewardClass: rewardDiagnostics ? rewardDiagnostics.rewardClass : null,
      legacyPositiveEventId,
      matchesLegacyPositiveEvent: Boolean(
        legacyPositiveEventId
        && rewardDiagnostics
        && rewardDiagnostics.rewardClass
        && legacyPositiveEventId === rewardDiagnostics.rewardClass
      ),
      unresolvedReasons,
      notes: ['Reward parity remains partial because legacy gameplay does not yet expose a comparable modular reward runtime.']
    };
  }

  function buildChainParityInspection(stateLike, chainDiagnostics) {
    const pendingChains = stateLike
      && stateLike.events
      && stateLike.events.foundation
      && stateLike.events.foundation.memory
      && stateLike.events.foundation.memory.pendingChains
      && typeof stateLike.events.foundation.memory.pendingChains === 'object'
      ? Object.keys(stateLike.events.foundation.memory.pendingChains)
      : [];
    const shadowTopFollowUpId = chainDiagnostics && chainDiagnostics.topFollowUp
      ? String(chainDiagnostics.topFollowUp.followUpId || '')
      : null;
    const unresolvedReasons = [];

    if (shadowTopFollowUpId && !pendingChains.includes(shadowTopFollowUpId)) {
      unresolvedReasons.push('shadow_followup_has_no_legacy_pending_chain_match');
    }
    if (!shadowTopFollowUpId && pendingChains.length) {
      unresolvedReasons.push('legacy_pending_chain_not_explained_by_shadow_followup_model');
    }

    return {
      kind: 'partial-foundation-only',
      shadowHasFollowUp: Boolean(chainDiagnostics && chainDiagnostics.hasFollowUp),
      shadowTopFollowUpId,
      legacyPendingChainIds: pendingChains.slice(),
      matchesLegacyPendingChain: Boolean(shadowTopFollowUpId && pendingChains.includes(shadowTopFollowUpId)),
      unresolvedReasons,
      notes: ['Chain parity compares shadow follow-up suggestions against legacy pending-chain memory only; it does not claim full runtime parity.']
    };
  }

  function buildBlockedDeferredInspection(eligibilityResult, activationResult) {
    const blockedEntries = eligibilityResult && Array.isArray(eligibilityResult.evaluations)
      ? eligibilityResult.evaluations.filter((entry) => !entry.eligible)
      : [];
    const deferredEntries = activationResult && Array.isArray(activationResult.deferred)
      ? activationResult.deferred
      : [];

    return {
      blockedCount: blockedEntries.length,
      deferredCount: deferredEntries.length,
      blockedReasonCounts: countReasonOccurrences(blockedEntries, (entry) => entry && entry.reasons),
      deferredReasonCounts: countReasonOccurrences(deferredEntries, (entry) => entry && [entry.reason]),
      notes: ['Blocked and deferred summaries are diagnostic aggregates and do not imply one-to-one parity with legacy event suppression.']
    };
  }

  function selectPrimaryShadowEvent(activationResult, escalationResult) {
    const tracked = escalationResult && escalationResult.trackedEvents && typeof escalationResult.trackedEvents === 'object'
      ? escalationResult.trackedEvents
      : {};
    const primary = activationResult && activationResult.topCandidate ? activationResult.topCandidate : null;
    if (!primary) {
      return null;
    }
    return {
      ...primary,
      shadowStage: tracked[primary.eventId] ? tracked[primary.eventId].stage : primary.activationState
    };
  }

  function buildParityInspection(stateLike, activationResult, eligibilityResult, rewardDiagnostics, chainDiagnostics) {
    const events = stateLike && stateLike.events && typeof stateLike.events === 'object'
      ? stateLike.events
      : {};
    const legacyActiveEventId = typeof events.activeEventId === 'string' ? events.activeEventId : null;
    const topShadowActive = activationResult && Array.isArray(activationResult.activeCandidates) && activationResult.activeCandidates.length
      ? activationResult.activeCandidates[0]
      : null;
    const topShadowWarning = activationResult && Array.isArray(activationResult.warnings) && activationResult.warnings.length
      ? activationResult.warnings[0]
      : null;
    const eligibilityBlocked = new Map(
      (eligibilityResult && Array.isArray(eligibilityResult.evaluations) ? eligibilityResult.evaluations : [])
        .filter((entry) => !entry.eligible && entry.eventId)
        .map((entry) => [entry.eventId, entry])
    );
    const shadowRanked = new Map(
      (activationResult && Array.isArray(activationResult.rankedCandidates) ? activationResult.rankedCandidates : [])
        .filter((entry) => entry && entry.eventId)
        .map((entry) => [entry.eventId, entry])
    );
    const shadowSuppressed = new Map(
      (activationResult && Array.isArray(activationResult.suppressed) ? activationResult.suppressed : [])
        .filter((entry) => entry && entry.eventId)
        .map((entry) => [entry.eventId, entry])
    );
    const shadowDeferred = new Map(
      (activationResult && Array.isArray(activationResult.deferred) ? activationResult.deferred : [])
        .filter((entry) => entry && entry.eventId)
        .map((entry) => [entry.eventId, entry])
    );
    const shadowTopActiveId = topShadowActive ? String(topShadowActive.eventId || '') : null;
    const shadowTopWarningId = topShadowWarning ? String(topShadowWarning.eventId || '') : null;

    let legacyDivergence = null;
    if (legacyActiveEventId) {
      if (eligibilityBlocked.has(legacyActiveEventId)) {
        legacyDivergence = {
          eventId: legacyActiveEventId,
          reason: 'eligibility_mismatch',
          details: eligibilityBlocked.get(legacyActiveEventId).reasons.slice()
        };
      } else if (shadowSuppressed.has(legacyActiveEventId)) {
        const suppressedEntry = shadowSuppressed.get(legacyActiveEventId);
        legacyDivergence = {
          eventId: legacyActiveEventId,
          reason: 'deterministic_tie_break_or_conflict',
          details: [String(suppressedEntry.suppressionReason || 'suppressed'), `suppressed_by:${suppressedEntry.suppressedByEventId || 'unknown'}`]
        };
      } else if (shadowDeferred.has(legacyActiveEventId)) {
        legacyDivergence = {
          eventId: legacyActiveEventId,
          reason: 'deferred_candidate',
          details: [String(shadowDeferred.get(legacyActiveEventId).reason || 'deferred')]
        };
      } else if (shadowRanked.has(legacyActiveEventId)) {
        const rankedEntry = shadowRanked.get(legacyActiveEventId);
        legacyDivergence = {
          eventId: legacyActiveEventId,
          reason: rankedEntry.activationState === 'warning'
            ? 'threshold_mismatch_warning_only'
            : (rankedEntry.activationState === 'latent' ? 'threshold_mismatch_latent' : 'active_alignment'),
          details: [rankedEntry.thresholdReason, `score:${rankedEntry.activationScore}`]
        };
      } else {
        legacyDivergence = {
          eventId: legacyActiveEventId,
          reason: 'not_evaluated_in_shadow',
          details: ['Event was not present in the current shadow candidate sets.']
        };
      }
    }

    const warningInspection = {
      topShadowWarningId: shadowTopWarningId,
      legacyRuntimeBusy: String(events.machineState || 'idle') !== 'idle',
      unresolvedReasons: []
    };
    if (warningInspection.legacyRuntimeBusy && shadowTopWarningId) {
      warningInspection.unresolvedReasons.push('busy_runtime_suppresses_shadow_warning_visibility');
    }

    const blockedDeferred = buildBlockedDeferredInspection(eligibilityResult, activationResult);
    const rewardParity = buildRewardParityInspection(stateLike, rewardDiagnostics);
    const chainParity = buildChainParityInspection(stateLike, chainDiagnostics);
    const unresolvedMismatchReasons = [];

    if (legacyDivergence && legacyDivergence.reason && legacyDivergence.reason !== 'active_alignment') {
      unresolvedMismatchReasons.push(`active:${legacyDivergence.reason}`);
    }
    warningInspection.unresolvedReasons.forEach((reason) => unresolvedMismatchReasons.push(`warning:${reason}`));
    rewardParity.unresolvedReasons.forEach((reason) => unresolvedMismatchReasons.push(`reward:${reason}`));
    chainParity.unresolvedReasons.forEach((reason) => unresolvedMismatchReasons.push(`chain:${reason}`));

    const parityConfidence = unresolvedMismatchReasons.length
      ? 'low_partial'
      : 'limited_partial';

    return {
      kind: 'partial',
      comparedAgainst: 'legacy_active_event_vs_shadow_candidates_plus_reward_chain_inspection',
      legacyActiveEventId,
      topShadowActiveId: shadowTopActiveId,
      topShadowWarningId: shadowTopWarningId,
      matchesActiveEventId: Boolean(legacyActiveEventId && shadowTopActiveId && legacyActiveEventId === shadowTopActiveId),
      legacyDivergence,
      parityConfidence,
      unresolvedMismatchReasons,
      sections: {
        activeEvent: {
          legacyActiveEventId,
          topShadowActiveId: shadowTopActiveId,
          topShadowWarningId: shadowTopWarningId,
          matchesActiveEventId: Boolean(legacyActiveEventId && shadowTopActiveId && legacyActiveEventId === shadowTopActiveId),
          divergence: legacyDivergence
        },
        warnings: warningInspection,
        blockedDeferred,
        rewards: rewardParity,
        chains: chainParity
      },
      notes: ['Legacy runtime remains authoritative; parity inspection highlights divergence reasons but does not claim full behavioral parity.']
    };
  }

  function buildPersistenceStatus(stateLike, snapshot) {
    const payload = exportShadowRuntimeState(stateLike, { snapshot });
    const described = persistenceApi && typeof persistenceApi.describePersistedShadowPayload === 'function'
      ? persistenceApi.describePersistedShadowPayload(payload)
      : {
        present: Boolean(payload),
        version: null,
        requiredStatePresent: Boolean(payload)
      };
    const restoreDiagnostics = getPersistenceDiagnostics(stateLike);

    return {
      payloadPresent: Boolean(described.present),
      payloadVersion: described.version,
      requiredStatePresent: Boolean(described.requiredStatePresent),
      sections: described.sections || {},
      lastRestore: restoreDiagnostics ? { ...restoreDiagnostics } : null,
      notes: Array.isArray(described.notes) ? described.notes.slice() : []
    };
  }

  function getSoftCutoverScope(routeKind) {
    const safeRouteKind = String(routeKind || '').trim().toLowerCase();
    if (safeRouteKind === 'tick') {
      return SOFT_CUTOVER_SCOPE.TICK.slice();
    }
    if (safeRouteKind === 'choice') {
      return SOFT_CUTOVER_SCOPE.CHOICE.slice();
    }
    if (safeRouteKind === 'ui') {
      return SOFT_CUTOVER_SCOPE.UI.slice();
    }
    return [];
  }

  function evaluateSoftCutoverGate(stateLike, readiness, options = {}) {
    const modeStatus = getModeStatus();
    const routeKind = String(options.routeKind || 'tick');
    const scope = getSoftCutoverScope(routeKind);
    const blockers = [];
    const unresolvedGuardrails = [];

    if (!modeStatus.softCutoverRequested) {
      blockers.push('explicit_internal_mode_required');
    }
    if (!readiness || readiness.readinessLevel !== 'limited_internal_cutover_testing_only' || !readiness.internalTestingReady) {
      blockers.push('readiness_blocked');
    }
    if (!modeStatus.rollbackAvailable) {
      blockers.push('rollback_hooks_missing');
    }
    if (!readiness || !readiness.persistence || !readiness.persistence.requiredStatePresent) {
      blockers.push('required_runtime_state_incomplete');
    }
    if (!readiness || !readiness.diagnosticsCoverageSufficient) {
      blockers.push('diagnostics_coverage_insufficient');
    }
    if (!scope.length) {
      blockers.push('no_soft_cutover_scope_for_route');
    }

    (readiness && Array.isArray(readiness.blockers) ? readiness.blockers : []).forEach((reason) => {
      const safeReason = String(reason || '').trim();
      if (!safeReason) {
        return;
      }
      if (
        safeReason === 'required_runtime_state_incomplete'
        || safeReason === 'rollback_hooks_missing'
        || safeReason.indexOf('parity:') === 0
        || safeReason.indexOf('subsystem_missing:') === 0
      ) {
        unresolvedGuardrails.push(safeReason);
      }
    });

    if (unresolvedGuardrails.length) {
      blockers.push('critical_guardrails_unresolved');
    }

    return {
      routeKind,
      scope,
      allowed: blockers.length === 0,
      blockers,
      unresolvedGuardrails,
      fallbackReason: blockers.length ? blockers[0] : null,
      notes: blockers.length
        ? ['Soft cutover remains disabled for this route; legacy stays authoritative.']
        : ['Internal soft cutover is active only for the explicitly allowed, non-destructive responsibilities on this route.']
    };
  }

  function buildRoutingPlan(stateLike, readiness, options = {}) {
    const modeStatus = getModeStatus();
    const gate = evaluateSoftCutoverGate(stateLike, readiness, options);
    return {
      currentAuthority: 'legacy',
      requestedMode: modeStatus.mode,
      shadowEnabled: Boolean(modeStatus.shadowEnabled),
      newEngineRequested: Boolean(modeStatus.newEngineRequested),
      softCutoverRequested: Boolean(modeStatus.softCutoverRequested),
      liveNewRuntimeAllowed: false,
      rollbackAvailable: true,
      softCutoverActive: Boolean(gate.allowed),
      routeDecision: gate.allowed ? 'delegate_legacy_with_internal_soft_cutover' : 'delegate_legacy',
      fallbackRoute: 'legacy',
      shadowObserverRoute: 'modular_shadow_runtime',
      routeKind: gate.routeKind,
      eligibleSoftCutoverResponsibilities: gate.scope.slice(),
      activeSoftCutoverResponsibilities: gate.allowed ? gate.scope.slice() : [],
      legacyOwnedResponsibilities: [
        'triggering',
        'activation_authority',
        'resolution_authority',
        'state_mutation',
        'persistence_authority'
      ],
      fallbackOccurred: Boolean(modeStatus.softCutoverRequested && !gate.allowed),
      fallbackReasons: gate.blockers.slice(),
      readinessLevel: readiness ? readiness.readinessLevel : 'not_ready',
      internalTestingReady: Boolean(readiness && readiness.internalTestingReady),
      ownershipBoundaries: [
        'Legacy runtime remains the live authority for triggering, activation, and resolution.',
        'Shadow runtime state persists separately under events.shadowRuntime.',
        'Future new-runtime routing must retain a direct rollback path to legacy delegation.',
        'Phase 10 internal soft cutover only exercises non-destructive modular preflight and packaging responsibilities.'
      ],
      gate,
      notes: gate.allowed
        ? ['Internal soft cutover is active only for the allowed scoped responsibilities; live authority remains legacy.']
        : ['Routing plan keeps legacy authoritative. Internal soft cutover remains gated until every runtime guardrail passes.']
    };
  }

  function buildCutoverReadiness(stateLike, diagnostics, snapshot) {
    const subsystemCoverage = buildSubsystemCoverage();
    const persistenceStatus = buildPersistenceStatus(stateLike, snapshot);
    const comparison = diagnostics && diagnostics.comparison ? diagnostics.comparison : { unresolvedMismatchReasons: [] };
    const blockers = [];
    const cautions = [];
    const missingSubsystems = Object.entries(subsystemCoverage.subsystems || {})
      .filter((entry) => !(entry[1] && entry[1].implemented))
      .map((entry) => `subsystem_missing:${entry[0]}`);

    missingSubsystems.forEach((reason) => blockers.push(reason));
    if (!persistenceStatus.payloadPresent || !persistenceStatus.requiredStatePresent) {
      blockers.push('required_runtime_state_incomplete');
    }
    if (!getModeStatus().rollbackAvailable) {
      blockers.push('rollback_hooks_missing');
    }
    (comparison.unresolvedMismatchReasons || []).forEach((reason) => blockers.push(`parity:${reason}`));
    if (comparison.kind === 'partial') {
      cautions.push('parity_scope_partial');
    }

    const internalTestingReady = blockers.length === 0;

    return {
      readinessLevel: internalTestingReady ? 'limited_internal_cutover_testing_only' : 'not_ready',
      liveCutoverAllowed: false,
      internalTestingReady,
      softCutoverEligible: internalTestingReady,
      softCutoverScope: {
        tick: getSoftCutoverScope('tick'),
        choice: getSoftCutoverScope('choice'),
        ui: getSoftCutoverScope('ui')
      },
      shadowRuntimeCompletenessStatus: subsystemCoverage.completenessStatus,
      diagnosticsCoverageSufficient: Boolean(
        diagnostics
        && diagnostics.eligibility
        && diagnostics.pressure
        && diagnostics.activation
        && diagnostics.escalation
        && diagnostics.resolution
        && diagnostics.reward
        && diagnostics.chains
        && diagnostics.persistence
        && diagnostics.comparison
      ),
      subsystems: subsystemCoverage,
      persistence: persistenceStatus,
      blockers,
      cautions,
      notes: ['Phase 10 readiness can unlock internal soft-cutover experiments for explicitly scoped responsibilities only. Broad live cutover remains disabled.']
    };
  }

  function buildRuntimeStatus(stateLike, diagnostics, snapshot, options = {}) {
    const modeStatus = getModeStatus();
    const readiness = buildCutoverReadiness(stateLike, diagnostics, snapshot);
    const routing = options.routing || engineState.lastRoutingReport || buildRoutingPlan(stateLike, readiness, options);
    return {
      mode: modeStatus.mode,
      shadowEnabled: Boolean(modeStatus.shadowEnabled),
      newEngineRequested: Boolean(modeStatus.newEngineRequested),
      softCutoverRequested: Boolean(modeStatus.softCutoverRequested),
      newEngineLive: false,
      liveAuthority: 'legacy',
      softCutoverActive: Boolean(routing && routing.softCutoverActive),
      internallyRoutedResponsibilities: routing && Array.isArray(routing.activeSoftCutoverResponsibilities)
        ? routing.activeSoftCutoverResponsibilities.slice()
        : [],
      legacyOwnedResponsibilities: routing && Array.isArray(routing.legacyOwnedResponsibilities)
        ? routing.legacyOwnedResponsibilities.slice()
        : [],
      fallbackOccurred: Boolean(routing && routing.fallbackOccurred),
      fallbackReasons: routing && Array.isArray(routing.fallbackReasons)
        ? routing.fallbackReasons.slice()
        : [],
      cutoverReadinessLevel: readiness.readinessLevel,
      rollbackAvailable: true,
      persistenceVersion: readiness.persistence.payloadVersion,
      lastRestoreVersion: readiness.persistence.lastRestore ? readiness.persistence.lastRestore.versionLoaded : null,
      qaSamplingInternal: getQaSamplingSummary(),
      qaSoakInternal: getQaSoakSummary(),
      qaScenariosInternal: getQaScenarioSummaries(),
      qaScenarioComparisonInternal: compareQaScenarioSummaries(),
      lastRouteKind: routing && routing.routeKind ? routing.routeKind : null,
      notes: ['Status reporting is non-invasive and does not change event routing behavior.']
    };
  }

  function computeShadowState(stateLike, options = {}) {
    if (!canComputeShadow()) {
      return {
        enabled: false,
        reason: 'missing_shadow_dependencies'
      };
    }

    const bucket = getShadowBucket(stateLike);
    const snapshot = options.snapshot || shared.buildShadowSnapshot(stateLike);
    const catalog = Array.isArray(options.catalog)
      ? options.catalog
      : (stateLike && stateLike.events && Array.isArray(stateLike.events.catalog) ? stateLike.events.catalog : []);
    const eligibilityResult = eligibilityApi.evaluateCatalog(catalog, stateLike, {
      snapshot,
      allowPositive: false
    });
    const pressureState = pressureApi.evaluateLatentPressures(stateLike, {
      snapshot,
      previousPressures: bucket.previousPressures,
      previousSimTimeMs: bucket.previousSimTimeMs
    });
    const activationResult = activationApi.activateCandidate({
      state: stateLike,
      snapshot,
      eligibleEntries: eligibilityResult.eligible,
      pressureState
    });
    const escalationResult = escalationApi.evaluateEscalation({
      snapshot,
      activationResult,
      previousState: bucket.shadowRuntimeState
    });
    const primaryShadowEvent = selectPrimaryShadowEvent(activationResult, escalationResult);
    const noActionResolution = primaryShadowEvent
      ? resolutionApi.resolveChoice({
        shadowEvent: primaryShadowEvent,
        pathKind: 'no_action'
      })
      : null;
    const noActionAnalysis = noActionResolution && noActionResolution.resolved
      ? analysisApi.buildShadowAnalysis({ resolutionModel: noActionResolution })
      : null;
    const rewardDiagnostics = rewardsApi.evaluateRewardWindow({
      snapshot,
      pressureState,
      escalationResult,
      previousState: bucket.shadowRuntimeState
    });
    const rewardAnalysis = analysisApi.buildRewardAnalysis({ rewardDiagnostics });
    const chainDiagnostics = chainsApi.evaluateFollowUps({
      state: stateLike,
      snapshot,
      pressureState,
      previousState: bucket.shadowRuntimeState
    });
    const chainAnalysis = analysisApi.buildChainAnalysis({ chainDiagnostics });
    const parityInspection = buildParityInspection(
      stateLike,
      activationResult,
      eligibilityResult,
      rewardDiagnostics,
      chainDiagnostics
    );

    const diagnostics = {
      enabled: true,
      mode: getMode(),
      snapshot,
      counts: {
        catalog: catalog.length,
        eligible: eligibilityResult.eligible.length,
        warnings: activationResult.warnings.length,
        activeCandidates: activationResult.activeCandidates.length,
        latentCandidates: activationResult.latentCandidates.length,
        rankedCandidates: activationResult.rankedCandidates.length,
        escalatingCandidates: escalationResult.escalatingCandidates.length,
        escalatedCandidates: escalationResult.escalatedCandidates.length
      },
      eligibility: {
        eligibleEventIds: eligibilityResult.eligible.map((entry) => entry.eventId),
        blocked: eligibilityResult.evaluations
          .filter((entry) => !entry.eligible)
          .map((entry) => ({
            eventId: entry.eventId,
            reasons: Array.isArray(entry.reasons) ? entry.reasons.slice() : []
          }))
      },
      pressure: {
        latentPressures: { ...pressureState.latentPressures },
        summary: pressureState.pressureSummary
      },
      activation: {
        activated: Boolean(activationResult.activated),
        topWarningCandidate: activationResult.warnings.length
          ? {
            eventId: activationResult.warnings[0].eventId,
            category: activationResult.warnings[0].category,
            activationState: activationResult.warnings[0].activationState,
            activationScore: activationResult.warnings[0].activationScore
          }
          : null,
        topCandidate: activationResult.topCandidate
          ? {
            eventId: activationResult.topCandidate.eventId,
            category: activationResult.topCandidate.category,
            activationState: activationResult.topCandidate.activationState,
            activationScore: activationResult.topCandidate.activationScore
          }
          : null,
        activeIds: activationResult.activeCandidates.map((entry) => entry.eventId),
        warningIds: activationResult.warnings.map((entry) => entry.eventId),
        latentIds: activationResult.latentCandidates.map((entry) => entry.eventId),
        deferred: activationResult.deferred.slice(),
        suppressed: activationResult.suppressed.map((entry) => ({
          eventId: entry.eventId,
          suppressionReason: entry.suppressionReason,
          suppressedByEventId: entry.suppressedByEventId || null
        })),
        rankedCandidates: activationResult.rankedCandidates.map((entry) => ({
          eventId: entry.eventId,
          category: entry.category,
          activationState: entry.activationState,
          activationScore: entry.activationScore,
          signalScore: entry.signalScore,
          conflictGroup: entry.conflictGroup,
          thresholdReason: entry.thresholdReason,
          thresholds: entry.thresholds,
          categoryPressure: entry.categoryPressure,
          specificPressure: entry.specificPressure,
          repetitionPenalty: entry.repetitionPenalty,
          tieBreaker: entry.tieBreaker
        }))
      },
      escalation: {
        modeledWarningIds: escalationResult.modeledWarnings.map((entry) => entry.eventId),
        escalatingIds: escalationResult.escalatingCandidates.map((entry) => entry.eventId),
        escalatedIds: escalationResult.escalatedCandidates.map((entry) => entry.eventId),
        tracked: escalationResult.trackedEvents
      },
      resolution: {
        primaryEventId: primaryShadowEvent ? primaryShadowEvent.eventId : null,
        noActionPreview: noActionResolution && noActionResolution.resolved
          ? {
            outcomeStatus: noActionResolution.outcomeStatus,
            quality: noActionResolution.quality,
            primaryReasons: noActionResolution.primaryReasons.slice(),
            sideEffectNotes: noActionResolution.sideEffectNotes.slice(),
            categoryPressureDelta: noActionResolution.categoryPressureDelta,
            escalationRiskShift: noActionResolution.escalationRiskShift,
            plausibleFollowUp: noActionResolution.plausibleFollowUp,
            followUpHooks: noActionResolution.followUpHooks.slice()
          }
          : null
      },
      analysis: {
        noAction: noActionAnalysis,
        reward: rewardAnalysis,
        chain: chainAnalysis
      },
      reward: {
        rewardEligible: Boolean(rewardDiagnostics.rewardEligible),
        rewardClass: rewardDiagnostics.rewardClass,
        blockers: Array.isArray(rewardDiagnostics.blockers) ? rewardDiagnostics.blockers.slice() : [],
        contributingInputs: rewardDiagnostics.contributingInputs || {},
        granted: rewardDiagnostics.rewardGranted
          ? {
            rewardClass: rewardDiagnostics.rewardGranted.rewardClass,
            whyEarned: rewardDiagnostics.rewardGranted.whyEarned.slice(),
            modeledEffects: { ...rewardDiagnostics.rewardGranted.modeledEffects }
          }
          : null,
        candidates: Array.isArray(rewardDiagnostics.candidates)
          ? rewardDiagnostics.candidates.map((entry) => ({
            rewardClass: entry.rewardClass,
            eligible: Boolean(entry.eligible),
            blockers: Array.isArray(entry.blockers) ? entry.blockers.slice() : [],
            contributingInputs: entry.contributingInputs || {},
            whyEarned: Array.isArray(entry.whyEarned) ? entry.whyEarned.slice() : [],
            modeledEffects: entry.modeledEffects ? { ...entry.modeledEffects } : null
          }))
          : []
      },
      chains: {
        hasFollowUp: Boolean(chainDiagnostics.hasFollowUp),
        topFollowUp: chainDiagnostics.topFollowUp
          ? {
            followUpId: chainDiagnostics.topFollowUp.followUpId,
            followUpCategory: chainDiagnostics.topFollowUp.followUpCategory,
            sourceEventId: chainDiagnostics.topFollowUp.sourceEventId,
            causeCategory: chainDiagnostics.topFollowUp.causeCategory,
            plausibilityStrength: chainDiagnostics.topFollowUp.plausibilityStrength,
            freshnessInfo: chainDiagnostics.topFollowUp.freshnessInfo,
            blockers: Array.isArray(chainDiagnostics.topFollowUp.blockers) ? chainDiagnostics.topFollowUp.blockers.slice() : [],
            suppressors: Array.isArray(chainDiagnostics.topFollowUp.suppressors) ? chainDiagnostics.topFollowUp.suppressors.slice() : []
          }
          : null,
        candidates: Array.isArray(chainDiagnostics.candidates)
          ? chainDiagnostics.candidates.map((entry) => ({
            followUpId: entry.followUpId,
            followUpCategory: entry.followUpCategory,
            sourceEventId: entry.sourceEventId,
            causeCategory: entry.causeCategory,
            plausibilityStrength: entry.plausibilityStrength,
            freshnessInfo: entry.freshnessInfo,
            blockers: Array.isArray(entry.blockers) ? entry.blockers.slice() : [],
            suppressors: Array.isArray(entry.suppressors) ? entry.suppressors.slice() : []
          }))
          : [],
        evaluated: Array.isArray(chainDiagnostics.evaluated)
          ? chainDiagnostics.evaluated.map((entry) => ({
            followUpId: entry.followUpId,
            followUpCategory: entry.followUpCategory,
            sourceEventId: entry.sourceEventId,
            plausibilityStrength: entry.plausibilityStrength,
            freshnessInfo: entry.freshnessInfo,
            blockers: Array.isArray(entry.blockers) ? entry.blockers.slice() : [],
            suppressors: Array.isArray(entry.suppressors) ? entry.suppressors.slice() : [],
            eligible: Boolean(entry.eligible)
          }))
          : [],
        chainTerminates: Boolean(chainDiagnostics.chainTerminates)
      },
      persistence: bucket && bucket.persistence ? { ...bucket.persistence } : null,
      cooldowns: cooldownsApi.buildCooldownDiagnostics(stateLike, snapshot),
      comparison: parityInspection
    };

    diagnostics.readiness = buildCutoverReadiness(stateLike, diagnostics, snapshot);
    diagnostics.routing = buildRoutingPlan(stateLike, diagnostics.readiness, { routeKind: 'tick' });
    diagnostics.status = buildRuntimeStatus(stateLike, diagnostics, snapshot, { routing: diagnostics.routing, routeKind: 'tick' });

    setShadowBucket(stateLike, {
      previousPressures: { ...pressureState.latentPressures },
      previousSimTimeMs: Number(snapshot.simulation.simTimeMs || 0),
      shadowRuntimeState: {
        trackedEvents: { ...escalationResult.trackedEvents },
        primaryShadowEvent,
        rewardCooldownUntilSimTimeMs: Number(rewardDiagnostics.nextRewardState && rewardDiagnostics.nextRewardState.rewardCooldownUntilSimTimeMs || 0),
        lastRewardClass: rewardDiagnostics.nextRewardState ? rewardDiagnostics.nextRewardState.lastRewardClass : null,
        recentResolutions: Array.isArray(rewardDiagnostics.nextRewardState && rewardDiagnostics.nextRewardState.recentResolutions)
          ? rewardDiagnostics.nextRewardState.recentResolutions.slice()
          : [],
        recentChainContexts: Array.isArray(bucket.shadowRuntimeState && bucket.shadowRuntimeState.recentChainContexts)
          ? bucket.shadowRuntimeState.recentChainContexts.slice()
          : [],
        stableWindow: rewardDiagnostics.nextRewardState && rewardDiagnostics.nextRewardState.stableWindow
          ? { ...rewardDiagnostics.nextRewardState.stableWindow }
          : { startSimTimeMs: null, stableHours: 0, lastStableSimTimeMs: null }
      },
      diagnostics,
      persistence: bucket && bucket.persistence ? bucket.persistence : null
    });

    return diagnostics;
  }

  function maybeComputeShadow(stateLike, options) {
    const mode = getMode();
    if (mode !== 'shadow' && mode !== 'new' && mode !== 'internal-soft-cutover') {
      return null;
    }
    return computeShadowState(stateLike, options);
  }

  function routeTick() {
    const args = Array.prototype.slice.call(arguments);
    const stateLike = args.length > 1 && args[1] && typeof args[1] === 'object'
      ? args[1]
      : null;
    const runtime = getLegacyRuntime();
    const delegated = runtime && typeof runtime.runEventStateMachine === 'function'
      ? 'legacy'
      : 'none';
    const result = delegated === 'legacy'
      ? runtime.runEventStateMachine.apply(runtime, args)
      : null;
    const diagnostics = stateLike ? maybeComputeShadow(stateLike, { nowMs: args[0] }) : null;
    const readiness = stateLike
      ? getCutoverReadiness(stateLike, { diagnostics })
      : buildCutoverReadiness(null, diagnostics || null, null);
    const routing = buildRoutingPlan(stateLike, readiness, { routeKind: 'tick' });
    engineState.lastRoutingReport = routing;
    recordQaRouteObservation({
      routeKind: 'tick',
      scenarioLabel: getQaScenarioLabel(stateLike),
      requestedMode: getMode(),
      routeDecision: routing.routeDecision,
      readinessLevel: readiness.readinessLevel,
      softCutoverRequested: routing.softCutoverRequested,
      softCutoverActive: routing.softCutoverActive,
      fallbackOccurred: routing.fallbackOccurred,
      fallbackReasons: routing.fallbackReasons,
      routedResponsibilities: routing.activeSoftCutoverResponsibilities,
      restoreState: readiness && readiness.persistence && readiness.persistence.lastRestore
        ? `restore_v${readiness.persistence.lastRestore.versionLoaded || 'unknown'}`
        : 'no_restore'
    });

    return {
      mode: getMode(),
      delegated,
      result,
      diagnostics,
      routing,
      softCutover: {
        active: Boolean(routing.softCutoverActive),
        routedResponsibilities: Array.isArray(routing.activeSoftCutoverResponsibilities) ? routing.activeSoftCutoverResponsibilities.slice() : [],
        fallbackOccurred: Boolean(routing.fallbackOccurred),
        fallbackReasons: Array.isArray(routing.fallbackReasons) ? routing.fallbackReasons.slice() : []
      }
    };
  }

  function routeChoice() {
    const args = Array.prototype.slice.call(arguments);
    const stateLike = args.length > 1 && args[1] && typeof args[1] === 'object'
      ? args[1]
      : null;
    const preShadowDiagnostics = stateLike ? maybeComputeShadow(stateLike, { optionId: args[0], reason: 'pre_choice_shadow_model' }) : null;
    const bucket = stateLike ? getShadowBucket(stateLike) : null;
    const primaryShadowEvent = bucket && bucket.shadowRuntimeState ? bucket.shadowRuntimeState.primaryShadowEvent : null;
    const shadowResolution = primaryShadowEvent
      ? resolutionApi.resolveChoice({
        shadowEvent: primaryShadowEvent,
        optionId: args[0],
        pathKind: 'choice'
      })
      : null;
    const shadowAnalysis = shadowResolution && shadowResolution.resolved
      ? analysisApi.buildShadowAnalysis({ resolutionModel: shadowResolution })
      : null;
    const runtime = getLegacyRuntime();
    const delegated = runtime && typeof runtime.onEventOptionClick === 'function'
      ? 'legacy'
      : 'none';
    const result = delegated === 'legacy'
      ? runtime.onEventOptionClick.apply(runtime, args)
      : null;
    let diagnostics = stateLike ? getShadowDiagnostics(stateLike) : null;
    if (!diagnostics && preShadowDiagnostics) {
      diagnostics = preShadowDiagnostics;
    }
    if (diagnostics && shadowResolution && shadowResolution.resolved) {
      const rewardStateWithResolution = bucket
        ? rewardsApi.appendResolutionRecord(bucket.shadowRuntimeState, shadowResolution, diagnostics.snapshot)
        : null;
      const chainStateWithResolution = rewardStateWithResolution
        ? chainsApi.buildChainContext(rewardStateWithResolution, shadowResolution, diagnostics.snapshot)
        : null;
      const rewardDiagnostics = rewardStateWithResolution
        ? rewardsApi.evaluateRewardWindow({
          snapshot: diagnostics.snapshot,
          pressureState: {
            latentPressures: diagnostics.pressure && diagnostics.pressure.latentPressures ? diagnostics.pressure.latentPressures : {}
          },
          escalationResult: {
            escalatingCandidates: Array.isArray(diagnostics.escalation && diagnostics.escalation.escalatingIds)
              ? diagnostics.escalation.escalatingIds.map((eventId) => ({ eventId }))
              : [],
            escalatedCandidates: Array.isArray(diagnostics.escalation && diagnostics.escalation.escalatedIds)
              ? diagnostics.escalation.escalatedIds.map((eventId) => ({ eventId }))
              : []
          },
          previousState: chainStateWithResolution || rewardStateWithResolution
        })
        : null;
      const rewardAnalysis = rewardDiagnostics
        ? analysisApi.buildRewardAnalysis({ rewardDiagnostics })
        : null;
      const chainDiagnostics = chainStateWithResolution
        ? chainsApi.evaluateFollowUps({
          state: stateLike,
          snapshot: diagnostics.snapshot,
          pressureState: {
            latentPressures: diagnostics.pressure && diagnostics.pressure.latentPressures ? diagnostics.pressure.latentPressures : {}
          },
          previousState: chainStateWithResolution
        })
        : null;
      const chainAnalysis = chainDiagnostics
        ? analysisApi.buildChainAnalysis({ chainDiagnostics })
        : null;
      diagnostics = {
        ...diagnostics,
        resolution: {
          ...(diagnostics.resolution || {}),
          choicePreview: {
            optionId: shadowResolution.optionId,
            outcomeStatus: shadowResolution.outcomeStatus,
            quality: shadowResolution.quality,
            primaryReasons: shadowResolution.primaryReasons.slice(),
            sideEffectNotes: shadowResolution.sideEffectNotes.slice(),
            categoryPressureDelta: shadowResolution.categoryPressureDelta,
            escalationRiskShift: shadowResolution.escalationRiskShift,
            plausibleFollowUp: shadowResolution.plausibleFollowUp,
            followUpHooks: shadowResolution.followUpHooks.slice()
          }
        },
        analysis: {
          ...(diagnostics.analysis || {}),
          choice: shadowAnalysis,
          reward: rewardAnalysis || diagnostics.analysis && diagnostics.analysis.reward || null,
          chain: chainAnalysis || diagnostics.analysis && diagnostics.analysis.chain || null
        },
        reward: rewardDiagnostics
          ? {
            rewardEligible: Boolean(rewardDiagnostics.rewardEligible),
            rewardClass: rewardDiagnostics.rewardClass,
            blockers: Array.isArray(rewardDiagnostics.blockers) ? rewardDiagnostics.blockers.slice() : [],
            contributingInputs: rewardDiagnostics.contributingInputs || {},
            granted: rewardDiagnostics.rewardGranted
              ? {
                rewardClass: rewardDiagnostics.rewardGranted.rewardClass,
                whyEarned: rewardDiagnostics.rewardGranted.whyEarned.slice(),
                modeledEffects: { ...rewardDiagnostics.rewardGranted.modeledEffects }
              }
              : null,
            candidates: Array.isArray(rewardDiagnostics.candidates)
              ? rewardDiagnostics.candidates.map((entry) => ({
                rewardClass: entry.rewardClass,
                eligible: Boolean(entry.eligible),
                blockers: Array.isArray(entry.blockers) ? entry.blockers.slice() : [],
                contributingInputs: entry.contributingInputs || {},
                whyEarned: Array.isArray(entry.whyEarned) ? entry.whyEarned.slice() : [],
                modeledEffects: entry.modeledEffects ? { ...entry.modeledEffects } : null
              }))
              : []
          }
          : (diagnostics.reward || null),
        chains: chainDiagnostics
          ? {
            hasFollowUp: Boolean(chainDiagnostics.hasFollowUp),
            topFollowUp: chainDiagnostics.topFollowUp
              ? {
                followUpId: chainDiagnostics.topFollowUp.followUpId,
                followUpCategory: chainDiagnostics.topFollowUp.followUpCategory,
                sourceEventId: chainDiagnostics.topFollowUp.sourceEventId,
                causeCategory: chainDiagnostics.topFollowUp.causeCategory,
                plausibilityStrength: chainDiagnostics.topFollowUp.plausibilityStrength,
                freshnessInfo: chainDiagnostics.topFollowUp.freshnessInfo,
                blockers: Array.isArray(chainDiagnostics.topFollowUp.blockers) ? chainDiagnostics.topFollowUp.blockers.slice() : [],
                suppressors: Array.isArray(chainDiagnostics.topFollowUp.suppressors) ? chainDiagnostics.topFollowUp.suppressors.slice() : []
              }
              : null,
            candidates: Array.isArray(chainDiagnostics.candidates)
              ? chainDiagnostics.candidates.map((entry) => ({
                followUpId: entry.followUpId,
                followUpCategory: entry.followUpCategory,
                sourceEventId: entry.sourceEventId,
                causeCategory: entry.causeCategory,
                plausibilityStrength: entry.plausibilityStrength,
                freshnessInfo: entry.freshnessInfo,
                blockers: Array.isArray(entry.blockers) ? entry.blockers.slice() : [],
                suppressors: Array.isArray(entry.suppressors) ? entry.suppressors.slice() : []
              }))
              : [],
            evaluated: Array.isArray(chainDiagnostics.evaluated)
              ? chainDiagnostics.evaluated.map((entry) => ({
                followUpId: entry.followUpId,
                followUpCategory: entry.followUpCategory,
                sourceEventId: entry.sourceEventId,
                plausibilityStrength: entry.plausibilityStrength,
                freshnessInfo: entry.freshnessInfo,
                blockers: Array.isArray(entry.blockers) ? entry.blockers.slice() : [],
                suppressors: Array.isArray(entry.suppressors) ? entry.suppressors.slice() : [],
                eligible: Boolean(entry.eligible)
              }))
              : [],
            chainTerminates: Boolean(chainDiagnostics.chainTerminates)
          }
          : (diagnostics.chains || null)
      };
      if (diagnostics && diagnostics.snapshot) {
        diagnostics.readiness = buildCutoverReadiness(stateLike, diagnostics, diagnostics.snapshot);
        diagnostics.routing = buildRoutingPlan(stateLike, diagnostics.readiness, { routeKind: 'choice' });
        diagnostics.status = buildRuntimeStatus(stateLike, diagnostics, diagnostics.snapshot, { routing: diagnostics.routing, routeKind: 'choice' });
      }
      if (bucket) {
        if (rewardDiagnostics && rewardDiagnostics.nextRewardState) {
          bucket.shadowRuntimeState = {
            ...bucket.shadowRuntimeState,
            rewardCooldownUntilSimTimeMs: Number(rewardDiagnostics.nextRewardState.rewardCooldownUntilSimTimeMs || 0),
            lastRewardClass: rewardDiagnostics.nextRewardState.lastRewardClass || null,
            recentResolutions: Array.isArray(rewardDiagnostics.nextRewardState.recentResolutions)
              ? rewardDiagnostics.nextRewardState.recentResolutions.slice()
              : [],
            recentChainContexts: Array.isArray(chainStateWithResolution && chainStateWithResolution.recentChainContexts)
              ? chainStateWithResolution.recentChainContexts.slice()
              : Array.isArray(bucket.shadowRuntimeState.recentChainContexts)
                ? bucket.shadowRuntimeState.recentChainContexts.slice()
                : [],
            stableWindow: rewardDiagnostics.nextRewardState.stableWindow
              ? { ...rewardDiagnostics.nextRewardState.stableWindow }
              : bucket.shadowRuntimeState.stableWindow
          };
        }
        bucket.diagnostics = diagnostics;
      }
    }
    const readiness = stateLike
      ? getCutoverReadiness(stateLike, { diagnostics })
      : buildCutoverReadiness(null, diagnostics || null, null);
    const routing = buildRoutingPlan(stateLike, readiness, { routeKind: 'choice' });
    engineState.lastRoutingReport = routing;
    recordQaRouteObservation({
      routeKind: 'choice',
      scenarioLabel: getQaScenarioLabel(stateLike),
      requestedMode: getMode(),
      routeDecision: routing.routeDecision,
      readinessLevel: readiness.readinessLevel,
      softCutoverRequested: routing.softCutoverRequested,
      softCutoverActive: routing.softCutoverActive,
      fallbackOccurred: routing.fallbackOccurred,
      fallbackReasons: routing.fallbackReasons,
      routedResponsibilities: routing.activeSoftCutoverResponsibilities,
      restoreState: readiness && readiness.persistence && readiness.persistence.lastRestore
        ? `restore_v${readiness.persistence.lastRestore.versionLoaded || 'unknown'}`
        : 'no_restore'
    });

    return {
      mode: getMode(),
      delegated,
      result,
      diagnostics,
      routing,
      softCutover: {
        active: Boolean(routing.softCutoverActive),
        routedResponsibilities: Array.isArray(routing.activeSoftCutoverResponsibilities) ? routing.activeSoftCutoverResponsibilities.slice() : [],
        fallbackOccurred: Boolean(routing.fallbackOccurred),
        fallbackReasons: Array.isArray(routing.fallbackReasons) ? routing.fallbackReasons.slice() : []
      }
    };
  }

  function getShadowDiagnostics(stateLike) {
    const bucket = getShadowBucket(stateLike);
    return bucket && bucket.diagnostics ? bucket.diagnostics : null;
  }

  function summarizeShadowForUi(stateLike) {
    const diagnostics = getShadowDiagnostics(stateLike);
    if (!diagnostics) {
      return {
        available: false,
        disclaimer: 'Diagnosevorschau noch nicht berechnet.'
      };
    }

    const noAction = diagnostics.analysis && diagnostics.analysis.noAction && typeof diagnostics.analysis.noAction === 'object'
      ? diagnostics.analysis.noAction
      : null;
    const reward = diagnostics.analysis && diagnostics.analysis.reward && typeof diagnostics.analysis.reward === 'object'
      ? diagnostics.analysis.reward
      : null;
    const chain = diagnostics.analysis && diagnostics.analysis.chain && typeof diagnostics.analysis.chain === 'object'
      ? diagnostics.analysis.chain
      : null;
    const comparison = diagnostics.comparison && typeof diagnostics.comparison === 'object'
      ? diagnostics.comparison
      : null;
    const primaryResolution = diagnostics.resolution && diagnostics.resolution.noActionPreview && typeof diagnostics.resolution.noActionPreview === 'object'
      ? diagnostics.resolution.noActionPreview
      : null;
    const rewardGranted = diagnostics.reward && diagnostics.reward.granted && typeof diagnostics.reward.granted === 'object'
      ? diagnostics.reward.granted
      : null;
    const topFollowUp = diagnostics.chains && diagnostics.chains.topFollowUp && typeof diagnostics.chains.topFollowUp === 'object'
      ? diagnostics.chains.topFollowUp
      : null;
    const primaryState = diagnostics.escalation && Array.isArray(diagnostics.escalation.escalatedIds) && diagnostics.escalation.escalatedIds.length
      ? 'escalating'
      : (diagnostics.activation && diagnostics.activation.topCandidate && diagnostics.activation.topCandidate.activationState === 'warning'
        ? 'warning'
        : 'active');

    return {
      available: true,
      primaryState,
      causeSummary: noAction && typeof noAction.summary === 'string' && noAction.summary
        ? noAction.summary
        : null,
      outcomeSummary: primaryResolution && Array.isArray(primaryResolution.primaryReasons)
        ? primaryResolution.primaryReasons.join(' · ')
        : null,
      qualitySummary: noAction && noAction.quality ? String(noAction.quality) : null,
      rewardSummary: reward && reward.summary ? String(reward.summary) : null,
      chainSummary: chain && chain.summary ? String(chain.summary) : null,
      topFollowUpId: topFollowUp ? String(topFollowUp.followUpId || '') : null,
      comparisonSummary: comparison && Array.isArray(comparison.unresolvedMismatchReasons) && comparison.unresolvedMismatchReasons.length
        ? comparison.unresolvedMismatchReasons.slice(0, 2)
        : [],
      rewardClass: rewardGranted ? String(rewardGranted.rewardClass || '') : (diagnostics.reward ? diagnostics.reward.rewardClass : null),
      disclaimer: 'Diagnosevorschau aus dem neuen Schattenmodell. Live-Gameplay bleibt durch das Legacy-System gesteuert.'
    };
  }

  function getCutoverReadiness(stateLike, options = {}) {
    const snapshot = options.snapshot || (shared && typeof shared.buildShadowSnapshot === 'function'
      ? shared.buildShadowSnapshot(stateLike)
      : null);
    const existingDiagnostics = options.diagnostics || getShadowDiagnostics(stateLike) || {
      persistence: getPersistenceDiagnostics(stateLike),
      comparison: { kind: 'partial', unresolvedMismatchReasons: ['shadow_diagnostics_not_yet_computed'] }
    };
    return buildCutoverReadiness(stateLike, existingDiagnostics, snapshot);
  }

  function getRoutingPlan(stateLike, options = {}) {
    const readiness = options.readiness || getCutoverReadiness(stateLike, options);
    return buildRoutingPlan(stateLike, readiness, options);
  }

  function getRuntimeStatus(stateLike, options = {}) {
    const snapshot = options.snapshot || (shared && typeof shared.buildShadowSnapshot === 'function'
      ? shared.buildShadowSnapshot(stateLike)
      : null);
    const diagnostics = options.diagnostics || getShadowDiagnostics(stateLike) || {
      persistence: getPersistenceDiagnostics(stateLike),
      comparison: { kind: 'partial', unresolvedMismatchReasons: ['shadow_diagnostics_not_yet_computed'] }
    };
    return buildRuntimeStatus(stateLike, diagnostics, snapshot, options);
  }

  function prepareRollbackHooks(stateLike, options = {}) {
    const routing = getRoutingPlan(stateLike, options);
    return {
      rollbackAvailable: true,
      fallbackAuthority: 'legacy',
      fallbackRoute: routing.fallbackRoute,
      routeDecision: routing.routeDecision,
      ownershipBoundaries: Array.isArray(routing.ownershipBoundaries) ? routing.ownershipBoundaries.slice() : [],
      notes: ['Rollback preparation hooks are diagnostic-only in Phase 8 and do not alter routing.']
    };
  }

  function getUiModel(stateLike) {
    const events = stateLike && stateLike.events && typeof stateLike.events === 'object'
      ? stateLike.events
      : {};
    const shadowSummary = summarizeShadowForUi(stateLike);
    const media = eventAssetsApi && typeof eventAssetsApi.buildMediaModel === 'function'
      ? eventAssetsApi.buildMediaModel({
        eventId: events.activeEventId,
        activeEventId: events.activeEventId,
        activeCategory: events.activeCategory,
        category: events.activeCategory,
        title: events.activeEventTitle,
        activeEventTitle: events.activeEventTitle,
        activeImagePath: events.activeImagePath,
        stateTone: shadowSummary && shadowSummary.available
          ? shadowSummary.primaryState
          : (String(events.machineState || 'idle') === 'activeEvent' ? 'active' : '')
      })
      : {
        kind: events.activeImagePath ? 'image' : 'placeholder',
        assetId: null,
        src: events.activeImagePath ? String(events.activeImagePath) : null,
        alt: events.activeEventTitle ? `${events.activeEventTitle} – Ereignisvisual` : 'Ereignisvisual',
        label: null,
        badge: null,
        fallbackOrigin: events.activeImagePath ? 'legacy_active_image' : 'generic_placeholder',
        title: String(events.activeEventTitle || ''),
        subtitle: ''
      };

    return {
      popup: {
        machineState: String(events.machineState || 'idle'),
        title: String(events.activeEventTitle || ''),
        description: String(events.activeEventText || ''),
        category: String(events.activeCategory || 'generic'),
        severity: Number(events.activeSeverity || 0),
        shadowSummary
      },
      detail: {
        learningNote: String(events.activeLearningNote || ''),
        options: Array.isArray(events.activeOptions) ? events.activeOptions.slice() : [],
        shadowSummary
      },
      media
    };
  }

  const api = Object.freeze({
    getMode,
    registerLegacyRuntime,
    getLegacyRuntime,
    computeShadowState,
    exportShadowRuntimeState,
    restoreShadowRuntimeState,
    getPersistenceDiagnostics,
    getShadowDiagnostics,
    getCutoverReadiness,
    getRoutingPlan,
    getRuntimeStatus,
    getQaSamplingSummary,
    getQaSoakSummary,
    getQaScenarioSummaries,
    compareQaScenarioSummaries,
    exportQaScenarioReport,
    buildQaScenarioMarkdownReport,
    aggregateQaScenarioReports,
    buildQaMultiRunMarkdownReport,
    prepareRollbackHooks,
    routeTick,
    routeChoice,
    getUiModel,
    resetQaSamplingForTesting,
    setQaScenarioLabelForTesting
  });

  globalScope.GrowSimEventEngine = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
