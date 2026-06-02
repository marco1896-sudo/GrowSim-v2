'use strict';

const {
  SUPPORTED_EVENT_ID,
  SUPPORTED_EVENT_VERSION,
  EVENT_VERSION_BY_ID,
  evaluateResolveApplyContract,
} = require('./EventV2ResolveApplyContract.js');
const {
  EVENT_V2_SAVE_SCHEMA_VERSION,
  createEmptyEventV2SaveShape,
  validateEventV2SaveShape,
} = require('./EventV2SaveShapePreview.js');
const {
  evaluateEventV2WriteAuthority,
} = require('./EventV2WriteGatePreview.js');
const {
  serializeEventV2PreviewShape,
  deserializeEventV2PreviewShape,
} = require('./EventV2SaveLoadRoundtripPreview.js');

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

const EVENT_SIMULATION_PRESETS = Object.freeze({
  indoor_dry_rootball: Object.freeze({
    defaultOption: 'stabilize',
    instanceId: 'evt_v2_single_write_sim_indoor_dry_rootball_001',
    category: 'care',
    severity: 'warning',
    options: Object.freeze(['inspect', 'stabilize', 'overreact']),
    branchFixtures: Object.freeze([
      Object.freeze({ branchId: 'recommended', selectedOption: 'stabilize' }),
      Object.freeze({ branchId: 'neutral', selectedOption: 'inspect' }),
      Object.freeze({ branchId: 'overreact', selectedOption: 'overreact' }),
    ]),
  }),
  shared_panic_watering_misread: Object.freeze({
    defaultOption: 'check_weight_before_watering',
    instanceId: 'evt_v2_single_write_sim_shared_panic_watering_misread_001',
    category: 'water',
    severity: 'warning',
    options: Object.freeze([
      'check_weight_before_watering',
      'inspect_rootzone_then_wait',
      'water_on_panic_signal',
    ]),
    branchFixtures: Object.freeze([
      Object.freeze({ branchId: 'recommended', selectedOption: 'check_weight_before_watering' }),
      Object.freeze({ branchId: 'neutral', selectedOption: 'inspect_rootzone_then_wait' }),
      Object.freeze({ branchId: 'negative', selectedOption: 'water_on_panic_signal' }),
    ]),
  }),
});

function getEventSimulationPreset(eventId) {
  const preset = EVENT_SIMULATION_PRESETS[eventId];
  return preset || EVENT_SIMULATION_PRESETS[SUPPORTED_EVENT_ID];
}

function createBlockedResult(context, reason, errors) {
  return {
    ok: false,
    mode: 'dev-only-single-event-write-simulation',
    eventId: context.eventId,
    devFlagRequired: true,
    devFlagEnabled: Boolean(context.permissions.allowDevWriteSimulation),
    gate: {
      ok: false,
      singleAuthority: false,
      gateMode: 'blocked',
      authority: 'blocked',
    },
    simulation: {
      wouldCreateOpenEvent: false,
      wouldResolveOpenEvent: false,
      wouldMoveToHistory: false,
      wouldApplyDelta: false,
      wouldPersistEventV2: false,
    },
    safety: {
      wouldWrite: false,
      productiveWrite: false,
      usedProductiveStorage: false,
      mutatedInputState: false,
      productiveCutover: false,
    },
    saveShape: {
      beforeOk: false,
      afterOk: false,
    },
    roundtrip: {
      ok: false,
      usedProductiveStorage: false,
    },
    warnings: [],
    errors: [reason].concat(Array.isArray(errors) ? errors.slice() : []),
    diagnostics: createDiagnostics(),
  };
}

