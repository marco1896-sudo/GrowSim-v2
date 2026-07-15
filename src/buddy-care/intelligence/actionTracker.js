'use strict';

(function attachGrowSimCareActionTracker(globalScope) {
  const FINAL_STATUSES = Object.freeze(['improved', 'unchanged', 'worsened', 'cancelled']);

  function toArray(value) { return Array.isArray(value) ? value : []; }
  function timestamp(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Date.parse(String(value || '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  function confirmCareAction(recommendation, context = {}, options = {}) {
    const safe = recommendation && typeof recommendation === 'object' ? recommendation : {};
    const now = timestamp(options.now) || Date.now();
    return Object.freeze({
      id: String(options.id || `care-action-${String(context.plantId || '').trim()}-${String(safe.id || '').trim()}-${Math.trunc(now)}`),
      plantId: String(context.plantId || '').trim(),
      actionId: String(safe.id || '').trim(),
      origin: 'local_intelligence',
      insightId: String(options.insightId || '').trim() || null,
      sourceCheckId: String(context.currentCheck && context.currentCheck.id || '').trim() || null,
      triggerIds: toArray(options.triggerIds).map(String),
      status: 'confirmed',
      outcome: '',
      createdAt: now,
      updatedAt: now,
      recommendedAt: now,
      confirmedAt: now,
      performedAt: null,
      controlDueAt: null,
      controlWindowHours: Math.max(1, Number(safe.controlWindowHours || 48)),
      userNote: ''
    });
  }

  function markCareActionPerformed(action, options = {}) {
    const safe = action && typeof action === 'object' ? action : {};
    if (!safe.id || FINAL_STATUSES.includes(String(safe.status || ''))) return null;
    const performedAt = timestamp(options.now) || Date.now();
    const hours = Math.max(1, Number(safe.controlWindowHours || 48));
    return Object.freeze({
      ...safe,
      status: 'performed',
      outcome: 'pending',
      performedAt,
      controlDueAt: performedAt + (hours * 60 * 60 * 1000),
      updatedAt: performedAt
    });
  }

  function getDueEffectFollowUps(actions, options = {}) {
    const now = timestamp(options.now) || Date.now();
    return toArray(actions).filter((action) => (
      action
      && ['performed', 'effect_pending'].includes(String(action.status || ''))
      && Number(action.controlDueAt || 0) > 0
      && Number(action.controlDueAt) <= now
      && (!Number(action.lastAskedAt || 0) || now - Number(action.lastAskedAt) >= 12 * 60 * 60 * 1000)
    )).sort((left, right) => Number(left.controlDueAt || 0) - Number(right.controlDueAt || 0));
  }

  function recordCareActionOutcome(action, outcome, options = {}) {
    const safe = action && typeof action === 'object' ? action : {};
    const safeOutcome = String(outcome || '').trim().toLowerCase();
    if (!safe.id || !['improved', 'unchanged', 'worsened', 'cancelled'].includes(safeOutcome)) return null;
    const now = timestamp(options.now) || Date.now();
    return Object.freeze({
      ...safe,
      status: safeOutcome,
      outcome: safeOutcome,
      userNote: String(options.userNote || safe.userNote || '').trim(),
      updatedAt: now,
      lastAskedAt: now
    });
  }

  function isCareActionSuppressed(actionId, actions, options = {}) {
    const safeId = String(actionId || '').trim();
    const now = timestamp(options.now) || Date.now();
    return toArray(actions).some((action) => {
      if (!action || action.actionId !== safeId) return false;
      if (!FINAL_STATUSES.includes(String(action.status || ''))) return true;
      return ['unchanged', 'worsened'].includes(String(action.status || ''))
        && now - Number(action.updatedAt || 0) <= 14 * 24 * 60 * 60 * 1000;
    });
  }

  const api = Object.freeze({
    confirmCareAction,
    markCareActionPerformed,
    getDueEffectFollowUps,
    recordCareActionOutcome,
    isCareActionSuppressed
  });
  globalScope.GrowSimCareActionTracker = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
