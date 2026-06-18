#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeServer } = require('./support/serverRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const VIEWPORT = { width: 430, height: 932 };

async function installSignedOutApiMocks(page) {
  await page.route('https://api.growsimulator.tech/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/auth/me' || url.pathname === '/api/save') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
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

async function collectBootSnapshot(page) {
  return page.evaluate(async () => {
    const cacheKeys = 'caches' in window ? await caches.keys() : [];
    const cacheCounts = {};
    for (const key of cacheKeys) {
      const cache = await caches.open(key);
      cacheCounts[key] = (await cache.keys()).length;
    }

    const registrations = 'serviceWorker' in navigator
      ? await navigator.serviceWorker.getRegistrations()
      : [];

    return {
      bootOk: window.__gsBootOk === true,
      bootState: window.__gsBootState || null,
      bootTraceTail: Array.isArray(window.__gsBootTrace) ? window.__gsBootTrace.slice(-10) : [],
      hasScriptBanner: Boolean(document.getElementById('scriptBootErrorBanner')),
      scriptBannerText: document.getElementById('scriptBootErrorBanner')?.textContent.replace(/\s+/g, ' ').trim() || '',
      controllerUrl: navigator.serviceWorker?.controller?.scriptURL || '',
      registrations: registrations.map((registration) => ({
        scope: registration.scope,
        active: registration.active?.scriptURL || '',
        waiting: registration.waiting?.scriptURL || '',
        installing: registration.installing?.scriptURL || ''
      })),
      cacheKeys,
      cacheCounts
    };
  });
}

async function waitForBootReady(page, timeoutMs = 20000) {
  await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: timeoutMs });
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'growsim-offline-reopen-'));
  let onlineContext = null;
  let offlineContext = null;

  try {
    onlineContext = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: VIEWPORT
    });
    const onlinePage = onlineContext.pages()[0] || await onlineContext.newPage();
    await installSignedOutApiMocks(onlinePage);
    await onlinePage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await waitForBootReady(onlinePage);

    const onlineSnapshot = await collectBootSnapshot(onlinePage);
    assert.strictEqual(onlineSnapshot.bootOk, true, 'online boot should complete before offline reopen');
    assert(onlineSnapshot.controllerUrl.includes('/sw.js?v='), 'service worker should control the online session');
    assert(
      onlineSnapshot.cacheKeys.some((key) => key.startsWith('growsim-shell-')),
      'online session should populate the shell cache'
    );

    await onlineContext.close();
    onlineContext = null;

    offlineContext = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: VIEWPORT,
      offline: true
    });
    const offlinePage = offlineContext.pages()[0] || await offlineContext.newPage();
    await offlinePage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await waitForBootReady(offlinePage);

    const offlineSnapshot = await collectBootSnapshot(offlinePage);
    assert.strictEqual(offlineSnapshot.bootOk, true, 'offline reopen should still complete the app boot');
    assert.strictEqual(offlineSnapshot.hasScriptBanner, false, 'offline reopen should not show a script loader failure banner');
    assert(offlineSnapshot.controllerUrl.includes('/sw.js?v='), 'offline reopen should stay under service worker control');
    assert(
      offlineSnapshot.cacheKeys.some((key) => key.startsWith('growsim-shell-')),
      'offline reopen should retain the shell cache'
    );
    assert(
      offlineSnapshot.cacheKeys.some((key) => key.startsWith('growsim-runtime-')),
      'offline reopen should retain the runtime cache'
    );
    assert.strictEqual(
      offlineSnapshot.bootState && offlineSnapshot.bootState.step,
      'ready',
      `offline reopen should end at ready, got ${JSON.stringify(offlineSnapshot.bootState)}`
    );

    console.log('offline reopen service worker boot test passed');
  } finally {
    if (offlineContext) {
      await offlineContext.close();
    }
    if (onlineContext) {
      await onlineContext.close();
    }
    await closeServer(server);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