function createEventV2SingleEventWriteSimulationContext(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const now = Number.isFinite(Number(safeInput.now)) ? Number(safeInput.now) : 1760000000000;
  const baseState = isPlainObject(safeInput.state) ? cloneJson(safeInput.state) : {};
  const eventV2 = isPlainObject(baseState.eventV2)
    ? cloneJson(baseState.eventV2)
    : createEmptyEventV2SaveShape({ mode: 'active' });
  if (typeof safeInput.mode === 'string') {
    eventV2.mode = safeInput.mode;
  } else if (!eventV2.mode) {
    eventV2.mode = 'active';
  }

  const eventId = typeof safeInput.eventId === 'string' ? safeInput.eventId : SUPPORTED_EVENT_ID;
  const preset = getEventSimulationPreset(eventId);

  return {
    mode: 'dev-only-single-event-write-simulation',
    eventId,
    eventVersion: Number.isFinite(Number(safeInput.eventVersion))
      ? Number(safeInput.eventVersion)
      : (EVENT_VERSION_BY_ID[eventId] || SUPPORTED_EVENT_VERSION),
    selectedOption: typeof safeInput.selectedOption === 'string' ? safeInput.selectedOption : preset.defaultOption,
    state: {
      ...baseState,
      eventV2,
      simulation: isPlainObject(baseState.simulation) ? { ...baseState.simulation, simTimeMs: now } : { simTimeMs: now },
      status: isPlainObject(baseState.status) ? { ...baseState.status } : { stress: 25, risk: 21, health: 78 },
      events: isPlainObject(baseState.events) ? { ...baseState.events } : { activeEventId: 'legacy_active_event' },
    },
    runtime: {
      tickId: typeof safeInput.tickId === 'string' ? safeInput.tickId : 'dev-single-write-sim-001',
      now,
      source: 'event-v2-single-event-write-simulation-preview',
      stage: typeof safeInput.stage === 'string' ? safeInput.stage : 'vegetative',
    },
    permissions: {
      allowDevWriteSimulation: safeInput.permissions && safeInput.permissions.allowDevWriteSimulation === true,
      allowProductiveWrite: false,
      allowStorage: false,
      allowRuntimeMutation: false,
      allowV2Active: safeInput.permissions && safeInput.permissions.allowDevWriteSimulation === true,
    },
    gateMode: typeof safeInput.gateMode === 'string' ? safeInput.gateMode : 'v2-active',
    forceV1WriteIntent: Boolean(safeInput.forceV1WriteIntent),
    forceV2WriteIntent: Boolean(safeInput.forceV2WriteIntent),
    allowV1WriteWhenV2Active: Boolean(safeInput.allowV1WriteWhenV2Active),
  };
}

function simulateEventV2OpenEventWrite(context) {
  const preset = getEventSimulationPreset(context.eventId);
  return {
    eventId: context.eventId,
    instanceId: preset.instanceId,
    eventVersion: context.eventVersion,
    createdAt: context.runtime.now,
    stage: context.runtime.stage,
    category: preset.category,
    severity: preset.severity,
    source: context.runtime.source,
    options: preset.options.slice(),
    status: 'preview',
    previewPayload: {
      simulatedWrite: true,
      tickId: context.runtime.tickId,
    },
  };
}

function simulateEventV2ResolveWrite(context, openEvent) {
  const resolveApply = evaluateResolveApplyContract({
    eventId: context.eventId,
    optionId: context.selectedOption,
    eventVersion: context.eventVersion,
    requestedWriteMode: 'no_write',
    currentState: context.state,
  });
  return {
    resolveApply,
    selectedOption: context.selectedOption,
    instanceId: openEvent.instanceId,
  };
}

function simulateEventV2HistoryWrite(context, openEvent, resolveResult) {
  return {
    eventId: context.eventId,
    instanceId: openEvent.instanceId,
    resolvedAt: context.runtime.now + 30000,
    selectedOption: context.selectedOption,
    result: 'preview',
    applyPreview: cloneJson(resolveResult.resolveApply.previewResult || {}),
    writeMode: 'no-write',
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    source: context.runtime.source,
  };
}

function simulateEventV2ApplyDelta(resolveResult) {
  return Array.isArray(resolveResult.resolveApply.expectedMutations)
    ? cloneJson(resolveResult.resolveApply.expectedMutations)
    : [];
}

function simulateEventV2PersistPayload(context, openEvent, historyEntry) {
  return {
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    mode: 'active',
    openEvents: [],
    history: [historyEntry],
    meta: {
      lastGeneratedAt: context.runtime.now,
      lastResolvedAt: context.runtime.now + 30000,
      lastAuditAt: context.runtime.now + 60000,
      lastError: null,
      counters: {
        generated: 1,
        resolved: 1,
        rejected: 0,
        expired: 0,
      },
    },
    simulatedWrites: {
      openEvent: {
        eventId: openEvent.eventId,
        instanceId: openEvent.instanceId,
      },
      history: {
        eventId: historyEntry.eventId,
        instanceId: historyEntry.instanceId,
      },
    },
  };
}

