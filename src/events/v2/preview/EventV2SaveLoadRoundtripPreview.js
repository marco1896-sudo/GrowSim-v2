'use strict';

const {
  EVENT_V2_SAVE_SCHEMA_VERSION,
  createEmptyEventV2SaveShape,
  validateEventV2SaveShape,
} = require('./EventV2SaveShapePreview.js');

const ROUNDTRIP_MODE = 'dev-only-roundtrip';

function cloneJson(value) {
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

function createFixtureTimestampBase() {
  return 1760000000000;
}

function createEventV2RoundtripFixture() {
  const baseTime = createFixtureTimestampBase();
  return createEmptyEventV2SaveShape({
    mode: 'dry-run',
    openEvents: [
      {
        eventId: 'indoor_dry_rootball',
        instanceId: 'evt_v2_test_indoor_dry_rootball_001',
        eventVersion: 1,
        createdAt: baseTime,
        stage: 'vegetative',
        category: 'care',
        severity: 'warning',
        source: 'dev-roundtrip-fixture',
        options: ['inspect', 'stabilize', 'overreact'],
        status: 'preview',
        previewPayload: {
          fixture: true,
          noWrite: true,
        },
      },
    ],
    history: [
      {
        eventId: 'indoor_dry_rootball',
        instanceId: 'evt_v2_test_indoor_dry_rootball_001',
        resolvedAt: baseTime + 60000,
        selectedOption: 'stabilize',
        result: 'preview',
        applyPreview: {
          expectedQuality: 'good',
          mutationTargets: ['status.stress', 'status.risk'],
          persisted: false,
        },
        writeMode: 'no-write',
        schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
        source: 'dev-roundtrip-fixture',
      },
    ],
    meta: {
      lastGeneratedAt: baseTime,
      lastResolvedAt: baseTime + 60000,
      lastAuditAt: baseTime + 120000,
      lastError: null,
      counters: {
        generated: 1,
        resolved: 1,
        rejected: 0,
        expired: 0,
      },
    },
  });
}

function serializeEventV2PreviewShape(shape) {
  const validation = validateEventV2SaveShape(shape);
  if (!validation.ok) {
    return {
      ok: false,
      mode: ROUNDTRIP_MODE,
      step: 'serialize',
      wouldWrite: false,
      usedProductiveStorage: false,
      serialized: null,
      warnings: validation.warnings.slice(),
      errors: ['serialize_input_invalid_shape'].concat(validation.errors),
      diagnostics: createDiagnostics(),
    };
  }

  try {
    return {
      ok: true,
      mode: ROUNDTRIP_MODE,
      step: 'serialize',
      wouldWrite: false,
      usedProductiveStorage: false,
      serialized: JSON.stringify(shape),
      warnings: validation.warnings.slice(),
      errors: [],
      diagnostics: createDiagnostics(),
    };
  } catch (error) {
    return {
      ok: false,
      mode: ROUNDTRIP_MODE,
      step: 'serialize',
      wouldWrite: false,
      usedProductiveStorage: false,
      serialized: null,
      warnings: [],
      errors: ['serialize_failed', String(error && error.message ? error.message : error)],
      diagnostics: createDiagnostics(),
    };
  }
}

function deserializeEventV2PreviewShape(serialized) {
  if (typeof serialized !== 'string' || serialized.length === 0) {
    return {
      ok: false,
      mode: ROUNDTRIP_MODE,
      step: 'deserialize',
      wouldWrite: false,
      usedProductiveStorage: false,
      shape: null,
      warnings: [],
      errors: ['deserialize_input_not_string'],
      validation: null,
      diagnostics: createDiagnostics(),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    return {
      ok: false,
      mode: ROUNDTRIP_MODE,
      step: 'deserialize',
      wouldWrite: false,
      usedProductiveStorage: false,
      shape: null,
      warnings: [],
      errors: ['deserialize_invalid_json', String(error && error.message ? error.message : error)],
      validation: null,
      diagnostics: createDiagnostics(),
    };
  }

  const validation = validateEventV2SaveShape(parsed);
  return {
    ok: validation.ok,
    mode: ROUNDTRIP_MODE,
    step: 'deserialize',
    wouldWrite: false,
    usedProductiveStorage: false,
    shape: validation.normalizedShape,
    warnings: validation.warnings.slice(),
    errors: validation.errors.slice(),
    validation: {
      ok: validation.ok,
      warnings: validation.warnings.slice(),
      errors: validation.errors.slice(),
      wouldNormalize: validation.wouldNormalize,
    },
    diagnostics: createDiagnostics({
      validationErrors: validation.errors.length,
      validationWarnings: validation.warnings.length,
    }),
  };
}

function validateEventV2Roundtrip(before, after) {
  const beforeValidation = validateEventV2SaveShape(before);
  const afterValidation = validateEventV2SaveShape(after);
  const errors = [];
  const warnings = [];

  if (!beforeValidation.ok) {
    errors.push('before_shape_invalid');
    beforeValidation.errors.forEach((error) => errors.push(error));
  }
  if (!afterValidation.ok) {
    errors.push('after_shape_invalid');
    afterValidation.errors.forEach((error) => errors.push(error));
  }

  const beforeOpen = before && Array.isArray(before.openEvents) ? before.openEvents[0] : null;
  const afterOpen = after && Array.isArray(after.openEvents) ? after.openEvents[0] : null;
  const beforeHistory = before && Array.isArray(before.history) ? before.history[0] : null;
  const afterHistory = after && Array.isArray(after.history) ? after.history[0] : null;

  if (!beforeOpen || !afterOpen) {
    errors.push('open_event_missing_for_roundtrip');
  } else {
    if (beforeOpen.eventId !== afterOpen.eventId) errors.push('open_event_event_id_mismatch');
    if (beforeOpen.instanceId !== afterOpen.instanceId) errors.push('open_event_instance_id_mismatch');
  }

  if (!beforeHistory || !afterHistory) {
    errors.push('history_entry_missing_for_roundtrip');
  } else {
    if (beforeHistory.eventId !== afterHistory.eventId) errors.push('history_event_id_mismatch');
    if (beforeHistory.instanceId !== afterHistory.instanceId) errors.push('history_instance_id_mismatch');
  }

  if ((before && before.schemaVersion) !== (after && after.schemaVersion)) {
    errors.push('schema_version_mismatch');
  }
  if ((before && before.mode) !== (after && after.mode)) {
    errors.push('mode_mismatch');
  }
  if (beforeValidation.wouldNormalize || afterValidation.wouldNormalize) {
    warnings.push('roundtrip_used_normalized_shape');
  }

  return {
    ok: errors.length === 0,
    mode: ROUNDTRIP_MODE,
    wouldWrite: false,
    usedProductiveStorage: false,
    beforeValidation: {
      ok: beforeValidation.ok,
      warnings: beforeValidation.warnings.slice(),
      errors: beforeValidation.errors.slice(),
    },
    afterValidation: {
      ok: afterValidation.ok,
      warnings: afterValidation.warnings.slice(),
      errors: afterValidation.errors.slice(),
    },
    warnings,
    errors,
    diagnostics: createDiagnostics(),
  };
}

function runEventV2SaveLoadRoundtripPreview() {
  const before = createEventV2RoundtripFixture();
  const beforeClone = cloneJson(before);
  const serializeResult = serializeEventV2PreviewShape(before);
  if (!serializeResult.ok) {
    return {
      ok: false,
      mode: ROUNDTRIP_MODE,
      wouldWrite: false,
      usedProductiveStorage: false,
      before,
      after: null,
      warnings: serializeResult.warnings.slice(),
      errors: serializeResult.errors.slice(),
      serializeResult,
      deserializeResult: null,
      roundtripValidation: null,
      inputMutated: JSON.stringify(before) !== JSON.stringify(beforeClone),
      diagnostics: createDiagnostics(),
    };
  }

  const deserializeResult = deserializeEventV2PreviewShape(serializeResult.serialized);
  if (!deserializeResult.ok) {
    return {
      ok: false,
      mode: ROUNDTRIP_MODE,
      wouldWrite: false,
      usedProductiveStorage: false,
      before,
      after: null,
      warnings: deserializeResult.warnings.slice(),
      errors: deserializeResult.errors.slice(),
      serializeResult,
      deserializeResult,
      roundtripValidation: null,
      inputMutated: JSON.stringify(before) !== JSON.stringify(beforeClone),
      diagnostics: createDiagnostics(),
    };
  }

  const after = deserializeResult.shape;
  const roundtripValidation = validateEventV2Roundtrip(before, after);

  return {
    ok: roundtripValidation.ok,
    mode: ROUNDTRIP_MODE,
    wouldWrite: false,
    usedProductiveStorage: false,
    before,
    after,
    warnings: roundtripValidation.warnings.slice(),
    errors: roundtripValidation.errors.slice(),
    serializeResult,
    deserializeResult,
    roundtripValidation,
    inputMutated: JSON.stringify(before) !== JSON.stringify(beforeClone),
    diagnostics: createDiagnostics(),
  };
}

module.exports = Object.freeze({
  ROUNDTRIP_MODE,
  createEventV2RoundtripFixture,
  serializeEventV2PreviewShape,
  deserializeEventV2PreviewShape,
  validateEventV2Roundtrip,
  runEventV2SaveLoadRoundtripPreview,
});

