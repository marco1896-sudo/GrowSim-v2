'use strict';

const growSimStorageConfig = (typeof window !== 'undefined' && window.GrowSimSimulationConfig && typeof window.GrowSimSimulationConfig === 'object')
  ? window.GrowSimSimulationConfig
  : ((typeof globalThis !== 'undefined' && globalThis.GrowSimSimulationConfig && typeof globalThis.GrowSimSimulationConfig === 'object')
    ? globalThis.GrowSimSimulationConfig
    : {});

const STORAGE_MODE = typeof growSimStorageConfig.MODE === 'string'
  ? growSimStorageConfig.MODE
  : (typeof globalThis.MODE === 'string' ? globalThis.MODE : 'prod');
const STORAGE_UI_TICK_INTERVAL_MS = Number.isFinite(Number(growSimStorageConfig.UI_TICK_INTERVAL_MS))
  ? Number(growSimStorageConfig.UI_TICK_INTERVAL_MS)
  : (Number.isFinite(Number(globalThis.UI_TICK_INTERVAL_MS)) ? Number(globalThis.UI_TICK_INTERVAL_MS) : 1000);
const STORAGE_EVENT_ROLL_MIN_REAL_MS = Number.isFinite(Number(growSimStorageConfig.EVENT_ROLL_MIN_REAL_MS))
  ? Number(growSimStorageConfig.EVENT_ROLL_MIN_REAL_MS)
  : (Number.isFinite(Number(globalThis.EVENT_ROLL_MIN_REAL_MS)) ? Number(globalThis.EVENT_ROLL_MIN_REAL_MS) : 30 * 60 * 1000);
const STORAGE_DEFAULT_BASE_SIM_SPEED = Number.isFinite(Number(growSimStorageConfig.DEFAULT_BASE_SIM_SPEED))
  ? Number(growSimStorageConfig.DEFAULT_BASE_SIM_SPEED)
  : (Number.isFinite(Number(globalThis.DEFAULT_BASE_SIM_SPEED)) ? Number(globalThis.DEFAULT_BASE_SIM_SPEED) : 12);
const STORAGE_SIM_START_HOUR = Number.isFinite(Number(growSimStorageConfig.SIM_START_HOUR))
  ? Number(growSimStorageConfig.SIM_START_HOUR)
  : (Number.isFinite(Number(globalThis.SIM_START_HOUR)) ? Number(globalThis.SIM_START_HOUR) : 8);
const STORAGE_SIM_DAY_START_HOUR = Number.isFinite(Number(growSimStorageConfig.SIM_DAY_START_HOUR))
  ? Number(growSimStorageConfig.SIM_DAY_START_HOUR)
  : (Number.isFinite(Number(globalThis.SIM_DAY_START_HOUR)) ? Number(globalThis.SIM_DAY_START_HOUR) : 6);
const STORAGE_SIM_NIGHT_START_HOUR = Number.isFinite(Number(growSimStorageConfig.SIM_NIGHT_START_HOUR))
  ? Number(growSimStorageConfig.SIM_NIGHT_START_HOUR)
  : (Number.isFinite(Number(globalThis.SIM_NIGHT_START_HOUR)) ? Number(globalThis.SIM_NIGHT_START_HOUR) : 22);
const STORAGE_SIM_GLOBAL_SEED = typeof growSimStorageConfig.SIM_GLOBAL_SEED === 'string'
  ? growSimStorageConfig.SIM_GLOBAL_SEED
  : (typeof globalThis.SIM_GLOBAL_SEED === 'string' ? globalThis.SIM_GLOBAL_SEED : 'grow-sim-v1-seed');
const STORAGE_SIM_PLANT_ID = typeof growSimStorageConfig.SIM_PLANT_ID === 'string'
  ? growSimStorageConfig.SIM_PLANT_ID
  : (typeof globalThis.SIM_PLANT_ID === 'string' ? globalThis.SIM_PLANT_ID : 'plant-001');
const STORAGE_BOOST_SIM_SPEED = Number.isFinite(Number(growSimStorageConfig.BOOST_SIM_SPEED))
  ? Number(growSimStorageConfig.BOOST_SIM_SPEED)
  : (Number.isFinite(Number(globalThis.BOOST_SIM_SPEED)) ? Number(globalThis.BOOST_SIM_SPEED) : 24);

function isStorageDebugLoggingEnabled() {
  try {
    const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
    if (root && root.__GROWSIM_DEBUG_LOGS__ === true) {
      return true;
    }
    const explicitEnv = root
      ? String(root.__GROWSIM_ENV__ || (root.GrowSimBuild && root.GrowSimBuild.environment) || '').trim().toLowerCase()
      : '';
    if (explicitEnv === 'local' || explicitEnv === 'dev' || explicitEnv === 'staging') {
      return true;
    }
    return STORAGE_MODE === 'dev';
  } catch (_error) {
    return STORAGE_MODE === 'dev';
  }
}

function logStorageDebugInfo(...args) {
  if (isStorageDebugLoggingEnabled()) {
    console.info(...args);
  }
}

function recordEventV1WriteTelemetryHit(type, context = {}) {
  try {
    const root = (typeof window !== 'undefined')
      ? window
      : ((typeof globalThis !== 'undefined') ? globalThis : null);
    const api = root && root.GrowSimEventV1WriteTelemetry && typeof root.GrowSimEventV1WriteTelemetry.recordEventV1WriteHit === 'function'
      ? root.GrowSimEventV1WriteTelemetry
      : null;
    if (!api) return;
    const safeContext = context && typeof context === 'object' ? context : {};
    const eventId = safeContext.eventId == null ? null : String(safeContext.eventId);
    const hasEventV2 = safeContext.hasEventV2 === true
      || (typeof state !== 'undefined' && state && state.eventV2 && typeof state.eventV2 === 'object');
    api.recordEventV1WriteHit(type, {
      ...safeContext,
      eventId,
      hasEventV2,
      v2RuntimeEnabled: safeContext.v2RuntimeEnabled === true,
      legacyFallback: safeContext.legacyFallback !== false,
      mode: safeContext.mode || 'save-restore'
    });
  } catch (_error) {
    // Telemetry must never impact runtime behavior.
  }
}

const normalizeStorageBaseSimulationSpeed = typeof growSimStorageConfig.normalizeBaseSimulationSpeed === 'function'
  ? (value) => growSimStorageConfig.normalizeBaseSimulationSpeed(value)
  : ((typeof globalThis.normalizeBaseSimulationSpeed === 'function')
    ? (value) => globalThis.normalizeBaseSimulationSpeed(value)
    : (value) => {
      const numericValue = Number(value);
      return [4, 8, 12, 16].includes(numericValue) ? numericValue : STORAGE_DEFAULT_BASE_SIM_SPEED;
    });

const alignStorageToSimStartHour = typeof growSimStorageConfig.alignToSimStartHour === 'function'
  ? (realNowMs, startHour = STORAGE_SIM_START_HOUR) => growSimStorageConfig.alignToSimStartHour(realNowMs, startHour)
  : ((typeof globalThis.alignToSimStartHour === 'function')
    ? (realNowMs, startHour = STORAGE_SIM_START_HOUR) => globalThis.alignToSimStartHour(realNowMs, startHour)
    : (realNowMs, startHour = STORAGE_SIM_START_HOUR) => {
      const baseDate = new Date(Number.isFinite(Number(realNowMs)) ? Number(realNowMs) : Date.now());
      const alignedDate = new Date(baseDate);
      alignedDate.setHours(Number.isFinite(Number(startHour)) ? Number(startHour) : STORAGE_SIM_START_HOUR, 0, 0, 0);
      if (baseDate.getHours() < (Number.isFinite(Number(startHour)) ? Number(startHour) : STORAGE_SIM_START_HOUR)) {
        alignedDate.setDate(alignedDate.getDate() - 1);
      }
      return alignedDate.getTime();
    });

function getStorageEffectiveSimulationSpeed(nowMs = Date.now()) {
  if (typeof globalThis.getEffectiveSimulationSpeed === 'function') {
    return globalThis.getEffectiveSimulationSpeed(nowMs);
  }

  const safeNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const boostEndsAtMs = Number(state && state.boost && state.boost.boostEndsAtMs);
  if (Number.isFinite(boostEndsAtMs) && boostEndsAtMs > safeNowMs) {
    return STORAGE_BOOST_SIM_SPEED;
  }

  return normalizeStorageBaseSimulationSpeed(state && state.simulation && state.simulation.baseSpeed);
}

function getCareModelApi() {
  const careApi = (typeof window !== 'undefined' && window.GrowSimCareModel && typeof window.GrowSimCareModel === 'object')
    ? window.GrowSimCareModel
    : ((typeof globalThis !== 'undefined' && globalThis.GrowSimCareModel && typeof globalThis.GrowSimCareModel === 'object')
      ? globalThis.GrowSimCareModel
      : null);
  return careApi;
}

function createDefaultCareStateFromBase(baseState) {
  const careApi = getCareModelApi();
  if (careApi && typeof careApi.createDefaultCareState === 'function') {
    return careApi.createDefaultCareState(baseState);
  }
  const status = baseState && baseState.status && typeof baseState.status === 'object' ? baseState.status : {};
  const water = clamp(Number(status.water || 70), 0, 100);
  const nutrition = clamp(Number(status.nutrition || 65), 0, 100);
  return {
    version: 1,
    water: {
      substrateMoisture: water,
      surfaceMoisture: clamp(water - 8, 0, 100),
      rootZoneMoisture: clamp(water + 4, 0, 100),
      drybackRatePerHour: 1.2,
      overwateringPressure: clamp((water - 76) * 1.1, 0, 100),
      dryStressPressure: clamp((40 - water) * 0.8, 0, 100),
      lastWateredAtSimMs: Number(baseState && baseState.simulation && baseState.simulation.simTimeMs || 0),
      lastWaterAmountMl: 0,
      lastWaterMethod: null
    },
    nutrients: {
      n: clamp(nutrition, 0, 100),
      p: clamp(nutrition - 6, 0, 100),
      k: clamp(nutrition - 4, 0, 100),
      micro: clamp(nutrition - 8, 0, 100),
      saltLoad: clamp((nutrition - 50) * 0.3, 0, 100),
      lastFeedAtSimMs: 0,
      lastFeedType: null,
      lastFeedStrength: null
    },
    routine: {
      lastLeafCheckAtSimMs: 0,
      lastPotWeightCheckAtSimMs: 0,
      lastSubstrateCheckAtSimMs: 0,
      careScoreToday: 0
    },
    feedback: {
      lastCareGrade: null,
      lastCareMessageKey: null,
      lastEffects: [],
      lastFocusKey: null,
      lastActionId: null,
      lastUpdatedAtSimMs: 0
    },
    trends: {
      version: 1,
      lastSnapshotAtSimMs: Number(baseState && baseState.simulation && baseState.simulation.simTimeMs || 0),
      previous: {
        substrateMoisture: null,
        rootZoneMoisture: null,
        surfaceMoisture: null,
        saltLoad: null,
        stress: null,
        risk: null,
        nutrition: null
      },
      current: {
        substrateMoisture: water,
        rootZoneMoisture: clamp(water + 4, 0, 100),
        surfaceMoisture: clamp(water - 8, 0, 100),
        saltLoad: clamp((nutrition - 50) * 0.3, 0, 100),
        stress: clamp(Number(status.stress || 15), 0, 100),
        risk: clamp(Number(status.risk || 20), 0, 100),
        nutrition
      },
      deltas: {
        moisture: 0,
        rootZone: 0,
        surface: 0,
        saltLoad: 0,
        stress: 0,
        risk: 0,
        nutrition: 0
      }
    }
  };
}

function normalizeCanonicalCareState(careState, baseState) {
  const careApi = getCareModelApi();
  if (careApi && typeof careApi.normalizeCareState === 'function') {
    return careApi.normalizeCareState(careState, baseState);
  }
  return createDefaultCareStateFromBase(baseState);
}

function deriveCanonicalCareSummary(careState, baseState) {
  const careApi = getCareModelApi();
  if (careApi && typeof careApi.deriveCareSummary === 'function') {
    return careApi.deriveCareSummary(careState, baseState);
  }
  return {
    moistureBand: 'stable',
    rootZoneHint: 'care.hint.root_zone_balanced',
    wateringRecommendation: { key: 'monitor', level: 'info', actionId: null, messageKey: 'care.recommendation.water.monitor' },
    feedingRecommendation: { key: 'stable', level: 'info', actionId: null, messageKey: 'care.recommendation.feed.stable' },
    riskLevel: 'low',
    nextCareFocus: 'routine',
    buddyHintKey: 'care.buddy.observe'
  };
}

function repairStoredTextEncoding(value) {
  const api = window.GrowSimTextEncoding;
  return api && typeof api.deepRepairMojibake === 'function'
    ? api.deepRepairMojibake(value)
    : value;
}

function localStorageAdapter() {
  return {
    async get() {
      let raw = null;
      try {
        raw = localStorage.getItem(LS_STATE_KEY);
      } catch (error) {
        console.warn('[storage] localStorage read failed', error);
        return null;
      }
      if (!raw) {
        return null;
      }
      try {
        return repairStoredTextEncoding(JSON.parse(raw));
      } catch (_error) {
        return null;
      }
    },
    async set(snapshot) {
      localStorage.setItem(LS_STATE_KEY, JSON.stringify(snapshot));
    }
  };
}

async function createStorageAdapter() {
  if (typeof indexedDB === 'undefined') {
    return localStorageAdapter();
  }

  try {
    const db = await openDb();
    return {
      async get() {
        const localSnapshot = await localStorageAdapter().get();
        let localSnapshotMissing = false;
        try {
          localSnapshotMissing = localStorage.getItem(LS_STATE_KEY) === null;
        } catch (_error) {
          localSnapshotMissing = false;
        }
        const stored = await dbGet(db, DB_KEY);
        if (stored && typeof stored === 'object') {
          if (localSnapshotMissing) {
            console.warn('[storage] ignoring stale IndexedDB snapshot because localStorage state is missing');
            try {
              await dbDelete(db, DB_KEY);
            } catch (_error) {
              // best-effort cleanup; stale state must not win over an explicit clear
            }
            return null;
          }
          if (localSnapshot && typeof localSnapshot === 'object') {
            const preferredSnapshot = choosePreferredRestoreSnapshot(localSnapshot, stored);
            return preferredSnapshot.source === 'local' ? localSnapshot : stored;
          }
          return stored;
        }
        return localSnapshot;
      },
      async set(snapshot) {
        try {
          await localStorageAdapter().set(snapshot);
        } catch (_error) {
          // keep IndexedDB as the primary durable store
        }
        await dbSet(db, DB_KEY, snapshot);
      }
    };
  } catch (_error) {
    return localStorageAdapter();
  }
}

async function clearStoredState() {
  try {
    localStorage.removeItem(LS_STATE_KEY);
  } catch (_error) {
    // non-fatal
  }

  if (typeof indexedDB === 'undefined') {
    return;
  }

  try {
    const db = await openDb();
    await dbDelete(db, DB_KEY);
    db.close();
  } catch (_error) {
    // non-fatal
  }
}

const REMOTE_SAVE_PATH = '/save';
const REMOTE_SYNC_MIN_INTERVAL_MS = 30 * 1000;

const remoteSyncRuntime = {
  loadAttempted: false,
  authBlocked: false,
  inFlightSave: null,
  lastSaveAttemptAtMs: 0
};

function getStateFreshnessMetrics(snapshot) {
  const safeSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const meta = safeSnapshot.meta && typeof safeSnapshot.meta === 'object' ? safeSnapshot.meta : {};
  const persistence = meta.persistence && typeof meta.persistence === 'object' ? meta.persistence : {};
  const simulation = safeSnapshot.simulation && typeof safeSnapshot.simulation === 'object' ? safeSnapshot.simulation : {};
  const run = safeSnapshot.run && typeof safeSnapshot.run === 'object' ? safeSnapshot.run : {};

  return {
    savedAtRealMs: Number.isFinite(Number(persistence.lastSavedAtRealMs)) ? Number(persistence.lastSavedAtRealMs) : 0,
    lastTickRealTimeMs: Number.isFinite(Number(simulation.lastTickRealTimeMs)) ? Number(simulation.lastTickRealTimeMs) : 0,
    nowMs: Number.isFinite(Number(simulation.nowMs)) ? Number(simulation.nowMs) : 0,
    finalizedAtRealMs: Number.isFinite(Number(run.finalizedAtRealMs)) ? Number(run.finalizedAtRealMs) : 0,
    endedAtRealMs: Number.isFinite(Number(run.endedAtRealMs)) ? Number(run.endedAtRealMs) : 0,
    startedAtRealMs: Number.isFinite(Number(run.startedAtRealMs)) ? Number(run.startedAtRealMs) : 0,
    simTimeMs: Number.isFinite(Number(simulation.simTimeMs)) ? Number(simulation.simTimeMs) : 0,
    tickCount: Number.isFinite(Number(simulation.tickCount)) ? Number(simulation.tickCount) : 0
  };
}

function compareStateFreshness(leftSnapshot, rightSnapshot) {
  const left = getStateFreshnessMetrics(leftSnapshot);
  const right = getStateFreshnessMetrics(rightSnapshot);
  const orderedKeys = [
    'savedAtRealMs',
    'lastTickRealTimeMs',
    'nowMs',
    'finalizedAtRealMs',
    'endedAtRealMs',
    'startedAtRealMs',
    'simTimeMs',
    'tickCount'
  ];

  for (const key of orderedKeys) {
    if (left[key] !== right[key]) {
      return left[key] > right[key] ? 1 : -1;
    }
  }

  return 0;
}

