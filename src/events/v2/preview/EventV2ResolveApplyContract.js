'use strict';

const CONTRACT_VERSION = 1;
const SUPPORTED_EVENT_ID = 'indoor_dry_rootball';
const SUPPORTED_EVENT_VERSION = 3;
const SUPPORTED_EVENT_IDS = Object.freeze([
  'indoor_dry_rootball',
  'shared_panic_watering_misread',
]);
const EVENT_VERSION_BY_ID = Object.freeze({
  indoor_dry_rootball: 3,
  shared_panic_watering_misread: 3,
});
const DEFAULT_WRITE_MODE = 'no_write';

const ALLOWED_STATE_TARGETS = Object.freeze([
  'status.stress',
  'status.risk',
  'status.health',
]);

const FORBIDDEN_STATE_TARGETS = Object.freeze([
  'coins',
  'xp',
  'profile',
  'daily',
  'retention',
  'push',
  'monetization',
  'storage',
  'events.activeEventId',
  'events.openEvents',
  'events.history',
  'eventV2.openEvents',
  'eventV2.history',
]);

const EVENT_OPTION_MUTATION_PLAN = Object.freeze({
  indoor_dry_rootball: Object.freeze({
    inspect: Object.freeze({
      expectedQuality: 'good',
      mutations: Object.freeze([
        Object.freeze({ target: 'status.risk', delta: -1, reason: 'diagnosis_reduces_uncertainty' }),
      ]),
    }),
    stabilize: Object.freeze({
      expectedQuality: 'good',
      mutations: Object.freeze([
        Object.freeze({ target: 'status.stress', delta: -1, reason: 'gentle_stabilization' }),
        Object.freeze({ target: 'status.risk', delta: -1, reason: 'gentle_stabilization' }),
      ]),
    }),
    overreact: Object.freeze({
      expectedQuality: 'bad',
      mutations: Object.freeze([
        Object.freeze({ target: 'status.stress', delta: 2, reason: 'overcorrection_stress' }),
        Object.freeze({ target: 'status.risk', delta: 1, reason: 'overcorrection_risk' }),
      ]),
    }),
  }),
  shared_panic_watering_misread: Object.freeze({
    check_weight_before_watering: Object.freeze({
      expectedQuality: 'good',
      mutations: Object.freeze([
        Object.freeze({ target: 'status.risk', delta: -2, reason: 'panic_signal_validated_by_weight' }),
        Object.freeze({ target: 'status.stress', delta: -3, reason: 'panic_signal_validated_by_weight' }),
      ]),
    }),
    inspect_rootzone_then_wait: Object.freeze({
      expectedQuality: 'neutral',
      mutations: Object.freeze([
        Object.freeze({ target: 'status.risk', delta: -1, reason: 'rootzone_observation_reduces_uncertainty' }),
        Object.freeze({ target: 'status.stress', delta: -1, reason: 'rootzone_observation_reduces_uncertainty' }),
      ]),
    }),
    water_on_panic_signal: Object.freeze({
      expectedQuality: 'bad',
      mutations: Object.freeze([
        Object.freeze({ target: 'status.risk', delta: 3, reason: 'panic_watering_overreaction' }),
        Object.freeze({ target: 'status.health', delta: -1, reason: 'panic_watering_overreaction' }),
        Object.freeze({ target: 'status.stress', delta: 2, reason: 'panic_watering_overreaction' }),
      ]),
    }),
  }),
});

const MUTATION_LIMITS = Object.freeze({
  'status.stress': Object.freeze({ minDelta: -3, maxDelta: 3, minValue: 0, maxValue: 100 }),
  'status.risk': Object.freeze({ minDelta: -3, maxDelta: 3, minValue: 0, maxValue: 100 }),
  'status.health': Object.freeze({ minDelta: -2, maxDelta: 2, minValue: 0, maxValue: 100 }),
});

function toFiniteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number(fallback || 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, toFiniteNumber(value, min)));
}

