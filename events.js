'use strict';

function getEventFoundationApis() {
  return {
    plantState: (typeof window !== 'undefined' && window.GrowSimPlantState) ? window.GrowSimPlantState : null,
    flags: (typeof window !== 'undefined' && window.GrowSimEventFlags) ? window.GrowSimEventFlags : null,
    memory: (typeof window !== 'undefined' && window.GrowSimEventMemory) ? window.GrowSimEventMemory : null,
    analysis: (typeof window !== 'undefined' && window.GrowSimEventAnalysis) ? window.GrowSimEventAnalysis : null,
    analysisRuntime: (typeof window !== 'undefined' && window.GrowSimEventAnalysisRuntime) ? window.GrowSimEventAnalysisRuntime : null,
    resolver: (typeof window !== 'undefined' && window.GrowSimEventResolver) ? window.GrowSimEventResolver : null,
    resolution: (typeof window !== 'undefined' && window.GrowSimEventResolution) ? window.GrowSimEventResolution : null,
    chains: (typeof window !== 'undefined' && window.GrowSimEventChains) ? window.GrowSimEventChains : null,
    shared: (typeof window !== 'undefined' && window.GrowSimEventShared) ? window.GrowSimEventShared : null,
    engine: (typeof window !== 'undefined' && window.GrowSimEventEngine) ? window.GrowSimEventEngine : null
  };
}

function getI18nApi() {
  const api = (typeof window !== 'undefined' && window.GrowSimI18n) ? window.GrowSimI18n : null;
  return api && typeof api.t === 'function' ? api : null;
}

function getEventV1WriteTelemetryApi() {
  const root = (typeof window !== 'undefined')
    ? window
    : ((typeof globalThis !== 'undefined') ? globalThis : null);
  if (!root || !root.GrowSimEventV1WriteTelemetry) {
    return null;
  }
  const api = root.GrowSimEventV1WriteTelemetry;
  return api && typeof api.recordEventV1WriteHit === 'function' ? api : null;
}

function isEventV2RuntimeEnabledForTelemetry(eventId) {
  const root = (typeof window !== 'undefined')
    ? window
    : ((typeof globalThis !== 'undefined') ? globalThis : null);
  const registry = root && root.GrowSimEventV2ActivationRegistry && typeof root.GrowSimEventV2ActivationRegistry === 'object'
    ? root.GrowSimEventV2ActivationRegistry
    : null;
  if (!registry || typeof registry.isEventV2RuntimeEnabled !== 'function') {
    return false;
  }
  try {
    return registry.isEventV2RuntimeEnabled(String(eventId || '')) === true;
  } catch (_error) {
    return false;
  }
}

function recordEventV1WriteTelemetryHit(type, context = {}) {
  try {
    const api = getEventV1WriteTelemetryApi();
    if (!api) return;
    const safeContext = context && typeof context === 'object' ? context : {};
    const hasEventV2 = typeof state !== 'undefined' && state && state.eventV2 && typeof state.eventV2 === 'object';
    const eventId = safeContext.eventId == null ? null : String(safeContext.eventId);
    api.recordEventV1WriteHit(type, {
      ...safeContext,
      eventId,
      hasEventV2,
      v2RuntimeEnabled: safeContext.v2RuntimeEnabled === true
        ? true
        : isEventV2RuntimeEnabledForTelemetry(eventId),
      legacyFallback: safeContext.legacyFallback !== false,
      mode: safeContext.mode || 'event-runtime'
    });
  } catch (_error) {
    // Telemetry must never impact runtime behavior.
  }
}

function resolveI18nText(key, fallbackText, vars = null) {
  const api = getI18nApi();
  if (!api || !key) {
    return String(fallbackText || '');
  }
  const translated = api.tOrNull && typeof api.tOrNull === 'function'
    ? api.tOrNull(String(key), vars && typeof vars === 'object' ? vars : undefined)
    : null;
  if (translated === null || translated === undefined || translated === '') {
    return String(fallbackText || '');
  }
  return String(translated);
}

function sanitizePlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...value }
    : {};
}

function normalizeStringList(values) {
  return Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
}