function choosePreferredRestoreSnapshot(localSnapshot, remoteSnapshot) {
  const hasLocal = Boolean(localSnapshot && typeof localSnapshot === 'object');
  const hasRemote = Boolean(remoteSnapshot && typeof remoteSnapshot === 'object');

  if (!hasLocal && !hasRemote) {
    return { source: 'none', snapshot: null, comparison: 0 };
  }
  if (!hasRemote) {
    return { source: 'local', snapshot: localSnapshot, comparison: 1 };
  }
  if (!hasLocal) {
    return { source: 'remote', snapshot: remoteSnapshot, comparison: -1 };
  }

  const comparison = compareStateFreshness(localSnapshot, remoteSnapshot);
  return comparison >= 0
    ? { source: 'local', snapshot: localSnapshot, comparison }
    : { source: 'remote', snapshot: remoteSnapshot, comparison };
}

function stampStatePersistence(snapshot, savedAtRealMs = Date.now()) {
  if (!snapshot || typeof snapshot !== 'object') {
    return;
  }
  if (!snapshot.meta || typeof snapshot.meta !== 'object') {
    snapshot.meta = {};
  }
  if (!snapshot.meta.persistence || typeof snapshot.meta.persistence !== 'object') {
    snapshot.meta.persistence = {};
  }
  snapshot.meta.persistence.lastSavedAtRealMs = Number.isFinite(Number(savedAtRealMs))
    ? Number(savedAtRealMs)
    : Date.now();
}

function createPersistableStateSnapshot(sourceState) {
  const snapshot = {
    ...sourceState
  };
  if (sourceState && sourceState.ui && typeof sourceState.ui === 'object') {
    snapshot.ui = {
      ...sourceState.ui,
      menuOpen: false,
      menuDialogOpen: false,
      activeStatPopup: null,
      statDetailKey: null
    };
  }
  return snapshot;
}

function getRemoteApiFetch() {
  if (window.GrowSimApi && typeof window.GrowSimApi.apiFetch === 'function') {
    return window.GrowSimApi.apiFetch;
  }

  if (typeof fetch !== 'function') {
    return null;
  }

  return async function fallbackApiFetch(path, options = {}) {
    const baseUrl = 'https://api.growsimulator.tech';
    const prefix = '/api';
    const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
    const apiPath = normalizedPath.startsWith(`${prefix}/`) || normalizedPath === prefix
      ? normalizedPath
      : `${prefix}${normalizedPath}`;
    return fetch(`${baseUrl}${apiPath}`, options);
  };
}

function getRemoteAuthToken() {
  const authApi = window.GrowSimAuth;
  if (!authApi || typeof authApi.getToken !== 'function') {
    return '';
  }

  const token = authApi.getToken();
  return typeof token === 'string' ? token.trim() : '';
}

