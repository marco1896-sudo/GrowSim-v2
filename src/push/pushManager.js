'use strict';

(function initGrowSimPushManager(globalScope) {
  const PUSH_STATUS_CODES = Object.freeze({
    UNSUPPORTED: 'unsupported',
    SUPPORTED_BUT_NOT_GRANTED: 'supported_but_not_granted',
    GRANTED_UNSUBSCRIBED: 'granted_unsubscribed',
    GRANTED_SUBSCRIBED: 'granted_subscribed',
    DENIED: 'denied'
  });

  function getApiFetch() {
    if (globalScope.GrowSimApi && typeof globalScope.GrowSimApi.apiFetch === 'function') {
      return globalScope.GrowSimApi.apiFetch;
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

  function getAuthToken() {
    if (!globalScope.GrowSimAuth || typeof globalScope.GrowSimAuth.getToken !== 'function') {
      return '';
    }
    const token = globalScope.GrowSimAuth.getToken();
    return typeof token === 'string' ? token.trim() : '';
  }

  function isAuthenticated() {
    if (!globalScope.GrowSimAuth || typeof globalScope.GrowSimAuth.isAuthenticated !== 'function') {
      return false;
    }
    return Boolean(globalScope.GrowSimAuth.isAuthenticated() && getAuthToken());
  }

  function buildAuthHeaders(extraHeaders = {}) {
    const token = getAuthToken();
    return token
      ? { Authorization: `Bearer ${token}`, ...extraHeaders }
      : { ...extraHeaders };
  }

  async function readJsonSafe(response) {
    if (!response || typeof response.json !== 'function') {
      return null;
    }

    try {
      return await response.json();
    } catch (_error) {
      return null;
    }
  }

  function isPushSupported() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }

    return (
      'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window
    );
  }

  function getNotificationPermissionState() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    const permission = String(globalScope.Notification.permission || 'default');
    if (permission === 'granted' || permission === 'denied') {
      return permission;
    }
    return 'default';
  }

  async function getServiceWorkerRegistration(options = {}) {
    if (!isPushSupported()) {
      return null;
    }

    const waitForReady = options.waitForReady !== false;
    const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 6000;

    try {
      const directRegistration = await navigator.serviceWorker.getRegistration();
      if (directRegistration) {
        return directRegistration;
      }
    } catch (_error) {
      // non-fatal fallback below
    }

    if (!waitForReady) {
      return null;
    }

    let timeoutHandle = null;
    try {
      const readyRegistration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => {
          timeoutHandle = window.setTimeout(() => resolve(null), Math.max(500, timeoutMs));
        })
      ]);
      return readyRegistration || null;
    } catch (_error) {
      return null;
    } finally {
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    }
  }

  async function getExistingPushSubscription(registration = null) {
    if (!isPushSupported()) {
      return null;
    }

    const activeRegistration = registration || await getServiceWorkerRegistration();
    if (!activeRegistration || !activeRegistration.pushManager) {
      return null;
    }

    try {
      return await activeRegistration.pushManager.getSubscription();
    } catch (_error) {
      return null;
    }
  }

  function normalizePublicKey(payload) {
    if (!payload || typeof payload !== 'object') {
      return '';
    }

    const candidates = [
      payload.publicKey,
      payload.vapidPublicKey,
      payload.key,
      payload.data && payload.data.publicKey,
      payload.data && payload.data.vapidPublicKey,
      payload.data && payload.data.key
    ];

    for (const candidate of candidates) {
      const value = typeof candidate === 'string' ? candidate.trim() : '';
      if (value) {
        return value;
      }
    }

    return '';
  }

  async function fetchPushPublicKey() {
    const apiFetch = getApiFetch();
    const response = await apiFetch('/push/public-key', {
      method: 'GET'
    });
    const payload = await readJsonSafe(response);

    if (!response.ok) {
      const message = payload && typeof payload.error === 'string'
        ? payload.error
        : `HTTP ${response.status}`;
      throw new Error(message);
    }

    const key = normalizePublicKey(payload);
    if (!key) {
      throw new Error('Missing push public key in backend response');
    }

    return key;
  }

  function urlBase64ToUint8Array(base64String) {
    const value = String(base64String || '').trim();
    if (!value) {
      return new Uint8Array(0);
    }

    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const normalized = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(normalized);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  async function requestPushPermission() {
    if (!isPushSupported()) {
      return 'unsupported';
    }

    const permission = getNotificationPermissionState();
    if (permission === 'granted' || permission === 'denied') {
      return permission;
    }

    try {
      const result = await globalScope.Notification.requestPermission();
      return String(result || getNotificationPermissionState() || 'default');
    } catch (_error) {
      return getNotificationPermissionState();
    }
  }

  async function postSubscribeToBackend(subscription) {
    if (!isAuthenticated()) {
      throw new Error('Authentication required');
    }

    const apiFetch = getApiFetch();
    const response = await apiFetch('/push/subscribe', {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ subscription })
    });
    const payload = await readJsonSafe(response);

    if (!response.ok) {
      const message = payload && typeof payload.error === 'string'
        ? payload.error
        : `HTTP ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }

  async function postUnsubscribeToBackend(subscription) {
    if (!isAuthenticated()) {
      return null;
    }

    const endpoint = subscription && typeof subscription.endpoint === 'string' ? subscription.endpoint : '';
    if (!endpoint) {
      return null;
    }

    const apiFetch = getApiFetch();
    const response = await apiFetch('/push/unsubscribe', {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({
        endpoint,
        subscription
      })
    });

    if (!response.ok) {
      const payload = await readJsonSafe(response);
      const message = payload && typeof payload.error === 'string'
        ? payload.error
        : `HTTP ${response.status}`;
      throw new Error(message);
    }

    return true;
  }

  async function subscribeToPush(options = {}) {
    if (!isPushSupported()) {
      throw new Error('Push not supported');
    }
    if (!isAuthenticated()) {
      throw new Error('Authentication required');
    }

    const registration = await getServiceWorkerRegistration({
      waitForReady: true,
      timeoutMs: options.timeoutMs
    });
    if (!registration) {
      throw new Error('Service worker registration unavailable');
    }

    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      throw new Error(permission === 'denied' ? 'Notification permission denied' : 'Notification permission not granted');
    }

    const existing = await getExistingPushSubscription(registration);
    if (existing) {
      await postSubscribeToBackend(existing.toJSON ? existing.toJSON() : existing);
      return {
        subscription: existing,
        reused: true
      };
    }

    const publicKey = typeof options.publicKey === 'string' && options.publicKey.trim()
      ? options.publicKey.trim()
      : await fetchPushPublicKey();

    const created = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await postSubscribeToBackend(created.toJSON ? created.toJSON() : created);
    return {
      subscription: created,
      reused: false
    };
  }

  async function unsubscribeFromPush(options = {}) {
    if (!isPushSupported()) {
      return {
        unsubscribed: false,
        reason: 'unsupported'
      };
    }

    const registration = await getServiceWorkerRegistration({
      waitForReady: false,
      timeoutMs: options.timeoutMs
    });
    const existing = await getExistingPushSubscription(registration);

    if (!existing) {
      return {
        unsubscribed: false,
        reason: 'not_subscribed'
      };
    }

    const serialized = existing.toJSON ? existing.toJSON() : existing;
    if (isAuthenticated()) {
      await postUnsubscribeToBackend(serialized);
    }

    let unsubscribed = false;
    try {
      unsubscribed = await existing.unsubscribe();
    } catch (_error) {
      unsubscribed = false;
    }

    return {
      unsubscribed: Boolean(unsubscribed),
      endpoint: existing.endpoint || ''
    };
  }

  async function syncExistingSubscriptionWithBackend(options = {}) {
    if (!isPushSupported()) {
      return {
        synced: false,
        reason: 'unsupported'
      };
    }

    if (!isAuthenticated()) {
      return {
        synced: false,
        reason: 'not_authenticated'
      };
    }

    const permission = getNotificationPermissionState();
    if (permission !== 'granted') {
      return {
        synced: false,
        reason: permission === 'denied' ? 'denied' : 'not_granted'
      };
    }

    const registration = await getServiceWorkerRegistration({
      waitForReady: true,
      timeoutMs: options.timeoutMs
    });
    const existing = await getExistingPushSubscription(registration);
    if (!existing) {
      return {
        synced: false,
        reason: 'not_subscribed'
      };
    }

    await postSubscribeToBackend(existing.toJSON ? existing.toJSON() : existing);
    return {
      synced: true,
      subscription: existing
    };
  }

  async function sendTestPush(payload = {}) {
    if (!isAuthenticated()) {
      throw new Error('Authentication required');
    }

    const apiFetch = getApiFetch();
    const response = await apiFetch('/push/test', {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(payload && typeof payload === 'object' ? payload : {})
    });
    const parsed = await readJsonSafe(response);

    if (!response.ok) {
      const message = parsed && typeof parsed.error === 'string'
        ? parsed.error
        : `HTTP ${response.status}`;
      throw new Error(message);
    }

    return parsed;
  }

  async function getPushStatus(options = {}) {
    const supported = isPushSupported();
    if (!supported) {
      return {
        supported: false,
        permission: 'unsupported',
        subscription: null,
        status: PUSH_STATUS_CODES.UNSUPPORTED
      };
    }

    const permission = getNotificationPermissionState();
    if (permission === 'denied') {
      return {
        supported: true,
        permission,
        subscription: null,
        status: PUSH_STATUS_CODES.DENIED
      };
    }

    if (permission !== 'granted') {
      return {
        supported: true,
        permission,
        subscription: null,
        status: PUSH_STATUS_CODES.SUPPORTED_BUT_NOT_GRANTED
      };
    }

    const registration = options.registration || await getServiceWorkerRegistration({
      waitForReady: options.waitForReady !== false,
      timeoutMs: options.timeoutMs
    });
    const subscription = await getExistingPushSubscription(registration);

    return {
      supported: true,
      permission,
      subscription,
      status: subscription
        ? PUSH_STATUS_CODES.GRANTED_SUBSCRIBED
        : PUSH_STATUS_CODES.GRANTED_UNSUBSCRIBED
    };
  }

  globalScope.GrowSimPushManager = Object.freeze({
    PUSH_STATUS_CODES,
    isPushSupported,
    getNotificationPermissionState,
    getServiceWorkerRegistration,
    getExistingPushSubscription,
    fetchPushPublicKey,
    urlBase64ToUint8Array,
    requestPushPermission,
    subscribeToPush,
    unsubscribeFromPush,
    syncExistingSubscriptionWithBackend,
    sendTestPush,
    getPushStatus,
    isAuthenticated
  });
})(typeof window !== 'undefined' ? window : globalThis);