function normalizeFollowUpRuleValue(value) {
  if (typeof value === 'string') {
    const safe = String(value || '').trim();
    return safe ? [safe] : [];
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  return [];
}

function normalizeOutcomeTexts(rawOutcomeTexts) {
  const source = sanitizePlainObject(rawOutcomeTexts);
  const keys = ['improved', 'stabilized', 'unresolved', 'worsened', 'escalated'];
  const normalized = {};
  for (const key of keys) {
    const entry = source[key];
    if (typeof entry === 'string') {
      normalized[key] = { explanation: String(entry) };
      continue;
    }
    if (entry && typeof entry === 'object') {
      normalized[key] = {
        explanation: typeof entry.explanation === 'string' ? entry.explanation : '',
        cause: typeof entry.cause === 'string' ? entry.cause : '',
        result: typeof entry.result === 'string' ? entry.result : '',
        guidance: typeof entry.guidance === 'string' ? entry.guidance : ''
      };
    }
  }
  return normalized;
}

function normalizeFollowUpRules(rawFollowUpRules) {
  const source = sanitizePlainObject(rawFollowUpRules);
  return {
    improved: normalizeFollowUpRuleValue(source.improved),
    stabilized: normalizeFollowUpRuleValue(source.stabilized),
    unresolved: normalizeFollowUpRuleValue(source.unresolved),
    worsened: normalizeFollowUpRuleValue(source.worsened),
    escalated: normalizeFollowUpRuleValue(source.escalated)
  };
}

function defaultResolveTimeMinutesForEvent(category, severity, tags = []) {
  const safeCategory = String(category || 'generic').toLowerCase();
  const safeSeverity = clamp(Number(severity) || 3, 1, 5);
  const safeTags = Array.isArray(tags) ? tags.map((tag) => String(tag).toLowerCase()) : [];

  if (safeTags.includes('urgent') || safeTags.includes('heat') || safeTags.includes('light')) {
    return 35;
  }
  if (safeCategory === 'environment') {
    return safeSeverity >= 4 ? 40 : 50;
  }
  if (safeCategory === 'water') {
    return safeTags.includes('root') || safeTags.includes('oxygen') ? 60 : 45;
  }
  if (safeCategory === 'nutrition') {
    return safeTags.includes('ph') || safeTags.includes('ec') ? 90 : 75;
  }
  if (safeCategory === 'disease' || safeCategory === 'pest') {
    return safeSeverity >= 4 ? 90 : 75;
  }
  if (safeCategory === 'positive') {
    return 30;
  }
  return 60;
}

function outcomeSummaryFromResolution(resolutionModel) {
  if (!resolutionModel || typeof resolutionModel !== 'object') {
    return 'mixed';
  }
  if (resolutionModel.quality === 'good' || resolutionModel.outcomeStatus === 'improved' || resolutionModel.outcomeStatus === 'stabilized') {
    return 'good';
  }
  if (resolutionModel.quality === 'poor' || resolutionModel.outcomeStatus === 'worsened' || resolutionModel.outcomeStatus === 'escalated') {
    return 'bad';
  }
  return 'mixed';
}

function classifyOutcome(deltaSummary) {
  const d = deltaSummary || {};
  const score = (Number(d.health) || 0) + (Number(d.growth) || 0) - (Number(d.stress) || 0) - (Number(d.risk) || 0);
  if (score >= 1) return 'good';
  if (score <= -1) return 'bad';
  return 'mixed';
}

function getCatalogEventById(eventId) {
  if (!eventId || !state.events || !Array.isArray(state.events.catalog)) {
    return null;
  }
  return state.events.catalog.find((eventDef) => eventDef && eventDef.id === String(eventId)) || null;
}

function getEventOptionById(eventDef, optionId) {
  const options = eventDef && Array.isArray(eventDef.options) ? eventDef.options : [];
  return options.find((option) => option && option.id === String(optionId)) || null;
}

function buildPendingResolutionPreview(eventDef, choice, resolveTimeRealMs) {
  return {
    eventId: eventDef && eventDef.id ? String(eventDef.id) : '',
    eventTitle: eventDef && eventDef.title ? String(eventDef.title) : '',
    optionId: choice && choice.id ? String(choice.id) : '',
    optionLabel: choice && choice.label ? String(choice.label) : '',
    summary: 'pending',
    learningNote: eventDef && eventDef.learningNote ? String(eventDef.learningNote) : '',
    resolvedAfterMs: Math.max(0, Number(resolveTimeRealMs) || 0),
    observationText: resolveI18nText(
      'events.outcome.observing_text',
      'The action is now being observed over a short in-game window.'
    )
  };
}


function buildResolutionShadowEvent(eventDef, diagnostics) {
  const safeEventDef = eventDef && typeof eventDef === 'object' ? eventDef : null;
  const activation = diagnostics && diagnostics.activation && Array.isArray(diagnostics.activation.ranked)
    ? diagnostics.activation.ranked
    : [];
  const tracked = diagnostics && diagnostics.escalation && diagnostics.escalation.tracked && typeof diagnostics.escalation.tracked === 'object'
    ? diagnostics.escalation.tracked
    : {};
  const activationEntry = safeEventDef
    ? activation.find((entry) => entry && entry.eventId === safeEventDef.id)
    : null;
  const trackedEntry = safeEventDef && tracked[safeEventDef.id] ? tracked[safeEventDef.id] : null;
  const categoryKey = String(safeEventDef && safeEventDef.category || 'generic').toLowerCase();
  const latentPressures = diagnostics && diagnostics.pressure && diagnostics.pressure.latentPressures && typeof diagnostics.pressure.latentPressures === 'object'
    ? diagnostics.pressure.latentPressures
    : {};

  return {
    eventDef: safeEventDef,
    eventId: safeEventDef && safeEventDef.id ? safeEventDef.id : null,
    category: safeEventDef && safeEventDef.category ? safeEventDef.category : 'generic',
    activationState: activationEntry && activationEntry.activationState ? activationEntry.activationState : 'active',
    shadowStage: trackedEntry && trackedEntry.stage ? trackedEntry.stage : (activationEntry && activationEntry.activationState ? activationEntry.activationState : 'active'),
    categoryPressure: activationEntry && Number.isFinite(Number(activationEntry.categoryPressure))
      ? Number(activationEntry.categoryPressure)
      : Number(latentPressures[categoryKey] || 0),
    specificPressure: activationEntry && Number.isFinite(Number(activationEntry.specificPressure))
      ? Number(activationEntry.specificPressure)
      : Number(latentPressures[categoryKey] || 0)
  };
}

function buildFallbackResolutionModel(eventDef, choice, pathKind) {
  const safeChoice = choice && typeof choice === 'object' ? choice : null;
  const directDeltas = safeChoice && safeChoice.effects && typeof safeChoice.effects === 'object'
    ? { ...safeChoice.effects }
    : {};
  const deltaSummary = directDeltas || {};
  const summary = classifyOutcome(deltaSummary);
  const outcomeStatus = summary === 'good' ? 'improved' : (summary === 'bad' ? 'worsened' : 'unresolved');
  return {
    resolved: true,
    eventId: eventDef && eventDef.id ? String(eventDef.id) : '',
    category: eventDef && eventDef.category ? String(eventDef.category) : 'generic',
    optionId: safeChoice && safeChoice.id ? String(safeChoice.id) : null,
    pathKind,
    shadowStage: 'active',
    outcomeStatus,
    quality: summary === 'good' ? 'good' : (summary === 'bad' ? 'poor' : 'neutral'),
    fitScore: summary === 'good' ? 18 : (summary === 'bad' ? -18 : 0),
    primaryReasons: [],
    sideEffectNotes: [],
    directDeltas,
    categoryPressureDelta: 0,
    escalationRiskShift: 0,
    followUpHooks: [],
    plausibleFollowUp: false,
    contradictionPenalty: 0,
    rewardMetadata: {
      recoverySignificance: 'default',
      executionRelevant: true
    }
  };
}

function collectResolutionEffects(resolutionModel) {
  const directDeltas = resolutionModel && resolutionModel.directDeltas && typeof resolutionModel.directDeltas === 'object'
    ? resolutionModel.directDeltas
    : {};
  const effects = {};
  for (const [key, value] of Object.entries(directDeltas)) {
    if (key === 'futureEscalationTendency') {
      continue;
    }
    if (!Number.isFinite(Number(value))) {
      continue;
    }
    effects[key] = Number(value);
  }
  const outcomeStatus = String(resolutionModel && resolutionModel.outcomeStatus || 'unresolved').toLowerCase();
  const recoverySignificance = String(
    resolutionModel
    && resolutionModel.rewardMetadata
    && resolutionModel.rewardMetadata.recoverySignificance
    || 'default'
  ).toLowerCase();
  const category = String(resolutionModel && resolutionModel.category || 'generic').toLowerCase();
  const intensityMap = {
    low: 0.7,
    medium: 1,
    high: 1.25,
    default: 0.9
  };
  const intensity = Number(intensityMap[recoverySignificance] || intensityMap.default);
  const addEffect = (metric, delta) => {
    if (!Number.isFinite(Number(delta)) || !metric) {
      return;
    }
    if (
      metric === 'growth'
      && (
        typeof computeGrowthPercent !== 'function'
        || typeof setGrowthFromPercent !== 'function'
        || typeof REAL_RUN_DURATION_MS === 'undefined'
      )
    ) {
      return;
    }
    effects[metric] = round2(Number(effects[metric] || 0) + Number(delta));
  };

  if (outcomeStatus === 'improved') {
    addEffect('risk', -1.8 * intensity);
    addEffect('stress', -1.2 * intensity);
    addEffect('growth', 0.25 * intensity);
    if (category === 'water' || category === 'nutrition') {
      addEffect('health', 0.6 * intensity);
    }
  } else if (outcomeStatus === 'stabilized') {
    addEffect('risk', -1.1 * intensity);
    addEffect('stress', -0.7 * intensity);
    addEffect('growth', 0.08 * intensity);
  } else if (outcomeStatus === 'worsened') {
    addEffect('risk', 1.25);
    addEffect('stress', 0.9);
    if (category === 'water' || category === 'nutrition' || category === 'environment') {
      addEffect('growth', -0.18);
    }
  } else if (outcomeStatus === 'escalated') {
    addEffect('risk', 2.4);
    addEffect('stress', 1.7);
    addEffect('growth', -0.35);
    if (category === 'water' || category === 'nutrition' || category === 'disease') {
      addEffect('health', -0.8);
    }
  }
  return effects;
}

function getPendingChainTimingProfile(followUpId, resolutionModel = null) {
  const safeId = String(followUpId || '').toLowerCase();
  const outcomeStatus = String(resolutionModel && resolutionModel.outcomeStatus || 'unresolved').toLowerCase();
  if (!safeId.startsWith('v2_')) {
    return { delayMinutes: 0, expiryMinutes: 0 };
  }

  if (safeId.includes('recovery') || safeId.includes('stabil') || safeId.includes('relief') || safeId.includes('settled')) {
    return { delayMinutes: 50, expiryMinutes: 6 * 60 };
  }
  if (safeId.includes('microclimate') || safeId.includes('humidity') || safeId.includes('stagnant') || safeId.includes('mold')) {
    return { delayMinutes: 90, expiryMinutes: 10 * 60 };
  }
  if (safeId.includes('root') || safeId.includes('lockout') || safeId.includes('uptake') || safeId.includes('nutrition')) {
    return { delayMinutes: 75, expiryMinutes: 10 * 60 };
  }
  if (safeId.includes('support') || safeId.includes('stretch') || safeId.includes('load')) {
    return { delayMinutes: 80, expiryMinutes: 8 * 60 };
  }
  if (outcomeStatus === 'improved' || outcomeStatus === 'stabilized') {
    return { delayMinutes: 45, expiryMinutes: 6 * 60 };
  }
  if (outcomeStatus === 'escalated') {
    return { delayMinutes: 110, expiryMinutes: 12 * 60 };
  }
  return { delayMinutes: 70, expiryMinutes: 9 * 60 };
}

function describeProblemSource(eventDef) {
  const shadowModel = eventDef && eventDef.shadowModel && typeof eventDef.shadowModel === 'object'
    ? eventDef.shadowModel
    : {};
  const polarity = String(shadowModel.problemPolarity || '').toLowerCase();
  const category = String(eventDef && eventDef.category || 'generic').toLowerCase();

  if (category === 'water' && polarity === 'wet') {
    return resolveI18nText('events.problem_source.water_wet', 'The medium stayed wet too long, reducing oxygen in the root zone.');
  }
  if (category === 'water' && polarity === 'dry') {
    return resolveI18nText('events.problem_source.water_dry', 'The root ball dried out too far and the plant had to compensate for water stress.');
  }
  if (category === 'nutrition' && polarity === 'lockout') {
    return resolveI18nText('events.problem_source.nutrition_lockout', 'Uptake was unstable. EC or pH drift shifted nutrient availability.');
  }
  if (category === 'nutrition' && polarity === 'deficit') {
    return resolveI18nText('events.problem_source.nutrition_deficit', 'The current nutrient buffer no longer matched this growth phase.');
  }
  if (category === 'disease' || polarity === 'mold_surface') {
    return resolveI18nText('events.problem_source.disease_mold', 'Humidity, low airflow, or dense canopy pushed the microclimate out of balance.');
  }
  if (category === 'environment' && polarity === 'heat_dry') {
    return resolveI18nText('events.problem_source.environment_heat_dry', 'Heat and dry airflow increased transpiration pressure.');
  }
  if (category === 'environment' && polarity === 'cold') {
    return resolveI18nText('events.problem_source.environment_cold', 'Temperatures dropped too far and slowed metabolism and water uptake.');
  }
  if (category === 'environment' && polarity === 'light_stress') {
    return resolveI18nText('events.problem_source.environment_light', 'Light intensity and canopy distance were too aggressive for the current condition.');
  }
  return resolveI18nText('events.problem_source.generic', 'Multiple stressors built up over time and created the current pressure.');
}


function buildOutcomeGuidanceText(resolutionModel) {
  const status = String(resolutionModel && resolutionModel.outcomeStatus || 'unresolved');
  if (status === 'improved') return resolveI18nText('events.outcome.guidance.improved', 'Keep the correction steady and watch for stable values.');
  if (status === 'stabilized') return resolveI18nText('events.outcome.guidance.stabilized', 'The situation is contained, but it still needs one to two clean follow-up cycles.');
  if (status === 'worsened') return resolveI18nText('events.outcome.guidance.worsened', 'Pressure is not resolved yet. Small targeted corrections beat rushed reactions.');
  if (status === 'escalated') return resolveI18nText('events.outcome.guidance.escalated', 'The situation keeps escalating. Prioritize containment over growth pushes.');
  return resolveI18nText('events.outcome.guidance.unresolved', 'Watch the next cycles and only correct the real trigger.');
}


function buildGenericOutcomeNarrative(eventDef, choice, resolutionModel, followUpIds = []) {
  const status = String(resolutionModel && resolutionModel.outcomeStatus || 'unresolved');
  const followUpHint = followUpIds.length
    ? resolveI18nText('events.outcome.followup_hint', ' A follow-up hint for {id} has been queued.', { id: followUpIds[0] })
    : '';
  const choiceText = choice && choice.label
    ? resolveI18nText('events.outcome.choice_prefix', 'Your decision "{label}"', { label: choice.label })
    : resolveI18nText('events.outcome.choice_prefix_generic', 'Your decision');

  if (status === 'improved') {
    return {
      explanation: resolveI18nText(
        'events.outcome.explanation.improved',
        '{choice} noticeably reduced the pressure.{hint}',
        { choice: choiceText, hint: followUpHint }
      ).trim(),
      cause: describeProblemSource(eventDef),
      result: resolveI18nText('events.outcome.result.improved', 'The plant can stabilize and slowly recover lost reserves.'),
      guidance: buildOutcomeGuidanceText(resolutionModel)
    };
  }
  if (status === 'stabilized') {
    return {
      explanation: resolveI18nText(
        'events.outcome.explanation.stabilized',
        '{choice} helped, but the situation is not fully cleared yet.{hint}',
        { choice: choiceText, hint: followUpHint }
      ).trim(),
      cause: describeProblemSource(eventDef),
      result: resolveI18nText('events.outcome.result.stabilized', 'Acute pressure was contained, but still matters in the background.'),
      guidance: buildOutcomeGuidanceText(resolutionModel)
    };
  }
  if (status === 'worsened') {
    return {
      explanation: resolveI18nText(
        'events.outcome.explanation.worsened',
        '{choice} did not address the core issue cleanly.{hint}',
        { choice: choiceText, hint: followUpHint }
      ).trim(),
      cause: describeProblemSource(eventDef),
      result: resolveI18nText('events.outcome.result.worsened', 'Stress remained active and kept weighing on growth or stability.'),
      guidance: buildOutcomeGuidanceText(resolutionModel)
    };
  }
  if (status === 'escalated') {
    return {
      explanation: resolveI18nText(
        'events.outcome.explanation.escalated',
        '{choice} came too late or did not fit the current pressure pattern.{hint}',
        { choice: choiceText, hint: followUpHint }
      ).trim(),
      cause: describeProblemSource(eventDef),
      result: resolveI18nText('events.outcome.result.escalated', 'Pressure developed into a clearer follow-up problem.'),
      guidance: buildOutcomeGuidanceText(resolutionModel)
    };
  }
  return {
    explanation: resolveI18nText(
      'events.outcome.explanation.unresolved',
      '{choice} changed the situation only partially.{hint}',
      { choice: choiceText, hint: followUpHint }
    ).trim(),
    cause: describeProblemSource(eventDef),
    result: resolveI18nText('events.outcome.result.unresolved', 'The plant remains vulnerable for now, even without hard escalation.'),
    guidance: buildOutcomeGuidanceText(resolutionModel)
  };
}


function buildResolvedOutcomeNarrative(eventDef, choice, resolutionModel, followUpIds = []) {
  const outcomeTexts = eventDef && eventDef.outcomeTexts && typeof eventDef.outcomeTexts === 'object'
    ? eventDef.outcomeTexts
    : {};
  const explicitNarrative = outcomeTexts[String(resolutionModel && resolutionModel.outcomeStatus || 'unresolved')];
  const genericNarrative = buildGenericOutcomeNarrative(eventDef, choice, resolutionModel, followUpIds);
  return explicitNarrative && typeof explicitNarrative === 'object'
    ? {
      explanation: explicitNarrative.explanation || genericNarrative.explanation,
      cause: explicitNarrative.cause || genericNarrative.cause,
      result: explicitNarrative.result || genericNarrative.result,
      guidance: explicitNarrative.guidance || genericNarrative.guidance
    }
    : genericNarrative;
}

function buildResolvedOutcomeRecord(eventDef, choice, pendingResolution, resolutionModel, analysisEntry, deltaSummary, followUpIds = []) {
  const narrative = buildResolvedOutcomeNarrative(eventDef, choice, resolutionModel, followUpIds);

  return {
    eventId: eventDef && eventDef.id ? String(eventDef.id) : '',
    eventTitle: eventDef && eventDef.title ? String(eventDef.title) : '',
    optionId: choice && choice.id ? String(choice.id) : '',
    optionLabel: choice && choice.label ? String(choice.label) : '',
    summary: outcomeSummaryFromResolution(resolutionModel),
    quality: resolutionModel && resolutionModel.quality ? String(resolutionModel.quality) : 'neutral',
    outcomeStatus: resolutionModel && resolutionModel.outcomeStatus ? String(resolutionModel.outcomeStatus) : 'unresolved',
    learningNote: eventDef && eventDef.learningNote ? String(eventDef.learningNote) : '',
    explanationText: narrative.explanation,
    causeText: narrative.cause,
    resultText: narrative.result,
    guidanceText: narrative.guidance,
    followUpIds: Array.isArray(followUpIds) ? followUpIds.slice() : [],
    shadowStage: resolutionModel && resolutionModel.shadowStage ? String(resolutionModel.shadowStage) : 'active',
    fitScore: Number(resolutionModel && resolutionModel.fitScore || 0),
    escalationRiskShift: Number(resolutionModel && resolutionModel.escalationRiskShift || 0),
    effectsApplied: deltaSummary && typeof deltaSummary === 'object' ? { ...deltaSummary } : {},
    resolvedAfterMs: Number(pendingResolution && pendingResolution.resolveTimeRealMs || 0),
    chosenAtSimTimeMs: Number(pendingResolution && pendingResolution.chosenAtSimTimeMs || 0),
    resolvedAtSimTimeMs: Number(state.simulation && state.simulation.simTimeMs || 0),
    analysis: analysisEntry || null
  };
}

function incrementAuditMap(map, key, amount = 1) {
  if (!map || typeof map !== 'object') {
    return;
  }
  const safeKey = String(key || '').trim();
  if (!safeKey) {
    return;
  }
  map[safeKey] = Number(map[safeKey] || 0) + Number(amount || 0);
}

function pushAuditRecent(list, value, limit = 12) {
  if (!Array.isArray(list)) {
    return;
  }
  list.push(value);
  if (list.length > limit) {
    list.splice(0, list.length - limit);
  }
}

function ensureEventAuditState(eventsState = state.events) {
  const events = eventsState && typeof eventsState === 'object' ? eventsState : state.events;
  if (!events.audit || typeof events.audit !== 'object') {
    events.audit = {};
  }
  const audit = events.audit;
  if (!audit.totals || typeof audit.totals !== 'object') {
    audit.totals = {};
  }
  if (!audit.byCategory || typeof audit.byCategory !== 'object') audit.byCategory = {};
  if (!audit.byPhase || typeof audit.byPhase !== 'object') audit.byPhase = {};
  if (!audit.byStage || typeof audit.byStage !== 'object') audit.byStage = {};
  if (!audit.byEventId || typeof audit.byEventId !== 'object') audit.byEventId = {};
  if (!audit.bySimDay || typeof audit.bySimDay !== 'object') audit.bySimDay = {};
  if (!audit.outcomes || typeof audit.outcomes !== 'object') audit.outcomes = {};
  if (!audit.followUps || typeof audit.followUps !== 'object') audit.followUps = {};
  if (!audit.followUps.byTargetId || typeof audit.followUps.byTargetId !== 'object') audit.followUps.byTargetId = {};
  if (!audit.followUps.bySourceId || typeof audit.followUps.bySourceId !== 'object') audit.followUps.bySourceId = {};
  if (!audit.guardInterventions || typeof audit.guardInterventions !== 'object') audit.guardInterventions = {};
  if (!audit.gaps || typeof audit.gaps !== 'object') audit.gaps = {};
  if (!Array.isArray(audit.gaps.recentSimMs)) audit.gaps.recentSimMs = [];
  if (!Number.isFinite(audit.gaps.lastActivatedAtSimTimeMs)) audit.gaps.lastActivatedAtSimTimeMs = 0;
  if (!Number.isFinite(audit.gaps.meanSimMs)) audit.gaps.meanSimMs = 0;
  if (!Number.isFinite(audit.gaps.maxSimMs)) audit.gaps.maxSimMs = 0;
  if (!Number.isFinite(audit.gaps.shortGapClusterCount)) audit.gaps.shortGapClusterCount = 0;
  if (!Number.isFinite(audit.gaps.longGapCount)) audit.gaps.longGapCount = 0;
  if (!audit.recent || typeof audit.recent !== 'object') audit.recent = {};
  if (!Array.isArray(audit.recent.eventIds)) audit.recent.eventIds = [];
  if (!Array.isArray(audit.recent.categories)) audit.recent.categories = [];
  if (!Array.isArray(audit.recent.outcomes)) audit.recent.outcomes = [];
  if (!Array.isArray(audit.recent.followUps)) audit.recent.followUps = [];
  if (!Array.isArray(audit.recent.phases)) audit.recent.phases = [];
  if (!Number.isFinite(audit.version)) audit.version = 1;
  return audit;
}

function getAuditPhaseKey() {
  return String(state.plant && state.plant.phase || 'unknown').trim().toLowerCase() || 'unknown';
}

function getAuditStageKey() {
  return String(state.plant && state.plant.stageKey || '').trim().toLowerCase()
    || `stage_${Math.max(0, Math.trunc(Number(state.plant && state.plant.stageIndex) || 0))}`;
}

function updateAuditGapMetrics(audit, nowSimMs) {
  if (!audit || !audit.gaps || !Number.isFinite(Number(nowSimMs))) {
    return;
  }
  const previous = Number(audit.gaps.lastActivatedAtSimTimeMs || 0);
  if (previous > 0 && nowSimMs > previous) {
    const gapSimMs = Number(nowSimMs) - previous;
    pushAuditRecent(audit.gaps.recentSimMs, gapSimMs, 10);
    const recent = audit.gaps.recentSimMs;
    const total = recent.reduce((sum, value) => sum + Number(value || 0), 0);
    audit.gaps.meanSimMs = recent.length ? Math.round(total / recent.length) : 0;
    audit.gaps.maxSimMs = Math.max(Number(audit.gaps.maxSimMs || 0), gapSimMs);
    if (gapSimMs <= (75 * 60 * 1000)) {
      audit.gaps.shortGapClusterCount = Number(audit.gaps.shortGapClusterCount || 0) + 1;
    }
    if (gapSimMs >= (4 * 60 * 60 * 1000)) {
      audit.gaps.longGapCount = Number(audit.gaps.longGapCount || 0) + 1;
    }
  }
  audit.gaps.lastActivatedAtSimTimeMs = Number(nowSimMs);
}

function recordEventAuditActivation(eventDef, meta = {}) {
  const audit = ensureEventAuditState();
  const category = String(eventDef && eventDef.category || 'generic').toLowerCase();
  const eventId = String(eventDef && eventDef.id || meta.eventId || '').trim();
  const phase = String(meta.phase || getAuditPhaseKey());
  const stage = String(meta.stage || getAuditStageKey());
  const simDay = String(Math.max(0, Math.floor(Number(meta.simDay != null ? meta.simDay : state.simulation && state.simulation.simDay) || 0)));
  const nowSimMs = Number(meta.atSimTimeMs != null ? meta.atSimTimeMs : state.simulation && state.simulation.simTimeMs || 0);

  incrementAuditMap(audit.totals, 'activated');
  incrementAuditMap(audit.byCategory, category);
  incrementAuditMap(audit.byPhase, phase);
  incrementAuditMap(audit.byStage, stage);
  incrementAuditMap(audit.byEventId, eventId);
  incrementAuditMap(audit.bySimDay, simDay);
  updateAuditGapMetrics(audit, nowSimMs);
  pushAuditRecent(audit.recent.eventIds, eventId);
  pushAuditRecent(audit.recent.categories, category);
  pushAuditRecent(audit.recent.phases, phase);

  if (meta.isFollowUp === true) {
    incrementAuditMap(audit.totals, 'activatedFollowUps');
  }
  if (meta.consumedChainId) {
    incrementAuditMap(audit.followUps.byTargetId, String(meta.consumedChainId));
  }
}

function recordEventAuditResolution(eventDef, pendingResolution, resolutionModel, followUpIds = []) {
  const audit = ensureEventAuditState();
  const eventId = String(eventDef && eventDef.id || pendingResolution && pendingResolution.eventId || '').trim();
  const outcomeStatus = String(resolutionModel && resolutionModel.outcomeStatus || 'unresolved').trim().toLowerCase() || 'unresolved';
  const category = String(eventDef && eventDef.category || pendingResolution && pendingResolution.eventCategory || 'generic').toLowerCase();
  const phase = getAuditPhaseKey();

  incrementAuditMap(audit.totals, 'resolved');
  incrementAuditMap(audit.outcomes, outcomeStatus);
  incrementAuditMap(audit.byCategory, category, 0);
  incrementAuditMap(audit.byPhase, phase, 0);
  pushAuditRecent(audit.recent.outcomes, outcomeStatus);

  if (String(pendingResolution && pendingResolution.optionId || '') === '__dismiss__') {
    incrementAuditMap(audit.totals, 'dismissed');
  }
  if (outcomeStatus === 'improved' || outcomeStatus === 'stabilized' || outcomeStatus === 'worsened' || outcomeStatus === 'escalated') {
    incrementAuditMap(audit.totals, outcomeStatus);
  }
  for (const followUpId of Array.isArray(followUpIds) ? followUpIds : []) {
    incrementAuditMap(audit.followUps.bySourceId, eventId);
    pushAuditRecent(audit.recent.followUps, String(followUpId));
  }
}

function recordEventAuditQueuedFollowUps(eventId, followUpIds = []) {
  const audit = ensureEventAuditState();
  const safeEventId = String(eventId || '').trim();
  const ids = Array.isArray(followUpIds) ? followUpIds.map((entry) => String(entry || '').trim()).filter(Boolean) : [];
  if (!ids.length) {
    return;
  }
  incrementAuditMap(audit.totals, 'queuedFollowUps', ids.length);
  for (const followUpId of ids) {
    incrementAuditMap(audit.followUps.byTargetId, followUpId);
    if (safeEventId) {
      incrementAuditMap(audit.followUps.bySourceId, safeEventId);
    }
    pushAuditRecent(audit.recent.followUps, followUpId);
  }
}

function recordEventAuditExpiredChains(expiredChains = []) {
  const audit = ensureEventAuditState();
  for (const chain of Array.isArray(expiredChains) ? expiredChains : []) {
    const targetEventId = String(chain && chain.targetEventId || chain && chain.chainId || '').trim();
    if (!targetEventId) {
      continue;
    }
    incrementAuditMap(audit.totals, 'expiredFollowUps');
    incrementAuditMap(audit.followUps.byTargetId, targetEventId, 0);
  }
}

function recordEventAuditResolverTrace(trace) {
  const safeTrace = trace && typeof trace === 'object' ? trace : null;
  if (!safeTrace) {
    return;
  }
  const audit = ensureEventAuditState();
  if (safeTrace.pendingChainOverride === true) {
    incrementAuditMap(audit.guardInterventions, 'pendingChainOverride');
  }
  if (safeTrace.forcedByFlag) {
    incrementAuditMap(audit.guardInterventions, 'forcedFlagOverride');
  }
  const originalCount = Array.isArray(safeTrace.candidates) ? safeTrace.candidates.length : 0;
  const phaseCount = Array.isArray(safeTrace.afterPhaseGuard) ? safeTrace.afterPhaseGuard.length : originalCount;
  const repeatCount = Array.isArray(safeTrace.afterRepeatGuard) ? safeTrace.afterRepeatGuard.length : phaseCount;
  const frustrationCount = Array.isArray(safeTrace.afterFrustrationGuard) ? safeTrace.afterFrustrationGuard.length : repeatCount;
  if (repeatCount < phaseCount) {
    incrementAuditMap(audit.guardInterventions, 'repeatGuard');
  }
  if (frustrationCount < repeatCount) {
    incrementAuditMap(audit.guardInterventions, 'frustrationGuard');
  }
  if (safeTrace.fellBackToOriginal === true) {
    incrementAuditMap(audit.guardInterventions, 'guardFallback');
  }
}

  function buildEventAuditSnapshot(eventsState = state.events) {
    const audit = ensureEventAuditState(eventsState);
    const totals = audit.totals || {};
  const categoryEntries = Object.entries(audit.byCategory || {}).sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0));
  const outcomeEntries = Object.entries(audit.outcomes || {}).sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0));
  const totalActivated = Number(totals.activated || 0);
  const totalResolved = Number(totals.resolved || 0);
  const totalPositive = Number(audit.outcomes.improved || 0) + Number(audit.outcomes.stabilized || 0);
  const totalNegative = Number(audit.outcomes.worsened || 0) + Number(audit.outcomes.escalated || 0);
  return {
    totals: { ...totals },
    byCategory: { ...(audit.byCategory || {}) },
    byPhase: { ...(audit.byPhase || {}) },
    byStage: { ...(audit.byStage || {}) },
    byEventId: { ...(audit.byEventId || {}) },
    bySimDay: { ...(audit.bySimDay || {}) },
    outcomes: { ...(audit.outcomes || {}) },
    followUps: {
      ...(audit.followUps || {}),
      byTargetId: { ...((audit.followUps && audit.followUps.byTargetId) || {}) },
      bySourceId: { ...((audit.followUps && audit.followUps.bySourceId) || {}) }
    },
    guardInterventions: { ...(audit.guardInterventions || {}) },
    gaps: {
      ...(audit.gaps || {}),
      recentSimMs: Array.isArray(audit.gaps && audit.gaps.recentSimMs) ? audit.gaps.recentSimMs.slice() : []
    },
    recent: {
      eventIds: Array.isArray(audit.recent && audit.recent.eventIds) ? audit.recent.eventIds.slice() : [],
      categories: Array.isArray(audit.recent && audit.recent.categories) ? audit.recent.categories.slice() : [],
      outcomes: Array.isArray(audit.recent && audit.recent.outcomes) ? audit.recent.outcomes.slice() : [],
      followUps: Array.isArray(audit.recent && audit.recent.followUps) ? audit.recent.followUps.slice() : [],
      phases: Array.isArray(audit.recent && audit.recent.phases) ? audit.recent.phases.slice() : []
    },
    dominantCategory: categoryEntries.length ? categoryEntries[0][0] : '',
    dominantCategoryCount: categoryEntries.length ? Number(categoryEntries[0][1] || 0) : 0,
      leadingOutcome: outcomeEntries.length ? outcomeEntries[0][0] : '',
      totalActivated,
      totalResolved,
      currentPhase: String(state.plant && state.plant.phase || 'unknown').trim().toLowerCase() || 'unknown',
      currentStageIndex: Math.max(0, Math.trunc(Number(state.plant && state.plant.stageIndex) || 0)),
      currentStageProgress: round2(clamp(Number(state.plant && state.plant.stageProgress) || 0, 0, 1)),
      stabilizationRatio: totalNegative > 0 ? round2(totalPositive / totalNegative) : (totalPositive > 0 ? totalPositive : 0),
      shortGapClusterCount: Number(audit.gaps && audit.gaps.shortGapClusterCount || 0),
      longGapCount: Number(audit.gaps && audit.gaps.longGapCount || 0),
      meanGapSimMs: Number(audit.gaps && audit.gaps.meanSimMs || 0)
    };
  }

  function getAuditMapTopEntry(map) {
    const entries = Object.entries(map && typeof map === 'object' ? map : {})
      .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0));
    return entries.length ? { key: String(entries[0][0]), count: Math.max(0, Math.trunc(Number(entries[0][1]) || 0)) } : null;
  }

  function sumAuditMapValues(map) {
    return Object.values(map && typeof map === 'object' ? map : {}).reduce((sum, value) => {
      return sum + Math.max(0, Math.trunc(Number(value) || 0));
    }, 0);
  }

  function safeAuditRate(numerator, denominator) {
    const top = Math.max(0, Number(numerator) || 0);
    const base = Math.max(0, Number(denominator) || 0);
    if (base <= 0) {
      return 0;
    }
    return round2(top / base);
  }

  function deriveAuditPhaseBand(snapshotInput = null) {
    const snapshot = snapshotInput && typeof snapshotInput === 'object' ? snapshotInput : {};
    const recent = snapshot.recent && typeof snapshot.recent === 'object' ? snapshot.recent : {};
    const recentPhases = Array.isArray(recent.phases) ? recent.phases : [];
    const currentPhase = String(
      snapshot.currentPhase
      || recentPhases[recentPhases.length - 1]
      || (state.plant && state.plant.phase)
      || 'unknown'
    ).trim().toLowerCase() || 'unknown';
    const stageIndex = Math.max(
      0,
      Math.trunc(Number(snapshot.currentStageIndex != null ? snapshot.currentStageIndex : state.plant && state.plant.stageIndex) || 0)
    );

    if (currentPhase === 'seedling') return 'seedling';
    if (currentPhase === 'harvest') return 'harvest';
    if (currentPhase === 'flowering') {
      return stageIndex >= 10 ? 'late_flower' : 'flower';
    }
    if (currentPhase === 'vegetative') {
      return stageIndex >= 6 ? 'stretch' : 'vegetative';
    }
    return currentPhase;
  }

  function countTrailingOutcomeStreak(outcomes = [], allowed = []) {
    const values = Array.isArray(outcomes) ? outcomes : [];
    const accepted = new Set(Array.isArray(allowed) ? allowed.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean) : []);
    let count = 0;
    for (let index = values.length - 1; index >= 0; index -= 1) {
      const value = String(values[index] || '').trim().toLowerCase();
      if (!accepted.has(value)) {
        break;
      }
      count += 1;
    }
    return count;
  }

  function getPhaseDensityTolerance(phaseBand) {
    switch (String(phaseBand || '')) {
      case 'vegetative':
        return 1;
      case 'stretch':
        return 1;
      case 'flower':
        return 0;
      case 'late_flower':
        return 0;
      default:
        return 0;
    }
  }

  function buildEventAuditDerivedMetrics(snapshotInput = null) {
    const snapshot = snapshotInput && typeof snapshotInput === 'object'
      ? snapshotInput
      : buildEventAuditSnapshot(state.events);
    const totals = snapshot.totals && typeof snapshot.totals === 'object' ? snapshot.totals : {};
    const outcomes = snapshot.outcomes && typeof snapshot.outcomes === 'object' ? snapshot.outcomes : {};
    const byCategory = snapshot.byCategory && typeof snapshot.byCategory === 'object' ? snapshot.byCategory : {};
    const byEventId = snapshot.byEventId && typeof snapshot.byEventId === 'object' ? snapshot.byEventId : {};
    const guardInterventions = snapshot.guardInterventions && typeof snapshot.guardInterventions === 'object'
      ? snapshot.guardInterventions
      : {};
    const gaps = snapshot.gaps && typeof snapshot.gaps === 'object' ? snapshot.gaps : {};
    const activated = Math.max(0, Math.trunc(Number(snapshot.totalActivated != null ? snapshot.totalActivated : totals.activated) || 0));
    const resolved = Math.max(0, Math.trunc(Number(snapshot.totalResolved != null ? snapshot.totalResolved : totals.resolved) || 0));
    const queuedFollowUps = Math.max(0, Math.trunc(Number(totals.queuedFollowUps) || 0));
    const activatedFollowUps = Math.max(0, Math.trunc(Number(totals.activatedFollowUps) || 0));
    const expiredFollowUps = Math.max(0, Math.trunc(Number(totals.expiredFollowUps) || 0));
    const pendingFollowUps = Math.max(0, queuedFollowUps - activatedFollowUps - expiredFollowUps);
    const improved = Math.max(0, Math.trunc(Number(outcomes.improved) || 0));
    const stabilized = Math.max(0, Math.trunc(Number(outcomes.stabilized) || 0));
    const worsened = Math.max(0, Math.trunc(Number(outcomes.worsened) || 0));
    const escalated = Math.max(0, Math.trunc(Number(outcomes.escalated) || 0));
    const positiveResolved = improved + stabilized;
    const negativeResolved = worsened + escalated;
    const dominantCategory = String(snapshot.dominantCategory || '');
    const dominantCategoryCount = Math.max(0, Math.trunc(Number(snapshot.dominantCategoryCount) || 0));
    const dominantCategoryShare = safeAuditRate(dominantCategoryCount, activated);
    const repeatLeader = getAuditMapTopEntry(byEventId);
    const repeatLeaderEventId = repeatLeader ? repeatLeader.key : '';
    const repeatLeaderCount = repeatLeader ? repeatLeader.count : 0;
    const repeatLeaderShare = safeAuditRate(repeatLeaderCount, activated);
    const totalGuardHits = sumAuditMapValues(guardInterventions);
    const guardPressureRate = safeAuditRate(totalGuardHits, Math.max(activated, resolved));
    const followUpActivationRate = safeAuditRate(activatedFollowUps, queuedFollowUps);
    const followUpExpiryRate = safeAuditRate(expiredFollowUps, queuedFollowUps);
    const shortGapClusterCount = Math.max(0, Math.trunc(Number(snapshot.shortGapClusterCount != null ? snapshot.shortGapClusterCount : gaps.shortGapClusterCount) || 0));
    const longGapCount = Math.max(0, Math.trunc(Number(snapshot.longGapCount != null ? snapshot.longGapCount : gaps.longGapCount) || 0));
    const meanGapSimMs = Math.max(0, Math.trunc(Number(snapshot.meanGapSimMs != null ? snapshot.meanGapSimMs : gaps.meanSimMs) || 0));
    const recent = snapshot.recent && typeof snapshot.recent === 'object' ? snapshot.recent : {};
    const recentEventIds = Array.isArray(recent.eventIds) ? recent.eventIds.slice() : [];
    const recentOutcomes = Array.isArray(recent.outcomes) ? recent.outcomes.slice() : [];
    const phaseBand = deriveAuditPhaseBand(snapshot);
    const currentPhase = String(snapshot.currentPhase || (state.plant && state.plant.phase) || 'unknown').trim().toLowerCase() || 'unknown';
    const currentStageIndex = Math.max(0, Math.trunc(Number(snapshot.currentStageIndex != null ? snapshot.currentStageIndex : state.plant && state.plant.stageIndex) || 0));
    const recentNegativeStreak = countTrailingOutcomeStreak(recentOutcomes, ['worsened', 'escalated']);
    const recentPositiveStreak = countTrailingOutcomeStreak(recentOutcomes, ['improved', 'stabilized']);

    return {
      activated,
      resolved,
      queuedFollowUps,
      activatedFollowUps,
      expiredFollowUps,
      pendingFollowUps,
      positiveResolved,
      negativeResolved,
      improved,
      stabilized,
      worsened,
      escalated,
      dominantCategory,
      dominantCategoryCount,
      dominantCategoryShare,
      repeatLeaderEventId,
      repeatLeaderCount,
      repeatLeaderShare,
      totalGuardHits,
      guardPressureRate,
      followUpActivationRate,
      followUpExpiryRate,
      shortGapClusterCount,
      longGapCount,
      meanGapSimMs,
      stabilizationRatio: Number(snapshot.stabilizationRatio || 0),
      currentPhase,
      currentStageIndex,
      phaseBand,
      recentNegativeStreak,
      recentPositiveStreak,
      meaningfulActivationSample: activated >= 2,
      strongActivationSample: activated >= 5,
      meaningfulResolutionSample: resolved >= 2,
      strongResolutionSample: resolved >= 3,
      meaningfulFollowUpSample: queuedFollowUps >= 2,
      meaningfulGuardSample: Math.max(activated, resolved) >= 3,
      recentEventIds,
      recentOutcomes
    };
  }

  function classifyEventRunDensity(metrics) {
    const safeMetrics = metrics && typeof metrics === 'object' ? metrics : {};
    const phaseTolerance = getPhaseDensityTolerance(safeMetrics.phaseBand);
    const denseClusterThreshold = safeMetrics.strongActivationSample ? Math.max(2, 2 + phaseTolerance) : Math.max(3, 3 + phaseTolerance);
    const reactiveClusterThreshold = safeMetrics.strongActivationSample ? Math.max(1, 1 + (phaseTolerance >= 1 ? 0 : 0)) : Math.max(2, 1 + phaseTolerance);
    const strongDenseGapLimit = safeMetrics.phaseBand === 'vegetative' ? (60 * 60 * 1000) : (75 * 60 * 1000);
    const reactiveGapLimit = safeMetrics.phaseBand === 'vegetative' ? (90 * 60 * 1000) : (2 * 60 * 60 * 1000);
    if (!safeMetrics.meaningfulActivationSample) {
      return (safeMetrics.longGapCount >= 1 || safeMetrics.activated <= 1) ? 'quiet' : 'undetermined';
    }
    if (safeMetrics.activated <= 4) {
      if (
        safeMetrics.shortGapClusterCount >= Math.max(3, denseClusterThreshold)
        && safeMetrics.meanGapSimMs > 0
        && safeMetrics.meanGapSimMs <= strongDenseGapLimit
      ) {
        return 'dense';
      }
      if (
        safeMetrics.shortGapClusterCount >= Math.max(reactiveClusterThreshold, 2)
        || (safeMetrics.activated >= 4 && safeMetrics.meanGapSimMs > 0 && safeMetrics.meanGapSimMs <= reactiveGapLimit)
      ) {
        return 'reactive';
      }
      if (
        (safeMetrics.longGapCount >= 1 && safeMetrics.activated <= 2)
        || (safeMetrics.meanGapSimMs >= (4 * 60 * 60 * 1000) && safeMetrics.activated <= 3)
      ) {
        return 'quiet';
      }
      return 'balanced';
    }
    if (
      safeMetrics.shortGapClusterCount >= denseClusterThreshold
      || (safeMetrics.strongActivationSample && safeMetrics.meanGapSimMs > 0 && safeMetrics.meanGapSimMs <= strongDenseGapLimit)
    ) {
      return 'dense';
    }
    if (
      safeMetrics.shortGapClusterCount >= reactiveClusterThreshold
      || (safeMetrics.activated >= 4 && safeMetrics.meanGapSimMs > 0 && safeMetrics.meanGapSimMs <= reactiveGapLimit)
    ) {
      return 'reactive';
    }
    if (
      (safeMetrics.longGapCount >= 2 && safeMetrics.activated <= 3)
      || (safeMetrics.meanGapSimMs >= (4 * 60 * 60 * 1000) && safeMetrics.activated <= 3)
    ) {
      return 'quiet';
    }
    return 'balanced';
  }

  function classifyEventRunBalance(metrics, followUpState = 'low_signal') {
    const safeMetrics = metrics && typeof metrics === 'object' ? metrics : {};
    if (!safeMetrics.meaningfulResolutionSample) {
      return 'undetermined';
    }
    const phaseBand = String(safeMetrics.phaseBand || '');
    const negativeLead = Math.max(0, safeMetrics.negativeResolved - safeMetrics.positiveResolved);
    const positiveLead = Math.max(0, safeMetrics.positiveResolved - safeMetrics.negativeResolved);
    const negativeMomentum = safeMetrics.recentNegativeStreak >= 2;
    const positiveMomentum = safeMetrics.recentPositiveStreak >= 2;
    const negativeFollowUpPressure = followUpState === 'building';
    const vulnerableNeedsSupport = phaseBand === 'vegetative' || phaseBand === 'stretch';
    const escalatingThreshold = phaseBand === 'late_flower' ? 1 : 2;

    if (
      positiveMomentum
      && safeMetrics.positiveResolved >= safeMetrics.negativeResolved
      && followUpState !== 'building'
    ) {
      return 'stabilizing';
    }
    if (
      (negativeLead >= Math.max(2, escalatingThreshold) && (negativeMomentum || negativeFollowUpPressure))
      || (phaseBand === 'late_flower' && negativeLead >= 1 && negativeMomentum && negativeFollowUpPressure)
    ) {
      return 'escalating';
    }
    if (
      negativeLead >= 1
      && (
        negativeFollowUpPressure
        || negativeMomentum
        || (!vulnerableNeedsSupport && safeMetrics.strongResolutionSample && negativeLead >= 2)
      )
    ) {
      return 'vulnerable';
    }
    if (
      positiveLead >= 2
      || (
        safeMetrics.strongResolutionSample
        && safeMetrics.positiveResolved > safeMetrics.negativeResolved
        && safeMetrics.stabilizationRatio >= 1.25
        && followUpState !== 'building'
      )
    ) {
      return 'stabilizing';
    }
    return 'balanced';
  }

  function classifyFollowUpPressure(metrics) {
    const safeMetrics = metrics && typeof metrics === 'object' ? metrics : {};
    const floweringTolerance = String(safeMetrics.phaseBand || '') === 'flower' || String(safeMetrics.phaseBand || '') === 'late_flower';
    if (!safeMetrics.meaningfulFollowUpSample) {
      return 'low_signal';
    }
    if (
      safeMetrics.followUpExpiryRate >= 0.5
      && safeMetrics.expiredFollowUps >= safeMetrics.activatedFollowUps
    ) {
      return 'fading';
    }
    if (
      safeMetrics.pendingFollowUps > 0
      && safeMetrics.negativeResolved >= safeMetrics.positiveResolved
      && (
        safeMetrics.followUpActivationRate < 0.5
        || safeMetrics.pendingFollowUps >= (floweringTolerance ? 2 : 1)
        || safeMetrics.recentNegativeStreak >= 2
      )
    ) {
      return 'building';
    }
    if (
      safeMetrics.followUpActivationRate >= 0.6
      && safeMetrics.activatedFollowUps > safeMetrics.expiredFollowUps
    ) {
      return 'constructive';
    }
    if (safeMetrics.pendingFollowUps > 0) {
      return 'open';
    }
    return 'settled';
  }

  function classifyGuardPressure(metrics) {
    const safeMetrics = metrics && typeof metrics === 'object' ? metrics : {};
    if (!safeMetrics.meaningfulGuardSample) {
      return 'low_signal';
    }
    if (safeMetrics.totalGuardHits >= 3 && safeMetrics.guardPressureRate >= 0.75) {
      return 'high';
    }
    if (safeMetrics.totalGuardHits >= 2 && safeMetrics.guardPressureRate >= 0.4) {
      return 'moderate';
    }
    return 'low';
  }

  function classifyEventRunState(metrics, densityState, balanceState, followUpState) {
    const safeMetrics = metrics && typeof metrics === 'object' ? metrics : {};
    if (!safeMetrics.meaningfulActivationSample && !safeMetrics.meaningfulResolutionSample) {
      return 'quiet';
    }
    if (balanceState === 'escalating') {
      return 'escalating';
    }
    if (balanceState === 'stabilizing' && followUpState !== 'building') {
      return 'stabilizing';
    }
    if (balanceState === 'vulnerable') {
      return 'vulnerable';
    }
    if (densityState === 'dense') {
      return 'dense';
    }
    if (densityState === 'reactive') {
      return 'reactive';
    }
    if (densityState === 'quiet') {
      return 'quiet';
    }
    return 'balanced';
  }

  function buildEventAuditInterpretation(snapshotInput = null) {
    const snapshot = snapshotInput && typeof snapshotInput === 'object'
      ? snapshotInput
      : buildEventAuditSnapshot(state.events);
    const metrics = buildEventAuditDerivedMetrics(snapshot);
    const densityState = classifyEventRunDensity(metrics);
    const followUpState = classifyFollowUpPressure(metrics);
    const balanceState = classifyEventRunBalance(metrics, followUpState);
    const guardState = classifyGuardPressure(metrics);
    const primaryState = classifyEventRunState(metrics, densityState, balanceState, followUpState);
    const confidence = metrics.strongActivationSample || metrics.strongResolutionSample
      ? 'high'
      : ((metrics.meaningfulActivationSample || metrics.meaningfulResolutionSample) ? 'medium' : 'low');
    const tuningFlags = [];

    if (metrics.activated >= 4 && metrics.dominantCategoryShare >= 0.6 && metrics.dominantCategory) {
      tuningFlags.push('category_dominance');
    }
    if (metrics.meaningfulFollowUpSample && followUpState === 'fading') {
      tuningFlags.push('followup_expiry_high');
    }
    if (metrics.meaningfulFollowUpSample && followUpState === 'constructive') {
      tuningFlags.push('followup_activation_strong');
    }
    if (metrics.meaningfulGuardSample && guardState === 'high') {
      tuningFlags.push('guard_pressure_high');
    }
    if (metrics.activated >= 4 && metrics.repeatLeaderShare >= 0.45 && metrics.repeatLeaderEventId) {
      tuningFlags.push('repeat_pressure_high');
    }
    if (balanceState === 'stabilizing') {
      tuningFlags.push('stabilization_visible');
    }
    if (balanceState === 'escalating') {
      tuningFlags.push('escalation_visible');
    }

    return {
      primaryState,
      densityState,
      balanceState,
      followUpState,
      guardState,
      confidence,
      tuningFlags,
      metrics
    };
  }

