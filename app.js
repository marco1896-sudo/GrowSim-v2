/*
ASSUMPTIONS:
- This Phase-1 implementation follows docs/PLAN.md architecture with one nested state object and one central tick loop.
- Runtime mode defaults to "dev" for faster verification and can be switched via CONFIG.MODE.
- Push scheduling stubs can target the production backend; failures are logged but never break the app.
*/

'use strict';

const growSimSharedConfig = (typeof window !== 'undefined' && window.GrowSimSimulationConfig && typeof window.GrowSimSimulationConfig === 'object')
  ? window.GrowSimSimulationConfig
  : {};

function appApiFetch(path, options = {}) {
  if (window.GrowSimApi && typeof window.GrowSimApi.apiFetch === 'function') {
    return window.GrowSimApi.apiFetch(path, options);
  }

  const apiBaseUrl = (window.GrowSimApi && typeof window.GrowSimApi.API_BASE_URL === 'string')
    ? window.GrowSimApi.API_BASE_URL
    : 'https://api.growsimulator.tech';
  const apiPrefix = (window.GrowSimApi && typeof window.GrowSimApi.API_PREFIX === 'string')
    ? window.GrowSimApi.API_PREFIX
    : '/api';

  const rawPath = String(path || '');
  let targetUrl;
  if (/^https?:\/\//i.test(rawPath)) {
    const parsed = new URL(rawPath);
    if (parsed.origin === apiBaseUrl && !parsed.pathname.startsWith(`${apiPrefix}/`) && parsed.pathname !== apiPrefix) {
      parsed.pathname = `${apiPrefix}${parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`}`;
    }
    targetUrl = parsed.toString();
  } else {
    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const apiPath = normalizedPath.startsWith(`${apiPrefix}/`) || normalizedPath === apiPrefix
      ? normalizedPath
      : `${apiPrefix}${normalizedPath}`;
    targetUrl = `${apiBaseUrl}${apiPath}`;
  }
  return fetch(targetUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
}

const CONFIG = Object.freeze({
  MODE: typeof growSimSharedConfig.MODE === 'string' ? growSimSharedConfig.MODE : 'prod',
  timing: Object.freeze({
    uiTickMs: Number.isFinite(Number(growSimSharedConfig.UI_TICK_INTERVAL_MS)) ? Number(growSimSharedConfig.UI_TICK_INTERVAL_MS) : 1000,
    eventRollMinRealMs: Number.isFinite(Number(growSimSharedConfig.EVENT_ROLL_MIN_REAL_MS)) ? Number(growSimSharedConfig.EVENT_ROLL_MIN_REAL_MS) : 30 * 60 * 1000,
    eventRollMaxRealMs: Number.isFinite(Number(growSimSharedConfig.EVENT_ROLL_MAX_REAL_MS)) ? Number(growSimSharedConfig.EVENT_ROLL_MAX_REAL_MS) : 90 * 60 * 1000,
    eventCooldownMs: Number.isFinite(Number(growSimSharedConfig.EVENT_COOLDOWN_MS)) ? Number(growSimSharedConfig.EVENT_COOLDOWN_MS) : 20 * 60 * 1000
  }),
  simulation: Object.freeze({
    timeCompression: Number.isFinite(Number(growSimSharedConfig.DEFAULT_BASE_SIM_SPEED)) ? Number(growSimSharedConfig.DEFAULT_BASE_SIM_SPEED) : 12,
    dayStartHour: Number.isFinite(Number(growSimSharedConfig.SIM_DAY_START_HOUR)) ? Number(growSimSharedConfig.SIM_DAY_START_HOUR) : 6,
    nightStartHour: Number.isFinite(Number(growSimSharedConfig.SIM_NIGHT_START_HOUR)) ? Number(growSimSharedConfig.SIM_NIGHT_START_HOUR) : 22,
    startHour: Number.isFinite(Number(growSimSharedConfig.SIM_START_HOUR)) ? Number(growSimSharedConfig.SIM_START_HOUR) : 8,
    globalSeed: typeof growSimSharedConfig.SIM_GLOBAL_SEED === 'string' ? growSimSharedConfig.SIM_GLOBAL_SEED : 'grow-sim-v1-seed',
    plantId: typeof growSimSharedConfig.SIM_PLANT_ID === 'string' ? growSimSharedConfig.SIM_PLANT_ID : 'plant-001'
  }),
  boostAdvanceMs: 30 * 60 * 1000,
  maxHistoryLog: 200,
  persistThrottleMs: 2500,
  logTickEveryNTicks: 10,
  actionDebounceMs: 450
});
const MODE = CONFIG.MODE === 'dev' ? 'dev' : 'prod';
const UI_TICK_INTERVAL_MS = CONFIG.timing.uiTickMs;
const EVENT_ROLL_MIN_REAL_MS = CONFIG.timing.eventRollMinRealMs;
const EVENT_ROLL_MAX_REAL_MS = CONFIG.timing.eventRollMaxRealMs;
const EVENT_COOLDOWN_MS = CONFIG.timing.eventCooldownMs;
const EVENT_RESOLUTION_MS = 10 * 60 * 1000;
const BOOST_ADVANCE_MS = CONFIG.boostAdvanceMs;
const DEFAULT_BASE_SIM_SPEED = CONFIG.simulation.timeCompression;
const SIM_SPEED_OPTIONS = Array.isArray(growSimSharedConfig.SIM_SPEED_OPTIONS) ? Object.freeze(growSimSharedConfig.SIM_SPEED_OPTIONS.slice()) : Object.freeze([4, 8, 12, 16]);
const BOOST_SIM_SPEED = Number.isFinite(Number(growSimSharedConfig.BOOST_SIM_SPEED)) ? Number(growSimSharedConfig.BOOST_SIM_SPEED) : 24;
const CARE_ACTION_TIME_DIAGNOSTIC_THRESHOLD_MS = 1000;
const BOOST_DURATION_REAL_MS = 30 * 60 * 1000;
const BOOST_MAX_REMAINING_REAL_MS = 60 * 60 * 1000;
const SIM_TIME_COMPRESSION = DEFAULT_BASE_SIM_SPEED;
const SIM_DAY_START_HOUR = CONFIG.simulation.dayStartHour;
const SIM_NIGHT_START_HOUR = CONFIG.simulation.nightStartHour;
const SIM_START_HOUR = CONFIG.simulation.startHour;
const SIM_GLOBAL_SEED = CONFIG.simulation.globalSeed;
const SIM_PLANT_ID = CONFIG.simulation.plantId;
const MAX_HISTORY_LOG = CONFIG.maxHistoryLog;
const PERSIST_THROTTLE_MS = CONFIG.persistThrottleMs;
const MAX_ELAPSED_PER_TICK_MS = Number.isFinite(Number(growSimSharedConfig.MAX_ELAPSED_PER_TICK_MS)) ? Number(growSimSharedConfig.MAX_ELAPSED_PER_TICK_MS) : 5000;
const MAX_OFFLINE_SIM_MS = Number.isFinite(Number(growSimSharedConfig.MAX_OFFLINE_SIM_MS)) ? Number(growSimSharedConfig.MAX_OFFLINE_SIM_MS) : 8 * 60 * 60 * 1000;
const LARGE_TIME_JUMP_LOG_MS = Number.isFinite(Number(growSimSharedConfig.LARGE_TIME_JUMP_LOG_MS)) ? Number(growSimSharedConfig.LARGE_TIME_JUMP_LOG_MS) : 60 * 1000;
const APP_BASE_PATH = resolveAppBasePath();
const FREEZE_SIM_ON_DEATH = typeof growSimSharedConfig.FREEZE_SIM_ON_DEATH === 'boolean' ? growSimSharedConfig.FREEZE_SIM_ON_DEATH : true; // Fuer Klarheit: Simulation pausiert nach Tod der Pflanze.

const DB_NAME = 'grow-sim-db';
const DB_STORE = 'kv';
const DB_KEY = 'state-v2';
const LS_STATE_KEY = 'grow-sim-state-v2';
const PUSH_SUB_KEY = 'grow-sim-push-sub-v1';
const EVENTS_CATALOG_VERSION = '20260301-de';
const ACTIONS_CATALOG_VERSION = '20260326-care-ui-v1';
const VAPID_PUBLIC_KEY = 'BElxPLACEHOLDERp8v2C4CwY6ofqP5E8v2rFjQvqW8g4bW2-v8JvKc-l7dXXn4N1xqjY7PqFhL3O8m4jzWzI8v7jA';

const REAL_RUN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const TOTAL_LIFECYCLE_SIM_DAYS = 84;
const SIM_DAY_MS = 24 * 60 * 60 * 1000;
const TOTAL_LIFECYCLE_SIM_MS = TOTAL_LIFECYCLE_SIM_DAYS * SIM_DAY_MS;

const STAGE_DEFS = Object.freeze([
  Object.freeze({ index: 0, id: 'germination', label: 'Keimung', simDayStart: 0, phase: 'seedling', minHealth: 30, maxStress: 85 }),
  Object.freeze({ index: 1, id: 'seedling', label: 'Keimling', simDayStart: 3, phase: 'seedling', minHealth: 35, maxStress: 80 }),
  Object.freeze({ index: 2, id: 'early_vegetative', label: 'Frühe Vegetationsphase', simDayStart: 8, phase: 'vegetative', minHealth: 40, maxStress: 75 }),
  Object.freeze({ index: 3, id: 'vegetative', label: 'Vegetationsphase', simDayStart: 16, phase: 'vegetative', minHealth: 42, maxStress: 72 }),
  Object.freeze({ index: 4, id: 'late_vegetative', label: 'Späte Vegetationsphase', simDayStart: 24, phase: 'vegetative', minHealth: 45, maxStress: 70 }),
  Object.freeze({ index: 5, id: 'pre_flower', label: 'Vorblüte', simDayStart: 31, phase: 'vegetative', minHealth: 48, maxStress: 65 }),
  Object.freeze({ index: 6, id: 'stretch', label: 'Streckphase', simDayStart: 39, phase: 'flowering', minHealth: 50, maxStress: 60 }),
  Object.freeze({ index: 7, id: 'early_flower', label: 'Frühe Blüte', simDayStart: 47, phase: 'flowering', minHealth: 52, maxStress: 58 }),
  Object.freeze({ index: 8, id: 'flower', label: 'Blüte', simDayStart: 57, phase: 'flowering', minHealth: 54, maxStress: 55 }),
  Object.freeze({ index: 9, id: 'late_flower', label: 'Späte Blüte', simDayStart: 66, phase: 'flowering', minHealth: 55, maxStress: 52 }),
  Object.freeze({ index: 10, id: 'ripening', label: 'Reife', simDayStart: 75, phase: 'harvest', minHealth: 56, maxStress: 50 }),
  Object.freeze({ index: 11, id: 'harvest_ready', label: 'Erntereif', simDayStart: 84, phase: 'harvest', minHealth: 0, maxStress: 100 })
]);

const DEFAULT_STAGE_TIMELINE = Object.freeze([
  Object.freeze({ id: 'germination_seedling', label: 'Keimung / Sämling', phase: 'seedling', simDayStart: 0 }),
  Object.freeze({ id: 'early_vegetative', label: 'Frühe Vegetation', phase: 'vegetative', simDayStart: 4 }),
  Object.freeze({ id: 'mid_vegetative', label: 'Mittlere Vegetation', phase: 'vegetative', simDayStart: 14 }),
  Object.freeze({ id: 'late_vegetative_preflower', label: 'Späte Vegetation / Vorblüte', phase: 'vegetative', simDayStart: 28 }),
  Object.freeze({ id: 'early_flower', label: 'Frühe Blüte', phase: 'flowering', simDayStart: 38 }),
  Object.freeze({ id: 'mid_flower', label: 'Mittlere Blüte', phase: 'flowering', simDayStart: 52 }),
  Object.freeze({ id: 'late_flower_ripe', label: 'Späte Blüte / Reife', phase: 'flowering', simDayStart: 68 }),
  Object.freeze({ id: 'finish', label: 'Reife / Finish', phase: 'harvest', simDayStart: 82 })
]);

const PLANT_SPRITE_ASSET = 'assets/plant_growth/plant_growth_sprite.png';
const PLANT_METADATA_ASSET = 'assets/plant_growth/plant_growth_metadata.json';
const PLANT_STAGE_IMAGES = Object.freeze([
  'assets/plant_growth/aligned_frames/frame_008.png',  // stage_1 (Keimling)
  'assets/plant_growth/aligned_frames/frame_023.png',  // stage_2 (Wachstum)
  'assets/plant_growth/aligned_frames/frame_039.png'   // stage_3 (Blüte)
]);

const DEFAULT_PLANT_STAGE_RANGES = Object.freeze({
  seed: Object.freeze({ start: 1, end: 3 }),
  sprout: Object.freeze({ start: 4, end: 7 }),
  seedling: Object.freeze({ start: 8, end: 10 }),
  vegetative: Object.freeze({ start: 11, end: 27 }),
  preflower: Object.freeze({ start: 28, end: 31 }),
  flowering: Object.freeze({ start: 32, end: 38 }),
  late_flowering: Object.freeze({ start: 39, end: 43 }),
  harvest: Object.freeze({ start: 44, end: 46 })
});

const STAGE_INDEX_TO_SPRITE_STAGE = Object.freeze([
  'seed',
  'sprout',
  'seedling',
  'vegetative',
  'vegetative',
  'preflower',
  'flowering',
  'flowering',
  'late_flowering',
  'late_flowering',
  'harvest',
  'harvest'
]);

// Figma reference (Home 132:51) defines a shared anchor zone:
// center + baseline are fixed, while stage variants scale inside that same zone.
const HOME_PLANT_REFERENCE_FIT = Object.freeze({
  maxFootprintScale: 3.0,
  baselineInsetPx: -4,
  podestCenterXRatio: 0.5,
  podestFootYRatio: 0.642,
  backgroundWidthPx: 393,
  backgroundHeightPx: 852
});

const HOME_PLANT_STAGE_SCALE = Object.freeze({
  seed: 3.0,
  sprout: 3.0,
  seedling: 3.0,
  vegetative: 3.0,
  preflower: 3.0,
  flowering: 3.0,
  late_flowering: 3.0,
  harvest: 3.0
});

const plantSpriteRuntime = {
  ready: false,
  loadingPromise: null,
  image: null,
  metadata: null,
  stageRanges: DEFAULT_PLANT_STAGE_RANGES,
  frameBoundsCache: new Map(),
  fallbackBoundsCache: new Map(),
  boundsCanvas: null,
  boundsCtx: null
};

const PHASE_LABEL_DE = Object.freeze({
  seedling: 'Keimling',
  vegetative: 'Vegetativ',
  flowering: 'Blüte',
  harvest: 'Ernte',
  dead: 'Tot'
});

const OVERLAY_ASSETS = Object.freeze({
  overlay_burn: 'assets/gameplay/states/nutrient_burn.png',
  overlay_def_mg: 'assets/gameplay/states/nutrient_deficiency.png',
  overlay_def_n: 'assets/gameplay/states/nutrient_deficiency.png',
  overlay_mold_warning: 'assets/gameplay/states/mold_warning.png',
  overlay_pest_mites: 'assets/gameplay/states/pest_mites.png',
  overlay_pest_thrips: 'assets/gameplay/states/pest_thrips.png'
});

const now = Date.now();
const initialSimTimeMs = alignToSimStartHour(now, SIM_START_HOUR);
const progressionDefaults = window.GrowSimProgression && typeof window.GrowSimProgression.getDefaultProfile === 'function' ? window.GrowSimProgression : null;
const state = {
  schemaVersion: '1.0.0',
  seed: SIM_GLOBAL_SEED,
  plantId: SIM_PLANT_ID,
  setup: null,
  settings: {
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
      }
    },
    pushNotificationsEnabled: false
  },
  meta: {
    rescue: {
      used: false,
      usedAtRealMs: null,
      lastResult: null
    },
    persistence: {
      lastSavedAtRealMs: Date.now()
    }
  },
  profile: progressionDefaults ? progressionDefaults.getDefaultProfile() : {
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
  },
  run: progressionDefaults ? progressionDefaults.getDefaultRunState() : {
    id: 0,
    status: 'idle',
    endReason: null,
    startedAtRealMs: null,
    endedAtRealMs: null,
    finalizedAtRealMs: null,
    setupSnapshot: null
  },
  missions: {
    catalog: [],
    byId: {},
    completed: []
  },
  environmentControls: {
    temperatureC: 25,
    humidityPercent: 60,
    airflowPercent: 70,
    ph: 6.0,
    ec: 1.4
  },
  climate: {},
  simulation: {
    nowMs: now,
    startRealTimeMs: now,
    lastTickRealTimeMs: now,
    simTimeMs: initialSimTimeMs,
    simEpochMs: initialSimTimeMs,
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
    isDaytime: isDaytimeAtSimTime(initialSimTimeMs),
    growthImpulse: 0,
    tempoOffsetDays: 0,
    stressExposure: 0,
    riskExposure: 0,
    lastPushScheduleAtMs: 0,
    fairnessGraceUntilRealMs: 0,
    isCatchUp: false
  },
  plant: {
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
    progressOffsetSimMs: 0,
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
  },
  events: {
    machineState: 'idle',
    scheduler: {
      nextEventSimTimeMs: initialSimTimeMs + (EVENT_ROLL_MIN_REAL_MS * DEFAULT_BASE_SIM_SPEED),
      nextEventRealTimeMs: now + EVENT_ROLL_MIN_REAL_MS,
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
    activeImagePath: '',
    resolvingUntilMs: 0,
    resolvingUntilSimTimeMs: 0,
    pendingOutcome: null,
    resolvedOutcome: null,
    lastEventAtMs: 0,
    cooldownUntilMs: 0,
    cooldownUntilSimTimeMs: 0,
    catalog: [],
    foundation: {
      flags: {},
      memory: {
        events: [],
        decisions: [],
        pendingChains: {}
      },
      analysis: []
    }
  },
  history: { actions: [], events: [], system: [], systemLog: [], telemetry: [] },
  debug: { enabled: false, showInternalTicks: false, forceDaytime: false },
  status: {
    health: 85,
    stress: 15,
    water: 70,
    nutrition: 65,
    growth: 0,
    risk: 20
  },
  boost: {
    boostUsedToday: 0,
    boostMaxPerDay: 6,
    dayStamp: dayStamp(now),
    boostEndsAtMs: 0
  },
  actions: {
    catalog: [],
    byId: {},
    cooldowns: {},
    activeEffects: []
  },
  ui: {
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
    },
    statDetailKey: null
  },
  lastEventId: null,
  lastChoiceId: null,
  historyLog: []
};

const ui = {};
const warnedUiKeys = new Set();
let storageAdapter = null;
let tickHandle = null;
let loopRunning = false;
let visibilityHandlerBound = false;
let heartbeatWatchdogHandle = null;
let persistTimer = null;
let rescueAdPending = false;
let wasCriticalHealth = false;
let menuDialogConfirmHandler = null;
let uiController = null;
let screenRuntimeManager = null;
let menuOverlayModule = null;
let sheetsOverlayModule = null;
let authGateActive = false;
let authGatePausedAtMs = 0;
let bootWaitingForAuth = false;
let startupAuthGateResolver = null;
let settingsEventsInitialized = false;

const actionDebounceUntil = Object.create(null);

window.__gsState = state;

wireDomainOwnership();

window.__gsBootOk = false;
window.__gsBootTrace = [];
window.__gsBootState = {
  step: 'init',
  progress: 0,
  message: ''
};
const LOADING_SCREEN_MIN_VISIBLE_MS = 1000;
const LOADING_SCREEN_FADE_MS = 420;
const BOOT_TIMEOUT_MS = 10000;
const BOOT_PROGRESS_BY_STEP = Object.freeze({
  init: 5,
  restore_session: 20,
  load_data: 45,
  init_simulation: 70,
  render_ui: 90,
  ready: 100
});
const BOOT_USER_MESSAGES = Object.freeze({
  init: 'System wird gestartet...',
  restore_session: 'Sitzung wird wiederhergestellt...',
  load_data: 'Spieldaten werden geladen...',
  init_simulation: 'Spielwelt wird vorbereitet...',
  render_ui: 'Oberfläche wird aufgebaut...',
  ready: 'Bereit'
});
const loadingScreenState = {
  startedAtMs: Date.now(),
  hidden: false,
  hidePromise: null,
  timeoutShown: false
};
let bootFailed = false;
let bootTimedOut = false;
let bootTimeoutHandle = null;
let bootCompleted = false;
const bootLoaderLifecycle = {
  readyReached: false,
  hideCalled: false,
  overlayRemoved: false,
  lastHideCallAtMs: 0
};
window.__gsBootLoaderLifecycle = bootLoaderLifecycle;
const bootDiagnostics = {
  startedAtMs: 0,
  currentPhase: null,
  currentPhaseStartedAtMs: 0,
  phaseOrder: [],
  phaseDurationsMs: {},
  substepDurationsMs: {},
  lastSuccessfulPhase: null
};

function getBootUserMessage(step) {
  const key = String(step || 'init');
  return BOOT_USER_MESSAGES[key] || 'Start wird vorbereitet...';
}

function getBootTimeoutMessage(step) {
  const base = getBootUserMessage(step).replace(/\.\.\.$/, '');
  return `${base}... Das dauert ungewöhnlich lange.`;
}

function startBootDiagnostics() {
  bootDiagnostics.startedAtMs = Date.now();
  bootDiagnostics.currentPhase = null;
  bootDiagnostics.currentPhaseStartedAtMs = 0;
  bootDiagnostics.phaseOrder = [];
  bootDiagnostics.phaseDurationsMs = {};
  bootDiagnostics.substepDurationsMs = {};
  bootDiagnostics.lastSuccessfulPhase = null;
}

function closeCurrentBootPhase(nowMs, options = {}) {
  const markSuccessful = options.markSuccessful !== false;
  const phase = bootDiagnostics.currentPhase;
  const startMs = bootDiagnostics.currentPhaseStartedAtMs;
  if (!phase || !startMs) {
    return;
  }
  const durationMs = Math.max(0, nowMs - startMs);
  bootDiagnostics.phaseDurationsMs[phase] = (bootDiagnostics.phaseDurationsMs[phase] || 0) + durationMs;
  if (markSuccessful) {
    bootDiagnostics.lastSuccessfulPhase = phase;
  }
  console.info('[boot][timing][phase]', phase, `${durationMs}ms`);
}

function trackBootPhaseTransition(nextPhase) {
  if (!bootDiagnostics.startedAtMs) {
    return;
  }
  const phase = String(nextPhase || 'init');
  const nowMs = Date.now();
  if (bootDiagnostics.currentPhase === phase) {
    return;
  }
  closeCurrentBootPhase(nowMs, { markSuccessful: true });
  bootDiagnostics.currentPhase = phase;
  bootDiagnostics.currentPhaseStartedAtMs = nowMs;
  if (!bootDiagnostics.phaseOrder.includes(phase)) {
    bootDiagnostics.phaseOrder.push(phase);
  }
}

function recordBootSubstepDuration(name, durationMs) {
  const key = String(name || 'unknown');
  const safeDurationMs = Math.max(0, Math.round(Number(durationMs) || 0));
  bootDiagnostics.substepDurationsMs[key] = safeDurationMs;
  console.info('[boot][timing][substep]', key, `${safeDurationMs}ms`);
}

async function runBootSubstep(name, task) {
  const startedAtMs = Date.now();
  try {
    return await Promise.resolve().then(task);
  } finally {
    recordBootSubstepDuration(name, Date.now() - startedAtMs);
  }
}

function finalizeBootDiagnostics(options = {}) {
  const success = options.success === true;
  const failedPhase = options.failedPhase ? String(options.failedPhase) : null;
  const nowMs = Date.now();
  closeCurrentBootPhase(nowMs, { markSuccessful: success });
  if (!success && !failedPhase && bootDiagnostics.currentPhase) {
    // no-op: failed phase defaults to current phase below
  }

  const effectiveFailedPhase = success ? null : (failedPhase || bootDiagnostics.currentPhase || null);
  const totalBootDurationMs = bootDiagnostics.startedAtMs
    ? Math.max(0, nowMs - bootDiagnostics.startedAtMs)
    : 0;

  const report = {
    success,
    totalBootDurationMs,
    lastSuccessfulPhase: bootDiagnostics.lastSuccessfulPhase || null,
    failedPhase: effectiveFailedPhase,
    phaseDurationsMs: { ...bootDiagnostics.phaseDurationsMs },
    substepDurationsMs: { ...bootDiagnostics.substepDurationsMs }
  };

  if (options.error) {
    const err = options.error;
    report.error = {
      name: err && err.name ? String(err.name) : 'Error',
      message: err && err.message ? String(err.message) : String(err)
    };
  }

  if (success) {
    console.info('[boot][report:success]', report);
  } else {
    console.error('[boot][report:failure]', report);
  }

  window.__gsBootDiagnosticsReport = report;
  return report;
}

function ensureLoadingScreenUi() {
  const overlay = document.getElementById('appLoadingScreen');
  if (!overlay) {
    return null;
  }
  const video = overlay.querySelector('video');

  let status = document.getElementById('appLoadingStatus');
  if (!status) {
    status = document.createElement('div');
    status.id = 'appLoadingStatus';
    status.style.position = 'absolute';
    status.style.left = '50%';
    status.style.bottom = 'max(32px, calc(env(safe-area-inset-bottom) + 20px))';
    status.style.transform = 'translateX(-50%)';
    status.style.width = 'min(90vw, 360px)';
    status.style.textAlign = 'center';
    status.style.color = '#d8d8d8';
    status.style.fontSize = '14px';
    status.style.lineHeight = '1.35';
    status.style.letterSpacing = '0.01em';
    status.style.fontFamily = '"Exo 2", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    overlay.appendChild(status);
  }

  let note = document.getElementById('appLoadingNote');
  if (!note) {
    note = document.createElement('div');
    note.id = 'appLoadingNote';
    note.style.position = 'absolute';
    note.style.left = '50%';
    note.style.bottom = 'max(14px, calc(env(safe-area-inset-bottom) + 2px))';
    note.style.transform = 'translateX(-50%)';
    note.style.width = 'min(88vw, 360px)';
    note.style.textAlign = 'center';
    note.style.color = 'rgba(216, 216, 216, 0.68)';
    note.style.fontSize = '12px';
    note.style.lineHeight = '1.3';
    note.style.letterSpacing = '0.01em';
    note.style.fontFamily = '"Exo 2", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    note.style.display = 'none';
    overlay.appendChild(note);
  }

  let progressTrack = document.getElementById('appLoadingProgressTrack');
  if (!progressTrack) {
    progressTrack = document.createElement('div');
    progressTrack.id = 'appLoadingProgressTrack';
    progressTrack.style.position = 'absolute';
    progressTrack.style.left = '50%';
    progressTrack.style.bottom = 'max(56px, calc(env(safe-area-inset-bottom) + 42px))';
    progressTrack.style.transform = 'translateX(-50%)';
    progressTrack.style.width = 'min(82vw, 280px)';
    progressTrack.style.height = '4px';
    progressTrack.style.borderRadius = '999px';
    progressTrack.style.background = 'rgba(255, 255, 255, 0.16)';
    progressTrack.style.overflow = 'hidden';
    progressTrack.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.06)';
    overlay.appendChild(progressTrack);
  }

  let progressFill = document.getElementById('appLoadingProgressFill');
  if (!progressFill) {
    progressFill = document.createElement('span');
    progressFill.id = 'appLoadingProgressFill';
    progressFill.style.display = 'block';
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.borderRadius = 'inherit';
    progressFill.style.background = 'linear-gradient(90deg, rgba(210,210,210,0.9), rgba(244,244,244,0.98))';
    progressFill.style.transition = 'width 300ms ease, background 260ms ease';
    progressTrack.appendChild(progressFill);
  }

  let progressMeta = document.getElementById('appLoadingProgressMeta');
  if (!progressMeta) {
    progressMeta = document.createElement('div');
    progressMeta.id = 'appLoadingProgressMeta';
    progressMeta.style.position = 'absolute';
    progressMeta.style.left = '50%';
    progressMeta.style.bottom = 'max(64px, calc(env(safe-area-inset-bottom) + 50px))';
    progressMeta.style.transform = 'translateX(-50%)';
    progressMeta.style.width = 'min(82vw, 280px)';
    progressMeta.style.textAlign = 'right';
    progressMeta.style.color = 'rgba(216, 216, 216, 0.74)';
    progressMeta.style.fontSize = '11px';
    progressMeta.style.lineHeight = '1';
    progressMeta.style.letterSpacing = '0.03em';
    progressMeta.style.fontFamily = '"Exo 2", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    progressMeta.textContent = '0%';
    overlay.appendChild(progressMeta);
  }

  let retryBtn = document.getElementById('appLoadingRetryBtn');
  if (!retryBtn) {
    retryBtn = document.createElement('button');
    retryBtn.id = 'appLoadingRetryBtn';
    retryBtn.type = 'button';
    retryBtn.textContent = 'Erneut versuchen';
    retryBtn.style.position = 'absolute';
    retryBtn.style.left = '50%';
    retryBtn.style.bottom = 'max(8px, env(safe-area-inset-bottom))';
    retryBtn.style.transform = 'translateX(-50%)';
    retryBtn.style.minHeight = '40px';
    retryBtn.style.padding = '10px 16px';
    retryBtn.style.borderRadius = '10px';
    retryBtn.style.border = '1px solid rgba(255,255,255,0.22)';
    retryBtn.style.background = 'rgba(255,255,255,0.1)';
    retryBtn.style.color = '#ffffff';
    retryBtn.style.fontSize = '14px';
    retryBtn.style.fontWeight = '600';
    retryBtn.style.cursor = 'pointer';
    retryBtn.style.display = 'none';
    retryBtn.addEventListener('click', () => {
      window.location.reload();
    });
    overlay.appendChild(retryBtn);
  }

  return { overlay, video, status, note, retryBtn, progressFill, progressMeta };
}

function updateLoadingScreenFromBootState() {
  const ui = ensureLoadingScreenUi();
  if (!ui) {
    return;
  }

  const bootState = window.__gsBootState || { step: 'init', progress: 0, message: '' };
  const message = String(bootState.message || '').trim() || 'Wird vorbereitet...';
  const progress = Math.max(0, Math.min(100, Math.round(Number(bootState.progress) || 0)));
  ui.status.textContent = message;
  ui.progressFill.style.width = `${progress}%`;
  ui.progressMeta.textContent = `${progress}%`;
  ui.retryBtn.style.display = loadingScreenState.timeoutShown || bootFailed ? 'inline-flex' : 'none';

  if (bootFailed) {
    if (ui.video) {
      ui.video.loop = false;
      ui.video.pause();
    }
    ui.status.style.color = '#f2d2d2';
    ui.progressFill.style.background = 'linear-gradient(90deg, rgba(230,140,140,0.9), rgba(248,176,176,0.98))';
    ui.note.style.display = 'block';
    ui.note.style.color = 'rgba(242, 210, 210, 0.78)';
    ui.note.textContent = 'Der Start konnte nicht abgeschlossen werden.';
    return;
  }

  if (loadingScreenState.timeoutShown) {
    if (ui.video) {
      ui.video.loop = false;
      ui.video.pause();
    }
    ui.status.style.color = '#e9dcc2';
    ui.progressFill.style.background = 'linear-gradient(90deg, rgba(218,184,124,0.92), rgba(238,214,169,0.98))';
    ui.note.style.display = 'block';
    ui.note.style.color = 'rgba(233, 220, 194, 0.76)';
    ui.note.textContent = 'Du kannst warten oder den Start neu versuchen.';
    return;
  }

  ui.status.style.color = '#d8d8d8';
  ui.progressFill.style.background = 'linear-gradient(90deg, rgba(210,210,210,0.9), rgba(244,244,244,0.98))';
  ui.note.style.display = 'none';
  if (ui.video) {
    ui.video.loop = true;
    if (ui.video.paused) {
      const playPromise = ui.video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }
}

function setBootStep(step, message = '') {
  const normalizedStep = String(step || 'init');
  const progress = Object.prototype.hasOwnProperty.call(BOOT_PROGRESS_BY_STEP, normalizedStep)
    ? BOOT_PROGRESS_BY_STEP[normalizedStep]
    : (window.__gsBootState && Number.isFinite(window.__gsBootState.progress) ? window.__gsBootState.progress : 0);
  trackBootPhaseTransition(normalizedStep);

  window.__gsBootState = {
    step: normalizedStep,
    progress,
    message: String(message || getBootUserMessage(normalizedStep))
  };

  console.info(`[boot] ${normalizedStep} (${progress}%) ${window.__gsBootState.message}`);
  if (normalizedStep === 'ready') {
    bootLoaderLifecycle.readyReached = true;
    console.info('[boot][loader] ready phase reached');
  }

  window.dispatchEvent(new CustomEvent('boot:step', {
    detail: { ...window.__gsBootState }
  }));

  updateLoadingScreenFromBootState();
}

window.setBootStep = setBootStep;

function hideLoadingScreen(options = {}) {
  if (loadingScreenState.hidden) {
    console.info('[boot][loader] hide called but loader is already hidden');
    return Promise.resolve();
  }

  if (loadingScreenState.hidePromise) {
    console.info('[boot][loader] hide already in progress');
    return loadingScreenState.hidePromise;
  }

  const overlay = document.getElementById('appLoadingScreen');
  if (!overlay) {
    loadingScreenState.hidden = true;
    bootLoaderLifecycle.overlayRemoved = true;
    console.warn('[boot][loader] hide called but overlay element was not found');
    return Promise.resolve();
  }

  const immediate = Boolean(options && options.immediate === true);
  const elapsedMs = Date.now() - loadingScreenState.startedAtMs;
  const waitMs = immediate ? 0 : Math.max(0, LOADING_SCREEN_MIN_VISIBLE_MS - elapsedMs);
  bootLoaderLifecycle.hideCalled = true;
  bootLoaderLifecycle.lastHideCallAtMs = Date.now();
  console.info('[boot][loader] hide requested', {
    waitMs,
    elapsedMs,
    step: window.__gsBootState && window.__gsBootState.step ? window.__gsBootState.step : 'unknown'
  });

  loadingScreenState.hidePromise = new Promise((resolve) => {
    window.setTimeout(() => {
      if (!overlay.isConnected) {
        loadingScreenState.hidden = true;
        bootLoaderLifecycle.overlayRemoved = true;
        console.info('[boot][loader] overlay already detached before fade-out');
        resolve();
        return;
      }

      overlay.classList.add('is-hiding');
      window.setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        loadingScreenState.hidden = true;
        bootLoaderLifecycle.overlayRemoved = true;
        console.info('[boot][loader] overlay removed after fade-out');
        resolve();
      }, LOADING_SCREEN_FADE_MS);
    }, waitMs);
  });

  return loadingScreenState.hidePromise;
}

window.hideLoadingScreen = hideLoadingScreen;
window.addEventListener('boot:step', () => {
  updateLoadingScreenFromBootState();
});
updateLoadingScreenFromBootState();

let appBootStartScheduled = false;
let appBootStartExecuted = false;

function runGrowSimAppInit() {
  if (appBootStartExecuted) {
    return;
  }
  appBootStartExecuted = true;
  console.info('[boot] app init start');

  startBootDiagnostics();
  setBootStep('init', getBootUserMessage('init'));
  bootTimeoutHandle = window.setTimeout(() => {
    if (bootCompleted || bootWaitingForAuth || window.__gsBootState.step === 'ready') {
      return;
    }
    bootTimedOut = true;
    loadingScreenState.timeoutShown = true;
    setBootStep(window.__gsBootState.step, getBootTimeoutMessage(window.__gsBootState.step));
    console.warn('[boot][loader] timeout state active', {
      step: window.__gsBootState.step,
      readyReached: bootLoaderLifecycle.readyReached,
      hideCalled: bootLoaderLifecycle.hideCalled,
      overlayRemoved: bootLoaderLifecycle.overlayRemoved
    });
  }, BOOT_TIMEOUT_MS);

  boot().catch((error) => {
    bootFailed = true;
    loadingScreenState.timeoutShown = true;
    console.error('Boot promise failed', error);
    const failedPhase = (error && error.__gsBootMeta && error.__gsBootMeta.failedPhase)
      ? String(error.__gsBootMeta.failedPhase)
      : String((window.__gsBootState && window.__gsBootState.step) || 'init');
    const failureMessage = `${getBootUserMessage(failedPhase).replace(/\.\.\.$/, '')} konnte nicht abgeschlossen werden. Bitte erneut versuchen.`;
    setBootStep(failedPhase, failureMessage);
    finalizeBootDiagnostics({ success: false, failedPhase, error });
    console.error('[boot][loader] failure state', {
      failedPhase,
      readyReached: bootLoaderLifecycle.readyReached,
      hideCalled: bootLoaderLifecycle.hideCalled,
      overlayRemoved: bootLoaderLifecycle.overlayRemoved
    });
    showBootError(error);
  });
}

function scheduleGrowSimAppInit() {
  if (appBootStartScheduled) {
    return;
  }
  appBootStartScheduled = true;
  console.info('[boot] app init scheduled');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runGrowSimAppInit();
    }, { once: true });
    return;
  }

  queueMicrotask(() => {
    runGrowSimAppInit();
  });
}

scheduleGrowSimAppInit();

function wireDomainOwnership() {
  const ownership = {
    events: 'legacy_app',
    storage: 'legacy_app',
    notifications: 'legacy_app',
    uiRuntime: 'legacy_app'
  };

  const eventsApi = window.GrowSimEvents;
  if (eventsApi && typeof eventsApi === 'object') {
    const requiredEventFns = [
      'runEventStateMachine',
      'activateEvent',
      'eligibleEventsForNow',
      'isEventEligible',
      'evaluateEventTriggers',
      'evaluateSetupConstraints',
      'evaluateTriggerCondition',
      'resolveTriggerField',
      'onEventOptionClick',
      'enterEventCooldown',
      'deterministicRoll',
      'eventThreshold',
      'shouldTriggerEvent',
      'deterministicEventDelayMs',
      'cooldownMs',
      'computeEventDynamicWeight',
      'selectEventDeterministically',
      'scheduleNextEventRoll',
      'registerServiceWorker'
    ];
    const missingEventFns = requiredEventFns.filter((fnName) => typeof eventsApi[fnName] !== 'function');
    if (missingEventFns.length) {
      throw new Error(`GrowSimEvents API unvollständig: ${missingEventFns.join(', ')}`);
    }

    runEventStateMachine = eventsApi.runEventStateMachine;
    activateEvent = eventsApi.activateEvent;
    eligibleEventsForNow = eventsApi.eligibleEventsForNow;
    isEventEligible = eventsApi.isEventEligible;
    evaluateEventTriggers = eventsApi.evaluateEventTriggers;
    evaluateSetupConstraints = eventsApi.evaluateSetupConstraints;
    evaluateTriggerCondition = eventsApi.evaluateTriggerCondition;
    resolveTriggerField = eventsApi.resolveTriggerField;
    onEventOptionClick = eventsApi.onEventOptionClick;
    enterEventCooldown = eventsApi.enterEventCooldown;
    deterministicRoll = eventsApi.deterministicRoll;
    eventThreshold = eventsApi.eventThreshold;
    shouldTriggerEvent = eventsApi.shouldTriggerEvent;
    deterministicEventDelayMs = eventsApi.deterministicEventDelayMs;
    cooldownMs = eventsApi.cooldownMs;
    computeEventDynamicWeight = eventsApi.computeEventDynamicWeight;
    selectEventDeterministically = eventsApi.selectEventDeterministically;
    scheduleNextEventRoll = eventsApi.scheduleNextEventRoll;
    registerServiceWorker = eventsApi.registerServiceWorker;
    ownership.events = 'events.js';
  }

  const storageApi = window.GrowSimStorage;
  if (storageApi && typeof storageApi === 'object') {
    createStorageAdapter = typeof storageApi.createStorageAdapter === 'function'
      ? storageApi.createStorageAdapter
      : createStorageAdapter;
    localStorageAdapter = storageApi.localStorageAdapter;
    getCanonicalSimulation = storageApi.getCanonicalSimulation;
    getCanonicalPlant = storageApi.getCanonicalPlant;
    getCanonicalEvents = storageApi.getCanonicalEvents;
    getCanonicalHistory = storageApi.getCanonicalHistory;
    getCanonicalMeta = storageApi.getCanonicalMeta;
    getCanonicalSettings = storageApi.getCanonicalSettings;
    getCanonicalNotificationsSettings = storageApi.getCanonicalNotificationsSettings;
    getCanonicalProfile = storageApi.getCanonicalProfile;
    getCanonicalRun = storageApi.getCanonicalRun;
    restoreState = storageApi.restoreState;
    persistState = storageApi.persistState;
    schedulePersistState = storageApi.schedulePersistState;
    migrateState = storageApi.migrateState;
    migrateLegacyStateIntoCanonical = storageApi.migrateLegacyStateIntoCanonical;
    resetStateToDefaults = storageApi.resetStateToDefaults;
    ensureStateIntegrity = storageApi.ensureStateIntegrity;
    syncCanonicalStateShape = storageApi.syncCanonicalStateShape;
    syncLegacyMirrorsFromCanonical = storageApi.syncLegacyMirrorsFromCanonical;
    ownership.storage = 'storage_module';
  }

  const uiRuntimeApi = window.GrowSimUiRuntime;
  if (uiRuntimeApi && typeof uiRuntimeApi === 'object') {
    onVisibilityChange = uiRuntimeApi.onVisibilityChange;
    onWindowFocus = uiRuntimeApi.onWindowFocus;
    onPageShow = uiRuntimeApi.onPageShow;
    showRuntimeHaltBanner = uiRuntimeApi.showRuntimeHaltBanner;
    clearRuntimeHaltBanner = uiRuntimeApi.clearRuntimeHaltBanner;
    ownership.uiRuntime = 'ui.js';
  }

  const notificationsApi = window.GrowSimNotifications;
  if (notificationsApi && typeof notificationsApi === 'object') {
    showServiceWorkerHint = notificationsApi.showServiceWorkerHint;
    schedulePushIfAllowed = notificationsApi.schedulePushIfAllowed;
    canNotify = notificationsApi.canNotify;
    notify = notificationsApi.notify;
    evaluateNotificationTriggers = notificationsApi.evaluateNotificationTriggers;
    notifyEventAvailability = notificationsApi.notifyEventAvailability;
    notifyCriticalState = notificationsApi.notifyCriticalState;
    notifyReminder = notificationsApi.notifyReminder;
    notifyPlantNeedsCare = notificationsApi.notifyPlantNeedsCare;
    postJsonStub = notificationsApi.postJsonStub;
    base64ToU8 = notificationsApi.base64ToU8;
    openDb = notificationsApi.openDb;
    dbGet = notificationsApi.dbGet;
    dbSet = notificationsApi.dbSet;
    dbDelete = notificationsApi.dbDelete;
    ownership.notifications = 'notifications_module';
  }

  window.__gsDomainOwnership = ownership;
}

function getUiController() {
  if (uiController) {
    return uiController;
  }
  if (window.__gsUiController) {
    uiController = window.__gsUiController;
    return uiController;
  }
  return null;
}

function getUiPrimitives() {
  const primitives = window.GrowSimUIPrimitives;
  if (primitives && typeof primitives === 'object') {
    return primitives;
  }
  return null;
}

function getProgressionApi() {
  const api = window.GrowSimProgression; return api && typeof api === 'object' ? api : null;
}

function requireStorageModule() {
  const storageApi = window.GrowSimStorage;
  if (!storageApi || typeof storageApi !== 'object') {
    throw new Error('GrowSimStorage API ist nicht verfügbar');
  }
  return storageApi;
}

function getCanonicalProfile(snapshot = state) {
  return requireStorageModule().getCanonicalProfile(snapshot);
}

function getCanonicalRun(snapshot = state) {
  return requireStorageModule().getCanonicalRun(snapshot);
}

function isRunFinalized(runLike) {
  return runLike != null
    && runLike.finalizedAtRealMs != null
    && Number.isFinite(Number(runLike.finalizedAtRealMs));
}

function uiNode(key, fallbackId) {
  if (ui[key]) {
    return ui[key];
  }
  if (fallbackId) {
    const node = document.getElementById(fallbackId);
    if (node) {
      ui[key] = node;
      return node;
    }
  }
  return null;
}

function resolveScreenContainer(screenId) {
  if (Array.isArray(ui.screenViews)) {
    const existing = ui.screenViews.find((node) => node && node.dataset && node.dataset.screen === screenId);
    if (existing) {
      return existing;
    }
  }
  return document.querySelector(`.hud-screen[data-screen="${screenId}"]`);
}

function createFallbackScreenModule(screenId, container, mapping, updateFn) {
  return {
    id: screenId,
    container,
    mapping,
    render() {
      return container;
    },
    bindEvents() {
    },
    update(vm, prevVm) {
      if (typeof updateFn === 'function') {
        updateFn(vm, prevVm);
      }
    }
  };
}

function createHomeScreenModule(mapping) {
  const modulesApi = window.GrowSimScreenModules;
  const container = resolveScreenContainer('home');
  if (modulesApi && typeof modulesApi.createHomeScreenModule === 'function') {
    return modulesApi.createHomeScreenModule({
      container,
      mapping,
      renderer: window.GrowSimHomeRenderer || null,
      onBindEvents: (controller) => {
        if (typeof bindHomeScreenEvents === 'function') {
          bindHomeScreenEvents(controller);
        }
      },
      onUpdate: (vm, prevVm) => updateHomeFromViewModel(vm, prevVm)
    });
  }
  return createFallbackScreenModule('home', container, mapping, (vm, prevVm) => updateHomeFromViewModel(vm, prevVm));
}

function createPassiveScreenModule(screenId) {
  const modulesApi = window.GrowSimScreenModules;
  const container = resolveScreenContainer(screenId);
  if (modulesApi && typeof modulesApi.createPassiveScreenModule === 'function') {
    return modulesApi.createPassiveScreenModule({
      id: screenId,
      container,
      mapping: null
    });
  }
  return createFallbackScreenModule(screenId, container, null, null);
}

function createOverlayFallbackModule(moduleId, onBindEvents, onUpdate) {
  return {
    id: String(moduleId || 'overlay'),
    render() {
    },
    bindEvents(controller) {
      if (typeof onBindEvents === 'function') {
        onBindEvents(controller);
      }
    },
    update(vm, prevVm) {
      if (typeof onUpdate === 'function') {
        onUpdate(vm, prevVm);
      }
    }
  };
}

function createMenuOverlayModule() {
  const modulesApi = window.GrowSimScreenModules;
  if (modulesApi && typeof modulesApi.createMenuOverlayModule === 'function') {
    return modulesApi.createMenuOverlayModule({
      onBindEvents: (controller) => {
        if (typeof bindMenuOverlayEvents === 'function') {
          bindMenuOverlayEvents(controller);
        }
      },
      onUpdate: () => {
        renderGameMenu();
      }
    });
  }
  return createOverlayFallbackModule('menuOverlay', (controller) => {
    if (typeof bindMenuOverlayEvents === 'function') {
      bindMenuOverlayEvents(controller);
    }
  }, () => renderGameMenu());
}

function createSheetsOverlayModule() {
  const modulesApi = window.GrowSimScreenModules;
  if (modulesApi && typeof modulesApi.createSheetsOverlayModule === 'function') {
    return modulesApi.createSheetsOverlayModule({
      onBindEvents: (controller) => {
        if (typeof bindSheetsOverlayEvents === 'function') {
          bindSheetsOverlayEvents(controller);
        }
      },
      onUpdate: () => {
        renderSheets();
        renderCareSheet();
        renderEventSheet();
        renderAnalysisPanel(false);
      }
    });
  }
  return createOverlayFallbackModule('sheetsOverlay', (controller) => {
    if (typeof bindSheetsOverlayEvents === 'function') {
      bindSheetsOverlayEvents(controller);
    }
  }, () => {
    renderSheets();
    renderCareSheet();
    renderEventSheet();
    renderAnalysisPanel(false);
  });
}

function initUiArchitecture() {
  const controllerApi = window.GrowSimUIController;
  if (controllerApi && typeof controllerApi.createUIController === 'function') {
    uiController = controllerApi.createUIController({
      applyAction: (actionId) => applyAction(actionId),
      applyEventOption: (optionId) => callCanonicalEventsRuntime('onEventOptionClick', optionId),
      openSheet: (sheetName) => openSheet(sheetName),
      closeSheet: () => closeSheet(),
      closeMenu: () => closeMenu(),
      resetRun: () => beginNextRunFlow(),
      toggleMenu: () => onMenuToggleClick()
    });
    window.__gsUiController = uiController;
  }

  const runtimeApi = window.GrowSimScreenRuntime;
  if (runtimeApi && typeof runtimeApi.createScreenRuntimeManager === 'function') {
    const mappings = window.GrowSimScreenMappings || {};
    screenRuntimeManager = runtimeApi.createScreenRuntimeManager({
      root: document,
      defaultScreenId: 'home'
    });
    screenRuntimeManager.register(createHomeScreenModule(mappings.home || null));
    if (uiController) {
      screenRuntimeManager.bindController(uiController);
    } const active = state.ui && typeof state.ui.activeScreen === 'string' ? state.ui.activeScreen : 'home';
    state.ui.activeScreen = screenRuntimeManager.setActiveScreen(active);
    window.__gsScreenRuntime = screenRuntimeManager;
  }

  menuOverlayModule = createMenuOverlayModule();
  sheetsOverlayModule = createSheetsOverlayModule();

  if (menuOverlayModule && typeof menuOverlayModule.bindEvents === 'function') {
    menuOverlayModule.bindEvents(uiController);
  }
  if (sheetsOverlayModule && typeof sheetsOverlayModule.bindEvents === 'function') {
    sheetsOverlayModule.bindEvents(uiController);
  }
}

async function boot() {
  let bootStep = 'start';
  let stateRestoredDuringStartupAuthGate = false;
  try {
    setBootStep('init', getBootUserMessage('init'));
    logBootStep('boot:start');
    bootStep = 'mount_hud_components';
    await runBootSubstep('mount_hud_components', () => mountHudComponents());
    logBootStep('boot:mount_hud_components');
    bootStep = 'cache_ui';
    await runBootSubstep('cache_ui', () => cacheUi());
    logBootStep('boot:cache_ui');
    bootStep = 'validate_ui';
    const hasRequiredUi = await runBootSubstep('validate_required_ui', () => ensureRequiredUi());
    if (!hasRequiredUi) { const missing = Array.isArray(ensureRequiredUi.lastMissing) ? ensureRequiredUi.lastMissing : [];
      throw new Error(`Required UI elements missing: ${missing.join(', ')}`);
    }
    logBootStep('boot:validate_ui');
    await runBootSubstep('apply_overlay_assets', () => applyOverlayAssets());

    setBootStep('restore_session', getBootUserMessage('restore_session'));
    bootStep = 'storage_adapter';
    storageAdapter = await runBootSubstep('create_storage_adapter', () => createStorageAdapter());
    logBootStep('boot:storage_adapter');
    bootStep = 'auth_restore';
    if (window.GrowSimAuth && typeof window.GrowSimAuth.restoreSession === 'function') {
      await runBootSubstep('restore_auth_session', () => window.GrowSimAuth.restoreSession());
    }
    let hasValidSession = isAuthSessionValid();
    const useLocalDevBypass = !hasValidSession && shouldBypassAuthForLocalDev();
    if (typeof window !== 'undefined') {
      window.__GROWSIM_DEV_BYPASS__ = false;
    }
    if (useLocalDevBypass) {
      const devSessionActive = activateLocalDevAuthSession();
      if (devSessionActive) {
        hasValidSession = true;
        if (typeof window !== 'undefined') {
          window.__GROWSIM_DEV_BYPASS__ = true;
        }
        setAuthGateActive(false);
        closeCloudAuthModal({ force: true });
        syncAuthModalContent();
        console.info('[auth] local dev bypass active');
      }
    }
    if (!hasValidSession) {
      ensureSettingsUiReady();
      setAuthGateActive(true);
      syncAuthModalContent();
      setBootStep('restore_session', 'Anmeldung erforderlich...');
      await runBootSubstep('show_startup_auth_gate', () => hideLoadingScreen({ immediate: true }));
      await runBootSubstep('open_startup_auth_gate', () => openCloudAuthModal({ gate: true }));
      bootWaitingForAuth = true;
      stateRestoredDuringStartupAuthGate = await runBootSubstep('wait_for_startup_auth', () => waitForStartupAuthGateClear());
      bootWaitingForAuth = false;
    } else {
      setAuthGateActive(false);
    }
    logBootStep('boot:auth_restore', {
      authenticated: hasValidSession
    });

    setBootStep('load_data', getBootUserMessage('load_data'));
    bootStep = 'state_restore';
    if (!stateRestoredDuringStartupAuthGate) {
      await runBootSubstep('restore_or_migrate_state', () => initOrMigrateState());
    }
    logBootStep('boot:state_restore', {
      simTimeMs: state.simulation.simTimeMs,
      nextEventRealTimeMs: state.events.scheduler.nextEventRealTimeMs,
      growthImpulse: state.simulation.growthImpulse
    });

    bootStep = 'catalogs';
    await runBootSubstep('load_catalogs', () => loadCatalogs());
    await runBootSubstep('load_plant_sprite_runtime', () => loadPlantSpriteRuntime());
    logBootStep('boot:catalogs', {
      events: state.events.catalog.length,
      actions: state.actions.catalog.length,
      plantSpriteReady: plantSpriteRuntime.ready
    });

    bootStep = 'bind_ui';
    await runBootSubstep('bind_ui', () => bindUi());
    logBootStep('boot:bind_ui');
    bootStep = 'ui_architecture';
    await runBootSubstep('init_ui_architecture', () => initUiArchitecture());
    logBootStep('boot:ui_architecture', {
      controller: Boolean(uiController),
      runtime: Boolean(screenRuntimeManager)
    });
    await runBootSubstep('apply_background_asset', () => applyBackgroundAsset());
    bootStep = 'service_worker';
    await runBootSubstep('register_service_worker', () => registerServiceWorker());
    logBootStep('boot:service_worker');

    setBootStep('init_simulation', getBootUserMessage('init_simulation'));
    bootStep = 'runtime_sync';
    const bootNowMs = await runBootSubstep('runtime_now_timestamp', () => Date.now());
    await runBootSubstep('sync_simulation_from_elapsed_time', () => syncSimulationFromElapsedTime(bootNowMs));
    await runBootSubstep('sync_runtime_clocks', () => syncRuntimeClocks(bootNowMs));
    await runBootSubstep('sync_active_event_from_catalog', () => syncActiveEventFromCatalog());
    await runBootSubstep('update_visible_overlays', () => updateVisibleOverlays());
    await runBootSubstep('sync_canonical_state_shape', () => syncCanonicalStateShape());
    logBootStep('boot:runtime_sync', {
      nowMs: state.simulation.nowMs,
      simTimeMs: state.simulation.simTimeMs,
      nextEventRealTimeMs: state.events.scheduler.nextEventRealTimeMs,
      growthImpulse: state.simulation.growthImpulse
    });

    await runBootSubstep('log_runtime_initialized', () => addLog('system', 'Runtime initialisiert', {
      mode: state.simulation.mode,
      events: state.events.catalog.length,
      actions: state.actions.catalog.length
    }));

    await runBootSubstep('bind_dev_helpers', () => {
      window.__applyAction = (id) => applyAction(id);
      window.__devSelfTest = () => runDevSelfTest();
    });

    setBootStep('render_ui', getBootUserMessage('render_ui'));
    bootStep = 'loop_and_render';
    await runBootSubstep('start_main_loop_once', () => startLoopOnce());
    await runBootSubstep('start_heartbeat_watchdog', () => startHeartbeatWatchdog());
    await runBootSubstep('render_all', () => renderAll());
    await runBootSubstep('render_landing', () => renderLanding());
    setBootStep('render_ui', 'Fast bereit...');
    window.__gsBootOk = true;
    state.ui.lastRenderRealMs = Date.now();
    logBootStep('boot:render_complete');

    setBootStep('ready', getBootUserMessage('ready'));
    bootCompleted = true;
    await runBootSubstep('hide_loading_screen', () => hideLoadingScreen());
    if (bootTimeoutHandle) {
      window.clearTimeout(bootTimeoutHandle);
      bootTimeoutHandle = null;
    }

    bootStep = 'persist';
    await runBootSubstep('schedule_push_if_allowed', () => schedulePushIfAllowed(true));
    await runBootSubstep('persist_state', () => persistState());
    logBootStep('boot:done');
    finalizeBootDiagnostics({ success: true });
  } catch (error) {
    bootCompleted = false;
    if (bootTimeoutHandle) {
      window.clearTimeout(bootTimeoutHandle);
      bootTimeoutHandle = null;
    }
    logBootStep('boot:failed', {
      step: bootStep,
      message: error && error.message ? error.message : String(error)
    });
    console.error('Boot failed', { step: bootStep, error });
    if (error && typeof error === 'object') {
      error.__gsBootMeta = {
        failedPhase: (window.__gsBootState && window.__gsBootState.step) ? String(window.__gsBootState.step) : 'init',
        lastSuccessfulPhase: bootDiagnostics.lastSuccessfulPhase || null,
        internalStep: bootStep
      };
    }
    throw error;
  }
}

function mountHudComponents() {
  const appHud = document.getElementById('app-hud');
  if (!appHud) {
    document.body.classList.remove('panelized-ready');
    return;
  }

  const hudPanelsApi = window.GrowSimHudPanels;
  if (!hudPanelsApi || typeof hudPanelsApi.mount !== 'function') {
    document.body.classList.remove('panelized-ready');
    return;
  }

  hudPanelsApi.mount(appHud, {
    player: {
      name: 'Max Mustergrower',
      role: 'Gärtner',
      xpText: 'XP: 7.350 / 8.650',
      xpPercent: 84,
      currencyCoins: '2.480',
      currencyGems: '55',
      currencyStars: '114'
    },
    environment: {
      temperature: '25.3°C',
      humidity: '61%',
      vpd: '1.2 kPa',
      light: '720 PPFD',
      airflow: 'Good'
    }
  });
  document.body.classList.add('panelized-ready');
}


function logBootStep(step, details) {
  const entry = {
    atMs: Date.now(),
    step: String(step || 'unknown')
  };
  if (details && typeof details === 'object') {
    entry.details = details;
  }
  window.__gsBootTrace.push(entry);
  if (window.__gsBootTrace.length > 80) {
    window.__gsBootTrace.splice(0, window.__gsBootTrace.length - 80);
  }
  if (entry.details) {
    console.info('[boot]', entry.step, entry.details);
    return;
  }
  console.info('[boot]', entry.step);
}

function applyOverlayAssets() {
  const overlayNodes = {
    overlay_burn: ui.overlayBurn,
    overlay_def_mg: ui.overlayDefMg,
    overlay_def_n: ui.overlayDefN,
    overlay_mold_warning: ui.overlayMoldWarning,
    overlay_pest_mites: ui.overlayPestMites,
    overlay_pest_thrips: ui.overlayPestThrips
  };

  for (const [overlayId, node] of Object.entries(overlayNodes)) {
    if (!node) {
      continue;
    }

    const assetPath = OVERLAY_ASSETS[overlayId];
    if (!assetPath) {
      node.removeAttribute('src');
      node.classList.add('hidden');
      continue;
    }

    node.src = appPath(assetPath);
  }
}

async function initOrMigrateState(options = {}) {
  await restoreState(options);
  migrateState();
  ensureStateIntegrity(Date.now());
}

function repairRuntimeTextEncoding(value) {
  const api = window.GrowSimTextEncoding;
  return api && typeof api.deepRepairMojibake === 'function' ? api.deepRepairMojibake(value) : value;
}

async function loadCatalogs() {
  await loadEventCatalog();
  await loadActionsCatalog();
  await loadMissionsCatalog();
}

async function loadMissionsCatalog() {
  try {
    const response = await fetch('./data/missions.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const missions = repairRuntimeTextEncoding(await response.json());
    state.missions.catalog = missions;
    state.missions.byId = Object.fromEntries(missions.map(m => [m.id, m]));
  } catch (error) {
    console.warn('Missions konnte nicht geladen werden', error);
  }
}

function startLoopOnce() {
  if (authGateActive || loopRunning || tickHandle !== null) {
    return;
  }
  loopRunning = true;
  clearRuntimeHaltBanner();
  tickHandle = setInterval(tick, state.simulation.tickIntervalMs);
}

function stopLoop() {
  if (tickHandle !== null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
  loopRunning = false;
}

function startHeartbeatWatchdog() {
  if (heartbeatWatchdogHandle !== null) {
    return;
  }
  heartbeatWatchdogHandle = setInterval(() => {
    if (authGateActive || document.visibilityState !== 'visible') {
      return;
    }
    const last = Number(state.ui && state.ui.lastRenderRealMs) || 0;
    if (!loopRunning || !Number.isFinite(last) || (Date.now() - last) > 15000) {
      showRuntimeHaltBanner();
      stopLoop();
      startLoopOnce();
      renderAll();
      schedulePersistState();
    }
  }, 3000);
}

function runDevSelfTest() {
  if (!state.debug || !state.debug.enabled) {
    return { ok: false, reason: 'debug_disabled' };
  }

  const assertions = [];
  const beforeSim = getCanonicalSimulation(state).simTimeMs;

  tick();
  const afterTickSim = getCanonicalSimulation(state).simTimeMs;
  assertions.push({ name: 'tick_advances_sim_time', pass: afterTickSim > beforeSim });

  const actionResult = applyAction('watering_low_mist');
  assertions.push({ name: 'apply_action_path', pass: Boolean(actionResult && (actionResult.ok || actionResult.reason)) });

  activateEvent(Date.now());
  const active = getCanonicalEvents(state);
  if (active.machineState === 'activeEvent' && Array.isArray(active.activeOptions) && active.activeOptions.length) {
    onEventOptionClick(active.activeOptions[0].id);
  }

  const canonical = {
    simulation: Boolean(state.simulation && state.simulation),
    plant: Boolean(state.plant && state.plant),
    events: Boolean(state.events && state.events.scheduler && state.events),
    history: Boolean(state.history && Array.isArray(state.history.actions) && Array.isArray(state.history.events))
  };

  assertions.push({ name: 'canonical_shapes_present', pass: Object.values(canonical).every(Boolean) });

  return {
    ok: assertions.every((item) => item.pass),
    assertions,
    canonical
  };
}

function addLog(type, message, details) {
  const timestamp = Date.now();
  const payload = details || null;
  const entry = {
    id: `${timestamp}-${state.simulation.tickCount}-${state.history.systemLog.length}`,
    atMs: timestamp,
    t: timestamp,
    type,
    message,
    msg: message,
    details: payload,
    data: payload
  };

  state.history.systemLog.push(entry);
  if (state.history.systemLog.length > MAX_HISTORY_LOG) {
    state.history.systemLog = state.history.systemLog.slice(-MAX_HISTORY_LOG);
  }

  if (!state.history || typeof state.history !== 'object') {
    state.history = { actions: [], events: [], system: [] };
  }

  if (type === 'action') { state.history.actions = Array.isArray(state.history.actions) ? state.history.actions : [];
    state.history.actions.push({
      type: 'action',
      id: (payload && payload.id) || message,
      category: payload && payload.category,
      intensity: payload && payload.intensity,
      label: payload && payload.label,
      atSimTimeMs: state.simulation.simTimeMs,
      atRealTimeMs: timestamp,
      result: 'ok',
      reason: payload && payload.reason,
      deltaSummary: payload && payload.deltaSummary ? payload.deltaSummary : {},
      sideEffects: payload && payload.sideEffects ? payload.sideEffects : []
    });
  } else if (type === 'event' || type === 'event_shown' || type === 'choice') { state.history.events = Array.isArray(state.history.events) ? state.history.events : [];
  } else { state.history.system = Array.isArray(state.history.system) ? state.history.system : [];
    state.history.system.push({
      type: 'system',
      id: type,
      atSimTimeMs: state.simulation.simTimeMs,
      details: payload || { message }
    });
  }
}

function requestRescueAd() {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({ ok: true });
    }, 1200);
  });
}

function applyRescueEffects() {
  const before = {
    health: Number(state.status.health) || 0,
    stress: Number(state.status.stress) || 0,
    risk: Number(state.status.risk) || 0,
    growth: Number(state.status.growth) || 0,
    water: Number(state.status.water) || 0,
    nutrition: Number(state.status.nutrition) || 0,
    qualityScore: Number(state.plant.lifecycle.qualityScore) || 0
  };
  const wasDead = isPlantDead();
  const isCriticalAlive = !wasDead && before.health < 20;
  if (!wasDead && !isCriticalAlive) {
    return { ok: false };
  }

  if (wasDead) {
    state.status.health = 34;
    state.status.stress = before.stress - 22;
    state.status.risk = before.risk - 18;
    state.status.water = Math.max(before.water, 40);
    state.status.nutrition = Math.max(before.nutrition, 32);
    state.status.growth = Math.max(4, before.growth - 2);
    if (state.plant && state.plant.lifecycle && Number.isFinite(before.qualityScore)) {
      state.plant.lifecycle.qualityScore = round2(Math.max(0, before.qualityScore - 6));
    }
    state.plant.isDead = false;
    if (state.plant.phase === 'dead') {
      const safeIndex = clampInt(Number(state.plant.stageIndex) || 0, 0, Math.max(0, getStageTimeline().length - 1));
      state.plant.phase = getStageTimeline()[safeIndex].phase || 'seedling';
    }
    state.ui.deathOverlayOpen = false;
    state.ui.deathOverlayAcknowledged = true;
  } else {
    state.status.health = before.health + 15;
    state.status.stress = before.stress - 10;
    state.status.risk = before.risk - 10;
  }

  clampStatus();

  const after = {
    health: Number(state.status.health) || 0,
    stress: Number(state.status.stress) || 0,
    risk: Number(state.status.risk) || 0,
    growth: Number(state.status.growth) || 0,
    water: Number(state.status.water) || 0,
    nutrition: Number(state.status.nutrition) || 0,
    qualityScore: Number(state.plant.lifecycle.qualityScore) || 0
  };

  return {
    ok: true,
    wasDead,
    effectsApplied: {
      health: round2(after.health - before.health),
      stress: round2(after.stress - before.stress),
      risk: round2(after.risk - before.risk),
      growth: round2(after.growth - before.growth),
      water: round2(after.water - before.water),
      nutrition: round2(after.nutrition - before.nutrition),
      qualityScore: round2(after.qualityScore - before.qualityScore)
    }
  };
}

function updateLifecycleAverages(elapsedSimMs) {
  const observed = Math.max(0, Number(elapsedSimMs) || 0);
  if (observed <= 0) {
    return;
  }

  const totalObserved = state.plant.observedSimMs + observed;
  state.plant.averageHealth = ((state.plant.averageHealth * state.plant.observedSimMs) + (state.status.health * observed)) / totalObserved;
  state.plant.averageStress = ((state.plant.averageStress * state.plant.observedSimMs) + (state.status.stress * observed)) / totalObserved;
  state.plant.observedSimMs = totalObserved;
}

function updateQualityTier() {
  const avgHealth = state.plant.averageHealth;
  const avgStress = state.plant.averageStress;

  if (avgHealth >= 80 && avgStress <= 30 && state.status.stress <= 30) {
    state.plant.lifecycle.qualityTier = 'perfect';
    return;
  }

  if (avgHealth < 50 || avgStress >= 50 || state.status.stress >= 65) {
    state.plant.lifecycle.qualityTier = 'degraded';
    return;
  }

  state.plant.lifecycle.qualityTier = 'normal';
}

function simDayFloat() {
  const elapsed = Math.max(0, state.simulation.simTimeMs - state.simulation.simEpochMs);
  return clamp(elapsed / SIM_DAY_MS, 0, TOTAL_LIFECYCLE_SIM_DAYS);
}

function deterministicStageDelayDays(stageIndex) {
  if (stageIndex <= 0) {
    return 0;
  }
  const u = deterministicUnitFloat(`stage_delay:${stageIndex}`);
  return round2((u - 0.5) * 0.6);
}

function stageAssetKeyForIndex(stageIndex) {
  return `stage_${String(stageIndex + 1).padStart(2, '0')}`;
}

function normalizeStageKey(rawStageKey) {
  const raw = String(rawStageKey || '').trim();
  const match = raw.match(/^stage_(\d{1,2})$/);
  if (match) {
    const index = clampInt(Number(match[1]), 1, STAGE_DEFS.length);
    return `stage_${String(index).padStart(2, '0')}`;
  }

  return 'stage_01';
}

function runEventStateMachine(nowMs) {
  return callCanonicalEventsRuntime('runEventStateMachine', nowMs);
}

function activateEvent(nowMs) {
  return callCanonicalEventsRuntime('activateEvent', nowMs);
}


function eligibleEventsForNow(nowMs) {
  return callCanonicalEventsRuntime('eligibleEventsForNow', nowMs);
}

function fallbackEventsForCurrentPhase(nowMs) {
  const phase = String(state.plant.phase || '');
  const fallback = state.events.catalog.filter((eventDef) => {
    if (!eventDef || !eventDef.id || !isEventPhaseAllowed(eventDef)) {
      return false;
    }
    if (!evaluateEventConstraints(eventDef)) {
      return false;
    }
    const cooldowns = state.events.scheduler.eventCooldowns || {};
    const blockedUntil = Number(cooldowns[eventDef.id] || 0);
    return blockedUntil <= nowMs;
  });

  if (fallback.length) {
    addLog('event_roll', 'Fallback-Ereignispool genutzt (Phase-only)', {
      phase,
      candidateCount: fallback.length,
      at: nowMs
    });
  }

  return fallback.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function isEventEligible(eventDef, cooldowns, nowMs) {
  return callCanonicalEventsRuntime('isEventEligible', eventDef, cooldowns, nowMs);
}

function isEventPhaseAllowed(eventDef) {
  const allowedPhases = Array.isArray(eventDef.allowedPhases) ? eventDef.allowedPhases.map((phase) => String(phase)) : [];

  if (!allowedPhases.length) {
    return true;
  }

  return allowedPhases.includes(String(state.plant.phase || ''));
}

function buildEventConstraintSnapshot() {
  const stageIndexOneBased = clampInt(Number(state.plant.stageIndex || 0) + 1, 1, STAGE_DEFS.length);
  const stageProgress = clamp(Number(state.plant.stageProgress || 0), 0, 1);
  const simDay = Math.max(0, Math.floor(Number(state.simulation.simDay || simDayFloat() || 0)));
  const environment = deriveEnvironmentReadout();
  const roots = deriveRootZoneReadout(environment);
  const airflowScore = Number.isFinite(Number(environment.airflowScore)) ? clamp(Number(environment.airflowScore), 0, 100) : (environment.airflowLabel === 'Good' ? 80 : (environment.airflowLabel === 'Mittel' ? 55 : 30));

  const plantSize = clamp(((stageIndexOneBased - 1) * 8.5) + (stageProgress * 8.5), 0, 100);
  const rootMass = clamp(((stageIndexOneBased - 1) * 8.2) + (stageProgress * 7.8), 0, 100);

  return {
    simDay,
    stageIndexOneBased,
    plantSize,
    rootMass,
    environmentState: {
      temperatureC: environment.temperatureC,
      humidityPercent: environment.humidityPercent,
      vpdKpa: environment.vpdKpa,
      airflowScore
    },
    rootZone: {
      ph: Number(roots.ph),
      ec: Number(String(roots.ec).replace(/\s*mS$/i, '')),
      oxygenPercent: Number(String(roots.oxygen).replace('%', '')),
      healthPercent: Number(String(roots.rootHealth).replace('%', ''))
    }
  };
}

function evaluateEventConstraints(eventDef) {
  const constraints = eventDef && eventDef.constraints && typeof eventDef.constraints === 'object' ? eventDef.constraints : null;

  if (!constraints) {
    return true;
  }

  const snapshot = buildEventConstraintSnapshot();

  const minStage = Number(constraints.minStage);
  const maxStage = Number(constraints.maxStage);
  const minDay = Number(constraints.minDay);
  const maxDay = Number(constraints.maxDay);
  const minPlantSize = Number(constraints.minPlantSize);
  const minRootMass = Number(constraints.minRootMass);

  if (constraints.minStage !== null && constraints.minStage !== undefined && Number.isFinite(minStage) && snapshot.stageIndexOneBased < minStage) {
    return false;
  }
  if (constraints.maxStage !== null && constraints.maxStage !== undefined && Number.isFinite(maxStage) && snapshot.stageIndexOneBased > maxStage) {
    return false;
  }
  if (constraints.minDay !== null && constraints.minDay !== undefined && Number.isFinite(minDay) && snapshot.simDay < minDay) {
    return false;
  }
  if (constraints.maxDay !== null && constraints.maxDay !== undefined && Number.isFinite(maxDay) && snapshot.simDay > maxDay) {
    return false;
  }
  if (constraints.minPlantSize !== null && constraints.minPlantSize !== undefined && Number.isFinite(minPlantSize) && snapshot.plantSize < minPlantSize) {
    return false;
  }
  if (constraints.minRootMass !== null && constraints.minRootMass !== undefined && Number.isFinite(minRootMass) && snapshot.rootMass < minRootMass) {
    return false;
  }

  const env = constraints.environmentState && typeof constraints.environmentState === 'object'
    ? constraints.environmentState
    : null;
  if (env) {
    const minTemperatureC = Number(env.minTemperatureC);
    const maxTemperatureC = Number(env.maxTemperatureC);
    const minHumidityPercent = Number(env.minHumidityPercent);
    const maxHumidityPercent = Number(env.maxHumidityPercent);
    const minVpdKpa = Number(env.minVpdKpa);
    const maxVpdKpa = Number(env.maxVpdKpa);
    const minAirflowScore = Number(env.minAirflowScore);

    if (env.minTemperatureC !== null && env.minTemperatureC !== undefined && Number.isFinite(minTemperatureC) && snapshot.environmentState.temperatureC < minTemperatureC) return false;
    if (env.maxTemperatureC !== null && env.maxTemperatureC !== undefined && Number.isFinite(maxTemperatureC) && snapshot.environmentState.temperatureC > maxTemperatureC) return false;
    if (env.minHumidityPercent !== null && env.minHumidityPercent !== undefined && Number.isFinite(minHumidityPercent) && snapshot.environmentState.humidityPercent < minHumidityPercent) return false;
    if (env.maxHumidityPercent !== null && env.maxHumidityPercent !== undefined && Number.isFinite(maxHumidityPercent) && snapshot.environmentState.humidityPercent > maxHumidityPercent) return false;
    if (env.minVpdKpa !== null && env.minVpdKpa !== undefined && Number.isFinite(minVpdKpa) && snapshot.environmentState.vpdKpa < minVpdKpa) return false;
    if (env.maxVpdKpa !== null && env.maxVpdKpa !== undefined && Number.isFinite(maxVpdKpa) && snapshot.environmentState.vpdKpa > maxVpdKpa) return false;
    if (env.minAirflowScore !== null && env.minAirflowScore !== undefined && Number.isFinite(minAirflowScore) && snapshot.environmentState.airflowScore < minAirflowScore) return false;
  }

  const root = constraints.rootZone && typeof constraints.rootZone === 'object'
    ? constraints.rootZone
    : null;
  if (root) {
    const minPh = Number(root.minPh);
    const maxPh = Number(root.maxPh);
    const minEc = Number(root.minEc);
    const maxEc = Number(root.maxEc);
    const minOxygenPercent = Number(root.minOxygenPercent);

    if (root.minPh !== null && root.minPh !== undefined && Number.isFinite(minPh) && snapshot.rootZone.ph < minPh) return false;
    if (root.maxPh !== null && root.maxPh !== undefined && Number.isFinite(maxPh) && snapshot.rootZone.ph > maxPh) return false;
    if (root.minEc !== null && root.minEc !== undefined && Number.isFinite(minEc) && snapshot.rootZone.ec < minEc) return false;
    if (root.maxEc !== null && root.maxEc !== undefined && Number.isFinite(maxEc) && snapshot.rootZone.ec > maxEc) return false;
    if (root.minOxygenPercent !== null && root.minOxygenPercent !== undefined && Number.isFinite(minOxygenPercent) && snapshot.rootZone.oxygenPercent < minOxygenPercent) return false;
  }

  const category = String(eventDef.category || 'generic').toLowerCase();
  const stressNow = clamp(Number(state.status.stress || 0), 0, 100);
  const riskNow = clamp(Number(state.status.risk || 0), 0, 100);
  const healthNow = clamp(Number(state.status.health || 0), 0, 100);

  if (category === 'positive' && (stressNow > 48 || riskNow > 45 || healthNow < 55)) {
    return false;
  }

  if (snapshot.simDay <= 10 && (category === 'pest' || category === 'disease') && riskNow < 65) {
    return false;
  }

  return true;
}

function evaluateEventTriggers(triggers) {
  return callCanonicalEventsRuntime('evaluateEventTriggers', triggers);
}

function evaluateSetupConstraints(setupRule) {
  return callCanonicalEventsRuntime('evaluateSetupConstraints', setupRule);
}

function evaluateTriggerCondition(condition) {
  return callCanonicalEventsRuntime('evaluateTriggerCondition', condition);
}

function resolveTriggerField(fieldPath) {
  return callCanonicalEventsRuntime('resolveTriggerField', fieldPath);
}

function getEventFoundationApis() {
  return {
    plantState: (typeof window !== 'undefined' && window.GrowSimPlantState) ? window.GrowSimPlantState : null,
    flags: (typeof window !== 'undefined' && window.GrowSimEventFlags) ? window.GrowSimEventFlags : null,
    memory: (typeof window !== 'undefined' && window.GrowSimEventMemory) ? window.GrowSimEventMemory : null,
    resolver: (typeof window !== 'undefined' && window.GrowSimEventResolver) ? window.GrowSimEventResolver : null
  };
}

function resolveFoundationCandidateEvent() {
  const api = getEventFoundationApis();
  if (!api.plantState || !api.flags || !api.memory || !api.resolver) {
    return null;
  }

  const normalizedState = api.plantState.buildNormalizedPlantState(state);
  const activeFlags = api.flags.getActiveFlags(state.events);
  const memoryFacade = {
    getLastDecision: () => api.memory.getLastDecision(state.events),
    getLastEvents: (count) => api.memory.getLastEvents(state.events, count),
    getPendingChain: (chainId) => api.memory.getPendingChain(state.events, chainId),
    getPendingChains: () => api.memory.getPendingChains(state.events)
  };

  const selectionRandom = () => deterministicUnitFloat(`foundation_resolver:${state.simulation.tickCount}:${state.events.history.length}`);

  return api.resolver.resolveNextEvent({
    state: normalizedState,
    flags: activeFlags,
    memory: memoryFacade,
    catalog: state.events.catalog,
    random: selectionRandom
  });
}

function applyFoundationFollowUps(choice, eventId) {
  const api = getEventFoundationApis();
  if (!api.flags || !api.memory) {
    return;
  }

  api.memory.addDecision(state.events, eventId, choice.id, {
    followUps: Array.isArray(choice.followUps) ? choice.followUps.slice() : []
  }); const followUps = Array.isArray(choice.followUps) ? choice.followUps : [];
  for (const followUp of followUps) {
    const token = String(followUp || '');
    if (token.startsWith('set_flag:')) {
      const flagId = token.slice('set_flag:'.length);
      api.flags.setFlag(state.events, flagId, true);
      if (flagId === 'root_stress_pending') {
        api.memory.setPendingChain(state.events, 'root_stress_followup', {
          targetEventId: 'root_stress_followup',
          sourceEventId: eventId,
          sourceOptionId: choice.id,
          sourceFlagId: 'root_stress_pending',
          createdAtRealTimeMs: Date.now(),
          meta: { createdBy: 'flag_bridge' }
        });
      }
      continue;
    }
    if (token.startsWith('clear_flag:')) {
      const flagId = token.slice('clear_flag:'.length);
      api.flags.clearFlag(state.events, flagId);
      if (flagId === 'root_stress_pending') {
        api.memory.clearPendingChain(state.events, 'root_stress_followup');
      }
      continue;
    }
    if (token.startsWith('set_chain:')) {
      const chainId = token.slice('set_chain:'.length);
      api.memory.setPendingChain(state.events, chainId, {
        targetEventId: chainId,
        sourceEventId: eventId,
        sourceOptionId: choice.id,
        createdAtRealTimeMs: Date.now(),
        meta: { createdBy: 'followup_token' }
      });
      continue;
    }
    if (token.startsWith('clear_chain:')) {
      const chainId = token.slice('clear_chain:'.length);
      api.memory.clearPendingChain(state.events, chainId);
    }
  }
}

function onEventOptionClick(optionId) {
  return callCanonicalEventsRuntime('onEventOptionClick', optionId);
}

function onEventOptionClickCore(optionId) {
  return callCanonicalEventsRuntime('onEventOptionClick', optionId);
}

function applyChoiceEffects(effects) {
  for (const [metric, delta] of Object.entries(effects)) {
    if (!Number.isFinite(delta)) {
      continue;
    }

    if (metric === 'growth') {
      applyGrowthPercentDelta(delta);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(state.status, metric)) {
      state.status[metric] += delta;
    }
  }

  clampStatus();
}

function applyGrowthPercentDelta(delta) {
  const current = computeGrowthPercent();
  const target = clamp(current + delta, 0, 100);
  setGrowthFromPercent(target);
  state.status.growth = round2(computeGrowthPercent());
}

function setGrowthFromPercent(percent) {
  if (state.plant.phase === 'dead') {
    return;
  }

  const targetProgress = clamp(Number(percent) / 100, 0, 1);
  const simEpochMs = Number(state.simulation.simEpochMs || alignToSimStartHour(Date.now(), SIM_START_HOUR));
  const baseElapsedPlantMs = Math.max(0, (Number(state.simulation.simTimeMs) || simEpochMs) - simEpochMs);
  const targetElapsedPlantMs = targetProgress * TOTAL_LIFECYCLE_SIM_MS;
  state.plant.progressOffsetSimMs = clamp(
    targetElapsedPlantMs - baseElapsedPlantMs,
    -baseElapsedPlantMs,
    TOTAL_LIFECYCLE_SIM_MS - baseElapsedPlantMs
  );

  const stage = getCurrentStage(getPlantTimeFromElapsed().simDay);
  state.plant.stageIndex = stage.stageIndex;
  state.plant.phase = stage.current.phase;
  state.plant.stageKey = stageAssetKeyForIndex(stage.stageIndex);
  state.plant.lastValidStageKey = state.plant.stageKey;
  state.plant.stageProgress = stage.progressInPhase;
  state.status.growth = round2(computeGrowthPercent());
}

function enterEventCooldown(nowMs) {
  return callCanonicalEventsRuntime('enterEventCooldown', nowMs);
}

function deterministicRoll() {
  return callCanonicalEventsRuntime('deterministicRoll');
}

function computeEnvironmentEventPressure() {
  const env = deriveEnvironmentReadout();
  const root = deriveRootZoneReadout(env);

  const tempPressure = clamp(Math.abs(Number(env.temperatureC) - 25) / 10, 0, 1);
  const humidityPressure = clamp(Math.abs(Number(env.humidityPercent) - 58) / 28, 0, 1);
  const vpdPressure = clamp(Math.abs(Number(env.vpdKpa) - 1.15) / 1.0, 0, 1);
  const airflowScore = Number.isFinite(Number(env.airflowScore)) ? clamp(Number(env.airflowScore), 0, 100) : (env.airflowLabel === 'Good' ? 80 : (env.airflowLabel === 'Mittel' ? 55 : 30));
  const airflowPressure = clamp((60 - airflowScore) / 60, 0, 1);

  const ph = Number(root.ph);
  const ec = Number(String(root.ec).replace(/\s*mS$/i, ''));
  const oxygen = Number(String(root.oxygen).replace('%', ''));

  const phPressure = clamp(Math.abs(ph - 6.0) / 0.9, 0, 1);
  const ecPressure = clamp(Math.abs(ec - 1.45) / 1.0, 0, 1);
  const oxygenPressure = clamp((60 - oxygen) / 60, 0, 1);

  return clamp(
    (tempPressure * 0.18)
    + (humidityPressure * 0.14)
    + (vpdPressure * 0.2)
    + (airflowPressure * 0.1)
    + (phPressure * 0.14)
    + (ecPressure * 0.14)
    + (oxygenPressure * 0.1),
    0,
    1
  );
}

function eventThreshold() {
  return callCanonicalEventsRuntime('eventThreshold');
}

function shouldTriggerEvent(roll) {
  return callCanonicalEventsRuntime('shouldTriggerEvent', roll);
}

function deterministicEventDelayMs(nowMs) {
  return callCanonicalEventsRuntime('deterministicEventDelayMs', nowMs);
}

function cooldownMs() {
  return callCanonicalEventsRuntime('cooldownMs');
}

function onCareApply() {
  const controller = getUiController();
  const result = controller && typeof controller.handleAction === 'function' ? controller.handleAction('watering_medium_deep') : applyAction('watering_medium_deep');
  if (!result.ok) {
    addLog('action', `Aktion blockiert: ${result.reason}`, { actionId: 'watering_medium_deep' });
  }

  closeSheet();
  renderAll();
  schedulePersistState(true);
}

function executeCareAction(actionId) {
  const controller = getUiController();
  if (controller && typeof controller.handleAction === 'function') {
    return controller.handleAction(actionId);
  }
  return applyAction(actionId);
}

function applyAction(actionId) {
  if (isPlantDead()) {
    const nowMs = Date.now();
    state.actions.lastResult = { ok: false, reason: 'dead_run_ended', actionId, atRealTimeMs: nowMs };
    return { ok: false, reason: 'dead_run_ended' };
  }

  const action = state.actions.byId[actionId];
  if (!action) {
    state.actions.lastResult = { ok: false, reason: `unknown_action:${actionId}`, actionId, atRealTimeMs: Date.now() };
    return { ok: false, reason: `unknown_action:${actionId}` };
  }

  const nowMs = Date.now();
  const cooldownUntil = Number(state.actions.cooldowns[action.id] || 0);
  if (cooldownUntil > nowMs) {
    const result = { ok: false, reason: `cooldown_active:${Math.ceil((cooldownUntil - nowMs) / 1000)}s` };
    state.actions.lastResult = { ok: false, reason: result.reason, actionId: action.id, atRealTimeMs: nowMs };
    return result;
  }

  const triggerCheck = validateActionTrigger(action);
  if (!triggerCheck.ok) {
    state.actions.lastResult = { ok: false, reason: triggerCheck.reason, actionId: action.id, atRealTimeMs: nowMs };
    return triggerCheck;
  }

  const preCheck = analyzeActionPrerequisites(action);
  if (!preCheck.ok) {
    state.actions.lastResult = { ok: false, reason: preCheck.reason, actionId: action.id, atRealTimeMs: nowMs };
    return preCheck;
  }
  const executionProfile = buildActionExecutionProfile(action, preCheck);

  const before = snapshotStatus();
  const beforeSimTimeMs = Number(state.simulation.simTimeMs) || 0;
  const beforeLastTickRealTimeMs = Number(state.simulation.lastTickRealTimeMs) || 0;

  applyActionImmediateEffects(action, executionProfile);
  scheduleActionOverTimeEffect(action, nowMs, executionProfile);

  const triggeredSideEffects = [];
  for (const side of action.sideEffects) {
    if (!side || typeof side !== 'object') {
      continue;
    }
    const conditionMet = evaluateCondition(side.when || 'true');
    if (!conditionMet) {
      continue;
    }
    const chance = clamp(Number(side.chance) * (Number(executionProfile.sideEffectChanceMultiplier) || 1), 0, 0.92);
    const roll = deterministicUnitFloat(`action_side:${action.id}:${side.id || 'side'}:${state.simulation.tickCount}:${Math.floor(state.simulation.simTimeMs / 60000)}`);
    if (roll <= chance) {
      applyEffectsObject(scaleActionEffectsObject(side.deltas || {}, executionProfile, { phase: 'sideEffect' }));
      triggeredSideEffects.push(side.id || 'side_effect');
    }
  }

  const cooldownMs = Math.round((Number(action.cooldownRealMinutes) || 0) * 60 * 1000);
  state.actions.cooldowns[action.id] = nowMs + cooldownMs;

  const after = snapshotStatus();
  const deltaSummary = summarizeDelta(before, after);

  addLog('action', `Aktion: ${action.label}`, {
    type: 'action',
    id: action.id,
    category: action.category,
    intensity: action.intensity,
    label: action.label,
    simTime: state.simulation.simTimeMs,
    realTime: nowMs,
    softEligibility: Boolean(preCheck.soft),
    effectProfile: {
      benefitMultiplier: round2(executionProfile.benefitMultiplier),
      costMultiplier: round2(executionProfile.costMultiplier),
      sideEffectChanceMultiplier: round2(executionProfile.sideEffectChanceMultiplier)
    },
    sideEffects: triggeredSideEffects,
    deltaSummary
  });

  clampStatus();
  updateVisibleOverlays();
  syncCanonicalStateShape();
  const afterSimTimeMs = Number(state.simulation.simTimeMs) || 0;
  const afterLastTickRealTimeMs = Number(state.simulation.lastTickRealTimeMs) || 0;
  const simDeltaMs = Math.max(0, afterSimTimeMs - beforeSimTimeMs);
  const realTickDeltaMs = Math.max(0, afterLastTickRealTimeMs - beforeLastTickRealTimeMs);
  if (
    simDeltaMs > CARE_ACTION_TIME_DIAGNOSTIC_THRESHOLD_MS
    || realTickDeltaMs > CARE_ACTION_TIME_DIAGNOSTIC_THRESHOLD_MS
  ) {
    reportCareActionClockJumpOnce(action, {
      beforeSimTimeMs,
      afterSimTimeMs,
      simDeltaMs,
      beforeLastTickRealTimeMs,
      afterLastTickRealTimeMs,
      realTickDeltaMs
    });
  }
  if (typeof window.checkMissions === 'function') {
    window.checkMissions('action', {
      actionId: action.id,
      category: action.category,
      deltaSummary,
      sideEffects: triggeredSideEffects
    });
  }
  state.actions.lastResult = { ok: true, reason: preCheck.soft ? 'ok_soft' : 'ok', actionId: action.id, atRealTimeMs: nowMs };
  schedulePersistState(true);

  return {
    ok: true,
    id: action.id,
    deltaSummary,
    sideEffects: triggeredSideEffects,
    soft: Boolean(preCheck.soft),
    guidanceHint: buildActionGuidanceFeedback(action, executionProfile)
  };
}

function buildActionGuidanceFeedback(action, executionProfile) {
  const category = String(action && action.category || '').toLowerCase();
  const benefitMultiplier = Number(executionProfile && executionProfile.benefitMultiplier) || 1;
  const costMultiplier = Number(executionProfile && executionProfile.costMultiplier) || 1;

  if (category === 'fertilizing' && benefitMultiplier < 0.84) {
    return 'Die Aufnahme bleibt im aktuellen Zustand noch etwas begrenzt.';
  }
  if (category === 'watering' && costMultiplier > 1.16) {
    return 'Die Wurzelzone reagiert im aktuellen Zustand empfindlicher auf zusätzliche Feuchte.';
  }
  if (category === 'environment' && benefitMultiplier < 0.84) {
    return 'Der Effekt greift erst sauber, wenn die übrigen Druckfaktoren etwas ruhiger werden.';
  }
  return '';
}

function validateActionTrigger(action) {
  const trigger = action.trigger || {};
  if (trigger.timeWindow === 'daytime_only' && !state.simulation.isDaytime) {
    return { ok: false, reason: 'outside_time_window:daytime_only' };
  }

  if (Number.isFinite(trigger.minStageIndex) && state.plant.stageIndex < Number(trigger.minStageIndex)) {
    return { ok: false, reason: `stage_too_low:${state.plant.stageIndex}<${trigger.minStageIndex}` };
  }

  return { ok: true };
}

function validateActionPrerequisites(action) {
  const pre = action.prerequisites || {}; const min = pre.min && typeof pre.min === 'object' ? pre.min : {}; const max = pre.max && typeof pre.max === 'object' ? pre.max : {};

  for (const [key, value] of Object.entries(min)) {
    if (!Number.isFinite(Number(value))) {
      continue;
    } const current = key in state.status ? state.status[key] : null;
    if (current !== null && current < Number(value)) {
      return { ok: false, reason: `prereq_min_failed:${key}` };
    }
  }

  for (const [key, value] of Object.entries(max)) {
    if (!Number.isFinite(Number(value))) {
      continue;
    } const current = key in state.status ? state.status[key] : null;
    if (current !== null && current > Number(value)) {
      return { ok: false, reason: `prereq_max_failed:${key}` };
    }
  }

  return { ok: true };
}

function getActionSoftPolicy(action) {
  const category = String(action && action.category || '').toLowerCase();
  const intensity = String(action && action.intensity || '').toLowerCase();
  const id = String(action && action.id || '').toLowerCase();

  if (category === 'fertilizing' && (intensity === 'low' || intensity === 'medium')) {
    return {
      enabled: true,
      minMetrics: new Set(['water', 'health']),
      maxMetrics: new Set(['nutrition', 'stress', 'risk']),
      note: 'Geht noch, aber die Aufnahme ist heute ineffizienter und riskanter.'
    };
  }

  if (category === 'environment' && (id === 'environment_low_airflow' || id === 'environment_medium_climate')) {
    return {
      enabled: true,
      minMetrics: new Set(['risk', 'health']),
      maxMetrics: new Set(['risk']),
      note: 'Geht noch, aber der Nutzen ist im aktuellen Zustand begrenzt.'
    };
  }

  if (id === 'watering_medium_vitamin') {
    return {
      enabled: true,
      minMetrics: new Set(['water']),
      maxMetrics: new Set(['risk', 'stress']),
      note: 'Geht noch, aber die Nährlösung greift heute nur gedämpft.'
    };
  }

  return {
    enabled: false,
    minMetrics: new Set(),
    maxMetrics: new Set(),
    note: ''
  };
}

function analyzeActionPrerequisites(action) {
  const pre = action && action.prerequisites && typeof action.prerequisites === 'object' ? action.prerequisites : {};
  const min = pre.min && typeof pre.min === 'object' ? pre.min : {};
  const max = pre.max && typeof pre.max === 'object' ? pre.max : {};
  const policy = getActionSoftPolicy(action);
  const failures = [];

  for (const [key, value] of Object.entries(min)) {
    if (!Number.isFinite(Number(value))) {
      continue;
    }
    const current = key in state.status ? state.status[key] : null;
    if (current !== null && current < Number(value)) {
      failures.push({ type: 'min', key, threshold: Number(value), current: Number(current) });
    }
  }

  for (const [key, value] of Object.entries(max)) {
    if (!Number.isFinite(Number(value))) {
      continue;
    }
    const current = key in state.status ? state.status[key] : null;
    if (current !== null && current > Number(value)) {
      failures.push({ type: 'max', key, threshold: Number(value), current: Number(current) });
    }
  }

  if (!failures.length) {
    return { ok: true, soft: false, failures: [], note: '' };
  }

  const hardFailure = failures.find((failure) => {
    if (!policy.enabled) {
      return true;
    }
    if (failure.type === 'min') {
      return !policy.minMetrics.has(failure.key);
    }
    return !policy.maxMetrics.has(failure.key);
  });

  if (hardFailure) {
    return {
      ok: false,
      reason: `prereq_${hardFailure.type}_failed:${hardFailure.key}`,
      soft: false,
      failures
    };
  }

  return {
    ok: true,
    soft: true,
    reason: 'soft_prereq_override',
    failures,
    note: policy.note
  };
}

function buildActionExecutionProfile(action, availability = { ok: true, soft: false, failures: [] }) {
  const category = String(action && action.category || '').toLowerCase();
  const intensity = String(action && action.intensity || '').toLowerCase();
  const id = String(action && action.id || '').toLowerCase();
  const water = Number(state.status.water || 0);
  const nutrition = Number(state.status.nutrition || 0);
  const health = Number(state.status.health || 0);
  const stress = Number(state.status.stress || 0);
  const risk = Number(state.status.risk || 0);

  let benefitMultiplier = 1;
  let costMultiplier = 1;
  let sideEffectChanceMultiplier = 1;

  if (category === 'fertilizing') {
    const waterSupport = clamp((water - 18) / 34, 0.35, 1.02);
    const nutritionHeadroom = clamp((88 - nutrition) / 30, 0.3, 1.04);
    const calmness = clamp(1 - clamp((stress - 40) / 36, 0, 0.7), 0.45, 1.02);
    const safety = clamp(1 - clamp((risk - 42) / 34, 0, 0.72), 0.42, 1.02);
    const vitality = clamp((health - 10) / 55, 0.48, 1.04);
    benefitMultiplier = clamp(
      (waterSupport * 0.3)
      + (nutritionHeadroom * 0.28)
      + (calmness * 0.18)
      + (safety * 0.12)
      + (vitality * 0.12),
      0.5,
      intensity === 'high' ? 1.06 : 1.12
    );
    costMultiplier = clamp(
      0.9
      + ((1 - benefitMultiplier) * 0.95)
      + clamp((risk - 72) / 24, 0, 0.35)
      + clamp((stress - 58) / 26, 0, 0.3),
      0.92,
      intensity === 'high' ? 1.85 : 1.55
    );
    sideEffectChanceMultiplier = clamp(
      0.92
      + ((costMultiplier - 1) * 0.95)
      + (availability.soft ? 0.12 : 0),
      0.85,
      intensity === 'high' ? 1.9 : 1.55
    );

    if (intensity === 'low') {
      benefitMultiplier *= 0.88;
      costMultiplier *= 0.9;
      sideEffectChanceMultiplier *= 0.82;
    } else if (intensity === 'high') {
      const pushReadiness = clamp(
        ((water - 52) / 22) * 0.35
        + ((health - 58) / 24) * 0.35
        + ((64 - stress) / 28) * 0.18
        + ((62 - risk) / 30) * 0.12,
        0.55,
        1.14
      );
      benefitMultiplier *= pushReadiness;
      costMultiplier += clamp((1.02 - pushReadiness) * 0.9, 0, 0.45);
      sideEffectChanceMultiplier += clamp((1 - pushReadiness) * 0.75, 0, 0.4);
    }

    if (id === 'fertilizing_medium_calmag') {
      const recoveryNeed = clamp(
        (clamp((stress - 34) / 36, 0, 1) * 0.55)
        + (clamp((risk - 32) / 40, 0, 1) * 0.45),
        0,
        1
      );
      benefitMultiplier = clamp(benefitMultiplier + (recoveryNeed * 0.12), 0.5, 1.12);
      costMultiplier = clamp(costMultiplier - (recoveryNeed * 0.08), 0.9, 1.65);
    }
  } else if (category === 'environment') {
    const problemNeed = clamp(((risk - 18) / 52) * 0.7 + ((stress - 20) / 60) * 0.3, 0.15, 1.05);
    benefitMultiplier = clamp(0.55 + (problemNeed * 0.55), 0.45, intensity === 'high' ? 1.12 : 1.08);
    costMultiplier = clamp(1.02 + clamp((stress - 62) / 28, 0, 0.35), 0.95, 1.4);
    sideEffectChanceMultiplier = clamp(0.9 + ((costMultiplier - 1) * 0.65), 0.85, 1.35);

    if (intensity === 'low') {
      benefitMultiplier *= 0.88;
      costMultiplier *= 0.9;
      sideEffectChanceMultiplier *= 0.8;
    }

    if (id === 'environment_high_co2') {
      const optimizationReadiness = clamp(
        ((water - 62) / 18) * 0.28
        + ((nutrition - 60) / 18) * 0.28
        + ((health - 72) / 16) * 0.22
        + ((28 - stress) / 18) * 0.12
        + ((24 - risk) / 18) * 0.1,
        0.48,
        1.12
      );
      benefitMultiplier *= optimizationReadiness;
      costMultiplier += clamp((1.04 - optimizationReadiness) * 0.95, 0, 0.5);
      sideEffectChanceMultiplier += clamp((1 - optimizationReadiness) * 0.7, 0, 0.38);
    } else if (id === 'environment_high_reset') {
      const serviceNeed = clamp(
        (clamp((risk - 50) / 28, 0, 1) * 0.65)
        + (clamp((stress - 44) / 30, 0, 1) * 0.35),
        0,
        1.05
      );
      benefitMultiplier = clamp(benefitMultiplier + (serviceNeed * 0.14), 0.45, 1.14);
      costMultiplier = clamp(costMultiplier + 0.08 + (serviceNeed * 0.1), 0.95, 1.55);
      sideEffectChanceMultiplier = clamp(sideEffectChanceMultiplier + 0.08, 0.85, 1.55);
    }
  } else if (category === 'watering') {
    const thirstNeed = clamp((68 - water) / 42, 0.25, 1.08);
    const calmness = clamp(1 - clamp((stress - 54) / 32, 0, 0.6), 0.52, 1.02);
    const safety = clamp(1 - clamp((risk - 62) / 26, 0, 0.58), 0.55, 1.02);
    benefitMultiplier = clamp((thirstNeed * 0.6) + (calmness * 0.2) + (safety * 0.2), 0.58, 1.08);
    costMultiplier = clamp(
      0.94
      + clamp((water - 76) / 18, 0, 0.45)
      + clamp((risk - 70) / 20, 0, 0.25),
      0.92,
      intensity === 'high' ? 1.7 : 1.35
    );
    sideEffectChanceMultiplier = clamp(0.92 + ((costMultiplier - 1) * 0.8), 0.85, intensity === 'high' ? 1.85 : 1.45);

    if (intensity === 'low') {
      benefitMultiplier *= 0.9;
      costMultiplier *= 0.88;
      sideEffectChanceMultiplier *= 0.78;
    }

    if (id === 'watering_medium_vitamin') {
      const uptakeReadiness = clamp(
        ((water - 28) / 26) * 0.4
        + ((78 - nutrition) / 28) * 0.25
        + ((64 - stress) / 28) * 0.2
        + ((68 - risk) / 26) * 0.15,
        0.42,
        1.08
      );
      benefitMultiplier *= uptakeReadiness;
      costMultiplier += clamp((1 - uptakeReadiness) * 0.55, 0, 0.28);
      sideEffectChanceMultiplier += clamp((1 - uptakeReadiness) * 0.45, 0, 0.24);
    }

    if (id === 'watering_high_flush') {
      const flushNeed = clamp((nutrition - 56) / 26, 0.3, 1.06);
      benefitMultiplier = clamp((benefitMultiplier * 0.45) + (flushNeed * 0.55), 0.45, 1.05);
      costMultiplier = clamp(costMultiplier + clamp((58 - nutrition) / 18, 0, 0.4), 1, 1.85);
      sideEffectChanceMultiplier = clamp(sideEffectChanceMultiplier + clamp((58 - nutrition) / 18, 0, 0.3), 0.9, 1.9);
    }
  }

  if (availability.soft) {
    benefitMultiplier *= 0.9;
    costMultiplier = clamp(costMultiplier + 0.08, 0.92, 1.95);
    sideEffectChanceMultiplier = clamp(sideEffectChanceMultiplier + 0.08, 0.85, 1.95);
  }

  return {
    benefitMultiplier: clamp(benefitMultiplier, 0.45, 1.15),
    overTimeBenefitMultiplier: clamp(benefitMultiplier * 0.98, 0.42, 1.1),
    costMultiplier: clamp(costMultiplier, 0.9, 1.95),
    overTimeCostMultiplier: clamp((costMultiplier * 0.92), 0.88, 1.8),
    sideEffectChanceMultiplier: clamp(sideEffectChanceMultiplier, 0.85, 1.95)
  };
}

function scaleActionEffectsObject(effects, profile, options = {}) {
  const scaled = {};
  const benefitMultiplier = Number(profile && (options.phase === 'overTime' ? profile.overTimeBenefitMultiplier : profile.benefitMultiplier)) || 1;
  const costMultiplier = Number(profile && (options.phase === 'overTime' ? profile.overTimeCostMultiplier : profile.costMultiplier)) || 1;

  for (const [metric, rawDelta] of Object.entries(effects || {})) {
    const delta = Number(rawDelta);
    if (!Number.isFinite(delta)) {
      continue;
    }
    const positiveMetrics = new Set(['water', 'nutrition', 'health', 'growth']);
    const benefit = (positiveMetrics.has(metric) && delta > 0) || ((metric === 'stress' || metric === 'risk') && delta < 0);
    const cost = (positiveMetrics.has(metric) && delta < 0) || ((metric === 'stress' || metric === 'risk') && delta > 0);
    const multiplier = benefit ? benefitMultiplier : (cost ? costMultiplier : 1);
    scaled[metric] = round2(delta * multiplier);
  }

  return scaled;
}

function getActionAvailability(action) {
  if (!action || typeof action !== 'object') {
    return { ok: false, reason: 'unknown_action' };
  }
  const triggerCheck = validateActionTrigger(action);
  if (!triggerCheck.ok) {
    return triggerCheck;
  }
  return analyzeActionPrerequisites(action);
}

function evaluateActionPriorityHints(action, careViewModel = null) {
  const hintApi = window.GrowSimCareActionHints;
  if (!hintApi
    || typeof hintApi.buildCareActionContext !== 'function'
    || typeof hintApi.selectTopHints !== 'function') {
    return {
      hints: [],
      topHint: null,
      hasPositive: false,
      hasWarning: false,
      hasCaution: false
    };
  }

  const baseContext = careViewModel && careViewModel.context ? careViewModel.context : state;
  const hintContext = hintApi.buildCareActionContext(baseContext, action);
  let hints = [];

  if (action.category === 'watering' && typeof hintApi.evaluateWateringHints === 'function') {
    hints = hintApi.evaluateWateringHints(hintContext);
  } else if (action.category === 'fertilizing' && typeof hintApi.evaluateFertilizingHints === 'function') {
    hints = hintApi.evaluateFertilizingHints(hintContext);
  } else if (action.category === 'training' && typeof hintApi.evaluateTrainingHints === 'function') {
    hints = hintApi.evaluateTrainingHints(hintContext);
  } else if (action.category === 'environment' && typeof hintApi.evaluateEnvironmentHints === 'function') {
    hints = hintApi.evaluateEnvironmentHints(hintContext);
  }

  const topHint = hintApi.selectTopHints(hints, 1)[0] || null;
  return {
    hints,
    topHint,
    hasPositive: hints.some((hint) => hint && hint.severity === 'positive'),
    hasWarning: hints.some((hint) => hint && hint.severity === 'warning'),
    hasCaution: hints.some((hint) => hint && hint.severity === 'caution')
  };
}

function getActionPriorityTier(action, availability, cooldownLeftMs, careViewModel = null) {
  const hintSummary = evaluateActionPriorityHints(action, careViewModel);
  let tier = 'secondary';

  if (cooldownLeftMs > 0) {
    tier = 'cooldown';
  } else if (!availability.ok) {
    tier = 'blocked';
  } else if (hintSummary.hasWarning && !(availability && availability.soft)) {
    tier = 'blocked';
  } else if (hintSummary.hasPositive) {
    tier = 'primary';
  }

  return {
    tier,
    hintSummary
  };
}

function getCompactActionSummaryText(actionEntry) {
  const action = actionEntry || {};
  if (action.tier === 'cooldown') {
    return `Wieder in ${Math.max(1, Math.ceil((Number(action.cooldownLeftMs) || 0) / 60000))} min sinnvoll.`;
  }

  if (action.availability && !action.availability.ok) {
    return explainActionFailure(action.availability.reason);
  }
  if (action.availability && action.availability.soft) {
    return action.availability.note || 'Geht noch, aber heute mit weniger sauberer Wirkung.';
  }

  if (action.hintSummary && action.hintSummary.topHint) {
    const hintCopy = getCareHintCopy(action.hintSummary.topHint);
    return hintCopy.headline || hintCopy.explanation || action.hintSummary.topHint.message || 'Gerade keine gute Idee.';
  }

  return 'Gerade keine gute Idee.';
}

function scheduleActionOverTimeEffect(action, nowMs, profile = null) {
  const durationMs = Math.round((Number(action.effects.durationSimMinutes) || 0) * 60 * 1000);
  const overTime = scaleActionEffectsObject(action.effects.overTime || {}, profile, { phase: 'overTime' });
  if (durationMs <= 0 || !Object.keys(overTime).length) {
    return;
  }

  state.actions.activeEffects.push({
    id: `${action.id}:${nowMs}:${state.simulation.tickCount}`,
    actionId: action.id,
    remainingSimMs: durationMs,
    rates: overTime
  });
}

function applyActiveActionEffects(elapsedSimMs) {
  if (!Array.isArray(state.actions.activeEffects) || !state.actions.activeEffects.length) {
    return;
  }

  const stillActive = [];
  for (const effect of state.actions.activeEffects) {
    const stepMs = clamp(elapsedSimMs, 0, effect.remainingSimMs);
    if (stepMs > 0) {
      applyOverTimeRates(effect.rates || {}, stepMs);
      effect.remainingSimMs -= stepMs;
    }
    if (effect.remainingSimMs > 0) {
      stillActive.push(effect);
    }
  }

  state.actions.activeEffects = stillActive;
  clampStatus();
}

function applyOverTimeRates(rates, elapsedSimMs) {
  const simHours = elapsedSimMs / (60 * 60 * 1000);
  for (const [key, perHour] of Object.entries(rates || {})) {
    const delta = Number(perHour) * simHours;
    if (!Number.isFinite(delta)) {
      continue;
    }

    if (key === 'growthPerHour') {
      applyGrowthPercentDelta(delta);
      continue;
    }

    const metric = key.replace(/PerHour$/, '');
    if (Object.prototype.hasOwnProperty.call(state.status, metric)) {
      state.status[metric] += delta;
    }
  }
}

function applyActionImmediateEffects(action, profile = null) { const immediate = action && action.effects ? action.effects.immediate : null;
  if (Array.isArray(immediate)) {
    applyStructuredEffects(immediate, profile);
    applyEnvironmentActionInfluence(action, profile);
    return;
  }
  applyEffectsObject(scaleActionEffectsObject(immediate || {}, profile));
  applyEnvironmentActionInfluence(action, profile);
}

function applyEnvironmentActionInfluence(action, profile = null) {
  const controls = ensureEnvironmentControls(state);
  if (!action || typeof action !== 'object') {
    return;
  }

  const appliedCustomRootZone = applyActionRootZoneInfluence(action, profile);
  const appliedCustomClimate = applyActionClimateInfluence(action, profile);
  const appliedCustomEnvironment = applyActionEnvironmentInfluence(action, profile);
  if (appliedCustomRootZone || appliedCustomClimate || appliedCustomEnvironment) {
    return;
  }

  const category = String(action.category || '').toLowerCase();
  const intensity = String(action.intensity || 'low').toLowerCase(); const intensityFactor = intensity === 'high' ? 1 : intensity === 'medium' ? 0.65 : 0.4;
  const influenceMultiplier = Number(profile && profile.benefitMultiplier) || 1;

  if (category === 'fertilizing') {
    controls.ec = clamp(controls.ec + (0.28 * intensityFactor * influenceMultiplier), 0.6, 2.8);
    controls.ph = clamp(controls.ph - (0.04 * intensityFactor * influenceMultiplier), 5.0, 7.0);
  }

  if (category === 'watering') {
    controls.ec = clamp(controls.ec - ((0.10 + (0.08 * intensityFactor)) * influenceMultiplier), 0.6, 2.8);
    const phPull = (6.0 - controls.ph) * (0.20 + (0.15 * intensityFactor * influenceMultiplier));
    controls.ph = clamp(controls.ph + phPull, 5.0, 7.0);
  }

  if (category === 'environment') {
    controls.airflowPercent = clampInt(controls.airflowPercent + Math.round(8 * intensityFactor * influenceMultiplier), 0, 100);
  }
}

function applyActionEnvironmentInfluence(action, profile = null) {
  const influence = action && action.environmentInfluence && typeof action.environmentInfluence === 'object' ? action.environmentInfluence : null;
  if (!influence) {
    return false;
  }

  const controls = ensureEnvironmentControls(state);
  let applied = false;
  const influenceMultiplier = Number(profile && profile.benefitMultiplier) || 1;

  if (Number.isFinite(Number(influence.airflowDeltaPercent))) {
    const airflowDeltaPercent = Number(influence.airflowDeltaPercent) * influenceMultiplier;
    controls.airflowPercent = clampInt(controls.airflowPercent + airflowDeltaPercent, 0, 100);
    if (controls.fan && typeof controls.fan === 'object') {
      controls.fan.minPercent = clampInt(Number(controls.fan.minPercent) || 0, 0, 100);
      controls.fan.minPercent = clampInt(controls.fan.minPercent + airflowDeltaPercent, 0, 100);
      controls.fan.maxPercent = clampInt(Math.max(Number(controls.fan.maxPercent) || 100, controls.fan.minPercent), 0, 100);
    }
    applied = true;
  }

  if (Boolean(influence.skipGenericCategoryInfluence)) {
    applied = true;
  }

  return applied;
}

function applyActionRootZoneInfluence(action, profile = null) {
  const influence = action && action.rootZoneInfluence && typeof action.rootZoneInfluence === 'object' ? action.rootZoneInfluence : null;
  if (!influence) {
    return false;
  }

  const controls = ensureEnvironmentControls(state);
  let applied = false;
  const influenceMultiplier = Number(profile && profile.benefitMultiplier) || 1;

  if (Number.isFinite(Number(influence.ecDelta))) {
    controls.ec = clamp(controls.ec + (Number(influence.ecDelta) * influenceMultiplier), 0.6, 2.8);
    applied = true;
  }

  if (Number.isFinite(Number(influence.phDelta))) {
    controls.ph = clamp(controls.ph + (Number(influence.phDelta) * influenceMultiplier), 5.0, 7.0);
    applied = true;
  }

  if (Number.isFinite(Number(influence.phToward))) { const weight = clamp((Number.isFinite(Number(influence.phTowardWeight)) ? Number(influence.phTowardWeight) : 0.35) * influenceMultiplier, 0, 1);
    controls.ph = clamp(controls.ph + ((Number(influence.phToward) - controls.ph) * weight), 5.0, 7.0);
    applied = true;
  }

  return applied;
}

function applyActionClimateInfluence(action, profile = null) {
  const influence = action && action.climateInfluence && typeof action.climateInfluence === 'object' ? action.climateInfluence : null;
  if (!influence) {
    return false;
  }

  if (String((state.setup && state.setup.mode) || '') !== 'indoor') {
    return false;
  }

  const envApi = window.GrowSimEnvModel;
  if (!envApi
    || typeof envApi.ensureClimateState !== 'function'
    || typeof envApi.absoluteHumidityFromRelativeHumidity !== 'function'
    || typeof envApi.relativeHumidityFromAbsoluteHumidity !== 'function'
    || typeof envApi.computeVpdKpa !== 'function') {
    return false;
  }

  const humidityPulsePercent = clamp((Number(influence.humidityPulsePercent) || 0) * (Number(profile && profile.benefitMultiplier) || 1), 0, 12);
  if (humidityPulsePercent <= 0) {
    return false;
  }

  const climate = envApi.ensureClimateState(state, state.status, state.simulation, state.plant);
  if (!climate || !climate.tent) {
    return false;
  }

  const tempC = clamp(Number(climate.tent.temperatureC) || 20, 10, 40);
  const currentAbsHumidity = clamp(Number(climate.tent.absoluteHumidityGm3) || 0, 0, 80);
  const currentRh = clamp(
    Number(climate.tent.humidityPercent) || envApi.relativeHumidityFromAbsoluteHumidity(tempC, currentAbsHumidity),
    0,
    100
  );
  const targetRh = clamp(currentRh + humidityPulsePercent, 0, 95);
  const targetAbsHumidity = clamp(envApi.absoluteHumidityFromRelativeHumidity(tempC, targetRh), currentAbsHumidity, 80);

  climate.tent.absoluteHumidityGm3 = targetAbsHumidity;
  climate.tent.humidityPercent = clampInt(envApi.relativeHumidityFromAbsoluteHumidity(tempC, targetAbsHumidity), 0, 100);
  climate.tent.vpdKpa = round2(envApi.computeVpdKpa(tempC, climate.tent.humidityPercent));

  return true;
}

function applyStructuredEffects(effectsList, profile = null) {
  for (const effect of effectsList || []) {
    if (!effect || typeof effect !== 'object') {
      continue;
    }

    const metric = String(effect.stat || '').trim();
    const mode = String(effect.mode || 'add').trim();
    const value = Number(effect.value);

    if (!metric || (!Object.prototype.hasOwnProperty.call(state.status, metric) && metric !== 'growth')) {
      continue;
    }

    if ((mode !== 'clamp_min' && mode !== 'clamp_max' && mode !== 'reduce_risk' && mode !== 'reduce_salt_load') && !Number.isFinite(value)) {
      continue;
    }

    if (metric === 'growth') {
      if (mode === 'add') {
        applyGrowthPercentDelta(scaleActionEffectsObject({ growth: value }, profile).growth || value);
      } else if (mode === 'subtract') {
        applyGrowthPercentDelta(scaleActionEffectsObject({ growth: -Math.abs(value) }, profile).growth || -Math.abs(value));
      } else if (mode === 'set') {
        state.plant.progress = clamp(Number(value), 0, 100);
      }
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(state.status, metric)) {
      continue;
    }

    if (mode === 'add') {
      state.status[metric] += scaleActionEffectsObject({ [metric]: value }, profile)[metric] || value;
    } else if (mode === 'subtract') {
      state.status[metric] += scaleActionEffectsObject({ [metric]: -Math.abs(value) }, profile)[metric] || -Math.abs(value);
    } else if (mode === 'set') {
      state.status[metric] = value;
    } else if (mode === 'clamp_min') {
      state.status[metric] = Math.max(state.status[metric], Number(effect.min));
    } else if (mode === 'clamp_max') {
      state.status[metric] = Math.min(state.status[metric], Number(effect.max));
    } else if (mode === 'reduce_risk') { state.status.risk -= Math.abs(Number.isFinite(value) ? value : 0);
    } else if (mode === 'reduce_salt_load') { state.status.risk -= Math.abs(Number.isFinite(value) ? value : 0);
    }
  }

  clampStatus();
}

function applyEffectsObject(effects) {
  for (const [metric, deltaRaw] of Object.entries(effects || {})) {
    const delta = Number(deltaRaw);
    if (!Number.isFinite(delta)) {
      continue;
    }

    if (metric === 'growth') {
      applyGrowthPercentDelta(delta);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(state.status, metric)) {
      state.status[metric] += delta;
    }
  }

  clampStatus();
}

function evaluateCondition(conditionExpr) {
  const expr = String(conditionExpr || 'true').trim();
  if (!expr || expr.toLowerCase() === 'true') {
    return true;
  }

  const orParts = expr.split(/\s+OR\s+/i);
  for (const part of orParts) {
    const andParts = part.split(/\s+AND\s+/i);
    const andResult = andParts.every((token) => evaluateAtomicCondition(token.trim()));
    if (andResult) {
      return true;
    }
  }
  return false;
}

function evaluateAtomicCondition(token) {
  const m = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) {
    return false;
  }

  const key = m[1];
  const op = m[2];
  const rhs = Number(m[3]); const lhs = key in state.status ? Number(state.status[key]) : NaN;
  if (!Number.isFinite(lhs) || !Number.isFinite(rhs)) {
    return false;
  }

  if (op === '>=') return lhs >= rhs;
  if (op === '<=') return lhs <= rhs;
  if (op === '==') return lhs === rhs;
  if (op === '>') return lhs > rhs;
  if (op === '<') return lhs < rhs;
  return false;
}

function snapshotStatus() {
  return {
    water: state.status.water,
    nutrition: state.status.nutrition,
    health: state.status.health,
    stress: state.status.stress,
    risk: state.status.risk,
    growth: state.status.growth
  };
}

function summarizeDelta(before, after) {
  const out = {};
  for (const key of Object.keys(before)) {
    out[key] = round2((after[key] || 0) - (before[key] || 0));
  }
  return out;
}

const loggedCareActionTimeDiagnostics = new Set();

function reportCareActionClockJumpOnce(action, details = {}) {
  const actionId = action && action.id ? String(action.id) : 'unknown_action';
  if (loggedCareActionTimeDiagnostics.has(actionId)) {
    return;
  }
  loggedCareActionTimeDiagnostics.add(actionId);

  const payload = {
    actionId,
    actionLabel: action && action.label ? String(action.label) : actionId,
    category: action && action.category ? String(action.category) : 'unknown',
    path: 'applyAction',
    ...details
  };

  if (typeof reportSimulationClockIssue === 'function') {
    reportSimulationClockIssue('warn', 'Care action mutated simulation clock unexpectedly', payload);
    return;
  }
  console.warn('[sim-time] Care action mutated simulation clock unexpectedly', payload);
}

function consumeBoostUsage(nowMs, actionLabel) {
  resetBoostDaily(nowMs);

  if (state.boost.boostUsedToday >= state.boost.boostMaxPerDay) {
    addLog('action', `${actionLabel} wegen Tageslimit blockiert`, { cap: state.boost.boostMaxPerDay });
    return { ok: false, reason: 'limit_reached' };
  }

  state.boost.boostUsedToday += 1;
  return { ok: true, usedToday: state.boost.boostUsedToday };
}

function getNextDayStartSimTime(simTimeMs) {
  const shifted = new Date(simTimeMs);
  if (simHour(simTimeMs) >= SIM_NIGHT_START_HOUR) {
    shifted.setDate(shifted.getDate() + 1);
  }
  shifted.setHours(SIM_DAY_START_HOUR, 0, 0, 0);
  return shifted.getTime();
}

function onBoostAction() {
  if (isPlantDead()) {
    addLog('action', 'Boost blockiert: Pflanze ist eingegangen', null);
    renderAll();
    return;
  }

  activateSpeedBoost(Date.now());

  renderAll();
  schedulePersistState(true);
}

function onSkipNightAction() {
  if (isPlantDead()) {
    addLog('action', 'Nacht überspringen blockiert: Pflanze ist eingegangen', null);
    renderAll();
    return;
  }

  if (state.simulation.isDaytime) {
    addLog('action', 'Nacht überspringen blockiert: Bereits Tagphase', null);
    renderAll();
    return;
  }

  const nowMs = Date.now();
  const usage = consumeBoostUsage(nowMs, 'Nacht überspringen');
  if (!usage.ok) {
    renderAll();
    return;
  }

  const currentSimTimeMs = Number(state.simulation.simTimeMs) || alignToSimStartHour(nowMs, SIM_START_HOUR);
  const nextDayStartSimMs = getNextDayStartSimTime(currentSimTimeMs);
  const remainingNightSimMs = Math.max(0, nextDayStartSimMs - currentSimTimeMs);

  if (remainingNightSimMs <= 0) {
    setSimulationTimeMs(nextDayStartSimMs, nowMs, {
      suppressLogs: true,
      reason: 'skip_night_align'
    });
    runEventStateMachine(state.simulation.nowMs);
    renderAll();
    schedulePersistState(true);
    return;
  }

  const elapsedRealMs = convertSimDeltaToFutureRealDeltaMs(remainingNightSimMs, nowMs);
  const targetRealMs = nowMs + elapsedRealMs;
  const wasDeadBeforeSkip = isPlantDead();

  advanceSimulationTime(targetRealMs, {
    suppressDeath: true,
    reason: 'skip_night'
  });

  if (!wasDeadBeforeSkip) {
    state.status.health = Math.max(8, Number(state.status.health) || 0);
    state.status.water = Math.max(6, Number(state.status.water) || 0);
    state.status.nutrition = Math.max(6, Number(state.status.nutrition) || 0);
    state.status.stress = Math.min(98, Number(state.status.stress) || 0);
    state.status.risk = Math.min(98, Number(state.status.risk) || 0);
    state.plant.isDead = false;
    if (state.plant.phase === 'dead') {
      const safeIndex = clampInt(Number(state.plant.stageIndex) || 0, 0, Math.max(0, getStageTimeline().length - 1));
      state.plant.phase = getStageTimeline()[safeIndex].phase || 'seedling';
    }
    state.ui.deathOverlayOpen = false;
  }

  syncCanonicalStateShape();
  runEventStateMachine(state.simulation.nowMs);

  addLog('action', 'Nacht übersprungen: Tagesbeginn erreicht', {
    usedToday: state.boost.boostUsedToday,
    skippedNightSimMinutes: Math.round(remainingNightSimMs / 60000),
    simTimeAfter: state.simulation.simTimeMs
  });

  renderAll();
  schedulePersistState(true);
}

function onClearLog() {
  state.history.systemLog = [];
  state.history = { actions: [], events: [], system: [] };
  addLog('system', 'Protokoll geleert', null);
  renderAnalysisPanel(true);
  schedulePersistState(true);
}

function resetBoostDaily(nowMs) {
  const currentStamp = dayStamp(nowMs);
  if (state.boost.dayStamp !== currentStamp) {
    state.boost.dayStamp = currentStamp;
    state.boost.boostUsedToday = 0;
  }
}

// Legacy app.js event entry points must delegate into events.js.
function getCanonicalEventsRuntime() {
  const api = window.GrowSimEvents;
  if (!api || typeof api !== 'object') {
    throw new Error('GrowSimEvents runtime ist nicht verfügbar');
  }
  return api;
}

function callCanonicalEventsRuntime(fnName, ...args) {
  const runtime = getCanonicalEventsRuntime();
  const fn = runtime[fnName];
  if (typeof fn !== 'function') {
    throw new Error(`GrowSimEvents.${fnName} ist nicht verfügbar`);
  }
  return fn(...args);
}

function dayStamp(timestampMs) {
  const d = new Date(timestampMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function alignToSimStartHour(realNowMs, startHour) {
  const d = new Date(realNowMs);
  d.setHours(clampInt(startHour, 0, 23), 0, 0, 0);
  return d.getTime();
}

function simHour(simTimeMs) {
  return new Date(simTimeMs).getHours();
}

function isDaytimeAtSimTime(simTimeMs) {
  const hour = simHour(simTimeMs);
  return hour >= SIM_DAY_START_HOUR && hour < SIM_NIGHT_START_HOUR;
}

function nextDaytimeRealMs(realNowMs, simTimeMs) {
  const simDate = new Date(simTimeMs);
  const shifted = new Date(simDate.getTime());

  if (simHour(simTimeMs) >= SIM_NIGHT_START_HOUR) {
    shifted.setDate(shifted.getDate() + 1);
  }

  shifted.setHours(SIM_DAY_START_HOUR, 0, 0, 0);
  const simDeltaMs = Math.max(0, shifted.getTime() - simTimeMs);
  const realDeltaMs = convertSimDeltaToFutureRealDeltaMs(simDeltaMs, realNowMs);
  return realNowMs + realDeltaMs;
}

function formatSimClock(simTimeMs) {
  return new Date(simTimeMs).toLocaleTimeString('de-DE');
}

function deterministicUnitFloat(contextKey) {
  const hash = hashString(`${state.simulation.globalSeed}|${state.simulation.plantId}|${contextKey}`);
  return (hash % 1_000_000) / 1_000_000;
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clampStatus() {
  state.status.health = clamp(state.status.health, 0, 100);
  state.status.stress = clamp(state.status.stress, 0, 100);
  state.status.water = clamp(state.status.water, 0, 100);
  state.status.nutrition = clamp(state.status.nutrition, 0, 100);
  state.status.growth = clamp(state.status.growth, 0, 100);
  state.status.risk = clamp(state.status.risk, 0, 100);
}

function updateVisibleOverlays() {
  const overlays = [];

  if (state.status.stress >= 80) {
    overlays.push('overlay_burn');
  }
  if (state.status.nutrition <= 28) {
    overlays.push('overlay_def_n');
  } else if (state.status.nutrition <= 45) {
    overlays.push('overlay_def_mg');
  }
  if (state.status.risk >= 78) {
    overlays.push('overlay_mold_warning');
  }
  if (state.status.risk >= 62) {
    overlays.push('overlay_pest_mites');
  }
  if (state.status.risk >= 70 && state.status.stress >= 55) {
    overlays.push('overlay_pest_thrips');
  }

  state.ui.visibleOverlayIds = overlays;
}

function renderAll() {
  syncDeathState();
  renderActiveScreen();
  renderOverlayModules();
  migrateSettings(state);
  updateSettingsUI();
  renderLanding();
  renderDeathOverlay();
  renderRunSummaryOverlay();
  if (state.ui && typeof state.ui === 'object') {
    state.ui.lastRenderRealMs = Date.now();
  }
}

function renderOverlayModules() {
  let handled = false;

  if (sheetsOverlayModule && typeof sheetsOverlayModule.update === 'function') {
    sheetsOverlayModule.update(state, null);
    handled = true;
  }

  if (menuOverlayModule && typeof menuOverlayModule.update === 'function') {
    menuOverlayModule.update(state, null);
    handled = true;
  }

  if (handled) {
    return;
  }

  renderSheets();
  renderGameMenu();
  renderCareSheet();
  renderEventSheet();
  renderAnalysisPanel(false);
  renderSettingsSheet();
}

function renderActiveScreen() {
  if (screenRuntimeManager && typeof screenRuntimeManager.render === 'function') { const active = state.ui && typeof state.ui.activeScreen === 'string' ? state.ui.activeScreen : 'home';
    state.ui.activeScreen = screenRuntimeManager.setActiveScreen(active);
    screenRuntimeManager.render(state);
    return;
  }
  renderHud();
}

function getCompactRunGoalTitle(runGoal) {
  const goalId = String(runGoal && runGoal.id || '');
  switch (goalId) {
    case 'survive_day_20':
      return 'Tag 20';
    case 'reach_flowering':
      return 'Blüte';
    case 'stable_grow':
      return 'Stabil halten';
    case 'clean_finish':
      return 'Sauber beenden';
    case 'reach_harvest':
      return 'Ernte';
    default:
      return String(runGoal && runGoal.title || 'Run-Ziel');
  }
}

function getAuthDisplayIdentity() {
  const authApi = window.GrowSimAuth;
  if (!authApi || typeof authApi.isAuthenticated !== 'function' || typeof authApi.getUser !== 'function') {
    return null;
  }

  if (!authApi.isAuthenticated()) {
    return null;
  }

  const user = authApi.getUser();
  if (!user || typeof user !== 'object') {
    return null;
  }

  const displayName = typeof user.displayName === 'string' ? user.displayName.trim() : '';
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  return {
    displayName: displayName || null,
    email: email || null
  };
}

function buildHomeViewModel(appState = state) { const sourceState = appState && typeof appState === 'object' ? appState : state;
  const dead = Boolean(sourceState.plant && (sourceState.plant.isDead || sourceState.plant.phase === 'dead'));
  const phaseCard = typeof getPhaseCardViewModel === 'function' ? getPhaseCardViewModel() : { title: '-', cycleIcon: '-', ageLabel: '-', subtitle: '-', progressPercent: 0, nextLabel: '' };
  const eventStatus = eventStatusDisplay(sourceState);
  const simulation = sourceState.simulation || {};
  const status = sourceState.status || {};
  const boost = sourceState.boost || {};
  const profile = getCanonicalProfile(sourceState);
  const run = getCanonicalRun(sourceState);
  const progressionApi = getProgressionApi();

  const simDay = Number(simulation.simDay || 0);
  const levelProgress = progressionApi && typeof progressionApi.getLevelProgress === 'function' ? progressionApi.getLevelProgress(profile) : {
      level: Number(profile.level || 1),
      currentXp: Number(profile.totalXp || 0),
      currentLevelXp: Number(profile.totalXp || 0),
      requiredXp: 100,
      xpPercent: 0,
      nextLevel: Number(profile.level || 1) + 1,
      nextThreshold: Number(profile.totalXp || 0) + 100
    };
  const xpCurrent = Number(levelProgress.currentXp || 0);
  const xpTarget = Number(levelProgress.nextThreshold || xpCurrent);
  const xpRatio = clamp((Number(levelProgress.xpPercent || 0) / 100), 0, 1);
  const coinBalance = Number(status.coins || (2480 + Math.round(simDay * 28)));
  const gemBalance = Number(status.gems || 55);
  const starBalance = Number(status.stars || (114 + Math.round(Number(status.growth || 0) / 2)));
  const playerLevel = Number(profile.level || 1); const playerRole = playerLevel >= 6 ? 'Master Grower' : (playerLevel >= 4 ? 'Lead Grower' : (playerLevel >= 2 ? 'Grow Operator' : 'Starter'));

  const environment = deriveEnvironmentReadout(sourceState);
  const roots = deriveRootZoneReadout(environment, sourceState);
  const showSkipNight = !dead && !Boolean(simulation.isDaytime);
  const storedRunGoal = run && run.goal && typeof run.goal === 'object' ? run.goal : null;
  const runGoal = progressionApi && typeof progressionApi.evaluateRunGoal === 'function' && storedRunGoal
    ? progressionApi.evaluateRunGoal(storedRunGoal, sourceState, {
      finalize: false,
      endReason: run && run.endReason === 'harvest' ? 'harvest' : 'death'
    })
    : storedRunGoal;
  const activeSetup = sourceState.setup && typeof sourceState.setup === 'object' ? sourceState.setup : (run && run.setupSnapshot ? run.setupSnapshot : null);
  const runBuild = progressionApi && typeof progressionApi.getRunBuildPresentation === 'function' && activeSetup ? progressionApi.getRunBuildPresentation(activeSetup) : null;
  const showRunGoal = Boolean(runGoal && (run.status === 'active' || run.status === 'downed'));
  const diagnostics = diagnosePlantState();
  const guidanceHints = getGuidanceHints(diagnostics);
  const growthImpulse = Number(simulation.growthImpulse || 0);
  const stressVisual = classifyStressVisualLevel(Number(status.stress || 0));
  const riskVisual = classifyRiskVisualLevel(Number(status.risk || 0));
  const growthVisual = classifyGrowthVisualLevel(Number(status.growth || 0), growthImpulse);

  return {
    id: 'home',
    dead,
    phaseCard,
    eventStatus,
    boostText: (() => {
      const remainingBoostMs = getRemainingBoostMs(Date.now());
      const baseSpeed = normalizeBaseSimulationSpeed(simulation.baseSpeed);
      const effectiveSpeed = getEffectiveSimulationSpeed(Date.now());
      if (remainingBoostMs > 0) {
        return `Zeit-Boost aktiv · ${Math.ceil(remainingBoostMs / 60000)} Min · ${effectiveSpeed}x`;
      }
      return `Basis ${baseSpeed}x · Boost ${BOOST_SIM_SPEED}x für 30 Min`;
    })(),
    growthImpulseText: growthImpulse.toFixed(2),
    simTimeText: formatSimClock(Number(simulation.simTimeMs || 0)),
    isDaytime: Boolean(simulation.isDaytime),
    motion: {
      stressVisual,
      riskVisual,
      growthVisual
    },
    rings: {
      health: Number(status.health || 0),
      stress: Number(status.stress || 0),
      water: Number(status.water || 0),
      nutrition: Number(status.nutrition || 0),
      growth: Number(status.growth || 0),
      risk: Number(status.risk || 0)
    },
    panel: {
      playerName: (() => {
        const authIdentity = getAuthDisplayIdentity();
        if (authIdentity && authIdentity.displayName) {
          return authIdentity.displayName;
        }
        if (authIdentity && authIdentity.email) {
          return authIdentity.email;
        }
        return profile.displayName || 'Marco';
      })(),
      playerRole,
      playerLevel: `LVL ${playerLevel}`,
      xpText: xpTarget > xpCurrent
        ? `XP: ${formatCompactNumber(xpCurrent)} / ${formatCompactNumber(xpTarget)}`
        : `XP: ${formatCompactNumber(xpCurrent)} · MAX`,
      xpPercent: Math.round(xpRatio * 100),
      coinText: formatCompactNumber(coinBalance),
      gemText: formatCompactNumber(gemBalance),
      starText: formatCompactNumber(starBalance),
      envTempText: `${environment.temperatureC.toFixed(1)}°C`,
      envHumidityText: `${environment.humidityPercent}%`,
      envVpdText: `${environment.vpdKpa.toFixed(1)} kPa`,
      envLightText: `${environment.ppfd} PPFD`,
      envAirflowText: environment.airflowLabel,
      rootPhText: roots.ph,
      rootEcText: roots.ec,
      rootHealthText: roots.rootHealth,
      rootOxygenText: roots.oxygen
    },
    actions: {
      careDisabled: dead,
      boostDisabled: dead,
      diagnosisDisabled: dead,
      skipNightDisabled: dead || Boolean(simulation.isDaytime),
      showSkipNight
    },
    diagnostics: {
      summary: String(diagnostics && diagnostics.summary || ''),
      primaryTitle: String(diagnostics && diagnostics.primaryIssue && diagnostics.primaryIssue.title || ''),
      hints: guidanceHints.slice(0, 3)
    },
    runGoal: showRunGoal
      ? {
        visible: true,
        compactTitle: getCompactRunGoalTitle(runGoal),
        title: String(runGoal.title || 'Run-Ziel'),
        description: String(runGoal.description || ''),
        focusText: String(runGoal.focusText || ''),
        status: String(runGoal.status || 'active'),
        statusText: String(runGoal.statusText || (runGoal.status === 'completed' ? 'Ziel erreicht' : 'Läuft')),
        progressText: String(runGoal.progressText || ''),
        rewardText: `+${Math.max(0, Math.trunc(Number(runGoal.rewardXp) || 0))} XP`,
        buildText: runBuild ? `${String(runBuild.title || '')} · ${String(runBuild.loadout || '')}` : '',
        buildTitle: String(runBuild && runBuild.title || ''),
        buildTag: String(runBuild && runBuild.tag || ''),
        buildTone: String(runBuild && runBuild.tone || 'balanced'),
        buildEffect: String(runBuild && runBuild.description || ''),
        buildTradeoff: String(runBuild && runBuild.tradeoff || ''),
        buildLoadout: runBuild
          ? `${String(runBuild.loadout || '')}${runBuild.supportText ? ` · ${String(runBuild.supportText)}` : ''}`
          : ''
      }
      : {
        visible: false,
        compactTitle: '',
        title: '',
        description: '',
        focusText: '',
        status: 'active',
        statusText: '',
        progressText: '',
        rewardText: '',
        buildText: '',
        buildTitle: '',
        buildTag: '',
        buildTone: 'balanced',
        buildEffect: '',
        buildTradeoff: '',
        buildLoadout: ''
      },
    overlays: Array.isArray(sourceState.ui && sourceState.ui.visibleOverlayIds) ? sourceState.ui.visibleOverlayIds.slice() : []
  };
}

function updateHomeFromViewModel(homeVm, prevVm = null) { const vm = homeVm && typeof homeVm === 'object' ? homeVm : buildHomeViewModel(state);
  const phaseCard = vm.phaseCard || {};
  const dead = Boolean(vm.dead);

  const phaseCardTitleNode = uiNode('phaseCardTitle', 'phaseCardTitle');
  const phaseCardCycleNode = uiNode('phaseCardCycle', 'phaseCardCycle');
  const phaseCardAgeNode = uiNode('phaseCardAge', 'phaseCardAge');
  const phaseCardSubtitleNode = uiNode('phaseCardSubtitle', 'phaseCardSubtitle');
  const phaseProgressFillNode = uiNode('phaseProgressFill', 'phaseProgressFill');
  const phaseCardNode = uiNode('phaseCard', 'phaseCard'); const phaseProgressNode = ui.phaseProgress || (phaseCardNode ? phaseCardNode.querySelector('.phase-progress') : null);
  const phaseProgressMarkerNode = uiNode('phaseProgressMarker', 'phaseProgressMarker');

  if (phaseCardTitleNode && phaseCardTitleNode.textContent !== phaseCard.title) {
    phaseCardTitleNode.textContent = String(phaseCard.title || '');
  }
  if (phaseCardCycleNode && phaseCardCycleNode.textContent !== phaseCard.cycleIcon) {
    phaseCardCycleNode.textContent = String(phaseCard.cycleIcon || '');
  }
  if (phaseCardCycleNode) { phaseCardCycleNode.setAttribute('aria-label', vm.isDaytime ? 'Tag' : 'Nacht');
  }
  if (phaseCardAgeNode && phaseCardAgeNode.textContent !== phaseCard.ageLabel) {
    phaseCardAgeNode.textContent = String(phaseCard.ageLabel || '');
  }
  if (phaseCardSubtitleNode && phaseCardSubtitleNode.textContent !== phaseCard.subtitle) {
    phaseCardSubtitleNode.textContent = String(phaseCard.subtitle || '');
  }
  if (phaseProgressFillNode) {
    phaseProgressFillNode.style.setProperty('--phase-progress', String(Number(phaseCard.progressPercent || 0)));
  }
  if (phaseCardNode) {
    phaseCardNode.classList.toggle('phase-card--complete', Number(phaseCard.progressPercent || 0) >= 100);
    phaseCardNode.setAttribute(
      'aria-label',
      `Phase ${String(phaseCard.title || '-')}. ${String(phaseCard.ageLabel || '-')}. ${String(phaseCard.subtitle || '-')}.`
    );
  }
  if (phaseProgressNode) {
    phaseProgressNode.setAttribute('aria-valuenow', String(Number(phaseCard.progressPercent || 0)));
  }
  if (phaseProgressMarkerNode) {
    phaseProgressMarkerNode.classList.toggle('hidden', !phaseCard.nextLabel || Number(phaseCard.progressPercent || 0) >= 100);
  }

  const homeMetaToggleNode = uiNode('homeMetaToggle', 'homeMetaToggle');
  const homeMetaGoalCompactNode = uiNode('homeMetaGoalCompact', 'homeMetaGoalCompact');
  const homeMetaGoalProgressNode = uiNode('homeMetaGoalProgress', 'homeMetaGoalProgress');
  const homeMetaGoalStatusNode = uiNode('homeMetaGoalStatus', 'homeMetaGoalStatus');
  const homeMetaBuildChipNode = uiNode('homeMetaBuildChip', 'homeMetaBuildChip');
  const homeMetaDetailNode = uiNode('homeMetaDetail', 'homeMetaDetail');
  const homeMetaDetailStatusNode = uiNode('homeMetaDetailStatus', 'homeMetaDetailStatus');
  const homeMetaDetailTitleNode = uiNode('homeMetaDetailTitle', 'homeMetaDetailTitle');
  const homeMetaDetailDescriptionNode = uiNode('homeMetaDetailDescription', 'homeMetaDetailDescription');
  const homeMetaDetailProgressNode = uiNode('homeMetaDetailProgress', 'homeMetaDetailProgress');
  const homeMetaDetailRewardNode = uiNode('homeMetaDetailReward', 'homeMetaDetailReward');
  const homeMetaDetailBuildTagNode = uiNode('homeMetaDetailBuildTag', 'homeMetaDetailBuildTag');
  const homeMetaDetailBuildTitleNode = uiNode('homeMetaDetailBuildTitle', 'homeMetaDetailBuildTitle');
  const homeMetaDetailBuildEffectNode = uiNode('homeMetaDetailBuildEffect', 'homeMetaDetailBuildEffect');
  const homeMetaDetailBuildLoadoutNode = uiNode('homeMetaDetailBuildLoadout', 'homeMetaDetailBuildLoadout');
  const runGoalVm = vm.runGoal || {};
  if (homeMetaToggleNode) {
    homeMetaToggleNode.classList.toggle('hidden', !Boolean(runGoalVm.visible));
    homeMetaToggleNode.setAttribute('aria-hidden', String(!Boolean(runGoalVm.visible)));
    homeMetaToggleNode.dataset.status = String(runGoalVm.status || 'active');
  }
  if (homeMetaGoalCompactNode) {
    homeMetaGoalCompactNode.textContent = String(runGoalVm.compactTitle || runGoalVm.title || 'Run-Ziel');
  }
  if (homeMetaGoalProgressNode) {
    homeMetaGoalProgressNode.textContent = String(runGoalVm.progressText || '');
  }
  if (homeMetaGoalStatusNode) {
    homeMetaGoalStatusNode.textContent = String(runGoalVm.statusText || '');
    homeMetaGoalStatusNode.dataset.status = String(runGoalVm.status || 'active');
  }
  if (homeMetaBuildChipNode) {
    homeMetaBuildChipNode.textContent = String(runGoalVm.buildTag || runGoalVm.buildTitle || 'Build');
    homeMetaBuildChipNode.dataset.tone = String(runGoalVm.buildTone || 'balanced');
    homeMetaBuildChipNode.classList.toggle('hidden', !String(runGoalVm.buildTag || runGoalVm.buildTitle || '').trim());
  }
  if (homeMetaDetailNode && !Boolean(runGoalVm.visible)) {
    homeMetaDetailNode.classList.add('home-meta-detail--disabled');
    homeMetaDetailNode.classList.add('hidden');
    homeMetaDetailNode.setAttribute('aria-hidden', 'true');
    if (typeof window.setHomeMetaExpanded === 'function') {
      window.setHomeMetaExpanded(false);
    }
  } else if (homeMetaDetailNode) {
    homeMetaDetailNode.classList.remove('home-meta-detail--disabled');
  }
  if (homeMetaDetailStatusNode) {
    homeMetaDetailStatusNode.textContent = String(runGoalVm.statusText || '');
    homeMetaDetailStatusNode.dataset.status = String(runGoalVm.status || 'active');
  }
  if (homeMetaDetailTitleNode) {
    homeMetaDetailTitleNode.textContent = String(runGoalVm.title || 'Run-Ziel');
  }
  if (homeMetaDetailDescriptionNode) {
    homeMetaDetailDescriptionNode.textContent = String([runGoalVm.description, runGoalVm.focusText].filter(Boolean).join(' '));
  }
  if (homeMetaDetailProgressNode) {
    homeMetaDetailProgressNode.textContent = String(runGoalVm.progressText || '');
  }
  if (homeMetaDetailRewardNode) {
    homeMetaDetailRewardNode.textContent = String(runGoalVm.rewardText || '');
  }
  if (homeMetaDetailBuildTagNode) {
    homeMetaDetailBuildTagNode.textContent = String(runGoalVm.buildTag || 'Build');
    homeMetaDetailBuildTagNode.dataset.tone = String(runGoalVm.buildTone || 'balanced');
  }
  if (homeMetaDetailBuildTitleNode) {
    homeMetaDetailBuildTitleNode.textContent = String(runGoalVm.buildTitle || 'Balanced Control');
  }
  if (homeMetaDetailBuildEffectNode) {
    homeMetaDetailBuildEffectNode.textContent = String([runGoalVm.buildEffect, runGoalVm.buildTradeoff].filter(Boolean).join(' '));
  }
  if (homeMetaDetailBuildLoadoutNode) {
    homeMetaDetailBuildLoadoutNode.textContent = String(runGoalVm.buildLoadout || '');
  }

  const boostUsageTextNode = uiNode('boostUsageText', 'boostUsageText');
  if (boostUsageTextNode && boostUsageTextNode.textContent !== vm.boostText) {
    boostUsageTextNode.textContent = String(vm.boostText || '');
  }

  setRing(uiNode('healthRing', 'healthRing'), uiNode('healthValue', 'healthValue'), Number(vm.rings && vm.rings.health || 0));
  setRing(uiNode('stressRing', 'stressRing'), uiNode('stressValue', 'stressValue'), Number(vm.rings && vm.rings.stress || 0));
  setRing(uiNode('waterRing', 'waterRing'), uiNode('waterValue', 'waterValue'), Number(vm.rings && vm.rings.water || 0));
  setRing(uiNode('nutritionRing', 'nutritionRing'), uiNode('nutritionValue', 'nutritionValue'), Number(vm.rings && vm.rings.nutrition || 0));
  setRing(uiNode('growthRing', 'growthRing'), uiNode('growthValue', 'growthValue'), Number(vm.rings && vm.rings.growth || 0));
  setRing(uiNode('riskRing', 'riskRing'), uiNode('riskValue', 'riskValue'), Number(vm.rings && vm.rings.risk || 0));
  applyRingVisualState(uiNode('stressRing', 'stressRing'), 'stressVisual', vm.motion && vm.motion.stressVisual);
  applyRingVisualState(uiNode('riskRing', 'riskRing'), 'riskVisual', vm.motion && vm.motion.riskVisual);
  applyRingVisualState(uiNode('growthRing', 'growthRing'), 'growthVisual', vm.motion && vm.motion.growthVisual);
  applyPlantMotionState(vm);

  const plantCanvas = uiNode('plantImage', 'plantImage');
  if (plantCanvas && typeof renderPlantFromSprite === 'function') {
    renderPlantFromSprite(plantCanvas);
  }

  const plantStatusChipNode = uiNode('plantStatusChip', 'plantStatusChip');
  if (plantStatusChipNode) {
    const stress = Number(vm.rings && vm.rings.stress || 0);
    const health = Number(vm.rings && vm.rings.health || 0);
    let statusText = 'Gesund';
    let statusClass = 'home-progress-status-ok';
    if (stress > 60) { statusText = 'Stress'; statusClass = 'home-progress-status-stress'; }
    else if (health < 40) { statusText = 'Kritisch'; statusClass = 'home-progress-status-critical'; }
    else if (stress > 30) { statusText = 'Achtung'; statusClass = 'home-progress-status-warn'; }
    
    if (plantStatusChipNode.textContent !== statusText) {
      plantStatusChipNode.textContent = statusText;
      plantStatusChipNode.className = `home-progress-stress-chip ${statusClass}`;
    }
  }

  const nextEventValueNode = uiNode('nextEventValue', 'nextEventValue');
  if (nextEventValueNode) { nextEventValueNode.textContent = String(vm.eventStatus && vm.eventStatus.value ? vm.eventStatus.value : ''); const nextLabel = String(vm.eventStatus && vm.eventStatus.label ? vm.eventStatus.label : '');
    if (nextEventValueNode.dataset.label !== nextLabel) {
      const infoTile = nextEventValueNode.closest('.info-tile');
      const labelNode = infoTile ? infoTile.querySelector('.info-label') : null;
      if (labelNode) {
        labelNode.textContent = nextLabel;
      }
      nextEventValueNode.dataset.label = nextLabel;
    }
  }

  const growthImpulseNode = uiNode('growthImpulseValue', 'growthImpulseValue');
  if (growthImpulseNode && growthImpulseNode.textContent !== vm.growthImpulseText) {
    growthImpulseNode.textContent = String(vm.growthImpulseText || '0.00');
  }
  const simTimeNode = uiNode('simTimeValue', 'simTimeValue');
  if (simTimeNode && simTimeNode.textContent !== vm.simTimeText) {
    simTimeNode.textContent = String(vm.simTimeText || '');
  }

  const homeGuidancePanelNode = uiNode('homeGuidancePanel', 'homeGuidancePanel');
  const homeGuidanceListNode = uiNode('homeGuidanceList', 'homeGuidanceList');
  const homeGuidanceHints = Array.isArray(vm.diagnostics && vm.diagnostics.hints) ? vm.diagnostics.hints : [];
  if (homeGuidancePanelNode) {
    homeGuidancePanelNode.classList.toggle('hidden', !homeGuidanceHints.length);
    homeGuidancePanelNode.setAttribute('aria-hidden', String(!homeGuidanceHints.length));
  }
  if (homeGuidanceListNode) {
    const previousGuidanceSignature = String(homeGuidanceListNode.dataset.signature || '');
    const nextGuidanceSignature = homeGuidanceHints.map((hint) => String(hint && hint.id || '')).join('|');
    homeGuidanceListNode.replaceChildren();
    for (const hint of homeGuidanceHints.slice(0, 3)) {
      const item = document.createElement('div');
      item.className = `home-guidance-item home-guidance-item--${escapeHtml(String(hint.tone || 'stabilize'))}`;
      if (nextGuidanceSignature && nextGuidanceSignature !== previousGuidanceSignature) {
        item.classList.add('home-guidance-item--fresh');
      }
      item.innerHTML = `
        <strong class="home-guidance-item__title">${escapeHtml(String(hint.title || 'Hinweis'))}</strong>
        <p class="home-guidance-item__body">${escapeHtml(String(hint.body || ''))}</p>
      `;
      homeGuidanceListNode.appendChild(item);
    }
    homeGuidanceListNode.dataset.signature = nextGuidanceSignature;
    if (nextGuidanceSignature && nextGuidanceSignature !== previousGuidanceSignature) {
      clearTimeout(homeGuidanceListNode._guidanceFreshTimerId);
      homeGuidanceListNode._guidanceFreshTimerId = setTimeout(() => {
        homeGuidanceListNode.querySelectorAll('.home-guidance-item--fresh').forEach((node) => node.classList.remove('home-guidance-item--fresh'));
      }, GUIDANCE_FRESH_ANIMATION_MS);
    }
  }

  renderPanelReadouts(vm);

  const careActionBtnNode = uiNode('careActionBtn', 'careActionBtn');
  const boostActionBtnNode = uiNode('boostActionBtn', 'boostActionBtn');
  const diagnosisBtnNode = uiNode('openDiagnosisBtn', 'openDiagnosisBtn');
  const skipNightBtnNode = uiNode('skipNightActionBtn', 'skipNightActionBtn');

  if (careActionBtnNode) {
    careActionBtnNode.disabled = dead || Boolean(vm.actions && vm.actions.careDisabled);
  }
  if (boostActionBtnNode) {
    boostActionBtnNode.disabled = dead || Boolean(vm.actions && vm.actions.boostDisabled);
  }
  if (diagnosisBtnNode) {
    diagnosisBtnNode.disabled = dead || Boolean(vm.actions && vm.actions.diagnosisDisabled);
  }
  if (skipNightBtnNode) {
    skipNightBtnNode.disabled = Boolean(vm.actions && vm.actions.skipNightDisabled);
    skipNightBtnNode.classList.toggle('hidden', !Boolean(vm.actions && vm.actions.showSkipNight));
  }

  renderOverlayVisibility(vm.overlays);
}

function renderHud() {
  const homeVm = buildHomeViewModel(state);
  updateHomeFromViewModel(homeVm, null);
}

function renderPanelReadouts(homeVm = null) { const vm = homeVm && typeof homeVm === 'object' ? homeVm : buildHomeViewModel(state);
  const panel = vm.panel || {};

  const playerLevelNode = uiNode('playerLevelBadge', 'playerLevelBadge');
  if (playerLevelNode && playerLevelNode.textContent !== panel.playerLevel) {
    playerLevelNode.textContent = String(panel.playerLevel || 'LVL 1');
  }

  const playerNameNode = uiNode('playerNameValue', 'playerNameValue');
  if (playerNameNode && playerNameNode.textContent !== panel.playerName) {
    playerNameNode.textContent = String(panel.playerName || '');
  }
  const playerRoleNode = uiNode('playerRoleValue', 'playerRoleValue');
  if (playerRoleNode && playerRoleNode.textContent !== panel.playerRole) {
    playerRoleNode.textContent = String(panel.playerRole || '');
  }
  const playerXpNode = uiNode('playerXpValue', 'playerXpValue');
  if (playerXpNode) {
    playerXpNode.textContent = String(panel.xpText || '');
  }
  const playerXpFillNode = uiNode('playerXpFill', 'playerXpFill');
  if (playerXpFillNode) {
    playerXpFillNode.style.setProperty('--xp', String(Number(panel.xpPercent || 0)));
  }

  const coinNode = uiNode('currencyCoinValue', 'playerCoinValue');
  const gemNode = uiNode('currencyGemValue', 'playerGemValue');
  const starNode = uiNode('currencyStarValue', 'playerStarValue');
  if (coinNode) coinNode.textContent = String(panel.coinText || '');
  if (gemNode) gemNode.textContent = String(panel.gemText || '');
  if (starNode) starNode.textContent = String(panel.starText || '');

  const envTempNode = uiNode('envTemperatureValue', 'envTempValue');
  const envHumidityNode = uiNode('envHumidityValue', 'envHumidityValue');
  const envVpdNode = uiNode('envVpdValue', 'envVpdValue');
  const envLightNode = uiNode('envLightValue', 'envLightValue');
  const envAirflowNode = uiNode('envAirflowValue', 'envAirflowValue');
  const compactLightText = String(panel.envLightText || '').replace(/\s*PPFD\s*$/i, '').trim();
  if (envTempNode) envTempNode.textContent = String(panel.envTempText || '');
  if (envHumidityNode) envHumidityNode.textContent = String(panel.envHumidityText || '');
  if (envVpdNode) envVpdNode.textContent = String(panel.envVpdText || '');
  if (envLightNode) envLightNode.textContent = compactLightText;
  if (envAirflowNode) envAirflowNode.textContent = String(panel.envAirflowText || '');

  const rootPhNode = uiNode('rootPhValue', 'rootPhValue');
  const rootEcNode = uiNode('rootEcValue', 'rootEcValue');
  const rootHealthNode = uiNode('rootHealthValue', 'rootHealthValue');
  const rootOxygenNode = uiNode('rootOxygenValue', 'rootOxygenValue');
  if (rootPhNode) rootPhNode.textContent = String(panel.rootPhText || '');
  if (rootEcNode) rootEcNode.textContent = String(panel.rootEcText || '');
  if (rootHealthNode) rootHealthNode.textContent = String(panel.rootHealthText || '');
  if (rootOxygenNode) rootOxygenNode.textContent = String(panel.rootOxygenText || '');

  const controls = ensureEnvironmentControls(state);
  const setText = (id, text) => {
    const node = document.getElementById(id);
    if (node) node.textContent = String(text);
  };
  const setRange = (id, value) => {
    const node = document.getElementById(id);
    if (node && document.activeElement !== node) {
      node.value = String(value);
    }
  };

  setText('climateLiveTempValue', panel.envTempText || '');
  setText('climateLiveHumidityValue', panel.envHumidityText || '');
  setText('climateLiveVpdValue', panel.envVpdText || '');
  setText('climateLiveLightValue', panel.envLightText || '');
  setText('climateLiveAirflowValue', panel.envAirflowText || '');
  const liveReadout = deriveEnvironmentReadout(state);
  const homeClimateBadge = document.getElementById('homeClimateBadge');
  const homeClimateCard = document.getElementById('homeClimateCard');
  const climateSheet = document.getElementById('climateSheet');
  const climateStatusBadge = document.getElementById('climateStatusBadge');
  const climateStatusText = document.getElementById('climateStatusText');
  const climateModeAuto = document.getElementById('climateModeAuto');
  const climateModeManual = document.getElementById('climateModeManual');
  const climateModeDay = document.getElementById('climateModeDay');
  const climateModeNight = document.getElementById('climateModeNight');
  const climateModeSummary = document.getElementById('climateModeSummary');
  const climateModeCycleInfo = document.getElementById('climateModeCycleInfo');
  const climatePhaseValue = document.getElementById('climatePhaseValue');
  const climatePrimaryCards = document.querySelectorAll('.climate-primary-card');
  if (homeClimateBadge || homeClimateCard || climateSheet || climateStatusBadge || climateStatusText) {
    const vpd = Number(liveReadout && liveReadout.vpdKpa || 0);
    const climateState = (vpd >= 0.9 && vpd <= 1.5)
      ? 'optimal'
      : ((vpd >= 0.7 && vpd <= 1.7) ? 'watch' : 'alert');
    const climateTension = climateState === 'optimal'
      ? 'calm'
      : (climateState === 'watch' ? 'elevated' : 'critical');
    const climateLabel = climateState === 'optimal'
      ? 'Optimal'
      : (climateState === 'watch' ? 'Beobachten' : 'Alarm');
    if (homeClimateBadge) {
      homeClimateBadge.textContent = climateLabel;
      homeClimateBadge.dataset.state = climateState;
    }
    if (homeClimateCard) {
      homeClimateCard.dataset.state = climateState;
    }
    if (climateSheet) {
      climateSheet.dataset.state = climateState;
      climateSheet.dataset.tension = climateTension;
    }
    for (const card of climatePrimaryCards) {
      card.dataset.state = climateState;
      card.dataset.tension = climateTension;
    }
    if (climateStatusBadge) {
      climateStatusBadge.textContent = climateLabel;
      climateStatusBadge.dataset.state = climateState;
    }
    if (climateStatusText) {
      climateStatusText.textContent = climateState === 'optimal'
        ? 'VPD liegt im Zielkorridor und die Umgebung wirkt stabil.'
        : (climateState === 'watch'
          ? 'Die Umgebung ist noch kontrollierbar, braucht aber etwas Aufmerksamkeit.'
          : 'Klima driftet deutlich. Regelung oder Zielwerte sollten geprüft werden.');
    }
  }
  const autoModeActive = Boolean(controls.vpdTargetEnabled);
  if (climateModeAuto) {
    climateModeAuto.dataset.active = String(autoModeActive);
  }
  if (climateModeManual) {
    climateModeManual.dataset.active = String(!autoModeActive);
  }
  if (climateModeSummary) {
    climateModeSummary.textContent = autoModeActive
      ? 'Auto-Regelung priorisiert den VPD-Korridor bei laufender Gegensteuerung.'
      : 'Direkte Zielwerte stehen im Vordergrund. VPD-Regelung ist aktuell deaktiviert.';
  }
  const isDaytimeActive = Boolean(vm.isDaytime);
  if (climateModeDay) {
    climateModeDay.dataset.active = String(isDaytimeActive);
  }
  if (climateModeNight) {
    climateModeNight.dataset.active = String(!isDaytimeActive);
  }
  if (climateModeCycleInfo) {
    climateModeCycleInfo.textContent = isDaytimeActive
      ? 'Aktuell Tagphase. Tagesziele sind aktiv.'
      : 'Aktuell Nachtphase. Nachtziele steuern das Klima.';
  }
  if (climatePhaseValue) {
    climatePhaseValue.textContent = String(PHASE_LABEL_DE[state.plant.phase] || panel.phaseTitle || 'Unbekannt');
  }
  setText('envCtrlTempOut', `${controls.targets.day.temperatureC.toFixed(1)}°C`);
  setText('envCtrlHumidityOut', `${controls.targets.day.humidityPercent}%`);
  setText('envCtrlAirflowOut', `${controls.fan.minPercent}%`);
  setText('envCtrlNightTempOut', `${controls.targets.night.temperatureC.toFixed(1)}°C`);
  setText('envCtrlNightHumidityOut', `${controls.targets.night.humidityPercent}%`);
  setText('envCtrlDayVpdOut', `${controls.targets.day.vpdKpa.toFixed(2)} kPa`);
  setText('envCtrlNightVpdOut', `${controls.targets.night.vpdKpa.toFixed(2)} kPa`);
  setText('envCtrlFanMaxOut', `${controls.fan.maxPercent}%`);
  setText('envCtrlTempBufferOut', `${controls.buffers.temperatureC.toFixed(1)}°C`);
  setText('envCtrlHumidityBufferOut', `${controls.buffers.humidityPercent}%`);
  setText('envCtrlVpdBufferOut', `${controls.buffers.vpdKpa.toFixed(2)} kPa`);
  setText('envCtrlRampOut', `${Math.round(controls.ramp.percentPerMinute)}%/min`);
  setText('envCtrlTransitionOut', `${Math.round(controls.transitionMinutes)} min`);
  setText('envCtrlVpdEnabledOut', controls.vpdTargetEnabled ? 'An' : 'Aus');
  setText('envCtrlPhOut', `${controls.ph.toFixed(1)}`);
  setText('envCtrlEcOut', `${controls.ec.toFixed(1)} mS`);
  setText('envCtrlEcHint', 'nur über mineralisches Düngen');

  setRange('envCtrlTemp', controls.targets.day.temperatureC.toFixed(1));
  setRange('envCtrlHumidity', controls.targets.day.humidityPercent);
  setRange('envCtrlAirflow', controls.fan.minPercent);
  setRange('envCtrlNightTemp', controls.targets.night.temperatureC.toFixed(1));
  setRange('envCtrlNightHumidity', controls.targets.night.humidityPercent);
  setRange('envCtrlDayVpd', controls.targets.day.vpdKpa.toFixed(2));
  setRange('envCtrlNightVpd', controls.targets.night.vpdKpa.toFixed(2));
  setRange('envCtrlFanMax', controls.fan.maxPercent);
  setRange('envCtrlTempBuffer', controls.buffers.temperatureC.toFixed(1));
  setRange('envCtrlHumidityBuffer', controls.buffers.humidityPercent);
  setRange('envCtrlVpdBuffer', controls.buffers.vpdKpa.toFixed(2));
  setRange('envCtrlRamp', Math.round(controls.ramp.percentPerMinute));
  setRange('envCtrlTransition', Math.round(controls.transitionMinutes));
  const vpdToggle = document.getElementById('envCtrlVpdEnabled');
  if (vpdToggle && document.activeElement !== vpdToggle) {
    vpdToggle.checked = Boolean(controls.vpdTargetEnabled);
  }
  setRange('envCtrlPh', controls.ph.toFixed(1));
}

window.GrowSimHomeRenderer = Object.freeze({
  buildViewModel: (appState) => buildHomeViewModel(appState || state),
  update: (homeVm, prevVm) => updateHomeFromViewModel(homeVm, prevVm)
});

function getEnvironmentControlDefaults() {
  const envApi = window.GrowSimEnvModel;
  if (envApi && typeof envApi.getEnvironmentControlDefaults === 'function') {
    return envApi.getEnvironmentControlDefaults();
  }
  return {
    temperatureC: 25,
    humidityPercent: 60,
    airflowPercent: 70,
    ph: 6.0,
    ec: 1.4,
    targets: {
      day: { temperatureC: 25, humidityPercent: 60, vpdKpa: 1.2 },
      night: { temperatureC: 21, humidityPercent: 55, vpdKpa: 1.1 }
    },
    vpdTargetEnabled: false,
    fan: { minPercent: 70, maxPercent: 100 },
    buffers: { temperatureC: 0.7, humidityPercent: 4, vpdKpa: 0.12 },
    ramp: { percentPerMinute: 18 },
    transitionMinutes: 45
  };
}

function ensureEnvironmentControls(sourceState = state) { const target = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const envApi = window.GrowSimEnvModel;
  if (envApi && typeof envApi.normalizeEnvironmentControls === 'function') {
    return envApi.normalizeEnvironmentControls(target);
  }
  if (!target.environmentControls || typeof target.environmentControls !== 'object') {
    target.environmentControls = getEnvironmentControlDefaults();
  }
  const controls = target.environmentControls;
  controls.temperatureC = clamp(Number(controls.temperatureC), 16, 36);
  controls.humidityPercent = clampInt(Number(controls.humidityPercent), 30, 90);
  controls.airflowPercent = clampInt(Number(controls.airflowPercent), 0, 100);
  controls.ph = clamp(Number(controls.ph), 5.0, 7.0);
  controls.ec = clamp(Number(controls.ec), 0.6, 2.8);
  if (!controls.targets || typeof controls.targets !== 'object') controls.targets = {};
  if (!controls.targets.day || typeof controls.targets.day !== 'object') controls.targets.day = {};
  if (!controls.targets.night || typeof controls.targets.night !== 'object') controls.targets.night = {};
  controls.targets.day.temperatureC = clamp(Number(controls.targets.day.temperatureC || controls.temperatureC), 16, 36);
  controls.targets.day.humidityPercent = clampInt(Number(controls.targets.day.humidityPercent || controls.humidityPercent), 30, 90);
  controls.targets.day.vpdKpa = clamp(Number(controls.targets.day.vpdKpa || 1.2), 0.2, 3.0);
  controls.targets.night.temperatureC = clamp(Number(controls.targets.night.temperatureC || 21), 16, 36);
  controls.targets.night.humidityPercent = clampInt(Number(controls.targets.night.humidityPercent || 55), 30, 90);
  controls.targets.night.vpdKpa = clamp(Number(controls.targets.night.vpdKpa || 1.1), 0.2, 3.0);
  controls.vpdTargetEnabled = Boolean(controls.vpdTargetEnabled);
  if (!controls.fan || typeof controls.fan !== 'object') controls.fan = {};
  controls.fan.minPercent = clampInt(Number(controls.fan.minPercent || controls.airflowPercent), 0, 100);
  controls.fan.maxPercent = clampInt(Number(controls.fan.maxPercent || 100), controls.fan.minPercent, 100);
  if (!controls.buffers || typeof controls.buffers !== 'object') controls.buffers = {};
  controls.buffers.temperatureC = clamp(Number(controls.buffers.temperatureC || 0.7), 0.1, 4);
  controls.buffers.humidityPercent = clampInt(Number(controls.buffers.humidityPercent || 4), 1, 20);
  controls.buffers.vpdKpa = clamp(Number(controls.buffers.vpdKpa || 0.12), 0.02, 0.6);
  if (!controls.ramp || typeof controls.ramp !== 'object') controls.ramp = {};
  controls.ramp.percentPerMinute = clamp(Number(controls.ramp.percentPerMinute || 18), 1, 100);
  controls.transitionMinutes = clamp(Number(controls.transitionMinutes || 45), 1, 180);
  return controls;
}

function deriveAirflowLabel(airflowPercent) {
  if (airflowPercent >= 70) return 'Good';
  if (airflowPercent >= 40) return 'Mittel';
  return 'Schwach';
}

function onEnvironmentControlInput(controlKey, rawValue) {
  const controls = ensureEnvironmentControls(state);
  if (controlKey === 'vpdTargetEnabled') {
    controls.vpdTargetEnabled = Boolean(rawValue);
    renderHud();
    schedulePersistState();
    return;
  }
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    return;
  }
  if (controlKey === 'temperatureC') {
    controls.targets.day.temperatureC = clamp(value, 16, 36);
    controls.temperatureC = controls.targets.day.temperatureC;
  }
  if (controlKey === 'humidityPercent') {
    controls.targets.day.humidityPercent = clampInt(value, 30, 90);
    controls.humidityPercent = controls.targets.day.humidityPercent;
  }
  if (controlKey === 'airflowPercent') {
    const safeAirflow = clampInt(value, 0, 100);
    controls.fan.minPercent = safeAirflow;
    controls.fan.maxPercent = Math.max(safeAirflow, clampInt(Number(controls.fan.maxPercent), safeAirflow, 100));
    controls.airflowPercent = safeAirflow;
  }
  if (controlKey === 'nightTemperatureC') controls.targets.night.temperatureC = clamp(value, 16, 36);
  if (controlKey === 'nightHumidityPercent') controls.targets.night.humidityPercent = clampInt(value, 30, 90);
  if (controlKey === 'dayVpdKpa') controls.targets.day.vpdKpa = clamp(value, 0.2, 3.0);
  if (controlKey === 'nightVpdKpa') controls.targets.night.vpdKpa = clamp(value, 0.2, 3.0);
  if (controlKey === 'fanMaxPercent') controls.fan.maxPercent = clampInt(value, controls.fan.minPercent, 100);
  if (controlKey === 'tempBufferC') controls.buffers.temperatureC = clamp(value, 0.1, 4);
  if (controlKey === 'humidityBufferPercent') controls.buffers.humidityPercent = clampInt(value, 1, 20);
  if (controlKey === 'vpdBufferKpa') controls.buffers.vpdKpa = clamp(value, 0.02, 0.6);
  if (controlKey === 'rampPercentPerMinute') controls.ramp.percentPerMinute = clamp(value, 1, 100);
  if (controlKey === 'transitionMinutes') controls.transitionMinutes = clamp(value, 1, 180);
  if (controlKey === 'ph') controls.ph = clamp(value, 5.0, 7.0);
  if (controlKey === 'ec') {
    addLog('action', 'EC ist nicht direkt regelbar. Nutze mineralische Düngung.', { attemptedValue: value });
    return;
  }
  renderHud();
  schedulePersistState();
}

function deriveEnvironmentReadout(sourceState = state) { const activeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const controls = ensureEnvironmentControls(activeState);
  const envApi = window.GrowSimEnvModel;
  if (envApi && typeof envApi.buildEnvironmentReadoutFromState === 'function') {
    return envApi.buildEnvironmentReadoutFromState(activeState, activeState.status, activeState.simulation, activeState.plant);
  }

  const isDay = Boolean(activeState.simulation && activeState.simulation.isDaytime);
  const tentClimate = activeState.climate && activeState.climate.tent && typeof activeState.climate.tent === 'object' ? activeState.climate.tent : null;
  const temperatureC = clamp(
    Number.isFinite(Number(tentClimate && tentClimate.temperatureC)) ? Number(tentClimate.temperatureC) : Number(controls.temperatureC),
    10,
    40
  );
  const humidityPercent = clampInt(
    Number.isFinite(Number(tentClimate && tentClimate.humidityPercent)) ? Number(tentClimate.humidityPercent) : Number(controls.humidityPercent),
    0,
    100
  );
  const vpdKpa = clamp(0.7 + ((temperatureC - 21) * 0.08) + ((60 - humidityPercent) * 0.012), 0.4, 2.4); const ppfd = isDay ? Math.round(clamp(550 + (Number(activeState.status && activeState.status.growth || 0) * 2.4), 420, 980)) : 45;
  const airflowScore = clampInt(
    Number.isFinite(Number(tentClimate && tentClimate.airflowScore)) ? Number(tentClimate.airflowScore) : controls.airflowPercent,
    0,
    100
  );

  return {
    temperatureC,
    humidityPercent,
    vpdKpa,
    ppfd,
    airflowScore,
    airflowLabel: (tentClimate && tentClimate.airflowLabel) || deriveAirflowLabel(airflowScore)
  };
}

function deriveRootZoneReadout(environment, sourceState = state) { const activeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const controls = ensureEnvironmentControls(activeState);
  const envApi = window.GrowSimEnvModel;
  if (envApi && typeof envApi.buildRootZoneModelFromState === 'function') {
    const model = envApi.buildRootZoneModelFromState(activeState.status, environment, activeState.plant);
    return {
      ph: Number(controls.ph).toFixed(1),
      ec: `${Number(controls.ec).toFixed(1)} mS`,
      rootHealth: `${Math.round(model.rootHealthPercent)}%`,
      oxygen: `${Math.round(model.oxygenPercent)}%`
    };
  }

  const nutrition = clamp(Number(activeState.status && activeState.status.nutrition || 0), 0, 100);
  const water = clamp(Number(activeState.status && activeState.status.water || 0), 0, 100);
  const risk = clamp(Number(activeState.status && activeState.status.risk || 0), 0, 100);

  const phValue = clamp(Number(controls.ph), 5.0, 7.0);
  const ecValue = clamp(Number(controls.ec), 0.6, 2.8);
  const oxygenPercent = Math.round(clamp(92 - (water * 0.28) - (risk * 0.18), 32, 95));
  const rootHealthPercent = Math.round(clamp(55 + (nutrition * 0.32) - (risk * 0.25) - ((environment.vpdKpa - 1.2) * 12), 10, 99));

  return {
    ph: phValue.toFixed(1),
    ec: `${ecValue.toFixed(1)} mS`,
    rootHealth: `${rootHealthPercent}%`,
    oxygen: `${oxygenPercent}%`
  };
}

function formatCompactNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return Math.round(numeric).toLocaleString('de-DE');
}

const STAT_RING_UPDATE_IDS = new Set(['waterRing', 'nutritionRing', 'growthRing', 'riskRing']);
const STAT_UPDATE_ANIMATION_MS = 340;
const STAT_VALUE_TWEEN_MIN_MS = 220;
const STAT_VALUE_TWEEN_MAX_MS = 560;
const GUIDANCE_FRESH_ANIMATION_MS = 900;
const CARE_ACTION_FEEDBACK_ANIMATION_MS = 520;

function easeOutCubic(t) {
  const safeT = clamp(Number(t) || 0, 0, 1);
  return 1 - Math.pow(1 - safeT, 3);
}

function classifyStressVisualLevel(value) {
  const safe = clamp(Number(value) || 0, 0, 100);
  if (safe >= 78) return 'critical';
  if (safe >= 58) return 'high';
  if (safe >= 34) return 'elevated';
  return 'calm';
}

function classifyRiskVisualLevel(value) {
  const safe = clamp(Number(value) || 0, 0, 100);
  if (safe >= 82) return 'critical';
  if (safe >= 62) return 'high';
  if (safe >= 38) return 'elevated';
  return 'calm';
}

function classifyGrowthVisualLevel(growthValue, growthImpulse) {
  const growth = clamp(Number(growthValue) || 0, 0, 100);
  const impulse = Number(growthImpulse) || 0;
  if (impulse >= 1.18 || growth >= 72) return 'boosted';
  if (impulse >= 0.92 || growth >= 34) return 'steady';
  if (impulse <= 0.38 || growth <= 8) return 'stalled';
  return 'slow';
}

function applyPlantMotionState(vm) {
  const plantCanvas = uiNode('plantImage', 'plantImage');
  if (!plantCanvas || !vm || typeof vm !== 'object') {
    return;
  }
  const motion = vm.motion && typeof vm.motion === 'object' ? vm.motion : {};
  plantCanvas.dataset.growthVisual = String(motion.growthVisual || 'steady');
  plantCanvas.dataset.stressVisual = String(motion.stressVisual || 'calm');
  plantCanvas.dataset.riskVisual = String(motion.riskVisual || 'calm');
}

function triggerTransientClass(node, className, durationMs) {
  if (!node || !className) {
    return;
  }
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  clearTimeout(node._transientClassTimerId && node._transientClassTimerId[className]);
  node._transientClassTimerId = node._transientClassTimerId || {};
  node._transientClassTimerId[className] = setTimeout(() => {
    node.classList.remove(className);
  }, durationMs);
}

function animateRingValue(ringNode, textNode, targetValue) {
  if (!ringNode || !textNode) {
    return;
  }

  const target = clamp(Number(targetValue) || 0, 0, 100);
  const previousAnimatedValue = Number.isFinite(Number(ringNode.dataset.animatedValue))
    ? Number(ringNode.dataset.animatedValue)
    : (Number.isFinite(Number(ringNode.dataset.value)) ? Number(ringNode.dataset.value) : target);

  if (Math.abs(previousAnimatedValue - target) < 0.01) {
    const roundedText = String(Math.round(target));
    ringNode.style.setProperty('--value', roundedText);
    ringNode.dataset.value = roundedText;
    ringNode.dataset.animatedValue = String(target);
    if (textNode.textContent !== roundedText) {
      textNode.textContent = roundedText;
    }
    return;
  }

  if (ringNode._valueTweenRafId) {
    cancelAnimationFrame(ringNode._valueTweenRafId);
    ringNode._valueTweenRafId = 0;
  }

  const delta = Math.abs(target - previousAnimatedValue);
  const durationMs = clamp(Math.round(STAT_VALUE_TWEEN_MIN_MS + (delta * 8)), STAT_VALUE_TWEEN_MIN_MS, STAT_VALUE_TWEEN_MAX_MS);
  const startedAt = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();

  const tick = (timestamp) => {
    const now = Number(timestamp) || ((typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now());
    const progress = clamp((now - startedAt) / durationMs, 0, 1);
    const eased = easeOutCubic(progress);
    const currentValue = previousAnimatedValue + ((target - previousAnimatedValue) * eased);
    const roundedText = String(Math.round(currentValue));
    ringNode.style.setProperty('--value', String(round2(currentValue)));
    ringNode.dataset.value = roundedText;
    ringNode.dataset.animatedValue = String(round2(currentValue));
    ringNode.dataset.animating = progress < 1 ? 'true' : 'false';
    if (textNode.textContent !== roundedText) {
      textNode.textContent = roundedText;
    }

    if (progress < 1) {
      ringNode._valueTweenRafId = requestAnimationFrame(tick);
      return;
    }

    ringNode._valueTweenRafId = 0;
    ringNode.style.setProperty('--value', String(target));
    ringNode.dataset.value = String(Math.round(target));
    ringNode.dataset.animatedValue = String(target);
    ringNode.dataset.animating = 'false';
    textNode.textContent = String(Math.round(target));
  };

  ringNode._valueTweenRafId = requestAnimationFrame(tick);
}

function applyRingVisualState(ringNode, visualKey, visualState) {
  if (!ringNode) {
    return;
  }
  ringNode.dataset[visualKey] = String(visualState || 'calm');
}

function triggerCareActionVisualFeedback(action) {
  if (!action || !ui.careExecuteButton) {
    return;
  }
  const intensity = String(action.intensity || 'medium');
  triggerTransientClass(ui.careExecuteButton, `care-execute-btn--impact-${intensity}`, CARE_ACTION_FEEDBACK_ANIMATION_MS);
  if (ui.careFeedback) {
    triggerTransientClass(ui.careFeedback, 'care-feedback--fresh', CARE_ACTION_FEEDBACK_ANIMATION_MS);
  }
}

function triggerStatUpdateFeedback(ringNode, textNode) {
  if (!ringNode || !textNode) {
    return;
  }

  ringNode.classList.remove('stat-ring--updated');
  textNode.classList.remove('stat-value--updated');

  void ringNode.offsetWidth;

  ringNode.classList.add('stat-ring--updated');
  textNode.classList.add('stat-value--updated');

  clearTimeout(ringNode._statUpdateTimerId);
  ringNode._statUpdateTimerId = setTimeout(() => {
    ringNode.classList.remove('stat-ring--updated');
    textNode.classList.remove('stat-value--updated');
  }, STAT_UPDATE_ANIMATION_MS);
}

function setRing(ringNode, textNode, value) {
  if (!ringNode || !textNode) {
    return;
  }
  const rounded = Math.round(value);
  const roundedText = String(rounded);
  const previousValueText = ringNode.dataset.value;
  const valueChanged = previousValueText !== roundedText;

  if (valueChanged) {
    animateRingValue(ringNode, textNode, rounded);

    if (STAT_RING_UPDATE_IDS.has(ringNode.id) && previousValueText !== undefined) {
      triggerStatUpdateFeedback(ringNode, textNode);
    }
  } else if (textNode.textContent !== roundedText) {
    textNode.textContent = roundedText;
  }
}

function renderOverlayVisibility(visibleOverlayIds = null) {
  const activeOverlays = Array.isArray(visibleOverlayIds) ? visibleOverlayIds : (Array.isArray(state.ui && state.ui.visibleOverlayIds) ? state.ui.visibleOverlayIds : []);
  const nodes = {
    overlay_burn: ui.overlayBurn,
    overlay_def_mg: ui.overlayDefMg,
    overlay_def_n: ui.overlayDefN,
    overlay_mold_warning: ui.overlayMoldWarning,
    overlay_pest_mites: ui.overlayPestMites,
    overlay_pest_thrips: ui.overlayPestThrips
  };

  for (const [overlayId, node] of Object.entries(nodes)) {
    if (!node) {
      continue;
    }
    const hasSource = Boolean(node.getAttribute('src'));
    const visible = activeOverlays.includes(overlayId) && hasSource;
    node.classList.toggle('hidden', !visible);
  }
}

function renderPlantFallback(targetNode) {
  if (!targetNode || typeof targetNode.getContext !== 'function') {
    return;
  }
  const canvasMetrics = syncPlantCanvasToContainer(targetNode);
  const ctx = targetNode.getContext('2d', { alpha: true });
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, targetNode.width, targetNode.height);
  const w = canvasMetrics.widthPx;
  const h = canvasMetrics.heightPx;

  const plantRenderState = getPlantRenderSnapshot(state.plant);
  const stageIndex = clampInt(Number(plantRenderState.stageIndex), 0, PLANT_STAGE_IMAGES.length - 1);
  const assetPath = appPath(PLANT_STAGE_IMAGES[stageIndex] || PLANT_STAGE_IMAGES[0]);

  const img = new Image();
  img.onload = () => {
    const srcW = img.naturalWidth || 512;
    const srcH = img.naturalHeight || 512;
    const visibleBounds = getOpaqueBoundsForFallbackImage(img, assetPath);
    const placement = getHomePlantPlacement(srcW, srcH, visibleBounds, canvasMetrics, targetNode);

    ctx.clearRect(0, 0, targetNode.width, targetNode.height);
    ctx.drawImage(img, placement.dx, placement.dy, placement.drawW, placement.drawH);
    targetNode.dataset.fitScale = String(placement.fitScale);
    targetNode.dataset.anchorY = String(placement.anchorY);
    targetNode.dataset.canvasWidth = String(canvasMetrics.widthPx);
    targetNode.dataset.canvasHeight = String(canvasMetrics.heightPx);
  };
  img.onerror = () => {
    ctx.fillStyle = 'rgba(134, 167, 94, 0.85)';
    ctx.fillRect(Math.round(w * 0.48), Math.round(h * 0.45), Math.max(2, Math.round(w * 0.04)), Math.round(h * 0.3));
    ctx.fillStyle = 'rgba(164, 205, 110, 0.78)';
    ctx.beginPath();
    ctx.ellipse(Math.round(w * 0.5), Math.round(h * 0.38), Math.round(w * 0.13), Math.round(h * 0.11), 0, 0, Math.PI * 2);
    ctx.fill();
  };
  img.src = assetPath;

  targetNode.dataset.stageName = normalizeStageKey(plantRenderState.stageKey);
  state.plant.assets.basePath = 'assets/plant_growth/';
  state.plant.assets.resolvedStagePath = plantAssetPath(plantRenderState.stageKey);
}

function renderSheets() {
  const activeSheet = state.ui.openSheet;
  const showBackdrop = activeSheet !== null;

  if (ui.backdrop) {
    ui.backdrop.classList.toggle('hidden', !showBackdrop);
    ui.backdrop.setAttribute('aria-hidden', String(!showBackdrop));
    if (showBackdrop && activeSheet) {
      ui.backdrop.dataset.sheet = String(activeSheet);
    } else {
      ui.backdrop.removeAttribute('data-sheet');
    }
  }

  toggleSheet(ui.careSheet, activeSheet === 'care');
  toggleSheet(ui.climateSheet, activeSheet === 'climate');
  toggleSheet(ui.eventSheet, activeSheet === 'event');
  toggleSheet(ui.dashboardSheet, activeSheet === 'dashboard');
  toggleSheet(ui.diagnosisSheet, activeSheet === 'diagnosis');
  toggleSheet(ui.statDetailSheet, activeSheet === 'statDetail');
  toggleSheet(ui.missionsSheet, activeSheet === 'missions');
}

function renderGameMenu() {
  if (!ui.menuBackdrop || !ui.gameMenu || !ui.menuToggleBtn) {
    return;
  }

  const menuOpen = state.ui.menuOpen === true;
  const dialogOpen = state.ui.menuDialogOpen === true;

  ui.menuBackdrop.classList.toggle('hidden', !menuOpen);
  ui.menuBackdrop.setAttribute('aria-hidden', String(!menuOpen));
  ui.gameMenu.classList.toggle('hidden', !menuOpen);
  ui.gameMenu.setAttribute('aria-hidden', String(!menuOpen));
  ui.menuToggleBtn.setAttribute('aria-expanded', String(menuOpen));

  if (ui.menuDialog) {
    ui.menuDialog.classList.toggle('hidden', !dialogOpen);
    ui.menuDialog.setAttribute('aria-hidden', String(!dialogOpen));
  }

  renderMenuDynamicRows();
}

function renderMenuDynamicRows() {
  const menuProfileNameNode = uiNode('menuProfileNameValue', 'menuProfileNameValue');
  const menuProfileRoleNode = uiNode('menuProfileRoleValue', 'menuProfileRoleValue');
  const menuProfilePanel = buildHomeViewModel(state).panel || {};
  if (menuProfileNameNode) {
    menuProfileNameNode.textContent = String(menuProfilePanel.playerName || 'Grower');
  }
  if (menuProfileRoleNode) {
    menuProfileRoleNode.textContent = String(menuProfilePanel.playerRole || 'Starter');
  }

  if (!ui.menuRescueBtn || !ui.menuRescueSubtext || !ui.menuPushBtn || !ui.menuPushStatus) {
    return;
  }

  if (ui.menuStatsBtn) {
    ui.menuStatsBtn.setAttribute('title', 'Öffnet denselben Analyse-Report wie Analyse-Button und Death-Flow.');
  }
  if (ui.menuSupportBtn) {
    ui.menuSupportBtn.setAttribute('title', 'Öffnet Missionen und den aktuellen Fortschritt.');
  }
  if (ui.menuAboutBtn) {
    ui.menuAboutBtn.setAttribute('title', 'Zeigt den aktuellen Projektstatus. Weitere Hilfe folgt später.');
  }
  if (ui.menuLanguageBtn) {
    ui.menuLanguageBtn.setAttribute('title', 'Öffnet die lokal verfügbaren Einstellungen.');
  }
  if (ui.analyzeActionBtn) {
    ui.analyzeActionBtn.setAttribute('title', 'Öffnet den Analyse-Report und den protokollierten Run-Verlauf.');
  }
  const menuRescueLabel = document.getElementById('menuRescueLabel');
  if (ui.menuAchievementsBtn) {
    ui.menuAchievementsBtn.disabled = true;
    ui.menuAchievementsBtn.setAttribute('aria-disabled', 'true');
    ui.menuAchievementsBtn.classList.add('hidden');
    ui.menuAchievementsBtn.setAttribute('aria-hidden', 'true');
    ui.menuAchievementsBtn.setAttribute('title', 'Im aktuellen Build noch nicht freigeschaltet.');
  }
  if (ui.menuLeaderboardBtn) {
    ui.menuLeaderboardBtn.disabled = true;
    ui.menuLeaderboardBtn.setAttribute('aria-disabled', 'true');
    ui.menuLeaderboardBtn.classList.add('hidden');
    ui.menuLeaderboardBtn.setAttribute('aria-hidden', 'true');
    ui.menuLeaderboardBtn.setAttribute('title', 'Im aktuellen Build noch nicht freigeschaltet.');
  }

  const meta = getCanonicalMeta(state);
  const rescueUsed = Boolean(meta.rescue.used);
  const rescueBlocked = rescueAdPending || rescueUsed;
  const rescueNeeded = Boolean(isPlantDead() || (Number(state.status && state.status.health) || 0) < 20);
  ui.menuRescueBtn.disabled = rescueBlocked;
  ui.menuRescueBtn.setAttribute('aria-disabled', String(rescueBlocked));
  ui.menuRescueBtn.setAttribute('title', 'Kein Inventarsystem. Startet die gleiche einmalige Notfallrettung wie im Death-Overlay.');
  if (menuRescueLabel) {
    menuRescueLabel.textContent = 'Notfallrettung';
  }
  ui.menuRescueSubtext.textContent = rescueUsed ? '1× pro Run bereits genutzt.' : (meta.rescue.lastResult || (rescueNeeded ? 'Jetzt als Rettungsaktion verfügbar.' : '1× pro Run bei kritischem Zustand.'));

  const notifications = getCanonicalNotificationsSettings(state);
  const enabled = notifications.enabled === true;
  ui.menuPushBtn.setAttribute('aria-pressed', String(enabled));
  ui.menuPushStatus.textContent = notifications.lastMessage ? String(notifications.lastMessage) : (enabled ? 'Aktiviert' : 'Deaktiviert');
}

function toggleSheet(sheetNode, visible) {
  sheetNode.classList.toggle('hidden', !visible);
  sheetNode.setAttribute('aria-hidden', String(!visible));
}

function renderCareSheet(force = false) {
  if (!force && state.ui.openSheet !== 'care') {
    return;
  }

  if (!ui.careCategoryList || !ui.careActionList || !ui.careFeedback || !ui.careEffectsList || !ui.careExecuteButton) {
    return;
  }

  const careMapping = window.GrowSimScreenMappings && window.GrowSimScreenMappings.care;
  const careViewModel = careMapping && typeof careMapping.toViewModel === 'function' ? careMapping.toViewModel(state) : null; const catalog = Array.isArray(state.actions.catalog) ? state.actions.catalog : [];
  const categoryOrder = careViewModel && Array.isArray(careViewModel.categoryOrder) ? careViewModel.categoryOrder.slice() : ['watering', 'fertilizing', 'training', 'environment'];
  const categoryLabels = careViewModel && careViewModel.categoryLabels ? careViewModel.categoryLabels : {
      watering: 'Bewässerung',
      fertilizing: 'Nährstoffe',
      training: 'Training',
      environment: 'Umgebung'
    };
  const categoryIcons = {
    watering: '<img src="assets/ui/icons/icon_water.svg" alt="" aria-hidden="true">',
    fertilizing: '<img src="assets/ui/icons/icon_nutrients.svg" alt="" aria-hidden="true">',
    training: '<img src="assets/ui/icons/icon_growth.svg" alt="" aria-hidden="true">',
    environment: '<img src="assets/ui/icons/icon_airflow.svg" alt="" aria-hidden="true">'
  };

  const availableCategories = careViewModel && Array.isArray(careViewModel.availableCategories) ? careViewModel.availableCategories.slice() : categoryOrder.filter((category) => catalog.some((action) => action.category === category));
  if (!availableCategories.length) {
    console.warn('[care] renderCareSheet called with empty actions catalog', {
      catalogCount: catalog.length,
      selectedCategory: state.ui && state.ui.care ? state.ui.care.selectedCategory : null
    });
    ui.careCategoryList.replaceChildren();
    ui.careActionList.replaceChildren();
    ui.careEffectsList.replaceChildren();
    ui.careExecuteButton.disabled = true;
    setCareFeedback('error', 'Keine Aktionen geladen.');
    return;
  }

  if (!state.ui.care || !availableCategories.includes(state.ui.care.selectedCategory)) {
    state.ui.care = state.ui.care || {};
    state.ui.care.selectedCategory = availableCategories[0];
  }

  renderCareCategoryButtons(availableCategories, categoryLabels, categoryIcons);
  renderCareActionButtons(state.ui.care.selectedCategory, careViewModel);
  renderCareEffectsPanel(careViewModel);
  renderCareFeedback();
  renderCareExecuteButton();
}

function renderCareCategoryButtons(categories, labels, icons) {
  const signature = categories.join('|') + `|selected:${state.ui.care.selectedCategory}`;
  if (ui.careCategoryList.dataset.signature === signature) {
    return;
  }

  ui.careCategoryList.dataset.signature = signature;
  ui.careCategoryList.replaceChildren();
  const primitives = getUiPrimitives();

  for (const category of categories) {
    const btn = primitives && typeof primitives.button === 'function'
      ? primitives.button({ className: 'care-category-tab', attrs: { role: 'tab' } })
      : document.createElement('button');
    btn.type = 'button';
    if (!btn.classList.contains('care-category-tab')) {
      btn.className = 'care-category-tab';
    }
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(state.ui.care.selectedCategory === category));
    if (state.ui.care.selectedCategory === category) {
      btn.classList.add('care-category-tab-active');
    }
    btn.innerHTML = `<span class="care-category-icon" aria-hidden="true">${icons[category] || '◌'}</span><span class="care-category-label">${labels[category] || category}</span>`;
    btn.addEventListener('click', () => {
      state.ui.care.selectedCategory = category;
      state.ui.care.selectedActionId = null;
      state.ui.care.feedback = null;
      ui.careCategoryList.dataset.signature = '';
      ui.careActionList.dataset.signature = '';
      renderCareSheet(true);
    });
    ui.careCategoryList.appendChild(btn);
  }
}

function renderCareActionButtons(category, careViewModel = null) {
  const rawActions = careViewModel && Array.isArray(careViewModel.actions)
    ? careViewModel.actions
      .filter((action) => action.category === category)
    : state.actions.catalog
      .filter((action) => action.category === category)
      .slice();

  const actions = rawActions
    .map((action) => {
      const cooldownUntil = Number(
        Object.prototype.hasOwnProperty.call(action, 'cooldownUntil') ? action.cooldownUntil : state.actions.cooldowns[action.id] || 0
      );
      const cooldownLeftMs = Math.max(0, cooldownUntil - Date.now());
      const availability = getActionAvailability(state.actions.byId[action.id] || action);
      const priority = getActionPriorityTier(state.actions.byId[action.id] || action, availability, cooldownLeftMs, careViewModel);
      return {
        ...action,
        cooldownUntil,
        cooldownLeftMs,
        availability,
        tier: priority.tier,
        hintSummary: priority.hintSummary
      };
    })
    .sort((a, b) => {
      const tierOrder = {
        primary: 0,
        secondary: 1,
        cooldown: 2,
        blocked: 3
      };
      if (tierOrder[a.tier] !== tierOrder[b.tier]) {
        return tierOrder[a.tier] - tierOrder[b.tier];
      }
      return intensityRank(a.intensity) - intensityRank(b.intensity);
    });

  const selectableIds = new Set(actions
    .filter((action) => action.tier === 'primary' || action.tier === 'secondary')
    .map((action) => action.id));
  if (state.ui.care.selectedActionId && !selectableIds.has(state.ui.care.selectedActionId)) {
    state.ui.care.selectedActionId = null;
  }

  const signature = actions.map((action) => {
    return `${action.id}:${action.cooldownUntil}:${action.tier}:${action.availability.reason || 'ok'}:selected:${state.ui.care.selectedActionId === action.id}`;
  }).join('|');

  if (ui.careActionList.dataset.signature === signature) {
    return;
  }

  ui.careActionList.dataset.signature = signature;
  ui.careActionList.replaceChildren();
  const primitives = getUiPrimitives();
  const primaryActions = actions.filter((action) => action.tier === 'primary');
  const secondaryActions = actions.filter((action) => action.tier === 'secondary');
  const cooldownActions = actions.filter((action) => action.tier === 'cooldown');
  const blockedActions = actions.filter((action) => action.tier === 'blocked');

  const appendSectionLabel = (text, tone = 'default') => {
    const section = document.createElement('div');
    section.className = `care-action-section-label care-action-section-label--${tone}`;
    section.textContent = text;
    ui.careActionList.appendChild(section);
  };

  const appendFullActionCard = (action) => {
    const cooldownLeft = Math.max(0, Number(action.cooldownLeftMs) || 0);
    const cooldownText = cooldownLeft > 0 ? `${Math.ceil(cooldownLeft / 60000)} min` : `${Math.round(action.cooldownRealMinutes || 0)} min`;
    const hintText = action.hintSummary && action.hintSummary.topHint
      ? (() => {
        const hintCopy = getCareHintCopy(action.hintSummary.topHint);
        return hintCopy.headline || hintCopy.explanation || formatActionHint(action, cooldownLeft);
      })()
      : formatActionHint(action, cooldownLeft);

    const button = primitives && typeof primitives.button === 'function'
      ? primitives.button({ className: 'care-action-card' })
      : document.createElement('button');
    button.type = 'button';
    if (!button.classList.contains('care-action-card')) {
      button.className = 'care-action-card';
    }
    if (state.ui.care.selectedActionId === action.id) {
      button.classList.add('is-selected');
    }
    if (action.tier === 'primary') {
      button.classList.add('is-primary');
    }
    button.setAttribute('aria-pressed', String(state.ui.care.selectedActionId === action.id));
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');

    button.innerHTML = `
      <div class="care-action-icon-box">
        <img src="${getActionIconPath(action)}" class="care-action-card-icon" alt="" aria-hidden="true">
      </div>
      <div class="care-action-info-box">
        <span class="care-action-label">${escapeHtml(action.label)}</span>
        <span class="care-action-hint" title="${escapeHtml(`Cooldown: ${cooldownText}`)}">${escapeHtml(hintText)}</span>
      </div>`;

    button.addEventListener('click', () => {
      state.ui.care.selectedActionId = action.id;
      state.ui.care.feedback = null;
      ui.careActionList.dataset.signature = '';
      renderCareSheet(true);
    });

    ui.careActionList.appendChild(button);
  };

  const appendCompactActionGroup = (entries, tone, maxVisible, hiddenSummaryText) => {
    if (!entries.length) {
      return;
    }
    const list = document.createElement('div');
    list.className = `care-action-compact-list care-action-compact-list--${tone}`;
    const visibleEntries = entries.slice(0, maxVisible);

    for (const action of visibleEntries) {
      const row = document.createElement('div');
      row.className = `care-action-compact-card care-action-compact-card--${tone}`;
      row.innerHTML = `
        <span class="care-action-compact-label">${escapeHtml(action.label)}</span>
        <span class="care-action-compact-hint">${escapeHtml(getCompactActionSummaryText(action))}</span>
      `;
      list.appendChild(row);
    }

    const hiddenCount = Math.max(0, entries.length - visibleEntries.length);
    if (hiddenCount > 0) {
      const more = document.createElement('div');
      more.className = 'care-action-compact-more';
      more.textContent = hiddenSummaryText.replace('{count}', String(hiddenCount));
      list.appendChild(more);
    }

    ui.careActionList.appendChild(list);
  };

  if (primaryActions.length) {
    appendSectionLabel('Jetzt sinnvoll', 'primary');
    primaryActions.forEach(appendFullActionCard);
  }

  if (secondaryActions.length) {
    appendSectionLabel(primaryActions.length ? 'Situativ möglich' : 'Aktuell am ehesten passend', primaryActions.length ? 'secondary' : 'primary');
    secondaryActions.forEach(appendFullActionCard);
  }

  if (cooldownActions.length) {
    appendSectionLabel('Gerade im Cooldown', 'cooldown');
    appendCompactActionGroup(cooldownActions, 'cooldown', 2, '+ {count} weitere Aktionen laden noch nach.');
  }

  if (blockedActions.length) {
    appendSectionLabel('Gerade keine gute Idee', 'blocked');
    appendCompactActionGroup(blockedActions, 'blocked', 2, '+ {count} weitere Aktionen passen gerade nicht.');
  }
}

function formatEffectsInline(action) { const immediate = action && action.effects && action.effects.immediate ? action.effects.immediate : {};
  if (Array.isArray(immediate)) {
    return immediate.map((effect) => (effect && effect.label ? String(effect.label) : null))
      .filter(Boolean)
      .slice(0, 2)
      .join(' · ') || 'Keine direkten Effekte';
  }
  const map = [
    ['water', 'Feuchtigkeit'],
    ['nutrition', 'Nährstoffe'],
    ['growth', 'Wachstum'],
    ['stress', 'Stress'],
    ['risk', 'Risiko']
  ];
  const parts = [];
  for (const [key, label] of map) {
    const value = Number(immediate[key] || 0);
    if (!value) continue; parts.push(`${label} ${value > 0 ? '+' : ''}${round2(value)}`);
  }
  return parts.slice(0, 2).join(' · ') || 'Keine direkten Effekte';
}

function formatActionHint(action, cooldownLeft) {
  if (cooldownLeft > 0) {
    return `Cooldown ${Math.ceil(cooldownLeft / 60000)} min`;
  } const shortCopy = action && action.uxCopy && action.uxCopy.short ? String(action.uxCopy.short) : '';
  if (shortCopy) {
    return shortCopy;
  }
  return formatEffectsInline(action);
}

const CARE_HINT_COPY_BY_KEY = Object.freeze({
  watering_late_flower_humid: ['Zusätzliches Gießen erhöht hier gerade den Krankheitsdruck.', 'In der späten Blüte bleibt die Zone unter feuchten Bedingungen leichter zu nass.'],
  watering_root_pressure: ['Mehr Wasser verschärft hier gerade den Druck an den Wurzeln.', 'Das Medium wirkt bereits stark belastet.'],
  watering_still_wet: ['Mehr Wasser belastet die Wurzelzone gerade eher.', 'Das Medium ist noch recht feucht.'],
  watering_good_fit: ['Diese Wassergabe passt gerade gut.', 'Das Medium wirkt trocken genug.'],
  watering_feed_solution_pressure: ['Nährlösung kann die Wurzelzone gerade stärker belasten.', 'Sie trägt schon spürbar Druck.'],
  watering_feed_solution_positive: ['Nährlösung passt gerade gut.', 'Die Pflanze wirkt aufnahmefähig.'],
  watering_flush_positive: ['Spülen kann hier gerade etwas Druck aus der Wurzelzone nehmen.', 'Die Zone wirkt belastet.'],
  watering_flush_caution: ['Spülen zieht hier leicht unnötig Substanz aus dem Medium.', 'Die Pflanze wirkt aktuell nicht stark belastet.'],
  watering_dry_air: ['Stärkeres Gießen beruhigt das Klima gerade kaum.', 'Die Luft ist sehr trocken und der Rhythmus wird dadurch eher unruhig.'],
  fertilizing_seedling_warning: ['Kräftige Fütterung kostet hier schnell Stabilität.', 'Junge Pflanzen reagieren darauf besonders empfindlich.'],
  fertilizing_pressure_warning: ['Mehr Futter erhöht hier gerade das Risiko.', 'Die Wurzelzone steht schon unter Nährstoffdruck.'],
  fertilizing_stressed_warning: ['Zusätzliche Nährstoffe belasten die Pflanze gerade eher.', 'Sie steht bereits unter Druck.'],
  fertilizing_dry_medium: ['Fütterung fällt im trockenen Medium gerade härter aus.', 'Etwas sanftere Versorgung wäre jetzt schonender.'],
  fertilizing_positive: ['Eine passende Fütterung ist gerade sinnvoll.', 'Die Pflanze wirkt aufnahmefähig.'],
  fertilizing_late_flower_caution: ['Zusätzlicher Druck wirkt jetzt schneller nach.', 'In der späten Blüte zahlt sich stabile Führung besonders aus.'],
  training_seedling_warning: ['Training kostet dich hier gerade Stabilität.', 'Junge Pflanzen reagieren empfindlich auf Eingriffe.'],
  training_late_flower_warning: ['Stärkere Eingriffe kosten jetzt deutlich mehr Erholung.', 'In der späten Blüte kommt Stabilität langsamer zurück.'],
  training_early_flower_caution: ['Zu viel Eingriff kostet jetzt leichter Energie.', 'In der frühen Blüte sollte Training vorsichtiger werden.'],
  training_stress_warning: ['Training kostet gerade eher Erholung als Fortschritt.', 'Die Pflanze steht bereits unter Druck.'],
  training_dry_air_caution: ['Eingriffe fühlen sich jetzt deutlich härter an.', 'Die Luft wirkt gerade ziehend und fordernd.'],
  training_heat_caution: ['Wärme macht Eingriffe gerade deutlich belastender.', 'Etwas mehr Ruhe wäre jetzt oft sauberer.'],
  training_positive: ['Leichtes Training passt gerade gut.', 'Die Pflanze wirkt stabil.'],
  environment_humid_warning: ['Eine Umgebungsmaßnahme ist hier jetzt besonders sinnvoll.', 'Feuchte Luft steht gerade zu lange im Bestand.'],
  environment_late_flower_caution: ['Stehende Feuchte wird jetzt schneller problematisch.', 'In der späten Blüte passt ein saubereres Klima besonders gut.'],
  environment_low_pressure: ['Der direkte Effekt dürfte gerade eher klein sein.', 'Aktuell ist wenig Druck im System.'],
  environment_positive: ['Die Lage spricht gerade klar für eine Umgebungsmaßnahme.', 'Sie kann Druck senken, ohne die Pflanze direkt zu belasten.']
});

function splitCareHintMessage(message) {
  const text = String(message || '').trim();
  if (!text) {
    return { headline: '', explanation: '' };
  }

  const parts = text
    .split(/(<=[.!])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      headline: parts[0],
      explanation: parts.slice(1).join(' ')
    };
  }

  return {
    headline: text,
    explanation: ''
  };
}

function getCareHintCopy(hint) { const key = hint && hint.key ? String(hint.key) : ''; const mapped = key ? CARE_HINT_COPY_BY_KEY[key] : null;
  if (mapped) {
    return {
      headline: String(mapped[0] || '').trim(),
      explanation: String(mapped[1] || '').trim()
    };
  }
  return splitCareHintMessage(hint && hint.message);
}

function renderCareEffectsPanel(careViewModel = null) {
  ui.careEffectsList.replaceChildren();

  const appendSectionLabel = (text, tone = '') => {
    const li = document.createElement('li'); li.className = tone ? `care-section-label care-section-label--${tone}` : 'care-section-label';
    li.textContent = text;
    ui.careEffectsList.appendChild(li);
  };

  const appendEmptyRow = (text) => {
    const li = document.createElement('li');
    li.className = 'care-empty-row';
    li.textContent = text;
    ui.careEffectsList.appendChild(li);
  };

  const selected = state.actions.byId[state.ui.care.selectedActionId || ''];
  if (ui.carePreviewWrap) {
    ui.carePreviewWrap.classList.add('hidden');
    ui.carePreviewWrap.setAttribute('aria-hidden', 'true');
  }
  if (ui.carePreviewImage) {
    ui.carePreviewImage.removeAttribute('src');
    ui.carePreviewImage.alt = '';
  }
  if (ui.carePreviewLabel) {
    ui.carePreviewLabel.textContent = '';
  }
  if (ui.carePreviewNote) {
    ui.carePreviewNote.textContent = '';
  }

  if (!selected) {
    appendEmptyRow('Keine Aktion ausgewählt.');
    return;
  }

  const hintApi = window.GrowSimCareActionHints;
  let renderedHints = 0;
  if (hintApi && typeof hintApi.buildCareActionContext === 'function' && typeof hintApi.selectTopHints === 'function') { const baseContext = careViewModel && careViewModel.context ? careViewModel.context : state;
    const hintContext = hintApi.buildCareActionContext(baseContext, selected);
    let hints = [];

    if (selected.category === 'watering' && typeof hintApi.evaluateWateringHints === 'function') {
      hints = hintApi.evaluateWateringHints(hintContext);
    } else if (selected.category === 'fertilizing' && typeof hintApi.evaluateFertilizingHints === 'function') {
      hints = hintApi.evaluateFertilizingHints(hintContext);
    } else if (selected.category === 'training' && typeof hintApi.evaluateTrainingHints === 'function') {
      hints = hintApi.evaluateTrainingHints(hintContext);
    } else if (selected.category === 'environment' && typeof hintApi.evaluateEnvironmentHints === 'function') {
      hints = hintApi.evaluateEnvironmentHints(hintContext);
    }

    const topHints = hintApi.selectTopHints(hints, 2);
    if (topHints.length) {
      appendSectionLabel('Hinweise zur aktuellen Lage', 'hints');
    }
    for (const hint of topHints) {
      const li = document.createElement('li');
      li.className = `care-hint-item care-hint-item--${hint.severity}`;
      const hintCopy = getCareHintCopy(hint);
      const severityLabel = hint.severity === 'warning' ? 'Warnung' : (hint.severity === 'caution' ? 'Vorsicht' : 'Empfehlung');
      li.setAttribute('aria-label', severityLabel);
      li.innerHTML = `
        <div class="care-hint-head">
          <span class="care-hint-marker" aria-hidden="true"></span>
        </div>
        <strong class="care-hint-headline">${escapeHtml(hintCopy.headline || hint.message)}</strong>${hintCopy.explanation ? `<p class="care-hint-message">${escapeHtml(hintCopy.explanation)}</p>` : ''}
      `;
      ui.careEffectsList.appendChild(li);
      renderedHints += 1;
    }
  }
  appendSectionLabel('Auswirkungen der Aktion', renderedHints ? 'effects' : '');
  const immediate = selected.effects && selected.effects.immediate ? selected.effects.immediate : {};
  if (Array.isArray(immediate)) {
    const labels = {
      water: 'Feuchtigkeit',
      nutrition: 'Nährstoffe',
      growth: 'Wachstum',
      stress: 'Stress',
      risk: 'Risiko',
      health: 'Gesundheit'
    };
    for (const effect of immediate) {
      if (!effect || typeof effect !== 'object') {
        continue;
      }
      const li = document.createElement('li');
      li.className = 'care-effect-row';
      const statLabel = labels[String(effect.stat || '')] || 'System';
      li.innerHTML = `<span>${escapeHtml(statLabel)}</span><strong>${escapeHtml(String(effect.label || 'Systemeingriff'))}</strong>`;
      ui.careEffectsList.appendChild(li);
    }

    if (!ui.careEffectsList.children.length) {
      appendEmptyRow('Keine unmittelbaren Effekte.');
    }
    return;
  }
  const effectRows = [
    ['water', 'Feuchtigkeit'],
    ['nutrition', 'Nährstoffe'],
    ['growth', 'Wachstum'],
    ['stress', 'Stress'],
    ['risk', 'Risiko'],
    ['health', 'Gesundheit']
  ];

  for (const [key, label] of effectRows) {
    const value = Number(immediate[key] || 0);
    if (!value) {
      continue;
    }
    const li = document.createElement('li');
    li.className = 'care-effect-row'; li.innerHTML = `<span>${label}</span><strong>${value > 0 ? '+' : ''}${round2(value)}</strong>`;
    ui.careEffectsList.appendChild(li);
  }

  if (!ui.careEffectsList.querySelector('.care-effect-row')) {
    appendEmptyRow('Keine unmittelbaren Effekte.');
  }
}

function renderCareExecuteButton() {
  const selected = state.actions.byId[state.ui.care.selectedActionId || ''];
  const availability = selected ? getActionAvailability(selected) : { ok: false };
  const cooldownUntil = selected ? Number(state.actions.cooldowns[selected.id] || 0) : 0;
  ui.careExecuteButton.disabled = !selected || !availability.ok || cooldownUntil > Date.now();
}

function onCareExecuteAction() {
  const action = state.actions.byId[state.ui.care.selectedActionId || ''];
  if (!action) {
    setCareFeedback('error', 'Bitte zuerst eine Aktion wählen.');
    renderCareSheet(true);
    return;
  }

  const result = executeCareAction(action.id);
  if (result.ok) { const baseMessage = action.uxCopy && action.uxCopy.success ? action.uxCopy.success : `${action.label} ausgeführt.`;
    const detail = String(result.guidanceHint || '').trim();
    setCareFeedback('success', detail ? `${baseMessage} ${detail}` : baseMessage);
    triggerCareActionVisualFeedback(action);
    state.ui.care.selectedActionId = null;
  } else {
    setCareFeedback('error', explainActionFailure(result.reason));
  }

  ui.careActionList.dataset.signature = '';
  renderCareSheet(true);
  renderHud();
}

function renderCareFeedback() {
  const selected = state.actions.byId[state.ui.care.selectedActionId || ''];
  const availability = selected ? getActionAvailability(selected) : null;
  const cooldownUntil = selected ? Number(state.actions.cooldowns[selected.id] || 0) : 0;
  const cooldownReason = cooldownUntil > Date.now() ? `cooldown_active:${Math.ceil((cooldownUntil - Date.now()) / 1000)}s` : '';
  const softReason = selected && availability && availability.ok && availability.soft
    ? (availability.note || 'Verfügbar, aber heute weniger effizient und etwas riskanter.')
    : '';
  const feedback = (state.ui.care && state.ui.care.feedback)
    || { kind: 'info', text: selected ? (cooldownReason ? explainActionFailure(cooldownReason) : (availability && !availability.ok ? explainActionFailure(availability.reason) : (softReason || 'Bereit zur Ausführung'))) : 'Wähle eine Aktion.' };
  ui.careFeedback.textContent = feedback.text;
  ui.careFeedback.classList.toggle('is-info', feedback.kind === 'info');
  ui.careFeedback.classList.toggle('is-success', feedback.kind === 'success');
  ui.careFeedback.classList.toggle('is-error', feedback.kind === 'error');
}

function setCareFeedback(kind, text) {
  state.ui.care = state.ui.care || {};
  state.ui.care.feedback = { kind, text };
  renderCareFeedback();
}

function labelForIntensity(intensity) {
  if (intensity === 'low') return 'Niedrig';
  if (intensity === 'high') return 'Hoch';
  return 'Mittel';
}

function intensityRank(intensity) {
  if (intensity === 'low') return 0;
  if (intensity === 'medium') return 1;
  if (intensity === 'high') return 2;
  return 3;
}

function explainActionFailure(reason) {
  const value = String(reason || 'action_failed');
  if (value.startsWith('cooldown_active:')) {
    return `Aktion blockiert: ${value.replace('cooldown_active:', 'Abklingzeit noch ')}`;
  }
  if (value.startsWith('prereq_min_failed:') || value.startsWith('prereq_max_failed:')) {
    const [prefix, rawMetric] = value.split(':');
    const metric = String(rawMetric || '').trim();
    const metricLabels = {
      water: {
        min: 'Das Medium ist dafür noch zu trocken oder instabil.',
        max: 'Das Medium ist dafür aktuell zu feucht.'
      },
      nutrition: {
        min: 'Die Nährstofflage ist dafür noch zu leer.',
        max: 'Die Wurzelzone steht dafür schon unter Nährstoffdruck.'
      },
      health: {
        min: 'Die Pflanze sollte dafür erst stabiler sein.',
        max: 'Dafür ist gerade kein echter Gesundheitsdruck da.'
      },
      stress: {
        min: 'Dafür fehlt gerade der nötige Problemdruck.',
        max: 'Die Pflanze ist dafür aktuell zu gestresst.'
      },
      risk: {
        min: 'Dafür fehlt gerade ein echter Risikoanlass.',
        max: 'Die Lage ist dafür aktuell zu kritisch.'
      }
    };
    const typeKey = prefix === 'prereq_min_failed' ? 'min' : 'max';
    return metricLabels[metric] && metricLabels[metric][typeKey]
      ? metricLabels[metric][typeKey]
      : `Voraussetzung nicht erfüllt (${metric || 'unbekannt'}).`;
  }
  if (value.startsWith('outside_time_window:')) {
    return 'Aktion nur tagsüber verfügbar.';
  }
  if (value.startsWith('stage_too_low:')) {
    return 'Aktion für diese Phase noch nicht freigeschaltet.';
  }
  if (value === 'dead_run_ended') {
    return 'Aktion nicht möglich: Die Pflanze ist eingegangen.';
  }
  return `Aktion blockiert (${value}).`;
}

function describeActiveEventContext(eventDef) {
  const eventId = String(eventDef && eventDef.id || '');
  const category = String(eventDef && eventDef.category || state.events.activeCategory || 'generic').toLowerCase();
  const tags = Array.isArray(eventDef && eventDef.tags) ? eventDef.tags.map((tag) => String(tag).toLowerCase()) : [];
  const env = deriveEnvironmentReadout();
  const roots = deriveRootZoneReadout(env);

  const temperature = Number(env.temperatureC || 0);
  const humidity = Number(env.humidityPercent || 0);
  const vpd = Number(env.vpdKpa || 0);
  const airflow = Number.isFinite(Number(env.airflowScore))
    ? Number(env.airflowScore)
    : (env.airflowLabel === 'Good' ? 80 : (env.airflowLabel === 'Mittel' ? 55 : 30));
  const instability = Number(env.instabilityScore || 0);
  const rootOxygen = Number(String(roots.oxygen || '').replace('%', '')) || 0;
  const rootHealth = Number(String(roots.rootHealth || '').replace('%', '')) || 0;
  const rootEc = Number(String(roots.ec || '').replace(/\s*mS$/i, '')) || 0;
  const rootPh = Number(roots.ph || 0);

  if (eventId === 'v2_water_dry_pot') {
    return {
      cause: 'Topf und Blattmasse ziehen gerade zu stark am Wasserhaushalt.',
      focus: 'Langsam und gleichmaessig rehydrieren, nicht nur schnell nachkippen.'
    };
  }
  if (eventId === 'v2_water_overwater_warning' || eventId === 'v2_disease_root_warning') {
    return {
      cause: `Die Wurzelzone bleibt zu nass; Sauerstoff und Root-Health geraten unter Druck (${Math.round(rootOxygen)}% O2).`,
      focus: 'Jetzt Wasserdruck rausnehmen und die Wurzelzone wieder atmen lassen.'
    };
  }
  if (eventId === 'v2_nutrition_lockout') {
    return {
      cause: `Die Aufnahme stockt trotz voller Naehrstofflage; EC/pH deuten auf Wurzeldruck (${rootEc.toFixed(1)} mS, pH ${rootPh.toFixed(1)}).`,
      focus: 'Nicht weiter pushen; zuerst die Wurzelzone wieder aufnahmefaehig machen.'
    };
  }
  if (eventId === 'v2_environment_heat_spike' || eventId === 'v2_climate_heat_stress') {
    return {
      cause: `Hitze und VPD treiben den Wasserverlust hoch (${temperature.toFixed(1)} C, VPD ${vpd.toFixed(2)}).`,
      focus: 'Klimalast senken; zusaetzliches Futter loest dieses Problem nicht.'
    };
  }
  if (eventId === 'v2_environment_cold_night') {
    return {
      cause: `Die Nacht ist fuer die aktuelle Belastung zu kuehl geworden (${temperature.toFixed(1)} C).`,
      focus: 'Temperatur beruhigen statt tagsueber aggressiver gegensteuern.'
    };
  }
  if (
    eventId === 'v2_disease_mold_pocket'
    || eventId === 'v2_outdoor_rain_series'
    || eventId === 'v2_climate_flower_humidity_risk'
    || eventId === 'v2_climate_stagnant_air_warning'
  ) {
    return {
      cause: `Feuchte Luft und stehende Zonen bauen Krankheitsdruck auf (${Math.round(humidity)}% RH, Airflow ${Math.round(airflow)}).`,
      focus: 'Luftbewegung und trockenere Mikroklimata helfen hier mehr als weitere Fuetterung.'
    };
  }
  if (eventId === 'v2_outdoor_storm_front' || eventId === 'v2_special_weather_shift' || eventId === 'v2_climate_instability_warning') {
    return {
      cause: `Das Mikroklima schwankt zu stark und erzeugt unruhigen Belastungsdruck (Instabilitaet ${Math.round(instability)}).`,
      focus: 'Kurz stabilisieren und danach beobachten, statt hektisch mehrere Systeme zu ziehen.'
    };
  }
  if (
    eventId === 'v2_positive_ideal_mild_days'
    || eventId === 'v2_positive_outdoor_sun_window'
    || eventId === 'v2_climate_ideal_vpd_boost'
    || eventId === 'v2_climate_stable_comfort_bonus'
    || eventId === 'v2_climate_airflow_mold_guard'
    || eventId === 'v2_climate_veg_leaf_expansion'
  ) {
    return {
      cause: `Klima, Stress und Wurzelzone laufen gerade sauber zusammen (${Math.round(rootHealth)}% Root-Health).`,
      focus: 'Das ist ein verdientes Stabilitaetsfenster, kein Freifahrtschein fuer harte Eingriffe.'
    };
  }

  if (category === 'water') {
    return {
      cause: 'Der Wasserhaushalt ist aus dem Gleichgewicht geraten.',
      focus: 'Erst den Wasserzustand sauber einfangen, dann weiter optimieren.'
    };
  }
  if (category === 'nutrition') {
    return {
      cause: 'Die Naehrstofflage passt nicht mehr sauber zur Aufnahmefaehigkeit der Wurzeln.',
      focus: 'Korrektur vor Eskalation: Ursache pruefen, nicht blind nachlegen.'
    };
  }
  if (category === 'environment' || tags.includes('climate')) {
    return {
      cause: 'Klima und Belastung laufen gerade nicht sauber zusammen.',
      focus: 'Mit kleinen Klimakorrekturen Druck rausnehmen, statt auf einen Wert zu starren.'
    };
  }
  if (category === 'disease' || category === 'pest') {
    return {
      cause: 'Risiko, Feuchte oder Stress haben ein biologisches Folgeproblem beguenstigt.',
      focus: 'Frueh gegensteuern, bevor aus Warnzeichen ein echter Schaden wird.'
    };
  }
  if (category === 'positive') {
    return {
      cause: 'Die Pflanze laeuft gerade in einem ruhigen, belastbaren Fenster.',
      focus: 'Stabil bleiben; nur kleine, passende Schritte nutzen dieses Momentum sauber.'
    };
  }

  return {
    cause: '',
    focus: ''
  };
}

function renderEventSheet() {
  if (state.ui.openSheet !== 'event' && !['activeEvent', 'resolving', 'resolved'].includes(state.events.machineState)) {
    return;
  }

  if (ui.eventImageWrap && ui.eventImage) { const imagePath = state.events.machineState === 'activeEvent' ? String(state.events.activeImagePath || '') : '';
    if (imagePath) {
      ui.eventImage.src = imagePath; ui.eventImage.alt = state.events.activeEventTitle ? `${state.events.activeEventTitle} – Ereignisbild` : 'Ereignisbild';
      ui.eventImageWrap.classList.remove('hidden');
      ui.eventImageWrap.setAttribute('aria-hidden', 'false');
    } else {
      ui.eventImage.removeAttribute('src');
      ui.eventImage.alt = '';
      ui.eventImageWrap.classList.add('hidden');
      ui.eventImageWrap.setAttribute('aria-hidden', 'true');
    }
  }

  ui.eventStateBadge.textContent = `Status: ${translateEventState(state.events.machineState)}`;

  if (state.events.machineState === 'activeEvent') {
    const eventDef = Array.isArray(state.events.catalog)
      ? state.events.catalog.find((entry) => entry && entry.id === state.events.activeEventId)
      : null;
    const eventContext = describeActiveEventContext(eventDef);
    ui.eventTitle.textContent = state.events.activeEventTitle;
    ui.eventText.textContent = state.events.activeEventText;
    ui.eventMeta.textContent = [
      `Schweregrad: ${state.events.activeSeverity}`,
      eventContext.cause ? `Warum jetzt: ${eventContext.cause}` : '',
      eventContext.focus ? `Fokus: ${eventContext.focus}` : ''
    ].filter(Boolean).join(' | ');

    const optionSignature = `${state.events.activeEventId}|${state.events.activeOptions.map((option) => `${option.id}:${option.label}`).join('|')}`;
    if (ui.eventOptionList.dataset.signature !== optionSignature) {
      ui.eventOptionList.dataset.signature = optionSignature;
      ui.eventOptionList.replaceChildren();
      const primitives = getUiPrimitives();
      for (const option of state.events.activeOptions) {
        const button = primitives && typeof primitives.button === 'function'
          ? primitives.button({ className: 'event-option-btn' })
          : document.createElement('button');
        button.type = 'button';
        if (!button.classList.contains('event-option-btn')) {
          button.className = 'event-option-btn';
        }
        button.textContent = option.label;
        button.addEventListener('click', () => {
          const controller = getUiController();
          if (controller && typeof controller.handleEventOption === 'function') {
            controller.handleEventOption(option.id);
            return;
          }
          onEventOptionClick(option.id);
        });
        ui.eventOptionList.appendChild(button);
      }
    }
    return;
  }

  if (state.events.machineState === 'resolving') {
const leftMs = Number(state.events.resolvingUntilSimTimeMs || 0) - Number(state.simulation.simTimeMs || 0);
    ui.eventTitle.textContent = state.events.activeEventTitle || 'Ereignis wird ausgewertet';
    ui.eventText.textContent = 'Deine Entscheidung wird jetzt ausgewertet. Das Ergebnis erscheint nach Ablauf des Timers.';
    ui.eventMeta.textContent = `Ergebnis in: ${formatCountdown(leftMs)}`;
  } else if (state.events.machineState === 'resolved') {
    const outcome = state.events.resolvedOutcome; ui.eventTitle.textContent = outcome && outcome.eventTitle ? outcome.eventTitle : 'Ergebnis bereit';
    ui.eventText.textContent = formatResolvedOutcome(outcome);
    ui.eventMeta.textContent = 'Ergebnis bereit – schließe das Ereignis, um fortzufahren.';
  } else if (state.events.machineState === 'cooldown') {
const cooldownLeft = Number(state.events.cooldownUntilSimTimeMs || 0) - Number(state.simulation.simTimeMs || 0);
    ui.eventTitle.textContent = 'Abklingzeit aktiv';
    ui.eventText.textContent = 'Das Ereignissystem befindet sich in der Abklingzeit.';
    ui.eventMeta.textContent = `Abklingzeit: ${formatCountdown(cooldownLeft)}`;
  } else {
    ui.eventTitle.textContent = 'Kein aktives Ereignis';
    ui.eventText.textContent = 'Ein Ereignis erscheint, sobald der nächste Wurf erfolgreich ist.';
ui.eventMeta.textContent = `Nächster Wurf: ${formatCountdown(Number(state.events.scheduler.nextEventSimTimeMs || 0) - Number(state.simulation.simTimeMs || 0))}`;
  }

  if (ui.eventOptionList.childElementCount > 0) {
    ui.eventOptionList.dataset.signature = '';
    ui.eventOptionList.replaceChildren();
  }
}

function warnMissingUiOnce(key) {
  if (warnedUiKeys.has(key)) {
    return;
  }
  warnedUiKeys.add(key);
  console.warn(`Missing analysis UI element: ${key}`);
}

function renderAnalysisPanel(force = false) {
  if (!force && state.ui.openSheet !== 'dashboard') {
    return;
  }

  if (!ui.analysisTabOverview || !ui.analysisTabDiagnosis || !ui.analysisTabTimeline || !ui.analysisPanelOverview || !ui.analysisPanelDiagnosis || !ui.analysisPanelTimeline) {
    warnMissingUiOnce('analysis-panel');
    return;
  }

  renderPushToggle(); const activeTab = (state.ui.analysis && state.ui.analysis.activeTab) ? state.ui.analysis.activeTab : 'overview';
  const tabMap = {
    overview: ui.analysisPanelOverview,
    diagnosis: ui.analysisPanelDiagnosis,
    timeline: ui.analysisPanelTimeline
  };

  ui.analysisTabOverview.setAttribute('title', 'Zeigt den aktuellen Run-Report mit Status, Trend und Verlaufskurve.');
  ui.analysisTabDiagnosis.setAttribute('title', 'Zeigt aktuelle Diagnose-Treiber und die empfohlene nächste Pflege.');
  ui.analysisTabTimeline.setAttribute('title', 'Kein Dateiexport. Zeigt den letzten protokollierten Run-Verlauf.');

  ui.analysisTabOverview.classList.toggle('is-active', activeTab === 'overview');
  ui.analysisTabDiagnosis.classList.toggle('is-active', activeTab === 'diagnosis');
  ui.analysisTabTimeline.classList.toggle('is-active', activeTab === 'timeline');

  for (const [tabId, panel] of Object.entries(tabMap)) {
    panel.classList.toggle('hidden', tabId !== activeTab);
  }

  renderAnalysisOverview();
  renderAnalysisDiagnosis();
  renderAnalysisTimeline();
}

function renderSettingsSheet() {
  if (!ui.diagnosisSheet || state.ui.openSheet !== 'diagnosis') {
    return;
  }

  migrateSettings(state);
  renderPushToggle();
  updateSettingsUI();
}

function renderPushToggle() {
  if (!ui.pushToggleBtn || !ui.pushToggleStatus || !ui.pushToggleFeedback || !ui.notifTypeEvents || !ui.notifTypeCritical || !ui.notifTypeReminder) {
    return;
  }

  const notifications = getCanonicalNotificationsSettings(state);
  const enabled = notifications.enabled === true; ui.pushToggleBtn.textContent = enabled ? 'AN' : 'AUS';
  ui.pushToggleBtn.setAttribute('aria-pressed', String(enabled)); ui.pushToggleStatus.textContent = enabled ? 'Aktiv' : 'Deaktiviert';

  ui.notifTypeEvents.checked = notifications.types.events === true;
  ui.notifTypeCritical.checked = notifications.types.critical === true;
  ui.notifTypeReminder.checked = notifications.types.reminder === true;

  ui.notifTypeEvents.disabled = !enabled;
  ui.notifTypeCritical.disabled = !enabled;
  ui.notifTypeReminder.disabled = !enabled; ui.pushToggleFeedback.textContent = notifications.lastMessage ? String(notifications.lastMessage) : '';
}

function renderAnalysisOverview() {
  if (!ui.analysisPanelOverview) {
    warnMissingUiOnce('analysisPanelOverview');
    return;
  }

  const status = state.status || {};
  const environment = deriveEnvironmentReadout(state);
  const roots = deriveRootZoneReadout(environment, state);
  const diagnosis = diagnosePlantState();
  const primaryIssue = diagnosis.primaryIssue || null;
  const trendText = primaryIssue
    ? `${primaryIssue.title}. ${primaryIssue.cause}`
    : 'Aktuell kein klarer Hauptdruck. Werte wirken insgesamt stabil.';
  const nextCareText = primaryIssue
    ? describeDiagnosisRecommendation(primaryIssue)
    : 'Beobachten und nur bei klarer Abweichung eingreifen.';

  const statusRows = [
    { label: 'Wasser', value: `${Math.round(Number(status.water) || 0)}%`, tone: 'value_gold' },
    { label: 'Nährstoffe', value: `${Math.round(Number(status.nutrition) || 0)}%`, tone: 'value_gold' },
    { label: 'Wachstum', value: `${round2(Number(status.growth) || 0)}%`, tone: 'value_green' },
    { label: 'Risiko', value: `${Math.round(Number(status.risk) || 0)}%`, tone: 'value_orange' },
    { label: 'Stress', value: `${Math.round(Number(status.stress) || 0)}%`, tone: 'value_gold' }
  ];

  const rootRows = [
    { label: 'pH', value: String(roots.ph || '-') },
    { label: 'EC', value: String(roots.ec || '-') },
    { label: 'Wurzelgesundheit', value: String(roots.rootHealth || '-') },
    { label: 'Sauerstoff', value: String(roots.oxygen || '-') }
  ];

  const rowsToHtml = (rows) => rows.map((row) => `
      <div class="gs-analysis-status-row">
        <span>${escapeHtml(String(row.label || '-'))}</span>
        <strong class="${escapeHtml(String(row.tone || 'value_green'))}">${escapeHtml(String(row.value || '-'))}</strong>
      </div>
    `).join('');

  ui.analysisPanelOverview.innerHTML = `
    <section class="gs-analysis-overview-section">
      <h3 class="figma-section-head">Historischer Verlauf</h3>
      <div style="height: 180px; width: 100%; margin-bottom: 15px;">
        <canvas id="analysisChartCanvas"></canvas>
      </div>
    </section>
    <section class="gs-analysis-overview-section">
      <h3 class="figma-section-head">Pflanzenstatus</h3>
      ${rowsToHtml(statusRows)}
    </section>
    <section class="gs-analysis-overview-section">
      <h3 class="figma-section-head">Wurzeln &amp; Boden</h3>
      ${rowsToHtml(rootRows)}
    </section>
    <section class="gs-analysis-overview-section">
      <h3 class="figma-section-head">Trend</h3>
      <p class="gs-analysis-trend-text">${escapeHtml(trendText)}</p>
      <div class="gs-analysis-overview-meta">
        <span>Nächster sinnvoller Schritt</span>
        <strong>${escapeHtml(nextCareText)}</strong>
      </div>
    </section>
  `;

  // Init Chart
  setTimeout(() => {
    initAnalysisChart();
  }, 50);
}

let analysisChart = null;

function renderAnalysisChartFallback(canvas, reason) {
  if (!canvas) {
    return;
  }

  if (analysisChart) {
    analysisChart.destroy();
    analysisChart = null;
  }

  canvas.hidden = true;
  canvas.setAttribute('aria-hidden', 'true');

  const parent = canvas.parentElement;
  if (!parent) {
    return;
  }

  let note = parent.querySelector('[data-analysis-chart-fallback]');
  if (!note) {
    note = document.createElement('p');
    note.dataset.analysisChartFallback = 'true';
    note.className = 'sheet-note';
    parent.appendChild(note);
  }
  note.textContent = reason;
}

function initAnalysisChart() {
  const canvas = document.getElementById('analysisChartCanvas');
  if (!canvas) return;

  const parent = canvas.parentElement; const fallbackNode = parent ? parent.querySelector('[data-analysis-chart-fallback]') : null;
  if (fallbackNode) {
    fallbackNode.remove();
  }
  canvas.hidden = false;
  canvas.setAttribute('aria-hidden', 'false');

  if (typeof window.Chart !== 'function') {
    renderAnalysisChartFallback(canvas, 'Diagramm aktuell nicht verfügbar. Analysewerte bleiben weiter nutzbar.');
    return;
  }

  const telemetry = state.history.telemetry || [];
  const labels = telemetry.map(t => `Tag ${t.day}`);
  
  if (analysisChart) {
    analysisChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    renderAnalysisChartFallback(canvas, 'Diagramm konnte nicht initialisiert werden.');
    return;
  }

  analysisChart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Gesundheit',
          data: telemetry.map(t => t.health),
          borderColor: '#4ade80',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        },
        {
          label: 'Wasser',
          data: telemetry.map(t => t.water),
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        },
        {
          label: 'Nährstoffe',
          data: telemetry.map(t => t.nutrition),
          borderColor: '#facc15',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 }, maxRotation: 0 }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: 'rgba(255,255,255,0.6)', font: { size: 9 }, boxWidth: 10 }
        }
      }
    }
  });
}

function renderAnalysisDiagnosis() {
  if (!ui.analysisPanelDiagnosis) {
    warnMissingUiOnce('analysisPanelDiagnosis');
    return;
  }

  const diagnosis = diagnosePlantState();
  const primary = diagnosis.primaryIssue || null;
  const secondary = Array.isArray(diagnosis.secondaryIssues) ? diagnosis.secondaryIssues : [];
  const guidanceHints = getGuidanceHints(diagnosis);
  const severityLabel = (severity) => {
    if (severity === 'critical') return 'Akut';
    if (severity === 'high') return 'Wichtig';
    if (severity === 'medium') return 'Relevant';
    return 'Beobachten';
  };

  ui.analysisPanelDiagnosis.replaceChildren();

  if (primary) {
    const node = document.createElement('div');
    node.className = 'gs-analysis-driver gs-analysis-driver--primary';
    node.innerHTML = `
      <div class="gs-analysis-driver-head">
        <strong>Hauptproblem: ${escapeHtml(primary.title)}</strong>
        <span class="gs-analysis-driver-badge gs-analysis-driver-badge--${escapeHtml(primary.severity)}">${escapeHtml(severityLabel(primary.severity))}</span>
      </div>
      <p class="gs-analysis-driver-line"><span>Ursache:</span> ${escapeHtml(primary.cause)}</p>
      <p class="gs-analysis-driver-line"><span>Auswirkung:</span> ${escapeHtml(primary.effect)}</p>
      <p class="gs-analysis-driver-line"><span>Richtung:</span> ${escapeHtml(describeDiagnosisRecommendation(primary))}</p>
      <p class="gs-analysis-driver-line gs-analysis-driver-line--limit"><span>Grenze:</span> ${escapeHtml(primary.limit)}</p>
    `;
    ui.analysisPanelDiagnosis.appendChild(node);
  }

  for (const item of secondary) {
    const node = document.createElement('div');
    node.className = 'gs-analysis-driver';
    node.innerHTML = `
      <div class="gs-analysis-driver-head">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="gs-analysis-driver-badge gs-analysis-driver-badge--${escapeHtml(item.severity)}">${escapeHtml(severityLabel(item.severity))}</span>
      </div>
      <p class="gs-analysis-driver-line"><span>Ursache:</span> ${escapeHtml(item.cause)}</p>
      <p class="gs-analysis-driver-line"><span>Richtung:</span> ${escapeHtml(describeDiagnosisRecommendation(item))}</p>
    `;
    ui.analysisPanelDiagnosis.appendChild(node);
  }

  for (const hint of guidanceHints.slice(0, 3)) {
    const node = document.createElement('div');
    node.className = 'gs-analysis-driver';
    node.innerHTML = `
      <div class="gs-analysis-driver-head">
        <strong>${escapeHtml(String(hint.title || 'Hinweis'))}</strong>
        <span class="gs-analysis-driver-badge gs-analysis-driver-badge--${escapeHtml(String(hint.severity || 'low'))}">${escapeHtml(severityLabel(hint.severity))}</span>
      </div>
      <p class="gs-analysis-driver-line">${escapeHtml(String(hint.body || ''))}</p>
    `;
    ui.analysisPanelDiagnosis.appendChild(node);
  }

  if (!primary) {
    const stableNode = document.createElement('div');
    stableNode.className = 'gs-analysis-driver';
    stableNode.innerHTML = `
      <div class="gs-analysis-driver-head">
        <strong>Aktuell kein akutes Hauptproblem</strong>
        <span class="gs-analysis-driver-badge gs-analysis-driver-badge--low">Beobachten</span>
      </div>
      <p class="gs-analysis-driver-line"><span>Lage:</span> Wasser, Nährstoffe und Druckwerte wirken aktuell vergleichsweise ruhig.</p>
      <p class="gs-analysis-driver-line"><span>Nächster Schritt:</span> Keine harte Gegenmaßnahme nötig. Werte weiter beobachten und nur bei klarer Abweichung eingreifen.</p>
    `;
    ui.analysisPanelDiagnosis.appendChild(stableNode);
  }

  ui.analysisPanelDiagnosis.setAttribute('title', 'Diagnoseansicht mit aktuellen Treibern. Kein Filtersystem.');
}

function diagnosisSeverityFromScore(score) {
  const safeScore = Number(score) || 0;
  if (safeScore >= 92) return { id: 'critical', label: 'Akut' };
  if (safeScore >= 72) return { id: 'high', label: 'Wichtig' };
  if (safeScore >= 52) return { id: 'medium', label: 'Relevant' };
  return { id: 'low', label: 'Beobachten' };
}

function buildDiagnosisIssue(definition) {
  const safe = definition && typeof definition === 'object' ? definition : {};
  const severity = diagnosisSeverityFromScore(safe.score);
  return {
    id: String(safe.id || 'issue'),
    score: Number(safe.score) || 0,
    title: String(safe.title || 'Hinweis'),
    cause: String(safe.cause || 'Keine klare Ursache erkannt.'),
    effect: String(safe.effect || 'Die Entwicklung sollte beobachtet werden.'),
    recommendation: String(safe.recommendation || 'Werte beobachten.'),
    limit: String(safe.limit || 'Keine klare Einschränkung erkannt.'),
    carePlan: safe.carePlan || null,
    severity: severity.id,
    severityLabel: severity.label
  };
}

function getCarePlanForCategory(category) {
  const catalog = Array.isArray(state.actions && state.actions.catalog) ? state.actions.catalog : [];
  const tierOrder = { primary: 0, secondary: 1, cooldown: 2, blocked: 3 };
  const entries = catalog
    .filter((action) => action && action.category === category)
    .map((action) => {
      const cooldownUntil = Number(state.actions && state.actions.cooldowns ? state.actions.cooldowns[action.id] || 0 : 0);
      const cooldownLeftMs = Math.max(0, cooldownUntil - Date.now());
      const availability = getActionAvailability(action);
      const priority = getActionPriorityTier(action, availability, cooldownLeftMs);
      return {
        id: action.id,
        label: action.label,
        category: action.category,
        availability,
        cooldownLeftMs,
        tier: priority.tier
      };
    })
    .sort((a, b) => {
      if (tierOrder[a.tier] !== tierOrder[b.tier]) {
        return tierOrder[a.tier] - tierOrder[b.tier];
      }
      return intensityRank((state.actions.byId[a.id] || {}).intensity) - intensityRank((state.actions.byId[b.id] || {}).intensity);
    });

  return {
    category,
    categoryLabel: categoryLabel(category),
    actions: entries,
    best: entries.find((entry) => entry.tier === 'primary')
      || entries.find((entry) => entry.tier === 'secondary')
      || entries.find((entry) => entry.tier === 'cooldown')
      || entries[0]
      || null
  };
}

function describeDiagnosisRecommendation(issue) {
  const problem = issue && typeof issue === 'object' ? issue : {};
  return String(problem.recommendation || 'Beobachten und gezielt nachsteuern.');
}

function getDiagnosticsApi() {
  const api = typeof window !== 'undefined' ? window.GrowSimDiagnostics : null;
  return api && typeof api === 'object' ? api : null;
}

function buildFallbackPlantDiagnostics() {
  const stress = Number(state.status && state.status.stress) || 0;
  const risk = Number(state.status && state.status.risk) || 0;
  const growthImpulse = Number(state.simulation && state.simulation.growthImpulse) || 0;
  const stable = stress < 30 && risk < 30 && growthImpulse >= 0;
  const issue = stable
    ? {
      id: 'stable_state',
      family: 'optimize',
      title: 'Das Setup läuft ruhig',
      cause: 'Aktuell ist kein dominanter Problemdruck erkennbar.',
      effect: 'Die Pflanze kann ihren Rhythmus halten.',
      recommendation: 'Kleine Optimierungen sind möglich, aber nicht zwingend.',
      limit: 'Mehr Eingriffe sind gerade nicht automatisch besser.',
      score: 18,
      severity: 'low'
    }
    : {
      id: 'stress_load',
      family: 'stress',
      title: 'Belastung baut sich auf',
      cause: 'Mehrere Werte liegen nicht mehr sauber in der Komfortzone.',
      effect: 'Erholung und Tempo bleiben unter Druck.',
      recommendation: 'Erst stabilisieren, dann wieder optimieren.',
      limit: 'Zu viele gleichzeitige Eingriffe verschieben das Problem eher.',
      score: Math.max(stress, risk),
      severity: stress >= 70 || risk >= 70 ? 'high' : 'medium'
    };
  return {
    primaryIssue: issue.id === 'stable_state' ? null : issue,
    secondaryIssues: [],
    allIssues: [issue],
    contributingFactors: [issue.cause],
    growthSpeedMultiplier: round2(1 + (growthImpulse * 0.1)),
    summary: issue.title
  };
}

function diagnosePlantState() {
  const api = getDiagnosticsApi();
  if (api && typeof api.computePlantDiagnostics === 'function') {
    return api.computePlantDiagnostics(state);
  }
  return buildFallbackPlantDiagnostics();
}

function getGuidanceHints(diagnostics = diagnosePlantState()) {
  const api = getDiagnosticsApi();
  if (api && typeof api.buildGuidanceHints === 'function') {
    return api.buildGuidanceHints(diagnostics);
  }
  const issue = diagnostics && diagnostics.allIssues && diagnostics.allIssues[0];
  if (!issue) {
    return [];
  }
  return [{
    id: issue.id,
    tone: issue.family === 'optimize' ? 'optimize' : 'stabilize',
    title: issue.family === 'optimize' ? 'Optimieren' : 'Stabilisieren',
    body: issue.recommendation || issue.cause || '',
    severity: issue.severity || 'low'
  }];
}

function diagnosisDrivers() {
  const diagnosis = diagnosePlantState();
  const issues = Array.isArray(diagnosis.allIssues) ? diagnosis.allIssues : [];
  if (!issues.length) {
    return [{ score: 1, label: 'Stabiler Zustand', reason: 'Kein größeres Defizit erkannt' }];
  }
  return issues.map((issue) => ({
    score: issue.score,
    label: issue.title,
    reason: issue.cause,
    effect: issue.effect,
    recommendation: describeDiagnosisRecommendation(issue),
    limit: issue.limit,
    severity: issue.severity
  }));
}

function qualityTierLabel(tier) {
  if (tier === 'perfect') return 'Perfekt';
  if (tier === 'degraded') return 'Geschwächt';
  return 'Normal';
}

function categoryLabel(category) {
  const map = {
    watering: 'Bewässerung',
    fertilizing: 'Düngung',
    training: 'Training',
    environment: 'Umgebung',
    water: 'Wasser',
    nutrition: 'Nährstoffe',
    pest: 'Schädlinge',
    disease: 'Krankheit',
    generic: 'Allgemein'
  };
  return map[String(category || 'generic')] || String(category || 'Allgemein');
}

function renderAnalysisTimeline() {
  if (!ui.analysisPanelTimeline) {
    warnMissingUiOnce('analysisPanelTimeline');
    return;
  } const actions = Array.isArray(state.history && state.history.actions) ? state.history.actions : []; const events = Array.isArray(state.history && state.history.events) ? state.history.events : []; const system = Array.isArray(state.history && state.history.system) ? state.history.system : [];
  const simNow = Number(state.simulation && state.simulation.simTimeMs) || 0;

  const merged = [];
  for (const item of actions) {
    merged.push({
      kind: 'action',
      atRealTimeMs: Number(item.atRealTimeMs || item.realTime || 0),
      atSimTimeMs: Number(item.atSimTimeMs || item.simTime || simNow),
      data: item
    });
  }
  for (const item of events) {
    merged.push({
      kind: 'event',
      atRealTimeMs: Number(item.atRealTimeMs || item.realTime || 0),
      atSimTimeMs: Number(item.atSimTimeMs || item.simTime || simNow),
      data: item
    });
  }
  for (const item of system) { const stamp = item && item.timestamp && typeof item.timestamp === 'object' ? item.timestamp : null;
    merged.push({
      kind: 'system',
      atRealTimeMs: Number(item.atRealTimeMs || (stamp && stamp.realMs) || item.realTime || 0),
      atSimTimeMs: Number(item.atSimTimeMs || (stamp && stamp.simMs) || item.simTime || simNow),
      data: item
    });
  }

  merged.sort((a, b) => (b.atRealTimeMs || b.atSimTimeMs) - (a.atRealTimeMs || a.atSimTimeMs));
  const latest = merged.slice(0, 10);

  ui.analysisPanelTimeline.replaceChildren();
  ui.analysisPanelTimeline.setAttribute('title', 'Zeigt die letzten protokollierten Aktionen, Ereignisse und Systemeintraege. Kein Dateiexport.');

  if (!latest.length) {
    const empty = document.createElement('div');
    empty.className = 'gs-analysis-timeline-item';
    empty.textContent = 'Noch keine Aktivitäten';
    ui.analysisPanelTimeline.appendChild(empty);
    return;
  }

  for (const row of latest) {
    const simStamp = simStampFromMs(row.atSimTimeMs);
    const node = document.createElement('div');
    node.className = 'gs-analysis-timeline-item';

    if (row.kind === 'action') {
      const d = row.data || {};
      node.innerHTML = `<div class="gs-analysis-timeline-meta">${simStamp} · Aktion</div><strong>${escapeHtml(String(d.label || d.id || 'Aktion'))}</strong><br>${formatDeltaSummary(d.deltaSummary || {})}`;
    } else if (row.kind === 'event') {
      const d = row.data || {}; const note = d.learningNote ? `<details><summary>Lernhinweis</summary>${escapeHtml(String(d.learningNote))}</details>` : '';
      node.innerHTML = `<div class="gs-analysis-timeline-meta">${simStamp} · Ereignis (${escapeHtml(categoryLabel(String(d.category || 'generic')))})</div><strong>${escapeHtml(String(d.optionLabel || d.optionId || d.eventId || 'Ereignis'))}</strong><br>${formatDeltaSummary(d.effectsApplied || d.deltaSummary || {})}${note}`;
    } else {
      const d = row.data || {};
      const typeLabel = String(d.type || 'system');
      const label = d.label || d.id || 'System';
      const wasDeadNote = typeof d.wasDead === 'boolean'
        ? (d.wasDead ? ' · Reanimation' : ' · Stabilisierung')
        : '';
      node.innerHTML = `<div class="gs-analysis-timeline-meta">${simStamp} · System (${escapeHtml(typeLabel === 'rescue' ? 'Notfallrettung' : 'System')})</div><strong>${escapeHtml(String(label))}</strong>${wasDeadNote}<br>${formatDeltaSummary(d.effectsApplied || (d.details && d.details.effectsApplied) || {})}`;
    }

    ui.analysisPanelTimeline.appendChild(node);
  }
}

function simStampFromMs(simMs) {
  const base = Number(state.simulation.simEpochMs || simMs || 0);
  const raw = Number(simMs || base);
  const delta = Math.max(0, raw - base);
  const totalDay = Math.floor(delta / (24 * 60 * 60 * 1000));
  const hh = Math.floor((delta % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return `Tag ${totalDay} · ${String(hh).padStart(2, '0')}:00`;
}

function formatDeltaSummary(delta) {
  const parts = [];
  for (const [k, v] of Object.entries(delta || {})) {
    if (!Number.isFinite(Number(v)) || Number(v) === 0) {
      continue;
    }
    const n = round2(Number(v));
    parts.push(`${k}: ${n > 0 ? '+' : ''}${n}`);
  } return parts.length ? parts.join(' · ') : 'Keine Nettoänderung';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


const STAT_DETAIL_CONFIG = Object.freeze({
  water: Object.freeze({
    title: 'Wasser',
    buttonLabel: 'Gießen',
    action: () => openSheet('care'),
    getValue: () => Math.round(Number(state.status.water) || 0),
    getStatus: (value) => {
      if (value >= 80) return 'Optimal';
      if (value >= 60) return 'Stabil';
      if (value >= 40) return 'Beobachten';
      return 'Kritisch';
    },
    getExplanation: (value) => {
      if (value >= 80) return 'Wasser ist aktuell optimal. Die Pflanze bleibt gut versorgt.';
      if (value >= 60) return 'Wasser ist aktuell stabil. In den nächsten Zyklen noch unkritisch.';
      if (value >= 40) return 'Wasser wird knapper und sollte beobachtet werden.';
      return 'Wasser ist niedrig, Trockenstress kann schnell ansteigen.';
    },
    getRecommendation: (value) => {
      const waterIssue = diagnosePlantState().allIssues.find((entry) => entry.id === 'water_deficit' || entry.id === 'waterlogging');
      if (waterIssue) {
        return `Empfehlung: ${describeDiagnosisRecommendation(waterIssue)}`;
      }
      return value < 60
        ? 'Empfehlung: Pflege öffnen und zeitnah gießen.'
        : 'Empfehlung: Feuchtigkeit halten und den Verlauf beobachten.';
    }
  }),
  nutrition: Object.freeze({
    title: 'Nährstoffe',
    buttonLabel: 'Pflege öffnen',
    action: () => openSheet('care'),
    getValue: () => Math.round(Number(state.status.nutrition) || 0),
    getStatus: (value) => {
      if (value >= 80) return 'Sehr gut';
      if (value >= 60) return 'Solide';
      if (value >= 40) return 'Leicht schwach';
      return 'Mangelrisiko';
    },
    getExplanation: (value) => {
      if (value >= 60) return 'Nährstoffe unterstützen das Wachstum aktuell noch ausreichend.';
      if (value >= 40) return 'Sinkende Nährstoffe können das Wachstum bald bremsen.';
      return 'Nährstoffmangel begrenzt Entwicklung und erhöht Stresspotenzial.';
    },
    getRecommendation: (value) => {
      const issue = diagnosePlantState().allIssues.find((entry) => entry.id === 'nutrient_deficit' || entry.id === 'nutrient_pressure');
      if (issue) {
        return `Empfehlung: ${describeDiagnosisRecommendation(issue)}`;
      }
      return value < 60
        ? 'Empfehlung: Pflege öffnen und eine passende Düngungsmaßnahme prüfen.'
        : 'Empfehlung: Nährstoffniveau halten und regelmäßig kontrollieren.';
    }
  }),
  growth: Object.freeze({
    title: 'Wachstum',
    buttonLabel: 'Analyse öffnen',
    action: () => openSheet('dashboard'),
    getValue: () => Math.round(Number(state.status.growth) || 0),
    getStatus: (value, impulse) => {
      if (value >= 70 || impulse >= 0.12) return 'Guter Fortschritt';
      if (value >= 40 || impulse >= 0.03) return 'Solide Entwicklung';
      if (value <= 5 || impulse <= 0.005) return 'Kein aktiver Wachstumsfortschritt';
      return 'Gebremst';
    },
    getExplanation: (_value, impulse) => {
      if (impulse >= 0.12) return `Das Wachstum läuft stabil. Aktueller Impuls: ${impulse.toFixed(2)}.`;
      if (impulse >= 0.03) return `Das Wachstum entwickelt sich solide. Impuls: ${impulse.toFixed(2)}.`;
      return `Das Wachstum ist aktuell gebremst. Impuls: ${impulse.toFixed(2)}.`;
    },
    getRecommendation: (value) => {
      const primary = diagnosePlantState().primaryIssue;
      if (primary) {
        return `Empfehlung: ${describeDiagnosisRecommendation(primary)}`;
      }
      return value < 40
        ? 'Empfehlung: Analyse öffnen und Wasser-/Nährstofftreiber prüfen.'
        : 'Empfehlung: Kurs halten und per Analyse auf Limitierungen achten.';
    }
  }),
  risk: Object.freeze({
    title: 'Risiko',
    buttonLabel: 'Analyse öffnen',
    action: () => openSheet('dashboard'),
    getValue: () => Math.round(Number(state.status.risk) || 0),
    getStatus: (value) => {
      if (value >= 75) return 'Kritisch';
      if (value >= 50) return 'Hoch';
      if (value >= 25) return 'Erhöht';
      return 'Niedrig';
    },
    getExplanation: (_value) => {
      const topDriver = diagnosisDrivers()[0];
      if (!topDriver || topDriver.label === 'Stabiler Zustand') {
        return 'Aktuell besteht nur geringes Risiko.';
      }
      return `Wichtigster Treiber: ${topDriver.label}. ${topDriver.reason}`;
    },
    getRecommendation: (value) => {
      const primary = diagnosePlantState().primaryIssue;
      if (primary) {
        return `Empfehlung: ${describeDiagnosisRecommendation(primary)}`;
      }
      return value >= 50
        ? 'Empfehlung: Analyse öffnen und Gegenmaßnahmen priorisieren.'
        : 'Empfehlung: Entwicklung beobachten und Risikoquellen früh prüfen.';
    }
  })
});

function onStatRingPress(statKey) {
  if (!STAT_DETAIL_CONFIG[statKey]) {
    return;
  }
  state.ui.statDetailKey = statKey;
  openSheet('statDetail');
}

function onStatDetailPrimaryAction() {
  const config = STAT_DETAIL_CONFIG[state.ui.statDetailKey];
  if (!config || typeof config.action !== 'function') {
    return;
  }
  config.action();
}

function renderStatDetailSheet() {
  if (!ui.statDetailSheet || state.ui.openSheet !== 'statDetail') {
    return;
  }

  const key = state.ui.statDetailKey;
  const config = STAT_DETAIL_CONFIG[key];
  if (!config) {
    return;
  }

  const value = config.getValue();
  const impulse = Number(state.simulation && state.simulation.growthImpulse) || 0;
  const status = config.getStatus(value, impulse);
  const explanation = config.getExplanation(value, impulse);
  const recommendation = config.getRecommendation(value, impulse);

  ui.statDetailTitle.textContent = config.title;
  ui.statDetailValue.textContent = `${value}`;
  ui.statDetailStatus.textContent = `Status: ${status}`;
  ui.statDetailExplanation.textContent = explanation;
  ui.statDetailRecommendation.textContent = recommendation;
  ui.statDetailPrimaryBtn.textContent = config.buttonLabel;
}

function openSheet(name) {
  if (authGateActive) {
    openCloudAuthModal({ gate: true });
    return;
  }
  if (isPlantDead() && name !== 'dashboard') {
    return;
  }
  if (state.ui.menuOpen) {
    closeMenu();
  }

  if (name !== 'statDetail') {
    state.ui.statDetailKey = null;
  }

  state.ui.openSheet = name;
  renderSheets();

  if (name === 'dashboard') {
    renderAnalysisPanel(true);
  } else if (name === 'event') {
    renderEventSheet();
  } else if (name === 'care') {
    renderCareSheet(true);
  } else if (name === 'climate') {
    renderHud();
  } else if (name === 'diagnosis') {
    renderSettingsSheet();
  } else if (name === 'missions') {
    renderMissionsSheet();
  } else if (name === 'statDetail') {
    renderStatDetailSheet();
  }
}

function getMissionProgressView(mission) {
  const safeMission = mission && typeof mission === 'object' ? mission : {};
  const condition = safeMission.condition && typeof safeMission.condition === 'object' ? safeMission.condition : {};
  const simDay = Math.max(0, Number(state.simulation && state.simulation.simDay) || 0);
  const simTimeMs = Math.max(0, Number(state.simulation && state.simulation.simTimeMs) || 0);
  const averageStress = Math.max(0, Number(state.plant && state.plant.averageStress) || Number(state.status && state.status.stress) || 0);
  const health = Math.max(0, Number(state.plant && state.plant.averageHealth) || Number(state.status && state.status.health) || 0);

  switch (condition.type) {
    case 'min_day': {
      const targetDay = Math.max(1, Number(condition.value) || 1);
      return {
        progressText: `Fortschritt: Tag ${Math.min(simDay, targetDay)}/${targetDay}`,
        statusText: simDay >= targetDay ? 'Lauf geschafft.' : `Noch ${Math.max(0, targetDay - simDay).toFixed(1)} Tage durchhalten.`
      };
    }
    case 'min_health': {
      const targetHealth = Math.max(0, Number(condition.value) || 0);
      return {
        progressText: `Fortschritt: Gesundheit ${Math.round(Math.min(health, targetHealth))}/${Math.round(targetHealth)}`,
        statusText: health >= targetHealth ? 'Gesundheitsziel erreicht.' : 'Gesundheit weiter stabilisieren.'
      };
    }
    case 'max_stress_duration': {
      const limit = Math.max(0, Number(condition.value) || 0);
      const durationMinutes = Math.max(1, Number(condition.duration) || 1);
      const stressStartTime = Number.isFinite(Number(safeMission._stressStartTime)) ? Number(safeMission._stressStartTime) : null;
      const isWithinLimit = averageStress < limit;
      const elapsedMinutes = isWithinLimit && stressStartTime != null
        ? Math.max(0, (simTimeMs - stressStartTime) / 60000)
        : 0;
      return {
        progressText: `Fortschritt: ${Math.min(durationMinutes, elapsedMinutes).toFixed(0)}/${durationMinutes} Min unter ${limit}% Stress`,
        statusText: isWithinLimit
          ? (elapsedMinutes >= durationMinutes ? 'Ruhefenster gehalten.' : 'Ruhefenster laeuft, jetzt nicht ueberreizen.')
          : 'Zu viel Druck. Erst Hauptproblem beruhigen.'
      };
    }
    case 'action_used':
      return {
        progressText: 'Fortschritt: wartet auf die passende Aktion',
        statusText: 'Nur sinnvoll, wenn die Lage die Aktion wirklich traegt.'
      };
    default:
      return {
        progressText: '',
        statusText: ''
      };
  }
}

function renderMissionsSheet() {
  if (!ui.missionsSheet || state.ui.openSheet !== 'missions') return;
  ui.missionsList.replaceChildren();

  state.missions.catalog.forEach(mission => {
    const isCompleted = state.missions.completed.includes(mission.id);
    const progressView = getMissionProgressView(mission);
    const card = document.createElement('div'); card.className = `figma-section-card mission-card ${isCompleted ? 'mission-completed' : ''}`;
    
    let rewardText = '';
    if (mission.reward.coins) rewardText += `🪙 ${mission.reward.coins} `;
    if (mission.reward.gems) rewardText += `💎 ${mission.reward.gems} `;
    if (mission.reward.stars) rewardText += `⭐ ${mission.reward.stars} `;

    card.innerHTML = `
      <div class="figma-static-row">
        <span><strong>${escapeHtml(mission.title)}</strong><br><small>${escapeHtml(mission.description)}</small><br><small>${escapeHtml(isCompleted ? 'Mission abgeschlossen.' : progressView.progressText)}</small><br><small>${escapeHtml(isCompleted ? 'Belohnung gesichert.' : progressView.statusText)}</small></span><span class="value_gold">${isCompleted ? 'Abgeschlossen' : rewardText}</span>
      </div>
    `;
    ui.missionsList.appendChild(card);
  });
}

function onMenuToggleClick() {
  if (authGateActive) {
    openCloudAuthModal({ gate: true });
    return;
  }
  if (state.ui.menuOpen) {
    closeMenu();
    return;
  }
  openMenu();
}

function openMenu() {
  if (authGateActive) {
    openCloudAuthModal({ gate: true });
    return;
  }
  state.ui.openSheet = null;
  renderSheets();
  state.ui.menuOpen = true;
  renderGameMenu();
}

function closeMenu() {
  if (state.ui.menuDialogOpen) {
    closeMenuDialog();
  }
  state.ui.menuOpen = false;
  renderGameMenu();
}

function openMenuPlaceholder(title, text) {
  openMenuDialog({
    title,
    message: text,
    cancelLabel: 'Schließen',
    confirmLabel: '',
    onConfirm: null
  });
}

function onMenuNewRunClick() {
  const run = getCanonicalRun(state);
  openMenuDialog({
    title: 'Neuen Run starten',
    message: run.status === 'downed' ? 'Der aktuelle Run wird als Fehlschlag abgeschlossen. Danach kannst du mit erhaltenem Profil neu starten.' : (run.status === 'ended' ? 'Du startest direkt in einen neuen Run. Dein Profilfortschritt bleibt erhalten.' : 'Deine aktuelle Pflanze wird beendet. Profilfortschritt bleibt erhalten.'),
    cancelLabel: 'Abbrechen',
    confirmLabel: 'Neuer Run',
    onConfirm: async () => {
      const controller = getUiController();
      if (controller && typeof controller.handleMenuCommand === 'function') {
        const commandResult = await controller.handleMenuCommand('new_run');
        if (commandResult && commandResult.result && typeof commandResult.result.then === 'function') {
          await commandResult.result;
        }
        return;
      }
      await beginNextRunFlow();
    }
  });
}

function renderMenuDialogRewards(items) {
  const rewardSection = document.getElementById('menuDialogRewardSection');
  const rewardList = document.getElementById('menuDialogRewardList');
  if (!rewardSection || !rewardList) {
    return;
  }

  const rewards = Array.isArray(items) ? items.filter(Boolean) : [];
  rewardList.replaceChildren();
  rewardSection.classList.toggle('hidden', !rewards.length);
  rewardSection.setAttribute('aria-hidden', String(!rewards.length));

  for (const item of rewards) {
    const chip = document.createElement('div');
    chip.className = `menu-dialog-reward-chip menu-dialog-reward-chip--${String(item.tone || 'gold')}`;
    chip.innerHTML = `
      <span class="menu-dialog-reward-chip-icon">${escapeHtml(String(item.icon || '•'))}</span>
      <span class="menu-dialog-reward-chip-copy">
        <strong>${escapeHtml(String(item.value || ''))}</strong>
        <small>${escapeHtml(String(item.label || 'Belohnung'))}</small>
      </span>
    `;
    rewardList.appendChild(chip);
  }
}

function openMenuDialog({ title, message, cancelLabel = 'Abbrechen', confirmLabel = 'OK', onConfirm = null, variant = 'default', kicker = '', rewards = [] }) {
  if (!ui.menuDialogTitle || !ui.menuDialogText || !ui.menuDialogCancelBtn || !ui.menuDialogConfirmBtn) {
    return;
  }

  const safeVariant = String(variant || 'default');
  const dialogCard = ui.menuDialog ? ui.menuDialog.querySelector('.menu-dialog-card') : null;
  const kickerNode = document.getElementById('menuDialogKicker');
  const showMissionReward = safeVariant === 'mission-reward';

  ui.menuDialogTitle.textContent = title;
  ui.menuDialogText.textContent = message;
  ui.menuDialogCancelBtn.textContent = cancelLabel;
  ui.menuDialogConfirmBtn.textContent = confirmLabel;
  menuDialogConfirmHandler = typeof onConfirm === 'function' ? onConfirm : null;
  if (ui.menuDialog) {
    ui.menuDialog.dataset.variant = safeVariant;
  }
  if (dialogCard) {
    dialogCard.classList.toggle('menu-dialog-card--mission', showMissionReward);
  }
  if (kickerNode) {
    kickerNode.textContent = kicker || '';
    kickerNode.classList.toggle('hidden', !String(kicker || '').trim());
  }
  renderMenuDialogRewards(showMissionReward ? rewards : []);
  ui.menuDialogConfirmBtn.classList.toggle('hidden', menuDialogConfirmHandler === null || !confirmLabel);
  ui.menuDialogConfirmBtn.classList.toggle('menu-dialog-premium-btn', showMissionReward);
  ui.menuDialogCancelBtn.classList.toggle('menu-dialog-premium-btn', showMissionReward && !confirmLabel);
  ui.menuDialogCancelBtn.classList.toggle('menu-dialog-dismiss-btn', showMissionReward);
  ui.menuDialogConfirmBtn.onclick = null;
  if (menuDialogConfirmHandler) {
    ui.menuDialogConfirmBtn.onclick = async () => {
      const handler = menuDialogConfirmHandler;
      closeMenuDialog();
      await handler();
    };
  }

  state.ui.menuDialogOpen = true;
  renderGameMenu();
}

function closeMenuDialog() {
  state.ui.menuDialogOpen = false;
  menuDialogConfirmHandler = null;
  if (ui.menuDialog) {
    ui.menuDialog.dataset.variant = 'default';
  }
  const dialogCard = ui.menuDialog ? ui.menuDialog.querySelector('.menu-dialog-card') : null;
  if (dialogCard) {
    dialogCard.classList.remove('menu-dialog-card--mission');
  }
  const kickerNode = document.getElementById('menuDialogKicker');
  if (kickerNode) {
    kickerNode.textContent = '';
    kickerNode.classList.add('hidden');
  }
  renderMenuDialogRewards([]);
  if (ui.menuDialogConfirmBtn) {
    ui.menuDialogConfirmBtn.onclick = null;
    ui.menuDialogConfirmBtn.classList.remove('menu-dialog-premium-btn');
  }
  if (ui.menuDialogCancelBtn) {
    ui.menuDialogCancelBtn.classList.remove('menu-dialog-premium-btn', 'menu-dialog-dismiss-btn');
  }
  renderGameMenu();
}

function hasSetup() {
  const setup = state.setup;
  if (!setup || typeof setup !== 'object') {
    return false;
  }

  const requiredFields = ['mode', 'light', 'medium', 'potSize', 'genetics'];
  const hasCoreSetup = requiredFields.every((key) => typeof setup[key] === 'string' && setup[key].trim().length > 0);
  return hasCoreSetup && Number.isFinite(Number(setup.createdAtReal));
}

function getUnlockedFallbackValue(category, preferredFallback) {
  const profile = getCanonicalProfile(state); const group = profile && profile.unlocks ? profile.unlocks[String(category || '')] : null;
  if (Array.isArray(group) && group.length) {
    if (preferredFallback && group.includes(preferredFallback)) {
      return preferredFallback;
    }
    return group[0];
  }

  const defaults = {
    setupModes: 'indoor',
    media: 'soil',
    lights: 'medium',
    genetics: 'hybrid'
  };
  return defaults[String(category || '')] || '';
}

function sanitizeRunSetup(rawSetup) {
  const progressionApi = getProgressionApi();
  const profile = getCanonicalProfile(state); const setup = rawSetup && typeof rawSetup === 'object' ? rawSetup : {};
  const sanitize = progressionApi && typeof progressionApi.sanitizeSetupChoice === 'function' ? progressionApi.sanitizeSetupChoice : (_profile, _category, value, fallback) => value || fallback;
  return {
    mode: sanitize(profile, 'setupModes', setup.mode, getUnlockedFallbackValue('setupModes', 'indoor')),
    light: sanitize(profile, 'lights', setup.light, getUnlockedFallbackValue('lights', 'medium')),
    medium: sanitize(profile, 'media', setup.medium, getUnlockedFallbackValue('media', 'soil')),
    potSize: String(setup.potSize || 'small'),
    genetics: sanitize(profile, 'genetics', setup.genetics, getUnlockedFallbackValue('genetics', 'hybrid'))
  };
}

function renderSetupOptionLocks() {
  const progressionApi = getProgressionApi();
  if (!progressionApi || typeof progressionApi.getSetupOptionPresentation !== 'function') {
    return;
  }

  const profile = getCanonicalProfile(state); const buttons = Array.isArray(ui.setupOptionButtons) ? ui.setupOptionButtons : [];
  const selectFallbacks = {
    setupMode: getUnlockedFallbackValue('setupModes', 'indoor'),
    setupLight: getUnlockedFallbackValue('lights', 'medium'),
    setupMedium: getUnlockedFallbackValue('media', 'soil'),
    setupGenetics: getUnlockedFallbackValue('genetics', 'hybrid')
  };
  const selectToCategory = {
    setupMode: 'setupModes',
    setupLight: 'lights',
    setupMedium: 'media',
    setupGenetics: 'genetics'
  };

  for (const button of buttons) {
    if (!button) {
      continue;
    }
    const selectId = String(button.dataset.setupSelect || '');
    const value = String(button.dataset.setupValue || '');
    const category = selectToCategory[selectId];
    if (!category) {
      button.disabled = false;
      button.removeAttribute('aria-disabled');
      button.classList.remove('is-locked');
      continue;
    }

    const presentation = progressionApi.getSetupOptionPresentation(profile, category, value);
    const unlocked = Boolean(presentation && presentation.unlocked);
    button.disabled = !unlocked; button.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
    button.classList.toggle('is-locked', !unlocked);
    button.dataset.tone = String(presentation.tone || 'balanced');
    const primaryNode = button.querySelector('span');
    if (primaryNode) {
      primaryNode.textContent = String(presentation.title || value || primaryNode.textContent || '');
    }
    button.title = unlocked
      ? `${presentation.effect} ${presentation.tradeoff ? `Tradeoff: ${presentation.tradeoff}` : ''}`.trim()
      : `Freischaltung ab Level ${presentation.requiredLevel}: ${presentation.effect}`;

    const helperNode = button.querySelector('.badge, .subtitle, .value_green, .value_gold');
    if (helperNode) {
      helperNode.dataset.unlockedText = presentation.tag || helperNode.textContent || presentation.effect;
      helperNode.textContent = unlocked ? (helperNode.dataset.unlockedText || presentation.effect) : `Lv ${presentation.requiredLevel}`;
    }

    let effectNode = button.querySelector('.setup-option-effect');
    if (!effectNode) {
      effectNode = document.createElement('p');
      effectNode.className = 'setup-option-effect';
      button.appendChild(effectNode);
    }
    effectNode.textContent = unlocked
      ? `${presentation.effect} ${presentation.tradeoff ? `Tradeoff: ${presentation.tradeoff}` : ''}`.trim()
      : `Freischaltung ab Level ${presentation.requiredLevel}. ${presentation.effect}`;

    const selectNode = document.getElementById(selectId);
    if (selectNode && !unlocked && selectNode.value === value) {
      selectNode.value = selectFallbacks[selectId] || selectNode.value;
    }
    button.classList.toggle('is-active', Boolean(selectNode) && String(selectNode.value) === value && unlocked);
  }

  renderSetupStrategyPreview();
}

function renderSetupStrategyPreview() {
  const progressionApi = getProgressionApi();
  if (!progressionApi || typeof progressionApi.getRunBuildPresentation !== 'function') {
    return;
  }
  const previewSetup = sanitizeRunSetup({
    mode: document.getElementById('setupMode') ? document.getElementById('setupMode').value : 'indoor',
    light: document.getElementById('setupLight') ? document.getElementById('setupLight').value : 'medium',
    medium: document.getElementById('setupMedium') ? document.getElementById('setupMedium').value : 'soil',
    potSize: document.getElementById('setupPotSize') ? document.getElementById('setupPotSize').value : 'medium',
    genetics: document.getElementById('setupGenetics') ? document.getElementById('setupGenetics').value : 'hybrid'
  });
  const build = progressionApi.getRunBuildPresentation(previewSetup);
  if (ui.setupStrategyTag) {
    ui.setupStrategyTag.textContent = String(build.tag || 'Ausgewogen');
    ui.setupStrategyTag.dataset.tone = String(build.tone || 'balanced');
  }
  if (ui.setupStrategyTitle) {
    ui.setupStrategyTitle.textContent = String(build.title || 'Balanced Control');
  }
  if (ui.setupStrategyDescription) {
    ui.setupStrategyDescription.textContent = String(build.description || '');
  }
  if (ui.setupStrategyTradeoff) {
    ui.setupStrategyTradeoff.textContent = String(build.tradeoff || '');
  }
  if (ui.setupStrategyLoadout) { ui.setupStrategyLoadout.textContent = `${String(build.loadout || '')}${build.supportText ? ` · ${String(build.supportText)}` : ''}`;
  }
}

function renderLanding() {
  const landingNode = uiNode('landing', 'landing');
  if (!landingNode) {
    return;
  }
  const visible = !hasSetup();
  const appHud = document.getElementById('app-hud');
  if (appHud) {
    appHud.classList.toggle('app-hud--blocked', visible);
    appHud.setAttribute('aria-hidden', String(visible));
    if ('inert' in appHud) {
      appHud.inert = visible;
    }
  }
  landingNode.classList.toggle('hidden', !visible);
  landingNode.setAttribute('aria-hidden', String(!visible));
  if (visible) {
    renderSetupOptionLocks();
  }
}

function renderRunSummaryOverlay() {
  if (!ui.runSummaryOverlay) {
    return;
  }

  const profile = getCanonicalProfile(state);
  const summary = profile.lastRunSummary && typeof profile.lastRunSummary === 'object' ? profile.lastRunSummary : null;
  const visible = Boolean(state.ui.runSummaryOpen && summary);
  ui.runSummaryOverlay.classList.toggle('hidden', !visible);
  ui.runSummaryOverlay.setAttribute('aria-hidden', String(!visible));
  if (!visible || !summary) {
    return;
  }

  if (ui.runSummaryBadge) { ui.runSummaryBadge.textContent = summary.endReason === 'harvest' ? 'Ernte abgeschlossen' : 'Run gescheitert';
  }
  if (ui.runSummaryTitle) {
    ui.runSummaryTitle.textContent = summary.endReason === 'harvest' ? 'Ernte erfolgreich abgeschlossen' : 'Run beendet';
  }
  if (ui.runSummarySubtitle) {
    ui.runSummarySubtitle.textContent = summary.endReason === 'harvest' ? 'Die Runde wurde sauber abgeschlossen und in dein Profil übernommen.' : 'Der aktuelle Run wurde beendet und in dein Profil übertragen.';
  }
  if (ui.runSummaryRating) { const ratingTitle = summary.rating && summary.rating.title ? summary.rating.title : 'Solider Run';
    ui.runSummaryRating.textContent = ratingTitle; ui.runSummaryRating.setAttribute('title', String(summary.rating && summary.rating.hint ? summary.rating.hint : 'Kurze Einordnung dieses Runs.'));
  }
  if (ui.runSummaryDay) ui.runSummaryDay.textContent = `Tag ${summary.simDay}`;
  if (ui.runSummaryStage) ui.runSummaryStage.textContent = String(summary.stageLabel || '-');
  if (ui.runSummaryQuality) {
    ui.runSummaryQuality.textContent = `${Number(summary.qualityScore || 0).toFixed(1)} · ${String(summary.qualityTier || 'normal')}`;
  }
  if (ui.runSummaryBuild) {
    const buildText = summary.build && summary.build.title ? `${String(summary.build.title)} · ${String(summary.build.loadout || '')}` : '-';
    ui.runSummaryBuild.textContent = buildText;
  }
  if (ui.runSummaryActions) ui.runSummaryActions.textContent = String(summary.actionsCount || 0);
  if (ui.runSummaryEvents) ui.runSummaryEvents.textContent = String(summary.eventsCount || 0);
  if (ui.runSummaryLevel) ui.runSummaryLevel.textContent = `LVL ${summary.levelAfter || profile.level || 1}`;
  if (ui.runSummaryGoalTitle) { ui.runSummaryGoalTitle.textContent = String(summary.goal && summary.goal.title ? summary.goal.title : 'Kein Ziel aktiv');
  }
  if (ui.runSummaryGoalStatus) {
    const goalStatus = !summary.goal ? 'Kein Ziel' : (summary.goal.status === 'completed' ? 'Erreicht' : 'Verfehlt');
    ui.runSummaryGoalStatus.textContent = goalStatus; ui.runSummaryGoalStatus.dataset.status = summary.goal && summary.goal.status ? String(summary.goal.status) : 'failed';
  }
  if (ui.runSummaryGoalDescription) {
    ui.runSummaryGoalDescription.textContent = String(
      summary.goal && summary.goal.resultText ? summary.goal.resultText : (summary.goal && summary.goal.description ? summary.goal.description : 'Kein aktives Ziel für diesen Run.')
    );
  }
  if (ui.runSummaryGoalReward) { const goalXp = Math.max(0, Math.trunc(Number(summary.goal && summary.goal.status === 'completed' ? summary.goal.rewardXp : 0) || 0)); ui.runSummaryGoalReward.textContent = goalXp > 0 ? `+${goalXp} XP Bonus` : 'Kein Missionsbonus';
  }

  const renderFeedbackList = (container, items, fallbackText) => {
    if (!container) {
      return;
    }
    container.replaceChildren(); const entries = Array.isArray(items) ? items : [];
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'sheet-note';
      empty.textContent = fallbackText;
      container.appendChild(empty);
      return;
    }
    for (const entry of entries) {
      const row = document.createElement('article');
      row.className = 'run-summary-note'; row.textContent = String(entry && entry.text ? entry.text : '');
      container.appendChild(row);
    }
  };

  renderFeedbackList(ui.runSummaryHighlights, summary.highlights, 'Noch keine markanten Muster erkannt.');
  renderFeedbackList(ui.runSummaryMistakes, summary.mistakes, 'Keine klaren Bremsen erkannt.');
  renderFeedbackList(ui.runSummaryPositives, summary.positives, 'Der Run brachte trotzdem verwertbaren Fortschritt.');

  if (ui.runSummaryXpNotices) {
    ui.runSummaryXpNotices.replaceChildren(); const xpNotices = Array.isArray(summary.xpNotices) ? summary.xpNotices : [];
    for (const notice of xpNotices) {
      const row = document.createElement('div');
      row.className = 'figma-static-row run-summary-row run-summary-row--notice';
      row.innerHTML = `<span>+${escapeHtml(String(Number(notice.xp || 0)))} XP</span><strong>${escapeHtml(String(notice.label || 'Fortschritt'))}</strong>`;
      ui.runSummaryXpNotices.appendChild(row);
    }
  }

  if (ui.runSummaryXpRows) {
    ui.runSummaryXpRows.replaceChildren();
    const breakdown = summary.xpBreakdown || {};
    const labels = {
      base: 'Run-Basis',
      survival: 'Tagesfortschritt',
      stage: 'Phasenfortschritt',
      quality: 'Qualitätsbonus',
      management: 'Pflegequalität',
      prevention: 'Stabilitätsbonus',
      events: 'Event-Reaktion',
      outcome: summary.endReason === 'harvest' ? 'Erntebonus' : 'Abschlussbonus',
      goal: 'Run-Ziel',
      total: 'Gesamt'
    };
    for (const key of ['base', 'survival', 'stage', 'quality', 'management', 'prevention', 'events', 'outcome', 'goal', 'total']) {
      const row = document.createElement('div');
      row.className = 'figma-static-row run-summary-row';
      row.innerHTML = `<span>${escapeHtml(labels[key] || key)}</span><strong>${escapeHtml(String(Number(breakdown[key] || 0)))} XP</strong>`;
      ui.runSummaryXpRows.appendChild(row);
    }
  }

  if (ui.runSummaryUnlocks) {
    ui.runSummaryUnlocks.replaceChildren(); const unlocks = Array.isArray(summary.unlockedThisRun) ? summary.unlockedThisRun : [];
    if (!unlocks.length) {
      const empty = document.createElement('p');
      empty.className = 'sheet-note';
      empty.textContent = 'In diesem Run wurde noch nichts Neues freigeschaltet.';
      ui.runSummaryUnlocks.appendChild(empty);
    } else {
      for (const unlock of unlocks) {
        const row = document.createElement('article');
        row.className = 'run-summary-unlock';
        row.innerHTML = `<strong>${escapeHtml(String(unlock.title || unlock.value || 'Unlock'))}</strong><p class="sheet-note">${escapeHtml(String(unlock.effect || 'Neue Startoption freigeschaltet.'))}</p>`;
        ui.runSummaryUnlocks.appendChild(row);
      }
    }
  }
}

async function finalizeRun(reason) {
  const progressionApi = getProgressionApi();
  const run = getCanonicalRun(state);
  const profile = getCanonicalProfile(state);
  if (!progressionApi || typeof progressionApi.finalizeRunState !== 'function') {
    return { finalized: false, alreadyFinalized: true, summary: profile.lastRunSummary || null };
  }

  const result = progressionApi.finalizeRunState(state, reason, Date.now());
  if (result && result.summary) {
    state.profile.lastRunSummary = result.summary;
  }

  if ((result && result.finalized) || (result && result.alreadyFinalized)) {
    state.ui.deathOverlayOpen = false;
    state.ui.deathOverlayAcknowledged = true;
    state.ui.runSummaryOpen = Boolean(state.profile.lastRunSummary);
    state.ui.menuOpen = false;
    state.ui.menuDialogOpen = false;
    state.run.status = 'ended'; state.run.endReason = reason === 'harvest' ? 'harvest' : (result.summary && result.summary.endReason) || run.endReason || 'death';
    syncCanonicalStateShape();
    renderAll();
    schedulePersistState(true);
  }

  return result;
}

window.__gsFinalizeRun = finalizeRun;

async function resetRunPreservingProfile() {
  const preservedProfile = JSON.parse(JSON.stringify(getCanonicalProfile(state)));
  const preservedSettings = JSON.parse(JSON.stringify(getCanonicalSettings(state))); const preservedEventCatalog = Array.isArray(state.events && state.events.catalog) ? state.events.catalog.slice() : []; const preservedActionCatalog = Array.isArray(state.actions && state.actions.catalog) ? state.actions.catalog.slice() : [];
  const previousRunId = Math.max(0, Number(getCanonicalRun(state).id || 0));

  resetStateToDefaults();
  state.profile = preservedProfile;
  state.settings = {
    ...state.settings,
    ...preservedSettings,
    notifications: {
      ...state.settings.notifications,
      ...(preservedSettings.notifications || {})
    }
  };
  state.events.catalog = preservedEventCatalog;
  state.actions.catalog = preservedActionCatalog;
  state.actions.byId = Object.fromEntries((state.actions.catalog || []).map((action) => [action.id, action]));
  state.run = getCanonicalRun(state);
  state.run.id = previousRunId;
  state.ui.runSummaryOpen = false;
  state.ui.deathOverlayOpen = false;
  state.ui.deathOverlayAcknowledged = false;

  ensureStateIntegrity(Date.now());
  syncRuntimeClocks(Date.now());
  syncCanonicalStateShape();
  rescueAdPending = false;
  wasCriticalHealth = false;
  for (const key of Object.keys(actionDebounceUntil)) {
    delete actionDebounceUntil[key];
  }

  renderAll();
  schedulePersistState(true);
}

async function beginNextRunFlow() {
  const run = getCanonicalRun(state);
  closeMenu();
  if (run.status === 'downed' && !isRunFinalized(run)) {
    return finalizeRun('death');
  }
  return resetRunPreservingProfile();
}

async function onRunSummaryNewRunClick() {
  state.ui.runSummaryOpen = false;
  await resetRunPreservingProfile();
}

function onRunSummaryAnalyzeClick() {
  state.ui.runSummaryOpen = false;
  openSheet('dashboard');
  renderRunSummaryOverlay();
  schedulePersistState(true);
}

function renderDeathOverlay() {
  if (!ui.deathOverlay || !ui.deathDriverList || !ui.deathHistoryList) {
    return;
  }

  const visible = Boolean(state.ui.deathOverlayOpen && isPlantDead());
  ui.deathOverlay.classList.toggle('hidden', !visible);
  ui.deathOverlay.setAttribute('aria-hidden', String(!visible));

  if (visible && state.ui.menuDialogOpen) {
    closeMenuDialog();
  }

  if (!visible) {
    return;
  }

  const topDrivers = diagnosisDrivers().slice(0, 3);
  ui.deathDriverList.replaceChildren();
  for (const item of topDrivers) {
    const row = document.createElement('li');
    row.innerHTML = `<strong>${escapeHtml(String(item.label || 'Unklare Ursache'))}</strong><br>${escapeHtml(String(item.reason || 'Kein Detail verfügbar'))}`;
    ui.deathDriverList.appendChild(row);
  }

  const recent = collectRecentHistoryEntries(3);
  ui.deathHistoryList.replaceChildren();
  if (!recent.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Keine Aktionen oder Ereignisse protokolliert.';
    ui.deathHistoryList.appendChild(empty);
  } else {
    for (const row of recent) {
      const item = document.createElement('li');
      item.innerHTML = formatRecentHistoryHtml(row);
      ui.deathHistoryList.appendChild(item);
    }
  }

  if (ui.deathRescueBtn && ui.deathRescueSubtext && ui.deathRescueFeedback) {
    const meta = getCanonicalMeta(state);
    const rescueUsed = Boolean(meta.rescue.used);
    ui.deathRescueBtn.disabled = rescueAdPending || rescueUsed;
    ui.deathRescueBtn.setAttribute('aria-disabled', String(rescueAdPending || rescueUsed));
    ui.deathRescueBtn.setAttribute('title', 'Startet die gleiche einmalige Notfallrettung wie der Menü-Eintrag.');
    ui.deathRescueBtn.textContent = rescueUsed ? 'Notfallrettung bereits genutzt' : 'Notfallrettung nutzen';
    ui.deathRescueSubtext.textContent = rescueUsed ? '1× pro Run bereits verbraucht.' : '1× pro Run bei kritischem Zustand'; ui.deathRescueFeedback.textContent = meta.rescue.lastResult ? String(meta.rescue.lastResult) : '';
  }
}

function collectRecentHistoryEntries(limit = 3) { const actions = Array.isArray(state.history && state.history.actions) ? state.history.actions : []; const events = Array.isArray(state.history && state.history.events) ? state.history.events : [];
  const merged = [];

  for (const action of actions) {
    merged.push({
      kind: 'action',
      atRealTimeMs: Number(action.atRealTimeMs || action.realTime || 0),
      atSimTimeMs: Number(action.atSimTimeMs || action.simTime || state.simulation.simTimeMs),
      data: action
    });
  }

  for (const eventItem of events) {
    merged.push({
      kind: 'event',
      atRealTimeMs: Number(eventItem.atRealTimeMs || eventItem.realTime || 0),
      atSimTimeMs: Number(eventItem.atSimTimeMs || eventItem.simTime || state.simulation.simTimeMs),
      data: eventItem
    });
  }

  merged.sort((a, b) => (b.atRealTimeMs || b.atSimTimeMs) - (a.atRealTimeMs || a.atSimTimeMs));
  return merged.slice(0, limit);
}

function formatRecentHistoryHtml(row) {
  const simStamp = simStampFromMs(row.atSimTimeMs);
  const data = row.data || {};
  if (row.kind === 'action') {
    const label = escapeHtml(String(data.label || data.id || 'Aktion'));
    return `<span class="timeline-meta">${simStamp} · Aktion</span><br><strong>${label}</strong>`;
  }

  const category = escapeHtml(categoryLabel(data.category || 'generic'));
  const label = escapeHtml(String(data.optionLabel || data.optionId || data.eventId || 'Ereignis'));
  return `<span class="timeline-meta">${simStamp} · Ereignis (${category})</span><br><strong>${label}</strong>`;
}

function onStartRun() {
  const progressionApi = getProgressionApi();
  const setup = sanitizeRunSetup({
    mode: document.getElementById('setupMode').value || 'indoor',
    light: document.getElementById('setupLight').value || 'medium',
    medium: document.getElementById('setupMedium').value || 'soil',
    potSize: document.getElementById('setupPotSize').value || 'medium',
    genetics: document.getElementById('setupGenetics').value || 'auto'
  });

  const nowMs = Date.now();
  const run = getCanonicalRun(state);
  state.setup = {
    ...setup,
    createdAtReal: nowMs
  };
  state.run = {
    ...run,
    id: Math.max(0, Number(run.id || 0)) + 1,
    status: 'active',
    endReason: null,
    startedAtRealMs: nowMs,
    endedAtRealMs: null,
    finalizedAtRealMs: null,
    setupSnapshot: { ...setup }
  };
  if (progressionApi && typeof progressionApi.chooseRunGoal === 'function') {
    state.run.goal = progressionApi.chooseRunGoal(getCanonicalProfile(state), state.run);
  }
  state.ui.runSummaryOpen = false;
  state.ui.deathOverlayOpen = false;
  state.ui.deathOverlayAcknowledged = false;
  state.meta.rescue.used = false;
  state.meta.rescue.usedAtRealMs = null;
  state.meta.rescue.lastResult = null;

  // Figma-spec starting resources based on setup
  const startingCoins = setup.potSize === 'xlarge'
    ? 1500
    : (setup.potSize === 'large' ? 1800 : (setup.potSize === 'medium' ? 2480 : 3200));
  state.status.coins = startingCoins;
  state.status.gems = 55;
  state.status.stars = 10;

  state.simulation.startRealTimeMs = nowMs;
  state.simulation.lastTickRealTimeMs = nowMs;
  state.simulation.simEpochMs = alignToSimStartHour(nowMs, SIM_START_HOUR);
  state.simulation.simTimeMs = state.simulation.simEpochMs;
  state.boost.boostEndsAtMs = 0;
  state.simulation.baseSpeed = normalizeBaseSimulationSpeed(state.simulation.baseSpeed);
  state.simulation.effectiveSpeed = state.simulation.baseSpeed;
  state.simulation.timeCompression = state.simulation.effectiveSpeed;
  state.status.growth = 0;
  state.status.health = 100;
  state.status.water = 80;
  state.status.nutrition = 70;
  state.status.stress = 0;
  state.status.risk = 0;
  
  state.plant.stageIndex = 0;
  state.plant.stageProgress = 0;
  const initialStage = getCurrentStage(0); state.plant.phase = (initialStage && initialStage.current) ? initialStage.current.phase : 'seedling';
  state.plant.stageKey = stageAssetKeyForIndex(0);
  state.plant.lastValidStageKey = state.plant.stageKey;
  state.plant.isDead = false;

  syncCanonicalStateShape();
  renderLanding();
  renderHud();
  renderRunSummaryOverlay();
  schedulePersistState(true);
  addLog('system', 'Neuer Run gestartet (Figma-Setup)', state.setup);
}

async function onDeathResetClick() {
  openMenuDialog({
    title: 'Run verwerfen und neu starten',
    message: 'Der aktuelle Durchlauf wird als Fehlschlag abgeschlossen. Danach erhältst du die Run-Zusammenfassung und kannst neu starten.',
    cancelLabel: 'Abbrechen',
    confirmLabel: 'Run beenden',
    onConfirm: async () => {
      await finalizeRun('death');
    }
  });
}

function onDeathAnalyzeClick() {
  state.ui.deathOverlayOpen = false;
  state.ui.deathOverlayAcknowledged = true;
  openSheet('dashboard');
  renderDeathOverlay();
}

async function onDeathRescueClick() {
  const meta = getCanonicalMeta(state);
  if (rescueAdPending) {
    renderGameMenu();
    return;
  }

  if (meta.rescue.used) {
    meta.rescue.lastResult = 'Notfallrettung ist nur 1× pro Run verfügbar.';
    renderDeathOverlay();
    renderGameMenu();
    schedulePersistState(true);
    return;
  }

  const beforeHealth = Number(state.status.health) || 0;
  const deadNow = isPlantDead();
  if (!deadNow && beforeHealth >= 20) {
    meta.rescue.lastResult = 'Notfallrettung ist aktuell nicht erforderlich.';
    renderDeathOverlay();
    renderGameMenu();
    schedulePersistState(true);
    return;
  }

  rescueAdPending = false;

  const rescueResult = applyRescueEffects();
  if (!rescueResult.ok) {
    meta.rescue.lastResult = 'Notfallrettung ist aktuell nicht erforderlich.';
    renderDeathOverlay();
    renderGameMenu();
    schedulePersistState(true);
    return;
  }

  const nowMs = Date.now();
  meta.rescue.used = true;
  meta.rescue.usedAtRealMs = nowMs;
  meta.rescue.lastResult = 'Notfallrettung angewendet. Die Pflanze stabilisiert sich.';

  const timestamp = {
    realMs: nowMs,
    simMs: Number(state.simulation.simTimeMs || 0),
    simStamp: simStampFromMs(Number(state.simulation.simTimeMs || 0))
  };
  const history = getCanonicalHistory(state);
  history.system.push({
    type: 'rescue',
    label: 'Notfallrettung',
    effectsApplied: rescueResult.effectsApplied,
    wasDead: rescueResult.wasDead,
    timestamp,
    atRealTimeMs: timestamp.realMs,
    atSimTimeMs: timestamp.simMs
  });
  if (history.system.length > MAX_HISTORY_LOG) {
    history.system = history.system.slice(-MAX_HISTORY_LOG);
  }

  updateVisibleOverlays();
  state.run.status = 'active';
  state.run.endReason = null;
  state.run.finalizedAtRealMs = null;
  syncCanonicalStateShape();
  renderAll();
  renderGameMenu();
  schedulePersistState(true);
}

async function onPushToggleClick() {
  const notifications = getCanonicalNotificationsSettings(state);
  const currentlyEnabled = notifications.enabled === true;

  if (currentlyEnabled) {
    notifications.enabled = false;
    state.settings.pushNotificationsEnabled = false;
    notifications.lastMessage = 'Benachrichtigungen deaktiviert.';
    renderPushToggle();
    renderGameMenu();
    schedulePersistState(true);
    return;
  }

  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
    notifications.enabled = false;
    state.settings.pushNotificationsEnabled = false;
    notifications.lastMessage = 'Benachrichtigungen werden in diesem Browser nicht unterstützt.';
    renderPushToggle();
    renderGameMenu();
    schedulePersistState(true);
    return;
  }

  let permission = Notification.permission;
  let permissionTimedOut = false;
  if (permission !== 'granted') {
    const permissionResult = await requestNotificationPermissionSafe();
    permission = permissionResult.permission;
    permissionTimedOut = permissionResult.timedOut === true;
  }

  if (permission !== 'granted') {
    notifications.enabled = false;
    state.settings.pushNotificationsEnabled = false;
    notifications.lastMessage = permissionTimedOut ? 'Berechtigungsdialog nicht bestätigt. Bitte Benachrichtigungen im Browser erlauben.' : 'Berechtigung nicht erteilt. Bitte Benachrichtigungen im Browser erlauben.';
    renderPushToggle();
    renderGameMenu();
    schedulePersistState(true);
    return;
  }

  if (!navigator.serviceWorker.controller) {
    notifications.enabled = false;
    state.settings.pushNotificationsEnabled = false;
    notifications.lastMessage = 'Service Worker noch nicht aktiv – bitte einmal normal neu laden.';
    renderPushToggle();
    renderGameMenu();
    schedulePersistState(true);
    return;
  }

  notifications.enabled = true;
  state.settings.pushNotificationsEnabled = true;
  notifications.lastMessage = 'Benachrichtigungen aktiviert.';
  renderPushToggle();
  renderGameMenu();
  schedulePersistState(true);
}

async function requestNotificationPermissionSafe(timeoutMs = 1800) {
  if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') {
    return { permission: 'denied', timedOut: false };
  }

  try {
    const requestResult = Notification.requestPermission();
    if (!requestResult || typeof requestResult.then !== 'function') {
      return { permission: String(requestResult || Notification.permission || 'default'), timedOut: false };
    }

    let timeoutHandle = null;
    const timeoutResult = new Promise((resolve) => {
      timeoutHandle = window.setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    });
    const resolvedResult = requestResult
      .then((value) => ({ permission: String(value || Notification.permission || 'default'), timedOut: false }))
      .catch(() => ({ permission: String(Notification.permission || 'default'), timedOut: false }));

    const winner = await Promise.race([resolvedResult, timeoutResult]);
    if (timeoutHandle !== null) {
      window.clearTimeout(timeoutHandle);
    }

    if (winner && winner.timedOut) {
      return { permission: String(Notification.permission || 'default'), timedOut: true };
    }

    return winner || { permission: String(Notification.permission || 'default'), timedOut: false };
  } catch (_error) {
    return { permission: String(Notification.permission || 'default'), timedOut: false };
  }
}

function onNotificationTypeToggle() {
  const notifications = getCanonicalNotificationsSettings(state);
  notifications.types.events = Boolean(ui.notifTypeEvents && ui.notifTypeEvents.checked);
  notifications.types.critical = Boolean(ui.notifTypeCritical && ui.notifTypeCritical.checked);
  notifications.types.reminder = Boolean(ui.notifTypeReminder && ui.notifTypeReminder.checked);
  renderPushToggle();
  schedulePersistState(true);
}

async function onAnalysisResetClick() {
  const run = getCanonicalRun(state);
  const confirmed = window.confirm(run.status === 'ended' ? 'Neuen Run mit bestehendem Profil starten' : 'Aktuellen Run wirklich beenden und einen neuen starten Dein Profilfortschritt bleibt erhalten.');
  if (!confirmed) {
    return;
  }
  if (run.status === 'downed' && !isRunFinalized(run)) {
    await finalizeRun('death');
    return;
  }
  await resetRunPreservingProfile();
}

async function resetRun() {
  await clearPersistentStorage();

  resetStateToDefaults();
  ensureStateIntegrity(Date.now());
  syncRuntimeClocks(Date.now());
  syncCanonicalStateShape();
  rescueAdPending = false;
  const notifications = getCanonicalNotificationsSettings(state);
  notifications.runtime.lastNotifiedEventId = null;
  notifications.runtime.lastCriticalAtRealMs = 0;
  notifications.runtime.lastReminderAtRealMs = 0;
  wasCriticalHealth = false;
  if (state.meta && state.meta.rescue) {
    state.meta.rescue.used = false;
    state.meta.rescue.usedAtRealMs = null;
    state.meta.rescue.lastResult = null;
  }

  state.ui.openSheet = null;
  state.ui.deathOverlayOpen = false;
  state.ui.deathOverlayAcknowledged = false;
  state.ui.runSummaryOpen = false;
  for (const key of Object.keys(actionDebounceUntil)) {
    delete actionDebounceUntil[key];
  }

  renderAll();
  schedulePersistState(true);
}

async function clearPersistentStorage() {
  const storageApi = window.GrowSimStorage;
  if (storageApi && typeof storageApi.clearStoredState === 'function') {
    await storageApi.clearStoredState();
  } else {
    try {
      localStorage.removeItem(LS_STATE_KEY);
    } catch (_error) {
      // non-fatal
    }

    if (typeof indexedDB !== 'undefined') {
      try {
        const db = await openDb();
        await dbDelete(db, DB_KEY);
        db.close();
      } catch (_error) {
        // non-fatal
      }
    }
  }

  try {
    localStorage.removeItem(PUSH_SUB_KEY);
  } catch (_error) {
    // non-fatal
  }
}

function withDebouncedAction(actionKey, buttonNode, callback) {
  const nowMs = Date.now();
  if ((actionDebounceUntil[actionKey] || 0) > nowMs) {
    return;
  }

  actionDebounceUntil[actionKey] = nowMs + CONFIG.actionDebounceMs;
  if (buttonNode) {
    buttonNode.disabled = true;
    window.setTimeout(() => {
      buttonNode.disabled = false;
    }, CONFIG.actionDebounceMs);
  }
  callback();
}

function closeSheet() {
  const currentSheet = state.ui.openSheet;

  if (currentSheet === 'event' && state.events.machineState === 'activeEvent') {
    dismissActiveEvent();
    return;
  }
  if (currentSheet === 'event' && state.events.machineState === 'resolved') {
    enterEventCooldown(state.simulation.nowMs);
    renderAll();
    schedulePersistState(true);
    return;
  }
  state.ui.openSheet = null;
  state.ui.statDetailKey = null;
  renderSheets();
}

function dismissActiveEvent() {
  if (state.events.machineState !== 'activeEvent') {
    return;
  }

  const penalty = { health: -1, stress: 2, risk: 2 };
  const eventId = state.events.activeEventId;

  applyChoiceEffects(penalty);
  state.events.lastChoiceId = '__dismiss__';
  state.events.scheduler.lastChoiceId = '__dismiss__';
  state.events.machineState = 'resolving';
  state.events.resolvingUntilMs = state.simulation.nowMs + EVENT_RESOLUTION_MS;
  state.events.pendingOutcome = {
    eventId,
    eventTitle: state.events.activeEventTitle,
    optionId: '__dismiss__',
    optionLabel: 'Ignoriert',
    summary: 'bad',
    learningNote: 'Ignorierte Ereignisse erhöhen meist das Risiko.',
    resolvedAfterMs: EVENT_RESOLUTION_MS
  };
  state.events.resolvedOutcome = null;

  addLog('choice', `Ereignis geschlossen ohne Auswahl: ${eventId}`, {
    choiceId: '__dismiss__',
    effects: penalty
  });

  runEventStateMachine(state.simulation.nowMs);
  state.ui.openSheet = null;
  renderAll();
  schedulePersistState(true);
}

function onVisibilityChange() {
  const uiRuntimeApi = window.GrowSimUiRuntime;
  if (uiRuntimeApi && typeof uiRuntimeApi.onVisibilityChange === 'function' && uiRuntimeApi.onVisibilityChange !== onVisibilityChange) {
    return uiRuntimeApi.onVisibilityChange();
  }
  if (document.visibilityState === 'hidden') {
    schedulePersistState(true);
    stopLoop();
    return;
  }

  if (document.visibilityState === 'visible') {
    clearRuntimeHaltBanner();
    startLoopOnce();
    renderAll();
    schedulePersistState();
  }
}

function onWindowFocus() {
  const uiRuntimeApi = window.GrowSimUiRuntime;
  if (uiRuntimeApi && typeof uiRuntimeApi.onWindowFocus === 'function' && uiRuntimeApi.onWindowFocus !== onWindowFocus) {
    return uiRuntimeApi.onWindowFocus();
  }
  if (document.visibilityState !== 'visible') {
    return;
  }
  clearRuntimeHaltBanner();
  startLoopOnce();
  renderAll();
  schedulePersistState();
}

function onPageShow() {
  const uiRuntimeApi = window.GrowSimUiRuntime;
  if (uiRuntimeApi && typeof uiRuntimeApi.onPageShow === 'function' && uiRuntimeApi.onPageShow !== onPageShow) {
    return uiRuntimeApi.onPageShow();
  }
  if (document.visibilityState !== 'visible') {
    return;
  }
  clearRuntimeHaltBanner();
  startLoopOnce();
  renderAll();
  schedulePersistState();
}

function showRuntimeHaltBanner() {
  const uiRuntimeApi = window.GrowSimUiRuntime;
  if (uiRuntimeApi && typeof uiRuntimeApi.showRuntimeHaltBanner === 'function' && uiRuntimeApi.showRuntimeHaltBanner !== showRuntimeHaltBanner) {
    return uiRuntimeApi.showRuntimeHaltBanner();
  }
  const existing = document.getElementById('runtimeHaltBanner');
  if (existing) {
    return;
  }
  const banner = document.createElement('div');
  banner.id = 'runtimeHaltBanner';
  banner.className = 'boot-error-banner';
  banner.innerHTML = '<strong>Simulation angehalten – bitte neu laden.</strong>';
  document.body.appendChild(banner);
}

function clearRuntimeHaltBanner() {
  const uiRuntimeApi = window.GrowSimUiRuntime;
  if (uiRuntimeApi && typeof uiRuntimeApi.clearRuntimeHaltBanner === 'function' && uiRuntimeApi.clearRuntimeHaltBanner !== clearRuntimeHaltBanner) {
    return uiRuntimeApi.clearRuntimeHaltBanner();
  }
  const existing = document.getElementById('runtimeHaltBanner');
  if (existing) {
    existing.remove();
  }
}

function addLog(type, message, details) {
  const timestamp = Date.now();
  const payload = details || null;
  const entry = {
    id: `${timestamp}-${state.simulation.tickCount}-${state.history.systemLog.length}`,
    atMs: timestamp,
    t: timestamp,
    type,
    message,
    msg: message,
    details: payload,
    data: payload
  };

  state.history.systemLog.push(entry);
  if (state.history.systemLog.length > MAX_HISTORY_LOG) {
    state.history.systemLog = state.history.systemLog.slice(-MAX_HISTORY_LOG);
  }

  if (!state.history || typeof state.history !== 'object') {
    state.history = { actions: [], events: [], system: [] };
  }

  if (type === 'action') { state.history.actions = Array.isArray(state.history.actions) ? state.history.actions : [];
    state.history.actions.push({
      type: 'action',
      id: (payload && payload.id) || message,
      category: payload && payload.category,
      intensity: payload && payload.intensity,
      label: payload && payload.label,
      atSimTimeMs: state.simulation.simTimeMs,
      atRealTimeMs: timestamp,
      result: 'ok',
      reason: payload && payload.reason,
      deltaSummary: payload && payload.deltaSummary ? payload.deltaSummary : {},
      sideEffects: payload && payload.sideEffects ? payload.sideEffects : []
    });
  } else if (type === 'event' || type === 'event_shown' || type === 'choice') { state.history.events = Array.isArray(state.history.events) ? state.history.events : [];
  } else { state.history.system = Array.isArray(state.history.system) ? state.history.system : [];
    state.history.system.push({
      type: 'system',
      id: type,
      atSimTimeMs: state.simulation.simTimeMs,
      details: payload || { message }
    });
  }
}

function translateEventState(machineState) {
  switch (machineState) {
    case 'idle':
      return 'inaktiv';
    case 'activeEvent':
      return 'aktives Ereignis';
    case 'resolving':
      return 'Ergebnis läuft';
    case 'resolved':
      return 'Ergebnis bereit';
    case 'cooldown':
      return 'Abklingzeit';
    default:
      return machineState;
  }
}


function classifyOutcome(deltaSummary) {
  const d = deltaSummary || {};
  const score = (Number(d.health) || 0) + (Number(d.growth) || 0) - (Number(d.stress) || 0) - (Number(d.risk) || 0);
  if (score >= 1) return 'good';
  if (score <= -1) return 'bad';
  return 'mixed';
}

function formatResolvedOutcome(outcome) {
  if (!outcome) {
    return 'Die Auswertung wurde abgeschlossen.';
  }
  const tone = outcome.summary === 'good' ? 'Gute Entscheidung.' : (outcome.summary === 'bad' ? 'Eher schlechte Entscheidung.' : 'Gemischtes Ergebnis.');
  const choice = outcome.optionLabel ? `Gewählt: ${outcome.optionLabel}.` : '';
  const note = outcome.learningNote ? ` ${outcome.learningNote}` : '';
  return `${tone} ${choice}${note}`.trim();
}

function eventStatusDisplay(sourceState = state) { const activeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const eventsState = activeState.events || {};
  const simulation = activeState.simulation || {};
  const scheduler = eventsState.scheduler || {};

  if (eventsState.machineState === 'activeEvent') {
    return { label: 'Ereignisstatus', value: 'Ereignis aktiv' };
  }
  if (eventsState.machineState === 'resolving') {
return { label: 'Ergebnis in', value: formatCountdown(Number(eventsState.resolvingUntilSimTimeMs || 0) - Number(simulation.simTimeMs || 0)) };
  }
  if (eventsState.machineState === 'resolved') {
    return { label: 'Ereignisstatus', value: 'Ergebnis bereit' };
  }
return { label: 'Nächstes Ereignis', value: formatCountdown(Number(scheduler.nextEventSimTimeMs || 0) - Number(simulation.simTimeMs || 0)) };
}

function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 99) {
    return `${minutes}m`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, Math.trunc(Number(value) || 0)));
}

function plantAssetPath(stageName) {
  const safeStageKey = normalizeStageKey(stageName);
  const stageIndex = clampInt(Number(safeStageKey.replace('stage_', '')) - 1, 0, STAGE_DEFS.length - 1);
  const phase = String(getStageTimeline()[stageIndex].phase || state.plant.phase || '').toLowerCase();

  let tier = 0;
  if (phase === 'vegetative') tier = 1;
  if (phase === 'flowering' || phase === 'harvest' || phase === 'dead') tier = 2;

  return appPath(PLANT_STAGE_IMAGES[tier] || PLANT_STAGE_IMAGES[0]);
}

function applyBackgroundAsset() {
  // Home owns the atmospheric background inside #app-hud; body stays neutral.
  document.body.style.backgroundImage = 'none';
  document.body.style.backgroundColor = '#04090f';

  const appHud = document.getElementById('app-hud');
  if (!appHud) {
    return;
  }

  const selected = state.ui && typeof state.ui.selectedBackground === 'string' ? state.ui.selectedBackground : 'bg_dark_01.jpg';
  const mappedFile = selected === 'bg_dark_02.jpg' ? 'bg_dark_02.jpg' : 'Basic screen.jpg';

  const primary = appPath(`assets/ui/backgrounds/${mappedFile}`);
  appHud.style.setProperty('--home-general-bg', `url("${primary}")`);
}

async function createStorageAdapter() {
  const storageApi = window.GrowSimStorage;
  if (storageApi && typeof storageApi.createStorageAdapter === 'function' && storageApi.createStorageAdapter !== createStorageAdapter) {
    return storageApi.createStorageAdapter();
  }
  if (typeof indexedDB === 'undefined') {
    return localStorageAdapter();
  }

  try {
    const db = await openDb();
    return {
      async get() {
        return dbGet(db, DB_KEY);
      },
      async set(snapshot) {
        await dbSet(db, DB_KEY, snapshot);
      }
    };
  } catch (_error) {
    return localStorageAdapter();
  }
}

function localStorageAdapter() {
  const storageApi = window.GrowSimStorage;
  if (storageApi && typeof storageApi.localStorageAdapter === 'function' && storageApi.localStorageAdapter !== localStorageAdapter) {
    return storageApi.localStorageAdapter();
  }
  return {
    async get() {
      let raw = null;
      try {
        raw = localStorage.getItem(LS_STATE_KEY);
      } catch (error) {
        console.warn('[storage:fallback] localStorage read failed', error);
        return null;
      }
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw);
      } catch (_error) {
        return null;
      }
    },
    async set(snapshot) {
      localStorage.setItem(LS_STATE_KEY, JSON.stringify(snapshot));
    }
  };
}

function normalizeSpriteStageLabel(rawStage) {
  const normalized = String(rawStage || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(DEFAULT_PLANT_STAGE_RANGES, normalized)) {
    return normalized;
  }
  if (normalized === 'pre_flower') return 'preflower';
  if (normalized === 'late-flowering') return 'late_flowering';
  return '';
}

function buildStageRangesFromMetadata(frames) {
  if (!Array.isArray(frames) || !frames.length) {
    return DEFAULT_PLANT_STAGE_RANGES;
  }

  const next = {};
  for (const frame of frames) {
    const stage = normalizeSpriteStageLabel(frame && frame.stage);
    const frameNumber = Number(frame && frame.frame);
    if (!stage || !Number.isFinite(frameNumber)) {
      continue;
    }

    if (!next[stage]) {
      next[stage] = { start: frameNumber, end: frameNumber };
    } else {
      next[stage].start = Math.min(next[stage].start, frameNumber);
      next[stage].end = Math.max(next[stage].end, frameNumber);
    }
  }

  const merged = {};
  for (const stageName of Object.keys(DEFAULT_PLANT_STAGE_RANGES)) {
    const fallback = DEFAULT_PLANT_STAGE_RANGES[stageName];
    const candidate = next[stageName];
    merged[stageName] = Object.freeze({
      start: Number.isFinite(candidate && candidate.start) ? candidate.start : fallback.start,
      end: Number.isFinite(candidate && candidate.end) ? candidate.end : fallback.end
    });
  }

  return Object.freeze(merged);
}

function defaultPlantSpriteMetadata() {
  return {
    frameWidth: 2048,
    frameHeight: 2048,
    columns: 8,
    rows: 6,
    totalFrames: 46,
    frames: []
  };
}

function normalizePlantSpriteMetadata(rawMetadata) {
  const fallback = defaultPlantSpriteMetadata();
  const frameWidth = clampInt(Number(rawMetadata && rawMetadata.frameWidth), 1, 8192) || fallback.frameWidth;
  const frameHeight = clampInt(Number(rawMetadata && rawMetadata.frameHeight), 1, 8192) || fallback.frameHeight;
  const columns = clampInt(Number(rawMetadata && rawMetadata.columns), 1, 256) || fallback.columns;
  const rows = clampInt(Number(rawMetadata && rawMetadata.rows), 1, 256) || fallback.rows;
  const totalFrames = clampInt(Number(rawMetadata && rawMetadata.totalFrames), 1, columns * rows) || fallback.totalFrames; const frames = Array.isArray(rawMetadata && rawMetadata.frames) ? rawMetadata.frames : fallback.frames;

  return {
    frameWidth,
    frameHeight,
    columns,
    rows,
    totalFrames,
    frames
  };
}

async function loadImageAsset(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Plant sprite konnte nicht geladen werden: ${src}`));
    image.src = src;
  });
}

async function loadPlantSpriteRuntime() {
  if (plantSpriteRuntime.ready) {
    return true;
  }
  if (plantSpriteRuntime.loadingPromise) {
    return plantSpriteRuntime.loadingPromise;
  }

  plantSpriteRuntime.loadingPromise = (async () => {
    try {
      const metadataResponse = await fetch(appPath(PLANT_METADATA_ASSET), { cache: 'default' });
      if (!metadataResponse.ok) {
        throw new Error(`Metadata HTTP ${metadataResponse.status}`);
      }
    const rawMetadata = repairRuntimeTextEncoding(await metadataResponse.json());
      const metadata = normalizePlantSpriteMetadata(rawMetadata);
      const image = await loadImageAsset(appPath(PLANT_SPRITE_ASSET));

      plantSpriteRuntime.metadata = metadata;
      plantSpriteRuntime.image = image;
      plantSpriteRuntime.stageRanges = buildStageRangesFromMetadata(metadata.frames);
      plantSpriteRuntime.ready = true;
      return true;
    } catch (error) {
      console.warn('[plant] Sprite runtime konnte nicht geladen werden.', error);
      plantSpriteRuntime.ready = false;
      plantSpriteRuntime.metadata = null;
      plantSpriteRuntime.image = null;
      plantSpriteRuntime.stageRanges = DEFAULT_PLANT_STAGE_RANGES;
      return false;
    } finally {
      plantSpriteRuntime.loadingPromise = null;
    }
  })();

  return plantSpriteRuntime.loadingPromise;
}

function getPlantSpriteStageFromState(plantSnapshot) {
  const snapshot = plantSnapshot || state.plant;
  const stageIndex = clampInt(Number(snapshot && snapshot.stageIndex), 0, STAGE_INDEX_TO_SPRITE_STAGE.length - 1);
  if (Number.isFinite(stageIndex) && STAGE_INDEX_TO_SPRITE_STAGE[stageIndex]) {
    return STAGE_INDEX_TO_SPRITE_STAGE[stageIndex];
  }

  const phase = String(snapshot && snapshot.phase || '').toLowerCase();
  if (phase === 'harvest' || phase === 'dead') return 'harvest';
  if (phase === 'flowering') return 'flowering';
  if (phase === 'vegetative') return 'vegetative';
  return 'seedling';
}

function getPlantRenderSnapshot(plantSnapshot = state.plant) {
  const snapshot = plantSnapshot && typeof plantSnapshot === 'object' ? plantSnapshot : state.plant;
  if (!snapshot || typeof snapshot !== 'object') {
    return state.plant;
  }

  if (snapshot.phase === 'dead' || snapshot.isDead === true) {
    const deadStageKey = normalizeStageKey(snapshot.lastValidStageKey || snapshot.stageKey || 'stage_01');
    const deadStageIndex = clampInt(Number(String(deadStageKey).replace('stage_', '')) - 1, 0, STAGE_DEFS.length - 1);
    return {
      ...snapshot,
      phase: 'dead',
      stageIndex: deadStageIndex,
      stageKey: deadStageKey,
      stageProgress: 1
    };
  }

  if (typeof getCurrentStage !== 'function' || typeof simDayFloat !== 'function') {
    return snapshot;
  }

  const liveStage = getCurrentStage(simDayFloat());
  if (!liveStage || !liveStage.current) {
    return snapshot;
  }

  const liveStageIndex = clampInt(Number(liveStage.stageIndex), 0, STAGE_DEFS.length - 1);
  return {
    ...snapshot,
    phase: liveStage.current.phase || snapshot.phase,
    stageIndex: liveStageIndex,
    stageKey: stageAssetKeyForIndex(liveStageIndex),
    stageProgress: clamp(Number(liveStage.progressInPhase), 0, 1)
  };
}

function getPlantFrameIndex(plantSnapshot, metadataOverride) {
  const metadata = metadataOverride || plantSpriteRuntime.metadata || defaultPlantSpriteMetadata();
  const totalFrames = clampInt(Number(metadata.totalFrames), 1, 999);
  const stage = getPlantSpriteStageFromState(plantSnapshot);
  const range = plantSpriteRuntime.stageRanges[stage] || DEFAULT_PLANT_STAGE_RANGES.seedling;

  const start = clampInt(Number(range.start), 1, totalFrames);
  const end = clampInt(Number(range.end), start, totalFrames);
  const span = Math.max(1, end - start + 1);
  const progress = clamp(Number(plantSnapshot && plantSnapshot.stageProgress), 0, 1); const offset = span <= 1 ? 0 : Math.round(progress * (span - 1));
  return clampInt(start + offset, 1, totalFrames);
}

function getSpriteFrameRect(frameIndex, metadata) {
  const safeIndex = clampInt(frameIndex, 1, metadata.totalFrames) - 1;
  const frameWidth = metadata.frameWidth;
  const frameHeight = metadata.frameHeight;
  const columns = metadata.columns;
  const col = safeIndex % columns;
  const row = Math.floor(safeIndex / columns);
  return {
    sx: col * frameWidth,
    sy: row * frameHeight,
    sw: frameWidth,
    sh: frameHeight
  };
}

function getPlantRenderContainer(targetNode) {
  if (!targetNode || typeof targetNode.closest !== 'function') {
    return null;
  }
  return targetNode.closest('.plant-container')
    || targetNode.closest('.hero-stack')
    || targetNode.parentElement
    || null;
}

function syncPlantCanvasToContainer(targetNode) {
  const container = getPlantRenderContainer(targetNode);
  const widthCss = Math.max(1, Math.round(Number(container && container.clientWidth) || targetNode.clientWidth || 1));
  const heightCss = Math.max(1, Math.round(Number(container && container.clientHeight) || targetNode.clientHeight || 1));
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  const widthPx = Math.max(1, Math.round(widthCss * dpr));
  const heightPx = Math.max(1, Math.round(heightCss * dpr));

  if (targetNode.width !== widthPx || targetNode.height !== heightPx) {
    targetNode.width = widthPx;
    targetNode.height = heightPx;
  }

  return { widthCss, heightCss, widthPx, heightPx, dpr };
}

function resolveHomeBackgroundAnchorPx(targetNode, canvasMetrics) {
  const dpr = Math.max(1, Number(canvasMetrics && canvasMetrics.dpr) || 1);
  const widthPx = Math.max(1, Number(canvasMetrics && canvasMetrics.widthPx) || 1);
  const heightPx = Math.max(1, Number(canvasMetrics && canvasMetrics.heightPx) || 1);
  const fallback = {
    x: Math.round(widthPx * 0.5),
    y: Math.round(heightPx * clamp(Number(HOME_PLANT_REFERENCE_FIT.podestFootYRatio), 0.0, 1.0))
  };

  if (!targetNode || typeof targetNode.getBoundingClientRect !== 'function') {
    return fallback;
  }

  const stageNode = targetNode.closest('.home-plant-stage');
  const appHud = document.getElementById('app-hud');
  if (!stageNode || !appHud || typeof appHud.getBoundingClientRect !== 'function') {
    return fallback;
  }

  const stageRect = stageNode.getBoundingClientRect();
  const appHudRect = appHud.getBoundingClientRect();
  if (!(stageRect.width > 0 && stageRect.height > 0 && appHudRect.width > 0 && appHudRect.height > 0)) {
    return fallback;
  }

  const backgroundWidthPx = Math.max(1, Number(HOME_PLANT_REFERENCE_FIT.backgroundWidthPx) || 393);
  const backgroundHeightPx = Math.max(1, Number(HOME_PLANT_REFERENCE_FIT.backgroundHeightPx) || 852);
  const coverScale = Math.max(appHudRect.width / backgroundWidthPx, appHudRect.height / backgroundHeightPx);
  const renderedBgWidthCss = backgroundWidthPx * coverScale;
  const renderedBgHeightCss = backgroundHeightPx * coverScale;
  const backgroundLeftCss = appHudRect.left + ((appHudRect.width - renderedBgWidthCss) / 2);
  const backgroundTopCss = appHudRect.top + ((appHudRect.height - renderedBgHeightCss) / 2);
  const podestCenterXRatio = clamp(Number(HOME_PLANT_REFERENCE_FIT.podestCenterXRatio), 0.0, 1.0);
  const podestFootYRatio = clamp(Number(HOME_PLANT_REFERENCE_FIT.podestFootYRatio), 0.0, 1.0);
  const anchorBackgroundXCss = backgroundLeftCss + (renderedBgWidthCss * podestCenterXRatio);
  const anchorBackgroundYCss = backgroundTopCss + (renderedBgHeightCss * podestFootYRatio);
  const localAnchorXCss = anchorBackgroundXCss - stageRect.left;
  const localAnchorYCss = anchorBackgroundYCss - stageRect.top;

  return {
    x: Math.round(localAnchorXCss * dpr),
    y: Math.round(localAnchorYCss * dpr)
  };
}

function getOpaqueBoundsForFallbackImage(image, cacheKey) {
  const safeKey = String(cacheKey || '');
  if (safeKey && plantSpriteRuntime.fallbackBoundsCache.has(safeKey)) {
    return plantSpriteRuntime.fallbackBoundsCache.get(safeKey);
  }

  const width = Math.max(1, Number(image && image.naturalWidth) || Number(image && image.width) || 1);
  const height = Math.max(1, Number(image && image.naturalHeight) || Number(image && image.height) || 1);
  const ctx = ensureFrameBoundsContext(width, height);
  if (!ctx) {
    const fallback = { x: 0, y: 0, w: width, h: height };
    if (safeKey) {
      plantSpriteRuntime.fallbackBoundsCache.set(safeKey, fallback);
    }
    return fallback;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const alphaThreshold = 8;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const alpha = data[rowOffset + (x * 4) + 3];
      if (alpha <= alphaThreshold) {
        continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const hasOpaquePixels = maxX >= minX && maxY >= minY;
  const bounds = hasOpaquePixels
    ? { x: minX, y: minY, w: (maxX - minX + 1), h: (maxY - minY + 1) }
    : { x: 0, y: 0, w: width, h: height };

  if (safeKey) {
    plantSpriteRuntime.fallbackBoundsCache.set(safeKey, bounds);
  }

  return bounds;
}

function getHomePlantPlacement(srcW, srcH, visibleBounds, canvasMetrics, targetNode) {
  const safeSrcW = Math.max(1, Number(srcW) || 1);
  const safeSrcH = Math.max(1, Number(srcH) || 1);
  const dstW = Math.max(1, Number(canvasMetrics && canvasMetrics.widthPx) || 1);
  const dstH = Math.max(1, Number(canvasMetrics && canvasMetrics.heightPx) || 1);
  const dpr = Math.max(1, Number(canvasMetrics && canvasMetrics.dpr) || 1);
  const bounds = visibleBounds && Number(visibleBounds.w) > 0 && Number(visibleBounds.h) > 0
    ? visibleBounds
    : { x: 0, y: 0, w: safeSrcW, h: safeSrcH };

  const containScale = Math.min(dstW / Math.max(1, bounds.w), dstH / Math.max(1, bounds.h));
  const fitScale = clamp(HOME_PLANT_REFERENCE_FIT.maxFootprintScale, 0.1, 4.5);
  const scale = containScale * fitScale;
  const drawW = Math.max(1, Math.round(safeSrcW * scale));
  const drawH = Math.max(1, Math.round(safeSrcH * scale));
  const anchorPx = resolveHomeBackgroundAnchorPx(targetNode, canvasMetrics);
  const visibleCenterX = (Number(bounds.x) + (Number(bounds.w) / 2)) * scale;
  const visibleBottomY = (Number(bounds.y) + Number(bounds.h)) * scale;
  const dx = Math.round(anchorPx.x - visibleCenterX);
  const anchorY = anchorPx.y;
  const baselineInsetCss = Number(HOME_PLANT_REFERENCE_FIT.baselineInsetPx) || 0;
  const baselineInsetPx = Math.round(baselineInsetCss * dpr);
  const dy = Math.round(anchorY - visibleBottomY - baselineInsetPx);

  return {
    fitScale,
    drawW,
    drawH,
    dx,
    dy,
    anchorY
  };
}

function ensureFrameBoundsContext(frameWidth, frameHeight) {
  const safeW = Math.max(1, clampInt(frameWidth, 1, 8192));
  const safeH = Math.max(1, clampInt(frameHeight, 1, 8192));

  if (!plantSpriteRuntime.boundsCanvas) {
    plantSpriteRuntime.boundsCanvas = document.createElement('canvas');
    plantSpriteRuntime.boundsCtx = plantSpriteRuntime.boundsCanvas.getContext('2d', { willReadFrequently: true, alpha: true });
  }

  if (plantSpriteRuntime.boundsCanvas.width !== safeW || plantSpriteRuntime.boundsCanvas.height !== safeH) {
    plantSpriteRuntime.boundsCanvas.width = safeW;
    plantSpriteRuntime.boundsCanvas.height = safeH;
  }

  return plantSpriteRuntime.boundsCtx;
}

function getOpaqueBoundsForFrame(frameRect, frameIndex) {
  const cached = plantSpriteRuntime.frameBoundsCache.get(frameIndex);
  if (cached) {
    return cached;
  }

  const ctx = ensureFrameBoundsContext(frameRect.sw, frameRect.sh);
  if (!ctx) {
    const fallback = { x: 0, y: 0, w: frameRect.sw, h: frameRect.sh };
    plantSpriteRuntime.frameBoundsCache.set(frameIndex, fallback);
    return fallback;
  }

  ctx.clearRect(0, 0, frameRect.sw, frameRect.sh);
  ctx.drawImage(
    plantSpriteRuntime.image,
    frameRect.sx,
    frameRect.sy,
    frameRect.sw,
    frameRect.sh,
    0,
    0,
    frameRect.sw,
    frameRect.sh
  );

  const imageData = ctx.getImageData(0, 0, frameRect.sw, frameRect.sh);
  const data = imageData.data;
  const alphaThreshold = 8;
  let minX = frameRect.sw;
  let minY = frameRect.sh;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < frameRect.sh; y += 1) {
    const rowOffset = y * frameRect.sw * 4;
    for (let x = 0; x < frameRect.sw; x += 1) {
      const alpha = data[rowOffset + (x * 4) + 3];
      if (alpha <= alphaThreshold) {
        continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const hasOpaquePixels = maxX >= minX && maxY >= minY;
  const bounds = hasOpaquePixels
    ? { x: minX, y: minY, w: (maxX - minX + 1), h: (maxY - minY + 1) }
    : { x: 0, y: 0, w: frameRect.sw, h: frameRect.sh };

  plantSpriteRuntime.frameBoundsCache.set(frameIndex, bounds);
  return bounds;
}

function renderPlantFromSprite(targetNode) {
  if (!targetNode || typeof targetNode.getContext !== 'function') {
    return;
  }
  if (!plantSpriteRuntime.ready || !plantSpriteRuntime.image || !plantSpriteRuntime.metadata) {
    renderPlantFallback(targetNode);
    return;
  }

  const metadata = plantSpriteRuntime.metadata;
  const plantRenderState = getPlantRenderSnapshot(state.plant);
  const nextFrameIndex = getPlantFrameIndex(plantRenderState, metadata);
  const stageName = normalizeStageKey(plantRenderState.stageKey);
  const canvasMetrics = syncPlantCanvasToContainer(targetNode);
  const currentFrame = Number(targetNode.dataset.frameIndex || 0);
  const currentStage = targetNode.dataset.stageName || '';
  const currentCanvasW = Number(targetNode.dataset.canvasWidth || 0);
  const currentCanvasH = Number(targetNode.dataset.canvasHeight || 0);
  if (currentFrame === nextFrameIndex
    && currentStage === stageName
    && currentCanvasW === canvasMetrics.widthPx
    && currentCanvasH === canvasMetrics.heightPx) {
    return;
  }

  const frameRect = getSpriteFrameRect(nextFrameIndex, metadata);
  const srcW = Math.max(1, frameRect.sw);
  const srcH = Math.max(1, frameRect.sh);
  const visibleBounds = getOpaqueBoundsForFrame(frameRect, nextFrameIndex);
  const placement = getHomePlantPlacement(srcW, srcH, visibleBounds, canvasMetrics, targetNode);
  const spriteStage = getPlantSpriteStageFromState(plantRenderState);

  const ctx = targetNode.getContext('2d', { alpha: true });
  if (!ctx) {
    console.warn('[plant] 2D context unavailable, using fallback render.');
    renderPlantFallback(targetNode);
    return;
  }
  ctx.clearRect(0, 0, targetNode.width, targetNode.height);
  ctx.drawImage(
    plantSpriteRuntime.image,
    frameRect.sx,
    frameRect.sy,
    srcW,
    srcH,
    placement.dx,
    placement.dy,
    placement.drawW,
    placement.drawH
  );

  targetNode.dataset.frameIndex = String(nextFrameIndex);
  targetNode.dataset.stageName = stageName;
  targetNode.dataset.spriteStage = spriteStage;
  targetNode.dataset.fitScale = String(placement.fitScale);
  targetNode.dataset.anchorY = String(placement.anchorY);
  targetNode.dataset.canvasWidth = String(canvasMetrics.widthPx);
  targetNode.dataset.canvasHeight = String(canvasMetrics.heightPx);

  state.plant.assets.basePath = 'assets/plant_growth/';
  state.plant.assets.resolvedStagePath = plantAssetPath(plantRenderState.stageKey);
}

function getCanonicalSimulation(snapshot) {
  return requireStorageModule().getCanonicalSimulation(snapshot);
}

function getCanonicalPlant(snapshot) {
  return requireStorageModule().getCanonicalPlant(snapshot);
}

function getCanonicalEvents(snapshot) {
  return requireStorageModule().getCanonicalEvents(snapshot);
}

function getCanonicalHistory(snapshot) {
  return requireStorageModule().getCanonicalHistory(snapshot);
}

function getCanonicalMeta(snapshot) {
  return requireStorageModule().getCanonicalMeta(snapshot);
}
function getActionIconPath(action) {
  const gameplayPath = getCareActionAssetPath(action);
  if (gameplayPath) {
    return gameplayPath;
  }
  const cat = action.category || 'environment';
  const intensity = action.intensity || 'low';
  if (cat === 'watering') { return intensity === 'high' ? 'assets/ui/icons/icon_water.svg' : 'assets/ui/icons/icon_water.svg';
  }
  if (cat === 'fertilizing') {
    return 'assets/ui/icons/icon_nutrients.svg';
  }
  if (cat === 'training') {
    return 'assets/ui/icons/icon_growth.svg';
  }
  return 'assets/ui/icons/icon_airflow.svg';
}

function getCareActionAssetPath(action) {
  if (!action || typeof action !== 'object') {
    return '';
  }

  const category = String(action.category || 'environment').toLowerCase();
  const intensity = String(action.intensity || 'medium').toLowerCase();
  const actionId = String(action.id || '').toLowerCase();

  const environmentByActionId = {
    environment_low_airflow: 'assets/gameplay/actions/environment_airflow.png',
    environment_medium_climate: 'assets/gameplay/actions/environment_climate.png',
    environment_high_co2: 'assets/gameplay/actions/environment_climate.png',
    environment_high_reset: 'assets/gameplay/actions/environment_reset.png'
  };
  if (environmentByActionId[actionId]) {
    return environmentByActionId[actionId];
  }

  const directByCategoryIntensity = {
    watering: {
      low: 'assets/gameplay/actions/watering_low.png',
      medium: 'assets/gameplay/actions/watering_medium.png',
      high: 'assets/gameplay/actions/watering_high.png'
    },
    fertilizing: {
      low: 'assets/gameplay/actions/fertilizing_low.png',
      medium: 'assets/gameplay/actions/fertilizing_medium.png',
      high: 'assets/gameplay/actions/fertilizing_high.png'
    },
    training: {
      low: 'assets/gameplay/actions/training_low.png',
      medium: 'assets/gameplay/actions/training_medium.png',
      high: 'assets/gameplay/actions/training_high.png'
    },
    environment: {
      low: 'assets/gameplay/actions/environment_airflow.png',
      medium: 'assets/gameplay/actions/environment_climate.png',
      high: 'assets/gameplay/actions/environment_reset.png'
    }
  };

  const categoryMap = directByCategoryIntensity[category];
  if (categoryMap && categoryMap[intensity]) {
    return categoryMap[intensity];
  }
  return '';
}

function getCanonicalSettings(snapshot) {
  return requireStorageModule().getCanonicalSettings(snapshot);
}

function getCanonicalNotificationsSettings(snapshot) {
  return requireStorageModule().getCanonicalNotificationsSettings(snapshot);
}

async function restoreState() {
  return requireStorageModule().restoreState(...arguments);
}

function migrateLegacyStateIntoCanonical(saved, targetState) {
  return requireStorageModule().migrateLegacyStateIntoCanonical(...arguments);
}

async function persistState() {
  return requireStorageModule().persistState(...arguments);
}

function schedulePersistState(immediate = false) {
  return requireStorageModule().schedulePersistState(...arguments);
}

function migrateState() {
  return requireStorageModule().migrateState(...arguments);
}

function resetStateToDefaults() {
  return requireStorageModule().resetStateToDefaults(...arguments);
}

function ensureStateIntegrity(nowMs) {
  return requireStorageModule().ensureStateIntegrity(...arguments);
}

function syncCanonicalStateShape() {
  return requireStorageModule().syncCanonicalStateShape(...arguments);
}

function syncLegacyMirrorsFromCanonical(snapshot) {
  return requireStorageModule().syncLegacyMirrorsFromCanonical(...arguments);
}

function requestRescueAd() {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({ ok: true });
    }, 1200);
  });
}

function applyRescueEffects() {
  const before = {
    health: Number(state.status.health) || 0,
    stress: Number(state.status.stress) || 0,
    risk: Number(state.status.risk) || 0,
    growth: Number(state.status.growth) || 0,
    water: Number(state.status.water) || 0,
    nutrition: Number(state.status.nutrition) || 0,
    qualityScore: Number(state.plant.lifecycle.qualityScore) || 0
  };
  const wasDead = isPlantDead();
  const isCriticalAlive = !wasDead && before.health < 20;
  if (!wasDead && !isCriticalAlive) {
    return { ok: false };
  }

  if (wasDead) {
    state.status.health = 34;
    state.status.stress = before.stress - 22;
    state.status.risk = before.risk - 18;
    state.status.water = Math.max(before.water, 40);
    state.status.nutrition = Math.max(before.nutrition, 32);
    state.status.growth = Math.max(4, before.growth - 2);
    if (state.plant && state.plant.lifecycle && Number.isFinite(before.qualityScore)) {
      state.plant.lifecycle.qualityScore = round2(Math.max(0, before.qualityScore - 6));
    }
    state.plant.isDead = false;
    if (state.plant.phase === 'dead') {
      const safeIndex = clampInt(Number(state.plant.stageIndex) || 0, 0, Math.max(0, getStageTimeline().length - 1));
      state.plant.phase = getStageTimeline()[safeIndex].phase || 'seedling';
    }
    state.ui.deathOverlayOpen = false;
    state.ui.deathOverlayAcknowledged = true;
  } else {
    state.status.health = before.health + 15;
    state.status.stress = before.stress - 10;
    state.status.risk = before.risk - 10;
  }

  clampStatus();

  const after = {
    health: Number(state.status.health) || 0,
    stress: Number(state.status.stress) || 0,
    risk: Number(state.status.risk) || 0,
    growth: Number(state.status.growth) || 0,
    water: Number(state.status.water) || 0,
    nutrition: Number(state.status.nutrition) || 0,
    qualityScore: Number(state.plant.lifecycle.qualityScore) || 0
  };

  return {
    ok: true,
    wasDead,
    effectsApplied: {
      health: round2(after.health - before.health),
      stress: round2(after.stress - before.stress),
      risk: round2(after.risk - before.risk),
      growth: round2(after.growth - before.growth),
      water: round2(after.water - before.water),
      nutrition: round2(after.nutrition - before.nutrition),
      qualityScore: round2(after.qualityScore - before.qualityScore)
    }
  };
}

function syncRuntimeClocks(nowMs) {
  state.simulation.nowMs = nowMs;
  if (!Number.isFinite(state.simulation.simTimeMs)) {
    state.simulation.simTimeMs = alignToSimStartHour(nowMs, SIM_START_HOUR);
  }
  state.simulation.isDaytime = isDaytimeAtSimTime(state.simulation.simTimeMs);
  if (!Number.isFinite(state.simulation.lastTickRealTimeMs)) {
    state.simulation.lastTickRealTimeMs = nowMs;
  }
  state.simulation.baseSpeed = normalizeBaseSimulationSpeed(state.simulation.baseSpeed || state.simulation.timeCompression);
  state.simulation.effectiveSpeed = getEffectiveSimulationSpeed(nowMs);
  state.simulation.timeCompression = state.simulation.effectiveSpeed;
}

async function loadEventCatalog() {
  const catalogs = [];
  let primaryCatalogLoaded = false;
  let primaryCatalogFailure = null;

  const primaryRequests = [
    { url: `./data/events.json?v=${EVENTS_CATALOG_VERSION}`, cache: 'no-store', label: 'versioned' },
    { url: './data/events.json', cache: 'default', label: 'unversioned_fallback' }
  ];

  for (const request of primaryRequests) {
    if (primaryCatalogLoaded) {
      break;
    }

    try {
      const response = await fetch(request.url, { cache: request.cache });
      if (!response.ok) {
        primaryCatalogFailure = `${request.label}: HTTP ${response.status}`;
        continue;
      }

      const payload = repairRuntimeTextEncoding(await response.json()); const events = Array.isArray(payload) ? payload : payload.events;
      if (Array.isArray(events)) {
        catalogs.push(...events.map((eventDef) => normalizeEvent(eventDef, 'v1')).filter(Boolean));
        primaryCatalogLoaded = true;
        if (request.label !== 'versioned') {
          console.warn('[events] primärer Katalog über unversionierten Fallback geladen', { url: request.url });
        }
      } else {
        primaryCatalogFailure = `${request.label}: Invalid events payload`;
      }
    } catch (error) {
      primaryCatalogFailure = `${request.label}: ${error && error.message ? error.message : String(error)}`;
    }
  }

  try {
    const foundation = await fetch('./data/events.foundation.json', { cache: 'default' });
    if (foundation.ok) {
      const payload = repairRuntimeTextEncoding(await foundation.json()); const events = Array.isArray(payload) ? payload : payload.events;
      if (Array.isArray(events)) {
        catalogs.push(...events.map((eventDef) => normalizeEvent(eventDef, 'foundation')).filter(Boolean));
      }
    }
  } catch (_error) {
    // optional foundation catalog
  }

  try {
    const v2 = await fetch('./data/events.v2.json', { cache: 'default' });
    if (v2.ok) {
      const payload = repairRuntimeTextEncoding(await v2.json()); const events = Array.isArray(payload) ? payload : payload.events;
      if (Array.isArray(events)) {
        catalogs.push(...events.map((eventDef) => normalizeEvent(eventDef, 'v2')).filter(Boolean));
      }
    }
  } catch (_error) {
    // optional catalog, keep working with v1/fallback
  }

  if (!catalogs.length) {
    catalogs.push(normalizeEvent({
      id: 'fallback_soil_check',
      category: 'water',
      title: 'Bodenfeuchte prüfen',
      description: 'Bei der manuellen Kontrolle wurde ungleichmäßige Feuchte festgestellt.',
      choices: [
        { id: 'fallback_care', label: 'Ausgewogene Pflege anwenden', effects: { water: 6, stress: -2, health: 2 } },
        { id: 'fallback_wait', label: 'Einen Zyklus warten', effects: { stress: 2, risk: 2 } },
        { id: 'fallback_mix', label: 'Obere Schicht vorsichtig auflockern', effects: { health: 1, risk: -1 } }
      ]
    }, 'v1'));

    addLog('system', 'events.json/events.v2.json konnten nicht geladen werden, Fallback-Katalog aktiv', null);
  }

  if (!primaryCatalogLoaded) {
    console.warn('[events] primärer Katalog events.json nicht verfügbar, Fallback-Kataloge aktiv', {
      reason: primaryCatalogFailure || 'unbekannt'
    });
  }

  state.events.catalog = catalogs.filter(Boolean);
}

async function loadActionsCatalog() {
  const requestUrls = [
    { url: `./data/actions.json?v=${ACTIONS_CATALOG_VERSION}`, cache: 'no-store' },
    { url: './data/actions.json', cache: 'default' }
  ];
  const attemptErrors = [];

  for (const request of requestUrls) {
    try {
      const response = await fetch(request.url, { cache: request.cache });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = repairRuntimeTextEncoding(await response.json());
      const actions = Array.isArray(payload) ? payload : payload.actions;
      if (!Array.isArray(actions)) {
        throw new Error('Invalid actions payload');
      }

      const normalized = actions.map(normalizeAction).filter(Boolean);
      state.actions.catalog = normalized;
      state.actions.byId = Object.fromEntries(normalized.map((action) => [action.id, action]));

      console.log('[care] actions catalog loaded', {
        url: request.url,
        count: normalized.length
      });

      if (!normalized.length) {
        console.warn('[care] actions catalog loaded but empty', {
          url: request.url
        });
      }

      if (state.ui && state.ui.openSheet === 'care' && typeof renderCareSheet === 'function') {
        renderCareSheet(true);
      }
      return;
    } catch (error) {
      attemptErrors.push({
        url: request.url,
        message: error && error.message ? error.message : String(error)
      });
    }
  }

  state.actions.catalog = [];
  state.actions.byId = {};
  console.error('[care] failed to load actions catalog', attemptErrors);
  addLog('system', 'actions.json konnte nicht geladen werden, Aktionssystem ohne Katalog', {
    error: attemptErrors.map((entry) => `${entry.url}: ${entry.message}`).join(' | ')
  });
}

function normalizeAction(rawAction) {
  if (!rawAction || typeof rawAction !== 'object' || !rawAction.id) {
    return null;
  }

  const base = {
    id: String(rawAction.id),
    category: String(rawAction.category || 'generic'),
    intensity: String(rawAction.intensity || 'medium'),
    label: String(rawAction.label || rawAction.id),
    trigger: rawAction.trigger && typeof rawAction.trigger === 'object' ? rawAction.trigger : {},
    prerequisites: rawAction.prerequisites && typeof rawAction.prerequisites === 'object' ? rawAction.prerequisites : {},
    effects: rawAction.effects && typeof rawAction.effects === 'object' ? rawAction.effects : {},
    uxCopy: rawAction.uxCopy && typeof rawAction.uxCopy === 'object' ? rawAction.uxCopy : {},
    riskNotes: String(rawAction.riskNotes || ''),
    careNotes: String(rawAction.careNotes || ''),
    rootZoneInfluence: rawAction.rootZoneInfluence && typeof rawAction.rootZoneInfluence === 'object' ? rawAction.rootZoneInfluence : {},
    climateInfluence: rawAction.climateInfluence && typeof rawAction.climateInfluence === 'object' ? rawAction.climateInfluence : {},
    environmentInfluence: rawAction.environmentInfluence && typeof rawAction.environmentInfluence === 'object' ? rawAction.environmentInfluence : {},
    cooldownRealMinutes: clamp(rawAction.cooldownRealMinutes, 0, 24 * 60),
    sideEffects: Array.isArray(rawAction.sideEffects) ? rawAction.sideEffects : []
  };

  const immediateRaw = base.effects.immediate;
  if (Array.isArray(immediateRaw)) {
    base.effects.immediate = immediateRaw
      .filter((entry) => entry && typeof entry === 'object' && entry.stat)
      .map((entry) => ({
        stat: String(entry.stat),
        mode: String(entry.mode || 'add'),
        value: Number(entry.value),
        min: Number(entry.min),
        max: Number(entry.max),
        label: entry.label ? String(entry.label) : ''
      }));
  } else { base.effects.immediate = immediateRaw && typeof immediateRaw === 'object' ? immediateRaw : {};
  } base.effects.overTime = base.effects.overTime && typeof base.effects.overTime === 'object' ? base.effects.overTime : {};
  base.effects.durationSimMinutes = clamp(base.effects.durationSimMinutes, 0, 24 * 60);

  return base;
}

function normalizeEvent(rawEvent, sourceVersion = 'v1') {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return null;
  }
  if (!rawEvent.id || !rawEvent.title || !rawEvent.description) {
    return null;
  }

  const rawOptions = Array.isArray(rawEvent.options) ? rawEvent.options : (Array.isArray(rawEvent.choices) ? rawEvent.choices : []);

  const options = rawOptions
    .slice(0, 3)
    .map((option) => ({
      id: String(option.id || ''),
      label: String(option.label || 'Option'),
      effects: option.effects && typeof option.effects === 'object' ? option.effects : {},
      sideEffects: Array.isArray(option.sideEffects) ? option.sideEffects : [],
      followUps: Array.isArray(option.followUps) ? option.followUps.map(String) : (option.followUp ? [String(option.followUp)] : []),
      uiCopy: option.uiCopy && typeof option.uiCopy === 'object' ? option.uiCopy : {}
    }))
    .filter((option) => Boolean(option.id));

  if (!options.length) {
    return null;
  }

  const category = String(rawEvent.category || inferCategoryFromTags(rawEvent.tags || []));
  const normalizedSeed = {
    category,
    polarity: inferEventPolarity(rawEvent, category)
  };
  const eventAssetsApi = window.GrowSimEventAssets;
  const imagePath = eventAssetsApi && typeof eventAssetsApi.resolveEventImagePath === 'function' ? String(eventAssetsApi.resolveEventImagePath(rawEvent, normalizedSeed) || '') : String(rawEvent.imagePath || rawEvent.image || '');

  return {
    id: String(rawEvent.id),
    category,
    title: String(rawEvent.title),
    description: String(rawEvent.description),
    triggers: rawEvent.triggers && typeof rawEvent.triggers === 'object' ? rawEvent.triggers : {},
    constraints: inferEventConstraints(rawEvent, category),
    allowedPhases: Array.isArray(rawEvent.allowedPhases) ? rawEvent.allowedPhases.map((phase) => String(phase)).filter(Boolean) : [],
    weight: Math.max(0.01, Number(rawEvent.weight) || normalizeSeverity(rawEvent.severity) || 1),
    cooldownRealMinutes: clamp(Number(rawEvent.cooldownRealMinutes) || 120, 10, 24 * 60),
    learningNote: String(rawEvent.learningNote || ''),
    severity: normalizeSeverity(rawEvent.severity),
    polarity: normalizedSeed.polarity,
    environment: inferEnvironmentScope(rawEvent),
    tags: Array.isArray(rawEvent.tags) ? rawEvent.tags.map(String) : [],
    tone: String(rawEvent.tone || ''),
    isFollowUp: rawEvent.isFollowUp === true,
    imagePath,
    options,
    sourceVersion
  };
}

function inferEventConstraints(rawEvent, category) {
  const raw = rawEvent && rawEvent.constraints && typeof rawEvent.constraints === 'object' ? rawEvent.constraints : {};

  const stageRule = rawEvent && rawEvent.triggers && rawEvent.triggers.stage && typeof rawEvent.triggers.stage === 'object' ? rawEvent.triggers.stage : {};

  const hasUserConstraints = Object.keys(raw).length > 0; const minStageFromTrigger = Number.isFinite(Number(stageRule.min)) ? Number(stageRule.min) : null;

  const defaultsByCategory = {
    water: { minDay: 2, minPlantSize: 10, minRootMass: 10 },
    nutrition: { minDay: 4, minPlantSize: 16, minRootMass: 18 },
    pest: { minDay: 6, minPlantSize: 20, minRootMass: 18 },
    disease: { minDay: 7, minPlantSize: 22, minRootMass: 20 },
    environment: { minDay: 3, minPlantSize: 12, minRootMass: 12 },
    positive: {
      minDay: 3,
      minPlantSize: 10,
      minRootMass: 10,
      environmentState: { minTemperatureC: 20, maxTemperatureC: 31, minHumidityPercent: 44, maxHumidityPercent: 72, minVpdKpa: 0.6, maxVpdKpa: 1.45, minAirflowScore: 45 },
      rootZone: { minPh: 5.6, maxPh: 6.4, minEc: 0.9, maxEc: 1.9, minOxygenPercent: 50 }
    },
    generic: { minDay: 3, minPlantSize: 10, minRootMass: 10 }
  };

  const base = defaultsByCategory[String(category || 'generic')] || defaultsByCategory.generic;
  const merged = {
    minStage: minStageFromTrigger,
    minDay: Number.isFinite(Number(raw.minDay)) ? Number(raw.minDay) : base.minDay,
    minPlantSize: Number.isFinite(Number(raw.minPlantSize)) ? Number(raw.minPlantSize) : base.minPlantSize,
    minRootMass: Number.isFinite(Number(raw.minRootMass)) ? Number(raw.minRootMass) : base.minRootMass,
    maxStage: Number.isFinite(Number(raw.maxStage)) ? Number(raw.maxStage) : null,
    maxDay: Number.isFinite(Number(raw.maxDay)) ? Number(raw.maxDay) : null,
    environmentState: raw.environmentState && typeof raw.environmentState === 'object' ? { ...(base.environmentState || {}), ...raw.environmentState } : (base.environmentState || null),
    rootZone: raw.rootZone && typeof raw.rootZone === 'object' ? { ...(base.rootZone || {}), ...raw.rootZone } : (base.rootZone || null)
  };

  if (!hasUserConstraints && !Number.isFinite(Number(merged.minStage))) { merged.minStage = base.minPlantSize >= 20 ? 3 : 2;
  }

  return merged;
}

function inferCategoryFromTags(tags) { const t = Array.isArray(tags) ? tags.map((x) => String(x).toLowerCase()) : [];
  if (t.some((x) => x.includes('water') || x.includes('soil'))) return 'water';
  if (t.some((x) => x.includes('nutri') || x.includes('n'))) return 'nutrition';
  if (t.some((x) => x.includes('pest'))) return 'pest';
  if (t.some((x) => x.includes('mold') || x.includes('disease'))) return 'disease';
  if (t.some((x) => x.includes('train'))) return 'training';
  if (t.some((x) => x.includes('env') || x.includes('heat') || x.includes('cold') || x.includes('weather'))) return 'environment';
  if (t.some((x) => x.includes('positive') || x.includes('recovery') || x.includes('ideal'))) return 'positive';
  return 'generic';
}

function inferEventPolarity(rawEvent, category) {
  const explicit = String((rawEvent && rawEvent.polarity) || '').trim().toLowerCase();
  if (explicit === 'positive' || explicit === 'negative' || explicit === 'neutral') {
    return explicit;
  }

  if (String(category) === 'positive') {
    return 'positive';
  }

  const tags = Array.isArray(rawEvent && rawEvent.tags) ? rawEvent.tags.map((x) => String(x).toLowerCase()) : [];

  if (tags.some((x) => x.includes('positive') || x.includes('ideal') || x.includes('recovery') || x.includes('bonus'))) {
    return 'positive';
  }

  return 'negative';
}

function inferEnvironmentScope(rawEvent) {
  const setup = rawEvent && rawEvent.triggers && rawEvent.triggers.setup && typeof rawEvent.triggers.setup === 'object' ? rawEvent.triggers.setup : {}; const modeIn = Array.isArray(setup.modeIn) ? setup.modeIn.map((x) => String(x).toLowerCase()) : [];
  if (!modeIn.length) {
    return 'both';
  }

  const hasIndoor = modeIn.includes('indoor');
  const hasOutdoor = modeIn.includes('outdoor') || modeIn.includes('greenhouse');

  if (hasIndoor && hasOutdoor) return 'both';
  if (hasIndoor) return 'indoor';
  if (hasOutdoor) return 'outdoor';
  return 'both';
}

function syncActiveEventFromCatalog() {
  if (state.events.machineState !== 'activeEvent' || !state.events.activeEventId) {
    return;
  }

  const eventDef = state.events.catalog.find((eventItem) => eventItem.id === state.events.activeEventId);
  if (!eventDef) {
    return;
  }

  state.events.activeEventTitle = eventDef.title;
  state.events.activeEventText = eventDef.description;
  state.events.activeLearningNote = eventDef.learningNote || '';
  state.events.activeSeverity = eventDef.severity;
  state.events.activeCooldownRealMinutes = eventDef.cooldownRealMinutes || 120;
  state.events.activeCategory = eventDef.category || 'generic'; state.events.activeTags = Array.isArray(eventDef.tags) ? eventDef.tags.slice(0, 5) : [];
  state.events.activeImagePath = String(eventDef.imagePath || '');

  const byOptionId = new Map(eventDef.options.map((option) => [option.id, option]));
  const currentIds = Array.isArray(state.events.activeOptions) ? state.events.activeOptions.map((option) => option.id) : [];

  const localizedOptions = [];
  for (const optionId of currentIds) {
    const localizedOption = byOptionId.get(optionId);
    if (localizedOption) {
      localizedOptions.push({
        id: localizedOption.id,
        label: localizedOption.label,
        effects: { ...(localizedOption.effects || {}) },
        sideEffects: Array.isArray(localizedOption.sideEffects) ? localizedOption.sideEffects : [],
        followUps: Array.isArray(localizedOption.followUps) ? localizedOption.followUps : []
      });
    }
  }

  if (!localizedOptions.length) {
    for (const option of eventDef.options.slice(0, 3)) {
      localizedOptions.push({
        id: option.id,
        label: option.label,
        effects: { ...(option.effects || {}) },
        sideEffects: Array.isArray(option.sideEffects) ? option.sideEffects : [],
        followUps: Array.isArray(option.followUps) ? option.followUps : []
      });
    }
  }

  state.events.activeOptions = localizedOptions.slice(0, 3);
}

function normalizeSeverity(rawSeverity) {
  if (Number.isFinite(rawSeverity)) {
    return clampInt(rawSeverity, 1, 5);
  }

  if (typeof rawSeverity === 'string') {
    const lowered = rawSeverity.trim().toLowerCase();
    if (lowered === 'low') {
      return 2;
    }
    if (lowered === 'medium') {
      return 3;
    }
    if (lowered === 'high') {
      return 4;
    }
    const asNumber = Number(lowered);
    if (Number.isFinite(asNumber)) {
      return clampInt(asNumber, 1, 5);
    }
  }

  return 3;
}

function computeEventDynamicWeight(item) {
  return callCanonicalEventsRuntime('computeEventDynamicWeight', item);
}

function selectEventDeterministically(catalog, nowMs) {
  return callCanonicalEventsRuntime('selectEventDeterministically', catalog, nowMs);
}

function scheduleNextEventRoll(nowMs, reason) {
  return callCanonicalEventsRuntime('scheduleNextEventRoll', nowMs, reason);
}

async function registerServiceWorker() {
  return callCanonicalEventsRuntime('registerServiceWorker');
}

function showServiceWorkerHint() {
  // BLOCK 1: suppress non-critical boot warning banner in normal startup.
  if (window.__gsShowBootWarnings !== true) {
    return;
  }

  if (document.getElementById('swHintBanner')) {
    return;
  }
  const banner = document.createElement('div');
  banner.id = 'swHintBanner';
  banner.className = 'boot-error-banner boot-warning-banner';
  banner.innerHTML = '<strong>Service Worker noch nicht aktiv – bitte einmal normal neu laden.</strong>';
  document.body.appendChild(banner);
}

async function schedulePushIfAllowed(_force) {
  // Lokale Benachrichtigungen nutzen aktuell kein Backend-Push-Scheduling.
}

function canNotify(type) {
  const notifications = getCanonicalNotificationsSettings(state);
  if (notifications.enabled !== true) {
    return false;
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }

  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return false;
  }

  if (type && notifications.types[type] !== true) {
    return false;
  }

  return true;
}

function notify(type, title, body) {
  if (!canNotify(type)) {
    return;
  }

  const tagByType = {
    events: 'gs-events',
    critical: 'gs-critical',
    reminder: 'gs-reminder'
  };
  const tag = tagByType[type] || 'gs-generic';

  navigator.serviceWorker.controller.postMessage({
    type: 'GS_SHOW_NOTIFICATION',
    title,
    options: {
      body,
      icon: new URL('icons/icon-192.png', self.location).href,
      badge: new URL('icons/icon-192.png', self.location).href,
      tag
    }
  });
}

function evaluateNotificationTriggers(nowMs) {
  notifyEventAvailability();
  notifyCriticalState(nowMs);
  notifyReminder(nowMs);
}

function notifyEventAvailability() {
  if (state.events.machineState !== 'activeEvent') {
    return;
  }

  const notifications = getCanonicalNotificationsSettings(state);
  const eventId = state.events.activeEventId || null;
  if (!eventId || notifications.runtime.lastNotifiedEventId === eventId) {
    return;
  }

  notify('events', 'Grow Simulator', 'Ein Ereignis ist verfügbar. Tippe, um zu reagieren.');
  notifications.runtime.lastNotifiedEventId = eventId;
}

function notifyCriticalState(nowMs) {
  const notifications = getCanonicalNotificationsSettings(state); const currentNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const cooldownMs = 60 * 1000;
  if ((currentNowMs - Number(notifications.runtime.lastCriticalAtRealMs || 0)) < cooldownMs) {
    return;
  }

  const s = state.status || {};
  const critical = Number(s.health) <= 15 || Number(s.risk) >= 75 || Number(s.stress) >= 80;
  if (!critical) {
    return;
  }

  const scores = [
    { key: 'health', score: Math.max(0, 15 - Number(s.health || 0)) },
    { key: 'risk', score: Math.max(0, Number(s.risk || 0) - 75) },
    { key: 'stress', score: Math.max(0, Number(s.stress || 0) - 80) }
  ].sort((a, b) => b.score - a.score || String(a.key).localeCompare(String(b.key)));

  let body = 'Kritischer Zustand: Gesundheit sehr niedrig.';
  if (scores[0].key === 'risk') {
    body = 'Kritischer Zustand: Risiko ist sehr hoch.';
  } else if (scores[0].key === 'stress') {
    body = 'Kritischer Zustand: Stress ist extrem hoch.';
  }

  notify('critical', 'Grow Simulator', body);
  notifications.runtime.lastCriticalAtRealMs = currentNowMs;
}

async function schedulePushIfAllowed(_force) {
  // Lokale Benachrichtigungen nutzen aktuell kein Backend-Push-Scheduling.
}

function notifyReminder(nowMs) { const actions = Array.isArray(state.history && state.history.actions) ? state.history.actions : [];
  const lastActionAtMs = actions.length ? Number(actions[actions.length - 1].atRealTimeMs || actions[actions.length - 1].realTime || 0) : 0;

  const inactivityMs = 90 * 60 * 1000;
  if (lastActionAtMs > 0 && (nowMs - lastActionAtMs) < inactivityMs) {
    return;
  }

  const s = state.status || {};
  const notOptimal = Number(s.water) < 50 || Number(s.nutrition) < 50 || Number(s.stress) > 55;
  if (!notOptimal) {
    return;
  }

  const notifications = getCanonicalNotificationsSettings(state);
  const cooldownMs = 120 * 60 * 1000;
  if ((nowMs - notifications.runtime.lastReminderAtRealMs) < cooldownMs) {
    return;
  }

  notify('reminder', 'Grow Simulator', 'Deine Pflanze braucht Pflege. Öffne die App für eine Maßnahme.');
  notifications.runtime.lastReminderAtRealMs = nowMs;
}

function notifyPlantNeedsCare(bodyText) {
  if (!state.settings || state.settings.pushNotificationsEnabled !== true) {
    return;
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    return;
  }

  const payload = {
    type: 'SHOW_NOTIFICATION',
    title: 'GrowSim',
    options: {
      body: String(bodyText || 'Deine Pflanze braucht Pflege.'),
      icon: new URL('icons/icon-192.png', self.location).href
    }
  };

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(payload);
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      if (registration && registration.active) {
        registration.active.postMessage(payload);
      }
    })
    .catch(() => {
      // non-fatal
    });
}

async function postJsonStub(url, payload) {
  try {
    const response = await appApiFetch(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    addLog('system', `Stub-Endpunkt fehlgeschlagen: ${url}`, { error: error.message });
  }
}

function base64ToU8(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function dbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

function dbSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const request = store.put(value, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function dbDelete(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function resolveAppBasePath() {
  const path = window.location.pathname || '/';
  if (path === '/' || path.endsWith('/index.html')) {
    const base = path.replace(/\/index\.html$/, '').replace(/\/$/, '');
    return base;
  }
  return path.replace(/\/$/, '');
}

function appPath(relativePath) {
  const normalized = String(relativePath || '').replace(/^\//, '');
  return `./${normalized}`;
}

window.checkMissions = function(triggerType, payload) {
  if (!state.missions || !state.missions.catalog) return;
  const nowMs = Date.now();
  state.missions.catalog.forEach(mission => {
    if (state.missions.completed.includes(mission.id)) return;
    const cond = mission.condition;
    if (!cond) return;
    let isCompleted = false;
    if (triggerType === 'tick') {
      if (cond.type === 'min_day') {
        if (state.simulation.simDay >= cond.value) isCompleted = true;
      } else if (cond.type === 'min_health') {
        if (state.plant.averageHealth >= cond.value) isCompleted = true;
      } else if (cond.type === 'max_stress_duration') {
         if (state.plant.averageStress < cond.value) {
            mission._stressStartTime = mission._stressStartTime || state.simulation.simTimeMs;
            if (state.simulation.simTimeMs - mission._stressStartTime >= (cond.duration * 60000)) {
               isCompleted = true;
            }
         } else {
            mission._stressStartTime = null;
         }
      }
    } else if (triggerType === 'action') {
      if (cond.type === 'action_used' && payload && payload.actionId === cond.value) {
        isCompleted = true;
      }
    }
    if (isCompleted) {
      window.completeMission(mission);
    }
  });
};

window.completeMission = function(mission) {
  state.missions.completed.push(mission.id);
  if (mission.reward) {
    if (!state.meta.inventory) state.meta.inventory = { coins: 0, gems: 0, stars: 0 };
    if (mission.reward.coins) state.meta.inventory.coins += mission.reward.coins;
    if (mission.reward.gems) state.meta.inventory.gems += mission.reward.gems;
    if (mission.reward.stars) state.meta.inventory.stars += mission.reward.stars;
  }
  if (typeof addLog === 'function') {
    addLog('system', "Mission erfuellt: " + mission.title, { missionId: mission.id, reward: mission.reward });
  }
  if (typeof openMenuDialog === 'function') {
    const reward = mission && mission.reward && typeof mission.reward === 'object' ? mission.reward : {};
    const rewardItems = [
      reward.coins ? { icon: 'C', value: `+${reward.coins}`, label: 'Coins', tone: 'gold' } : null,
      reward.gems ? { icon: 'G', value: `+${reward.gems}`, label: 'Gems', tone: 'mint' } : null,
      reward.stars ? { icon: 'S', value: `+${reward.stars}`, label: 'Stars', tone: 'violet' } : null
    ].filter(Boolean);
    openMenuDialog({
      title: mission.title,
      message: mission.description || 'Die Belohnung wurde deinem Profil gutgeschrieben.',
      cancelLabel: 'Belohnung sichern',
      confirmLabel: null,
      variant: 'mission-reward',
      kicker: 'Mission geschafft',
      rewards: rewardItems
    });
  }
  if (typeof renderMissionsSheet === 'function' && state.ui.openSheet === 'missions') {
    renderMissionsSheet();
  }
};

function migrateSettings(state) {
  if (!state.settings || typeof state.settings !== 'object') {
    state.settings = {};
  }
  if (!state.settings.gameplay) {
    state.settings.gameplay = { simSpeed: DEFAULT_BASE_SIM_SPEED, eventFrequency: 'Normal', tutorial: true, autosave: 5 };
  }
  if (!state.settings.audio) {
    state.settings.audio = { volume: 84, effects: 'Hoch', battery: false, haptic: true };
  }
  if (!state.settings.account) {
    state.settings.account = { cloudSync: false };
  }
  state.settings.gameplay.simSpeed = normalizeBaseSimulationSpeed(
    state.settings.gameplay.simSpeed || (state.simulation && state.simulation.baseSpeed) || DEFAULT_BASE_SIM_SPEED
  );
  state.settings.account.cloudSync = false;
}

function updateSettingsUI() {
  const g = state.settings.gameplay;

  const simSpeedNode = document.getElementById('settingsSimSpeedValue');
  const simSpeedHintNode = document.getElementById('settingsSimSpeedHint');
  const baseSpeed = normalizeBaseSimulationSpeed(state.simulation && state.simulation.baseSpeed);
  if (g) {
    g.simSpeed = baseSpeed;
  }
  if (simSpeedNode) {
    const runtimeSpeed = round2(Number(state.simulation && state.simulation.effectiveSpeed) || getEffectiveSimulationSpeed(Date.now()));
    simSpeedNode.textContent = `Basis ${baseSpeed}x · Aktiv ${runtimeSpeed}x`;
    simSpeedNode.className = 'value_gold';
    simSpeedNode.setAttribute('title', 'Basisgeschwindigkeit plus optionaler Zeit-Boost.');
  }
  if (simSpeedHintNode) {
    const boostActive = Number(state.simulation && state.simulation.effectiveSpeed) === BOOST_SIM_SPEED;
    simSpeedHintNode.textContent = boostActive ? 'Boost aktiv (x24)' : '';
    simSpeedHintNode.classList.toggle('hidden', !boostActive);
    simSpeedHintNode.setAttribute('aria-hidden', String(!boostActive));
  }
  document.querySelectorAll('[data-sim-speed-option]').forEach((node) => {
    const option = normalizeBaseSimulationSpeed(node.getAttribute('data-sim-speed-option'));
    const active = option === baseSpeed;
    node.dataset.active = active ? 'true' : 'false';
    node.classList.toggle('is-active', active);
    node.setAttribute('aria-pressed', String(active));
  });
  
  const eventFreqNode = document.getElementById('settingsEventFrequencyValue');
  if (eventFreqNode) {
    const minMinutes = Math.round(EVENT_ROLL_MIN_REAL_MS / 60000);
    const maxMinutes = Math.round(EVENT_ROLL_MAX_REAL_MS / 60000);
    eventFreqNode.textContent = `Fix ${minMinutes}-${maxMinutes}m`;
    eventFreqNode.className = 'value_gold';
    eventFreqNode.setAttribute('title', 'Aktives Runtime-Fenster. Die Auswahl ist aktuell vorbereitend.');
  }

  const tutNode = document.getElementById('settingsTutorialValue');
  if (tutNode) {
    tutNode.textContent = 'Nicht aktiv';
    tutNode.className = 'subtitle';
    tutNode.setAttribute('title', 'Der Tutorial-Schalter ist im aktuellen Build noch ohne Runtime-Wirkung.');
  }

  const autoNode = document.getElementById('settingsAutosaveValue');
  if (autoNode) {
    autoNode.textContent = `Lokal ${Math.max(1, Math.round(PERSIST_THROTTLE_MS / 1000))}s`;
    autoNode.className = 'value_gold';
    autoNode.setAttribute('title', 'Aktuelles lokales Persistenzintervall. Im aktuellen UI nicht umschaltbar.');
  }

  const volNode = document.getElementById('settingsVolumeValue');
  if (volNode) {
    volNode.textContent = 'Nicht aktiv';
    volNode.className = 'subtitle';
    volNode.setAttribute('title', 'Aktuell nur lokaler Anzeigezustand ohne Audio-Backend.');
  }

  const effNode = document.getElementById('settingsEffectsValue');
  if (effNode) {
    effNode.textContent = 'Nicht aktiv';
    effNode.className = 'subtitle';
    effNode.setAttribute('title', 'Aktuell nur lokaler Anzeigezustand ohne Grafik-/FX-Anbindung.');
  }

  const batNode = document.getElementById('settingsBatteryValue');
  if (batNode) {
    batNode.textContent = 'Nicht aktiv';
    batNode.className = 'subtitle';
    batNode.setAttribute('title', 'Aktuell ohne direkte Runtime-Wirkung.');
  }

  const hapNode = document.getElementById('settingsHapticValue');
  if (hapNode) {
    hapNode.textContent = 'Nicht aktiv';
    hapNode.className = 'subtitle';
    hapNode.setAttribute('title', 'Aktuell ohne direkte Runtime-Wirkung.');
  }

  const cloudNode = document.getElementById('settingsCloudSyncValue');
  if (cloudNode) {
    const authIdentity = getAuthDisplayIdentity();
    const isAuthed = Boolean(authIdentity);
    cloudNode.textContent = isAuthed ? (authIdentity.email || 'Verbunden') : 'Nicht verbunden';
    cloudNode.className = isAuthed ? 'value_green' : 'value_gold';
    cloudNode.setAttribute(
      'title',
      isAuthed
        ? 'Cloud Sync aktiv. Klick öffnet Account-Optionen.'
        : 'Nicht mit Cloud verbunden. Klick öffnet Login/Registrierung.'
    );
  }
}

let authModalMode = 'login';
let authModalBusy = false;

function applySettingsBaseSimulationSpeed(value, nowMs = Date.now()) {
  migrateSettings(state);
  const selectedSpeed = normalizeBaseSimulationSpeed(value);
  state.settings.gameplay.simSpeed = selectedSpeed;
  const appliedSpeed = setBaseSimulationSpeed(selectedSpeed, nowMs);
  state.settings.gameplay.simSpeed = appliedSpeed;
  updateSettingsUI();
  renderAll();
  schedulePersistState(true);
  return appliedSpeed;
}

function isAuthSessionValid() {
  const authApi = window.GrowSimAuth;
  return Boolean(authApi && typeof authApi.isAuthenticated === 'function' && authApi.isAuthenticated());
}

function isLocalhostHost() {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  const host = String(window.location.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

function hasDevBypassFlag() {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  const params = new URLSearchParams(window.location.search || '');
  return params.get('dev') === '1';
}

function shouldBypassAuthForLocalDev() {
  return isLocalhostHost() && hasDevBypassFlag();
}

function activateLocalDevAuthSession() {
  const authApi = window.GrowSimAuth;
  if (!authApi || typeof authApi.startLocalDevSession !== 'function') {
    return false;
  }
  authApi.startLocalDevSession();
  return isAuthSessionValid();
}

function waitForStartupAuthGateClear() {
  if (!authGateActive || isAuthSessionValid()) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    startupAuthGateResolver = resolve;
  });
}

function resolveStartupAuthGateClear(stateRestored = false) {
  if (typeof startupAuthGateResolver !== 'function') {
    return;
  }
  const resolve = startupAuthGateResolver;
  startupAuthGateResolver = null;
  resolve(Boolean(stateRestored));
}

function setAuthGateActive(active) {
  authGateActive = Boolean(active);
  if (state.ui && typeof state.ui === 'object') {
    state.ui.authGateActive = authGateActive;
  }
  if (typeof window !== 'undefined') {
    window.__gsIsAuthGateActive = () => authGateActive;
  }

  const nowMs = Date.now();
  if (authGateActive) {
    authGatePausedAtMs = nowMs;
    stopLoop();
    clearRuntimeHaltBanner();
    state.simulation.nowMs = nowMs;
    state.simulation.lastTickRealTimeMs = nowMs;
    if (state.ui && typeof state.ui === 'object') {
      state.ui.lastRenderRealMs = nowMs;
    }
  } else {
    const pausedDurationMs = authGatePausedAtMs > 0 ? Math.max(0, nowMs - authGatePausedAtMs) : 0;
    authGatePausedAtMs = 0;
    if (pausedDurationMs > 0) {
      const boostEndsAtMs = Number(state.boost && state.boost.boostEndsAtMs);
      if (Number.isFinite(boostEndsAtMs) && boostEndsAtMs > 0) {
        state.boost.boostEndsAtMs = boostEndsAtMs + pausedDurationMs;
      }
      const fairnessEndsAtMs = Number(state.simulation && state.simulation.fairnessGraceEndsAtRealMs);
      if (Number.isFinite(fairnessEndsAtMs) && fairnessEndsAtMs > 0) {
        state.simulation.fairnessGraceEndsAtRealMs = fairnessEndsAtMs + pausedDurationMs;
      }
    }
    state.simulation.nowMs = nowMs;
    state.simulation.lastTickRealTimeMs = nowMs;
    if (state.ui && typeof state.ui === 'object') {
      state.ui.lastRenderRealMs = nowMs;
    }
    if (bootCompleted && document.visibilityState === 'visible') {
      startLoopOnce();
    }
    return;
  }
  state.ui.openSheet = null;
  state.ui.menuOpen = false;
  state.ui.menuDialogOpen = false;
  state.ui.statDetailKey = null;
}

function getAuthModalNodes() {
  return {
    modal: document.getElementById('authModal'),
    title: document.getElementById('authModalTitle'),
    loggedOutView: document.getElementById('authModalLoggedOutView'),
    loggedInView: document.getElementById('authModalLoggedInView'),
    tabLogin: document.getElementById('authTabLogin'),
    tabRegister: document.getElementById('authTabRegister'),
    displayNameLabel: document.getElementById('authDisplayNameLabel'),
    displayNameInput: document.getElementById('authDisplayNameInput'),
    emailInput: document.getElementById('authEmailInput'),
    passwordInput: document.getElementById('authPasswordInput'),
    errorNode: document.getElementById('authModalError'),
    primaryBtn: document.getElementById('authModalPrimaryBtn'),
    cancelBtn: document.getElementById('authModalCancelBtn'),
    closeBtn: document.getElementById('authModalCloseBtn'),
    logoutBtn: document.getElementById('authModalLogoutBtn'),
    loggedInEmail: document.getElementById('authLoggedInEmailValue'),
    loggedInName: document.getElementById('authLoggedInNameValue')
  };
}

function setAuthModalError(message = '') {
  const nodes = getAuthModalNodes();
  if (!nodes.errorNode) {
    return;
  }
  const text = typeof message === 'string' ? message.trim() : '';
  nodes.errorNode.textContent = text;
  nodes.errorNode.classList.toggle('hidden', !text);
}

function setAuthModalBusyState(isBusy) {
  authModalBusy = Boolean(isBusy);
  const nodes = getAuthModalNodes();
  const controls = [
    nodes.tabLogin,
    nodes.tabRegister,
    nodes.displayNameInput,
    nodes.emailInput,
    nodes.passwordInput,
    nodes.primaryBtn,
    nodes.cancelBtn,
    nodes.closeBtn,
    nodes.logoutBtn
  ];

  controls.forEach((node) => {
    if (node) {
      node.disabled = authModalBusy;
    }
  });
}

function setAuthModalMode(mode = 'login') {
  authModalMode = mode === 'register' ? 'register' : 'login';
  const nodes = getAuthModalNodes();
  const isRegister = authModalMode === 'register';
  if (nodes.tabLogin) {
    nodes.tabLogin.classList.toggle('is-active', !isRegister);
  }
  if (nodes.tabRegister) {
    nodes.tabRegister.classList.toggle('is-active', isRegister);
  }
  if (nodes.displayNameLabel) {
    nodes.displayNameLabel.classList.toggle('hidden', !isRegister);
  }
  if (nodes.primaryBtn) {
    nodes.primaryBtn.textContent = isRegister ? 'Registrieren' : 'Login';
  }
  if (nodes.passwordInput) {
    nodes.passwordInput.setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');
  }
  setAuthModalError('');
}

function closeCloudAuthModal(options = {}) {
  const force = Boolean(options && options.force === true);
  if (authGateActive && !force) {
    return;
  }
  const nodes = getAuthModalNodes();
  if (!nodes.modal) {
    return;
  }
  nodes.modal.classList.add('hidden');
  nodes.modal.setAttribute('aria-hidden', 'true');
  setAuthModalError('');
  setAuthModalBusyState(false);
}

function syncAuthModalContent() {
  const nodes = getAuthModalNodes();
  if (!nodes.modal || !nodes.loggedOutView || !nodes.loggedInView) {
    return;
  }

  const authIdentity = getAuthDisplayIdentity();
  const isAuthed = Boolean(authIdentity);
  const gateMode = authGateActive && !isAuthed;

  if (nodes.title) {
    nodes.title.textContent = gateMode ? 'Anmeldung erforderlich' : 'Account';
  }
  if (nodes.cancelBtn) {
    nodes.cancelBtn.classList.toggle('hidden', gateMode);
  }
  if (nodes.modal) {
    nodes.modal.dataset.gate = gateMode ? 'required' : 'optional';
  }

  nodes.loggedOutView.classList.toggle('hidden', isAuthed);
  nodes.loggedOutView.setAttribute('aria-hidden', String(isAuthed));
  nodes.loggedInView.classList.toggle('hidden', !isAuthed);
  nodes.loggedInView.setAttribute('aria-hidden', String(!isAuthed));

  if (isAuthed) {
    if (nodes.loggedInEmail) {
      nodes.loggedInEmail.textContent = authIdentity.email || '-';
    }
    if (nodes.loggedInName) {
      nodes.loggedInName.textContent = authIdentity.displayName || '-';
    }
    return;
  }

  setAuthModalMode(authModalMode);
  if (nodes.emailInput) {
    nodes.emailInput.value = '';
  }
  if (nodes.passwordInput) {
    nodes.passwordInput.value = '';
  }
  if (nodes.displayNameInput && authModalMode !== 'register') {
    nodes.displayNameInput.value = '';
  }
}

async function refreshStateAfterAuth() {
  try {
    await initOrMigrateState({ forceRemote: true });
    syncRuntimeClocks(Date.now());
    syncCanonicalStateShape();
    console.info('[auth] remote load success/fallback');
  } catch (error) {
    console.info('[auth] remote load failed');
  }

  updateSettingsUI();
  renderAll();
}

function openCloudAuthModal(options = {}) {
  if (options && options.gate === true) {
    setAuthGateActive(true);
  }
  const nodes = getAuthModalNodes();
  if (!nodes.modal) {
    return;
  }
  syncAuthModalContent();
  nodes.modal.classList.remove('hidden');
  nodes.modal.setAttribute('aria-hidden', 'false');
  setAuthModalBusyState(false);
  setAuthModalError('');

  const authIdentity = getAuthDisplayIdentity();
  if (authIdentity) {
    if (nodes.closeBtn) {
      nodes.closeBtn.focus();
    }
    return;
  }

  if (nodes.emailInput) {
    nodes.emailInput.focus();
  }
}

async function submitAuthModal() {
  if (authModalBusy) {
    return;
  }

  const authApi = window.GrowSimAuth;
  if (!authApi || typeof authApi.login !== 'function' || typeof authApi.register !== 'function') {
    setAuthModalError('Auth API ist nicht verfügbar.');
    return;
  }

  const nodes = getAuthModalNodes();
  const email = String((nodes.emailInput && nodes.emailInput.value) || '').trim();
  const password = String((nodes.passwordInput && nodes.passwordInput.value) || '');
  const displayName = String((nodes.displayNameInput && nodes.displayNameInput.value) || '').trim();
  const isRegister = authModalMode === 'register';

  if (!email || !password) {
    setAuthModalError('Bitte E-Mail und Passwort eingeben.');
    return;
  }
  if (isRegister && !displayName) {
    setAuthModalError('Bitte einen Anzeigenamen eingeben.');
    return;
  }

  setAuthModalBusyState(true);
  setAuthModalError('');
  try {
    if (isRegister) {
      await authApi.register(email, password, displayName);
      console.info('[auth] register success');
    } else {
      await authApi.login(email, password);
      console.info('[auth] login success');
    }

    await refreshStateAfterAuth();
    setAuthGateActive(false);
    closeCloudAuthModal({ force: true });
    resolveStartupAuthGateClear(true);
    schedulePersistState(true);
  } catch (error) {
    console.info(isRegister ? '[auth] register failed' : '[auth] login failed');
    const message = error && error.message ? String(error.message) : 'Authentifizierung fehlgeschlagen';
    setAuthModalError(message);
  } finally {
    setAuthModalBusyState(false);
  }
}

function performAuthLogout() {
  const authApi = window.GrowSimAuth;
  if (!authApi || typeof authApi.logout !== 'function') {
    return;
  }
  authApi.logout();
  console.info('[auth] logout success');
  setAuthGateActive(true);
  closeCloudAuthModal({ force: true });
  updateSettingsUI();
  renderAll();
  openCloudAuthModal({ gate: true });
  schedulePersistState(true);
}

function ensureSettingsUiReady() {
  migrateSettings(state);
  initSettingsEvents();
  updateSettingsUI();
}

function initSettingsEvents() {
  if (settingsEventsInitialized) {
    return;
  }
  settingsEventsInitialized = true;
  const byId = (id) => document.getElementById(id);

  const resetBtn = byId('analysisResetBtn');
  if (resetBtn) {
    resetBtn.setAttribute('title', 'Setzt den aktuellen Run nach Bestätigung vollständig zurück.');
  }

  const defBtn = byId('settingsDefaultBtn');
  if (defBtn) {
    defBtn.setAttribute('title', 'Setzt lokale Hinweis- und Benachrichtigungseinstellungen auf den Standard zurück.');
    defBtn.addEventListener('click', () => {
      state.settings.gameplay = { simSpeed: DEFAULT_BASE_SIM_SPEED, eventFrequency: 'Normal', tutorial: true, autosave: 5 };
      state.settings.audio = { volume: 84, effects: 'Hoch', battery: false, haptic: true };
      state.settings.account = { cloudSync: false };
      applySettingsBaseSimulationSpeed(DEFAULT_BASE_SIM_SPEED, Date.now());
    });
  }

  const saveBtn = byId('settingsSaveBtn');
  if (saveBtn) {
    saveBtn.setAttribute('title', 'Speichert den aktuellen lokalen Zustand im Browser.');
  }

  const speedControl = byId('settingsSimSpeedControl');
  if (speedControl && speedControl.dataset.bound !== 'true') {
    const resolveSpeedButtonFromEvent = (event) => {
      if (!event) {
        return null;
      }

      const directTarget = event.target instanceof Element
        ? event.target.closest('[data-sim-speed-option]')
        : null;
      if (directTarget && speedControl.contains(directTarget)) {
        return directTarget;
      }

      const pointerLikeEvent = Number.isFinite(Number(event.clientX)) && Number.isFinite(Number(event.clientY));
      if (!pointerLikeEvent || typeof document.elementsFromPoint !== 'function') {
        return null;
      }

      const hitStack = document.elementsFromPoint(Number(event.clientX), Number(event.clientY));
      for (const node of hitStack) {
        if (!(node instanceof Element)) {
          continue;
        }
        if (speedControl.contains(node) && node.matches('[data-sim-speed-option]')) {
          return node;
        }
      }

      return null;
    };

    const handleSpeedSelection = (event) => {
      const button = resolveSpeedButtonFromEvent(event);
      if (!button) {
        return;
      }
      applySettingsBaseSimulationSpeed(button.getAttribute('data-sim-speed-option'), Date.now());
    };

    speedControl.addEventListener('click', handleSpeedSelection);
    speedControl.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      const button = event.target instanceof Element ? event.target.closest('[data-sim-speed-option]') : null;
      if (!button) {
        return;
      }
      event.preventDefault();
      applySettingsBaseSimulationSpeed(button.getAttribute('data-sim-speed-option'), Date.now());
    });
    speedControl.dataset.bound = 'true';
  }

  const cloudRow = byId('settingsCloudSyncRow');
  if (cloudRow) {
    cloudRow.addEventListener('click', () => {
      openCloudAuthModal();
    });
    cloudRow.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCloudAuthModal();
      }
    });
  }

  const authTabLogin = byId('authTabLogin');
  if (authTabLogin) {
    authTabLogin.addEventListener('click', () => {
      setAuthModalMode('login');
    });
  }

  const authTabRegister = byId('authTabRegister');
  if (authTabRegister) {
    authTabRegister.addEventListener('click', () => {
      setAuthModalMode('register');
    });
  }

  const authModalCancelBtn = byId('authModalCancelBtn');
  if (authModalCancelBtn) {
    authModalCancelBtn.addEventListener('click', () => {
      closeCloudAuthModal();
    });
  }

  const authModalPrimaryBtn = byId('authModalPrimaryBtn');
  if (authModalPrimaryBtn) {
    authModalPrimaryBtn.addEventListener('click', () => {
      submitAuthModal();
    });
  }

  const authModalCloseBtn = byId('authModalCloseBtn');
  if (authModalCloseBtn) {
    authModalCloseBtn.addEventListener('click', () => {
      closeCloudAuthModal();
    });
  }

  const authModalLogoutBtn = byId('authModalLogoutBtn');
  if (authModalLogoutBtn) {
    authModalLogoutBtn.addEventListener('click', () => {
      performAuthLogout();
    });
  }

  const authModal = byId('authModal');
  if (authModal) {
    authModal.addEventListener('click', (event) => {
      if (authGateActive) {
        return;
      }
      if (event.target === authModal) {
        closeCloudAuthModal();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (authGateActive) {
      return;
    }
    const modal = byId('authModal');
    if (!modal || modal.classList.contains('hidden')) {
      return;
    }
    closeCloudAuthModal();
  });

  const authPasswordInput = byId('authPasswordInput');
  if (authPasswordInput) {
    authPasswordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitAuthModal();
      }
    });
  }
}

const originalRenderDiagnosisSheet = window.renderDiagnosisSheet;
window.renderDiagnosisSheet = function() {
  if (originalRenderDiagnosisSheet) originalRenderDiagnosisSheet();
  migrateSettings(state);
  updateSettingsUI();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ensureSettingsUiReady();
  }, { once: true });
} else {
  ensureSettingsUiReady();
}
