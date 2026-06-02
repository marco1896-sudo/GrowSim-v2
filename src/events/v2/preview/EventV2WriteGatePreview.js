'use strict';

const {
  validateEventV2SaveShape,
} = require('./EventV2SaveShapePreview.js');

const WRITE_GATE_MODES = Object.freeze(['v1-only', 'v2-preview', 'v2-dry-run', 'v2-active', 'blocked']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  return Boolean(fallback);
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

function deriveGateMode(explicitGateMode, eventV2Mode, hasEventV2) {
  if (typeof explicitGateMode === 'string' && explicitGateMode.trim().length > 0) {
    return explicitGateMode.trim();
  }
  if (!hasEventV2) return 'v1-only';
  if (eventV2Mode === 'no-write') return 'v1-only';
  if (eventV2Mode === 'dry-run') return 'v2-dry-run';
  if (eventV2Mode === 'active') return 'v2-active';
  return 'blocked';
}

function createEventV2WriteGateContext(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const safeState = isPlainObject(safeInput.state) ? safeInput.state : {};
  const eventV2 = isPlainObject(safeState.eventV2) ? safeState.eventV2 : null;
  const hasEventV2 = Boolean(eventV2);
  const eventV2Mode = eventV2 && typeof eventV2.mode === 'string' ? eventV2.mode : null;
  const gateMode = deriveGateMode(safeInput.gateMode, eventV2Mode, hasEventV2);

  const context = {
    mode: 'event_v2_write_gate_preview_context',
    gateMode,
    hasEventV2,
    eventV2Mode,
    eventV2SchemaVersion: eventV2 ? eventV2.schemaVersion : null,
    eventV2Validation: hasEventV2 ? validateEventV2SaveShape(eventV2) : null,
    v1Enabled: toBoolean(safeInput.v1Enabled, true),
    v1WouldWrite: toBoolean(safeInput.v1WouldWrite, true),
    v2PreviewRequested: toBoolean(safeInput.v2PreviewRequested, true),
    v2DryRunRequested: toBoolean(safeInput.v2DryRunRequested, true),
    allowV2ActiveWriteAuthority: toBoolean(safeInput.allowV2ActiveWriteAuthority, false),
    forceV2WriteIntent: toBoolean(safeInput.forceV2WriteIntent, false),
    forceV1WriteIntent: toBoolean(safeInput.forceV1WriteIntent, false),
    allowV1WriteWhenV2Active: toBoolean(safeInput.allowV1WriteWhenV2Active, false),
    reason: typeof safeInput.reason === 'string' ? safeInput.reason : 'unspecified',
    source: typeof safeInput.source === 'string' ? safeInput.source : 'event_v2_write_gate_preview',
  };

  return cloneJson(context);
}

function assertSingleEventWriteAuthority(result) {
  const safeResult = isPlainObject(result) ? result : {};
  const errors = [];
  const writerCount = Number(Boolean(safeResult.v1CanWrite)) + Number(Boolean(safeResult.v2CanWrite));

  if (safeResult.gateMode === 'blocked') {
    return {
      ok: false,
      singleAuthority: false,
      writerCount,
      warnings: [],
      errors: safeResult.errors && safeResult.errors.length > 0 ? safeResult.errors.slice() : ['write_gate_blocked'],
    };
  }

  if (writerCount !== 1) {
    errors.push('single_authority_violation');
  }
  if (safeResult.v1CanWrite && safeResult.v2CanWrite) {
    errors.push('double_write_authority_detected');
  }
  if (!safeResult.v1CanWrite && !safeResult.v2CanWrite) {
    errors.push('no_write_authority_detected');
  }

  return {
    ok: errors.length === 0,
    singleAuthority: errors.length === 0,
    writerCount,
    warnings: [],
    errors,
  };
}

function buildBlockedResult(context, errors, warnings) {
  const collectedErrors = Array.isArray(errors) ? errors.slice() : [];
  const collectedWarnings = Array.isArray(warnings) ? warnings.slice() : [];

  return {
    ok: false,
    authority: 'blocked',
    gateMode: 'blocked',
    v1CanWrite: false,
    v2CanWrite: false,
    v2CanPreview: false,
    v2CanDryRun: false,
    singleAuthority: false,
    wouldWrite: false,
    usedProductiveStorage: false,
    noWriteDefault: true,
    contextSnapshot: cloneJson(context),
    warnings: collectedWarnings,
    errors: collectedErrors,
    diagnostics: createDiagnostics(),
  };
}

function evaluateEventV2WriteAuthority(contextInput) {
  const context = createEventV2WriteGateContext(contextInput);
  const warnings = [];
  const errors = [];

  if (!WRITE_GATE_MODES.includes(context.gateMode)) {
    errors.push('unknown_gate_mode');
    return buildBlockedResult(context, errors, warnings);
  }

  if (context.hasEventV2) {
    if (!context.eventV2Validation || context.eventV2Validation.ok !== true) {
      errors.push('event_v2_shape_invalid');
      if (context.eventV2Validation && Array.isArray(context.eventV2Validation.errors)) {
        context.eventV2Validation.errors.forEach((error) => errors.push(error));
      }
      return buildBlockedResult(context, errors, warnings);
    }
  } else {
    warnings.push('event_v2_missing_fallback_to_v1');
    if (context.gateMode !== 'v1-only') {
      errors.push('event_v2_missing_for_requested_mode');
      return buildBlockedResult(context, errors, warnings);
    }
  }

  let authority = 'v1';
  let v1CanWrite = context.v1Enabled && context.v1WouldWrite;
  let v2CanWrite = false;
  let v2CanPreview = false;
  let v2CanDryRun = false;

  if (context.gateMode === 'v1-only') {
    v2CanPreview = false;
    v2CanDryRun = false;
    v2CanWrite = false;
  } else if (context.gateMode === 'v2-preview') {
    v2CanPreview = context.v2PreviewRequested;
    v2CanDryRun = false;
    v2CanWrite = false;
    authority = 'v1';
  } else if (context.gateMode === 'v2-dry-run') {
    v2CanPreview = true;
    v2CanDryRun = context.v2DryRunRequested;
    v2CanWrite = false;
    authority = 'v1';
  } else if (context.gateMode === 'v2-active') {
    if (!context.allowV2ActiveWriteAuthority) {
      errors.push('v2_active_not_explicitly_allowed');
      return buildBlockedResult(context, errors, warnings);
    }
    if (!context.hasEventV2) {
      errors.push('v2_active_requires_event_v2');
      return buildBlockedResult(context, errors, warnings);
    }
    v2CanPreview = true;
    v2CanDryRun = true;
    v2CanWrite = true;
    authority = 'v2';
    if (!context.allowV1WriteWhenV2Active) {
      v1CanWrite = false;
    }
  } else {
    errors.push('gate_mode_blocked');
    return buildBlockedResult(context, errors, warnings);
  }

  if (context.forceV1WriteIntent) v1CanWrite = true;
  if (context.forceV2WriteIntent) v2CanWrite = true;

  const result = {
    ok: true,
    authority,
    gateMode: context.gateMode,
    v1CanWrite,
    v2CanWrite,
    v2CanPreview,
    v2CanDryRun,
    wouldWrite: false,
    usedProductiveStorage: false,
    noWriteDefault: true,
    contextSnapshot: cloneJson(context),
    warnings,
    errors: [],
    diagnostics: createDiagnostics(),
  };

  const singleAuthorityCheck = assertSingleEventWriteAuthority(result);
  if (!singleAuthorityCheck.ok) {
    const blockedErrors = ['single_authority_conflict'].concat(singleAuthorityCheck.errors || []);
    return buildBlockedResult(context, blockedErrors, warnings);
  }
  result.singleAuthority = true;
  return result;
}

function runEventV2WriteGatePreview(input) {
  const sourceInput = isPlainObject(input) ? input : {};
  const stateBefore = isPlainObject(sourceInput.state) ? cloneJson(sourceInput.state) : {};
  const evaluation = evaluateEventV2WriteAuthority(sourceInput);
  const stateAfter = isPlainObject(sourceInput.state) ? cloneJson(sourceInput.state) : {};
  const stateMutated = JSON.stringify(stateBefore) !== JSON.stringify(stateAfter);

  return {
    ok: evaluation.ok,
    mode: 'event_v2_write_gate_preview',
    wouldWrite: false,
    usedProductiveStorage: false,
    authorityResult: evaluation,
    stateMutated,
    warnings: evaluation.warnings.slice(),
    errors: evaluation.errors.slice(),
    diagnostics: createDiagnostics({
      stateMutated,
    }),
  };
}

module.exports = Object.freeze({
  WRITE_GATE_MODES,
  createEventV2WriteGateContext,
  evaluateEventV2WriteAuthority,
  assertSingleEventWriteAuthority,
  runEventV2WriteGatePreview,
});