function pickOutcomeFollowUpIds(eventDef, resolutionModel, diagnostics) {
  const followUpRules = eventDef && eventDef.followUpRules && typeof eventDef.followUpRules === 'object'
    ? eventDef.followUpRules
    : null;
  const outcomeStatus = String(resolutionModel && resolutionModel.outcomeStatus || 'unresolved');
  const explicitIds = followUpRules && Array.isArray(followUpRules[outcomeStatus])
    ? followUpRules[outcomeStatus].slice()
    : [];
  const diagnosticsFollowUp = diagnostics && diagnostics.chains && diagnostics.chains.topFollowUp && diagnostics.chains.topFollowUp.followUpId
    ? [String(diagnostics.chains.topFollowUp.followUpId)]
    : [];
  const requested = explicitIds.length ? explicitIds : diagnosticsFollowUp;

  return requested
    .map((eventId) => String(eventId || '').trim())
    .filter(Boolean)
    .filter((eventId) => eventId !== String(eventDef && eventDef.id || ''))
    .filter((eventId, index, list) => list.indexOf(eventId) === index)
    .filter((eventId) => {
      const candidate = getCatalogEventById(eventId);
      if (!candidate) {
        return false;
      }
      if (candidate.isFollowUp === true) {
        return true;
      }
      if (!isEventPhaseAllowed(candidate)) {
        return false;
      }
      if (!evaluateEventConstraints(candidate)) {
        return false;
      }
      return true;
    });
}

function queueOutcomeFollowUps(eventId, optionId, followUpIds, nowRealMs, resolutionModel = null) {
  const foundationApi = getEventFoundationApis();
  if (!foundationApi.memory || typeof foundationApi.memory.setPendingChain !== 'function') {
    return [];
  }

  const queued = [];
  for (const followUpId of Array.isArray(followUpIds) ? followUpIds : []) {
    const timing = getPendingChainTimingProfile(followUpId, resolutionModel);
    const activatesAtRealTimeMs = Number(timing.delayMinutes || 0) > 0
      ? nowRealMs + (Number(timing.delayMinutes || 0) * 60 * 1000)
      : null;
    const expiresAtRealTimeMs = Number(timing.expiryMinutes || 0) > 0
      ? nowRealMs + (Number(timing.expiryMinutes || 0) * 60 * 1000)
      : null;
    foundationApi.memory.setPendingChain(state.events, followUpId, {
      targetEventId: followUpId,
      sourceEventId: eventId ? String(eventId) : null,
      sourceOptionId: optionId ? String(optionId) : null,
      createdAtRealTimeMs: nowRealMs,
      activatesAtRealTimeMs,
      expiresAtRealTimeMs,
      meta: {
        createdBy: 'resolved_outcome',
        queuedFromOutcomeStatus: String(resolutionModel && resolutionModel.outcomeStatus || 'unresolved')
      }
    });
    queued.push(String(followUpId));
  }
  return queued;
}

function resolvePendingEventOutcome(nowMs) {
  const { nowRealMs, nowSimMs } = normalizeEventTimingState(nowMs);
  const pendingResolution = state.events.pendingResolution && typeof state.events.pendingResolution === 'object'
    ? state.events.pendingResolution
    : null;
  if (!pendingResolution) {
    state.events.machineState = 'resolved';
    state.events.pendingOutcome = null;
    state.events.resolvedOutcome = state.events.resolvedOutcome && typeof state.events.resolvedOutcome === 'object'
      ? state.events.resolvedOutcome
      : null;
    return;
  }

  const eventDef = getCatalogEventById(pendingResolution.eventId) || {
    id: pendingResolution.eventId,
    title: pendingResolution.eventTitle,
    category: pendingResolution.eventCategory || 'generic',
    learningNote: pendingResolution.learningNote || '',
    options: []
  };
  const choice = getEventOptionById(eventDef, pendingResolution.optionId) || {
    id: pendingResolution.optionId,
    label: pendingResolution.optionLabel,
    effects: pendingResolution.rawChoiceEffects || {}
  };

  const foundationApi = getEventFoundationApis();
  const diagnostics = foundationApi.engine && typeof foundationApi.engine.computeShadowState === 'function'
    ? foundationApi.engine.computeShadowState(state, { catalog: state.events.catalog })
    : null;
  const shadowEvent = buildResolutionShadowEvent(eventDef, diagnostics);
  const pathKind = pendingResolution.optionId === '__dismiss__' ? 'no_action' : 'choice';
  const resolutionModel = foundationApi.resolution && typeof foundationApi.resolution.resolveChoice === 'function'
    ? foundationApi.resolution.resolveChoice({
      shadowEvent,
      optionId: pendingResolution.optionId,
      pathKind
    })
    : buildFallbackResolutionModel(eventDef, choice, pathKind);

  const outcomeEffects = collectResolutionEffects(resolutionModel);
  const before = snapshotStatus();
  applyChoiceEffects(outcomeEffects);
  applyFoundationFollowUps(choice, eventDef.id);
  const after = snapshotStatus();
  const deltaSummary = summarizeDelta(before, after);
  const followUpIds = pickOutcomeFollowUpIds(eventDef, resolutionModel, diagnostics);
  const queuedFollowUpIds = queueOutcomeFollowUps(eventDef.id, pendingResolution.optionId, followUpIds, nowRealMs, resolutionModel);
  const bridgedFollowUpIds = foundationApi.memory && typeof foundationApi.memory.getPendingChains === 'function'
    ? Object.entries(foundationApi.memory.getPendingChains(state.events) || {})
      .filter(([, chain]) => {
        const safeChain = chain && typeof chain === 'object' ? chain : {};
        return String(safeChain.sourceEventId || '') === String(eventDef.id)
          && String(safeChain.sourceOptionId || '') === String(pendingResolution.optionId);
      })
      .map(([chainId, chain]) => String(chain && chain.targetEventId || chainId || '').trim())
      .filter(Boolean)
    : [];
  const visibleFollowUpIds = [...new Set([...queuedFollowUpIds, ...bridgedFollowUpIds])];
  recordEventAuditQueuedFollowUps(eventDef.id, visibleFollowUpIds);
  const outcomeNarrative = buildResolvedOutcomeNarrative(eventDef, choice, resolutionModel, visibleFollowUpIds);

  const analysisEntry = foundationApi.analysis && typeof foundationApi.analysis.generateAndStoreAnalysis === 'function'
    ? foundationApi.analysis.generateAndStoreAnalysis(state.events, {
      eventId: eventDef.id,
      optionId: pendingResolution.optionId,
      eventTitle: eventDef.title,
      choiceLabel: pendingResolution.optionLabel,
      atRealTimeMs: nowRealMs,
      atSimTimeMs: nowSimMs,
      tick: state.simulation.tickCount,
      tone: resolutionModel && resolutionModel.quality === 'good'
        ? 'recovery'
        : (resolutionModel && resolutionModel.quality === 'poor' ? 'warning' : 'neutral'),
      outcomeStatus: resolutionModel.outcomeStatus,
      actionText: pendingResolution.optionLabel
        ? `Ausgewählte Maßnahme: ${pendingResolution.optionLabel}.`
        : '',
      causeText: outcomeNarrative.cause,
      resultText: outcomeNarrative.result,
      guidanceText: outcomeNarrative.guidance,
      relatedFlags: foundationApi.flags && typeof foundationApi.flags.getActiveFlags === 'function'
        ? foundationApi.flags.getActiveFlags(state.events)
        : [],
      normalizedState: foundationApi.plantState && typeof foundationApi.plantState.buildNormalizedPlantState === 'function'
        ? foundationApi.plantState.buildNormalizedPlantState(state)
        : null,
      relatedChainId: visibleFollowUpIds.length ? visibleFollowUpIds[0] : null
    })
    : null;

  if (analysisEntry && foundationApi.memory && typeof foundationApi.memory.getLastDecision === 'function') {
    const lastDecision = foundationApi.memory.getLastDecision(state.events);
    if (
      lastDecision
      && lastDecision.eventId === String(eventDef.id)
      && lastDecision.optionId === String(pendingResolution.optionId)
    ) {
      lastDecision.analysisId = analysisEntry.analysisId;
      lastDecision.analysisTone = analysisEntry.tone;
    }
  }

  const historyEntry = {
    type: 'event',
    eventId: eventDef.id,
    eventTitle: eventDef.title || '',
    category: eventDef.category || 'generic',
    optionId: pendingResolution.optionId,
    optionLabel: pendingResolution.optionLabel,
    learningNote: eventDef.learningNote || '',
    triggerSnapshot: pendingResolution.triggerSnapshot && typeof pendingResolution.triggerSnapshot === 'object'
      ? { ...pendingResolution.triggerSnapshot }
      : null,
    effectsApplied: deltaSummary,
    sideEffectsTriggered: [],
    analysis: analysisEntry,
    outcomeStatus: resolutionModel.outcomeStatus || 'unresolved',
    quality: resolutionModel.quality || 'neutral',
    explanationText: outcomeNarrative.explanation,
    causeText: outcomeNarrative.cause,
    resultText: outcomeNarrative.result,
    guidanceText: outcomeNarrative.guidance,
    followUpIds: visibleFollowUpIds.slice(),
    atSimTimeMs: nowSimMs,
    atRealTimeMs: nowRealMs
  };

  state.history.events.push(historyEntry);
  state.events.history.push(historyEntry);
  state.events.resolvedOutcome = buildResolvedOutcomeRecord(
    eventDef,
    choice,
    pendingResolution,
    resolutionModel,
    analysisEntry,
    deltaSummary,
    visibleFollowUpIds
  );
  recordEventAuditResolution(eventDef, pendingResolution, resolutionModel, visibleFollowUpIds);
  state.events.pendingResolution = null;
  state.events.pendingOutcome = null;
  state.events.machineState = 'resolved';
  recordEventV1WriteTelemetryHit('W2', {
    source: 'events.js:resolve_finalize_history',
    eventId: historyEntry.eventId,
    notes: ['legacy_resolve_history_write']
  });

  addLog('choice', `Ereignis ausgewertet: ${eventDef.id}/${pendingResolution.optionId}`, {
    outcomeStatus: resolutionModel.outcomeStatus,
    quality: resolutionModel.quality,
    effectsApplied: deltaSummary,
    queuedFollowUps: visibleFollowUpIds,
    explanationText: state.events.resolvedOutcome.explanationText
  });
}