function runEventV2SingleEventWriteSimulationPreview(input) {
  const context = createEventV2SingleEventWriteSimulationContext(input);
  const stateBefore = cloneJson(context.state);
  const errors = [];
  const warnings = [];

  if (context.permissions.allowDevWriteSimulation !== true) {
    return createBlockedResult(context, 'dev_write_simulation_flag_required');
  }

  const preset = getEventSimulationPreset(context.eventId);
  if (!preset) {
    return createBlockedResult(context, 'unsupported_event_id', ['single_event_scope_violation']);
  }

  const saveShapeBefore = validateEventV2SaveShape(context.state.eventV2);
  if (!saveShapeBefore.ok) {
    return createBlockedResult(context, 'save_shape_before_invalid', saveShapeBefore.errors);
  }

  const gate = evaluateEventV2WriteAuthority({
    state: { eventV2: context.state.eventV2 },
    gateMode: context.gateMode,
    allowV2ActiveWriteAuthority: context.permissions.allowV2Active,
    forceV1WriteIntent: context.forceV1WriteIntent,
    forceV2WriteIntent: context.forceV2WriteIntent,
    allowV1WriteWhenV2Active: context.allowV1WriteWhenV2Active,
  });
  if (!gate.ok) {
    return createBlockedResult(context, 'write_gate_blocked', gate.errors);
  }
  if (gate.authority !== 'v2' || gate.singleAuthority !== true) {
    return createBlockedResult(context, 'v2_single_authority_required');
  }

  const openEvent = simulateEventV2OpenEventWrite(context);
  const resolveResult = simulateEventV2ResolveWrite(context, openEvent);
  if (!resolveResult.resolveApply.ok) {
    return createBlockedResult(context, 'resolve_apply_rejected', resolveResult.resolveApply.errors);
  }

  const historyEntry = simulateEventV2HistoryWrite(context, openEvent, resolveResult);
  const applyDelta = simulateEventV2ApplyDelta(resolveResult);
  const persistPayload = simulateEventV2PersistPayload(context, openEvent, historyEntry);
  const saveShapeAfter = validateEventV2SaveShape(persistPayload);
  if (!saveShapeAfter.ok) {
    return createBlockedResult(context, 'save_shape_after_invalid', saveShapeAfter.errors);
  }

  const serialized = serializeEventV2PreviewShape(persistPayload);
  const deserialized = serialized.ok ? deserializeEventV2PreviewShape(serialized.serialized) : null;
  const roundtrip = serialized.ok && deserialized && deserialized.ok
    ? {
      ok: validateEventV2SaveShape(deserialized.shape).ok
        && deserialized.shape.schemaVersion === persistPayload.schemaVersion
        && deserialized.shape.mode === persistPayload.mode
        && Array.isArray(deserialized.shape.history)
        && deserialized.shape.history.length === 1
        && deserialized.shape.history[0].eventId === context.eventId
        && deserialized.shape.history[0].instanceId === historyEntry.instanceId,
      usedProductiveStorage: false,
      errors: [],
    }
    : { ok: false, errors: ['roundtrip_failed'], usedProductiveStorage: false };
  if (!roundtrip.ok) {
    return createBlockedResult(context, 'roundtrip_invalid', roundtrip.errors);
  }

  const stateAfter = cloneJson(context.state);
  const mutatedInputState = JSON.stringify(stateBefore) !== JSON.stringify(stateAfter);
  if (mutatedInputState) {
    errors.push('input_state_mutated');
  }

  return {
    ok: errors.length === 0,
    mode: 'dev-only-single-event-write-simulation',
    eventId: context.eventId,
    devFlagRequired: true,
    devFlagEnabled: true,
    gate: {
      ok: gate.ok,
      singleAuthority: gate.singleAuthority === true,
      gateMode: gate.gateMode,
      authority: gate.authority,
    },
    simulation: {
      wouldCreateOpenEvent: true,
      wouldResolveOpenEvent: true,
      wouldMoveToHistory: true,
      wouldApplyDelta: applyDelta.length > 0,
      wouldPersistEventV2: true,
      openEvent,
      historyEntry,
      applyDelta,
      persistPayload,
    },
    safety: {
      wouldWrite: true,
      productiveWrite: false,
      usedProductiveStorage: false,
      mutatedInputState,
      productiveCutover: false,
    },
    saveShape: {
      beforeOk: saveShapeBefore.ok,
      afterOk: saveShapeAfter.ok,
    },
    roundtrip: {
      ok: roundtrip.ok,
      usedProductiveStorage: false,
    },
    warnings,
    errors,
    diagnostics: createDiagnostics(),
  };
}