function getRemoteAuthHeaders() {
  const token = getRemoteAuthToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

function looksLikeStatePayload(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const stateKeys = [
    'simulation', 'plant', 'events', 'history', 'status', 'actions', 'ui',
    'setup', 'meta', 'settings', 'profile', 'run', 'sim', 'growth', 'event'
  ];

  return stateKeys.some((key) => Object.prototype.hasOwnProperty.call(candidate, key));
}

function extractStateFromRemotePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const saveObject = payload.save && typeof payload.save === 'object' ? payload.save : null;
  const dataObject = payload.data && typeof payload.data === 'object' ? payload.data : null;

  const candidates = [
    payload.state,
    saveObject && saveObject.state,
    dataObject && dataObject.state,
    saveObject,
    dataObject,
    payload
  ];

  for (const candidate of candidates) {
    if (looksLikeStatePayload(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function loadRemoteSave(options = {}) {
  const force = Boolean(options && options.force === true);
  if (!force && remoteSyncRuntime.loadAttempted) {
    return null;
  }
  remoteSyncRuntime.loadAttempted = true;

  logStorageDebugInfo('[remote-load] requested');

  try {
    const apiFetch = getRemoteApiFetch();
    if (typeof apiFetch !== 'function') {
      console.info('[remote-load] fallback (fetch unavailable)');
      return null;
    }
    const response = await apiFetch(REMOTE_SAVE_PATH, {
      method: 'GET',
      headers: {
        ...getRemoteAuthHeaders()
      }
    });

    if (response.status === 401 || response.status === 403) {
      remoteSyncRuntime.authBlocked = true;
      logStorageDebugInfo('[remote-load] fallback (auth required)');
      return null;
    }

    if (response.status === 404) {
      logStorageDebugInfo('[remote-load] fallback (no remote save)');
      return null;
    }

    if (!response.ok) {
      console.warn('[remote-load] failed', { status: response.status });
      return null;
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      logStorageDebugInfo('[remote-load] fallback (invalid payload)');
      return null;
    }

    const remoteState = extractStateFromRemotePayload(payload);
    if (!remoteState) {
      logStorageDebugInfo('[remote-load] fallback (state missing)');
      return null;
    }

    remoteSyncRuntime.authBlocked = false;
    logStorageDebugInfo('[remote-load] success');
    return repairStoredTextEncoding(remoteState);
  } catch (error) {
    console.warn('[remote-load] failed', { message: error && error.message ? error.message : String(error) });
    return null;
  }
}

async function saveRemoteState(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return false;
  }

  const hasAuthToken = Boolean(getRemoteAuthToken());
  if (hasAuthToken) {
    remoteSyncRuntime.authBlocked = false;
  }

  if (remoteSyncRuntime.authBlocked) {
    logStorageDebugInfo('[remote-save] fallback (auth required)');
    return false;
  }

  const nowMs = Date.now();
  if (
    remoteSyncRuntime.inFlightSave
    || (nowMs - Number(remoteSyncRuntime.lastSaveAttemptAtMs || 0)) < REMOTE_SYNC_MIN_INTERVAL_MS
  ) {
    return false;
  }

  remoteSyncRuntime.lastSaveAttemptAtMs = nowMs;
  logStorageDebugInfo('[remote-save] requested');

  const request = (async () => {
    try {
      const apiFetch = getRemoteApiFetch();
      if (typeof apiFetch !== 'function') {
        console.info('[remote-save] fallback (fetch unavailable)');
        return false;
      }
      const response = await apiFetch(REMOTE_SAVE_PATH, {
        method: 'POST',
        headers: {
          ...getRemoteAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: snapshot,
          savedAtMs: nowMs,
          schemaVersion: String(snapshot.schemaVersion || '1.0.0'),
          client: 'growsim-v2-frontend'
        })
      });

      if (response.status === 401 || response.status === 403) {
        remoteSyncRuntime.authBlocked = true;
        logStorageDebugInfo('[remote-save] fallback (auth required)');
        return false;
      }

      if (!response.ok) {
        console.warn('[remote-save] failed', { status: response.status });
        return false;
      }

      logStorageDebugInfo('[remote-save] success');
      return true;
    } catch (error) {
      console.warn('[remote-save] failed', { message: error && error.message ? error.message : String(error) });
      return false;
    } finally {
      remoteSyncRuntime.inFlightSave = null;
    }
  })();

  remoteSyncRuntime.inFlightSave = request;
  return request;
}


function normalizePendingChainsForStorage(store) {
  if (!store || typeof store !== 'object') {
    return {};
  }

  const entries = Object.entries(store)
    .filter(([chainId, record]) => chainId && record && typeof record === 'object')
    .map(([chainId, record]) => {
      const createdAtRealTimeMs = Number(record.createdAtRealTimeMs ?? record.atRealTimeMs ?? Date.now());
      const expiresAtRealTimeMs = record.expiresAtRealTimeMs == null ? null : Number(record.expiresAtRealTimeMs);
      return {
        chainId: String(chainId),
        targetEventId: record.targetEventId ? String(record.targetEventId) : String(chainId),
        sourceEventId: record.sourceEventId ? String(record.sourceEventId) : (record.eventId ? String(record.eventId) : null),
        sourceOptionId: record.sourceOptionId ? String(record.sourceOptionId) : (record.optionId ? String(record.optionId) : null),
        sourceFlagId: record.sourceFlagId ? String(record.sourceFlagId) : null,
        createdAtRealTimeMs: Number.isFinite(createdAtRealTimeMs) ? createdAtRealTimeMs : Date.now(),
        expiresAtRealTimeMs: Number.isFinite(expiresAtRealTimeMs) ? expiresAtRealTimeMs : null,
        meta: record.meta && typeof record.meta === 'object' ? { ...record.meta } : {}
      };
    })
    .filter((record) => record.expiresAtRealTimeMs == null || record.expiresAtRealTimeMs > Date.now())
    .sort((a, b) => Number(a.createdAtRealTimeMs || 0) - Number(b.createdAtRealTimeMs || 0));

  const trimmed = entries.slice(Math.max(0, entries.length - 12));
  return Object.fromEntries(trimmed.map((record) => [record.chainId, record]));
}

function getClimateApi() {
  const api = window.GrowSimEnvModel;
  return api && typeof api === 'object' ? api : null;
}

function getProgressionApi() {
  const api = window.GrowSimProgression;
  return api && typeof api === 'object' ? api : null;
}

function normalizeEnvironmentState(snapshot = state) {
  const s = snapshot || state;
  const climateApi = getClimateApi();

  if (climateApi && typeof climateApi.normalizeEnvironmentControls === 'function') {
    climateApi.normalizeEnvironmentControls(s);
    if (typeof climateApi.ensureClimateState === 'function') {
      climateApi.ensureClimateState(s, s.status, s.simulation, s.plant);
    }
    return;
  }

  if (!s.environmentControls || typeof s.environmentControls !== 'object') {
    s.environmentControls = {
      temperatureC: 25,
      humidityPercent: 60,
      airflowPercent: 70,
      ph: 6.0,
      ec: 1.4,
      light: { ppfdTarget: 620 }
    };
  } else if (!s.environmentControls.light || typeof s.environmentControls.light !== 'object') {
    s.environmentControls.light = { ppfdTarget: 620 };
  } else if (!Number.isFinite(Number(s.environmentControls.light.ppfdTarget))) {
    s.environmentControls.light.ppfdTarget = 620;
  }
  if (!s.climate || typeof s.climate !== 'object') {
    s.climate = {};
  }
}

function getCanonicalSimulation(snapshot) {
  const s = snapshot || state;
  if (!s.simulation || typeof s.simulation !== 'object') {
    s.simulation = {};
  }

  const nowMs = Date.now();
  if (!Number.isFinite(s.simulation.nowMs)) s.simulation.nowMs = nowMs;
  if (!Number.isFinite(s.simulation.startRealTimeMs)) s.simulation.startRealTimeMs = nowMs;
  if (!Number.isFinite(s.simulation.lastTickRealTimeMs)) s.simulation.lastTickRealTimeMs = nowMs;
  if (!Number.isFinite(s.simulation.simTimeMs)) s.simulation.simTimeMs = alignStorageToSimStartHour(nowMs, STORAGE_SIM_START_HOUR);
  if (!Number.isFinite(s.simulation.simEpochMs)) s.simulation.simEpochMs = alignStorageToSimStartHour(s.simulation.startRealTimeMs, STORAGE_SIM_START_HOUR);
  if (!Number.isFinite(s.simulation.simDay)) s.simulation.simDay = 0;
  if (!Number.isFinite(s.simulation.simHour)) s.simulation.simHour = STORAGE_SIM_START_HOUR;
  if (!Number.isFinite(s.simulation.simMinute)) s.simulation.simMinute = 0;
  if (!Number.isFinite(s.simulation.tickCount)) s.simulation.tickCount = 0;
  if (typeof s.simulation.mode !== 'string') s.simulation.mode = STORAGE_MODE;
  if (!Number.isFinite(s.simulation.tickIntervalMs)) s.simulation.tickIntervalMs = STORAGE_UI_TICK_INTERVAL_MS;
  if (!Number.isFinite(s.simulation.baseSpeed)) s.simulation.baseSpeed = normalizeStorageBaseSimulationSpeed(s.simulation.timeCompression);
  s.simulation.baseSpeed = normalizeStorageBaseSimulationSpeed(s.simulation.baseSpeed);
  if (!Number.isFinite(s.simulation.effectiveSpeed)) s.simulation.effectiveSpeed = s.simulation.baseSpeed;
  if (!Number.isFinite(s.simulation.timeCompression)) s.simulation.timeCompression = s.simulation.effectiveSpeed;
  if (typeof s.simulation.globalSeed !== 'string') s.simulation.globalSeed = STORAGE_SIM_GLOBAL_SEED;
  if (typeof s.simulation.plantId !== 'string') s.simulation.plantId = STORAGE_SIM_PLANT_ID;
  if (!s.simulation.dayWindow || typeof s.simulation.dayWindow !== 'object') s.simulation.dayWindow = { startHour: STORAGE_SIM_DAY_START_HOUR, endHour: STORAGE_SIM_NIGHT_START_HOUR };
  s.simulation.lastTickRealTimeMs = Math.max(
    Number(s.simulation.startRealTimeMs) || nowMs,
    Number(s.simulation.lastTickRealTimeMs) || nowMs
  );
  s.simulation.nowMs = Math.max(
    Number(s.simulation.nowMs) || nowMs,
    Number(s.simulation.lastTickRealTimeMs) || nowMs
  );
  s.simulation.simTimeMs = Math.max(
    Number(s.simulation.simEpochMs) || alignStorageToSimStartHour(nowMs, STORAGE_SIM_START_HOUR),
    Number(s.simulation.simTimeMs) || alignStorageToSimStartHour(nowMs, STORAGE_SIM_START_HOUR)
  );
  if (typeof s.simulation.isDaytime !== 'boolean') s.simulation.isDaytime = isDaytimeAtSimTime(s.simulation.simTimeMs);
  if (!Number.isFinite(s.simulation.growthImpulse)) s.simulation.growthImpulse = 0;
  if (!Number.isFinite(s.simulation.tempoOffsetDays)) s.simulation.tempoOffsetDays = 0;
  if (!Number.isFinite(s.simulation.stressExposure)) s.simulation.stressExposure = 0;
  if (!Number.isFinite(s.simulation.riskExposure)) s.simulation.riskExposure = 0;
  if (!Number.isFinite(s.simulation.lastPushScheduleAtMs)) s.simulation.lastPushScheduleAtMs = 0;

  if (!s.boost || typeof s.boost !== 'object') {
    s.boost = {};
  }
  if (!Number.isFinite(s.boost.boostEndsAtMs)) {
    s.boost.boostEndsAtMs = 0;
  }
  if (!s.rewardActions || typeof s.rewardActions !== 'object') {
    s.rewardActions = {};
  }
  if (typeof s.rewardActions.provider !== 'string' || !s.rewardActions.provider.trim()) {
    s.rewardActions.provider = 'direct';
  }
  if (!Number.isFinite(Number(s.rewardActions.lastTriggeredAtMs))) {
    s.rewardActions.lastTriggeredAtMs = 0;
  }
  if (!Number.isFinite(Number(s.rewardActions.lastGrantedAtMs))) {
    s.rewardActions.lastGrantedAtMs = 0;
  }
  if (!Number.isFinite(Number(s.rewardActions.lastExecutedAtMs))) {
    s.rewardActions.lastExecutedAtMs = 0;
  }
  if (!s.rewardActions.byType || typeof s.rewardActions.byType !== 'object') {
    s.rewardActions.byType = {};
  }

  return s.simulation;
}

function getCanonicalPlant(snapshot) {
  const s = snapshot || state;
  if (!s.plant || typeof s.plant !== 'object') {
    s.plant = {};
  }

  if (typeof s.plant.phase !== 'string') s.plant.phase = 'seedling';
  if (typeof s.plant.isDead !== 'boolean') s.plant.isDead = false;
  if (!Number.isFinite(s.plant.stageIndex)) s.plant.stageIndex = 0;
  if (typeof s.plant.stageKey !== 'string') s.plant.stageKey = 'stage_01';
  if (!Number.isFinite(s.plant.stageProgress)) s.plant.stageProgress = 0;
  if (!Number.isFinite(s.plant.stageStartSimDay)) s.plant.stageStartSimDay = 0;
  if (typeof s.plant.lastValidStageKey !== 'string') s.plant.lastValidStageKey = 'stage_01';
  if (!Number.isFinite(s.plant.averageHealth)) s.plant.averageHealth = 85;
  if (!Number.isFinite(s.plant.averageStress)) s.plant.averageStress = 15;
  if (!Number.isFinite(s.plant.observedSimMs)) s.plant.observedSimMs = 0;
  if (!Number.isFinite(s.plant.progressOffsetSimMs)) s.plant.progressOffsetSimMs = 0;
  if (!s.plant.lifecycle || typeof s.plant.lifecycle !== 'object') {
    s.plant.lifecycle = { totalSimDays: TOTAL_LIFECYCLE_SIM_DAYS, qualityTier: 'normal', qualityScore: 0, qualityLocked: false };
  }
  if (!s.plant.assets || typeof s.plant.assets !== 'object') {
    s.plant.assets = { basePath: 'assets/plant_growth/', resolvedStagePath: '' };
  }

  return s.plant;
}

function getCanonicalEvents(snapshot) {
  const s = snapshot || state;
  const sim = getCanonicalSimulation(s);
  ensureEventV2BrowserPilotState(s);
  if (!s.events || typeof s.events !== 'object') {
    s.events = {};
  }

  if (typeof s.events.machineState !== 'string') s.events.machineState = 'idle';
  if (!s.events.scheduler || typeof s.events.scheduler !== 'object') {
    s.events.scheduler = {
      nextEventSimTimeMs: Number(sim.simTimeMs || 0) + (STORAGE_EVENT_ROLL_MIN_REAL_MS * Number(sim.effectiveSpeed || sim.baseSpeed || STORAGE_DEFAULT_BASE_SIM_SPEED || 12)),
      nextEventRealTimeMs: Date.now() + STORAGE_EVENT_ROLL_MIN_REAL_MS,
      lastEventSimTimeMs: 0,
      lastEventRealTimeMs: 0,
      lastEventId: null,
      lastChoiceId: null,
      lastEventCategory: null,
      deferredUntilDaytime: false,
      windowRealMinutes: { min: 30, max: 90 },
      eventCooldowns: {},
      categoryCooldowns: {},
      eventCooldownsSim: {},
      categoryCooldownsSim: {}
    };
  }
  if (!Number.isFinite(s.events.scheduler.nextEventSimTimeMs)) s.events.scheduler.nextEventSimTimeMs = Number(sim.simTimeMs || 0) + (STORAGE_EVENT_ROLL_MIN_REAL_MS * Number(sim.effectiveSpeed || sim.baseSpeed || STORAGE_DEFAULT_BASE_SIM_SPEED || 12));
  if (!Number.isFinite(s.events.scheduler.lastEventSimTimeMs)) s.events.scheduler.lastEventSimTimeMs = 0;
  if (!s.events.scheduler.eventCooldownsSim || typeof s.events.scheduler.eventCooldownsSim !== 'object') s.events.scheduler.eventCooldownsSim = {};
  if (!s.events.scheduler.categoryCooldownsSim || typeof s.events.scheduler.categoryCooldownsSim !== 'object') s.events.scheduler.categoryCooldownsSim = {};
  if (!s.events.active || typeof s.events.active !== 'object') {
    s.events.active = null;
  }
  if (!Array.isArray(s.events.history)) s.events.history = [];
  if (typeof s.events.activeEventId !== 'string') s.events.activeEventId = null;
  if (typeof s.events.activeEventTitle !== 'string') s.events.activeEventTitle = '';
  if (typeof s.events.activeEventText !== 'string') s.events.activeEventText = '';
  if (typeof s.events.activeLearningNote !== 'string') s.events.activeLearningNote = '';
  if (!Array.isArray(s.events.activeOptions)) s.events.activeOptions = [];
  if (!Number.isFinite(s.events.activeSeverity)) s.events.activeSeverity = 1;
  if (!Number.isFinite(s.events.activeCooldownRealMinutes)) s.events.activeCooldownRealMinutes = 120;
  if (!Number.isFinite(s.events.activeResolveTimeMinutes)) s.events.activeResolveTimeMinutes = 60;
  if (typeof s.events.activeCategory !== 'string') s.events.activeCategory = 'generic';
  if (!Array.isArray(s.events.activeTags)) s.events.activeTags = [];
  if (!Number.isFinite(s.events.resolvingUntilMs)) s.events.resolvingUntilMs = 0;
  if (!Number.isFinite(s.events.lastEventAtMs)) s.events.lastEventAtMs = 0;
  if (!Number.isFinite(s.events.resolvingUntilSimTimeMs)) s.events.resolvingUntilSimTimeMs = 0;
  if (!Number.isFinite(s.events.cooldownUntilMs)) s.events.cooldownUntilMs = 0;
  if (!Number.isFinite(s.events.cooldownUntilSimTimeMs)) s.events.cooldownUntilSimTimeMs = 0;
  if (s.events.pendingOutcome != null && typeof s.events.pendingOutcome !== 'object') s.events.pendingOutcome = null;
  if (s.events.resolvedOutcome != null && typeof s.events.resolvedOutcome !== 'object') s.events.resolvedOutcome = null;
  if (s.events.pendingResolution != null && typeof s.events.pendingResolution !== 'object') s.events.pendingResolution = null;
  if (!Array.isArray(s.events.catalog)) s.events.catalog = [];
  if (!s.events.foundation || typeof s.events.foundation !== 'object') s.events.foundation = {};
  if (!s.events.foundation.flags || typeof s.events.foundation.flags !== 'object') s.events.foundation.flags = {};
  if (!s.events.foundation.memory || typeof s.events.foundation.memory !== 'object') s.events.foundation.memory = {};
  if (!Array.isArray(s.events.foundation.memory.events)) s.events.foundation.memory.events = [];
  if (!Array.isArray(s.events.foundation.memory.decisions)) s.events.foundation.memory.decisions = [];
  if (!s.events.foundation.memory.pendingChains || typeof s.events.foundation.memory.pendingChains !== 'object') s.events.foundation.memory.pendingChains = {};
  s.events.foundation.memory.pendingChains = normalizePendingChainsForStorage(s.events.foundation.memory.pendingChains);
  if (!Array.isArray(s.events.foundation.analysis)) s.events.foundation.analysis = [];
  if (!s.events.audit || typeof s.events.audit !== 'object') {
    s.events.audit = {};
  }
  if (!s.events.audit.totals || typeof s.events.audit.totals !== 'object') {
    s.events.audit.totals = {};
  }
  if (!s.events.audit.byCategory || typeof s.events.audit.byCategory !== 'object') s.events.audit.byCategory = {};
  if (!s.events.audit.byPhase || typeof s.events.audit.byPhase !== 'object') s.events.audit.byPhase = {};
  if (!s.events.audit.byStage || typeof s.events.audit.byStage !== 'object') s.events.audit.byStage = {};
  if (!s.events.audit.byEventId || typeof s.events.audit.byEventId !== 'object') s.events.audit.byEventId = {};
  if (!s.events.audit.bySimDay || typeof s.events.audit.bySimDay !== 'object') s.events.audit.bySimDay = {};
  if (!s.events.audit.outcomes || typeof s.events.audit.outcomes !== 'object') s.events.audit.outcomes = {};
  if (!s.events.audit.followUps || typeof s.events.audit.followUps !== 'object') s.events.audit.followUps = {};
  if (!s.events.audit.followUps.byTargetId || typeof s.events.audit.followUps.byTargetId !== 'object') s.events.audit.followUps.byTargetId = {};
  if (!s.events.audit.followUps.bySourceId || typeof s.events.audit.followUps.bySourceId !== 'object') s.events.audit.followUps.bySourceId = {};
  if (!s.events.audit.guardInterventions || typeof s.events.audit.guardInterventions !== 'object') s.events.audit.guardInterventions = {};
  if (!s.events.audit.gaps || typeof s.events.audit.gaps !== 'object') s.events.audit.gaps = {};
  if (!Array.isArray(s.events.audit.gaps.recentSimMs)) s.events.audit.gaps.recentSimMs = [];
  if (!Number.isFinite(s.events.audit.gaps.lastActivatedAtSimTimeMs)) s.events.audit.gaps.lastActivatedAtSimTimeMs = 0;
  if (!Number.isFinite(s.events.audit.gaps.meanSimMs)) s.events.audit.gaps.meanSimMs = 0;
  if (!Number.isFinite(s.events.audit.gaps.maxSimMs)) s.events.audit.gaps.maxSimMs = 0;
  if (!Number.isFinite(s.events.audit.gaps.shortGapClusterCount)) s.events.audit.gaps.shortGapClusterCount = 0;
  if (!Number.isFinite(s.events.audit.gaps.longGapCount)) s.events.audit.gaps.longGapCount = 0;
  if (!s.events.audit.recent || typeof s.events.audit.recent !== 'object') s.events.audit.recent = {};
  if (!Array.isArray(s.events.audit.recent.eventIds)) s.events.audit.recent.eventIds = [];
  if (!Array.isArray(s.events.audit.recent.categories)) s.events.audit.recent.categories = [];
  if (!Array.isArray(s.events.audit.recent.outcomes)) s.events.audit.recent.outcomes = [];
  if (!Array.isArray(s.events.audit.recent.followUps)) s.events.audit.recent.followUps = [];
  if (!Number.isFinite(s.events.audit.version)) s.events.audit.version = 1;
  if (s.events.shadowRuntime != null && typeof s.events.shadowRuntime !== 'object') s.events.shadowRuntime = null;

  return s.events;
}

function ensureEventV2BrowserPilotState(snapshot) {
  const s = snapshot || state;
  if (!s || typeof s !== 'object') {
    return null;
  }
  const bridge = (typeof window !== 'undefined' && window.GrowSimEventSystemRuntimeBridge)
    ? window.GrowSimEventSystemRuntimeBridge
    : null;
  if (bridge && typeof bridge.ensureEventV2StateInPlace === 'function') {
    return bridge.ensureEventV2StateInPlace(s, {
      eventSystemMode: 'v2-active-with-v1-legacy-read',
      mode: 'active'
    });
  }
  const existing = s.eventV2 && typeof s.eventV2 === 'object' && !Array.isArray(s.eventV2)
    ? s.eventV2
    : {};
  const meta = existing.meta && typeof existing.meta === 'object' ? existing.meta : {};
  const counters = meta.counters && typeof meta.counters === 'object' ? meta.counters : {};
  s.eventV2 = {
    ...existing,
    schemaVersion: Number(existing.schemaVersion) === 1 ? 1 : 1,
    mode: ['no-write', 'dry-run', 'active'].includes(existing.mode) ? existing.mode : 'active',
    openEvents: Array.isArray(existing.openEvents) ? existing.openEvents : [],
    history: Array.isArray(existing.history) ? existing.history : [],
    meta: {
      lastGeneratedAt: Object.prototype.hasOwnProperty.call(meta, 'lastGeneratedAt') ? meta.lastGeneratedAt : null,
      lastResolvedAt: Object.prototype.hasOwnProperty.call(meta, 'lastResolvedAt') ? meta.lastResolvedAt : null,
      lastAuditAt: Object.prototype.hasOwnProperty.call(meta, 'lastAuditAt') ? meta.lastAuditAt : null,
      lastError: Object.prototype.hasOwnProperty.call(meta, 'lastError') ? meta.lastError : null,
      ...meta,
      eventSystemMode: 'v2-active-with-v1-legacy-read',
      browserRuntimePilot: true,
      counters: {
        generated: Number.isFinite(Number(counters.generated)) ? Number(counters.generated) : 0,
        resolved: Number.isFinite(Number(counters.resolved)) ? Number(counters.resolved) : 0,
        rejected: Number.isFinite(Number(counters.rejected)) ? Number(counters.rejected) : 0,
        expired: Number.isFinite(Number(counters.expired)) ? Number(counters.expired) : 0,
        ...counters
      }
    }
  };
  return {
    ok: true,
    initialized: !existing.schemaVersion,
    mutated: true,
    eventV2: s.eventV2,
    warnings: [],
    errors: []
  };
}

function getCanonicalHistory(snapshot) {
  const s = snapshot || state;
  if (!s.history || typeof s.history !== 'object') {
    s.history = { actions: [], events: [], system: [], systemLog: [] };
  }
  if (!Array.isArray(s.history.actions)) s.history.actions = [];
  if (!Array.isArray(s.history.events)) s.history.events = [];
  if (!Array.isArray(s.history.system)) s.history.system = [];
  if (!Array.isArray(s.history.systemLog)) s.history.systemLog = [];
  return s.history;
}

function getCanonicalCare(snapshot) {
  const s = snapshot || state;
  s.care = normalizeCanonicalCareState(s.care, s);
  return s.care;
}

function getCanonicalMeta(snapshot) {
  const s = snapshot || state;
  const createDefaultFirstRunIntroState = () => ({
    active: false,
    completed: false,
    dashboardFollowupShown: false,
    step: 'plant',
    createdAtRealMs: 0,
    completedAtRealMs: 0,
    growStyle: 'safe',
    environment: 'indoor',
    plantType: 'beginner',
    decisionId: '',
    resultTone: 'good',
    statusKey: 'good'
  });
  if (!s.meta || typeof s.meta !== 'object') {
    s.meta = {};
  }
  if (!s.meta.rescue || typeof s.meta.rescue !== 'object') {
    s.meta.rescue = {};
  }
  if (typeof s.meta.rescue.used !== 'boolean') s.meta.rescue.used = false;
  if (!Number.isFinite(Number(s.meta.rescue.usedAtRealMs))) s.meta.rescue.usedAtRealMs = null;
  if (s.meta.rescue.lastResult !== null && typeof s.meta.rescue.lastResult !== 'string') s.meta.rescue.lastResult = null;
  if (!s.meta.persistence || typeof s.meta.persistence !== 'object') {
    s.meta.persistence = {};
  }
  if (!Number.isFinite(Number(s.meta.persistence.lastSavedAtRealMs))) {
    s.meta.persistence.lastSavedAtRealMs = 0;
  }
  if (!s.meta.rewardLedger || typeof s.meta.rewardLedger !== 'object') {
    s.meta.rewardLedger = {};
  }
  if (!s.meta.firstRunIntro || typeof s.meta.firstRunIntro !== 'object') {
    s.meta.firstRunIntro = createDefaultFirstRunIntroState();
  }
  const existingFirstRunIntro = { ...s.meta.firstRunIntro };
  Object.assign(
    s.meta.firstRunIntro,
    createDefaultFirstRunIntroState(),
    existingFirstRunIntro
  );
  return s.meta;
}

function ensureStorageCurrencyState(snapshot) {
  const s = snapshot || state;
  if (!s.status || typeof s.status !== 'object') {
    s.status = {};
  }
  const parsedCoins = Number(s.status.coins);
  s.status.coins = Number.isFinite(parsedCoins) ? Math.max(0, Math.round(parsedCoins)) : 0;
  if (Object.prototype.hasOwnProperty.call(s.status, 'gems')) {
    delete s.status.gems;
  }
  if (Object.prototype.hasOwnProperty.call(s.status, 'stars')) {
    delete s.status.stars;
  }

  const meta = getCanonicalMeta(s);
  if (!meta.rewardLedger || typeof meta.rewardLedger !== 'object') {
    meta.rewardLedger = {};
  }

  if (meta.inventory && typeof meta.inventory === 'object') {
    delete meta.inventory.gems;
    delete meta.inventory.stars;
    if (!Number.isFinite(Number(meta.inventory.coins))) {
      delete meta.inventory.coins;
    }
    if (!Object.keys(meta.inventory).length) {
      delete meta.inventory;
    }
  }

  if (typeof window !== 'undefined' && typeof window.ensureCurrencyState === 'function') {
    try {
      window.ensureCurrencyState(s);
    } catch (error) {
      console.warn('[storage] currency normalization fallback used', error);
    }
  }

  return s.status;
}

function getCanonicalSettings(snapshot) {
  const s = snapshot || state;
  if (!s.settings || typeof s.settings !== 'object') {
    s.settings = {};
  }
  if (typeof s.settings.language !== 'string') {
    s.settings.language = '';
  }
  if (!s.settings.gameplay || typeof s.settings.gameplay !== 'object') {
    s.settings.gameplay = {};
  }
  s.settings.gameplay.simSpeed = normalizeStorageBaseSimulationSpeed(
    s.settings.gameplay.simSpeed || (s.simulation && s.simulation.baseSpeed) || STORAGE_DEFAULT_BASE_SIM_SPEED
  );
  if (typeof s.settings.gameplay.eventFrequency !== 'string') s.settings.gameplay.eventFrequency = 'Normal';
  if (typeof s.settings.gameplay.tutorial !== 'boolean') s.settings.gameplay.tutorial = true;
  if (!Number.isFinite(Number(s.settings.gameplay.autosave))) s.settings.gameplay.autosave = 5;
  const notifications = getCanonicalNotificationsSettings(s);
  s.settings.notifications = notifications;
  return s.settings;
}

function getCanonicalNotificationsSettings(snapshot) {
  const s = snapshot || state;
  if (!s.settings || typeof s.settings !== 'object') {
    s.settings = {};
  }

  const legacyEnabled = Boolean(s.settings.pushNotificationsEnabled);
  if (!s.settings.notifications || typeof s.settings.notifications !== 'object') {
    s.settings.notifications = {};
  }

  const n = s.settings.notifications;
  n.enabled = typeof n.enabled === 'boolean' ? n.enabled : legacyEnabled;
  if (!n.types || typeof n.types !== 'object') {
    n.types = {};
  }
  n.types.events = typeof n.types.events === 'boolean' ? n.types.events : true;
  n.types.critical = typeof n.types.critical === 'boolean' ? n.types.critical : true;
  n.types.reminder = typeof n.types.reminder === 'boolean' ? n.types.reminder : true;

  if (!n.runtime || typeof n.runtime !== 'object') {
    n.runtime = {};
  }
  n.runtime.lastNotifiedEventId = (typeof n.runtime.lastNotifiedEventId === 'string' || n.runtime.lastNotifiedEventId === null)
    ? n.runtime.lastNotifiedEventId
    : null;
  n.runtime.lastCriticalAtRealMs = Number.isFinite(Number(n.runtime.lastCriticalAtRealMs)) ? Number(n.runtime.lastCriticalAtRealMs) : 0;
  n.runtime.lastReminderAtRealMs = Number.isFinite(Number(n.runtime.lastReminderAtRealMs)) ? Number(n.runtime.lastReminderAtRealMs) : 0;
  n.lastMessage = (typeof n.lastMessage === 'string' || n.lastMessage === null) ? n.lastMessage : null;

  return n;
}

const STORED_HARVEST_VERIFICATION_STATUSES = new Set([
  'local_only',
  'submitted',
  'provisional',
  'verified',
  'rejected',
  'under_review'
]);

function normalizeStoredHarvestVerificationResult(resultLike) {
  if (!resultLike || typeof resultLike !== 'object') {
    return null;
  }

  const result = resultLike;
  const normalizeScore = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric * 100) / 100)) : null;
  };
  const normalizeText = (value, fallback = '') => {
    return typeof value === 'string' ? value.trim() : fallback;
  };

  return {
    harvestScore: normalizeScore(result.harvestScore),
    yieldScore: normalizeScore(result.yieldScore),
    qualityScore: normalizeScore(result.qualityScore),
    stabilityScore: normalizeScore(result.stabilityScore),
    efficiencyScore: normalizeScore(result.efficiencyScore),
    challengeScore: normalizeScore(result.challengeScore),
    qualityBandLabel: normalizeText(result.qualityBandLabel || result.qualityBand, ''),
    qualityTier: normalizeText(result.qualityTier, ''),
    verificationStatus: normalizeText(result.verificationStatus || result.status, ''),
    explanation: normalizeText(result.explanation || result.reason || result.message, ''),
    verifiedAt: normalizeText(result.verifiedAt || result.updatedAt || result.checkedAt, ''),
    leaderboardEligible: Boolean(result.leaderboardEligible),
    anomalyFlags: Array.isArray(result.anomalyFlags) ? result.anomalyFlags.map((entry) => String(entry || '').trim()).filter(Boolean) : []
  };
}