const EVENT_ASSET_MANIFEST = Object.freeze([
  'assets/events/beneficial_fungi_colonized.png',
  'assets/events/calcium_spotting.png',
  'assets/events/cold_root_zone.png',
  'assets/events/disease.png',
  'assets/events/dry_pocket.png',
  'assets/events/dry_soil.png',
  'assets/events/event-CO2-enrichment-2.png',
  'assets/events/event-co2-enrichment.png',
  'assets/events/event-cold-night.png',
  'assets/events/event-cold-stress.png',
  'assets/events/event-drought-stress.png',
  'assets/events/event-equipment-failure-2.png',
  'assets/events/event-equipment-failure.png',
  'assets/events/event-fungus-infection.png',
  'assets/events/event-fungus-outbreak.png',
  'assets/events/event-harvest-day.png',
  'assets/events/event-harvest-ready.png',
  'assets/events/event-heat-wave-2.png',
  'assets/events/event-heat-wave.png',
  'assets/events/event-light-burn-2.png',
  'assets/events/event-light-burn.png',
  'assets/events/event-light-intensity-spike.png',
  'assets/events/event-nutrient-deficiency.png',
  'assets/events/event-nutrient-lockout-2.png',
  'assets/events/event-nutrient-lockout.png',
  'assets/events/event-overwatering-event.png',
  'assets/events/event-overwatering.png',
  'assets/events/event-perfect-climate-day.png',
  'assets/events/event-perfect-environment-day.png',
  'assets/events/event-perfect-watering-2.png',
  'assets/events/event-perfect-watering.png',
  'assets/events/event-pest-attack-2.png',
  'assets/events/event-pest-attack.png',
  'assets/events/event-pest-invasion.png',
  'assets/events/event-rapid-growth-burst.png',
  'assets/events/event-rapid-growth-surge-2.png',
  'assets/events/event-rapid-growth-surge.png',
  'assets/events/event-research-breakthrough.png',
  'assets/events/event-root-explosion.png',
  'assets/events/event-slow-growth-period.png',
  'assets/events/event-stress-recovery.png',
  'assets/events/event-strong-genetics.png',
  'assets/events/event-unexpected-mold.png',
  'assets/events/event-ventilation-breakdown-2.png',
  'assets/events/event-ventilation-breakdown.png',
  'assets/events/fungal_growth.png',
  'assets/events/fungus_gnat_wave.png',
  'assets/events/heat_wave.png',
  'assets/events/hot_dry_day.png',
  'assets/events/late_flower_humidity.png',
  'assets/events/magnesium_deficit.png',
  'assets/events/mite_hotspot.png',
  'assets/events/nitrogen_lockout.png',
  'assets/events/nutrient_lockout.png',
  'assets/events/pest_attack.png',
  'assets/events/ph_drift.png',
  'assets/events/ph_drift_high.png',
  'assets/events/root_bound_warning.png',
  'assets/events/salt_buildup.png',
  'assets/events/soil_compaction.png',
  'assets/events/soil_life_decline.png',
  'assets/events/soil_too_wet.png',
  'assets/events/thrips_early.png',
  'assets/events/too_wet_soil.png',
  'assets/events/topsoil_mold.png',
  'assets/events/watering_gap.png'
]);

const EVENT_IMAGE_TOKEN_EXPANSIONS = Object.freeze({
  klima: ['climate', 'environment'],
  climate: ['environment'],
  temperatur: ['temp', 'heat', 'cold'],
  temp: ['temperature', 'heat', 'cold'],
  hitze: ['heat', 'hot', 'wave'],
  heat: ['hot', 'wave'],
  hot: ['heat', 'dry'],
  kalt: ['cold', 'night'],
  cold: ['night', 'stress'],
  luftfeuchte: ['humidity', 'humid'],
  humidity: ['humid', 'mold'],
  humid: ['humidity', 'mold'],
  feuchte: ['humidity', 'humid'],
  feucht: ['humidity', 'humid'],
  trocken: ['dry', 'drought'],
  dry: ['drought', 'stress'],
  vpd: ['dry', 'humidity', 'climate'],
  airflow: ['air', 'ventilation'],
  luft: ['airflow', 'ventilation'],
  abluft: ['airflow', 'ventilation'],
  ventilation: ['airflow', 'air'],
  stagnant: ['ventilation', 'airflow', 'breakdown'],
  stagnation: ['ventilation', 'airflow', 'breakdown'],
  schimmel: ['mold', 'fungus', 'fungal'],
  mold: ['fungus', 'fungal'],
  fungus: ['mold', 'fungal'],
  fungal: ['mold', 'fungus'],
  pilz: ['fungus', 'mold'],
  disease: ['fungus', 'mold'],
  risiko: ['risk', 'warning'],
  risk: ['warning'],
  warnung: ['warning', 'risk'],
  warning: ['risk'],
  drift: ['failure', 'spike'],
  driftet: ['drift', 'failure'],
  schwankung: ['spike', 'failure'],
  schwankungen: ['spike', 'failure'],
  fluctuation: ['spike', 'failure'],
  stable: ['perfect', 'recovery'],
  stabil: ['stable', 'perfect', 'recovery'],
  comfort: ['perfect', 'recovery'],
  komfort: ['comfort', 'perfect'],
  ideal: ['perfect', 'climate'],
  perfect: ['ideal', 'climate'],
  bonus: ['perfect', 'growth'],
  wachstum: ['growth', 'surge'],
  growth: ['surge', 'burst'],
  expansion: ['growth', 'burst'],
  veg: ['vegetative'],
  vegetativ: ['vegetative'],
  vegetative: ['veg'],
  flower: ['flowering', 'late', 'humidity'],
  blüte: ['flower', 'flowering'],
  flowering: ['flower', 'late'],
  prevention: ['recovery', 'perfect'],
  recovery: ['stress', 'perfect'],
  stress: ['stress', 'recovery']
});

const EVENT_IMAGE_CATEGORY_FALLBACKS = Object.freeze({
  positive: 'assets/events/event-perfect-environment-day.png',
  environment: 'assets/events/event-slow-growth-period.png',
  disease: 'assets/events/event-unexpected-mold.png',
  pest: 'assets/events/event-pest-attack.png',
  nutrition: 'assets/events/event-nutrient-deficiency.png',
  water: 'assets/events/event-overwatering.png',
  generic: 'assets/events/event-slow-growth-period.png'
});

function tokenizeEventImageValue(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/^assets\/events\//, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalized) {
    return [];
  }
  const baseTokens = normalized.split(/\s+/).filter(Boolean);
  const expanded = [];
  for (const token of baseTokens) {
    expanded.push(token);
    const aliases = EVENT_IMAGE_TOKEN_EXPANSIONS[token];
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        expanded.push(String(alias));
      }
    }
  }
  return Array.from(new Set(expanded));
}

function buildEventImageContextTokens(rawEvent, normalizedEvent) {
  const raw = rawEvent && typeof rawEvent === 'object' ? rawEvent : {};
  const normalized = normalizedEvent && typeof normalizedEvent === 'object' ? normalizedEvent : {};
  const tokens = [
    ...tokenizeEventImageValue(raw.id),
    ...tokenizeEventImageValue(raw.title),
    ...tokenizeEventImageValue(raw.description),
    ...tokenizeEventImageValue(normalized.category || raw.category),
    ...tokenizeEventImageValue(normalized.polarity || raw.polarity)
  ];
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  for (const tag of tags) {
    tokens.push(...tokenizeEventImageValue(tag));
  }
  return Array.from(new Set(tokens));
}

function scoreEventAssetPath(assetPath, contextTokens, normalizedEvent = null, rawEvent = null) {
  const assetTokens = tokenizeEventImageValue(assetPath);
  if (!assetTokens.length || !contextTokens.length) {
    return 0;
  }

  const assetSet = new Set(assetTokens);
  const normalized = normalizedEvent && typeof normalizedEvent === 'object' ? normalizedEvent : {};
  const raw = rawEvent && typeof rawEvent === 'object' ? rawEvent : {};
  const category = String(normalized.category || raw.category || '').toLowerCase();
  const polarity = String(normalized.polarity || raw.polarity || '').toLowerCase();
  let score = 0;
  for (const token of contextTokens) {
    if (assetSet.has(token)) {
      score += 4;
    }
  }

  if (assetSet.has('perfect') && (contextTokens.includes('ideal') || contextTokens.includes('stable') || contextTokens.includes('comfort'))) {
    score += 6;
  }
  if (assetSet.has('heat') && (contextTokens.includes('temp') || contextTokens.includes('heat') || contextTokens.includes('hot'))) {
    score += 6;
  }
  if ((assetSet.has('mold') || assetSet.has('fungus') || assetSet.has('fungal')) && (contextTokens.includes('humidity') || contextTokens.includes('mold') || contextTokens.includes('fungus'))) {
    score += 6;
  }
  if ((assetSet.has('ventilation') || assetSet.has('breakdown')) && (contextTokens.includes('airflow') || contextTokens.includes('ventilation') || contextTokens.includes('stagnant'))) {
    score += 6;
  }
  if ((assetSet.has('dry') || assetSet.has('drought')) && (contextTokens.includes('dry') || contextTokens.includes('vpd') || contextTokens.includes('humidity'))) {
    score += 5;
  }
  if ((assetSet.has('growth') || assetSet.has('surge') || assetSet.has('burst')) && (contextTokens.includes('growth') || contextTokens.includes('bonus') || contextTokens.includes('expansion'))) {
    score += 5;
  }

  if (polarity === 'positive' || category === 'positive') {
    if (assetSet.has('perfect') || assetSet.has('recovery')) {
      score += 6;
    }
    if (assetSet.has('mold') || assetSet.has('fungus') || assetSet.has('fungal') || assetSet.has('disease') || assetSet.has('pest')) {
      score -= 10;
    }
  }

  if (category === 'disease') {
    if ((assetSet.has('mold') || assetSet.has('fungus') || assetSet.has('fungal')) && (contextTokens.includes('humidity') || contextTokens.includes('mold') || contextTokens.includes('fungus'))) {
      score += 10;
    }
    if (assetSet.has('disease')) {
      score += 4;
    }
    if (assetSet.has('perfect') || assetSet.has('growth') || assetSet.has('surge') || assetSet.has('burst')) {
      score -= 6;
    }
  }

  if (category === 'environment') {
    if ((assetSet.has('heat') || assetSet.has('hot') || assetSet.has('dry')) && (contextTokens.includes('temp') || contextTokens.includes('heat') || contextTokens.includes('dry'))) {
      score += 5;
    }
    if ((assetSet.has('ventilation') || assetSet.has('breakdown')) && (contextTokens.includes('airflow') || contextTokens.includes('ventilation') || contextTokens.includes('stagnant'))) {
      score += 4;
    }
  }

  return score;
}

function resolveEventImagePath(rawEvent, normalizedEvent = null) {
  const raw = rawEvent && typeof rawEvent === 'object' ? rawEvent : {};
  const explicitPath = String(raw.imagePath || raw.image || '').trim();
  if (explicitPath) {
    return explicitPath;
  }

  const normalized = normalizedEvent && typeof normalizedEvent === 'object' ? normalizedEvent : {};
  const contextTokens = buildEventImageContextTokens(raw, normalized);
  let bestPath = '';
  let bestScore = -1;

  for (const assetPath of EVENT_ASSET_MANIFEST) {
    const score = scoreEventAssetPath(assetPath, contextTokens, normalized, raw);
    if (score > bestScore) {
      bestScore = score;
      bestPath = assetPath;
    }
  }

  if (bestPath && bestScore >= 4) {
    return bestPath;
  }

  const categoryKey = String(normalized.category || raw.category || 'generic').toLowerCase();
  return EVENT_IMAGE_CATEGORY_FALLBACKS[categoryKey] || EVENT_IMAGE_CATEGORY_FALLBACKS.generic;
}

function resolveFoundationCandidateEvent() {
  const api = getEventFoundationApis();
  if (!api.plantState || !api.flags || !api.memory || !api.resolver) {
    return null;
  }

  const normalizedState = api.plantState.buildNormalizedPlantState(state);
  const activeFlags = api.flags.getActiveFlags(state.events);
  const memoryFacade = {
    getLastDecision: () => api.memory.getLastDecision(state.events),
    getLastEvents: (count) => api.memory.getLastEvents(state.events, count),
    getPendingChain: (chainId) => api.memory.getPendingChain(state.events, chainId),
    getPendingChains: () => api.memory.getPendingChains(state.events),
    getRecentAnalysis: (count) => {
      const analysis = state.events && state.events.foundation && Array.isArray(state.events.foundation.analysis)
        ? state.events.foundation.analysis
        : [];
      const safeCount = Math.max(0, Number(count) || 0);
      return analysis.slice(Math.max(0, analysis.length - safeCount));
    }
  };

  const selectionRandom = () => deterministicUnitFloat(`foundation_resolver:${state.simulation.tickCount}:${state.events.history.length}`);

  return api.resolver.resolveNextEvent({
    state: normalizedState,
    flags: activeFlags,
    memory: memoryFacade,
    catalog: state.events.catalog,
    random: selectionRandom
  });
}

const RESOLVER_DIRECT_INFLUENCE_RATE = 0.12;
const RESOLVER_SHAPED_POOL_INFLUENCE_RATE = 0.10;

function inferEventPoolName(eventDef) {
  if (!eventDef || typeof eventDef !== 'object') {
    return '';
  }
  const explicitPool = String(eventDef.pool || '').trim().toLowerCase();
  if (explicitPool) {
    return explicitPool;
  }
  if (eventDef.isFollowUp === true) {
    return 'recovery';
  }
  const tone = String(eventDef.tone || '').trim().toLowerCase();
  if (tone === 'positive') return 'reward';
  if (tone === 'negative') return 'warning';
  return 'warning';
}

function shouldUseResolverDirectPick(nowMs, eventId) {
  const roll = deterministicUnitFloat(
    `resolver_direct_gate:${Math.floor(nowMs / 1000)}:${state.simulation.tickCount}:${String(eventId || '')}`
  );
  return roll < RESOLVER_DIRECT_INFLUENCE_RATE;
}

function shouldUseResolverShapedPool(nowMs, selectedPool) {
  const roll = deterministicUnitFloat(
    `resolver_shape_gate:${Math.floor(nowMs / 1000)}:${state.simulation.tickCount}:${String(selectedPool || '')}`
  );
  return roll < RESOLVER_SHAPED_POOL_INFLUENCE_RATE;
}

function buildResolverShapedPool(pool, foundationTrace) {
  if (!Array.isArray(pool) || !pool.length) {
    return [];
  }
  const trace = foundationTrace && typeof foundationTrace === 'object' ? foundationTrace : null;
  if (!trace) {
    return [];
  }

  const candidateRows = Array.isArray(trace.afterFrustrationGuard) && trace.afterFrustrationGuard.length
    ? trace.afterFrustrationGuard
    : (Array.isArray(trace.afterRepeatGuard) && trace.afterRepeatGuard.length
      ? trace.afterRepeatGuard
      : (Array.isArray(trace.afterPhaseGuard) ? trace.afterPhaseGuard : []));
  const candidateIds = new Set(candidateRows.map((row) => String(row && row.eventId || '')).filter(Boolean));
  if (!candidateIds.size) {
    return [];
  }

  const fromIds = pool.filter((eventDef) => candidateIds.has(String(eventDef && eventDef.id || '')));
  if (!fromIds.length) {
    return [];
  }

  const selectedPool = String(trace.selectedPool || '').toLowerCase();
  if (!selectedPool) {
    return fromIds;
  }
  const narrowedByPool = fromIds.filter((eventDef) => inferEventPoolName(eventDef) === selectedPool);
  return narrowedByPool.length ? narrowedByPool : fromIds;
}

function resolveFoundationDecisionForPool(pool, nowMs) {
  const api = getEventFoundationApis();
  if (!api.plantState || !api.flags || !api.memory || !api.resolver) {
    return null;
  }

  const normalizedState = api.plantState.buildNormalizedPlantState(state);
  const activeFlags = api.flags.getActiveFlags(state.events);
  const memoryFacade = {
    getLastDecision: () => api.memory.getLastDecision(state.events),
    getLastEvents: (count) => api.memory.getLastEvents(state.events, count),
    getPendingChain: (chainId) => api.memory.getPendingChain(state.events, chainId),
    getPendingChains: () => api.memory.getPendingChains(state.events),
    getRecentAnalysis: (count) => {
      const analysis = state.events && state.events.foundation && Array.isArray(state.events.foundation.analysis)
        ? state.events.foundation.analysis
        : [];
      const safeCount = Math.max(0, Number(count) || 0);
      return analysis.slice(Math.max(0, analysis.length - safeCount));
    }
  };
  const sourceCandidates = Array.isArray(pool)
    ? pool.map((eventDef) => ({
      eventId: String(eventDef && eventDef.id || ''),
      reason: 'eligible_catalog',
      priority: 20,
      isFollowUp: eventDef && eventDef.isFollowUp === true
    })).filter((candidate) => candidate.eventId)
    : [];

  const selectionRandom = () => deterministicUnitFloat(
    `foundation_resolver:${Math.floor(nowMs / 1000)}:${state.simulation.tickCount}:${state.events.history.length}`
  );

  return api.resolver.resolveNextEventWithTrace({
    state: normalizedState,
    flags: activeFlags,
    memory: memoryFacade,
    catalog: state.events.catalog,
    random: selectionRandom,
    sourceCandidates
  });
}

