'use strict';

const EVENT_V2_SAVE_SCHEMA_VERSION = 1;
const DEFAULT_EVENT_V2_MODE = 'no-write';
const EVENT_V2_SAVE_MODES = Object.freeze(['no-write', 'dry-run', 'active']);
const OPEN_EVENT_STATUSES = Object.freeze(['preview', 'queued', 'active', 'resolving', 'expired', 'cancelled']);
const HISTORY_WRITE_MODES = Object.freeze(['no-write', 'dry-run', 'active']);

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

function createEmptyEventV2SaveShape(overrides) {
  const safeOverrides = isPlainObject(overrides) ? overrides : {};
  const meta = isPlainObject(safeOverrides.meta) ? safeOverrides.meta : {};
  const counters = isPlainObject(meta.counters) ? meta.counters : {};

  return {
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    mode: EVENT_V2_SAVE_MODES.includes(safeOverrides.mode) ? safeOverrides.mode : DEFAULT_EVENT_V2_MODE,
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

function hasNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSafeTimestamp(value) {
  return hasNonEmptyString(value) || (typeof value === 'number' && Number.isFinite(value));
}

function createEntryResult(kind, index) {
  return {
    ok: true,
    kind,
    index,
    warnings: [],
    errors: [],
  };
}

function validateOpenEventEntry(entry, index) {
  const result = createEntryResult('event_v2_open_event', index);

  if (!isPlainObject(entry)) {
    result.ok = false;
    result.errors.push('open_event_not_object');
    return result;
  }

  if (!hasNonEmptyString(entry.eventId)) result.errors.push('open_event_missing_event_id');
  if (!hasNonEmptyString(entry.instanceId)) result.errors.push('open_event_missing_instance_id');
  if (!Number.isFinite(Number(entry.eventVersion)) && !Number.isFinite(Number(entry.catalogVersion))) {
    result.errors.push('open_event_missing_version');
  }
  if (!isSafeTimestamp(entry.createdAt)) result.errors.push('open_event_missing_created_at');
  if (!hasNonEmptyString(entry.stage)) result.errors.push('open_event_missing_stage');
  if (!hasNonEmptyString(entry.category)) result.errors.push('open_event_missing_category');
  if (!hasNonEmptyString(entry.severity)) result.errors.push('open_event_missing_severity');
  if (!hasNonEmptyString(entry.source)) result.errors.push('open_event_missing_source');
  if (!Array.isArray(entry.options) || entry.options.length === 0) result.errors.push('open_event_missing_options');
  if (!OPEN_EVENT_STATUSES.includes(entry.status)) result.errors.push('open_event_invalid_status');

  if (entry.selectedOption != null && !hasNonEmptyString(entry.selectedOption)) {
    result.errors.push('open_event_invalid_selected_option');
  }
  if (entry.expiresAt != null && !isSafeTimestamp(entry.expiresAt)) {
    result.errors.push('open_event_invalid_expires_at');
  }
  if (entry.chainId != null && !hasNonEmptyString(entry.chainId)) {
    result.errors.push('open_event_invalid_chain_id');
  }
  if (entry.followUpOf != null && !hasNonEmptyString(entry.followUpOf)) {
    result.errors.push('open_event_invalid_follow_up_of');
  }

  result.ok = result.errors.length === 0;
  return result;
}

function validateHistoryEntry(entry, index) {
  const result = createEntryResult('event_v2_history_entry', index);

  if (!isPlainObject(entry)) {
    result.ok = false;
    result.errors.push('history_entry_not_object');
    return result;
  }

  if (!hasNonEmptyString(entry.eventId)) result.errors.push('history_missing_event_id');
  if (!hasNonEmptyString(entry.instanceId)) result.errors.push('history_missing_instance_id');
  if (!isSafeTimestamp(entry.resolvedAt)) result.errors.push('history_missing_resolved_at');
  if (!hasNonEmptyString(entry.selectedOption)) result.errors.push('history_missing_selected_option');
  if (!hasNonEmptyString(entry.result)) result.errors.push('history_missing_result');
  if (!isPlainObject(entry.applyPreview)) result.errors.push('history_missing_apply_preview');
  if (!HISTORY_WRITE_MODES.includes(entry.writeMode)) result.errors.push('history_invalid_write_mode');
  if (Number(entry.schemaVersion) !== EVENT_V2_SAVE_SCHEMA_VERSION) result.errors.push('history_invalid_schema_version');
  if (!hasNonEmptyString(entry.source)) result.errors.push('history_missing_source');

  result.ok = result.errors.length === 0;
  return result;
}

function normalizeMeta(meta, warnings) {
  const defaultMeta = createDefaultMeta();
  if (!isPlainObject(meta)) {
    warnings.push('meta_would_initialize');
    return defaultMeta;
  }

  const counters = isPlainObject(meta.counters) ? meta.counters : {};
  if (!isPlainObject(meta.counters)) {
    warnings.push('meta_counters_would_initialize');
  }

  return {
    ...defaultMeta,
    ...cloneJson(meta),
    counters: {
      ...defaultMeta.counters,
      ...cloneJson(counters),
    },
  };
}

function validateEventV2SaveShape(shape) {
  const warnings = [];
  const errors = [];
  const entryResults = {
    openEvents: [],
    history: [],
  };

  if (!isPlainObject(shape)) {
    return {
      ok: false,
      warnings,
      errors: ['event_v2_shape_not_object'],
      entryResults,
      normalizedShape: createEmptyEventV2SaveShape(),
      wouldNormalize: true,
    };
  }

  const normalizedShape = createEmptyEventV2SaveShape();
  let wouldNormalize = false;
  const schemaVersion = Number(shape.schemaVersion);

  if (shape.schemaVersion == null) {
    warnings.push('schema_version_would_initialize');
    wouldNormalize = true;
  } else if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    errors.push('invalid_schema_version');
  } else if (schemaVersion > EVENT_V2_SAVE_SCHEMA_VERSION) {
    errors.push('unknown_schema_version');
  } else {
    normalizedShape.schemaVersion = schemaVersion;
  }

  if (!EVENT_V2_SAVE_MODES.includes(shape.mode)) {
    errors.push('invalid_mode');
  } else {
    normalizedShape.mode = shape.mode;
  }

  if (!Array.isArray(shape.openEvents)) {
    warnings.push('open_events_would_initialize');
    wouldNormalize = true;
  } else {
    normalizedShape.openEvents = cloneJson(shape.openEvents);
    entryResults.openEvents = shape.openEvents.map((entry, index) => validateOpenEventEntry(entry, index));
  }

  if (!Array.isArray(shape.history)) {
    warnings.push('history_would_initialize');
    wouldNormalize = true;
  } else {
    normalizedShape.history = cloneJson(shape.history);
    entryResults.history = shape.history.map((entry, index) => validateHistoryEntry(entry, index));
  }

  normalizedShape.meta = normalizeMeta(shape.meta, warnings);
  if (!isPlainObject(shape.meta) || !isPlainObject(shape.meta.counters)) {
    wouldNormalize = true;
  }

  entryResults.openEvents.forEach((entryResult) => {
    entryResult.errors.forEach((error) => errors.push(error));
    entryResult.warnings.forEach((warning) => warnings.push(warning));
  });
  entryResults.history.forEach((entryResult) => {
    entryResult.errors.forEach((error) => errors.push(error));
    entryResult.warnings.forEach((warning) => warnings.push(warning));
  });

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    entryResults,
    normalizedShape,
    wouldNormalize,
  };
}

