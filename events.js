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

function runEventStateMachine(nowMs) {
  if (state.events.machineState === 'resolved') {
    enterEventCooldown(nowMs);
  }

  if (state.events.machineState === 'cooldown') {
    if (nowMs >= state.events.cooldownUntilMs) {
      state.events.machineState = 'idle';
      addLog('system', 'Abklingzeit beendet, Status wieder inaktiv', null);
    }
    if (nowMs >= state.events.scheduler.nextEventRealTimeMs) {
      scheduleNextEventRoll(nowMs, 'cooldown');
      schedulePushIfAllowed(false);
    }
  }

  if (state.events.machineState === 'activeEvent' && nowMs >= state.events.scheduler.nextEventRealTimeMs) {
    scheduleNextEventRoll(nowMs, 'active_event_pending');
    schedulePushIfAllowed(false);
  }

  if (state.events.machineState === 'idle' && nowMs >= state.events.scheduler.nextEventRealTimeMs) {
    if (!state.simulation.isDaytime) {
      state.events.scheduler.nextEventRealTimeMs = nextDaytimeRealMs(nowMs, state.simulation.simTimeMs);
      addLog('event_roll', 'Nachtphase: Ereigniswurf auf Tagesbeginn verschoben', {
        nextEventAtMs: state.events.scheduler.nextEventRealTimeMs
      });
      schedulePushIfAllowed(false);
      return;
    }

    const roll = deterministicRoll();
    const threshold = eventThreshold();
    addLog('event_roll', 'Ereignisgrenze erreicht, Wurf wird geprüft', {
      roll,
      threshold,
      simHour: simHour(state.simulation.simTimeMs),
      at: nowMs
    });

    if (!shouldTriggerEvent(roll)) {
      addLog('event_roll', 'Ereigniswurf verfehlt, kein Event aktiviert', {
        roll,
        threshold,
        at: nowMs
      });
      scheduleNextEventRoll(nowMs, 'roll_miss');
      schedulePushIfAllowed(false);
      return;
    }

    const activated = activateEvent(nowMs);
    if (activated) {
      state.ui.openSheet = 'event';
      schedulePushIfAllowed(false);
      return;
    }

    addLog('event_roll', 'Ereignisgrenze bleibt aktiv: Kein Ereignis aktivierbar', {
      at: nowMs,
      phase: state.plant.phase
    });
    const retryDelayMs = 20_000 + Math.floor(
      deterministicUnitFloat(`event_retry:${Math.floor(nowMs / 1000)}:${state.simulation.tickCount}`) * 70_000
    );
    state.events.scheduler.nextEventRealTimeMs = nowMs + retryDelayMs;
    schedulePushIfAllowed(false);
    return;
  }

  if (state.events.machineState === 'activeEvent') {
    state.ui.openSheet = 'event';
  }
}