function normalizeStoredHarvestSubmissionReadiness(readinessLike) {
  const readiness = readinessLike && typeof readinessLike === 'object' ? readinessLike : {};
  const verificationStatus = STORED_HARVEST_VERIFICATION_STATUSES.has(String(readiness.verificationStatus || '').trim())
    ? String(readiness.verificationStatus).trim()
    : 'local_only';
  const leaderboardSnapshot = readiness.leaderboardSnapshot && typeof readiness.leaderboardSnapshot === 'object'
    ? readiness.leaderboardSnapshot
    : null;

  return {
    localSummaryReady: Boolean(readiness.localSummaryReady),
    verificationStatus,
    lastLocalFinalizeAtRealMs: Number.isFinite(Number(readiness.lastLocalFinalizeAtRealMs)) ? Number(readiness.lastLocalFinalizeAtRealMs) : null,
    pendingSubmission: Boolean(readiness.pendingSubmission),
    lastVerifiedSyncAtRealMs: Number.isFinite(Number(readiness.lastVerifiedSyncAtRealMs)) ? Number(readiness.lastVerifiedSyncAtRealMs) : null,
    backendSessionId: typeof readiness.backendSessionId === 'string' ? readiness.backendSessionId.trim() : '',
    sessionState: typeof readiness.sessionState === 'string' ? readiness.sessionState.trim() : 'idle',
    sessionError: typeof readiness.sessionError === 'string' ? readiness.sessionError.trim() : '',
    submissionId: typeof readiness.submissionId === 'string' ? readiness.submissionId.trim() : '',
    submissionState: typeof readiness.submissionState === 'string' ? readiness.submissionState.trim() : 'idle',
    submissionError: typeof readiness.submissionError === 'string' ? readiness.submissionError.trim() : '',
    statusMessage: typeof readiness.statusMessage === 'string' ? readiness.statusMessage.trim() : '',
    serverCode: typeof readiness.serverCode === 'string' ? readiness.serverCode.trim() : '',
    verifiedHarvestResult: normalizeStoredHarvestVerificationResult(readiness.verifiedHarvestResult),
    provisionalHarvestResult: normalizeStoredHarvestVerificationResult(readiness.provisionalHarvestResult),
    leaderboardEligible: Boolean(readiness.leaderboardEligible),
    reviewNeeded: Boolean(readiness.reviewNeeded),
    anomalyFlags: Array.isArray(readiness.anomalyFlags) ? readiness.anomalyFlags.map((entry) => String(entry || '').trim()).filter(Boolean) : [],
    lastVerificationAt: Number.isFinite(Number(readiness.lastVerificationAt)) ? Number(readiness.lastVerificationAt) : null,
    leaderboardSnapshot: leaderboardSnapshot ? {
      scope: typeof leaderboardSnapshot.scope === 'string' ? leaderboardSnapshot.scope.trim() : 'weekly',
      category: typeof leaderboardSnapshot.category === 'string' ? leaderboardSnapshot.category.trim() : 'overall',
      periodKey: typeof leaderboardSnapshot.periodKey === 'string' ? leaderboardSnapshot.periodKey.trim() : '',
      rank: Number.isFinite(Number(leaderboardSnapshot.rank)) ? Number(leaderboardSnapshot.rank) : null,
      bestRank: Number.isFinite(Number(leaderboardSnapshot.bestRank)) ? Number(leaderboardSnapshot.bestRank) : null,
      score: Number.isFinite(Number(leaderboardSnapshot.score)) ? Number(leaderboardSnapshot.score) : null,
      fetchedAt: Number.isFinite(Number(leaderboardSnapshot.fetchedAt)) ? Number(leaderboardSnapshot.fetchedAt) : null
    } : null
  };
}

function getCanonicalProfile(snapshot) {
  const s = snapshot || state;
  const progressionApi = getProgressionApi();
  const harvestApi = window.GrowSimHarvest && typeof window.GrowSimHarvest === 'object'
    ? window.GrowSimHarvest
    : null;
  if (!progressionApi || typeof progressionApi.normalizeProfile !== 'function') {
    if (!s.profile || typeof s.profile !== 'object') {
      const defaultHarvest = harvestApi && typeof harvestApi.getDefaultProfileHarvest === 'function'
        ? harvestApi.getDefaultProfileHarvest()
        : null;
      s.profile = {
        displayName: 'Marco',
        totalXp: 0,
        level: 1,
        unlocks: {
          setupModes: ['indoor'],
          media: ['soil'],
          lights: ['medium'],
          genetics: ['hybrid']
        },
        stats: {
          totalRuns: 0,
          deathRuns: 0,
          harvestRuns: 0,
          bestSimDay: 0,
          bestQualityScore: 0
        },
        lastRunSummary: null,
        harvest: defaultHarvest ? { ...defaultHarvest } : undefined
      };
    }
    if (harvestApi && typeof harvestApi.normalizeProfileHarvest === 'function') {
      s.profile.harvest = harvestApi.normalizeProfileHarvest(s.profile.harvest);
    }
    return s.profile;
  }

  s.profile = progressionApi.normalizeProfile(s.profile);
  if (harvestApi && typeof harvestApi.normalizeProfileHarvest === 'function') {
    s.profile.harvest = harvestApi.normalizeProfileHarvest(s.profile.harvest);
  }
  return s.profile;
}

function getCanonicalRun(snapshot) {
  const s = snapshot || state;
  const progressionApi = getProgressionApi();
  const harvestApi = window.GrowSimHarvest && typeof window.GrowSimHarvest === 'object'
    ? window.GrowSimHarvest
    : null;
  if (!progressionApi || typeof progressionApi.normalizeRunState !== 'function') {
    if (!s.run || typeof s.run !== 'object') {
      const defaultHarvest = harvestApi && typeof harvestApi.getDefaultRunHarvest === 'function'
        ? harvestApi.getDefaultRunHarvest()
        : null;
      s.run = {
        id: 0,
        status: 'idle',
      endReason: null,
      startedAtRealMs: null,
      endedAtRealMs: null,
      finalizedAtRealMs: null,
      setupSnapshot: null,
      goal: null,
      goalHistory: [],
      harvest: defaultHarvest ? { ...defaultHarvest } : undefined
    };
    }
    if (harvestApi && typeof harvestApi.normalizeRunHarvest === 'function') {
      s.run.harvest = harvestApi.normalizeRunHarvest(s.run.harvest);
    }
    if (!s.run.harvest || typeof s.run.harvest !== 'object') {
      s.run.harvest = {};
    }
    s.run.harvest.submissionReadiness = normalizeStoredHarvestSubmissionReadiness(s.run.harvest.submissionReadiness);
    return s.run;
  }

  s.run = progressionApi.normalizeRunState(s.run);
  if (harvestApi && typeof harvestApi.normalizeRunHarvest === 'function') {
    s.run.harvest = harvestApi.normalizeRunHarvest(s.run.harvest);
  }
  if (!s.run.harvest || typeof s.run.harvest !== 'object') {
    s.run.harvest = {};
  }
  s.run.harvest.submissionReadiness = normalizeStoredHarvestSubmissionReadiness(s.run.harvest.submissionReadiness);
  return s.run;
}

function isRunFinalized(runLike) {
  return runLike != null
    && runLike.finalizedAtRealMs != null
    && Number.isFinite(Number(runLike.finalizedAtRealMs));
}

function normalizeSetupState(setupLike, simulationLike) {
  if (!setupLike || typeof setupLike !== 'object') {
    return null;
  }

  const mode = typeof setupLike.mode === 'string' ? setupLike.mode.trim() : '';
  const light = typeof setupLike.light === 'string' ? setupLike.light.trim() : '';
  const medium = typeof setupLike.medium === 'string' ? setupLike.medium.trim() : '';
  const potSize = typeof setupLike.potSize === 'string' ? setupLike.potSize.trim() : '';
  const genetics = typeof setupLike.genetics === 'string' ? setupLike.genetics.trim() : '';

  if (!mode || !light || !medium || !potSize || !genetics) {
    return null;
  }

  const sim = simulationLike && typeof simulationLike === 'object' ? simulationLike : {};
  const derivedCreatedAtReal = Number(
    setupLike.createdAtReal
      ?? setupLike.createdAtRealMs
      ?? sim.startRealTimeMs
      ?? sim.lastTickRealTimeMs
      ?? sim.nowMs
      ?? Date.now()
  );

  return {
    ...setupLike,
    mode,
    light,
    medium,
    potSize,
    genetics,
    createdAtReal: Number.isFinite(derivedCreatedAtReal) ? derivedCreatedAtReal : Date.now()
  };
}

async function restoreState(options = {}) {
  globalThis.__gsStorageRestoreMeta = {
    restored: false,
    source: null,
    runStatus: null,
    restoredAtRealMs: 0
  };
  if (!storageAdapter) {
    return;
  }

  let localSaved = null;
  try {
    localSaved = await storageAdapter.get();
  } catch (error) {
    console.warn('[storage] local state restore read failed', error);
    return;
  }

  let remoteSaved = null;
  try {
    remoteSaved = await loadRemoteSave({ force: Boolean(options && options.forceRemote === true) });
  } catch (error) {
    console.warn('[storage] remote state restore read failed', error);
  }

  const selectedRestore = choosePreferredRestoreSnapshot(localSaved, remoteSaved);
  const saved = selectedRestore.snapshot;
  if (!saved || typeof saved !== 'object') {
    return;
  }
  globalThis.__gsStorageHasWrittenLocalState = selectedRestore.source === 'local';
  globalThis.__gsStorageRestoreMeta = {
    restored: true,
    source: selectedRestore.source || null,
    runStatus: saved && saved.run && saved.run.status ? String(saved.run.status) : null,
    restoredAtRealMs: Date.now()
  };

  if (selectedRestore.source === 'local' && remoteSaved && localSaved) {
    logStorageDebugInfo('[restore] local save selected over remote', {
      local: getStateFreshnessMetrics(localSaved),
      remote: getStateFreshnessMetrics(remoteSaved)
    });
  } else if (selectedRestore.source === 'remote') {
    logStorageDebugInfo('[restore] remote save selected', {
      local: localSaved ? getStateFreshnessMetrics(localSaved) : null,
      remote: getStateFreshnessMetrics(remoteSaved)
    });
  } else if (selectedRestore.source === 'local') {
    logStorageDebugInfo('[restore] local save selected', {
      local: getStateFreshnessMetrics(localSaved)
    });
  }
  logStorageDebugInfo('[restore] applying snapshot', {
    source: selectedRestore.source,
    metrics: getStateFreshnessMetrics(saved),
    runStatus: saved && saved.run && saved.run.status ? String(saved.run.status) : null,
    finalized: Boolean(saved && saved.run && Number.isFinite(Number(saved.run.finalizedAtRealMs))),
    summaryOpen: Boolean(saved && saved.ui && saved.ui.runSummaryOpen),
    hasSummary: Boolean(saved && saved.profile && saved.profile.lastRunSummary)
  });

  const sim = getCanonicalSimulation(state);
  const plant = getCanonicalPlant(state);
  const events = getCanonicalEvents(state);
  const history = getCanonicalHistory(state);
  const meta = getCanonicalMeta(state);
  const settings = getCanonicalSettings(state);
  const profile = getCanonicalProfile(state);
  const run = getCanonicalRun(state);

  if (saved.simulation && typeof saved.simulation === 'object') {
    state.simulation = {
      ...state.simulation,
      ...saved.simulation
    };
  }

  if (saved.plant && typeof saved.plant === 'object') {
    state.plant = {
      ...state.plant,
      ...saved.plant
    };
  }

  if (saved.events && typeof saved.events === 'object') {
    state.events = {
      ...state.events,
      ...saved.events,
      scheduler: {
        ...events.scheduler,
        ...((saved.events && saved.events.scheduler) || {})
      }
    };
  }

  if (saved.eventV2 && typeof saved.eventV2 === 'object' && !Array.isArray(saved.eventV2)) {
    const existingEventV2 = state.eventV2 && typeof state.eventV2 === 'object' && !Array.isArray(state.eventV2)
      ? state.eventV2
      : {};
    const existingMeta = existingEventV2.meta && typeof existingEventV2.meta === 'object' ? existingEventV2.meta : {};
    const savedMeta = saved.eventV2.meta && typeof saved.eventV2.meta === 'object' ? saved.eventV2.meta : {};
    state.eventV2 = {
      ...existingEventV2,
      ...saved.eventV2,
      openEvents: Array.isArray(saved.eventV2.openEvents) ? saved.eventV2.openEvents : (Array.isArray(existingEventV2.openEvents) ? existingEventV2.openEvents : []),
      history: Array.isArray(saved.eventV2.history) ? saved.eventV2.history : (Array.isArray(existingEventV2.history) ? existingEventV2.history : []),
      meta: {
        ...existingMeta,
        ...savedMeta,
        counters: {
          ...((existingMeta && existingMeta.counters && typeof existingMeta.counters === 'object') ? existingMeta.counters : {}),
          ...((savedMeta && savedMeta.counters && typeof savedMeta.counters === 'object') ? savedMeta.counters : {})
        }
      }
    };
  }

  if (saved.history && typeof saved.history === 'object') {
    state.history = {
      ...state.history,
      ...saved.history,
      actions: Array.isArray(saved.history.actions) ? saved.history.actions : history.actions,
      events: Array.isArray(saved.history.events) ? saved.history.events : history.events,
      system: Array.isArray(saved.history.system) ? saved.history.system : history.system,
      systemLog: Array.isArray(saved.history.systemLog) ? saved.history.systemLog : history.systemLog,
      telemetry: Array.isArray(saved.history.telemetry) ? saved.history.telemetry : history.telemetry
    };
  }

  if (saved.status && typeof saved.status === 'object') {
    Object.assign(state.status, saved.status);
  }
  if (saved.care && typeof saved.care === 'object') {
    state.care = {
      ...(state.care && typeof state.care === 'object' ? state.care : {}),
      ...saved.care
    };
  }
  if (saved.environmentControls && typeof saved.environmentControls === 'object') {
    state.environmentControls = {
      ...(state.environmentControls && typeof state.environmentControls === 'object' ? state.environmentControls : {}),
      ...saved.environmentControls
    };
  }
  if (saved.climate && typeof saved.climate === 'object') {
    state.climate = {
      ...(state.climate && typeof state.climate === 'object' ? state.climate : {}),
      ...saved.climate
    };
  }
  if (saved.boost && typeof saved.boost === 'object') {
    Object.assign(state.boost, saved.boost);
  }
  if (saved.actions && typeof saved.actions === 'object') {
    Object.assign(state.actions, saved.actions);
  }
  if (saved.ui && typeof saved.ui === 'object') {
    Object.assign(state.ui, saved.ui);
    state.ui.authGateActive = false;
    state.ui.openSheet = null;
    state.ui.menuOpen = false;
    state.ui.menuDialogOpen = false;
    state.ui.statDetailKey = null;
    state.ui.activeStatPopup = null;
  }
  if (saved.setup && typeof saved.setup === 'object') {
    state.setup = normalizeSetupState(saved.setup, state.simulation);
  }
  if (saved.meta && typeof saved.meta === 'object') {
    state.meta = {
      ...meta,
      ...saved.meta,
      rescue: {
        ...meta.rescue,
        ...((saved.meta && saved.meta.rescue) || {})
      }
    };
  }
  if (saved.settings && typeof saved.settings === 'object') {
    state.settings = {
      ...settings,
      ...saved.settings
    };
    getCanonicalNotificationsSettings(state);
  }
  if (saved.profile && typeof saved.profile === 'object') {
    state.profile = {
      ...profile,
      ...saved.profile
    };
  }
  if (saved.run && typeof saved.run === 'object') {
    state.run = {
      ...run,
      ...saved.run
    };
  }
  if (saved.missions && typeof saved.missions === 'object') {
    const restoredCompleted = Array.isArray(saved.missions.completed)
      ? Array.from(new Set(saved.missions.completed.map((missionId) => String(missionId || '').trim()).filter(Boolean)))
      : (Array.isArray(state.missions && state.missions.completed) ? state.missions.completed : []);
    state.missions = {
      ...(state.missions && typeof state.missions === 'object' ? state.missions : { catalog: [], byId: {}, completed: [] }),
      ...saved.missions,
      completed: restoredCompleted
    };
  }
  if (saved.retention && typeof saved.retention === 'object') {
    state.retention = {
      ...(state.retention && typeof state.retention === 'object' ? state.retention : {}),
      ...saved.retention
    };
  }

  ensureStorageCurrencyState(state);
  migrateLegacyStateIntoCanonical(saved, state);
  normalizeEnvironmentState(state);
  getCanonicalSimulation(state);
  getCanonicalEvents(state);

  try {
    const eventEngine = window && window.GrowSimEventEngine;
    if (eventEngine && typeof eventEngine.restoreShadowRuntimeState === 'function') {
      const restoreDiagnostics = eventEngine.restoreShadowRuntimeState(state, state.events && state.events.shadowRuntime ? state.events.shadowRuntime : null);
      if (restoreDiagnostics && state.events) {
        state.events.shadowRuntime = typeof eventEngine.exportShadowRuntimeState === 'function'
          ? eventEngine.exportShadowRuntimeState(state)
          : state.events.shadowRuntime;
      }
    }
  } catch (error) {
    console.warn('[storage] shadow runtime restore ignored', error);
  }
}

