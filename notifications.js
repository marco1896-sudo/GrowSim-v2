'use strict';

function notificationsApiFetch(path, options = {}) {
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

function showServiceWorkerHint() {
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
  const nowMs = Date.now();
  await evaluateGameplayPushDecisions(nowMs, {
    force: _force === true
  });
}

function canNotify(type) {
  const notifications = getCanonicalNotificationsSettings(state);
  if (notifications.enabled !== true) {
    return false;
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    return false;
  }

  if (type && notifications.types[type] !== true) {
    return false;
  }

  return true;
}

function postMessageToServiceWorker(payload) {
  if (!('serviceWorker' in navigator)) {
    return;
  }

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
  const iconUrl = new URL('icons/icon-192.png', self.location).href;

  postMessageToServiceWorker({
    type: 'GS_SHOW_NOTIFICATION',
    title,
    options: {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag
    }
  });
}

function evaluateNotificationTriggers(nowMs) {
  notifyEventAvailability();
  notifyCriticalState(nowMs);
  notifyReminder(nowMs);
  void evaluateGameplayPushDecisions(nowMs);
}

const GAMEPLAY_PUSH_TYPES = Object.freeze({
  PLANT_NEEDS_WATER: 'plant_needs_water',
  EVENT_OCCURRED: 'event_occurred',
  HARVEST_READY: 'harvest_ready',
  DAILY_REWARD_AVAILABLE: 'daily_reward_available'
});

const GAMEPLAY_PUSH_CONFIG = Object.freeze({
  evaluationMinIntervalMs: 15 * 1000,
  payloadByType: Object.freeze({
    plant_needs_water: Object.freeze({
      cooldownMs: 6 * 60 * 60 * 1000,
      minDurationMs: 20 * 60 * 1000,
      threshold: 35,
      title: 'GrowSim',
      body: 'Deine Pflanze braucht Wasser. Zeit für eine kurze Pflege-Session.',
      tag: 'water_warning',
      url: '/?screen=care'
    }),
    event_occurred: Object.freeze({
      cooldownMs: 30 * 60 * 1000,
      minDurationMs: 0,
      title: 'GrowSim',
      body: 'Ein neues Ereignis ist aufgetreten. Triff jetzt deine Entscheidung.',
      tag: 'event_alert',
      url: '/?screen=event'
    }),
    harvest_ready: Object.freeze({
      cooldownMs: 24 * 60 * 60 * 1000,
      minDurationMs: 5 * 60 * 1000,
      title: 'GrowSim',
      body: 'Deine Pflanze ist erntereif. Schau in die App für den nächsten Schritt.',
      tag: 'harvest_ready',
      url: '/?screen=harvest'
    }),
    daily_reward_available: Object.freeze({
      cooldownMs: 12 * 60 * 60 * 1000,
      minDurationMs: 0,
      title: 'GrowSim',
      body: 'Deine tägliche Belohnung ist verfügbar.',
      tag: 'daily_reward',
      url: '/?screen=reward'
    })
  })
});

function getPushAuthToken() {
  const authApi = window.GrowSimAuth;
  if (!authApi || typeof authApi.getToken !== 'function') {
    return '';
  }
  const token = authApi.getToken();
  return typeof token === 'string' ? token.trim() : '';
}

function isPushUserAuthenticated() {
  const authApi = window.GrowSimAuth;
  if (!authApi || typeof authApi.isAuthenticated !== 'function') {
    return false;
  }
  return Boolean(authApi.isAuthenticated() && getPushAuthToken());
}

function isGameplayPushAllowed() {
  if (!state || !state.settings || state.settings.pushNotificationsEnabled !== true) {
    return false;
  }
  if (!isPushUserAuthenticated()) {
    return false;
  }
  if (!state.simulation || state.simulation.isDaytime !== true) {
    return false;
  }
  return true;
}

function getGameplayPushRuntime() {
  const notifications = getCanonicalNotificationsSettings(state);
  if (!notifications.runtime || typeof notifications.runtime !== 'object') {
    notifications.runtime = {};
  }
  if (!notifications.runtime.gameplayPush || typeof notifications.runtime.gameplayPush !== 'object') {
    notifications.runtime.gameplayPush = {};
  }
  const runtime = notifications.runtime.gameplayPush;

  if (!runtime.lastSentAtByType || typeof runtime.lastSentAtByType !== 'object') {
    runtime.lastSentAtByType = {};
  }
  if (!runtime.lastSignatureByType || typeof runtime.lastSignatureByType !== 'object') {
    runtime.lastSignatureByType = {};
  }
  if (!runtime.pendingSinceByType || typeof runtime.pendingSinceByType !== 'object') {
    runtime.pendingSinceByType = {};
  }
  if (!runtime.lastEvaluationAtMs || !Number.isFinite(Number(runtime.lastEvaluationAtMs))) {
    runtime.lastEvaluationAtMs = 0;
  }

  return runtime;
}

function buildGameplayPushSignal(nowMs) {
  const runtime = getGameplayPushRuntime();
  const status = state && state.status ? state.status : {};
  const events = state && state.events ? state.events : {};
  const plant = state && state.plant ? state.plant : {};
  const run = state && state.run ? state.run : {};
  const waterValue = Number(status.water || 0);
  const lowWater = waterValue > 0 && waterValue <= GAMEPLAY_PUSH_CONFIG.payloadByType.plant_needs_water.threshold;
  const activeEventId = events.machineState === 'activeEvent' && events.activeEventId
    ? String(events.activeEventId)
    : '';
  const harvestReady = Boolean(
    plant.isDead !== true
    && (
      String(plant.phase || '').toLowerCase() === 'harvest'
      || String(plant.stageKey || '').toLowerCase().includes('harvest')
      || Number(plant.stageIndex || 0) >= 11
      || String(run.status || '').toLowerCase() === 'finished'
    )
  );

  const claimableRewards = (typeof window.getClaimableWeeklyRewardsCount === 'function')
    ? Number(window.getClaimableWeeklyRewardsCount() || 0)
    : 0;
  const dailyRewardAvailable = claimableRewards > 0;
  const rewardPeriodKey = state && state.ui && state.ui.rewards && state.ui.rewards.rewardsSummary
    ? String(state.ui.rewards.rewardsSummary.periodKey || '').trim()
    : '';

  if (lowWater) {
    if (!Number.isFinite(Number(runtime.pendingSinceByType.plant_needs_water))) {
      runtime.pendingSinceByType.plant_needs_water = nowMs;
    }
  } else {
    runtime.pendingSinceByType.plant_needs_water = 0;
  }

  if (harvestReady) {
    if (!Number.isFinite(Number(runtime.pendingSinceByType.harvest_ready))) {
      runtime.pendingSinceByType.harvest_ready = nowMs;
    }
  } else {
    runtime.pendingSinceByType.harvest_ready = 0;
  }

  return [
    {
      type: GAMEPLAY_PUSH_TYPES.PLANT_NEEDS_WATER,
      active: lowWater,
      signature: `water:${Math.max(0, Math.round(waterValue))}`,
      context: { water: Math.round(waterValue) }
    },
    {
      type: GAMEPLAY_PUSH_TYPES.EVENT_OCCURRED,
      active: Boolean(activeEventId),
      signature: activeEventId ? `event:${activeEventId}` : '',
      context: { eventId: activeEventId }
    },
    {
      type: GAMEPLAY_PUSH_TYPES.HARVEST_READY,
      active: harvestReady,
      signature: `harvest:${String(plant.stageKey || plant.phase || 'ready')}`,
      context: { stageKey: String(plant.stageKey || ''), phase: String(plant.phase || '') }
    },
    {
      type: GAMEPLAY_PUSH_TYPES.DAILY_REWARD_AVAILABLE,
      active: dailyRewardAvailable,
      signature: `daily_reward:${rewardPeriodKey || 'current'}:${claimableRewards}`,
      context: { claimableCount: claimableRewards, periodKey: rewardPeriodKey || null }
    }
  ];
}

function canDispatchGameplayPush(runtime, candidate, nowMs) {
  if (!candidate || candidate.active !== true) {
    return false;
  }

  const config = GAMEPLAY_PUSH_CONFIG.payloadByType[candidate.type];
  if (!config) {
    return false;
  }

  const pendingSince = Number(runtime.pendingSinceByType[candidate.type] || 0);
  if (config.minDurationMs > 0 && (!pendingSince || (nowMs - pendingSince) < config.minDurationMs)) {
    return false;
  }

  const lastSentAt = Number(runtime.lastSentAtByType[candidate.type] || 0);
  if (lastSentAt > 0 && (nowMs - lastSentAt) < config.cooldownMs) {
    return false;
  }

  const previousSignature = String(runtime.lastSignatureByType[candidate.type] || '');
  if (previousSignature && previousSignature === String(candidate.signature || '')) {
    return false;
  }

  return true;
}

function buildGameplayPushPayload(candidate) {
  const config = GAMEPLAY_PUSH_CONFIG.payloadByType[candidate.type];
  if (!config) {
    return null;
  }

  const basePayload = {
    type: candidate.type,
    title: config.title,
    body: config.body,
    tag: config.tag,
    url: String(config.url || '/')
  };

  if (candidate.type === GAMEPLAY_PUSH_TYPES.EVENT_OCCURRED) {
    const eventId = candidate && candidate.context && candidate.context.eventId
      ? String(candidate.context.eventId)
      : '';
    if (eventId) {
      basePayload.data = { eventId };
    }
  }

  return basePayload;
}

async function dispatchGameplayPush(candidate, nowMs) {
  const pushApi = window.GrowSimPushManager;
  if (!pushApi || typeof pushApi.sendGameplayPush !== 'function') {
    return false;
  }

  const payload = buildGameplayPushPayload(candidate);
  if (!payload || !payload.type || !payload.title || !payload.body || !payload.tag || !payload.url) {
    return false;
  }
  await pushApi.sendGameplayPush(payload);
  const runtime = getGameplayPushRuntime();
  runtime.lastSentAtByType[candidate.type] = nowMs;
  runtime.lastSignatureByType[candidate.type] = String(candidate.signature || '');
  return true;
}

async function evaluateGameplayPushDecisions(nowMs, options = {}) {
  const currentNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const runtime = getGameplayPushRuntime();
  const force = options.force === true;

  if (!force && (currentNowMs - Number(runtime.lastEvaluationAtMs || 0)) < GAMEPLAY_PUSH_CONFIG.evaluationMinIntervalMs) {
    return;
  }
  runtime.lastEvaluationAtMs = currentNowMs;

  if (!isGameplayPushAllowed()) {
    return;
  }

  const candidates = buildGameplayPushSignal(currentNowMs);
  for (const candidate of candidates) {
    if (!canDispatchGameplayPush(runtime, candidate, currentNowMs)) {
      continue;
    }

    try {
      const sent = await dispatchGameplayPush(candidate, currentNowMs);
      if (sent) {
        addLog('system', `Gameplay Push gesendet: ${candidate.type}`, {
          pushType: candidate.type,
          signature: candidate.signature
        });
      }
    } catch (error) {
      addLog('system', `Gameplay Push fehlgeschlagen: ${candidate.type}`, {
        pushType: candidate.type,
        error: error && error.message ? String(error.message) : String(error)
      });
    }
  }
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
  const notifications = getCanonicalNotificationsSettings(state);
  const currentNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
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

function notifyReminder(nowMs) {
  const actions = Array.isArray(state.history && state.history.actions) ? state.history.actions : [];
  const lastActionAtMs = actions.length
    ? Number(actions[actions.length - 1].atRealTimeMs || actions[actions.length - 1].realTime || 0)
    : 0;

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

  postMessageToServiceWorker(payload);
}

async function postJsonStub(url, payload) {
  try {
    const response = await notificationsApiFetch(url, {
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

window.GrowSimNotifications = Object.freeze({
  showServiceWorkerHint,
  schedulePushIfAllowed,
  canNotify,
  notify,
  evaluateNotificationTriggers,
  evaluateGameplayPushDecisions,
  notifyEventAvailability,
  notifyCriticalState,
  notifyReminder,
  notifyPlantNeedsCare,
  postJsonStub,
  base64ToU8,
  openDb,
  dbGet,
  dbSet,
  dbDelete
});
