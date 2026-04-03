const SW_BUILD_ID = (() => {
  try {
    const scriptUrl = new URL(self.location.href);
    const byQuery = scriptUrl.searchParams.get('v');
    if (byQuery) {
      return String(byQuery);
    }
  } catch (_error) {
    // non-fatal
  }
  return 'dev';
})();
const SW_VERSION = `build-${SW_BUILD_ID}`;
const CACHE_PREFIX = 'growsim';
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${SW_VERSION}`;
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');

function appPath(relativePath) {
  const normalized = String(relativePath || '').replace(/^\//, '');
  return `${BASE_PATH}/${normalized}`.replace(/\/\/+/g, '/');
}

const OFFLINE_FALLBACK_URL = appPath('index.html');
const PRECACHE_URLS = [
  OFFLINE_FALLBACK_URL,
  appPath('manifest.webmanifest'),
  appPath('icons/icon-192.png'),
  appPath('icons/icon-512.png')
];

const CORE_DATA_PATHS = new Set([
  appPath('data/events.json'),
  appPath('data/events.v2.json'),
  appPath('data/actions.json')
]);

function isApiOrAuthPath(pathname) {
  return pathname.startsWith(appPath('api/'))
    || pathname.startsWith(appPath('auth/'))
    || pathname.startsWith(appPath('session/'));
}

function isLongLivedAssetRequest(request, pathname) {
  const destination = String(request.destination || '').toLowerCase();
  if (destination === 'image' || destination === 'font' || destination === 'audio' || destination === 'video') {
    return true;
  }

  if (pathname.startsWith(appPath('assets/')) || pathname.startsWith(appPath('icons/'))) {
    return !/\.(?:js|mjs|css|html?)$/i.test(pathname);
  }

  return false;
}

function canCacheResponse(request, response, url) {
  if (!response || !response.ok) {
    return false;
  }

  if (isApiOrAuthPath(url.pathname)) {
    return false;
  }

  const cacheControl = String(response.headers.get('cache-control') || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }

  const acceptHeader = String(request.headers.get('accept') || '').toLowerCase();
  if (acceptHeader.includes('application/json') && !CORE_DATA_PATHS.has(url.pathname)) {
    return false;
  }

  return true;
}

async function cachePreloadFiles(cache, files) {
  const uniqueFiles = Array.from(new Set((Array.isArray(files) ? files : []).filter(Boolean)));
  const failed = [];

  await Promise.all(uniqueFiles.map(async (filePath) => {
    try {
      await cache.add(filePath);
    } catch (error) {
      failed.push({
        filePath,
        message: error && error.message ? error.message : String(error)
      });
    }
  }));

  if (failed.length) {
    console.warn('[sw] precache completed with misses', failed);
  }
}

self.addEventListener('install', (event) => {
  console.info('[sw] install', SW_VERSION);
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cachePreloadFiles(cache, PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  console.info('[sw] activate', SW_VERSION);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(`${CACHE_PREFIX}-`) && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isApiOrAuthPath(url.pathname)) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(event.request));
    return;
  }

  if (CORE_DATA_PATHS.has(url.pathname)) {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
    return;
  }

  if (isLongLivedAssetRequest(event.request, url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const updatePromise = fetch(request)
    .then((fresh) => {
      const requestUrl = new URL(request.url);
      if (canCacheResponse(request, fresh, requestUrl)) {
        cache.put(request, fresh.clone());
      }
      return fresh;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const fresh = await updatePromise;
  return fresh || Response.error();
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    const requestUrl = new URL(request.url);
    if (canCacheResponse(request, fresh, requestUrl)) {
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (_error) {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

async function navigationNetworkFirst(request) {
  const shellCache = await caches.open(SHELL_CACHE);
  try {
    const networkRequest = new Request(request, { cache: 'no-store' });
    const fresh = await fetch(networkRequest);
    if (fresh && fresh.ok) {
      await shellCache.put(OFFLINE_FALLBACK_URL, fresh.clone());
    }
    return fresh;
  } catch (_error) {
    const cachedRoute = await shellCache.match(request);
    if (cachedRoute) {
      return cachedRoute;
    }
    const offlineFallback = await shellCache.match(OFFLINE_FALLBACK_URL);
    return offlineFallback || Response.error();
  }
}

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Grow Simulator',
    body: 'Ein neues Ereignis wartet.',
    eventId: 'unknown'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed
      };
    } catch (_error) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: appPath('icons/icon-192.png'),
      badge: appPath('icons/icon-192.png'),
      data: {
        url: `${appPath('')}#event=${encodeURIComponent(payload.eventId || 'unknown')}`
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || appPath('');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event && event.data ? event.data : null;
  if (!data) {
    return;
  }

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type !== 'GS_SHOW_NOTIFICATION' && data.type !== 'SHOW_NOTIFICATION') {
    return;
  }

  const title = data.title || 'GrowSim';
  const options = data.options && typeof data.options === 'object' ? data.options : {};
  event.waitUntil(self.registration.showNotification(title, options));
});
