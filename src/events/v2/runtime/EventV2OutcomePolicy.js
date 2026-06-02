'use strict';

(function initEventV2OutcomePolicy(globalScope) {
  const ActivationRegistryApi = (() => {
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try {
        return require('./EventV2ActivationRegistry.js');
      } catch (_error) {
        return null;
      }
    }
    if (globalScope && globalScope.GrowSimEventV2ActivationRegistry) {
      return globalScope.GrowSimEventV2ActivationRegistry;
    }
    return null;
  })();
  const OUTCOME_POLICY_MAP = Object.freeze({
    indoor_dry_rootball: Object.freeze({
      stabilize: Object.freeze({
        mode: 'apply_delta',
        reason: 'stabilizing_action',
        deltas: Object.freeze([
          Object.freeze({ path: 'status.stress', op: 'add', value: -1, reason: 'event_v2_pilot_apply_delta' }),
          Object.freeze({ path: 'status.risk', op: 'add', value: -1, reason: 'event_v2_pilot_apply_delta' }),
        ]),
      }),
      inspect: Object.freeze({
        mode: 'no_delta',
        reason: 'diagnostic_only',
        deltas: Object.freeze([]),
      }),
      overreact: Object.freeze({
        mode: 'guardrail_only',
        reason: 'guardrail_only',
        deltas: Object.freeze([]),
        futureDeltasBlocked: true,
        warning: 'Du greifst sehr stark ein, obwohl die Ursache noch nicht sicher ist. Das kann die Pflanze zusaetzlich stressen. Pruefe beim naechsten Mal zuerst Substrat und Topfgewicht.',
      }),
    }),
    shared_panic_watering_misread: Object.freeze({
      check_weight_before_watering: Object.freeze({
        mode: 'no_delta',
        reason: 'diagnostic_weight_check',
        deltas: Object.freeze([]),
      }),
      inspect_rootzone_then_wait: Object.freeze({
        mode: 'no_delta',
        reason: 'diagnostic_rootzone_check',
        deltas: Object.freeze([]),
      }),
      water_on_panic_signal: Object.freeze({
        mode: 'guardrail_only',
        reason: 'panic_reaction_guardrail',
        deltas: Object.freeze([]),
        futureDeltasBlocked: true,
      }),
    }),
  });

  const FALLBACK_RUNTIME_ENABLED_EVENTS = Object.freeze([
    'indoor_dry_rootball',
    'shared_panic_watering_misread',
  ]);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function getEventV2OutcomePolicy(eventId, optionId) {
    const safeEventId = String(eventId || '').trim();
    const safeOptionId = String(optionId || '').trim();
    const eventPolicy = OUTCOME_POLICY_MAP[safeEventId];
    const optionPolicy = eventPolicy ? eventPolicy[safeOptionId] : null;
    if (optionPolicy) return cloneJson(optionPolicy);
    if (!isEventV2OutcomePolicyRuntimeEnabled(safeEventId)) return null;
    return buildSafeDefaultPolicy(safeEventId, safeOptionId);
  }

  function isEventV2OutcomePolicyPrepared(eventId) {
    const safeEventId = String(eventId || '').trim();
    if (!safeEventId) return false;
    if (OUTCOME_POLICY_MAP[safeEventId]) return true;
    return isEventV2OutcomePolicyRuntimeEnabled(safeEventId);
  }

  function isEventV2OutcomePolicyRuntimeEnabled(eventId) {
    const safeEventId = String(eventId || '').trim();
    if (!safeEventId) return false;
    if (ActivationRegistryApi && typeof ActivationRegistryApi.isEventV2RuntimeEnabled === 'function') {
      return ActivationRegistryApi.isEventV2RuntimeEnabled(safeEventId) === true;
    }
    return FALLBACK_RUNTIME_ENABLED_EVENTS.includes(safeEventId);
  }

  function shouldUseGuardrailDefault(optionId) {
    const safeOptionId = String(optionId || '').toLowerCase();
    return safeOptionId.includes('panic')
      || safeOptionId.includes('blindly')
      || safeOptionId.includes('extreme')
      || safeOptionId.includes('flood')
      || safeOptionId.includes('raise_')
      || safeOptionId.includes('stack_more')
      || safeOptionId.includes('defoliate')
      || safeOptionId.includes('heavy')
      || safeOptionId.includes('again')
      || safeOptionId.includes('double_feed')
      || safeOptionId.includes('strip_');
  }

  function buildSafeDefaultPolicy(eventId, optionId) {
    const safeEventId = String(eventId || '').trim();
    const safeOptionId = String(optionId || '').trim();
    if (!safeOptionId) return null;
    if (shouldUseGuardrailDefault(safeOptionId)) {
      return {
        mode: 'guardrail_only',
        reason: 'safe_guardrail_review',
        deltas: [],
        futureDeltasBlocked: true,
      };
    }
    return {
      mode: 'no_delta',
      reason: 'safe_default_review',
      deltas: [],
      applied: false,
      sourceEventId: safeEventId,
      sourceOptionId: safeOptionId,
    };
  }

  function validateEventV2OutcomePolicy(policy) {
    const safePolicy = isPlainObject(policy) ? policy : null;
    const errors = [];
    if (!safePolicy) {
      errors.push('policy_not_object');
      return { ok: false, errors };
    }
    const mode = String(safePolicy.mode || '');
    if (!['apply_delta', 'no_delta', 'guardrail_only'].includes(mode)) {
      errors.push('invalid_mode');
    }
    if (!safePolicy.reason) {
      errors.push('missing_reason');
    }
    if (!Array.isArray(safePolicy.deltas)) {
      errors.push('deltas_not_array');
    } else {
      for (const delta of safePolicy.deltas) {
        if (!isPlainObject(delta)) {
          errors.push('delta_not_object');
          continue;
        }
        if (String(delta.op || '') !== 'add') errors.push('unsupported_delta_op');
        if (!String(delta.path || '').startsWith('status.')) errors.push('unsupported_delta_path');
        if (!Number.isFinite(Number(delta.value))) errors.push('delta_value_not_numeric');
      }
    }
    return { ok: errors.length === 0, errors };
  }

  function resolveEventV2OutcomePolicy(eventId, optionId, _context) {
    if (!isEventV2OutcomePolicyRuntimeEnabled(eventId)) {
      return {
        ok: false,
        blocked: true,
        reason: isEventV2OutcomePolicyPrepared(eventId) ? 'policy_not_runtime_enabled' : 'policy_not_found',
        errors: [isEventV2OutcomePolicyPrepared(eventId) ? 'policy_not_runtime_enabled' : 'policy_not_found'],
        policy: null,
      };
    }
    const policy = getEventV2OutcomePolicy(eventId, optionId);
    if (!policy) {
      return {
        ok: false,
        blocked: true,
        reason: 'policy_not_found',
        errors: ['policy_not_found'],
        policy: null,
      };
    }
    const validation = validateEventV2OutcomePolicy(policy);
    if (!validation.ok) {
      return {
        ok: false,
        blocked: true,
        reason: 'policy_invalid',
        errors: validation.errors.slice(),
        policy: null,
      };
    }
    return {
      ok: true,
      blocked: false,
      reason: String(policy.reason || 'policy_ok'),
      errors: [],
      policy,
    };
  }

  function clampStatusValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  function applyEventV2OutcomePolicyToState(state, policy, context) {
    const safeContext = isPlainObject(context) ? context : {};
    const eventId = String(safeContext.eventId || '');
    const selectedOption = String(safeContext.selectedOption || '');
    const source = String(safeContext.source || 'event-v2-outcome-policy');
    const now = Number.isFinite(Number(safeContext.now)) ? Number(safeContext.now) : Date.now();
    const safePolicy = isPlainObject(policy) ? policy : null;
    if (!safePolicy) {
      return {
        ok: false,
        errors: ['policy_not_object'],
        stateMutations: 0,
        appliedDelta: {
          applied: false,
          appliedAt: null,
          source,
          eventId,
          selectedOption,
          reason: 'policy_not_object',
          deltas: [],
          checkedAt: now,
        },
      };
    }
    const mode = String(safePolicy.mode || '');
    if (mode !== 'apply_delta') {
      return {
        ok: true,
        errors: [],
        stateMutations: 0,
        appliedDelta: {
          applied: false,
          appliedAt: null,
          source,
          eventId,
          selectedOption,
          reason: String(safePolicy.reason || 'not_applied'),
          deltas: [],
          checkedAt: now,
          warning: safePolicy.warning ? String(safePolicy.warning) : undefined,
          futureDeltasBlocked: safePolicy.futureDeltasBlocked === true,
        },
      };
    }

    if (!isPlainObject(state)) {
      return {
        ok: false,
        errors: ['state_not_object'],
        stateMutations: 0,
        appliedDelta: {
          applied: false,
          appliedAt: null,
          source,
          eventId,
          selectedOption,
          reason: 'state_not_object',
          deltas: [],
          checkedAt: now,
        },
      };
    }

    state.status = isPlainObject(state.status) ? state.status : {};
    const deltas = [];
    const requestedDeltas = Array.isArray(safePolicy.deltas) ? safePolicy.deltas : [];
    for (const delta of requestedDeltas) {
      if (!isPlainObject(delta)) continue;
      const path = String(delta.path || '');
      if (!path.startsWith('status.')) continue;
      const key = path.slice('status.'.length);
      if (!key) continue;
      const value = Number(delta.value);
      if (!Number.isFinite(value)) continue;
      const safeDelta = Math.max(-3, Math.min(3, Math.round(value)));
      const before = clampStatusValue(state.status[key]);
      const after = clampStatusValue(before + safeDelta);
      state.status[key] = after;
      deltas.push({
        target: path,
        delta: safeDelta,
        before,
        after,
        reason: delta.reason ? String(delta.reason) : String(safePolicy.reason || 'policy_delta'),
      });
    }

    if (!deltas.length) {
      return {
        ok: false,
        errors: ['no_policy_deltas_applied'],
        stateMutations: 0,
        appliedDelta: {
          applied: false,
          appliedAt: null,
          source,
          eventId,
          selectedOption,
          reason: 'no_policy_deltas_applied',
          deltas: [],
          checkedAt: now,
        },
      };
    }

    return {
      ok: true,
      errors: [],
      stateMutations: deltas.length,
      appliedDelta: {
        applied: true,
        appliedAt: now,
        source,
        eventId,
        selectedOption,
        reason: String(safePolicy.reason || 'policy_applied'),
        deltas,
      },
    };
  }

  const api = Object.freeze({
    OUTCOME_POLICY_MAP,
    RUNTIME_ENABLED_EVENTS: FALLBACK_RUNTIME_ENABLED_EVENTS,
    isEventV2OutcomePolicyPrepared,
    isEventV2OutcomePolicyRuntimeEnabled,
    getEventV2OutcomePolicy,
    resolveEventV2OutcomePolicy,
    validateEventV2OutcomePolicy,
    applyEventV2OutcomePolicyToState,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  globalScope.GrowSimEventV2OutcomePolicy = api;
})(typeof window !== 'undefined' ? window : globalThis);
