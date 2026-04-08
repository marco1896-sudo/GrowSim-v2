'use strict';

(function initEventPersistenceAdapter(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;

  const SHADOW_RUNTIME_VERSION = 1;
  const TRACKED_EVENT_STALE_HOURS = 18;
  const RECENT_RESOLUTION_WINDOW_HOURS = 24;
  const CHAIN_CONTEXT_WINDOW_HOURS = 12;
  const STABLE_WINDOW_STALE_HOURS = 18;

  function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function round2(value) {
    if (shared && typeof shared.round2 === 'function') {
      return shared.round2(value);
    }
    return Math.round((toFiniteNumber(value, 0)) * 100) / 100;
  }

  function clonePlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...value }
      : {};
  }

  function buildContractSnapshot(eventsState) {
    const events = eventsState && typeof eventsState === 'object' ? eventsState : {};
    return {
      version: 'legacy-compatible-v1',
      machineState: String(events.machineState || 'idle'),
      scheduler: events.scheduler && typeof events.scheduler === 'object' ? { ...events.scheduler } : {},
      activeEventId: typeof events.activeEventId === 'string' ? events.activeEventId : null,
      activeEventTitle: String(events.activeEventTitle || ''),
      activeEventText: String(events.activeEventText || ''),
      activeLearningNote: String(events.activeLearningNote || ''),
      activeOptions: Array.isArray(events.activeOptions) ? events.activeOptions.slice() : [],
      activeSeverity: Number(events.activeSeverity || 0),
      activeCooldownRealMinutes: Number(events.activeCooldownRealMinutes || 0),
      activeCategory: String(events.activeCategory || 'generic'),
      activeTags: Array.isArray(events.activeTags) ? events.activeTags.slice() : [],
      activeImagePath: String(events.activeImagePath || ''),
      warnings: Array.isArray(events.warnings) ? events.warnings.slice() : [],
      latentPressures: events.latentPressures && typeof events.latentPressures === 'object' ? { ...events.latentPressures } : {},
      chains: events.chains && typeof events.chains === 'object' ? { ...events.chains } : null,
      history: Array.isArray(events.history) ? events.history.slice() : [],
      foundation: events.foundation && typeof events.foundation === 'object' ? { ...events.foundation } : {}
    };
  }

  function getCurrentSimTimeMs(snapshot) {
    return toFiniteNumber(snapshot && snapshot.simulation && snapshot.simulation.simTimeMs, 0);
  }

  function getElapsedHours(currentSimTimeMs, thenSimTimeMs) {
    return Math.max(0, currentSimTimeMs - toFiniteNumber(thenSimTimeMs, currentSimTimeMs)) / (60 * 60 * 1000);
  }

  function buildDefaultShadowRuntimeState() {
    return {
      previousPressures: {},
      previousSimTimeMs: null,
      trackedEvents: {},
      rewardCooldownUntilSimTimeMs: 0,
      lastRewardClass: null,
      recentResolutions: [],
      recentChainContexts: [],
      stableWindow: {
        startSimTimeMs: null,
        stableHours: 0,
        lastStableSimTimeMs: null
      }
    };
  }

  function buildEmptyPersistenceDiagnostics(reason) {
    return {
      restored: false,
      ignored: false,
      versionLoaded: null,
      defaultsApplied: reason ? [reason] : [],
      migrationsApplied: [],
      prunedFragments: [],
      resetReason: reason || null
    };
  }

  function sanitizePressures(value) {
    const raw = clonePlainObject(value);
    const next = {};
    Object.keys(raw).forEach((key) => {
      next[String(key)] = round2(Math.max(0, toFiniteNumber(raw[key], 0)));
    });
    return next;
  }

  function sanitizeTrackedEvents(value) {
    const raw = clonePlainObject(value);
    const next = {};
    Object.keys(raw).forEach((eventId) => {
      const entry = clonePlainObject(raw[eventId]);
      if (!eventId) {
        return;
      }
      next[String(eventId)] = {
        eventId: String(entry.eventId || eventId),
        category: String(entry.category || 'generic'),
        activationState: String(entry.activationState || 'warning'),
        stage: String(entry.stage || entry.activationState || 'warning'),
        escalationReason: String(entry.escalationReason || 'restored'),
        sustainedHours: round2(Math.max(0, toFiniteNumber(entry.sustainedHours, 0))),
        worseningDelta: round2(toFiniteNumber(entry.worseningDelta, 0)),
        worsening: Boolean(entry.worsening),
        unresolved: Boolean(entry.unresolved),
        firstObservedSimTimeMs: toFiniteNumber(entry.firstObservedSimTimeMs, 0),
        warningSinceSimTimeMs: toFiniteNumber(entry.warningSinceSimTimeMs, 0),
        unresolvedSinceSimTimeMs: toFiniteNumber(entry.unresolvedSinceSimTimeMs, 0),
        activationScore: round2(toFiniteNumber(entry.activationScore, 0))
      };
    });
    return next;
  }

  function sanitizeRecentResolutions(value) {
    return (Array.isArray(value) ? value : [])
      .slice(-8)
      .map((entry) => clonePlainObject(entry))
      .filter((entry) => entry && entry.eventId)
      .map((entry) => ({
        eventId: String(entry.eventId || ''),
        category: String(entry.category || 'generic'),
        shadowStage: String(entry.shadowStage || 'warning'),
        outcomeStatus: String(entry.outcomeStatus || 'unresolved'),
        quality: String(entry.quality || 'neutral'),
        fitScore: round2(toFiniteNumber(entry.fitScore, 0)),
        escalationRiskShift: round2(toFiniteNumber(entry.escalationRiskShift, 0)),
        plausibleFollowUp: Boolean(entry.plausibleFollowUp),
        atSimTimeMs: toFiniteNumber(entry.atSimTimeMs, 0)
      }));
  }

  function sanitizeFollowUpCandidates(value) {
    return (Array.isArray(value) ? value : [])
      .slice(0, 4)
      .map((entry) => clonePlainObject(entry))
      .filter((entry) => entry && entry.followUpId)
      .map((entry) => ({
        followUpId: String(entry.followUpId || ''),
        followUpCategory: String(entry.followUpCategory || 'generic'),
        basePlausibility: round2(toFiniteNumber(entry.basePlausibility, 0)),
        plausibilityBoost: round2(toFiniteNumber(entry.plausibilityBoost, 0))
      }));
  }

  function sanitizeRecentChainContexts(value) {
    return (Array.isArray(value) ? value : [])
      .slice(0, 6)
      .map((entry) => clonePlainObject(entry))
      .filter((entry) => entry && entry.sourceEventId)
      .map((entry) => ({
        sourceEventId: String(entry.sourceEventId || ''),
        causeCategory: String(entry.causeCategory || 'generic'),
        priorOutcomeQuality: String(entry.priorOutcomeQuality || 'neutral'),
        priorOutcomeStatus: String(entry.priorOutcomeStatus || 'unresolved'),
        plausibilityStrength: round2(toFiniteNumber(entry.plausibilityStrength, 0)),
        createdAtSimTimeMs: toFiniteNumber(entry.createdAtSimTimeMs, 0),
        candidateHooks: Array.isArray(entry.candidateHooks) ? entry.candidateHooks.map((hook) => String(hook || '')).filter(Boolean).slice(0, 6) : [],
        candidates: sanitizeFollowUpCandidates(entry.candidates)
      }));
  }

  function sanitizeStableWindow(value) {
    const entry = clonePlainObject(value);
    return {
      startSimTimeMs: Number.isFinite(Number(entry.startSimTimeMs)) ? Number(entry.startSimTimeMs) : null,
      stableHours: round2(Math.max(0, toFiniteNumber(entry.stableHours, 0))),
      lastStableSimTimeMs: Number.isFinite(Number(entry.lastStableSimTimeMs)) ? Number(entry.lastStableSimTimeMs) : null
    };
  }

  function sanitizeShadowRuntimeState(value) {
    const raw = value && typeof value === 'object' ? value : {};
    return {
      previousPressures: sanitizePressures(raw.previousPressures),
      previousSimTimeMs: Number.isFinite(Number(raw.previousSimTimeMs)) ? Number(raw.previousSimTimeMs) : null,
      trackedEvents: sanitizeTrackedEvents(raw.trackedEvents),
      rewardCooldownUntilSimTimeMs: Math.max(0, toFiniteNumber(raw.rewardCooldownUntilSimTimeMs, 0)),
      lastRewardClass: raw.lastRewardClass ? String(raw.lastRewardClass) : null,
      recentResolutions: sanitizeRecentResolutions(raw.recentResolutions),
      recentChainContexts: sanitizeRecentChainContexts(raw.recentChainContexts),
      stableWindow: sanitizeStableWindow(raw.stableWindow)
    };
  }

  function serializeShadowRuntimeState(runtimeState, snapshot) {
    const sanitized = sanitizeShadowRuntimeState(runtimeState);
    return {
      version: SHADOW_RUNTIME_VERSION,
      kind: 'grow-simulator-shadow-runtime',
      savedAtSimTimeMs: getCurrentSimTimeMs(snapshot),
      previousPressures: sanitized.previousPressures,
      previousSimTimeMs: sanitized.previousSimTimeMs,
      trackedEvents: sanitized.trackedEvents,
      reward: {
        cooldownUntilSimTimeMs: sanitized.rewardCooldownUntilSimTimeMs,
        lastRewardClass: sanitized.lastRewardClass,
        stableWindow: sanitized.stableWindow
      },
      recentResolutions: sanitized.recentResolutions,
      chains: {
        recentContexts: sanitized.recentChainContexts
      }
    };
  }

  function migrateLegacyShadowPayload(rawPayload, diagnostics) {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : null;
    if (!payload) {
      diagnostics.defaultsApplied.push('missing_shadow_payload');
      return buildDefaultShadowRuntimeState();
    }

    const versionLoaded = Number(payload.version);
    diagnostics.versionLoaded = Number.isFinite(versionLoaded) ? versionLoaded : null;
    if (!Number.isFinite(versionLoaded)) {
      diagnostics.defaultsApplied.push('missing_shadow_version');
    } else if (versionLoaded < SHADOW_RUNTIME_VERSION) {
      diagnostics.migrationsApplied.push(`shadow_runtime_v${versionLoaded}_to_v${SHADOW_RUNTIME_VERSION}`);
    }

    const reward = payload.reward && typeof payload.reward === 'object' ? payload.reward : {};
    const chains = payload.chains && typeof payload.chains === 'object' ? payload.chains : {};

    return sanitizeShadowRuntimeState({
      previousPressures: payload.previousPressures,
      previousSimTimeMs: payload.previousSimTimeMs,
      trackedEvents: payload.trackedEvents,
      rewardCooldownUntilSimTimeMs: reward.cooldownUntilSimTimeMs,
      lastRewardClass: reward.lastRewardClass,
      recentResolutions: payload.recentResolutions,
      recentChainContexts: chains.recentContexts,
      stableWindow: reward.stableWindow
    });
  }

  function pruneTrackedEvents(trackedEvents, currentSimTimeMs, diagnostics) {
    const next = {};
    Object.keys(trackedEvents).forEach((eventId) => {
      const entry = trackedEvents[eventId];
      const lastRelevantSimTimeMs = Math.max(
        toFiniteNumber(entry.unresolvedSinceSimTimeMs, 0),
        toFiniteNumber(entry.warningSinceSimTimeMs, 0),
        toFiniteNumber(entry.firstObservedSimTimeMs, 0)
      );
      const ageHours = getElapsedHours(currentSimTimeMs, lastRelevantSimTimeMs);
      if (ageHours > TRACKED_EVENT_STALE_HOURS) {
        diagnostics.prunedFragments.push(`tracked_event:${eventId}`);
        return;
      }
      next[eventId] = {
        ...entry,
        sustainedHours: round2(Math.max(0, getElapsedHours(currentSimTimeMs, entry.warningSinceSimTimeMs)))
      };
    });
    return next;
  }

  function pruneRecentResolutions(recentResolutions, currentSimTimeMs, diagnostics) {
    return recentResolutions.filter((entry) => {
      const ageHours = getElapsedHours(currentSimTimeMs, entry.atSimTimeMs);
      if (ageHours > RECENT_RESOLUTION_WINDOW_HOURS) {
        diagnostics.prunedFragments.push(`resolution:${entry.eventId}`);
        return false;
      }
      return true;
    });
  }

  function pruneRecentChainContexts(recentChainContexts, currentSimTimeMs, diagnostics) {
    return recentChainContexts.filter((entry) => {
      const ageHours = getElapsedHours(currentSimTimeMs, entry.createdAtSimTimeMs);
      if (ageHours > CHAIN_CONTEXT_WINDOW_HOURS) {
        diagnostics.prunedFragments.push(`chain_context:${entry.sourceEventId}`);
        return false;
      }
      return true;
    });
  }

  function pruneStableWindow(stableWindow, currentSimTimeMs, diagnostics) {
    const lastStableSimTimeMs = stableWindow && Number.isFinite(Number(stableWindow.lastStableSimTimeMs))
      ? Number(stableWindow.lastStableSimTimeMs)
      : null;
    if (lastStableSimTimeMs == null) {
      return sanitizeStableWindow(stableWindow);
    }

    if (getElapsedHours(currentSimTimeMs, lastStableSimTimeMs) > STABLE_WINDOW_STALE_HOURS) {
      diagnostics.prunedFragments.push('stable_window');
      return sanitizeStableWindow(null);
    }

    return sanitizeStableWindow(stableWindow);
  }

  function pruneShadowRuntimeState(runtimeState, snapshot, diagnostics) {
    const currentSimTimeMs = getCurrentSimTimeMs(snapshot);
    const next = sanitizeShadowRuntimeState(runtimeState);

    next.trackedEvents = pruneTrackedEvents(next.trackedEvents, currentSimTimeMs, diagnostics);
    next.recentResolutions = pruneRecentResolutions(next.recentResolutions, currentSimTimeMs, diagnostics);
    next.recentChainContexts = pruneRecentChainContexts(next.recentChainContexts, currentSimTimeMs, diagnostics);
    next.stableWindow = pruneStableWindow(next.stableWindow, currentSimTimeMs, diagnostics);

    if (next.rewardCooldownUntilSimTimeMs <= currentSimTimeMs) {
      if (next.rewardCooldownUntilSimTimeMs > 0) {
        diagnostics.prunedFragments.push('reward_cooldown_expired');
      }
      next.rewardCooldownUntilSimTimeMs = 0;
    }

    if (next.previousSimTimeMs != null && next.previousSimTimeMs > currentSimTimeMs) {
      diagnostics.defaultsApplied.push('previous_sim_time_clamped');
      next.previousSimTimeMs = currentSimTimeMs;
    }

    return next;
  }

  function deserializeShadowRuntimeState(payload, snapshot) {
    const diagnostics = buildEmptyPersistenceDiagnostics(null);
    if (!payload || typeof payload !== 'object') {
      return {
        runtimeState: buildDefaultShadowRuntimeState(),
        diagnostics: buildEmptyPersistenceDiagnostics('missing_shadow_payload')
      };
    }

    const migrated = migrateLegacyShadowPayload(payload, diagnostics);
    const pruned = pruneShadowRuntimeState(migrated, snapshot, diagnostics);
    diagnostics.restored = true;
    diagnostics.resetReason = null;

    return {
      runtimeState: pruned,
      diagnostics
    };
  }

  function describePersistedShadowPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return {
        present: false,
        version: null,
        requiredStatePresent: false,
        sections: {
          previousPressures: false,
          trackedEvents: false,
          reward: false,
          recentResolutions: false,
          chains: false
        },
        notes: ['No persisted shadow payload is currently available.']
      };
    }

    const reward = payload.reward && typeof payload.reward === 'object' ? payload.reward : null;
    const chains = payload.chains && typeof payload.chains === 'object' ? payload.chains : null;
    const sections = {
      previousPressures: Boolean(payload.previousPressures && typeof payload.previousPressures === 'object'),
      trackedEvents: Boolean(payload.trackedEvents && typeof payload.trackedEvents === 'object'),
      reward: Boolean(reward),
      recentResolutions: Array.isArray(payload.recentResolutions),
      chains: Boolean(chains && Array.isArray(chains.recentContexts))
    };

    return {
      present: true,
      version: Number.isFinite(Number(payload.version)) ? Number(payload.version) : null,
      requiredStatePresent: Boolean(
        sections.previousPressures
        && sections.trackedEvents
        && sections.reward
        && sections.recentResolutions
        && sections.chains
      ),
      sections,
      notes: ['Persisted shadow payload coverage is evaluated structurally and does not imply parity confidence.']
    };
  }

  const api = Object.freeze({
    SHADOW_RUNTIME_VERSION,
    buildContractSnapshot,
    buildDefaultShadowRuntimeState,
    buildEmptyPersistenceDiagnostics,
    sanitizeShadowRuntimeState,
    serializeShadowRuntimeState,
    deserializeShadowRuntimeState,
    pruneShadowRuntimeState,
    describePersistedShadowPayload
  });

  globalScope.GrowSimEventPersistenceAdapter = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