function applyFoundationFollowUps(choice, eventId) {
  const api = getEventFoundationApis();
  if (!api.flags || !api.memory) {
    return;
  }

  let decisionRecord = typeof api.memory.getLastDecision === 'function'
    ? api.memory.getLastDecision(state.events)
    : null;
  if (!decisionRecord || decisionRecord.eventId !== String(eventId) || decisionRecord.optionId !== String(choice.id)) {
    api.memory.addDecision(state.events, eventId, choice.id, {
      followUps: Array.isArray(choice.followUps) ? choice.followUps.slice() : []
    });
    decisionRecord = typeof api.memory.getLastDecision === 'function'
      ? api.memory.getLastDecision(state.events)
      : null;
  } else {
    const existingMeta = decisionRecord.meta && typeof decisionRecord.meta === 'object'
      ? decisionRecord.meta
      : {};
    decisionRecord.meta = {
      ...existingMeta,
      followUps: Array.isArray(choice.followUps) ? choice.followUps.slice() : []
    };
  }

  const followUps = Array.isArray(choice.followUps) ? choice.followUps : [];
  for (const followUp of followUps) {
    const token = String(followUp || '');
    if (token.startsWith('set_flag:')) {
      const flagId = token.slice('set_flag:'.length);
      api.flags.setFlag(state.events, flagId, true);
      if (flagId === 'root_stress_pending') {
        api.memory.setPendingChain(state.events, 'root_stress_followup', {
          targetEventId: 'root_stress_followup',
          sourceEventId: eventId,
          sourceOptionId: choice.id,
          sourceFlagId: 'root_stress_pending',
          createdAtRealTimeMs: Date.now(),
          meta: { createdBy: 'flag_bridge' }
        });
      }
      continue;
    }
    if (token.startsWith('clear_flag:')) {
      const flagId = token.slice('clear_flag:'.length);
      api.flags.clearFlag(state.events, flagId);
      if (flagId === 'root_stress_pending') {
        api.memory.clearPendingChain(state.events, 'root_stress_followup');
      }
      continue;
    }
    if (token.startsWith('set_chain:')) {
      const chainId = token.slice('set_chain:'.length);
      const createdAtRealTimeMs = Date.now();
      const timing = getPendingChainTimingProfile(chainId, null);
      api.memory.setPendingChain(state.events, chainId, {
        targetEventId: chainId,
        sourceEventId: eventId,
        sourceOptionId: choice.id,
        createdAtRealTimeMs,
        activatesAtRealTimeMs: Number(timing.delayMinutes || 0) > 0
          ? createdAtRealTimeMs + (Number(timing.delayMinutes || 0) * 60 * 1000)
          : null,
        expiresAtRealTimeMs: Number(timing.expiryMinutes || 0) > 0
          ? createdAtRealTimeMs + (Number(timing.expiryMinutes || 0) * 60 * 1000)
          : null,
        meta: { createdBy: 'followup_token' }
      });
      continue;
    }
    if (token.startsWith('clear_chain:')) {
      const chainId = token.slice('clear_chain:'.length);
      api.memory.clearPendingChain(state.events, chainId);
    }
  }
}

function getEventTimingContext(nowRealMs) {
  const safeRealNowMs = Number.isFinite(Number(nowRealMs))
    ? Number(nowRealMs)
    : Number(state.simulation && state.simulation.nowMs) || Date.now();
  const safeSimNowMs = Number.isFinite(Number(state.simulation && state.simulation.simTimeMs))
    ? Number(state.simulation.simTimeMs)
    : 0;

  return { nowRealMs: safeRealNowMs, nowSimMs: safeSimNowMs };
}

function projectEventRealDurationToSimMs(realDurationMs, nowRealMs) {
  const safeDurationMs = Math.max(0, Number(realDurationMs) || 0);
  if (safeDurationMs <= 0) {
    return 0;
  }

  if (typeof computeSimulationDeltaMs === 'function') {
    return Math.max(0, Number(computeSimulationDeltaMs(nowRealMs, nowRealMs + safeDurationMs)) || 0);
  }

  const fallbackSpeed = typeof getEffectiveSimulationSpeed === 'function'
    ? Number(getEffectiveSimulationSpeed(nowRealMs))
    : Number(
      state.simulation && (
        state.simulation.effectiveSpeed
        || state.simulation.baseSpeed
        || state.simulation.timeCompression
      )
    ) || 12;
  return safeDurationMs * Math.max(0, fallbackSpeed);
}

function projectEventSimDeadlineToRealMs(targetSimTimeMs, nowRealMs, nowSimMs) {
  const remainingSimMs = Math.max(0, Number(targetSimTimeMs || 0) - Number(nowSimMs || 0));
  if (remainingSimMs <= 0) {
    return nowRealMs;
  }

  if (typeof convertSimDeltaToFutureRealDeltaMs === 'function') {
    return nowRealMs + Math.max(0, Number(convertSimDeltaToFutureRealDeltaMs(remainingSimMs, nowRealMs)) || 0);
  }

  const fallbackSpeed = typeof getEffectiveSimulationSpeed === 'function'
    ? Number(getEffectiveSimulationSpeed(nowRealMs))
    : Number(
      state.simulation && (
        state.simulation.effectiveSpeed
        || state.simulation.baseSpeed
        || state.simulation.timeCompression
      )
    ) || 12;
  return nowRealMs + Math.round(remainingSimMs / Math.max(0.001, fallbackSpeed));
}

function getEventDelayWindowSimRange(nowRealMs) {
  const minSimMs = Math.max(1, projectEventRealDurationToSimMs(EVENT_ROLL_MIN_REAL_MS, nowRealMs));
  const maxSimMs = Math.max(minSimMs, projectEventRealDurationToSimMs(EVENT_ROLL_MAX_REAL_MS, nowRealMs));
  return { minSimMs, maxSimMs };
}

function getEventBucket(anchorSimTimeMs, bucketSizeSimMs) {
  return Math.floor(Number(anchorSimTimeMs || 0) / Math.max(1, Number(bucketSizeSimMs) || 1));
}

