'use strict';

const EVENT_V1_WRITE_TYPES = Object.freeze(['W1', 'W2', 'W3', 'W4', 'W5', 'W6']);
const V1_WRITE_TELEMETRY_DEV_QUERY_KEYS = Object.freeze([
  'dev',
  'devEventV2',
  'gs_event_v2_dev_preview',
  'eventV1Telemetry'
]);
const MAX_HIT_LOG = 500;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTruthy(value) {
  const raw = String(value || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on' || raw === 'unlock';
}

function normalizeWriteType(type) {
  const safeType = String(type || '').trim().toUpperCase();
  if (EVENT_V1_WRITE_TYPES.includes(safeType)) {
    return safeType;
  }
  return 'UNKNOWN';
}

function createEmptyState() {
  return {
    schemaVersion: 1,
    totals: {
      all: 0,
      W1: 0,
      W2: 0,
      W3: 0,
      W4: 0,
      W5: 0,
      W6: 0,
      UNKNOWN: 0
    },
    bySource: {},
    byType: {
      W1: {},
      W2: {},
      W3: {},
      W4: {},
      W5: {},
      W6: {},
      UNKNOWN: {}
    },
    byMode: {},
    hits: [],
    lastHitAt: null
  };
}

function getRoot() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  return null;
}

function getLocationData(input) {
  const safeInput = isPlainObject(input) ? input : {};
  if (typeof safeInput.hostname === 'string' || typeof safeInput.search === 'string') {
    return {
      hostname: String(safeInput.hostname || ''),
      search: String(safeInput.search || '')
    };
  }
  const root = getRoot();
  const location = root && root.location && typeof root.location === 'object' ? root.location : null;
  return {
    hostname: location && typeof location.hostname === 'string' ? location.hostname : '',
    search: location && typeof location.search === 'string' ? location.search : ''
  };
}

function hasDevQueryFlag(search) {
  if (!search) return false;
  try {
    const params = new URLSearchParams(String(search).startsWith('?') ? String(search) : `?${String(search)}`);
    return V1_WRITE_TELEMETRY_DEV_QUERY_KEYS.some((key) => normalizeTruthy(params.get(key)));
  } catch (_error) {
    return false;
  }
}

function isEventV1WriteTelemetryEnabled(input) {
  const root = getRoot();
  if (root && root.__GS_FORCE_EVENT_V1_WRITE_TELEMETRY === true) {
    return true;
  }
  const location = getLocationData(input);
  const hostname = String(location.hostname || '').trim().toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const hasQueryFlag = hasDevQueryFlag(location.search);

  const modeFromWindow = root && typeof root.MODE === 'string' ? String(root.MODE).trim().toLowerCase() : '';
  const modeFromInput = isPlainObject(input) && typeof input.mode === 'string' ? String(input.mode).trim().toLowerCase() : '';
  const modeIsDev = modeFromWindow === 'dev' || modeFromInput === 'dev';

  return isLocalHost || hasQueryFlag || modeIsDev;
}

function getTelemetryState() {
  const root = getRoot();
  if (!root) {
    return createEmptyState();
  }
  if (!isPlainObject(root.__GS_EVENT_V1_WRITE_TELEMETRY_STATE)) {
    root.__GS_EVENT_V1_WRITE_TELEMETRY_STATE = createEmptyState();
  }
  return root.__GS_EVENT_V1_WRITE_TELEMETRY_STATE;
}

