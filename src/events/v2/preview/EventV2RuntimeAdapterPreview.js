'use strict';

const {
  SUPPORTED_EVENT_ID,
  SUPPORTED_EVENT_VERSION,
  evaluateResolveApplyContract,
} = require('./EventV2ResolveApplyContract.js');
const {
  EVENT_V2_SAVE_SCHEMA_VERSION,
  createEmptyEventV2SaveShape,
  validateEventV2SaveShape,
} = require('./EventV2SaveShapePreview.js');
const {
  serializeEventV2PreviewShape,
  deserializeEventV2PreviewShape,
  validateEventV2Roundtrip,
} = require('./EventV2SaveLoadRoundtripPreview.js');
const {
  evaluateEventV2WriteAuthority,
} = require('./EventV2WriteGatePreview.js');

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

function createEventV2RuntimePreviewContext(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const now = typeof safeInput.now === 'number' ? safeInput.now : 1760000000000;
  const baseState = isPlainObject(safeInput.state) ? cloneJson(safeInput.state) : {};
  const eventV2Shape = isPlainObject(baseState.eventV2)
    ? cloneJson(baseState.eventV2)
    : createEmptyEventV2SaveShape({ mode: 'dry-run' });
  const selectedOption = typeof safeInput.selectedOption === 'string' ? safeInput.selectedOption : 'stabilize';

  return {
    mode: 'dev-only-runtime-preview',
    eventId: typeof safeInput.eventId === 'string' ? safeInput.eventId : SUPPORTED_EVENT_ID,
    eventVersion: Number.isFinite(Number(safeInput.eventVersion)) ? Number(safeInput.eventVersion) : SUPPORTED_EVENT_VERSION,
    selectedOption,
    state: {
      ...baseState,
      eventV2: eventV2Shape,
      simulation: isPlainObject(baseState.simulation)
        ? { ...baseState.simulation, simTimeMs: now }
        : { simTimeMs: now },
      status: isPlainObject(baseState.status)
        ? { ...baseState.status }
        : { stress: 24, risk: 20, health: 78 },
      events: isPlainObject(baseState.events)
        ? { ...baseState.events }
        : { activeEventId: 'legacy_event_runtime_authority' },
    },
    runtime: {
      tickId: typeof safeInput.tickId === 'string' ? safeInput.tickId : 'dev-runtime-preview-001',
      now,
      stage: typeof safeInput.stage === 'string' ? safeInput.stage : 'vegetative',
      source: 'event-v2-runtime-adapter-preview',
    },
    permissions: {
      allowProductiveWrite: false,
      allowV2Active: Boolean(safeInput.allowV2Active === true),
      allowStorage: false,
    },
    gateMode: typeof safeInput.gateMode === 'string' ? safeInput.gateMode : null,
  };
}

function prepareEventV2RuntimePreviewEvent(contextInput) {
  const context = createEventV2RuntimePreviewContext(contextInput);
  const openEvent = {
    eventId: context.eventId,
    instanceId: 'evt_v2_runtime_preview_indoor_dry_rootball_001',
    eventVersion: context.eventVersion,
    createdAt: context.runtime.now,
    stage: context.runtime.stage,
    category: 'care',
    severity: 'warning',
    source: context.runtime.source,
    options: ['inspect', 'stabilize', 'overreact'],
    status: 'preview',
    previewPayload: {
      runtimeTickId: context.runtime.tickId,
      noWrite: true,
    },
  };

  return {
    ok: true,
    mode: context.mode,
    context,
    openEvent,
    wouldWrite: false,
    usedProductiveStorage: false,
    warnings: [],
    errors: [],
    diagnostics: createDiagnostics(),
  };
}