function getNextDaytimeSimMs(simTimeMs) {
  if (typeof getNextDayStartSimTime === 'function') {
    return getNextDayStartSimTime(simTimeMs);
  }

  const next = new Date(simTimeMs);
  next.setHours(SIM_DAY_START_HOUR, 0, 0, 0);
  if (next.getTime() <= simTimeMs) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

function normalizeEventTimingState(nowRealMs) {
  const context = getEventTimingContext(nowRealMs);
  const scheduler = state.events && state.events.scheduler && typeof state.events.scheduler === 'object'
    ? state.events.scheduler
    : (state.events.scheduler = {});
  const nowSimMs = context.nowSimMs;

  const toSimDeadline = (legacyRealDeadlineMs, fallbackRealDurationMs) => {
    const safeLegacyDeadlineMs = Number(legacyRealDeadlineMs || 0);
    if (safeLegacyDeadlineMs > context.nowRealMs) {
      return nowSimMs + projectEventRealDurationToSimMs(safeLegacyDeadlineMs - context.nowRealMs, context.nowRealMs);
    }
    return nowSimMs + projectEventRealDurationToSimMs(fallbackRealDurationMs, context.nowRealMs);
  };

  if (!Number.isFinite(Number(scheduler.nextEventSimTimeMs))) {
    scheduler.nextEventSimTimeMs = toSimDeadline(scheduler.nextEventRealTimeMs, EVENT_ROLL_MIN_REAL_MS);
  }
  if (String(state.events.machineState || 'idle') === 'idle') {
    const maxNormalDelayMs = 120 * 60 * 1000;
    const remainingMs = Number(scheduler.nextEventSimTimeMs || 0) - nowSimMs;
    if (remainingMs > maxNormalDelayMs) {
      scheduler.nextEventSimTimeMs = nowSimMs + deterministicEventDelayMs(context.nowRealMs);
    }
  }
  if (!Number.isFinite(Number(scheduler.lastEventSimTimeMs))) {
    scheduler.lastEventSimTimeMs = 0;
  }
  if (!Number.isFinite(Number(state.events.cooldownUntilSimTimeMs))) {
    const legacyCooldownUntilMs = Number(state.events.cooldownUntilMs || 0);
    state.events.cooldownUntilSimTimeMs = legacyCooldownUntilMs > context.nowRealMs
      ? nowSimMs + projectEventRealDurationToSimMs(legacyCooldownUntilMs - context.nowRealMs, context.nowRealMs)
      : 0;
  }
  if (!Number.isFinite(Number(state.events.resolvingUntilSimTimeMs))) {
    const legacyResolvingUntilMs = Number(state.events.resolvingUntilMs || 0);
    state.events.resolvingUntilSimTimeMs = legacyResolvingUntilMs > context.nowRealMs
      ? nowSimMs + projectEventRealDurationToSimMs(legacyResolvingUntilMs - context.nowRealMs, context.nowRealMs)
      : 0;
  }
  if (!scheduler.eventCooldownsSim || typeof scheduler.eventCooldownsSim !== 'object') {
    scheduler.eventCooldownsSim = {};
  }
  if (!scheduler.categoryCooldownsSim || typeof scheduler.categoryCooldownsSim !== 'object') {
    scheduler.categoryCooldownsSim = {};
  }

  const legacyEventCooldowns = scheduler.eventCooldowns && typeof scheduler.eventCooldowns === 'object'
    ? scheduler.eventCooldowns
    : {};
  const legacyCategoryCooldowns = scheduler.categoryCooldowns && typeof scheduler.categoryCooldowns === 'object'
    ? scheduler.categoryCooldowns
    : {};

  if (Object.keys(scheduler.eventCooldownsSim).length === 0 && Object.keys(legacyEventCooldowns).length) {
    for (const [eventId, untilMs] of Object.entries(legacyEventCooldowns)) {
      const safeUntilMs = Number(untilMs || 0);
      if (safeUntilMs > context.nowRealMs) {
        scheduler.eventCooldownsSim[eventId] = nowSimMs + projectEventRealDurationToSimMs(safeUntilMs - context.nowRealMs, context.nowRealMs);
      }
    }
  }
  if (Object.keys(scheduler.categoryCooldownsSim).length === 0 && Object.keys(legacyCategoryCooldowns).length) {
    for (const [categoryId, untilMs] of Object.entries(legacyCategoryCooldowns)) {
      const safeUntilMs = Number(untilMs || 0);
      if (safeUntilMs > context.nowRealMs) {
        scheduler.categoryCooldownsSim[categoryId] = nowSimMs + projectEventRealDurationToSimMs(safeUntilMs - context.nowRealMs, context.nowRealMs);
      }
    }
  }

  for (const [eventId, untilSimMs] of Object.entries(scheduler.eventCooldownsSim)) {
    if (!Number.isFinite(Number(untilSimMs)) || Number(untilSimMs) <= nowSimMs) {
      delete scheduler.eventCooldownsSim[eventId];
    }
  }
  for (const [categoryId, untilSimMs] of Object.entries(scheduler.categoryCooldownsSim)) {
    if (!Number.isFinite(Number(untilSimMs)) || Number(untilSimMs) <= nowSimMs) {
      delete scheduler.categoryCooldownsSim[categoryId];
    }
  }

  scheduler.nextEventRealTimeMs = projectEventSimDeadlineToRealMs(scheduler.nextEventSimTimeMs, context.nowRealMs, nowSimMs);
  scheduler.lastEventRealTimeMs = Number(scheduler.lastEventRealTimeMs || 0);
  state.events.cooldownUntilMs = Number(state.events.cooldownUntilSimTimeMs || 0) > nowSimMs
    ? projectEventSimDeadlineToRealMs(state.events.cooldownUntilSimTimeMs, context.nowRealMs, nowSimMs)
    : 0;
  state.events.resolvingUntilMs = Number(state.events.resolvingUntilSimTimeMs || 0) > nowSimMs
    ? projectEventSimDeadlineToRealMs(state.events.resolvingUntilSimTimeMs, context.nowRealMs, nowSimMs)
    : 0;

  scheduler.eventCooldowns = Object.fromEntries(
    Object.entries(scheduler.eventCooldownsSim)
      .filter(([, untilSimMs]) => Number(untilSimMs) > nowSimMs)
      .map(([eventId, untilSimMs]) => [
        eventId,
        projectEventSimDeadlineToRealMs(untilSimMs, context.nowRealMs, nowSimMs)
      ])
  );
  scheduler.categoryCooldowns = Object.fromEntries(
    Object.entries(scheduler.categoryCooldownsSim)
      .filter(([, untilSimMs]) => Number(untilSimMs) > nowSimMs)
      .map(([categoryId, untilSimMs]) => [
        categoryId,
        projectEventSimDeadlineToRealMs(untilSimMs, context.nowRealMs, nowSimMs)
      ])
  );

  return context;
}

function runEventStateMachine(nowMs, isCatchUp = false) {
  const { nowRealMs, nowSimMs } = normalizeEventTimingState(nowMs);
  const foundationApi = getEventFoundationApis();
  if (foundationApi.memory && typeof foundationApi.memory.pruneExpiredPendingChains === 'function') {
    const expiredChains = foundationApi.memory.pruneExpiredPendingChains(state.events, nowRealMs);
    if (expiredChains && expiredChains.length) {
      recordEventAuditExpiredChains(expiredChains);
    }
  }
  if (state.events.machineState === 'resolving') {
    const resolvingUntilSimTimeMs = Number(state.events.resolvingUntilSimTimeMs || 0);
    if (nowSimMs >= resolvingUntilSimTimeMs) {
      resolvePendingEventOutcome(nowRealMs);
      addLog('system', 'Ereignis-Auswertung abgeschlossen', {
        eventId: state.events.activeEventId,
        chosenOptionId: state.events.lastChoiceId,
        resolvedAtMs: nowRealMs,
        resolvedAtSimTimeMs: nowSimMs
      });
    } else if (nowSimMs >= Number(state.events.scheduler.nextEventSimTimeMs || 0)) {
      scheduleNextEventRoll(nowRealMs, 'resolving_event_pending');
      schedulePushIfAllowed(false);
    }
  }

  if (state.events.machineState === 'resolved' && state.events.pendingResolution) {
    enterEventCooldown(nowRealMs);
  }

  if (state.events.machineState === 'cooldown') {
    if (nowSimMs >= Number(state.events.cooldownUntilSimTimeMs || 0)) {
      state.events.machineState = 'idle';
      addLog('system', 'Abklingzeit beendet, Status wieder inaktiv', null);
    }
    if (nowSimMs >= Number(state.events.scheduler.nextEventSimTimeMs || 0)) {
      scheduleNextEventRoll(nowRealMs, 'cooldown');
      schedulePushIfAllowed(false);
    }
  }

  if (state.events.machineState === 'activeEvent' && nowSimMs >= Number(state.events.scheduler.nextEventSimTimeMs || 0)) {
    scheduleNextEventRoll(nowRealMs, 'active_event_pending');
    schedulePushIfAllowed(false);
  }

  if (state.events.machineState === 'idle' && nowSimMs >= Number(state.events.scheduler.nextEventSimTimeMs || 0)) {
    if (!state.simulation.isDaytime) {
      state.events.scheduler.nextEventSimTimeMs = getNextDaytimeSimMs(nowSimMs);
      normalizeEventTimingState(nowRealMs);
      addLog('event_roll', 'Nachtphase: Ereigniswurf auf Tagesbeginn verschoben', {
        nextEventAtMs: state.events.scheduler.nextEventRealTimeMs,
        nextEventAtSimTimeMs: state.events.scheduler.nextEventSimTimeMs
      });
      schedulePushIfAllowed(false);
      return;
    }

    const roll = deterministicRoll(nowRealMs);
    const threshold = eventThreshold();
    addLog('event_roll', 'Ereignisgrenze erreicht, Wurf wird geprüft', {
      roll,
      threshold,
      simHour: simHour(state.simulation.simTimeMs),
      at: nowRealMs,
      atSimTimeMs: nowSimMs
    });

    if (!shouldTriggerEvent(roll)) {
      addLog('event_roll', 'Ereigniswurf verfehlt, kein Event aktiviert', {
        roll,
        threshold,
        at: nowRealMs,
        atSimTimeMs: nowSimMs
      });
      scheduleNextEventRoll(nowRealMs, 'roll_miss');
      schedulePushIfAllowed(false);
      return;
    }

    const activated = activateEvent(nowRealMs);
    if (activated) {
      state.ui.openSheet = 'event';
      schedulePushIfAllowed(false);
      return;
    }

    addLog('event_roll', 'Ereignisgrenze bleibt aktiv: Kein Ereignis aktivierbar', {
      at: nowRealMs,
      atSimTimeMs: nowSimMs,
      phase: state.plant.phase
    });
    const retryDelayRealMs = 45_000 + Math.floor(
      deterministicUnitFloat(`event_retry:${Math.floor(nowSimMs / 1000)}:${state.simulation.tickCount}`) * 135_000
    );
    state.events.scheduler.nextEventSimTimeMs = nowSimMs + projectEventRealDurationToSimMs(retryDelayRealMs, nowRealMs);
    normalizeEventTimingState(nowRealMs);
    schedulePushIfAllowed(false);
    return;
  }

  if (state.events.machineState === 'activeEvent') {
    state.ui.openSheet = 'event';
  }
}

function activateEvent(nowMs) {
  const { nowRealMs, nowSimMs } = normalizeEventTimingState(nowMs);
  const catalog = state.events.catalog;
  if (!Array.isArray(catalog) || !catalog.length) {
    return false;
  }

  const eligible = eligibleEventsForNow(nowRealMs);
  let pool = eligible;
  if (!pool.length) {
    pool = fallbackEventsForCurrentPhase(nowRealMs);
  }

  if (!pool.length) {
    addLog('event_roll', 'Keine passenden Ereignisse für aktuellen Zustand', {
      simDay: Math.floor(simDayFloat()),
      at: nowMs
    });
    return false;
  }

  const foundationOutcome = resolveFoundationDecisionForPool(pool, nowRealMs);
  const foundationCandidate = foundationOutcome && foundationOutcome.decision
    ? foundationOutcome.decision
    : resolveFoundationCandidateEvent();
  const foundationTrace = foundationOutcome && foundationOutcome.trace ? foundationOutcome.trace : null;
  recordEventAuditResolverTrace(foundationTrace);
  const isHardResolverOverride = Boolean(
    foundationTrace && (foundationTrace.pendingChainOverride === true || foundationTrace.forcedByFlag)
  );
  const directResolverAllowed = isHardResolverOverride || shouldUseResolverDirectPick(
    nowRealMs,
    foundationCandidate && foundationCandidate.eventId
  );
  const forcedEvent = (foundationCandidate && foundationCandidate.eventId && directResolverAllowed)
    ? pool.find((eventDef) => eventDef && eventDef.id === foundationCandidate.eventId)
    : null;
  const allowShapedPool = !isHardResolverOverride && shouldUseResolverShapedPool(
    nowMs,
    foundationTrace && foundationTrace.selectedPool
  );
  const resolverShapedPool = allowShapedPool ? buildResolverShapedPool(pool, foundationTrace) : [];
  const selectionPool = resolverShapedPool.length ? resolverShapedPool : pool;

  const eventDef = forcedEvent || selectEventDeterministically(selectionPool, nowRealMs);
  if (!eventDef) {
    return false;
  }

  const foundationApi = getEventFoundationApis();
  let consumedPendingChain = null;
  if (foundationApi.memory && typeof foundationApi.memory.consumePendingChain === 'function') {
    consumedPendingChain = foundationApi.memory.consumePendingChain(state.events, eventDef.id);
  }
  if (foundationApi.memory && eventDef.id === 'stable_growth_reward' && typeof foundationApi.memory.clearPendingChain === 'function') {
    foundationApi.memory.clearPendingChain(state.events, 'root_stress_followup');
  }

  const options = eventDef.options.slice(0, 3).map((option) => ({
    ...option,
    label: resolveI18nText(option.labelKey, option.label),
    followUp: resolveI18nText(option.followUpKey, option.followUp || '')
  }));

  state.events.machineState = 'activeEvent';
  state.events.activeEventId = eventDef.id;
  state.events.scheduler.lastEventId = eventDef.id;
  state.events.activeEventTitle = resolveI18nText(eventDef.titleKey, eventDef.title);
  state.events.activeEventText = resolveI18nText(eventDef.descriptionKey, eventDef.description);
  state.events.activeLearningNote = eventDef.learningNote || '';
  state.events.activeOptions = options;
  state.events.activeSeverity = eventDef.severity || 3;
  state.events.activeCooldownRealMinutes = clamp(Number(eventDef.cooldownRealMinutes) || 120, 10, 24 * 60);
  state.events.activeResolveTimeMinutes = clamp(
    Number(eventDef.resolveTimeMinutes) || defaultResolveTimeMinutesForEvent(eventDef.category, eventDef.severity, eventDef.tags),
    30,
    120
  );
  state.events.activeCategory = eventDef.category || 'generic';
  state.events.activeTags = Array.isArray(eventDef.tags) ? eventDef.tags.slice(0, 5) : [];
  state.events.activeImagePath = String(eventDef.imagePath || '');
  state.events.scheduler.lastEventRealTimeMs = nowRealMs;
  state.events.scheduler.lastEventSimTimeMs = nowSimMs;

  state.events.scheduler.lastEventId = eventDef.id;
  state.events.scheduler.lastEventRealTimeMs = nowRealMs;
  state.events.scheduler.lastEventSimTimeMs = nowSimMs;
  state.events.scheduler.lastEventCategory = eventDef.category || 'generic';
  state.events.active = {
    id: eventDef.id,
    title: resolveI18nText(eventDef.titleKey, eventDef.title),
    description: resolveI18nText(eventDef.descriptionKey, eventDef.description),
    category: eventDef.category || 'generic',
    learningNote: eventDef.learningNote || ''
  };

  recordEventV1WriteTelemetryHit('W1', {
    source: 'events.js:activate_event',
    eventId: eventDef.id,
    notes: ['legacy_create_path']
  });
  addLog('event_shown', `Ereignis ausgewählt: ${eventDef.id}`, {
    title: eventDef.title,
    severity: state.events.activeSeverity,
    category: eventDef.category || 'generic',
    foundationReason: foundationCandidate && foundationCandidate.eventId === eventDef.id ? foundationCandidate.reason : null,
    consumedPendingChainId: consumedPendingChain ? consumedPendingChain.chainId : null
  });

  if (foundationApi.memory) {
    foundationApi.memory.addEvent(state.events, eventDef.id, {
      phase: state.plant.phase,
      reason: foundationCandidate && foundationCandidate.eventId === eventDef.id ? foundationCandidate.reason : 'default_selection',
      consumedChainId: consumedPendingChain ? consumedPendingChain.chainId : null,
      sourceEventId: consumedPendingChain ? consumedPendingChain.sourceEventId : null,
      sourceOptionId: consumedPendingChain ? consumedPendingChain.sourceOptionId : null
    });
  }
  recordEventAuditActivation(eventDef, {
    atSimTimeMs: nowSimMs,
    simDay: state.simulation.simDay,
    phase: state.plant.phase,
    stage: getAuditStageKey(),
    isFollowUp: Boolean(eventDef.isFollowUp || consumedPendingChain),
    consumedChainId: consumedPendingChain ? consumedPendingChain.chainId : null
  });

  notifyPlantNeedsCare(resolveI18nText('notifications.plant_needs_water', 'Your plant needs care.'));
  return true;
}

function eligibleEventsForNow(nowMs) {
  normalizeEventTimingState(nowMs);
  const cooldowns = state.events.scheduler.eventCooldownsSim || {};
  const nowSimMs = Number(state.simulation.simTimeMs || 0);
  return state.events.catalog
    .filter((eventDef) => isEventEligible(eventDef, cooldowns, nowSimMs))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}


function fallbackEventsForCurrentPhase(nowMs) {
  normalizeEventTimingState(nowMs);
  const phase = String(state.plant.phase || '');
  const nowSimMs = Number(state.simulation.simTimeMs || 0);
  const fallback = state.events.catalog
    .map((eventDef) => {
      if (!eventDef || !eventDef.id || !isEventPhaseAllowed(eventDef)) {
        return null;
      }
      if (!evaluateEventConstraints(eventDef)) {
        return null;
      }
      const cooldowns = state.events.scheduler.eventCooldownsSim || {};
      const blockedUntil = Number(cooldowns[eventDef.id] || 0);
      if (blockedUntil > nowSimMs) {
        return null;
      }

      const signalScore = getEventTriggerSignalScore(eventDef.triggers || {});
      if (signalScore < 0.6) {
        return null;
      }

      return {
        eventDef,
        signalScore
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.signalScore - a.signalScore || String(a.eventDef.id).localeCompare(String(b.eventDef.id)));

  if (fallback.length) {
    addLog('event_roll', 'Fallback-Ereignispool genutzt (weiche Trigger-Naehe)', {
      phase,
      candidateCount: fallback.length,
      topSignalScore: round2(Number(fallback[0].signalScore) || 0),
      at: nowMs,
      atSimTimeMs: nowSimMs
    });
  }

  return fallback.map((entry) => entry.eventDef);
}

function isEventEligible(eventDef, cooldowns, nowMs) {
  if (!eventDef || !eventDef.id) {
    return false;
  }

  if (!isEventPhaseAllowed(eventDef)) {
    return false;
  }

  if (!evaluateEventConstraints(eventDef)) {
    return false;
  }

  const blockedUntil = Number(cooldowns[eventDef.id] || 0);
  if (blockedUntil > nowMs) {
    return false;
  }

  const categoryCooldowns = state.events && state.events.scheduler && state.events.scheduler.categoryCooldownsSim
    ? state.events.scheduler.categoryCooldownsSim
    : {};
  const categoryKey = String(eventDef.category || 'generic');
  const categoryBlockedUntil = Number(categoryCooldowns[categoryKey] || 0);
  if (categoryBlockedUntil > nowMs) {
    return false;
  }

  return evaluateEventTriggers(eventDef.triggers || {});
}

function isEventPhaseAllowed(eventDef) {
  const allowedPhases = Array.isArray(eventDef.allowedPhases)
    ? eventDef.allowedPhases.map((phase) => String(phase))
    : [];

  if (!allowedPhases.length) {
    return true;
  }

  return allowedPhases.includes(String(state.plant.phase || ''));
}

function buildEventConstraintSnapshot() {
  const stageIndexOneBased = clampInt(Number(state.plant.stageIndex || 0) + 1, 1, STAGE_DEFS.length);
  const stageProgress = clamp(Number(state.plant.stageProgress || 0), 0, 1);
  const simDay = Math.max(0, Math.floor(Number(state.simulation.simDay || simDayFloat() || 0)));
  const environment = deriveEnvironmentReadout();
  const roots = deriveRootZoneReadout(environment);
  const airflowScore = Number.isFinite(Number(environment.airflowScore))
    ? clamp(Number(environment.airflowScore), 0, 100)
    : (environment.airflowLabel === 'Good' ? 80 : (environment.airflowLabel === 'Mittel' ? 55 : 30));

  const plantSize = clamp(((stageIndexOneBased - 1) * 8.5) + (stageProgress * 8.5), 0, 100);
  const rootMass = clamp(((stageIndexOneBased - 1) * 8.2) + (stageProgress * 7.8), 0, 100);

  return {
    simDay,
    stageIndexOneBased,
    plantSize,
    rootMass,
    environmentState: {
      temperatureC: environment.temperatureC,
      humidityPercent: environment.humidityPercent,
      vpdKpa: environment.vpdKpa,
      airflowScore,
      instabilityScore: clamp(Number(environment.instabilityScore) || 0, 0, 100)
    },
    rootZone: {
      ph: Number(roots.ph),
      ec: Number(String(roots.ec).replace(/\s*mS$/i, '')),
      oxygenPercent: Number(String(roots.oxygen).replace('%', '')),
      healthPercent: Number(String(roots.rootHealth).replace('%', ''))
    }
  };
}

function evaluateEventConstraints(eventDef) {
  const constraints = eventDef && eventDef.constraints && typeof eventDef.constraints === 'object'
    ? eventDef.constraints
    : null;

  if (!constraints) {
    return true;
  }

  const snapshot = buildEventConstraintSnapshot();

  const minStage = Number(constraints.minStage);
  const maxStage = Number(constraints.maxStage);
  const minDay = Number(constraints.minDay);
  const maxDay = Number(constraints.maxDay);
  const minPlantSize = Number(constraints.minPlantSize);
  const minRootMass = Number(constraints.minRootMass);

  if (constraints.minStage !== null && constraints.minStage !== undefined && Number.isFinite(minStage) && snapshot.stageIndexOneBased < minStage) {
    return false;
  }
  if (constraints.maxStage !== null && constraints.maxStage !== undefined && Number.isFinite(maxStage) && snapshot.stageIndexOneBased > maxStage) {
    return false;
  }
  if (constraints.minDay !== null && constraints.minDay !== undefined && Number.isFinite(minDay) && snapshot.simDay < minDay) {
    return false;
  }
  if (constraints.maxDay !== null && constraints.maxDay !== undefined && Number.isFinite(maxDay) && snapshot.simDay > maxDay) {
    return false;
  }
  if (constraints.minPlantSize !== null && constraints.minPlantSize !== undefined && Number.isFinite(minPlantSize) && snapshot.plantSize < minPlantSize) {
    return false;
  }
  if (constraints.minRootMass !== null && constraints.minRootMass !== undefined && Number.isFinite(minRootMass) && snapshot.rootMass < minRootMass) {
    return false;
  }

  const env = constraints.environmentState && typeof constraints.environmentState === 'object'
    ? constraints.environmentState
    : null;
  if (env) {
    const minTemperatureC = Number(env.minTemperatureC);
    const maxTemperatureC = Number(env.maxTemperatureC);
    const minHumidityPercent = Number(env.minHumidityPercent);
    const maxHumidityPercent = Number(env.maxHumidityPercent);
    const minVpdKpa = Number(env.minVpdKpa);
    const maxVpdKpa = Number(env.maxVpdKpa);
    const minAirflowScore = Number(env.minAirflowScore);
    const minInstabilityScore = Number(env.minInstabilityScore);
    const maxInstabilityScore = Number(env.maxInstabilityScore);

    if (env.minTemperatureC !== null && env.minTemperatureC !== undefined && Number.isFinite(minTemperatureC) && snapshot.environmentState.temperatureC < minTemperatureC) return false;
    if (env.maxTemperatureC !== null && env.maxTemperatureC !== undefined && Number.isFinite(maxTemperatureC) && snapshot.environmentState.temperatureC > maxTemperatureC) return false;
    if (env.minHumidityPercent !== null && env.minHumidityPercent !== undefined && Number.isFinite(minHumidityPercent) && snapshot.environmentState.humidityPercent < minHumidityPercent) return false;
    if (env.maxHumidityPercent !== null && env.maxHumidityPercent !== undefined && Number.isFinite(maxHumidityPercent) && snapshot.environmentState.humidityPercent > maxHumidityPercent) return false;
    if (env.minVpdKpa !== null && env.minVpdKpa !== undefined && Number.isFinite(minVpdKpa) && snapshot.environmentState.vpdKpa < minVpdKpa) return false;
    if (env.maxVpdKpa !== null && env.maxVpdKpa !== undefined && Number.isFinite(maxVpdKpa) && snapshot.environmentState.vpdKpa > maxVpdKpa) return false;
    if (env.minAirflowScore !== null && env.minAirflowScore !== undefined && Number.isFinite(minAirflowScore) && snapshot.environmentState.airflowScore < minAirflowScore) return false;
    if (env.minInstabilityScore !== null && env.minInstabilityScore !== undefined && Number.isFinite(minInstabilityScore) && snapshot.environmentState.instabilityScore < minInstabilityScore) return false;
    if (env.maxInstabilityScore !== null && env.maxInstabilityScore !== undefined && Number.isFinite(maxInstabilityScore) && snapshot.environmentState.instabilityScore > maxInstabilityScore) return false;
  }

  const root = constraints.rootZone && typeof constraints.rootZone === 'object'
    ? constraints.rootZone
    : null;
  if (root) {
    const minPh = Number(root.minPh);
    const maxPh = Number(root.maxPh);
    const minEc = Number(root.minEc);
    const maxEc = Number(root.maxEc);
    const minOxygenPercent = Number(root.minOxygenPercent);

    if (root.minPh !== null && root.minPh !== undefined && Number.isFinite(minPh) && snapshot.rootZone.ph < minPh) return false;
    if (root.maxPh !== null && root.maxPh !== undefined && Number.isFinite(maxPh) && snapshot.rootZone.ph > maxPh) return false;
    if (root.minEc !== null && root.minEc !== undefined && Number.isFinite(minEc) && snapshot.rootZone.ec < minEc) return false;
    if (root.maxEc !== null && root.maxEc !== undefined && Number.isFinite(maxEc) && snapshot.rootZone.ec > maxEc) return false;
    if (root.minOxygenPercent !== null && root.minOxygenPercent !== undefined && Number.isFinite(minOxygenPercent) && snapshot.rootZone.oxygenPercent < minOxygenPercent) return false;
  }

  const category = String(eventDef.category || 'generic').toLowerCase();
  const stressNow = clamp(Number(state.status.stress || 0), 0, 100);
  const riskNow = clamp(Number(state.status.risk || 0), 0, 100);
  const healthNow = clamp(Number(state.status.health || 0), 0, 100);

  if (category === 'positive' && (stressNow > 48 || riskNow > 45 || healthNow < 55)) {
    return false;
  }

  if (snapshot.simDay <= 10 && (category === 'pest' || category === 'disease') && riskNow < 65) {
    return false;
  }

  return true;
}

function evaluateEventTriggers(triggers) {
  const t = triggers && typeof triggers === 'object' ? triggers : {};

  if (t.stage && typeof t.stage === 'object') {
    const stageIndex = state.plant.stageIndex + 1;
    if (Number.isFinite(Number(t.stage.min)) && stageIndex < Number(t.stage.min)) {
      return false;
    }
    if (Number.isFinite(Number(t.stage.max)) && stageIndex > Number(t.stage.max)) {
      return false;
    }
  }

  if (t.setup && typeof t.setup === 'object') {
    if (!evaluateSetupConstraints(t.setup)) {
      return false;
    }
  }

  const all = Array.isArray(t.all) ? t.all : [];
  const any = Array.isArray(t.any) ? t.any : [];

  if (all.length && !all.every(evaluateTriggerCondition)) {
    return false;
  }
  if (any.length && !any.some(evaluateTriggerCondition)) {
    return false;
  }

  return true;
}

function getEventTriggerSignalScore(triggers) {
  const t = triggers && typeof triggers === 'object' ? triggers : {};

  if (t.stage && typeof t.stage === 'object') {
    const stageIndex = state.plant.stageIndex + 1;
    if (Number.isFinite(Number(t.stage.min)) && stageIndex < Number(t.stage.min)) {
      return 0;
    }
    if (Number.isFinite(Number(t.stage.max)) && stageIndex > Number(t.stage.max)) {
      return 0;
    }
  }

  if (t.setup && typeof t.setup === 'object' && !evaluateSetupConstraints(t.setup)) {
    return 0;
  }

  const all = Array.isArray(t.all) ? t.all : [];
  const any = Array.isArray(t.any) ? t.any : [];

  const allScore = all.length
    ? all.filter((condition) => evaluateTriggerCondition(condition)).length / all.length
    : 1;
  const anyScore = any.length
    ? (any.some((condition) => evaluateTriggerCondition(condition)) ? 1 : 0)
    : 1;

  if (any.length && anyScore <= 0) {
    return 0;
  }

  return clamp(any.length ? ((allScore + anyScore) / 2) : allScore, 0, 1);
}

function evaluateSetupConstraints(setupRule) {
  const setup = state.setup || {};
  for (const [key, values] of Object.entries(setupRule)) {
    if (!Array.isArray(values)) {
      continue;
    }
    const prop = key.replace(/In$/, '');
    const current = setup[prop];
    if (!values.map(String).includes(String(current))) {
      return false;
    }
  }
  return true;
}

function evaluateTriggerCondition(condition) {
  if (!condition || typeof condition !== 'object') {
    return false;
  }

  const field = String(condition.field || '').trim();
  const op = String(condition.op || '==').trim();
  const rhs = condition.value;
  const lhs = resolveTriggerField(field);

  if (op === 'in') {
    return Array.isArray(rhs) && rhs.map(String).includes(String(lhs));
  }
  if (op === 'not_in') {
    return Array.isArray(rhs) && !rhs.map(String).includes(String(lhs));
  }

  const leftNum = Number(lhs);
  const rightNum = Number(rhs);
  const numeric = Number.isFinite(leftNum) && Number.isFinite(rightNum);

  if (op === '==') return lhs === rhs || String(lhs) === String(rhs);
  if (op === '!=') return !(lhs === rhs || String(lhs) === String(rhs));
  if (!numeric) return false;
  if (op === '>') return leftNum > rightNum;
  if (op === '>=') return leftNum >= rightNum;
  if (op === '<') return leftNum < rightNum;
  if (op === '<=') return leftNum <= rightNum;
  return false;
}

function resolveTriggerField(fieldPath) {
  if (!fieldPath) {
    return undefined;
  }

  if (fieldPath.startsWith('status.')) {
    return state.status[fieldPath.split('.')[1]];
  }
  if (fieldPath === 'plant.stageIndex') {
    return state.plant.stageIndex + 1;
  }
  if (fieldPath === 'plant.stageKey') {
    return state.plant.stageKey;
  }
  if (fieldPath === 'plant.size') {
    const stageIndex = clampInt(Number(state.plant.stageIndex || 0) + 1, 1, STAGE_DEFS.length);
    const stageProgress = clamp(Number(state.plant.stageProgress || 0), 0, 1);
    return clamp(((stageIndex - 1) * 8.5) + (stageProgress * 8.5), 0, 100);
  }
  if (fieldPath === 'plant.rootMass') {
    const stageIndex = clampInt(Number(state.plant.stageIndex || 0) + 1, 1, STAGE_DEFS.length);
    const stageProgress = clamp(Number(state.plant.stageProgress || 0), 0, 1);
    return clamp(((stageIndex - 1) * 8.2) + (stageProgress * 7.8), 0, 100);
  }
  if (fieldPath.startsWith('setup.')) {
    return (state.setup || {})[fieldPath.split('.')[1]];
  }
  if (fieldPath === 'simulation.isDaytime') {
    return state.simulation.isDaytime;
  }
  if (fieldPath === 'simulation.simDay') {
    return Math.max(0, Math.floor(Number(state.simulation.simDay || simDayFloat() || 0)));
  }

  const environment = deriveEnvironmentReadout();
  if (fieldPath === 'env.temperatureC') return environment.temperatureC;
  if (fieldPath === 'env.humidityPercent') return environment.humidityPercent;
  if (fieldPath === 'env.vpdKpa') return environment.vpdKpa;
  if (fieldPath === 'env.airflowScore') {
    return Number.isFinite(Number(environment.airflowScore))
      ? clamp(Number(environment.airflowScore), 0, 100)
      : (environment.airflowLabel === 'Good' ? 80 : (environment.airflowLabel === 'Mittel' ? 55 : 30));
  }
  if (fieldPath === 'env.instabilityScore') return clamp(Number(environment.instabilityScore) || 0, 0, 100);

  const roots = deriveRootZoneReadout(environment);
  if (fieldPath === 'root.ph') return Number(roots.ph);
  if (fieldPath === 'root.ec') return Number(String(roots.ec).replace(/\s*mS$/i, ''));
  if (fieldPath === 'root.oxygenPercent') return Number(String(roots.oxygen).replace('%', ''));
  if (fieldPath === 'root.healthPercent') return Number(String(roots.rootHealth).replace('%', ''));

  return undefined;
}

function onEventOptionClick(optionId) {
  if (isPlantDead()) {
    return;
  }
  if (state.events.machineState !== 'activeEvent') {
    return;
  }

  const choice = state.events.activeOptions.find((option) => option.id === optionId);
  if (!choice) {
    return;
  }

  return startEventResolution(choice);
}

function applyChoiceEffects(effects) {
  for (const [metric, delta] of Object.entries(effects)) {
    if (!Number.isFinite(delta)) {
      continue;
    }

    if (metric === 'growth') {
      applyGrowthPercentDelta(delta);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(state.status, metric)) {
      state.status[metric] += delta;
    }
  }

  clampStatus();
}

function applyGrowthPercentDelta(delta) {
  const current = computeGrowthPercent();
  const target = clamp(current + delta, 0, 100);
  setGrowthFromPercent(target);
  state.status.growth = round2(computeGrowthPercent());
}

function setGrowthFromPercent(percent) {
  if (state.plant.phase === 'dead') {
    return;
  }

  const targetProgress = clamp(Number(percent) / 100, 0, 1);
  const nowMs = Date.now();
  state.simulation.startRealTimeMs = nowMs - (targetProgress * REAL_RUN_DURATION_MS);

  const plantTime = getPlantTimeFromElapsed(nowMs);
  state.simulation.simTimeMs = plantTime.simTimeMs;
  state.simulation.lastTickRealTimeMs = nowMs;

  const stage = getCurrentStage(plantTime.simDay);
  state.plant.stageIndex = stage.stageIndex;
  state.plant.phase = stage.current.phase;
  state.plant.stageKey = stageAssetKeyForIndex(stage.stageIndex);
  state.plant.lastValidStageKey = state.plant.stageKey;
  state.plant.stageProgress = stage.progressInPhase;
}

function enterEventCooldown(nowMs) {
  const { nowRealMs, nowSimMs } = normalizeEventTimingState(nowMs);
  const activeEventId = state.events.activeEventId;
  const activeCategory = String(state.events.activeCategory || 'generic');
  const perEventCooldownRealMs = Math.round((Number(state.events.activeCooldownRealMinutes) || 120) * 60 * 1000);
  const perEventCooldownSimMs = projectEventRealDurationToSimMs(perEventCooldownRealMs, nowRealMs);

  state.events.machineState = 'cooldown';
  state.events.cooldownUntilSimTimeMs = nowSimMs + cooldownMs(nowRealMs);
  state.events.activeEventId = null;
  state.events.activeEventTitle = '';
  state.events.activeEventText = '';
  state.events.activeOptions = [];
  state.events.activeSeverity = 1;
  state.events.activeCooldownRealMinutes = 120;
  state.events.activeResolveTimeMinutes = 60;
  state.events.activeCategory = 'generic';
  state.events.activeTags = [];
  state.events.activeImagePath = '';
  state.events.pendingResolution = null;

  if (activeEventId) {
    state.events.scheduler.eventCooldownsSim[activeEventId] = nowSimMs + perEventCooldownSimMs;
  }

  const categoryKey = activeCategory;
  const categoryCooldownRealMs = categoryKey === 'positive'
    ? Math.max(EVENT_COOLDOWN_MS, 45 * 60 * 1000)
    : EVENT_COOLDOWN_MS;
  const categoryCooldownSimMs = projectEventRealDurationToSimMs(categoryCooldownRealMs, nowRealMs);
  state.events.scheduler.categoryCooldownsSim[categoryKey] = nowSimMs + categoryCooldownSimMs;
  recordEventV1WriteTelemetryHit('W3', {
    source: 'events.js:enter_cooldown',
    eventId: activeEventId,
    notes: ['legacy_cooldown_write']
  });

  state.events.active = null;
  if (state.ui.openSheet === 'event') {
    state.ui.openSheet = null;
  }

  normalizeEventTimingState(nowRealMs);

  addLog('system', 'Ereignis abgeschlossen, Abklingzeit gestartet', {
    cooldownUntilMs: state.events.cooldownUntilMs,
    cooldownUntilSimTimeMs: state.events.cooldownUntilSimTimeMs,
    eventId: activeEventId,
    perEventCooldownMs: perEventCooldownRealMs,
    perEventCooldownSimMs
  });
}

function deterministicRoll(nowMs = state.simulation.nowMs) {
  const { nowRealMs } = normalizeEventTimingState(nowMs);
  const { minSimMs } = getEventDelayWindowSimRange(nowRealMs);
  const bucket = getEventBucket(state.events.scheduler.nextEventSimTimeMs, minSimMs);
  const riskBucket = Math.round(state.status.risk / 5);
  const pressureBucket = Math.round(computeEnvironmentEventPressure() * 10);
  return deterministicUnitFloat(`roll:${bucket}:${riskBucket}:${pressureBucket}:${state.simulation.tickCount}`);
}

function computeEnvironmentEventPressure() {
  const env = deriveEnvironmentReadout();
  const root = deriveRootZoneReadout(env);

  const tempPressure = clamp(Math.abs(Number(env.temperatureC) - 25) / 10, 0, 1);
  const humidityPressure = clamp(Math.abs(Number(env.humidityPercent) - 58) / 28, 0, 1);
  const vpdPressure = clamp(Math.abs(Number(env.vpdKpa) - 1.15) / 1.0, 0, 1);
  const airflowScore = Number.isFinite(Number(env.airflowScore))
    ? clamp(Number(env.airflowScore), 0, 100)
    : (env.airflowLabel === 'Good' ? 80 : (env.airflowLabel === 'Mittel' ? 55 : 30));
  const airflowPressure = clamp((60 - airflowScore) / 60, 0, 1);

  const ph = Number(root.ph);
  const ec = Number(String(root.ec).replace(/\s*mS$/i, ''));
  const oxygen = Number(String(root.oxygen).replace('%', ''));

  const phPressure = clamp(Math.abs(ph - 6.0) / 0.9, 0, 1);
  const ecPressure = clamp(Math.abs(ec - 1.45) / 1.0, 0, 1);
  const oxygenPressure = clamp((60 - oxygen) / 60, 0, 1);

  return clamp(
    (tempPressure * 0.18)
    + (humidityPressure * 0.14)
    + (vpdPressure * 0.2)
    + (airflowPressure * 0.1)
    + (phPressure * 0.14)
    + (ecPressure * 0.14)
    + (oxygenPressure * 0.1),
    0,
    1
  );
}

function eventThreshold() {
  const base = 0.27;
  const riskInfluence = state.status.risk / 400;
  const envInfluence = computeEnvironmentEventPressure() * 0.12;
  return clamp(base + riskInfluence + envInfluence, 0.12, 0.85);
}

function shouldTriggerEvent(roll) {
  return roll < eventThreshold();
}

function deterministicEventDelayMs(nowMs) {
  const context = getEventTimingContext(nowMs);
  const nowSimMs = Number(context.nowSimMs || 0);
  const riskUnit = clamp((Number(state.status && state.status.risk) || 0) / 100, 0, 1);
  const pressureUnit = clamp(computeEnvironmentEventPressure(), 0, 1);
  const dynamicUnit = clamp((riskUnit * 0.65) + (pressureUnit * 0.35), 0, 1);
  const hourlyBucket = getEventBucket(nowSimMs, 60 * 60 * 1000);
  const variability = deterministicUnitFloat(`delay_slot:${hourlyBucket}:${Math.round(dynamicUnit * 100)}`);

  let minutes = 120;
  if (dynamicUnit >= 0.66) {
    minutes = variability > 0.85 ? 90 : 60;
  } else if (dynamicUnit >= 0.33) {
    if (variability < 0.2) {
      minutes = 60;
    } else if (variability > 0.85) {
      minutes = 120;
    } else {
      minutes = 90;
    }
  } else {
    minutes = variability < 0.2 ? 90 : 120;
  }

  return minutes * 60 * 1000;
}

function cooldownMs(nowMs = state.simulation.nowMs) {
  const { nowRealMs } = normalizeEventTimingState(nowMs);
  return projectEventRealDurationToSimMs(EVENT_COOLDOWN_MS, nowRealMs);
}

function startEventResolution(choice) {
  const eventDef = getCatalogEventById(state.events.activeEventId) || {
    id: state.events.activeEventId,
    title: state.events.activeEventTitle,
    category: state.events.activeCategory || 'generic',
    learningNote: state.events.activeLearningNote || '',
    options: Array.isArray(state.events.activeOptions) ? state.events.activeOptions.slice() : []
  };
  const nowRealMs = Date.now();
  const nowSimMs = Number(state.simulation.simTimeMs || 0);
  const resolveTimeMinutes = clamp(
    Number(eventDef.resolveTimeMinutes || state.events.activeResolveTimeMinutes || defaultResolveTimeMinutesForEvent(eventDef.category, eventDef.severity, eventDef.tags)),
    30,
    120
  );
  const resolveTimeRealMs = resolveTimeMinutes * 60 * 1000;
  const resolveTimeSimMs = projectEventRealDurationToSimMs(resolveTimeRealMs, nowRealMs);
  const triggerSnapshot = {
    simDay: Math.floor(simDayFloat()),
    stageIndex: state.plant.stageIndex + 1,
    water: round2(state.status.water),
    nutrition: round2(state.status.nutrition),
    health: round2(state.status.health),
    stress: round2(state.status.stress),
    risk: round2(state.status.risk),
    growth: round2(state.status.growth),
    setup: {
      mode: state.setup && state.setup.mode ? state.setup.mode : null,
      medium: state.setup && state.setup.medium ? state.setup.medium : null,
      light: state.setup && state.setup.light ? state.setup.light : null
    }
  };

  state.events.lastChoiceId = choice.id;
  state.events.scheduler.lastChoiceId = choice.id;
  state.events.machineState = 'resolving';
  state.events.resolvingUntilSimTimeMs = nowSimMs + resolveTimeSimMs;
  state.events.resolvingUntilMs = projectEventSimDeadlineToRealMs(state.events.resolvingUntilSimTimeMs, nowRealMs, nowSimMs);
  state.events.pendingResolution = {
    eventId: state.events.activeEventId,
    eventTitle: state.events.activeEventTitle,
    eventCategory: state.events.activeCategory || 'generic',
    optionId: choice.id,
    optionLabel: choice.label,
    learningNote: state.events.activeLearningNote || '',
    chosenAtRealTimeMs: nowRealMs,
    chosenAtSimTimeMs: nowSimMs,
    resolveTimeMinutes,
    resolveTimeRealMs,
    resolveAtSimTimeMs: state.events.resolvingUntilSimTimeMs,
    rawChoiceEffects: choice.effects && typeof choice.effects === 'object' ? { ...choice.effects } : {},
    triggerSnapshot
  };
  state.events.pendingOutcome = buildPendingResolutionPreview(eventDef, choice, resolveTimeRealMs);
  state.events.resolvedOutcome = null;
  recordEventV1WriteTelemetryHit('W2', {
    source: 'events.js:resolve_enter_resolving',
    eventId: state.events.activeEventId,
    notes: ['legacy_resolve_start']
  });
  incrementAuditMap(ensureEventAuditState().totals, 'resolvingStarted');
  if (choice && choice.id === '__dismiss__') {
    incrementAuditMap(ensureEventAuditState().totals, 'ignored');
  }

  const foundationApi = getEventFoundationApis();
  if (foundationApi.memory && typeof foundationApi.memory.addDecision === 'function') {
    foundationApi.memory.addDecision(state.events, state.events.activeEventId, choice.id, {
      resolveTimeMinutes,
      resolveAtSimTimeMs: state.events.resolvingUntilSimTimeMs
    });
  }

  addLog('choice', `Option gewählt, Auswertung läuft: ${state.events.activeEventId}/${choice.id}`, {
    resolveTimeMinutes,
    resolveAtSimTimeMs: state.events.resolvingUntilSimTimeMs,
    followUps: choice.followUps || []
  });

  runEventStateMachine(state.simulation.nowMs);
  syncCanonicalStateShape();
  renderAll();
  schedulePersistState(true);
}

function onCareApply() {
  const result = applyAction('watering_medium_deep');
  if (!result.ok) {
    addLog('action', `Aktion blockiert: ${result.reason}`, { actionId: 'watering_medium_deep' });
  }

  closeSheet();
  renderAll();
  schedulePersistState(true);
}

function applyAction(actionId) {
  if (isPlantDead()) {
    const nowMs = Date.now();
    state.actions.lastResult = { ok: false, reason: 'dead_run_ended', actionId, atRealTimeMs: nowMs };
    return { ok: false, reason: 'dead_run_ended' };
  }

  const action = state.actions.byId[actionId];
  if (!action) {
    state.actions.lastResult = { ok: false, reason: `unknown_action:${actionId}`, actionId, atRealTimeMs: Date.now() };
    return { ok: false, reason: `unknown_action:${actionId}` };
  }

  const nowMs = Date.now();
  const cooldownUntil = Number(state.actions.cooldowns[action.id] || 0);
  if (cooldownUntil > nowMs) {
    const result = { ok: false, reason: `cooldown_active:${Math.ceil((cooldownUntil - nowMs) / 1000)}s` };
    state.actions.lastResult = { ok: false, reason: result.reason, actionId: action.id, atRealTimeMs: nowMs };
    return result;
  }

  const triggerCheck = validateActionTrigger(action);
  if (!triggerCheck.ok) {
    state.actions.lastResult = { ok: false, reason: triggerCheck.reason, actionId: action.id, atRealTimeMs: nowMs };
    return triggerCheck;
  }

  const preCheck = validateActionPrerequisites(action);
  if (!preCheck.ok) {
    state.actions.lastResult = { ok: false, reason: preCheck.reason, actionId: action.id, atRealTimeMs: nowMs };
    return preCheck;
  }

  const before = snapshotStatus();

  applyEffectsObject(action.effects.immediate || {});
  scheduleActionOverTimeEffect(action, nowMs);

  const triggeredSideEffects = [];
  for (const side of action.sideEffects) {
    if (!side || typeof side !== 'object') {
      continue;
    }
    const conditionMet = evaluateCondition(side.when || 'true');
    if (!conditionMet) {
      continue;
    }
    const chance = clamp(Number(side.chance), 0, 1);
    const roll = deterministicUnitFloat(`action_side:${action.id}:${side.id || 'side'}:${state.simulation.tickCount}:${Math.floor(state.simulation.simTimeMs / 60000)}`);
    if (roll <= chance) {
      applyEffectsObject(side.deltas || {});
      triggeredSideEffects.push(side.id || 'side_effect');
    }
  }

  const cooldownMs = Math.round((Number(action.cooldownRealMinutes) || 0) * 60 * 1000);
  state.actions.cooldowns[action.id] = nowMs + cooldownMs;

  const after = snapshotStatus();
  const deltaSummary = summarizeDelta(before, after);

  addLog('action', `Aktion: ${action.label}`, {
    type: 'action',
    id: action.id,
    category: action.category,
    intensity: action.intensity,
    label: action.label,
    simTime: state.simulation.simTimeMs,
    realTime: nowMs,
    sideEffects: triggeredSideEffects,
    deltaSummary
  });

  clampStatus();
  updateVisibleOverlays();
  syncCanonicalStateShape();
  state.actions.lastResult = { ok: true, reason: 'ok', actionId: action.id, atRealTimeMs: nowMs };
  schedulePersistState(true);

  return { ok: true, id: action.id, deltaSummary, sideEffects: triggeredSideEffects };
}

function validateActionTrigger(action) {
  const trigger = action.trigger || {};
  if (trigger.timeWindow === 'daytime_only' && !state.simulation.isDaytime) {
    return { ok: false, reason: 'outside_time_window:daytime_only' };
  }

  if (Number.isFinite(trigger.minStageIndex) && state.plant.stageIndex < Number(trigger.minStageIndex)) {
    return { ok: false, reason: `stage_too_low:${state.plant.stageIndex}<${trigger.minStageIndex}` };
  }

  return { ok: true };
}

function validateActionPrerequisites(action) {
  const pre = action.prerequisites || {};
  const min = pre.min && typeof pre.min === 'object' ? pre.min : {};
  const max = pre.max && typeof pre.max === 'object' ? pre.max : {};

  for (const [key, value] of Object.entries(min)) {
    if (!Number.isFinite(Number(value))) {
      continue;
    }
    const current = key in state.status ? state.status[key] : null;
    if (current !== null && current < Number(value)) {
      return { ok: false, reason: `prereq_min_failed:${key}` };
    }
  }

  for (const [key, value] of Object.entries(max)) {
    if (!Number.isFinite(Number(value))) {
      continue;
    }
    const current = key in state.status ? state.status[key] : null;
    if (current !== null && current > Number(value)) {
      return { ok: false, reason: `prereq_max_failed:${key}` };
    }
  }

  return { ok: true };
}

function scheduleActionOverTimeEffect(action, nowMs) {
  const durationMs = Math.round((Number(action.effects.durationSimMinutes) || 0) * 60 * 1000);
  const overTime = action.effects.overTime || {};
  if (durationMs <= 0 || !Object.keys(overTime).length) {
    return;
  }

  state.actions.activeEffects.push({
    id: `${action.id}:${nowMs}:${state.simulation.tickCount}`,
    actionId: action.id,
    remainingSimMs: durationMs,
    rates: overTime
  });
}

function applyActiveActionEffects(elapsedSimMs) {
  if (!Array.isArray(state.actions.activeEffects) || !state.actions.activeEffects.length) {
    return;
  }

  const stillActive = [];
  for (const effect of state.actions.activeEffects) {
    const stepMs = clamp(elapsedSimMs, 0, effect.remainingSimMs);
    if (stepMs > 0) {
      applyOverTimeRates(effect.rates || {}, stepMs);
      effect.remainingSimMs -= stepMs;
    }
    if (effect.remainingSimMs > 0) {
      stillActive.push(effect);
    }
  }

  state.actions.activeEffects = stillActive;
  clampStatus();
}

function applyOverTimeRates(rates, elapsedSimMs) {
  const simHours = elapsedSimMs / (60 * 60 * 1000);
  for (const [key, perHour] of Object.entries(rates || {})) {
    const delta = Number(perHour) * simHours;
    if (!Number.isFinite(delta)) {
      continue;
    }

    if (key === 'growthPerHour') {
      applyGrowthPercentDelta(delta);
      continue;
    }

    const metric = key.replace(/PerHour$/, '');
    if (Object.prototype.hasOwnProperty.call(state.status, metric)) {
      state.status[metric] += delta;
    }
  }
}

function applyEffectsObject(effects) {
  for (const [metric, deltaRaw] of Object.entries(effects || {})) {
    const delta = Number(deltaRaw);
    if (!Number.isFinite(delta)) {
      continue;
    }

    if (metric === 'growth') {
      applyGrowthPercentDelta(delta);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(state.status, metric)) {
      state.status[metric] += delta;
    }
  }

  clampStatus();
}

function evaluateCondition(conditionExpr) {
  const expr = String(conditionExpr || 'true').trim();
  if (!expr || expr.toLowerCase() === 'true') {
    return true;
  }

  const orParts = expr.split(/\s+OR\s+/i);
  for (const part of orParts) {
    const andParts = part.split(/\s+AND\s+/i);
    const andResult = andParts.every((token) => evaluateAtomicCondition(token.trim()));
    if (andResult) {
      return true;
    }
  }
  return false;
}

function evaluateAtomicCondition(token) {
  const m = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) {
    return false;
  }

  const key = m[1];
  const op = m[2];
  const rhs = Number(m[3]);
  const lhs = key in state.status ? Number(state.status[key]) : NaN;
  if (!Number.isFinite(lhs) || !Number.isFinite(rhs)) {
    return false;
  }

  if (op === '>=') return lhs >= rhs;
  if (op === '<=') return lhs <= rhs;
  if (op === '==') return lhs === rhs;
  if (op === '>') return lhs > rhs;
  if (op === '<') return lhs < rhs;
  return false;
}

function snapshotStatus() {
  return {
    water: state.status.water,
    nutrition: state.status.nutrition,
    health: state.status.health,
    stress: state.status.stress,
    risk: state.status.risk,
    growth: state.status.growth
  };
}

function summarizeDelta(before, after) {
  const out = {};
  for (const key of Object.keys(before)) {
    out[key] = round2((after[key] || 0) - (before[key] || 0));
  }
  return out;
}

function normalizeAction(rawAction) {
  if (!rawAction || typeof rawAction !== 'object' || !rawAction.id) {
    return null;
  }

  const base = {
    id: String(rawAction.id),
    category: String(rawAction.category || 'generic'),
    intensity: String(rawAction.intensity || 'medium'),
    label: String(rawAction.label || rawAction.id),
    trigger: rawAction.trigger && typeof rawAction.trigger === 'object' ? rawAction.trigger : {},
    prerequisites: rawAction.prerequisites && typeof rawAction.prerequisites === 'object' ? rawAction.prerequisites : {},
    effects: rawAction.effects && typeof rawAction.effects === 'object' ? rawAction.effects : {},
    cooldownRealMinutes: clamp(rawAction.cooldownRealMinutes, 0, 24 * 60),
    sideEffects: Array.isArray(rawAction.sideEffects) ? rawAction.sideEffects : []
  };

  base.effects.immediate = base.effects.immediate && typeof base.effects.immediate === 'object' ? base.effects.immediate : {};
  base.effects.overTime = base.effects.overTime && typeof base.effects.overTime === 'object' ? base.effects.overTime : {};
  base.effects.durationSimMinutes = clamp(base.effects.durationSimMinutes, 0, 24 * 60);

  return base;
}

function normalizeEvent(rawEvent, sourceVersion = 'v1') {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return null;
  }
  if (!rawEvent.id || (!rawEvent.title && !rawEvent.titleKey) || (!rawEvent.description && !rawEvent.descriptionKey)) {
    return null;
  }

  const rawOptions = Array.isArray(rawEvent.options)
    ? rawEvent.options
    : (Array.isArray(rawEvent.choices) ? rawEvent.choices : []);

  const options = rawOptions
    .slice(0, 3)
    .map((option) => ({
      id: String(option.id || ''),
      label: String(option.label || 'Option'),
      labelKey: typeof option.labelKey === 'string' ? String(option.labelKey) : '',
      effects: option.effects && typeof option.effects === 'object' ? option.effects : {},
      sideEffects: Array.isArray(option.sideEffects) ? option.sideEffects : [],
      followUps: Array.isArray(option.followUps)
        ? option.followUps.map(String)
        : (option.followUp ? [String(option.followUp)] : []),
      followUp: typeof option.followUp === 'string' ? String(option.followUp) : '',
      followUpKey: typeof option.followUpKey === 'string' ? String(option.followUpKey) : '',
      uiCopy: option.uiCopy && typeof option.uiCopy === 'object' ? option.uiCopy : {},
      intent: typeof option.intent === 'string' ? String(option.intent) : '',
      contextFit: normalizeStringList(option.contextFit)
    }))
    .filter((option) => Boolean(option.id));

  if (!options.length) {
    return null;
  }

  const category = String(rawEvent.category || inferCategoryFromTags(rawEvent.tags || []));

  return {
    id: String(rawEvent.id),
    category,
    title: String(rawEvent.title || ''),
    titleKey: typeof rawEvent.titleKey === 'string' ? String(rawEvent.titleKey) : '',
    description: String(rawEvent.description || ''),
    descriptionKey: typeof rawEvent.descriptionKey === 'string' ? String(rawEvent.descriptionKey) : '',
    triggers: rawEvent.triggers && typeof rawEvent.triggers === 'object' ? rawEvent.triggers : {},
    constraints: inferEventConstraints(rawEvent, category),
    allowedPhases: Array.isArray(rawEvent.allowedPhases)
      ? rawEvent.allowedPhases.map((phase) => String(phase)).filter(Boolean)
      : normalizeStringList(rawEvent.phases),
    weight: Math.max(0.01, Number(rawEvent.weight) || normalizeSeverity(rawEvent.severity) || 1),
    cooldownRealMinutes: clamp(Number(rawEvent.cooldownRealMinutes) || 120, 10, 24 * 60),
    resolveTimeMinutes: clamp(Number(rawEvent.resolveTimeMinutes) || defaultResolveTimeMinutesForEvent(category, rawEvent.severity, rawEvent.tags), 30, 120),
    learningNote: String(rawEvent.learningNote || ''),
    severity: normalizeSeverity(rawEvent.severity),
    polarity: inferEventPolarity(rawEvent, category),
    environment: inferEnvironmentScope(rawEvent),
    tags: Array.isArray(rawEvent.tags) ? rawEvent.tags.map(String) : [],
    tone: typeof rawEvent.tone === 'string' ? String(rawEvent.tone) : '',
    pool: typeof rawEvent.pool === 'string' ? String(rawEvent.pool) : '',
    isFollowUp: rawEvent.isFollowUp === true,
    imagePath: typeof rawEvent.imagePath === 'string' ? String(rawEvent.imagePath) : '',
    warningText: typeof rawEvent.warningText === 'string' ? String(rawEvent.warningText) : '',
    shadowModel: sanitizePlainObject(rawEvent.shadowModel),
    outcomeTexts: normalizeOutcomeTexts(rawEvent.outcomeTexts),
    followUpRules: normalizeFollowUpRules(rawEvent.followUpRules),
    options,
    sourceVersion
  };
}


function inferEventConstraints(rawEvent, category) {
  const raw = rawEvent && rawEvent.constraints && typeof rawEvent.constraints === 'object'
    ? rawEvent.constraints
    : {};

  const stageRule = rawEvent && rawEvent.triggers && rawEvent.triggers.stage && typeof rawEvent.triggers.stage === 'object'
    ? rawEvent.triggers.stage
    : {};

  const hasUserConstraints = Object.keys(raw).length > 0;
  const minStageFromTrigger = Number.isFinite(Number(stageRule.min)) ? Number(stageRule.min) : null;

  const defaultsByCategory = {
    water: { minDay: 2, minPlantSize: 10, minRootMass: 10 },
    nutrition: { minDay: 4, minPlantSize: 16, minRootMass: 18 },
    pest: { minDay: 6, minPlantSize: 20, minRootMass: 18 },
    disease: { minDay: 7, minPlantSize: 22, minRootMass: 20 },
    environment: { minDay: 3, minPlantSize: 12, minRootMass: 12 },
    positive: {
      minDay: 3,
      minPlantSize: 10,
      minRootMass: 10,
      environmentState: { minTemperatureC: 20, maxTemperatureC: 31, minHumidityPercent: 44, maxHumidityPercent: 72, minVpdKpa: 0.6, maxVpdKpa: 1.45, minAirflowScore: 45 },
      rootZone: { minPh: 5.6, maxPh: 6.4, minEc: 0.9, maxEc: 1.9, minOxygenPercent: 50 }
    },
    generic: { minDay: 3, minPlantSize: 10, minRootMass: 10 }
  };

  const base = defaultsByCategory[String(category || 'generic')] || defaultsByCategory.generic;
  const merged = {
    minStage: minStageFromTrigger,
    minDay: Number.isFinite(Number(raw.minDay)) ? Number(raw.minDay) : base.minDay,
    minPlantSize: Number.isFinite(Number(raw.minPlantSize)) ? Number(raw.minPlantSize) : base.minPlantSize,
    minRootMass: Number.isFinite(Number(raw.minRootMass)) ? Number(raw.minRootMass) : base.minRootMass,
    maxStage: Number.isFinite(Number(raw.maxStage)) ? Number(raw.maxStage) : null,
    maxDay: Number.isFinite(Number(raw.maxDay)) ? Number(raw.maxDay) : null,
    environmentState: raw.environmentState && typeof raw.environmentState === 'object'
      ? { ...(base.environmentState || {}), ...raw.environmentState }
      : (base.environmentState || null),
    rootZone: raw.rootZone && typeof raw.rootZone === 'object'
      ? { ...(base.rootZone || {}), ...raw.rootZone }
      : (base.rootZone || null)
  };

  if (!hasUserConstraints && !Number.isFinite(Number(merged.minStage))) {
    merged.minStage = base.minPlantSize >= 20 ? 3 : 2;
  }

  return merged;
}

function inferCategoryFromTags(tags) {
  const t = Array.isArray(tags) ? tags.map((x) => String(x).toLowerCase()) : [];
  if (t.some((x) => x.includes('water') || x.includes('soil'))) return 'water';
  if (t.some((x) => x.includes('nutri') || x.includes('n'))) return 'nutrition';
  if (t.some((x) => x.includes('pest'))) return 'pest';
  if (t.some((x) => x.includes('mold') || x.includes('disease'))) return 'disease';
  if (t.some((x) => x.includes('train'))) return 'training';
  if (t.some((x) => x.includes('env') || x.includes('heat') || x.includes('cold') || x.includes('weather'))) return 'environment';
  if (t.some((x) => x.includes('positive') || x.includes('recovery') || x.includes('ideal'))) return 'positive';
  return 'generic';
}

function inferEventPolarity(rawEvent, category) {
  const explicit = String((rawEvent && rawEvent.polarity) || '').trim().toLowerCase();
  if (explicit === 'positive' || explicit === 'negative' || explicit === 'neutral') {
    return explicit;
  }

  if (String(category) === 'positive') {
    return 'positive';
  }

  const tags = Array.isArray(rawEvent && rawEvent.tags)
    ? rawEvent.tags.map((x) => String(x).toLowerCase())
    : [];

  if (tags.some((x) => x.includes('positive') || x.includes('ideal') || x.includes('recovery') || x.includes('bonus'))) {
    return 'positive';
  }

  return 'negative';
}

function inferEnvironmentScope(rawEvent) {
  const setup = rawEvent && rawEvent.triggers && rawEvent.triggers.setup && typeof rawEvent.triggers.setup === 'object'
    ? rawEvent.triggers.setup
    : {};
  const modeIn = Array.isArray(setup.modeIn) ? setup.modeIn.map((x) => String(x).toLowerCase()) : [];
  if (!modeIn.length) {
    return 'both';
  }

  const hasIndoor = modeIn.includes('indoor');
  const hasOutdoor = modeIn.includes('outdoor') || modeIn.includes('greenhouse');

  if (hasIndoor && hasOutdoor) return 'both';
  if (hasIndoor) return 'indoor';
  if (hasOutdoor) return 'outdoor';
  return 'both';
}

function syncActiveEventFromCatalog() {
  if (state.events.machineState !== 'activeEvent' || !state.events.activeEventId) {
    return;
  }

  const eventDef = state.events.catalog.find((eventItem) => eventItem.id === state.events.activeEventId);
  if (!eventDef) {
    return;
  }

  state.events.activeEventTitle = resolveI18nText(eventDef.titleKey, eventDef.title);
  state.events.activeEventText = resolveI18nText(eventDef.descriptionKey, eventDef.description);
  state.events.activeLearningNote = eventDef.learningNote || '';
  state.events.activeSeverity = eventDef.severity;
  state.events.activeCooldownRealMinutes = eventDef.cooldownRealMinutes || 120;
  state.events.activeResolveTimeMinutes = eventDef.resolveTimeMinutes || defaultResolveTimeMinutesForEvent(eventDef.category, eventDef.severity, eventDef.tags);
  state.events.activeCategory = eventDef.category || 'generic';
  state.events.activeTags = Array.isArray(eventDef.tags) ? eventDef.tags.slice(0, 5) : [];
  state.events.activeImagePath = String(eventDef.imagePath || '');

  const byOptionId = new Map(eventDef.options.map((option) => [option.id, option]));
  const currentIds = Array.isArray(state.events.activeOptions)
    ? state.events.activeOptions.map((option) => option.id)
    : [];

  const localizedOptions = [];
  for (const optionId of currentIds) {
    const localizedOption = byOptionId.get(optionId);
    if (localizedOption) {
      localizedOptions.push({
        id: localizedOption.id,
        label: resolveI18nText(localizedOption.labelKey, localizedOption.label),
        effects: { ...(localizedOption.effects || {}) },
        sideEffects: Array.isArray(localizedOption.sideEffects) ? localizedOption.sideEffects : [],
        followUps: Array.isArray(localizedOption.followUps) ? localizedOption.followUps : [],
        followUp: resolveI18nText(localizedOption.followUpKey, localizedOption.followUp || ''),
        intent: typeof localizedOption.intent === 'string' ? localizedOption.intent : '',
        contextFit: Array.isArray(localizedOption.contextFit) ? localizedOption.contextFit.slice() : []
      });
    }
  }

  if (!localizedOptions.length) {
    for (const option of eventDef.options.slice(0, 3)) {
      localizedOptions.push({
        id: option.id,
        label: resolveI18nText(option.labelKey, option.label),
        effects: { ...(option.effects || {}) },
        sideEffects: Array.isArray(option.sideEffects) ? option.sideEffects : [],
        followUps: Array.isArray(option.followUps) ? option.followUps : [],
        followUp: resolveI18nText(option.followUpKey, option.followUp || ''),
        intent: typeof option.intent === 'string' ? option.intent : '',
        contextFit: Array.isArray(option.contextFit) ? option.contextFit.slice() : []
      });
    }
  }

  state.events.activeOptions = localizedOptions.slice(0, 3);
}

function normalizeSeverity(rawSeverity) {
  if (Number.isFinite(rawSeverity)) {
    return clampInt(rawSeverity, 1, 5);
  }

  if (typeof rawSeverity === 'string') {
    const lowered = rawSeverity.trim().toLowerCase();
    if (lowered === 'low') {
      return 2;
    }
    if (lowered === 'medium') {
      return 3;
    }
    if (lowered === 'high') {
      return 4;
    }
    const asNumber = Number(lowered);
    if (Number.isFinite(asNumber)) {
      return clampInt(asNumber, 1, 5);
    }
  }

  return 3;
}

function computeEventDynamicWeight(item) {
  const base = Math.max(0.01, Number(item.weight) || 1);
  const risk = Number(state.status.risk) || 0;
  const stress = Number(state.status.stress) || 0;
  const health = Number(state.status.health) || 0;
  const simDay = Math.max(0, Math.floor(Number(state.simulation.simDay || simDayFloat() || 0)));
  const envPressure = computeEnvironmentEventPressure();

  const recent = state.events.history.slice(-6);
  const recentByCategory = recent.reduce((acc, entry) => {
    const key = String(entry && entry.category || 'generic').toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  let factor = 1;
  const category = String(item && item.category || 'generic').toLowerCase();
  const severeCategory = category === 'pest' || category === 'disease';

  if (category === 'positive') {
    const negativeRecent = recent
      .filter((entry) => String(entry && entry.category || '').toLowerCase() !== 'positive')
      .length;
    const positiveRecent = recent.filter((entry) => String(entry && entry.category || '').toLowerCase() === 'positive').length;
    const stableWindow = stress <= 34 && risk <= 34 && health >= 70;

    factor += negativeRecent >= 1 ? 0.45 : 0;
    factor += health < 60 ? 0.35 : 0;
    factor -= positiveRecent >= 3 ? 0.55 : 0;

    // Frequency smoothing: keep positives present in stable runs, but avoid reward spam.
    if (stableWindow && positiveRecent === 0) {
      factor *= 1.35;
    }
    if (stableWindow && positiveRecent === 1) {
      factor *= 1.15;
    }
    if (positiveRecent >= 3) {
      factor *= 0.75;
    }
  } else {
    factor += risk >= 60 ? 0.15 : 0;
    factor += stress >= 55 ? 0.1 : 0;
  }

  // Midgame anti-spam: reduce harsh event density unless risk/stress justify it.
  if (simDay >= 15 && simDay <= 40) {
    if (severeCategory && risk < 70 && stress < 62) {
      factor *= 0.72;
    }
    if (category === 'environment' && stress < 50 && risk < 50) {
      factor *= 0.84;
    }
  }

  // Soft anti-repeat per category to avoid "everything at once" feeling.
  const sameCategoryRecent = Number(recentByCategory[category] || 0);
  if (sameCategoryRecent >= 2) {
    factor *= 0.78;
  }
  if (sameCategoryRecent >= 3) {
    factor *= 0.7;
  }

  if (category === 'environment') {
    factor *= 0.86 + (envPressure * 0.42);
  }

  if (category === 'pest' || category === 'disease') {
    factor *= 0.8 + (envPressure * 0.5);
  }

  if (category === 'nutrition') {
    factor *= 0.88 + (envPressure * 0.28);
  }

  if (category === 'positive') {
    factor *= 1.25 - (envPressure * 0.15);
  }

  if (category === 'disease' && risk < 40) {
    factor *= 0.85;
  }

  return Math.max(0.01, round2(base * factor));
}

function selectEventDeterministically(catalog, nowMs) {
  if (!Array.isArray(catalog) || !catalog.length) {
    return null;
  }

  let candidates = catalog.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const lastCategory = state.events.scheduler.lastEventCategory || null;
  const lastEventId = state.events.scheduler.lastEventId || null;

  if (lastCategory) {
    const alt = candidates.filter((item) => item.category !== lastCategory);
    if (alt.length) {
      candidates = alt;
    }
  }

  if (lastEventId) {
    const noDirectRepeat = candidates.filter((item) => item.id !== lastEventId);
    if (noDirectRepeat.length) {
      candidates = noDirectRepeat;
    }
  }

  const weighted = candidates.map((item) => ({
    item,
    weight: computeEventDynamicWeight(item)
  }));

  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0);
  if (totalWeight <= 0) {
    return candidates[0];
  }

  const { nowRealMs } = normalizeEventTimingState(nowMs);
  const simDay = Math.floor(simDayFloat());
  const signature = candidates.map((item) => item.id).join('|');
  const { minSimMs } = getEventDelayWindowSimRange(nowRealMs);
  const bucket = getEventBucket(
    Number(state.events.scheduler.nextEventSimTimeMs || state.simulation.simTimeMs),
    minSimMs
  );
  const purpose = `event_pick:${simDay}:${bucket}:${signature}`;
  const u = deterministicUnitFloat(purpose);
  let cursor = u * totalWeight;

  for (const row of weighted) {
    cursor -= row.weight;
    if (cursor <= 0) {
      addLog('event_pick', 'Deterministische Eventauswahl', {
        seed: state.seed,
        plantId: state.plantId,
        simDay,
        purpose,
        pickedId: row.item.id,
        pickedCategory: row.item.category,
        pickedPolarity: row.item.polarity || 'negative',
        pickedEnvironment: row.item.environment || 'both',
        eligibleCount: candidates.length
      });
      return row.item;
    }
  }

  return weighted[weighted.length - 1].item;
}

function scheduleNextEventRoll(nowMs, reason) {
  const { nowRealMs, nowSimMs } = normalizeEventTimingState(nowMs);
  let nextAtSimMs = nowSimMs + deterministicEventDelayMs(nowRealMs);
  if (!state.simulation.isDaytime) {
    nextAtSimMs = getNextDaytimeSimMs(nowSimMs);
  }
  state.events.scheduler.nextEventSimTimeMs = nextAtSimMs;
  normalizeEventTimingState(nowRealMs);

  addLog('event_roll', 'Nächster Ereigniswurf geplant', {
    reason,
    nextEventAtMs: state.events.scheduler.nextEventRealTimeMs,
    nextEventAtSimTimeMs: nextAtSimMs,
    simDaytime: state.simulation.isDaytime
  });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.info('[sw-update] service worker unsupported');
    return;
  }

  console.info('[sw-update] register start');

  let updateBanner = document.getElementById('swUpdateBanner');
  let shouldReloadOnControllerChange = false;
  let controllerChangeBound = false;
  let updateIntervalId = null;
  const hadControllerAtRegister = Boolean(navigator.serviceWorker.controller);

  function canShowPrompt() {
    return hadControllerAtRegister || Boolean(navigator.serviceWorker.controller);
  }

  function removeUpdateBanner() {
    if (updateBanner && updateBanner.parentNode) {
      updateBanner.parentNode.removeChild(updateBanner);
    }
    updateBanner = null;
  }

  function requestActivation(registration) {
    if (!registration || !registration.waiting) {
      console.info('[sw-update] skip waiting requested but no waiting worker');
      return;
    }
    console.info('[sw-update] skip waiting requested');
    shouldReloadOnControllerChange = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  function ensureUpdateBanner(registration, reason) {
    if (!registration || !registration.waiting) {
      return;
    }

    if (!canShowPrompt()) {
      console.info('[sw-update] waiting detected but no controlling client yet', {
        reason: reason || 'unknown'
      });
      return;
    }

    if (updateBanner && updateBanner.parentNode) {
      console.info('[sw-update] banner already shown', {
        reason: reason || 'unknown'
      });
      return;
    }

    const banner = document.createElement('aside');
    banner.id = 'swUpdateBanner';
    banner.className = 'sw-update-banner';
    banner.innerHTML = [
      '<p class="sw-update-banner__text">Neue Version verfuegbar.</p>',
      '<div class="sw-update-banner__actions">',
      '<button type="button" class="sw-update-banner__btn sw-update-banner__btn--primary" data-sw-action="reload">Jetzt aktualisieren</button>',
      '<button type="button" class="sw-update-banner__btn sw-update-banner__btn--secondary" data-sw-action="dismiss">Spaeter</button>',
      '</div>'
    ].join('');

    banner.addEventListener('click', (event) => {
      const action = event.target && event.target.getAttribute ? event.target.getAttribute('data-sw-action') : null;
      if (action === 'reload') {
        requestActivation(registration);
        return;
      }
      if (action === 'dismiss') {
        removeUpdateBanner();
      }
    });

    document.body.appendChild(banner);
    updateBanner = banner;
    console.info('[sw-update] banner shown', {
      reason: reason || 'unknown'
    });
  }

  function checkWaiting(registration, reason) {
    if (!registration) {
      return false;
    }

    if (registration.waiting) {
      console.info('[sw-update] waiting detected', {
        reason: reason || 'unknown'
      });
      ensureUpdateBanner(registration, reason);
      return true;
    }

    console.info('[sw-update] no waiting worker', {
      reason: reason || 'unknown'
    });
    return false;
  }

  function bindControllerChangeHandler() {
    if (controllerChangeBound) {
      return;
    }
    controllerChangeBound = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.info('[sw-update] controllerchange');
      if (!shouldReloadOnControllerChange) {
        return;
      }
      shouldReloadOnControllerChange = false;
      window.location.reload();
    });
  }

  function scheduleUpdateChecks(registration) {
    if (!registration || updateIntervalId) {
      return;
    }

    updateIntervalId = window.setInterval(() => {
      console.info('[sw-update] interval update()');
      registration.update().catch(() => {
        console.warn('[sw-update] interval update() failed');
      }).finally(() => {
        checkWaiting(registration, 'interval');
      });
    }, 5 * 60 * 1000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.info('[sw-update] visibility update()');
        registration.update().catch(() => {
          console.warn('[sw-update] visibility update() failed');
        }).finally(() => {
          checkWaiting(registration, 'visibility');
        });
      }
    });
  }

  try {
    const buildId = (window.GrowSimBuild && window.GrowSimBuild.id)
      ? String(window.GrowSimBuild.id)
      : 'dev';
    const swUrl = `./sw.js?v=${encodeURIComponent(buildId)}`;
    console.info('[sw-update] register url', swUrl);

    const registration = await navigator.serviceWorker.register(swUrl, {
      updateViaCache: 'none'
    });
    console.info('[sw-update] register done', {
      hasController: Boolean(navigator.serviceWorker.controller),
      hadControllerAtRegister
    });

    navigator.serviceWorker.ready
      .then((readyRegistration) => {
        console.info('[sw-update] ready');
        checkWaiting(readyRegistration || registration, 'ready');
      })
      .catch((error) => {
        console.warn('[sw-update] ready failed', error);
      });

    if (!navigator.serviceWorker.controller) {
      showServiceWorkerHint();
    }

    bindControllerChangeHandler();
    scheduleUpdateChecks(registration);
    checkWaiting(registration, 'register');

    registration.update().catch(() => {
      console.warn('[sw-update] initial update() failed');
    }).finally(() => {
      checkWaiting(registration, 'initial-update');
    });

    registration.addEventListener('updatefound', () => {
      console.info('[sw-update] updatefound');
      const installing = registration.installing;
      if (!installing) {
        console.info('[sw-update] updatefound without installing worker');
        return;
      }
      checkWaiting(registration, 'updatefound');
      installing.addEventListener('statechange', () => {
        console.info('[sw-update] installing state', installing.state);
        if (installing.state === 'installed') {
          checkWaiting(registration, 'installed-state');
          window.setTimeout(() => {
            checkWaiting(registration, 'installed-state-delayed');
          }, 150);
        }
      });
    });
  } catch (error) {
    console.error('[sw-update] register failed', error);
    // SW registration failures should not block app usage.
  }
}

  window.GrowSimEvents = Object.freeze({
    runEventStateMachine,
    activateEvent,
    eligibleEventsForNow,
    isEventEligible,
  evaluateEventTriggers,
  evaluateSetupConstraints,
  evaluateTriggerCondition,
  resolveTriggerField,
  onEventOptionClick,
  enterEventCooldown,
  deterministicRoll,
  eventThreshold,
  shouldTriggerEvent,
  deterministicEventDelayMs,
  cooldownMs,
    computeEventDynamicWeight,
    selectEventDeterministically,
    scheduleNextEventRoll,
    getEventAuditSnapshot: () => buildEventAuditSnapshot(state.events),
    buildEventAuditDerivedMetrics,
    buildEventAuditInterpretation,
    classifyEventRunDensity,
    classifyEventRunBalance,
    classifyFollowUpPressure,
    classifyGuardPressure,
    getEventAuditInterpretation: (snapshot) => buildEventAuditInterpretation(snapshot && typeof snapshot === 'object' ? snapshot : buildEventAuditSnapshot(state.events)),
    registerServiceWorker,
    resolveFoundationCandidateEvent
  });

window.__gsGetEventAuditSnapshot = () => buildEventAuditSnapshot(state.events);

if (window.GrowSimEventEngine && typeof window.GrowSimEventEngine.registerLegacyRuntime === 'function') {
  window.GrowSimEventEngine.registerLegacyRuntime(window.GrowSimEvents);
}

window.GrowSimEventAssets = Object.freeze({
  resolveEventImagePath,
  manifest: EVENT_ASSET_MANIFEST.slice()
});
