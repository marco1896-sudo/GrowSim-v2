'use strict';

const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';
const authState = {
  token: null,
  user: null
};

function getApiFetch() {
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

function getToken() {
  return authState.token;
}

function getUser() {
  return authState.user ? { ...authState.user } : null;
}

function isAuthenticated() {
  return Boolean(authState.token);
}

function setToken(token) {
  const normalized = typeof token === 'string' ? token.trim() : '';
  authState.token = normalized || null;
}

function setUser(user) {
  authState.user = user && typeof user === 'object' ? { ...user } : null;
}

function clearTokenStorage() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (_error) {
    // non-fatal
  }
}

function persistToken(token) {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (_error) {
    // non-fatal
  }
}

function getAuthHeaders() {
  if (!authState.token) {
    return {};
  }

  return {
    Authorization: `Bearer ${authState.token}`
  };
}

function parseAuthResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return { token: null, user: null };
  }

  const token = typeof payload.token === 'string' ? payload.token.trim() : '';
  const user = payload.user && typeof payload.user === 'object' ? payload.user : null;

  return {
    token: token || null,
    user
  };
}

async function readJsonOrNull(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

async function login(email, password) {
  const apiFetch = getApiFetch();
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const payload = await readJsonOrNull(response);
  if (!response.ok) {
    const message = payload && typeof payload.error === 'string'
      ? payload.error
      : `HTTP ${response.status}`;
    console.info('[auth] login failed');
    throw new Error(message);
  }

  const parsed = parseAuthResponse(payload);
  if (!parsed.token) {
    throw new Error('Missing token in login response');
  }

  setToken(parsed.token);
  setUser(parsed.user);
  persistToken(parsed.token);
  console.info('[auth] login success');
  return getUser();
}

async function register(email, password) {
  const apiFetch = getApiFetch();
  const response = await apiFetch('/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const payload = await readJsonOrNull(response);
  if (!response.ok) {
    const message = payload && typeof payload.error === 'string'
      ? payload.error
      : `HTTP ${response.status}`;
    console.info('[auth] register failed');
    throw new Error(message);
  }

  const parsed = parseAuthResponse(payload);
  if (!parsed.token) {
    throw new Error('Missing token in register response');
  }

  setToken(parsed.token);
  setUser(parsed.user);
  persistToken(parsed.token);
  console.info('[auth] register success');
  return getUser();
}

async function fetchCurrentUser() {
  if (!authState.token) {
    return null;
  }

  const apiFetch = getApiFetch();
  const response = await apiFetch('/auth/me', {
    method: 'GET',
    headers: {
      ...getAuthHeaders()
    }
  });

  const payload = await readJsonOrNull(response);
  if (!response.ok) {
    const message = payload && typeof payload.error === 'string'
      ? payload.error
      : `HTTP ${response.status}`;
    throw new Error(message);
  }

  const user = payload && payload.user && typeof payload.user === 'object'
    ? payload.user
    : null;
  setUser(user);
  return getUser();
}

async function restoreSession() {
  let token = null;
  try {
    token = localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (_error) {
    token = null;
  }

  if (!token) {
    setToken(null);
    setUser(null);
    console.info('[auth] token restore fallback');
    return null;
  }

  setToken(token);
  try {
    const user = await fetchCurrentUser();
    console.info('[auth] token restore success');
    return user;
  } catch (_error) {
    setToken(null);
    setUser(null);
    clearTokenStorage();
    console.info('[auth] token restore fallback');
    return null;
  }
}

function logout() {
  setToken(null);
  setUser(null);
  clearTokenStorage();
  console.info('[auth] logout');
}

window.GrowSimAuth = Object.freeze({
  login,
  register,
  logout,
  restoreSession,
  fetchCurrentUser,
  getToken,
  getUser,
  isAuthenticated
});