function migrateLegacyStateIntoCanonical(saved, targetState) {
  recordEventV1WriteTelemetryHit('W4', {
    source: 'storage.js:migrate_legacy_state_into_canonical',
    eventId: saved && saved.event && saved.event.activeEventId ? String(saved.event.activeEventId) : null,
    notes: ['save_normalization']
  });
  const sim = getCanonicalSimulation(targetState);
  const plant = getCanonicalPlant(targetState);
  const events = getCanonicalEvents(targetState);
  const history = getCanonicalHistory(targetState);
  ensureStorageCurrencyState(targetState);

  if (saved.sim && typeof saved.sim === 'object') {
    targetState.simulation = {
      ...sim,
      ...saved.sim,
      startRealTimeMs: Number.isFinite(Number(saved.sim.startRealTimeMs)) ? Number(saved.sim.startRealTimeMs) : sim.startRealTimeMs,
      lastTickRealTimeMs: Number.isFinite(Number(saved.sim.lastTickAtMs)) ? Number(saved.sim.lastTickAtMs) : sim.lastTickRealTimeMs,
      simEpochMs: Number(saved.sim.simEpochMs || sim.simEpochMs),
      tickIntervalMs: Number(saved.sim.tickIntervalMs || sim.tickIntervalMs),
      baseSpeed: normalizeStorageBaseSimulationSpeed(saved.sim.baseSpeed || saved.sim.timeCompression || sim.baseSpeed),
      effectiveSpeed: Number(saved.sim.effectiveSpeed || saved.sim.timeCompression || sim.effectiveSpeed),
      growthImpulse: Number(saved.sim.growthImpulse || sim.growthImpulse),
      stressExposure: Number(saved.sim.stressExposure || sim.stressExposure),
      riskExposure: Number(saved.sim.riskExposure || sim.riskExposure),
      lastPushScheduleAtMs: Number(saved.sim.lastPushScheduleAtMs || sim.lastPushScheduleAtMs)
    };
  }

  if (saved.growth && typeof saved.growth === 'object') {
    targetState.plant = {
      ...plant,
      phase: String(saved.growth.phase || plant.phase),
      isDead: Boolean(saved.growth.isDead),
      stageIndex: clampInt(Number(saved.growth.stageIndex || 0), 0, Math.max(0, getStageTimeline().length - 1)),
      stageKey: String(saved.growth.stageName || plant.stageKey),
      stageProgress: clamp(Number(saved.growth.stageProgress || 0), 0, 1),
      lastValidStageKey: String(saved.growth.lastValidStageName || plant.lastValidStageKey),
      averageHealth: Number(saved.growth.averageHealth || plant.averageHealth),
      averageStress: Number(saved.growth.averageStress || plant.averageStress),
      observedSimMs: Number(saved.growth.observedSimMs || plant.observedSimMs),
      lifecycle: {
        ...plant.lifecycle,
        qualityTier: String(saved.growth.qualityTier || plant.lifecycle.qualityTier),
        qualityLocked: Boolean(saved.growth.qualityLocked)
      }
    };
  }

  if (saved.event && typeof saved.event === 'object') {
    const hasUsableEventsState = Boolean(saved.events && typeof saved.events === 'object' && saved.events.scheduler && typeof saved.events.scheduler === 'object');

    if (!hasUsableEventsState) {
      targetState.events = {
        ...events,
        machineState: String(saved.event.machineState || events.machineState),
        activeEventId: saved.event.activeEventId || null,
        activeEventTitle: String(saved.event.activeEventTitle || ''),
        activeEventText: String(saved.event.activeEventText || ''),
        activeLearningNote: String(saved.event.activeLearningNote || ''),
        activeOptions: Array.isArray(saved.event.activeOptions) ? saved.event.activeOptions : [],
        activeSeverity: Number(saved.event.activeSeverity || 1),
        activeCooldownRealMinutes: Number(saved.event.activeCooldownRealMinutes || 120),
        activeResolveTimeMinutes: Number(saved.event.activeResolveTimeMinutes || events.activeResolveTimeMinutes || 60),
        activeCategory: String(saved.event.activeCategory || 'generic'),
        activeTags: Array.isArray(saved.event.activeTags) ? saved.event.activeTags : [],
        lastEventAtMs: Number(saved.event.lastEventAtMs || 0),
        resolvingUntilMs: Number(saved.event.resolvingUntilMs || 0),
        cooldownUntilMs: Number(saved.event.cooldownUntilMs || 0),
        cooldownUntilSimTimeMs: Number(saved.event.cooldownUntilSimTimeMs || 0),
        resolvingUntilSimTimeMs: Number(saved.event.resolvingUntilSimTimeMs || 0),
        pendingOutcome: saved.event.pendingOutcome && typeof saved.event.pendingOutcome === 'object' ? saved.event.pendingOutcome : null,
        resolvedOutcome: saved.event.resolvedOutcome && typeof saved.event.resolvedOutcome === 'object' ? saved.event.resolvedOutcome : null,
        pendingResolution: saved.event.pendingResolution && typeof saved.event.pendingResolution === 'object' ? saved.event.pendingResolution : null,
        catalog: Array.isArray(saved.event.catalog) ? saved.event.catalog : events.catalog,
        scheduler: {
          ...events.scheduler,
          nextEventSimTimeMs: Number(saved.event.nextEventSimTimeMs || 0),
          nextEventRealTimeMs: Number(saved.event.nextEventAtMs || events.scheduler.nextEventRealTimeMs),
          lastEventSimTimeMs: Number(saved.event.lastEventSimTimeMs || 0),
          lastEventRealTimeMs: Number(saved.event.lastEventAtMs || events.scheduler.lastEventRealTimeMs),
          lastEventId: typeof saved.event.activeEventId === 'string' ? saved.event.activeEventId : events.scheduler.lastEventId,
          lastChoiceId: typeof saved.event.lastChoiceId === 'string' ? saved.event.lastChoiceId : events.scheduler.lastChoiceId,
          eventCooldownsSim: saved.event.eventCooldownsSim && typeof saved.event.eventCooldownsSim === 'object' ? saved.event.eventCooldownsSim : {},
          categoryCooldownsSim: saved.event.categoryCooldownsSim && typeof saved.event.categoryCooldownsSim === 'object' ? saved.event.categoryCooldownsSim : {}
        }
      };
    }
  }

  if (Array.isArray(saved.historyLog) && !history.system.length) {
    targetState.history.system = saved.historyLog.slice(-MAX_HISTORY_LOG).map((entry) => ({
      type: 'system',
      id: entry.type || 'legacy_log',
      atSimTimeMs: Number(entry.timestamp || targetState.simulation.simTimeMs || 0),
      details: entry
    }));
  }
}

async function persistState() {
  if (!storageAdapter) {
    return;
  }

  if (globalThis.__gsStorageHasWrittenLocalState === true) {
    let localSnapshotMissing = false;
    try {
      localSnapshotMissing = localStorage.getItem(LS_STATE_KEY) === null;
    } catch (_error) {
      localSnapshotMissing = false;
    }
    if (localSnapshotMissing) {
      if (!globalThis.__gsStorageExternalClearDetected) {
        globalThis.__gsStorageExternalClearDetected = true;
        console.warn('[storage] persist skipped because local state was cleared externally; reload required to rehydrate safely');
      }
      return;
    }
    globalThis.__gsStorageExternalClearDetected = false;
  }

  stampStatePersistence(state);
  try {
    const events = getCanonicalEvents(state);
    const eventEngine = window && window.GrowSimEventEngine;
    if (eventEngine && typeof eventEngine.exportShadowRuntimeState === 'function') {
      events.shadowRuntime = eventEngine.exportShadowRuntimeState(state);
    }
  } catch (error) {
    console.warn('[storage] shadow runtime persist export ignored', error);
  }
  logStorageDebugInfo('[storage] persist_state', {
    run: getStateFreshnessMetrics(state),
    summaryOpen: Boolean(state.ui && state.ui.runSummaryOpen),
    openSheet: state.ui && state.ui.openSheet ? String(state.ui.openSheet) : null
  });

  try {
    await storageAdapter.set(createPersistableStateSnapshot(state));
    globalThis.__gsStorageHasWrittenLocalState = true;
  } catch (error) {
    console.warn('[storage] persist failed', error);
  }

  saveRemoteState(state).catch((error) => {
    console.warn('[remote-save] failed', { message: error && error.message ? error.message : String(error) });
  });
}

function schedulePersistState(immediate = false) {
  if (immediate) {
    if (persistTimer !== null) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    persistState();
    return;
  }

  if (persistTimer !== null) {
    return;
  }

  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistState();
  }, PERSIST_THROTTLE_MS);
}

function migrateState() {
  try {
    if (!state || typeof state !== 'object') {
      throw new Error('state object missing');
    }

    if (!state.setup || typeof state.setup !== 'object') {
      state.setup = null;
    }

    if (!state.history || typeof state.history !== 'object') {
      state.history = { actions: [], events: [], system: [] };
    }

    if (!state.events || typeof state.events !== 'object') {
      state.events = {};
    }

    if (!state.plant || typeof state.plant !== 'object') {
      state.plant = {};
    }

    if (!state.simulation || typeof state.simulation !== 'object') {
      state.simulation = {};
    }

    if (!state.debug || typeof state.debug !== 'object') {
      state.debug = { enabled: false, showInternalTicks: false, forceDaytime: false };
    }
  } catch (error) {
    console.warn('State migration fallback to defaults', error);
    resetStateToDefaults();
  }
}

function resetStateToDefaults() {
  const fallbackNow = Date.now();
  const fallbackSimStart = alignStorageToSimStartHour(fallbackNow, STORAGE_SIM_START_HOUR);
  const preservedEventCatalog = Array.isArray(state.events && state.events.catalog) ? state.events.catalog.slice() : [];
  const preservedActionCatalog = Array.isArray(state.actions && state.actions.catalog) ? state.actions.catalog.slice() : [];
  const normalizedActions = preservedActionCatalog.map(normalizeAction).filter(Boolean);

  state.schemaVersion = '1.0.0';
  state.seed = STORAGE_SIM_GLOBAL_SEED;
  state.plantId = STORAGE_SIM_PLANT_ID;
  state.setup = null;
  const progressionApi = getProgressionApi();
  state.profile = progressionApi && typeof progressionApi.getDefaultProfile === 'function'
    ? progressionApi.getDefaultProfile()
    : getCanonicalProfile({});
  state.run = progressionApi && typeof progressionApi.getDefaultRunState === 'function'
    ? progressionApi.getDefaultRunState()
    : getCanonicalRun({});
  state.settings = {
    language: '',
    notifications: {
      enabled: false,
      types: {
        events: true,
        critical: true,
        reminder: true
      },
      runtime: {
        lastNotifiedEventId: null,
        lastCriticalAtRealMs: 0,
        lastReminderAtRealMs: 0
      },
      lastMessage: null
    },
    pushNotificationsEnabled: false
  };
  state.meta = {
    rescue: {
      used: false,
      usedAtRealMs: null,
      lastResult: null
    },
    persistence: {
      lastSavedAtRealMs: 0
    }
  };
  const climateApi = getClimateApi();
  state.environmentControls = climateApi && typeof climateApi.getEnvironmentControlDefaults === 'function'
    ? climateApi.getEnvironmentControlDefaults()
    : { temperatureC: 25, humidityPercent: 60, airflowPercent: 70, ph: 6.0, ec: 1.4, light: { ppfdTarget: 620 } };
  state.climate = {};
  state.history = { actions: [], events: [], system: [], systemLog: [], telemetry: [] };
  state.debug = { enabled: false, showInternalTicks: false, forceDaytime: false };

  state.simulation = {
    nowMs: fallbackNow,
    startRealTimeMs: fallbackNow,
    lastTickRealTimeMs: fallbackNow,
    simTimeMs: fallbackSimStart,
    simEpochMs: fallbackSimStart,
    simDay: 0,
    simHour: STORAGE_SIM_START_HOUR,
    simMinute: 0,
    tickCount: 0,
    mode: STORAGE_MODE,
    tickIntervalMs: STORAGE_UI_TICK_INTERVAL_MS,
    timeCompression: STORAGE_DEFAULT_BASE_SIM_SPEED,
    baseSpeed: STORAGE_DEFAULT_BASE_SIM_SPEED,
    effectiveSpeed: STORAGE_DEFAULT_BASE_SIM_SPEED,
    globalSeed: STORAGE_SIM_GLOBAL_SEED,
    plantId: STORAGE_SIM_PLANT_ID,
    dayWindow: { startHour: STORAGE_SIM_DAY_START_HOUR, endHour: STORAGE_SIM_NIGHT_START_HOUR },
    isDaytime: isDaytimeAtSimTime(fallbackSimStart),
    growthImpulse: 0,
    tempoOffsetDays: 0,
    stressExposure: 0,
    riskExposure: 0,
    lastPushScheduleAtMs: 0
  };

  state.plant = {
    phase: 'seedling',
    isDead: false,
    stageIndex: 0,
    stageKey: 'stage_01',
    stageProgress: 0,
    stageStartSimDay: 0,
    lastValidStageKey: 'stage_01',
    averageHealth: 85,
    averageStress: 15,
    observedSimMs: 0,
    lifecycle: {
      totalSimDays: TOTAL_LIFECYCLE_SIM_DAYS,
      qualityTier: 'normal',
      qualityScore: 77.5,
      qualityLocked: false
    },
    assets: {
      basePath: 'assets/plant_growth/',
      resolvedStagePath: ''
    }
  };

  state.events = {
    machineState: 'idle',
    scheduler: {
      nextEventSimTimeMs: fallbackSimStart + (STORAGE_EVENT_ROLL_MIN_REAL_MS * STORAGE_DEFAULT_BASE_SIM_SPEED),
      nextEventRealTimeMs: fallbackNow + STORAGE_EVENT_ROLL_MIN_REAL_MS,
      lastEventSimTimeMs: 0,
      lastEventRealTimeMs: 0,
      lastEventId: null,
      lastChoiceId: null,
      lastEventCategory: null,
      deferredUntilDaytime: false,
      windowRealMinutes: { min: 30, max: 90 },
      eventCooldowns: {},
      categoryCooldowns: {},
      eventCooldownsSim: {},
      categoryCooldownsSim: {}
    },
    active: null,
    history: [],
    activeEventId: null,
    activeEventTitle: '',
    activeEventText: '',
    activeLearningNote: '',
    activeOptions: [],
    activeSeverity: 1,
    activeCooldownRealMinutes: 120,
    activeCategory: 'generic',
    activeTags: [],
    resolvingUntilSimTimeMs: 0,
    lastEventAtMs: 0,
    cooldownUntilMs: 0,
    cooldownUntilSimTimeMs: 0,
    catalog: preservedEventCatalog
  };
  ensureEventV2BrowserPilotState(state);

  state.status = {
    health: 85,
    stress: 15,
    water: 70,
    nutrition: 65,
    growth: 0,
    risk: 20,
    coins: 0
  };
  state.care = createDefaultCareStateFromBase(state);

  state.boost = {
    boostUsedToday: 0,
    boostMaxPerDay: 6,
    dayStamp: dayStamp(fallbackNow),
    boostEndsAtMs: 0
  };
state.rewardActions = {
  provider: 'direct',
  lastTriggeredAtMs: 0,
  lastGrantedAtMs: 0,
  lastExecutedAtMs: 0,
  byType: {}
};

  state.actions = {
    catalog: normalizedActions,
    byId: Object.fromEntries(normalizedActions.map((action) => [action.id, action])),
    cooldowns: {},
    activeEffects: [],
    lastResult: { ok: true, reason: 'ok', actionId: null, atRealTimeMs: fallbackNow }
  };
  state.missions = {
    catalog: [],
    byId: {},
    completed: []
  };
  state.retention = {
    version: 1,
    streak: {
      currentCount: 0,
      bestCount: 0,
      lastCheckinDayKey: '',
      lastEvaluatedDayKey: '',
      freezeCredits: 0,
      claimedMilestones: [],
      pendingRewardKeys: [],
      pendingRecoveryOffer: false,
      pendingRecoveryDayKey: '',
      pendingRecoveryStreakCount: 0,
      recoveryClaimedDayKeys: []
    },
    dailyCare: {
      dayKey: '',
      tasks: [],
      completedCount: 0,
      allCompleteClaimed: false,
      recentTaskIds: [],
      buddyCheck: {
        dayKey: '',
        category: '',
        textKey: '',
        primaryTaskId: '',
        secondaryTaskId: '',
        generatedAtMs: 0
      }
    },
    weekly: {
      weekKey: '',
      missionId: '',
      rewardCoins: 0,
      generatedAtMs: 0,
      completedAtMs: 0,
      claimedAtMs: 0,
      history: []
    },
    decisionCards: {
      dayKey: '',
      activeCard: {
        dayKey: '',
        weekKey: '',
        cardId: '',
        primaryTaskId: '',
        generatedAtMs: 0,
        answeredAtMs: 0,
        chosenOptionId: '',
        resultTextKey: '',
        focusTaskId: '',
        suggestedCoinActionId: ''
      },
      recentCardIds: [],
      history: []
    },
    coinActions: {
      buddyTip: {
        dayKey: '',
        category: '',
        textKey: '',
        primaryTaskId: '',
        weeklyMissionId: '',
        purchasedAtMs: 0
      },
      focusBoost: {
        dayKey: '',
        taskId: '',
        bonusCoins: 0,
        purchasedAtMs: 0,
        claimedAtMs: 0
      },
      safeBoostCheck: {
        dayKey: '',
        statusKey: '',
        textKey: '',
        primaryTaskId: '',
        purchasedAtMs: 0
      },
      weeklyPush: {
        weekKey: '',
        bonusTasksCompleted: 0,
        purchasedAtMs: 0
      }
    },
    micro: {
      unlockedIds: [],
      unlockedHistory: [],
      lastShownAt: 0,
      sessionShownCount: 0
    },
    claimLedger: [],
    analytics: {
      events: [],
      eventKeys: [],
      dailyStats: []
    }
  };

  state.ui = {
    activeScreen: 'home',
    openSheet: null,
    menuOpen: false,
    menuDialogOpen: false,
    activeStatPopup: null,
    selectedBackground: 'bg_dark_01.jpg',
    visibleOverlayIds: [],
    deathOverlayOpen: false,
    deathOverlayAcknowledged: false,
    runSummaryOpen: false,
    care: {
      selectedStudioTab: 'water',
      selectedCategory: null,
      selectedActionId: null,
      feedback: { kind: 'info', text: 'Wähle eine Aktion.' }
    },
    analysis: {
      activeTab: 'overview'
    },
    leaderboard: {
      scope: 'weekly',
      category: 'overall',
      loading: false,
      error: '',
      periodKey: '',
      topEntries: [],
      aroundMeEntries: [],
      meEntry: null,
      lastFetchedAt: null
    },
    rewards: {
      rewardsList: [],
      rewardsSummary: null,
      rewardFetchState: 'idle',
      rewardClaimState: 'idle',
      lastClaimedReward: null,
      rewardError: '',
      claimInFlightGrantId: '',
      lastFetchedAt: null
    }
  };

  state.lastEventId = null;
  state.lastChoiceId = null;
  state.historyLog = [];
  normalizeEnvironmentState(state);
}