function previewEventV2SaveShape(state, options) {
  const safeOptions = isPlainObject(options) ? options : {};
  const safeState = isPlainObject(state) ? state : {};
  const existingShape = isPlainObject(safeState.eventV2) ? safeState.eventV2 : null;
  const wouldInitialize = !existingShape;
  const validation = validateEventV2SaveShape(existingShape || createEmptyEventV2SaveShape());
  const resultMode = safeOptions.mode === 'no-write' ? 'no-write' : 'dry-run';

  return {
    ok: validation.ok,
    mode: resultMode,
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    wouldInitialize,
    wouldNormalize: validation.wouldNormalize,
    wouldWrite: false,
    canMutateState: false,
    canMutateSave: false,
    noWriteDefault: true,
    shape: validation.normalizedShape,
    warnings: validation.warnings.slice(),
    errors: validation.errors.slice(),
    entryResults: cloneJson(validation.entryResults),
    unknownVersion: validation.errors.includes('unknown_schema_version'),
    diagnostics: createDiagnostics({
      originalStateMutated: false,
      validationErrors: validation.errors.length,
      validationWarnings: validation.warnings.length,
    }),
  };
}

function describeEventV2SaveShapeContract() {
  return {
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    defaultMode: DEFAULT_EVENT_V2_MODE,
    allowedModes: EVENT_V2_SAVE_MODES.slice(),
    openEventStatuses: OPEN_EVENT_STATUSES.slice(),
    historyWriteModes: HISTORY_WRITE_MODES.slice(),
    noWriteDefault: true,
    productiveWritesEnabled: false,
  };
}

module.exports = Object.freeze({
  EVENT_V2_SAVE_SCHEMA_VERSION,
  DEFAULT_EVENT_V2_MODE,
  EVENT_V2_SAVE_MODES,
  OPEN_EVENT_STATUSES,
  HISTORY_WRITE_MODES,
  createEmptyEventV2SaveShape,
  validateOpenEventEntry,
  validateHistoryEntry,
  validateEventV2SaveShape,
  previewEventV2SaveShape,
  describeEventV2SaveShapeContract,
});

