'use strict';

function getEventFoundationApis() {
  return {
    plantState: (typeof window !== 'undefined' && window.GrowSimPlantState) ? window.GrowSimPlantState : null,
    flags: (typeof window !== 'undefined' && window.GrowSimEventFlags) ? window.GrowSimEventFlags : null,
    memory: (typeof window !== 'undefined' && window.GrowSimEventMemory) ? window.GrowSimEventMemory : null,
    analysis: (typeof window !== 'undefined' && window.GrowSimEventAnalysis) ? window.GrowSimEventAnalysis : null,
    resolver: (typeof window !== 'undefined' && window.GrowSimEventResolver) ? window.GrowSimEventResolver : null
  };
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

  api.memory.addDecision(state.events, eventId, choice.id, {
    followUps: Array.isArray(choice.followUps) ? choice.followUps.slice() : []
  });

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
      api.memory.setPendingChain(state.events, chainId, {
        targetEventId: chainId,
        sourceEventId: eventId,
        sourceOptionId: choice.id,
        createdAtRealTimeMs: Date.now(),
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
  if (state.events.machineState === 'resolving') {
    const resolvingUntilSimTimeMs = Number(state.events.resolvingUntilSimTimeMs || 0);
    if (nowSimMs >= resolvingUntilSimTimeMs) {
      state.events.machineState = 'resolved';
      if (!state.events.resolvedOutcome && state.events.pendingOutcome && typeof state.events.pendingOutcome === 'object') {
        state.events.resolvedOutcome = { ...state.events.pendingOutcome };
      }
      state.events.pendingOutcome = null;
      addLog('system', 'Ereignisausgang aus Legacy-Status übernommen', {
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

  if (state.events.machineState === 'resolved') {
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
    const retryDelayRealMs = 20_000 + Math.floor(
      deterministicUnitFloat(`event_retry:${Math.floor(nowSimMs / 1000)}:${state.simulation.tickCount}`) * 70_000
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

  const options = eventDef.options.slice(0, 3);

  state.events.machineState = 'activeEvent';
  state.events.activeEventId = eventDef.id;
  state.events.scheduler.lastEventId = eventDef.id;
  state.events.activeEventTitle = eventDef.title;
  state.events.activeEventText = eventDef.description;
  state.events.activeLearningNote = eventDef.learningNote || '';
  state.events.activeOptions = options;
  state.events.activeSeverity = eventDef.severity || 3;
  state.events.activeCooldownRealMinutes = clamp(Number(eventDef.cooldownRealMinutes) || 120, 10, 24 * 60);
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
    title: eventDef.title,
    description: eventDef.description,
    category: eventDef.category || 'generic',
    learningNote: eventDef.learningNote || ''
  };

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

  notifyPlantNeedsCare('Deine Pflanze braucht Pflege.');
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

  const before = snapshotStatus();
  applyChoiceEffects(choice.effects || {});

  const triggeredSideEffects = [];
  for (const side of Array.isArray(choice.sideEffects) ? choice.sideEffects : []) {
    if (!evaluateCondition(side.when || 'true')) {
      continue;
    }
    const chance = clamp(Number(side.chance), 0, 1);
    const roll = deterministicUnitFloat(`event_side:${state.events.activeEventId}:${choice.id}:${side.id || 'side'}:${state.simulation.tickCount}`);
    if (roll <= chance) {
      applyChoiceEffects(side.effects || {});
      triggeredSideEffects.push(side.id || 'side');
    }
  }

  const after = snapshotStatus();
  const deltaSummary = summarizeDelta(before, after);

  state.events.lastChoiceId = choice.id;
  state.events.scheduler.lastChoiceId = choice.id;
  state.events.machineState = 'resolved';

  applyFoundationFollowUps(choice, state.events.activeEventId);

  const foundationApi = getEventFoundationApis();
  const recentFoundationEvent = foundationApi.memory
    ? foundationApi.memory.getLastEvents(state.events, 1)[0]
    : null;
  const relatedChainId = recentFoundationEvent && recentFoundationEvent.meta
    ? (recentFoundationEvent.meta.consumedChainId || null)
    : null;

  let analysisEntry = null;
  if (foundationApi.analysis && foundationApi.plantState && foundationApi.flags) {
    analysisEntry = foundationApi.analysis.generateAndStoreAnalysis(state.events, {
      eventId: state.events.activeEventId,
      optionId: choice.id,
      atRealTimeMs: Date.now(),
      atSimTimeMs: state.simulation.simTimeMs,
      tick: state.simulation.tickCount,
      relatedFlags: foundationApi.flags.getActiveFlags(state.events),
      normalizedState: foundationApi.plantState.buildNormalizedPlantState(state),
      relatedChainId
    });
  }

  if (analysisEntry && foundationApi.memory) {
    const lastDecision = foundationApi.memory.getLastDecision(state.events);
    if (lastDecision && lastDecision.eventId === String(state.events.activeEventId) && lastDecision.optionId === String(choice.id)) {
      lastDecision.analysisId = analysisEntry.analysisId;
      lastDecision.analysisTone = analysisEntry.tone;
    }
  }

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

  const historyEntry = {
    type: 'event',
    eventId: state.events.activeEventId,
    category: state.events.activeCategory || 'generic',
    optionId: choice.id,
    optionLabel: choice.label,
    learningNote: state.events.activeLearningNote || '',
    triggerSnapshot,
    effectsApplied: deltaSummary,
    sideEffectsTriggered: triggeredSideEffects,
    analysis: analysisEntry,
    atSimTimeMs: state.simulation.simTimeMs,
    atRealTimeMs: Date.now()
  };

  state.history.events.push(historyEntry);
  state.events.history.push(historyEntry);

  addLog('choice', `Option gewählt: ${state.events.activeEventId}/${choice.id}`, {
    effects: choice.effects || {},
    sideEffects: triggeredSideEffects,
    effectsApplied: deltaSummary,
    followUps: choice.followUps || [],
    outcomeAnalysis: analysisEntry
      ? {
        tone: analysisEntry.tone,
        actionText: analysisEntry.actionText,
        causeText: analysisEntry.causeText,
        resultText: analysisEntry.resultText,
        guidanceText: analysisEntry.guidanceText
      }
      : null
  });

  runEventStateMachine(state.simulation.nowMs);
  syncCanonicalStateShape();
  renderAll();
  schedulePersistState(true);
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
  state.events.activeCategory = 'generic';
  state.events.activeTags = [];
  state.events.activeImagePath = '';

  if (activeEventId) {
    state.events.scheduler.eventCooldownsSim[activeEventId] = nowSimMs + perEventCooldownSimMs;
  }

  const categoryKey = activeCategory;
  const categoryCooldownRealMs = categoryKey === 'positive'
    ? Math.max(EVENT_COOLDOWN_MS, 45 * 60 * 1000)
    : EVENT_COOLDOWN_MS;
  const categoryCooldownSimMs = projectEventRealDurationToSimMs(categoryCooldownRealMs, nowRealMs);
  state.events.scheduler.categoryCooldownsSim[categoryKey] = nowSimMs + categoryCooldownSimMs;

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
  const base = 0.28;
  const riskInfluence = state.status.risk / 400;
  const envInfluence = computeEnvironmentEventPressure() * 0.15;
  return clamp(base + riskInfluence + envInfluence, 0.12, 0.85);
}

function shouldTriggerEvent(roll) {
  return roll < eventThreshold();
}

function deterministicEventDelayMs(nowMs) {
  const { nowRealMs, nowSimMs } = normalizeEventTimingState(nowMs);
  const { minSimMs, maxSimMs } = getEventDelayWindowSimRange(nowRealMs);
  const span = Math.max(0, maxSimMs - minSimMs);
  const bucket = getEventBucket(nowSimMs, minSimMs);
  const u = deterministicUnitFloat(`delay:${bucket}`);
  return minSimMs + Math.floor(u * span);
}

function cooldownMs(nowMs = state.simulation.nowMs) {
  const { nowRealMs } = normalizeEventTimingState(nowMs);
  return projectEventRealDurationToSimMs(EVENT_COOLDOWN_MS, nowRealMs);
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
  if (!rawEvent.id || !rawEvent.title || !rawEvent.description) {
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
      effects: option.effects && typeof option.effects === 'object' ? option.effects : {},
      sideEffects: Array.isArray(option.sideEffects) ? option.sideEffects : [],
      followUps: Array.isArray(option.followUps)
        ? option.followUps.map(String)
        : (option.followUp ? [String(option.followUp)] : []),
      uiCopy: option.uiCopy && typeof option.uiCopy === 'object' ? option.uiCopy : {}
    }))
    .filter((option) => Boolean(option.id));

  if (!options.length) {
    return null;
  }

  const category = String(rawEvent.category || inferCategoryFromTags(rawEvent.tags || []));

  return {
    id: String(rawEvent.id),
    category,
    title: String(rawEvent.title),
    description: String(rawEvent.description),
    triggers: rawEvent.triggers && typeof rawEvent.triggers === 'object' ? rawEvent.triggers : {},
    constraints: inferEventConstraints(rawEvent, category),
    allowedPhases: Array.isArray(rawEvent.allowedPhases)
      ? rawEvent.allowedPhases.map((phase) => String(phase)).filter(Boolean)
      : [],
    weight: Math.max(0.01, Number(rawEvent.weight) || normalizeSeverity(rawEvent.severity) || 1),
    cooldownRealMinutes: clamp(Number(rawEvent.cooldownRealMinutes) || 120, 10, 24 * 60),
    learningNote: String(rawEvent.learningNote || ''),
    severity: normalizeSeverity(rawEvent.severity),
    polarity: inferEventPolarity(rawEvent, category),
    environment: inferEnvironmentScope(rawEvent),
    tags: Array.isArray(rawEvent.tags) ? rawEvent.tags.map(String) : [],
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

  state.events.activeEventTitle = eventDef.title;
  state.events.activeEventText = eventDef.description;
  state.events.activeLearningNote = eventDef.learningNote || '';
  state.events.activeSeverity = eventDef.severity;
  state.events.activeCooldownRealMinutes = eventDef.cooldownRealMinutes || 120;
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
        label: localizedOption.label,
        effects: { ...(localizedOption.effects || {}) },
        sideEffects: Array.isArray(localizedOption.sideEffects) ? localizedOption.sideEffects : [],
        followUps: Array.isArray(localizedOption.followUps) ? localizedOption.followUps : []
      });
    }
  }

  if (!localizedOptions.length) {
    for (const option of eventDef.options.slice(0, 3)) {
      localizedOptions.push({
        id: option.id,
        label: option.label,
        effects: { ...(option.effects || {}) },
        sideEffects: Array.isArray(option.sideEffects) ? option.sideEffects : [],
        followUps: Array.isArray(option.followUps) ? option.followUps : []
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
    return;
  }

  let updateBanner = document.getElementById('swUpdateBanner');
  let shouldReloadOnControllerChange = false;
  let controllerChangeBound = false;
  let updateIntervalId = null;

  function removeUpdateBanner() {
    if (updateBanner && updateBanner.parentNode) {
      updateBanner.parentNode.removeChild(updateBanner);
    }
    updateBanner = null;
  }

  function requestActivation(registration) {
    if (!registration || !registration.waiting) {
      return;
    }
    shouldReloadOnControllerChange = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  function ensureUpdateBanner(registration) {
    if (!registration || !registration.waiting || !navigator.serviceWorker.controller) {
      return;
    }

    if (updateBanner && updateBanner.parentNode) {
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
  }

  function bindControllerChangeHandler() {
    if (controllerChangeBound) {
      return;
    }
    controllerChangeBound = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
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
      registration.update().catch(() => {
        // non-fatal
      });
    }, 5 * 60 * 1000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {
          // non-fatal
        });
      }
    });
  }

  try {
    const buildId = (window.GrowSimBuild && window.GrowSimBuild.id)
      ? String(window.GrowSimBuild.id)
      : 'dev';
    const swUrl = `./sw.js?v=${encodeURIComponent(buildId)}`;

    const registration = await navigator.serviceWorker.register(swUrl, {
      updateViaCache: 'none'
    });
    if (!navigator.serviceWorker.controller) {
      showServiceWorkerHint();
    }

    bindControllerChangeHandler();
    scheduleUpdateChecks(registration);
    registration.update().catch(() => {
      // non-fatal
    });

    if (registration.waiting) {
      ensureUpdateBanner(registration);
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) {
        return;
      }
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && registration.waiting && navigator.serviceWorker.controller) {
          ensureUpdateBanner(registration);
        }
      });
    });
  } catch (_error) {
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
  registerServiceWorker,
  resolveFoundationCandidateEvent
});

window.GrowSimEventAssets = Object.freeze({
  resolveEventImagePath,
  manifest: EVENT_ASSET_MANIFEST.slice()
});
