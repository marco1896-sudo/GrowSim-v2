'use strict';

const BridgeApi = (() => {
  if (typeof module === 'undefined' || !module || !module.exports || typeof require !== 'function') {
    return null;
  }
  try {
    return require('../../EventSystemRuntimeBridge.js');
  } catch (_error) {
    return null;
  }
})();

const PILOT_EVENT_ID = 'indoor_dry_rootball';
const PILOT_OPTIONS = Object.freeze(['stabilize', 'inspect', 'overreact']);
const SHARED_PANIC_EVENT_ID = 'shared_panic_watering_misread';
const SHARED_PANIC_OPTIONS = Object.freeze([
  'check_weight_before_watering',
  'inspect_rootzone_then_wait',
  'water_on_panic_signal',
]);
const EventV2PilotActivationRegistryApi = (() => {
  if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
    try {
      return require('../runtime/EventV2ActivationRegistry.js');
    } catch (_error) {
      return null;
    }
  }
  if (typeof window !== 'undefined' && window.GrowSimEventV2ActivationRegistry) {
    return window.GrowSimEventV2ActivationRegistry;
  }
  return null;
})();
const DEV_QUERY_KEYS = Object.freeze(['devEventV2', 'gs_event_v2_dev_preview']);
const DEFAULT_STATUS_FLOOR = Object.freeze({
  stress: 2,
  risk: 2,
});
const DEFAULT_STATUS_RESET = Object.freeze({
  stress: 20,
  risk: 30,
  water: 60,
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isTruthyFlag(value) {
  const raw = String(value || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on' || raw === 'unlock';
}

function isEventV2PilotDevToolsEnabled(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const hostname = String(safeInput.hostname || '').trim().toLowerCase();
  const search = String(safeInput.search || '').trim();
  const devMode = safeInput.devMode === true;
  const localHost = hostname === 'localhost' || hostname === '127.0.0.1';
  let queryEnabled = false;

  if (search) {
    try {
      const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
      queryEnabled = DEV_QUERY_KEYS.some((key) => isTruthyFlag(params.get(key)));
    } catch (_error) {
      queryEnabled = false;
    }
  }

  return localHost || queryEnabled || devMode;
}

function ensureEventV2StateInPlace(state) {
  if (!isPlainObject(state)) {
    return {
      ok: false,
      errors: ['state_not_object'],
      warnings: [],
    };
  }

  if (BridgeApi && typeof BridgeApi.ensureEventV2StateInPlace === 'function') {
    return BridgeApi.ensureEventV2StateInPlace(state, {
      eventSystemMode: 'v2-active-with-v1-legacy-read',
      mode: 'active',
    });
  }

  if (!isPlainObject(state.eventV2)) {
    state.eventV2 = {
      schemaVersion: 1,
      mode: 'active',
      openEvents: [],
      history: [],
      meta: {
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
      },
    };
    return { ok: true, initialized: true, warnings: [], errors: [] };
  }

  if (!Array.isArray(state.eventV2.openEvents)) state.eventV2.openEvents = [];
  if (!Array.isArray(state.eventV2.history)) state.eventV2.history = [];
  if (!isPlainObject(state.eventV2.meta)) state.eventV2.meta = {};
  if (!isPlainObject(state.eventV2.meta.counters)) state.eventV2.meta.counters = {};
  return { ok: true, initialized: false, warnings: [], errors: [] };
}

function createIndoorDryRootballPilotOpenEvent(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const now = Number.isFinite(Number(safeInput.now)) ? Number(safeInput.now) : Date.now();
  const eventVersion = Number.isFinite(Number(safeInput.eventVersion)) ? Number(safeInput.eventVersion) : 3;
  const instanceId = safeInput.instanceId
    ? String(safeInput.instanceId)
    : `evt_v2_dev_seed_${PILOT_EVENT_ID}_${now}`;
  return {
    eventId: PILOT_EVENT_ID,
    instanceId,
    eventVersion,
    createdAt: now,
    stage: 'vegetative',
    category: 'care',
    severity: 'warning',
    source: 'event-v2-pilot-seed-devtools',
    options: PILOT_OPTIONS.slice(),
    selectedOption: null,
    status: 'active',
    previewPayload: {
      title: 'Indoor dry rootball',
      description: 'The rootball is drying unevenly and needs a measured response.',
    },
  };
}

function createSharedPanicWateringPilotOpenEvent(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const now = Number.isFinite(Number(safeInput.now)) ? Number(safeInput.now) : Date.now();
  const eventVersion = Number.isFinite(Number(safeInput.eventVersion)) ? Number(safeInput.eventVersion) : 3;
  const instanceId = safeInput.instanceId
    ? String(safeInput.instanceId)
    : `evt_v2_dev_seed_${SHARED_PANIC_EVENT_ID}_${now}`;
  return {
    eventId: SHARED_PANIC_EVENT_ID,
    instanceId,
    eventVersion,
    createdAt: now,
    stage: 'vegetative',
    category: 'water',
    severity: 'warning',
    source: 'event-v2-pilot-seed-devtools',
    options: SHARED_PANIC_OPTIONS.slice(),
    selectedOption: null,
    status: 'active',
    previewPayload: {
      title: 'Panikgiessen vermeiden',
      description: 'Die Pflanze wirkt durstig, aber ein vorschneller Griff zur Giesskanne kann das Problem verschaerfen.',
    },
  };
}

function createGenericPilotOpenEvent(eventId, input) {
  const safeEventId = String(eventId || '').trim();
  const safeInput = isPlainObject(input) ? input : {};
  const now = Number.isFinite(Number(safeInput.now)) ? Number(safeInput.now) : Date.now();
  const registryEntry = EventV2PilotActivationRegistryApi && typeof EventV2PilotActivationRegistryApi.getEventV2ActivationEntry === 'function'
    ? EventV2PilotActivationRegistryApi.getEventV2ActivationEntry(safeEventId)
    : null;
  const optionIds = registryEntry && Array.isArray(registryEntry.optionIds) && registryEntry.optionIds.length
    ? registryEntry.optionIds.slice()
    : [];
  const instanceId = safeInput.instanceId
    ? String(safeInput.instanceId)
    : `evt_v2_dev_seed_${safeEventId}_${now}`;
  return {
    eventId: safeEventId,
    instanceId,
    eventVersion: Number.isFinite(Number(safeInput.eventVersion)) ? Number(safeInput.eventVersion) : 3,
    createdAt: now,
    stage: 'vegetative',
    category: registryEntry && registryEntry.category ? String(registryEntry.category) : 'care',
    severity: registryEntry && registryEntry.severity ? String(registryEntry.severity) : 'warning',
    source: 'event-v2-pilot-seed-devtools',
    options: optionIds,
    selectedOption: null,
    status: 'active',
    previewPayload: {
      title: registryEntry && registryEntry.title ? String(registryEntry.title) : safeEventId,
      description: registryEntry && registryEntry.description
        ? String(registryEntry.description)
        : 'Dieses Ereignis wurde erkannt. Pruefe die Situation und waehle eine passende Reaktion.',
    },
  };
}

function seedIndoorDryRootballPilotEvent(state, options) {
  const safeOptions = isPlainObject(options) ? options : {};
  const init = ensureEventV2StateInPlace(state);
  if (!init.ok) {
    return {
      ok: false,
      devOnly: true,
      action: 'seed',
      eventId: PILOT_EVENT_ID,
      openEvents: 0,
      history: 0,
      warnings: [],
      errors: init.errors.slice(),
    };
  }

  const now = Number.isFinite(Number(safeOptions.now)) ? Number(safeOptions.now) : Date.now();
  const keepHistory = safeOptions.keepHistory === true;
  const clearHistory = safeOptions.clearHistory === true || !keepHistory;
  const openEvent = createIndoorDryRootballPilotOpenEvent({
    now,
    instanceId: safeOptions.instanceId,
    eventVersion: safeOptions.eventVersion,
  });

  state.eventV2.openEvents = [openEvent];
  if (clearHistory) {
    state.eventV2.history = [];
  } else if (!Array.isArray(state.eventV2.history)) {
    state.eventV2.history = [];
  }

  if (!isPlainObject(state.status)) {
    state.status = {};
  }
  const floorStress = Number.isFinite(Number(safeOptions.minStress)) ? Number(safeOptions.minStress) : DEFAULT_STATUS_FLOOR.stress;
  const floorRisk = Number.isFinite(Number(safeOptions.minRisk)) ? Number(safeOptions.minRisk) : DEFAULT_STATUS_FLOOR.risk;
  state.status.stress = Math.max(floorStress, Number(state.status.stress || 0));
  state.status.risk = Math.max(floorRisk, Number(state.status.risk || 0));

  state.eventV2.meta = isPlainObject(state.eventV2.meta) ? state.eventV2.meta : {};
  state.eventV2.meta.lastGeneratedAt = now;
  state.eventV2.meta.lastAuditAt = now;
  state.eventV2.meta.lastSeedAction = 'seed';
  state.eventV2.meta.lastSeedSource = 'event-v2-pilot-seed-devtools';
  state.eventV2.meta.counters = isPlainObject(state.eventV2.meta.counters) ? state.eventV2.meta.counters : {};
  state.eventV2.meta.counters.generated = Number(state.eventV2.meta.counters.generated || 0) + 1;

  return {
    ok: true,
    devOnly: true,
    action: 'seed',
    eventId: PILOT_EVENT_ID,
    instanceId: openEvent.instanceId,
    openEvents: Array.isArray(state.eventV2.openEvents) ? state.eventV2.openEvents.length : 0,
    history: Array.isArray(state.eventV2.history) ? state.eventV2.history.length : 0,
    warnings: [],
    errors: [],
  };
}

function seedSharedPanicWateringPilotEvent(state, options) {
  const safeOptions = isPlainObject(options) ? options : {};
  const init = ensureEventV2StateInPlace(state);
  if (!init.ok) {
    return {
      ok: false,
      devOnly: true,
      action: 'seed',
      eventId: SHARED_PANIC_EVENT_ID,
      openEvents: 0,
      history: 0,
      warnings: [],
      errors: init.errors.slice(),
    };
  }

  const now = Number.isFinite(Number(safeOptions.now)) ? Number(safeOptions.now) : Date.now();
  const keepHistory = safeOptions.keepHistory === true;
  const clearHistory = safeOptions.clearHistory === true || !keepHistory;
  const openEvent = createSharedPanicWateringPilotOpenEvent({
    now,
    instanceId: safeOptions.instanceId,
    eventVersion: safeOptions.eventVersion,
  });

  state.eventV2.openEvents = [openEvent];
  if (clearHistory) {
    state.eventV2.history = [];
  } else if (!Array.isArray(state.eventV2.history)) {
    state.eventV2.history = [];
  }

  if (!isPlainObject(state.status)) {
    state.status = {};
  }
  const floorStress = Number.isFinite(Number(safeOptions.minStress)) ? Number(safeOptions.minStress) : DEFAULT_STATUS_FLOOR.stress;
  const floorRisk = Number.isFinite(Number(safeOptions.minRisk)) ? Number(safeOptions.minRisk) : DEFAULT_STATUS_FLOOR.risk;
  state.status.stress = Math.max(floorStress, Number(state.status.stress || 0));
  state.status.risk = Math.max(floorRisk, Number(state.status.risk || 0));

  state.eventV2.meta = isPlainObject(state.eventV2.meta) ? state.eventV2.meta : {};
  state.eventV2.meta.lastGeneratedAt = now;
  state.eventV2.meta.lastAuditAt = now;
  state.eventV2.meta.lastSeedAction = 'seed';
  state.eventV2.meta.lastSeedSource = 'event-v2-pilot-seed-devtools';
  state.eventV2.meta.counters = isPlainObject(state.eventV2.meta.counters) ? state.eventV2.meta.counters : {};
  state.eventV2.meta.counters.generated = Number(state.eventV2.meta.counters.generated || 0) + 1;

  return {
    ok: true,
    devOnly: true,
    action: 'seed',
    eventId: SHARED_PANIC_EVENT_ID,
    instanceId: openEvent.instanceId,
    openEvents: Array.isArray(state.eventV2.openEvents) ? state.eventV2.openEvents.length : 0,
    history: Array.isArray(state.eventV2.history) ? state.eventV2.history.length : 0,
    warnings: [],
    errors: [],
  };
}

function seedEventV2PilotEvent(state, eventId, options) {
  const safeEventId = String(eventId || '').trim();
  const safeOptions = isPlainObject(options) ? options : {};
  const init = ensureEventV2StateInPlace(state);
  if (!init.ok) {
    return {
      ok: false,
      devOnly: true,
      action: 'seed',
      eventId: safeEventId || null,
      openEvents: 0,
      history: 0,
      warnings: [],
      errors: init.errors.slice(),
    };
  }
  const runtimeEnabled = EventV2PilotActivationRegistryApi && typeof EventV2PilotActivationRegistryApi.isEventV2RuntimeEnabled === 'function'
    ? EventV2PilotActivationRegistryApi.isEventV2RuntimeEnabled(safeEventId) === true
    : false;
  if (!safeEventId || !runtimeEnabled) {
    return {
      ok: false,
      devOnly: true,
      action: 'seed',
      eventId: safeEventId || null,
      openEvents: Array.isArray(state.eventV2.openEvents) ? state.eventV2.openEvents.length : 0,
      history: Array.isArray(state.eventV2.history) ? state.eventV2.history.length : 0,
      warnings: [],
      errors: ['event_not_runtime_enabled'],
    };
  }

  const now = Number.isFinite(Number(safeOptions.now)) ? Number(safeOptions.now) : Date.now();
  const keepHistory = safeOptions.keepHistory === true;
  const clearHistory = safeOptions.clearHistory === true || !keepHistory;
  const openEvent = createGenericPilotOpenEvent(safeEventId, {
    now,
    instanceId: safeOptions.instanceId,
    eventVersion: safeOptions.eventVersion,
  });
  if (!Array.isArray(openEvent.options) || !openEvent.options.length) {
    return {
      ok: false,
      devOnly: true,
      action: 'seed',
      eventId: safeEventId,
      openEvents: 0,
      history: Array.isArray(state.eventV2.history) ? state.eventV2.history.length : 0,
      warnings: [],
      errors: ['event_missing_options'],
    };
  }
  state.eventV2.openEvents = [openEvent];
  if (clearHistory) state.eventV2.history = [];
  else if (!Array.isArray(state.eventV2.history)) state.eventV2.history = [];
  state.eventV2.meta = isPlainObject(state.eventV2.meta) ? state.eventV2.meta : {};
  state.eventV2.meta.lastGeneratedAt = now;
  state.eventV2.meta.lastAuditAt = now;
  state.eventV2.meta.lastSeedAction = 'seed';
  state.eventV2.meta.lastSeedSource = 'event-v2-pilot-seed-devtools';
  state.eventV2.meta.counters = isPlainObject(state.eventV2.meta.counters) ? state.eventV2.meta.counters : {};
  state.eventV2.meta.counters.generated = Number(state.eventV2.meta.counters.generated || 0) + 1;

  return {
    ok: true,
    devOnly: true,
    action: 'seed',
    eventId: safeEventId,
    instanceId: openEvent.instanceId,
    openEvents: Array.isArray(state.eventV2.openEvents) ? state.eventV2.openEvents.length : 0,
    history: Array.isArray(state.eventV2.history) ? state.eventV2.history.length : 0,
    warnings: [],
    errors: [],
  };
}

function listEventV2PilotEvents() {
  if (!EventV2PilotActivationRegistryApi || typeof EventV2PilotActivationRegistryApi.getEventV2RuntimeEnabledEvents !== 'function') return [];
  return EventV2PilotActivationRegistryApi.getEventV2RuntimeEnabledEvents();
}

function resetEventV2PilotState(state, options) {
  const safeOptions = isPlainObject(options) ? options : {};
  const init = ensureEventV2StateInPlace(state);
  if (!init.ok) {
    return {
      ok: false,
      devOnly: true,
      action: 'reset',
      eventId: PILOT_EVENT_ID,
      openEvents: 0,
      history: 0,
      warnings: [],
      errors: init.errors.slice(),
    };
  }

  const clearHistory = safeOptions.clearHistory === true;
  state.eventV2.openEvents = [];
  if (clearHistory) {
    state.eventV2.history = [];
  } else if (!Array.isArray(state.eventV2.history)) {
    state.eventV2.history = [];
  }

  if (safeOptions.resetStatus === true) {
    if (!isPlainObject(state.status)) state.status = {};
    state.status.stress = Number.isFinite(Number(safeOptions.resetStress))
      ? Number(safeOptions.resetStress)
      : DEFAULT_STATUS_RESET.stress;
    state.status.risk = Number.isFinite(Number(safeOptions.resetRisk))
      ? Number(safeOptions.resetRisk)
      : DEFAULT_STATUS_RESET.risk;
    if (Number.isFinite(Number(safeOptions.resetWater))) {
      state.status.water = Number(safeOptions.resetWater);
    } else if (!Number.isFinite(Number(state.status.water))) {
      state.status.water = DEFAULT_STATUS_RESET.water;
    }
  }

  const now = Number.isFinite(Number(safeOptions.now)) ? Number(safeOptions.now) : Date.now();
  state.eventV2.meta = isPlainObject(state.eventV2.meta) ? state.eventV2.meta : {};
  state.eventV2.meta.lastAuditAt = now;
  state.eventV2.meta.lastSeedAction = 'reset';
  state.eventV2.meta.lastSeedSource = 'event-v2-pilot-seed-devtools';

  return {
    ok: true,
    devOnly: true,
    action: 'reset',
    eventId: PILOT_EVENT_ID,
    openEvents: Array.isArray(state.eventV2.openEvents) ? state.eventV2.openEvents.length : 0,
    history: Array.isArray(state.eventV2.history) ? state.eventV2.history.length : 0,
    warnings: [],
    errors: [],
  };
}

function buildPilotStateSnapshot(state) {
  const safeState = isPlainObject(state) ? state : {};
  const eventV2 = isPlainObject(safeState.eventV2) ? safeState.eventV2 : {};
  const openEvents = Array.isArray(eventV2.openEvents) ? eventV2.openEvents : [];
  const history = Array.isArray(eventV2.history) ? eventV2.history : [];
  const status = isPlainObject(safeState.status) ? safeState.status : {};
  return {
    ok: true,
    devOnly: true,
    action: 'snapshot',
    eventId: PILOT_EVENT_ID,
    openEvents: openEvents.map((entry) => ({
      eventId: String(entry && entry.eventId || ''),
      instanceId: String(entry && entry.instanceId || ''),
      status: String(entry && entry.status || ''),
    })),
    historyCount: history.length,
    status: {
      stress: Number(status.stress || 0),
      risk: Number(status.risk || 0),
      water: Number(status.water || 0),
    },
  };
}

function installEventV2PilotDevTools(windowObj, getState, setState, options) {
  const safeWindow = windowObj && typeof windowObj === 'object' ? windowObj : null;
  if (!safeWindow) {
    return { ok: false, enabled: false, reason: 'window_missing' };
  }
  const safeOptions = isPlainObject(options) ? options : {};
  const enabled = isEventV2PilotDevToolsEnabled({
    hostname: safeOptions.hostname || safeWindow.location && safeWindow.location.hostname,
    search: safeOptions.search || safeWindow.location && safeWindow.location.search,
    devMode: safeOptions.devMode === true,
  });

  if (!enabled) {
    return {
      ok: false,
      enabled: false,
      reason: 'dev_tools_disabled',
    };
  }

  const readState = typeof getState === 'function'
    ? getState
    : () => safeWindow.__gsState || safeWindow.state || null;
  const writeState = typeof setState === 'function' ? setState : null;

  const applyMutation = (mutationFn, actionName, mutationOptions) => {
    const state = readState();
    if (!isPlainObject(state)) {
      return {
        ok: false,
        devOnly: true,
        action: actionName,
        eventId: PILOT_EVENT_ID,
        openEvents: 0,
        history: 0,
        warnings: [],
        errors: ['state_not_available'],
      };
    }
    const before = cloneJson(state);
    const result = mutationFn(state, mutationOptions);
    if (writeState && result.ok) {
      writeState(state);
    }
    if (result.ok && typeof safeWindow.renderAll === 'function') {
      safeWindow.renderAll();
    }
    if (result.ok && state && state.ui && state.ui.openSheet === 'event') {
      if (typeof safeWindow.renderEventSheet === 'function') {
        safeWindow.renderEventSheet();
      } else if (typeof safeWindow.openSheet === 'function') {
        safeWindow.openSheet('event');
      }
    }
    if (result.ok && typeof safeWindow.dispatchEvent === 'function' && typeof safeWindow.CustomEvent === 'function') {
      safeWindow.dispatchEvent(new safeWindow.CustomEvent('eventV2PilotSeeded', {
        detail: {
          action: actionName,
          eventId: PILOT_EVENT_ID,
          openEvents: result.openEvents,
          history: result.history,
        },
      }));
    }
    if (result.ok && safeOptions.persistAfterMutation !== false && typeof safeWindow.schedulePersistState === 'function') {
      safeWindow.schedulePersistState(true);
    }
    return {
      ...result,
      stateMutated: JSON.stringify(before) !== JSON.stringify(state),
    };
  };

  safeWindow.__seedEventV2PilotIndoorDryRootball = (mutationOptions) => applyMutation(seedIndoorDryRootballPilotEvent, 'seed', mutationOptions);
  safeWindow.__seedEventV2PilotSharedPanicWateringMisread = (mutationOptions) => applyMutation(seedSharedPanicWateringPilotEvent, 'seed', mutationOptions);
  safeWindow.__seedEventV2PilotEvent = (eventId, mutationOptions) => applyMutation(
    (state, opts) => seedEventV2PilotEvent(state, eventId, opts),
    'seed',
    mutationOptions
  );
  safeWindow.__listEventV2PilotEvents = () => listEventV2PilotEvents();
  safeWindow.__resetEventV2Pilot = (mutationOptions) => applyMutation(resetEventV2PilotState, 'reset', mutationOptions);
  safeWindow.__getEventV2PilotState = () => buildPilotStateSnapshot(readState());

  return {
    ok: true,
    enabled: true,
    devOnly: true,
    eventId: PILOT_EVENT_ID,
    functions: [
      '__seedEventV2PilotIndoorDryRootball',
      '__seedEventV2PilotSharedPanicWateringMisread',
      '__seedEventV2PilotEvent',
      '__listEventV2PilotEvents',
      '__resetEventV2Pilot',
      '__getEventV2PilotState',
    ],
  };
}

const eventV2PilotSeedDevToolsApi = Object.freeze({
  PILOT_EVENT_ID,
  PILOT_OPTIONS,
  isEventV2PilotDevToolsEnabled,
  createIndoorDryRootballPilotOpenEvent,
  createSharedPanicWateringPilotOpenEvent,
  seedIndoorDryRootballPilotEvent,
  seedSharedPanicWateringPilotEvent,
  seedEventV2PilotEvent,
  listEventV2PilotEvents,
  resetEventV2PilotState,
  installEventV2PilotDevTools,
});

if (typeof window !== 'undefined') {
  window.EventV2PilotSeedDevTools = eventV2PilotSeedDevToolsApi;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = eventV2PilotSeedDevToolsApi;
}
