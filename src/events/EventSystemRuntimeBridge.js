'use strict';

const SaveShapeApi = typeof require === 'function'
  ? require('./v2/preview/EventV2SaveShapePreview.js')
  : null;
const WriteGateApi = typeof require === 'function'
  ? require('./v2/preview/EventV2WriteGatePreview.js')
  : null;
const ResolveApplyApi = typeof require === 'function'
  ? require('./v2/preview/EventV2ResolveApplyContract.js')
  : null;
const OutcomePolicyApi = typeof require === 'function'
  ? require('./v2/runtime/EventV2OutcomePolicy.js')
  : null;
const ActivationRegistryApi = typeof require === 'function'
  ? require('./v2/runtime/EventV2ActivationRegistry.js')
  : null;

const EVENT_V2_SAVE_SCHEMA_VERSION = SaveShapeApi
  ? SaveShapeApi.EVENT_V2_SAVE_SCHEMA_VERSION
  : 1;
const EVENT_VERSION_BY_ID = ResolveApplyApi
  ? ResolveApplyApi.EVENT_VERSION_BY_ID
  : Object.freeze({
    indoor_dry_rootball: 3,
    shared_panic_watering_misread: 3,
  });

const EVENT_SYSTEM_MODES = Object.freeze([
  'v1-active',
  'v2-preview',
  'v2-active-with-v1-legacy-read',
  'v2-active',
  'blocked',
]);

const DEFAULT_CUTOVER_MODE = 'v2-active-with-v1-legacy-read';
const SUPPORTED_CUTOVER_EVENT_IDS = Object.freeze([
  'indoor_dry_rootball',
  'shared_panic_watering_misread',
]);

const EVENT_PRESETS = Object.freeze({
  indoor_dry_rootball: Object.freeze({
    eventId: 'indoor_dry_rootball',
    optionId: 'stabilize',
    category: 'care',
    severity: 'warning',
    stage: 'vegetative',
    title: 'Indoor dry rootball',
    description: 'The rootball is drying unevenly and needs a measured response.',
    options: Object.freeze(['inspect', 'stabilize', 'overreact']),
  }),
  shared_panic_watering_misread: Object.freeze({
    eventId: 'shared_panic_watering_misread',
    optionId: 'check_weight_before_watering',
    category: 'water',
    severity: 'warning',
    stage: 'vegetative',
    title: 'Panic watering misread',
    description: 'Drooping leaves may be misread as thirst before the root zone is checked.',
    options: Object.freeze([
      'check_weight_before_watering',
      'inspect_rootzone_then_wait',
      'water_on_panic_signal',
    ]),
  }),
});

const EVENT_CENTER_V2_PILOT_EVENT_ID = 'indoor_dry_rootball';
const EVENT_CENTER_V2_PILOT_EVENT_IDS = Object.freeze(
  ActivationRegistryApi && typeof ActivationRegistryApi.getEventV2RuntimeEnabledEvents === 'function'
    ? ActivationRegistryApi.getEventV2RuntimeEnabledEvents()
    : ['indoor_dry_rootball', 'shared_panic_watering_misread']
);
const EVENT_CENTER_V2_APPLY_DELTA_PILOT_OPTION_ID = 'stabilize';
const EVENT_CENTER_V2_APPLY_DELTA_PILOT_SOURCE = 'event-v2-apply-delta-pilot';
const EVENT_CENTER_V2_APPLY_DELTA_ALLOWED_TARGETS = Object.freeze([
  'status.stress',
  'status.risk',
  'status.water',
]);