function recordEventV1WriteHit(type, context) {
  if (!isEventV1WriteTelemetryEnabled()) {
    return {
      ok: true,
      enabled: false,
      recorded: false
    };
  }

  const safeContext = isPlainObject(context) ? context : {};
  const safeType = normalizeWriteType(type);
  const source = String(safeContext.source || 'unknown_source');
  const mode = String(safeContext.mode || 'unknown_mode');
  const nowIso = new Date().toISOString();
  const eventId = safeContext.eventId == null ? null : String(safeContext.eventId);

  const hit = {
    type: safeType,
    source,
    eventId,
    hasEventV2: safeContext.hasEventV2 === true,
    v2RuntimeEnabled: safeContext.v2RuntimeEnabled === true,
    legacyFallback: safeContext.legacyFallback === true,
    mode,
    timestamp: nowIso,
    notes: Array.isArray(safeContext.notes) ? safeContext.notes.map((entry) => String(entry)) : []
  };

  try {
    const state = getTelemetryState();
    state.totals.all += 1;
    state.totals[safeType] = Number(state.totals[safeType] || 0) + 1;
    state.bySource[source] = Number(state.bySource[source] || 0) + 1;
    state.byMode[mode] = Number(state.byMode[mode] || 0) + 1;
    if (!isPlainObject(state.byType[safeType])) state.byType[safeType] = {};
    state.byType[safeType][source] = Number(state.byType[safeType][source] || 0) + 1;
    state.hits.push(hit);
    if (state.hits.length > MAX_HIT_LOG) {
      state.hits = state.hits.slice(-MAX_HIT_LOG);
    }
    state.lastHitAt = nowIso;
  } catch (_error) {
    return {
      ok: false,
      enabled: true,
      recorded: false
    };
  }

  return {
    ok: true,
    enabled: true,
    recorded: true,
    type: safeType
  };
}

function getEventV1WriteTelemetrySnapshot() {
  const enabled = isEventV1WriteTelemetryEnabled();
  const state = getTelemetryState();
  return {
    ok: true,
    enabled,
    snapshot: cloneJson(state)
  };
}

function resetEventV1WriteTelemetry() {
  const root = getRoot();
  if (!root) {
    return { ok: true, enabled: false, reset: false };
  }
  root.__GS_EVENT_V1_WRITE_TELEMETRY_STATE = createEmptyState();
  return {
    ok: true,
    enabled: isEventV1WriteTelemetryEnabled(),
    reset: true
  };
}

function summarizeEventV1WriteTelemetry() {
  const data = getEventV1WriteTelemetrySnapshot();
  const snapshot = isPlainObject(data.snapshot) ? data.snapshot : createEmptyState();
  const sortedSources = Object.entries(snapshot.bySource || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 10)
    .map(([source, hits]) => ({ source, hits: Number(hits || 0) }));

  return {
    ok: true,
    enabled: data.enabled === true,
    totals: snapshot.totals || {},
    topSources: sortedSources,
    lastHitAt: snapshot.lastHitAt || null,
    trackedTypes: EVENT_V1_WRITE_TYPES.slice()
  };
}

function installEventV1WriteTelemetryDevHelpers(target) {
  const root = target && typeof target === 'object' ? target : getRoot();
  if (!root || !isEventV1WriteTelemetryEnabled()) {
    return {
      ok: false,
      enabled: false
    };
  }
  root.__getEventV1WriteTelemetry = () => getEventV1WriteTelemetrySnapshot();
  root.__resetEventV1WriteTelemetry = () => resetEventV1WriteTelemetry();
  return {
    ok: true,
    enabled: true,
    functions: ['__getEventV1WriteTelemetry', '__resetEventV1WriteTelemetry']
  };
}

const eventV1WriteTelemetryApi = Object.freeze({
  EVENT_V1_WRITE_TYPES,
  isEventV1WriteTelemetryEnabled,
  recordEventV1WriteHit,
  getEventV1WriteTelemetrySnapshot,
  resetEventV1WriteTelemetry,
  summarizeEventV1WriteTelemetry,
  installEventV1WriteTelemetryDevHelpers
});

const root = getRoot();
if (root && typeof root === 'object') {
  root.GrowSimEventV1WriteTelemetry = eventV1WriteTelemetryApi;
  installEventV1WriteTelemetryDevHelpers(root);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = eventV1WriteTelemetryApi;
}
