import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const { startStaticServer, closeBrowser, closeContext, closeServer } = require('../test/support/serverRuntime.js');
const { installAuthHarness, waitForBoot } = require('../test/support/browserRuntime.js');

const ROOT = process.cwd();
let PORT = 0;
const OUT_DIR = path.join(ROOT, 'test-results', 'visual-probes', 'pwa');
const OUT_JSON = path.join(OUT_DIR, 'pwa-runtime-report.json');

async function collectPageState(page) {
  return page.evaluate(async () => {
    const withTimeout = (promise, timeoutMs, fallback) => {
      const timeoutPromise = new Promise((resolve) => window.setTimeout(() => resolve(fallback), timeoutMs));
      return Promise.race([promise, timeoutPromise]);
    };

    const hint = document.getElementById('swHintBanner');
    const hud = document.getElementById('dataVizHud');

    const sw = {
      supported: 'serviceWorker' in navigator,
      controller: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
      ready: { ok: false, hasActive: false, source: 'none' },
      registration: null
    };

    if (sw.supported) {
      const readyState = await withTimeout(
        navigator.serviceWorker.ready
          .then((registration) => ({
            ok: Boolean(registration && registration.active),
            hasActive: Boolean(registration && registration.active),
            source: 'ready'
          }))
          .catch((error) => ({ ok: false, hasActive: false, source: `ready_error:${String(error && error.message ? error.message : error)}` })),
        4500,
        { ok: false, hasActive: false, source: 'ready_timeout' }
      );

      sw.ready = readyState;
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      sw.registration = reg ? {
        installing: Boolean(reg.installing),
        waiting: Boolean(reg.waiting),
        active: Boolean(reg.active)
      } : null;
    }

    return {
      bootOk: Boolean(window.__gsBootOk),
      bootMetrics: window.__gsBootMetrics || null,
      swHintVisible: Boolean(hint && !hint.classList.contains('hidden')),
      hasHud: Boolean(hud),
      sw
    };
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { server, port: resolvedPort } = await startStaticServer(ROOT, '127.0.0.1', PORT, {
    defaultHeaders: {
      'Cache-Control': 'no-store'
    }
  });
  PORT = Number(resolvedPort || 0);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36'
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const response404 = [];
  const requestFailed = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(String(err && err.message ? err.message : err));
  });
  page.on('response', (response) => {
    if (response.status() === 404) {
      response404.push(response.url());
    }
  });
  page.on('requestfailed', (req) => {
    requestFailed.push(`${req.url()} :: ${req.failure() ? req.failure().errorText : 'failed'}`);
  });

  const url = `http://127.0.0.1:${PORT}/`;
  const report = {
    url,
    startedAt: new Date().toISOString(),
    initial: null,
    afterReload: null,
    offlineReload: null,
    consoleErrors,
    pageErrors,
    response404,
    requestFailed
  };

  try {
    await installAuthHarness(page, 'grow-sim-auth-token-v1', {
      id: 'pwa-probe-user',
      email: 'pwa-probe@test.local',
      displayName: 'PWA Probe',
      token: 'pwa-probe-token'
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 25000);
    await page.waitForTimeout(1200);

    report.initial = await collectPageState(page);
    await page.screenshot({ path: path.join(OUT_DIR, 'pwa-probe-initial.png'), fullPage: true });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 25000);
    await page.waitForTimeout(900);
    report.afterReload = await collectPageState(page);
    await page.screenshot({ path: path.join(OUT_DIR, 'pwa-probe-reload.png'), fullPage: true });

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
    report.offlineReload = await collectPageState(page);
    await page.screenshot({ path: path.join(OUT_DIR, 'pwa-probe-offline.png'), fullPage: true });
    await context.setOffline(false);

    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await closeContext(context);
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