function ensureStateIntegrity(nowMs) {
  if (typeof state.schemaVersion !== 'string') {
    state.schemaVersion = '1.0.0';
  }

  const canonicalSettings = getCanonicalSettings(state);
  const canonicalRequestedBaseSpeed = normalizeStorageBaseSimulationSpeed(
    canonicalSettings
    && canonicalSettings.gameplay
    && canonicalSettings.gameplay.simSpeed
      ? canonicalSettings.gameplay.simSpeed
      : (state.simulation.baseSpeed || state.simulation.timeCompression)
  );

  state.simulation.mode = STORAGE_MODE;
  state.simulation.tickIntervalMs = STORAGE_UI_TICK_INTERVAL_MS;
  state.simulation.baseSpeed = canonicalRequestedBaseSpeed;
  state.simulation.effectiveSpeed = getStorageEffectiveSimulationSpeed(nowMs);
  state.simulation.timeCompression = state.simulation.effectiveSpeed;
  state.simulation.globalSeed = STORAGE_SIM_GLOBAL_SEED;
  state.simulation.plantId = STORAGE_SIM_PLANT_ID;
  canonicalSettings.gameplay.simSpeed = canonicalRequestedBaseSpeed;

  if (!Number.isFinite(state.simulation.nowMs)) {
    state.simulation.nowMs = nowMs;
  }
  if (!Number.isFinite(state.simulation.simTimeMs)) {
    state.simulation.simTimeMs = alignStorageToSimStartHour(nowMs, STORAGE_SIM_START_HOUR);
  }
  if (!Number.isFinite(state.simulation.simEpochMs)) {
    state.simulation.simEpochMs = alignStorageToSimStartHour(nowMs, STORAGE_SIM_START_HOUR);
  }
  if (!Number.isFinite(state.simulation.lastTickRealTimeMs)) {
    state.simulation.lastTickRealTimeMs = nowMs;
  }
  if (!Number.isFinite(state.simulation.tickCount)) {
    state.simulation.tickCount = 0;
  }
  if (!Number.isFinite(state.simulation.lastPushScheduleAtMs)) {
    state.simulation.lastPushScheduleAtMs = 0;
  }
  if (!Number.isFinite(state.simulation.stressExposure)) {
    state.simulation.stressExposure = 0;
  }
  if (!Number.isFinite(state.simulation.riskExposure)) {
    state.simulation.riskExposure = 0;
  }
  state.simulation.lastTickRealTimeMs = Math.max(
    Number(state.simulation.startRealTimeMs) || nowMs,
    Number(state.simulation.lastTickRealTimeMs) || nowMs
  );
  state.simulation.nowMs = Math.max(
    Number(state.simulation.nowMs) || nowMs,
    Number(state.simulation.lastTickRealTimeMs) || nowMs
  );
  state.simulation.simTimeMs = Math.max(
    Number(state.simulation.simEpochMs) || alignStorageToSimStartHour(nowMs, STORAGE_SIM_START_HOUR),
    Number(state.simulation.simTimeMs) || alignStorageToSimStartHour(nowMs, STORAGE_SIM_START_HOUR)
  );
  state.simulation.isDaytime = isDaytimeAtSimTime(state.simulation.simTimeMs);
  getCanonicalProfile(state);
  getCanonicalRun(state);

  const validPhases = new Set(['seedling', 'vegetative', 'flowering', 'harvest']);
  if (!validPhases.has(state.plant.phase) && state.plant.phase !== 'dead') {
    state.plant.phase = 'seedling';
  }

  state.plant.lastValidStageKey = normalizeStageKey(state.plant.lastValidStageKey);
  const deadByHealth = Number(state.status.health) <= 0;
  const deadRequested = state.plant.phase === 'dead' || state.plant.isDead === true || deadByHealth;
  state.plant.isDead = deadRequested;

  if (!deadRequested) {
    state.plant.stageIndex = clampInt(state.plant.stageIndex, 0, Math.max(0, getStageTimeline().length - 1));
    state.plant.stageProgress = clamp(state.plant.stageProgress, 0, 1);
    state.plant.stageKey = normalizeStageKey(stageAssetKeyForIndex(state.plant.stageIndex));
    state.plant.lastValidStageKey = state.plant.stageKey;
    state.plant.phase = getStageTimeline()[state.plant.stageIndex]?.phase || 'seedling';
  } else {
    state.plant.phase = 'dead';
    state.plant.stageKey = normalizeStageKey(state.plant.lastValidStageKey || 'stage_01');
    state.plant.stageProgress = 1;
  }

  if (!Number.isFinite(state.plant.averageHealth)) {
    state.plant.averageHealth = state.status.health;
  }
  if (!Number.isFinite(state.plant.averageStress)) {
    state.plant.averageStress = state.status.stress;
  }
  if (!Number.isFinite(state.plant.observedSimMs)) {
    state.plant.observedSimMs = 0;
  }
  if (typeof state.plant.lifecycle.qualityTier !== 'string') {
    state.plant.lifecycle.qualityTier = 'normal';
  }
  if (typeof state.plant.lifecycle.qualityLocked !== 'boolean') {
    state.plant.lifecycle.qualityLocked = false;
  }

  clampStatus();
  state.status.growth = round2(computeGrowthPercent());
  state.care = normalizeCanonicalCareState(state.care, state);
  state.care.summary = deriveCanonicalCareSummary(state.care, state);

  state.boost.boostMaxPerDay = 6;
  if (!Number.isFinite(state.boost.boostUsedToday)) {
    state.boost.boostUsedToday = 0;
  }
  state.boost.boostUsedToday = clampInt(state.boost.boostUsedToday, 0, state.boost.boostMaxPerDay);
  if (!Number.isFinite(state.boost.boostEndsAtMs)) {
    state.boost.boostEndsAtMs = 0;
  }
  if (typeof state.boost.dayStamp !== 'string' || !state.boost.dayStamp) {
    state.boost.dayStamp = dayStamp(nowMs);
  }
  if (!state.rewardActions || typeof state.rewardActions !== 'object') {
    state.rewardActions = {};
  }
  if (typeof state.rewardActions.provider !== 'string' || !state.rewardActions.provider.trim()) {
    state.rewardActions.provider = 'direct';
  }
  if (!Number.isFinite(Number(state.rewardActions.lastTriggeredAtMs))) {
    state.rewardActions.lastTriggeredAtMs = 0;
  }
  if (!Number.isFinite(Number(state.rewardActions.lastGrantedAtMs))) {
    state.rewardActions.lastGrantedAtMs = 0;
  }
  if (!Number.isFinite(Number(state.rewardActions.lastExecutedAtMs))) {
    state.rewardActions.lastExecutedAtMs = 0;
  }
  if (!state.rewardActions.byType || typeof state.rewardActions.byType !== 'object') {
    state.rewardActions.byType = {};
  }

  const machineStates = new Set(['idle', 'activeEvent', 'resolving', 'resolved', 'cooldown']);
  if (!machineStates.has(state.events.machineState)) {
    state.events.machineState = 'idle';
  }
  if (!Number.isFinite(state.events.scheduler.nextEventSimTimeMs)) {
    const fallbackSpeed = Number(state.simulation.effectiveSpeed || state.simulation.baseSpeed || STORAGE_DEFAULT_BASE_SIM_SPEED || 12);
    state.events.scheduler.nextEventSimTimeMs = Number(state.simulation.simTimeMs || 0) + (STORAGE_EVENT_ROLL_MIN_REAL_MS * fallbackSpeed);
  }
  if (!Number.isFinite(state.events.scheduler.nextEventRealTimeMs)) {
    state.events.scheduler.nextEventRealTimeMs = nowMs + STORAGE_EVENT_ROLL_MIN_REAL_MS;
  }
  if (!Number.isFinite(state.events.scheduler.lastEventSimTimeMs)) {
    state.events.scheduler.lastEventSimTimeMs = 0;
  }
  if (!Number.isFinite(state.events.cooldownUntilMs)) {
    state.events.cooldownUntilMs = 0;
  }
  if (!Number.isFinite(state.events.cooldownUntilSimTimeMs)) {
    state.events.cooldownUntilSimTimeMs = 0;
  }
  if (!Number.isFinite(state.events.resolvingUntilMs)) {
    state.events.resolvingUntilMs = 0;
  }
  if (!Number.isFinite(state.events.resolvingUntilSimTimeMs)) {
    state.events.resolvingUntilSimTimeMs = 0;
  }
  if (!Number.isFinite(state.events.activeResolveTimeMinutes)) {
    state.events.activeResolveTimeMinutes = 60;
  }
  if (!Array.isArray(state.events.activeOptions)) {
    state.events.activeOptions = [];
  }
  if (!Array.isArray(state.events.activeTags)) {
    state.events.activeTags = [];
  }
  if (!Array.isArray(state.events.catalog)) {
    state.events.catalog = [];
  }
  if (state.events.pendingOutcome != null && typeof state.events.pendingOutcome !== 'object') {
    state.events.pendingOutcome = null;
  }
  if (state.events.resolvedOutcome != null && typeof state.events.resolvedOutcome !== 'object') {
    state.events.resolvedOutcome = null;
  }
  if (state.events.pendingResolution != null && typeof state.events.pendingResolution !== 'object') {
    state.events.pendingResolution = null;
  }

  if (!Array.isArray(state.actions.catalog)) {
    state.actions.catalog = [];
  }
  if (!state.actions.byId || typeof state.actions.byId !== 'object') {
    state.actions.byId = {};
  }
  if (!state.actions.cooldowns || typeof state.actions.cooldowns !== 'object') {
    state.actions.cooldowns = {};
  }
  if (!Array.isArray(state.actions.activeEffects)) {
    state.actions.activeEffects = [];
  }

  state.actions.catalog = state.actions.catalog.map(normalizeAction).filter(Boolean);
  state.actions.byId = Object.fromEntries(state.actions.catalog.map((action) => [action.id, action]));

  if (!state.missions || typeof state.missions !== 'object') {
    state.missions = { catalog: [], byId: {}, completed: [] };
  }
  if (!Array.isArray(state.missions.catalog)) {
    state.missions.catalog = [];
  }
  if (!state.missions.byId || typeof state.missions.byId !== 'object') {
    state.missions.byId = {};
  }
  if (!Array.isArray(state.missions.completed)) {
    state.missions.completed = [];
  }
  state.missions.completed = Array.from(new Set(
    state.missions.completed
      .map((missionId) => String(missionId || '').trim())
      .filter(Boolean)
  ));
  if (!state.retention || typeof state.retention !== 'object') {
    state.retention = {};
  }
  if (!Number.isFinite(Number(state.retention.version))) {
    state.retention.version = 1;
  }
  if (!state.retention.streak || typeof state.retention.streak !== 'object') {
    state.retention.streak = {};
  }
  if (!state.retention.dailyCare || typeof state.retention.dailyCare !== 'object') {
    state.retention.dailyCare = {};
  }
  if (!state.retention.weekly || typeof state.retention.weekly !== 'object') {
    state.retention.weekly = {};
  }
  if (!state.retention.decisionCards || typeof state.retention.decisionCards !== 'object') {
    state.retention.decisionCards = {};
  }
  if (!state.retention.coinActions || typeof state.retention.coinActions !== 'object') {
    state.retention.coinActions = {};
  }
  if (!state.retention.micro || typeof state.retention.micro !== 'object') {
    state.retention.micro = {};
  }
  if (!Array.isArray(state.retention.claimLedger)) {
    state.retention.claimLedger = [];
  }

  state.retention.streak.currentCount = Math.max(0, Math.trunc(Number(state.retention.streak.currentCount) || 0));
  state.retention.streak.bestCount = Math.max(
    state.retention.streak.currentCount,
    Math.trunc(Number(state.retention.streak.bestCount) || 0)
  );
  state.retention.streak.lastCheckinDayKey = typeof state.retention.streak.lastCheckinDayKey === 'string' ? state.retention.streak.lastCheckinDayKey : '';
  state.retention.streak.lastEvaluatedDayKey = typeof state.retention.streak.lastEvaluatedDayKey === 'string' ? state.retention.streak.lastEvaluatedDayKey : '';
  state.retention.streak.freezeCredits = Math.max(0, Math.trunc(Number(state.retention.streak.freezeCredits) || 0));
  state.retention.streak.claimedMilestones = Array.from(new Set(
    (Array.isArray(state.retention.streak.claimedMilestones) ? state.retention.streak.claimedMilestones : [])
      .map((entry) => Math.trunc(Number(entry) || 0))
      .filter((entry) => entry > 0)
  ));
  state.retention.streak.pendingRewardKeys = Array.from(new Set(
    (Array.isArray(state.retention.streak.pendingRewardKeys) ? state.retention.streak.pendingRewardKeys : [])
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  ));
  state.retention.streak.pendingRecoveryOffer = Boolean(state.retention.streak.pendingRecoveryOffer);
  state.retention.streak.pendingRecoveryDayKey = typeof state.retention.streak.pendingRecoveryDayKey === 'string'
    ? state.retention.streak.pendingRecoveryDayKey
    : '';
  state.retention.streak.pendingRecoveryStreakCount = Math.max(0, Math.trunc(Number(state.retention.streak.pendingRecoveryStreakCount) || 0));
  state.retention.streak.recoveryClaimedDayKeys = Array.from(new Set(
    (Array.isArray(state.retention.streak.recoveryClaimedDayKeys) ? state.retention.streak.recoveryClaimedDayKeys : [])
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  ));

  state.retention.dailyCare.dayKey = typeof state.retention.dailyCare.dayKey === 'string' ? state.retention.dailyCare.dayKey : '';
  if (!Array.isArray(state.retention.dailyCare.recentTaskIds)) {
    state.retention.dailyCare.recentTaskIds = [];
  }
  state.retention.dailyCare.recentTaskIds = Array.from(new Set(
    state.retention.dailyCare.recentTaskIds
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  )).slice(-9);
  if (!state.retention.dailyCare.buddyCheck || typeof state.retention.dailyCare.buddyCheck !== 'object') {
    state.retention.dailyCare.buddyCheck = {};
  }
  state.retention.dailyCare.buddyCheck.dayKey = typeof state.retention.dailyCare.buddyCheck.dayKey === 'string'
    ? state.retention.dailyCare.buddyCheck.dayKey
    : '';
  state.retention.dailyCare.buddyCheck.category = typeof state.retention.dailyCare.buddyCheck.category === 'string'
    ? state.retention.dailyCare.buddyCheck.category
    : '';
  state.retention.dailyCare.buddyCheck.textKey = typeof state.retention.dailyCare.buddyCheck.textKey === 'string'
    ? state.retention.dailyCare.buddyCheck.textKey
    : '';
  state.retention.dailyCare.buddyCheck.primaryTaskId = typeof state.retention.dailyCare.buddyCheck.primaryTaskId === 'string'
    ? state.retention.dailyCare.buddyCheck.primaryTaskId
    : '';
  state.retention.dailyCare.buddyCheck.secondaryTaskId = typeof state.retention.dailyCare.buddyCheck.secondaryTaskId === 'string'
    ? state.retention.dailyCare.buddyCheck.secondaryTaskId
    : '';
  state.retention.dailyCare.buddyCheck.generatedAtMs = Number.isFinite(Number(state.retention.dailyCare.buddyCheck.generatedAtMs))
    ? Number(state.retention.dailyCare.buddyCheck.generatedAtMs)
    : 0;
  state.retention.weekly.weekKey = typeof state.retention.weekly.weekKey === 'string' ? state.retention.weekly.weekKey : '';
  state.retention.weekly.missionId = typeof state.retention.weekly.missionId === 'string' ? state.retention.weekly.missionId : '';
  state.retention.weekly.rewardCoins = Math.max(0, Math.trunc(Number(state.retention.weekly.rewardCoins) || 0));
  state.retention.weekly.generatedAtMs = Number.isFinite(Number(state.retention.weekly.generatedAtMs))
    ? Number(state.retention.weekly.generatedAtMs)
    : 0;
  state.retention.weekly.completedAtMs = Number.isFinite(Number(state.retention.weekly.completedAtMs))
    ? Number(state.retention.weekly.completedAtMs)
    : 0;
  state.retention.weekly.claimedAtMs = Number.isFinite(Number(state.retention.weekly.claimedAtMs))
    ? Number(state.retention.weekly.claimedAtMs)
    : 0;
  state.retention.weekly.history = (Array.isArray(state.retention.weekly.history) ? state.retention.weekly.history : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      weekKey: typeof entry.weekKey === 'string' ? entry.weekKey : '',
      missionId: typeof entry.missionId === 'string' ? entry.missionId : '',
      rewardCoins: Math.max(0, Math.trunc(Number(entry.rewardCoins) || 0)),
      completedAtMs: Number.isFinite(Number(entry.completedAtMs)) ? Number(entry.completedAtMs) : 0,
      claimedAtMs: Number.isFinite(Number(entry.claimedAtMs)) ? Number(entry.claimedAtMs) : 0
    }))
    .filter((entry) => entry.weekKey && entry.missionId)
    .slice(-12);
  state.retention.decisionCards.dayKey = typeof state.retention.decisionCards.dayKey === 'string' ? state.retention.decisionCards.dayKey : '';
  if (!Array.isArray(state.retention.decisionCards.recentCardIds)) {
    state.retention.decisionCards.recentCardIds = [];
  }
  state.retention.decisionCards.recentCardIds = Array.from(new Set(
    state.retention.decisionCards.recentCardIds
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  )).slice(-10);
  if (!state.retention.decisionCards.activeCard || typeof state.retention.decisionCards.activeCard !== 'object') {
    state.retention.decisionCards.activeCard = {};
  }
  state.retention.decisionCards.activeCard.dayKey = typeof state.retention.decisionCards.activeCard.dayKey === 'string' ? state.retention.decisionCards.activeCard.dayKey : '';
  state.retention.decisionCards.activeCard.weekKey = typeof state.retention.decisionCards.activeCard.weekKey === 'string' ? state.retention.decisionCards.activeCard.weekKey : '';
  state.retention.decisionCards.activeCard.cardId = typeof state.retention.decisionCards.activeCard.cardId === 'string' ? state.retention.decisionCards.activeCard.cardId : '';
  state.retention.decisionCards.activeCard.primaryTaskId = typeof state.retention.decisionCards.activeCard.primaryTaskId === 'string' ? state.retention.decisionCards.activeCard.primaryTaskId : '';
  state.retention.decisionCards.activeCard.generatedAtMs = Number.isFinite(Number(state.retention.decisionCards.activeCard.generatedAtMs))
    ? Number(state.retention.decisionCards.activeCard.generatedAtMs)
    : 0;
  state.retention.decisionCards.activeCard.answeredAtMs = Number.isFinite(Number(state.retention.decisionCards.activeCard.answeredAtMs))
    ? Number(state.retention.decisionCards.activeCard.answeredAtMs)
    : 0;
  state.retention.decisionCards.activeCard.chosenOptionId = typeof state.retention.decisionCards.activeCard.chosenOptionId === 'string'
    ? state.retention.decisionCards.activeCard.chosenOptionId
    : '';
  state.retention.decisionCards.activeCard.resultTextKey = typeof state.retention.decisionCards.activeCard.resultTextKey === 'string'
    ? state.retention.decisionCards.activeCard.resultTextKey
    : '';
  state.retention.decisionCards.activeCard.focusTaskId = typeof state.retention.decisionCards.activeCard.focusTaskId === 'string'
    ? state.retention.decisionCards.activeCard.focusTaskId
    : '';
  state.retention.decisionCards.activeCard.suggestedCoinActionId = typeof state.retention.decisionCards.activeCard.suggestedCoinActionId === 'string'
    ? state.retention.decisionCards.activeCard.suggestedCoinActionId
    : '';
  state.retention.decisionCards.history = (Array.isArray(state.retention.decisionCards.history) ? state.retention.decisionCards.history : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      dayKey: typeof entry.dayKey === 'string' ? entry.dayKey : '',
      cardId: typeof entry.cardId === 'string' ? entry.cardId : '',
      chosenOptionId: typeof entry.chosenOptionId === 'string' ? entry.chosenOptionId : '',
      answeredAtMs: Number.isFinite(Number(entry.answeredAtMs)) ? Number(entry.answeredAtMs) : 0
    }))
    .filter((entry) => entry.dayKey && entry.cardId)
    .slice(-14);
  if (!state.retention.coinActions.buddyTip || typeof state.retention.coinActions.buddyTip !== 'object') {
    state.retention.coinActions.buddyTip = {};
  }
  state.retention.coinActions.buddyTip.dayKey = typeof state.retention.coinActions.buddyTip.dayKey === 'string' ? state.retention.coinActions.buddyTip.dayKey : '';
  state.retention.coinActions.buddyTip.category = typeof state.retention.coinActions.buddyTip.category === 'string' ? state.retention.coinActions.buddyTip.category : '';
  state.retention.coinActions.buddyTip.textKey = typeof state.retention.coinActions.buddyTip.textKey === 'string' ? state.retention.coinActions.buddyTip.textKey : '';
  state.retention.coinActions.buddyTip.primaryTaskId = typeof state.retention.coinActions.buddyTip.primaryTaskId === 'string' ? state.retention.coinActions.buddyTip.primaryTaskId : '';
  state.retention.coinActions.buddyTip.weeklyMissionId = typeof state.retention.coinActions.buddyTip.weeklyMissionId === 'string' ? state.retention.coinActions.buddyTip.weeklyMissionId : '';
  state.retention.coinActions.buddyTip.purchasedAtMs = Number.isFinite(Number(state.retention.coinActions.buddyTip.purchasedAtMs))
    ? Number(state.retention.coinActions.buddyTip.purchasedAtMs)
    : 0;
  if (!state.retention.coinActions.focusBoost || typeof state.retention.coinActions.focusBoost !== 'object') {
    state.retention.coinActions.focusBoost = {};
  }
  state.retention.coinActions.focusBoost.dayKey = typeof state.retention.coinActions.focusBoost.dayKey === 'string' ? state.retention.coinActions.focusBoost.dayKey : '';
  state.retention.coinActions.focusBoost.taskId = typeof state.retention.coinActions.focusBoost.taskId === 'string' ? state.retention.coinActions.focusBoost.taskId : '';
  state.retention.coinActions.focusBoost.bonusCoins = Math.max(0, Math.trunc(Number(state.retention.coinActions.focusBoost.bonusCoins) || 0));
  state.retention.coinActions.focusBoost.purchasedAtMs = Number.isFinite(Number(state.retention.coinActions.focusBoost.purchasedAtMs))
    ? Number(state.retention.coinActions.focusBoost.purchasedAtMs)
    : 0;
  state.retention.coinActions.focusBoost.claimedAtMs = Number.isFinite(Number(state.retention.coinActions.focusBoost.claimedAtMs))
    ? Number(state.retention.coinActions.focusBoost.claimedAtMs)
    : 0;
  if (!state.retention.coinActions.safeBoostCheck || typeof state.retention.coinActions.safeBoostCheck !== 'object') {
    state.retention.coinActions.safeBoostCheck = {};
  }
  state.retention.coinActions.safeBoostCheck.dayKey = typeof state.retention.coinActions.safeBoostCheck.dayKey === 'string' ? state.retention.coinActions.safeBoostCheck.dayKey : '';
  state.retention.coinActions.safeBoostCheck.statusKey = typeof state.retention.coinActions.safeBoostCheck.statusKey === 'string' ? state.retention.coinActions.safeBoostCheck.statusKey : '';
  state.retention.coinActions.safeBoostCheck.textKey = typeof state.retention.coinActions.safeBoostCheck.textKey === 'string' ? state.retention.coinActions.safeBoostCheck.textKey : '';
  state.retention.coinActions.safeBoostCheck.primaryTaskId = typeof state.retention.coinActions.safeBoostCheck.primaryTaskId === 'string' ? state.retention.coinActions.safeBoostCheck.primaryTaskId : '';
  state.retention.coinActions.safeBoostCheck.purchasedAtMs = Number.isFinite(Number(state.retention.coinActions.safeBoostCheck.purchasedAtMs))
    ? Number(state.retention.coinActions.safeBoostCheck.purchasedAtMs)
    : 0;
  if (!state.retention.coinActions.weeklyPush || typeof state.retention.coinActions.weeklyPush !== 'object') {
    state.retention.coinActions.weeklyPush = {};
  }
  state.retention.coinActions.weeklyPush.weekKey = typeof state.retention.coinActions.weeklyPush.weekKey === 'string' ? state.retention.coinActions.weeklyPush.weekKey : '';
  state.retention.coinActions.weeklyPush.bonusTasksCompleted = Math.max(0, Math.min(1, Math.trunc(Number(state.retention.coinActions.weeklyPush.bonusTasksCompleted) || 0)));
  state.retention.coinActions.weeklyPush.purchasedAtMs = Number.isFinite(Number(state.retention.coinActions.weeklyPush.purchasedAtMs))
    ? Number(state.retention.coinActions.weeklyPush.purchasedAtMs)
    : 0;
  if (!Array.isArray(state.retention.dailyCare.tasks)) {
    state.retention.dailyCare.tasks = [];
  }
  state.retention.dailyCare.tasks = state.retention.dailyCare.tasks
    .filter((task) => task && typeof task === 'object')
    .map((task) => {
      const taskId = String(task.taskId || task.id || task.type || task.trigger || task.sheetName || '').trim();
      const rawTitle = String(task.title || '').trim();
      const rawDescription = String(task.description || '').trim();
      const title = (!rawTitle || /^(daily task|task|aufgabe|tarea)$/i.test(rawTitle))
        ? (taskId ? `daily.task.${taskId}.title` : rawTitle)
        : rawTitle;
      const description = (!rawDescription || /^start with daily task$/i.test(rawDescription) || /^desc$/i.test(rawDescription))
        ? (taskId ? `daily.task.${taskId}.description` : rawDescription)
        : rawDescription;
      return {
        taskId,
        title,
        description,
        dayKey: String(task.dayKey || state.retention.dailyCare.dayKey || '').trim(),
        trigger: String(task.trigger || '').trim(),
        sheetName: String(task.sheetName || '').trim(),
        threshold: Number.isFinite(Number(task.threshold)) ? Number(task.threshold) : null,
        xp: Math.max(0, Math.trunc(Number(task.xp) || 0)),
        completedAt: Number.isFinite(Number(task.completedAt)) ? Number(task.completedAt) : null,
        rewardGrantedAt: Number.isFinite(Number(task.rewardGrantedAt)) ? Number(task.rewardGrantedAt) : null,
        claimKey: String(task.claimKey || '').trim()
      };
    })
    .filter((task) => task.taskId && task.claimKey);
  state.retention.dailyCare.tasks = state.retention.dailyCare.tasks.map((task) => {
    if (!task.rewardGrantedAt && task.completedAt && state.retention.claimLedger.includes(task.claimKey)) {
      return {
        ...task,
        rewardGrantedAt: task.completedAt
      };
    }
    return task;
  });
  state.retention.dailyCare.completedCount = state.retention.dailyCare.tasks.reduce((count, task) => count + (task.completedAt ? 1 : 0), 0);
  state.retention.dailyCare.allCompleteClaimed = Boolean(state.retention.dailyCare.allCompleteClaimed);

  if (!Array.isArray(state.retention.micro.unlockedIds)) {
    state.retention.micro.unlockedIds = [];
  }
  state.retention.micro.unlockedIds = Array.from(new Set(
    state.retention.micro.unlockedIds
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  ));
  state.retention.micro.unlockedHistory = (Array.isArray(state.retention.micro.unlockedHistory) ? state.retention.micro.unlockedHistory : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: String(entry.id || '').trim(),
      atRealMs: Number.isFinite(Number(entry.atRealMs)) ? Number(entry.atRealMs) : 0
    }))
    .filter((entry) => entry.id && entry.atRealMs > 0)
    .slice(-60);
  state.retention.micro.lastShownAt = Number.isFinite(Number(state.retention.micro.lastShownAt)) ? Number(state.retention.micro.lastShownAt) : 0;
  state.retention.micro.sessionShownCount = Math.max(0, Math.trunc(Number(state.retention.micro.sessionShownCount) || 0));

  if (!state.retention.analytics || typeof state.retention.analytics !== 'object') {
    state.retention.analytics = {};
  }
  state.retention.analytics.events = (Array.isArray(state.retention.analytics.events) ? state.retention.analytics.events : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      event: String(entry.event || '').trim(),
      atRealMs: Number.isFinite(Number(entry.atRealMs)) ? Number(entry.atRealMs) : 0,
      dayKey: typeof entry.dayKey === 'string' ? entry.dayKey : '',
      payload: entry.payload && typeof entry.payload === 'object' ? entry.payload : {}
    }))
    .filter((entry) => entry.event)
    .slice(-180);
  state.retention.analytics.eventKeys = Array.from(new Set(
    (Array.isArray(state.retention.analytics.eventKeys) ? state.retention.analytics.eventKeys : [])
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  )).slice(-180);
  state.retention.analytics.dailyStats = (Array.isArray(state.retention.analytics.dailyStats) ? state.retention.analytics.dailyStats : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      dayKey: String(entry.dayKey || '').trim(),
      streakContinued: Number(entry.streakContinued || 0) > 0 ? 1 : 0,
      tasksCompleted: Math.max(0, Math.trunc(Number(entry.tasksCompleted) || 0)),
      microUnlocked: Math.max(0, Math.trunc(Number(entry.microUnlocked) || 0)),
      sessionCount: Math.max(0, Math.trunc(Number(entry.sessionCount) || 0))
    }))
    .filter((entry) => entry.dayKey)
    .sort((left, right) => String(left.dayKey).localeCompare(String(right.dayKey)))
    .slice(-45);

  state.retention.claimLedger = Array.from(new Set(
    state.retention.claimLedger
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  ));

  for (const [actionId, untilMs] of Object.entries(state.actions.cooldowns)) {
    if (!Number.isFinite(Number(untilMs)) || Number(untilMs) <= nowMs) {
      delete state.actions.cooldowns[actionId];
    }
  }

  state.actions.activeEffects = state.actions.activeEffects
    .filter((effect) => effect && Number.isFinite(Number(effect.remainingSimMs)) && Number(effect.remainingSimMs) > 0)
    .map((effect) => ({
      id: String(effect.id || `${effect.actionId || 'action'}:${nowMs}`),
      actionId: String(effect.actionId || ''),
      remainingSimMs: Math.max(0, Number(effect.remainingSimMs)),
      rates: effect.rates && typeof effect.rates === 'object' ? effect.rates : {}
    }));

  if (!state.actions.lastResult || typeof state.actions.lastResult !== 'object') {
    state.actions.lastResult = { ok: true, reason: 'ok', actionId: null, atRealTimeMs: nowMs };
  }

  const meta = getCanonicalMeta(state);
  const settings = getCanonicalSettings(state);
  meta.rescue.used = Boolean(meta.rescue.used);
  meta.rescue.usedAtRealMs = Number.isFinite(Number(meta.rescue.usedAtRealMs)) ? Number(meta.rescue.usedAtRealMs) : null;
  meta.rescue.lastResult = (typeof meta.rescue.lastResult === 'string' || meta.rescue.lastResult === null)
    ? meta.rescue.lastResult
    : null;
  getCanonicalNotificationsSettings(state);
  settings.pushNotificationsEnabled = Boolean(settings.pushNotificationsEnabled);

  state.setup = normalizeSetupState(state.setup, state.simulation);
  normalizeEnvironmentState(state);

  if (!state.events || typeof state.events !== 'object') {
    state.events = { scheduler: {}, active: null, history: [] };
  }
  if (!state.events.scheduler || typeof state.events.scheduler !== 'object') {
    state.events.scheduler = {};
  }
  if (!state.events.scheduler.eventCooldowns || typeof state.events.scheduler.eventCooldowns !== 'object') {
    state.events.scheduler.eventCooldowns = {};
  }
  if (!state.events.scheduler.categoryCooldowns || typeof state.events.scheduler.categoryCooldowns !== 'object') {
    state.events.scheduler.categoryCooldowns = {};
  }
  if (!state.events.scheduler.eventCooldownsSim || typeof state.events.scheduler.eventCooldownsSim !== 'object') {
    state.events.scheduler.eventCooldownsSim = {};
  }
  if (!state.events.scheduler.categoryCooldownsSim || typeof state.events.scheduler.categoryCooldownsSim !== 'object') {
    state.events.scheduler.categoryCooldownsSim = {};
  }
  const nowSimMs = Number(state.simulation.simTimeMs || 0);
  for (const [eventId, untilMs] of Object.entries(state.events.scheduler.eventCooldownsSim)) {
    if (!Number.isFinite(Number(untilMs)) || Number(untilMs) <= nowSimMs) {
      delete state.events.scheduler.eventCooldownsSim[eventId];
    }
  }
  for (const [categoryId, untilMs] of Object.entries(state.events.scheduler.categoryCooldownsSim)) {
    if (!Number.isFinite(Number(untilMs)) || Number(untilMs) <= nowSimMs) {
      delete state.events.scheduler.categoryCooldownsSim[categoryId];
    }
  }
  if (typeof normalizeEventTimingState === 'function') {
    normalizeEventTimingState(nowMs);
  }
  if (!Array.isArray(state.events.history)) {
    state.events.history = [];
  }

  if (!state.history || typeof state.history !== 'object') {
    state.history = { actions: [], events: [], system: [] };
  }
  if (!Array.isArray(state.history.events)) {
    state.history.events = [];
  }

  const validSheets = new Set([null, 'care', 'climate', 'event', 'dashboard', 'diagnosis', 'statDetail', 'missions', 'leaderboard']);
  validSheets.add('support');
  validSheets.add('coinShop');
  validSheets.add('insufficientCoins');
  if (!validSheets.has(state.ui.openSheet)) {
    state.ui.openSheet = null;
  }
  if (typeof state.ui.menuOpen !== 'boolean') {
    state.ui.menuOpen = false;
  }
  if (typeof state.ui.menuDialogOpen !== 'boolean') {
    state.ui.menuDialogOpen = false;
  }
  if (!['water', 'nutrients', 'stress', 'risk', null].includes(state.ui.activeStatPopup)) {
    state.ui.activeStatPopup = null;
  }
  if (!Array.isArray(state.ui.visibleOverlayIds)) {
    state.ui.visibleOverlayIds = [];
  }
  if (!state.ui.care || typeof state.ui.care !== 'object') {
    state.ui.care = { selectedStudioTab: 'water', selectedCategory: null, selectedActionId: null, feedback: { kind: 'info', text: 'Wähle eine Aktion.' } };
  }
  if (!['water', 'feed', 'routine', 'diagnosis'].includes(String(state.ui.care.selectedStudioTab || ''))) {
    state.ui.care.selectedStudioTab = 'water';
  }
  if (typeof state.ui.care.selectedCategory !== 'string') {
    state.ui.care.selectedCategory = null;
  }
  if (typeof state.ui.care.selectedActionId !== 'string') {
    state.ui.care.selectedActionId = null;
  }
  if (!state.ui.care.feedback || typeof state.ui.care.feedback !== 'object') {
    state.ui.care.feedback = { kind: 'info', text: 'Wähle eine Aktion.' };
  }
  if (!state.ui.analysis || typeof state.ui.analysis !== 'object') {
    state.ui.analysis = { activeTab: 'overview' };
  }
  if (!['overview', 'diagnosis', 'timeline'].includes(state.ui.analysis.activeTab)) {
    state.ui.analysis.activeTab = 'overview';
  }
  if (!state.ui.leaderboard || typeof state.ui.leaderboard !== 'object') {
    state.ui.leaderboard = {};
  }
  state.ui.leaderboard.scope = 'weekly';
  state.ui.leaderboard.category = ['overall', 'quality'].includes(String(state.ui.leaderboard.category || '').trim())
    ? String(state.ui.leaderboard.category).trim()
    : 'overall';
  state.ui.leaderboard.loading = Boolean(state.ui.leaderboard.loading);
  state.ui.leaderboard.error = typeof state.ui.leaderboard.error === 'string' ? state.ui.leaderboard.error.trim() : '';
  state.ui.leaderboard.periodKey = typeof state.ui.leaderboard.periodKey === 'string' ? state.ui.leaderboard.periodKey.trim() : '';
  state.ui.leaderboard.topEntries = Array.isArray(state.ui.leaderboard.topEntries) ? state.ui.leaderboard.topEntries.slice(0, 20) : [];
  state.ui.leaderboard.aroundMeEntries = Array.isArray(state.ui.leaderboard.aroundMeEntries) ? state.ui.leaderboard.aroundMeEntries.slice(0, 12) : [];
  state.ui.leaderboard.meEntry = state.ui.leaderboard.meEntry && typeof state.ui.leaderboard.meEntry === 'object'
    ? state.ui.leaderboard.meEntry
    : null;
  state.ui.leaderboard.lastFetchedAt = Number.isFinite(Number(state.ui.leaderboard.lastFetchedAt))
    ? Number(state.ui.leaderboard.lastFetchedAt)
    : null;
  if (!state.ui.rewards || typeof state.ui.rewards !== 'object') {
    state.ui.rewards = {};
  }
  state.ui.rewards.rewardsList = Array.isArray(state.ui.rewards.rewardsList) ? state.ui.rewards.rewardsList.slice(0, 12) : [];
  state.ui.rewards.rewardsSummary = state.ui.rewards.rewardsSummary && typeof state.ui.rewards.rewardsSummary === 'object'
    ? state.ui.rewards.rewardsSummary
    : null;
  state.ui.rewards.rewardFetchState = ['idle', 'loading', 'ready', 'error'].includes(String(state.ui.rewards.rewardFetchState || '').trim())
    ? String(state.ui.rewards.rewardFetchState).trim()
    : 'idle';
  state.ui.rewards.rewardClaimState = ['idle', 'claiming', 'success', 'error'].includes(String(state.ui.rewards.rewardClaimState || '').trim())
    ? String(state.ui.rewards.rewardClaimState).trim()
    : 'idle';
  state.ui.rewards.lastClaimedReward = state.ui.rewards.lastClaimedReward && typeof state.ui.rewards.lastClaimedReward === 'object'
    ? state.ui.rewards.lastClaimedReward
    : null;
  state.ui.rewards.rewardError = typeof state.ui.rewards.rewardError === 'string' ? state.ui.rewards.rewardError.trim() : '';
  state.ui.rewards.claimInFlightGrantId = typeof state.ui.rewards.claimInFlightGrantId === 'string' ? state.ui.rewards.claimInFlightGrantId.trim() : '';
  state.ui.rewards.lastFetchedAt = Number.isFinite(Number(state.ui.rewards.lastFetchedAt))
    ? Number(state.ui.rewards.lastFetchedAt)
    : null;
  if (typeof state.ui.deathOverlayOpen !== 'boolean') {
    state.ui.deathOverlayOpen = false;
  }
  if (typeof state.ui.deathOverlayAcknowledged !== 'boolean') {
    state.ui.deathOverlayAcknowledged = false;
  }
  if (typeof state.ui.runSummaryOpen !== 'boolean') {
    state.ui.runSummaryOpen = false;
  }

  if (typeof state.events.scheduler.lastEventId !== 'string') {
    state.events.scheduler.lastEventId = null;
  }
  if (typeof state.events.scheduler.lastChoiceId !== 'string') {
    state.events.scheduler.lastChoiceId = null;
  }

  const run = getCanonicalRun(state);
  const profile = getCanonicalProfile(state);
  const hasPersistedSetup = Boolean(state.setup && typeof state.setup === 'object' && typeof state.setup.mode === 'string');
  if (hasPersistedSetup && run.status === 'idle' && !isRunFinalized(run)) {
    run.status = state.plant.isDead ? 'downed' : 'active';
    run.startedAtRealMs = Number.isFinite(Number(run.startedAtRealMs))
      ? Number(run.startedAtRealMs)
      : Number(state.simulation.startRealTimeMs || nowMs);
    run.setupSnapshot = run.setupSnapshot && typeof run.setupSnapshot === 'object'
      ? run.setupSnapshot
      : { ...state.setup };
  }
  if (!hasPersistedSetup && (run.status === 'active' || run.status === 'downed')) {
    run.status = 'idle';
  }
  if (state.plant.isDead && run.status === 'active' && !isRunFinalized(run)) {
    run.status = 'downed';
  }
  if (run.status === 'downed' && isRunFinalized(run)) {
    run.status = 'ended';
  }
  if (run.status === 'ended' && !isRunFinalized(run)) {
    run.status = 'finished';
  }
  const progressionApi = getProgressionApi();
  if (progressionApi && typeof progressionApi.chooseRunGoal === 'function') {
    if ((run.status === 'active' || run.status === 'downed' || run.status === 'finished' || run.status === 'ended') && !run.goal && (run.setupSnapshot || state.setup)) {
      run.goal = progressionApi.chooseRunGoal(profile, run);
    }
    const shouldResolveRuntimeGoal = (run.status === 'active' || run.status === 'downed') && typeof progressionApi.syncRunGoalState === 'function';
    if (shouldResolveRuntimeGoal) {
      progressionApi.syncRunGoalState(state, {
        reason: 'restore',
        nowMs
      });
    } else if (run.goal && typeof progressionApi.evaluateRunGoal === 'function') {
      run.goal = progressionApi.evaluateRunGoal(run.goal, state, {
        finalize: isRunFinalized(run),
        endReason: run.endReason === 'harvest' ? 'harvest' : 'death'
      });
    }
  }
  if (run.status === 'finished' || run.status === 'ended') {
    state.ui.deathOverlayOpen = false;
    state.ui.runSummaryOpen = Boolean(profile.lastRunSummary);
  } else if (run.status === 'downed' && !isRunFinalized(run)) {
    state.ui.deathOverlayOpen = true;
    state.ui.runSummaryOpen = false;
  } else if (run.status === 'idle') {
    state.ui.runSummaryOpen = false;
  }
}