function runEventV2RuntimeResolvePreview(contextInput) {
  const prepared = prepareEventV2RuntimePreviewEvent(contextInput);
  const context = prepared.context;
  const initialShape = {
    ...cloneJson(context.state.eventV2),
    openEvents: [prepared.openEvent],
  };
  const saveShapeBefore = validateEventV2SaveShape(initialShape);
  const gate = evaluateEventV2WriteAuthority({
    state: { eventV2: initialShape },
    gateMode: context.gateMode,
    allowV2ActiveWriteAuthority: context.permissions.allowV2Active,
  });

  const errors = [];
  const warnings = [];
  if (!saveShapeBefore.ok) {
    errors.push('save_shape_before_invalid');
    saveShapeBefore.errors.forEach((entry) => errors.push(entry));
  }
  if (!gate.ok) {
    errors.push('write_gate_blocked');
    gate.errors.forEach((entry) => errors.push(entry));
  }

  let resolveApply = null;
  if (gate.ok) {
    resolveApply = evaluateResolveApplyContract({
      eventId: context.eventId,
      optionId: context.selectedOption,
      eventVersion: context.eventVersion,
      requestedWriteMode: 'no_write',
      currentState: context.state,
    });
    if (!resolveApply.ok) {
      errors.push('resolve_apply_rejected');
      resolveApply.errors.forEach((entry) => errors.push(entry));
    }
  }

  const historyEntry = resolveApply && resolveApply.ok
    ? {
      eventId: context.eventId,
      instanceId: prepared.openEvent.instanceId,
      resolvedAt: context.runtime.now + 30000,
      selectedOption: context.selectedOption,
      result: 'preview',
      applyPreview: cloneJson(resolveApply.previewResult || {}),
      writeMode: 'no-write',
      schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
      source: context.runtime.source,
    }
    : null;

  const previewShapeAfter = {
    ...cloneJson(initialShape),
    history: historyEntry ? [historyEntry] : [],
    meta: {
      ...(isPlainObject(initialShape.meta) ? initialShape.meta : {}),
      lastGeneratedAt: context.runtime.now,
      lastResolvedAt: historyEntry ? context.runtime.now + 30000 : null,
      lastAuditAt: context.runtime.now + 60000,
      lastError: errors.length > 0 ? errors[0] : null,
    },
  };
  const saveShapeAfter = validateEventV2SaveShape(previewShapeAfter);
  if (!saveShapeAfter.ok) {
    errors.push('save_shape_after_invalid');
    saveShapeAfter.errors.forEach((entry) => errors.push(entry));
  }

  const serialized = serializeEventV2PreviewShape(previewShapeAfter);
  const deserialized = serialized.ok ? deserializeEventV2PreviewShape(serialized.serialized) : null;
  if (!serialized.ok) {
    errors.push('roundtrip_serialize_failed');
    serialized.errors.forEach((entry) => errors.push(entry));
  }
  if (serialized.ok && (!deserialized || !deserialized.ok)) {
    errors.push('roundtrip_deserialize_failed');
    (deserialized && deserialized.errors ? deserialized.errors : ['roundtrip_deserialize_missing']).forEach((entry) => errors.push(entry));
  }

  const roundtrip = serialized.ok && deserialized && deserialized.ok
    ? validateEventV2Roundtrip(previewShapeAfter, deserialized.shape)
    : {
      ok: false,
      wouldWrite: false,
      usedProductiveStorage: false,
      warnings: [],
      errors: ['roundtrip_not_executable'],
    };
  if (!roundtrip.ok) {
    errors.push('roundtrip_validation_failed');
    roundtrip.errors.forEach((entry) => errors.push(entry));
  }

  return {
    ok: errors.length === 0,
    mode: 'dev-only-runtime-preview',
    eventId: context.eventId,
    gate,
    resolveApply,
    saveShape: {
      before: saveShapeBefore,
      after: saveShapeAfter,
    },
    roundtrip: {
      ok: roundtrip.ok,
      usedProductiveStorage: false,
      serialize: serialized,
      deserialize: deserialized,
      validation: roundtrip,
    },
    previewShape: previewShapeAfter,
    wouldWrite: false,
    usedProductiveStorage: false,
    mutatedInputState: false,
    warnings,
    errors,
    diagnostics: createDiagnostics(),
  };
}

function validateEventV2RuntimePreviewResult(result) {
  const safeResult = isPlainObject(result) ? result : {};
  const errors = [];

  if (!safeResult || safeResult.mode !== 'dev-only-runtime-preview') errors.push('invalid_mode');
  if (!isPlainObject(safeResult.gate)) errors.push('missing_gate_result');
  if (!isPlainObject(safeResult.resolveApply)) errors.push('missing_resolve_apply_result');
  if (!isPlainObject(safeResult.saveShape) || !isPlainObject(safeResult.saveShape.before) || !isPlainObject(safeResult.saveShape.after)) {
    errors.push('missing_save_shape_result');
  }
  if (!isPlainObject(safeResult.roundtrip)) errors.push('missing_roundtrip_result');
  if (safeResult.wouldWrite !== false) errors.push('would_write_must_be_false');
  if (safeResult.usedProductiveStorage !== false) errors.push('used_productive_storage_must_be_false');
  if (safeResult.mutatedInputState !== false) errors.push('mutated_input_state_must_be_false');

  return {
    ok: errors.length === 0,
    mode: 'dev-only-runtime-preview-validation',
    wouldWrite: false,
    usedProductiveStorage: false,
    warnings: [],
    errors,
    diagnostics: createDiagnostics(),
  };
}

function runEventV2RuntimeAdapterPreview(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const originalState = isPlainObject(safeInput.state) ? cloneJson(safeInput.state) : {};
  const result = runEventV2RuntimeResolvePreview(safeInput);
  const stateAfter = isPlainObject(safeInput.state) ? cloneJson(safeInput.state) : {};
  const mutatedInputState = JSON.stringify(originalState) !== JSON.stringify(stateAfter);
  const structureValidation = validateEventV2RuntimePreviewResult({
    ...result,
    mutatedInputState,
  });

  const combinedErrors = result.errors.slice();
  structureValidation.errors.forEach((entry) => combinedErrors.push(entry));

  return {
    ...result,
    ok: result.ok && structureValidation.ok && mutatedInputState === false,
    mutatedInputState,
    resultValidation: structureValidation,
    errors: combinedErrors,
    diagnostics: createDiagnostics({
      resultValidationErrors: structureValidation.errors.length,
      mutatedInputState,
    }),
  };
}

module.exports = Object.freeze({
  createEventV2RuntimePreviewContext,
  prepareEventV2RuntimePreviewEvent,
  runEventV2RuntimeResolvePreview,
  validateEventV2RuntimePreviewResult,
  runEventV2RuntimeAdapterPreview,
});

