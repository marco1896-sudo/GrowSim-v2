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
const REWARD_ACTION_TYPES = Object.freeze({
  NIGHT_SHIFT: 'night_shift',
  FAST_FORWARD_EVENT: 'fast_forward_event',
  CARE_BOOST: 'care_boost',
  CLIMATE_STABILIZE: 'climate_stabilize',
  EMERGENCY_SAVE: 'emergency_save',
  TIME_SKIP_SHORT: 'time_skip_short',
  TIME_SKIP_LONG: 'time_skip_long',
  EVENT_START: 'event_start',
  EVENT_REROLL: 'event_reroll',
  AUTO_CARE: 'auto_care',
  GROWTH_BOOST: 'growth_boost',
  CLIMATE_FIX: 'climate_stabilize'
});
const COIN_EARN_RANGES = Object.freeze({
  daily_reward: Object.freeze({ min: 50, max: 150 }),
  event_completion: Object.freeze({ min: 20, max: 80 }),
  harvest_completion: Object.freeze({ min: 200, max: 500 }),
  level_up: Object.freeze({ min: 100, max: 300 })
});
const COIN_SPEND_COSTS = Object.freeze({
  [REWARD_ACTION_TYPES.NIGHT_SHIFT]: 25,
  [REWARD_ACTION_TYPES.TIME_SKIP_SHORT]: 50,
  [REWARD_ACTION_TYPES.TIME_SKIP_LONG]: 120,
  [REWARD_ACTION_TYPES.EVENT_START]: 80,
  [REWARD_ACTION_TYPES.EMERGENCY_SAVE]: 200,
  [REWARD_ACTION_TYPES.EVENT_REROLL]: 100,
  [REWARD_ACTION_TYPES.AUTO_CARE]: 120,
  [REWARD_ACTION_TYPES.CLIMATE_STABILIZE]: 80,
  [REWARD_ACTION_TYPES.GROWTH_BOOST]: 100
});
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
  baselineInsetPx: -12,
  podestCenterXRatio: 0.5,
  podestFootYRatio: 0.550,
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
const harvestDefaults = window.GrowSimHarvest && typeof window.GrowSimHarvest.getDefaultRunHarvest === 'function' ? window.GrowSimHarvest : null;
const state = {
  schemaVersion: '1.0.0',
  seed: SIM_GLOBAL_SEED,
  plantId: SIM_PLANT_ID,
  setup: null,
  settings: {
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
    rewardLedger: {},
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
    lastRunSummary: null,
    harvest: harvestDefaults ? harvestDefaults.getDefaultProfileHarvest() : undefined
  },
  run: progressionDefaults ? progressionDefaults.getDefaultRunState() : {
    id: 0,
    status: 'idle',
    endReason: null,
    startedAtRealMs: null,
    endedAtRealMs: null,
    finalizedAtRealMs: null,
    setupSnapshot: null,
    harvest: harvestDefaults ? harvestDefaults.getDefaultRunHarvest() : undefined
  },
  missions: {
    catalog: [],
    byId: {},
    completed: []
  },
  retention: {
    version: 2,
    streak: {
      currentCount: 0,
      bestCount: 0,
      lastCheckinDayKey: '',
      lastQualifiedDayKey: '',
      lastClaimDayKey: '',
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
      lastGeneratedAtMs: 0
    },
    session: {
      dayKey: '',
      openCount: 0,
      lastOpenAtMs: 0
    },
    micro: {
      unlockedIds: [],
      unlockedHistory: [],
      lastShownAt: 0,
      sessionShownCount: 0,
      onboardingHookShownAtMs: 0
    },
    claimLedger: [],
    analytics: {
      events: [],
      eventKeys: [],
      dailyStats: []
    }
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
    activeResolveTimeMinutes: 60,
    activeCategory: 'generic',
    activeTags: [],
    activeImagePath: '',
    resolvingUntilMs: 0,
    resolvingUntilSimTimeMs: 0,
    pendingOutcome: null,
    resolvedOutcome: null,
    pendingResolution: null,
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
    coins: 0,
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
  rewardActions: {
    provider: 'direct',
    lastTriggeredAtMs: 0,
    lastGrantedAtMs: 0,
    lastExecutedAtMs: 0,
    byType: {}
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
    },
    statDetailKey: null,
    activeStatPopup: null
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
let pushStatusRefreshPromise = null;
const pushUiRuntime = {
  status: 'unsupported',
  permission: 'unsupported',
  supported: false,
  hasSubscription: false,
  busy: false,
  message: '',
  error: '',
  lastUpdatedAtMs: 0
};
const supportFlowRuntime = {
  selectedTierId: 'growth',
  activeSession: null,
  sdkPrimed: false,
  sdkPrimeAttempted: false,
  entrySource: 'sheet_open'
};

const actionDebounceUntil = Object.create(null);
const HARVEST_VERIFICATION_POLL_INTERVAL_MS = 7000;
const HARVEST_VERIFICATION_MAX_ATTEMPTS = 8;
const LEADERBOARD_FETCH_COOLDOWN_MS = 45 * 1000;
const LEADERBOARD_TOP_LIMIT = 10;
const REWARDS_FETCH_COOLDOWN_MS = 45 * 1000;
const RETENTION_STREAK_MILESTONES = Object.freeze([3, 7, 14, 30]);
const RETENTION_DAILY_TASK_MIN = 3;
const RETENTION_DAILY_TASK_MAX = 3;
const RETENTION_DAILY_TASK_XP = 8;
const RETENTION_DAILY_ALL_COMPLETE_XP = 18;
const RETENTION_DAILY_TASK_DEFAULT_COINS = Object.freeze({
  water_once: 25,
  resolve_one_event: 35,
  open_app_twice: 30,
  stable_climate_window: 35
});
const RETENTION_STREAK_REWARD_BY_DAY = Object.freeze({
  1: 50,
  2: 75,
  3: 100,
  4: 110,
  5: 150,
  6: 180,
  7: 250
});
const RETENTION_SESSION_MIN_GAP_MS = 45 * 1000;
const RETENTION_STREAK_MILESTONE_XP = Object.freeze({
  3: 10,
  7: 18,
  14: 30,
  30: 50
});
const RETENTION_MICRO_COOLDOWN_MS = 10 * 1000;
const RETENTION_MICRO_SESSION_LIMIT = 3;
const RETENTION_ANALYTICS_MAX_EVENTS = 180;
const RETENTION_ANALYTICS_MAX_DAYS = 45;
const RETENTION_REWARDED_BONUS_XP = Object.freeze({
  streak_recovery_credit: 0,
  daily_all_complete_boost: 10,
  sim_time_boost: 0
});
const SUPPORT_TELEMETRY_MAX_EVENTS = 80;
const SUPPORT_PAYPAL_HOSTED_BUTTON_ID = '7F7NEL33DP6QQ';
const SUPPORT_PAYPAL_DONATE_BASE_URL = `https://www.paypal.com/donate?hosted_button_id=${encodeURIComponent(SUPPORT_PAYPAL_HOSTED_BUTTON_ID)}`;
const SUPPORT_TIERS = Object.freeze({
  seed: Object.freeze({ id: 'seed', label: 'Samen', amount: '3.00', currencyCode: 'EUR', displayAmount: '3 €' }),
  growth: Object.freeze({ id: 'growth', label: 'Wachstum', amount: '5.00', currencyCode: 'EUR', displayAmount: '5 €' }),
  bloom: Object.freeze({ id: 'bloom', label: 'Blüte', amount: '10.00', currencyCode: 'EUR', displayAmount: '10 €' }),
  custom: Object.freeze({ id: 'custom', label: 'Freier Betrag', amount: null, currencyCode: 'EUR', displayAmount: 'Freie Wahl' })
});
const MICRO_ACHIEVEMENT_REGISTRY = Object.freeze({
  streak_milestone_3: Object.freeze({
    id: 'streak_milestone_3',
    title: 'Ruhige Hand',
    shortDescription: 'Drei Tage in Folge drangeblieben.',
    rarity: 'common',
    category: 'streak',
    iconTag: 'Streak',
    xpRewardOverride: 5
  }),
  streak_milestone_7: Object.freeze({
    id: 'streak_milestone_7',
    title: 'Stabiler Lauf',
    shortDescription: 'Eine ganze Woche sauber geführt.',
    rarity: 'uncommon',
    category: 'streak',
    iconTag: 'Streak',
    xpRewardOverride: 7
  }),
  streak_milestone_14: Object.freeze({
    id: 'streak_milestone_14',
    title: 'Wachsam geblieben',
    shortDescription: 'Konstante Pflege über zwei Wochen.',
    rarity: 'rare',
    category: 'streak',
    iconTag: 'Streak',
    xpRewardOverride: 10
  }),
  streak_milestone_30: Object.freeze({
    id: 'streak_milestone_30',
    title: 'Saubere Kontrolle',
    shortDescription: 'Ein kompletter Monatslauf gehalten.',
    rarity: 'epic',
    category: 'streak',
    iconTag: 'Streak',
    xpRewardOverride: 12
  }),
  daily_first_task: Object.freeze({
    id: 'daily_first_task',
    title: 'Startklar',
    shortDescription: 'Die erste Tagesaufgabe erledigt.',
    rarity: 'common',
    category: 'daily',
    iconTag: 'Daily',
    xpRewardOverride: 4
  }),
  daily_pair_clean: Object.freeze({
    id: 'daily_pair_clean',
    title: 'Klimafenster gehalten',
    shortDescription: 'Mehrere Checks sauber abgeschlossen.',
    rarity: 'uncommon',
    category: 'daily',
    iconTag: 'Daily',
    xpRewardOverride: 5
  }),
  daily_full_sweep: Object.freeze({
    id: 'daily_full_sweep',
    title: 'Pflegezyklus komplett',
    shortDescription: 'Alle Daily-Care-Aufgaben erfüllt.',
    rarity: 'rare',
    category: 'daily',
    iconTag: 'Daily',
    xpRewardOverride: 8
  }),
  streak_recovered: Object.freeze({
    id: 'streak_recovered',
    title: 'Serie gerettet',
    shortDescription: 'Der Lauf wurde fair stabilisiert.',
    rarity: 'rare',
    category: 'recovery',
    iconTag: 'Recovery',
    xpRewardOverride: 6
  })
});
const harvestBackendRuntime = {
  sessionPromise: null,
  submissionPromise: null,
  pollTimer: null,
  pollAttempts: 0,
  pollSubmissionId: '',
  activeRunId: 0
};
const leaderboardRuntime = {
  fetchPromise: null,
  requestKey: ''
};
const rewardsRuntime = {
  fetchPromise: null,
  claimPromise: null
};

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
  init: 'boot.init',
  restore_session: 'boot.restore_session',
  load_data: 'boot.load_data',
  init_simulation: 'boot.init_simulation',
  render_ui: 'boot.render_ui',
  ready: 'boot.ready'
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
  const messageKey = BOOT_USER_MESSAGES[key] || 'boot.init';
  const translated = i18nT(messageKey);
  return translated === messageKey ? 'Starting system...' : translated;
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
    retryBtn.textContent = i18nT('status.retry');
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
  const message = String(bootState.message || '').trim() || i18nT('status.preparing');
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
    ui.note.textContent = i18nT('status.boot_failed');
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
    ui.note.textContent = i18nT('status.boot_timeout');
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
    const failureMessage = `${getBootUserMessage(failedPhase).replace(/\.\.\.$/, '')}. ${i18nT('errors.generic')}`;
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

function getMenuUiPresentationApi() {
  const api = window.GrowSimMenuUiPresentation;
  return api && typeof api === 'object' ? api : null;
}

function getMenuUiTextBundle() {
  const api = getMenuUiPresentationApi();
  return api && api.TEXT ? api.TEXT : null;
}

function getPushUiPresentationApi() {
  const api = window.GrowSimPushUiPresentation;
  return api && typeof api === 'object' ? api : null;
}

function getPushUiTextBundle() {
  const api = getPushUiPresentationApi();
  return api && api.TEXT ? api.TEXT : null;
}

let i18nRuntimeInitialized = false;

function getI18nApi() {
  const api = window.GrowSimI18n;
  return api && typeof api === 'object' ? api : null;
}

function i18nT(key, vars = null) {
  const safeKey = String(key || '');
  const api = getI18nApi();
  if (api && typeof api.t === 'function') {
    const translated = api.t(safeKey, vars || undefined);
    const warnings = i18nT.__missingWarnings || (i18nT.__missingWarnings = new Set());
    if (
      translated === safeKey
      && safeKey.includes('.')
      && /^[a-z0-9_.-]+$/i.test(safeKey)
      && !warnings.has(safeKey)
    ) {
      warnings.add(safeKey);
      console.warn(`[i18n][app] unresolved key in runtime: ${safeKey}`);
    }
    return translated;
  }
  return safeKey;
}

function pickI18nVariant(baseKey, variantCount = 1, seed = 0) {
  const total = Math.max(1, Math.trunc(Number(variantCount) || 1));
  const safeSeed = Math.max(0, Math.trunc(Number(seed) || 0));
  const index = (safeSeed % total) + 1;
  return `${String(baseKey || '').trim()}.${index}`;
}

function resolveLikelyI18nText(rawValue, fallbackKey = '') {
  const raw = String(rawValue || '').trim();
  if (!raw) {
    return fallbackKey ? i18nT(fallbackKey) : '';
  }
  if (raw.includes('.') && /^[a-z0-9_.-]+$/i.test(raw)) {
    const translated = i18nT(raw);
    if (translated !== raw) {
      return translated;
    }
  }
  return raw;
}

function applyI18nTranslations(root = document) {
  const api = getI18nApi();
  if (!api || typeof api.applyTranslationsToDOM !== 'function') {
    return;
  }
  api.applyTranslationsToDOM(root);
}

function getIntlLocaleForCurrentLanguage() {
  const api = getI18nApi();
  const language = api && typeof api.getCurrentLanguage === 'function'
    ? api.getCurrentLanguage()
    : 'en';
  if (language === 'de') {
    return 'de-DE';
  }
  if (language === 'es') {
    return 'es-ES';
  }
  return 'en-US';
}

async function initializeI18nRuntime() {
  const api = getI18nApi();
  if (!api || typeof api.init !== 'function') {
    return 'en';
  }

  try {
    await api.init();
  } catch (error) {
    console.warn('[i18n] init failed', error);
  }

  if (!i18nRuntimeInitialized) {
    if (typeof api.registerLanguagePersistence === 'function') {
      api.registerLanguagePersistence({
        set: (language) => {
          try {
            const settings = getCanonicalSettings(state);
            settings.language = String(language || '').trim();
          } catch (_error) {
          }
        }
      });
    }

    if (typeof api.onLanguageChange === 'function') {
      api.onLanguageChange(({ language }) => {
        try {
          const settings = getCanonicalSettings(state);
          settings.language = String(language || '').trim();
        } catch (_error) {
        }
        applyI18nTranslations(document);
        if (bootCompleted) {
          renderAll();
          schedulePersistState(true);
        } else {
          updateLoadingScreenFromBootState();
        }
      });
    }
    i18nRuntimeInitialized = true;
  }

  const settings = getCanonicalSettings(state);
  const storedLanguage = typeof settings.language === 'string' ? settings.language.trim() : '';
  const nextLanguage = storedLanguage
    ? api.normalizeLanguage(storedLanguage)
    : api.detectLanguage();
  api.setLanguage(nextLanguage, { skipNotify: true });
  settings.language = nextLanguage;
  applyI18nTranslations(document);
  return nextLanguage;
}

function resolvePushUiPresentation() {
  const api = getPushUiPresentationApi();
  if (!api || typeof api.resolvePushPresentation !== 'function') {
    return null;
  }

  const notifications = getCanonicalNotificationsSettings(state);
  return api.resolvePushPresentation(state, {
    pushUiRuntime,
    notifications,
    authed: isAuthSessionValid() && Boolean(readAuthToken()),
    pushEnabled: api && typeof api.isPushActive === 'function'
      ? api.isPushActive(pushUiRuntime.status)
      : notifications.enabled === true
  });
}

window.GrowSimAppUiRuntime = Object.freeze({
  renderDeathOverlay: () => renderDeathOverlay(),
  renderGameMenu: () => renderGameMenu(),
  renderPushToggle: () => renderPushToggle(),
  openSheet: (name) => openSheet(name),
  closeSheet: () => closeSheet(),
  openMenu: () => openMenu(),
  closeMenu: () => closeMenu(),
  dismissActiveEvent: () => dismissActiveEvent(),
  openMenuDialog: (options) => openMenuDialog(options || {}),
  closeMenuDialog: () => closeMenuDialog(),
  onPushToggleClick: () => onPushToggleClick()
});

function getRetentionDefaults() {
  return {
    version: 2,
    streak: {
      currentCount: 0,
      bestCount: 0,
      lastCheckinDayKey: '',
      lastQualifiedDayKey: '',
      lastClaimDayKey: '',
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
      lastGeneratedAtMs: 0
    },
    session: {
      dayKey: '',
      openCount: 0,
      lastOpenAtMs: 0
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
}

function ensureRetentionState(snapshot = state) {
  if (!snapshot.retention || typeof snapshot.retention !== 'object') {
    snapshot.retention = getRetentionDefaults();
  }
  const retention = snapshot.retention;
  const defaults = getRetentionDefaults();
  retention.version = Number.isFinite(Number(retention.version)) ? Number(retention.version) : defaults.version;
  retention.streak = retention.streak && typeof retention.streak === 'object' ? retention.streak : defaults.streak;
  retention.dailyCare = retention.dailyCare && typeof retention.dailyCare === 'object' ? retention.dailyCare : defaults.dailyCare;
  retention.micro = retention.micro && typeof retention.micro === 'object' ? retention.micro : defaults.micro;
  retention.claimLedger = Array.isArray(retention.claimLedger) ? retention.claimLedger : [];
  retention.analytics = retention.analytics && typeof retention.analytics === 'object' ? retention.analytics : defaults.analytics;

  retention.streak.currentCount = Math.max(0, Math.trunc(Number(retention.streak.currentCount) || 0));
  retention.streak.bestCount = Math.max(retention.streak.currentCount, Math.trunc(Number(retention.streak.bestCount) || 0));
  retention.streak.lastCheckinDayKey = typeof retention.streak.lastCheckinDayKey === 'string' ? retention.streak.lastCheckinDayKey : '';
  retention.streak.lastQualifiedDayKey = typeof retention.streak.lastQualifiedDayKey === 'string' ? retention.streak.lastQualifiedDayKey : retention.streak.lastCheckinDayKey;
  retention.streak.lastClaimDayKey = typeof retention.streak.lastClaimDayKey === 'string' ? retention.streak.lastClaimDayKey : '';
  retention.streak.lastEvaluatedDayKey = typeof retention.streak.lastEvaluatedDayKey === 'string' ? retention.streak.lastEvaluatedDayKey : '';
  retention.streak.freezeCredits = Math.max(0, Math.trunc(Number(retention.streak.freezeCredits) || 0));
  retention.streak.claimedMilestones = Array.from(new Set((Array.isArray(retention.streak.claimedMilestones) ? retention.streak.claimedMilestones : [])
    .map((entry) => Math.trunc(Number(entry) || 0))
    .filter((entry) => entry > 0)));
  retention.streak.pendingRewardKeys = Array.from(new Set((Array.isArray(retention.streak.pendingRewardKeys) ? retention.streak.pendingRewardKeys : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)));
  retention.streak.pendingRecoveryOffer = Boolean(retention.streak.pendingRecoveryOffer);
  retention.streak.pendingRecoveryDayKey = typeof retention.streak.pendingRecoveryDayKey === 'string' ? retention.streak.pendingRecoveryDayKey : '';
  retention.streak.pendingRecoveryStreakCount = Math.max(0, Math.trunc(Number(retention.streak.pendingRecoveryStreakCount) || 0));
  retention.streak.recoveryClaimedDayKeys = Array.from(new Set((Array.isArray(retention.streak.recoveryClaimedDayKeys) ? retention.streak.recoveryClaimedDayKeys : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)));

  retention.dailyCare.dayKey = typeof retention.dailyCare.dayKey === 'string' ? retention.dailyCare.dayKey : '';
  retention.dailyCare.lastGeneratedAtMs = Number.isFinite(Number(retention.dailyCare.lastGeneratedAtMs))
    ? Number(retention.dailyCare.lastGeneratedAtMs)
    : 0;
  retention.dailyCare.tasks = Array.isArray(retention.dailyCare.tasks) ? retention.dailyCare.tasks : [];
  retention.dailyCare.tasks = retention.dailyCare.tasks
    .filter((task) => task && typeof task === 'object')
    .map((task) => {
      const taskId = String(task.id || task.taskId || '').trim();
      const target = Math.max(1, Math.trunc(Number(task.target || task.targetValue) || 1));
      const progress = clampInt(Number(task.progress || task.progressValue) || 0, 0, target);
      const completedAt = Number.isFinite(Number(task.completedAt))
        ? Number(task.completedAt)
        : (task.completed ? Date.now() : null);
      const claimedAt = Number.isFinite(Number(task.claimedAt))
        ? Number(task.claimedAt)
        : (Number.isFinite(Number(task.rewardGrantedAt)) ? Number(task.rewardGrantedAt) : null);
      const claimed = Boolean(task.claimed)
        || Boolean(claimedAt)
        || Boolean(String(task.claimKey || '').trim() && retention.claimLedger.includes(String(task.claimKey || '').trim()));
      return {
        id: taskId,
        taskId,
        type: String(task.type || task.trigger || task.sheetName || '').trim(),
        title: String(task.title || '').trim(),
        description: String(task.description || '').trim(),
        dayKey: String(task.dayKey || retention.dailyCare.dayKey || '').trim(),
        trigger: String(task.trigger || '').trim(),
        sheetName: String(task.sheetName || '').trim(),
        threshold: Number.isFinite(Number(task.threshold)) ? Number(task.threshold) : null,
        progress,
        progressValue: progress,
        target,
        targetValue: target,
        completed: Boolean(task.completed) || Boolean(completedAt) || progress >= target,
        claimed,
        rewardCoins: Math.max(
          0,
          Math.trunc(Number(task.rewardCoins) || getDefaultDailyTaskCoins(String(task.type || task.trigger || task.sheetName || '').trim()))
        ),
        xp: Math.max(0, Math.trunc(Number(task.xp) || 0)),
        completedAt,
        claimedAt,
        rewardGrantedAt: claimedAt,
        claimKey: String(task.claimKey || '').trim()
      };
    })
    .filter((task) => task.taskId && task.claimKey);
  retention.dailyCare.tasks = retention.dailyCare.tasks.map((task) => {
    if (!task.rewardGrantedAt && task.completedAt && retention.claimLedger.includes(task.claimKey)) {
      return {
        ...task,
        claimed: true,
        claimedAt: task.completedAt,
        rewardGrantedAt: task.completedAt
      };
    }
    return task;
  });
  retention.dailyCare.completedCount = retention.dailyCare.tasks.reduce((count, task) => count + (task.completed ? 1 : 0), 0);
  retention.dailyCare.allCompleteClaimed = Boolean(retention.dailyCare.allCompleteClaimed);

  retention.session = retention.session && typeof retention.session === 'object' ? retention.session : defaults.session;
  retention.session.dayKey = typeof retention.session.dayKey === 'string' ? retention.session.dayKey : '';
  retention.session.openCount = Math.max(0, Math.trunc(Number(retention.session.openCount) || 0));
  retention.session.lastOpenAtMs = Number.isFinite(Number(retention.session.lastOpenAtMs))
    ? Number(retention.session.lastOpenAtMs)
    : 0;

  retention.micro.unlockedIds = Array.from(new Set((Array.isArray(retention.micro.unlockedIds) ? retention.micro.unlockedIds : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)));
  retention.micro.unlockedHistory = (Array.isArray(retention.micro.unlockedHistory) ? retention.micro.unlockedHistory : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: String(entry.id || '').trim(),
      atRealMs: Number.isFinite(Number(entry.atRealMs)) ? Number(entry.atRealMs) : 0
    }))
    .filter((entry) => entry.id && entry.atRealMs > 0)
    .slice(-60);
  retention.micro.lastShownAt = Number.isFinite(Number(retention.micro.lastShownAt)) ? Number(retention.micro.lastShownAt) : 0;
  retention.micro.sessionShownCount = Math.max(0, Math.trunc(Number(retention.micro.sessionShownCount) || 0));
  retention.micro.onboardingHookShownAtMs = Number.isFinite(Number(retention.micro.onboardingHookShownAtMs))
    ? Number(retention.micro.onboardingHookShownAtMs)
    : 0;
  retention.claimLedger = Array.from(new Set(retention.claimLedger.map((entry) => String(entry || '').trim()).filter(Boolean)));
  retention.analytics.events = (Array.isArray(retention.analytics.events) ? retention.analytics.events : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      event: String(entry.event || '').trim(),
      atRealMs: Number.isFinite(Number(entry.atRealMs)) ? Number(entry.atRealMs) : 0,
      dayKey: typeof entry.dayKey === 'string' ? entry.dayKey : '',
      payload: entry.payload && typeof entry.payload === 'object' ? entry.payload : {}
    }))
    .filter((entry) => entry.event)
    .slice(-RETENTION_ANALYTICS_MAX_EVENTS);
  retention.analytics.eventKeys = Array.from(new Set((Array.isArray(retention.analytics.eventKeys) ? retention.analytics.eventKeys : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean))).slice(-RETENTION_ANALYTICS_MAX_EVENTS);
  retention.analytics.dailyStats = (Array.isArray(retention.analytics.dailyStats) ? retention.analytics.dailyStats : [])
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
    .slice(-RETENTION_ANALYTICS_MAX_DAYS);
  return retention;
}

function getLocalDayKey(nowMs = Date.now()) {
  const safeNow = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const date = new Date(safeNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayKeyDistance(previousDayKey, nextDayKey) {
  if (!previousDayKey || !nextDayKey) {
    return 0;
  }
  const left = new Date(`${String(previousDayKey).trim()}T00:00:00`);
  const right = new Date(`${String(nextDayKey).trim()}T00:00:00`);
  if (!Number.isFinite(left.getTime()) || !Number.isFinite(right.getTime())) {
    return 0;
  }
  return Math.round((right.getTime() - left.getTime()) / 86400000);
}

function resolveStreakRewardAmount(streakDay) {
  const safeDay = Math.max(1, Math.trunc(Number(streakDay) || 1));
  const cycleDay = ((safeDay - 1) % 7) + 1;
  return Math.max(0, Math.trunc(Number(RETENTION_STREAK_REWARD_BY_DAY[cycleDay]) || 0));
}

function getDefaultDailyTaskCoins(taskType) {
  const safeType = String(taskType || '').trim();
  if (Object.prototype.hasOwnProperty.call(RETENTION_DAILY_TASK_DEFAULT_COINS, safeType)) {
    return Math.max(0, Math.trunc(Number(RETENTION_DAILY_TASK_DEFAULT_COINS[safeType]) || 0));
  }
  return 25;
}

function createRetentionDailyStat(dayKey) {
  return {
    dayKey: String(dayKey || '').trim(),
    streakContinued: 0,
    tasksCompleted: 0,
    microUnlocked: 0,
    sessionCount: 0
  };
}

function getRetentionDailyStat(retention, dayKey, createIfMissing = true) {
  const safeRetention = retention && typeof retention === 'object' ? retention : ensureRetentionState(state);
  const safeDayKey = String(dayKey || '').trim();
  if (!safeDayKey) {
    return null;
  }
  if (!safeRetention.analytics || typeof safeRetention.analytics !== 'object') {
    safeRetention.analytics = { events: [], eventKeys: [], dailyStats: [] };
  }
  if (!Array.isArray(safeRetention.analytics.dailyStats)) {
    safeRetention.analytics.dailyStats = [];
  }
  const existing = safeRetention.analytics.dailyStats.find((entry) => entry && entry.dayKey === safeDayKey);
  if (existing) {
    return existing;
  }
  if (!createIfMissing) {
    return null;
  }
  const created = createRetentionDailyStat(safeDayKey);
  safeRetention.analytics.dailyStats.push(created);
  safeRetention.analytics.dailyStats = safeRetention.analytics.dailyStats
    .filter((entry) => entry && entry.dayKey)
    .sort((left, right) => String(left.dayKey).localeCompare(String(right.dayKey)))
    .slice(-RETENTION_ANALYTICS_MAX_DAYS);
  return safeRetention.analytics.dailyStats.find((entry) => entry && entry.dayKey === safeDayKey) || created;
}

function applyRetentionEventToDailyStat(stat, event, payload = {}) {
  if (!stat || typeof stat !== 'object') {
    return;
  }
  const safeEvent = String(event || '').trim();
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  if (safeEvent === 'streak_continue') {
    stat.streakContinued = 1;
  } else if (safeEvent === 'daily_task_completed') {
    stat.tasksCompleted = Math.max(0, Math.trunc(Number(stat.tasksCompleted) || 0)) + 1;
  } else if (safeEvent === 'micro_unlocked') {
    stat.microUnlocked = Math.max(0, Math.trunc(Number(stat.microUnlocked) || 0)) + 1;
  } else if (safeEvent === 'retention_session_start') {
    stat.sessionCount = Math.max(0, Math.trunc(Number(stat.sessionCount) || 0)) + 1;
  } else if (safeEvent === 'streak_checkin' && safePayload && safePayload.first === true) {
    stat.sessionCount = Math.max(0, Math.trunc(Number(stat.sessionCount) || 0)) + 1;
  }
}

function aggregateDailyRetentionStats(snapshot = state) {
  const retention = ensureRetentionState(snapshot);
  const eventList = Array.isArray(retention.analytics && retention.analytics.events) ? retention.analytics.events : [];
  const dailyByKey = new Map();

  for (const eventEntry of eventList) {
    if (!eventEntry || typeof eventEntry !== 'object') {
      continue;
    }
    const dayKey = String(eventEntry.dayKey || getLocalDayKey(eventEntry.atRealMs || Date.now())).trim();
    if (!dayKey) {
      continue;
    }
    if (!dailyByKey.has(dayKey)) {
      dailyByKey.set(dayKey, createRetentionDailyStat(dayKey));
    }
    applyRetentionEventToDailyStat(
      dailyByKey.get(dayKey),
      eventEntry.event,
      eventEntry.payload && typeof eventEntry.payload === 'object' ? eventEntry.payload : {}
    );
  }

  retention.analytics.dailyStats = Array.from(dailyByKey.values())
    .sort((left, right) => String(left.dayKey).localeCompare(String(right.dayKey)))
    .slice(-RETENTION_ANALYTICS_MAX_DAYS);
  return retention.analytics.dailyStats;
}

function getLastNDaysStats(n = 7, snapshot = state, nowMs = Date.now()) {
  const retention = ensureRetentionState(snapshot);
  const safeDays = clampInt(Number(n) || 7, 1, 30);
  aggregateDailyRetentionStats(snapshot);
  const byKey = new Map(
    (Array.isArray(retention.analytics.dailyStats) ? retention.analytics.dailyStats : [])
      .map((entry) => [String(entry.dayKey || ''), entry])
      .filter((pair) => pair[0])
  );

  const result = [];
  const baseDate = new Date(Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now());
  baseDate.setHours(12, 0, 0, 0);
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(baseDate);
    cursor.setDate(baseDate.getDate() - offset);
    const dayKey = getLocalDayKey(cursor.getTime());
    const stat = byKey.get(dayKey) || createRetentionDailyStat(dayKey);
    const active = Boolean(
      Number(stat.sessionCount || 0) > 0
      || Number(stat.tasksCompleted || 0) > 0
      || Number(stat.microUnlocked || 0) > 0
      || Number(stat.streakContinued || 0) > 0
    );
    result.push({
      dayKey,
      streakContinued: Number(stat.streakContinued || 0) > 0 ? 1 : 0,
      tasksCompleted: Math.max(0, Math.trunc(Number(stat.tasksCompleted) || 0)),
      microUnlocked: Math.max(0, Math.trunc(Number(stat.microUnlocked) || 0)),
      sessionCount: Math.max(0, Math.trunc(Number(stat.sessionCount) || 0)),
      active
    });
  }
  return result;
}

function formatMicroAchievementFallbackTitle(id) {
  const safeId = String(id || '').trim();
  if (!safeId) {
    return 'Neuer Mikro-Erfolg';
  }
  const cleaned = safeId.replace(/[_-]+/g, ' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Neuer Mikro-Erfolg';
}

function getMicroAchievementDefinition(id) {
  const safeId = String(id || '').trim();
  const mapped = MICRO_ACHIEVEMENT_REGISTRY[safeId];
  if (mapped) {
    return mapped;
  }
  return {
    id: safeId || 'micro_unknown',
    title: formatMicroAchievementFallbackTitle(safeId),
    shortDescription: 'Sauberer Fortschritt in der laufenden Session.',
    rarity: 'common',
    category: 'general',
    iconTag: 'Micro',
    xpRewardOverride: null
  };
}

function emitRetentionAnalytics(event, payload = {}, options = {}) {
  const safeEvent = String(event || '').trim();
  if (!safeEvent) {
    return false;
  }
  const retention = ensureRetentionState(state);
  const eventKey = String(options.eventKey || '').trim();
  if (eventKey && retention.analytics.eventKeys.includes(eventKey)) {
    return false;
  }
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const dayKey = getLocalDayKey(nowMs);
  retention.analytics.events.push({
    event: safeEvent,
    atRealMs: nowMs,
    dayKey,
    payload: payload && typeof payload === 'object' ? payload : {}
  });
  retention.analytics.events = retention.analytics.events.slice(-RETENTION_ANALYTICS_MAX_EVENTS);
  if (eventKey) {
    retention.analytics.eventKeys.push(eventKey);
    retention.analytics.eventKeys = retention.analytics.eventKeys.slice(-RETENTION_ANALYTICS_MAX_EVENTS);
  }
  const stat = getRetentionDailyStat(retention, dayKey, true);
  applyRetentionEventToDailyStat(stat, safeEvent, payload);
  retention.analytics.dailyStats = (Array.isArray(retention.analytics.dailyStats) ? retention.analytics.dailyStats : [])
    .sort((left, right) => String(left.dayKey || '').localeCompare(String(right.dayKey || '')))
    .slice(-RETENTION_ANALYTICS_MAX_DAYS);
  if (options.skipPersist !== true && typeof schedulePersistState === 'function') {
    schedulePersistState();
  }
  return true;
}

function resolveSupportTier(tierId) {
  const safeTierId = String(tierId || '').trim().toLowerCase();
  if (safeTierId && SUPPORT_TIERS[safeTierId]) {
    return SUPPORT_TIERS[safeTierId];
  }
  return SUPPORT_TIERS.growth;
}

function setSupportEntrySource(source) {
  supportFlowRuntime.entrySource = String(source || 'sheet_open');
}

function ensureSupportTelemetryHistory() {
  if (!state.history || typeof state.history !== 'object') {
    state.history = { actions: [], events: [], system: [], systemLog: [], telemetry: [] };
  }
  if (!Array.isArray(state.history.telemetry)) {
    state.history.telemetry = [];
  }
  return state.history.telemetry;
}

function emitSupportTelemetry(eventName, payload = {}, options = {}) {
  const safeEvent = String(eventName || '').trim();
  if (!safeEvent) {
    return false;
  }
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const telemetry = ensureSupportTelemetryHistory();
  telemetry.push({
    event: safeEvent,
    category: 'support',
    atRealMs: nowMs,
    dayKey: getLocalDayKey(nowMs),
    payload: payload && typeof payload === 'object' ? payload : {}
  });
  if (telemetry.length > SUPPORT_TELEMETRY_MAX_EVENTS) {
    telemetry.splice(0, telemetry.length - SUPPORT_TELEMETRY_MAX_EVENTS);
  }
  emitRetentionAnalytics(safeEvent, payload, { nowMs, skipPersist: true });
  if (options.skipPersist !== true && typeof schedulePersistState === 'function') {
    schedulePersistState();
  }
  return true;
}

function buildSupportDonateUrl(tier) {
  const safeTier = tier && typeof tier === 'object' ? tier : resolveSupportTier('growth');
  const url = new URL(SUPPORT_PAYPAL_DONATE_BASE_URL);
  if (safeTier.amount) {
    url.searchParams.set('amount', String(safeTier.amount));
    url.searchParams.set('currency_code', String(safeTier.currencyCode || 'EUR'));
  }
  return url.toString();
}

function ensureSupportFocusObserver() {
  if (supportFlowRuntime.focusObserverBound) {
    return;
  }
  supportFlowRuntime.focusObserverBound = true;
  window.addEventListener('focus', () => {
    const session = supportFlowRuntime.activeSession;
    if (!session || session.completed) {
      return;
    }
    if ((Date.now() - Number(session.openedAtMs || 0)) < 900) {
      return;
    }
    emitSupportTelemetry('support_cancelled_if_detectable', {
      source: session.source || 'unknown',
      tierId: session.tierId || 'growth',
      method: session.method || 'unknown',
      reason: 'focus_returned_without_completion_signal'
    });
    supportFlowRuntime.activeSession = null;
  }, true);
}

function markSupportSessionCompleted(outcomeEvent, payload = {}) {
  const session = supportFlowRuntime.activeSession;
  if (!session || session.completed) {
    return;
  }
  session.completed = true;
  emitSupportTelemetry(outcomeEvent, {
    tierId: session.tierId || 'growth',
    source: session.source || 'unknown',
    method: session.method || 'unknown',
    ...payload
  });
  supportFlowRuntime.activeSession = null;
}

function startSupportSession(tier, source, method) {
  supportFlowRuntime.activeSession = {
    tierId: tier && tier.id ? String(tier.id) : 'growth',
    source: String(source || 'unknown'),
    method: String(method || 'unknown'),
    openedAtMs: Date.now(),
    completed: false
  };
}

function openExternalSupportUrl(url) {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) {
    return { ok: false, reason: 'empty_url' };
  }
  try {
    const opened = window.open(safeUrl, '_blank', 'noopener,noreferrer');
    if (opened && !opened.closed) {
      try {
        opened.opener = null;
      } catch (_error) {
      }
      return { ok: true, mode: 'new_context' };
    }
  } catch (_error) {
  }
  try {
    window.location.assign(safeUrl);
    return { ok: true, mode: 'same_context' };
  } catch (_error) {
    return { ok: false, reason: 'window_open_blocked' };
  }
}

function isPaypalDonateSdkReady() {
  return Boolean(
    window.PayPal
    && window.PayPal.Donation
    && typeof window.PayPal.Donation.Button === 'function'
  );
}

function ensurePaypalSdkButtonHost() {
  const host = document.getElementById('paypalDonateSdkContainer');
  if (!host) {
    return null;
  }
  host.classList.add('hidden');
  host.setAttribute('aria-hidden', 'true');
  return host;
}

function buildPaypalSdkDonationConfig(tier, source) {
  const safeTier = tier && typeof tier === 'object' ? tier : resolveSupportTier('growth');
  const safeSource = String(source || 'support_flow');
  const config = {
    env: 'production',
    hosted_button_id: SUPPORT_PAYPAL_HOSTED_BUTTON_ID,
    image: {
      src: 'https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif',
      alt: 'Mit PayPal unterstützen',
      title: 'Mit PayPal unterstützen'
    },
    onComplete: (params) => {
      const rawStatus = params && (params.st || params.status || params.payment_status);
      const normalizedStatus = String(rawStatus || '').toLowerCase();
      if (normalizedStatus.includes('completed')) {
        markSupportSessionCompleted('support_completed_if_detectable', {
          source: safeSource,
          sdkStatus: normalizedStatus || null
        });
      } else {
        markSupportSessionCompleted('support_cancelled_if_detectable', {
          source: safeSource,
          sdkStatus: normalizedStatus || null
        });
      }
    }
  };
  if (safeTier.amount) {
    config.amount = String(safeTier.amount);
    config.currency_code = String(safeTier.currencyCode || 'EUR');
  }
  return config;
}

function primeSupportPaypalSdkButtons() {
  if (supportFlowRuntime.sdkPrimed) {
    return true;
  }
  if (!isPaypalDonateSdkReady()) {
    supportFlowRuntime.sdkPrimed = false;
    return false;
  }
  const host = ensurePaypalSdkButtonHost();
  if (!host) {
    supportFlowRuntime.sdkPrimed = false;
    return false;
  }
  if (supportFlowRuntime.sdkPrimeAttempted && host.querySelector('[data-support-sdk-tier]')) {
    supportFlowRuntime.sdkPrimed = true;
    return true;
  }
  supportFlowRuntime.sdkPrimeAttempted = true;
  host.replaceChildren();
  const tierIds = Object.keys(SUPPORT_TIERS);
  let renderedCount = 0;
  for (const tierId of tierIds) {
    const tier = SUPPORT_TIERS[tierId];
    const slot = document.createElement('div');
    slot.className = 'support-sdk-slot';
    slot.dataset.supportSdkTier = tierId;
    host.appendChild(slot);
    try {
      const donationButton = window.PayPal.Donation.Button(buildPaypalSdkDonationConfig(tier, `sdk_slot_${tierId}`));
      if (donationButton && typeof donationButton.render === 'function') {
        donationButton.render(slot);
        renderedCount += 1;
      }
    } catch (_error) {
    }
  }
  supportFlowRuntime.sdkPrimed = renderedCount > 0;
  return supportFlowRuntime.sdkPrimed;
}

function findSupportSdkTriggerNode(tierId) {
  const host = ensurePaypalSdkButtonHost();
  if (!host) {
    return null;
  }
  const safeTierId = String(tierId || 'growth');
  const slot = host.querySelector(`[data-support-sdk-tier="${safeTierId}"]`);
  if (!slot) {
    return null;
  }
  return slot.querySelector('button, input[type="image"], input[type="submit"], a, [role="button"]');
}

function renderSupportSheet(force = false) {
  if (!ui.supportSheet || !ui.supportOptionList || !ui.supportPrimaryCtaBtn) {
    return;
  }
  if (!force && state.ui.openSheet !== 'support') {
    return;
  }
  const selectedTier = resolveSupportTier(supportFlowRuntime.selectedTierId);
  supportFlowRuntime.selectedTierId = selectedTier.id;
  const optionButtons = Array.from(ui.supportOptionList.querySelectorAll('[data-support-tier]'));
  for (const button of optionButtons) {
    const tierId = String(button.dataset.supportTier || '').trim().toLowerCase();
    const active = tierId === selectedTier.id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  ui.supportPrimaryCtaBtn.textContent = i18nT('support.paypal_cta');
  ui.supportPrimaryCtaBtn.setAttribute('data-support-tier', selectedTier.id);
  ui.supportPrimaryCtaBtn.setAttribute('title', `${selectedTier.label} · ${selectedTier.displayAmount}`);
  if (ui.supportSecondaryHint) {
    ui.supportSecondaryHint.textContent = i18nT('support.voluntary_hint');
  }
  primeSupportPaypalSdkButtons();
}

function selectSupportTier(tierId) {
  const tier = resolveSupportTier(tierId);
  supportFlowRuntime.selectedTierId = tier.id;
  renderSupportSheet(true);
  return tier;
}

function getCoinShopDefinitions() {
  return [
    {
      id: REWARD_ACTION_TYPES.TIME_SKIP_SHORT,
      icon: '1h',
      title: '+1h Zeit',
      description: 'Springt den Run um eine Sim-Stunde nach vorn.',
      price: getRewardActionCoinCost(REWARD_ACTION_TYPES.TIME_SKIP_SHORT)
    },
    {
      id: REWARD_ACTION_TYPES.TIME_SKIP_LONG,
      icon: '3h',
      title: '+3h Zeit',
      description: 'Drückt längere Leerlaufzeit sofort zusammen.',
      price: getRewardActionCoinCost(REWARD_ACTION_TYPES.TIME_SKIP_LONG)
    },
    {
      id: REWARD_ACTION_TYPES.EVENT_START,
      icon: 'EV',
      title: 'Event sofort starten',
      description: 'Zieht das nächste verfügbare Event direkt vor.',
      price: getRewardActionCoinCost(REWARD_ACTION_TYPES.EVENT_START)
    },
    {
      id: REWARD_ACTION_TYPES.EMERGENCY_SAVE,
      icon: 'SOS',
      title: 'Emergency Save',
      description: 'Stabilisiert einen kritischen Run sofort.',
      price: getRewardActionCoinCost(REWARD_ACTION_TYPES.EMERGENCY_SAVE)
    },
    {
      id: REWARD_ACTION_TYPES.EVENT_REROLL,
      icon: 'RR',
      title: 'Event Reroll',
      description: 'Ersetzt ein laufendes Event durch eine neue Chance.',
      price: getRewardActionCoinCost(REWARD_ACTION_TYPES.EVENT_REROLL)
    },
    {
      id: REWARD_ACTION_TYPES.AUTO_CARE,
      icon: 'AC',
      title: 'Auto-Care',
      description: 'Pflegt Wasser, Nährstoffe und Stress für 2h mit.',
      price: getRewardActionCoinCost(REWARD_ACTION_TYPES.AUTO_CARE)
    },
    {
      id: REWARD_ACTION_TYPES.CLIMATE_STABILIZE,
      icon: 'CL',
      title: 'Klima stabilisieren',
      description: 'Beruhigt Temperatur, Luftfeuchte und VPD sofort.',
      price: getRewardActionCoinCost(REWARD_ACTION_TYPES.CLIMATE_STABILIZE)
    },
    {
      id: REWARD_ACTION_TYPES.GROWTH_BOOST,
      icon: 'GB',
      title: 'Growth Boost',
      description: 'Legt für 2h einen sauberen Wachstumsschub auf.',
      price: getRewardActionCoinCost(REWARD_ACTION_TYPES.GROWTH_BOOST)
    }
  ];
}

async function onCoinShopActionClick(actionType) {
  const safeActionType = String(actionType || '').trim();
  if (!safeActionType) {
    setCoinShopStatusMessage(i18nT('shop.status_not_available'), 'error');
    renderCoinShopSheet(true);
    return;
  }
  if (coinUiRuntime.pendingActionId) {
    setCoinShopStatusMessage(i18nT('shop.status_action_running'), 'info');
    renderCoinShopSheet(true);
    return;
  }
  coinUiRuntime.pendingActionId = safeActionType;
  setCoinShopStatusMessage(i18nT('shop.status_apply_purchase'), 'info');
  renderCoinShopSheet(true);
  try {
    const result = await triggerRewardAction(safeActionType, {
      source: 'coin_shop'
    });
    if (!result || !result.ok) {
      const reason = String(result && result.reason || 'action_failed');
      if (reason === 'insufficient_coins') {
        setCoinShopStatusMessage(i18nT('shop.status_not_enough'), 'error');
      } else if (reason === 'action_in_progress') {
        setCoinShopStatusMessage(i18nT('shop.status_action_running'), 'info');
      } else {
        setCoinShopStatusMessage(i18nT('shop.status_action_failed'), 'error');
      }
      return;
    }
    setCoinShopStatusMessage(i18nT('shop.status_action_success'), 'success');
  } finally {
    coinUiRuntime.pendingActionId = '';
    renderCoinShopSheet(true);
  }
}

async function onCoinPackPurchaseClick(packId) {
  const safePackId = String(packId || '').trim();
  if (!safePackId) {
    setCoinShopStatusMessage(i18nT('shop.status_pack_unavailable'), 'error');
    renderCoinShopSheet(true);
    return;
  }
  if (coinUiRuntime.pendingPackId) {
    setCoinShopStatusMessage(i18nT('shop.status_pack_processing'), 'info');
    renderCoinShopSheet(true);
    return;
  }
  const catalogApi = window.GrowSimCoinPackCatalog;
  const purchaseApi = window.GrowSimPurchaseService;
  if (!catalogApi || typeof catalogApi.getCoinPackById !== 'function' || !purchaseApi || typeof purchaseApi.purchaseCoinPack !== 'function') {
    setCoinShopStatusMessage(i18nT('shop.status_pack_purchase_unavailable'), 'error');
    if (typeof showRetentionToast === 'function') {
      showRetentionToast('Coin-Shop derzeit nicht verfuegbar');
    }
    renderCoinShopSheet(true);
    return;
  }
  const pack = catalogApi.getCoinPackById(safePackId);
  if (!pack) {
    setCoinShopStatusMessage(i18nT('shop.status_pack_missing'), 'error');
    renderCoinShopSheet(true);
    return;
  }

  coinUiRuntime.pendingPackId = safePackId;
  setCoinShopStatusMessage(i18nT('shop.status_prepare_purchase'), 'info');
  emitCoinTelemetry({
    type: 'coin_pack_attempt',
    payload: {
      packId: pack.id,
      coins: pack.coins,
      priceLabel: pack.priceLabel
    }
  });
  renderCoinShopSheet(true);
  try {
    const result = await purchaseApi.purchaseCoinPack(pack, {
      source: 'coin_shop'
    });
    if (!result || !result.ok) {
      setCoinShopStatusMessage(i18nT('shop.status_pack_purchase_unavailable_now'), 'error');
      if (typeof showRetentionToast === 'function') {
        showRetentionToast('Coin-Kauf aktuell nicht verfügbar');
      }
      return;
    }
    grantCoins(pack.coins, 'coin_pack_purchase', `coin_pack:${pack.id}:${Date.now()}`);
    emitCoinTelemetry({
      type: 'coin_pack_success',
      payload: {
        packId: pack.id,
        coins: pack.coins,
        mode: result.mode || 'unknown'
      }
    });
    if (typeof showRetentionToast === 'function') {
      showRetentionToast(`${pack.title} · +${pack.coins} Coins`);
    }
    setCoinShopStatusMessage(i18nT('shop.status_action_success'), 'success');
  } finally {
    coinUiRuntime.pendingPackId = '';
    renderCoinShopSheet(true);
  }
}

function renderCoinShopSheet(force = false) {
  const sheetNode = uiNode('coinShopSheet', 'coinShopSheet');
  if (!sheetNode || (!force && state.ui.openSheet !== 'coinShop')) {
    return;
  }

  const balanceNode = uiNode('coinShopBalanceText', 'coinShopBalanceText');
  const statusNode = uiNode('coinShopStatusText', 'coinShopStatusText');
  const itemListNode = uiNode('coinShopItemList', 'coinShopItemList');
  const packListNode = uiNode('coinPackList', 'coinPackList');
  const packStatusNode = uiNode('coinPackStatusText', 'coinPackStatusText');
  if (!balanceNode || !statusNode || !itemListNode || !packListNode || !packStatusNode) {
    if (force && !coinUiRuntime.renderRetryQueued) {
      coinUiRuntime.renderRetryQueued = true;
      setTimeout(() => {
        coinUiRuntime.renderRetryQueued = false;
        renderCoinShopSheet(true);
      }, 0);
    }
    return;
  }
  coinUiRuntime.renderRetryQueued = false;

  const coins = getCoins();
  balanceNode.textContent = i18nT('shop.balance_available', { amount: formatCompactNumber(coins) });
  const defaultStatus = i18nT('shop.status_default');
  const statusText = coinUiRuntime.pendingActionId
    ? i18nT('shop.status_apply_purchase')
    : (coinUiRuntime.statusMessage || defaultStatus);
  statusNode.textContent = statusText;
  statusNode.dataset.tone = String(coinUiRuntime.statusTone || 'info');

  itemListNode.replaceChildren();
  const shopItems = getCoinShopDefinitions();
  for (const item of shopItems) {
    const presentation = getRewardActionPresentation(item.id, { state, context: 'coin_shop' });
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'coin-shop-card';
    card.dataset.tone = String(presentation.tone || 'utility');
    card.disabled = presentation.disabled === true || coinUiRuntime.pendingActionId === item.id;
    card.setAttribute('aria-disabled', String(card.disabled));
    card.innerHTML = `
      <span class="coin-shop-card__icon">${escapeHtml(String(item.icon || 'C'))}</span>
      <span class="coin-shop-card__copy">
        <strong>${escapeHtml(String(item.title || i18nT('menu.coin_shop')))}</strong>
        <small>${escapeHtml(String(presentation.hint || item.description || ''))}</small>
      </span>
      <span class="coin-shop-card__meta">
        <strong>${escapeHtml(String(formatCompactNumber(item.price)))} C</strong>
        <small>${card.disabled && presentation.reason === 'insufficient_coins' ? i18nT('shop.too_few_coins') : i18nT('shop.direct_apply')}</small>
      </span>
    `;
    card.addEventListener('click', () => {
      void onCoinShopActionClick(item.id);
    });
    itemListNode.appendChild(card);
  }

  const catalogApi = window.GrowSimCoinPackCatalog;
  const purchaseApi = window.GrowSimPurchaseService;
  const packs = catalogApi && typeof catalogApi.listCoinPacks === 'function' ? catalogApi.listCoinPacks() : [];
  const purchaseMode = purchaseApi && typeof purchaseApi.getPurchaseMode === 'function' ? purchaseApi.getPurchaseMode() : 'disabled';
  packStatusNode.textContent = purchaseMode === 'debug_fake'
    ? 'Debug-Käufe aktiv. Coins werden direkt gutgeschrieben.'
    : 'Coin-Packs sind vorbereitet. Direktkauf bleibt bis zum Provider-Setup deaktiviert.';

  packListNode.replaceChildren();
  for (const pack of packs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `coin-pack-card${pack.highlight ? ' coin-pack-card--highlight' : ''}`;
    button.disabled = purchaseMode !== 'debug_fake' || coinUiRuntime.pendingPackId === pack.id;
    button.setAttribute('aria-disabled', String(button.disabled));
    button.innerHTML = `
      <span class="coin-pack-card__head">
        <strong>${escapeHtml(String(pack.title || 'Pack'))}</strong>
        <small>${escapeHtml(String(pack.badge || ''))}</small>
      </span>
      <span class="coin-pack-card__coins">+${escapeHtml(String(formatCompactNumber(pack.coins || 0)))} Coins</span>
      <span class="coin-pack-card__price">${escapeHtml(String(pack.priceLabel || ''))}</span>
    `;
    button.addEventListener('click', () => {
      void onCoinPackPurchaseClick(pack.id);
    });
    packListNode.appendChild(button);
  }
}

function openSupportPaypal(tier, source = 'sheet_option') {
  const safeTier = tier && typeof tier === 'object' ? tier : resolveSupportTier('growth');
  ensureSupportFocusObserver();
  const sdkPrimed = primeSupportPaypalSdkButtons();
  if (sdkPrimed) {
    const trigger = findSupportSdkTriggerNode(safeTier.id);
    if (trigger) {
      emitSupportTelemetry('support_paypal_opened', {
        source: String(source || 'sheet_option'),
        tierId: safeTier.id,
        tierLabel: safeTier.label,
        amount: safeTier.amount || null,
        method: 'sdk'
      });
      startSupportSession(safeTier, source, 'sdk');
      try {
        trigger.click();
        return { ok: true, method: 'sdk' };
      } catch (_error) {
      }
    }
  }

  const url = buildSupportDonateUrl(safeTier);
  emitSupportTelemetry('support_paypal_opened', {
    source: String(source || 'sheet_option'),
    tierId: safeTier.id,
    tierLabel: safeTier.label,
    amount: safeTier.amount || null,
    method: 'url_fallback'
  });
  startSupportSession(safeTier, source, 'url_fallback');
  const openResult = openExternalSupportUrl(url);
  if (!openResult.ok) {
    markSupportSessionCompleted('support_cancelled_if_detectable', {
      reason: openResult.reason || 'open_failed'
    });
    openMenuDialog({
      title: 'PayPal konnte nicht geöffnet werden',
      message: 'Bitte Popup-Blocker prüfen oder den Support später erneut versuchen.',
      cancelLabel: 'Schließen',
      confirmLabel: '',
      onConfirm: null
    });
    return { ok: false, reason: openResult.reason || 'open_failed' };
  }
  return { ok: true, method: openResult.mode || 'url_fallback' };
}

function onSupportTierSelected(tierId, context = {}) {
  const tier = selectSupportTier(tierId);
  const source = String(context && context.source ? context.source : 'sheet_option');
  emitSupportTelemetry('support_option_selected', {
    source,
    tierId: tier.id,
    tierLabel: tier.label,
    amount: tier.amount || null
  });
  return openSupportPaypal(tier, source);
}

function onSupportPrimaryCtaClick(context = {}) {
  const tier = resolveSupportTier(supportFlowRuntime.selectedTierId);
  const source = String(context && context.source ? context.source : 'sheet_primary_cta');
  emitSupportTelemetry('support_option_selected', {
    source,
    tierId: tier.id,
    tierLabel: tier.label,
    amount: tier.amount || null
  });
  return openSupportPaypal(tier, source);
}

function hasRetentionClaim(claimKey) {
  const safeKey = String(claimKey || '').trim();
  if (!safeKey) {
    return true;
  }
  const retention = ensureRetentionState(state);
  return retention.claimLedger.includes(safeKey);
}

function registerRetentionClaim(claimKey) {
  const safeKey = String(claimKey || '').trim();
  if (!safeKey) {
    return false;
  }
  const retention = ensureRetentionState(state);
  if (retention.claimLedger.includes(safeKey)) {
    return false;
  }
  retention.claimLedger.push(safeKey);
  return true;
}

function grantRetentionRewardOnce(claimKey, rewardSpec = {}, context = {}) {
  const safeClaimKey = String(claimKey || '').trim();
  if (!safeClaimKey || hasRetentionClaim(safeClaimKey)) {
    return { granted: false, reason: 'duplicate' };
  }
  const progressionApi = getProgressionApi();
  if (!progressionApi || typeof progressionApi.grantRuntimeXp !== 'function') {
    return { granted: false, reason: 'progression_api_unavailable' };
  }
  const xp = Math.max(0, Math.trunc(Number(rewardSpec.xp) || 0));
  const xpResult = progressionApi.grantRuntimeXp(state, xp, {
    label: `retention:${safeClaimKey}`,
    reason: String(context.reason || 'retention')
  });
  registerRetentionClaim(safeClaimKey);
  const levelUpCoins = grantLevelUpCoinsFromXpResult(xpResult, 'level_up', `retention_level:${safeClaimKey}`);
  return {
    granted: true,
    xpGranted: Math.max(0, Math.trunc(Number(xpResult && xpResult.grantedXp) || 0)),
    unlocks: Array.isArray(xpResult && xpResult.unlocked) ? xpResult.unlocked : [],
    coinsGranted: levelUpCoins
  };
}

function getDailyCareTaskTemplates() {
  return [
    {
      id: 'water_once',
      type: 'water_once',
      title: i18nT('daily.task.water_once.title'),
      description: i18nT('daily.task.water_once.description'),
      trigger: 'water_once',
      target: 1,
      rewardCoins: getDefaultDailyTaskCoins('water_once')
    },
    {
      id: 'resolve_one_event',
      type: 'resolve_one_event',
      title: i18nT('daily.task.resolve_one_event.title'),
      description: i18nT('daily.task.resolve_one_event.description'),
      trigger: 'resolve_one_event',
      target: 1,
      rewardCoins: getDefaultDailyTaskCoins('resolve_one_event')
    },
    {
      id: 'open_app_twice',
      type: 'open_app_twice',
      title: i18nT('daily.task.open_app_twice.title'),
      description: i18nT('daily.task.open_app_twice.description'),
      trigger: 'open_app_twice',
      target: 2,
      rewardCoins: getDefaultDailyTaskCoins('open_app_twice')
    },
    {
      id: 'stable_climate_window',
      type: 'stable_climate_window',
      title: i18nT('daily.task.stable_climate_window.title'),
      description: i18nT('daily.task.stable_climate_window.description'),
      trigger: 'stable_climate_window',
      target: 1,
      rewardCoins: getDefaultDailyTaskCoins('stable_climate_window')
    }
  ];
}

function buildDailyCareTasks(snapshot = state, dayKey = getLocalDayKey(Date.now())) {
  const templates = getDailyCareTaskTemplates();
  const alwaysOn = ['water_once', 'resolve_one_event', 'open_app_twice'];
  const selected = alwaysOn
    .map((id) => templates.find((entry) => String(entry.id || '') === id))
    .filter(Boolean)
    .slice(0, RETENTION_DAILY_TASK_MAX);

  return selected.map((template) => {
    const taskId = String(template.id || '').trim();
    const type = String(template.type || taskId).trim();
    const target = Math.max(1, Math.trunc(Number(template.target) || 1));
    const rewardCoins = Math.max(0, Math.trunc(Number(template.rewardCoins) || getDefaultDailyTaskCoins(type)));
    return {
      id: taskId,
      taskId,
      type,
      title: String(template.title || 'Daily Task'),
      description: String(template.description || ''),
      dayKey,
      trigger: String(template.trigger || ''),
      sheetName: String(template.sheetName || ''),
      threshold: Number.isFinite(Number(template.threshold)) ? Number(template.threshold) : null,
      progress: 0,
      progressValue: 0,
      target,
      targetValue: target,
      completed: false,
      claimed: false,
      rewardCoins,
      xp: Math.max(0, Math.trunc(Number(template.minXp) || RETENTION_DAILY_TASK_XP)),
      completedAt: null,
      claimedAt: null,
      rewardGrantedAt: null,
      claimKey: `daily:task:${dayKey}:${taskId}`
    };
  });
}

function showRetentionToast(message) {
  const text = String(message || '').trim();
  if (!text) {
    return;
  }
  const existing = document.getElementById('retentionToast');
  if (existing) {
    existing.remove();
  }
  const node = document.createElement('div');
  node.id = 'retentionToast';
  node.className = 'retention-toast';
  node.textContent = text;
  document.body.appendChild(node);
  window.setTimeout(() => {
    node.classList.add('is-hidden');
    window.setTimeout(() => node.remove(), 280);
  }, 1800);
}

function unlockMicroAchievement(id, context = {}) {
  const safeId = String(id || '').trim();
  if (!safeId) {
    return { unlocked: false, reason: 'invalid_id' };
  }
  const definition = getMicroAchievementDefinition(safeId);
  const retention = ensureRetentionState(state);
  if (retention.micro.unlockedIds.includes(safeId)) {
    return { unlocked: false, reason: 'duplicate' };
  }
  retention.micro.unlockedIds.push(safeId);
  const nowMs = Number.isFinite(Number(context.nowMs)) ? Number(context.nowMs) : Date.now();
  retention.micro.unlockedHistory.push({
    id: safeId,
    atRealMs: nowMs
  });
  retention.micro.unlockedHistory = retention.micro.unlockedHistory.slice(-60);
  emitRetentionAnalytics('micro_unlocked', {
    id: safeId,
    rarity: String(definition.rarity || 'common'),
    category: String(definition.category || 'general')
  }, {
    nowMs,
    eventKey: `micro_unlock:${safeId}`
  });
  const canShowToast = (nowMs - Number(retention.micro.lastShownAt || 0)) >= RETENTION_MICRO_COOLDOWN_MS
    && Number(retention.micro.sessionShownCount || 0) < RETENTION_MICRO_SESSION_LIMIT;
  if (canShowToast) {
    retention.micro.lastShownAt = nowMs;
    retention.micro.sessionShownCount = Number(retention.micro.sessionShownCount || 0) + 1;
    const toastText = String(context.toastText || `${definition.title} freigeschaltet`);
    showRetentionToast(toastText);
    emitRetentionAnalytics('micro_shown', {
      id: safeId,
      rarity: String(definition.rarity || 'common')
    }, {
      nowMs,
      eventKey: `micro_shown:${safeId}`
    });
  }
  const claimKey = `micro:${safeId}`;
  const xp = Math.max(0, Math.trunc(Number(context.rewardXp) || Number(definition.xpRewardOverride) || 6));
  const rewardResult = grantRetentionRewardOnce(claimKey, { xp }, { reason: 'micro' });
  if (rewardResult.granted) {
    addLog('system', `Micro-Erfolg: ${String(context.label || definition.title || safeId)}`, {
      type: 'micro_achievement',
      id: safeId,
      xpGranted: rewardResult.xpGranted
    });
  }
  return { unlocked: true };
}

function syncDailyTaskDerivedState(retention, nowMs = Date.now()) {
  const daily = retention && retention.dailyCare && typeof retention.dailyCare === 'object'
    ? retention.dailyCare
    : null;
  if (!daily) {
    return;
  }
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  daily.completedCount = 0;
  let allClaimed = true;
  const claimLedger = Array.isArray(retention.claimLedger) ? retention.claimLedger : [];
  for (const task of (Array.isArray(daily.tasks) ? daily.tasks : [])) {
    if (!task || typeof task !== 'object') {
      continue;
    }
    const target = Math.max(1, Math.trunc(Number(task.target || task.targetValue) || 1));
    const progress = clampInt(Number(task.progress || task.progressValue) || 0, 0, target);
    task.target = target;
    task.targetValue = target;
    task.progress = progress;
    task.progressValue = progress;
    task.completed = Boolean(task.completed) || Boolean(task.completedAt) || progress >= target;
    if (task.completed && !task.completedAt) {
      task.completedAt = now;
    }
    const claimedByLedger = Boolean(task.claimKey && claimLedger.includes(task.claimKey));
    task.claimed = Boolean(task.claimed) || Boolean(task.claimedAt) || Boolean(task.rewardGrantedAt) || claimedByLedger;
    if (task.claimed && !task.claimedAt) {
      task.claimedAt = Number(task.rewardGrantedAt || task.completedAt || now);
    }
    task.rewardGrantedAt = task.claimedAt || null;
    if (task.completed) {
      daily.completedCount += 1;
      if (!task.claimed) {
        allClaimed = false;
      }
    } else {
      allClaimed = false;
    }
  }
  daily.allCompleteClaimed = Boolean(daily.tasks && daily.tasks.length > 0 && allClaimed);
}

function resolveNextStreakRewardPreview(streakCount) {
  return resolveStreakRewardAmount(Math.max(1, Math.trunc(Number(streakCount) || 0) + 1));
}

function reconcilePendingStreakRecovery(snapshot = state, nowMs = Date.now()) {
  const retention = ensureRetentionState(snapshot);
  const streak = retention.streak || {};
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const todayKey = getLocalDayKey(now);
  const existingOfferDayKey = String(streak.pendingRecoveryDayKey || '').trim();
  if (existingOfferDayKey && existingOfferDayKey !== todayKey) {
    streak.pendingRecoveryOffer = false;
    streak.pendingRecoveryDayKey = '';
    streak.pendingRecoveryStreakCount = 0;
  }

  const previousDayKey = String(streak.lastQualifiedDayKey || streak.lastCheckinDayKey || '').trim();
  if (!previousDayKey) {
    return { changed: existingOfferDayKey !== String(streak.pendingRecoveryDayKey || '').trim(), gap: 0, previousCount: 0, openedOffer: false };
  }

  const gap = getDayKeyDistance(previousDayKey, todayKey);
  const previousCount = Math.max(0, Math.trunc(Number(streak.currentCount) || 0));
  let changed = existingOfferDayKey !== String(streak.pendingRecoveryDayKey || '').trim();
  let openedOffer = false;

  if (gap > 1 && previousCount > 0) {
    if (!Array.isArray(streak.recoveryClaimedDayKeys) || !streak.recoveryClaimedDayKeys.includes(todayKey)) {
      const nextPendingCount = Math.max(previousCount, Math.trunc(Number(streak.pendingRecoveryStreakCount) || 0));
      if (!streak.pendingRecoveryOffer || streak.pendingRecoveryDayKey !== todayKey || Number(streak.pendingRecoveryStreakCount || 0) !== nextPendingCount) {
        streak.pendingRecoveryOffer = true;
        streak.pendingRecoveryDayKey = todayKey;
        streak.pendingRecoveryStreakCount = nextPendingCount;
        changed = true;
        openedOffer = true;
      }
    }
    if (previousCount !== 0) {
      streak.currentCount = 0;
      changed = true;
    }
  }

  return { changed, gap, previousCount, openedOffer };
}

function qualifyRetentionStreak(nowMs = Date.now(), context = {}) {
  const retention = ensureRetentionState(state);
  const streak = retention.streak || {};
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const todayKey = getLocalDayKey(now);
  if (String(streak.lastQualifiedDayKey || '') === todayKey) {
    return { ok: false, reason: 'already_qualified_today', current: Math.max(0, Math.trunc(Number(streak.currentCount) || 0)) };
  }

  const previousDayKey = String(streak.lastQualifiedDayKey || streak.lastCheckinDayKey || '').trim();
  const gap = previousDayKey ? getDayKeyDistance(previousDayKey, todayKey) : 0;
  if (!previousDayKey) {
    streak.currentCount = 1;
  } else if (gap === 1) {
    streak.currentCount = Math.max(1, Math.trunc(Number(streak.currentCount) || 0) + 1);
  } else if (gap > 1) {
    streak.currentCount = 1;
  }

  streak.bestCount = Math.max(Math.max(0, Math.trunc(Number(streak.bestCount) || 0)), Math.max(1, Math.trunc(Number(streak.currentCount) || 0)));
  streak.lastQualifiedDayKey = todayKey;
  streak.lastCheckinDayKey = todayKey;
  streak.lastClaimDayKey = todayKey;
  streak.lastEvaluatedDayKey = todayKey;
  retention.streak = streak;

  emitRetentionAnalytics('streak_checkin', {
    count: streak.currentCount,
    source: String(context.source || 'daily_task_claim')
  }, {
    nowMs: now,
    eventKey: `streak_checkin:${todayKey}`
  });
  if (gap === 1) {
    emitRetentionAnalytics('streak_continue', {
      count: streak.currentCount
    }, {
      nowMs: now,
      eventKey: `streak_continue:${todayKey}`
    });
  } else if (gap > 1) {
    emitRetentionAnalytics('streak_break', {
      gapDays: gap,
      previousCount: Math.max(0, Math.trunc(Number(context.previousCount) || 0))
    }, {
      nowMs: now,
      eventKey: `streak_break:${todayKey}`
    });
  }

  const streakReward = resolveStreakRewardAmount(streak.currentCount);
  const coinResult = grantCoins(streakReward, 'streak_reward', `streak:reward:${todayKey}`);
  return {
    ok: true,
    current: streak.currentCount,
    best: streak.bestCount,
    todayKey,
    streakCoins: coinResult && coinResult.ok ? coinResult.amount : 0,
    nextRewardCoins: resolveNextStreakRewardPreview(streak.currentCount)
  };
}

function claimDailyTask(taskId, nowMs = Date.now(), options = {}) {
  const retention = ensureRetentionState(state);
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const todayKey = getLocalDayKey(now);
  evaluateDailyRetention(state, now, { skipPersist: true, forceCheckin: false });
  const daily = retention.dailyCare || {};
  if (String(daily.dayKey || '') !== todayKey) {
    return { ok: false, reason: 'stale_day' };
  }
  const safeTaskId = String(taskId || '').trim();
  const task = (Array.isArray(daily.tasks) ? daily.tasks : []).find((entry) => entry && String(entry.taskId || entry.id || '') === safeTaskId);
  if (!task) {
    return { ok: false, reason: 'task_missing' };
  }
  if (!task.completed) {
    return { ok: false, reason: 'not_completed' };
  }
  if (task.claimed || hasRetentionClaim(task.claimKey)) {
    task.claimed = true;
    task.claimedAt = Number(task.claimedAt || task.completedAt || now);
    task.rewardGrantedAt = task.claimedAt;
    syncDailyTaskDerivedState(retention, now);
    return { ok: false, reason: 'already_claimed' };
  }

  const rewardCoins = Math.max(0, Math.trunc(Number(task.rewardCoins) || getDefaultDailyTaskCoins(task.type || task.trigger)));
  const grant = grantCoins(rewardCoins, 'daily_task', task.claimKey);
  if (!grant.ok && grant.reason !== 'duplicate') {
    return { ok: false, reason: grant.reason || 'grant_failed' };
  }

  registerRetentionClaim(task.claimKey);
  task.claimed = true;
  task.claimedAt = now;
  task.rewardGrantedAt = now;
  syncDailyTaskDerivedState(retention, now);
  emitRetentionAnalytics('daily_task_claimed', {
    taskId: task.taskId,
    type: task.type || task.trigger || '',
    coins: rewardCoins
  }, {
    nowMs: now,
    eventKey: `daily_task_claimed:${todayKey}:${task.taskId}`
  });
  const streakResult = qualifyRetentionStreak(now, { source: 'daily_task_claim' });

  if (options.skipPersist !== true) {
    schedulePersistState(true);
  }
  return {
    ok: true,
    taskId: task.taskId,
    coinsGranted: grant.ok ? grant.amount : 0,
    streak: streakResult
  };
}

function claimDailyCheckin(nowMs = Date.now(), options = {}) {
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const streakResult = qualifyRetentionStreak(now, {
    source: 'daily_checkin',
    previousCount: Math.max(0, Math.trunc(Number(options.previousCount) || 0))
  });
  if (!streakResult.ok) {
    return streakResult;
  }
  if (options.skipPersist !== true) {
    schedulePersistState(true);
  }
  return streakResult;
}

function recordRetentionSessionStart(nowMs = Date.now(), source = 'boot', options = {}) {
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const retention = ensureRetentionState(state);
  evaluateDailyRetention(state, now, { skipPersist: true, forceCheckin: false });
  const todayKey = getLocalDayKey(now);
  if (!retention.session || typeof retention.session !== 'object') {
    retention.session = { dayKey: todayKey, openCount: 0, lastOpenAtMs: 0 };
  }
  if (String(retention.session.dayKey || '') !== todayKey) {
    retention.session.dayKey = todayKey;
    retention.session.openCount = 0;
    retention.session.lastOpenAtMs = 0;
  }
  const lastOpenAtMs = Number(retention.session.lastOpenAtMs || 0);
  if (lastOpenAtMs > 0 && (now - lastOpenAtMs) < RETENTION_SESSION_MIN_GAP_MS) {
    return { counted: false, reason: 'debounced', openCount: Number(retention.session.openCount || 0), todayKey };
  }
  retention.session.openCount = Math.max(0, Math.trunc(Number(retention.session.openCount) || 0)) + 1;
  retention.session.lastOpenAtMs = now;
  emitRetentionAnalytics('retention_session_start', {
    source: String(source || 'boot'),
    openCount: retention.session.openCount
  }, {
    nowMs: now,
    eventKey: `retention_session_start:${todayKey}:${retention.session.openCount}`
  });
  updateDailyCareCompletion('session_start', {
    nowMs: now,
    source: String(source || 'boot'),
    openCount: retention.session.openCount
  });
  const onboardingAlreadyShown = Number(retention.micro && retention.micro.onboardingHookShownAtMs || 0) > 0;
  if (!onboardingAlreadyShown && retention.session.openCount === 1) {
    const hookKey = pickI18nVariant('onboarding.hook', 3, now);
    showRetentionToast(i18nT(hookKey));
    retention.micro.onboardingHookShownAtMs = now;
  }
  if (options.skipPersist !== true) {
    schedulePersistState();
  }
  return { counted: true, openCount: retention.session.openCount, todayKey };
}

function evaluateDailyRetention(snapshot = state, nowMs = Date.now(), options = {}) {
  const retention = ensureRetentionState(snapshot);
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const todayKey = getLocalDayKey(now);
  let changed = false;

  if (retention.dailyCare.dayKey !== todayKey) {
    retention.dailyCare.dayKey = todayKey;
    retention.dailyCare.tasks = buildDailyCareTasks(snapshot, todayKey);
    retention.dailyCare.completedCount = 0;
    retention.dailyCare.allCompleteClaimed = false;
    retention.dailyCare.lastGeneratedAtMs = now;
    retention.micro.sessionShownCount = 0;
    if (!retention.session || typeof retention.session !== 'object') {
      retention.session = { dayKey: todayKey, openCount: 0, lastOpenAtMs: 0 };
    } else {
      retention.session.dayKey = todayKey;
      retention.session.openCount = 0;
      retention.session.lastOpenAtMs = 0;
    }
    emitRetentionAnalytics('daily_task_generated', {
      taskCount: retention.dailyCare.tasks.length
    }, {
      nowMs: now,
      eventKey: `daily_task_generated:${todayKey}`
    });
    changed = true;
  }

  const streak = retention.streak;
  const streakRecovery = reconcilePendingStreakRecovery(snapshot, now);
  if (streakRecovery.changed) {
    changed = true;
  }
  streak.lastEvaluatedDayKey = todayKey;
  syncDailyTaskDerivedState(retention, now);
  if (options.forceCheckin === true) {
    const checkin = claimDailyCheckin(now, {
      skipPersist: true,
      previousCount: streakRecovery.previousCount
    });
    if (checkin && checkin.ok) {
      changed = true;
    }
  }

  if (changed && options.skipPersist !== true) {
    schedulePersistState();
  }
  return { changed, dayKey: todayKey, streakCount: Math.max(0, Math.trunc(Number(streak.currentCount) || 0)) };
}

function tryApplyStreakRecovery(nowMs = Date.now()) {
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const retention = ensureRetentionState(state);
  const streak = retention.streak || {};
  const todayKey = getLocalDayKey(now);
  if (!streak.pendingRecoveryOffer) {
    return { ok: false, reason: 'no_offer' };
  }
  if (!streak.pendingRecoveryDayKey || streak.pendingRecoveryDayKey !== todayKey) {
    streak.pendingRecoveryOffer = false;
    streak.pendingRecoveryDayKey = '';
    streak.pendingRecoveryStreakCount = 0;
    return { ok: false, reason: 'offer_expired' };
  }
  if (streak.recoveryClaimedDayKeys.includes(todayKey)) {
    return { ok: false, reason: 'already_claimed' };
  }
  if (Number(streak.freezeCredits || 0) <= 0) {
    return { ok: false, reason: 'no_credits' };
  }
  const restoredCount = Math.max(
    Number(streak.currentCount || 1),
    Math.max(1, Number(streak.pendingRecoveryStreakCount || 1))
  );
  streak.freezeCredits = Math.max(0, Number(streak.freezeCredits || 0) - 1);
  streak.currentCount = restoredCount;
  streak.bestCount = Math.max(Number(streak.bestCount || 0), restoredCount);
  streak.pendingRecoveryOffer = false;
  streak.pendingRecoveryDayKey = '';
  streak.pendingRecoveryStreakCount = 0;
  streak.recoveryClaimedDayKeys.push(todayKey);

  const claimKey = `streak:recovered:${todayKey}`;
  grantRetentionRewardOnce(claimKey, { xp: 6 }, { reason: 'streak_recovery' });
  unlockMicroAchievement('streak_recovered', {
    nowMs: now,
    toastText: 'Serie gerettet · fair weitergeführt',
    label: 'Streak Recovery',
    rewardXp: 6
  });
  emitRetentionAnalytics('streak_recovered', {
    restoredCount
  }, {
    nowMs: now,
    eventKey: `streak_recovered:${todayKey}`
  });
  schedulePersistState(true);
  if (state.ui.openSheet === 'missions' && typeof renderMissionsSheet === 'function') {
    renderMissionsSheet();
  }
  return { ok: true, restoredCount };
}

function tryApplyRewardedBonus(type, context = {}) {
  const safeType = String(type || '').trim();
  const nowMs = Number.isFinite(Number(context.nowMs)) ? Number(context.nowMs) : Date.now();
  const todayKey = getLocalDayKey(nowMs);
  const retention = ensureRetentionState(state);
  const streak = retention.streak || {};
  const daily = retention.dailyCare || {};

  if (!safeType) {
    return { ok: false, reason: 'invalid_type' };
  }

  if (safeType === 'streak_recovery_credit') {
    const offerOpen = Boolean(streak.pendingRecoveryOffer) && String(streak.pendingRecoveryDayKey || '') === todayKey;
    if (!offerOpen) {
      return { ok: false, reason: 'no_recovery_offer' };
    }
    const claimKey = `rewarded:streak_recovery_credit:${todayKey}`;
    if (hasRetentionClaim(claimKey)) {
      return { ok: false, reason: 'already_claimed' };
    }
    streak.freezeCredits = Math.min(2, Math.max(0, Number(streak.freezeCredits || 0)) + 1);
    registerRetentionClaim(claimKey);
    emitRetentionAnalytics('rewarded_bonus_applied', {
      type: safeType
    }, {
      nowMs,
      eventKey: `rewarded_bonus_applied:${safeType}:${todayKey}`
    });
    schedulePersistState(true);
    return { ok: true, type: safeType, credits: streak.freezeCredits };
  }

  if (safeType === 'daily_all_complete_boost') {
    const dayKey = String(daily.dayKey || '');
    if (!dayKey || dayKey !== todayKey || !daily.allCompleteClaimed) {
      return { ok: false, reason: 'daily_not_complete' };
    }
    const claimKey = `rewarded:daily_all_complete_boost:${todayKey}`;
    const rewardResult = grantRetentionRewardOnce(claimKey, {
      xp: RETENTION_REWARDED_BONUS_XP.daily_all_complete_boost
    }, {
      reason: 'rewarded_daily_boost'
    });
    if (!rewardResult.granted) {
      return { ok: false, reason: rewardResult.reason || 'duplicate' };
    }
    emitRetentionAnalytics('rewarded_bonus_applied', {
      type: safeType,
      xpGranted: rewardResult.xpGranted
    }, {
      nowMs,
      eventKey: `rewarded_bonus_applied:${safeType}:${todayKey}`
    });
    schedulePersistState(true);
    return { ok: true, type: safeType, xpGranted: rewardResult.xpGranted };
  }

  if (safeType === 'sim_time_boost') {
    const claimKey = `rewarded:sim_time_boost:${todayKey}`;
    if (hasRetentionClaim(claimKey)) {
      return { ok: false, reason: 'already_claimed' };
    }
    if (!state.boost || typeof state.boost !== 'object') {
      state.boost = {
        boostUsedToday: 0,
        boostMaxPerDay: 6,
        dayStamp: dayStamp(nowMs),
        boostEndsAtMs: 0
      };
    }
    const currentEndsAt = Number(state.boost.boostEndsAtMs || 0);
    const baseStart = Math.max(nowMs, currentEndsAt);
    state.boost.boostEndsAtMs = baseStart + (10 * 60 * 1000);
    registerRetentionClaim(claimKey);
    emitRetentionAnalytics('rewarded_bonus_applied', {
      type: safeType,
      boostEndsAtMs: state.boost.boostEndsAtMs
    }, {
      nowMs,
      eventKey: `rewarded_bonus_applied:${safeType}:${todayKey}`
    });
    schedulePersistState(true);
    return { ok: true, type: safeType, boostEndsAtMs: state.boost.boostEndsAtMs };
  }

  return { ok: false, reason: 'unsupported_type' };
}

function updateDailyCareCompletion(triggerType, payload = {}) {
  const retention = ensureRetentionState(state);
  if (!retention.dailyCare.dayKey || !Array.isArray(retention.dailyCare.tasks) || !retention.dailyCare.tasks.length) {
    return { changed: false };
  }
  const nowMs = Number.isFinite(Number(payload.nowMs)) ? Number(payload.nowMs) : Date.now();
  const todayKey = getLocalDayKey(nowMs);
  if (retention.dailyCare.dayKey !== todayKey) {
    return { changed: false };
  }
  let changed = false;
  let newlyCompleted = 0;
  const completionFeedback = [];
  const safeTrigger = String(triggerType || '').trim();
  const actionId = String(payload.actionId || '').trim().toLowerCase();
  const actionCategory = String(payload.category || '').trim().toLowerCase();
  const currentOpenCount = Math.max(0, Math.trunc(Number(payload.openCount) || Number(retention.session && retention.session.openCount) || 0));

  for (const task of retention.dailyCare.tasks) {
    if (!task) {
      continue;
    }
    const target = Math.max(1, Math.trunc(Number(task.target || task.targetValue) || 1));
    const previousProgress = clampInt(Number(task.progress || task.progressValue) || 0, 0, target);
    let nextProgress = previousProgress;
    const type = String(task.type || task.trigger || '').trim();

    if (type === 'water_once' && safeTrigger === 'action_success') {
      if (actionCategory === 'watering' || actionId.includes('water')) {
        nextProgress = Math.min(target, previousProgress + 1);
      }
    } else if (type === 'resolve_one_event' && safeTrigger === 'event_resolved') {
      nextProgress = Math.min(target, previousProgress + 1);
    } else if (type === 'open_app_twice' && safeTrigger === 'session_start') {
      nextProgress = Math.min(target, currentOpenCount);
    } else if (type === 'stable_climate_window' && safeTrigger === 'climate_stable_window') {
      nextProgress = Math.min(target, previousProgress + 1);
    }

    if (nextProgress !== previousProgress) {
      task.progress = nextProgress;
      task.progressValue = nextProgress;
      changed = true;
    }
    if (!task.completed && nextProgress >= target) {
      task.completed = true;
      task.completedAt = nowMs;
      changed = true;
      newlyCompleted += 1;
      emitRetentionAnalytics('daily_task_completed', {
        taskId: task.taskId,
        type
      }, {
        nowMs,
        eventKey: `daily_task_completed:${retention.dailyCare.dayKey}:${task.taskId}`
      });
      completionFeedback.push(i18nT('daily.toast.task_done', {
        task: resolveLikelyI18nText(
          task.title,
          String(task.type || task.trigger || task.sheetName || '').trim()
            ? `daily.task.${String(task.type || task.trigger || task.sheetName || '').trim()}.title`
            : 'daily.task_fallback'
        )
      }));
    }
  }

  syncDailyTaskDerivedState(retention, nowMs);
  if (retention.dailyCare.completedCount >= 2) {
    unlockMicroAchievement('daily_pair_clean', {
      nowMs,
      toastText: i18nT('daily.toast.strong_streak'),
      label: 'Daily Pair',
      rewardXp: 5
    });
  }

  const allDone = retention.dailyCare.tasks.length > 0 && retention.dailyCare.tasks.every((task) => Boolean(task && task.completed));
  if (allDone && !retention.dailyCare.allCompleteClaimed) {
    retention.dailyCare.allCompleteClaimed = retention.dailyCare.tasks.every((task) => task && task.claimed);
    emitRetentionAnalytics('daily_all_complete', {
      dayKey: retention.dailyCare.dayKey
    }, {
      nowMs,
      eventKey: `daily_all_complete:${retention.dailyCare.dayKey}`
    });
    changed = true;
    unlockMicroAchievement('daily_full_sweep', {
      nowMs,
      toastText: i18nT('daily.toast.all_done'),
      label: 'Daily Full Sweep',
      rewardXp: 8
    });
  }

  if (newlyCompleted > 0 && retention.dailyCare.completedCount === 1) {
    unlockMicroAchievement('daily_first_task', {
      nowMs,
      toastText: i18nT('daily.toast.first_done'),
      label: 'First Daily Task',
      rewardXp: 4
    });
  }

  if (completionFeedback.length === 1) {
    showRetentionToast(i18nT('daily.toast.claim_now', {
      text: completionFeedback[0]
    }));
  } else if (completionFeedback.length > 1) {
    showRetentionToast(i18nT('daily.toast.multi_done', {
      count: completionFeedback.length
    }));
  }

  if (changed) {
    schedulePersistState();
  }
  return { changed };
}

window.__gsEvaluateDailyRetention = (nowMs, options = {}) => evaluateDailyRetention(state, nowMs, options);
window.__gsRetentionTaskUpdate = (triggerType, payload = {}) => updateDailyCareCompletion(triggerType, payload);
window.__gsClaimDailyTask = (taskId, nowMs = Date.now(), options = {}) => claimDailyTask(taskId, nowMs, options);
window.__gsClaimDailyCheckin = (nowMs = Date.now(), options = {}) => claimDailyCheckin(nowMs, options);
window.__gsRecordRetentionSessionStart = (nowMs = Date.now(), source = 'manual', options = {}) => recordRetentionSessionStart(nowMs, source, options);
window.__gsTryStreakRecovery = (nowMs) => tryApplyStreakRecovery(nowMs);
window.__gsTryApplyRewardedBonus = (type, context = {}) => tryApplyRewardedBonus(type, context);
window.__gsGetMicroAchievementDefinition = (id) => getMicroAchievementDefinition(id);
window.__gsGetLocalDayKey = (nowMs = Date.now()) => getLocalDayKey(nowMs);
window.__gsEmitRetentionAnalytics = (event, payload = {}, options = {}) => emitRetentionAnalytics(event, payload, options);
window.__gsAggregateDailyRetentionStats = () => aggregateDailyRetentionStats(state);
window.__gsGetLastNDaysRetentionStats = (days = 7, nowMs = Date.now()) => getLastNDaysStats(days, state, nowMs);

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

function getHarvestApi() {
  return window.GrowSimHarvest && typeof window.GrowSimHarvest === 'object' ? window.GrowSimHarvest : null;
}

function getGrowSimClientVersion() {
  return window.GrowSimBuild && typeof window.GrowSimBuild.appVersion === 'string'
    ? window.GrowSimBuild.appVersion
    : 'growsim-dev';
}

function getHarvestSubmissionReadinessDefaults() {
  return {
    localSummaryReady: false,
    verificationStatus: 'local_only',
    lastLocalFinalizeAtRealMs: null,
    pendingSubmission: false,
    lastVerifiedSyncAtRealMs: null,
    backendSessionId: '',
    sessionState: 'idle',
    sessionError: '',
    submissionId: '',
    submissionState: 'idle',
    submissionError: '',
    statusMessage: '',
    serverCode: '',
    verifiedHarvestResult: null,
    provisionalHarvestResult: null,
    leaderboardEligible: false,
    reviewNeeded: false,
    anomalyFlags: [],
    lastVerificationAt: null,
    leaderboardSnapshot: null
  };
}

function normalizeHarvestVerificationResult(resultLike, fallbackStatus = '') {
  if (!resultLike || typeof resultLike !== 'object') {
    return null;
  }

  const safe = resultLike;
  const normalizeScore = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? round2(clamp(numeric, 0, 100)) : null;
  };
  const qualityBandLabel = (() => {
    const direct = String(safe.qualityBandLabel || safe.qualityBand || '').trim();
    if (direct) {
      return direct;
    }
    const tier = String(safe.qualityTier || '').trim().toLowerCase();
    if (tier === 'perfect') return 'A';
    if (tier === 'degraded') return 'C';
    const qualityScore = normalizeScore(safe.qualityScore);
    if (Number.isFinite(qualityScore)) {
      if (qualityScore >= 88) return 'A';
      if (qualityScore < 64) return 'C';
    }
    return 'B';
  })();

  return {
    harvestScore: normalizeScore(safe.harvestScore),
    yieldScore: normalizeScore(safe.yieldScore),
    qualityScore: normalizeScore(safe.qualityScore),
    stabilityScore: normalizeScore(safe.stabilityScore),
    efficiencyScore: normalizeScore(safe.efficiencyScore),
    challengeScore: normalizeScore(safe.challengeScore),
    qualityBandLabel,
    qualityTier: String(safe.qualityTier || '').trim(),
    verificationStatus: String(safe.verificationStatus || safe.status || fallbackStatus || '').trim(),
    explanation: String(safe.explanation || safe.reason || safe.message || '').trim(),
    verifiedAt: String(safe.verifiedAt || safe.updatedAt || safe.checkedAt || '').trim(),
    leaderboardEligible: Boolean(safe.leaderboardEligible),
    anomalyFlags: Array.isArray(safe.anomalyFlags) ? safe.anomalyFlags.map((entry) => String(entry || '').trim()).filter(Boolean) : []
  };
}

function ensureHarvestBackendState(runLike = state.run) {
  const run = runLike && typeof runLike === 'object' ? runLike : getCanonicalRun(state);
  if (!run.harvest || typeof run.harvest !== 'object') {
    run.harvest = {};
  }

  const defaults = getHarvestSubmissionReadinessDefaults();
  const current = run.harvest.submissionReadiness && typeof run.harvest.submissionReadiness === 'object'
    ? run.harvest.submissionReadiness
    : {};
  const verificationStatus = ['local_only', 'submitted', 'provisional', 'verified', 'rejected', 'under_review'].includes(String(current.verificationStatus || '').trim())
    ? String(current.verificationStatus).trim()
    : defaults.verificationStatus;

  run.harvest.submissionReadiness = {
    ...defaults,
    ...current,
    verificationStatus,
    backendSessionId: typeof current.backendSessionId === 'string' ? current.backendSessionId.trim() : defaults.backendSessionId,
    sessionState: typeof current.sessionState === 'string' ? current.sessionState.trim() || defaults.sessionState : defaults.sessionState,
    sessionError: typeof current.sessionError === 'string' ? current.sessionError.trim() : defaults.sessionError,
    submissionId: typeof current.submissionId === 'string' ? current.submissionId.trim() : defaults.submissionId,
    submissionState: typeof current.submissionState === 'string' ? current.submissionState.trim() || defaults.submissionState : defaults.submissionState,
    submissionError: typeof current.submissionError === 'string' ? current.submissionError.trim() : defaults.submissionError,
    statusMessage: typeof current.statusMessage === 'string' ? current.statusMessage.trim() : defaults.statusMessage,
    serverCode: typeof current.serverCode === 'string' ? current.serverCode.trim() : defaults.serverCode,
    verifiedHarvestResult: normalizeHarvestVerificationResult(current.verifiedHarvestResult, 'verified'),
    provisionalHarvestResult: normalizeHarvestVerificationResult(current.provisionalHarvestResult, 'provisional'),
    leaderboardEligible: Boolean(current.leaderboardEligible),
    reviewNeeded: Boolean(current.reviewNeeded),
    anomalyFlags: Array.isArray(current.anomalyFlags) ? current.anomalyFlags.map((entry) => String(entry || '').trim()).filter(Boolean) : [],
    lastVerificationAt: Number.isFinite(Number(current.lastVerificationAt)) ? Number(current.lastVerificationAt) : defaults.lastVerificationAt,
    leaderboardSnapshot: normalizeLeaderboardSnapshot(current.leaderboardSnapshot),
    lastLocalFinalizeAtRealMs: Number.isFinite(Number(current.lastLocalFinalizeAtRealMs)) ? Number(current.lastLocalFinalizeAtRealMs) : defaults.lastLocalFinalizeAtRealMs,
    lastVerifiedSyncAtRealMs: Number.isFinite(Number(current.lastVerifiedSyncAtRealMs)) ? Number(current.lastVerifiedSyncAtRealMs) : defaults.lastVerifiedSyncAtRealMs,
    pendingSubmission: Boolean(current.pendingSubmission),
    localSummaryReady: Boolean(current.localSummaryReady)
  };

  return run.harvest.submissionReadiness;
}

function getLeaderboardUiDefaults() {
  return {
    scope: 'weekly',
    category: 'overall',
    loading: false,
    error: '',
    periodKey: '',
    topEntries: [],
    aroundMeEntries: [],
    meEntry: null,
    lastFetchedAt: null
  };
}

function ensureLeaderboardUiState(stateLike = state) {
  const targetState = stateLike && typeof stateLike === 'object' ? stateLike : state;
  if (!targetState.ui || typeof targetState.ui !== 'object') {
    targetState.ui = {};
  }
  const defaults = getLeaderboardUiDefaults();
  const current = targetState.ui.leaderboard && typeof targetState.ui.leaderboard === 'object'
    ? targetState.ui.leaderboard
    : {};
  targetState.ui.leaderboard = {
    ...defaults,
    ...current,
    scope: 'weekly',
    category: ['overall', 'quality'].includes(String(current.category || '').trim())
      ? String(current.category).trim()
      : 'overall',
    loading: Boolean(current.loading),
    error: typeof current.error === 'string' ? current.error.trim() : '',
    periodKey: typeof current.periodKey === 'string' ? current.periodKey.trim() : '',
    topEntries: Array.isArray(current.topEntries) ? current.topEntries.slice(0, LEADERBOARD_TOP_LIMIT) : [],
    aroundMeEntries: Array.isArray(current.aroundMeEntries) ? current.aroundMeEntries.slice(0, 7) : [],
    meEntry: current.meEntry && typeof current.meEntry === 'object' ? current.meEntry : null,
    lastFetchedAt: Number.isFinite(Number(current.lastFetchedAt)) ? Number(current.lastFetchedAt) : null
  };
  return targetState.ui.leaderboard;
}

function getRewardsUiDefaults() {
  return {
    rewardsList: [],
    rewardsSummary: null,
    rewardFetchState: 'idle',
    rewardClaimState: 'idle',
    lastClaimedReward: null,
    rewardError: '',
    claimInFlightGrantId: '',
    lastFetchedAt: null
  };
}

function normalizeRewardSummary(summaryLike) {
  if (!summaryLike || typeof summaryLike !== 'object') {
    return null;
  }
  return {
    claimableCount: Number.isFinite(Number(summaryLike.claimableCount))
      ? Math.max(0, Math.trunc(Number(summaryLike.claimableCount)))
      : 0,
    claimedCount: Number.isFinite(Number(summaryLike.claimedCount))
      ? Math.max(0, Math.trunc(Number(summaryLike.claimedCount)))
      : 0,
    totalCount: Number.isFinite(Number(summaryLike.totalCount))
      ? Math.max(0, Math.trunc(Number(summaryLike.totalCount)))
      : 0,
    periodKey: String(summaryLike.periodKey || '').trim(),
    scope: String(summaryLike.scope || 'weekly').trim() || 'weekly',
    message: String(summaryLike.message || '').trim()
  };
}

function normalizeRewardEntry(entryLike) {
  if (!entryLike || typeof entryLike !== 'object') {
    return null;
  }
  const entry = entryLike;
  const status = String(entry.status || '').trim().toLowerCase();
  const claimState = String(entry.claimState || '').trim().toLowerCase();
  const claimable = entry.claimable === true
    || status === 'claimable'
    || claimState === 'claimable'
    || status === 'available';
  const claimed = entry.claimed === true
    || status === 'claimed'
    || claimState === 'claimed'
    || Boolean(entry.claimedAt);
  const rewardType = String(entry.rewardType || entry.type || '').trim();
  return {
    grantId: String(entry.grantId || entry.id || '').trim(),
    title: String(entry.title || entry.label || 'Weekly-Belohnung').trim(),
    subtitle: String(entry.subtitle || entry.description || '').trim(),
    valueText: String(entry.valueText || entry.value || '').trim(),
    rewardType,
    scope: String(entry.scope || 'weekly').trim() || 'weekly',
    periodKey: String(entry.periodKey || '').trim(),
    claimable: Boolean(claimable && !claimed),
    claimed: Boolean(claimed),
    claimedAt: String(entry.claimedAt || '').trim(),
    verificationStatus: String(entry.verificationStatus || 'verified').trim()
  };
}

function normalizeRewardsList(payloadLike) {
  const payload = payloadLike && typeof payloadLike === 'object' ? payloadLike : {};
  const entries = extractLeaderboardPayloadEntries(payload);
  return entries
    .map((entry) => normalizeRewardEntry(entry))
    .filter((entry) => entry && entry.grantId)
    .slice(0, 12);
}

function ensureRewardsUiState(stateLike = state) {
  const targetState = stateLike && typeof stateLike === 'object' ? stateLike : state;
  if (!targetState.ui || typeof targetState.ui !== 'object') {
    targetState.ui = {};
  }
  const defaults = getRewardsUiDefaults();
  const current = targetState.ui.rewards && typeof targetState.ui.rewards === 'object'
    ? targetState.ui.rewards
    : {};
  const fetchState = ['idle', 'loading', 'ready', 'error'].includes(String(current.rewardFetchState || '').trim())
    ? String(current.rewardFetchState).trim()
    : defaults.rewardFetchState;
  const claimState = ['idle', 'claiming', 'success', 'error'].includes(String(current.rewardClaimState || '').trim())
    ? String(current.rewardClaimState).trim()
    : defaults.rewardClaimState;
  targetState.ui.rewards = {
    ...defaults,
    ...current,
    rewardsList: Array.isArray(current.rewardsList)
      ? current.rewardsList.map((entry) => normalizeRewardEntry(entry)).filter(Boolean).slice(0, 12)
      : [],
    rewardsSummary: normalizeRewardSummary(current.rewardsSummary),
    rewardFetchState: fetchState,
    rewardClaimState: claimState,
    lastClaimedReward: normalizeRewardEntry(current.lastClaimedReward),
    rewardError: typeof current.rewardError === 'string' ? current.rewardError.trim() : '',
    claimInFlightGrantId: typeof current.claimInFlightGrantId === 'string' ? current.claimInFlightGrantId.trim() : '',
    lastFetchedAt: Number.isFinite(Number(current.lastFetchedAt)) ? Number(current.lastFetchedAt) : null
  };
  return targetState.ui.rewards;
}

function getClaimableWeeklyRewardsCount() {
  if (!isAuthSessionValid() || !readAuthToken()) {
    return 0;
  }
  const rewardsState = ensureRewardsUiState(state);
  if (rewardsState.rewardFetchState !== 'ready') {
    return 0;
  }
  return rewardsState.rewardsList.reduce((count, reward) => {
    const isWeekly = String(reward && reward.scope || 'weekly').trim().toLowerCase() === 'weekly';
    const isClaimable = Boolean(reward && reward.claimable);
    return isWeekly && isClaimable ? count + 1 : count;
  }, 0);
}

function renderRewardHintIndicators() {
  const claimableCount = getClaimableWeeklyRewardsCount();
  const hasClaimableRewards = claimableCount > 0;
  const menuToggleHintNode = uiNode('menuToggleRewardHint', 'menuToggleRewardHint');
  const menuLeaderboardHintNode = uiNode('menuLeaderboardRewardHint', 'menuLeaderboardRewardHint');
  const menuLeaderboardLabelNode = uiNode('menuLeaderboardLabel', 'menuLeaderboardLabel');
  const menuLeaderboardSubtextNode = uiNode('menuLeaderboardSubtext', 'menuLeaderboardSubtext');

  if (ui.menuToggleBtn) {
    ui.menuToggleBtn.classList.toggle('has-reward-hint', hasClaimableRewards);
    ui.menuToggleBtn.setAttribute('aria-label', hasClaimableRewards
      ? `Menü öffnen. ${claimableCount} claimbare Weekly-Belohnung${claimableCount === 1 ? '' : 'en'}`
      : 'Menü öffnen');
  }

  if (menuToggleHintNode) {
    menuToggleHintNode.classList.toggle('hidden', !hasClaimableRewards);
    menuToggleHintNode.setAttribute('aria-hidden', String(!hasClaimableRewards));
  }

  if (ui.menuLeaderboardBtn) {
    ui.menuLeaderboardBtn.classList.toggle('has-reward-hint', hasClaimableRewards);
    ui.menuLeaderboardBtn.classList.toggle('menu-entry--reward-priority', hasClaimableRewards);
    ui.menuLeaderboardBtn.setAttribute('title', hasClaimableRewards
      ? `Öffnet Weekly-Leaderboard und claimbare Belohnungen (${claimableCount}).`
      : 'Öffnet das Weekly-Leaderboard für verifizierte Ergebnisse.');
  }
  if (menuLeaderboardHintNode) {
    menuLeaderboardHintNode.classList.toggle('hidden', !hasClaimableRewards);
    menuLeaderboardHintNode.setAttribute('aria-hidden', String(!hasClaimableRewards));
  }
  if (menuLeaderboardLabelNode) {
    menuLeaderboardLabelNode.textContent = hasClaimableRewards ? 'Leaderboard · Neu' : 'Leaderboard';
    if (menuLeaderboardHintNode) {
      menuLeaderboardLabelNode.appendChild(menuLeaderboardHintNode);
    }
  }
  if (menuLeaderboardSubtextNode) {
    menuLeaderboardSubtextNode.textContent = hasClaimableRewards
      ? 'Claimbare Weekly-Belohnung verfügbar'
      : 'Nur verifizierte Ergebnisse';
  }
}

function normalizeLeaderboardSnapshot(snapshotLike) {
  if (!snapshotLike || typeof snapshotLike !== 'object') {
    return null;
  }
  return {
    scope: String(snapshotLike.scope || 'weekly').trim() || 'weekly',
    category: String(snapshotLike.category || 'overall').trim() || 'overall',
    periodKey: String(snapshotLike.periodKey || '').trim(),
    rank: Number.isFinite(Number(snapshotLike.rank)) ? Number(snapshotLike.rank) : null,
    bestRank: Number.isFinite(Number(snapshotLike.bestRank)) ? Number(snapshotLike.bestRank) : null,
    score: Number.isFinite(Number(snapshotLike.score)) ? round2(Number(snapshotLike.score)) : null,
    fetchedAt: Number.isFinite(Number(snapshotLike.fetchedAt)) ? Number(snapshotLike.fetchedAt) : null
  };
}

function isoFromRealMs(realMs) {
  const safeRealMs = Number(realMs);
  return Number.isFinite(safeRealMs) && safeRealMs > 0
    ? new Date(safeRealMs).toISOString()
    : new Date().toISOString();
}

function readAuthToken() {
  const authApi = window.GrowSimAuth;
  if (!authApi || typeof authApi.getToken !== 'function') {
    return '';
  }
  const token = authApi.getToken();
  return typeof token === 'string' ? token.trim() : '';
}

function buildHarvestApiHeaders(extraHeaders = {}) {
  const token = readAuthToken();
  return token
    ? { Authorization: `Bearer ${token}`, ...extraHeaders }
    : { ...extraHeaders };
}

async function safeReadJson(response) {
  if (!response || typeof response.json !== 'function') {
    return null;
  }
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

function shortHashFromString(value) {
  const text = String(value || '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableSerialize(value) {
  const seen = new WeakSet();
  const serialize = (input) => {
    if (input === null || typeof input !== 'object') {
      return input;
    }
    if (seen.has(input)) {
      return null;
    }
    seen.add(input);
    if (Array.isArray(input)) {
      return input.map((entry) => serialize(entry));
    }
    const ordered = {};
    for (const key of Object.keys(input).sort()) {
      const normalized = serialize(input[key]);
      if (normalized !== undefined) {
        ordered[key] = normalized;
      }
    }
    return ordered;
  };
  return JSON.stringify(serialize(value));
}

function buildDeclaredSetup(runLike = state.run) {
  const run = runLike && typeof runLike === 'object' ? runLike : getCanonicalRun(state);
  const setup = run.setupSnapshot && typeof run.setupSnapshot === 'object'
    ? run.setupSnapshot
    : (state.setup && typeof state.setup === 'object' ? state.setup : null);
  if (!setup) {
    return null;
  }
  return {
    mode: String(setup.mode || '').trim() || null,
    light: String(setup.light || '').trim() || null,
    medium: String(setup.medium || '').trim() || null,
    potSize: String(setup.potSize || '').trim() || null,
    genetics: String(setup.genetics || '').trim() || null
  };
}

function buildDeclaredChallenges(runLike = state.run) {
  const run = runLike && typeof runLike === 'object' ? runLike : getCanonicalRun(state);
  if (Array.isArray(run.declaredChallenges)) {
    return run.declaredChallenges.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  return [];
}

function extractSessionIdFromPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  const direct = String(payload.sessionId || payload.id || '').trim();
  if (direct) {
    return direct;
  }
  const nested = payload.session && typeof payload.session === 'object'
    ? String(payload.session.sessionId || payload.session.id || '').trim()
    : '';
  return nested;
}

function extractSubmissionIdFromPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  const direct = String(payload.submissionId || payload.id || '').trim();
  if (direct) {
    return direct;
  }
  const nested = payload.run && typeof payload.run === 'object'
    ? String(payload.run.submissionId || payload.run.id || '').trim()
    : '';
  return nested;
}

function extractVerificationStatusFromPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'submitted';
  }
  const status = String(
    payload.verificationStatus
    || payload.status
    || (payload.run && payload.run.status)
    || ''
  ).trim().toLowerCase();
  return ['submitted', 'provisional', 'verified', 'rejected', 'under_review'].includes(status)
    ? status
    : 'submitted';
}

function extractVerificationResultFromPayload(payload, preferredStatus = '') {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidates = [
    payload.verifiedHarvestResult,
    payload.provisionalHarvestResult,
    payload.harvestResult,
    payload.result,
    payload.authoritativeResult,
    payload.verificationResult,
    payload.run && payload.run.result
  ];

  for (const candidate of candidates) {
    const normalized = normalizeHarvestVerificationResult(candidate, preferredStatus);
    if (normalized) {
      return normalized;
    }
  }

  const topLevelResult = normalizeHarvestVerificationResult(payload, preferredStatus);
  if (topLevelResult && Object.values(topLevelResult).some((value) => value !== null && value !== '' && value !== false && !(Array.isArray(value) && !value.length))) {
    return topLevelResult;
  }
  return null;
}

function mapHarvestBackendError(errorLike, fallbackMessage = '') {
  const source = errorLike && typeof errorLike === 'object' ? errorLike : {};
  const statusCode = Number(source.status) || 0;
  const serverCode = String(source.code || source.serverCode || '').trim().toLowerCase();
  const networkError = source.network === true;

  if (networkError) {
    return {
      code: 'network_error',
      message: 'Backend aktuell nicht erreichbar. Die lokale Auswertung bleibt erhalten.'
    };
  }
  if (statusCode === 401 || serverCode === 'unauthorized') {
    return {
      code: 'unauthorized',
      message: 'Für ein verifiziertes Ergebnis musst du angemeldet sein.'
    };
  }
  if (serverCode === 'session_not_found' || serverCode === 'session_not_owned') {
    return {
      code: serverCode,
      message: 'Die Run-Sitzung konnte serverseitig nicht sauber zugeordnet werden.'
    };
  }
  if (serverCode === 'duplicate_submission') {
    return {
      code: serverCode,
      message: 'Dieser Run wurde bereits an den Backend-Check übergeben.'
    };
  }
  if (serverCode === 'validation_failed') {
    return {
      code: serverCode,
      message: 'Der Server konnte dieses Ergebnis nicht verifizieren.'
    };
  }
  return {
    code: serverCode || (statusCode ? `http_${statusCode}` : 'unknown_error'),
    message: String(fallbackMessage || source.message || 'Die lokale Auswertung bleibt sichtbar.')
  };
}

function normalizeAnomalyFlags(flagsLike) {
  const entries = Array.isArray(flagsLike) ? flagsLike : [];
  return entries.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function formatLeaderboardCategoryLabel(category) {
  return String(category || 'overall') === 'quality' ? 'Quality' : 'Overall';
}

function formatLeaderboardScopeLabel(scope) {
  return String(scope || 'weekly') === 'weekly' ? 'Weekly' : String(scope || 'weekly');
}

function mapLeaderboardError(errorLike, fallbackMessage = '') {
  const mapped = mapHarvestBackendError(errorLike, fallbackMessage || 'Leaderboard aktuell nicht verfügbar.');
  if (mapped.code === 'unauthorized') {
    return {
      code: mapped.code,
      message: 'Für dein Ranking musst du angemeldet sein.'
    };
  }
  return mapped;
}

function mapRewardError(errorLike, fallbackMessage = '') {
  const mapped = mapHarvestBackendError(errorLike, fallbackMessage || 'Belohnungen konnten nicht geladen werden.');
  if (mapped.code === 'unauthorized') {
    return {
      code: mapped.code,
      message: 'Für verifizierte Weekly-Belohnungen musst du angemeldet sein.'
    };
  }
  if (mapped.code === 'validation_failed') {
    return {
      code: mapped.code,
      message: 'Diese Belohnung konnte nicht eingelöst werden.'
    };
  }
  if (mapped.code === 'already_claimed') {
    return {
      code: mapped.code,
      message: 'Diese Belohnung wurde bereits eingelöst.'
    };
  }
  return mapped;
}

async function fetchRewardsEndpoint(path, options = {}) {
  try {
    const response = await appApiFetch(path, {
      method: options.method || 'GET',
      headers: buildHarvestApiHeaders(options.headers || {}),
      ...options
    });
    const payload = await safeReadJson(response);
    if (!response.ok) {
      const mappedError = mapRewardError({
        status: response.status,
        code: payload && payload.code,
        message: payload && payload.message
      }, options.fallbackMessage || 'Belohnungen sind aktuell nicht erreichbar.');
      return { ok: false, error: mappedError, payload };
    }
    return { ok: true, payload };
  } catch (error) {
    return {
      ok: false,
      error: mapRewardError({ network: true, message: error && error.message ? error.message : '' }, options.fallbackMessage || 'Belohnungen sind aktuell nicht erreichbar.'),
      payload: null
    };
  }
}

function getRewardDisplayTitle(reward) {
  const safe = reward && typeof reward === 'object' ? reward : {};
  if (safe.title) {
    return String(safe.title);
  }
  return 'Weekly-Belohnung';
}

async function fetchRewardsBundle(options = {}) {
  const rewardsState = ensureRewardsUiState(state);
  const force = Boolean(options.force);
  if (rewardsRuntime.fetchPromise && !force) {
    return rewardsRuntime.fetchPromise;
  }
  if (!isAuthSessionValid() || !readAuthToken()) {
    rewardsState.rewardsList = [];
    rewardsState.rewardsSummary = null;
    rewardsState.rewardFetchState = 'idle';
    rewardsState.rewardError = '';
    rewardsState.claimInFlightGrantId = '';
    renderLeaderboardSheet(true);
    renderRunSummaryOverlay();
    schedulePersistState(true);
    return null;
  }
  if (!force && rewardsState.lastFetchedAt && (Date.now() - rewardsState.lastFetchedAt) < REWARDS_FETCH_COOLDOWN_MS && rewardsState.rewardFetchState === 'ready') {
    return {
      rewardsList: rewardsState.rewardsList,
      rewardsSummary: rewardsState.rewardsSummary
    };
  }

  rewardsState.rewardFetchState = 'loading';
  rewardsState.rewardError = '';
  renderLeaderboardSheet(true);
  renderRunSummaryOverlay();
  schedulePersistState(true);

  rewardsRuntime.fetchPromise = (async () => {
    const [listResponse, summaryResponse] = await Promise.all([
      fetchRewardsEndpoint('/v1/rewards'),
      fetchRewardsEndpoint('/v1/rewards/summary')
    ]);

    if (!listResponse.ok && !summaryResponse.ok) {
      const message = (listResponse.error && listResponse.error.message)
        || (summaryResponse.error && summaryResponse.error.message)
        || 'Belohnungen sind aktuell nicht erreichbar.';
      rewardsState.rewardFetchState = 'error';
      rewardsState.rewardError = message;
      rewardsState.rewardsList = [];
      rewardsState.rewardsSummary = null;
      renderLeaderboardSheet(true);
      renderRunSummaryOverlay();
      schedulePersistState(true);
      return null;
    }

    rewardsState.rewardsList = listResponse.ok ? normalizeRewardsList(listResponse.payload) : [];
    rewardsState.rewardsSummary = summaryResponse.ok
      ? normalizeRewardSummary(summaryResponse.payload && typeof summaryResponse.payload === 'object'
        ? (summaryResponse.payload.summary || summaryResponse.payload)
        : null)
      : null;
    rewardsState.rewardFetchState = 'ready';
    rewardsState.rewardError = listResponse.ok ? '' : String((listResponse.error && listResponse.error.message) || '');
    rewardsState.lastFetchedAt = Date.now();
    renderLeaderboardSheet(true);
    renderRunSummaryOverlay();
    schedulePersistState(true);
    return {
      rewardsList: rewardsState.rewardsList,
      rewardsSummary: rewardsState.rewardsSummary
    };
  })().finally(() => {
    rewardsRuntime.fetchPromise = null;
  });

  return rewardsRuntime.fetchPromise;
}

function isRewardClaimedResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const status = String(payload.status || payload.claimState || '').trim().toLowerCase();
  return status === 'claimed' || status === 'already_claimed' || Boolean(payload.claimedAt) || Boolean(payload.alreadyClaimed);
}

async function claimRewardGrant(grantId, options = {}) {
  const safeGrantId = String(grantId || '').trim();
  if (!safeGrantId) {
    return null;
  }
  const rewardsState = ensureRewardsUiState(state);
  if (!isAuthSessionValid() || !readAuthToken()) {
    rewardsState.rewardClaimState = 'error';
    rewardsState.rewardError = 'Für das Einlösen musst du angemeldet sein.';
    renderLeaderboardSheet(true);
    renderRunSummaryOverlay();
    schedulePersistState(true);
    return null;
  }
  if (rewardsRuntime.claimPromise) {
    return rewardsRuntime.claimPromise;
  }

  rewardsState.rewardClaimState = 'claiming';
  rewardsState.claimInFlightGrantId = safeGrantId;
  rewardsState.rewardError = '';
  renderLeaderboardSheet(true);
  renderRunSummaryOverlay();
  schedulePersistState(true);

  rewardsRuntime.claimPromise = (async () => {
    const response = await fetchRewardsEndpoint(`/v1/rewards/${encodeURIComponent(safeGrantId)}/claim`, {
      method: 'POST',
      body: JSON.stringify({}),
      fallbackMessage: 'Belohnung konnte nicht eingelöst werden.'
    });
    if (!response.ok) {
      const isAlreadyClaimed = response.error && response.error.code === 'already_claimed';
      rewardsState.rewardClaimState = isAlreadyClaimed ? 'success' : 'error';
      rewardsState.rewardError = isAlreadyClaimed
        ? 'Diese Belohnung wurde bereits eingelöst.'
        : String((response.error && response.error.message) || 'Belohnung konnte nicht eingelöst werden.');
      rewardsState.claimInFlightGrantId = '';
      await fetchRewardsBundle({ force: true });
      return null;
    }

    const rewardPayload = response.payload && typeof response.payload === 'object'
      ? (response.payload.reward || response.payload.grant || response.payload)
      : null;
    const normalizedReward = normalizeRewardEntry(rewardPayload) || normalizeRewardEntry({ grantId: safeGrantId, claimed: true, claimable: false });
    rewardsState.rewardClaimState = 'success';
    rewardsState.rewardError = '';
    rewardsState.claimInFlightGrantId = '';
    rewardsState.lastClaimedReward = normalizedReward;
    await fetchRewardsBundle({ force: true });
    if (options && options.showDialog) {
      openMenuDialog({
        title: 'Belohnung eingelöst',
        message: `${getRewardDisplayTitle(normalizedReward)} wurde gutgeschrieben.`,
        cancelLabel: 'Schließen',
        confirmLabel: '',
        variant: 'mission-reward',
        kicker: 'Weekly Reward',
        rewards: [
          {
            tone: 'gold',
            icon: '✓',
            value: normalizedReward.valueText || 'Verifiziert',
            label: normalizedReward.title || 'Weekly-Belohnung'
          }
        ]
      });
    }
    return normalizedReward;
  })().catch((error) => {
    rewardsState.rewardClaimState = 'error';
    rewardsState.rewardError = String(error && error.message ? error.message : 'Belohnung konnte nicht eingelöst werden.');
    rewardsState.claimInFlightGrantId = '';
    renderLeaderboardSheet(true);
    renderRunSummaryOverlay();
    schedulePersistState(true);
    return null;
  }).finally(() => {
    rewardsRuntime.claimPromise = null;
  });

  return rewardsRuntime.claimPromise;
}

function handleRewardClaimButtonClick(event) {
  const target = event && event.target ? event.target : null;
  if (!target || typeof target.closest !== 'function') {
    return;
  }
  const claimButton = target.closest('[data-reward-claim-grant]');
  if (!claimButton) {
    return;
  }
  const grantId = String(claimButton.getAttribute('data-reward-claim-grant') || '').trim();
  if (!grantId) {
    return;
  }
  const showDialog = claimButton.hasAttribute('data-reward-dialog');
  void claimRewardGrant(grantId, { showDialog });
}

function extractLeaderboardPayloadEntries(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const candidates = [
    payload.entries,
    payload.items,
    payload.results,
    payload.data,
    payload.leaderboard,
    payload.rows,
    payload.rewards,
    payload.grants
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

function normalizeLeaderboardEntry(entryLike, fallbackCategory = 'overall') {
  if (!entryLike || typeof entryLike !== 'object') {
    return null;
  }
  const entry = entryLike;
  const user = entry.user && typeof entry.user === 'object' ? entry.user : {};
  const profile = entry.profile && typeof entry.profile === 'object' ? entry.profile : {};
  const rank = Number.isFinite(Number(entry.rank)) ? Math.max(1, Math.trunc(Number(entry.rank))) : null;
  const score = Number(entry.score ?? entry.value ?? entry.harvestScore ?? entry.qualityScore);
  const category = ['overall', 'quality'].includes(String(entry.category || fallbackCategory || '').trim())
    ? String(entry.category || fallbackCategory).trim()
    : 'overall';
  const displayName = String(
    entry.displayName
    || user.displayName
    || profile.displayName
    || user.name
    || profile.name
    || entry.name
    || 'Grower'
  ).trim() || 'Grower';
  const qualityBandLabel = String(entry.qualityBandLabel || entry.qualityBand || '').trim();
  const bestScore = Number(entry.bestScore ?? entry.bestVerifiedScore);
  return {
    rank,
    score: Number.isFinite(score) ? round2(score) : null,
    displayName,
    isMe: Boolean(entry.isMe),
    userId: String(entry.userId || user.id || profile.id || '').trim(),
    periodKey: String(entry.periodKey || '').trim(),
    category,
    verifiedAt: String(entry.verifiedAt || entry.updatedAt || '').trim(),
    qualityBandLabel: qualityBandLabel || '',
    bestRank: Number.isFinite(Number(entry.bestRank)) ? Math.max(1, Math.trunc(Number(entry.bestRank))) : null,
    bestScore: Number.isFinite(bestScore) ? round2(bestScore) : null,
    leaderboardEligible: Boolean(entry.leaderboardEligible),
    submissionId: String(entry.submissionId || entry.runId || '').trim()
  };
}

function normalizeLeaderboardMePayload(payload, fallbackCategory = 'overall') {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const directEntry = normalizeLeaderboardEntry(
    payload.entry || payload.currentEntry || payload.current || payload.me || payload.result,
    fallbackCategory
  );
  const bestEntry = normalizeLeaderboardEntry(payload.bestEntry || payload.best || null, fallbackCategory);
  const rank = Number.isFinite(Number(payload.rank))
    ? Math.max(1, Math.trunc(Number(payload.rank)))
    : (directEntry ? directEntry.rank : null);
  return {
    scope: String(payload.scope || 'weekly').trim() || 'weekly',
    category: ['overall', 'quality'].includes(String(payload.category || fallbackCategory || '').trim())
      ? String(payload.category || fallbackCategory).trim()
      : 'overall',
    periodKey: String(payload.periodKey || '').trim(),
    rank,
    score: directEntry && Number.isFinite(Number(directEntry.score)) ? Number(directEntry.score) : null,
    bestRank: Number.isFinite(Number(payload.bestRank))
      ? Math.max(1, Math.trunc(Number(payload.bestRank)))
      : (bestEntry ? bestEntry.rank : null),
    bestScore: Number.isFinite(Number(payload.bestScore))
      ? round2(Number(payload.bestScore))
      : (bestEntry && Number.isFinite(Number(bestEntry.score)) ? Number(bestEntry.score) : null),
    displayName: directEntry ? directEntry.displayName : '',
    entry: directEntry,
    bestEntry
  };
}

async function fetchLeaderboardEndpoint(path, options = {}) {
  try {
    const response = await appApiFetch(path, {
      method: 'GET',
      headers: buildHarvestApiHeaders(),
      ...options
    });
    const payload = await safeReadJson(response);
    if (!response.ok) {
      const mappedError = mapLeaderboardError({
        status: response.status,
        code: payload && payload.code,
        message: payload && payload.message
      }, 'Leaderboard aktuell nicht erreichbar.');
      return { ok: false, error: mappedError, payload };
    }
    return { ok: true, payload };
  } catch (error) {
    return {
      ok: false,
      error: mapLeaderboardError({ network: true, message: error && error.message ? error.message : '' }, 'Leaderboard aktuell nicht erreichbar.'),
      payload: null
    };
  }
}

function updateRunLeaderboardSnapshotFromMe(mePayload) {
  const run = getCanonicalRun(state);
  const readiness = ensureHarvestBackendState(run);
  const normalized = normalizeLeaderboardMePayload(mePayload, 'overall');
  if (!normalized || !readiness || readiness.verificationStatus !== 'verified') {
    return;
  }
  readiness.leaderboardSnapshot = normalizeLeaderboardSnapshot({
    scope: normalized.scope,
    category: normalized.category,
    periodKey: normalized.periodKey,
    rank: normalized.rank,
    bestRank: normalized.bestRank,
    score: normalized.score,
    fetchedAt: Date.now()
  });
}

async function fetchLeaderboardBundle(options = {}) {
  const uiState = ensureLeaderboardUiState(state);
  const scope = 'weekly';
  const category = ['overall', 'quality'].includes(String(options.category || uiState.category || '').trim())
    ? String(options.category || uiState.category).trim()
    : 'overall';
  const force = Boolean(options.force);
  const requestKey = `${scope}:${category}`;
  if (leaderboardRuntime.fetchPromise && leaderboardRuntime.requestKey === requestKey && !force) {
    return leaderboardRuntime.fetchPromise;
  }
  if (!force && uiState.lastFetchedAt && (Date.now() - uiState.lastFetchedAt) < LEADERBOARD_FETCH_COOLDOWN_MS && uiState.topEntries.length) {
    return {
      topEntries: uiState.topEntries,
      aroundMeEntries: uiState.aroundMeEntries,
      meEntry: uiState.meEntry,
      periodKey: uiState.periodKey
    };
  }

  uiState.loading = true;
  uiState.error = '';
  uiState.category = category;
  uiState.scope = scope;
  renderLeaderboardSheet(true);
  schedulePersistState(true);

  leaderboardRuntime.requestKey = requestKey;
  leaderboardRuntime.fetchPromise = (async () => {
    const query = `scope=${encodeURIComponent(scope)}&category=${encodeURIComponent(category)}&limit=${encodeURIComponent(String(LEADERBOARD_TOP_LIMIT))}`;
    const [topResponse, aroundResponse, meResponse] = await Promise.all([
      fetchLeaderboardEndpoint(`/v1/leaderboards?${query}`),
      fetchLeaderboardEndpoint(`/v1/leaderboards/around-me?scope=${encodeURIComponent(scope)}&category=${encodeURIComponent(category)}`),
      fetchLeaderboardEndpoint(`/v1/leaderboards/me?scope=${encodeURIComponent(scope)}&category=${encodeURIComponent(category)}`)
    ]);

    const topPayload = topResponse.ok ? topResponse.payload : null;
    const topEntries = topResponse.ok
      ? extractLeaderboardPayloadEntries(topPayload).map((entry) => normalizeLeaderboardEntry(entry, category)).filter(Boolean).slice(0, LEADERBOARD_TOP_LIMIT)
      : [];
    const aroundPayload = aroundResponse.ok ? aroundResponse.payload : null;
    const aroundMeEntries = aroundResponse.ok
      ? extractLeaderboardPayloadEntries(aroundPayload).map((entry) => normalizeLeaderboardEntry(entry, category)).filter(Boolean).slice(0, 7)
      : [];
    const mePayload = meResponse.ok ? meResponse.payload : null;
    const meEntry = meResponse.ok ? normalizeLeaderboardMePayload(mePayload, category) : null;

    uiState.loading = false;
    uiState.error = topResponse.ok
      ? ''
      : String((topResponse.error && topResponse.error.message) || 'Leaderboard aktuell nicht verfügbar.');
    uiState.periodKey = String(
      (topPayload && topPayload.periodKey)
      || (aroundPayload && aroundPayload.periodKey)
      || (mePayload && mePayload.periodKey)
      || ''
    ).trim();
    uiState.topEntries = topEntries;
    uiState.aroundMeEntries = aroundMeEntries;
    uiState.meEntry = meEntry;
    uiState.lastFetchedAt = Date.now();

    if (meEntry) {
      updateRunLeaderboardSnapshotFromMe(mePayload);
    }

    renderLeaderboardSheet(true);
    renderRunSummaryOverlay();
    schedulePersistState(true);

    return {
      topEntries,
      aroundMeEntries,
      meEntry,
      periodKey: uiState.periodKey
    };
  })().catch((error) => {
    uiState.loading = false;
    uiState.error = String(error && error.message ? error.message : 'Leaderboard aktuell nicht verfügbar.');
    renderLeaderboardSheet(true);
    schedulePersistState(true);
    return null;
  }).finally(() => {
    leaderboardRuntime.fetchPromise = null;
    leaderboardRuntime.requestKey = '';
  });

  return leaderboardRuntime.fetchPromise;
}

function onLeaderboardCategoryChange(category) {
  const uiState = ensureLeaderboardUiState(state);
  const nextCategory = ['overall', 'quality'].includes(String(category || '').trim())
    ? String(category).trim()
    : 'overall';
  if (uiState.category === nextCategory && uiState.topEntries.length) {
    renderLeaderboardSheet(true);
    return;
  }
  uiState.category = nextCategory;
  uiState.lastFetchedAt = null;
  void fetchLeaderboardBundle({ category: nextCategory, force: true });
}

async function refreshRunLeaderboardSnapshot(options = {}) {
  const run = getCanonicalRun(state);
  const readiness = ensureHarvestBackendState(run);
  if (!readiness || readiness.verificationStatus !== 'verified' || !isAuthSessionValid() || !readAuthToken()) {
    return null;
  }
  const existing = normalizeLeaderboardSnapshot(readiness.leaderboardSnapshot);
  if (!options.force && existing && existing.fetchedAt && (Date.now() - existing.fetchedAt) < LEADERBOARD_FETCH_COOLDOWN_MS) {
    return existing;
  }

  const response = await fetchLeaderboardEndpoint('/v1/leaderboards/me?scope=weekly&category=overall');
  if (!response.ok || !response.payload) {
    return null;
  }
  const mePayload = normalizeLeaderboardMePayload(response.payload, 'overall');
  if (!mePayload) {
    return null;
  }
  updateRunLeaderboardSnapshotFromMe(response.payload);
  schedulePersistState(true);
  return readiness.leaderboardSnapshot;
}

function formatLeaderboardEntryScore(entry, category = 'overall') {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const score = Number(safeEntry.score);
  if (!Number.isFinite(score)) {
    return '--';
  }
  return String(Math.round(score));
}

function renderLeaderboardEntryList(container, entries, options = {}) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  const safeEntries = Array.isArray(entries) ? entries : [];
  if (!safeEntries.length) {
    const empty = document.createElement('p');
    empty.className = 'sheet-note leaderboard-empty-note';
    empty.textContent = String(options.emptyText || 'Noch keine verifizierten Runs in dieser Woche.');
    container.appendChild(empty);
    return;
  }

  for (const item of safeEntries) {
    const card = document.createElement('article');
    card.className = `leaderboard-entry-card${item && item.isMe ? ' leaderboard-entry-card--me' : ''}`;
    const rankLabel = Number.isFinite(Number(item && item.rank)) ? `#${Math.trunc(Number(item.rank))}` : '—';
    const scoreLabel = formatLeaderboardEntryScore(item, options.category);
    const qualityBand = item && item.qualityBandLabel ? `<span class="leaderboard-entry-chip">${escapeHtml(String(item.qualityBandLabel))}</span>` : '';
    card.innerHTML = `
      <div class="leaderboard-entry-rank">${escapeHtml(rankLabel)}</div>
      <div class="leaderboard-entry-main">
        <strong>${escapeHtml(String((item && item.displayName) || 'Grower'))}</strong>
        <span>${escapeHtml(options.category === 'quality' ? 'Verifizierte Qualität' : 'Verifizierter Harvest Score')}</span>
      </div>
      <div class="leaderboard-entry-score">
        <strong>${escapeHtml(scoreLabel)}</strong>
        ${qualityBand}
      </div>
    `;
    container.appendChild(card);
  }
}

function renderRewardCards(container, rewards, options = {}) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  const safeRewards = Array.isArray(rewards) ? rewards : [];
  const claimInFlightGrantId = String(options.claimInFlightGrantId || '').trim();
  if (!safeRewards.length) {
    const empty = document.createElement('p');
    empty.className = 'sheet-note leaderboard-empty-note';
    empty.textContent = String(options.emptyText || 'Aktuell keine claimbaren Weekly-Belohnungen.');
    container.appendChild(empty);
    return;
  }

  for (const reward of safeRewards) {
    const card = document.createElement('article');
    card.className = `reward-entry-card${reward.claimed ? ' reward-entry-card--claimed' : ''}`;
    const isClaiming = Boolean(claimInFlightGrantId && reward.grantId === claimInFlightGrantId);
    const statusLabel = reward.claimed
      ? i18nT('rewards.status_claimed')
      : (reward.claimable ? i18nT('rewards.status_claimable') : i18nT('rewards.status_not_claimable'));
    const buttonHtml = reward.claimable
      ? `<button class="action-btn action-primary reward-claim-btn" type="button" data-reward-claim-grant="${escapeHtml(reward.grantId)}"${options.dialog ? ' data-reward-dialog="1"' : ''}${isClaiming ? ' disabled aria-disabled="true"' : ''}>${isClaiming ? i18nT('rewards.claim_loading') : i18nT('rewards.claim_now')}</button>`
      : `<button class="ghost-btn reward-claim-btn" type="button" disabled aria-disabled="true">${escapeHtml(statusLabel)}</button>`;
    card.innerHTML = `
      <div class="reward-entry-card__head">
        <strong>${escapeHtml(getRewardDisplayTitle(reward))}</strong>
        <span>${escapeHtml(statusLabel)}</span>
      </div>
      <p class="sheet-note">${escapeHtml(reward.subtitle || i18nT('rewards.verified_weekly_reward'))}</p>
      <div class="reward-entry-card__foot">
        <span class="reward-entry-card__value">${escapeHtml(reward.valueText || i18nT('rewards.weekly_value'))}</span>
        ${buttonHtml}
      </div>
    `;
    container.appendChild(card);
  }
}

function renderRewardsSummaryBlock() {
  const rewardsState = ensureRewardsUiState(state);
  const summaryNode = uiNode('leaderboardRewardsSummary', 'leaderboardRewardsSummary');
  const listNode = uiNode('leaderboardRewardsList', 'leaderboardRewardsList');
  const statusNode = uiNode('leaderboardRewardsStatus', 'leaderboardRewardsStatus');
  const authIdentity = getAuthDisplayIdentity();

  if (statusNode) {
    if (!authIdentity) {
      statusNode.textContent = i18nT('rewards.login_required');
    } else if (rewardsState.rewardFetchState === 'loading') {
      statusNode.textContent = i18nT('status.loading');
    } else if (rewardsState.rewardError) {
      statusNode.textContent = i18nT('status.unavailable_now');
    } else {
      const summary = rewardsState.rewardsSummary;
      const claimable = summary && Number.isFinite(Number(summary.claimableCount)) ? Number(summary.claimableCount) : 0;
      statusNode.textContent = claimable > 0
        ? i18nT('rewards.claimable_count', { count: claimable })
        : i18nT('rewards.no_open_claim');
    }
  }

  if (summaryNode) {
    summaryNode.replaceChildren();
    if (!authIdentity) {
      const hint = document.createElement('p');
      hint.className = 'sheet-note leaderboard-empty-note';
      hint.textContent = i18nT('rewards.login_to_see_verified');
      summaryNode.appendChild(hint);
    } else if (rewardsState.rewardFetchState === 'loading') {
      const hint = document.createElement('p');
      hint.className = 'sheet-note leaderboard-empty-note';
      hint.textContent = i18nT('rewards.loading_rewards');
      summaryNode.appendChild(hint);
    } else if (rewardsState.rewardError) {
      const hint = document.createElement('p');
      hint.className = 'sheet-note leaderboard-empty-note';
      hint.textContent = rewardsState.rewardError;
      summaryNode.appendChild(hint);
    } else {
      const summary = rewardsState.rewardsSummary;
      const line = document.createElement('p');
      line.className = 'sheet-note leaderboard-empty-note';
      if (!summary) {
        line.textContent = i18nT('rewards.none_for_period');
      } else {
        const claimable = Number(summary.claimableCount) || 0;
        const claimed = Number(summary.claimedCount) || 0;
        line.textContent = claimable > 0
          ? i18nT('rewards.claimable_verified_waiting', { count: claimable })
          : i18nT('rewards.already_claimed_count', { count: claimed });
      }
      summaryNode.appendChild(line);
    }
  }

  renderRewardCards(listNode, rewardsState.rewardsList, {
    emptyText: authIdentity
      ? i18nT('rewards.none_claimable_now')
      : i18nT('rewards.not_visible_without_login'),
    dialog: true,
    claimInFlightGrantId: rewardsState.claimInFlightGrantId
  });
}

function renderRunSummaryRewardsBlock(harvestReadiness) {
  const rewardsBlockNode = uiNode('runSummaryRewardsBlock', 'runSummaryRewardsBlock');
  const rewardsHintNode = uiNode('runSummaryRewardsHint', 'runSummaryRewardsHint');
  const rewardsListNode = uiNode('runSummaryRewardsList', 'runSummaryRewardsList');
  if (!rewardsBlockNode || !rewardsListNode || !rewardsHintNode) {
    return;
  }

  const rewardsState = ensureRewardsUiState(state);
  const isVerified = harvestReadiness && harvestReadiness.verificationStatus === 'verified';
  const authIdentity = getAuthDisplayIdentity();
  const shouldShow = Boolean(isVerified && authIdentity);
  rewardsBlockNode.classList.toggle('hidden', !shouldShow);
  rewardsBlockNode.setAttribute('aria-hidden', String(!shouldShow));
  if (!shouldShow) {
    return;
  }

  if (rewardsState.rewardFetchState === 'loading') {
    rewardsHintNode.textContent = i18nT('rewards.loading_rewards');
  } else if (rewardsState.rewardError) {
    rewardsHintNode.textContent = rewardsState.rewardError;
  } else {
    const summary = rewardsState.rewardsSummary;
    const claimable = summary && Number.isFinite(Number(summary.claimableCount)) ? Number(summary.claimableCount) : 0;
    rewardsHintNode.textContent = claimable > 0
      ? i18nT('rewards.verified_ready_to_claim')
      : i18nT('rewards.none_open_weekly');
  }

  renderRewardCards(rewardsListNode, rewardsState.rewardsList, {
    emptyText: i18nT('rewards.none_claimable_now'),
    dialog: false,
    claimInFlightGrantId: rewardsState.claimInFlightGrantId
  });
}

function renderLeaderboardSheet(force = false) {
  const sheetNode = uiNode('leaderboardSheet', 'leaderboardSheet');
  if (!sheetNode || (!force && state.ui.openSheet !== 'leaderboard')) {
    return;
  }
  const uiState = ensureLeaderboardUiState(state);
  const authIdentity = getAuthDisplayIdentity();
  const titleNode = uiNode('leaderboardSheetTitle', 'leaderboardSheetTitle');
  const subtitleNode = uiNode('leaderboardSheetSubtitle', 'leaderboardSheetSubtitle');
  const statusNode = uiNode('leaderboardSheetStatus', 'leaderboardSheetStatus');
  const overallBtn = uiNode('leaderboardCategoryOverallBtn', 'leaderboardCategoryOverallBtn');
  const qualityBtn = uiNode('leaderboardCategoryQualityBtn', 'leaderboardCategoryQualityBtn');
  const meNode = uiNode('leaderboardMeCard', 'leaderboardMeCard');
  const topNode = uiNode('leaderboardTopList', 'leaderboardTopList');
  const aroundNode = uiNode('leaderboardAroundMeList', 'leaderboardAroundMeList');

  if (titleNode) {
    titleNode.textContent = `${formatLeaderboardScopeLabel(uiState.scope)} ${formatLeaderboardCategoryLabel(uiState.category)}`;
  }
  if (subtitleNode) {
    subtitleNode.textContent = i18nT('leaderboard.only_verified');
  }
  if (statusNode) {
    statusNode.textContent = uiState.loading
      ? i18nT('leaderboard.loading')
      : (uiState.error || (uiState.periodKey ? i18nT('leaderboard.period', { period: uiState.periodKey }) : i18nT('leaderboard.weekly_snapshot')));
  }
  if (overallBtn) {
    overallBtn.classList.toggle('is-active', uiState.category === 'overall');
    overallBtn.setAttribute('aria-pressed', String(uiState.category === 'overall'));
    overallBtn.onclick = () => onLeaderboardCategoryChange('overall');
  }
  if (qualityBtn) {
    qualityBtn.classList.toggle('is-active', uiState.category === 'quality');
    qualityBtn.setAttribute('aria-pressed', String(uiState.category === 'quality'));
    qualityBtn.onclick = () => onLeaderboardCategoryChange('quality');
  }

  if (meNode) {
    meNode.replaceChildren();
    if (uiState.meEntry && typeof uiState.meEntry === 'object' && uiState.meEntry.rank) {
      const me = uiState.meEntry;
      const card = document.createElement('article');
      card.className = 'leaderboard-me-card';
      const bestRankText = Number.isFinite(Number(me.bestRank))
        ? i18nT('leaderboard.best_rank_suffix', { rank: Math.trunc(Number(me.bestRank)) })
        : '';
      card.innerHTML = `
        <strong>${escapeHtml(i18nT('leaderboard.your_weekly_rank'))}</strong>
        <div class="leaderboard-me-card__score">#${escapeHtml(String(me.rank))}</div>
        <p class="sheet-note">${escapeHtml(i18nT('leaderboard.current_score_line', {
          score: formatLeaderboardEntryScore(me.entry || me, uiState.category),
          metric: uiState.category === 'quality' ? i18nT('leaderboard.metric_quality') : i18nT('leaderboard.metric_score'),
          best: bestRankText
        }))}</p>
      `;
      meNode.appendChild(card);
    } else if (!authIdentity) {
      const hint = document.createElement('p');
      hint.className = 'sheet-note leaderboard-empty-note';
      hint.textContent = i18nT('leaderboard.login_to_see_rank');
      meNode.appendChild(hint);
    } else {
      const hint = document.createElement('p');
      hint.className = 'sheet-note leaderboard-empty-note';
      hint.textContent = i18nT('leaderboard.no_verified_entry_profile');
      meNode.appendChild(hint);
    }
  }

  renderLeaderboardEntryList(topNode, uiState.topEntries, {
    category: uiState.category,
    emptyText: uiState.error || i18nT('leaderboard.no_verified_entries_week')
  });
  renderLeaderboardEntryList(aroundNode, uiState.aroundMeEntries, {
    category: uiState.category,
    emptyText: authIdentity
      ? i18nT('leaderboard.around_me_after_verified')
      : i18nT('leaderboard.login_to_see_position')
  });
  renderRewardsSummaryBlock();
}

function getCanonicalHarvestForecast(snapshot = state) {
  const harvestApi = getHarvestApi();
  const run = snapshot && typeof snapshot === 'object' ? snapshot.run : null;
  if (!harvestApi || !run || typeof run !== 'object') {
    return null;
  }
  run.harvest = harvestApi.normalizeRunHarvest(run.harvest);
  return run.harvest.currentForecast;
}

function refreshHarvestForecast(options = {}) {
  const harvestApi = getHarvestApi();
  if (!harvestApi || typeof harvestApi.updateHarvestForecast !== 'function') {
    return null;
  }
  const run = getCanonicalRun(state);
  if (!run || run.status === 'idle') {
    return getCanonicalHarvestForecast(state);
  }
  return harvestApi.updateHarvestForecast(state, options);
}

function formatHarvestTrendLabel(trend) {
  switch (String(trend || 'stable')) {
    case 'rising':
      return 'Steigt';
    case 'falling':
      return 'Fällt';
    default:
      return 'Stabil';
  }
}

function formatHarvestTrendSymbol(trend) {
  switch (String(trend || 'stable')) {
    case 'rising':
      return '↑';
    case 'falling':
      return '↓';
    default:
      return '→';
  }
}

function formatHarvestQualityBand(forecast) {
  const harvestApi = getHarvestApi();
  const qualityBand = harvestApi && typeof harvestApi.qualityTierLabel === 'function'
    ? harvestApi.qualityTierLabel(forecast && forecast.projectedQualityTier)
    : 'B';
  return `${qualityBand} / ${Math.round(Number(forecast && forecast.qualityScore) || 0)}`;
}

function formatHarvestReadinessLabel(confidenceBand) {
  switch (String(confidenceBand || 'medium')) {
    case 'high':
      return 'Klar lesbar';
    case 'low':
      return 'Noch volatil';
    default:
      return 'Solide Richtung';
  }
}

function buildHarvestHeroCopy(forecast) {
  const harvestScore = Math.round(Number(forecast && forecast.harvestScore) || 0);
  const qualityScore = Math.round(Number(forecast && forecast.qualityScore) || 0);
  const trend = String(forecast && forecast.forecastTrend || 'stable');

  if (harvestScore >= 84 && qualityScore >= 82) {
    return {
      title: trend === 'falling' ? 'Starke Prognose, leicht unter Druck' : 'Starke Prognose',
      subtitle: trend === 'falling'
        ? 'Der Lauf steht gut, verliert aber gerade etwas Ruhe im Finish.'
        : 'Sauberer Lauf mit starker Basis und guter Qualität.'
    };
  }
  if (harvestScore >= 70) {
    return {
      title: trend === 'rising' ? 'Solider Lauf mit Aufwind' : 'Solide Prognose',
      subtitle: trend === 'falling'
        ? 'Vieles ist noch intakt, aber einzelne Bremsen kosten gerade Qualität oder Finish.'
        : 'Der Lauf ist gut spielbar und noch klar nach oben offen.'
    };
  }
  if (harvestScore >= 54) {
    return {
      title: trend === 'rising' ? 'Noch viel rettbar' : 'Finish aktuell gebremst',
      subtitle: 'Die Ernte ist noch offen. Ein sauberer nächster Schritt ist jetzt wichtiger als weiteres Pushen.'
    };
  }
  return {
    title: 'Schwieriger Lauf, aber offen',
    subtitle: 'Ein Teil ist bereits weg, trotzdem kann ein ruhiger letzter Hebel den Abschluss noch deutlich aufwerten.'
  };
}

function formatHarvestImpactLabel(impact, mode = 'neutral') {
  const magnitude = Math.abs(Math.round(Number(impact) || 0));
  if (mode === 'loss') {
    return 'Fix';
  }
  if (magnitude >= 8) {
    return mode === 'positive' ? 'Trägt stark' : 'Bremst stark';
  }
  if (magnitude >= 4) {
    return mode === 'positive' ? 'Hilft spürbar' : 'Kostet spürbar';
  }
  return mode === 'positive' ? 'Hilft leicht' : 'Bremst leicht';
}

function describeHarvestGainRange(item) {
  const min = Math.round(Number(item && item.estimatedGainMin) || 0);
  const max = Math.round(Number(item && item.estimatedGainMax) || 0);
  if (max <= 0) {
    return 'kleiner Hebel';
  }
  if (min === max) {
    return `ca. +${max}`;
  }
  return `ca. +${min} bis +${max}`;
}

function clipHarvestUiText(text, maxLength = 96) {
  const source = String(text || '').trim();
  if (!source) {
    return '';
  }
  if (source.length <= maxLength) {
    return source;
  }
  return `${source.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function sentenceCaseHarvestText(text) {
  const source = String(text || '').trim();
  if (!source) {
    return '';
  }
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function normalizeHarvestUiText(rawText, mode = 'reason') {
  const source = String(rawText || '').trim();
  if (!source) {
    return mode === 'loss'
      ? 'Ein Teil dieser Linie ist bereits fest verloren.'
      : (mode === 'opportunity'
        ? 'Hier liegt gerade der klarste nächste Schritt.'
        : 'Die Richtung bleibt aktuell vergleichsweise ruhig.');
  }

  let text = source
    .replace(/[_-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const replacements = [
    [/\bevent chance utilized\b/gi, 'Gute Phase gut genutzt'],
    [/\bevent opportunity utilized\b/gi, 'Gute Phase gut genutzt'],
    [/\binstability penalty active\b/gi, 'Instabile Bedingungen bremsen aktuell'],
    [/\binstability penalty\b/gi, 'Instabile Bedingungen bremsen aktuell'],
    [/\bstability penalty\b/gi, 'Instabile Bedingungen bremsen aktuell'],
    [/\blate stress spike\b/gi, 'Später Stress kostet gerade Qualität'],
    [/\blate stress\b/gi, 'Später Stress kostet gerade Qualität'],
    [/\bunresolved event pressure\b/gi, 'Offene Probleme drücken die Prognose'],
    [/\bevent pressure\b/gi, 'Offene Probleme drücken die Prognose'],
    [/\bclimate instability\b/gi, 'Unruhiges Klima bremst den Lauf'],
    [/\bunstable climate\b/gi, 'Unruhiges Klima bremst den Lauf'],
    [/\bclimate drift\b/gi, 'Unruhiges Klima bremst den Lauf'],
    [/\baction inefficiency\b/gi, 'Eingriffe waren zuletzt eher ineffizient'],
    [/\baction inefficiencies\b/gi, 'Eingriffe waren zuletzt eher ineffizient'],
    [/\binefficient actions?\b/gi, 'Eingriffe waren zuletzt eher ineffizient'],
    [/\bredundant actions?\b/gi, 'Zu viele unnötige Eingriffe bremsen gerade'],
    [/\bovercorrection\b/gi, 'Zu starkes Gegensteuern kostet Ruhe'],
    [/\bunresolved\b/gi, 'offen'],
    [/\bpenalty\b/gi, 'Bremse'],
    [/\bmodifier\b/gi, 'Einfluss'],
    [/\bcoefficient\b/gi, 'Einfluss'],
    [/\bstate\b/gi, 'Lage'],
    [/\bpressure\b/gi, 'Druck'],
    [/\bactive\b/gi, 'spürbar'],
    [/\bquality loss(es)?\b/gi, 'Ein Teil der Qualität ist bereits verloren'],
    [/\byield loss(es)?\b/gi, 'Ein Teil des Ertrags ist bereits verloren'],
    [/\blocked loss(es)?\b/gi, 'Ein Teil dieser Linie ist bereits verloren'],
    [/\brecovery opportunity\b/gi, 'Verbesserung ist noch möglich'],
    [/\brecovery opportunities\b/gi, 'Verbesserungen sind noch möglich'],
    [/\bforecast\b/gi, 'Prognose']
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();

  if (mode === 'loss') {
    text = text
      .replace(/\bcritical\b/gi, 'klar')
      .replace(/\bsevere\b/gi, 'spürbar');
  }

  if (mode === 'opportunity') {
    text = text
      .replace(/\bboost\b/gi, 'anheben')
      .replace(/\bpush(ing)?\b/gi, 'weiter drücken');
  }

  return clipHarvestUiText(sentenceCaseHarvestText(text), mode === 'hero' ? 88 : 96);
}

function normalizeHarvestUiLabel(rawLabel, mode = 'driver') {
  const source = String(rawLabel || '').trim();
  if (!source) {
    return mode === 'opportunity' ? 'Beste nächste Verbesserung' : 'Treiber';
  }

  let label = source
    .replace(/[_-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const replacements = [
    [/\bevent chance\b/gi, 'Gute Phase'],
    [/\bevent opportunity\b/gi, 'Gute Phase'],
    [/\bclimate instability\b/gi, 'Unruhiges Klima'],
    [/\blate stress spike\b/gi, 'Später Stress'],
    [/\baction inefficiency\b/gi, 'Ineffiziente Eingriffe'],
    [/\bquality loss(es)?\b/gi, 'Qualitätsverlust'],
    [/\byield loss(es)?\b/gi, 'Ertragsverlust'],
    [/\blocked loss(es)?\b/gi, 'Fester Verlust'],
    [/\brecovery opportunity\b/gi, 'Nächste Verbesserung'],
    [/\brecovery opportunities\b/gi, 'Weitere Verbesserungen'],
    [/\bunresolved event pressure\b/gi, 'Offene Probleme'],
    [/\bevent pressure\b/gi, 'Offene Probleme']
  ];

  for (const [pattern, replacement] of replacements) {
    label = label.replace(pattern, replacement);
  }

  return clipHarvestUiText(sentenceCaseHarvestText(label), 44);
}

function buildRunSummaryHarvestTone(harvestSummary) {
  const score = Math.round(Number(harvestSummary && harvestSummary.harvestScore) || 0);
  const quality = Math.round(Number(harvestSummary && harvestSummary.qualityScore) || 0);
  if (score >= 88 && quality >= 82) {
    return {
      title: 'Starker Run',
      subtitle: 'Sehr sauberer Abschluss mit klarer Erntelinie.'
    };
  }
  if (score >= 72) {
    return {
      title: 'Solide Ernte',
      subtitle: 'Der Run war stabil und hatte mehrere starke Phasen.'
    };
  }
  if (score >= 56) {
    return {
      title: 'Durchwachsener Run',
      subtitle: 'Gute Ansätze waren da, aber einzelne Bremsen haben Tempo gekostet.'
    };
  }
  return {
    title: 'Schwieriger Abschluss',
    subtitle: 'Der Run war unter Druck, trotzdem ist die Richtung für den nächsten Versuch klarer.'
  };
}

function buildRunSummaryHarvestMotivation(harvestSummary) {
  const opportunities = Array.isArray(harvestSummary && harvestSummary.recoveryOpportunities)
    ? harvestSummary.recoveryOpportunities
    : [];
  if (opportunities.length) {
    const top = opportunities[0];
    const label = normalizeHarvestUiLabel(top.label || i18nT('harvest.next_improvement'), 'opportunity');
    const reason = normalizeHarvestUiText(top.reason || i18nT('harvest.clearest_lever_here'), 'opportunity');
    return `${label}: ${reason}`;
  }

  const negative = Array.isArray(harvestSummary && harvestSummary.negativeDrivers) ? harvestSummary.negativeDrivers : [];
  if (negative.length) {
    const top = negative[0];
    const label = normalizeHarvestUiLabel(top.label || i18nT('harvest.brake_factor'));
    return i18nT('harvest.play_calmer_next_run', { label });
  }
  return i18nT('harvest.close_to_stronger_harvest');
}

function renderRunSummaryHarvestMetricRows(container, harvestSummary) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  if (!harvestSummary) {
    return;
  }

  const rows = [
    { key: 'yield', label: i18nT('harvest.metric_yield'), value: harvestSummary.yieldScore, tier: 'primary' },
    { key: 'quality', label: i18nT('harvest.metric_quality'), value: harvestSummary.qualityScore, tier: 'primary' },
    { key: 'stability', label: i18nT('harvest.metric_stability'), value: harvestSummary.stabilityScore, tier: 'primary' },
    { key: 'efficiency', label: i18nT('harvest.metric_efficiency'), value: harvestSummary.efficiencyScore, tier: 'secondary' },
    { key: 'challenge', label: i18nT('harvest.metric_challenge'), value: harvestSummary.challengeScore, tier: 'muted' }
  ];

  for (const item of rows) {
    const row = document.createElement('article');
    row.className = `run-summary-harvest-metric run-summary-harvest-metric--${item.tier}`;
    const hasValue = Number.isFinite(Number(item.value));
    row.innerHTML = `<span>${escapeHtml(item.label)}</span><strong>${escapeHtml(hasValue ? String(Math.round(Number(item.value) || 0)) : '--')}</strong>`;
    container.appendChild(row);
  }
}

function renderRunSummaryHarvestImpact(container, harvestSummary) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  if (!harvestSummary) {
    return;
  }

  const positives = Array.isArray(harvestSummary.positiveDrivers) ? harvestSummary.positiveDrivers.slice(0, 3) : [];
  const negatives = Array.isArray(harvestSummary.negativeDrivers) ? harvestSummary.negativeDrivers.slice(0, 2) : [];
  const entries = [];

  for (const item of positives) {
    entries.push({
      tone: 'positive',
      title: normalizeHarvestUiLabel(item.label || i18nT('harvest.strong_factor')),
      copy: normalizeHarvestUiText(item.reason || i18nT('harvest.reason_supported_forecast'))
    });
  }
  for (const item of negatives) {
    entries.push({
      tone: 'negative',
      title: normalizeHarvestUiLabel(item.label || i18nT('harvest.brake_factor')),
      copy: normalizeHarvestUiText(item.reason || i18nT('harvest.reason_slowed_forecast'))
    });
  }

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'sheet-note';
    empty.textContent = i18nT('harvest.no_dominant_factor');
    container.appendChild(empty);
    return;
  }

  for (const item of entries.slice(0, 5)) {
    const node = document.createElement('article');
    node.className = `run-summary-impact-note run-summary-impact-note--${item.tone}`;
    node.innerHTML = `<strong>${escapeHtml(item.title)}</strong><p class="sheet-note">${escapeHtml(item.copy)}</p>`;
    container.appendChild(node);
  }
}

function renderRunSummaryHarvestMoments(container, harvestSummary) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  if (!harvestSummary) {
    return;
  }

  const bestDriver = Array.isArray(harvestSummary.positiveDrivers) && harvestSummary.positiveDrivers.length
    ? harvestSummary.positiveDrivers[0]
    : null;
  const biggestLoss = Array.isArray(harvestSummary.lockedLosses) && harvestSummary.lockedLosses.length
    ? harvestSummary.lockedLosses[0]
    : (Array.isArray(harvestSummary.negativeDrivers) && harvestSummary.negativeDrivers.length ? harvestSummary.negativeDrivers[0] : null);

  if (bestDriver) {
    const bestNode = document.createElement('article');
    bestNode.className = 'run-summary-impact-note run-summary-impact-note--positive';
    bestNode.innerHTML = `<strong>${escapeHtml(i18nT('harvest.strongest_moment_prefix'))}: ${escapeHtml(normalizeHarvestUiLabel(bestDriver.label || i18nT('harvest.good_phase')))}</strong><p class="sheet-note">${escapeHtml(normalizeHarvestUiText(bestDriver.reason || i18nT('harvest.phase_supported_run')))}</p>`;
    container.appendChild(bestNode);
  }

  if (biggestLoss) {
    const lossNode = document.createElement('article');
    lossNode.className = 'run-summary-impact-note run-summary-impact-note--negative';
    lossNode.innerHTML = `<strong>${escapeHtml(i18nT('harvest.biggest_loss_prefix'))}: ${escapeHtml(normalizeHarvestUiLabel(biggestLoss.label || i18nT('harvest.brake_factor')))}</strong><p class="sheet-note">${escapeHtml(normalizeHarvestUiText(biggestLoss.reason || i18nT('harvest.part_dragged_finish'), 'loss'))}</p>`;
    container.appendChild(lossNode);
  }

  if (!bestDriver && !biggestLoss) {
    const empty = document.createElement('p');
    empty.className = 'sheet-note';
    empty.textContent = i18nT('harvest.run_balanced_no_spike');
    container.appendChild(empty);
  }
}

function describeVerificationStatus(status, submissionState = 'idle') {
  const safeStatus = String(status || 'local_only').trim();
  if (safeStatus === 'verified') {
    return i18nT('harvest.verification_status.verified');
  }
  if (safeStatus === 'provisional') {
    return i18nT('harvest.verification_status.provisional');
  }
  if (safeStatus === 'under_review') {
    return i18nT('harvest.verification_status.under_review');
  }
  if (safeStatus === 'rejected') {
    return i18nT('harvest.verification_status.rejected');
  }
  if (safeStatus === 'submitted' || submissionState === 'submitting' || submissionState === 'polling') {
    return submissionState === 'submitting'
      ? i18nT('harvest.verification_status.submitting')
      : i18nT('harvest.verification_status.polling');
  }
  return i18nT('harvest.verification_status.local_only');
}

function buildVerificationHeroTone(resultLike, verificationStatus, fallbackSummary = null) {
  const result = resultLike && typeof resultLike === 'object' ? resultLike : {};
  const score = Math.round(Number(result.harvestScore) || 0);
  const quality = Math.round(Number(result.qualityScore) || Number(fallbackSummary && fallbackSummary.qualityScore) || 0);

  if (verificationStatus === 'verified') {
    if (score >= 84 && quality >= 80) {
      return { title: i18nT('harvest.hero.verified_strong_title'), subtitle: i18nT('harvest.hero.verified_strong_subtitle') };
    }
    if (score >= 68) {
      return { title: i18nT('harvest.hero.verified_solid_title'), subtitle: i18nT('harvest.hero.verified_solid_subtitle') };
    }
    return { title: i18nT('harvest.hero.verified_difficult_title'), subtitle: i18nT('harvest.hero.verified_difficult_subtitle') };
  }

  if (verificationStatus === 'provisional') {
    return { title: i18nT('harvest.hero.provisional_title'), subtitle: i18nT('harvest.hero.provisional_subtitle') };
  }

  return buildRunSummaryHarvestTone(fallbackSummary || result);
}

function formatHarvestVerificationBadge(status, submissionState = 'idle') {
  if (status === 'verified') return i18nT('harvest.badge.verified');
  if (status === 'provisional') return i18nT('harvest.badge.provisional');
  if (status === 'under_review') return i18nT('harvest.badge.under_review');
  if (status === 'rejected') return i18nT('harvest.badge.rejected');
  if (status === 'submitted' || submissionState === 'submitting' || submissionState === 'polling') return i18nT('harvest.badge.under_review');
  return i18nT('harvest.badge.forecast');
}

function buildHarvestVerificationInsightCards(readiness, localSummary) {
  const cards = [];
  const safeReadiness = readiness && typeof readiness === 'object' ? readiness : getHarvestSubmissionReadinessDefaults();
  const localScore = Math.round(Number(localSummary && localSummary.harvestScore) || 0);
  const verifiedResult = normalizeHarvestVerificationResult(safeReadiness.verifiedHarvestResult, 'verified');
  const provisionalResult = normalizeHarvestVerificationResult(safeReadiness.provisionalHarvestResult, 'provisional');
  const anomalyFlags = normalizeAnomalyFlags(safeReadiness.anomalyFlags);

  if (safeReadiness.verificationStatus === 'verified' && verifiedResult) {
    const verifiedScore = Math.round(Number(verifiedResult.harvestScore) || 0);
    cards.push({
      tone: 'verified',
      title: 'Verifiziertes Ergebnis',
      copy: `Serverwert ${verifiedScore} · lokal ${localScore}. Jetzt zählt die bestätigte Linie.`
    });
    if (safeReadiness.leaderboardSnapshot && Number.isFinite(Number(safeReadiness.leaderboardSnapshot.rank))) {
      const rank = Math.trunc(Number(safeReadiness.leaderboardSnapshot.rank));
      cards.push({
        tone: 'soft',
        title: 'Weekly-Rang',
        copy: `Aktuell #${rank} im ${formatLeaderboardCategoryLabel(safeReadiness.leaderboardSnapshot.category || 'overall')}-Leaderboard.`
      });
    }
    if (verifiedResult.leaderboardEligible || safeReadiness.leaderboardEligible) {
      cards.push({
        tone: 'soft',
        title: 'Leaderboard-fähig',
        copy: 'Dieses Ergebnis kann in Weekly-Rankings geführt werden, sobald ein Vergleichsfeld vorliegt.'
      });
    }
    return cards;
  }

  if (safeReadiness.verificationStatus === 'provisional' && provisionalResult) {
    const provisionalScore = Math.round(Number(provisionalResult.harvestScore) || 0);
    cards.push({
      tone: 'provisional',
      title: 'Vorläufig geprüft',
      copy: `Der erste Serverwert liegt bei ${provisionalScore}. Deine lokale Auswertung bleibt bis zum Abschluss sichtbar.`
    });
    return cards;
  }

  if (safeReadiness.verificationStatus === 'under_review') {
    cards.push({
      tone: 'review',
      title: 'Wird geprüft',
      copy: 'Dein Ergebnis wurde übernommen und braucht noch eine vertiefte Prüfung.'
    });
    if (anomalyFlags.length) {
      cards.push({
        tone: 'soft',
        title: 'Server-Hinweis',
        copy: `Auffällig war vor allem: ${normalizeHarvestUiText(anomalyFlags[0], 'loss')}`
      });
    }
    return cards;
  }

  if (safeReadiness.verificationStatus === 'rejected') {
    cards.push({
      tone: 'rejected',
      title: 'Nicht verifizierbar',
      copy: safeReadiness.statusMessage || 'Die lokale Auswertung bleibt erhalten, aber der Server konnte dieses Ergebnis nicht bestätigen.'
    });
    if (anomalyFlags.length) {
      cards.push({
        tone: 'soft',
        title: 'Kurz gesagt',
        copy: normalizeHarvestUiText(anomalyFlags[0], 'loss')
      });
    }
    return cards;
  }

  if (safeReadiness.submissionState === 'submitting') {
    cards.push({
      tone: 'submitted',
      title: 'Übermittlung läuft',
      copy: 'Die lokale Auswertung ist da. Der Server-Check wird gerade gestartet.'
    });
    return cards;
  }

  if (safeReadiness.verificationStatus === 'submitted' || safeReadiness.submissionState === 'polling') {
    cards.push({
      tone: 'submitted',
      title: 'Wird geprüft',
      copy: 'Dein Ergebnis ist angekommen und wird gerade serverseitig bewertet.'
    });
    return cards;
  }

  if (safeReadiness.submissionError) {
    cards.push({
      tone: 'soft',
      title: 'Nur lokal verfügbar',
      copy: safeReadiness.submissionError
    });
    return cards;
  }

  cards.push({
    tone: 'soft',
    title: 'Nur lokal ausgewertet',
    copy: 'Ohne Server-Check bleibt dieses Ergebnis eine lokale Auswertung.'
  });
  return cards;
}

function renderRunSummaryHarvestVerification(container, readiness, localSummary) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  const cards = buildHarvestVerificationInsightCards(readiness, localSummary);
  const visible = cards.length > 0;
  container.classList.toggle('hidden', !visible);
  container.setAttribute('aria-hidden', String(!visible));
  if (!visible) {
    return;
  }

  for (const item of cards) {
    const card = document.createElement('article');
    card.className = `run-summary-harvest-status-card run-summary-harvest-status-card--${item.tone || 'soft'}`;
    card.innerHTML = `<strong>${escapeHtml(String(item.title || 'Status'))}</strong><p class="sheet-note">${escapeHtml(String(item.copy || ''))}</p>`;
    container.appendChild(card);
  }
}

function createHarvestSessionPayload(run) {
  return {
    clientVersion: getGrowSimClientVersion(),
    startedAt: isoFromRealMs(run && run.startedAtRealMs),
    declaredSetup: buildDeclaredSetup(run),
    declaredChallenges: buildDeclaredChallenges(run)
  };
}

function createHarvestSubmitPayload(summary, run) {
  const safeSummary = summary && typeof summary === 'object' ? summary : {};
  const safeRun = run && typeof run === 'object' ? run : getCanonicalRun(state);
  const readiness = ensureHarvestBackendState(safeRun);
  const localHarvestSummary = safeSummary.harvestSummary && typeof safeSummary.harvestSummary === 'object'
    ? safeSummary.harvestSummary
    : (safeRun.harvest && safeRun.harvest.runOutcomeDraft && typeof safeRun.harvest.runOutcomeDraft === 'object'
      ? safeRun.harvest.runOutcomeDraft
      : null);

  const telemetry = {
    simDay: Number(safeSummary.simDay || state.simulation.simDay || 0),
    stageLabel: String(safeSummary.stageLabel || ''),
    actionsCount: Math.max(0, Math.trunc(Number(safeSummary.actionsCount || (state.history && state.history.actions && state.history.actions.length) || 0))),
    eventsCount: Math.max(0, Math.trunc(Number(safeSummary.eventsCount || (state.history && state.history.events && state.history.events.length) || 0))),
    finalStatus: {
      health: round2(Number(state.status && state.status.health) || 0),
      stress: round2(Number(state.status && state.status.stress) || 0),
      water: round2(Number(state.status && state.status.water) || 0),
      nutrition: round2(Number(state.status && state.status.nutrition) || 0),
      risk: round2(Number(state.status && state.status.risk) || 0),
      growth: round2(Number(state.status && state.status.growth) || 0)
    },
    forecastHistory: Array.isArray(safeRun.harvest && safeRun.harvest.forecastHistory) ? safeRun.harvest.forecastHistory.slice(-10) : [],
    analysisHistory: Array.isArray(safeRun.harvest && safeRun.harvest.analysisHistory) ? safeRun.harvest.analysisHistory.slice(-6) : []
  };

  const clientSummary = {
    runId: Number(safeRun.id || 0),
    startedAt: isoFromRealMs(safeRun.startedAtRealMs),
    endedAt: isoFromRealMs(safeSummary.endedAtRealMs || safeRun.endedAtRealMs || Date.now()),
    endReason: String(safeSummary.endReason || safeRun.endReason || 'death'),
    summary: {
      simDay: Number(safeSummary.simDay || 0),
      stageLabel: String(safeSummary.stageLabel || ''),
      qualityScore: round2(Number(safeSummary.qualityScore) || 0),
      qualityTier: String(safeSummary.qualityTier || ''),
      actionsCount: Math.max(0, Math.trunc(Number(safeSummary.actionsCount || 0))),
      eventsCount: Math.max(0, Math.trunc(Number(safeSummary.eventsCount || 0)))
    },
    harvest: localHarvestSummary ? {
      harvestScore: round2(Number(localHarvestSummary.harvestScore) || 0),
      yieldScore: round2(Number(localHarvestSummary.yieldScore) || 0),
      qualityScore: round2(Number(localHarvestSummary.qualityScore) || 0),
      stabilityScore: round2(Number(localHarvestSummary.stabilityScore) || 0),
      efficiencyScore: round2(Number(localHarvestSummary.efficiencyScore) || 0),
      challengeScore: round2(Number(localHarvestSummary.challengeScore) || 0),
      qualityBandLabel: String(localHarvestSummary.qualityBandLabel || ''),
      confidenceBand: String(localHarvestSummary.confidenceBand || ''),
      positiveDrivers: Array.isArray(localHarvestSummary.positiveDrivers) ? localHarvestSummary.positiveDrivers.slice(0, 3) : [],
      negativeDrivers: Array.isArray(localHarvestSummary.negativeDrivers) ? localHarvestSummary.negativeDrivers.slice(0, 3) : [],
      lockedLosses: Array.isArray(localHarvestSummary.lockedLosses) ? localHarvestSummary.lockedLosses.slice(0, 3) : [],
      recoveryOpportunities: Array.isArray(localHarvestSummary.recoveryOpportunities) ? localHarvestSummary.recoveryOpportunities.slice(0, 3) : []
    } : null
  };

  return {
    sessionId: readiness.backendSessionId,
    clientVersion: getGrowSimClientVersion(),
    endedAt: isoFromRealMs(safeSummary.endedAtRealMs || safeRun.endedAtRealMs || Date.now()),
    endReason: String(safeSummary.endReason || safeRun.endReason || 'death'),
    declaredSetup: buildDeclaredSetup(safeRun),
    declaredChallenges: buildDeclaredChallenges(safeRun),
    clientSummary,
    telemetry,
    clientHashes: {
      setupHash: shortHashFromString(stableSerialize(buildDeclaredSetup(safeRun))),
      summaryHash: shortHashFromString(stableSerialize(clientSummary)),
      telemetryHash: shortHashFromString(stableSerialize(telemetry))
    }
  };
}

function clearHarvestVerificationPolling() {
  if (harvestBackendRuntime.pollTimer !== null) {
    window.clearTimeout(harvestBackendRuntime.pollTimer);
    harvestBackendRuntime.pollTimer = null;
  }
  harvestBackendRuntime.pollSubmissionId = '';
  harvestBackendRuntime.pollAttempts = 0;
}

function applyHarvestVerificationPayload(payload, options = {}) {
  const run = getCanonicalRun(state);
  const readiness = ensureHarvestBackendState(run);
  const status = extractVerificationStatusFromPayload(payload);
  const result = extractVerificationResultFromPayload(payload, status);
  const submissionId = extractSubmissionIdFromPayload(payload) || readiness.submissionId;
  const statusMessage = String(
    (payload && payload.message)
    || (payload && payload.detail)
    || (result && result.explanation)
    || describeVerificationStatus(status, readiness.submissionState)
  ).trim();
  const anomalyFlags = normalizeAnomalyFlags(
    (payload && payload.anomalyFlags)
    || (payload && payload.flags)
    || (result && result.anomalyFlags)
  );

  readiness.submissionId = submissionId;
  readiness.verificationStatus = status;
  readiness.lastVerificationAt = Date.now();
  readiness.lastVerifiedSyncAtRealMs = Date.now();
  readiness.statusMessage = statusMessage;
  readiness.serverCode = typeof payload === 'object' && payload && typeof payload.code === 'string'
    ? payload.code.trim()
    : '';
  readiness.submissionError = '';
  readiness.pendingSubmission = status === 'submitted' || status === 'provisional';
  readiness.reviewNeeded = status === 'under_review' || Boolean(payload && payload.reviewNeeded);
  readiness.leaderboardEligible = Boolean((payload && payload.leaderboardEligible) || (result && result.leaderboardEligible));
  readiness.anomalyFlags = anomalyFlags;
  if (status === 'verified') {
    readiness.verifiedHarvestResult = result;
    readiness.provisionalHarvestResult = null;
    readiness.submissionState = 'verified';
  } else if (status === 'provisional') {
    readiness.provisionalHarvestResult = result;
    readiness.submissionState = 'polling';
  } else if (status === 'rejected') {
    readiness.submissionState = 'rejected';
  } else if (status === 'under_review') {
    readiness.submissionState = 'under_review';
  } else {
    readiness.submissionState = options.fromPoll ? 'polling' : 'submitted';
  }
}

async function createHarvestRunSessionForCurrentRun(options = {}) {
  const run = getCanonicalRun(state);
  const readiness = ensureHarvestBackendState(run);
  const shouldSkipAuth = !isAuthSessionValid() || !readAuthToken();
  if (shouldSkipAuth) {
    readiness.sessionState = 'local_only';
    readiness.sessionError = 'Ohne Login bleibt dieser Run lokal.';
    schedulePersistState(true);
    renderAll();
    return '';
  }
  if (readiness.backendSessionId && !options.force) {
    return readiness.backendSessionId;
  }
  if (harvestBackendRuntime.sessionPromise) {
    return harvestBackendRuntime.sessionPromise;
  }

  readiness.sessionState = 'creating';
  readiness.sessionError = '';
  renderAll();
  schedulePersistState(true);

  harvestBackendRuntime.activeRunId = Number(run.id || 0);
  harvestBackendRuntime.sessionPromise = (async () => {
    try {
      const response = await appApiFetch('/v1/run-sessions', {
        method: 'POST',
        headers: buildHarvestApiHeaders(),
        body: JSON.stringify(createHarvestSessionPayload(run))
      });
      const payload = await safeReadJson(response);
      if (!response.ok) {
        const mappedError = mapHarvestBackendError({
          status: response.status,
          code: payload && payload.code,
          message: payload && payload.message
        }, 'Die Run-Sitzung konnte nicht angelegt werden.');
        readiness.sessionState = 'error';
        readiness.sessionError = mappedError.message;
        schedulePersistState(true);
        renderAll();
        return '';
      }

      const sessionId = extractSessionIdFromPayload(payload);
      if (!sessionId) {
        readiness.sessionState = 'error';
        readiness.sessionError = 'Die Run-Sitzung wurde serverseitig nicht bestätigt.';
        schedulePersistState(true);
        renderAll();
        return '';
      }

      readiness.backendSessionId = sessionId;
      readiness.sessionState = 'ready';
      readiness.sessionError = '';
      schedulePersistState(true);
      renderAll();
      return sessionId;
    } catch (error) {
      const mappedError = mapHarvestBackendError({ network: true, message: error && error.message ? error.message : '' });
      readiness.sessionState = 'error';
      readiness.sessionError = mappedError.message;
      schedulePersistState(true);
      renderAll();
      return '';
    } finally {
      harvestBackendRuntime.sessionPromise = null;
    }
  })();

  return harvestBackendRuntime.sessionPromise;
}

function shouldResumeHarvestVerification(readiness) {
  const safe = readiness && typeof readiness === 'object' ? readiness : getHarvestSubmissionReadinessDefaults();
  return Boolean(
    safe.submissionId
    && (safe.verificationStatus === 'submitted' || safe.verificationStatus === 'provisional')
  );
}

async function pollHarvestVerificationStatus(options = {}) {
  const run = getCanonicalRun(state);
  const readiness = ensureHarvestBackendState(run);
  if (!readiness.submissionId || !isAuthSessionValid() || !readAuthToken()) {
    clearHarvestVerificationPolling();
    return null;
  }
  if (harvestBackendRuntime.pollAttempts >= HARVEST_VERIFICATION_MAX_ATTEMPTS && !options.force) {
    clearHarvestVerificationPolling();
    readiness.pendingSubmission = false;
    schedulePersistState(true);
    renderAll();
    return null;
  }

  harvestBackendRuntime.pollAttempts += 1;
  harvestBackendRuntime.pollSubmissionId = readiness.submissionId;
  readiness.submissionState = 'polling';
  schedulePersistState(true);
  renderAll();

  try {
    const response = await appApiFetch(`/v1/runs/${encodeURIComponent(readiness.submissionId)}`, {
      method: 'GET',
      headers: buildHarvestApiHeaders()
    });
    const payload = await safeReadJson(response);
    if (!response.ok) {
      const mappedError = mapHarvestBackendError({
        status: response.status,
        code: payload && payload.code,
        message: payload && payload.message
      }, 'Der Prüfstatus konnte nicht aktualisiert werden.');
      readiness.submissionError = mappedError.message;
      readiness.serverCode = mappedError.code;
      readiness.pendingSubmission = false;
      readiness.submissionState = 'submitted';
      schedulePersistState(true);
      renderAll();
      clearHarvestVerificationPolling();
      return null;
    }

    applyHarvestVerificationPayload(payload, { fromPoll: true });
    if (readiness.verificationStatus === 'verified') {
      void refreshRunLeaderboardSnapshot();
      void fetchRewardsBundle({ force: true });
    }
    schedulePersistState(true);
    renderAll();
    const nextStatus = readiness.verificationStatus;
    if (nextStatus === 'submitted' || nextStatus === 'provisional') {
      scheduleHarvestVerificationPolling();
    } else {
      clearHarvestVerificationPolling();
    }
    return payload;
  } catch (error) {
    const mappedError = mapHarvestBackendError({ network: true, message: error && error.message ? error.message : '' });
    readiness.submissionError = mappedError.message;
    readiness.pendingSubmission = false;
    schedulePersistState(true);
    renderAll();
    clearHarvestVerificationPolling();
    return null;
  }
}

function scheduleHarvestVerificationPolling(options = {}) {
  const run = getCanonicalRun(state);
  const readiness = ensureHarvestBackendState(run);
  if (!shouldResumeHarvestVerification(readiness)) {
    clearHarvestVerificationPolling();
    return;
  }
  if (options.resetAttempts) {
    harvestBackendRuntime.pollAttempts = 0;
  }
  if (harvestBackendRuntime.pollTimer !== null) {
    window.clearTimeout(harvestBackendRuntime.pollTimer);
    harvestBackendRuntime.pollTimer = null;
  }
  const delayMs = options.immediate ? 0 : HARVEST_VERIFICATION_POLL_INTERVAL_MS;
  harvestBackendRuntime.pollTimer = window.setTimeout(() => {
    harvestBackendRuntime.pollTimer = null;
    void pollHarvestVerificationStatus();
  }, delayMs);
}

async function submitHarvestRunOutcomeIfPossible(options = {}) {
  const run = getCanonicalRun(state);
  const profile = getCanonicalProfile(state);
  const readiness = ensureHarvestBackendState(run);
  const summary = profile.lastRunSummary && typeof profile.lastRunSummary === 'object'
    ? profile.lastRunSummary
    : null;
  const localHarvestSummary = summary && summary.harvestSummary && typeof summary.harvestSummary === 'object'
    ? summary.harvestSummary
    : (run.harvest && run.harvest.runOutcomeDraft && typeof run.harvest.runOutcomeDraft === 'object' ? run.harvest.runOutcomeDraft : null);

  if (!localHarvestSummary || !readiness.localSummaryReady) {
    return null;
  }
  if (!isAuthSessionValid() || !readAuthToken()) {
    readiness.submissionState = 'local_only';
    readiness.verificationStatus = 'local_only';
    readiness.submissionError = 'Ohne Login bleibt dieses Ergebnis lokal.';
    readiness.pendingSubmission = false;
    schedulePersistState(true);
    renderAll();
    return null;
  }
  if (readiness.submissionId && !options.force) {
    scheduleHarvestVerificationPolling({ immediate: true, resetAttempts: false });
    return readiness.submissionId;
  }
  if (harvestBackendRuntime.submissionPromise) {
    return harvestBackendRuntime.submissionPromise;
  }

  if (!readiness.backendSessionId) {
    await createHarvestRunSessionForCurrentRun();
  }
  if (!readiness.backendSessionId) {
    readiness.submissionState = 'local_only';
    readiness.verificationStatus = 'local_only';
    readiness.submissionError = readiness.sessionError || 'Der Backend-Check war für diesen Run nicht erreichbar.';
    schedulePersistState(true);
    renderAll();
    return null;
  }

  readiness.pendingSubmission = true;
  readiness.submissionState = 'submitting';
  readiness.submissionError = '';
  readiness.statusMessage = 'Die lokale Auswertung wird gerade übermittelt.';
  schedulePersistState(true);
  renderAll();

  harvestBackendRuntime.submissionPromise = (async () => {
    try {
      const response = await appApiFetch('/v1/runs/submit', {
        method: 'POST',
        headers: buildHarvestApiHeaders(),
        body: JSON.stringify(createHarvestSubmitPayload(summary, run))
      });
      const payload = await safeReadJson(response);

      if (!response.ok) {
        const mappedError = mapHarvestBackendError({
          status: response.status,
          code: payload && payload.code,
          message: payload && payload.message
        }, 'Die lokale Auswertung konnte nicht serverseitig geprüft werden.');
        if (mappedError.code === 'duplicate_submission') {
          const duplicateSubmissionId = extractSubmissionIdFromPayload(payload);
          if (duplicateSubmissionId) {
            readiness.submissionId = duplicateSubmissionId;
            readiness.verificationStatus = 'submitted';
            readiness.submissionState = 'submitted';
            readiness.submissionError = '';
            schedulePersistState(true);
            renderAll();
            scheduleHarvestVerificationPolling({ immediate: true, resetAttempts: true });
            return duplicateSubmissionId;
          }
        }
        readiness.submissionState = 'error';
        readiness.pendingSubmission = false;
        readiness.submissionError = mappedError.message;
        readiness.serverCode = mappedError.code;
        schedulePersistState(true);
        renderAll();
        return null;
      }

      readiness.submissionId = extractSubmissionIdFromPayload(payload);
      applyHarvestVerificationPayload(payload, { fromPoll: false });
      if (readiness.verificationStatus === 'verified') {
        void refreshRunLeaderboardSnapshot({ force: true });
        void fetchRewardsBundle({ force: true });
      }
      readiness.pendingSubmission = readiness.verificationStatus === 'submitted' || readiness.verificationStatus === 'provisional';
      schedulePersistState(true);
      renderAll();
      if (readiness.verificationStatus === 'submitted' || readiness.verificationStatus === 'provisional') {
        scheduleHarvestVerificationPolling({ immediate: readiness.verificationStatus === 'submitted', resetAttempts: true });
      } else {
        clearHarvestVerificationPolling();
      }
      return readiness.submissionId;
    } catch (error) {
      const mappedError = mapHarvestBackendError({ network: true, message: error && error.message ? error.message : '' });
      readiness.submissionState = 'error';
      readiness.pendingSubmission = false;
      readiness.submissionError = mappedError.message;
      schedulePersistState(true);
      renderAll();
      return null;
    } finally {
      harvestBackendRuntime.submissionPromise = null;
    }
  })();

  return harvestBackendRuntime.submissionPromise;
}

function resumeHarvestBackendFlowsAfterRestore() {
  const run = getCanonicalRun(state);
  const readiness = ensureHarvestBackendState(run);
  if ((run.status === 'active' || run.status === 'downed') && !readiness.backendSessionId && isAuthSessionValid() && readAuthToken()) {
    void createHarvestRunSessionForCurrentRun();
  }
  if (shouldResumeHarvestVerification(readiness)) {
    scheduleHarvestVerificationPolling({ immediate: true, resetAttempts: true });
  }
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

async function hydrateEventMediaDrafts() {
  const assetsModule = window.GrowSimEventAssetsModule;
  if (!assetsModule || typeof assetsModule.ensureRegistryLoaded !== 'function') {
    return;
  }

  try {
    await assetsModule.ensureRegistryLoaded();
    if (typeof assetsModule.ensureGapListLoaded === 'function') {
      await assetsModule.ensureGapListLoaded();
    }
    renderEventSheet();
    renderAnalysisPanel(false);
  } catch (error) {
    console.warn('[events-ui] asset registry hydration skipped', error);
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
    await runBootSubstep('init_i18n_runtime_pre_auth_gate', () => initializeI18nRuntime());
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
    await runBootSubstep('init_i18n_runtime', () => initializeI18nRuntime());
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
    await runBootSubstep('hydrate_event_media_drafts', () => hydrateEventMediaDrafts());
    await runBootSubstep('apply_background_asset', () => applyBackgroundAsset());
    bootStep = 'service_worker';
    await runBootSubstep('register_service_worker', () => registerServiceWorker());
    await runBootSubstep('refresh_push_status', () => refreshPushStatus({ force: true }));
    logBootStep('boot:service_worker');

    setBootStep('init_simulation', getBootUserMessage('init_simulation'));
    bootStep = 'runtime_sync';
    const bootNowMs = await runBootSubstep('runtime_now_timestamp', () => Date.now());
    await runBootSubstep('sync_simulation_from_elapsed_time', () => syncSimulationFromElapsedTime(bootNowMs));
    await runBootSubstep('sync_runtime_clocks', () => syncRuntimeClocks(bootNowMs));
    await runBootSubstep('sync_active_event_from_catalog', () => syncActiveEventFromCatalog());
    await runBootSubstep('update_visible_overlays', () => updateVisibleOverlays());
    await runBootSubstep('sync_canonical_state_shape', () => syncCanonicalStateShape());
    await runBootSubstep('evaluate_daily_retention', () => evaluateDailyRetention(state, bootNowMs, { forceCheckin: false, skipPersist: true }));
    await runBootSubstep('record_retention_session_start', () => recordRetentionSessionStart(bootNowMs, 'boot', { skipPersist: true }));
    await runBootSubstep('resume_harvest_backend_flows', () => resumeHarvestBackendFlowsAfterRestore());
    await runBootSubstep('clear_transient_boot_ui_state', () => clearTransientBootUiState());
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
      currencyCoins: '2.480'
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
  const eventEngine = window.GrowSimEventEngine;
  if (eventEngine && typeof eventEngine.routeTick === 'function') {
    return eventEngine.routeTick(nowMs, state).result;
  }
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
  const eventEngine = window.GrowSimEventEngine;
  if (eventEngine && typeof eventEngine.routeChoice === 'function') {
    return eventEngine.routeChoice(optionId, state).result;
  }
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
  evaluateDailyRetention(state, nowMs, { forceCheckin: false, skipPersist: true });
  updateDailyCareCompletion('action_success', {
    nowMs,
    actionId: action.id,
    category: action.category
  });
  syncRunGoalProgress('action');
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

function onCareBoostAction() {
  return triggerRewardAction(REWARD_ACTION_TYPES.CARE_BOOST);
}

function onClimateStabilizeAction() {
  return triggerRewardAction(REWARD_ACTION_TYPES.CLIMATE_STABILIZE);
}

function ensureRewardActionRuntime(snapshot = state) {
  const target = snapshot && typeof snapshot === 'object' ? snapshot : state;
  if (!target.rewardActions || typeof target.rewardActions !== 'object') {
    target.rewardActions = {};
  }

  const runtime = target.rewardActions;
  if (typeof runtime.provider !== 'string' || !runtime.provider.trim()) {
    runtime.provider = 'direct';
  }
  if (!Number.isFinite(Number(runtime.lastTriggeredAtMs))) {
    runtime.lastTriggeredAtMs = 0;
  }
  if (!Number.isFinite(Number(runtime.lastExecutedAtMs))) {
    runtime.lastExecutedAtMs = 0;
  }
  if (!Number.isFinite(Number(runtime.lastGrantedAtMs))) {
    runtime.lastGrantedAtMs = 0;
  }
  if (!runtime.byType || typeof runtime.byType !== 'object') {
    runtime.byType = {};
  }
  return runtime;
}

const REWARD_ACTION_CONTROL_CONFIG = Object.freeze({
  [REWARD_ACTION_TYPES.NIGHT_SHIFT]: Object.freeze({
    cooldownMs: 5 * 60 * 1000
  }),
  [REWARD_ACTION_TYPES.TIME_SKIP_SHORT]: Object.freeze({
    cooldownMs: 10 * 1000
  }),
  [REWARD_ACTION_TYPES.TIME_SKIP_LONG]: Object.freeze({
    cooldownMs: 10 * 1000
  }),
  [REWARD_ACTION_TYPES.CARE_BOOST]: Object.freeze({
    cooldownMs: 15 * 60 * 1000
  }),
  [REWARD_ACTION_TYPES.AUTO_CARE]: Object.freeze({
    cooldownMs: 15 * 1000
  }),
  [REWARD_ACTION_TYPES.FAST_FORWARD_EVENT]: Object.freeze({
    cooldownMs: 7 * 60 * 1000
  }),
  [REWARD_ACTION_TYPES.EVENT_START]: Object.freeze({
    cooldownMs: 20 * 1000
  }),
  [REWARD_ACTION_TYPES.EVENT_REROLL]: Object.freeze({
    cooldownMs: 20 * 1000
  }),
  [REWARD_ACTION_TYPES.CLIMATE_STABILIZE]: Object.freeze({
    cooldownMs: 18 * 60 * 1000
  }),
  [REWARD_ACTION_TYPES.GROWTH_BOOST]: Object.freeze({
    cooldownMs: 15 * 1000
  }),
  [REWARD_ACTION_TYPES.EMERGENCY_SAVE]: Object.freeze({
    cooldownMs: 90 * 60 * 1000
  })
});

const REWARD_ACTION_EXECUTION_POLICY = Object.freeze({
  [REWARD_ACTION_TYPES.NIGHT_SHIFT]: 'direct',
  [REWARD_ACTION_TYPES.TIME_SKIP_SHORT]: 'direct',
  [REWARD_ACTION_TYPES.TIME_SKIP_LONG]: 'direct',
  [REWARD_ACTION_TYPES.CARE_BOOST]: 'rewarded_preferred',
  [REWARD_ACTION_TYPES.AUTO_CARE]: 'direct',
  [REWARD_ACTION_TYPES.FAST_FORWARD_EVENT]: 'direct',
  [REWARD_ACTION_TYPES.EVENT_START]: 'direct',
  [REWARD_ACTION_TYPES.EVENT_REROLL]: 'direct',
  [REWARD_ACTION_TYPES.CLIMATE_STABILIZE]: 'direct',
  [REWARD_ACTION_TYPES.GROWTH_BOOST]: 'direct',
  [REWARD_ACTION_TYPES.EMERGENCY_SAVE]: 'direct'
});

const REWARD_ACTION_BALANCE_PROFILE = Object.freeze({
  [REWARD_ACTION_TYPES.NIGHT_SHIFT]: Object.freeze({
    role: 'night_utility',
    valueTier: 'medium',
    cadence: 'frequent',
    rolloutStage: 'soft_launch'
  }),
  [REWARD_ACTION_TYPES.TIME_SKIP_SHORT]: Object.freeze({
    role: 'time_control',
    valueTier: 'medium',
    cadence: 'frequent',
    rolloutStage: 'production_candidate'
  }),
  [REWARD_ACTION_TYPES.TIME_SKIP_LONG]: Object.freeze({
    role: 'time_control',
    valueTier: 'high',
    cadence: 'frequent',
    rolloutStage: 'production_candidate'
  }),
  [REWARD_ACTION_TYPES.CARE_BOOST]: Object.freeze({
    role: 'run_stabilizer',
    valueTier: 'medium',
    cadence: 'moderate',
    rolloutStage: 'soft_launch'
  }),
  [REWARD_ACTION_TYPES.AUTO_CARE]: Object.freeze({
    role: 'comfort_automation',
    valueTier: 'high',
    cadence: 'contextual',
    rolloutStage: 'production_candidate'
  }),
  [REWARD_ACTION_TYPES.FAST_FORWARD_EVENT]: Object.freeze({
    role: 'context_skip',
    valueTier: 'medium_high',
    cadence: 'contextual',
    rolloutStage: 'production_candidate'
  }),
  [REWARD_ACTION_TYPES.EVENT_START]: Object.freeze({
    role: 'event_control',
    valueTier: 'medium',
    cadence: 'contextual',
    rolloutStage: 'production_candidate'
  }),
  [REWARD_ACTION_TYPES.EVENT_REROLL]: Object.freeze({
    role: 'risk_management',
    valueTier: 'medium_high',
    cadence: 'contextual',
    rolloutStage: 'production_candidate'
  }),
  [REWARD_ACTION_TYPES.CLIMATE_STABILIZE]: Object.freeze({
    role: 'climate_recovery',
    valueTier: 'high',
    cadence: 'moderate',
    rolloutStage: 'soft_launch'
  }),
  [REWARD_ACTION_TYPES.GROWTH_BOOST]: Object.freeze({
    role: 'growth_acceleration',
    valueTier: 'medium_high',
    cadence: 'contextual',
    rolloutStage: 'production_candidate'
  }),
  [REWARD_ACTION_TYPES.EMERGENCY_SAVE]: Object.freeze({
    role: 'run_rescue',
    valueTier: 'very_high',
    cadence: 'rare',
    rolloutStage: 'production_candidate'
  })
});

const REWARD_ROLLOUT_PRESETS = Object.freeze({
  local: Object.freeze({
    stage: 'local',
    rewardSystemEnabled: true,
    telemetryEnabled: true,
    qaVisibilityEnabled: false,
    providerModeOverride: 'inherit',
    actions: Object.freeze({})
  }),
  staging: Object.freeze({
    stage: 'staging',
    rewardSystemEnabled: true,
    telemetryEnabled: true,
    qaVisibilityEnabled: true,
    providerModeOverride: 'inherit',
    actions: Object.freeze({})
  }),
  soft_launch: Object.freeze({
    stage: 'soft_launch',
    rewardSystemEnabled: true,
    telemetryEnabled: true,
    qaVisibilityEnabled: false,
    providerModeOverride: 'inherit',
    actions: Object.freeze({
      [REWARD_ACTION_TYPES.FAST_FORWARD_EVENT]: Object.freeze({
        enabled: false
      }),
      [REWARD_ACTION_TYPES.EMERGENCY_SAVE]: Object.freeze({
        enabled: false
      })
    })
  }),
  production_candidate: Object.freeze({
    stage: 'production_candidate',
    rewardSystemEnabled: true,
    telemetryEnabled: true,
    qaVisibilityEnabled: false,
    providerModeOverride: 'inherit',
    actions: Object.freeze({})
  })
});

const REWARD_FEATURE_DEFAULTS = Object.freeze({
  rewardSystemEnabled: true,
  telemetryEnabled: true,
  qaVisibilityEnabled: false,
  providerModeOverride: 'inherit',
  rolloutStage: 'inherit',
  actions: Object.freeze({})
});

const REWARD_TELEMETRY_BUFFER_LIMIT = 40;

const REWARD_ACTION_PRESENTATION_CONFIG = Object.freeze({
  [REWARD_ACTION_TYPES.NIGHT_SHIFT]: Object.freeze({
    label: 'Night Shift',
    tone: 'utility',
    successToast: 'Night Shift aktiv · Tagesbeginn erreicht'
  }),
  [REWARD_ACTION_TYPES.TIME_SKIP_SHORT]: Object.freeze({
    label: '+1h Zeit',
    tone: 'utility',
    successToast: '+1h angewendet'
  }),
  [REWARD_ACTION_TYPES.TIME_SKIP_LONG]: Object.freeze({
    label: '+3h Zeit',
    tone: 'utility',
    successToast: '+3h angewendet'
  }),
  [REWARD_ACTION_TYPES.CARE_BOOST]: Object.freeze({
    label: 'Care Boost',
    tone: 'utility',
    successToast: 'Care Boost aktiv · Run stabilisiert'
  }),
  [REWARD_ACTION_TYPES.AUTO_CARE]: Object.freeze({
    label: 'Auto-Care',
    tone: 'utility',
    successToast: 'Auto-Care aktiv · 2h Betreuung laufen'
  }),
  [REWARD_ACTION_TYPES.FAST_FORWARD_EVENT]: Object.freeze({
    label: 'Event Fast Forward',
    tone: 'utility',
    successToast: 'Event Fast Forward aktiv'
  }),
  [REWARD_ACTION_TYPES.EVENT_START]: Object.freeze({
    label: 'Event Start',
    tone: 'utility',
    successToast: 'Event sofort gestartet'
  }),
  [REWARD_ACTION_TYPES.EVENT_REROLL]: Object.freeze({
    label: 'Event Reroll',
    tone: 'utility',
    successToast: 'Event neu gewürfelt'
  }),
  [REWARD_ACTION_TYPES.CLIMATE_STABILIZE]: Object.freeze({
    label: 'Climate Stabilize',
    tone: 'utility',
    successToast: 'Climate Stabilize aktiv · Klima beruhigt'
  }),
  [REWARD_ACTION_TYPES.GROWTH_BOOST]: Object.freeze({
    label: 'Growth Boost',
    tone: 'utility',
    successToast: 'Growth Boost aktiv · 2h Wachstumsschub laufen'
  }),
  [REWARD_ACTION_TYPES.EMERGENCY_SAVE]: Object.freeze({
    label: 'Notfallrettung',
    compactLabel: 'Notfallrettung',
    tone: 'emergency',
    showWhenUnavailableInHome: false,
    successToast: 'Notfallrettung aktiviert · Run gerettet'
  })
});

const rewardGrantRuntime = {
  pending: false,
  requestId: 0,
  actionType: '',
  mode: 'direct'
};
const rewardActionInFlight = new Set();

const rewardOpsRuntime = {
  telemetry: [],
  telemetrySeq: 0,
  lastProviderStatusKey: ''
};

function getRewardActionControlConfig(type) {
  const actionType = String(type || '').trim().toLowerCase();
  return REWARD_ACTION_CONTROL_CONFIG[actionType] || Object.freeze({ cooldownMs: 0 });
}

function getRewardActionExecutionPolicy(type) {
  const actionType = String(type || '').trim().toLowerCase();
  return String(REWARD_ACTION_EXECUTION_POLICY[actionType] || 'rewarded_preferred');
}

function getRewardActionBalanceProfile(type) {
  const actionType = String(type || '').trim().toLowerCase();
  return REWARD_ACTION_BALANCE_PROFILE[actionType] || Object.freeze({
    role: 'utility',
    valueTier: 'medium',
    cadence: 'moderate',
    rolloutStage: 'soft_launch'
  });
}

function getRewardFeatureStorageKey() {
  return 'gs_reward_feature_flags';
}

function normalizeRewardFeatureBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'on') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'off') {
      return false;
    }
  }
  return fallback;
}

function normalizeRewardPolicyOverride(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (
    normalized === 'inherit'
    || normalized === 'direct'
    || normalized === 'rewarded_preferred'
    || normalized === 'rewarded_required'
  ) {
    return normalized;
  }
  return 'inherit';
}

function normalizeRewardProviderModeOverride(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (
    normalized === 'inherit'
    || normalized === 'direct'
    || normalized === 'debug_rewarded'
    || normalized === 'provider_rewarded'
  ) {
    return normalized;
  }
  return 'inherit';
}

function normalizeRewardRolloutStage(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (
    normalized === 'inherit'
    || normalized === 'local'
    || normalized === 'staging'
    || normalized === 'soft_launch'
    || normalized === 'production_candidate'
  ) {
    return normalized;
  }
  return 'inherit';
}

function detectRewardEnvironmentName() {
  const explicit = String(window.__GROWSIM_ENV__ || (window.GrowSimBuild && window.GrowSimBuild.environment) || '').trim().toLowerCase();
  if (explicit === 'local' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }
  const hostname = String(window.location && window.location.hostname || '').trim().toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
    return 'local';
  }
  if (
    hostname.includes('staging')
    || hostname.includes('preview')
    || hostname.includes('test')
    || hostname.includes('qa')
    || hostname.includes('dev')
  ) {
    return 'staging';
  }
  return 'production';
}

function getDefaultRewardRolloutStage(environment = detectRewardEnvironmentName()) {
  const env = String(environment || '').trim().toLowerCase();
  if (env === 'local') {
    return 'local';
  }
  if (env === 'staging') {
    return 'staging';
  }
  return 'soft_launch';
}

function getRewardRolloutPreset(stage) {
  const normalizedStage = normalizeRewardRolloutStage(stage);
  const presetKey = normalizedStage === 'inherit' ? getDefaultRewardRolloutStage() : normalizedStage;
  return REWARD_ROLLOUT_PRESETS[presetKey] || REWARD_ROLLOUT_PRESETS.soft_launch;
}

function readRewardFeatureConfigOverride() {
  try {
    if (typeof localStorage === 'undefined') {
      return {};
    }
    const raw = localStorage.getItem(getRewardFeatureStorageKey());
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

const coinUiRuntime = {
  pendingActionId: '',
  pendingPackId: '',
  statusMessage: '',
  statusTone: 'info',
  renderRetryQueued: false,
  insufficientFlow: {
    requiredCoins: 0,
    currentCoins: 0,
    missingCoins: 0,
    actionType: '',
    source: '',
    statusMessage: '',
    openedAtMs: 0,
    requestSignature: '',
    inFlight: false,
    rewardedPending: false
  }
};

function setCoinShopStatusMessage(message, tone = 'info') {
  coinUiRuntime.statusMessage = String(message || '').trim();
  coinUiRuntime.statusTone = String(tone || 'info');
}

function resolveInsufficientCoinsRewardedOption() {
  const providerStatus = getRewardProviderStatus(state);
  const requestFn = providerStatus && typeof providerStatus.requestFn === 'function' ? providerStatus.requestFn : null;
  const canUse = Boolean(providerStatus && providerStatus.canRequestReward && requestFn);
  return {
    available: canUse,
    requestFn,
    providerMode: providerStatus && providerStatus.mode ? String(providerStatus.mode) : 'direct',
    providerState: providerStatus && providerStatus.state ? String(providerStatus.state) : 'unavailable'
  };
}

function openInsufficientCoinsFlow(details = {}) {
  const safeDetails = details && typeof details === 'object' ? details : {};
  const requiredCoins = Math.max(0, Math.trunc(Number(safeDetails.requiredCoins) || 0));
  const currentCoins = Math.max(0, Math.trunc(Number(safeDetails.currentCoins) || getCoins()));
  const missingCoins = Math.max(0, requiredCoins - currentCoins);
  const actionType = String(safeDetails.actionType || '').trim();
  const source = String(safeDetails.source || 'runtime').trim() || 'runtime';
  const nowMs = Date.now();
  const requestSignature = `${actionType}:${requiredCoins}:${currentCoins}:${source}`;
  const flow = coinUiRuntime.insufficientFlow;
  const openedRecently = flow.requestSignature === requestSignature && (nowMs - Number(flow.openedAtMs || 0)) < 550;
  if (state.ui.openSheet === 'insufficientCoins' && (flow.inFlight || openedRecently)) {
    return false;
  }

  flow.requiredCoins = requiredCoins;
  flow.currentCoins = currentCoins;
  flow.missingCoins = missingCoins;
  flow.actionType = actionType;
  flow.source = source;
  flow.statusMessage = i18nT('shop.insufficient_hint');
  flow.openedAtMs = nowMs;
  flow.requestSignature = requestSignature;
  flow.inFlight = true;
  flow.rewardedPending = false;

  openSheet('insufficientCoins');
  setTimeout(() => {
    coinUiRuntime.insufficientFlow.inFlight = false;
    if (state.ui.openSheet === 'insufficientCoins') {
      renderInsufficientCoinsSheet(true);
    }
  }, 220);
  return true;
}

function onInsufficientCoinsOpenShopClick() {
  const flow = coinUiRuntime.insufficientFlow;
  if (flow.inFlight) {
    return;
  }
  flow.statusMessage = i18nT('status.loading');
  setCoinShopStatusMessage(i18nT('shop.status_not_enough'), 'info');
  renderInsufficientCoinsSheet(true);
  openSheet('coinShop');
}

async function onInsufficientCoinsRewardedClick() {
  const flow = coinUiRuntime.insufficientFlow;
  if (flow.rewardedPending || flow.inFlight) {
    return;
  }
  const rewardedOption = resolveInsufficientCoinsRewardedOption();
  if (!rewardedOption.available || typeof rewardedOption.requestFn !== 'function') {
    flow.statusMessage = i18nT('shop.status_not_available');
    renderInsufficientCoinsSheet(true);
    if (typeof showRetentionToast === 'function') {
      showRetentionToast('Rewarded aktuell nicht verfügbar');
    }
    return;
  }

  flow.rewardedPending = true;
  flow.statusMessage = i18nT('status.loading');
  renderInsufficientCoinsSheet(true);
  let rewardedResult = null;
  try {
    rewardedResult = await rewardedOption.requestFn('insufficient_coins_topup', {
      source: 'insufficient_coins_sheet',
      actionType: flow.actionType,
      requiredCoins: flow.requiredCoins,
      missingCoins: flow.missingCoins
    });
  } catch (_error) {
    rewardedResult = { ok: false, reason: 'reward_error' };
  } finally {
    flow.rewardedPending = false;
  }

  if (!rewardedResult || !rewardedResult.ok) {
    flow.statusMessage = i18nT('shop.status_action_failed');
    renderInsufficientCoinsSheet(true);
    if (typeof showRetentionToast === 'function') {
      showRetentionToast('Rewarded nicht abgeschlossen');
    }
    return;
  }

  const targetTopup = Math.max(50, Math.min(200, Math.max(flow.missingCoins, 80)));
  const rewardAmount = Math.max(50, Math.trunc(Number(rewardedResult.coins) || targetTopup));
  const dedupKey = `insufficient_rewarded:${String(rewardedResult.grantedAtMs || Date.now())}:${String(flow.actionType || 'action')}`;
  const grantResult = grantCoins(rewardAmount, 'insufficient_rewarded_topup', dedupKey);
  if (!grantResult.ok) {
    flow.statusMessage = i18nT('status.saved');
    renderInsufficientCoinsSheet(true);
    return;
  }
  flow.currentCoins = grantResult.coins;
  flow.missingCoins = Math.max(0, flow.requiredCoins - flow.currentCoins);
  flow.statusMessage = `+${formatCompactNumber(rewardAmount)} ${i18nT('status.saved')}`;
  renderInsufficientCoinsSheet(true);
  if (typeof showRetentionToast === 'function') {
    showRetentionToast(`Rewarded Bonus · +${rewardAmount} Coins`);
  }
}

function renderInsufficientCoinsSheet(force = false) {
  const sheetNode = uiNode('insufficientCoinsSheet', 'insufficientCoinsSheet');
  if (!sheetNode || (!force && state.ui.openSheet !== 'insufficientCoins')) {
    return;
  }
  const hintNode = uiNode('insufficientCoinsHintText', 'insufficientCoinsHintText');
  const currentNode = uiNode('insufficientCoinsCurrentValue', 'insufficientCoinsCurrentValue');
  const requiredNode = uiNode('insufficientCoinsRequiredValue', 'insufficientCoinsRequiredValue');
  const missingNode = uiNode('insufficientCoinsMissingValue', 'insufficientCoinsMissingValue');
  const openShopBtn = uiNode('insufficientCoinsOpenShopBtn', 'insufficientCoinsOpenShopBtn');
  const rewardedBtn = uiNode('insufficientCoinsRewardedBtn', 'insufficientCoinsRewardedBtn');
  const cancelBtn = uiNode('insufficientCoinsCancelBtn', 'insufficientCoinsCancelBtn');
  if (!hintNode || !currentNode || !requiredNode || !missingNode || !openShopBtn || !rewardedBtn || !cancelBtn) {
    return;
  }

  const flow = coinUiRuntime.insufficientFlow;
  const currentCoins = getCoins();
  flow.currentCoins = currentCoins;
  flow.missingCoins = Math.max(0, flow.requiredCoins - currentCoins);
  const rewardedOption = resolveInsufficientCoinsRewardedOption();

  hintNode.textContent = flow.statusMessage || i18nT('shop.insufficient_hint');
  currentNode.textContent = `${formatCompactNumber(currentCoins)} C`;
  requiredNode.textContent = `${formatCompactNumber(flow.requiredCoins)} C`;
  missingNode.textContent = `${formatCompactNumber(flow.missingCoins)} C`;

  openShopBtn.disabled = flow.inFlight || flow.rewardedPending;
  cancelBtn.disabled = flow.inFlight || flow.rewardedPending;
  openShopBtn.onclick = () => onInsufficientCoinsOpenShopClick();
  cancelBtn.onclick = () => closeSheet();

  const showRewarded = rewardedOption.available;
  rewardedBtn.classList.toggle('hidden', !showRewarded);
  rewardedBtn.setAttribute('aria-hidden', String(!showRewarded));
  rewardedBtn.disabled = !showRewarded || flow.rewardedPending || flow.inFlight;
  rewardedBtn.textContent = flow.rewardedPending ? i18nT('shop.watch_ad_running') : i18nT('shop.watch_ad');
  rewardedBtn.onclick = showRewarded ? (() => { void onInsufficientCoinsRewardedClick(); }) : null;
}

function getRewardLedger(snapshot = state) {
  const target = snapshot && typeof snapshot === 'object' ? snapshot : state;
  if (!target.meta || typeof target.meta !== 'object') {
    target.meta = {};
  }
  if (!target.meta.rewardLedger || typeof target.meta.rewardLedger !== 'object') {
    target.meta.rewardLedger = {};
  }
  return target.meta.rewardLedger;
}

function ensureCurrencyState(snapshot = state) {
  const target = snapshot && typeof snapshot === 'object' ? snapshot : state;
  if (!target.status || typeof target.status !== 'object') {
    target.status = {};
  }
  if (!Number.isFinite(Number(target.status.coins))) {
    target.status.coins = 0;
  }
  target.status.coins = Math.max(0, Math.trunc(Number(target.status.coins) || 0));
  delete target.status.gems;
  delete target.status.stars;

  const ledger = getRewardLedger(target);
  for (const key of Object.keys(ledger)) {
    if (!ledger[key] || typeof ledger[key] !== 'object') {
      delete ledger[key];
      continue;
    }
    ledger[key].grantedAtMs = Number.isFinite(Number(ledger[key].grantedAtMs)) ? Number(ledger[key].grantedAtMs) : 0;
    ledger[key].amount = Math.max(0, Math.trunc(Number(ledger[key].amount) || 0));
    ledger[key].reason = typeof ledger[key].reason === 'string' ? ledger[key].reason : '';
  }

  if (target.meta && typeof target.meta === 'object' && target.meta.inventory && typeof target.meta.inventory === 'object') {
    delete target.meta.inventory.gems;
    delete target.meta.inventory.stars;
    if (!Number.isFinite(Number(target.meta.inventory.coins))) {
      delete target.meta.inventory.coins;
    }
    if (!Object.keys(target.meta.inventory).length) {
      delete target.meta.inventory;
    }
  }

  return target.status;
}

function getCoins(snapshot = state) {
  const status = ensureCurrencyState(snapshot);
  return Math.max(0, Math.trunc(Number(status.coins) || 0));
}

function canAfford(amount, snapshot = state) {
  const safeAmount = Math.max(0, Math.trunc(Number(amount) || 0));
  return getCoins(snapshot) >= safeAmount;
}

function emitCoinTelemetry(event) {
  const safeEvent = event && typeof event === 'object' ? event : {};
  const history = getCanonicalHistory(state);
  history.telemetry = Array.isArray(history.telemetry) ? history.telemetry : [];
  history.telemetry.push({
    type: typeof safeEvent.type === 'string' ? safeEvent.type : 'coin_event',
    atMs: Number.isFinite(Number(safeEvent.atMs)) ? Number(safeEvent.atMs) : Date.now(),
    payload: safeEvent.payload && typeof safeEvent.payload === 'object' ? safeEvent.payload : {}
  });
  if (history.telemetry.length > MAX_HISTORY_LOG) {
    history.telemetry = history.telemetry.slice(-MAX_HISTORY_LOG);
  }
}

function grantCoins(amount, reason, dedupKey = '') {
  const safeAmount = Math.max(0, Math.trunc(Number(amount) || 0));
  const safeReason = String(reason || 'coin_grant').trim() || 'coin_grant';
  const safeDedupKey = String(dedupKey || '').trim();
  ensureCurrencyState(state);
  const ledger = getRewardLedger(state);
  if (safeDedupKey && ledger[safeDedupKey]) {
    return {
      ok: false,
      reason: 'duplicate',
      amount: 0,
      coins: getCoins(),
      dedupKey: safeDedupKey
    };
  }
  if (safeAmount <= 0) {
    return {
      ok: false,
      reason: 'invalid_amount',
      amount: 0,
      coins: getCoins(),
      dedupKey: safeDedupKey
    };
  }

  state.status.coins = getCoins() + safeAmount;
  if (safeDedupKey) {
    ledger[safeDedupKey] = {
      reason: safeReason,
      amount: safeAmount,
      grantedAtMs: Date.now()
    };
  }
  emitCoinTelemetry({
    type: 'coin_grant',
    payload: {
      amount: safeAmount,
      reason: safeReason,
      dedupKey: safeDedupKey,
      balance: getCoins()
    }
  });
  return {
    ok: true,
    reason: safeReason,
    amount: safeAmount,
    coins: getCoins(),
    dedupKey: safeDedupKey
  };
}

function spendCoins(amount, reason) {
  const safeAmount = Math.max(0, Math.trunc(Number(amount) || 0));
  const safeReason = String(reason || 'coin_spend').trim() || 'coin_spend';
  ensureCurrencyState(state);
  if (safeAmount <= 0) {
    return {
      ok: false,
      reason: 'invalid_amount',
      amount: 0,
      coins: getCoins()
    };
  }
  if (!canAfford(safeAmount)) {
    emitCoinTelemetry({
      type: 'coin_spend_blocked',
      payload: {
        amount: safeAmount,
        reason: safeReason,
        balance: getCoins()
      }
    });
    return {
      ok: false,
      reason: 'insufficient_coins',
      amount: safeAmount,
      coins: getCoins()
    };
  }
  state.status.coins = Math.max(0, getCoins() - safeAmount);
  emitCoinTelemetry({
    type: 'coin_spend',
    payload: {
      amount: safeAmount,
      reason: safeReason,
      balance: getCoins()
    }
  });
  return {
    ok: true,
    reason: safeReason,
    amount: safeAmount,
    coins: getCoins()
  };
}

function resolveCoinRewardAmount(rangeKey, signalValue = 0) {
  const range = COIN_EARN_RANGES[rangeKey];
  if (!range) {
    return 0;
  }
  const min = Math.max(0, Math.trunc(Number(range.min) || 0));
  const max = Math.max(min, Math.trunc(Number(range.max) || min));
  const normalizedSignal = clamp(Number(signalValue) || 0, 0, 1);
  return Math.round(min + ((max - min) * normalizedSignal));
}

function getEmergencySaveCoinCost(snapshot = state) {
  const availability = getEmergencySaveRewardAvailability(snapshot);
  if (!availability || !availability.ok) {
    return COIN_SPEND_COSTS[REWARD_ACTION_TYPES.EMERGENCY_SAVE];
  }
  const severity = clamp(Number(availability.score) || 0, 0, 1);
  return Math.round(150 + (severity * 150));
}

function getRewardActionCoinCost(type, snapshot = state) {
  const actionType = String(type || '').trim().toLowerCase();
  if (actionType === REWARD_ACTION_TYPES.EMERGENCY_SAVE) {
    return getEmergencySaveCoinCost(snapshot);
  }
  return Math.max(0, Math.trunc(Number(COIN_SPEND_COSTS[actionType]) || 0));
}

function grantLevelUpCoinsFromXpResult(xpResult, reason, dedupPrefix) {
  const previousLevel = Math.max(1, Math.trunc(Number(xpResult && xpResult.previousLevel) || 1));
  const nextLevel = Math.max(previousLevel, Math.trunc(Number(xpResult && xpResult.nextLevel) || previousLevel));
  let granted = 0;
  for (let level = previousLevel + 1; level <= nextLevel; level += 1) {
    const signal = clamp((level - 1) / 12, 0, 1);
    const amount = resolveCoinRewardAmount('level_up', signal);
    const grantResult = grantCoins(amount, reason || 'level_up', `${String(dedupPrefix || 'level_up')}:${level}`);
    if (grantResult.ok) {
      granted += amount;
    }
  }
  return granted;
}

window.ensureCurrencyState = ensureCurrencyState;
window.getCoins = getCoins;
window.canAfford = canAfford;
window.grantCoins = grantCoins;
window.spendCoins = spendCoins;
window.emitCoinTelemetry = emitCoinTelemetry;

function writeRewardFeatureConfigOverride(config) {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    localStorage.setItem(getRewardFeatureStorageKey(), JSON.stringify(config && typeof config === 'object' ? config : {}));
    return true;
  } catch (_error) {
    return false;
  }
}

function getRewardFeatureConfig() {
  const override = readRewardFeatureConfigOverride();
  const environment = detectRewardEnvironmentName();
  const rolloutStage = normalizeRewardRolloutStage(
    override.rolloutStage
    || readRewardDebugStorageValue('gs_reward_rollout_stage')
    || window.__GROWSIM_REWARD_ROLLOUT_STAGE__
    || getDefaultRewardRolloutStage(environment)
  );
  const preset = getRewardRolloutPreset(rolloutStage);
  const actionsOverride = override.actions && typeof override.actions === 'object' ? override.actions : {};
  const actionDefaults = {};
  for (const actionType of Object.values(REWARD_ACTION_TYPES)) {
    const presetAction = preset.actions && preset.actions[actionType] && typeof preset.actions[actionType] === 'object'
      ? preset.actions[actionType]
      : {};
    const rawAction = actionsOverride[actionType] && typeof actionsOverride[actionType] === 'object'
      ? actionsOverride[actionType]
      : {};
    actionDefaults[actionType] = {
      enabled: normalizeRewardFeatureBoolean(
        rawAction.enabled,
        normalizeRewardFeatureBoolean(presetAction.enabled, true)
      ),
      policyOverride: normalizeRewardPolicyOverride(rawAction.policyOverride || presetAction.policyOverride),
      debugVisibility: normalizeRewardFeatureBoolean(
        rawAction.debugVisibility,
        normalizeRewardFeatureBoolean(presetAction.debugVisibility, false)
      )
    };
  }
  return {
    environment,
    rolloutStage: rolloutStage === 'inherit' ? getDefaultRewardRolloutStage(environment) : rolloutStage,
    rewardSystemEnabled: normalizeRewardFeatureBoolean(override.rewardSystemEnabled, preset.rewardSystemEnabled),
    telemetryEnabled: normalizeRewardFeatureBoolean(override.telemetryEnabled, preset.telemetryEnabled),
    qaVisibilityEnabled: normalizeRewardFeatureBoolean(override.qaVisibilityEnabled, preset.qaVisibilityEnabled),
    providerModeOverride: normalizeRewardProviderModeOverride(override.providerModeOverride || preset.providerModeOverride),
    actions: actionDefaults
  };
}

function updateRewardFeatureConfigOverride(patch = {}) {
  const current = readRewardFeatureConfigOverride();
  const next = {
    ...current,
    ...(patch && typeof patch === 'object' ? patch : {})
  };
  const currentActions = current.actions && typeof current.actions === 'object' ? current.actions : {};
  const patchActions = patch && patch.actions && typeof patch.actions === 'object' ? patch.actions : {};
  next.actions = {
    ...currentActions
  };
  for (const [actionType, actionPatch] of Object.entries(patchActions)) {
    next.actions[actionType] = {
      ...(currentActions[actionType] && typeof currentActions[actionType] === 'object' ? currentActions[actionType] : {}),
      ...(actionPatch && typeof actionPatch === 'object' ? actionPatch : {})
    };
  }
  writeRewardFeatureConfigOverride(next);
  return getRewardFeatureConfig();
}

function clearRewardFeatureConfigOverride() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(getRewardFeatureStorageKey());
    }
  } catch (_error) {
    // ignore storage cleanup issues in debug-only path
  }
  return getRewardFeatureConfig();
}

function getRewardActionFeatureState(type) {
  const actionType = String(type || '').trim().toLowerCase();
  const config = getRewardFeatureConfig();
  const rawState = config.actions[actionType] && typeof config.actions[actionType] === 'object'
    ? config.actions[actionType]
    : {};
  return {
    enabled: rawState.enabled !== false,
    policyOverride: normalizeRewardPolicyOverride(rawState.policyOverride),
    debugVisibility: rawState.debugVisibility === true
  };
}

function getRewardRolloutState(type = '') {
  const config = getRewardFeatureConfig();
  const actionType = String(type || '').trim().toLowerCase();
  const balanceProfile = actionType ? getRewardActionBalanceProfile(actionType) : null;
  return {
    environment: String(config.environment || detectRewardEnvironmentName()),
    rolloutStage: String(config.rolloutStage || getDefaultRewardRolloutStage()),
    rewardSystemEnabled: config.rewardSystemEnabled !== false,
    telemetryEnabled: config.telemetryEnabled !== false,
    qaVisibilityEnabled: config.qaVisibilityEnabled === true,
    providerModeOverride: normalizeRewardProviderModeOverride(config.providerModeOverride),
    actionType,
    actionEnabled: actionType ? getRewardActionFeatureState(actionType).enabled : true,
    recommendedStage: balanceProfile ? String(balanceProfile.rolloutStage || '') : ''
  };
}

function isRewardActionEnabled(type) {
  const actionType = String(type || '').trim().toLowerCase();
  const rollout = getRewardRolloutState(actionType);
  if (!rollout.rewardSystemEnabled) {
    return false;
  }
  return getRewardActionFeatureState(actionType).enabled;
}

function getRewardActionRuntimePolicy(type) {
  const actionType = String(type || '').trim().toLowerCase();
  const featureState = getRewardActionFeatureState(actionType);
  if (featureState.policyOverride !== 'inherit') {
    return featureState.policyOverride;
  }
  return getRewardActionExecutionPolicy(actionType);
}

function isRewardTelemetryEnabled() {
  return getRewardFeatureConfig().telemetryEnabled !== false;
}

function isRewardQaVisibilityEnabled() {
  return getRewardFeatureConfig().qaVisibilityEnabled === true;
}

function summarizeRewardTelemetryResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }
  const summary = {
    ok: result.ok !== false,
    reason: String(result.reason || '')
  };
  if (Number.isFinite(Number(result.score))) {
    summary.score = round2(Number(result.score));
  }
  if (Number.isFinite(Number(result.remainingSimMs))) {
    summary.remainingSimMs = Math.max(0, Number(result.remainingSimMs));
  }
  if (result.mode) {
    summary.mode = String(result.mode);
  }
  return summary;
}

function recordRewardTelemetry(eventName, payload = {}) {
  if (!isRewardTelemetryEnabled()) {
    return null;
  }
  const actionType = String(payload.type || payload.actionType || '').trim().toLowerCase();
  const rolloutState = actionType ? getRewardRolloutState(actionType) : getRewardRolloutState();
  const controlConfig = actionType ? getRewardActionControlConfig(actionType) : { cooldownMs: 0 };
  const entry = {
    seq: ++rewardOpsRuntime.telemetrySeq,
    eventName: String(eventName || '').trim().toLowerCase() || 'reward_event',
    actionType,
    timestampMs: Math.max(0, Number(payload.timestampMs || payload.nowMs) || Date.now()),
    providerMode: String(payload.providerMode || payload.provider || payload.mode || ''),
    providerStatus: String(
      payload.providerStatus
      || (payload.providerState && payload.providerState.state)
      || ''
    ),
    policy: String(payload.policy || (actionType ? getRewardActionRuntimePolicy(actionType) : '')),
    rolloutStage: String(payload.rolloutStage || rolloutState.rolloutStage || ''),
    environment: String(payload.environment || rolloutState.environment || ''),
    featureEnabled: payload.featureEnabled !== undefined ? payload.featureEnabled === true : rolloutState.actionEnabled !== false,
    reason: String(payload.reason || ''),
    cooldownConfigMs: Math.max(0, Number(payload.cooldownConfigMs) || Number(controlConfig.cooldownMs) || 0),
    cooldownRemainingMs: Math.max(0, Number(payload.cooldownRemainingMs) || 0),
    availabilityReason: String(
      payload.availabilityReason
      || (payload.availability && payload.availability.reason)
      || ''
    ),
    result: summarizeRewardTelemetryResult(payload.result || payload.grantResult || null)
  };
  rewardOpsRuntime.telemetry.push(entry);
  if (rewardOpsRuntime.telemetry.length > REWARD_TELEMETRY_BUFFER_LIMIT) {
    rewardOpsRuntime.telemetry.splice(0, rewardOpsRuntime.telemetry.length - REWARD_TELEMETRY_BUFFER_LIMIT);
  }
  dispatchRewardActionHook('onRewardTelemetry', entry);
  return entry;
}

function getRewardTelemetryEntries(limit = REWARD_TELEMETRY_BUFFER_LIMIT) {
  const maxItems = clampInt(Number(limit) || REWARD_TELEMETRY_BUFFER_LIMIT, 1, REWARD_TELEMETRY_BUFFER_LIMIT);
  return rewardOpsRuntime.telemetry.slice(-maxItems).map((entry) => ({ ...entry }));
}

function clearRewardTelemetryEntries() {
  rewardOpsRuntime.telemetry = [];
  rewardOpsRuntime.telemetrySeq = 0;
}

function buildRewardDebugSummary() {
  const providerStatus = getRewardProviderStatus(state);
  const actionSummaries = Object.values(REWARD_ACTION_TYPES).map((actionType) => {
    const presentation = getRewardActionPresentation(actionType, { context: 'debug' });
    const featureState = getRewardActionFeatureState(actionType);
    const balanceProfile = getRewardActionBalanceProfile(actionType);
    const controlConfig = getRewardActionControlConfig(actionType);
    const usageRecord = ensureRewardActionUsageRecord(actionType, state);
    const cooldownRemainingMs = getRewardActionCooldownRemaining(actionType, state, Date.now());
    return {
      type: actionType,
      enabled: featureState.enabled,
      policy: getRewardActionRuntimePolicy(actionType),
      role: String(balanceProfile.role || ''),
      valueTier: String(balanceProfile.valueTier || ''),
      cadence: String(balanceProfile.cadence || ''),
      rolloutStage: String(balanceProfile.rolloutStage || ''),
      debugVisibility: featureState.debugVisibility,
      disabled: presentation.disabled,
      hidden: presentation.hidden,
      reason: presentation.reason,
      cooldownMs: Math.max(0, Number(controlConfig.cooldownMs) || 0),
      cooldownRemainingMs,
      sessionUses: Math.max(0, Number(usageRecord.sessionUses) || 0),
      lifetimeUses: Math.max(0, Number(usageRecord.lifetimeUses) || 0)
    };
  });

  return {
    qaVisibilityEnabled: isRewardQaVisibilityEnabled(),
    provider: {
      mode: providerStatus.mode,
      state: providerStatus.state,
      available: providerStatus.available,
      reason: providerStatus.reason,
      lastError: String(providerStatus.lastError || ''),
      hasClientConfig: providerStatus.hasClientConfig === true,
      hasRewardedSlot: providerStatus.hasRewardedSlot === true,
      requestPending: providerStatus.requestPending === true,
      environment: String(providerStatus.environment || ''),
      configSource: String(providerStatus.configSource || ''),
      configEnabled: providerStatus.configEnabled === true,
      validation: providerStatus.validation && typeof providerStatus.validation === 'object'
        ? {
          ok: providerStatus.validation.ok !== false,
          primaryReason: String(providerStatus.validation.primaryReason || ''),
          issueCount: Array.isArray(providerStatus.validation.issues) ? providerStatus.validation.issues.length : 0
        }
        : null
    },
    pending: {
      active: rewardGrantRuntime.pending,
      actionType: rewardGrantRuntime.actionType,
      mode: rewardGrantRuntime.mode,
      requestId: rewardGrantRuntime.requestId
    },
    rollout: getRewardRolloutState(),
    balanceSnapshot: actionSummaries.map((entry) => ({
      type: entry.type,
      enabled: entry.enabled,
      policy: entry.policy,
      role: entry.role,
      valueTier: entry.valueTier,
      cooldownMs: entry.cooldownMs,
      cooldownRemainingMs: entry.cooldownRemainingMs,
      sessionUses: entry.sessionUses
    })),
    actions: actionSummaries,
    telemetry: getRewardTelemetryEntries(10)
  };
}

function readRewardDebugStorageValue(key) {
  try {
    if (typeof localStorage === 'undefined') {
      return '';
    }
    return String(localStorage.getItem(key) || '').trim();
  } catch (_error) {
    return '';
  }
}

function getRewardProviderMode(snapshot = state) {
  const runtime = ensureRewardActionRuntime(snapshot);
  const featureConfig = getRewardFeatureConfig();
  if (featureConfig.providerModeOverride !== 'inherit') {
    return featureConfig.providerModeOverride;
  }
  const explicitMode = readRewardDebugStorageValue('gs_reward_provider_mode');
  if (explicitMode === 'direct' || explicitMode === 'debug_rewarded' || explicitMode === 'provider_rewarded') {
    return explicitMode;
  }
  if (typeof window !== 'undefined' && window.__GROWSIM_DEBUG_REWARDED__ === true) {
    return 'debug_rewarded';
  }
  const providerMode = String(runtime.provider || '').trim().toLowerCase();
  if (providerMode === 'debug_rewarded' || providerMode === 'provider_rewarded' || providerMode === 'direct') {
    return providerMode;
  }
  return 'direct';
}

function getRewardProvider() {
  if (typeof window === 'undefined') {
    return null;
  }
  const directProvider = window.GrowSimRewardProvider;
  if (directProvider && typeof directProvider === 'object') {
    return directProvider;
  }
  const rewardedProvider = window.GrowSimRewardedProvider;
  if (rewardedProvider && typeof rewardedProvider === 'object') {
    return rewardedProvider;
  }
  return null;
}

function getRewardProviderStatus(snapshot = state) {
  const mode = getRewardProviderMode(snapshot);
  rewardGrantRuntime.mode = mode;
  let status;
  if (mode === 'direct') {
    status = {
      mode,
      state: 'direct',
      available: true,
      canRequestReward: false,
      reason: 'direct_mode'
    };
  } else if (mode === 'debug_rewarded') {
    status = {
      mode,
      state: 'debug',
      available: true,
      canRequestReward: true,
      reason: 'debug_rewarded'
    };
  } else {
    const provider = getRewardProvider();
    if (!provider) {
      status = {
        mode,
        state: 'unavailable',
        available: false,
        canRequestReward: false,
        reason: 'provider_unavailable'
      };
    } else {
      let providerSnapshot = {};
      if (typeof provider.getStatus === 'function') {
        try {
          providerSnapshot = provider.getStatus(snapshot) || {};
        } catch (_error) {
          providerSnapshot = {
            state: 'error',
            reason: 'provider_error',
            available: false,
            canRequestReward: false
          };
        }
      }
      const shouldInitProvider = providerSnapshot.hasClientConfig === true
        && providerSnapshot.initialized !== true
        && typeof provider.init === 'function';
      if (shouldInitProvider) {
        try {
          provider.init();
        } catch (_error) {
          // status mapping below keeps the provider non-blocking even if init throws synchronously
        }
        providerSnapshot = {
          ...providerSnapshot,
          state: 'initializing',
          reason: 'provider_initializing',
          available: false,
          canRequestReward: false
        };
      }
      const requestFn = (
        typeof provider.requestRewardGrant === 'function'
          ? provider.requestRewardGrant
          : (typeof provider.requestRewardedGrant === 'function'
            ? provider.requestRewardedGrant
            : null)
      );
      const providerState = String(providerSnapshot.state || (requestFn ? 'ready' : 'unavailable') || 'unavailable');
      const providerReason = String(
        providerSnapshot.reason
        || (providerState === 'ready' ? 'provider_ready' : (providerState === 'initializing' ? 'provider_initializing' : 'provider_unavailable'))
      );
      const canRequestReward = requestFn && providerSnapshot.canRequestReward !== false && providerState === 'ready';
      const isAvailable = Boolean(requestFn) && providerSnapshot.available !== false && providerState === 'ready';
      status = {
        mode,
        state: providerState,
        available: isAvailable,
        canRequestReward,
        provider,
        requestFn: canRequestReward ? requestFn : null,
        providerName: String(providerSnapshot.name || provider.name || provider.id || 'reward_provider'),
        reason: providerReason,
        lastError: String(providerSnapshot.lastError || ''),
        hasClientConfig: providerSnapshot.hasClientConfig === true,
        hasRewardedSlot: providerSnapshot.hasRewardedSlot === true,
        requestPending: providerSnapshot.requestPending === true,
        environment: String(providerSnapshot.environment || ''),
        configSource: String(providerSnapshot.configSource || ''),
        configEnabled: providerSnapshot.configEnabled === true,
        configSummary: providerSnapshot.configSummary && typeof providerSnapshot.configSummary === 'object'
          ? providerSnapshot.configSummary
          : null,
        validation: providerSnapshot.validation && typeof providerSnapshot.validation === 'object'
          ? providerSnapshot.validation
          : null
      };
    }
  }
  const statusKey = `${String(status.mode || '')}:${String(status.state || '')}:${String(status.reason || '')}`;
  if (rewardOpsRuntime.lastProviderStatusKey !== statusKey) {
    rewardOpsRuntime.lastProviderStatusKey = statusKey;
    recordRewardTelemetry('reward_provider_status_changed', {
      providerMode: String(status.mode || ''),
      providerStatus: String(status.state || ''),
      reason: String(status.reason || ''),
      timestampMs: Date.now()
    });
  }
  return status;
}

function isRewardProviderAvailable(snapshot = state) {
  const status = getRewardProviderStatus(snapshot);
  return Boolean(status.available);
}

function getRewardDebugGrantConfig() {
  const forcedResult = (() => {
    const fromWindow = typeof window !== 'undefined' ? String(window.__GROWSIM_DEBUG_REWARDED_RESULT__ || '').trim().toLowerCase() : '';
    const fromStorage = readRewardDebugStorageValue('gs_reward_debug_result').toLowerCase();
    const candidate = fromWindow || fromStorage;
    return candidate === 'cancel' || candidate === 'error' || candidate === 'success' ? candidate : 'success';
  })();
  const delayMs = (() => {
    const fromWindow = typeof window !== 'undefined' ? Number(window.__GROWSIM_DEBUG_REWARDED_DELAY_MS__) : NaN;
    const fromStorage = Number(readRewardDebugStorageValue('gs_reward_debug_delay_ms'));
    const candidate = Number.isFinite(fromWindow) ? fromWindow : fromStorage;
    return clampInt(Number.isFinite(candidate) ? candidate : 420, 0, 5000);
  })();
  return {
    result: forcedResult,
    delayMs
  };
}

function simulateRewardGrant(type, payload = {}, options = {}) {
  const debugConfig = getRewardDebugGrantConfig();
  const actionType = String(type || '').trim().toLowerCase();
  recordRewardTelemetry('reward_debug_simulated', {
    type: actionType,
    providerMode: 'debug_rewarded',
    providerStatus: 'debug',
    reason: debugConfig.result,
    timestampMs: Date.now()
  });
  return new Promise((resolve) => {
    window.setTimeout(() => {
      if (debugConfig.result === 'cancel') {
        resolve({
          ok: false,
          reason: 'reward_cancelled',
          mode: 'debug_rewarded',
          type: actionType
        });
        return;
      }
      if (debugConfig.result === 'error') {
        resolve({
          ok: false,
          reason: 'reward_error',
          mode: 'debug_rewarded',
          type: actionType
        });
        return;
      }
      resolve({
        ok: true,
        reason: 'reward_granted',
        mode: 'debug_rewarded',
        type: actionType,
        grantedAtMs: Date.now(),
        payload,
        options
      });
    }, debugConfig.delayMs);
  });
}

function getRewardActionGrantState(type, payload = {}) {
  const actionType = String(type || '').trim().toLowerCase();
  const snapshot = payload && payload.state ? payload.state : state;
  if (!getRewardRolloutState(actionType).rewardSystemEnabled) {
    return {
      ok: false,
      actionType,
      policy: getRewardActionRuntimePolicy(actionType),
      grantMode: 'direct',
      providerStatus: getRewardProviderStatus(snapshot),
      reason: 'reward_system_disabled',
      hint: 'Reward-Utilities sind aktuell deaktiviert.'
    };
  }
  if (!isRewardActionEnabled(actionType)) {
    return {
      ok: false,
      actionType,
      policy: getRewardActionRuntimePolicy(actionType),
      grantMode: 'direct',
      providerStatus: getRewardProviderStatus(snapshot),
      reason: 'reward_action_disabled',
      hint: 'Diese Utility ist aktuell deaktiviert.'
    };
  }
  const providerStatus = getRewardProviderStatus(snapshot);
  const policy = getRewardActionRuntimePolicy(actionType);
  const rewardText = getMenuUiTextBundle() && getMenuUiTextBundle().reward ? getMenuUiTextBundle().reward : null;
  const pendingSameAction = rewardGrantRuntime.pending && rewardGrantRuntime.actionType === actionType;
  if (rewardGrantRuntime.pending && !pendingSameAction) {
    return {
      ok: false,
      actionType,
      policy,
      grantMode: providerStatus.mode === 'direct' ? 'direct' : providerStatus.mode,
      providerStatus,
      reason: 'reward_pending',
      hint: 'Eine Reward-Aktion wird gerade verarbeitet.'
    };
  }
  if (policy === 'direct') {
    return {
      ok: true,
      actionType,
      policy,
      grantMode: 'direct',
      providerStatus,
      reason: 'direct_mode',
      hint: ''
    };
  }
  if (providerStatus.mode === 'direct') {
    return {
      ok: true,
      actionType,
      policy,
      grantMode: 'direct',
      providerStatus,
      reason: 'direct_mode',
      hint: policy === 'rewarded_required'
        ? (rewardText ? rewardText.direct : 'Lokaler Direct-Modus aktiv. Reward wird ohne Provider simuliert.')
        : ''
    };
  }
  if (providerStatus.mode === 'debug_rewarded') {
    return {
      ok: true,
      actionType,
      policy,
      grantMode: 'debug_rewarded',
      providerStatus,
      reason: 'debug_rewarded',
      hint: rewardText ? rewardText.debug : 'Debug-Reward aktiv.'
    };
  }
  if (providerStatus.state === 'initializing') {
    return {
      ok: false,
      actionType,
      policy,
      grantMode: 'provider_rewarded',
      providerStatus,
      reason: 'provider_initializing',
      hint: rewardText ? rewardText.preparing : 'Rewarded wird gerade vorbereitet.'
    };
  }
  if (providerStatus.state === 'error') {
    return {
      ok: false,
      actionType,
      policy,
      grantMode: 'provider_rewarded',
      providerStatus,
      reason: 'provider_error',
      hint: rewardText ? rewardText.error : 'Rewarded ist aktuell technisch nicht bereit.'
    };
  }
  if (!providerStatus.available) {
    return {
      ok: false,
      actionType,
      policy,
      grantMode: 'provider_rewarded',
      providerStatus,
      reason: 'provider_unavailable',
      hint: rewardText ? rewardText.unavailable : 'Rewarded ist gerade nicht verfuegbar.'
    };
  }
  return {
    ok: true,
    actionType,
    policy,
    grantMode: 'provider_rewarded',
    providerStatus,
    reason: 'provider_ready',
    hint: ''
  };
}

async function requestRewardGrant(type, payload = {}, options = {}) {
  const actionType = String(type || '').trim().toLowerCase();
  const gateState = options.gateState && typeof options.gateState === 'object'
    ? options.gateState
    : getRewardActionGrantState(actionType, payload);

  if (!gateState.ok) {
    return {
      ok: false,
      type: actionType,
      reason: String(gateState.reason || 'provider_unavailable'),
      mode: String(gateState.grantMode || gateState.providerStatus && gateState.providerStatus.mode || 'direct')
    };
  }

  if (gateState.grantMode === 'direct') {
    return {
      ok: true,
      type: actionType,
      reason: 'reward_granted',
      mode: 'direct',
      grantedAtMs: Date.now()
    };
  }

  if (gateState.grantMode === 'debug_rewarded') {
    return simulateRewardGrant(actionType, payload, options);
  }

  const providerStatus = gateState.providerStatus || getRewardProviderStatus(state);
  const requestFn = providerStatus.requestFn;
  const provider = providerStatus.provider;
  if (typeof requestFn !== 'function') {
    return {
      ok: false,
      type: actionType,
      reason: String(providerStatus.reason || 'provider_unavailable'),
      mode: 'provider_rewarded'
    };
  }

  try {
    const providerResult = await requestFn.call(provider, {
      type: actionType,
      payload,
      options
    });
    const normalized = providerResult && typeof providerResult === 'object' ? providerResult : {};
    if (normalized.ok === false) {
      return {
        ok: false,
        type: actionType,
        reason: String(normalized.reason || providerStatus.reason || 'reward_error'),
        mode: 'provider_rewarded',
        providerName: providerStatus.providerName || ''
      };
    }
    return {
      ok: true,
      type: actionType,
      reason: 'reward_granted',
      mode: 'provider_rewarded',
      providerName: providerStatus.providerName || '',
      grantedAtMs: Date.now()
    };
  } catch (_error) {
    return {
      ok: false,
      type: actionType,
      reason: 'reward_error',
      mode: 'provider_rewarded',
      providerName: providerStatus.providerName || ''
    };
  }
}

window.GrowSimRewardBridge = window.GrowSimRewardBridge || Object.freeze({
  getMode: () => getRewardProviderMode(state),
  getStatus: () => getRewardProviderStatus(state),
  isAvailable: () => isRewardProviderAvailable(state),
  initProvider: () => {
    const provider = getRewardProvider();
    if (provider && typeof provider.init === 'function') {
      return provider.init();
    }
    return Promise.resolve(getRewardProviderStatus(state));
  },
  requestGrant: (type, payload = {}, options = {}) => requestRewardGrant(type, payload, options),
  simulateGrant: (type, payload = {}, options = {}) => simulateRewardGrant(type, payload, options)
});

function maybeInitRewardProviderRuntime() {
  if (getRewardProviderMode(state) !== 'provider_rewarded') {
    return;
  }
  const provider = getRewardProvider();
  if (!provider || typeof provider.init !== 'function') {
    return;
  }
  try {
    provider.init();
  } catch (_error) {
    // Provider init remains best-effort and must never block boot.
  }
}

window.setTimeout(maybeInitRewardProviderRuntime, 0);

window.GrowSimRewardDebug = window.GrowSimRewardDebug || Object.freeze({
  getSummary: () => buildRewardDebugSummary(),
  getTelemetry: (limit = 20) => getRewardTelemetryEntries(limit),
  clearTelemetry: () => clearRewardTelemetryEntries(),
  getFlags: () => getRewardFeatureConfig(),
  setFlags: (patch = {}) => updateRewardFeatureConfigOverride(patch),
  clearFlags: () => clearRewardFeatureConfigOverride()
});

function ensureRewardActionUsageRecord(type, snapshot = state) {
  const actionType = String(type || '').trim().toLowerCase();
  const runtime = ensureRewardActionRuntime(snapshot);
  if (!runtime.byType[actionType] || typeof runtime.byType[actionType] !== 'object') {
    runtime.byType[actionType] = {};
  }
  const record = runtime.byType[actionType];
  if (!Number.isFinite(Number(record.lastTriggeredAtMs))) {
    record.lastTriggeredAtMs = 0;
  }
  if (!Number.isFinite(Number(record.lastGrantedAtMs))) {
    record.lastGrantedAtMs = 0;
  }
  if (!Number.isFinite(Number(record.lastExecutedAtMs))) {
    record.lastExecutedAtMs = 0;
  }
  if (!Number.isFinite(Number(record.lastUsedAtMs))) {
    record.lastUsedAtMs = 0;
  }
  if (!Number.isFinite(Number(record.lastRejectedAtMs))) {
    record.lastRejectedAtMs = 0;
  }
  if (!Number.isFinite(Number(record.sessionUses))) {
    record.sessionUses = 0;
  }
  if (!Number.isFinite(Number(record.lifetimeUses))) {
    record.lifetimeUses = 0;
  }
  if (typeof record.lastResult !== 'string') {
    record.lastResult = '';
  }
  if (typeof record.lastRejectedReason !== 'string') {
    record.lastRejectedReason = '';
  }
  return record;
}

function getRewardActionCooldownRemaining(type, snapshot = state, nowMs = Date.now()) {
  const actionType = String(type || '').trim().toLowerCase();
  const cooldownMs = Math.max(0, Number(getRewardActionControlConfig(actionType).cooldownMs) || 0);
  if (cooldownMs <= 0) {
    return 0;
  }
  const runtime = ensureRewardActionRuntime(snapshot);
  const rawRecord = runtime.byType && runtime.byType[actionType] && typeof runtime.byType[actionType] === 'object'
    ? runtime.byType[actionType]
    : null;
  const lastUsedAtMs = Math.max(
    Number(rawRecord && rawRecord.lastUsedAtMs) || 0,
    Number(rawRecord && rawRecord.lastExecutedAtMs) || 0
  );
  if (lastUsedAtMs <= 0) {
    return 0;
  }
  return Math.max(0, (lastUsedAtMs + cooldownMs) - Math.max(0, Number(nowMs) || 0));
}

function formatRewardCooldownHint(cooldownRemainingMs) {
  const remainingMs = Math.max(0, Number(cooldownRemainingMs) || 0);
  if (remainingMs <= 0) {
    return '';
  }
  if (remainingMs >= 60000) {
    return `In ${Math.max(1, Math.ceil(remainingMs / 60000))} Min wieder bereit.`;
  }
  return `In ${Math.max(1, Math.ceil(remainingMs / 1000))} Sek wieder bereit.`;
}

function dispatchRewardActionHook(hookName, payload = {}) {
  const hooks = window.GrowSimRewardHooks;
  const handler = hooks && typeof hooks === 'object' ? hooks[hookName] : null;
  if (typeof handler !== 'function') {
    return;
  }
  try {
    handler(payload);
  } catch (error) {
    console.warn(`[reward-hook] ${hookName} failed`, error);
  }
}

function onRewardActionTriggered(type, payload = {}) {
  const normalizedPayload = {
    type: String(type || '').trim().toLowerCase(),
    ...payload
  };
  recordRewardTelemetry('reward_triggered', normalizedPayload);
  dispatchRewardActionHook('onRewardActionTriggered', normalizedPayload);
}

function onRewardActionGranted(type, payload = {}) {
  const normalizedPayload = {
    type: String(type || '').trim().toLowerCase(),
    ...payload
  };
  recordRewardTelemetry('reward_granted', normalizedPayload);
  dispatchRewardActionHook('onRewardActionGranted', normalizedPayload);
}

function onRewardActionExecuted(type, payload = {}) {
  const normalizedPayload = {
    type: String(type || '').trim().toLowerCase(),
    ...payload
  };
  recordRewardTelemetry('reward_executed', normalizedPayload);
  dispatchRewardActionHook('onRewardActionExecuted', normalizedPayload);
}

function onRewardActionRejected(type, payload = {}) {
  const normalizedPayload = {
    type: String(type || '').trim().toLowerCase(),
    ...payload
  };
  recordRewardTelemetry('reward_rejected', normalizedPayload);
  dispatchRewardActionHook('onRewardActionRejected', normalizedPayload);
}

function markRewardActionUsed(type, meta = {}) {
  const actionType = String(type || '').trim().toLowerCase();
  const runtime = ensureRewardActionRuntime(state);
  const record = ensureRewardActionUsageRecord(actionType, state);
  const nowMs = Math.max(0, Number(meta.nowMs) || Date.now());
  const result = meta.result && typeof meta.result === 'object' ? meta.result : null;

  if (Boolean(meta.triggered)) {
    runtime.lastTriggeredAtMs = nowMs;
    record.lastTriggeredAtMs = nowMs;
  }
  if (Boolean(meta.granted)) {
    runtime.lastGrantedAtMs = nowMs;
    record.lastGrantedAtMs = nowMs;
  }
  if (Boolean(meta.executed)) {
    runtime.lastExecutedAtMs = nowMs;
    record.lastExecutedAtMs = nowMs;
    record.lastUsedAtMs = nowMs;
    record.sessionUses = Math.max(0, Math.trunc(Number(record.sessionUses) || 0)) + 1;
    record.lifetimeUses = Math.max(0, Math.trunc(Number(record.lifetimeUses) || 0)) + 1;
  }
  if (Boolean(meta.rejected)) {
    record.lastRejectedAtMs = nowMs;
    record.lastRejectedReason = String(meta.reason || (result && result.reason) || 'rejected');
  }
  if (typeof meta.lastResult === 'string' && meta.lastResult.trim()) {
    record.lastResult = meta.lastResult.trim();
  } else if (result) {
    record.lastResult = result.ok ? 'ok' : String(result.reason || 'failed');
  }
  return record;
}

function getRewardActionPresentationConfig(type) {
  const actionType = String(type || '').trim().toLowerCase();
  const registryEntry = REWARD_ACTION_REGISTRY[actionType];
  const configured = REWARD_ACTION_PRESENTATION_CONFIG[actionType] || {};
  return {
    label: String(configured.label || (registryEntry && registryEntry.label) || 'Reward Action'),
    compactLabel: String(configured.compactLabel || configured.label || (registryEntry && registryEntry.label) || 'Reward Action'),
    tone: String(configured.tone || 'utility'),
    successToast: String(configured.successToast || '').trim(),
    showWhenUnavailableInHome: configured.showWhenUnavailableInHome !== false
  };
}

function getRewardActionPresentation(type, payload = {}) {
  const actionType = String(type || '').trim().toLowerCase();
  const context = String(payload.context || 'default').trim().toLowerCase();
  const config = getRewardActionPresentationConfig(actionType);
  const featureState = getRewardActionFeatureState(actionType);
  const usage = canUseRewardAction(actionType, payload);
  const gateState = getRewardActionGrantState(actionType, payload);
  const coinCost = getRewardActionCoinCost(actionType, payload.state || state);
  const bypassCoinCost = shouldBypassRewardActionCoinCost(actionType, payload);
  const affordable = bypassCoinCost || coinCost <= 0 ? true : canAfford(coinCost, payload.state || state);
  const cooldownRemainingMs = Math.max(0, Number(usage.cooldownRemainingMs) || 0);
  const cooldownText = formatRewardCooldownHint(cooldownRemainingMs);
  const disabled = !Boolean(usage.ok) || !Boolean(gateState.ok) || !affordable;
  const availability = usage.availability && typeof usage.availability === 'object' ? usage.availability : {};
  const hint = String(
    (!affordable && coinCost > 0 ? `Nicht genug Coins · ${coinCost} benötigt.` : '')
    || 
    gateState.hint
    || usage.hint
    || availability.hint
    || (disabled ? 'Aktuell nicht verfuegbar.' : '')
  );
  const hidden = context === 'home'
    ? Boolean((disabled && config.showWhenUnavailableInHome === false) || (!featureState.enabled && featureState.debugVisibility !== true))
    : false;

  return {
    type: actionType,
    label: context === 'menu' || context === 'death_overlay' ? config.compactLabel : config.label,
    title: context === 'menu' || context === 'death_overlay' ? config.compactLabel : config.label,
    tone: config.tone,
    disabled,
    hidden,
    reason: String((!usage.ok ? usage.reason : gateState.reason) || (disabled ? 'not_available' : 'ok')),
    hint: bypassCoinCost && !usage.ok ? String(usage.hint || hint) : hint,
    cooldownRemainingMs,
    cooldownText,
    availability,
    coinCost,
    affordable,
    providerMode: String(gateState.grantMode || ''),
    debugVisible: featureState.debugVisibility === true,
    successToast: config.successToast,
    priority: disabled
      ? 0
      : (config.tone === 'emergency' ? 100 : 50)
  };
}

function shouldBypassRewardActionCoinCost(type, payload = {}) {
  const actionType = String(type || '').trim().toLowerCase();
  const source = String(payload && payload.source || '').trim().toLowerCase();
  const context = String(payload && payload.context || '').trim().toLowerCase();
  return actionType === REWARD_ACTION_TYPES.EMERGENCY_SAVE
    && (source === 'rescue_entry' || context === 'death_overlay');
}

function scoreRewardEffectDelta(metric, delta) {
  const safeMetric = String(metric || '').trim().toLowerCase();
  const safeDelta = Number(delta);
  if (!Number.isFinite(safeDelta) || !safeMetric) {
    return 0;
  }

  if (safeMetric === 'health') {
    return safeDelta * 1.1;
  }
  if (safeMetric === 'growth') {
    return safeDelta * 0.7;
  }
  if (safeMetric === 'water' || safeMetric === 'nutrition') {
    return safeDelta * 0.85;
  }
  if (safeMetric === 'stress' || safeMetric === 'risk') {
    return safeDelta * -1;
  }
  return 0;
}

function scoreRewardEffectsObject(effects = {}) {
  const safeEffects = effects && typeof effects === 'object' ? effects : {};
  let score = 0;
  for (const [metric, delta] of Object.entries(safeEffects)) {
    score += scoreRewardEffectDelta(metric, delta);
  }
  return round2(score);
}

function getCareBoostRewardAvailability(sourceState = state) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
  const status = safeState.status && typeof safeState.status === 'object' ? safeState.status : {};

  if (Boolean(plant.isDead) || String(plant.phase || '') === 'dead') {
    return { ok: false, reason: 'plant_dead', hint: 'Care Boost steht nur waehrend eines aktiven Runs bereit.' };
  }

  const water = clamp(Number(status.water || 0), 0, 100);
  const nutrition = clamp(Number(status.nutrition || 0), 0, 100);
  const health = clamp(Number(status.health || 0), 0, 100);
  const stress = clamp(Number(status.stress || 0), 0, 100);
  const risk = clamp(Number(status.risk || 0), 0, 100);
  const needScore = clamp(
    (clamp((70 - water) / 34, 0, 1) * 0.26)
    + (clamp((68 - nutrition) / 32, 0, 1) * 0.22)
    + (clamp((stress - 20) / 44, 0, 1) * 0.24)
    + (clamp((risk - 18) / 42, 0, 1) * 0.2)
    + (clamp((82 - health) / 34, 0, 1) * 0.18),
    0,
    1.2
  );

  if (needScore < 0.14) {
    return {
      ok: false,
      reason: 'already_stable',
      score: round2(needScore),
      hint: 'Care Boost ist aktuell nicht noetig.'
    };
  }

  if (needScore < 0.22) {
    return {
      ok: false,
      reason: 'too_minor_for_boost',
      score: round2(needScore),
      hint: 'Care Boost bleibt fuer deutlich spuerbare Run-Spannung reserviert.'
    };
  }

  return {
    ok: true,
    reason: 'ok',
    score: round2(needScore),
    hint: needScore >= 0.62
      ? 'Care Boost stabilisiert den Run aktuell spuerbar.'
      : 'Care Boost steht als sanfter Stabilizer bereit.'
  };
}

function getEventFastForwardChoiceDetails(sourceState = state) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const options = Array.isArray(safeState.events && safeState.events.activeOptions) ? safeState.events.activeOptions : [];
  let best = null;

  for (const option of options) {
    if (!option || typeof option !== 'object') {
      continue;
    }
    const directScore = scoreRewardEffectsObject(option.effects || {});
    const sideEffectScore = (Array.isArray(option.sideEffects) ? option.sideEffects : []).reduce((sum, sideEffect) => {
      if (!sideEffect || typeof sideEffect !== 'object') {
        return sum;
      }
      const chance = clamp(Number(sideEffect.chance) || 0, 0, 1);
      return sum + (scoreRewardEffectsObject(sideEffect.effects || {}) * chance * 0.85);
    }, 0);
    const totalScore = round2(directScore + sideEffectScore);
    if (!best || totalScore > best.score || (totalScore === best.score && String(option.id || '') < String(best.option.id || ''))) {
      best = {
        option,
        score: totalScore
      };
    }
  }

  return best;
}

function getEventFastForwardRewardAvailability(sourceState = state) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
  const eventsState = safeState.events && typeof safeState.events === 'object' ? safeState.events : {};
  const simulation = safeState.simulation && typeof safeState.simulation === 'object' ? safeState.simulation : {};

  if (Boolean(plant.isDead) || String(plant.phase || '') === 'dead') {
    return { ok: false, reason: 'plant_dead', hint: 'Event Fast Forward ist nach Run-Ende nicht verfuegbar.' };
  }

  if (String(eventsState.machineState || '') === 'activeEvent') {
    const bestChoice = getEventFastForwardChoiceDetails(safeState);
    if (!bestChoice || !bestChoice.option) {
      return { ok: false, reason: 'no_fast_forward_target', hint: 'Dieses Event braucht eine manuelle Entscheidung.' };
    }
    if (Number(bestChoice.score) <= 0.35) {
      return { ok: false, reason: 'manual_choice_recommended', hint: 'Dieses Event ist zu offen fuer eine sichere Schnellaufloesung.' };
    }
    return {
      ok: true,
      reason: 'resolve_active_event',
      mode: 'resolve_active_event',
      optionId: String(bestChoice.option.id || ''),
      optionLabel: String(bestChoice.option.label || 'Option'),
      optionScore: round2(bestChoice.score),
      hint: `Sichere Schnellaufloesung ueber "${String(bestChoice.option.label || 'Option')}".`
    };
  }

  if (String(eventsState.machineState || '') === 'resolving') {
    const remainingSimMs = Math.max(
      0,
      Number(eventsState.resolvingUntilSimTimeMs || 0) - Number(simulation.simTimeMs || 0)
    );
    if (remainingSimMs <= 0) {
      return { ok: false, reason: 'already_resolved', hint: 'Die Event-Auswertung ist bereits abgeschlossen.' };
    }
    return {
      ok: true,
      reason: 'finish_resolving_event',
      mode: 'finish_resolving_event',
      remainingSimMs,
      hint: 'Event Fast Forward beendet die laufende Auswertung sofort.'
    };
  }

  return { ok: false, reason: 'no_fast_forward_target', hint: 'Kein Event ist aktuell fuer Fast Forward geeignet.' };
}

function getClimateStabilizeRewardAvailability(sourceState = state) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
  if (Boolean(plant.isDead) || String(plant.phase || '') === 'dead') {
    return { ok: false, reason: 'plant_dead', hint: 'Climate Stabilize steht nur waehrend eines aktiven Runs bereit.' };
  }

  if (String((safeState.setup && safeState.setup.mode) || '') !== 'indoor') {
    return { ok: false, reason: 'unsupported_setup', hint: 'Climate Stabilize ist aktuell nur fuer Indoor-Runs verfuegbar.' };
  }

  const envApi = window.GrowSimEnvModel;
  if (!envApi
    || typeof envApi.ensureClimateState !== 'function'
    || typeof envApi.computeVpdKpa !== 'function'
    || typeof envApi.relativeHumidityFromAbsoluteHumidity !== 'function') {
    return { ok: false, reason: 'climate_api_unavailable', hint: 'Die Klima-Runtime ist gerade nicht vollstaendig bereit.' };
  }

  const controls = ensureEnvironmentControls(safeState);
  const climate = envApi.ensureClimateState(safeState, safeState.status, safeState.simulation, safeState.plant);
  const tent = climate && climate.tent && typeof climate.tent === 'object' ? climate.tent : null;
  if (!tent) {
    return { ok: false, reason: 'climate_unavailable', hint: 'Die Klima-Lage kann aktuell nicht stabilisiert werden.' };
  }

  const periodKey = Boolean(safeState.simulation && safeState.simulation.isDaytime) ? 'day' : 'night';
  const target = controls.targets && controls.targets[periodKey] && typeof controls.targets[periodKey] === 'object'
    ? controls.targets[periodKey]
    : (controls.targets && controls.targets.day ? controls.targets.day : getEnvironmentControlDefaults().targets.day);
  const tempC = clamp(Number(tent.temperatureC) || Number(controls.temperatureC) || 22, 10, 40);
  const humidityPercent = clamp(
    Number(tent.humidityPercent)
      || envApi.relativeHumidityFromAbsoluteHumidity(tempC, Number(tent.absoluteHumidityGm3) || 0)
      || Number(controls.humidityPercent)
      || 55,
    0,
    100
  );
  const vpdKpa = clamp(Number(tent.vpdKpa) || envApi.computeVpdKpa(tempC, humidityPercent), 0.2, 3.2);

  const tempDelta = Math.abs(tempC - Number(target.temperatureC || tempC));
  const humidityDelta = Math.abs(humidityPercent - Number(target.humidityPercent || humidityPercent));
  const vpdDelta = Math.abs(vpdKpa - Number(target.vpdKpa || vpdKpa));
  const severity = clamp(
    (clamp(tempDelta / 3.4, 0, 1.2) * 0.4)
    + (clamp(humidityDelta / 14, 0, 1.2) * 0.32)
    + (clamp(vpdDelta / 0.48, 0, 1.2) * 0.28),
    0,
    1.4
  );

  if (severity < 0.26) {
    return {
      ok: false,
      reason: 'already_stable',
      score: round2(severity),
      tempDelta: round2(tempDelta),
      humidityDelta: round2(humidityDelta),
      vpdDelta: round2(vpdDelta),
      hint: 'Das Klima liegt bereits in einem stabilen Bereich.'
    };
  }

  return {
    ok: true,
    reason: 'ok',
    score: round2(severity),
    tempDelta: round2(tempDelta),
    humidityDelta: round2(humidityDelta),
    vpdDelta: round2(vpdDelta),
    periodKey,
    hint: severity >= 0.68
      ? 'Climate Stabilize kann die aktuelle Klima-Lage spuerbar beruhigen.'
      : 'Climate Stabilize steht fuer eine sanfte Klima-Korrektur bereit.'
  };
}

function getEmergencySaveRewardAvailability(sourceState = state) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
  const status = safeState.status && typeof safeState.status === 'object' ? safeState.status : {};
  const run = typeof getCanonicalRun === 'function' ? getCanonicalRun(safeState) : (safeState.run || {});
  const meta = typeof getCanonicalMeta === 'function' ? getCanonicalMeta(safeState) : (safeState.meta || {});
  const rescueMeta = meta && meta.rescue && typeof meta.rescue === 'object' ? meta.rescue : {};
  const rescueText = getMenuUiTextBundle() && getMenuUiTextBundle().rescue ? getMenuUiTextBundle().rescue : null;

  if (String(run.status || 'active') !== 'active' && String(run.status || '') !== 'downed') {
    return { ok: false, reason: 'run_inactive', hint: rescueText ? rescueText.unavailable : 'Notfallrettung ist aktuell nicht verfügbar.' };
  }
  if (Boolean(rescueMeta.used)) {
    return { ok: false, reason: 'already_used', hint: rescueText ? rescueText.used : 'Rettungsaktion ist nur 1× pro Run verfügbar.' };
  }

  const dead = Boolean(plant.isDead) || String(plant.phase || '') === 'dead';
  if (dead) {
    return {
      ok: true,
      reason: 'revive_run',
      score: 1,
      hint: rescueText ? rescueText.appliedRevived : 'Notfallrettung angewendet. Der Run wurde knapp gerettet.'
    };
  }

  const health = clamp(Number(status.health || 0), 0, 100);
  const water = clamp(Number(status.water || 0), 0, 100);
  const nutrition = clamp(Number(status.nutrition || 0), 0, 100);
  const stress = clamp(Number(status.stress || 0), 0, 100);
  const risk = clamp(Number(status.risk || 0), 0, 100);

  const diagnosticsApi = getDiagnosticsApi();
  const diagnostics = diagnosticsApi && typeof diagnosticsApi.computePlantDiagnostics === 'function'
    ? diagnosticsApi.computePlantDiagnostics(safeState)
    : null;
  const issues = Array.isArray(diagnostics && diagnostics.allIssues) ? diagnostics.allIssues : [];
  const peakIssueScore = issues.reduce((maxScore, issue) => Math.max(maxScore, Number(issue && issue.score) || 0), 0);
  const criticalIssue = issues.find((issue) => issue && issue.severity === 'critical');

  const emergencyScore = clamp(
    (clamp((28 - health) / 28, 0, 1) * 0.34)
    + (clamp((water < 18 ? (18 - water) / 18 : 0), 0, 1) * 0.14)
    + (clamp((nutrition < 18 ? (18 - nutrition) / 18 : 0), 0, 1) * 0.12)
    + (clamp((stress - 74) / 26, 0, 1) * 0.18)
    + (clamp((risk - 72) / 28, 0, 1) * 0.18)
    + (clamp((peakIssueScore - 68) / 32, 0, 1) * 0.12),
    0,
    1.4
  );

  const severeButRecoverable = health <= 28 || risk >= 78 || stress >= 82 || Boolean(criticalIssue);
  if (!severeButRecoverable || emergencyScore < 0.42) {
    return {
      ok: false,
      reason: 'not_critical_enough',
      score: round2(emergencyScore),
      hint: rescueText ? rescueText.notRequired : 'Notfallrettung ist aktuell nicht erforderlich.'
    };
  }

  return {
    ok: true,
    reason: 'stabilize_critical_run',
    score: round2(emergencyScore),
    hint: emergencyScore >= 0.82
      ? (rescueText ? rescueText.appliedRevived : 'Notfallrettung angewendet. Der Run wurde knapp gerettet.')
      : (rescueText ? rescueText.readySubtext : '1× pro Run bei kritischem Zustand.')
  };
}

function getRewardActionAvailability(type, payload = {}) {
  const actionType = String(type || '').trim().toLowerCase();
  const entry = REWARD_ACTION_REGISTRY[actionType];
  if (!entry || typeof entry.getAvailability !== 'function') {
    return { ok: false, reason: 'unsupported_reward_action' };
  }
  return entry.getAvailability(payload && payload.state ? payload.state : state, payload);
}

function canUseRewardAction(type, payload = {}) {
  const actionType = String(type || '').trim().toLowerCase();
  const targetState = payload && payload.state ? payload.state : state;
  const nowMs = Math.max(0, Number(payload && payload.nowMs) || Date.now());
  const availability = getRewardActionAvailability(actionType, { ...payload, state: targetState });
  if (!availability.ok) {
    return {
      ok: false,
      reason: String(availability.reason || 'not_available'),
      availability,
      cooldownRemainingMs: 0,
      hint: String(availability.hint || '')
    };
  }
  const cooldownRemainingMs = getRewardActionCooldownRemaining(actionType, targetState, nowMs);
  if (cooldownRemainingMs > 0) {
    return {
      ok: false,
      reason: 'cooldown_active',
      availability,
      cooldownRemainingMs,
      hint: formatRewardCooldownHint(cooldownRemainingMs)
    };
  }
  return {
    ok: true,
    reason: 'ok',
    availability,
    cooldownRemainingMs: 0,
    hint: String(availability.hint || '')
  };
}

function executeEmergencySaveRewardAction(context = {}) {
  const availability = getEmergencySaveRewardAvailability(state);
  if (!availability.ok) {
    const blockedResult = { ok: false, reason: availability.reason || 'not_available' };
    addLog('action', 'Notfallrettung blockiert', blockedResult);
    return blockedResult;
  }

  const rescueResult = applyRescueEffects();
  if (!rescueResult || !rescueResult.ok) {
    return { ok: false, reason: 'not_critical_enough' };
  }

  const meta = getCanonicalMeta(state);
  const nowMs = Date.now();
  meta.rescue.used = true;
  meta.rescue.usedAtRealMs = nowMs;
  const rescueText = getMenuUiTextBundle() && getMenuUiTextBundle().rescue ? getMenuUiTextBundle().rescue : null;
  meta.rescue.lastResult = rescueResult.wasDead
    ? (rescueText ? rescueText.appliedRevived : 'Notfallrettung angewendet. Der Run wurde knapp gerettet.')
    : (rescueText ? rescueText.appliedStable : 'Rettungsaktion angewendet. Die Pflanze stabilisiert sich.');

  updateVisibleOverlays();
  syncCanonicalStateShape();
  syncRunGoalProgress('reward_action');

  const timestamp = {
    realMs: nowMs,
    simMs: Number(state.simulation.simTimeMs || 0),
    simStamp: simStampFromMs(Number(state.simulation.simTimeMs || 0))
  };
  const history = getCanonicalHistory(state);
  history.system.push({
    type: 'rescue',
    label: 'Notfallrettung',
    atRealTimeMs: timestamp.realMs,
    atSimTimeMs: timestamp.simMs,
    simStamp: timestamp.simStamp,
    effectsApplied: rescueResult.effectsApplied,
    wasDead: rescueResult.wasDead
  });
  if (history.system.length > MAX_HISTORY_LOG) {
    history.system = history.system.slice(-MAX_HISTORY_LOG);
  }

  if (state.run && typeof state.run === 'object') {
    state.run.status = 'active';
    state.run.endReason = null;
    state.run.finalizedAtRealMs = null;
  }

  const result = {
    ok: true,
    reason: 'emergency_save_applied',
    provider: String(context.provider || 'direct'),
    wasDead: Boolean(rescueResult.wasDead),
    deltaSummary: rescueResult.effectsApplied,
    severityScore: round2(Number(availability.score || 0))
  };
  addLog('action', 'Notfallrettung aktiviert', result);
  return result;
}

function executeClimateStabilizeRewardAction(context = {}) {
  const availability = getClimateStabilizeRewardAvailability(state);
  if (!availability.ok) {
    const blockedResult = { ok: false, reason: availability.reason || 'not_available' };
    addLog('action', 'Climate Stabilize blockiert', blockedResult);
    return blockedResult;
  }

  const envApi = window.GrowSimEnvModel;
  if (!envApi
    || typeof envApi.ensureClimateState !== 'function'
    || typeof envApi.computeVpdKpa !== 'function'
    || typeof envApi.absoluteHumidityFromRelativeHumidity !== 'function'
    || typeof envApi.relativeHumidityFromAbsoluteHumidity !== 'function') {
    return { ok: false, reason: 'climate_api_unavailable' };
  }

  const controls = ensureEnvironmentControls(state);
  const climate = envApi.ensureClimateState(state, state.status, state.simulation, state.plant);
  if (!climate || !climate.tent) {
    return { ok: false, reason: 'climate_unavailable' };
  }

  const defaults = getEnvironmentControlDefaults();
  const periodKey = availability.periodKey === 'night' ? 'night' : 'day';
  const target = controls.targets && controls.targets[periodKey] && typeof controls.targets[periodKey] === 'object'
    ? controls.targets[periodKey]
    : controls.targets.day;
  const defaultTarget = defaults && defaults.targets && defaults.targets[periodKey] && typeof defaults.targets[periodKey] === 'object'
    ? defaults.targets[periodKey]
    : defaults.targets.day;

  const before = {
    temperatureC: round2(Number(climate.tent.temperatureC) || Number(controls.temperatureC) || 0),
    humidityPercent: round2(Number(climate.tent.humidityPercent) || Number(controls.humidityPercent) || 0),
    vpdKpa: round2(Number(climate.tent.vpdKpa) || envApi.computeVpdKpa(Number(climate.tent.temperatureC) || 22, Number(climate.tent.humidityPercent) || 55))
  };

  const blendedTargetTemp = clamp(
    Number(target.temperatureC || defaultTarget.temperatureC) + clamp((Number(defaultTarget.temperatureC || 24) - Number(target.temperatureC || 24)) * 0.45, -1.6, 1.6),
    16,
    32
  );
  const blendedTargetHumidity = clamp(
    Number(target.humidityPercent || defaultTarget.humidityPercent) + clamp((Number(defaultTarget.humidityPercent || 58) - Number(target.humidityPercent || 58)) * 0.45, -8, 8),
    35,
    82
  );
  const blendedTargetVpd = clamp(
    Number(target.vpdKpa || defaultTarget.vpdKpa || 1.15) + clamp((Number(defaultTarget.vpdKpa || 1.15) - Number(target.vpdKpa || 1.15)) * 0.35, -0.18, 0.18),
    0.5,
    2.1
  );

  target.temperatureC = round1(blendedTargetTemp);
  target.humidityPercent = clampInt(blendedTargetHumidity, 30, 90);
  target.vpdKpa = round2(blendedTargetVpd);
  if (periodKey === 'day') {
    controls.temperatureC = round1(target.temperatureC);
    controls.humidityPercent = clampInt(target.humidityPercent, 30, 90);
  }

  const nextTempC = clamp(
    before.temperatureC + clamp((Number(target.temperatureC) - before.temperatureC) * 0.48, -2.2, 2.2),
    10,
    38
  );
  const nextRh = clamp(
    before.humidityPercent + clamp((Number(target.humidityPercent) - before.humidityPercent) * 0.52, -10, 10),
    28,
    92
  );
  climate.tent.temperatureC = round1(nextTempC);
  climate.tent.absoluteHumidityGm3 = clamp(envApi.absoluteHumidityFromRelativeHumidity(nextTempC, nextRh), 0, 80);
  climate.tent.humidityPercent = clampInt(envApi.relativeHumidityFromAbsoluteHumidity(nextTempC, climate.tent.absoluteHumidityGm3), 0, 100);
  climate.tent.vpdKpa = round2(envApi.computeVpdKpa(nextTempC, climate.tent.humidityPercent));

  if (typeof syncClimateStateToLegacyReadout === 'function') {
    syncClimateStateToLegacyReadout(climate, controls, state.simulation, state);
  }

  updateVisibleOverlays();
  syncCanonicalStateShape();

  const after = {
    temperatureC: round2(Number(climate.tent.temperatureC) || nextTempC),
    humidityPercent: round2(Number(climate.tent.humidityPercent) || nextRh),
    vpdKpa: round2(Number(climate.tent.vpdKpa) || envApi.computeVpdKpa(nextTempC, nextRh))
  };

  const result = {
    ok: true,
    reason: 'climate_stabilized',
    provider: String(context.provider || 'direct'),
    periodKey,
    deltaSummary: {
      temperatureC: round2(after.temperatureC - before.temperatureC),
      humidityPercent: round2(after.humidityPercent - before.humidityPercent),
      vpdKpa: round2(after.vpdKpa - before.vpdKpa)
    },
    severityScore: round2(Number(availability.score || 0))
  };
  addLog('action', 'Climate Stabilize aktiviert', result);
  return result;
}

function executeCareBoostRewardAction(context = {}) {
  const availability = getCareBoostRewardAvailability(state);
  if (!availability.ok) {
    const blockedResult = { ok: false, reason: availability.reason || 'not_available' };
    addLog('action', 'Care Boost blockiert', blockedResult);
    return blockedResult;
  }

  const before = snapshotStatus();
  const water = clamp(Number(state.status.water || 0), 0, 100);
  const nutrition = clamp(Number(state.status.nutrition || 0), 0, 100);
  const health = clamp(Number(state.status.health || 0), 0, 100);
  const stress = clamp(Number(state.status.stress || 0), 0, 100);
  const risk = clamp(Number(state.status.risk || 0), 0, 100);

  const deltas = {
    water: round2(clamp(4 + Math.max(0, (68 - water) * 0.18), 4, 12)),
    nutrition: round2(clamp(3 + Math.max(0, (66 - nutrition) * 0.15), 3, 10)),
    health: round2(clamp(1.5 + Math.max(0, (74 - health) * 0.08), 1.5, 5)),
    stress: round2(-clamp(5 + Math.max(0, (stress - 24) * 0.14), 5, 14)),
    risk: round2(-clamp(4 + Math.max(0, (risk - 18) * 0.13), 4, 12))
  };

  state.status.water += deltas.water;
  state.status.nutrition += deltas.nutrition;
  state.status.health += deltas.health;
  state.status.stress += deltas.stress;
  state.status.risk += deltas.risk;

  clampStatus();
  updateVisibleOverlays();
  syncCanonicalStateShape();
  syncRunGoalProgress('reward_action');

  const after = snapshotStatus();
  const deltaSummary = summarizeDelta(before, after);
  const result = {
    ok: true,
    reason: 'care_boost_applied',
    provider: String(context.provider || 'direct'),
    deltaSummary,
    needScore: round2(Number(availability.score || 0))
  };
  addLog('action', 'Care Boost aktiviert', result);
  return result;
}

function executeNightShiftRewardAction(context = {}) {
  if (isPlantDead()) {
    const blockedResult = { ok: false, reason: 'plant_dead' };
    addLog('action', 'Night Shift blockiert: Pflanze ist eingegangen', blockedResult);
    return blockedResult;
  }

  if (state.simulation.isDaytime) {
    const blockedResult = { ok: false, reason: 'daytime_only' };
    addLog('action', 'Night Shift blockiert: Nur nachts verfügbar', blockedResult);
    return blockedResult;
  }

  const nowMs = Date.now();
  const usage = consumeBoostUsage(nowMs, 'Night Shift');
  if (!usage.ok) {
    return { ok: false, reason: usage.reason || 'usage_blocked' };
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
    const alignedResult = {
      ok: true,
      reason: 'aligned_to_day_start',
      skippedNightSimMinutes: 0,
      usedToday: state.boost.boostUsedToday,
      simTimeAfter: state.simulation.simTimeMs,
      provider: String(context.provider || 'direct')
    };
    addLog('action', 'Night Shift: Tagesbeginn erreicht', alignedResult);
    return alignedResult;
  }

  const wasDeadBeforeSkip = isPlantDead();

  setSimulationTimeMs(nextDayStartSimMs, nowMs, {
    suppressLogs: true,
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
  runEventStateMachine(nowMs);

  const result = {
    ok: true,
    reason: 'advanced_to_day_start',
    usedToday: state.boost.boostUsedToday,
    skippedNightSimMinutes: Math.round(remainingNightSimMs / 60000),
    simTimeAfter: state.simulation.simTimeMs,
    provider: String(context.provider || 'direct')
  };
  addLog('action', 'Night Shift: Tagesbeginn erreicht', result);
  return result;
}

function executeFastForwardEventRewardAction(context = {}) {
  const availability = getEventFastForwardRewardAvailability(state);
  if (!availability.ok) {
    const blockedResult = { ok: false, reason: availability.reason || 'not_available' };
    addLog('action', 'Event Fast Forward blockiert', blockedResult);
    return blockedResult;
  }

  if (availability.mode === 'resolve_active_event') {
    const selectedOptionId = String(availability.optionId || '');
    const selectedOptionLabel = String(availability.optionLabel || 'Option');
    onEventOptionClick(selectedOptionId);
    const result = {
      ok: true,
      reason: 'resolved_active_event',
      provider: String(context.provider || 'direct'),
      optionId: selectedOptionId,
      optionLabel: selectedOptionLabel
    };
    addLog('action', 'Event Fast Forward aktiviert', result);
    return result;
  }

  if (availability.mode === 'finish_resolving_event') {
    const nowMs = Date.now();
    const remainingSimMs = Math.max(0, Number(availability.remainingSimMs || 0));
    state.events.resolvingUntilSimTimeMs = Number(state.simulation.simTimeMs || 0);
    state.events.resolvingUntilMs = nowMs;
    runEventStateMachine(nowMs);
    syncCanonicalStateShape();
    const result = {
      ok: true,
      reason: 'finished_resolving_event',
      provider: String(context.provider || 'direct'),
      skippedResolveSimMinutes: Math.round(remainingSimMs / 60000)
    };
    addLog('action', 'Event Fast Forward aktiviert', result);
    return result;
  }

  return { ok: false, reason: 'unsupported_fast_forward_mode' };
}

function getTimeSkipRewardAvailability(sourceState = state, hours = 1) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
  if (Boolean(plant.isDead) || String(plant.phase || '') === 'dead') {
    return { ok: false, reason: 'plant_dead', hint: 'Zeitsprung ist nach Run-Ende nicht verfügbar.' };
  }
  const safeHours = hours === 3 ? 3 : 1;
  return {
    ok: true,
    reason: 'ok',
    hours: safeHours,
    hint: `Springt den Run direkt um ${safeHours}h Sim-Zeit vor.`
  };
}

function executeTimeSkipRewardAction(context = {}) {
  const hours = Number(context.hours) === 3 ? 3 : 1;
  const availability = getTimeSkipRewardAvailability(state, hours);
  if (!availability.ok) {
    return { ok: false, reason: availability.reason || 'not_available' };
  }
  const nowMs = Date.now();
  const currentSimTimeMs = Number(state.simulation.simTimeMs || 0);
  const targetSimTimeMs = currentSimTimeMs + (hours * 60 * 60 * 1000);
  setSimulationTimeMs(targetSimTimeMs, nowMs, {
    suppressLogs: true,
    reason: `coin_time_skip_${hours}h`
  });
  runEventStateMachine(nowMs);
  syncCanonicalStateShape();
  return {
    ok: true,
    reason: 'time_skipped',
    provider: String(context.provider || 'direct'),
    hours,
    simTimeAfter: Number(state.simulation.simTimeMs || targetSimTimeMs)
  };
}

function getEventStartRewardAvailability(sourceState = state) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
  const eventsState = safeState.events && typeof safeState.events === 'object' ? safeState.events : {};
  if (Boolean(plant.isDead) || String(plant.phase || '') === 'dead') {
    return { ok: false, reason: 'plant_dead', hint: 'Event Start steht nur im aktiven Run bereit.' };
  }
  if (String(eventsState.machineState || '') === 'activeEvent') {
    return { ok: false, reason: 'event_already_active', hint: 'Es läuft bereits ein Event.' };
  }
  if (String(eventsState.machineState || '') === 'resolving') {
    return { ok: false, reason: 'event_resolving', hint: 'Das aktuelle Event wird noch ausgewertet.' };
  }
  return {
    ok: true,
    reason: 'ok',
    hint: 'Startet sofort das nächste verfügbare Event.'
  };
}

function cloneEventShopRuntimeValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function captureEventShopTransitionSnapshot() {
  return {
    events: cloneEventShopRuntimeValue(state.events),
    openSheet: state.ui && typeof state.ui === 'object' ? state.ui.openSheet : null
  };
}

function restoreEventShopTransitionSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return;
  }
  if (snapshot.events && typeof snapshot.events === 'object') {
    state.events = cloneEventShopRuntimeValue(snapshot.events);
  }
  if (state.ui && typeof state.ui === 'object') {
    state.ui.openSheet = snapshot.openSheet || null;
  }
}

function clearEventStateForAuthoritativeActivation(nowMs) {
  const scheduler = state.events.scheduler && typeof state.events.scheduler === 'object'
    ? state.events.scheduler
    : (state.events.scheduler = {});
  const safeNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const nowSimMs = Number(state.simulation.simTimeMs || 0);

  state.events.machineState = 'idle';
  state.events.active = null;
  state.events.activeEventId = null;
  state.events.activeEventTitle = '';
  state.events.activeEventText = '';
  state.events.activeLearningNote = '';
  state.events.activeOptions = [];
  state.events.activeSeverity = 1;
  state.events.activeCooldownRealMinutes = 120;
  state.events.activeResolveTimeMinutes = 60;
  state.events.activeCategory = 'generic';
  state.events.activeTags = [];
  state.events.activeImagePath = '';
  state.events.pendingOutcome = null;
  state.events.resolvedOutcome = null;
  state.events.pendingResolution = null;
  state.events.resolvingUntilMs = 0;
  state.events.resolvingUntilSimTimeMs = 0;
  state.events.cooldownUntilMs = 0;
  state.events.cooldownUntilSimTimeMs = 0;

  scheduler.nextEventSimTimeMs = nowSimMs;
  scheduler.nextEventRealTimeMs = safeNowMs;
}

function buildAuthoritativeEventShopFailureResult(reason, extra = {}) {
  return {
    ok: false,
    reason: String(reason || 'event_shop_transition_failed'),
    ...extra
  };
}

function executeAuthoritativeEventShopTransition(options = {}) {
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const snapshot = captureEventShopTransitionSnapshot();
  let executionResult = null;

  try {
    executionResult = typeof options.execute === 'function'
      ? options.execute({ nowMs, snapshot })
      : buildAuthoritativeEventShopFailureResult('missing_transition_executor');
  } catch (error) {
    executionResult = buildAuthoritativeEventShopFailureResult('event_shop_transition_exception', {
      message: error && error.message ? error.message : String(error)
    });
  }

  syncCanonicalStateShape();

  if (executionResult && executionResult.ok === false) {
    restoreEventShopTransitionSnapshot(snapshot);
    syncCanonicalStateShape();
    return executionResult;
  }

  const postcondition = typeof options.postcondition === 'function'
    ? options.postcondition({ nowMs, snapshot, executionResult })
    : { ok: false, reason: 'missing_transition_postcondition' };

  if (!postcondition || postcondition.ok !== true) {
    restoreEventShopTransitionSnapshot(snapshot);
    syncCanonicalStateShape();
    return buildAuthoritativeEventShopFailureResult(
      postcondition && postcondition.reason ? postcondition.reason : 'event_shop_postcondition_failed',
      postcondition && typeof postcondition === 'object' ? postcondition : {}
    );
  }

  return {
    ok: true,
    ...(executionResult && typeof executionResult === 'object' ? executionResult : {})
  };
}

function executeEventStartRewardAction(context = {}) {
  const availability = getEventStartRewardAvailability(state);
  if (!availability.ok) {
    return { ok: false, reason: availability.reason || 'not_available' };
  }
  return executeAuthoritativeEventShopTransition({
    nowMs: Date.now(),
    execute: ({ nowMs }) => {
      const originalEventCooldowns = cloneEventShopRuntimeValue(state.events.scheduler && state.events.scheduler.eventCooldownsSim || {});
      const originalCategoryCooldowns = cloneEventShopRuntimeValue(state.events.scheduler && state.events.scheduler.categoryCooldownsSim || {});
      clearEventStateForAuthoritativeActivation(nowMs);
      state.events.scheduler.eventCooldownsSim = {};
      state.events.scheduler.categoryCooldownsSim = {};

      const activated = typeof activateEvent === 'function' ? activateEvent(nowMs) : false;
      if (!activated) {
        return buildAuthoritativeEventShopFailureResult('event_start_activation_failed');
      }

      state.events.scheduler.eventCooldownsSim = originalEventCooldowns;
      state.events.scheduler.categoryCooldownsSim = originalCategoryCooldowns;
      state.ui.openSheet = 'event';

      return {
        reason: 'event_started',
        provider: String(context.provider || 'direct')
      };
    },
    postcondition: () => {
      const activeEventId = String(state.events.activeEventId || '').trim();
      if (state.events.machineState !== 'activeEvent' || !activeEventId) {
        return {
          ok: false,
          reason: 'event_start_postcondition_failed'
        };
      }
      return {
        ok: true,
        activeEventId
      };
    }
  });
}

function getEventRerollRewardAvailability(sourceState = state) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const eventsState = safeState.events && typeof safeState.events === 'object' ? safeState.events : {};
  if (String(eventsState.machineState || '') !== 'activeEvent' || !String(eventsState.activeEventId || '').trim()) {
    return { ok: false, reason: 'no_active_event', hint: 'Ein Reroll braucht ein aktives Event.' };
  }
  return {
    ok: true,
    reason: 'ok',
    hint: 'Ersetzt das aktuelle Event sofort durch ein neues.'
  };
}

function executeEventRerollRewardAction(context = {}) {
  const availability = getEventRerollRewardAvailability(state);
  if (!availability.ok) {
    return { ok: false, reason: availability.reason || 'not_available' };
  }
  const currentEventId = String(state.events.activeEventId || '').trim();
  return executeAuthoritativeEventShopTransition({
    nowMs: Date.now(),
    execute: ({ nowMs }) => {
      const scheduler = state.events.scheduler && typeof state.events.scheduler === 'object'
        ? state.events.scheduler
        : (state.events.scheduler = {});
      const originalEventCooldowns = cloneEventShopRuntimeValue(scheduler.eventCooldownsSim || {});
      const originalCategoryCooldowns = cloneEventShopRuntimeValue(scheduler.categoryCooldownsSim || {});
      const cooldownUntilSimMs = Number(state.simulation.simTimeMs || 0) + (6 * 60 * 60 * 1000);

      clearEventStateForAuthoritativeActivation(nowMs);
      scheduler.eventCooldownsSim = {
        ...originalEventCooldowns,
        [currentEventId]: cooldownUntilSimMs
      };
      scheduler.categoryCooldownsSim = {};

      const activated = typeof activateEvent === 'function' ? activateEvent(nowMs) : false;
      if (!activated) {
        return buildAuthoritativeEventShopFailureResult('event_reroll_activation_failed', {
          previousEventId: currentEventId
        });
      }

      scheduler.eventCooldownsSim = {
        ...originalEventCooldowns,
        [currentEventId]: cooldownUntilSimMs
      };
      scheduler.categoryCooldownsSim = originalCategoryCooldowns;
      state.ui.openSheet = 'event';

      return {
        reason: 'event_rerolled',
        provider: String(context.provider || 'direct'),
        previousEventId: currentEventId,
        nextEventId: String(state.events.activeEventId || '').trim()
      };
    },
    postcondition: () => {
      const activeEventId = String(state.events.activeEventId || '').trim();
      if (state.events.machineState !== 'activeEvent' || !activeEventId) {
        return {
          ok: false,
          reason: 'event_reroll_postcondition_failed'
        };
      }
      if (activeEventId === currentEventId) {
        return {
          ok: false,
          reason: 'event_reroll_same_event'
        };
      }
      return {
        ok: true,
        activeEventId
      };
    }
  });
}

function getAutoCareRewardAvailability(sourceState = state) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
  if (Boolean(plant.isDead) || String(plant.phase || '') === 'dead') {
    return { ok: false, reason: 'plant_dead', hint: 'Auto-Care ist nur im aktiven Run verfügbar.' };
  }
  const hasActive = Array.isArray(safeState.actions && safeState.actions.activeEffects)
    && safeState.actions.activeEffects.some((effect) => effect && effect.actionId === REWARD_ACTION_TYPES.AUTO_CARE);
  if (hasActive) {
    return { ok: false, reason: 'already_active', hint: 'Auto-Care läuft bereits.' };
  }
  return {
    ok: true,
    reason: 'ok',
    hint: 'Stabilisiert Wasser, Nährstoffe und Stress für 2h.'
  };
}

function executeAutoCareRewardAction(context = {}) {
  const availability = getAutoCareRewardAvailability(state);
  if (!availability.ok) {
    return { ok: false, reason: availability.reason || 'not_available' };
  }
  const nowMs = Date.now();
  state.actions.activeEffects.push({
    id: `${REWARD_ACTION_TYPES.AUTO_CARE}:${nowMs}:${state.simulation.tickCount}`,
    actionId: REWARD_ACTION_TYPES.AUTO_CARE,
    remainingSimMs: 2 * 60 * 60 * 1000,
    rates: {
      waterPerHour: 3.2,
      nutritionPerHour: 2.4,
      stressPerHour: -2.6,
      riskPerHour: -1.8
    }
  });
  syncCanonicalStateShape();
  return {
    ok: true,
    reason: 'auto_care_started',
    provider: String(context.provider || 'direct'),
    remainingSimMs: 2 * 60 * 60 * 1000
  };
}

function getGrowthBoostRewardAvailability(sourceState = state) {
  const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
  if (Boolean(plant.isDead) || String(plant.phase || '') === 'dead') {
    return { ok: false, reason: 'plant_dead', hint: 'Growth Boost ist nur im aktiven Run verfügbar.' };
  }
  const hasActive = Array.isArray(safeState.actions && safeState.actions.activeEffects)
    && safeState.actions.activeEffects.some((effect) => effect && effect.actionId === REWARD_ACTION_TYPES.GROWTH_BOOST);
  if (hasActive) {
    return { ok: false, reason: 'already_active', hint: 'Growth Boost läuft bereits.' };
  }
  return {
    ok: true,
    reason: 'ok',
    hint: 'Gibt der Pflanze für 2h einen sauberen Wachstumsimpuls.'
  };
}

function executeGrowthBoostRewardAction(context = {}) {
  const availability = getGrowthBoostRewardAvailability(state);
  if (!availability.ok) {
    return { ok: false, reason: availability.reason || 'not_available' };
  }
  const nowMs = Date.now();
  state.actions.activeEffects.push({
    id: `${REWARD_ACTION_TYPES.GROWTH_BOOST}:${nowMs}:${state.simulation.tickCount}`,
    actionId: REWARD_ACTION_TYPES.GROWTH_BOOST,
    remainingSimMs: 2 * 60 * 60 * 1000,
    rates: {
      growthPerHour: 2.8,
      healthPerHour: 0.9,
      stressPerHour: -0.8
    }
  });
  syncCanonicalStateShape();
  return {
    ok: true,
    reason: 'growth_boost_started',
    provider: String(context.provider || 'direct'),
    remainingSimMs: 2 * 60 * 60 * 1000
  };
}

const REWARD_ACTION_REGISTRY = Object.freeze({
  [REWARD_ACTION_TYPES.TIME_SKIP_SHORT]: {
    label: '+1h Zeit',
    getAvailability: (sourceState) => getTimeSkipRewardAvailability(sourceState, 1),
    handler: (context) => executeTimeSkipRewardAction({ ...context, hours: 1 })
  },
  [REWARD_ACTION_TYPES.TIME_SKIP_LONG]: {
    label: '+3h Zeit',
    getAvailability: (sourceState) => getTimeSkipRewardAvailability(sourceState, 3),
    handler: (context) => executeTimeSkipRewardAction({ ...context, hours: 3 })
  },
  [REWARD_ACTION_TYPES.CARE_BOOST]: {
    label: 'Care Boost',
    getAvailability: getCareBoostRewardAvailability,
    handler: executeCareBoostRewardAction
  },
  [REWARD_ACTION_TYPES.AUTO_CARE]: {
    label: 'Auto-Care',
    getAvailability: getAutoCareRewardAvailability,
    handler: executeAutoCareRewardAction
  },
  [REWARD_ACTION_TYPES.EMERGENCY_SAVE]: {
    label: 'Notfallrettung',
    getAvailability: getEmergencySaveRewardAvailability,
    handler: executeEmergencySaveRewardAction
  },
  [REWARD_ACTION_TYPES.CLIMATE_STABILIZE]: {
    label: 'Climate Stabilize',
    getAvailability: getClimateStabilizeRewardAvailability,
    handler: executeClimateStabilizeRewardAction
  },
  [REWARD_ACTION_TYPES.FAST_FORWARD_EVENT]: {
    label: 'Event Fast Forward',
    getAvailability: getEventFastForwardRewardAvailability,
    handler: executeFastForwardEventRewardAction
  },
  [REWARD_ACTION_TYPES.EVENT_START]: {
    label: 'Event Start',
    getAvailability: getEventStartRewardAvailability,
    handler: executeEventStartRewardAction
  },
  [REWARD_ACTION_TYPES.EVENT_REROLL]: {
    label: 'Event Reroll',
    getAvailability: getEventRerollRewardAvailability,
    handler: executeEventRerollRewardAction
  },
  [REWARD_ACTION_TYPES.GROWTH_BOOST]: {
    label: 'Growth Boost',
    getAvailability: getGrowthBoostRewardAvailability,
    handler: executeGrowthBoostRewardAction
  },
  [REWARD_ACTION_TYPES.NIGHT_SHIFT]: {
    label: 'Night Shift',
    getAvailability: (sourceState) => {
      const safeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
      const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
      const simulation = safeState.simulation && typeof safeState.simulation === 'object' ? safeState.simulation : {};
      if (Boolean(plant.isDead) || String(plant.phase || '') === 'dead') {
        return { ok: false, reason: 'plant_dead', hint: 'Night Shift steht nur waehrend eines aktiven Runs bereit.' };
      }
      if (Boolean(simulation.isDaytime)) {
        return { ok: false, reason: 'daytime_only', hint: 'Night Shift ist nur nachts verfuegbar.' };
      }
      const currentSimTimeMs = Number(simulation.simTimeMs || 0);
      const nextDayStartSimMs = getNextDayStartSimTime(currentSimTimeMs);
      const remainingNightMinutes = Math.max(0, Math.round((nextDayStartSimMs - currentSimTimeMs) / 60000));
      if (remainingNightMinutes > 0 && remainingNightMinutes < 90) {
        return { ok: false, reason: 'night_almost_over', hint: 'Night Shift lohnt sich erst bei einer spuerbaren Restnacht.' };
      }
      return { ok: true, reason: 'ok', hint: 'Night Shift bringt den Run kontrolliert bis zum Morgen.' };
    },
    handler: executeNightShiftRewardAction
  }
});

function executeRewardAction(type, payload = {}) {
  const actionType = String(type || '').trim().toLowerCase();
  const runtime = ensureRewardActionRuntime(state);
  const entry = REWARD_ACTION_REGISTRY[actionType];
  const nowMs = Date.now();

  if (!entry || typeof entry.handler !== 'function') {
    const unsupportedResult = { ok: false, reason: 'unsupported_reward_action', type: actionType };
    addLog('system', 'Reward Action nicht unterstützt', unsupportedResult);
    const record = ensureRewardActionUsageRecord(actionType, state);
    record.lastResult = unsupportedResult.reason;
    record.lastTriggeredAtMs = Number(runtime.lastTriggeredAtMs) || 0;
    record.lastExecutedAtMs = Number(runtime.lastExecutedAtMs) || 0;
    return unsupportedResult;
  }

  const result = entry.handler({
    payload,
    nowMs,
    provider: String(payload && payload.grantResult && payload.grantResult.mode || runtime.provider)
  }) || { ok: false, reason: 'empty_result' };

  runtime.lastExecutedAtMs = nowMs;
  const record = ensureRewardActionUsageRecord(actionType, state);
  record.lastResult = result.ok ? 'ok' : String(result.reason || 'failed');
  record.lastTriggeredAtMs = Number(runtime.lastTriggeredAtMs) || nowMs;
  record.lastExecutedAtMs = nowMs;

  return result;
}

async function triggerRewardAction(type, payload = {}) {
  const actionType = String(type || '').trim().toLowerCase();
  if (rewardActionInFlight.has(actionType)) {
    return {
      ok: false,
      type: actionType,
      reason: 'action_in_progress'
    };
  }
  rewardActionInFlight.add(actionType);
  try {
  const runtime = ensureRewardActionRuntime(state);
  const nowMs = Date.now();
  const runtimePolicy = getRewardActionRuntimePolicy(actionType);
  markRewardActionUsed(actionType, { nowMs, triggered: true, lastResult: 'triggered' });
  onRewardActionTriggered(actionType, {
    payload,
    provider: getRewardProviderMode(state),
    policy: runtimePolicy,
    nowMs
  });

  const usageCheck = canUseRewardAction(actionType, {
    ...payload,
    state,
    nowMs
  });
  if (!usageCheck.ok) {
    const blockedResult = {
      ok: false,
      type: actionType,
      reason: String(usageCheck.reason || 'reward_action_blocked'),
      cooldownRemainingMs: Math.max(0, Number(usageCheck.cooldownRemainingMs) || 0)
    };
    markRewardActionUsed(actionType, {
      nowMs,
      rejected: true,
      reason: blockedResult.reason,
      result: blockedResult
    });
    onRewardActionRejected(actionType, {
      payload,
      provider: getRewardProviderMode(state),
      policy: runtimePolicy,
      reason: blockedResult.reason,
      availability: usageCheck.availability || null,
      cooldownRemainingMs: blockedResult.cooldownRemainingMs,
      result: blockedResult,
      nowMs
    });
    addLog('action', `${String(REWARD_ACTION_REGISTRY[actionType] && REWARD_ACTION_REGISTRY[actionType].label || 'Reward Action')} blockiert`, blockedResult);
    renderAll();
    schedulePersistState(true);
    return blockedResult;
  }

  const gateState = getRewardActionGrantState(actionType, {
    ...payload,
    state,
    nowMs
  });
  if (!gateState.ok) {
    const gateRejectedResult = {
      ok: false,
      type: actionType,
      reason: String(gateState.reason || 'provider_unavailable')
    };
    markRewardActionUsed(actionType, {
      nowMs,
      rejected: true,
      reason: gateRejectedResult.reason,
      result: gateRejectedResult
    });
    onRewardActionRejected(actionType, {
      payload,
      provider: gateState.providerStatus && gateState.providerStatus.mode ? gateState.providerStatus.mode : runtime.provider,
      providerStatus: gateState.providerStatus && gateState.providerStatus.state ? gateState.providerStatus.state : '',
      policy: runtimePolicy,
      reason: gateRejectedResult.reason,
      availability: usageCheck.availability || null,
      result: gateRejectedResult,
      nowMs
    });
    if (typeof showRetentionToast === 'function' && gateRejectedResult.reason !== 'reward_pending') {
      showRetentionToast(String(gateState.hint || 'Reward-Aktion aktuell nicht verfuegbar.'));
    }
    renderAll();
    schedulePersistState(true);
    return gateRejectedResult;
  }

  const coinCost = getRewardActionCoinCost(actionType, state);
  const bypassCoinCost = shouldBypassRewardActionCoinCost(actionType, payload);
  if (!bypassCoinCost && coinCost > 0 && !canAfford(coinCost)) {
    const coinBlockedResult = {
      ok: false,
      type: actionType,
      reason: 'insufficient_coins',
      requiredCoins: coinCost,
      currentCoins: getCoins()
    };
    markRewardActionUsed(actionType, {
      nowMs,
      rejected: true,
      reason: coinBlockedResult.reason,
      result: coinBlockedResult
    });
    emitCoinTelemetry({
      type: 'coin_spend_blocked',
      payload: {
        actionType,
        amount: coinCost,
        balance: getCoins()
      }
    });
    onRewardActionRejected(actionType, {
      payload,
      provider: 'coin',
      policy: runtimePolicy,
      reason: coinBlockedResult.reason,
      availability: usageCheck.availability || null,
      result: coinBlockedResult,
      nowMs
    });
    if (typeof showRetentionToast === 'function') {
      showRetentionToast(`Nicht genug Coins · ${coinCost} benötigt`);
    }
    openInsufficientCoinsFlow({
      requiredCoins: coinCost,
      currentCoins: getCoins(),
      actionType,
      source: String(payload.source || 'reward_action')
    });
    renderAll();
    schedulePersistState(true);
    return coinBlockedResult;
  }

  rewardGrantRuntime.pending = gateState.grantMode !== 'direct';
  rewardGrantRuntime.actionType = rewardGrantRuntime.pending ? actionType : '';
  rewardGrantRuntime.requestId += 1;
  const activeRequestId = rewardGrantRuntime.requestId;
  recordRewardTelemetry('reward_grant_requested', {
    type: actionType,
    providerMode: String(gateState.grantMode || ''),
    providerStatus: gateState.providerStatus && gateState.providerStatus.state ? gateState.providerStatus.state : '',
    policy: runtimePolicy,
    availability: usageCheck.availability || null,
    cooldownRemainingMs: Math.max(0, Number(usageCheck.cooldownRemainingMs) || 0),
    timestampMs: nowMs
  });
  renderAll();

  let grantResult;
  try {
    grantResult = await requestRewardGrant(actionType, payload, {
      gateState,
      nowMs
    });
  } finally {
    if (rewardGrantRuntime.requestId === activeRequestId) {
      rewardGrantRuntime.pending = false;
      rewardGrantRuntime.actionType = '';
    }
  }

  if (!grantResult || !grantResult.ok) {
    const rejectedResult = {
      ok: false,
      type: actionType,
      reason: String(grantResult && grantResult.reason || 'reward_error')
    };
    markRewardActionUsed(actionType, {
      nowMs,
      rejected: true,
      reason: rejectedResult.reason,
      result: rejectedResult
    });
    onRewardActionRejected(actionType, {
      payload,
      provider: String(grantResult && grantResult.mode || gateState.grantMode || runtime.provider),
      providerStatus: gateState.providerStatus && gateState.providerStatus.state ? gateState.providerStatus.state : '',
      policy: runtimePolicy,
      reason: rejectedResult.reason,
      availability: usageCheck.availability || null,
      result: rejectedResult,
      nowMs
    });
    if (typeof showRetentionToast === 'function') {
      const rejectHint = rejectedResult.reason === 'reward_cancelled'
        ? 'Aktion nicht bestaetigt'
        : 'Reward-Aktion aktuell nicht verfuegbar';
      showRetentionToast(rejectHint);
    }
    renderAll();
    schedulePersistState(true);
    return rejectedResult;
  }

  const grantAtMs = Math.max(nowMs, Number(grantResult.grantedAtMs) || Date.now());
  markRewardActionUsed(actionType, { nowMs: grantAtMs, granted: true, lastResult: 'granted' });
  onRewardActionGranted(actionType, {
    payload,
    provider: String(grantResult.mode || gateState.grantMode || runtime.provider),
    providerStatus: gateState.providerStatus && gateState.providerStatus.state ? gateState.providerStatus.state : '',
    policy: runtimePolicy,
    availability: usageCheck.availability || null,
    grantResult,
    nowMs: grantAtMs
  });

  let spendResult = null;
  if (!bypassCoinCost && coinCost > 0) {
    spendResult = spendCoins(coinCost, `reward_action:${actionType}`);
    if (!spendResult.ok) {
      const spendBlockedResult = {
        ok: false,
        type: actionType,
        reason: spendResult.reason || 'coin_spend_failed',
        requiredCoins: coinCost,
        currentCoins: getCoins()
      };
      markRewardActionUsed(actionType, {
        nowMs: Date.now(),
        rejected: true,
        reason: spendBlockedResult.reason,
        result: spendBlockedResult
      });
      onRewardActionRejected(actionType, {
        payload,
        provider: 'coin',
        policy: runtimePolicy,
        reason: spendBlockedResult.reason,
        availability: usageCheck.availability || null,
        result: spendBlockedResult,
        nowMs: Date.now()
      });
      if (typeof showRetentionToast === 'function') {
        showRetentionToast('Nicht genug Coins fuer diese Aktion');
      }
      openInsufficientCoinsFlow({
        requiredCoins: coinCost,
        currentCoins: getCoins(),
        actionType,
        source: String(payload.source || 'reward_action')
      });
      renderAll();
      schedulePersistState(true);
      return spendBlockedResult;
    }
  }

  const executeAtMs = Date.now();
  const result = executeRewardAction(actionType, {
    ...payload,
    grantResult
  });
  if (!result.ok && spendResult && spendResult.ok && coinCost > 0) {
    grantCoins(
      coinCost,
      `reward_action_refund:${actionType}`,
      `coin_refund:${actionType}:${activeRequestId}:${executeAtMs}`
    );
    result.coinsAfter = getCoins();
  } else if (result.ok && spendResult && spendResult.ok && coinCost > 0) {
    result.coinCost = coinCost;
    result.coinsAfter = getCoins();
  }
  if (result.ok) {
    markRewardActionUsed(actionType, {
      nowMs: executeAtMs,
      executed: true,
      result
    });
    onRewardActionExecuted(actionType, {
      payload,
      provider: String(grantResult.mode || gateState.grantMode || runtime.provider),
      providerStatus: gateState.providerStatus && gateState.providerStatus.state ? gateState.providerStatus.state : '',
      policy: runtimePolicy,
      grantResult,
      result,
      nowMs: executeAtMs
    });
  } else {
    markRewardActionUsed(actionType, {
      nowMs: executeAtMs,
      rejected: true,
      reason: result.reason || 'execution_failed',
      result
    });
    onRewardActionRejected(actionType, {
      payload,
      provider: String(grantResult.mode || gateState.grantMode || runtime.provider),
      providerStatus: gateState.providerStatus && gateState.providerStatus.state ? gateState.providerStatus.state : '',
      policy: runtimePolicy,
      reason: result.reason || 'execution_failed',
      grantResult,
      result,
      nowMs: executeAtMs
    });
  }
  renderAll();
  schedulePersistState(true);

  if (result.ok && typeof showRetentionToast === 'function') {
    const presentation = getRewardActionPresentation(actionType, payload);
    if (presentation.successToast) {
      showRetentionToast(presentation.successToast);
    }
  }

  return result;
  } finally {
    rewardActionInFlight.delete(actionType);
  }
}

function onSkipNightAction() {
  return triggerRewardAction(REWARD_ACTION_TYPES.NIGHT_SHIFT);
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
  return new Date(simTimeMs).toLocaleTimeString(getIntlLocaleForCurrentLanguage(), {
    hour: '2-digit',
    minute: '2-digit'
  });
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
  refreshHarvestForecast();
  renderActiveScreen();
  renderOverlayModules();
  migrateSettings(state);
  updateSettingsUI();
  renderLanding();
  renderDeathOverlay();
  renderRunSummaryOverlay();
  applyI18nTranslations(document);
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
  renderLeaderboardSheet(false);
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

function derivePlayerSignalState(statusLike = {}, diagnosticsLike = {}, eventStatusLike = {}, retentionLike = {}) {
  const status = statusLike && typeof statusLike === 'object' ? statusLike : {};
  const diagnostics = diagnosticsLike && typeof diagnosticsLike === 'object' ? diagnosticsLike : {};
  const eventStatus = eventStatusLike && typeof eventStatusLike === 'object' ? eventStatusLike : {};
  const retention = retentionLike && typeof retentionLike === 'object' ? retentionLike : {};
  const health = clamp(Number(status.health || 0), 0, 100);
  const stress = clamp(Number(status.stress || 0), 0, 100);
  const risk = clamp(Number(status.risk || 0), 0, 100);
  const water = clamp(Number(status.water || 0), 0, 100);
  const nutrition = clamp(Number(status.nutrition || 0), 0, 100);
  const primaryIssue = diagnostics.primaryIssue && typeof diagnostics.primaryIssue === 'object'
    ? diagnostics.primaryIssue
    : null;
  const primarySeverity = String(primaryIssue && primaryIssue.severity || '').toLowerCase();
  const eventValue = String(eventStatus.value || '').toLowerCase();
  const hasCriticalEvent = eventValue.includes('ereignis aktiv') || primarySeverity === 'critical';
  if (
    health <= 30
    || water <= 18
    || nutrition <= 18
    || stress >= 70
    || risk >= 70
    || primarySeverity === 'high'
    || hasCriticalEvent
  ) {
    return 'danger';
  }
  if (
    health <= 55
    || water <= 40
    || nutrition <= 40
    || stress >= 40
    || risk >= 40
    || primarySeverity === 'medium'
    || Number(retention.dailyRemaining || 0) > 0
  ) {
    return 'warning';
  }
  return 'good';
}

function getPlayerSignalLabel(signalState) {
  switch (String(signalState || 'good')) {
    case 'danger':
      return 'Status: kritisch';
    case 'warning':
      return 'Status: beobachten';
    case 'good':
    default:
      return 'Status: stabil';
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
  const isDaytime = isDaytimeAtSimTime(Number(simulation.simTimeMs || 0));
  const status = sourceState.status || {};
  const boost = sourceState.boost || {};
  const profile = getCanonicalProfile(sourceState);
  const run = getCanonicalRun(sourceState);
  const progressionApi = getProgressionApi();

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
  const coinBalance = getCoins(sourceState);
  const playerLevel = Number(profile.level || 1); const playerRole = playerLevel >= 6 ? 'Master Grower' : (playerLevel >= 4 ? 'Lead Grower' : (playerLevel >= 2 ? 'Grow Operator' : 'Starter'));

  const environment = deriveEnvironmentReadout(sourceState);
  const roots = deriveRootZoneReadout(environment, sourceState);
  const careBoostPresentation = getRewardActionPresentation(REWARD_ACTION_TYPES.CARE_BOOST, { state: sourceState, context: 'home' });
  const skipNightPresentation = getRewardActionPresentation(REWARD_ACTION_TYPES.NIGHT_SHIFT, { state: sourceState, context: 'home' });
  const climateStabilizePresentation = getRewardActionPresentation(REWARD_ACTION_TYPES.CLIMATE_STABILIZE, { state: sourceState, context: 'home' });
  const emergencySavePresentation = getRewardActionPresentation(REWARD_ACTION_TYPES.EMERGENCY_SAVE, { state: sourceState, context: 'home' });
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
  const harvestForecast = getCanonicalHarvestForecast(sourceState);
  const retention = ensureRetentionState(sourceState);
  const retentionTodayKey = getLocalDayKey(Date.now());
  const streak = retention.streak || {};
  const streakCount = Math.max(0, Math.trunc(Number(streak.currentCount) || 0));
  const streakDoneToday = String(streak.lastQualifiedDayKey || streak.lastCheckinDayKey || '') === retentionTodayKey;
  const streakBest = Math.max(streakCount, Math.max(0, Math.trunc(Number(streak.bestCount) || 0)));
  const nextStreakReward = resolveNextStreakRewardPreview(streakCount);
  const nextMilestone = RETENTION_STREAK_MILESTONES.find((entry) => entry > streakCount) || null;
  const dailyTasks = Array.isArray(retention.dailyCare && retention.dailyCare.tasks) ? retention.dailyCare.tasks : [];
  const dailyCompleted = Math.max(0, Math.trunc(Number(retention.dailyCare && retention.dailyCare.completedCount) || 0));
  const dailyTotal = dailyTasks.length;
  const dailyClaimable = dailyTasks.reduce((count, task) => {
    if (!task || typeof task !== 'object') {
      return count;
    }
    return (Boolean(task.completed) && !Boolean(task.claimed)) ? (count + 1) : count;
  }, 0);
  const dailyClaimed = dailyTasks.reduce((count, task) => {
    if (!task || typeof task !== 'object') {
      return count;
    }
    return Boolean(task.claimed) ? (count + 1) : count;
  }, 0);
  const dailyRemaining = Math.max(0, dailyTotal - dailyCompleted);
  const retentionState = (() => {
    if (dailyTotal <= 0) {
      return 'idle';
    }
    if (dailyClaimable > 0) {
      return 'claimable';
    }
    if (dailyCompleted <= 0) {
      return 'idle';
    }
    if (dailyClaimed >= dailyTotal) {
      return 'claimed';
    }
    return 'in_progress';
  })();
  const streakHint = streakDoneToday
    ? i18nT('daily.retention.streak_secured', { coins: nextStreakReward })
    : (nextMilestone
      ? i18nT('daily.retention.streak_push_milestone', {
        target: Math.max(streakCount + 1, nextMilestone)
      })
      : i18nT('daily.retention.streak_push_next', { streak: streakCount + 1 }));
  const rewardHint = i18nT('daily.retention.next_streak_bonus', { coins: nextStreakReward });
  const teaserLine = (() => {
    if (dailyTotal <= 0) {
      return streakHint;
    }
    if (dailyClaimable > 0) {
      return dailyClaimable === 1
        ? i18nT('daily.retention.claim_ready_single')
        : i18nT('daily.retention.claim_ready_multi', { count: dailyClaimable });
    }
    if (dailyClaimed >= dailyTotal) {
      return i18nT('daily.retention.all_collected_today');
    }
    if (dailyRemaining === 1) {
      return i18nT('daily.retention.one_step_left');
    }
    if (dailyCompleted > 0) {
      return i18nT('daily.retention.progress_keep_going', { done: dailyCompleted, total: dailyTotal });
    }
    return i18nT('daily.retention.today_three_goals');
  })();

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
    isDaytime,
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
      careBoostDisabled: dead || Boolean(careBoostPresentation.disabled),
      careBoostHint: String(careBoostPresentation.hint || ''),
      boostDisabled: dead,
      climateStabilizeDisabled: dead || Boolean(climateStabilizePresentation.disabled),
      climateStabilizeHint: String(climateStabilizePresentation.hint || ''),
      diagnosisDisabled: dead,
      emergencySaveHint: String(emergencySavePresentation.hint || ''),
      emergencySaveReady: Boolean(!dead && !emergencySavePresentation.disabled),
      skipNightDisabled: dead || Boolean(skipNightPresentation.disabled),
      skipNightHint: String(skipNightPresentation.hint || ''),
      showSkipNight: !isDaytime && !Boolean(skipNightPresentation.hidden),
      showCareBoost: false,
      showClimateStabilize: false
    },
    diagnostics: {
      summary: String(diagnostics && diagnostics.summary || ''),
      primaryTitle: String(diagnostics && diagnostics.primaryIssue && diagnostics.primaryIssue.title || ''),
      hints: guidanceHints.slice(0, 3)
    },
    playerSignal: (() => {
      const signalState = derivePlayerSignalState(status, diagnostics, eventStatus, { dailyRemaining });
      return {
        state: signalState,
        label: getPlayerSignalLabel(signalState)
      };
    })(),
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
    retention: {
      streakCount,
      streakBest,
      streakDoneToday,
      streakHint,
      nextMilestone,
      nextStreakReward,
      dailyCompleted,
      dailyTotal,
      dailyClaimable,
      dailyClaimed,
      dailyRemaining,
      state: retentionState,
      headline: i18nT('daily.retention.headline', {
        done: dailyCompleted,
        total: Math.max(1, dailyTotal)
      }),
      teaserLine,
      rewardHint,
      teaserText: (() => {
        if (retentionState === 'claimable') {
          return dailyClaimable === 1
            ? i18nT('daily.retention.claim_waiting_single')
            : i18nT('daily.retention.claim_waiting_multi', { count: dailyClaimable });
        }
        if (retentionState === 'claimed') {
          return i18nT('daily.retention.day_complete');
        }
        return teaserLine;
      })()
    },
    harvestForecast: harvestForecast
      ? {
        visible: Boolean(run.status === 'active' || run.status === 'downed'),
        score: Math.round(Number(harvestForecast.harvestScore || 0)),
        qualityText: formatHarvestQualityBand(harvestForecast),
        trendLabel: formatHarvestTrendLabel(harvestForecast.forecastTrend),
        trendSymbol: formatHarvestTrendSymbol(harvestForecast.forecastTrend),
        trend: String(harvestForecast.forecastTrend || 'stable'),
        reason: String(harvestForecast.lastForecastReason || 'Die lokale Prognose wird aufgebaut.')
      }
      : {
        visible: false,
        score: 0,
        qualityText: '--',
        trendLabel: 'Stabil',
        trendSymbol: '→',
        trend: 'stable',
        reason: 'Die lokale Prognose wird aufgebaut.'
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
  const homeMetaRetentionTeaserNode = uiNode('homeMetaRetentionTeaser', 'homeMetaRetentionTeaser');
  const homeMetaBuildChipNode = uiNode('homeMetaBuildChip', 'homeMetaBuildChip');
  const playerSignalNode = uiNode('playerSignalDot', 'playerSignalDot');
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
  const harvestForecastWidgetNode = uiNode('harvestForecastWidget', 'harvestForecastWidget');
  const harvestForecastTrendNode = uiNode('harvestForecastTrend', 'harvestForecastTrend');
  const harvestForecastScoreNode = uiNode('harvestForecastScore', 'harvestForecastScore');
  const harvestForecastQualityNode = uiNode('harvestForecastQuality', 'harvestForecastQuality');
  const runGoalVm = vm.runGoal || {};
  if (homeMetaToggleNode) {
    const retentionVm = vm.retention && typeof vm.retention === 'object' ? vm.retention : {};
    const showHomeMeta = Boolean(runGoalVm.visible || Number(retentionVm.dailyTotal || 0) > 0);
    homeMetaToggleNode.classList.toggle('hidden', !showHomeMeta);
    homeMetaToggleNode.setAttribute('aria-hidden', String(!showHomeMeta));
    homeMetaToggleNode.dataset.status = String(runGoalVm.status || 'active');
    const retentionState = String(retentionVm.state || 'idle');
    homeMetaToggleNode.dataset.retentionState = retentionState;
    homeMetaToggleNode.classList.toggle('home-meta-strip--retention-claimable', retentionState === 'claimable');
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
  if (playerSignalNode) {
    const playerSignal = vm.playerSignal && typeof vm.playerSignal === 'object'
      ? vm.playerSignal
      : {};
    const signalState = ['good', 'warning', 'danger'].includes(String(playerSignal.state || ''))
      ? String(playerSignal.state)
      : 'good';
    const signalLabel = String(playerSignal.label || getPlayerSignalLabel(signalState));
    playerSignalNode.dataset.signal = signalState;
    playerSignalNode.setAttribute('aria-label', signalLabel);
    playerSignalNode.setAttribute('title', signalLabel);
  }
  if (homeMetaRetentionTeaserNode) {
    const retentionVm = vm.retention && typeof vm.retention === 'object' ? vm.retention : {};
    const headline = String(retentionVm.headline || '').trim();
    const streakLine = i18nT('daily.retention.streak_line', {
      streak: Math.max(0, Math.trunc(Number(retentionVm.streakCount) || 0)),
      status: retentionVm.streakDoneToday ? i18nT('daily.today_secured') : i18nT('daily.today_open')
    });
    const primaryLine = String(retentionVm.teaserLine || retentionVm.teaserText || '').trim();
    const rewardHint = String(retentionVm.rewardHint || '').trim();
    const streakRewardLine = [streakLine, rewardHint].filter(Boolean).join(' | ');
    const bottomLine = primaryLine || retentionVm.teaserText || '';
    const nextReward = Math.max(0, Math.trunc(Number(retentionVm.nextStreakReward) || 0));
    const status = String(retentionVm.state || 'idle');
    const teaser = [headline, streakRewardLine, bottomLine].filter(Boolean).join(' ');
    homeMetaRetentionTeaserNode.innerHTML = teaser
      ? `
        <span class="home-retention-card home-retention-card--${escapeHtml(status)}" data-state="${escapeHtml(status)}" aria-label="${escapeHtml(teaser)}">
          <span class="home-retention-card__top">
            <strong class="home-retention-card__headline">${escapeHtml(headline || i18nT('daily.retention.headline', { done: 0, total: 3 }))}</strong>
            <span class="home-retention-card__state">Daily Achievements</span>
          </span>
          <span class="home-retention-card__mid">${escapeHtml(streakRewardLine || i18nT('daily.retention.next_streak_bonus', { coins: nextReward }))}</span>
          <span class="home-retention-card__bottom">${escapeHtml(bottomLine || i18nT('daily.retention.next_streak_bonus', { coins: nextReward }))}</span>
        </span>
      `
      : '';
    homeMetaRetentionTeaserNode.classList.toggle('hidden', !teaser);
    homeMetaRetentionTeaserNode.setAttribute('aria-hidden', String(!teaser));
    if (teaser) {
      homeMetaRetentionTeaserNode.setAttribute('role', 'button');
      homeMetaRetentionTeaserNode.setAttribute('tabindex', '0');
    } else {
      homeMetaRetentionTeaserNode.removeAttribute('role');
      homeMetaRetentionTeaserNode.setAttribute('tabindex', '-1');
    }
    homeMetaRetentionTeaserNode.dataset.state = status;
    homeMetaRetentionTeaserNode.classList.toggle('is-claimable', status === 'claimable');
  }
  if (homeMetaBuildChipNode) {
    homeMetaBuildChipNode.textContent = '';
    homeMetaBuildChipNode.dataset.tone = String(runGoalVm.buildTone || 'balanced');
    homeMetaBuildChipNode.classList.add('hidden');
    homeMetaBuildChipNode.setAttribute('aria-hidden', 'true');
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
  if (typeof window.refreshHomeHudTopAnchors === 'function') {
    window.refreshHomeHudTopAnchors();
  }
  renderHarvestMiniCard(vm.harvestForecast, {
    widgetNode: harvestForecastWidgetNode,
    trendNode: harvestForecastTrendNode,
    scoreNode: harvestForecastScoreNode,
    qualityNode: harvestForecastQualityNode
  });

  const boostUsageTextNode = uiNode('boostUsageText', 'boostUsageText');
  if (boostUsageTextNode && boostUsageTextNode.textContent !== vm.boostText) {
    boostUsageTextNode.textContent = String(vm.boostText || '');
  }

  const healthRingNode = uiNode('healthRing', 'healthRing');
  const stressRingNode = uiNode('stressRing', 'stressRing');
  const waterRingNode = uiNode('waterRing', 'waterRing');
  const nutritionRingNode = uiNode('nutritionRing', 'nutritionRing');
  const growthRingNode = uiNode('growthRing', 'growthRing');
  const riskRingNode = uiNode('riskRing', 'riskRing');
  setRing(healthRingNode, uiNode('healthValue', 'healthValue'), Number(vm.rings && vm.rings.health || 0));
  setRing(stressRingNode, uiNode('stressValue', 'stressValue'), Number(vm.rings && vm.rings.stress || 0));
  setRing(waterRingNode, uiNode('waterValue', 'waterValue'), Number(vm.rings && vm.rings.water || 0));
  setRing(nutritionRingNode, uiNode('nutritionValue', 'nutritionValue'), Number(vm.rings && vm.rings.nutrition || 0));
  setRing(growthRingNode, uiNode('growthValue', 'growthValue'), Number(vm.rings && vm.rings.growth || 0));
  setRing(riskRingNode, uiNode('riskValue', 'riskValue'), Number(vm.rings && vm.rings.risk || 0));
  if (stressRingNode) {
    stressRingNode.removeAttribute('data-stress-visual');
  }
  if (riskRingNode) {
    riskRingNode.removeAttribute('data-risk-visual');
  }
  applyRingVisualState(stressRingNode, 'stressVisual', vm.motion && vm.motion.stressVisual);
  applyRingVisualState(riskRingNode, 'riskVisual', vm.motion && vm.motion.riskVisual);
  applyRingVisualState(growthRingNode, 'growthVisual', vm.motion && vm.motion.growthVisual);
  const activeStatPopupKey = normalizeHomeStatPopupKey(state.ui && state.ui.activeStatPopup);
  const interactiveRingNodes = [
    uiNode('waterRing', 'waterRing'),
    uiNode('nutritionRing', 'nutritionRing'),
    uiNode('stressRing', 'stressRing'),
    uiNode('riskRing', 'riskRing')
  ];
  for (const ringNode of interactiveRingNodes) {
    if (!ringNode) {
      continue;
    }
    const ringKey = normalizeHomeStatPopupKey(ringNode.dataset.coreStatKey || ringNode.id.replace('Ring', ''));
    ringNode.classList.toggle('home-core-stat--active', ringKey === activeStatPopupKey);
  }
  renderHomeStatPopup(vm);
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
  if (homeGuidanceListNode) {
    homeGuidanceListNode.replaceChildren();
    homeGuidanceListNode.dataset.signature = '';
  }
  if (homeGuidancePanelNode) {
    homeGuidancePanelNode.classList.add('hidden');
    homeGuidancePanelNode.setAttribute('aria-hidden', 'true');
  }

  renderPanelReadouts(vm);

  const careActionBtnNode = uiNode('careActionBtn', 'careActionBtn');
  const careBoostActionBtnNode = uiNode('careBoostActionBtn', 'careBoostActionBtn');
  const boostActionBtnNode = uiNode('boostActionBtn', 'boostActionBtn');
  const climateStabilizeActionBtnNode = uiNode('climateStabilizeActionBtn', 'climateStabilizeActionBtn');
  const diagnosisBtnNode = uiNode('openDiagnosisBtn', 'openDiagnosisBtn');
  const skipNightBtnNode = uiNode('skipNightActionBtn', 'skipNightActionBtn');

  if (careActionBtnNode) {
    careActionBtnNode.disabled = dead || Boolean(vm.actions && vm.actions.careDisabled);
  }
  if (careBoostActionBtnNode) {
    careBoostActionBtnNode.disabled = dead || Boolean(vm.actions && vm.actions.careBoostDisabled);
    careBoostActionBtnNode.classList.toggle('hidden', !Boolean(vm.actions && vm.actions.showCareBoost));
    careBoostActionBtnNode.title = String(
      (vm.actions && vm.actions.careBoostHint)
      || (Boolean(vm.actions && vm.actions.careBoostDisabled) ? 'Care Boost ist aktuell nicht noetig.' : 'Care Boost aktivieren')
    );
  }
  if (boostActionBtnNode) {
    boostActionBtnNode.disabled = dead || Boolean(vm.actions && vm.actions.boostDisabled);
  }
  if (climateStabilizeActionBtnNode) {
    climateStabilizeActionBtnNode.disabled = dead || Boolean(vm.actions && vm.actions.climateStabilizeDisabled);
    climateStabilizeActionBtnNode.classList.toggle('hidden', !Boolean(vm.actions && vm.actions.showClimateStabilize));
    climateStabilizeActionBtnNode.title = String(
      (vm.actions && vm.actions.climateStabilizeHint)
      || (Boolean(vm.actions && vm.actions.climateStabilizeDisabled) ? 'Climate Stabilize ist aktuell nicht noetig.' : 'Climate Stabilize aktivieren')
    );
  }
  if (diagnosisBtnNode) {
    diagnosisBtnNode.disabled = dead || Boolean(vm.actions && vm.actions.diagnosisDisabled);
  }
  if (skipNightBtnNode) {
    skipNightBtnNode.disabled = Boolean(vm.actions && vm.actions.skipNightDisabled);
    skipNightBtnNode.classList.toggle('hidden', !Boolean(vm.actions && vm.actions.showSkipNight));
    const skipNightCoinCost = getRewardActionCoinCost(REWARD_ACTION_TYPES.NIGHT_SHIFT, state);
    skipNightBtnNode.title = String(
      (vm.actions && vm.actions.skipNightHint)
      || (Boolean(vm.actions && vm.actions.skipNightDisabled)
        ? `Night Shift kostet ${skipNightCoinCost} Coins und ist nur bei Nacht verfuegbar`
        : `Night Shift aktivieren · ${skipNightCoinCost} Coins`)
    );
    skipNightBtnNode.setAttribute(
      'aria-label',
      Boolean(vm.actions && vm.actions.skipNightDisabled)
        ? `Night Shift nicht verfügbar · ${skipNightCoinCost} Coins`
        : `Night Shift aktivieren · ${skipNightCoinCost} Coins`
    );
  }

  renderOverlayVisibility(vm.overlays);
}

function renderHud() {
  const homeVm = buildHomeViewModel(state);
  updateHomeFromViewModel(homeVm, null);
}

function triggerPlayerHudPulse(node, className = 'is-updating', durationMs = 820) {
  if (!node || !node.classList) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (node.__playerHudPulseTimer) {
    window.clearTimeout(node.__playerHudPulseTimer);
  }

  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  node.__playerHudPulseTimer = window.setTimeout(() => {
    node.classList.remove(className);
    node.__playerHudPulseTimer = null;
  }, durationMs);
}

function renderPanelReadouts(homeVm = null) { const vm = homeVm && typeof homeVm === 'object' ? homeVm : buildHomeViewModel(state);
  const panel = vm.panel || {};

  const playerLevelNode = uiNode('playerLevelBadge', 'playerLevelBadge');
  if (playerLevelNode) {
    const levelText = String(panel.playerLevel || 'LVL 1');
    if (playerLevelNode.textContent !== levelText) {
      playerLevelNode.textContent = levelText;
    }
    const levelNumber = levelText.match(/\d+/);
    playerLevelNode.dataset.level = levelNumber ? levelNumber[0] : '1';
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
    const xpPercent = String(Number(panel.xpPercent || 0));
    const previousXpPercent = playerXpFillNode.style.getPropertyValue('--xp');
    playerXpFillNode.style.setProperty('--xp', xpPercent);
    if (previousXpPercent && previousXpPercent !== xpPercent) {
      triggerPlayerHudPulse(playerXpFillNode.closest('.player-xp-track'));
    }
  }

  const coinNode = uiNode('currencyCoinValue', 'playerCoinValue');
  if (coinNode) {
    const coinText = String(panel.coinText || '');
    const previousCoinText = coinNode.textContent;
    if (previousCoinText !== coinText) {
      coinNode.textContent = coinText;
      if (previousCoinText) {
        triggerPlayerHudPulse(coinNode.closest('.player-coins'));
      }
    }
  }

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
  if (homeClimateBadge || homeClimateCard || climateSheet || climateStatusBadge || climateStatusText) {
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
  const climateController = ensureHomeClimateControllerState(state);
  const selectedField = climateController.selectedField;
  const selectedFieldConfig = {
    temp: {
      label: 'TEMP',
      value: Number(controls.targets.day.temperatureC),
      unit: '°C',
      decimals: 1
    },
    humidity: {
      label: 'RH',
      value: Number(controls.targets.day.humidityPercent),
      unit: '%',
      decimals: 0
    },
    vpd: {
      label: 'VPD',
      value: Number(controls.targets.day.vpdKpa),
      unit: 'kPa',
      decimals: 2
    },
    ppfd: {
      label: 'PPFD',
      value: Number.isFinite(Number(climateController.ppfdTarget))
        ? Number(climateController.ppfdTarget)
        : Number(liveReadout && liveReadout.ppfd),
      unit: 'PPFD',
      decimals: 0
    }
  };
  const activeField = Object.prototype.hasOwnProperty.call(selectedFieldConfig, selectedField)
    ? selectedFieldConfig[selectedField]
    : selectedFieldConfig.temp;
  const activeValue = Number.isFinite(activeField.value) ? activeField.value : 0;
  const activeValueText = activeField.decimals > 0
    ? activeValue.toFixed(activeField.decimals)
    : String(Math.round(activeValue));
  setText('homeClimateMainLabel', activeField.label);
  setText('homeClimateMainValue', activeValueText);
  setText('homeClimateMainUnit', activeField.unit);
  setText('homeClimateMainMode', autoModeActive ? 'AUTO' : 'MANUAL');
  setText(
    'homeClimateStatusText',
    selectedField === 'ppfd' && !Number.isFinite(Number(climateController.ppfdTarget))
      ? 'LIVE'
      : 'TARGET'
  );
  const selectedFieldProgress = {
    temp: clamp((activeValue - 16) / (36 - 16), 0, 1),
    humidity: clamp((activeValue - 30) / (90 - 30), 0, 1),
    vpd: clamp((activeValue - 0.2) / (3.0 - 0.2), 0, 1),
    ppfd: clamp((activeValue - 100) / (1600 - 100), 0, 1)
  };
  const trackFillNode = document.getElementById('homeClimateTrackFill');
  if (trackFillNode) {
    const fallbackProgress = clamp((Number(activeValue) || 0) / 100, 0, 1);
    const nextProgress = Object.prototype.hasOwnProperty.call(selectedFieldProgress, selectedField)
      ? selectedFieldProgress[selectedField]
      : fallbackProgress;
    trackFillNode.style.setProperty('--climate-track', nextProgress.toFixed(3));
  }
  const metricNodes = [
    { id: 'homeClimateMetricTemp', field: 'temp' },
    { id: 'homeClimateMetricHumidity', field: 'humidity' },
    { id: 'homeClimateMetricVpd', field: 'vpd' },
    { id: 'homeClimateMetricPpfd', field: 'ppfd' }
  ];
  for (const metric of metricNodes) {
    const node = document.getElementById(metric.id);
    if (node) {
      node.dataset.active = String(metric.field === selectedField);
    }
  }
  if (homeClimateCard) {
    homeClimateCard.setAttribute('aria-label', `Klima-Controller · ${activeField.label} ${activeValueText} ${activeField.unit}`.trim());
  }
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

const HOME_CLIMATE_CONTROLLER_FIELDS = Object.freeze(['temp', 'humidity', 'vpd', 'ppfd']);

function ensureHomeClimateControllerState(sourceState = state) {
  const target = sourceState && typeof sourceState === 'object' ? sourceState : state;
  if (!target.ui || typeof target.ui !== 'object') {
    target.ui = {};
  }
  if (!target.ui.homeClimateController || typeof target.ui.homeClimateController !== 'object') {
    target.ui.homeClimateController = {
      selectedField: 'temp',
      ppfdTarget: null
    };
  }
  const controller = target.ui.homeClimateController;
  const selectedField = String(controller.selectedField || 'temp').trim();
  controller.selectedField = HOME_CLIMATE_CONTROLLER_FIELDS.includes(selectedField) ? selectedField : 'temp';
  const ppfdTarget = Number(controller.ppfdTarget);
  controller.ppfdTarget = Number.isFinite(ppfdTarget) ? clampInt(ppfdTarget, 100, 1600) : null;
  return controller;
}

function cycleHomeClimateControllerField(direction = 1) {
  const controller = ensureHomeClimateControllerState(state);
  const currentIndex = Math.max(0, HOME_CLIMATE_CONTROLLER_FIELDS.indexOf(controller.selectedField));
  const step = Number(direction) >= 0 ? 1 : -1;
  const nextIndex = (currentIndex + step + HOME_CLIMATE_CONTROLLER_FIELDS.length) % HOME_CLIMATE_CONTROLLER_FIELDS.length;
  controller.selectedField = HOME_CLIMATE_CONTROLLER_FIELDS[nextIndex];
  renderHud();
  schedulePersistState();
}

function stepHomeClimateControllerValue(direction = 1) {
  const stepDirection = Number(direction) >= 0 ? 1 : -1;
  const controller = ensureHomeClimateControllerState(state);
  const selectedField = controller.selectedField;

  if (selectedField === 'temp') {
    const controls = ensureEnvironmentControls(state);
    const nextValue = clamp(Number(controls.targets.day.temperatureC || 25) + (stepDirection * 0.5), 16, 36);
    onEnvironmentControlInput('temperatureC', Number(nextValue.toFixed(1)));
    return;
  }
  if (selectedField === 'humidity') {
    const controls = ensureEnvironmentControls(state);
    const nextValue = clampInt(Number(controls.targets.day.humidityPercent || 60) + stepDirection, 30, 90);
    onEnvironmentControlInput('humidityPercent', nextValue);
    return;
  }
  if (selectedField === 'vpd') {
    const controls = ensureEnvironmentControls(state);
    const nextValue = clamp(Number(controls.targets.day.vpdKpa || 1.2) + (stepDirection * 0.05), 0.2, 3.0);
    onEnvironmentControlInput('dayVpdKpa', Number(nextValue.toFixed(2)));
    return;
  }

  const liveReadout = deriveEnvironmentReadout(state);
  const basePpfd = Number.isFinite(Number(controller.ppfdTarget))
    ? Number(controller.ppfdTarget)
    : Number(liveReadout && liveReadout.ppfd);
  const nextPpfd = clampInt(Math.round((Number(basePpfd || 500) + (stepDirection * 25)) / 25) * 25, 100, 1600);
  controller.ppfdTarget = nextPpfd;
  renderHud();
  schedulePersistState();
}

window.GrowSimHomeClimateController = Object.freeze({
  cycleSelectedField: (direction = 1) => cycleHomeClimateControllerField(direction),
  stepSelectedFieldValue: (direction = 1) => stepHomeClimateControllerValue(direction)
});

function onEnvironmentControlInput(controlKey, rawValue) {
  const controls = ensureEnvironmentControls(state);
  const envApi = window.GrowSimEnvModel;
  const syncClimateRuntime = () => {
    if (envApi && typeof envApi.syncClimateRuntimeTargets === 'function') {
      envApi.syncClimateRuntimeTargets(state, state.status, state.simulation, state.plant);
    }
  };
  if (controlKey === 'vpdTargetEnabled') {
    controls.vpdTargetEnabled = Boolean(rawValue);
    syncClimateRuntime();
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
  syncClimateRuntime();
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
  toggleSheet(ui.imprintSheet, activeSheet === 'imprint');
  toggleSheet(ui.privacySheet, activeSheet === 'privacy');
  toggleSheet(ui.statDetailSheet, activeSheet === 'statDetail');
  toggleSheet(ui.missionsSheet, activeSheet === 'missions');
  toggleSheet(ui.supportSheet, activeSheet === 'support');
  toggleSheet(ui.coinShopSheet, activeSheet === 'coinShop');
  toggleSheet(ui.insufficientCoinsSheet, activeSheet === 'insufficientCoins');
  toggleSheet(ui.leaderboardSheet, activeSheet === 'leaderboard');
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

  renderRewardHintIndicators();
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

  const menuUiApi = getMenuUiPresentationApi();
  const meta = getCanonicalMeta(state);
  const notifications = getCanonicalNotificationsSettings(state);
  const rescueRewardControl = getRewardActionPresentation(REWARD_ACTION_TYPES.EMERGENCY_SAVE, { state, context: 'menu' });
  const rewardPresentation = menuUiApi && typeof menuUiApi.resolveRewardPresentation === 'function'
    ? menuUiApi.resolveRewardPresentation(state, {
      rewardControl: rescueRewardControl,
      sourceMode: rescueRewardControl.providerMode || ''
    })
    : null;
  const menuPresentation = menuUiApi && typeof menuUiApi.resolveMenuPresentation === 'function'
    ? menuUiApi.resolveMenuPresentation(state, {
      rescueMeta: meta.rescue || {},
      pending: rescueAdPending,
      rewardControl: rescueRewardControl,
      rewardPresentation,
      pushUiRuntime,
      pushEnabled: isPushStatusSubscribed(pushUiRuntime.status),
      notifications,
      authed: isAuthSessionValid() && Boolean(readAuthToken())
    })
    : null;
  const menuEntries = menuPresentation && menuPresentation.entries ? menuPresentation.entries : {};

  if (ui.menuStatsBtn && menuEntries.stats) {
    ui.menuStatsBtn.setAttribute('title', String(menuEntries.stats.title || ''));
  }
  if (ui.menuSupportBtn && menuEntries.support) {
    ui.menuSupportBtn.setAttribute('title', String(menuEntries.support.title || ''));
  }
  if (ui.menuMissionsBtn && menuEntries.missions) {
    ui.menuMissionsBtn.setAttribute('title', String(menuEntries.missions.title || ''));
  }
  if (ui.menuCoinShopBtn) {
    ui.menuCoinShopBtn.setAttribute('title', 'Öffnet den Coin-Shop für Zeit, Komfort und direkte Kontrolle.');
  }
  if (ui.menuAboutBtn && menuEntries.about) {
    ui.menuAboutBtn.setAttribute('title', String(menuEntries.about.title || ''));
  }
  if (ui.menuLanguageBtn && menuEntries.language) {
    ui.menuLanguageBtn.setAttribute('title', String(menuEntries.language.title || ''));
  }
  if (ui.analyzeActionBtn) {
    ui.analyzeActionBtn.setAttribute('title', 'Öffnet den Analyse-Report und den protokollierten Run-Verlauf.');
  }
  const menuRescueLabel = document.getElementById('menuRescueLabel');
  if (ui.menuAchievementsBtn) {
    const achievementsPresentation = menuEntries.achievements || {};
    ui.menuAchievementsBtn.disabled = achievementsPresentation.disabled === true;
    ui.menuAchievementsBtn.setAttribute('aria-disabled', String(achievementsPresentation.disabled === true));
    ui.menuAchievementsBtn.classList.add('hidden');
    ui.menuAchievementsBtn.setAttribute('aria-hidden', 'true');
    ui.menuAchievementsBtn.setAttribute('title', String(achievementsPresentation.title || ''));
  }
  if (ui.menuLeaderboardBtn) {
    const leaderboardPresentation = menuEntries.leaderboard || {};
    ui.menuLeaderboardBtn.disabled = leaderboardPresentation.disabled === true;
    ui.menuLeaderboardBtn.setAttribute('aria-disabled', String(leaderboardPresentation.disabled === true));
    ui.menuLeaderboardBtn.classList.remove('hidden');
    ui.menuLeaderboardBtn.setAttribute('aria-hidden', 'false');
    ui.menuLeaderboardBtn.setAttribute('title', String(leaderboardPresentation.title || ''));
  }

  const rescuePresentation = menuEntries.rescue || {};
  ui.menuRescueBtn.disabled = rescuePresentation.disabled === true;
  ui.menuRescueBtn.setAttribute('aria-disabled', String(rescuePresentation.disabled === true));
  ui.menuRescueBtn.setAttribute('title', String(rescuePresentation.title || ''));
  if (menuRescueLabel) {
    menuRescueLabel.textContent = String(rescuePresentation.label || 'Notfallrettung');
  }
  ui.menuRescueSubtext.textContent = String(rescuePresentation.subtext || '');

  const enabled = isPushStatusSubscribed(pushUiRuntime.status);
  notifications.enabled = enabled;
  state.settings.pushNotificationsEnabled = enabled;
  ui.menuPushBtn.setAttribute('aria-pressed', String(enabled));
  const pushPresentation = menuEntries.push || {};
  ui.menuPushBtn.disabled = pushPresentation.disabled === true;
  ui.menuPushBtn.setAttribute('title', String(pushPresentation.title || ''));
  ui.menuPushStatus.textContent = String(pushPresentation.subtext || '');
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

function getEventUiViewModel() {
  const eventEngine = window.GrowSimEventEngine;
  if (eventEngine && typeof eventEngine.getUiModel === 'function') {
    return eventEngine.getUiModel(state);
  }

  return {
    popup: {
      machineState: String(state.events.machineState || 'idle'),
      title: String(state.events.activeEventTitle || ''),
      description: String(state.events.activeEventText || ''),
      category: String(state.events.activeCategory || 'generic'),
      severity: Number(state.events.activeSeverity || 0),
      shadowSummary: { available: false }
    },
    detail: {
      learningNote: String(state.events.activeLearningNote || ''),
      options: Array.isArray(state.events.activeOptions) ? state.events.activeOptions.slice() : [],
      shadowSummary: { available: false }
    },
    media: {
      kind: state.events.activeImagePath ? 'image' : 'placeholder',
      assetId: null,
      src: state.events.activeImagePath ? String(state.events.activeImagePath) : null,
      alt: state.events.activeEventTitle ? `${state.events.activeEventTitle} – Ereignisvisual` : 'Ereignisvisual',
      label: null,
      badge: null,
      fallbackOrigin: state.events.activeImagePath ? 'legacy_active_image' : 'generic_placeholder',
      title: String(state.events.activeEventTitle || 'Event'),
      subtitle: ''
    }
  };
}

function hasModernEventPresentationNodes() {
  if (typeof document === 'undefined') {
    return false;
  }
  return Boolean(
    document.getElementById('eventSheetModernRoot')
    && document.getElementById('eventSheetLegacyRoot')
  );
}

function setEventPresentationExclusiveState(active) {
  const enabled = Boolean(active && hasModernEventPresentationNodes());
  const eventSheet = uiNode('eventSheet', 'eventSheet') || (typeof document !== 'undefined' ? document.getElementById('eventSheet') : null);
  const modernRoot = typeof document !== 'undefined' ? document.getElementById('eventSheetModernRoot') : null;
  const legacyRoot = typeof document !== 'undefined' ? document.getElementById('eventSheetLegacyRoot') : null;

  if (eventSheet) {
    eventSheet.dataset.eventUiMode = enabled ? 'modern-exclusive' : 'legacy';
    eventSheet.classList.toggle('event-sheet--modern-exclusive', enabled);
    eventSheet.classList.toggle('event-sheet--legacy-suppressed', enabled);
    if (enabled) {
      eventSheet.setAttribute('data-legacy-render-suppressed', 'true');
    } else {
      eventSheet.removeAttribute('data-legacy-render-suppressed');
    }
  }

  if (modernRoot) {
    modernRoot.classList.toggle('hidden', !enabled);
    modernRoot.setAttribute('aria-hidden', String(!enabled));
    if ('inert' in modernRoot) {
      modernRoot.inert = !enabled;
    }
  }

  if (legacyRoot) {
    legacyRoot.classList.toggle('hidden', enabled);
    legacyRoot.setAttribute('aria-hidden', String(enabled));
    if ('inert' in legacyRoot) {
      legacyRoot.inert = enabled;
    }
  }

  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('event-ui-modern-active', enabled);
  }

  window.__GS_EVENT_UI_MODE = enabled ? 'modern-exclusive' : 'legacy';
  window.__GS_EVENT_UI_EXCLUSIVE_ACTIVE = enabled;
}

function getEventAssetsModule() {
  return window.GrowSimEventAssetsModule && typeof window.GrowSimEventAssetsModule.buildMediaModel === 'function'
    ? window.GrowSimEventAssetsModule
    : null;
}

function isEventAssetInspectionEnabled() {
  if (window.__GS_DEV_EVENT_ASSET_INSPECT === true) {
    return true;
  }
  try {
    return window.localStorage && window.localStorage.getItem('gs_event_asset_inspect') === '1';
  } catch (_error) {
    return false;
  }
}

function humanizeEventIdentifier(value) {
  const safe = String(value || '').trim();
  if (!safe) return 'Event';
  return safe
    .replace(/^v2_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function resolveSharedEventMediaModel(input) {
  const assetsModule = getEventAssetsModule();
  if (assetsModule) {
    return assetsModule.buildMediaModel(input || {});
  }
  return {
    kind: input && input.activeImagePath ? 'image' : 'placeholder',
    assetId: null,
    src: input && input.activeImagePath ? String(input.activeImagePath) : null,
    alt: input && input.title ? `${input.title} – Ereignisvisual` : 'Ereignisvisual',
    label: null,
    badge: null,
    fallbackOrigin: input && input.activeImagePath ? 'legacy_active_image' : 'generic_placeholder',
    title: String(input && input.title || 'Event'),
    subtitle: '',
    devNotes: []
  };
}

function deriveEventPresentationTone(viewModel, machineState, options = {}) {
  const popup = viewModel && viewModel.popup && typeof viewModel.popup === 'object' ? viewModel.popup : {};
  const shadow = popup.shadowSummary && typeof popup.shadowSummary === 'object' ? popup.shadowSummary : {};
  const mode = String(options.mode || '').trim();
  const resolvedTone = toneFromOutcome(getResolvedOutcomeView());

  if (mode === 'history') return 'history';
  if (mode === 'resolved') return 'resolved';
  if (machineState === 'resolved' && resolvedTone) return resolvedTone;
  if (machineState === 'resolving') return 'active';
  if (shadow.primaryState) return String(shadow.primaryState);
  if (shadow.rewardClass || shadow.rewardSummary) return 'reward';
  if (shadow.topFollowUpId || shadow.chainSummary) return 'followup';
  if (machineState === 'activeEvent') return 'active';
  if (machineState === 'resolved') return 'resolved';
  return 'idle';
}

function eventToneLabel(tone) {
  const map = {
    warning: 'Warnung',
    active: 'Aktiv',
    escalating: 'Eskalierend',
    escalated: 'Kritisch',
    reward: 'Belohnung',
    followup: 'Folgepfad',
    history: 'Analyse',
    resolved: 'Verlauf',
    idle: 'Bereit'
  };
  return map[String(tone || 'idle')] || 'Event';
}

function getPendingOutcomeView() {
  return state.events && state.events.pendingOutcome && typeof state.events.pendingOutcome === 'object'
    ? state.events.pendingOutcome
    : null;
}

function getResolvedOutcomeView() {
  return state.events && state.events.resolvedOutcome && typeof state.events.resolvedOutcome === 'object'
    ? state.events.resolvedOutcome
    : null;
}

function toneFromOutcome(outcome) {
  const safeOutcome = outcome && typeof outcome === 'object' ? outcome : {};
  const outcomeStatus = String(safeOutcome.outcomeStatus || '').trim().toLowerCase();
  const summary = String(safeOutcome.summary || safeOutcome.quality || '').trim().toLowerCase();

  if (outcomeStatus === 'improved' || summary === 'good') return 'reward';
  if (outcomeStatus === 'escalated') return 'escalating';
  if (outcomeStatus === 'worsened') return 'followup';
  if (outcomeStatus === 'stabilized') return 'resolved';
  return '';
}

function formatOutcomeStatusLabel(outcomeStatus) {
  const map = {
    improved: 'Verbessert',
    stabilized: 'Stabilisiert',
    worsened: 'Anfällig',
    escalated: 'Eskaliert',
    unresolved: 'Offen'
  };
  return map[String(outcomeStatus || '').trim().toLowerCase()] || '';
}

function formatOutcomeFollowUpLabel(followUpIds, prefix = 'Folgepfad vorgemerkt') {
  const ids = Array.isArray(followUpIds)
    ? followUpIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  if (!ids.length) {
    return '';
  }
  const humanized = ids.slice(0, 2).map((id) => humanizeEventIdentifier(id));
  const suffix = ids.length > 2 ? ' +' : '';
  return `${prefix}: ${humanized.join(' · ')}${suffix}`;
}

function buildHistoryNarrative(entry) {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const analysis = safeEntry.analysis && typeof safeEntry.analysis === 'object' ? safeEntry.analysis : {};
  return {
    title: String(safeEntry.eventTitle || humanizeEventIdentifier(safeEntry.eventId)),
    explanationText: String(safeEntry.explanationText || ''),
    resultText: String(safeEntry.resultText || analysis.resultText || ''),
    causeText: String(safeEntry.causeText || analysis.causeText || ''),
    guidanceText: String(safeEntry.guidanceText || analysis.guidanceText || ''),
    learningNote: String(safeEntry.learningNote || ''),
    followUpText: formatOutcomeFollowUpLabel(safeEntry.followUpIds, 'Folgepfad'),
    tone: String(analysis.tone || ''),
    outcomeStatus: String(safeEntry.outcomeStatus || '')
  };
}

function formatEventAuditGap(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (!safeValue) {
    return '';
  }
  const minutes = Math.round(safeValue / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours}h ${restMinutes}m` : `${hours}h`;
}

function getEventAuditSnapshotView() {
  const eventApi = window.GrowSimEvents;
  if (eventApi && typeof eventApi.getEventAuditSnapshot === 'function') {
    return eventApi.getEventAuditSnapshot();
  }
  const audit = state.events && state.events.audit && typeof state.events.audit === 'object'
    ? state.events.audit
    : null;
  if (!audit) {
    return null;
  }
  return audit;
}

function getEventAuditInterpretationView(auditSnapshot = null) {
  const audit = auditSnapshot && typeof auditSnapshot === 'object'
    ? auditSnapshot
    : getEventAuditSnapshotView();
  if (!audit || typeof audit !== 'object') {
    return null;
  }
  const eventApi = window.GrowSimEvents;
  if (eventApi && typeof eventApi.getEventAuditInterpretation === 'function') {
    return eventApi.getEventAuditInterpretation(audit);
  }
  return null;
}

function describeEventAuditPhaseTone(interpretation) {
  const safeInterpretation = interpretation && typeof interpretation === 'object' ? interpretation : {};
  const metrics = safeInterpretation.metrics && typeof safeInterpretation.metrics === 'object'
    ? safeInterpretation.metrics
    : {};
  switch (String(metrics.phaseBand || metrics.currentPhase || '')) {
    case 'vegetative':
      return 'in der Vegetation';
    case 'stretch':
      return 'in der Stretch-Phase';
    case 'flower':
      return 'in der Bluete';
    case 'late_flower':
      return 'in der spaeten Bluete';
    case 'harvest':
      return 'zum Run-Ende';
    default:
      return '';
  }
}

function formatEventAuditStateSummary(primaryState, interpretation = null) {
  const safeInterpretation = interpretation && typeof interpretation === 'object' ? interpretation : {};
  const phaseTone = describeEventAuditPhaseTone(safeInterpretation);
  const confidence = String(safeInterpretation.confidence || 'low');
  switch (String(primaryState || '')) {
    case 'stabilizing':
      if (String(safeInterpretation.metrics && safeInterpretation.metrics.phaseBand || '') === 'late_flower') {
        return 'Die juengsten Entscheidungen halten den Run derzeit kontrollierbar. Die Lage beruhigt sich schrittweise.';
      }
      return phaseTone
        ? `Die juengsten Entscheidungen beruhigen den Verlauf ${phaseTone} bereits spuerbar.`
        : 'Die juengsten Entscheidungen beruhigen den Verlauf bereits spuerbar.';
    case 'escalating':
      return phaseTone
        ? `Der Druck zieht ${phaseTone} weiter an. Eskalationen und offene Folgepfade praegen den Verlauf.`
        : 'Der Druck baut sich weiter auf. Eskalationen und offene Folgepfade praegen den Verlauf.';
    case 'vulnerable':
      return phaseTone
        ? `Der Run bleibt ${phaseTone} noch anfaellig. Negative Nachwirkungen klingen noch nicht sauber ab.`
        : 'Der Run bleibt noch anfaellig. Negative Nachwirkungen klingen noch nicht sauber ab.';
    case 'dense':
      return phaseTone
        ? `Mehrere Eventfenster liegen ${phaseTone} enger zusammen. Der Run fuehlt sich derzeit deutlich dichter an.`
        : 'Mehrere Eventfenster liegen enger zusammen. Der Run fuehlt sich derzeit deutlich dichter an.';
    case 'reactive':
      return phaseTone
        ? `Der Run reagiert ${phaseTone} spuerbar, bleibt aber noch kontrollierbar.`
        : 'Der Run reagiert spuerbar, bleibt aber noch kontrollierbar.';
    case 'quiet':
      if (confidence === 'low') {
        return 'Der Run bleibt bislang noch ruhig. Fuer eine harte Tendenz sind erst wenige Eventdaten vorhanden.';
      }
      return phaseTone
        ? `Der Run wirkt ${phaseTone} ruhig gefuehrt. Zwischen den Ereignissen liegen genug entspannte Fenster.`
        : 'Der Run wirkt ruhig gefuehrt. Zwischen den Ereignissen liegen genug entspannte Fenster.';
    case 'balanced':
    default:
      return phaseTone
        ? `Der Run bleibt ${phaseTone} bislang ausgewogen. Druck und Entlastung halten sich weitgehend die Waage.`
        : 'Der Run bleibt bislang ausgewogen. Druck und Entlastung halten sich weitgehend die Waage.';
  }
}

function buildEventAuditSupportText(interpretation) {
  const safeInterpretation = interpretation && typeof interpretation === 'object' ? interpretation : {};
  const metrics = safeInterpretation.metrics && typeof safeInterpretation.metrics === 'object'
    ? safeInterpretation.metrics
    : {};
  const phaseTone = describeEventAuditPhaseTone(safeInterpretation);
  const parts = [];
  if (safeInterpretation.confidence === 'low') {
    parts.push('Noch wenige Eventdaten');
  } else {
    parts.push(`${Math.max(0, Math.trunc(Number(metrics.activated) || 0))} Events im Run`);
  }
  if (phaseTone) {
    parts.push(phaseTone);
  }
  if (metrics.dominantCategory && Number(metrics.dominantCategoryShare || 0) >= 0.5) {
    parts.push(`Fokus: ${categoryLabel(metrics.dominantCategory)}`);
  }
  if (Number(metrics.meanGapSimMs || 0) > 0) {
    parts.push(`Ø Abstand ${formatEventAuditGap(metrics.meanGapSimMs)}`);
  }
  if (safeInterpretation.followUpState === 'constructive') {
    parts.push('Folgepfade greifen sauber');
  } else if (safeInterpretation.followUpState === 'building') {
    parts.push(String(metrics.phaseBand || '') === 'flower' || String(metrics.phaseBand || '') === 'late_flower'
      ? 'Folgepfade bleiben aktiv'
      : 'Folgepfade bauen sich auf');
  } else if (safeInterpretation.followUpState === 'fading') {
    parts.push('Folgepfade versanden haeufig');
  } else if (Number(metrics.pendingFollowUps || 0) > 0) {
    parts.push(`${Math.max(0, Math.trunc(Number(metrics.pendingFollowUps) || 0))} Folgepfade offen`);
  }
  if (safeInterpretation.confidence === 'low' && !parts.includes('Noch wenige Eventdaten')) {
    parts.unshift('Noch wenige Eventdaten');
  }
  return parts.filter(Boolean).slice(0, 3).join(' · ');
}

function buildEventAuditMarkers(interpretation) {
  const safeInterpretation = interpretation && typeof interpretation === 'object' ? interpretation : {};
  const metrics = safeInterpretation.metrics && typeof safeInterpretation.metrics === 'object'
    ? safeInterpretation.metrics
    : {};
  const tuningFlags = Array.isArray(safeInterpretation.tuningFlags) ? safeInterpretation.tuningFlags : [];
  const markers = [];
  if (safeInterpretation.balanceState === 'stabilizing') {
    markers.push('Stabilisierung sichtbar');
  } else if (safeInterpretation.balanceState === 'escalating') {
    markers.push('Druck bleibt aktiv');
  } else if (safeInterpretation.balanceState === 'vulnerable') {
    markers.push('Run bleibt anfaellig');
  }
  if (safeInterpretation.densityState === 'dense') {
    markers.push('Hohe Eventdichte');
  } else if (safeInterpretation.densityState === 'reactive') {
    markers.push('Leicht reaktiv');
  } else if (safeInterpretation.densityState === 'quiet' && Number(metrics.activated || 0) <= 2) {
    markers.push('Ruhiger Verlauf');
  }
  if (safeInterpretation.followUpState === 'constructive') {
    markers.push('Folgepfade greifen');
  } else if (safeInterpretation.followUpState === 'building') {
    markers.push('Folgepfade offen');
  } else if (safeInterpretation.followUpState === 'fading') {
    markers.push('Folgepfade laufen aus');
  }
  if (markers.length < 3 && tuningFlags.includes('category_dominance') && metrics.dominantCategory) {
    markers.push(`${categoryLabel(metrics.dominantCategory)} dominiert`);
  }
  if (markers.length < 3 && tuningFlags.includes('repeat_pressure_high')) {
    markers.push('Wiederholungen spuerbar');
  }
  return markers.filter(Boolean).slice(0, 3);
}

function getEventAuditViewModel() {
  const audit = getEventAuditSnapshotView();
  if (!audit || typeof audit !== 'object') {
    return null;
  }

  const interpretation = getEventAuditInterpretationView(audit);
  const metrics = interpretation && interpretation.metrics && typeof interpretation.metrics === 'object'
    ? interpretation.metrics
    : {};
  const activated = Math.max(0, Math.trunc(Number(metrics.activated || audit.totalActivated || (audit.totals && audit.totals.activated)) || 0));
  const resolved = Math.max(0, Math.trunc(Number(metrics.resolved || audit.totalResolved || (audit.totals && audit.totals.resolved)) || 0));
  const queuedFollowUps = Math.max(0, Math.trunc(Number(metrics.queuedFollowUps || (audit.totals && audit.totals.queuedFollowUps)) || 0));
  if (!activated && !resolved && !queuedFollowUps) {
    return null;
  }
  const summary = formatEventAuditStateSummary(interpretation && interpretation.primaryState, interpretation);
  const support = buildEventAuditSupportText(interpretation);
  const markers = buildEventAuditMarkers(interpretation);

  return {
    summary,
    support,
    markers
  };
}

function buildEventPresentationSections(viewModel, machineState) {
  const popup = viewModel && viewModel.popup && typeof viewModel.popup === 'object' ? viewModel.popup : {};
  const detail = viewModel && viewModel.detail && typeof viewModel.detail === 'object' ? viewModel.detail : {};
  const shadow = popup.shadowSummary && typeof popup.shadowSummary === 'object' ? popup.shadowSummary : {};
  const pendingOutcome = getPendingOutcomeView();
  const resolvedOutcome = getResolvedOutcomeView();
  const inspect = isEventAssetInspectionEnabled();
  const sections = [];
  const tone = deriveEventPresentationTone(viewModel, machineState);

  if (machineState === 'resolving' && pendingOutcome) {
    const actionBody = pendingOutcome.optionLabel
      ? `Ausgewählte Maßnahme: ${pendingOutcome.optionLabel}.`
      : 'Die zuletzt gewählte Maßnahme wird jetzt beobachtet.';
    sections.push({
      key: 'action',
      title: 'Maßnahme / Beobachtung',
      body: `${actionBody} ${String(pendingOutcome.observationText || 'Die Folgen werden jetzt über einen kurzen Ingame-Zeitraum beobachtet.')}`.trim(),
      tone
    });

    if (pendingOutcome.learningNote) {
      sections.push({
        key: 'analysis',
        title: 'Analyse / Bedeutung',
        body: String(pendingOutcome.learningNote),
        tone: 'history'
      });
    }

    return sections;
  }

  if (machineState === 'resolved' && resolvedOutcome) {
    const explanationBody = resolvedOutcome.explanationText || resolvedOutcome.resultText || 'Das Ergebnis liegt jetzt vor.';
    if (explanationBody) {
      sections.push({
        key: 'outcome',
        title: 'Was passiert ist',
        body: String(explanationBody),
        tone
      });
    }

    if (resolvedOutcome.causeText) {
      sections.push({
        key: 'cause',
        title: 'Warum es passiert ist',
        body: String(resolvedOutcome.causeText),
        tone
      });
    }

    if (resolvedOutcome.resultText && resolvedOutcome.resultText !== explanationBody) {
      sections.push({
        key: 'result',
        title: 'Folge / Wirkung',
        body: String(resolvedOutcome.resultText),
        tone
      });
    }

    if (resolvedOutcome.guidanceText) {
      sections.push({
        key: 'guidance',
        title: 'Empfehlung / Nächster Schritt',
        body: String(resolvedOutcome.guidanceText),
        tone: 'history'
      });
    }

    const followUpBody = formatOutcomeFollowUpLabel(resolvedOutcome.followUpIds);
    if (followUpBody) {
      sections.push({
        key: 'followup',
        title: 'Folgepfad / Plausibilität',
        body: followUpBody,
        tone: 'followup'
      });
    }

    if (resolvedOutcome.learningNote) {
      sections.push({
        key: 'analysis',
        title: 'Analyse / Bedeutung',
        body: String(resolvedOutcome.learningNote),
        tone: 'history'
      });
    }

    return sections;
  }

  const situationBody = shadow.causeSummary || popup.description || categoryLabel(String(popup.category || 'generic'));
  if (situationBody) {
    sections.push({
      key: 'situation',
      title: 'Situation / Ursache',
      body: String(situationBody),
      tone
    });
  }

  const tendencyBody = shadow.outcomeSummary || (popup.severity ? `Schweregrad ${popup.severity} prägt die aktuelle Tendenz.` : '');
  if (tendencyBody) {
    sections.push({
      key: 'tendency',
      title: 'Aktueller Zustand / Tendenz',
      body: String(tendencyBody),
      tone
    });
  }

  if (shadow.rewardSummary) {
    sections.push({
      key: 'reward',
      title: 'Reward / Recovery Insight',
      body: String(shadow.rewardSummary),
      tone: 'reward'
    });
  }

  if (shadow.chainSummary || shadow.topFollowUpId) {
    const followUp = shadow.topFollowUpId ? `${shadow.chainSummary ? `${shadow.chainSummary} ` : ''}Möglicher Folgepfad: ${humanizeEventIdentifier(shadow.topFollowUpId)}.` : shadow.chainSummary;
    sections.push({
      key: 'followup',
      title: 'Folgepfad / Plausibilität',
      body: String(followUp),
      tone: 'followup'
    });
  }

  if (detail.learningNote || shadow.disclaimer || (inspect && Array.isArray(shadow.comparisonSummary) && shadow.comparisonSummary.length)) {
    const analysisParts = [];
    if (detail.learningNote) analysisParts.push(String(detail.learningNote));
    if (inspect && Array.isArray(shadow.comparisonSummary) && shadow.comparisonSummary.length) analysisParts.push(`Offene Abweichungen: ${shadow.comparisonSummary.join(' · ')}`);
    if (shadow.disclaimer) analysisParts.push(String(shadow.disclaimer));
    sections.push({
      key: 'analysis',
      title: 'Analyse / Bedeutung',
      body: analysisParts.join(' '),
      tone: 'history'
    });
  }

  return sections;
}

function buildEventPresentationSectionsHtml(sections) {
  const safeSections = Array.isArray(sections) ? sections : [];
  if (!safeSections.length) {
    return '';
  }
  return safeSections.map((section) => `
    <article class="event-detail-section event-detail-section--${escapeHtml(String(section.tone || 'idle'))}">
      <span class="event-detail-section__eyebrow">${escapeHtml(String(section.title || 'Event Insight'))}</span>
      <p class="event-detail-section__body">${escapeHtml(String(section.body || ''))}</p>
    </article>
  `).join('');
}

function buildEventHistorySnapshotViewModel() {
  const history = Array.isArray(state.events && state.events.history) ? state.events.history : [];
  const latest = history.length ? history[history.length - 1] : null;
  if (!latest || typeof latest !== 'object') {
    return null;
  }

  const narrative = buildHistoryNarrative(latest);
  const tone = deriveHistoryEntryTone(latest);
  const media = resolveSharedEventMediaModel({
    eventId: latest.eventId,
    category: latest.category || 'generic',
    title: narrative.title,
    stateTone: tone
  });

  return {
    title: narrative.title,
    media,
    tone,
    optionLabel: latest.optionLabel ? String(latest.optionLabel) : '',
    learningNote: narrative.learningNote,
    explanationText: narrative.explanationText,
    resultText: narrative.resultText,
    guidanceText: narrative.guidanceText,
    causeText: narrative.causeText,
    followUpText: narrative.followUpText,
    outcomeStatus: narrative.outcomeStatus,
    atSimTimeMs: Number(latest.atSimTimeMs || 0)
  };
}

function buildEventHistorySnapshotMarkup() {
  const snapshot = buildEventHistorySnapshotViewModel();
  if (!snapshot) {
    return `
      <section class="event-history-card event-history-card--empty" data-tone="history">
        <div class="event-history-card__body">
          <span class="event-history-card__eyebrow">Letzte Analyse</span>
          <strong class="event-history-card__title">Noch kein Event-Verlauf gespeichert</strong>
          <p class="event-history-card__summary">Sobald Entscheidungen protokolliert werden, erscheint hier die letzte Analyse als kompakter Rückblick.</p>
        </div>
      </section>
    `;
  }

  const media = snapshot.media || {};
  const inspect = isEventAssetInspectionEnabled();
  const mediaInner = media.kind === 'placeholder'
    ? `<div class="event-history-card__placeholder"><span>${escapeHtml(String((media.badge || 'A')).slice(0, 1).toUpperCase())}</span></div>`
    : `<img class="event-history-card__image${media.kind === 'icon' ? ' event-history-card__image--icon' : ''}" src="${escapeHtml(String(media.src || ''))}" alt="${escapeHtml(String(media.alt || ''))}">`;
  const summary = snapshot.resultText || snapshot.explanationText || snapshot.guidanceText || snapshot.learningNote || 'Letzte Entscheidung ohne zusätzliche Analyse.';
  const metaParts = [];
  if (snapshot.optionLabel) metaParts.push(`Aktion: ${snapshot.optionLabel}`);
  if (snapshot.causeText) metaParts.push(snapshot.causeText);
  if (snapshot.followUpText) metaParts.push(snapshot.followUpText);

  return `
    <section class="event-history-card" data-tone="${escapeHtml(String(snapshot.tone || 'history'))}">
      <div class="event-history-card__media" data-kind="${escapeHtml(String(media.kind || 'placeholder'))}">
        ${mediaInner}
      </div>
      <div class="event-history-card__body">
        <div class="event-history-card__head">
          <span class="event-history-card__eyebrow">Letzte Analyse</span>
          <span class="event-history-card__pill">${escapeHtml(eventToneLabel(snapshot.tone))}</span>
        </div>
        <strong class="event-history-card__title">${escapeHtml(String(snapshot.title || 'Verlaufs-Snapshot'))}</strong>
        <p class="event-history-card__summary">${escapeHtml(String(summary))}</p>
        ${metaParts.length ? `<p class="event-history-card__meta">${escapeHtml(metaParts.join(' · '))}</p>` : ''}
        ${inspect ? `<span class="event-history-card__origin">Asset: ${escapeHtml(String(media.fallbackOrigin || 'generic_placeholder'))}</span>` : ''}
      </div>
    </section>
  `;
}

function deriveHistoryEntryTone(entry) {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const analysis = safeEntry.analysis && typeof safeEntry.analysis === 'object' ? safeEntry.analysis : {};
  const eventId = String(safeEntry.eventId || '').toLowerCase();
  const category = String(safeEntry.category || '').toLowerCase();
  const tone = String(analysis.tone || '').toLowerCase();
  const outcomeStatus = String(safeEntry.outcomeStatus || '').toLowerCase();
  const queuedFollowUps = Array.isArray(safeEntry.followUpIds) ? safeEntry.followUpIds.filter(Boolean) : [];

  if (category === 'positive' || eventId.includes('reward')) return 'reward';
  if (outcomeStatus === 'improved') return 'reward';
  if (outcomeStatus === 'escalated') return 'escalating';
  if (outcomeStatus === 'worsened') return 'followup';
  if (queuedFollowUps.length) return 'followup';
  if (eventId.includes('followup') || eventId.includes('chain')) return 'followup';
  if (tone === 'bad') return 'escalating';
  if (tone === 'warning') return 'followup';
  if (tone === 'positive' || tone === 'recovery') return category === 'positive' ? 'reward' : 'resolved';
  if (tone === 'good') return category === 'positive' ? 'reward' : 'resolved';
  if (tone === 'mixed') return 'history';
  return 'resolved';
}

function buildHistoryEntryMarkers(entry, tone) {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const analysis = safeEntry.analysis && typeof safeEntry.analysis === 'object' ? safeEntry.analysis : {};
  const outcomeLabel = formatOutcomeStatusLabel(safeEntry.outcomeStatus);
  const markers = [
    eventToneLabel(tone),
    safeEntry.optionLabel ? `Aktion: ${safeEntry.optionLabel}` : '',
    outcomeLabel,
    analysis.tone === 'good' ? 'Gute Ausführung' : '',
    analysis.tone === 'bad' ? 'Instabil geblieben' : '',
    (Array.isArray(safeEntry.followUpIds) && safeEntry.followUpIds.length) || String(safeEntry.eventId || '').includes('followup') || String(safeEntry.eventId || '').includes('chain')
      ? 'Folgepfad'
      : ''
  ].filter(Boolean);

  return markers.slice(0, 3);
}

function formatHistoryOrderLabel(entry, index) {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const simTimeMs = Number(safeEntry.atSimTimeMs || 0);
  if (Number.isFinite(simTimeMs) && simTimeMs > 0) {
    const day = Math.max(1, Math.floor(simTimeMs / (24 * 60 * 60 * 1000)) + 1);
    return `Tag ${day}`;
  }
  return index === 0 ? 'Zuletzt' : `Vor ${index + 1} Events`;
}

function buildRecentEventHistoryItems(limit = 5) {
  const history = Array.isArray(state.events && state.events.history) ? state.events.history.slice(-limit).reverse() : [];
  return history.map((entry, index) => {
    const tone = deriveHistoryEntryTone(entry);
    const narrative = buildHistoryNarrative(entry);
    const media = resolveSharedEventMediaModel({
      eventId: entry && entry.eventId,
      category: entry && entry.category,
      title: narrative.title,
      stateTone: tone
    });

    return {
      id: String(entry && entry.eventId || `history-${index}`),
      title: narrative.title,
      tone,
      media,
      orderLabel: formatHistoryOrderLabel(entry, index),
      summary: String(narrative.resultText || narrative.explanationText || narrative.guidanceText || narrative.learningNote || 'Letzte Event-Entscheidung ohne zusätzlichen Hinweis.'),
      meaning: String(narrative.causeText || narrative.followUpText || narrative.learningNote || categoryLabel(String(entry && entry.category || 'generic'))),
      quality: narrative.outcomeStatus || narrative.tone,
      markers: buildHistoryEntryMarkers(entry, tone)
    };
  });
}

function buildRecentEventHistoryMarkup() {
  const items = buildRecentEventHistoryItems();
  const inspect = isEventAssetInspectionEnabled();

  if (!items.length) {
    return `
      <section class="gs-analysis-overview-section event-history-list-shell">
        <div class="harvest-section-headline">
          <h3 class="figma-section-head">Recent Event History</h3>
          <p class="harvest-section-intro">Sobald mehrere Entscheidungen protokolliert sind, erscheint hier ein kompakter Verlauf mit denselben Visual- und Tone-Regeln wie im Event Center.</p>
        </div>
        <div class="event-history-list event-history-list--empty">
          <p class="event-history-list__empty">Noch keine verwertbare Event-Historie vorhanden.</p>
        </div>
      </section>
    `;
  }

  const itemsHtml = items.map((item) => {
    const media = item.media || {};
    const mediaInner = media.kind === 'placeholder'
      ? `<div class="event-history-item__placeholder"><span>${escapeHtml(String((media.badge || 'E')).slice(0, 1).toUpperCase())}</span></div>`
      : `<img class="event-history-item__image${media.kind === 'icon' ? ' event-history-item__image--icon' : ''}" src="${escapeHtml(String(media.src || ''))}" alt="${escapeHtml(String(media.alt || ''))}">`;
    return `
      <article class="event-history-item" data-tone="${escapeHtml(String(item.tone || 'history'))}">
        <div class="event-history-item__media" data-kind="${escapeHtml(String(media.kind || 'placeholder'))}">
          ${mediaInner}
        </div>
        <div class="event-history-item__body">
          <div class="event-history-item__head">
            <span class="event-history-item__eyebrow">${escapeHtml(String(item.orderLabel || 'Verlauf'))}</span>
            <span class="event-history-item__pill">${escapeHtml(eventToneLabel(item.tone))}</span>
          </div>
          <strong class="event-history-item__title">${escapeHtml(String(item.title || 'Event'))}</strong>
          <p class="event-history-item__summary">${escapeHtml(String(item.summary || ''))}</p>
          <p class="event-history-item__meta">${escapeHtml(String(item.meaning || ''))}</p>
          ${item.markers && item.markers.length ? `<div class="event-history-item__markers">${item.markers.map((marker) => `<span class="event-history-item__marker">${escapeHtml(String(marker))}</span>`).join('')}</div>` : ''}
          ${inspect ? `<span class="event-history-item__origin">Asset: ${escapeHtml(String(media.fallbackOrigin || 'generic_placeholder'))}</span>` : ''}
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="gs-analysis-overview-section event-history-list-shell">
      <div class="harvest-section-headline">
        <h3 class="figma-section-head">Recent Event History</h3>
        <p class="harvest-section-intro">Kompakter Rückblick auf die letzten wichtigen Warnungen, Auflösungen, Folgepfade und positiven Momente. Die Texte bleiben als Analyse- und Tendenzhinweise formuliert.</p>
      </div>
      <div class="event-history-list">
        ${itemsHtml}
      </div>
    </section>
  `;
}

function renderEventMediaModel(mediaModel, tone = 'idle') {
  const wrap = uiNode('eventImageWrap', 'eventImageWrap');
  const image = uiNode('eventImage', 'eventImage');
  const placeholder = uiNode('eventVisualPlaceholder', 'eventVisualPlaceholder');
  const placeholderGlyph = uiNode('eventVisualPlaceholderGlyph', 'eventVisualPlaceholderGlyph');
  const placeholderLabel = uiNode('eventVisualPlaceholderLabel', 'eventVisualPlaceholderLabel');
  const stateBadge = uiNode('eventVisualStateBadge', 'eventVisualStateBadge');
  const originBadge = uiNode('eventVisualOriginBadge', 'eventVisualOriginBadge');
  const captionTitle = uiNode('eventVisualCaptionTitle', 'eventVisualCaptionTitle');
  const captionMeta = uiNode('eventVisualCaptionMeta', 'eventVisualCaptionMeta');

  if (!wrap || !image || !placeholder || !placeholderGlyph || !placeholderLabel || !stateBadge || !originBadge || !captionTitle || !captionMeta) {
    return;
  }

  const media = mediaModel && typeof mediaModel === 'object' ? mediaModel : {};
  const kind = String(media.kind || 'placeholder');
  const badgeText = media.badge ? String(media.badge) : '';
  const originLabel = media.label ? String(media.label) : '';
  const inspectOrigin = isEventAssetInspectionEnabled();

  wrap.dataset.kind = kind;
  wrap.dataset.origin = String(media.fallbackOrigin || '');
  wrap.dataset.tone = String(tone || 'idle');
  wrap.classList.remove('hidden');
  wrap.setAttribute('aria-hidden', 'false');

  if (kind === 'image' || kind === 'icon') {
    if (media.src) {
      image.src = String(media.src);
    } else {
      image.removeAttribute('src');
    }
    image.alt = media.alt ? String(media.alt) : '';
    image.classList.toggle('event-visual-image--icon', kind === 'icon');
    image.classList.remove('hidden');
    placeholder.classList.add('hidden');
    placeholder.setAttribute('aria-hidden', 'true');
  } else {
    image.removeAttribute('src');
    image.alt = '';
    image.classList.remove('event-visual-image--icon');
    image.classList.add('hidden');
    placeholder.classList.remove('hidden');
    placeholder.setAttribute('aria-hidden', 'false');
    placeholderGlyph.textContent = media.badge ? String(media.badge).slice(0, 1).toUpperCase() : 'E';
    placeholderLabel.textContent = media.title ? String(media.title) : 'Event';
  }

  stateBadge.textContent = badgeText || 'Live';
  stateBadge.classList.toggle('hidden', !badgeText);
  stateBadge.setAttribute('aria-hidden', badgeText ? 'false' : 'true');

  originBadge.textContent = originLabel;
  originBadge.classList.toggle('hidden', !originLabel || !inspectOrigin);
  originBadge.setAttribute('aria-hidden', originLabel && inspectOrigin ? 'false' : 'true');

  captionTitle.textContent = media.title ? String(media.title) : (state.events.activeEventTitle || 'Event');
  captionMeta.textContent = inspectOrigin && media.fallbackOrigin
    ? `${String(media.subtitle || 'Diagnose-Visual')} · ${String(media.fallbackOrigin)}`
    : (media.subtitle ? String(media.subtitle) : 'Diagnose-Visual');
}

function buildEventMediaMarkup(mediaModel, tone = 'idle') {
  const media = mediaModel && typeof mediaModel === 'object' ? mediaModel : {};
  const kind = String(media.kind || 'placeholder');
  const badgeText = media.badge ? String(media.badge) : '';
  const originLabel = media.label ? String(media.label) : '';
  const inspectOrigin = isEventAssetInspectionEnabled();
  const imageMarkup = (kind === 'image' || kind === 'icon')
    ? `<img class="event-visual-image${kind === 'icon' ? ' event-visual-image--icon' : ''}" src="${escapeHtml(String(media.src || ''))}" alt="${escapeHtml(String(media.alt || ''))}">`
    : '<img class="event-visual-image hidden" alt="">';
  const placeholderMarkup = kind === 'placeholder'
    ? `
      <div class="event-visual-placeholder" aria-hidden="false">
        <span class="event-visual-placeholder-glyph">${escapeHtml(String(media.badge ? String(media.badge).slice(0, 1).toUpperCase() : 'E'))}</span>
        <span class="event-visual-placeholder-label">${escapeHtml(String(media.title || 'Event'))}</span>
      </div>
    `
    : '<div class="event-visual-placeholder hidden" aria-hidden="true"></div>';

  return `
    <div class="event-visual" aria-hidden="false" data-kind="${escapeHtml(kind)}" data-origin="${escapeHtml(String(media.fallbackOrigin || ''))}" data-tone="${escapeHtml(String(tone || 'idle'))}">
      <div class="event-visual-frame">
        ${imageMarkup}
        ${placeholderMarkup}
        <span class="event-visual-state-badge${badgeText ? '' : ' hidden'}" aria-hidden="${badgeText ? 'false' : 'true'}">${escapeHtml(badgeText || 'Live')}</span>
        <span class="event-visual-origin-badge${originLabel && inspectOrigin ? '' : ' hidden'}" aria-hidden="${originLabel && inspectOrigin ? 'false' : 'true'}">${escapeHtml(originLabel)}</span>
      </div>
      <div class="event-visual-caption">
        <strong class="event-visual-caption-title">${escapeHtml(String(media.title || state.events.activeEventTitle || 'Event'))}</strong>
        <span class="event-visual-caption-meta">${escapeHtml(inspectOrigin && media.fallbackOrigin ? `${String(media.subtitle || 'Diagnose-Visual')} · ${String(media.fallbackOrigin)}` : String(media.subtitle || 'Diagnose-Visual'))}</span>
      </div>
    </div>
  `;
}

function buildEventInsightHtml(viewModel, machineState) {
  const popup = viewModel && viewModel.popup && typeof viewModel.popup === 'object' ? viewModel.popup : {};
  const shadow = popup.shadowSummary && typeof popup.shadowSummary === 'object' ? popup.shadowSummary : {};
  const tone = deriveEventPresentationTone(viewModel, machineState);
  const sections = buildEventPresentationSections(viewModel, machineState);
  const pendingOutcome = getPendingOutcomeView();
  const resolvedOutcome = getResolvedOutcomeView();
  const insightLabel = machineState === 'resolving'
    ? 'Beobachtung läuft'
    : (machineState === 'resolved'
      ? (formatOutcomeStatusLabel(resolvedOutcome && resolvedOutcome.outcomeStatus) || eventToneLabel(tone))
      : String(shadow.qualitySummary || eventToneLabel(tone)));

  return `
    <div class="event-shadow-insight event-shadow-insight--${escapeHtml(String(tone || 'idle'))}${machineState === 'activeEvent' ? ' event-shadow-insight--live' : ''}" data-tone="${escapeHtml(String(tone || 'idle'))}">
      <div class="event-shadow-insight__head">
        <span class="event-shadow-insight__eyebrow">Event Insight</span>
        <span class="event-shadow-insight__pill">${escapeHtml(String(insightLabel || eventToneLabel(tone)))}</span>
      </div>
      <div class="event-detail-sections">
        ${buildEventPresentationSectionsHtml(sections)}
      </div>
    </div>
  `;
}

function buildEventCenterMarkup(viewModel) {
  const popup = viewModel && viewModel.popup && typeof viewModel.popup === 'object' ? viewModel.popup : {};
  const shadow = popup.shadowSummary && typeof popup.shadowSummary === 'object' ? popup.shadowSummary : {};
  const tone = deriveEventPresentationTone(viewModel, popup.machineState || 'idle');
  const pendingOutcome = getPendingOutcomeView();
  const resolvedOutcome = getResolvedOutcomeView();
  const auditView = getEventAuditViewModel();
  const followUpText = formatOutcomeFollowUpLabel(
    popup.machineState === 'resolved' && resolvedOutcome ? resolvedOutcome.followUpIds : [],
    'Folgepfad'
  );
  const media = resolveSharedEventMediaModel({
    eventId: (resolvedOutcome && resolvedOutcome.eventId) || (pendingOutcome && pendingOutcome.eventId) || state.events.activeEventId,
    category: state.events.activeCategory || popup.category || 'generic',
    title: (resolvedOutcome && resolvedOutcome.eventTitle) || (pendingOutcome && pendingOutcome.eventTitle) || popup.title || 'Event Snapshot',
    activeImagePath: state.events.activeImagePath,
    stateTone: tone
  });
  const stateLabel = media.badge ? String(media.badge) : eventToneLabel(tone);
  const inspect = isEventAssetInspectionEnabled();
  const mediaInner = media.kind === 'placeholder'
    ? `<div class="event-center-card__placeholder"><span>${escapeHtml(String((media.badge || 'E')).slice(0, 1).toUpperCase())}</span></div>`
    : `<img class="event-center-card__image${media.kind === 'icon' ? ' event-center-card__image--icon' : ''}" src="${escapeHtml(String(media.src || ''))}" alt="${escapeHtml(String(media.alt || ''))}">`;

  const summary = popup.machineState === 'resolved' && resolvedOutcome
    ? (resolvedOutcome.resultText || resolvedOutcome.explanationText || 'Das letzte Ereignis wurde ausgewertet.')
    : (popup.machineState === 'resolving' && pendingOutcome
      ? (pendingOutcome.observationText || 'Die Folgen der gewählten Maßnahme werden gerade beobachtet.')
      : (shadow.causeSummary || shadow.outcomeSummary || 'Kein aktiver Schattenhinweis verfügbar.'));
  const support = popup.machineState === 'resolved' && resolvedOutcome
    ? (followUpText || resolvedOutcome.guidanceText || resolvedOutcome.causeText || 'Das letzte Ergebnis bleibt als Verlauf sichtbar.')
    : (popup.machineState === 'resolving' && pendingOutcome
      ? (pendingOutcome.optionLabel ? `Ausgewählte Maßnahme: ${pendingOutcome.optionLabel}.` : 'Die gewählte Maßnahme bleibt noch in Beobachtung.')
      : (shadow.chainSummary || shadow.rewardSummary || 'Legacy bleibt autoritativ, die Vorschau dient nur der Einordnung.'));
  const markers = [
    tone !== 'idle' ? eventToneLabel(tone) : '',
    popup.machineState === 'resolved' && resolvedOutcome ? formatOutcomeStatusLabel(resolvedOutcome.outcomeStatus) : '',
    shadow.rewardSummary ? 'Recovery / Reward' : '',
    popup.machineState === 'resolved' && followUpText ? 'Folgepfad' : (shadow.chainSummary ? 'Folgerisiko' : ''),
    popup.machineState === 'resolved' ? 'Zuletzt ausgewertet' : ''
  ].filter(Boolean);
  if (auditView && Array.isArray(auditView.markers)) {
    markers.push(...auditView.markers);
  }

  return `
    <section class="gs-analysis-overview-section event-center-card" data-tone="${escapeHtml(String(tone || 'idle'))}">
      <div class="event-center-card__media" data-kind="${escapeHtml(String(media.kind || 'placeholder'))}">
        ${mediaInner}
      </div>
      <div class="event-center-card__body">
        <div class="event-center-card__head">
          <span class="event-center-card__eyebrow">Event Center</span>
          <span class="event-center-card__pill">${escapeHtml(stateLabel)}</span>
        </div>
        <strong class="event-center-card__title">${escapeHtml(String(popup.title || 'Event Snapshot'))}</strong>
        <p class="event-center-card__summary">${escapeHtml(String(summary))}</p>
        <p class="event-center-card__meta">${escapeHtml(String(support))}</p>
        ${auditView && auditView.summary ? `<p class="event-center-card__meta">${escapeHtml(String(auditView.summary))}</p>` : ''}
        ${auditView && auditView.support ? `<p class="event-center-card__meta">${escapeHtml(String(auditView.support))}</p>` : ''}
        ${markers.length ? `<div class="event-center-card__markers">${markers.slice(0, 4).map((marker) => `<span class="event-center-card__marker">${escapeHtml(String(marker))}</span>`).join('')}</div>` : ''}
        ${inspect ? `<span class="event-center-card__origin">Asset: ${escapeHtml(String(media.fallbackOrigin || 'generic_placeholder'))}</span>` : ''}
      </div>
    </section>
  `;
}

function getModernEventSheetContentState(viewModel, machineState) {
  const popup = viewModel && viewModel.popup && typeof viewModel.popup === 'object' ? viewModel.popup : {};
  const eventDef = Array.isArray(state.events.catalog)
    ? state.events.catalog.find((entry) => entry && entry.id === state.events.activeEventId)
    : null;
  const eventContext = describeActiveEventContext(eventDef);
  const fastForwardPresentation = getRewardActionPresentation(REWARD_ACTION_TYPES.FAST_FORWARD_EVENT, { state, context: 'event_sheet' });

  if (machineState === 'activeEvent') {
    return {
      title: String(state.events.activeEventTitle || popup.title || 'Aktives Ereignis'),
      description: String(state.events.activeEventText || popup.description || ''),
      meta: [
        `Schweregrad: ${state.events.activeSeverity}`,
        eventContext.cause ? `Warum jetzt: ${eventContext.cause}` : '',
        eventContext.focus ? `Fokus: ${eventContext.focus}` : ''
      ].filter(Boolean).join(' | '),
      options: Array.isArray(state.events.activeOptions) ? state.events.activeOptions.slice() : [],
      rewardAction: !fastForwardPresentation.disabled
        ? {
          type: REWARD_ACTION_TYPES.FAST_FORWARD_EVENT,
          label: String(fastForwardPresentation.label || 'Event Fast Forward'),
          note: String(fastForwardPresentation.hint || 'Schnellaufloesung verfuegbar.'),
          tone: String(fastForwardPresentation.tone || 'utility')
        }
        : null
    };
  }

  if (machineState === 'resolving') {
    const leftMs = Number(state.events.resolvingUntilSimTimeMs || 0) - Number(state.simulation.simTimeMs || 0);
    const pendingOutcome = getPendingOutcomeView();
    const actionLabel = pendingOutcome && pendingOutcome.optionLabel
      ? `Ausgewählte Maßnahme: ${pendingOutcome.optionLabel}.`
      : 'Die gewählte Maßnahme wird jetzt ausgewertet.';
    return {
      title: String((pendingOutcome && pendingOutcome.eventTitle) || state.events.activeEventTitle || popup.title || 'Ereignis wird ausgewertet'),
      description: `${actionLabel} ${String(pendingOutcome && pendingOutcome.observationText || 'Das Ergebnis erscheint nach Ablauf des Timers.')}`.trim(),
      meta: [
        `Ergebnis in: ${formatCountdown(leftMs)}`,
        pendingOutcome && pendingOutcome.learningNote ? `Hinweis: ${pendingOutcome.learningNote}` : ''
      ].filter(Boolean).join(' | '),
      options: [],
      rewardAction: !fastForwardPresentation.disabled
        ? {
          type: REWARD_ACTION_TYPES.FAST_FORWARD_EVENT,
          label: String(fastForwardPresentation.label || 'Event Fast Forward'),
          note: String(fastForwardPresentation.hint || 'Die Restwartezeit kann sofort beendet werden.'),
          tone: String(fastForwardPresentation.tone || 'utility')
        }
        : null
    };
  }

  if (machineState === 'resolved') {
    const outcome = getResolvedOutcomeView();
    return {
      title: String(outcome && outcome.eventTitle ? outcome.eventTitle : i18nT('events.resolved_title')),
      description: String(formatResolvedOutcome(outcome)),
      meta: [
        formatOutcomeStatusLabel(outcome && outcome.outcomeStatus),
        outcome && outcome.optionLabel ? i18nT('events.meta_action_result_in', { action: outcome.optionLabel, time: '-' }) : '',
        i18nT('events.close_to_continue')
      ].filter(Boolean).join(' | '),
      options: []
    };
  }

  if (machineState === 'cooldown') {
    const cooldownLeft = Number(state.events.cooldownUntilSimTimeMs || 0) - Number(state.simulation.simTimeMs || 0);
    return {
      title: i18nT('events.cooldown_title'),
      description: i18nT('events.cooldown_text'),
      meta: `${i18nT('events.state_cooldown')}: ${formatCountdown(cooldownLeft)}`,
      options: []
    };
  }

  return {
    title: i18nT('events.no_active_title'),
    description: i18nT('events.no_active_text'),
    meta: `${i18nT('home.event')}: ${formatCountdown(Number(state.events.scheduler.nextEventSimTimeMs || 0) - Number(state.simulation.simTimeMs || 0))}`,
    options: []
  };
}

function buildModernEventOptionListMarkup(options) {
  const safeOptions = Array.isArray(options) ? options : [];
  if (!safeOptions.length) {
    return '';
  }

  return safeOptions.map((option) => `
    <button class="event-option-btn" type="button" data-event-option-id="${escapeHtml(String(option.id || ''))}">
      ${escapeHtml(String(option.label || option.id || i18nT('events.choose_option')))}
    </button>
  `).join('');
}

function buildModernEventRewardActionMarkup(rewardAction) {
  const safeRewardAction = rewardAction && typeof rewardAction === 'object' ? rewardAction : null;
  if (!safeRewardAction || !safeRewardAction.type) {
    return '';
  }

  return `
    <button
      class="event-reward-action-btn"
      type="button"
      data-event-reward-action="${escapeHtml(String(safeRewardAction.type || ''))}"
      data-tone="${escapeHtml(String(safeRewardAction.tone || 'utility'))}"
      title="${escapeHtml(String(safeRewardAction.note || safeRewardAction.label || 'Reward Action'))}"
    >
      <span class="event-reward-action-btn__label">${escapeHtml(String(safeRewardAction.label || 'Reward Action'))}</span>
      <span class="event-reward-action-btn__note">${escapeHtml(String(safeRewardAction.note || ''))}</span>
    </button>
  `;
}

function bindModernEventSheetInteractions(root, options) {
  if (!root) {
    return;
  }

  const safeOptions = Array.isArray(options) ? options : [];
  if (safeOptions.length) {
    root.querySelectorAll('[data-event-option-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const optionId = String(button.getAttribute('data-event-option-id') || '');
        if (!optionId) {
          return;
        }
        const controller = getUiController();
        if (controller && typeof controller.handleEventOption === 'function') {
          controller.handleEventOption(optionId);
          return;
        }
        onEventOptionClick(optionId);
      });
    });
  }

  root.querySelectorAll('[data-event-reward-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const actionType = String(button.getAttribute('data-event-reward-action') || '').trim();
      if (!actionType) {
        return;
      }
      triggerRewardAction(actionType);
    });
  });
}

function renderModernEventSheetContent(viewModel, machineState) {
  const modernRoot = typeof document !== 'undefined' ? document.getElementById('eventSheetModernRoot') : null;
  if (!modernRoot) {
    return;
  }

  const tone = deriveEventPresentationTone(viewModel, machineState);
  const shadowSummary = viewModel && viewModel.popup && viewModel.popup.shadowSummary && typeof viewModel.popup.shadowSummary === 'object'
    ? viewModel.popup.shadowSummary
    : {};
  const contentState = getModernEventSheetContentState(viewModel, machineState);
  const pendingOutcome = getPendingOutcomeView();
  const resolvedOutcome = getResolvedOutcomeView();
  const mediaModel = resolveSharedEventMediaModel({
    eventId: (resolvedOutcome && resolvedOutcome.eventId) || (pendingOutcome && pendingOutcome.eventId) || state.events.activeEventId,
    category: state.events.activeCategory || (viewModel && viewModel.popup && viewModel.popup.category) || 'generic',
    title: String(contentState.title || (viewModel && viewModel.popup && viewModel.popup.title) || 'Event'),
    activeImagePath: state.events.activeImagePath,
    stateTone: tone
  });
  const inspect = isEventAssetInspectionEnabled();
  const template = document.createElement('template');
  template.innerHTML = `
    <section class="figma-top-player figma-top-player--compact" aria-hidden="true">
      <div class="figma-top-player-title">Event-System</div>
      <div class="figma-top-player-subtitle">Autoritativ bleibt Legacy, die Darstellung ist exklusiv modern.</div>
    </section>
    <section class="figma-section-card figma-section-card--event event-sheet-modern-card" data-tone="${escapeHtml(String(tone || 'idle'))}">
      <h3 class="figma-section-head">${escapeHtml(i18nT('events.focus'))}</h3>
      <p class="sheet-badge" data-shadow="${escapeHtml(String(shadowSummary.primaryState || ''))}">${escapeHtml(i18nT('events.status', { state: translateEventState(machineState) }))}</p>
      ${buildEventMediaMarkup(mediaModel, tone)}
      <h3 class="event-sheet-modern__title">${escapeHtml(String(contentState.title || 'Event'))}</h3>
      <p class="event-sheet-modern__text">${escapeHtml(String(contentState.description || ''))}</p>
      <p class="sheet-note event-sheet-modern__meta">${escapeHtml(String(contentState.meta || ''))}</p>
      ${buildEventInsightHtml(viewModel, machineState)}
      <div class="event-option-list event-sheet-modern__options">${buildModernEventOptionListMarkup(contentState.options)}</div>
      ${buildModernEventRewardActionMarkup(contentState.rewardAction)}
      <div class="event-history-slot" aria-hidden="false">${buildEventHistorySnapshotMarkup()}</div>
      ${inspect ? `<p class="event-sheet-modern__inspector">Root ownership: modern-exclusive</p>` : ''}
    </section>
  `;

  modernRoot.replaceChildren(template.content.cloneNode(true));
  bindModernEventSheetInteractions(modernRoot, contentState.options);
}

function renderEventSheet() {
  const modernEventUiActive = state.ui.openSheet === 'event' || ['activeEvent', 'resolving', 'resolved'].includes(state.events.machineState);
  setEventPresentationExclusiveState(modernEventUiActive);

  const modernRoot = typeof document !== 'undefined' ? document.getElementById('eventSheetModernRoot') : null;
  if (!modernEventUiActive) {
    if (modernRoot) {
      modernRoot.replaceChildren();
    }
    return;
  }

  const viewModel = getEventUiViewModel();
  const machineState = String(state.events.machineState || 'idle');
  renderModernEventSheetContent(viewModel, machineState);
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
  void refreshPushStatus({ skipRender: false, force: false });
  updateSettingsUI();
}

function getPushManagerApi() {
  const api = window.GrowSimPushManager;
  return api && typeof api.getPushStatus === 'function' ? api : null;
}

function mapPushPermissionLabel(permission) {
  const pushApi = getPushUiPresentationApi();
  if (pushApi && typeof pushApi.mapPermissionLabel === 'function') {
    return pushApi.mapPermissionLabel(permission);
  }
  const value = String(permission || 'unsupported');
  if (value === 'granted') {
    return 'Erlaubt';
  }
  if (value === 'denied') {
    return 'Blockiert';
  }
  if (value === 'default') {
    return 'Nicht entschieden';
  }
  return 'Nicht unterstützt';
}

function mapPushStatusLabel(statusCode) {
  const pushApi = getPushUiPresentationApi();
  if (pushApi && typeof pushApi.mapStatusLabel === 'function') {
    return pushApi.mapStatusLabel(statusCode, pushUiRuntime.busy === true);
  }
  const status = String(statusCode || 'unsupported');
  if (status === 'granted_subscribed') {
    return 'Aktiv';
  }
  if (status === 'denied') {
    return 'Blockiert';
  }
  if (status === 'unsupported') {
    return 'Nicht verfügbar';
  }
  if (status === 'supported_but_not_granted') {
    return 'Berechtigung fehlt';
  }
  return 'Nicht aktiviert';
}

function isPushStatusSubscribed(statusCode) {
  const pushApi = getPushUiPresentationApi();
  if (pushApi && typeof pushApi.isPushActive === 'function') {
    return pushApi.isPushActive(statusCode);
  }
  return String(statusCode || '') === 'granted_subscribed';
}

function syncPushFlagsWithCanonicalSettings(statusCode) {
  const notifications = getCanonicalNotificationsSettings(state);
  const enabled = isPushStatusSubscribed(statusCode);
  notifications.enabled = enabled;
  state.settings.pushNotificationsEnabled = enabled;
  if (!enabled && (notifications.lastMessage === null || notifications.lastMessage === undefined || notifications.lastMessage === '')) {
    const pushText = getPushUiTextBundle();
    notifications.lastMessage = pushText && pushText.feedback
      ? pushText.feedback.inactive
      : 'Push ist nicht aktiv.';
  }
}

function renderPushSettingsUi() {
  const supportNode = document.getElementById('settingsPushSupportValue');
  const permissionNode = document.getElementById('settingsPushPermissionValue');
  const statusNode = document.getElementById('settingsPushStatusValue');
  const feedbackNode = document.getElementById('settingsPushFeedback');
  const enableBtn = document.getElementById('settingsPushEnableBtn');
  const disableBtn = document.getElementById('settingsPushDisableBtn');
  const testBtn = document.getElementById('settingsPushTestBtn');
  const presentation = resolvePushUiPresentation();
  const settingsPresentation = presentation && presentation.settings ? presentation.settings : null;
  const subscribed = presentation ? presentation.active === true : isPushStatusSubscribed(pushUiRuntime.status);
  const busy = presentation ? presentation.busy === true : (pushUiRuntime.busy === true);

  if (supportNode) {
    supportNode.textContent = settingsPresentation ? settingsPresentation.supportLabel : (pushUiRuntime.supported ? 'Ja' : 'Nein');
    supportNode.className = `settings-push-value ${(presentation && presentation.supported) ? 'value_green' : 'value_gold'}`;
  }
  if (permissionNode) {
    permissionNode.textContent = settingsPresentation ? settingsPresentation.permissionLabel : mapPushPermissionLabel(pushUiRuntime.permission);
    permissionNode.className = `settings-push-value ${pushUiRuntime.permission === 'granted' ? 'value_green' : 'value_gold'}`;
  }
  if (statusNode) {
    statusNode.textContent = settingsPresentation ? settingsPresentation.statusLabel : mapPushStatusLabel(pushUiRuntime.status);
    statusNode.className = `settings-push-value ${subscribed ? 'value_green' : 'value_gold'}`;
  }

  if (feedbackNode) {
    feedbackNode.textContent = settingsPresentation ? settingsPresentation.feedback : '';
  }

  if (enableBtn) {
    const showEnable = settingsPresentation ? settingsPresentation.enableVisible : !subscribed;
    enableBtn.classList.toggle('hidden', !showEnable);
    enableBtn.disabled = settingsPresentation ? settingsPresentation.enableDisabled : busy;
  }
  if (disableBtn) {
    const showDisable = settingsPresentation ? settingsPresentation.disableVisible : subscribed;
    disableBtn.classList.toggle('hidden', !showDisable);
    disableBtn.disabled = settingsPresentation ? settingsPresentation.disableDisabled : !subscribed;
  }
  if (testBtn) {
    const showTest = settingsPresentation ? settingsPresentation.testVisible : subscribed;
    testBtn.classList.toggle('hidden', !showTest);
    testBtn.disabled = settingsPresentation ? settingsPresentation.testDisabled : !subscribed;
  }
}

async function refreshPushStatus(options = {}) {
  const force = options.force === true;
  const skipRender = options.skipRender === true;

  if (!force && pushStatusRefreshPromise) {
    return pushStatusRefreshPromise;
  }

  const task = (async () => {
    const pushApi = getPushManagerApi();
    const authed = isAuthSessionValid() && Boolean(readAuthToken());
    pushUiRuntime.error = '';
    pushUiRuntime.message = '';

    if (!pushApi) {
      pushUiRuntime.supported = false;
      pushUiRuntime.permission = 'unsupported';
      pushUiRuntime.status = 'unsupported';
      pushUiRuntime.hasSubscription = false;
      pushUiRuntime.lastUpdatedAtMs = Date.now();
      syncPushFlagsWithCanonicalSettings(pushUiRuntime.status);
      if (!skipRender) {
        renderPushToggle();
        renderPushSettingsUi();
      }
      return pushUiRuntime.status;
    }

    if (authed) {
      try {
        await pushApi.syncExistingSubscriptionWithBackend();
      } catch (error) {
        console.warn('[push] subscription sync skipped', error);
      }
    }

    const status = await pushApi.getPushStatus({ waitForReady: true, timeoutMs: 6000 });
    pushUiRuntime.supported = status && status.supported === true;
    pushUiRuntime.permission = status && status.permission ? String(status.permission) : 'unsupported';
    pushUiRuntime.status = status && status.status ? String(status.status) : 'unsupported';
    pushUiRuntime.hasSubscription = Boolean(status && status.subscription);
    pushUiRuntime.lastUpdatedAtMs = Date.now();

    if (!authed && pushUiRuntime.status === 'granted_subscribed') {
      pushUiRuntime.message = 'Push lokal aktiv. Für Tests bitte einloggen.';
    }

    syncPushFlagsWithCanonicalSettings(pushUiRuntime.status);
    if (!skipRender) {
      renderPushToggle();
      renderPushSettingsUi();
    }
    return pushUiRuntime.status;
  })().catch((error) => {
    pushUiRuntime.error = error && error.message ? String(error.message) : 'Push-Status konnte nicht gelesen werden.';
    pushUiRuntime.message = '';
    if (!skipRender) {
      renderPushToggle();
      renderPushSettingsUi();
    }
    return pushUiRuntime.status;
  }).finally(() => {
    if (pushStatusRefreshPromise === task) {
      pushStatusRefreshPromise = null;
    }
  });

  pushStatusRefreshPromise = task;
  return task;
}

function renderPushToggle() {
  const notifications = getCanonicalNotificationsSettings(state);
  const enabled = isPushStatusSubscribed(pushUiRuntime.status);
  notifications.enabled = enabled;
  state.settings.pushNotificationsEnabled = enabled;
  if (!notifications.lastMessage && pushUiRuntime.message) {
    notifications.lastMessage = pushUiRuntime.message;
  }
  const presentation = resolvePushUiPresentation();
  const togglePresentation = presentation && presentation.toggle ? presentation.toggle : null;

  if (ui.menuPushBtn) {
    ui.menuPushBtn.setAttribute('aria-pressed', String(enabled));
    ui.menuPushBtn.disabled = togglePresentation ? togglePresentation.disabled === true : (pushUiRuntime.busy === true || pushUiRuntime.status === 'unsupported');
  }
  if (ui.menuPushStatus) {
    const menuStatus = presentation && presentation.menuEntry
      ? presentation.menuEntry.subtext
      : (pushUiRuntime.error || pushUiRuntime.message || mapPushStatusLabel(pushUiRuntime.status));
    ui.menuPushStatus.textContent = menuStatus;
  }

  if (!ui.pushToggleBtn || !ui.pushToggleStatus || !ui.pushToggleFeedback || !ui.notifTypeEvents || !ui.notifTypeCritical || !ui.notifTypeReminder) {
    return;
  }

  ui.pushToggleBtn.textContent = togglePresentation ? togglePresentation.buttonLabel : (enabled ? 'AN' : 'AUS');
  ui.pushToggleBtn.setAttribute('aria-pressed', String(togglePresentation ? togglePresentation.pressed === true : enabled));
  ui.pushToggleStatus.textContent = togglePresentation ? togglePresentation.statusLabel : (enabled ? 'Aktiv' : 'Deaktiviert');
  ui.pushToggleFeedback.textContent = togglePresentation ? String(togglePresentation.feedback || '') : (notifications.lastMessage ? String(notifications.lastMessage) : '');
  ui.notifTypeEvents.checked = togglePresentation ? togglePresentation.typeStates.events === true : notifications.types.events === true;
  ui.notifTypeCritical.checked = togglePresentation ? togglePresentation.typeStates.critical === true : notifications.types.critical === true;
  ui.notifTypeReminder.checked = togglePresentation ? togglePresentation.typeStates.reminder === true : notifications.types.reminder === true;
  ui.notifTypeEvents.disabled = togglePresentation ? togglePresentation.typesDisabled === true : !enabled;
  ui.notifTypeCritical.disabled = togglePresentation ? togglePresentation.typesDisabled === true : !enabled;
  ui.notifTypeReminder.disabled = togglePresentation ? togglePresentation.typesDisabled === true : !enabled;
}

function buildRetentionInsightsMarkup(nowMs = Date.now()) {
  const retention = ensureRetentionState(state);
  aggregateDailyRetentionStats(state);
  const streak = retention.streak || {};
  const daily = retention.dailyCare || {};
  const micro = retention.micro || {};
  const todayKey = getLocalDayKey(nowMs);
  const streakCurrent = Math.max(0, Math.trunc(Number(streak.currentCount) || 0));
  const streakBest = Math.max(streakCurrent, Math.trunc(Number(streak.bestCount) || 0));
  const stats7 = getLastNDaysStats(7, state, nowMs);
  const activeDays = stats7.reduce((count, day) => count + (day && day.active ? 1 : 0), 0);
  const completedToday = Math.max(0, Math.trunc(Number(daily.completedCount) || 0));
  const totalToday = Array.isArray(daily.tasks) ? daily.tasks.length : 0;
  const previousCompleted = stats7.slice(0, -1).reverse().find((entry) => Number(entry.tasksCompleted || 0) > 0) || null;
  const todayMicroHistory = (Array.isArray(micro.unlockedHistory) ? micro.unlockedHistory : [])
    .filter((entry) => entry && String(getLocalDayKey(entry.atRealMs)) === todayKey);
  const lastMicroEntry = todayMicroHistory.length ? todayMicroHistory[todayMicroHistory.length - 1] : null;
  const lastMicroDef = lastMicroEntry ? getMicroAchievementDefinition(lastMicroEntry.id) : null;

  const activityDots = stats7.map((entry) => {
    const dayLabel = String(entry.dayKey || '').slice(5);
    const dotClass = entry.active ? 'retention-activity-dot retention-activity-dot--active' : 'retention-activity-dot';
    return `<span class="${dotClass}" title="${escapeHtml(dayLabel)}"></span>`;
  }).join('');

  return `
    <section class="gs-analysis-overview-section retention-insights-section">
      <div class="harvest-section-headline">
        <h3 class="figma-section-head">Retention Insights</h3>
        <p class="harvest-section-intro">Kompakter Blick auf Rhythmus, Konstanz und heutige Session-Qualität.</p>
      </div>
      <div class="retention-insights-grid">
        <article class="retention-insight-card">
          <span class="retention-insight-label">Streak</span>
          <strong class="retention-insight-value">${escapeHtml(String(streakCurrent))}</strong>
          <small>Bester Lauf: ${escapeHtml(String(streakBest))}</small>
        </article>
        <article class="retention-insight-card">
          <span class="retention-insight-label">Aktivität (7 Tage)</span>
          <div class="retention-activity-row">${activityDots}</div>
          <small>${escapeHtml(String(activeDays))}/7 Tage aktiv</small>
        </article>
        <article class="retention-insight-card">
          <span class="retention-insight-label">Daily Care</span>
          <strong class="retention-insight-value">${escapeHtml(totalToday > 0 ? `${completedToday}/${totalToday}` : '0/0')}</strong>
          <small>${escapeHtml(previousCompleted ? `Zuletzt: ${previousCompleted.tasksCompleted} Aufgaben` : 'Noch kein Vergleichstag')}</small>
        </article>
        <article class="retention-insight-card">
          <span class="retention-insight-label">Micro-Erfolge heute</span>
          <strong class="retention-insight-value">${escapeHtml(String(todayMicroHistory.length))}</strong>
          <small>${escapeHtml(lastMicroDef ? lastMicroDef.title : 'Noch kein Unlock heute')}</small>
        </article>
      </div>
    </section>
  `;
}

function renderAnalysisOverview() {
  if (!ui.analysisPanelOverview) {
    warnMissingUiOnce('analysisPanelOverview');
    return;
  }

  const eventUiViewModel = getEventUiViewModel();
  const status = state.status || {};
  const environment = deriveEnvironmentReadout(state);
  const roots = deriveRootZoneReadout(environment, state);
  const diagnosis = diagnosePlantState();
  const primaryIssue = diagnosis.primaryIssue || null;
  const forecast = getCanonicalHarvestForecast(state) || refreshHarvestForecast({ force: true });
  const trendText = primaryIssue
    ? `${primaryIssue.title}. ${primaryIssue.cause}`
    : 'Aktuell kein klarer Hauptdruck. Werte wirken insgesamt stabil.';
  const nextCareText = primaryIssue
    ? describeDiagnosisRecommendation(primaryIssue)
    : 'Beobachten und nur bei klarer Abweichung eingreifen.';
  const retentionInsightsMarkup = buildRetentionInsightsMarkup(Date.now());

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
  const metricRows = forecast ? [
    { label: 'Yield', value: `${Math.round(Number(forecast.yieldScore) || 0)}`, tone: 'value_green' },
    { label: 'Quality', value: `${Math.round(Number(forecast.qualityScore) || 0)}`, tone: 'value_green' },
    { label: 'Stabilität', value: `${Math.round(Number(forecast.stabilityScore) || 0)}`, tone: 'value_green' },
    { label: 'Effizienz', value: `${Math.round(Number(forecast.efficiencyScore) || 0)}`, tone: 'value_green' },
    { label: 'Schwierigkeit', value: `${Math.round(Number(forecast.challengeScore) || 0)}`, tone: 'value_gold' }
  ] : [];
  const heroCopy = forecast ? buildHarvestHeroCopy(forecast) : null;
  const positiveDrivers = Array.isArray(forecast && forecast.positiveDrivers) ? forecast.positiveDrivers.slice(0, 3) : [];
  const negativeDrivers = Array.isArray(forecast && forecast.negativeDrivers) ? forecast.negativeDrivers.slice(0, 3) : [];
  const lockedLosses = Array.isArray(forecast && forecast.lockedLosses) ? forecast.lockedLosses.slice(0, 3) : [];
  const recoveryOpportunities = Array.isArray(forecast && forecast.recoveryOpportunities) ? forecast.recoveryOpportunities.slice(0, 3) : [];
  const leadOpportunity = recoveryOpportunities.length ? recoveryOpportunities[0] : null;
  const supportingOpportunities = leadOpportunity ? recoveryOpportunities.slice(1, 3) : [];

  const rowsToHtml = (rows) => rows.map((row) => `
      <div class="gs-analysis-status-row">
        <span>${escapeHtml(String(row.label || '-'))}</span>
        <strong class="${escapeHtml(String(row.tone || 'value_green'))}">${escapeHtml(String(row.value || '-'))}</strong>
      </div>
    `).join('');
  const cardsToHtml = (rows, emptyText, mode = 'neutral') => {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) {
      return `<p class="harvest-section-empty">${escapeHtml(emptyText)}</p>`;
    }
    return safeRows.map((row) => `
      <article class="harvest-driver-card harvest-driver-card--${escapeHtml(mode)}">
        <div class="gs-analysis-driver-head">
          <strong>${escapeHtml(normalizeHarvestUiLabel(row.label, mode === 'loss' ? 'loss' : 'driver'))}</strong>
          <span class="gs-analysis-driver-badge gs-analysis-driver-badge--low">${escapeHtml(formatHarvestImpactLabel(row.impact, mode))}</span>
        </div>
        <p class="gs-analysis-driver-line">${escapeHtml(normalizeHarvestUiText(row.reason, mode === 'loss' ? 'loss' : 'reason'))}</p>
      </article>
    `).join('');
  };
  const leadOpportunityHtml = leadOpportunity ? `
      <article class="harvest-spotlight-card">
        <div class="harvest-spotlight-card__head">
          <div>
            <span class="harvest-spotlight-card__eyebrow">Größter Hebel jetzt</span>
            <strong>${escapeHtml(normalizeHarvestUiLabel(leadOpportunity.label, 'opportunity'))}</strong>
          </div>
          <span class="gs-analysis-driver-badge gs-analysis-driver-badge--medium">${escapeHtml(describeHarvestGainRange(leadOpportunity))}</span>
        </div>
        <p class="harvest-spotlight-card__copy">${escapeHtml(normalizeHarvestUiText(leadOpportunity.reason || 'Gerade lässt sich hier am meisten zurückholen oder stabilisieren.', 'opportunity'))}</p>
      </article>
    ` : `
      <article class="harvest-spotlight-card harvest-spotlight-card--quiet">
        <div class="harvest-spotlight-card__head">
          <div>
            <span class="harvest-spotlight-card__eyebrow">Größter Hebel jetzt</span>
            <strong>Kein einzelner Fix dominiert</strong>
          </div>
          <span class="gs-analysis-driver-badge gs-analysis-driver-badge--low">Ruhig bleiben</span>
        </div>
        <p class="harvest-spotlight-card__copy">Aktuell bringt sauberes Stabilisieren mehr als hektisches Gegensteuern.</p>
      </article>
    `;
  const supportingOpportunityHtml = supportingOpportunities.length ? `
      <div class="harvest-secondary-list">
        ${supportingOpportunities.map((item) => `
          <article class="harvest-secondary-item">
            <strong>${escapeHtml(normalizeHarvestUiLabel(item.label || 'Weitere Chance', 'opportunity'))}</strong>
            <span>${escapeHtml(describeHarvestGainRange(item))}</span>
          </article>
        `).join('')}
      </div>
    ` : '';

  ui.analysisPanelOverview.innerHTML = `
    ${forecast ? `
      <section class="gs-analysis-overview-section gs-analysis-overview-section--harvest harvest-analysis-hero--premium">
        <div class="harvest-analysis-hero">
          <div class="harvest-analysis-hero__main">
            <span class="harvest-analysis-hero__eyebrow">Ernteprognose</span>
            <strong class="harvest-analysis-hero__score">${escapeHtml(String(Math.round(Number(forecast.harvestScore) || 0)))}</strong>
            <h3 class="harvest-analysis-hero__title">${escapeHtml(String(heroCopy && heroCopy.title || 'Solide Prognose'))}</h3>
            <p class="harvest-analysis-hero__summary">${escapeHtml(String(heroCopy && heroCopy.subtitle || 'Der Run ist aktuell sauber lesbar.'))}</p>
          </div>
          <div class="harvest-analysis-hero__meta">
            <span class="harvest-analysis-hero__pill">Qualität ${escapeHtml(formatHarvestQualityBand(forecast))}</span>
            <strong class="harvest-analysis-hero__trend">${escapeHtml(formatHarvestTrendLabel(forecast.forecastTrend))}</strong>
            <span class="harvest-analysis-hero__pill harvest-analysis-hero__pill--soft">${escapeHtml(formatHarvestReadinessLabel(forecast.confidenceBand))}</span>
          </div>
        </div>
        <p class="harvest-analysis-hero__reason">${escapeHtml(normalizeHarvestUiText(forecast.lastForecastReason || 'Die lokale Richtung bleibt derzeit vergleichsweise ruhig.', 'hero'))}</p>
      </section>
    ` : ''}
    ${buildEventCenterMarkup(eventUiViewModel)}
    ${buildRecentEventHistoryMarkup()}
    ${retentionInsightsMarkup}
    <section class="gs-analysis-overview-section">
      <div class="harvest-section-headline">
        <h3 class="figma-section-head">Was die Prognose gerade bewegt</h3>
        <p class="harvest-section-intro">Oben steht nur, was jetzt wirklich zählt: Stützen, Bremsen und der stärkste nächste Hebel.</p>
      </div>
      <div class="harvest-driver-grid">
        <section class="harvest-driver-column">
          <div class="harvest-driver-column__head">
            <h4>Positiv</h4>
            <span>zieht hoch</span>
          </div>
          ${cardsToHtml(positiveDrivers, 'Im Moment trägt kein einzelner Faktor klar über den Rest.', 'positive')}
        </section>
        <section class="harvest-driver-column">
          <div class="harvest-driver-column__head">
            <h4>Bremst</h4>
            <span>kostet Prognose</span>
          </div>
          ${cardsToHtml(negativeDrivers, 'Gerade drückt kein einzelner Bremsfaktor dominant auf die Linie.', 'negative')}
        </section>
      </div>
    </section>
    <section class="gs-analysis-overview-section">
      <div class="harvest-section-headline">
        <h3 class="figma-section-head">Beste nächste Verbesserung</h3>
        <p class="harvest-section-intro">Wenn du jetzt nur eine Sache sauber spielst, sollte sie hier anfangen.</p>
      </div>
      ${leadOpportunityHtml}
      ${supportingOpportunityHtml}
    </section>
    <section class="gs-analysis-overview-section">
      <div class="harvest-section-headline">
        <h3 class="figma-section-head">Bereits verlorene Linie</h3>
        <p class="harvest-section-intro">Ehrlich, aber nicht dominant: Was weg ist, ist getrennt von dem, was du noch drehen kannst.</p>
      </div>
      ${cardsToHtml(lockedLosses, 'Noch kein klarer irreversibler Verlust sichtbar. Viel bleibt noch formbar.', 'loss')}
    </section>
    <section class="gs-analysis-overview-section">
      <div class="harvest-section-headline">
        <h3 class="figma-section-head">Verlauf &amp; Details</h3>
        <p class="harvest-section-intro">Für tieferes Lesen: Entwicklung, Breakdown und die darunterliegenden Zustände.</p>
      </div>
      <div class="harvest-detail-stack">
        <div class="harvest-analysis-metric-grid">
          ${rowsToHtml(metricRows)}
        </div>
        <div class="harvest-chart-shell" style="height: 180px; width: 100%;">
          <canvas id="analysisChartCanvas"></canvas>
        </div>
      </div>
    </section>
    <section class="gs-analysis-overview-section">
      <div class="harvest-detail-grid">
        <div>
          <h3 class="figma-section-head">Pflanzenstatus</h3>
          ${rowsToHtml(statusRows)}
        </div>
        <div>
          <h3 class="figma-section-head">Wurzelzone</h3>
          ${rowsToHtml(rootRows)}
        </div>
      </div>
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

  const forecastHistory = Array.isArray(state.run && state.run.harvest && state.run.harvest.forecastHistory)
    ? state.run.harvest.forecastHistory
    : [];
  const telemetry = state.history.telemetry || [];
  const useHarvestHistory = forecastHistory.length >= 3;
  const labels = useHarvestHistory
    ? forecastHistory.map((t) => `Tag ${Math.max(0, Math.trunc(Number(t.simDay) || 0))}`)
    : telemetry.map((t) => `Tag ${t.day}`);
  
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
          label: useHarvestHistory ? 'Harvest Forecast' : 'Gesundheit',
          data: useHarvestHistory ? forecastHistory.map((t) => Number(t.harvestScore || 0)) : telemetry.map((t) => t.health),
          borderColor: useHarvestHistory ? '#D4AF37' : '#4ade80',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        },
        {
          label: useHarvestHistory ? 'Quality Forecast' : 'Wasser',
          data: useHarvestHistory ? forecastHistory.map((t) => Number(t.qualityScore || 0)) : telemetry.map((t) => t.water),
          borderColor: useHarvestHistory ? '#7dd3fc' : '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        },
        {
          label: useHarvestHistory ? 'Gesundheit' : 'Nährstoffe',
          data: useHarvestHistory ? telemetry.map((t) => t.health).slice(-forecastHistory.length) : telemetry.map((t) => t.nutrition),
          borderColor: useHarvestHistory ? '#4ade80' : '#facc15',
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
  const forecast = getCanonicalHarvestForecast(state) || refreshHarvestForecast({ force: true });
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

  if (forecast) {
    const heroNode = document.createElement('div');
    heroNode.className = 'gs-analysis-driver gs-analysis-driver--primary';
    const heroCopy = buildHarvestHeroCopy(forecast);
    heroNode.innerHTML = `
      <div class="gs-analysis-driver-head">
        <strong>${escapeHtml(String(heroCopy.title || 'Wo der Run gerade steht'))}</strong>
        <span class="gs-analysis-driver-badge gs-analysis-driver-badge--${escapeHtml(String(forecast.confidenceBand || 'medium'))}">${escapeHtml(formatHarvestReadinessLabel(forecast.confidenceBand))}</span>
      </div>
      <p class="gs-analysis-driver-line"><span>Prognose:</span> ${escapeHtml(String(Math.round(Number(forecast.harvestScore) || 0)))}</p>
      <p class="gs-analysis-driver-line"><span>Qualität:</span> ${escapeHtml(formatHarvestQualityBand(forecast))}</p>
      <p class="gs-analysis-driver-line"><span>Einordnung:</span> ${escapeHtml(String(heroCopy.subtitle || 'Die lokale Richtung ist aktuell sauber lesbar.'))}</p>
    `;
    ui.analysisPanelDiagnosis.appendChild(heroNode);
  }

  if (primary) {
    const node = document.createElement('div');
    node.className = 'gs-analysis-driver gs-analysis-driver--primary';
    node.innerHTML = `
      <div class="gs-analysis-driver-head">
        <strong>Was gerade am meisten drückt</strong>
        <span class="gs-analysis-driver-badge gs-analysis-driver-badge--${escapeHtml(primary.severity)}">${escapeHtml(severityLabel(primary.severity))}</span>
      </div>
      <p class="gs-analysis-driver-line"><span>Thema:</span> ${escapeHtml(primary.title)}</p>
      <p class="gs-analysis-driver-line"><span>Ursache:</span> ${escapeHtml(primary.cause)}</p>
      <p class="gs-analysis-driver-line"><span>Auswirkung:</span> ${escapeHtml(primary.effect)}</p>
      <p class="gs-analysis-driver-line"><span>Jetzt sinnvoll:</span> ${escapeHtml(describeDiagnosisRecommendation(primary))}</p>
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

  if (forecast && Array.isArray(forecast.recoveryOpportunities) && forecast.recoveryOpportunities.length) {
    const node = document.createElement('div');
    node.className = 'gs-analysis-driver';
    node.innerHTML = `
      <div class="gs-analysis-driver-head">
        <strong>Größter lokaler Hebel</strong>
        <span class="gs-analysis-driver-badge gs-analysis-driver-badge--medium">Chance</span>
      </div>
      <p class="gs-analysis-driver-line"><span>Priorität:</span> ${escapeHtml(normalizeHarvestUiLabel(forecast.recoveryOpportunities[0].label || 'Chance', 'opportunity'))}</p>
      <p class="gs-analysis-driver-line">${escapeHtml(normalizeHarvestUiText(String(forecast.recoveryOpportunities[0].reason || ''), 'opportunity'))}</p>
    `;
    ui.analysisPanelDiagnosis.appendChild(node);
  }

  if (!primary) {
    const stableNode = document.createElement('div');
    stableNode.className = 'gs-analysis-driver';
    stableNode.innerHTML = `
      <div class="gs-analysis-driver-head">
        <strong>Aktuell kein akuter Bremsfaktor</strong>
        <span class="gs-analysis-driver-badge gs-analysis-driver-badge--low">Beobachten</span>
      </div>
      <p class="gs-analysis-driver-line"><span>Lage:</span> Wasser, Nährstoffe und Druckwerte wirken aktuell vergleichsweise ruhig.</p>
      <p class="gs-analysis-driver-line"><span>Jetzt sinnvoll:</span> Keine harte Gegenmaßnahme nötig. Werte weiter beobachten und nur bei klarer Abweichung eingreifen.</p>
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
  } const actions = Array.isArray(state.history && state.history.actions) ? state.history.actions : []; const events = Array.isArray(state.history && state.history.events) ? state.history.events : []; const system = Array.isArray(state.history && state.history.system) ? state.history.system : []; const forecastHistory = Array.isArray(state.run && state.run.harvest && state.run.harvest.forecastHistory) ? state.run.harvest.forecastHistory : [];
  const simNow = Number(state.simulation && state.simulation.simTimeMs) || 0;

  const merged = [];
  for (const item of forecastHistory.slice(-8)) {
    merged.push({
      kind: 'forecast',
      atRealTimeMs: Number(item.updatedAtRealMs || 0),
      atSimTimeMs: Number(item.simTimeMs || simNow),
      data: item
    });
  }
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
    empty.textContent = i18nT('analysis.no_activity_yet');
    ui.analysisPanelTimeline.appendChild(empty);
    return;
  }

  for (const row of latest) {
    const simStamp = simStampFromMs(row.atSimTimeMs);
    const node = document.createElement('div');
    node.className = 'gs-analysis-timeline-item';

    if (row.kind === 'action') {
      const d = row.data || {};
      node.innerHTML = `<div class="gs-analysis-timeline-meta">${simStamp} · ${i18nT('analysis.action')}</div><strong>${escapeHtml(String(d.label || d.id || i18nT('analysis.action')))}</strong><br>${formatDeltaSummary(d.deltaSummary || {})}`;
    } else if (row.kind === 'event') {
      const d = row.data || {};
      const narrative = buildHistoryNarrative(d);
      const summary = narrative.resultText || narrative.explanationText || formatDeltaSummary(d.effectsApplied || d.deltaSummary || {});
      const detailParts = [
        narrative.causeText,
        narrative.guidanceText,
        narrative.followUpText
      ].filter(Boolean);
      const note = narrative.learningNote ? `<details><summary>${escapeHtml(i18nT('analysis.learning_note'))}</summary>${escapeHtml(String(narrative.learningNote))}</details>` : '';
      const detail = detailParts.length ? `<br>${escapeHtml(detailParts.join(' · '))}` : '';
      node.innerHTML = `<div class="gs-analysis-timeline-meta">${simStamp} · ${i18nT('home.event')} (${escapeHtml(categoryLabel(String(d.category || 'generic')))})</div><strong>${escapeHtml(String(d.eventTitle || d.optionLabel || d.optionId || d.eventId || i18nT('home.event')))}</strong><br>${escapeHtml(String(summary || i18nT('analysis.no_net_change')))}${detail}${note}`;
    } else if (row.kind === 'forecast') {
      const d = row.data || {};
      node.innerHTML = `<div class="gs-analysis-timeline-meta">${simStamp} · ${i18nT('harvest.badge.forecast')}</div><strong>${escapeHtml(i18nT('harvest.local_title'))} ${escapeHtml(String(Math.round(Number(d.harvestScore) || 0)))}</strong><br>${escapeHtml(i18nT('harvest.metric_quality'))} ${escapeHtml(String(Math.round(Number(d.qualityScore) || 0)))} · ${escapeHtml(String(d.reason || i18nT('analysis.local_forecast_updated')))}`;
    } else {
      const d = row.data || {};
      const typeLabel = String(d.type || 'system');
      const label = d.label || d.id || i18nT('analysis.system');
      const wasDeadNote = typeof d.wasDead === 'boolean'
        ? (d.wasDead ? ` · ${i18nT('analysis.reanimation')}` : ` · ${i18nT('analysis.stabilization')}`)
        : '';
      node.innerHTML = `<div class="gs-analysis-timeline-meta">${simStamp} · ${i18nT('analysis.system')} (${escapeHtml(typeLabel === 'rescue' ? i18nT('analysis.emergency_rescue') : i18nT('analysis.system'))})</div><strong>${escapeHtml(String(label))}</strong>${wasDeadNote}<br>${formatDeltaSummary(d.effectsApplied || (d.details && d.details.effectsApplied) || {})}`;
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
  return i18nT('analysis.sim_stamp', { day: totalDay, hour: String(hh).padStart(2, '0') });
}

function formatDeltaSummary(delta) {
  const parts = [];
  for (const [k, v] of Object.entries(delta || {})) {
    if (!Number.isFinite(Number(v)) || Number(v) === 0) {
      continue;
    }
    const n = round2(Number(v));
    parts.push(`${k}: ${n > 0 ? '+' : ''}${n}`);
  } return parts.length ? parts.join(' · ') : i18nT('analysis.no_net_change');
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
    title: 'home.water',
    buttonLabel: 'care.water',
    action: () => openSheet('care'),
    getValue: () => Math.round(Number(state.status.water) || 0),
    getStatus: (value) => {
      if (value >= 80) return i18nT('stat.status.optimal');
      if (value >= 60) return i18nT('stat.status.stable');
      if (value >= 40) return i18nT('stat.status.watch');
      return i18nT('stat.status.critical');
    },
    getExplanation: (value) => {
      if (value >= 80) return i18nT('stat.water.expl.optimal');
      if (value >= 60) return i18nT('stat.water.expl.stable');
      if (value >= 40) return i18nT('stat.water.expl.watch');
      return i18nT('stat.water.expl.critical');
    },
    getRecommendation: (value) => {
      const waterIssue = diagnosePlantState().allIssues.find((entry) => entry.id === 'water_deficit' || entry.id === 'waterlogging');
      if (waterIssue) {
        return i18nT('stat.recommendation_prefix', { text: describeDiagnosisRecommendation(waterIssue) });
      }
      return value < 60
        ? i18nT('stat.water.rec.low')
        : i18nT('stat.water.rec.stable');
    }
  }),
  nutrition: Object.freeze({
    title: 'home.feed',
    buttonLabel: 'care.open',
    action: () => openSheet('care'),
    getValue: () => Math.round(Number(state.status.nutrition) || 0),
    getStatus: (value) => {
      if (value >= 80) return i18nT('stat.status.very_good');
      if (value >= 60) return i18nT('stat.status.solid');
      if (value >= 40) return i18nT('stat.status.slightly_weak');
      return i18nT('stat.status.deficit_risk');
    },
    getExplanation: (value) => {
      if (value >= 60) return i18nT('stat.nutrition.expl.ok');
      if (value >= 40) return i18nT('stat.nutrition.expl.watch');
      return i18nT('stat.nutrition.expl.low');
    },
    getRecommendation: (value) => {
      const issue = diagnosePlantState().allIssues.find((entry) => entry.id === 'nutrient_deficit' || entry.id === 'nutrient_pressure');
      if (issue) {
        return i18nT('stat.recommendation_prefix', { text: describeDiagnosisRecommendation(issue) });
      }
      return value < 60
        ? i18nT('stat.nutrition.rec.low')
        : i18nT('stat.nutrition.rec.ok');
    }
  }),
  growth: Object.freeze({
    title: 'home.grow',
    buttonLabel: 'analysis.open_analysis',
    action: () => openSheet('dashboard'),
    getValue: () => Math.round(Number(state.status.growth) || 0),
    getStatus: (value, impulse) => {
      if (value >= 70 || impulse >= 0.12) return i18nT('stat.growth.status.good');
      if (value >= 40 || impulse >= 0.03) return i18nT('stat.growth.status.solid');
      if (value <= 5 || impulse <= 0.005) return i18nT('stat.growth.status.no_active');
      return i18nT('stat.growth.status.slowed');
    },
    getExplanation: (_value, impulse) => {
      if (impulse >= 0.12) return i18nT('stat.growth.expl.good', { impulse: impulse.toFixed(2) });
      if (impulse >= 0.03) return i18nT('stat.growth.expl.solid', { impulse: impulse.toFixed(2) });
      return i18nT('stat.growth.expl.slowed', { impulse: impulse.toFixed(2) });
    },
    getRecommendation: (value) => {
      const primary = diagnosePlantState().primaryIssue;
      if (primary) {
        return i18nT('stat.recommendation_prefix', { text: describeDiagnosisRecommendation(primary) });
      }
      return value < 40
        ? i18nT('stat.growth.rec.low')
        : i18nT('stat.growth.rec.ok');
    }
  }),
  risk: Object.freeze({
    title: 'home.risk',
    buttonLabel: 'analysis.open_analysis',
    action: () => openSheet('dashboard'),
    getValue: () => Math.round(Number(state.status.risk) || 0),
    getStatus: (value) => {
      if (value >= 75) return i18nT('stat.status.critical');
      if (value >= 50) return i18nT('stat.status.high');
      if (value >= 25) return i18nT('stat.status.elevated');
      return i18nT('stat.status.low');
    },
    getExplanation: (_value) => {
      const topDriver = diagnosisDrivers()[0];
      if (!topDriver) {
        return i18nT('stat.risk.expl.low');
      }
      return i18nT('stat.risk.expl.driver', { label: topDriver.label, reason: topDriver.reason });
    },
    getRecommendation: (value) => {
      const primary = diagnosePlantState().primaryIssue;
      if (primary) {
        return i18nT('stat.recommendation_prefix', { text: describeDiagnosisRecommendation(primary) });
      }
      return value >= 50
        ? i18nT('stat.risk.rec.high')
        : i18nT('stat.risk.rec.low');
    }
  })
});

const HOME_STAT_POPUP_KEYS = new Set(['water', 'nutrients', 'stress', 'risk']);

function normalizeHomeStatPopupKey(statKey) {
  if (statKey === 'nutrition') {
    return 'nutrients';
  }
  return String(statKey || '').trim().toLowerCase();
}

function closeHomeStatPopup(options = {}) {
  const shouldRender = options && options.render !== false;
  if (!state.ui || state.ui.activeStatPopup === null) {
    return;
  }
  state.ui.activeStatPopup = null;
  if (shouldRender) {
    renderHud();
  }
}

function getHomeStatPopupModel(statKey, homeVm) {
  const vm = homeVm && typeof homeVm === 'object' ? homeVm : buildHomeViewModel(state);
  const rings = vm.rings || {};
  const water = Math.round(Number(rings.water || 0));
  const nutrients = Math.round(Number(rings.nutrition || 0));
  const stress = Math.round(Number(rings.stress || 0));
  const risk = Math.round(Number(rings.risk || 0));
  const growthImpulse = Number(state.simulation && state.simulation.growthImpulse || 0);

  if (statKey === 'water') {
    if (water <= 30) {
      return {
        title: i18nT('popup.water.title'),
        primary: i18nT('popup.water.primary.low'),
        secondary: risk >= 55 ? i18nT('popup.water.secondary.demand_up') : i18nT('popup.water.secondary.consumption_up'),
        actionLabel: i18nT('care.water'),
        action: () => openSheet('care')
      };
    }
    if (water <= 55) {
      return {
        title: i18nT('popup.water.title'),
        primary: i18nT('popup.water.primary.reserve_down'),
        secondary: growthImpulse >= 0.08 ? i18nT('popup.water.secondary.demand_up') : i18nT('popup.water.secondary.consumption_up'),
        actionLabel: i18nT('care.water'),
        action: () => openSheet('care')
      };
    }
    return {
      title: i18nT('popup.water.title'),
      primary: i18nT('popup.water.primary.stable'),
      secondary: growthImpulse >= 0.08 ? i18nT('popup.water.secondary.consumption_up') : i18nT('popup.water.secondary.intake_calm'),
      actionLabel: i18nT('care.water'),
      action: () => openSheet('care')
    };
  }

  if (statKey === 'nutrients') {
    if (nutrients <= 30) {
      return {
        title: i18nT('popup.nutrition.title'),
        primary: i18nT('popup.nutrition.primary.low'),
        secondary: i18nT('popup.nutrition.secondary.watch'),
        actionLabel: i18nT('care.feed'),
        action: () => openSheet('care')
      };
    }
    if (nutrients <= 55) {
      return {
        title: i18nT('popup.nutrition.title'),
        primary: i18nT('popup.nutrition.primary.demand_up'),
        secondary: growthImpulse >= 0.06 ? i18nT('popup.nutrition.secondary.slowly_up') : i18nT('popup.nutrition.secondary.watch'),
        actionLabel: i18nT('care.feed'),
        action: () => openSheet('care')
      };
    }
    return {
      title: i18nT('popup.nutrition.title'),
      primary: i18nT('popup.nutrition.primary.stable'),
      secondary: growthImpulse >= 0.06 ? i18nT('popup.nutrition.secondary.slowly_up') : i18nT('popup.nutrition.secondary.intake_calm'),
      actionLabel: i18nT('care.feed'),
      action: () => openSheet('care')
    };
  }

  if (statKey === 'stress') {
    if (stress >= 70) {
      return {
        title: i18nT('popup.stress.title'),
        primary: i18nT('popup.stress.primary.up'),
        secondary: i18nT('popup.stress.secondary.watch')
      };
    }
    if (stress >= 40) {
      return {
        title: i18nT('popup.stress.title'),
        primary: i18nT('popup.stress.primary.light'),
        secondary: i18nT('popup.stress.secondary.watch')
      };
    }
    return {
      title: i18nT('popup.stress.title'),
      primary: i18nT('popup.stress.primary.ok'),
      secondary: i18nT('popup.stress.secondary.no_action')
    };
  }

  if (risk >= 70) {
    return {
      title: i18nT('popup.risk.title'),
      primary: i18nT('popup.risk.primary.up'),
      secondary: i18nT('popup.risk.secondary.watch')
    };
  }
  if (risk >= 40) {
    return {
      title: i18nT('popup.risk.title'),
      primary: i18nT('popup.risk.primary.watch_values'),
      secondary: i18nT('popup.risk.secondary.trend_stable')
    };
  }
  return {
    title: i18nT('popup.risk.title'),
    primary: i18nT('popup.risk.primary.no_acute'),
    secondary: i18nT('popup.risk.secondary.no_action')
  };
}

function renderHomeStatPopup(homeVm = null) {
  const popupNode = uiNode('homeStatPopup', 'homeStatPopup');
  if (!popupNode) {
    return;
  }
  const activeKey = normalizeHomeStatPopupKey(state.ui && state.ui.activeStatPopup);
  if (!HOME_STAT_POPUP_KEYS.has(activeKey)) {
    popupNode.classList.add('hidden');
    popupNode.setAttribute('aria-hidden', 'true');
    popupNode.removeAttribute('data-stat');
    return;
  }

  const model = getHomeStatPopupModel(activeKey, homeVm);
  const titleNode = uiNode('homeStatPopupTitle', 'homeStatPopupTitle');
  const textNode = uiNode('homeStatPopupText', 'homeStatPopupText');
  const trendNode = uiNode('homeStatPopupTrend', 'homeStatPopupTrend');
  const actionNode = uiNode('homeStatPopupAction', 'homeStatPopupAction');

  popupNode.dataset.stat = activeKey;
  popupNode.classList.remove('hidden');
  popupNode.setAttribute('aria-hidden', 'false');
  if (titleNode) {
    titleNode.textContent = String(model.title || '');
  }
  if (textNode) {
    textNode.textContent = String(model.primary || '');
  }
  if (trendNode) {
    const secondary = String(model.secondary || '').trim();
    trendNode.textContent = secondary;
    trendNode.classList.toggle('hidden', !secondary);
    trendNode.setAttribute('aria-hidden', String(!secondary));
  }
  if (actionNode) {
    const hasAction = typeof model.action === 'function' && String(model.actionLabel || '').trim().length > 0;
    actionNode.textContent = String(model.actionLabel || '');
    actionNode.classList.toggle('hidden', !hasAction);
    actionNode.setAttribute('aria-hidden', String(!hasAction));
    actionNode.disabled = !hasAction;
  }

  const barNode = uiNode('coreStatsBar', 'coreStatsBar');
  const anchorNode = document.querySelector(`[data-core-stat-key="${activeKey}"]`);
  const popupParent = popupNode.offsetParent instanceof Element ? popupNode.offsetParent : popupNode.parentElement;
  if (!barNode || !anchorNode || !popupParent) {
    return;
  }

  const popupParentRect = popupParent.getBoundingClientRect();
  const barRect = barNode.getBoundingClientRect();
  const anchorRect = anchorNode.getBoundingClientRect();
  const popupRect = popupNode.getBoundingClientRect();

  const margin = 8;
  const topOffset = 8;
  const maxLeft = Math.max(margin, popupParentRect.width - popupRect.width - margin);
  const anchorCenter = (anchorRect.left + (anchorRect.width / 2)) - popupParentRect.left;
  const left = clamp(anchorCenter - (popupRect.width / 2), margin, maxLeft);
  const top = Math.max(margin, (barRect.top - popupParentRect.top) - popupRect.height - topOffset);

  popupNode.style.left = `${Math.round(left)}px`;
  popupNode.style.top = `${Math.round(top)}px`;
}

function onStatRingPress(statKey) {
  const normalized = normalizeHomeStatPopupKey(statKey);
  if (!HOME_STAT_POPUP_KEYS.has(normalized)) {
    return;
  }
  state.ui.activeStatPopup = state.ui.activeStatPopup === normalized ? null : normalized;
  renderHud();
}

function onHomeStatPopupAction() {
  const activeKey = normalizeHomeStatPopupKey(state.ui && state.ui.activeStatPopup);
  if (!HOME_STAT_POPUP_KEYS.has(activeKey)) {
    return;
  }
  const model = getHomeStatPopupModel(activeKey, buildHomeViewModel(state));
  if (typeof model.action !== 'function') {
    return;
  }
  closeHomeStatPopup({ render: false });
  model.action();
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

  ui.statDetailTitle.textContent = i18nT(String(config.title || ''));
  ui.statDetailValue.textContent = `${value}`;
  ui.statDetailStatus.textContent = i18nT('stat.status_line', { status });
  ui.statDetailExplanation.textContent = explanation;
  ui.statDetailRecommendation.textContent = recommendation;
  ui.statDetailPrimaryBtn.textContent = i18nT(String(config.buttonLabel || ''));
}

function openSheet(name) {
  if (authGateActive && name !== 'imprint' && name !== 'privacy' && name !== 'diagnosis') {
    openCloudAuthModal({ gate: true });
    return;
  }
  if (isPlantDead() && name !== 'dashboard' && name !== 'support' && name !== 'coinShop' && name !== 'insufficientCoins' && name !== 'imprint' && name !== 'privacy') {
    return;
  }
  if (state.ui.menuOpen) {
    closeMenu();
  }

  if (name !== 'statDetail') {
    state.ui.statDetailKey = null;
  }
  closeHomeStatPopup({ render: false });

  const nowMs = Date.now();
  evaluateDailyRetention(state, nowMs, { skipPersist: true });
  state.ui.openSheet = name;
  renderSheets();

  if (name === 'dashboard') {
    refreshHarvestForecast({ force: true });
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
    emitRetentionAnalytics('missions_sheet_retention_viewed', {
      source: 'open_sheet'
    }, {
      nowMs,
      eventKey: `missions_sheet_view:${getLocalDayKey(nowMs)}:${Math.trunc(nowMs / 60000)}`
    });
    renderMissionsSheet();
  } else if (name === 'support') {
    const source = String(supportFlowRuntime.entrySource || 'sheet_open');
    supportFlowRuntime.entrySource = 'sheet_open';
    renderSupportSheet(true);
    emitSupportTelemetry('support_entry_opened', {
      source
    }, {
      nowMs
    });
  } else if (name === 'coinShop') {
    if (!coinUiRuntime.pendingActionId && !coinUiRuntime.pendingPackId) {
      setCoinShopStatusMessage('', 'info');
    }
    renderCoinShopSheet(true);
    setTimeout(() => {
      if (state.ui.openSheet === 'coinShop') {
        renderCoinShopSheet(true);
      }
    }, 0);
  } else if (name === 'insufficientCoins') {
    renderInsufficientCoinsSheet(true);
  } else if (name === 'leaderboard') {
    renderLeaderboardSheet(true);
    void fetchLeaderboardBundle({ category: ensureLeaderboardUiState(state).category, force: false });
    void fetchRewardsBundle({ force: false });
  } else if (name === 'statDetail') {
    renderStatDetailSheet();
  }
  updateDailyCareCompletion('sheet_open', {
    nowMs,
    sheetName: String(name || '')
  });
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
  const retention = ensureRetentionState(state);
  const streak = retention.streak || {};
  const daily = retention.dailyCare || {};
  const micro = retention.micro || {};
  const todayKey = getLocalDayKey(Date.now());
  const streakCount = Math.max(0, Math.trunc(Number(streak.currentCount) || 0));
  const streakBest = Math.max(streakCount, Math.max(0, Math.trunc(Number(streak.bestCount) || 0)));
  const nextRewardCoins = resolveNextStreakRewardPreview(streakCount);
  const nextMilestone = RETENTION_STREAK_MILESTONES.find((entry) => entry > streakCount) || null;
  const streakDoneToday = String(streak.lastQualifiedDayKey || streak.lastCheckinDayKey || '') === todayKey;
  const tasks = Array.isArray(daily.tasks) ? daily.tasks : [];
  const totalTasks = tasks.length;
  const completedTasks = Math.max(0, Math.trunc(Number(daily.completedCount) || 0));
  const claimableTasks = tasks.reduce((count, task) => {
    if (!task || typeof task !== 'object') {
      return count;
    }
    return (Boolean(task.completed) && !Boolean(task.claimed)) ? (count + 1) : count;
  }, 0);
  const remainingTasks = Math.max(0, totalTasks - completedTasks);
  const dayStatusLabel = claimableTasks > 0
    ? (claimableTasks === 1 ? `1 ${i18nT('daily.claimable')}` : `${claimableTasks} ${i18nT('daily.claimable')}`)
    : (remainingTasks <= 0
      ? (daily.allCompleteClaimed ? i18nT('daily.collected') : i18nT('daily.completed'))
      : (remainingTasks === 1 ? `1 ${i18nT('daily.open')}` : `${remainingTasks} ${i18nT('daily.open')}`));
  const streakSubline = streakDoneToday
    ? i18nT('daily.retention.streak_secured', { coins: nextRewardCoins })
    : (nextMilestone
      ? i18nT('daily.retention.streak_push_milestone', { target: nextMilestone })
      : i18nT('daily.retention.prepare_bonus', { coins: nextRewardCoins }));

  const streakBlock = uiNode('missionsStreakBlock', 'missionsStreakBlock');
  if (streakBlock) {
    const milestoneLabel = nextMilestone
      ? i18nT('daily.retention.milestone_with_reward', { milestone: nextMilestone, coins: nextRewardCoins })
      : i18nT('daily.retention.next_reward_compact', { coins: nextRewardCoins });
    streakBlock.innerHTML = `
      <div class="retention-streak-main">
        <strong>${escapeHtml(i18nT('daily.retention.streak_title', { count: streakCount }))}</strong>
        <span class="retention-streak-status ${streakDoneToday ? 'is-secured' : 'is-open'}">${escapeHtml(streakDoneToday ? i18nT('daily.today_secured') : i18nT('daily.today_open'))}</span>
      </div>
      <small>${escapeHtml(streakSubline)}</small>
      <small class="retention-streak-best">${escapeHtml(i18nT('daily.retention.best_streak_line', { best: streakBest }))} · ${escapeHtml(milestoneLabel)}</small>
    `;
  }

  const dailyList = uiNode('missionsDailyCareList', 'missionsDailyCareList');
  if (dailyList) {
    dailyList.replaceChildren();
    if (!tasks.length) {
      const empty = document.createElement('p');
      empty.className = 'sheet-note';
      empty.textContent = i18nT('daily.empty_daily');
      dailyList.appendChild(empty);
    } else {
      const previousStateMap = renderMissionsSheet._taskStateMap && typeof renderMissionsSheet._taskStateMap === 'object'
        ? renderMissionsSheet._taskStateMap
        : {};
      const nextStateMap = {};
      for (const task of tasks) {
        const taskTypeKey = String(task.type || task.trigger || task.sheetName || '').trim();
        const taskTitle = resolveLikelyI18nText(task.title, taskTypeKey ? `daily.task.${taskTypeKey}.title` : 'daily.task_fallback');
        const target = Math.max(1, Math.trunc(Number(task.target || task.targetValue) || 1));
        const progress = clampInt(Number(task.progress || task.progressValue) || 0, 0, target);
        const completed = Boolean(task.completed) || progress >= target;
        const rewardGranted = Boolean(task.claimed) || Boolean(task.rewardGrantedAt) || hasRetentionClaim(task.claimKey);
        const inProgress = !completed && progress > 0;
        const rowState = !completed
          ? (inProgress ? 'in_progress' : 'open')
          : (rewardGranted ? 'claimed' : 'claimable');
        const stateLabel = rowState === 'open'
          ? i18nT('daily.open')
          : (rowState === 'in_progress'
            ? i18nT('daily.in_progress')
            : (rowState === 'claimable' ? i18nT('daily.claimable') : i18nT('daily.collected')));
        const stateHint = !completed
          ? (inProgress
            ? i18nT('daily.retention.progress_almost', { progress, target })
            : i18nT('daily.retention.start_task', { task: String(taskTitle || i18nT('daily.task_fallback')).toLowerCase() }))
          : (rewardGranted
            ? i18nT('daily.retention.reward_collected')
            : i18nT('daily.retention.ready_for_coins', { coins: Math.max(0, Math.trunc(Number(task.rewardCoins) || 0)) }));
        const progressRatio = clamp(progress / target, 0, 1);
        const claimTaskId = String(task.taskId || task.id || '');
        const claimCoins = Math.max(0, Math.trunc(Number(task.rewardCoins) || 0));
        const stateKey = `task:${claimTaskId}`;
        const previousState = String(previousStateMap[stateKey] || '');
        nextStateMap[stateKey] = rowState;
        const transitionClass = previousState && previousState !== rowState
          ? (rowState === 'claimable' ? ' retention-task-row--pulse-claimable' : (rowState === 'claimed' ? ' retention-task-row--settled' : ''))
          : '';
        const row = document.createElement('div');
        row.className = `retention-task-row retention-task-row--${rowState}${completed && rewardGranted ? ' retention-task-row--done' : ''}${transitionClass}`;
        const claimButtonHtml = completed && !rewardGranted
          ? `<button class="action-btn action-primary retention-task-claim-btn" type="button" data-retention-claim-task="${escapeHtml(claimTaskId)}">${claimCoins > 0 ? `${i18nT('daily.claim')} +${claimCoins} C` : i18nT('daily.claim')}</button>`
          : '';
        const stateToneClass = `retention-task-state retention-task-state--${rowState}`;
        row.innerHTML = `
          <span class="retention-task-copy">
            <strong>${escapeHtml(String(taskTitle || i18nT('daily.task_fallback')))}</strong>
            <small>${escapeHtml(stateHint)}</small>
            <span class="retention-task-progress-wrap" aria-hidden="true">
              <span class="retention-task-progress-track">
                <span class="retention-task-progress-fill" style="--retention-progress:${Math.round(progressRatio * 100)}"></span>
              </span>
              <span class="retention-task-progress-label">${progress}/${target}</span>
            </span>
          </span>
          <span class="${stateToneClass}">${stateLabel}</span>${claimButtonHtml}
        `;
        const claimButton = row.querySelector('[data-retention-claim-task]');
        if (claimButton) {
          claimButton.addEventListener('click', () => {
            claimButton.disabled = true;
            const result = claimDailyTask(String(task.taskId || task.id || ''), Date.now());
            if (!result.ok && result.reason !== 'already_claimed') {
              showRetentionToast(i18nT('daily.claim_not_possible'));
              claimButton.disabled = false;
              return;
            }
            const streakCoins = result.streak && result.streak.ok ? Math.max(0, Math.trunc(Number(result.streak.streakCoins) || 0)) : 0;
            if (result.ok) {
              showRetentionToast(streakCoins > 0
                ? i18nT('daily.claim_success_with_streak', {
                  coins: Math.max(0, Math.trunc(Number(result.coinsGranted) || 0)),
                  streak: streakCoins
                })
                : i18nT('daily.claim_success', {
                  coins: Math.max(0, Math.trunc(Number(result.coinsGranted) || 0))
                }));
            } else {
              showRetentionToast(i18nT('daily.already_claimed'));
            }
            renderMissionsSheet();
            renderAll();
          });
        }
        dailyList.appendChild(row);
      }
      renderMissionsSheet._taskStateMap = nextStateMap;
      if (claimableTasks > 0) {
        const note = document.createElement('p');
        note.className = 'sheet-note';
        note.textContent = claimableTasks === 1
          ? i18nT('daily.retention.claim_note_single')
          : i18nT('daily.retention.claim_note_multi', { count: claimableTasks });
        dailyList.appendChild(note);
      }
    }
  }

  const dailyProgressNode = uiNode('missionsDailyCareProgress', 'missionsDailyCareProgress');
  if (dailyProgressNode) {
    if (totalTasks <= 0) {
      dailyProgressNode.textContent = i18nT('daily.today_open');
    } else if (claimableTasks > 0) {
      dailyProgressNode.textContent = claimableTasks === 1
        ? `1 ${i18nT('daily.claimable')}`
        : `${claimableTasks} ${i18nT('daily.claimable')}`;
    } else if (completedTasks <= 0) {
      dailyProgressNode.textContent = `${totalTasks} ${i18nT('daily.open')}`;
    } else if (completedTasks >= totalTasks) {
      dailyProgressNode.textContent = daily.allCompleteClaimed ? i18nT('daily.all_collected') : i18nT('daily.completed');
    } else if (remainingTasks === 1) {
      dailyProgressNode.textContent = i18nT('daily.one_task_left_round');
    } else {
      dailyProgressNode.textContent = i18nT('daily.retention.progress_day_status', {
        done: completedTasks,
        total: totalTasks,
        status: dayStatusLabel
      });
    }
  }

  const recoveryWrapNode = uiNode('missionsRecoveryWrap', 'missionsRecoveryWrap');
  const recoveryTextNode = uiNode('missionsRecoveryText', 'missionsRecoveryText');
  const recoveryBtnNode = uiNode('missionsRecoveryBtn', 'missionsRecoveryBtn');
  const recoveryBonusBtnNode = uiNode('missionsRecoveryBonusBtn', 'missionsRecoveryBonusBtn');
  const recoveryClaimed = Array.isArray(streak.recoveryClaimedDayKeys) && streak.recoveryClaimedDayKeys.includes(todayKey);
  const recoveryOpen = Boolean(streak.pendingRecoveryOffer)
    && String(streak.pendingRecoveryDayKey || '') === todayKey
    && !recoveryClaimed;
  if (recoveryWrapNode) {
    recoveryWrapNode.classList.toggle('hidden', !recoveryOpen);
    recoveryWrapNode.setAttribute('aria-hidden', String(!recoveryOpen));
  }
  if (recoveryTextNode) {
    if (!recoveryOpen) {
      recoveryTextNode.textContent = '';
    } else if (Number(streak.freezeCredits || 0) > 0) {
      recoveryTextNode.textContent = i18nT('daily.streak_recovery_available', {
        days: Math.max(0, Math.trunc(Number(streak.pendingRecoveryStreakCount) || 0))
      });
    } else {
      recoveryTextNode.textContent = i18nT('daily.streak_recovery_no_credit');
    }
  }
  if (recoveryBtnNode) {
    const hasCredit = Number(streak.freezeCredits || 0) > 0;
    recoveryBtnNode.disabled = !recoveryOpen || !hasCredit;
    recoveryBtnNode.setAttribute('aria-disabled', String(!recoveryOpen || !hasCredit));
    recoveryBtnNode.textContent = hasCredit ? i18nT('daily.recover_streak') : i18nT('daily.no_credit');
    recoveryBtnNode.onclick = () => {
      const result = tryApplyStreakRecovery(Date.now());
      if (!result.ok) {
        showRetentionToast(i18nT('daily.recovery_not_possible'));
        return;
      }
      showRetentionToast(i18nT('daily.recovery_success_days', { days: result.restoredCount }));
      renderMissionsSheet();
      renderAll();
    };
  }
  if (recoveryBonusBtnNode) {
    const hasCredit = Number(streak.freezeCredits || 0) > 0;
    const showBonusCta = recoveryOpen && !hasCredit;
    recoveryBonusBtnNode.classList.toggle('hidden', !showBonusCta);
    recoveryBonusBtnNode.setAttribute('aria-hidden', String(!showBonusCta));
      recoveryBonusBtnNode.onclick = () => {
        const result = tryApplyRewardedBonus('streak_recovery_credit', {
          nowMs: Date.now(),
          source: 'missions_recovery'
        });
        if (!result.ok) {
          showRetentionToast(i18nT('daily.retention.optional_bonus_unavailable'));
          return;
        }
        showRetentionToast(i18nT('daily.retention.recovery_bonus_activated'));
        renderMissionsSheet();
        renderAll();
      };
  }

  const microList = uiNode('missionsMicroList', 'missionsMicroList');
  if (microList) {
    microList.replaceChildren();
    const history = Array.isArray(micro.unlockedHistory) ? micro.unlockedHistory : [];
    const fallbackHistory = history.length
      ? history
      : (Array.isArray(micro.unlockedIds) ? micro.unlockedIds.slice(-3).map((id) => ({ id, atRealMs: Date.now() })) : []);
    const todays = history
      .filter((entry) => entry && String(getLocalDayKey(entry.atRealMs)) === todayKey)
      .slice(-3)
      .reverse();
    const visibleMicroEntries = todays.length ? todays : fallbackHistory.slice(-3).reverse();
    if (!visibleMicroEntries.length) {
      const empty = document.createElement('p');
      empty.className = 'sheet-note';
      empty.textContent = i18nT('daily.empty_micro');
      microList.appendChild(empty);
    } else {
      for (const entry of visibleMicroEntries) {
        const def = getMicroAchievementDefinition(entry.id);
        const chip = document.createElement('span');
        chip.className = `retention-micro-chip retention-micro-chip--${String(def.rarity || 'common')}`;
        chip.title = String(def.shortDescription || '');
        chip.innerHTML = `<strong>${escapeHtml(String(def.title || 'Micro-Erfolg'))}</strong><small>${escapeHtml(String(def.iconTag || 'Micro-Gewinn'))}</small>`;
        microList.appendChild(chip);
      }
    }
  }

  ui.missionsList.replaceChildren();
  state.missions.catalog.forEach((mission) => {
    const isCompleted = state.missions.completed.includes(mission.id);
    const progressView = getMissionProgressView(mission);
    const card = document.createElement('div'); card.className = `figma-section-card mission-card ${isCompleted ? 'mission-completed' : ''}`;
    
    let rewardText = '';
    if (mission.reward.coins) rewardText += `🪙 ${mission.reward.coins} `;

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
  closeHomeStatPopup({ render: false });
  state.ui.openSheet = null;
  renderSheets();
  state.ui.menuOpen = true;
  renderGameMenu();
}

function closeMenu() {
  if (state.ui.menuDialogOpen) {
    closeMenuDialog();
  }
  closeHomeStatPopup({ render: false });
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
    message: run.status === 'downed'
      ? 'Der aktuelle Run wird als Fehlschlag abgeschlossen. Danach kannst du mit erhaltenem Profil neu starten.'
      : ((run.status === 'finished' || run.status === 'ended')
        ? 'Du startest direkt in einen neuen Run. Dein Profilfortschritt bleibt erhalten.'
        : 'Deine aktuelle Pflanze wird beendet. Profilfortschritt bleibt erhalten.'),
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

function openMenuDialog({ title, message, cancelLabel = i18nT('common.cancel'), confirmLabel = i18nT('common.ok'), onConfirm = null, variant = 'default', kicker = '', rewards = [] }) {
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
  const run = getCanonicalRun(state);
  const summary = profile.lastRunSummary && typeof profile.lastRunSummary === 'object' ? profile.lastRunSummary : null;
  const visible = Boolean(state.ui.runSummaryOpen && summary);
  const awaitingFinalize = run.status === 'finished' && !isRunFinalized(run);
  const isFinalizedSummary = isRunFinalized(run);
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
    ui.runSummarySubtitle.textContent = awaitingFinalize
      ? (summary.endReason === 'harvest'
        ? 'Die Rewards sind vorbereitet. Abschließen archiviert den Run und sichert den Neustart.'
        : 'Der Run ist eingefroren. Abschließen übernimmt die Rewards endgültig und gibt den Neustart frei.')
      : (summary.endReason === 'harvest'
        ? 'Die Runde wurde sauber abgeschlossen und in dein Profil übernommen.'
        : 'Der aktuelle Run wurde beendet und in dein Profil übertragen.');
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
  if (ui.runSummaryGoalReward) { const goalXp = Math.max(0, Math.trunc(Number(summary.goal && summary.goal.status === 'completed' ? summary.goal.rewardXp : 0) || 0)); const goalGrantedXp = Math.max(0, Math.trunc(Number(summary.goalAwardedXp || (summary.goal && summary.goal.awardedXp) || 0) || 0)); ui.runSummaryGoalReward.textContent = goalGrantedXp > 0 ? `+${goalGrantedXp} XP bereits gesichert` : (goalXp > 0 ? `+${goalXp} XP Bonus` : 'Kein Missionsbonus');
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
      empty.textContent = i18nT('run_summary.unlocks_none');
      ui.runSummaryUnlocks.appendChild(empty);
    } else {
      for (const unlock of unlocks) {
        const row = document.createElement('article');
        row.className = 'run-summary-unlock';
        row.innerHTML = `<strong>${escapeHtml(String(unlock.title || unlock.value || i18nT('run_summary.unlock_default_title')))}</strong><p class="sheet-note">${escapeHtml(String(unlock.effect || i18nT('run_summary.unlock_default_effect')))}</p>`;
        ui.runSummaryUnlocks.appendChild(row);
      }
    }
  }
  const harvestSummary = summary.harvestSummary && typeof summary.harvestSummary === 'object'
    ? summary.harvestSummary
    : null;
  const harvestReadiness = ensureHarvestBackendState(run);
  const verifiedHarvestResult = normalizeHarvestVerificationResult(harvestReadiness.verifiedHarvestResult, 'verified');
  const runSummaryHarvestTitleNode = uiNode('runSummaryHarvestTitle', 'runSummaryHarvestTitle');
  const primaryHarvestSummary = harvestReadiness.verificationStatus === 'verified' && verifiedHarvestResult
    ? {
      ...verifiedHarvestResult,
      qualityBandLabel: verifiedHarvestResult.qualityBandLabel || (harvestSummary && harvestSummary.qualityBandLabel) || 'B'
    }
    : harvestSummary;
  const harvestTone = harvestReadiness.verificationStatus === 'verified' && verifiedHarvestResult
    ? buildVerificationHeroTone(verifiedHarvestResult, 'verified', harvestSummary)
    : (harvestSummary ? buildRunSummaryHarvestTone(harvestSummary) : { title: i18nT('harvest.local_title'), subtitle: i18nT('harvest.finish_ready') });
  if (ui.runSummaryHarvestBadge) {
    const showsVerifiedPrimary = harvestReadiness.verificationStatus === 'verified' && verifiedHarvestResult;
    if (runSummaryHarvestTitleNode) {
      runSummaryHarvestTitleNode.textContent = showsVerifiedPrimary ? i18nT('harvest.verified_result_title') : i18nT('harvest.local_title');
    }
    ui.runSummaryHarvestBadge.textContent = showsVerifiedPrimary ? i18nT('harvest.verified_result_badge') : i18nT('harvest.local_badge');
    ui.runSummaryHarvestBadge.dataset.status = showsVerifiedPrimary ? 'verified' : 'local';
  }
  if (ui.runSummaryHarvestHint) {
    ui.runSummaryHarvestHint.textContent = harvestReadiness.statusMessage
      || describeVerificationStatus(harvestReadiness.verificationStatus, harvestReadiness.submissionState)
      || (harvestSummary && harvestSummary.verificationHint
        ? String(harvestSummary.verificationHint)
        : i18nT('harvest.verified_required_for_rankings'));
  }
  if (ui.runSummaryHarvestScore) {
    ui.runSummaryHarvestScore.textContent = primaryHarvestSummary ? String(Math.round(Number(primaryHarvestSummary.harvestScore) || 0)) : '0';
  }
  if (ui.runSummaryHarvestQualityBand) {
    ui.runSummaryHarvestQualityBand.textContent = primaryHarvestSummary ? String(primaryHarvestSummary.qualityBandLabel || 'B') : 'B';
  }
  const runSummaryHarvestHeroToneNode = uiNode('runSummaryHarvestHeroTone', 'runSummaryHarvestHeroTone');
  if (runSummaryHarvestHeroToneNode) {
    runSummaryHarvestHeroToneNode.textContent = String(harvestTone.title || i18nT('harvest.local_title'));
  }
  if (ui.runSummaryHarvestInterpretation) {
    const primaryInterpretation = primaryHarvestSummary && typeof primaryHarvestSummary === 'object'
      ? (primaryHarvestSummary.explanation || primaryHarvestSummary.interpretation || harvestTone.subtitle || i18nT('harvest.local_ready'))
      : i18nT('harvest.local_ready');
    const baseInterpretation = primaryHarvestSummary
      ? normalizeHarvestUiText(String(primaryInterpretation), 'hero')
      : i18nT('harvest.local_ready');
    ui.runSummaryHarvestInterpretation.textContent = baseInterpretation;
  }
  renderRunSummaryHarvestVerification(uiNode('runSummaryHarvestVerification', 'runSummaryHarvestVerification'), harvestReadiness, harvestSummary);
  renderRunSummaryHarvestMetricRows(ui.runSummaryHarvestRows, primaryHarvestSummary);
  renderRunSummaryHarvestImpact(uiNode('runSummaryHarvestImpact', 'runSummaryHarvestImpact'), harvestSummary);
  renderRunSummaryHarvestMoments(uiNode('runSummaryHarvestMoments', 'runSummaryHarvestMoments'), harvestSummary);
  renderRunSummaryRewardsBlock(harvestReadiness);
  const runSummaryHarvestMotivationNode = uiNode('runSummaryHarvestMotivation', 'runSummaryHarvestMotivation');
  if (runSummaryHarvestMotivationNode) {
    if (harvestReadiness.verificationStatus === 'verified' && verifiedHarvestResult) {
      runSummaryHarvestMotivationNode.textContent = i18nT('harvest.motivation.verified');
    } else if (harvestReadiness.verificationStatus === 'rejected') {
      runSummaryHarvestMotivationNode.textContent = i18nT('harvest.motivation.rejected');
    } else if (harvestReadiness.verificationStatus === 'under_review') {
      runSummaryHarvestMotivationNode.textContent = i18nT('harvest.motivation.under_review');
    } else {
      runSummaryHarvestMotivationNode.textContent = buildRunSummaryHarvestMotivation(harvestSummary);
    }
  }
  if (ui.runSummaryHarvestBests) {
    ui.runSummaryHarvestBests.replaceChildren();
    const bestFlags = harvestSummary && harvestSummary.bestFlags ? harvestSummary.bestFlags : {};
    const bestEntries = [
      { key: 'bestHarvestScore', label: i18nT('harvest.best.new_harvest_score') },
      { key: 'bestQualityScoreHarvest', label: i18nT('harvest.best.best_quality') },
      { key: 'bestStabilityScore', label: i18nT('harvest.best.best_stability') }
    ].filter((entry) => Boolean(bestFlags[entry.key]));
    if (!bestEntries.length) {
      const empty = document.createElement('p');
      empty.className = 'sheet-note';
      empty.textContent = i18nT('harvest.best.none_new');
      ui.runSummaryHarvestBests.appendChild(empty);
    } else {
      for (const entry of bestEntries) {
        const row = document.createElement('article');
        row.className = 'run-summary-unlock run-summary-unlock--celebration';
        row.innerHTML = `<strong>${escapeHtml(entry.label)}</strong><p class="sheet-note">${escapeHtml(i18nT('harvest.best.new_personal_mark'))}</p>`;
        ui.runSummaryHarvestBests.appendChild(row);
      }
    }
  }
  if (ui.runSummaryFinalizeBtn) {
    ui.runSummaryFinalizeBtn.classList.toggle('hidden', !awaitingFinalize);
    ui.runSummaryFinalizeBtn.disabled = !awaitingFinalize;
    ui.runSummaryFinalizeBtn.setAttribute('aria-hidden', String(!awaitingFinalize));
  }
  if (ui.runSummaryNewRunBtn) {
    ui.runSummaryNewRunBtn.disabled = false;
    ui.runSummaryNewRunBtn.textContent = awaitingFinalize ? i18nT('run_summary.complete_and_new_run') : i18nT('run_summary.start_new_run');
  }
  if (ui.runSummaryAnalyzeBtn) {
    ui.runSummaryAnalyzeBtn.textContent = i18nT('analysis.open_analysis');
  }
  if (harvestReadiness && harvestReadiness.verificationStatus === 'verified' && isAuthSessionValid() && readAuthToken()) {
    void fetchRewardsBundle({ force: false });
  }
}

function renderHarvestMiniCard(harvestVmInput, nodes = {}) {
  const harvestVm = harvestVmInput && typeof harvestVmInput === 'object' ? harvestVmInput : {};
  const widgetNode = nodes.widgetNode || uiNode('harvestForecastWidget', 'harvestForecastWidget');
  const trendNode = nodes.trendNode || uiNode('harvestForecastTrend', 'harvestForecastTrend');
  const scoreNode = nodes.scoreNode || uiNode('harvestForecastScore', 'harvestForecastScore');
  const qualityNode = nodes.qualityNode || uiNode('harvestForecastQuality', 'harvestForecastQuality');
  const visible = Boolean(harvestVm.visible);
  const trend = String(harvestVm.trend || 'stable');

  if (widgetNode) {
    widgetNode.classList.toggle('hidden', !visible);
    widgetNode.setAttribute('aria-hidden', String(!visible));
    widgetNode.dataset.trend = trend;
    const score = visible ? String(harvestVm.score || 0) : '--';
    const quality = String(harvestVm.qualityText || '--');
    widgetNode.setAttribute('aria-label', `Harvest-Analyse öffnen. Forecast ${score}. Qualität ${quality}.`);
  }
  if (trendNode) {
    trendNode.textContent = String(harvestVm.trendSymbol || formatHarvestTrendSymbol(trend));
    trendNode.dataset.trend = trend;
    trendNode.setAttribute('title', String(harvestVm.trendLabel || formatHarvestTrendLabel(trend)));
    trendNode.setAttribute('aria-label', `Trend ${String(harvestVm.trendLabel || formatHarvestTrendLabel(trend))}`);
  }
  if (scoreNode) {
    scoreNode.textContent = visible ? String(harvestVm.score || 0) : '--';
  }
  if (qualityNode) {
    qualityNode.textContent = String(harvestVm.qualityText || '--');
  }
}

function syncRunGoalProgress(reason, options = {}) {
  const progressionApi = getProgressionApi();
  if (!progressionApi || typeof progressionApi.syncRunGoalState !== 'function') {
    return { updated: false, goalChanged: false, xpGranted: 0 };
  }

  const result = progressionApi.syncRunGoalState(state, {
    reason,
    nowMs: Date.now(),
    ...options
  });
  if (result && result.updated) {
    syncCanonicalStateShape();
    renderAll();
    schedulePersistState(true);
  }
  return result;
}

async function finishRun(reason) {
  const progressionApi = getProgressionApi();
  const run = getCanonicalRun(state);
  const profile = getCanonicalProfile(state);
  logRunFlowDebug('finish_run:start', { reason });
  if (!progressionApi || typeof progressionApi.markRunAsFinished !== 'function') {
    return { finished: false, alreadyFinished: true, summary: profile.lastRunSummary || null };
  }

  const result = progressionApi.markRunAsFinished(state, reason, Date.now());
  if (result && result.summary) {
    state.profile.lastRunSummary = result.summary;
  }

  if ((result && result.finished) || (result && result.alreadyFinished)) {
    state.ui.deathOverlayOpen = false;
    state.ui.deathOverlayAcknowledged = true;
    state.ui.runSummaryOpen = Boolean(state.profile.lastRunSummary);
    state.ui.menuOpen = false;
    state.ui.menuDialogOpen = false;
    state.run.status = result && result.run && result.run.status ? result.run.status : 'finished';
    state.run.endReason = reason === 'harvest' ? 'harvest' : (result.summary && result.summary.endReason) || run.endReason || 'death';
    syncCanonicalStateShape();
    renderAll();
    schedulePersistState(true);
    void submitHarvestRunOutcomeIfPossible();
    logRunFlowDebug('finish_run:done', {
      reason,
      finished: Boolean(result && result.finished),
      alreadyFinished: Boolean(result && result.alreadyFinished)
    });
  }

  return result;
}

async function finalizeRun(reason) {
  const progressionApi = getProgressionApi();
  const run = getCanonicalRun(state);
  const profile = getCanonicalProfile(state);
  logRunFlowDebug('finalize_run:start', { reason });
  if (!progressionApi || typeof progressionApi.finalizeRunState !== 'function') {
    return { finalized: false, alreadyFinalized: true, summary: profile.lastRunSummary || null };
  }

  const result = progressionApi.finalizeRunState(state, reason, Date.now());
  if (result && result.summary) {
    state.profile.lastRunSummary = result.summary;
  }
  if (result && result.summary) {
    const levelUpCoins = grantLevelUpCoinsFromXpResult({
      previousLevel: Number(result.summary.levelBefore || state.profile.level || 1),
      nextLevel: Number(result.summary.levelAfter || state.profile.level || 1)
    }, 'level_up', `run_finalize:${String(state.run && state.run.id || 0)}`);
    if (reason === 'harvest') {
      const harvestSignal = clamp((Number(result.summary.qualityScore || 0) - 50) / 40, 0, 1);
      grantCoins(
        resolveCoinRewardAmount('harvest_completion', harvestSignal),
        'harvest_completion',
        `harvest_completion:${String(state.run && state.run.id || 0)}`
      );
    }
    result.summary.coinLevelReward = levelUpCoins;
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
    void submitHarvestRunOutcomeIfPossible();
    logRunFlowDebug('finalize_run:done', {
      reason,
      finalized: Boolean(result && result.finalized),
      alreadyFinalized: Boolean(result && result.alreadyFinalized)
    });
  }

  return result;
}

window.__gsFinalizeRun = finishRun;

function logRunFlowDebug(label, extra = {}) {
  try {
    const run = getCanonicalRun(state);
    const profile = getCanonicalProfile(state);
    console.info('[run-flow]', label, {
      buildId: (window.GrowSimBuild && window.GrowSimBuild.id) ? String(window.GrowSimBuild.id) : 'dev',
      runId: Number(run.id || 0),
      runStatus: String(run.status || 'unknown'),
      endReason: run.endReason || null,
      isFinalized: isRunFinalized(run),
      summaryOpen: Boolean(state.ui && state.ui.runSummaryOpen),
      analysisOpen: Boolean(state.ui && state.ui.openSheet === 'dashboard'),
      deathOverlayOpen: Boolean(state.ui && state.ui.deathOverlayOpen),
      hasSummary: Boolean(profile.lastRunSummary),
      hasSetup: Boolean(state.setup),
      ...extra
    });
  } catch (_error) {
    // non-fatal debug helper
  }
}

async function resetRunPreservingProfile() {
  logRunFlowDebug('reset_preserving_profile:start');
  clearHarvestVerificationPolling();
  harvestBackendRuntime.sessionPromise = null;
  harvestBackendRuntime.submissionPromise = null;
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
  logRunFlowDebug('reset_preserving_profile:done', { previousRunId });
}

async function beginNextRunFlow() {
  const run = getCanonicalRun(state);
  logRunFlowDebug('begin_next_run:start');
  closeMenu();
  if (run.status === 'downed' && !isRunFinalized(run)) {
    logRunFlowDebug('begin_next_run:finish_downed');
    return finishRun('death');
  }
  if (run.status === 'finished' && !isRunFinalized(run)) {
    logRunFlowDebug('begin_next_run:finalize_finished');
    await finalizeRun(run.endReason || 'death');
  }
  const result = await resetRunPreservingProfile();
  logRunFlowDebug('begin_next_run:done');
  return result;
}

async function onRunSummaryFinalizeClick() {
  const run = getCanonicalRun(state);
  logRunFlowDebug('cta_summary_finalize:click');
  if (run.status === 'finished' && !isRunFinalized(run)) {
    await finalizeRun(run.endReason || 'death');
  }
}

async function onRunSummaryNewRunClick() {
  logRunFlowDebug('cta_summary_new_run:click');
  await beginNextRunFlow();
}

function openHarvestAnalysis() {
  if (!state.ui || typeof state.ui !== 'object') {
    return;
  }
  if (!state.ui.analysis || typeof state.ui.analysis !== 'object') {
    state.ui.analysis = { activeTab: 'overview' };
  } else {
    state.ui.analysis.activeTab = 'overview';
  }
  state.ui.runSummaryOpen = false;
  openSheet('dashboard');
  renderAnalysisPanel(true);
  renderRunSummaryOverlay();
  schedulePersistState(true);
}

async function onRunSummaryAnalyzeClick() {
  const run = getCanonicalRun(state);
  logRunFlowDebug('cta_summary_analyze:click');
  if (run.status === 'finished' && !isRunFinalized(run)) {
    await finalizeRun(run.endReason || 'death');
  }
  openHarvestAnalysis();
}

function onRunSummarySupportClick() {
  setSupportEntrySource('run_summary');
  state.ui.runSummaryOpen = false;
  renderRunSummaryOverlay();
  openSheet('support');
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
    empty.textContent = i18nT('analysis.no_actions_or_events');
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
    const menuUiApi = getMenuUiPresentationApi();
    const rewardControl = getRewardActionPresentation(REWARD_ACTION_TYPES.EMERGENCY_SAVE, { state, context: 'death_overlay' });
    const rewardPresentation = menuUiApi && typeof menuUiApi.resolveRewardPresentation === 'function'
      ? menuUiApi.resolveRewardPresentation(state, {
        rewardControl,
        sourceMode: rewardControl.providerMode || ''
      })
      : null;
    const rescuePresentation = menuUiApi && typeof menuUiApi.resolveRescuePresentation === 'function'
      ? menuUiApi.resolveRescuePresentation(state, {
        context: 'death_overlay',
        rescueMeta: meta.rescue || {},
        pending: rescueAdPending,
        rewardControl,
        rewardPresentation
      })
      : null;
    const safePresentation = rescuePresentation || {};
    ui.deathRescueBtn.disabled = safePresentation.disabled === true;
    ui.deathRescueBtn.setAttribute('aria-disabled', String(safePresentation.disabled === true));
    ui.deathRescueBtn.setAttribute('title', String(safePresentation.title || ''));
    ui.deathRescueBtn.textContent = safePresentation.disabled === true
      ? `${String(safePresentation.label || 'Notfallrettung')} gesperrt`
      : String(safePresentation.label || 'Notfallrettung');
    ui.deathRescueSubtext.textContent = String(safePresentation.subtext || '');
    ui.deathRescueFeedback.textContent = meta.rescue.lastResult ? String(meta.rescue.lastResult) : '';
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
  const harvestApi = getHarvestApi();
  clearHarvestVerificationPolling();
  harvestBackendRuntime.sessionPromise = null;
  harvestBackendRuntime.submissionPromise = null;
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
    setupSnapshot: { ...setup },
    harvest: harvestApi && typeof harvestApi.getDefaultRunHarvest === 'function'
      ? harvestApi.getDefaultRunHarvest()
      : undefined
  };
  ensureHarvestBackendState(state.run);
  if (progressionApi && typeof progressionApi.chooseRunGoal === 'function') {
    state.run.goal = progressionApi.chooseRunGoal(getCanonicalProfile(state), state.run);
  }
  state.ui.runSummaryOpen = false;
  state.ui.deathOverlayOpen = false;
  state.ui.deathOverlayAcknowledged = false;
  state.meta.rescue.used = false;
  state.meta.rescue.usedAtRealMs = null;
  state.meta.rescue.lastResult = null;

  ensureCurrencyState(state);

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
  void createHarvestRunSessionForCurrentRun();
}

async function onDeathResetClick() {
  openMenuDialog({
    title: 'Run verwerfen und neu starten',
    message: 'Der aktuelle Durchlauf wird als Fehlschlag abgeschlossen. Danach erhältst du die Run-Zusammenfassung und kannst neu starten.',
    cancelLabel: 'Abbrechen',
    confirmLabel: 'Run beenden',
    onConfirm: async () => {
      await finishRun('death');
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
  const result = await triggerRewardAction(REWARD_ACTION_TYPES.EMERGENCY_SAVE, { source: 'rescue_entry' });
  if (!result.ok) {
    const menuUiApi = getMenuUiPresentationApi();
    const rewardControl = getRewardActionPresentation(REWARD_ACTION_TYPES.EMERGENCY_SAVE, { state, context: 'menu' });
    const rewardPresentation = menuUiApi && typeof menuUiApi.resolveRewardPresentation === 'function'
      ? menuUiApi.resolveRewardPresentation(state, {
        rewardControl,
        sourceMode: rewardControl.providerMode || ''
      })
      : null;
    const rescuePresentation = menuUiApi && typeof menuUiApi.resolveRescuePresentation === 'function'
      ? menuUiApi.resolveRescuePresentation(state, {
        context: 'menu',
        rescueMeta: meta.rescue || {},
        pending: rescueAdPending,
        rewardControl,
        rewardPresentation
      })
      : null;
    meta.rescue.lastResult = String((rescuePresentation && rescuePresentation.subtext) || 'Notfallrettung ist aktuell nicht verfügbar.');
  }
  renderDeathOverlay();
  renderGameMenu();
  schedulePersistState(true);
}

async function onPushToggleClick() {
  if (pushUiRuntime.busy) {
    return;
  }

  if (isPushStatusSubscribed(pushUiRuntime.status)) {
    await onPushDisableClick();
    return;
  }

  await onPushEnableClick();
}

async function onPushEnableClick() {
  const notifications = getCanonicalNotificationsSettings(state);
  const pushApi = getPushManagerApi();
  const pushText = getPushUiTextBundle();
  const pushActionText = pushText && pushText.action ? pushText.action : null;
  const authed = isAuthSessionValid() && Boolean(readAuthToken());
  if (!pushApi) {
    notifications.lastMessage = pushActionText ? pushActionText.unsupported : 'Push wird in diesem Browser nicht unterstützt.';
    pushUiRuntime.error = '';
    pushUiRuntime.message = notifications.lastMessage;
    pushUiRuntime.status = 'unsupported';
    renderPushToggle();
    renderPushSettingsUi();
    renderGameMenu();
    schedulePersistState(true);
    return;
  }
  if (!authed) {
    notifications.lastMessage = pushText && pushText.feedback ? pushText.feedback.unauthenticated : 'Bitte zuerst einloggen, um Push zu aktivieren.';
    pushUiRuntime.error = '';
    pushUiRuntime.message = notifications.lastMessage;
    renderPushToggle();
    renderPushSettingsUi();
    renderGameMenu();
    return;
  }

  pushUiRuntime.busy = true;
  pushUiRuntime.error = '';
  pushUiRuntime.message = pushText && pushText.feedback ? pushText.feedback.loading : 'Push wird aktiviert...';
  renderPushToggle();
  renderPushSettingsUi();

  try {
    await pushApi.subscribeToPush();
    notifications.lastMessage = pushActionText ? pushActionText.enabled : 'Push erfolgreich aktiviert.';
    pushUiRuntime.message = notifications.lastMessage;
  } catch (error) {
    const message = error && error.message ? String(error.message) : 'Push konnte nicht aktiviert werden.';
    console.error('[push] activation failed', { message, error });
    notifications.lastMessage = message;
    pushUiRuntime.error = message;
    pushUiRuntime.message = '';
  } finally {
    pushUiRuntime.busy = false;
    await refreshPushStatus({ force: true });
    renderPushToggle();
    renderPushSettingsUi();
    renderGameMenu();
    schedulePersistState(true);
  }
}

async function onPushDisableClick() {
  const notifications = getCanonicalNotificationsSettings(state);
  const pushApi = getPushManagerApi();
  const pushText = getPushUiTextBundle();
  const pushActionText = pushText && pushText.action ? pushText.action : null;
  if (!pushApi) {
    notifications.lastMessage = pushActionText ? pushActionText.unsupported : 'Push wird in diesem Browser nicht unterstützt.';
    pushUiRuntime.status = 'unsupported';
    pushUiRuntime.message = notifications.lastMessage;
    pushUiRuntime.error = '';
    renderPushToggle();
    renderPushSettingsUi();
    renderGameMenu();
    schedulePersistState(true);
    return;
  }

  pushUiRuntime.busy = true;
  pushUiRuntime.error = '';
  pushUiRuntime.message = pushText && pushText.feedback ? pushText.feedback.loading : 'Push wird deaktiviert...';
  renderPushToggle();
  renderPushSettingsUi();

  try {
    await pushApi.unsubscribeFromPush();
    notifications.lastMessage = pushActionText ? pushActionText.disabled : 'Push deaktiviert.';
    pushUiRuntime.message = notifications.lastMessage;
  } catch (error) {
    const message = error && error.message ? String(error.message) : 'Push konnte nicht deaktiviert werden.';
    notifications.lastMessage = message;
    pushUiRuntime.error = message;
    pushUiRuntime.message = '';
  } finally {
    pushUiRuntime.busy = false;
    await refreshPushStatus({ force: true });
    renderPushToggle();
    renderPushSettingsUi();
    renderGameMenu();
    schedulePersistState(true);
  }
}

async function onPushTestClick() {
  const pushApi = getPushManagerApi();
  const notifications = getCanonicalNotificationsSettings(state);
  if (!pushApi) {
    pushUiRuntime.error = 'Push ist in diesem Browser nicht verfügbar.';
    renderPushSettingsUi();
    return;
  }
  if (!isAuthSessionValid() || !readAuthToken()) {
    pushUiRuntime.error = 'Bitte einloggen, um eine Test-Benachrichtigung zu senden.';
    renderPushSettingsUi();
    return;
  }
  if (!isPushStatusSubscribed(pushUiRuntime.status)) {
    pushUiRuntime.error = 'Push ist noch nicht aktiv.';
    renderPushSettingsUi();
    return;
  }

  pushUiRuntime.busy = true;
  pushUiRuntime.error = '';
  pushUiRuntime.message = 'Test-Benachrichtigung wird gesendet...';
  renderPushSettingsUi();
  renderPushToggle();
  try {
    await pushApi.sendTestPush();
    notifications.lastMessage = 'Test-Benachrichtigung ausgelöst.';
    pushUiRuntime.message = notifications.lastMessage;
  } catch (error) {
    const message = error && error.message ? String(error.message) : 'Test-Benachrichtigung fehlgeschlagen.';
    notifications.lastMessage = message;
    pushUiRuntime.error = message;
    pushUiRuntime.message = '';
  } finally {
    pushUiRuntime.busy = false;
    await refreshPushStatus({ force: true });
    renderPushToggle();
    renderPushSettingsUi();
    renderGameMenu();
    schedulePersistState(true);
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
  logRunFlowDebug('cta_analysis_new_run:click');
  const confirmed = window.confirm((run.status === 'finished' || run.status === 'ended') ? 'Neuen Run mit bestehendem Profil starten' : 'Aktuellen Run wirklich beenden und einen neuen starten Dein Profilfortschritt bleibt erhalten.');
  if (!confirmed) {
    logRunFlowDebug('cta_analysis_new_run:cancelled');
    return;
  }
  await beginNextRunFlow();
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
  state.ui.activeStatPopup = null;
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
    updateDailyCareCompletion('event_resolved', {
      nowMs: Date.now(),
      eventId: String(state.events.activeEventId || '')
    });
    const resolvedOutcome = state.events.resolvedOutcome && typeof state.events.resolvedOutcome === 'object'
      ? state.events.resolvedOutcome
      : {};
    const outcomeSignal = clamp(((resolvedOutcome.summary === 'good' ? 0.8 : (resolvedOutcome.summary === 'bad' ? 0.2 : 0.5))), 0, 1);
    const eventId = String(resolvedOutcome.eventId || state.events.activeEventId || 'event');
    grantCoins(
      resolveCoinRewardAmount('event_completion', outcomeSignal),
      'event_completion',
      `event_completion:${eventId}:${String(resolvedOutcome.optionId || state.events.lastChoiceId || 'auto')}`
    );
    enterEventCooldown(state.simulation.nowMs);
    renderAll();
    schedulePersistState(true);
    return;
  }
  if (currentSheet === 'insufficientCoins') {
    coinUiRuntime.insufficientFlow.inFlight = false;
    coinUiRuntime.insufficientFlow.rewardedPending = false;
    coinUiRuntime.insufficientFlow.statusMessage = '';
  }
  state.ui.openSheet = null;
  state.ui.statDetailKey = null;
  state.ui.activeStatPopup = null;
  renderSheets();
}

function dismissActiveEvent() {
  if (state.events.machineState !== 'activeEvent') {
    return;
  }
  const eventId = state.events.activeEventId;
  const resolveTimeMinutes = clamp(Number(state.events.activeResolveTimeMinutes || 60), 30, 120);
  const resolveTimeMs = resolveTimeMinutes * 60 * 1000;
  state.events.lastChoiceId = '__dismiss__';
  state.events.scheduler.lastChoiceId = '__dismiss__';
  state.events.machineState = 'resolving';
  state.events.resolvingUntilSimTimeMs = Number(state.simulation.simTimeMs || 0) + resolveTimeMs;
  state.events.resolvingUntilMs = state.simulation.nowMs + resolveTimeMs;
  state.events.pendingResolution = {
    eventId,
    eventTitle: state.events.activeEventTitle,
    eventCategory: state.events.activeCategory || 'generic',
    optionId: '__dismiss__',
    optionLabel: 'Ignoriert',
    learningNote: state.events.activeLearningNote || '',
    chosenAtRealTimeMs: Date.now(),
    chosenAtSimTimeMs: Number(state.simulation.simTimeMs || 0),
    resolveTimeMinutes,
    resolveTimeRealMs: resolveTimeMs,
    resolveAtSimTimeMs: Number(state.simulation.simTimeMs || 0) + resolveTimeMs,
    rawChoiceEffects: {},
    triggerSnapshot: null
  };
  state.events.pendingOutcome = {
    eventId,
    eventTitle: state.events.activeEventTitle,
    optionId: '__dismiss__',
    optionLabel: 'Ignoriert',
    summary: 'pending',
    learningNote: 'Ignorierte Ereignisse erhöhen meist das Risiko.',
    resolvedAfterMs: resolveTimeMs,
    observationText: 'Die Folgen des Nichtstuns werden jetzt über einen kurzen Zeitraum beobachtet.'
  };
  state.events.resolvedOutcome = null;

  addLog('choice', `Ereignis geschlossen ohne Auswahl: ${eventId}`, {
    choiceId: '__dismiss__',
    resolveTimeMinutes
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
      return i18nT('events.state_idle');
    case 'activeEvent':
      return i18nT('events.state_active');
    case 'resolving':
      return i18nT('events.state_resolving');
    case 'resolved':
      return i18nT('events.state_resolved');
    case 'cooldown':
      return i18nT('events.state_cooldown');
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
  const lines = [];
  if (outcome.explanationText) lines.push(String(outcome.explanationText));
  else {
    const tone = outcome.summary === 'good' ? 'Gute Entscheidung.' : (outcome.summary === 'bad' ? 'Eher schlechte Entscheidung.' : 'Gemischtes Ergebnis.');
    if (tone) lines.push(tone);
  }
  if (outcome.resultText && outcome.resultText !== outcome.explanationText) lines.push(String(outcome.resultText));
  if (outcome.followUpIds && outcome.followUpIds.length) lines.push(formatOutcomeFollowUpLabel(outcome.followUpIds));
  if (outcome.learningNote) lines.push(String(outcome.learningNote));
  return lines.join(' ');
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
    return {
      label: 'Ereignisstatus',
      value: formatOutcomeStatusLabel(eventsState.resolvedOutcome && eventsState.resolvedOutcome.outcomeStatus) || 'Ergebnis bereit'
    };
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

  if (!(targetNode instanceof HTMLElement)) {
    return fallback;
  }

  const appHud = document.getElementById('app-hud');
  if (!(appHud instanceof HTMLElement)) {
    return fallback;
  }

  const appHudWidthCss = Math.max(1, Number(appHud.clientWidth) || Number(appHud.offsetWidth) || 0);
  const appHudHeightCss = Math.max(1, Number(appHud.clientHeight) || Number(appHud.offsetHeight) || 0);
  if (!(appHudWidthCss > 0 && appHudHeightCss > 0)) {
    return fallback;
  }

  const backgroundWidthPx = Math.max(1, Number(HOME_PLANT_REFERENCE_FIT.backgroundWidthPx) || 393);
  const backgroundHeightPx = Math.max(1, Number(HOME_PLANT_REFERENCE_FIT.backgroundHeightPx) || 852);
  const coverScale = Math.max(appHudWidthCss / backgroundWidthPx, appHudHeightCss / backgroundHeightPx);
  const renderedBgWidthCss = backgroundWidthPx * coverScale;
  const renderedBgHeightCss = backgroundHeightPx * coverScale;
  const backgroundLeftCss = (appHudWidthCss - renderedBgWidthCss) / 2;
  const backgroundTopCss = (appHudHeightCss - renderedBgHeightCss) / 2;
  const podestCenterXRatio = clamp(Number(HOME_PLANT_REFERENCE_FIT.podestCenterXRatio), 0.0, 1.0);
  const podestFootYRatio = clamp(Number(HOME_PLANT_REFERENCE_FIT.podestFootYRatio), 0.0, 1.0);
  const anchorBackgroundXCss = backgroundLeftCss + (renderedBgWidthCss * podestCenterXRatio);
  const anchorBackgroundYCss = backgroundTopCss + (renderedBgHeightCss * podestFootYRatio);
  const localCanvasOriginCss = resolveElementOffsetWithinAncestor(targetNode, appHud);
  if (!localCanvasOriginCss) {
    return fallback;
  }

  const localAnchorXCss = anchorBackgroundXCss - localCanvasOriginCss.x;
  const localAnchorYCss = anchorBackgroundYCss - localCanvasOriginCss.y;

  return {
    x: Math.round(localAnchorXCss * dpr),
    y: Math.round(localAnchorYCss * dpr)
  };
}

function resolveElementOffsetWithinAncestor(node, ancestor) {
  if (!(node instanceof HTMLElement) || !(ancestor instanceof HTMLElement)) {
    return null;
  }

  let x = 0;
  let y = 0;
  let current = node;

  while (current && current !== ancestor) {
    x += Number(current.offsetLeft) || 0;
    y += Number(current.offsetTop) || 0;

    const transform = window.getComputedStyle(current).transform;
    const translation = extractTransformTranslation(transform);
    x += translation.x;
    y += translation.y;

    current = current.offsetParent;
  }

  if (current !== ancestor) {
    return null;
  }

  return { x, y };
}

function extractTransformTranslation(transformValue) {
  const raw = String(transformValue || '').trim();
  if (!raw || raw === 'none') {
    return { x: 0, y: 0 };
  }

  if (raw.startsWith('matrix3d(') && raw.endsWith(')')) {
    const values = raw.slice(9, -1).split(',').map((value) => Number(value.trim()));
    if (values.length === 16 && values.every(Number.isFinite)) {
      return {
        x: values[12] || 0,
        y: values[13] || 0
      };
    }
  }

  if (raw.startsWith('matrix(') && raw.endsWith(')')) {
    const values = raw.slice(7, -1).split(',').map((value) => Number(value.trim()));
    if (values.length === 6 && values.every(Number.isFinite)) {
      return {
        x: values[4] || 0,
        y: values[5] || 0
      };
    }
  }

  return { x: 0, y: 0 };
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

function normalizeVisibleBounds(visibleBounds, srcW, srcH) {
  const safeSrcW = Math.max(1, Number(srcW) || 1);
  const safeSrcH = Math.max(1, Number(srcH) || 1);
  const bounds = visibleBounds && typeof visibleBounds === 'object' ? visibleBounds : null;
  const rawX = Number(bounds && bounds.x);
  const rawY = Number(bounds && bounds.y);
  const rawW = Number(bounds && bounds.w);
  const rawH = Number(bounds && bounds.h);

  if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || !Number.isFinite(rawW) || !Number.isFinite(rawH)) {
    return { x: 0, y: 0, w: safeSrcW, h: safeSrcH };
  }

  const x = clamp(rawX, 0, safeSrcW - 1);
  const y = clamp(rawY, 0, safeSrcH - 1);
  const maxW = Math.max(1, safeSrcW - x);
  const maxH = Math.max(1, safeSrcH - y);
  const w = clamp(rawW, 1, maxW);
  const h = clamp(rawH, 1, maxH);

  return { x, y, w, h };
}

function getHomePlantPlacement(srcW, srcH, visibleBounds, canvasMetrics, targetNode) {
  const safeSrcW = Math.max(1, Number(srcW) || 1);
  const safeSrcH = Math.max(1, Number(srcH) || 1);
  const dstW = Math.max(1, Number(canvasMetrics && canvasMetrics.widthPx) || 1);
  const dstH = Math.max(1, Number(canvasMetrics && canvasMetrics.heightPx) || 1);
  const dpr = Math.max(1, Number(canvasMetrics && canvasMetrics.dpr) || 1);
  const bounds = normalizeVisibleBounds(visibleBounds, safeSrcW, safeSrcH);

  // Size must be derived from the original source frame, not from opaque bounds.
  const containScale = Math.min(dstW / safeSrcW, dstH / safeSrcH);
  const fitScale = clamp(HOME_PLANT_REFERENCE_FIT.maxFootprintScale, 0.1, 4.5);
  const scale = containScale * fitScale;
  const drawW = Math.max(1, Math.round(safeSrcW * scale));
  const drawH = Math.max(1, Math.round(safeSrcH * scale));
  const anchorPx = resolveHomeBackgroundAnchorPx(targetNode, canvasMetrics);
  const visibleCenterX = (Number(bounds.x) + (Number(bounds.w) / 2)) * scale;
  const visibleBottomOffset = Math.max(0, safeSrcH - (Number(bounds.y) + Number(bounds.h))) * scale;
  const dx = Math.round(anchorPx.x - visibleCenterX);
  const anchorY = anchorPx.y;
  const baselineInsetCss = Number(HOME_PLANT_REFERENCE_FIT.baselineInsetPx) || 0;
  const baselineInsetPx = Math.round(baselineInsetCss * dpr);
  const dy = Math.round(anchorY - drawH + visibleBottomOffset - baselineInsetPx);

  return {
    fitScale,
    drawW,
    drawH,
    dx,
    dy,
    anchorY,
    containScale
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

function normalizeEventStringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value || '').trim()).filter(Boolean) : [];
}

function normalizeEventPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

function normalizeEventOutcomeTexts(rawOutcomeTexts) {
  const source = normalizeEventPlainObject(rawOutcomeTexts);
  const keys = ['improved', 'stabilized', 'unresolved', 'worsened', 'escalated'];
  const normalized = {};
  keys.forEach((key) => {
    const entry = source[key];
    if (typeof entry === 'string') {
      normalized[key] = { explanation: String(entry) };
    } else if (entry && typeof entry === 'object') {
      normalized[key] = {
        explanation: typeof entry.explanation === 'string' ? entry.explanation : '',
        cause: typeof entry.cause === 'string' ? entry.cause : '',
        result: typeof entry.result === 'string' ? entry.result : '',
        guidance: typeof entry.guidance === 'string' ? entry.guidance : ''
      };
    }
  });
  return normalized;
}

function normalizeEventFollowUpRules(rawFollowUpRules) {
  const source = normalizeEventPlainObject(rawFollowUpRules);
  const normalizeValue = (value) => {
    if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
    if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
    return [];
  };
  return {
    improved: normalizeValue(source.improved),
    stabilized: normalizeValue(source.stabilized),
    unresolved: normalizeValue(source.unresolved),
    worsened: normalizeValue(source.worsened),
    escalated: normalizeValue(source.escalated)
  };
}

function defaultResolveTimeMinutesForNormalizedEvent(category, severity, tags = []) {
  const safeCategory = String(category || 'generic').toLowerCase();
  const safeSeverity = clamp(Number(severity) || 3, 1, 5);
  const safeTags = Array.isArray(tags) ? tags.map((tag) => String(tag).toLowerCase()) : [];
  if (safeTags.includes('urgent') || safeTags.includes('heat') || safeTags.includes('light')) return 35;
  if (safeCategory === 'environment') return safeSeverity >= 4 ? 40 : 50;
  if (safeCategory === 'water') return safeTags.includes('root') || safeTags.includes('oxygen') ? 60 : 45;
  if (safeCategory === 'nutrition') return safeTags.includes('ph') || safeTags.includes('ec') ? 90 : 75;
  if (safeCategory === 'disease' || safeCategory === 'pest') return safeSeverity >= 4 ? 90 : 75;
  if (safeCategory === 'positive') return 30;
  return 60;
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
      uiCopy: option.uiCopy && typeof option.uiCopy === 'object' ? option.uiCopy : {},
      intent: typeof option.intent === 'string' ? String(option.intent) : '',
      contextFit: normalizeEventStringList(option.contextFit)
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
    allowedPhases: Array.isArray(rawEvent.allowedPhases) ? rawEvent.allowedPhases.map((phase) => String(phase)).filter(Boolean) : normalizeEventStringList(rawEvent.phases),
    weight: Math.max(0.01, Number(rawEvent.weight) || normalizeSeverity(rawEvent.severity) || 1),
    cooldownRealMinutes: clamp(Number(rawEvent.cooldownRealMinutes) || 120, 10, 24 * 60),
    resolveTimeMinutes: clamp(Number(rawEvent.resolveTimeMinutes) || defaultResolveTimeMinutesForNormalizedEvent(category, rawEvent.severity, rawEvent.tags), 30, 120),
    learningNote: String(rawEvent.learningNote || ''),
    severity: normalizeSeverity(rawEvent.severity),
    polarity: normalizedSeed.polarity,
    environment: inferEnvironmentScope(rawEvent),
    tags: Array.isArray(rawEvent.tags) ? rawEvent.tags.map(String) : [],
    tone: String(rawEvent.tone || ''),
    pool: typeof rawEvent.pool === 'string' ? String(rawEvent.pool) : '',
    isFollowUp: rawEvent.isFollowUp === true,
    imagePath,
    warningText: typeof rawEvent.warningText === 'string' ? String(rawEvent.warningText) : '',
    shadowModel: normalizeEventPlainObject(rawEvent.shadowModel),
    outcomeTexts: normalizeEventOutcomeTexts(rawEvent.outcomeTexts),
    followUpRules: normalizeEventFollowUpRules(rawEvent.followUpRules),
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
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        try {
          db.close();
        } catch (_error) {
          // best-effort; a blocked delete should never keep stale state alive
        }
      };
      resolve(db);
    };
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
    const missionCoins = Math.max(0, Math.trunc(Number(mission.reward.coins) || 0));
    if (missionCoins > 0) {
      grantCoins(missionCoins, 'mission_completion', `mission:${String(mission.id || '')}`);
    }
  }
  if (typeof addLog === 'function') {
    addLog('system', "Mission erfuellt: " + mission.title, { missionId: mission.id, reward: mission.reward });
  }
  if (typeof openMenuDialog === 'function') {
    const reward = mission && mission.reward && typeof mission.reward === 'object' ? mission.reward : {};
    const rewardItems = [
      reward.coins ? { icon: 'C', value: `+${reward.coins}`, label: 'Coins', tone: 'gold' } : null
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
  if (typeof state.settings.language !== 'string') {
    state.settings.language = '';
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
    simSpeedHintNode.textContent = boostActive ? `${i18nT('home.boost')} aktiv (x24)` : '';
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
    tutNode.textContent = i18nT('settings.not_active');
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
    volNode.textContent = i18nT('settings.not_active');
    volNode.className = 'subtitle';
    volNode.setAttribute('title', 'Aktuell nur lokaler Anzeigezustand ohne Audio-Backend.');
  }

  const effNode = document.getElementById('settingsEffectsValue');
  if (effNode) {
    effNode.textContent = i18nT('settings.not_active');
    effNode.className = 'subtitle';
    effNode.setAttribute('title', 'Aktuell nur lokaler Anzeigezustand ohne Grafik-/FX-Anbindung.');
  }

  const batNode = document.getElementById('settingsBatteryValue');
  if (batNode) {
    batNode.textContent = i18nT('settings.not_active');
    batNode.className = 'subtitle';
    batNode.setAttribute('title', 'Aktuell ohne direkte Runtime-Wirkung.');
  }

  const hapNode = document.getElementById('settingsHapticValue');
  if (hapNode) {
    hapNode.textContent = i18nT('settings.not_active');
    hapNode.className = 'subtitle';
    hapNode.setAttribute('title', 'Aktuell ohne direkte Runtime-Wirkung.');
  }

  const cloudNode = document.getElementById('settingsCloudSyncValue');
  if (cloudNode) {
    const authIdentity = getAuthDisplayIdentity();
    const isAuthed = Boolean(authIdentity);
    cloudNode.textContent = isAuthed ? (authIdentity.email || i18nT('auth.connected')) : i18nT('settings.not_connected');
    cloudNode.className = isAuthed ? 'value_green' : 'value_gold';
    cloudNode.setAttribute(
      'title',
      isAuthed
        ? 'Cloud Sync aktiv. Klick öffnet Account-Optionen.'
        : 'Nicht mit Cloud verbunden. Klick öffnet Login/Registrierung.'
    );
  }

  const languageSelectNode = document.getElementById('settingsLanguageSelect');
  const authLanguageSelectNode = document.getElementById('authLanguageSelect');
  const i18nApi = getI18nApi();
  if (i18nApi && typeof i18nApi.getCurrentLanguage === 'function') {
    const currentLanguage = i18nApi.getCurrentLanguage();
    if (languageSelectNode) {
      languageSelectNode.value = currentLanguage;
    }
    if (authLanguageSelectNode) {
      authLanguageSelectNode.value = currentLanguage;
    }
  }

  renderPushSettingsUi();
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

function clearTransientBootUiState() {
  if (!state.ui || typeof state.ui !== 'object') {
    return;
  }

  state.ui.menuOpen = false;
  state.ui.menuDialogOpen = false;
  state.ui.openSheet = null;
  state.ui.statDetailKey = null;
  state.ui.activeStatPopup = null;
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
    const shouldResumeSimulationClock = bootCompleted || authGatePausedAtMs > 0;
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
    if (shouldResumeSimulationClock) {
      state.simulation.nowMs = nowMs;
      state.simulation.lastTickRealTimeMs = nowMs;
    }
    if (state.ui && typeof state.ui === 'object' && shouldResumeSimulationClock) {
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
  state.ui.activeStatPopup = null;
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
    languageSelect: document.getElementById('authLanguageSelect'),
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
    nodes.languageSelect,
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
    nodes.tabLogin.textContent = i18nT('auth.login');
  }
  if (nodes.tabRegister) {
    nodes.tabRegister.classList.toggle('is-active', isRegister);
    nodes.tabRegister.textContent = i18nT('auth.register');
  }
  if (nodes.displayNameLabel) {
    nodes.displayNameLabel.classList.toggle('hidden', !isRegister);
  }
  if (nodes.primaryBtn) {
    nodes.primaryBtn.textContent = isRegister ? i18nT('auth.register') : i18nT('auth.login');
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
    nodes.title.textContent = gateMode ? i18nT('auth.required_title') : i18nT('auth.title');
  }
  if (nodes.cancelBtn) {
    nodes.cancelBtn.classList.toggle('hidden', gateMode);
    nodes.cancelBtn.textContent = i18nT('auth.cancel');
  }
  if (nodes.closeBtn) {
    nodes.closeBtn.textContent = i18nT('common.close');
  }
  if (nodes.logoutBtn) {
    nodes.logoutBtn.textContent = i18nT('auth.logout');
  }
  if (nodes.languageSelect) {
    const i18nApi = getI18nApi();
    if (i18nApi && typeof i18nApi.getCurrentLanguage === 'function') {
      nodes.languageSelect.value = i18nApi.getCurrentLanguage();
    }
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

  try {
    await refreshPushStatus({ force: true });
  } catch (error) {
    console.warn('[push] refresh after auth failed', error);
  }
  updateSettingsUI();
  renderPushSettingsUi();
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
    setAuthModalError(i18nT('errors.auth_unavailable'));
    return;
  }

  const nodes = getAuthModalNodes();
  const email = String((nodes.emailInput && nodes.emailInput.value) || '').trim();
  const password = String((nodes.passwordInput && nodes.passwordInput.value) || '');
  const displayName = String((nodes.displayNameInput && nodes.displayNameInput.value) || '').trim();
  const isRegister = authModalMode === 'register';

  if (!email || !password) {
    setAuthModalError(i18nT('auth.missing_credentials'));
    return;
  }
  if (isRegister && !displayName) {
    setAuthModalError(i18nT('auth.missing_display_name'));
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
    const message = error && error.message ? String(error.message) : i18nT('errors.auth_failed');
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
  pushUiRuntime.error = '';
  pushUiRuntime.message = 'Login erforderlich für Push-Requests.';
  pushUiRuntime.busy = false;
  setAuthGateActive(true);
  closeCloudAuthModal({ force: true });
  void refreshPushStatus({ force: true });
  updateSettingsUI();
  renderPushSettingsUi();
  renderAll();
  openCloudAuthModal({ gate: true });
  schedulePersistState(true);
}

function ensureSettingsUiReady() {
  migrateSettings(state);
  initSettingsEvents();
  updateSettingsUI();
  void refreshPushStatus({ force: false });
}

function bindLanguageSelectControl(selectNode) {
  if (!selectNode || selectNode.dataset.bound === 'true') {
    return;
  }
  selectNode.addEventListener('change', (event) => {
    const selectedLanguage = event && event.target ? event.target.value : '';
    const i18nApi = getI18nApi();
    if (!i18nApi || typeof i18nApi.setLanguage !== 'function') {
      return;
    }
    i18nApi.setLanguage(selectedLanguage);
    const language = i18nApi.getCurrentLanguage ? i18nApi.getCurrentLanguage() : String(selectedLanguage || '');
    const settingsLanguageSelect = document.getElementById('settingsLanguageSelect');
    if (settingsLanguageSelect && settingsLanguageSelect !== selectNode) {
      settingsLanguageSelect.value = language;
    }
    const authLanguageSelect = document.getElementById('authLanguageSelect');
    if (authLanguageSelect && authLanguageSelect !== selectNode) {
      authLanguageSelect.value = language;
    }
  });
  selectNode.dataset.bound = 'true';
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

  const languageSelect = byId('settingsLanguageSelect');
  bindLanguageSelectControl(languageSelect);

  const authLanguageSelect = byId('authLanguageSelect');
  bindLanguageSelectControl(authLanguageSelect);

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

  const pushEnableBtn = byId('settingsPushEnableBtn');
  if (pushEnableBtn) {
    pushEnableBtn.addEventListener('click', () => {
      void onPushEnableClick();
    });
  }

  const pushDisableBtn = byId('settingsPushDisableBtn');
  if (pushDisableBtn) {
    pushDisableBtn.addEventListener('click', () => {
      void onPushDisableClick();
    });
  }

  const pushTestBtn = byId('settingsPushTestBtn');
  if (pushTestBtn) {
    pushTestBtn.addEventListener('click', () => {
      void onPushTestClick();
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
