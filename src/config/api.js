export const API_BASE_URL = 'https://api.growsimulator.tech';
export const API_PREFIX = '/api';

export async function apiFetch(path, options = {}) {
  const rawPath = String(path || '');
  let targetUrl;
  if (/^https?:\/\//i.test(rawPath)) {
    const parsed = new URL(rawPath);
    if (parsed.origin === API_BASE_URL && !parsed.pathname.startsWith(`${API_PREFIX}/`) && parsed.pathname !== API_PREFIX) {
      parsed.pathname = `${API_PREFIX}${parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`}`;
    }
    targetUrl = parsed.toString();
  } else {
    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const apiPath = normalizedPath.startsWith(`${API_PREFIX}/`) || normalizedPath === API_PREFIX
      ? normalizedPath
      : `${API_PREFIX}${normalizedPath}`;
    targetUrl = `${API_BASE_URL}${apiPath}`;
  }
  return fetch(targetUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
}

if (typeof window !== 'undefined') {
  window.GrowSimApi = Object.freeze({
    API_BASE_URL,
    API_PREFIX,
    apiFetch
  });
}
