'use strict';

(function initEventCooldowns(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;

  function describeContract() {
    return Object.freeze({
      phase: 'shadow',
      responsibility: 'anti-spam and cooldown normalization for shadow evaluation'
    });
  }

  function summarize(eventsState) {
    const scheduler = eventsState && eventsState.scheduler && typeof eventsState.scheduler === 'object'
      ? eventsState.scheduler
      : {};

    return {
      eventCooldownsSim: scheduler.eventCooldownsSim || {},
      categoryCooldownsSim: scheduler.categoryCooldownsSim || {},
      eventCooldowns: scheduler.eventCooldowns || {},
      categoryCooldowns: scheduler.categoryCooldowns || {}
    };
  }

  function isEventBlocked(eventDef, stateLike, snapshot) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const events = state.events && typeof state.events === 'object' ? state.events : {};
    const cooldowns = summarize(events);
    const simTimeMs = snapshot && snapshot.simulation ? Number(snapshot.simulation.simTimeMs || 0) : 0;
    const history = Array.isArray(events.history) ? events.history : [];
    const reasons = [];

    if (!eventDef || !eventDef.id) {
      reasons.push('missing_event_id');
      return { blocked: true, reasons, repetitionPenalty: 100 };
    }

    const blockedUntil = Number(cooldowns.eventCooldownsSim[eventDef.id] || 0);
    if (blockedUntil > simTimeMs) {
      reasons.push('event_cooldown');
    }

    const categoryKey = String(eventDef.category || 'generic');
    const categoryBlockedUntil = Number(cooldowns.categoryCooldownsSim[categoryKey] || 0);
    if (categoryBlockedUntil > simTimeMs) {
      reasons.push('category_cooldown');
    }

    const recentHistory = history.slice(-6);
    const sameEventRecent = recentHistory.filter((entry) => entry && entry.eventId === eventDef.id).length;
    if (sameEventRecent >= 2) {
      reasons.push('recent_repeat');
    }

    return {
      blocked: reasons.length > 0,
      reasons,
      repetitionPenalty: getRepetitionPenalty(eventDef, stateLike)
    };
  }

  function getRepetitionPenalty(eventDef, stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const events = state.events && typeof state.events === 'object' ? state.events : {};
    const history = Array.isArray(events.history) ? events.history : [];
    const recentHistory = history.slice(-6);
    const eventId = String(eventDef && eventDef.id || '');
    const category = String(eventDef && eventDef.category || 'generic');

    const sameEventRecent = recentHistory.filter((entry) => entry && entry.eventId === eventId).length;
    const sameCategoryRecent = recentHistory.filter((entry) => String(entry && entry.category || 'generic') === category).length;
    return shared.clamp((sameEventRecent * 18) + (sameCategoryRecent * 8), 0, 60);
  }

  function buildCooldownDiagnostics(stateLike, snapshot) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const events = state.events && typeof state.events === 'object' ? state.events : {};
    return {
      machineState: String(events.machineState || 'idle'),
      simTimeMs: snapshot && snapshot.simulation ? Number(snapshot.simulation.simTimeMs || 0) : 0,
      cooldowns: summarize(events)
    };
  }

  const api = Object.freeze({
    describeContract,
    summarize,
    isEventBlocked,
    getRepetitionPenalty,
    buildCooldownDiagnostics
  });

  globalScope.GrowSimEventCooldowns = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