function activateEvent(nowMs) {
  const catalog = state.events.catalog;
  if (!Array.isArray(catalog) || !catalog.length) {
    return false;
  }

  const eligible = eligibleEventsForNow(nowMs);
  let pool = eligible;
  if (!pool.length) {
    pool = fallbackEventsForCurrentPhase(nowMs);
  }

  if (!pool.length) {
    addLog('event_roll', 'Keine passenden Ereignisse für aktuellen Zustand', {
      simDay: Math.floor(simDayFloat()),
      at: nowMs
    });
    return false;
  }

  const foundationOutcome = resolveFoundationDecisionForPool(pool, nowMs);
  const foundationCandidate = foundationOutcome && foundationOutcome.decision
    ? foundationOutcome.decision
    : resolveFoundationCandidateEvent();
  const foundationTrace = foundationOutcome && foundationOutcome.trace ? foundationOutcome.trace : null;
  const isHardResolverOverride = Boolean(
    foundationTrace && (foundationTrace.pendingChainOverride === true || foundationTrace.forcedByFlag)
  );
  const directResolverAllowed = isHardResolverOverride || shouldUseResolverDirectPick(
    nowMs,
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

  const eventDef = forcedEvent || selectEventDeterministically(selectionPool, nowMs);
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
  state.events.scheduler.lastEventRealTimeMs = nowMs;

  state.events.scheduler.lastEventId = eventDef.id;
  state.events.scheduler.lastEventRealTimeMs = nowMs;
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
  const cooldowns = state.events.scheduler.eventCooldowns || {};
  return state.events.catalog
    .filter((eventDef) => isEventEligible(eventDef, cooldowns, nowMs))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}


function fallbackEventsForCurrentPhase(nowMs) {
  const phase = String(state.plant.phase || '');
  const fallback = state.events.catalog.filter((eventDef) => {
    if (!eventDef || !eventDef.id || !isEventPhaseAllowed(eventDef)) {
      return false;
    }
    if (!evaluateEventConstraints(eventDef)) {
      return false;
    }
    const cooldowns = state.events.scheduler.eventCooldowns || {};
    const blockedUntil = Number(cooldowns[eventDef.id] || 0);
    return blockedUntil <= nowMs;
  });

  if (fallback.length) {
    addLog('event_roll', 'Fallback-Ereignispool genutzt (Phase-only)', {
      phase,
      candidateCount: fallback.length,
      at: nowMs
    });
  }

  return fallback.sort((a, b) => String(a.id).localeCompare(String(b.id)));
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

  const categoryCooldowns = state.events && state.events.scheduler && state.events.scheduler.categoryCooldowns
    ? state.events.scheduler.categoryCooldowns
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
  const airflowScore = environment.airflowLabel === 'Good' ? 80 : (environment.airflowLabel === 'Mittel' ? 55 : 30);

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
      airflowScore
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

    if (env.minTemperatureC !== null && env.minTemperatureC !== undefined && Number.isFinite(minTemperatureC) && snapshot.environmentState.temperatureC < minTemperatureC) return false;
    if (env.maxTemperatureC !== null && env.maxTemperatureC !== undefined && Number.isFinite(maxTemperatureC) && snapshot.environmentState.temperatureC > maxTemperatureC) return false;
    if (env.minHumidityPercent !== null && env.minHumidityPercent !== undefined && Number.isFinite(minHumidityPercent) && snapshot.environmentState.humidityPercent < minHumidityPercent) return false;
    if (env.maxHumidityPercent !== null && env.maxHumidityPercent !== undefined && Number.isFinite(maxHumidityPercent) && snapshot.environmentState.humidityPercent > maxHumidityPercent) return false;
    if (env.minVpdKpa !== null && env.minVpdKpa !== undefined && Number.isFinite(minVpdKpa) && snapshot.environmentState.vpdKpa < minVpdKpa) return false;
    if (env.maxVpdKpa !== null && env.maxVpdKpa !== undefined && Number.isFinite(maxVpdKpa) && snapshot.environmentState.vpdKpa > maxVpdKpa) return false;
    if (env.minAirflowScore !== null && env.minAirflowScore !== undefined && Number.isFinite(minAirflowScore) && snapshot.environmentState.airflowScore < minAirflowScore) return false;
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
  if (fieldPath === 'env.airflowScore') return environment.airflowLabel === 'Good' ? 80 : (environment.airflowLabel === 'Mittel' ? 55 : 30);

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
  const activeEventId = state.events.activeEventId;
  const activeCategory = String(state.events.activeCategory || 'generic');
  const perEventCooldownMs = Math.round((Number(state.events.activeCooldownRealMinutes) || 120) * 60 * 1000);

  state.events.machineState = 'cooldown';
  state.events.cooldownUntilMs = nowMs + cooldownMs();
  state.events.activeEventId = null;
  state.events.activeEventTitle = '';
  state.events.activeEventText = '';
  state.events.activeOptions = [];
  state.events.activeSeverity = 1;
  state.events.activeCooldownRealMinutes = 120;
  state.events.activeCategory = 'generic';
  state.events.activeTags = [];

  if (activeEventId) {
    state.events.scheduler.eventCooldowns[activeEventId] = nowMs + perEventCooldownMs;
  }

  const categoryKey = activeCategory;
  const categoryCooldownMs = categoryKey === 'positive'
    ? Math.max(EVENT_COOLDOWN_MS, 45 * 60 * 1000)
    : EVENT_COOLDOWN_MS;
  state.events.scheduler.categoryCooldowns[categoryKey] = nowMs + categoryCooldownMs;

  state.events.active = null;
  if (state.ui.openSheet === 'event') {
    state.ui.openSheet = null;
  }

  addLog('system', 'Ereignis abgeschlossen, Abklingzeit gestartet', {
    cooldownUntilMs: state.events.cooldownUntilMs,
    eventId: activeEventId,
    perEventCooldownMs
  });
}

function deterministicRoll() {
  const bucket = Math.floor(state.events.scheduler.nextEventRealTimeMs / EVENT_ROLL_MIN_REAL_MS);
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
  const airflowScore = env.airflowLabel === 'Good' ? 80 : (env.airflowLabel === 'Mittel' ? 55 : 30);
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
  const base = 0.34;
  const riskInfluence = state.status.risk / 340;
  const envInfluence = computeEnvironmentEventPressure() * 0.18;
  return clamp(base + riskInfluence + envInfluence, 0.15, 0.88);
}

function shouldTriggerEvent(roll) {
  return roll < eventThreshold();
}

function deterministicEventDelayMs(nowMs) {
  const min = EVENT_ROLL_MIN_REAL_MS;
  const max = EVENT_ROLL_MAX_REAL_MS;
  const span = Math.max(0, max - min);
  const bucket = Math.floor(nowMs / min);
  const u = deterministicUnitFloat(`delay:${bucket}`);
  return min + Math.floor(u * span);
}

function cooldownMs() {
  return EVENT_COOLDOWN_MS;
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
    const positiveRecent = recent.length - negativeRecent;
    const stableWindow = stress <= 34 && risk <= 34 && health >= 70;

    factor += negativeRecent >= 2 ? 0.35 : 0;
    factor += health < 55 ? 0.2 : 0;
    factor -= positiveRecent >= 2 ? 0.45 : 0;

    // Frequency smoothing: keep positives present in stable runs, but avoid reward spam.
    if (stableWindow && positiveRecent === 0) {
      factor *= 1.18;
    }
    if (stableWindow && positiveRecent === 1) {
      factor *= 1.06;
    }
    if (positiveRecent >= 2) {
      factor *= 0.82;
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
    factor *= 1.06 - (envPressure * 0.22);
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

  const simDay = Math.floor(simDayFloat());
  const signature = candidates.map((item) => item.id).join('|');
  const purpose = `event_pick:${simDay}:${Math.floor(nowMs / EVENT_ROLL_MIN_REAL_MS)}:${signature}`;
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
  let nextAt = nowMs + deterministicEventDelayMs(nowMs);
  if (!state.simulation.isDaytime) {
    nextAt = nextDaytimeRealMs(nowMs, state.simulation.simTimeMs);
  }
  state.events.scheduler.nextEventRealTimeMs = nextAt;

  addLog('event_roll', 'Nächster Ereigniswurf geplant', {
    reason,
    nextEventAtMs: nextAt,
    simDaytime: state.simulation.isDaytime
  });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    if (!navigator.serviceWorker.controller) {
      showServiceWorkerHint();
    }

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) {
        return;
      }
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!window.__gsSwControllerRefreshed) {
        window.__gsSwControllerRefreshed = true;
        window.location.reload();
      }
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
