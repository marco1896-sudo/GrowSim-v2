'use strict';

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

const REMOTE_SAVE_PATH = '/save';
const REMOTE_SYNC_MIN_INTERVAL_MS = 30 * 1000;

const remoteSyncRuntime = {
  loadAttempted: false,
  authBlocked: false,
  inFlightSave: null,
  lastSaveAttemptAtMs: 0
};

function getRemoteApiFetch() {
  if (window.GrowSimApi && typeof window.GrowSimApi.apiFetch === 'function') {
    return window.GrowSimApi.apiFetch;
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

  console.info('[remote-load] requested');

  try {
    const apiFetch = getRemoteApiFetch();
    const response = await apiFetch(REMOTE_SAVE_PATH, {
      method: 'GET',
      headers: {
        ...getRemoteAuthHeaders()
      }
    });

    if (response.status === 401 || response.status === 403) {
      remoteSyncRuntime.authBlocked = true;
      console.info('[remote-load] fallback (auth required)');
      return null;
    }

    if (response.status === 404) {
      console.info('[remote-load] fallback (no remote save)');
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
      console.info('[remote-load] fallback (invalid payload)');
      return null;
    }

    const remoteState = extractStateFromRemotePayload(payload);
    if (!remoteState) {
      console.info('[remote-load] fallback (state missing)');
      return null;
    }

    console.info('[remote-load] success');
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
    console.info('[remote-save] fallback (auth required)');
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
  console.info('[remote-save] requested');

  const request = (async () => {
    try {
      const apiFetch = getRemoteApiFetch();
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
        console.info('[remote-save] fallback (auth required)');
        return false;
      }

      if (!response.ok) {
        console.warn('[remote-save] failed', { status: response.status });
        return false;
      }

      console.info('[remote-save] success');
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
    s.environmentControls = { temperatureC: 25, humidityPercent: 60, airflowPercent: 70, ph: 6.0, ec: 1.4 };
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
  if (!Number.isFinite(s.simulation.simTimeMs)) s.simulation.simTimeMs = alignToSimStartHour(nowMs, SIM_START_HOUR);
  if (!Number.isFinite(s.simulation.simEpochMs)) s.simulation.simEpochMs = alignToSimStartHour(s.simulation.startRealTimeMs, SIM_START_HOUR);
  if (!Number.isFinite(s.simulation.simDay)) s.simulation.simDay = 0;
  if (!Number.isFinite(s.simulation.simHour)) s.simulation.simHour = SIM_START_HOUR;
  if (!Number.isFinite(s.simulation.simMinute)) s.simulation.simMinute = 0;
  if (!Number.isFinite(s.simulation.tickCount)) s.simulation.tickCount = 0;
  if (typeof s.simulation.mode !== 'string') s.simulation.mode = MODE;
  if (!Number.isFinite(s.simulation.tickIntervalMs)) s.simulation.tickIntervalMs = UI_TICK_INTERVAL_MS;
  if (!Number.isFinite(s.simulation.baseSpeed)) s.simulation.baseSpeed = normalizeBaseSimulationSpeed(s.simulation.timeCompression);
  s.simulation.baseSpeed = normalizeBaseSimulationSpeed(s.simulation.baseSpeed);
  if (!Number.isFinite(s.simulation.effectiveSpeed)) s.simulation.effectiveSpeed = s.simulation.baseSpeed;
  if (!Number.isFinite(s.simulation.timeCompression)) s.simulation.timeCompression = s.simulation.effectiveSpeed;
  if (typeof s.simulation.globalSeed !== 'string') s.simulation.globalSeed = SIM_GLOBAL_SEED;
  if (typeof s.simulation.plantId !== 'string') s.simulation.plantId = SIM_PLANT_ID;
  if (!s.simulation.dayWindow || typeof s.simulation.dayWindow !== 'object') s.simulation.dayWindow = { startHour: SIM_DAY_START_HOUR, endHour: SIM_NIGHT_START_HOUR };
  if (typeof s.simulation.isDaytime !== 'boolean') s.simulation.isDaytime = isDaytimeAtSimTime(s.simulation.simTimeMs);
  if (!Number.isFinite(s.simulation.growthImpulse)) s.simulation.growthImpulse = 0;
  if (!Number.isFinite(s.simulation.tempoOffsetDays)) s.simulation.tempoOffsetDays = 0;
  if (!Number.isFinite(s.simulation.lastPushScheduleAtMs)) s.simulation.lastPushScheduleAtMs = 0;

  if (!s.boost || typeof s.boost !== 'object') {
    s.boost = {};
  }
  if (!Number.isFinite(s.boost.boostEndsAtMs)) {
    s.boost.boostEndsAtMs = 0;
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
  if (!s.events || typeof s.events !== 'object') {
    s.events = {};
  }

  if (typeof s.events.machineState !== 'string') s.events.machineState = 'idle';
  if (!s.events.scheduler || typeof s.events.scheduler !== 'object') {
    s.events.scheduler = {
      nextEventSimTimeMs: Number(sim.simTimeMs || 0) + (EVENT_ROLL_MIN_REAL_MS * Number(sim.effectiveSpeed || sim.baseSpeed || DEFAULT_BASE_SIM_SPEED || 12)),
      nextEventRealTimeMs: Date.now() + EVENT_ROLL_MIN_REAL_MS,
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
  if (!Number.isFinite(s.events.scheduler.nextEventSimTimeMs)) s.events.scheduler.nextEventSimTimeMs = Number(sim.simTimeMs || 0) + (EVENT_ROLL_MIN_REAL_MS * Number(sim.effectiveSpeed || sim.baseSpeed || DEFAULT_BASE_SIM_SPEED || 12));
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
  if (typeof s.events.activeCategory !== 'string') s.events.activeCategory = 'generic';
  if (!Array.isArray(s.events.activeTags)) s.events.activeTags = [];
  if (!Number.isFinite(s.events.lastEventAtMs)) s.events.lastEventAtMs = 0;
  if (!Number.isFinite(s.events.resolvingUntilSimTimeMs)) s.events.resolvingUntilSimTimeMs = 0;
  if (!Number.isFinite(s.events.cooldownUntilMs)) s.events.cooldownUntilMs = 0;
  if (!Number.isFinite(s.events.cooldownUntilSimTimeMs)) s.events.cooldownUntilSimTimeMs = 0;
  if (!Array.isArray(s.events.catalog)) s.events.catalog = [];
  if (!s.events.foundation || typeof s.events.foundation !== 'object') s.events.foundation = {};
  if (!s.events.foundation.flags || typeof s.events.foundation.flags !== 'object') s.events.foundation.flags = {};
  if (!s.events.foundation.memory || typeof s.events.foundation.memory !== 'object') s.events.foundation.memory = {};
  if (!Array.isArray(s.events.foundation.memory.events)) s.events.foundation.memory.events = [];
  if (!Array.isArray(s.events.foundation.memory.decisions)) s.events.foundation.memory.decisions = [];
  if (!s.events.foundation.memory.pendingChains || typeof s.events.foundation.memory.pendingChains !== 'object') s.events.foundation.memory.pendingChains = {};
  s.events.foundation.memory.pendingChains = normalizePendingChainsForStorage(s.events.foundation.memory.pendingChains);
  if (!Array.isArray(s.events.foundation.analysis)) s.events.foundation.analysis = [];

  return s.events;
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

function getCanonicalMeta(snapshot) {
  const s = snapshot || state;
  if (!s.meta || typeof s.meta !== 'object') {
    s.meta = {};
  }
  if (!s.meta.rescue || typeof s.meta.rescue !== 'object') {
    s.meta.rescue = {};
  }
  if (typeof s.meta.rescue.used !== 'boolean') s.meta.rescue.used = false;
  if (!Number.isFinite(Number(s.meta.rescue.usedAtRealMs))) s.meta.rescue.usedAtRealMs = null;
  if (s.meta.rescue.lastResult !== null && typeof s.meta.rescue.lastResult !== 'string') s.meta.rescue.lastResult = null;
  return s.meta;
}

function getCanonicalSettings(snapshot) {
  const s = snapshot || state;
  if (!s.settings || typeof s.settings !== 'object') {
    s.settings = {};
  }
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

function getCanonicalProfile(snapshot) {
  const s = snapshot || state;
  const progressionApi = getProgressionApi();
  if (!progressionApi || typeof progressionApi.normalizeProfile !== 'function') {
    if (!s.profile || typeof s.profile !== 'object') {
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
        lastRunSummary: null
      };
    }
    return s.profile;
  }

  s.profile = progressionApi.normalizeProfile(s.profile);
  return s.profile;
}

function getCanonicalRun(snapshot) {
  const s = snapshot || state;
  const progressionApi = getProgressionApi();
  if (!progressionApi || typeof progressionApi.normalizeRunState !== 'function') {
    if (!s.run || typeof s.run !== 'object') {
      s.run = {
        id: 0,
        status: 'idle',
        endReason: null,
        startedAtRealMs: null,
        endedAtRealMs: null,
        finalizedAtRealMs: null,
        setupSnapshot: null,
        goal: null
      };
    }
    return s.run;
  }

  s.run = progressionApi.normalizeRunState(s.run);
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

async function restoreState() {
  if (!storageAdapter) {
    return;
  }

  let saved = await loadRemoteSave();

  if (!saved) {
    try {
      saved = await storageAdapter.get();
      if (saved && typeof saved === 'object') {
        console.info('[remote-load] fallback (using local save)');
      } else {
        console.info('[remote-load] fallback (no local save)');
      }
    } catch (error) {
      console.warn('[storage] state restore read failed', error);
      return;
    }
  }
  if (!saved || typeof saved !== 'object') {
    return;
  }

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
    state.ui.openSheet = null;
    state.ui.menuOpen = false;
    state.ui.menuDialogOpen = false;
    state.ui.statDetailKey = null;
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

  migrateLegacyStateIntoCanonical(saved, state);
  normalizeEnvironmentState(state);
}

function migrateLegacyStateIntoCanonical(saved, targetState) {
  const sim = getCanonicalSimulation(targetState);
  const plant = getCanonicalPlant(targetState);
  const events = getCanonicalEvents(targetState);
  const history = getCanonicalHistory(targetState);

  if (saved.sim && typeof saved.sim === 'object') {
    targetState.simulation = {
      ...sim,
      ...saved.sim,
      startRealTimeMs: Number(saved.sim.startRealTimeMs || saved.sim.simEpochMs || sim.startRealTimeMs),
      lastTickRealTimeMs: Number(saved.sim.lastTickAtMs || sim.lastTickRealTimeMs),
      simEpochMs: Number(saved.sim.simEpochMs || sim.simEpochMs),
      tickIntervalMs: Number(saved.sim.tickIntervalMs || sim.tickIntervalMs),
      baseSpeed: normalizeBaseSimulationSpeed(saved.sim.baseSpeed || saved.sim.timeCompression || sim.baseSpeed),
      effectiveSpeed: Number(saved.sim.effectiveSpeed || saved.sim.timeCompression || sim.effectiveSpeed),
      growthImpulse: Number(saved.sim.growthImpulse || sim.growthImpulse),
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
        activeCategory: String(saved.event.activeCategory || 'generic'),
        activeTags: Array.isArray(saved.event.activeTags) ? saved.event.activeTags : [],
        lastEventAtMs: Number(saved.event.lastEventAtMs || 0),
        cooldownUntilMs: Number(saved.event.cooldownUntilMs || 0),
        cooldownUntilSimTimeMs: Number(saved.event.cooldownUntilSimTimeMs || 0),
        resolvingUntilSimTimeMs: Number(saved.event.resolvingUntilSimTimeMs || 0),
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

  try {
    await storageAdapter.set(state);
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
  const fallbackSimStart = alignToSimStartHour(fallbackNow, SIM_START_HOUR);
  const preservedEventCatalog = Array.isArray(state.events && state.events.catalog) ? state.events.catalog.slice() : [];
  const preservedActionCatalog = Array.isArray(state.actions && state.actions.catalog) ? state.actions.catalog.slice() : [];
  const normalizedActions = preservedActionCatalog.map(normalizeAction).filter(Boolean);

  state.schemaVersion = '1.0.0';
  state.seed = SIM_GLOBAL_SEED;
  state.plantId = SIM_PLANT_ID;
  state.setup = null;
  const progressionApi = getProgressionApi();
  state.profile = progressionApi && typeof progressionApi.getDefaultProfile === 'function'
    ? progressionApi.getDefaultProfile()
    : getCanonicalProfile({});
  state.run = progressionApi && typeof progressionApi.getDefaultRunState === 'function'
    ? progressionApi.getDefaultRunState()
    : getCanonicalRun({});
  state.settings = {
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
    }
  };
  const climateApi = getClimateApi();
  state.environmentControls = climateApi && typeof climateApi.getEnvironmentControlDefaults === 'function'
    ? climateApi.getEnvironmentControlDefaults()
    : { temperatureC: 25, humidityPercent: 60, airflowPercent: 70, ph: 6.0, ec: 1.4 };
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
    simHour: SIM_START_HOUR,
    simMinute: 0,
    tickCount: 0,
    mode: MODE,
    tickIntervalMs: UI_TICK_INTERVAL_MS,
    timeCompression: DEFAULT_BASE_SIM_SPEED,
    baseSpeed: DEFAULT_BASE_SIM_SPEED,
    effectiveSpeed: DEFAULT_BASE_SIM_SPEED,
    globalSeed: SIM_GLOBAL_SEED,
    plantId: SIM_PLANT_ID,
    dayWindow: { startHour: SIM_DAY_START_HOUR, endHour: SIM_NIGHT_START_HOUR },
    isDaytime: isDaytimeAtSimTime(fallbackSimStart),
    growthImpulse: 0,
    tempoOffsetDays: 0,
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
      nextEventSimTimeMs: fallbackSimTime + (EVENT_ROLL_MIN_REAL_MS * DEFAULT_BASE_SIM_SPEED),
      nextEventRealTimeMs: fallbackNow + EVENT_ROLL_MIN_REAL_MS,
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

  state.status = {
    health: 85,
    stress: 15,
    water: 70,
    nutrition: 65,
    growth: 0,
    risk: 20
  };

  state.boost = {
    boostUsedToday: 0,
    boostMaxPerDay: 6,
    dayStamp: dayStamp(fallbackNow),
    boostEndsAtMs: 0
  };

  state.actions = {
    catalog: normalizedActions,
    byId: Object.fromEntries(normalizedActions.map((action) => [action.id, action])),
    cooldowns: {},
    activeEffects: [],
    lastResult: { ok: true, reason: 'ok', actionId: null, atRealTimeMs: fallbackNow }
  };

  state.ui = {
    activeScreen: 'home',
    openSheet: null,
    menuOpen: false,
    menuDialogOpen: false,
    selectedBackground: 'bg_dark_01.jpg',
    visibleOverlayIds: [],
    deathOverlayOpen: false,
    deathOverlayAcknowledged: false,
    runSummaryOpen: false,
    care: {
      selectedCategory: null,
      selectedActionId: null,
      feedback: { kind: 'info', text: 'Wähle eine Aktion.' }
    },
    analysis: {
      activeTab: 'overview'
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

  state.simulation.mode = MODE;
  state.simulation.tickIntervalMs = UI_TICK_INTERVAL_MS;
  state.simulation.baseSpeed = normalizeBaseSimulationSpeed(state.simulation.baseSpeed || state.simulation.timeCompression);
  state.simulation.effectiveSpeed = getEffectiveSimulationSpeed(nowMs);
  state.simulation.timeCompression = state.simulation.effectiveSpeed;
  state.simulation.globalSeed = SIM_GLOBAL_SEED;
  state.simulation.plantId = SIM_PLANT_ID;

  if (!Number.isFinite(state.simulation.nowMs)) {
    state.simulation.nowMs = nowMs;
  }
  if (!Number.isFinite(state.simulation.simTimeMs)) {
    state.simulation.simTimeMs = alignToSimStartHour(nowMs, SIM_START_HOUR);
  }
  if (!Number.isFinite(state.simulation.simEpochMs)) {
    state.simulation.simEpochMs = alignToSimStartHour(nowMs, SIM_START_HOUR);
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

  const machineStates = new Set(['idle', 'activeEvent', 'resolving', 'resolved', 'cooldown']);
  if (!machineStates.has(state.events.machineState)) {
    state.events.machineState = 'idle';
  }
  if (!Number.isFinite(state.events.scheduler.nextEventSimTimeMs)) {
    const fallbackSpeed = Number(state.simulation.effectiveSpeed || state.simulation.baseSpeed || DEFAULT_BASE_SIM_SPEED || 12);
    state.events.scheduler.nextEventSimTimeMs = Number(state.simulation.simTimeMs || 0) + (EVENT_ROLL_MIN_REAL_MS * fallbackSpeed);
  }
  if (!Number.isFinite(state.events.scheduler.nextEventRealTimeMs)) {
    state.events.scheduler.nextEventRealTimeMs = nowMs + EVENT_ROLL_MIN_REAL_MS;
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
  if (!Number.isFinite(state.events.resolvingUntilSimTimeMs)) {
    state.events.resolvingUntilSimTimeMs = 0;
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

  const validSheets = new Set([null, 'care', 'climate', 'event', 'dashboard', 'diagnosis', 'statDetail', 'missions']);
  if (!validSheets.has(state.ui.openSheet)) {
    state.ui.openSheet = null;
  }
  if (typeof state.ui.menuOpen !== 'boolean') {
    state.ui.menuOpen = false;
  }
  if (typeof state.ui.menuDialogOpen !== 'boolean') {
    state.ui.menuDialogOpen = false;
  }
  if (!Array.isArray(state.ui.visibleOverlayIds)) {
    state.ui.visibleOverlayIds = [];
  }
  if (!state.ui.care || typeof state.ui.care !== 'object') {
    state.ui.care = { selectedCategory: null, selectedActionId: null, feedback: { kind: 'info', text: 'Wähle eine Aktion.' } };
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
  const progressionApi = getProgressionApi();
  if (progressionApi && typeof progressionApi.chooseRunGoal === 'function') {
    if ((run.status === 'active' || run.status === 'downed' || run.status === 'ended') && !run.goal && (run.setupSnapshot || state.setup)) {
      run.goal = progressionApi.chooseRunGoal(profile, run);
    }
    if (run.goal && typeof progressionApi.evaluateRunGoal === 'function') {
      run.goal = progressionApi.evaluateRunGoal(run.goal, state, {
        finalize: isRunFinalized(run),
        endReason: run.endReason === 'harvest' ? 'harvest' : 'death'
      });
    }
  }
  if (run.status === 'ended') {
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
  const meta = getCanonicalMeta(state);
  const settings = getCanonicalSettings(state);
  const profile = getCanonicalProfile(state);
  const run = getCanonicalRun(state);
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

  sim.simDay = Math.floor(simDayFloat());
  sim.simHour = simHour(sim.simTimeMs);
  sim.simMinute = new Date(sim.simTimeMs).getMinutes();
  sim.dayWindow = { startHour: SIM_DAY_START_HOUR, endHour: SIM_NIGHT_START_HOUR };
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
    nextEventRealTimeMs: Number(events.scheduler.nextEventRealTimeMs || sim.nowMs + EVENT_ROLL_MIN_REAL_MS),
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
  const progressionApi = getProgressionApi();
  if (progressionApi && typeof progressionApi.chooseRunGoal === 'function') {
    if ((run.status === 'active' || run.status === 'downed' || run.status === 'ended') && !run.goal && (run.setupSnapshot || state.setup)) {
      run.goal = progressionApi.chooseRunGoal(profile, run);
    }
    if (run.goal && typeof progressionApi.evaluateRunGoal === 'function') {
      run.goal = progressionApi.evaluateRunGoal(run.goal, state, {
        finalize: isRunFinalized(run),
        endReason: run.endReason === 'harvest' ? 'harvest' : 'death'
      });
    }
  }
  if (run.status === 'ended') {
    state.ui.runSummaryOpen = Boolean(profile.lastRunSummary);
    state.ui.deathOverlayOpen = false;
  } else if (run.status === 'downed' && !isRunFinalized(run)) {
    state.ui.runSummaryOpen = false;
    state.ui.deathOverlayOpen = true;
  }

  if (Object.prototype.hasOwnProperty.call(state, 'event')) {
    delete state.event;
  }

  syncLegacyMirrorsFromCanonical(state);
}

function syncLegacyMirrorsFromCanonical(snapshot) {
  const s = snapshot;
  const sim = getCanonicalSimulation(s);
  const plant = getCanonicalPlant(s);
  const events = getCanonicalEvents(s);
  const history = getCanonicalHistory(s);

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

  s.lastEventId = events.scheduler.lastEventId || null;
  s.lastChoiceId = events.scheduler.lastChoiceId || null;
  s.historyLog = Array.isArray(history.systemLog) ? history.systemLog : [];
}

window.GrowSimStorage = Object.freeze({
  localStorageAdapter,
  loadRemoteSave,
  saveRemoteState,
  getCanonicalSimulation,
  getCanonicalPlant,
  getCanonicalEvents,
  getCanonicalHistory,
  getCanonicalMeta,
  getCanonicalSettings,
  getCanonicalNotificationsSettings,
  getCanonicalProfile,
  getCanonicalRun,
  restoreState,
  persistState,
  schedulePersistState,
  migrateState,
  resetStateToDefaults,
  ensureStateIntegrity,
  syncCanonicalStateShape,
  syncLegacyMirrorsFromCanonical
});
