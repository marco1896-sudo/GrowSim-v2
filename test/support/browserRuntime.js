'use strict';

const DEFAULT_AUTH_USER = Object.freeze({
  id: 'test-user',
  email: 'test@example.local',
  displayName: 'GrowSim Test'
});

async function installAuthHarness(page, tokenKey, profileOverrides = {}) {
  const authUser = {
    ...DEFAULT_AUTH_USER,
    ...(profileOverrides && typeof profileOverrides === 'object' ? profileOverrides : {})
  };
  const authToken = typeof profileOverrides.token === 'string' && profileOverrides.token.trim()
    ? profileOverrides.token.trim()
    : 'test-auth-token';

  await page.addInitScript(({ key, token }) => {
    localStorage.setItem(key, token);
  }, {
    key: tokenKey,
    token: authToken
  });

  await page.route('https://api.growsimulator.tech/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: authUser })
      });
      return;
    }

    if (url.pathname === '/api/save') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: request.method() === 'GET'
          ? JSON.stringify({ save: null })
          : JSON.stringify({ ok: true })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unhandled test route' })
    });
  });
}

async function waitForBoot(page, timeoutMs = 15000) {
  await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: timeoutMs });
}

async function advanceOnboardingToStart(page, options = {}) {
  const maxSteps = Number.isFinite(Number(options.maxSteps)) ? Number(options.maxSteps) : 8;

  for (let index = 0; index < maxSteps; index += 1) {
    const startVisible = await page.locator('#startRunBtn').evaluate((node) => (
      !node.classList.contains('hidden')
      && node.getAttribute('aria-hidden') !== 'true'
      && !node.disabled
    ));
    if (startVisible) {
      return;
    }

    const nextVisible = await page.locator('#setupNextBtn').evaluate((node) => (
      !node.classList.contains('hidden')
      && node.getAttribute('aria-hidden') !== 'true'
      && !node.disabled
    ));
    if (!nextVisible) {
      break;
    }

    await page.click('#setupNextBtn');
  }

  await page.waitForFunction(() => {
    const startButton = document.getElementById('startRunBtn');
    return Boolean(
      startButton
      && !startButton.classList.contains('hidden')
      && startButton.getAttribute('aria-hidden') !== 'true'
      && !startButton.disabled
    );
  }, null, { timeout: 5000 });
}

async function clearClientStorage(page, options = {}) {
  const preserveKeys = Array.isArray(options.preserveLocalStorageKeys)
    ? options.preserveLocalStorageKeys.map((key) => String(key))
    : [];
  const indexedDbName = typeof options.indexedDbName === 'string' && options.indexedDbName.trim()
    ? options.indexedDbName.trim()
    : 'grow-sim-db';

  await page.evaluate(async ({ preserve, dbName }) => {
    const preservedValues = {};
    for (const key of preserve) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        preservedValues[key] = value;
      }
    }

    localStorage.clear();
    for (const [key, value] of Object.entries(preservedValues)) {
      localStorage.setItem(key, value);
    }
    sessionStorage.clear();

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('indexedDB' in window) {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onerror = request.onsuccess = request.onblocked = () => resolve();
      });
    }
  }, {
    preserve: preserveKeys,
    dbName: indexedDbName
  });
}

module.exports = {
  advanceOnboardingToStart,
  clearClientStorage,
  installAuthHarness,
  waitForBoot
};