function cloneStateForPreview(state) {
  const safe = state && typeof state === 'object' ? state : {};
  return {
    ...safe,
    status: {
      ...(safe.status && typeof safe.status === 'object' ? safe.status : {}),
    },
    eventV2: safe.eventV2 && typeof safe.eventV2 === 'object'
      ? { ...safe.eventV2 }
      : undefined,
  };
}

function getByTarget(state, target) {
  if (target === 'status.stress') return state.status && state.status.stress;
  if (target === 'status.risk') return state.status && state.status.risk;
  if (target === 'status.health') return state.status && state.status.health;
  return undefined;
}

function setByTarget(state, target, value) {
  if (!state.status || typeof state.status !== 'object') {
    state.status = {};
  }
  if (target === 'status.stress') state.status.stress = value;
  if (target === 'status.risk') state.status.risk = value;
  if (target === 'status.health') state.status.health = value;
}

function createDiagnostics(extra) {
  return {
    stateMutations: 0,
    saveWrites: 0,
    localStorageWrites: 0,
    indexedDbWrites: 0,
    uiActions: 0,
    gameplayActivations: 0,
    ...(extra || {}),
  };
}

function createRejectedResult(reason, errors, input) {
  return {
    ok: false,
    accepted: false,
    mode: 'event_v2_resolve_apply_contract_dev_only',
    contractVersion: CONTRACT_VERSION,
    reason,
    errors: Array.isArray(errors) ? errors.slice() : [String(reason || 'invalid_input')],
    eventId: input && input.eventId ? String(input.eventId) : null,
    optionId: input && input.optionId ? String(input.optionId) : null,
    eventVersion: input && input.eventVersion != null ? Number(input.eventVersion) : null,
    requestedWriteMode: input && input.requestedWriteMode ? String(input.requestedWriteMode) : DEFAULT_WRITE_MODE,
    canMutateState: false,
    canMutateSave: false,
    canApplyNow: false,
    noWriteDefault: true,
    expectedMutations: [],
    appliedMutations: [],
    stateAfterPreview: null,
    historyPreview: null,
    diagnostics: createDiagnostics(),
  };
}

function validateMutation(mutation) {
  const target = mutation && mutation.target ? String(mutation.target) : '';
  const delta = toFiniteNumber(mutation && mutation.delta, NaN);
  const limits = MUTATION_LIMITS[target];

  if (!ALLOWED_STATE_TARGETS.includes(target)) {
    return `target_not_allowed:${target || 'missing'}`;
  }
  if (FORBIDDEN_STATE_TARGETS.includes(target)) {
    return `target_forbidden:${target}`;
  }
  if (!limits) {
    return `target_limits_missing:${target}`;
  }
  if (!Number.isFinite(delta) || delta < limits.minDelta || delta > limits.maxDelta) {
    return `delta_out_of_bounds:${target}`;
  }
  return null;
}