function syncCanonicalStateShape() {
  const sim = getCanonicalSimulation(state);
  const plant = getCanonicalPlant(state);
  const events = getCanonicalEvents(state);
  const history = getCanonicalHistory(state);
  const care = getCanonicalCare(state);
  const meta = getCanonicalMeta(state);
  const settings = getCanonicalSettings(state);
  const profile = getCanonicalProfile(state);
  const run = getCanonicalRun(state);
  ensureStorageCurrencyState(state);
  if (state.setup && typeof state.setup === 'object' && run.status === 'idle' && !isRunFinalized(run)) {
    run.status = plant.isDead ? 'downed' : 'active';
    run.startedAtRealMs = Number.isFinite(Number(run.startedAtRealMs))
      ? Number(run.startedAtRealMs)
      : Number(sim.startRealTimeMs || sim.nowMs);
    run.setupSnapshot = run.setupSnapshot && typeof run.setupSnapshot === 'object'
      ? run.setupSnapshot
      : { ...state.setup };
  }

  state.seed = sim.globalSeed;
  state.plantId = sim.plantId;

  let canonicalPlantDay = Number.NaN;
  if (typeof getPlantTimeFromElapsed === 'function') {
    try {
      const plantTime = getPlantTimeFromElapsed();
      canonicalPlantDay = Number(plantTime && plantTime.simDay);
    } catch (_) {
      canonicalPlantDay = Number.NaN;
    }
  }
  if (!Number.isFinite(canonicalPlantDay)) {
    canonicalPlantDay = Number(simDayFloat());
  }
  sim.simDay = Math.max(0, Math.floor(Number.isFinite(canonicalPlantDay) ? canonicalPlantDay : 0));
  sim.simHour = simHour(sim.simTimeMs);
  sim.simMinute = new Date(sim.simTimeMs).getMinutes();
  sim.dayWindow = { startHour: STORAGE_SIM_DAY_START_HOUR, endHour: STORAGE_SIM_NIGHT_START_HOUR };
  sim.isDaytime = isDaytimeAtSimTime(sim.simTimeMs);

  plant.stageStartSimDay = getStageTimeline()[Math.max(0, plant.stageIndex)]?.simDayStart || 0;
  plant.lifecycle = {
    ...plant.lifecycle,
    totalSimDays: TOTAL_LIFECYCLE_SIM_DAYS,
    qualityScore: round2(plant.averageHealth - (plant.averageStress * 0.5))
  };
  plant.assets = {
    ...plant.assets,
    basePath: 'assets/plant_growth/',
    resolvedStagePath: plantAssetPath(plant.stageKey)
  };

  if (typeof normalizeEventTimingState === 'function') {
    normalizeEventTimingState(sim.nowMs);
  }

  events.scheduler = {
    ...events.scheduler,
    nextEventSimTimeMs: Number(events.scheduler.nextEventSimTimeMs || sim.simTimeMs),
    nextEventRealTimeMs: Number(events.scheduler.nextEventRealTimeMs || sim.nowMs + STORAGE_EVENT_ROLL_MIN_REAL_MS),
    lastEventSimTimeMs: Number(events.scheduler.lastEventSimTimeMs || 0),
    lastEventRealTimeMs: Number(events.scheduler.lastEventRealTimeMs || 0),
    deferredUntilDaytime: !sim.isDaytime,
    windowRealMinutes: { min: 30, max: 90 },
    eventCooldowns: events.scheduler.eventCooldowns || {},
    categoryCooldowns: events.scheduler.categoryCooldowns || {},
    eventCooldownsSim: events.scheduler.eventCooldownsSim || {},
    categoryCooldownsSim: events.scheduler.categoryCooldownsSim || {}
  };

  events.active = ['activeEvent', 'resolving', 'resolved'].includes(events.machineState)
    ? {
      id: events.activeEventId,
      title: events.activeEventTitle,
      description: events.activeEventText,
      category: events.activeCategory || 'generic',
      learningNote: events.activeLearningNote || ''
    }
    : null;

  history.actions = Array.isArray(history.actions) ? history.actions : [];
  history.events = Array.isArray(history.events) ? history.events : [];
  history.system = Array.isArray(history.system) ? history.system : [];
  history.systemLog = Array.isArray(history.systemLog) ? history.systemLog : [];
  meta.rescue.used = Boolean(meta.rescue.used);
  meta.rescue.usedAtRealMs = Number.isFinite(Number(meta.rescue.usedAtRealMs)) ? Number(meta.rescue.usedAtRealMs) : null;
  meta.rescue.lastResult = (typeof meta.rescue.lastResult === 'string' || meta.rescue.lastResult === null)
    ? meta.rescue.lastResult
    : null;
  getCanonicalNotificationsSettings(state);
  settings.pushNotificationsEnabled = Boolean(settings.pushNotificationsEnabled);

  profile.level = getProgressionApi() && typeof getProgressionApi().getLevelForXp === 'function'
    ? getProgressionApi().getLevelForXp(profile.totalXp)
    : profile.level;

  if (plant.isDead && run.status === 'active' && !isRunFinalized(run)) {
    run.status = 'downed';
  }
  if (run.status === 'downed' && isRunFinalized(run)) {
    run.status = 'ended';
  }
  if (run.status === 'ended' && !isRunFinalized(run)) {
    run.status = 'finished';
  }
  const progressionApi = getProgressionApi();
  if (progressionApi && typeof progressionApi.chooseRunGoal === 'function') {
    if ((run.status === 'active' || run.status === 'downed' || run.status === 'finished' || run.status === 'ended') && !run.goal && (run.setupSnapshot || state.setup)) {
      run.goal = progressionApi.chooseRunGoal(profile, run);
    }
    const shouldEvaluateTerminalGoal = run.goal && run.status !== 'active' && run.status !== 'downed' && typeof progressionApi.evaluateRunGoal === 'function';
    if (shouldEvaluateTerminalGoal) {
      run.goal = progressionApi.evaluateRunGoal(run.goal, state, {
        finalize: isRunFinalized(run),
        endReason: run.endReason === 'harvest' ? 'harvest' : 'death'
      });
    }
  }
  if (run.status === 'finished' || run.status === 'ended') {
    state.ui.runSummaryOpen = Boolean(profile.lastRunSummary);
    state.ui.deathOverlayOpen = false;
  } else if (run.status === 'downed' && !isRunFinalized(run)) {
    state.ui.runSummaryOpen = false;
    state.ui.deathOverlayOpen = true;
  }

  if (Object.prototype.hasOwnProperty.call(state, 'event')) {
    delete state.event;
  }

  state.care = care;
  state.care.summary = deriveCanonicalCareSummary(care, state);

  syncLegacyMirrorsFromCanonical(state);
}