const EVENT_CENTER_PILOT_OPTION_LABELS = Object.freeze({
  indoor_dry_rootball: Object.freeze({
    inspect: 'Substrat zuerst prüfen',
    stabilize: 'Behutsam stabilisieren',
    overreact: 'Sofort stark eingreifen',
  }),
  shared_panic_watering_misread: Object.freeze({
    check_weight_before_watering: 'Topfgewicht pruefen',
    inspect_rootzone_then_wait: 'Wurzelzone pruefen',
    water_on_panic_signal: 'Aus Panik giessen',
  }),
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function createDiagnostics(extra) {
  return {
    stateMutations: 0,
    saveWrites: 0,
    localStorageWrites: 0,
    indexedDbWrites: 0,
    usedProductiveStorage: false,
    ...(extra || {}),
  };
}

function createDefaultMeta() {
  return {
    lastGeneratedAt: null,
    lastResolvedAt: null,
    lastAuditAt: null,
    lastError: null,
    counters: {
      generated: 0,
      resolved: 0,
      rejected: 0,
      expired: 0,
    },
  };
}

function createFallbackEventV2SaveShape(overrides) {
  const safeOverrides = isPlainObject(overrides) ? overrides : {};
  const meta = isPlainObject(safeOverrides.meta) ? safeOverrides.meta : {};
  const counters = isPlainObject(meta.counters) ? meta.counters : {};
  const mode = ['no-write', 'dry-run', 'active'].includes(safeOverrides.mode)
    ? safeOverrides.mode
    : 'active';

  return {
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    mode,
    openEvents: Array.isArray(safeOverrides.openEvents) ? cloneJson(safeOverrides.openEvents) : [],
    history: Array.isArray(safeOverrides.history) ? cloneJson(safeOverrides.history) : [],
    meta: {
      ...createDefaultMeta(),
      ...cloneJson(meta),
      counters: {
        ...createDefaultMeta().counters,
        ...cloneJson(counters),
      },
    },
  };
}

function validateFallbackEventV2SaveShape(shape) {
  const errors = [];
  if (!isPlainObject(shape)) {
    return {
      ok: false,
      errors: ['event_v2_shape_not_object'],
      warnings: [],
      normalizedShape: createFallbackEventV2SaveShape(),
    };
  }
  if (Number(shape.schemaVersion) !== EVENT_V2_SAVE_SCHEMA_VERSION) {
    errors.push('invalid_schema_version');
  }
  if (!['no-write', 'dry-run', 'active'].includes(shape.mode)) {
    errors.push('invalid_mode');
  }
  if (!Array.isArray(shape.openEvents)) {
    errors.push('open_events_invalid');
  }
  if (!Array.isArray(shape.history)) {
    errors.push('history_invalid');
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings: [],
    normalizedShape: createFallbackEventV2SaveShape(shape),
  };
}

function createEmptyEventV2SaveShape(overrides) {
  return SaveShapeApi && typeof SaveShapeApi.createEmptyEventV2SaveShape === 'function'
    ? SaveShapeApi.createEmptyEventV2SaveShape(overrides)
    : createFallbackEventV2SaveShape(overrides);
}

function validateEventV2SaveShape(shape) {
  return SaveShapeApi && typeof SaveShapeApi.validateEventV2SaveShape === 'function'
    ? SaveShapeApi.validateEventV2SaveShape(shape)
    : validateFallbackEventV2SaveShape(shape);
}

function evaluateEventV2WriteAuthority(input) {
  if (WriteGateApi && typeof WriteGateApi.evaluateEventV2WriteAuthority === 'function') {
    return WriteGateApi.evaluateEventV2WriteAuthority(input);
  }
  const safeInput = isPlainObject(input) ? input : {};
  const state = isPlainObject(safeInput.state) ? safeInput.state : {};
  const eventV2 = isPlainObject(state.eventV2) ? state.eventV2 : null;
  const shape = validateEventV2SaveShape(eventV2);
  if (!eventV2 || !shape.ok) {
    return createBlockedBridgeResult('event_v2_shape_invalid', shape.errors);
  }
  if (safeInput.gateMode !== 'v2-active') {
    return createBlockedBridgeResult('unsupported_gate_mode');
  }
  if (safeInput.allowV2ActiveWriteAuthority !== true) {
    return createBlockedBridgeResult('v2_active_not_explicitly_allowed');
  }
  if (safeInput.forceV1WriteIntent === true && safeInput.forceV2WriteIntent === true) {
    return createBlockedBridgeResult('single_authority_conflict');
  }
  if (safeInput.forceV1WriteIntent === true) {
    return createBlockedBridgeResult('single_authority_conflict');
  }
  return {
    ok: true,
    authority: 'v2',
    gateMode: 'v2-active',
    v1CanWrite: false,
    v2CanWrite: true,
    v2CanPreview: true,
    v2CanDryRun: true,
    singleAuthority: true,
    wouldWrite: false,
    usedProductiveStorage: false,
    warnings: [],
    errors: [],
    diagnostics: createDiagnostics(),
  };
}

function evaluateResolveApplyContract(input) {
  if (ResolveApplyApi && typeof ResolveApplyApi.evaluateResolveApplyContract === 'function') {
    return ResolveApplyApi.evaluateResolveApplyContract(input);
  }
  const safeInput = isPlainObject(input) ? input : {};
  const preset = getEventPreset(safeInput.eventId);
  if (!preset.options.includes(safeInput.optionId)) {
    return {
      ok: false,
      errors: ['unsupported_option_id'],
      expectedMutations: [],
      previewResult: {},
    };
  }
  return {
    ok: true,
    errors: [],
    expectedMutations: [
      { target: 'status.risk', delta: -1, reason: 'browser_bridge_preview' },
    ],
    previewResult: {
      expectedQuality: 'preview',
      mutationPreview: [
        { target: 'status.risk', delta: -1, applied: false, previewOnly: true },
      ],
      historyPreview: {
        eventId: preset.eventId,
        optionId: safeInput.optionId,
        previewOnly: true,
      },
    },
  };
}

function createBlockedBridgeResult(reason, errors, extra) {
  return {
    ok: false,
    mode: DEFAULT_CUTOVER_MODE,
    activeEventSystem: 'blocked',
    legacyV1ReadFallback: true,
    v1CanCreateEvents: false,
    v1CanResolveEvents: false,
    v1CanWriteEvents: false,
    v2CanCreateEvents: false,
    v2CanResolveEvents: false,
    v2CanWriteEvents: false,
    wouldWrite: false,
    productiveWrite: false,
    usedProductiveStorage: false,
    mutatedInputState: false,
    eventCenterPreviewReadable: false,
    reason: String(reason || 'blocked'),
    warnings: [],
    errors: [String(reason || 'blocked')].concat(Array.isArray(errors) ? errors.slice() : []),
    diagnostics: createDiagnostics(),
    ...(isPlainObject(extra) ? extra : {}),
  };
}

function normalizeEventSystemMode(mode) {
  const safeMode = typeof mode === 'string' ? mode.trim() : '';
  return EVENT_SYSTEM_MODES.includes(safeMode) ? safeMode : DEFAULT_CUTOVER_MODE;
}

function getEventPreset(eventId) {
  const safeId = typeof eventId === 'string' ? eventId.trim() : '';
  if (EVENT_PRESETS[safeId]) return EVENT_PRESETS[safeId];
  const registryApi = getEventV2ActivationRegistryApi();
  if (registryApi && typeof registryApi.getEventV2ActivationEntry === 'function') {
    const entry = registryApi.getEventV2ActivationEntry(safeId);
    if (entry && Array.isArray(entry.optionIds) && entry.optionIds.length) {
      return {
        eventId: entry.eventId,
        optionId: entry.defaultOptionId || entry.optionIds[0],
        category: entry.category || 'care',
        severity: entry.severity || 'warning',
        stage: 'vegetative',
        title: entry.title || 'Ereignis erkannt',
        description: entry.description || 'Dieses Ereignis wurde erkannt. Pruefe die Situation und waehle eine passende Reaktion.',
        options: entry.optionIds.slice(),
      };
    }
  }
  return EVENT_PRESETS.indoor_dry_rootball;
}

function getEventV2ActivationRegistryApi() {
  if (ActivationRegistryApi && typeof ActivationRegistryApi.isEventV2RuntimeEnabled === 'function') {
    return ActivationRegistryApi;
  }
  if (typeof window !== 'undefined'
    && window.GrowSimEventV2ActivationRegistry
    && typeof window.GrowSimEventV2ActivationRegistry.isEventV2RuntimeEnabled === 'function') {
    return window.GrowSimEventV2ActivationRegistry;
  }
  return null;
}

function ensureEventV2StateShape(state, options) {
  const safeOptions = isPlainObject(options) ? options : {};
  const safeState = isPlainObject(state) ? cloneJson(state) : {};
  const existing = isPlainObject(safeState.eventV2) ? safeState.eventV2 : null;
  const desiredMode = typeof safeOptions.mode === 'string' ? safeOptions.mode : 'active';
  const initialShape = existing
    ? createEmptyEventV2SaveShape({
      ...existing,
      mode: existing.mode || desiredMode,
    })
    : createEmptyEventV2SaveShape({ mode: desiredMode });

  const validation = validateEventV2SaveShape(initialShape);
  return {
    ok: validation.ok,
    state: {
      ...safeState,
      eventV2: validation.normalizedShape,
      events: isPlainObject(safeState.events) ? cloneJson(safeState.events) : {},
    },
    wouldInitialize: !existing,
    warnings: validation.warnings.slice(),
    errors: validation.errors.slice(),
  };
}

function ensureEventV2StateInPlace(state, options) {
  if (!isPlainObject(state)) {
    return {
      ok: false,
      initialized: false,
      mutated: false,
      errors: ['state_not_object'],
      warnings: [],
    };
  }
  const safeOptions = isPlainObject(options) ? options : {};
  const existing = isPlainObject(state.eventV2) ? state.eventV2 : null;
  const result = ensureEventV2StateShape(state, {
    mode: safeOptions.mode || 'active',
  });
  if (!result.ok) {
    return {
      ok: false,
      initialized: false,
      mutated: false,
      errors: result.errors.slice(),
      warnings: result.warnings.slice(),
    };
  }

  state.eventV2 = {
    ...(existing || {}),
    ...result.state.eventV2,
    meta: {
      ...((existing && isPlainObject(existing.meta)) ? existing.meta : {}),
      ...(result.state.eventV2.meta || {}),
    },
  };
  if (!state.eventV2.meta || typeof state.eventV2.meta !== 'object') {
    state.eventV2.meta = createDefaultMeta();
  }
  state.eventV2.meta.eventSystemMode = normalizeEventSystemMode(
    safeOptions.eventSystemMode || DEFAULT_CUTOVER_MODE
  );
  state.eventV2.meta.browserRuntimePilot = true;

  return {
    ok: true,
    initialized: !existing,
    mutated: true,
    eventV2: state.eventV2,
    warnings: result.warnings.slice(),
    errors: [],
  };
}

function createEventSystemRuntimeBridgeContext(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const eventSystemMode = normalizeEventSystemMode(safeInput.eventSystemMode);
  const stateResult = ensureEventV2StateShape(safeInput.state, { mode: 'active' });

  return {
    ok: stateResult.ok && eventSystemMode !== 'blocked',
    mode: eventSystemMode,
    state: stateResult.state,
    eventId: typeof safeInput.eventId === 'string' ? safeInput.eventId : 'indoor_dry_rootball',
    selectedOption: typeof safeInput.selectedOption === 'string' ? safeInput.selectedOption : null,
    runtime: {
      now: Number.isFinite(Number(safeInput.now)) ? Number(safeInput.now) : 1760000000000,
      source: 'event-system-runtime-bridge',
      stage: typeof safeInput.stage === 'string' ? safeInput.stage : 'vegetative',
    },
    permissions: {
      allowV2ActiveWriteAuthority: safeInput.permissions && safeInput.permissions.allowV2ActiveWriteAuthority === true,
      allowProductiveStorage: false,
      allowRuntimeMutation: safeInput.permissions && safeInput.permissions.allowRuntimeMutation === true,
    },
    forceV1WriteIntent: safeInput.forceV1WriteIntent === true,
    forceV2WriteIntent: safeInput.forceV2WriteIntent === true,
    stateWarnings: stateResult.warnings,
    stateErrors: stateResult.errors,
    wouldInitializeEventV2: stateResult.wouldInitialize,
  };
}

function evaluateEventSystemRuntimeBridge(input) {
  const context = createEventSystemRuntimeBridgeContext(input);
  const mode = context.mode;
  const legacyV1ReadFallback = mode === 'v2-active-with-v1-legacy-read' || mode === 'v2-preview';

  if (!context.ok) {
    return createBlockedBridgeResult('bridge_context_invalid', context.stateErrors, {
      mode,
      legacyV1ReadFallback,
    });
  }

  if (mode === 'v1-active') {
    return {
      ok: true,
      mode,
      activeEventSystem: 'v1',
      legacyV1ReadFallback: true,
      v1CanCreateEvents: true,
      v1CanResolveEvents: true,
      v1CanWriteEvents: true,
      v2CanCreateEvents: false,
      v2CanResolveEvents: false,
      v2CanWriteEvents: false,
      wouldWrite: false,
      productiveWrite: false,
      usedProductiveStorage: false,
      mutatedInputState: false,
      warnings: ['legacy_mode_only'],
      errors: [],
      diagnostics: createDiagnostics(),
    };
  }

  if (mode === 'v2-preview') {
    return {
      ok: true,
      mode,
      activeEventSystem: 'v2-preview',
      legacyV1ReadFallback: true,
      v1CanCreateEvents: false,
      v1CanResolveEvents: false,
      v1CanWriteEvents: false,
      v2CanCreateEvents: false,
      v2CanResolveEvents: false,
      v2CanWriteEvents: false,
      wouldWrite: false,
      productiveWrite: false,
      usedProductiveStorage: false,
      mutatedInputState: false,
      warnings: context.stateWarnings.slice(),
      errors: [],
      diagnostics: createDiagnostics(),
    };
  }

  const gate = evaluateEventV2WriteAuthority({
    state: { eventV2: context.state.eventV2 },
    gateMode: 'v2-active',
    allowV2ActiveWriteAuthority: context.permissions.allowV2ActiveWriteAuthority,
    forceV1WriteIntent: context.forceV1WriteIntent,
    forceV2WriteIntent: context.forceV2WriteIntent,
    allowV1WriteWhenV2Active: false,
  });

  if (!gate.ok || gate.authority !== 'v2' || gate.singleAuthority !== true) {
    return createBlockedBridgeResult('write_gate_blocked', gate.errors, {
      mode,
      legacyV1ReadFallback,
      gate,
    });
  }

  return {
    ok: true,
    mode,
    activeEventSystem: 'v2',
    legacyV1ReadFallback,
    v1CanCreateEvents: false,
    v1CanResolveEvents: false,
    v1CanWriteEvents: false,
    v2CanCreateEvents: true,
    v2CanResolveEvents: true,
    v2CanWriteEvents: true,
    wouldWrite: true,
    productiveWrite: false,
    usedProductiveStorage: false,
    mutatedInputState: false,
    gate,
    warnings: context.stateWarnings.slice(),
    errors: [],
    diagnostics: createDiagnostics(),
  };
}

function createV2OpenEvent(context) {
  const preset = getEventPreset(context.eventId);
  const eventVersion = EVENT_VERSION_BY_ID[preset.eventId] || 3;
  return {
    eventId: preset.eventId,
    instanceId: `evt_v2_cutover_${preset.eventId}_001`,
    eventVersion,
    createdAt: context.runtime.now,
    stage: preset.stage,
    category: preset.category,
    severity: preset.severity,
    source: context.runtime.source,
    options: preset.options.slice(),
    status: 'active',
    previewPayload: {
      title: preset.title,
      description: preset.description,
      eventCenterReadable: true,
      noRawI18nKeys: true,
    },
  };
}

function createEventCenterPreviewFromV2(openEvent) {
  const preset = getEventPreset(openEvent && openEvent.eventId);
  return {
    ok: Boolean(openEvent && openEvent.eventId),
    eventId: openEvent ? openEvent.eventId : null,
    instanceId: openEvent ? openEvent.instanceId : null,
    title: preset.title,
    description: preset.description,
    category: openEvent ? openEvent.category : preset.category,
    severity: openEvent ? openEvent.severity : preset.severity,
    options: openEvent && Array.isArray(openEvent.options) ? openEvent.options.slice() : preset.options.slice(),
    hasRawI18nKey: false,
    source: 'event-system-runtime-bridge',
  };
}

function createEventCenterPilotBlockedResult(reason, errors, extra) {
  return {
    ok: false,
    mode: 'event-center-v2-resolve-pilot',
    eventId: EVENT_CENTER_V2_PILOT_EVENT_ID,
    reason: String(reason || 'blocked'),
    v1CanWrite: false,
    v1Wrote: false,
    v2Resolved: false,
    usedProductiveStorage: false,
    productiveWrite: false,
    warnings: [],
    errors: [String(reason || 'blocked')].concat(Array.isArray(errors) ? errors.slice() : []),
    diagnostics: createDiagnostics(),
    ...(isPlainObject(extra) ? extra : {}),
  };
}

function findEventCenterV2PilotOpenEvent(state) {
  const eventV2 = isPlainObject(state) && isPlainObject(state.eventV2) ? state.eventV2 : null;
  const openEvents = eventV2 && Array.isArray(eventV2.openEvents) ? eventV2.openEvents : [];
  return openEvents.find((entry) => {
    if (!isPlainObject(entry)) return false;
    const eventId = String(entry.eventId || '');
    const activationApi = getEventV2ActivationRegistryApi();
    const runtimeEnabled = activationApi && typeof activationApi.isEventV2RuntimeEnabled === 'function'
      ? activationApi.isEventV2RuntimeEnabled(eventId) === true
      : EVENT_CENTER_V2_PILOT_EVENT_IDS.includes(eventId);
    if (!runtimeEnabled) return false;
    return ['preview', 'queued', 'active'].includes(String(entry.status || ''));
  }) || null;
}

function clampPilotStatusValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function readPilotStatusTarget(state, target) {
  if (!isPlainObject(state) || !isPlainObject(state.status)) return null;
  if (typeof target !== 'string' || !target.startsWith('status.')) return null;
  const key = target.slice('status.'.length);
  if (!key) return null;
  return clampPilotStatusValue(state.status[key]);
}

function writePilotStatusTarget(state, target, value) {
  if (!isPlainObject(state)) return false;
  state.status = isPlainObject(state.status) ? state.status : {};
  if (typeof target !== 'string' || !target.startsWith('status.')) return false;
  const key = target.slice('status.'.length);
  if (!key) return false;
  state.status[key] = clampPilotStatusValue(value);
  return true;
}

function hasAppliedPilotDeltaForInstance(state, instanceId) {
  const eventV2 = isPlainObject(state) && isPlainObject(state.eventV2) ? state.eventV2 : null;
  const history = eventV2 && Array.isArray(eventV2.history) ? eventV2.history : [];
  return history.some((entry) => {
    if (!isPlainObject(entry)) return false;
    if (String(entry.instanceId || '') !== String(instanceId || '')) return false;
    return isPlainObject(entry.appliedDelta) && entry.appliedDelta.applied === true;
  });
}

function createNotAppliedPilotDelta(reason, eventId, selectedOption, now, extra) {
  const safeExtra = isPlainObject(extra) ? extra : {};
  return {
    applied: false,
    appliedAt: null,
    source: EVENT_CENTER_V2_APPLY_DELTA_PILOT_SOURCE,
    eventId,
    selectedOption,
    reason: String(reason || 'not_applied'),
    deltas: [],
    checkedAt: now,
    ...safeExtra,
  };
}

function getEventV2OutcomePolicyApi() {
  if (OutcomePolicyApi && typeof OutcomePolicyApi.resolveEventV2OutcomePolicy === 'function') {
    return OutcomePolicyApi;
  }
  if (typeof window !== 'undefined' && window.GrowSimEventV2OutcomePolicy && typeof window.GrowSimEventV2OutcomePolicy.resolveEventV2OutcomePolicy === 'function') {
    return window.GrowSimEventV2OutcomePolicy;
  }
  return null;
}

function applyEventCenterV2PilotDelta(state, openEvent, selectedOption, resolveApply, now) {
  const eventId = String(openEvent && openEvent.eventId || '');
  const option = String(selectedOption || '');
  const outcomePolicyApi = getEventV2OutcomePolicyApi();
  if (!outcomePolicyApi) {
    return {
      ok: false,
      appliedDelta: createNotAppliedPilotDelta('outcome_policy_api_missing', eventId, option, now),
      stateMutations: 0,
      warnings: [],
      errors: ['outcome_policy_api_missing'],
    };
  }

  const resolvedPolicy = outcomePolicyApi.resolveEventV2OutcomePolicy(eventId, option, {
    now,
    source: EVENT_CENTER_V2_APPLY_DELTA_PILOT_SOURCE,
  });
  if (!resolvedPolicy || resolvedPolicy.ok !== true || !resolvedPolicy.policy) {
    return {
      ok: true,
      appliedDelta: createNotAppliedPilotDelta(
        resolvedPolicy && resolvedPolicy.reason ? resolvedPolicy.reason : 'option_not_enabled_for_apply_delta_pilot',
        eventId,
        option,
        now
      ),
      stateMutations: 0,
      warnings: [],
      errors: [],
    };
  }

  const policyMode = String(resolvedPolicy.policy.mode || '');

  if (policyMode === 'apply_delta' && hasAppliedPilotDeltaForInstance(state, openEvent && openEvent.instanceId)) {
    return {
      ok: false,
      appliedDelta: createNotAppliedPilotDelta('delta_already_applied_for_instance', eventId, option, now),
      stateMutations: 0,
      warnings: [],
      errors: ['delta_already_applied_for_instance'],
    };
  }

  const applyResult = outcomePolicyApi.applyEventV2OutcomePolicyToState(state, resolvedPolicy.policy, {
    now,
    source: EVENT_CENTER_V2_APPLY_DELTA_PILOT_SOURCE,
    eventId,
    selectedOption: option,
    resolveApply: resolveApply && resolveApply.previewResult ? resolveApply.previewResult : null,
  });

  if (!applyResult || applyResult.ok !== true) {
    return {
      ok: false,
      appliedDelta: applyResult && applyResult.appliedDelta
        ? cloneJson(applyResult.appliedDelta)
        : createNotAppliedPilotDelta('outcome_policy_apply_failed', eventId, option, now),
      stateMutations: 0,
      warnings: [],
      errors: applyResult && Array.isArray(applyResult.errors) ? applyResult.errors.slice() : ['outcome_policy_apply_failed'],
    };
  }

  return {
    ok: true,
    appliedDelta: cloneJson(applyResult.appliedDelta),
    stateMutations: Number(applyResult.stateMutations || 0),
    warnings: [],
    errors: [],
  };
}

function getPilotOptionLabels(eventId) {
  return EVENT_CENTER_PILOT_OPTION_LABELS[eventId] || {};
}

function buildEventCenterV2PilotViewModel(state) {
  const openEvent = findEventCenterV2PilotOpenEvent(state);
  if (!openEvent) {
    return {
      ok: true,
      mode: 'event-center-v2-resolve-pilot',
      hasPilotEvent: false,
      eventId: EVENT_CENTER_V2_PILOT_EVENT_ID,
      warnings: [],
      errors: [],
    };
  }

  const preset = getEventPreset(openEvent.eventId);
  const labels = getPilotOptionLabels(preset.eventId);
  const options = (Array.isArray(openEvent.options) ? openEvent.options : preset.options)
    .filter((optionId) => preset.options.includes(String(optionId)))
    .map((optionId) => ({
      id: String(optionId),
      label: labels[String(optionId)] || String(optionId),
    }));

  return {
    ok: true,
    mode: 'event-center-v2-resolve-pilot',
    hasPilotEvent: true,
    eventId: preset.eventId,
    instanceId: openEvent.instanceId,
    title: openEvent.previewPayload && openEvent.previewPayload.title
      ? String(openEvent.previewPayload.title)
      : preset.title,
    description: openEvent.previewPayload && openEvent.previewPayload.description
      ? String(openEvent.previewPayload.description)
      : preset.description,
    category: String(openEvent.category || preset.category),
    severity: String(openEvent.severity || preset.severity),
    status: String(openEvent.status || 'active'),
    options,
    noRawI18nKeys: true,
    source: 'event-center-v2-resolve-pilot',
    warnings: [],
    errors: [],
  };
}

function prepareEventCenterV2PilotOpenEvent(state, options) {
  const safeOptions = isPlainObject(options) ? options : {};
  const requestedEventId = typeof safeOptions.eventId === 'string'
    ? String(safeOptions.eventId).trim()
    : EVENT_CENTER_V2_PILOT_EVENT_ID;
  const activationApi = getEventV2ActivationRegistryApi();
  const runtimeEnabled = activationApi && typeof activationApi.isEventV2RuntimeEnabled === 'function'
    ? activationApi.isEventV2RuntimeEnabled(requestedEventId) === true
    : EVENT_CENTER_V2_PILOT_EVENT_IDS.includes(requestedEventId);
  const pilotEventId = runtimeEnabled ? requestedEventId : EVENT_CENTER_V2_PILOT_EVENT_ID;
  const init = ensureEventV2StateInPlace(state, {
    eventSystemMode: DEFAULT_CUTOVER_MODE,
    mode: 'active',
  });
  if (!init.ok) {
    return createEventCenterPilotBlockedResult('event_v2_init_failed', init.errors);
  }
  const existing = findEventCenterV2PilotOpenEvent(state);
  if (existing) {
    return {
      ok: true,
      mode: 'event-center-v2-resolve-pilot',
      eventId: EVENT_CENTER_V2_PILOT_EVENT_ID,
      created: false,
      openEvent: cloneJson(existing),
      usedProductiveStorage: false,
      productiveWrite: false,
      warnings: [],
      errors: [],
      diagnostics: createDiagnostics(),
    };
  }

  const context = createEventSystemRuntimeBridgeContext({
    eventSystemMode: DEFAULT_CUTOVER_MODE,
    eventId: pilotEventId,
    now: Number.isFinite(Number(safeOptions.now)) ? Number(safeOptions.now) : Date.now(),
    state,
    permissions: {
      allowV2ActiveWriteAuthority: true,
    },
  });
  const openEvent = {
    ...createV2OpenEvent(context),
    instanceId: safeOptions.instanceId
      ? String(safeOptions.instanceId)
      : `evt_v2_event_center_pilot_${pilotEventId}_001`,
    source: 'event-center-v2-resolve-pilot',
    status: 'active',
  };

  state.eventV2.openEvents = [openEvent].concat(Array.isArray(state.eventV2.openEvents) ? state.eventV2.openEvents : []);
  state.eventV2.meta.lastGeneratedAt = openEvent.createdAt;
  state.eventV2.meta.counters = isPlainObject(state.eventV2.meta.counters) ? state.eventV2.meta.counters : {};
  state.eventV2.meta.counters.generated = Number(state.eventV2.meta.counters.generated || 0) + 1;

  return {
    ok: true,
    mode: 'event-center-v2-resolve-pilot',
    eventId: EVENT_CENTER_V2_PILOT_EVENT_ID,
    created: true,
    openEvent: cloneJson(openEvent),
    usedProductiveStorage: false,
    productiveWrite: false,
    warnings: [],
    errors: [],
    diagnostics: createDiagnostics({ stateMutations: 1 }),
  };
}

function resolveEventCenterV2PilotEvent(state, optionId, options) {
  const safeOptions = isPlainObject(options) ? options : {};
  const beforeV1HistoryLength = isPlainObject(state) && isPlainObject(state.events) && Array.isArray(state.events.history)
    ? state.events.history.length
    : 0;
  const init = ensureEventV2StateInPlace(state, {
    eventSystemMode: DEFAULT_CUTOVER_MODE,
    mode: 'active',
  });
  if (!init.ok) {
    return createEventCenterPilotBlockedResult('event_v2_init_failed', init.errors);
  }

  const openEvent = findEventCenterV2PilotOpenEvent(state);
  if (!openEvent) {
    return createEventCenterPilotBlockedResult('pilot_open_event_missing');
  }
  const authority = consultBrowserRuntimeBridge(state, {
    eventSystemMode: DEFAULT_CUTOVER_MODE,
    now: Number.isFinite(Number(safeOptions.now)) ? Number(safeOptions.now) : Date.now(),
    eventId: String(openEvent.eventId || EVENT_CENTER_V2_PILOT_EVENT_ID),
  });
  if (!authority.ok || authority.activeEventSystem !== 'v2' || authority.v1CanWriteEvents === true || authority.v2CanWriteEvents !== true) {
    return createEventCenterPilotBlockedResult('write_gate_blocked', authority.errors, { authority });
  }
  const preset = getEventPreset(openEvent.eventId);
  const selectedOption = String(optionId || '');
  if (!preset.options.includes(selectedOption) || !(Array.isArray(openEvent.options) && openEvent.options.includes(selectedOption))) {
    return createEventCenterPilotBlockedResult('unsupported_pilot_option', [`unsupported_option:${selectedOption || 'missing'}`], {
      selectedOption,
    });
  }

  const eventVersion = Number(openEvent.eventVersion || openEvent.catalogVersion || EVENT_VERSION_BY_ID[preset.eventId] || 3);
  let resolveApply = evaluateResolveApplyContract({
    eventId: preset.eventId,
    optionId: selectedOption,
    eventVersion,
    requestedWriteMode: 'no_write',
    currentState: state,
  });
  if (!resolveApply.ok) {
    const activationApi = getEventV2ActivationRegistryApi();
    const runtimeEnabled = activationApi && typeof activationApi.isEventV2RuntimeEnabled === 'function'
      ? activationApi.isEventV2RuntimeEnabled(preset.eventId) === true
      : false;
    if (!runtimeEnabled || EVENT_PRESETS[preset.eventId]) {
      return createEventCenterPilotBlockedResult('resolve_apply_blocked', resolveApply.errors, { resolveApply });
    }
    resolveApply = {
      ok: true,
      errors: [],
      expectedMutations: [],
      previewResult: {
        expectedQuality: 'review_only',
        expectedStatusMutation: false,
        note: 'catalog_resolve_preview_fallback',
      },
    };
  }

  const now = Number.isFinite(Number(safeOptions.now)) ? Number(safeOptions.now) : Date.now();
  const appliedDeltaResult = applyEventCenterV2PilotDelta(state, openEvent, selectedOption, resolveApply, now);
  if (!appliedDeltaResult.ok) {
    return createEventCenterPilotBlockedResult('apply_delta_blocked', appliedDeltaResult.errors, {
      appliedDelta: cloneJson(appliedDeltaResult.appliedDelta),
    });
  }

  const historyEntry = {
    eventId: preset.eventId,
    instanceId: openEvent.instanceId,
    resolvedAt: now,
    selectedOption,
    result: resolveApply.previewResult && resolveApply.previewResult.expectedQuality
      ? String(resolveApply.previewResult.expectedQuality)
      : 'pilot-preview',
    applyPreview: cloneJson(resolveApply.previewResult || {}),
    appliedDelta: cloneJson(appliedDeltaResult.appliedDelta),
    writeMode: 'active',
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    source: 'event-center-v2-resolve-pilot',
  };

  state.eventV2.openEvents = (Array.isArray(state.eventV2.openEvents) ? state.eventV2.openEvents : [])
    .filter((entry) => !(entry && entry.instanceId === openEvent.instanceId));
  state.eventV2.history = [historyEntry].concat(Array.isArray(state.eventV2.history) ? state.eventV2.history : []);
  state.eventV2.meta.lastResolvedAt = now;
  state.eventV2.meta.lastAuditAt = now;
  state.eventV2.meta.counters = isPlainObject(state.eventV2.meta.counters) ? state.eventV2.meta.counters : {};
  state.eventV2.meta.counters.resolved = Number(state.eventV2.meta.counters.resolved || 0) + 1;

  const saveShape = validateEventV2SaveShape(state.eventV2);
  const afterV1HistoryLength = isPlainObject(state.events) && Array.isArray(state.events.history)
    ? state.events.history.length
    : 0;
  const v1Wrote = afterV1HistoryLength !== beforeV1HistoryLength;

  return {
    ok: saveShape.ok && !v1Wrote,
    mode: 'event-center-v2-resolve-pilot',
    eventId: preset.eventId,
    instanceId: openEvent.instanceId,
    selectedOption,
    v2Resolved: true,
    v1CanWrite: authority.v1CanWriteEvents === true,
    v1Wrote,
    openEventRemaining: Boolean(findEventCenterV2PilotOpenEvent(state)),
    historyEntry: cloneJson(historyEntry),
    applyPreview: cloneJson(resolveApply.previewResult || {}),
    appliedDelta: cloneJson(appliedDeltaResult.appliedDelta),
    applyDeltaAppliedToStatus: appliedDeltaResult.appliedDelta.applied === true,
    applyDeltaStoredAsPilotPreview: appliedDeltaResult.appliedDelta.applied !== true,
    saveShape: {
      ok: saveShape.ok,
      errors: saveShape.errors.slice(),
      warnings: saveShape.warnings.slice(),
    },
    authority,
    usedProductiveStorage: false,
    productiveWrite: false,
    warnings: saveShape.warnings.slice(),
    errors: saveShape.errors.slice(),
    diagnostics: createDiagnostics({ stateMutations: 1 + appliedDeltaResult.stateMutations }),
  };
}

function runEventSystemV2CutoverBridge(input) {
  const sourceInput = isPlainObject(input) ? input : {};
  const inputBefore = cloneJson(sourceInput.state || {});
  const context = createEventSystemRuntimeBridgeContext(sourceInput);
  const authority = evaluateEventSystemRuntimeBridge({
    ...sourceInput,
    state: context.state,
    permissions: {
      ...(sourceInput.permissions || {}),
      allowV2ActiveWriteAuthority: sourceInput.permissions && sourceInput.permissions.allowV2ActiveWriteAuthority === true,
    },
  });

  if (!authority.ok) {
    return {
      ...authority,
      eventSystemMode: context.mode,
      state: context.state,
      inputStateMutated: JSON.stringify(inputBefore) !== JSON.stringify(sourceInput.state || {}),
    };
  }

  if (!SUPPORTED_CUTOVER_EVENT_IDS.includes(getEventPreset(context.eventId).eventId)) {
    return createBlockedBridgeResult('unsupported_cutover_event_id');
  }

  const openEvent = createV2OpenEvent(context);
  const workingState = cloneJson(context.state);
  workingState.eventV2.openEvents = [openEvent];
  workingState.eventV2.meta.lastGeneratedAt = context.runtime.now;
  workingState.eventV2.meta.counters.generated += 1;

  const selectedOption = context.selectedOption || getEventPreset(openEvent.eventId).optionId;
  const resolveApply = evaluateResolveApplyContract({
    eventId: openEvent.eventId,
    optionId: selectedOption,
    eventVersion: openEvent.eventVersion,
    requestedWriteMode: 'no_write',
    currentState: workingState,
  });
  if (!resolveApply.ok) {
    return createBlockedBridgeResult('resolve_apply_blocked', resolveApply.errors, {
      eventSystemMode: context.mode,
      authority,
    });
  }

  const historyEntry = {
    eventId: openEvent.eventId,
    instanceId: openEvent.instanceId,
    resolvedAt: context.runtime.now + 30000,
    selectedOption,
    result: 'v2-cutover-preview',
    applyPreview: cloneJson(resolveApply.previewResult || {}),
    writeMode: 'active',
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    source: context.runtime.source,
  };

  workingState.eventV2.openEvents = [];
  workingState.eventV2.history = [historyEntry].concat(Array.isArray(workingState.eventV2.history) ? workingState.eventV2.history : []);
  workingState.eventV2.meta.lastResolvedAt = historyEntry.resolvedAt;
  workingState.eventV2.meta.lastAuditAt = historyEntry.resolvedAt;
  workingState.eventV2.meta.counters.resolved += 1;

  const saveShape = validateEventV2SaveShape(workingState.eventV2);
  const eventCenterPreview = createEventCenterPreviewFromV2(openEvent);
  const inputStateMutated = JSON.stringify(inputBefore) !== JSON.stringify(sourceInput.state || {});

  return {
    ok: saveShape.ok && eventCenterPreview.ok && !inputStateMutated,
    eventSystemMode: context.mode,
    activeEventSystem: 'v2',
    legacyV1ReadFallback: authority.legacyV1ReadFallback,
    v1CanCreateEvents: false,
    v1CanResolveEvents: false,
    v1CanWriteEvents: false,
    v2CanCreateEvents: true,
    v2CanResolveEvents: true,
    v2CanWriteEvents: true,
    createdOpenEvent: openEvent,
    resolvedHistoryEntry: historyEntry,
    state: workingState,
    saveShape: {
      ok: saveShape.ok,
      errors: saveShape.errors.slice(),
      warnings: saveShape.warnings.slice(),
    },
    eventCenterPreview,
    gate: authority.gate,
    safety: {
      wouldWrite: true,
      productiveWrite: false,
      usedProductiveStorage: false,
      mutatedInputState: inputStateMutated,
      productiveCutover: false,
    },
    warnings: authority.warnings.slice(),
    errors: saveShape.errors.slice(),
    diagnostics: createDiagnostics({
      stateMutations: 0,
      saveWrites: 0,
      inputStateMutated,
    }),
  };
}

function consultBrowserRuntimeBridge(state, options) {
  const safeOptions = isPlainObject(options) ? options : {};
  const eventSystemMode = normalizeEventSystemMode(safeOptions.eventSystemMode || DEFAULT_CUTOVER_MODE);
  const init = ensureEventV2StateInPlace(state, {
    eventSystemMode,
    mode: 'active',
  });
  const authority = evaluateEventSystemRuntimeBridge({
    eventSystemMode,
    state,
    now: safeOptions.now,
    eventId: safeOptions.eventId || 'indoor_dry_rootball',
    permissions: {
      allowV2ActiveWriteAuthority: true,
    },
  });

  return {
    ok: init.ok && authority.ok,
    mode: eventSystemMode,
    activeEventSystem: authority.activeEventSystem || 'blocked',
    legacyV1ReadFallback: authority.legacyV1ReadFallback === true,
    v1CanCreateEvents: authority.v1CanCreateEvents === true,
    v1CanResolveEvents: authority.v1CanResolveEvents === true,
    v1CanWriteEvents: authority.v1CanWriteEvents === true,
    v2CanCreateEvents: authority.v2CanCreateEvents === true,
    v2CanResolveEvents: authority.v2CanResolveEvents === true,
    v2CanWriteEvents: authority.v2CanWriteEvents === true,
    eventV2Initialized: init.initialized === true,
    shouldBlockLegacyCreate: authority.activeEventSystem === 'v2',
    shouldBlockLegacyResolve: authority.activeEventSystem === 'v2',
    shouldBlockLegacyWrite: authority.activeEventSystem === 'v2',
    usedProductiveStorage: false,
    productiveWrite: false,
    warnings: (init.warnings || []).concat(authority.warnings || []),
    errors: (init.errors || []).concat(authority.errors || []),
    diagnostics: createDiagnostics(),
  };
}

const api = Object.freeze({
  EVENT_SYSTEM_MODES,
  DEFAULT_CUTOVER_MODE,
  SUPPORTED_CUTOVER_EVENT_IDS,
  createEventSystemRuntimeBridgeContext,
  evaluateEventSystemRuntimeBridge,
  ensureEventV2StateShape,
  ensureEventV2StateInPlace,
  consultBrowserRuntimeBridge,
  buildEventCenterV2PilotViewModel,
  prepareEventCenterV2PilotOpenEvent,
  resolveEventCenterV2PilotEvent,
  createEventCenterPreviewFromV2,
  runEventSystemV2CutoverBridge,
});

if (typeof window !== 'undefined') {
  window.GrowSimEventSystemRuntimeBridge = api;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