function createEventV2ResolveBranchFixtures() {
  return getEventSimulationPreset(SUPPORTED_EVENT_ID).branchFixtures.map((entry) => Object.freeze({
    branchId: entry.branchId,
    selectedOption: entry.selectedOption,
  }));
}

function createEventV2ResolveBranchFixturesForEvent(eventId) {
  const preset = getEventSimulationPreset(eventId);
  return preset.branchFixtures.map((entry) => Object.freeze({
    branchId: entry.branchId,
    selectedOption: entry.selectedOption,
  }));
}

function runEventV2SingleBranchWriteSimulation(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const result = runEventV2SingleEventWriteSimulationPreview({
    ...safeInput,
    selectedOption: safeInput.selectedOption,
  });

  const branchId = typeof safeInput.branchId === 'string' ? safeInput.branchId : 'branch';
  const selectedOption = typeof safeInput.selectedOption === 'string' ? safeInput.selectedOption : null;
  const applyPreview = result && result.simulation && result.simulation.historyEntry
    ? cloneJson(result.simulation.historyEntry.applyPreview)
    : null;

  return {
    ok: Boolean(result && result.ok),
    eventId: result && result.eventId ? result.eventId : safeInput.eventId || SUPPORTED_EVENT_ID,
    branchId,
    selectedOption,
    simulation: result && result.simulation
      ? {
        wouldCreateOpenEvent: Boolean(result.simulation.wouldCreateOpenEvent),
        wouldResolveOpenEvent: Boolean(result.simulation.wouldResolveOpenEvent),
        wouldMoveToHistory: Boolean(result.simulation.wouldMoveToHistory),
        wouldApplyDelta: Boolean(result.simulation.wouldApplyDelta),
        wouldPersistEventV2: Boolean(result.simulation.wouldPersistEventV2),
      }
      : {
        wouldCreateOpenEvent: false,
        wouldResolveOpenEvent: false,
        wouldMoveToHistory: false,
        wouldApplyDelta: false,
        wouldPersistEventV2: false,
      },
    applyPreview: {
      ok: Boolean(result && result.ok && applyPreview),
      deltas: result && result.simulation && Array.isArray(result.simulation.applyDelta)
        ? cloneJson(result.simulation.applyDelta)
        : [],
      payload: applyPreview,
    },
    historyPreview: {
      ok: Boolean(result && result.ok && result.simulation && result.simulation.historyEntry),
      selectedOption,
      result: result && result.simulation && result.simulation.historyEntry
        ? String(result.simulation.historyEntry.result || 'preview')
        : null,
    },
    persistPayload: {
      ok: Boolean(result && result.ok && result.simulation && result.simulation.persistPayload),
      payload: result && result.simulation && result.simulation.persistPayload
        ? cloneJson(result.simulation.persistPayload)
        : null,
    },
    safety: result && result.safety ? cloneJson(result.safety) : {
      wouldWrite: false,
      productiveWrite: false,
      usedProductiveStorage: false,
      mutatedInputState: false,
      productiveCutover: false,
    },
    saveShape: result && result.saveShape ? cloneJson(result.saveShape) : { beforeOk: false, afterOk: false },
    roundtrip: result && result.roundtrip ? cloneJson(result.roundtrip) : { ok: false, usedProductiveStorage: false },
    warnings: result && Array.isArray(result.warnings) ? result.warnings.slice() : [],
    errors: result && Array.isArray(result.errors) ? result.errors.slice() : ['branch_result_missing'],
    rawResult: result,
  };
}

function validateEventV2ResolveBranchSimulationResult(result) {
  const safe = isPlainObject(result) ? result : {};
  const errors = [];

  if (!safe.branchId) errors.push('missing_branch_id');
  if (!safe.selectedOption) errors.push('missing_selected_option');
  if (!safe.simulation || safe.simulation.wouldPersistEventV2 !== true) errors.push('simulation_missing_or_invalid');
  if (!safe.applyPreview || safe.applyPreview.ok !== true) errors.push('apply_preview_invalid');
  if (!safe.historyPreview || safe.historyPreview.ok !== true) errors.push('history_preview_invalid');
  if (!safe.persistPayload || safe.persistPayload.ok !== true) errors.push('persist_payload_invalid');
  if (!safe.saveShape || safe.saveShape.beforeOk !== true || safe.saveShape.afterOk !== true) errors.push('save_shape_invalid');
  if (!safe.roundtrip || safe.roundtrip.ok !== true) errors.push('roundtrip_invalid');
  if (!safe.safety || safe.safety.productiveWrite !== false) errors.push('productive_write_must_be_false');
  if (!safe.safety || safe.safety.usedProductiveStorage !== false) errors.push('productive_storage_must_be_false');
  if (!safe.safety || safe.safety.mutatedInputState !== false) errors.push('input_state_mutated');

  return {
    ok: errors.length === 0,
    errors,
  };
}