function syncLegacyMirrorsFromCanonical(snapshot) {
  recordEventV1WriteTelemetryHit('W4', {
    source: 'storage.js:sync_legacy_mirrors_from_canonical',
    eventId: snapshot && snapshot.events && snapshot.events.activeEventId ? String(snapshot.events.activeEventId) : null,
    notes: ['save_mirror_sync']
  });
  const s = snapshot;
  const sim = getCanonicalSimulation(s);
  const plant = getCanonicalPlant(s);
  const events = getCanonicalEvents(s);
  const history = getCanonicalHistory(s);
  const care = getCanonicalCare(s);
  ensureStorageCurrencyState(s);

  s.sim = {
    nowMs: sim.nowMs,
    simTimeMs: sim.simTimeMs,
    simEpochMs: sim.simEpochMs,
    tickCount: sim.tickCount,
    mode: sim.mode,
    tickIntervalMs: sim.tickIntervalMs,
    timeCompression: sim.effectiveSpeed,
    baseSpeed: sim.baseSpeed,
    effectiveSpeed: sim.effectiveSpeed,
    globalSeed: sim.globalSeed,
    plantId: sim.plantId,
    isDaytime: sim.isDaytime,
    lastTickAtMs: sim.lastTickRealTimeMs,
    growthImpulse: sim.growthImpulse,
    tempoOffsetDays: sim.tempoOffsetDays,
    stressExposure: sim.stressExposure,
    riskExposure: sim.riskExposure,
    lastPushScheduleAtMs: sim.lastPushScheduleAtMs
  };

  s.growth = {
    phase: plant.phase,
    isDead: plant.isDead,
    stageIndex: Math.max(0, plant.stageIndex - 1),
    stageName: plant.stageKey,
    stageProgress: plant.stageProgress,
    lastValidStageName: plant.lastValidStageKey,
    averageHealth: plant.averageHealth,
    averageStress: plant.averageStress,
    observedSimMs: plant.observedSimMs,
    qualityTier: plant.lifecycle.qualityTier,
    qualityLocked: Boolean(plant.lifecycle.qualityLocked)
  };
  s.care = {
    ...care,
    summary: deriveCanonicalCareSummary(care, s)
  };

  s.lastEventId = events.scheduler.lastEventId || null;
  s.lastChoiceId = events.scheduler.lastChoiceId || null;
  s.historyLog = Array.isArray(history.systemLog) ? history.systemLog : [];
}

window.GrowSimStorage = Object.freeze({
  createStorageAdapter,
  clearStoredState,
  localStorageAdapter,
  loadRemoteSave,
  saveRemoteState,
  compareStateFreshness,
  choosePreferredRestoreSnapshot,
  getCanonicalSimulation,
  getCanonicalPlant,
  getCanonicalEvents,
  getCanonicalHistory,
  getCanonicalCare,
  getCanonicalMeta,
  getCanonicalSettings,
  getCanonicalNotificationsSettings,
  getCanonicalProfile,
  getCanonicalRun,
  restoreState,
  persistState,
  schedulePersistState,
  migrateState,
  migrateLegacyStateIntoCanonical,
  resetStateToDefaults,
  ensureStateIntegrity,
  syncCanonicalStateShape,
  syncLegacyMirrorsFromCanonical
});