function validateInput(input) {
  const errors = [];
  const safe = input && typeof input === 'object' ? input : {};
  const eventId = String(safe.eventId || '');
  const optionId = String(safe.optionId || '');
  const eventVersion = Number(safe.eventVersion);
  const requestedWriteMode = String(safe.requestedWriteMode || DEFAULT_WRITE_MODE);
  const eventPlan = EVENT_OPTION_MUTATION_PLAN[eventId];
  const expectedEventVersion = EVENT_VERSION_BY_ID[eventId];

  if (!SUPPORTED_EVENT_IDS.includes(eventId)) {
    errors.push('unsupported_event_id');
  }
  if (!eventPlan || !Object.prototype.hasOwnProperty.call(eventPlan, optionId)) {
    errors.push('unsupported_option_id');
  }
  if (!Number.isFinite(expectedEventVersion) || eventVersion !== expectedEventVersion) {
    errors.push('unsupported_event_version');
  }
  if (requestedWriteMode !== DEFAULT_WRITE_MODE) {
    errors.push('write_mode_not_enabled');
  }

  const plan = eventPlan ? eventPlan[optionId] : null;
  if (plan) {
    plan.mutations.forEach((mutation) => {
      const error = validateMutation(mutation);
      if (error) errors.push(error);
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    eventId,
    optionId,
    eventVersion,
    requestedWriteMode,
    plan,
  };
}

function buildMutationPreview(currentState, mutation) {
  const limits = MUTATION_LIMITS[mutation.target];
  const before = clamp(getByTarget(currentState, mutation.target), limits.minValue, limits.maxValue);
  const delta = toFiniteNumber(mutation.delta, 0);
  const after = clamp(before + delta, limits.minValue, limits.maxValue);
  return {
    target: mutation.target,
    delta,
    before,
    after,
    reason: String(mutation.reason || 'resolve_apply_contract'),
    applied: false,
    previewOnly: true,
  };
}

function buildHistoryPreview(input, validation, mutationPreviews) {
  return {
    kind: 'event_v2_resolve_history_preview',
    eventId: validation.eventId,
    optionId: validation.optionId,
    eventVersion: validation.eventVersion,
    contractVersion: CONTRACT_VERSION,
    expectedQuality: validation.plan.expectedQuality,
    mutationTargets: mutationPreviews.map((entry) => entry.target),
    previewOnly: true,
    persisted: false,
    createdAtSimTimeMs: toFiniteNumber(input && input.currentState && input.currentState.simulation && input.currentState.simulation.simTimeMs, 0),
  };
}

function evaluateResolveApplyContract(input) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const validation = validateInput(safeInput);
  if (!validation.ok) {
    return createRejectedResult(validation.errors[0] || 'invalid_input', validation.errors, safeInput);
  }

  const stateBeforePreview = cloneStateForPreview(safeInput.currentState);
  const stateAfterPreview = cloneStateForPreview(safeInput.currentState);
  const mutationPreviews = validation.plan.mutations.map((mutation) => buildMutationPreview(stateBeforePreview, mutation));
  mutationPreviews.forEach((preview) => {
    setByTarget(stateAfterPreview, preview.target, preview.after);
  });

  const historyPreview = buildHistoryPreview(safeInput, validation, mutationPreviews);

  return {
    ok: true,
    accepted: true,
    mode: 'event_v2_resolve_apply_contract_dev_only',
    contractVersion: CONTRACT_VERSION,
    reason: 'apply_preview_created_no_write',
    eventId: validation.eventId,
    optionId: validation.optionId,
    eventVersion: validation.eventVersion,
    requestedWriteMode: validation.requestedWriteMode,
    allowedStateTargets: ALLOWED_STATE_TARGETS.slice(),
    forbiddenStateTargets: FORBIDDEN_STATE_TARGETS.slice(),
    expectedMutations: mutationPreviews.map((entry) => ({
      target: entry.target,
      delta: entry.delta,
      reason: entry.reason,
    })),
    appliedMutations: [],
    previewResult: {
      expectedQuality: validation.plan.expectedQuality,
      mutationPreview: mutationPreviews,
      stateAfterPreview,
      historyPreview,
    },
    stateAfterPreview,
    historyPreview,
    canMutateState: false,
    canMutateSave: false,
    canApplyNow: false,
    laterWriteMode: {
      requiredMode: 'dev_write_explicit_after_save_contract',
      currentlyEnabled: false,
      blocker: 'save_load_and_v1_v2_write_gate_missing',
    },
    noWriteDefault: true,
    safetyLabels: [
      'dev-only',
      'no-write default',
      'preview mutations only',
      'no save migration',
      'no V1 replacement',
    ],
    diagnostics: createDiagnostics({
      validationErrors: [],
      originalStateMutated: false,
    }),
  };
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  SUPPORTED_EVENT_ID,
  SUPPORTED_EVENT_VERSION,
  DEFAULT_WRITE_MODE,
  ALLOWED_STATE_TARGETS,
  FORBIDDEN_STATE_TARGETS,
  SUPPORTED_EVENT_IDS,
  EVENT_VERSION_BY_ID,
  EVENT_OPTION_MUTATION_PLAN,
  MUTATION_LIMITS,
  evaluateResolveApplyContract,
  validateInput,
});