function summarizeEventV2ResolveBranchSimulation(results, eventId) {
  const list = Array.isArray(results) ? results : [];
  const validated = list.map((entry) => ({
    branch: entry,
    validation: validateEventV2ResolveBranchSimulationResult(entry),
  }));
  const passedBranches = validated.filter((entry) => entry.validation.ok).length;
  const failedBranches = validated.length - passedBranches;
  const warnings = [];
  const errors = [];

  validated.forEach((entry) => {
    if (!entry.validation.ok) {
      errors.push(`${entry.branch.branchId || 'branch'}:invalid`);
      entry.validation.errors.forEach((error) => errors.push(`${entry.branch.branchId || 'branch'}:${error}`));
    }
  });

  return {
    ok: failedBranches === 0,
    eventId: eventId || SUPPORTED_EVENT_ID,
    branchCount: validated.length,
    passedBranches,
    failedBranches,
    safety: {
      allNoProductiveWrite: validated.every((entry) => entry.branch && entry.branch.safety && entry.branch.safety.productiveWrite === false),
      allNoProductiveStorage: validated.every((entry) => entry.branch && entry.branch.safety && entry.branch.safety.usedProductiveStorage === false),
      allNoInputMutation: validated.every((entry) => entry.branch && entry.branch.safety && entry.branch.safety.mutatedInputState === false),
    },
    branches: validated.map((entry) => ({
      branchId: entry.branch.branchId,
      ok: entry.validation.ok,
      selectedOption: entry.branch.selectedOption,
      deltaCount: entry.branch.applyPreview && Array.isArray(entry.branch.applyPreview.deltas) ? entry.branch.applyPreview.deltas.length : 0,
    })),
    warnings,
    errors,
  };
}

function runEventV2MultiResolveBranchWriteSimulation(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const targetEventId = typeof safeInput.eventId === 'string' ? safeInput.eventId : SUPPORTED_EVENT_ID;
  const fixtures = Array.isArray(safeInput.branches) && safeInput.branches.length > 0
    ? safeInput.branches
    : createEventV2ResolveBranchFixturesForEvent(targetEventId);

  const branchResults = fixtures.map((fixture) => runEventV2SingleBranchWriteSimulation({
    ...safeInput,
    branchId: fixture.branchId,
    selectedOption: fixture.selectedOption,
  }));
  const summary = summarizeEventV2ResolveBranchSimulation(branchResults, targetEventId);

  return {
    ok: summary.ok,
    mode: 'dev-only-multi-resolve-branch-write-simulation',
    eventId: summary.eventId,
    branchCount: summary.branchCount,
    passedBranches: summary.passedBranches,
    failedBranches: summary.failedBranches,
    safety: cloneJson(summary.safety),
    branches: branchResults.map((entry) => ({
      branchId: entry.branchId,
      ok: entry.ok,
      selectedOption: entry.selectedOption,
      simulation: cloneJson(entry.simulation),
      applyPreview: cloneJson(entry.applyPreview),
      historyPreview: cloneJson(entry.historyPreview),
      persistPayload: cloneJson(entry.persistPayload),
      saveShape: cloneJson(entry.saveShape),
      roundtrip: cloneJson(entry.roundtrip),
      safety: cloneJson(entry.safety),
      warnings: entry.warnings.slice(),
      errors: entry.errors.slice(),
    })),
    warnings: summary.warnings.slice(),
    errors: summary.errors.slice(),
  };
}

module.exports = Object.freeze({
  createEventV2SingleEventWriteSimulationContext,
  simulateEventV2OpenEventWrite,
  simulateEventV2ResolveWrite,
  simulateEventV2HistoryWrite,
  simulateEventV2ApplyDelta,
  simulateEventV2PersistPayload,
  runEventV2SingleEventWriteSimulationPreview,
  createEventV2ResolveBranchFixtures,
  createEventV2ResolveBranchFixturesForEvent,
  runEventV2SingleBranchWriteSimulation,
  runEventV2MultiResolveBranchWriteSimulation,
  validateEventV2ResolveBranchSimulationResult,
  summarizeEventV2ResolveBranchSimulation,
});
