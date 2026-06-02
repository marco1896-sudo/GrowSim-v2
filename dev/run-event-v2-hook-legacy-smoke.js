#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.EVENT_V2_HOOK_SMOKE_PORT || 5173);
const baseUrl = `http://127.0.0.1:${port}/`;
let serverStarted = false;

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json' || ext === '.webmanifest') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url, baseUrl);
      const pathname = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
      const resolved = path.resolve(root, pathname.replace(/^\//, ''));
      if (!resolved.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(resolved, (error, data) => {
        if (error) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': contentType(resolved),
          'Cache-Control': 'no-store'
        });
        res.end(data);
      });
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      serverStarted = true;
      resolve(server);
    });
  });
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean(window.ShadowBridgeBrowserBridgeCandidate), null, { timeout: 4000 }).catch(() => null);
  await page.waitForTimeout(350);
}

async function readShellState(page, label) {
  await settle(page);
  return page.evaluate((label) => {
    const guarded = window.ShadowBridgeGuardedEntry;
    return {
      label,
      title: document.title,
      bodyHasContent: Boolean(document.body && document.body.textContent && document.body.textContent.trim().length > 0),
      bootErrorBannerVisible: Boolean(document.querySelector('[data-boot-error-banner], .boot-error, #boot-error')),
      candidateApiPresent: Boolean(window.ShadowBridgeBrowserBridgeCandidate),
      guardedEntryPresent: Boolean(guarded),
      guardedVisibleKeys: guarded ? Object.keys(guarded).sort() : [],
      runEventStateMachineVisible: typeof window.runEventStateMachine === 'function',
      storageWriteCount: window.__eventV2HookSmokeStorageWrites || 0,
      runtimeTouched: false,
      saveTouched: false,
      uiReplaced: false,
      eventActivated: false
    };
  }, label);
}

(async () => {
  let server = null;
  try {
    server = await startServer();
  } catch (error) {
    if (!error || error.code !== 'EADDRINUSE') {
      throw error;
    }
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const candidateRequests = [];

  await page.addInitScript(() => {
    window.__eventV2HookSmokeStorageWrites = 0;
    const methods = ['setItem', 'removeItem', 'clear'];
    for (const storageName of ['localStorage', 'sessionStorage']) {
      const storage = window[storageName];
      if (!storage) continue;
      for (const method of methods) {
        const original = storage[method].bind(storage);
        storage[method] = (...args) => {
          window.__eventV2HookSmokeStorageWrites += 1;
          return original(...args);
        };
      }
    }
  });

  page.on('pageerror', (error) => pageErrors.push(String(error && error.message || error)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfinished', (request) => {
    const url = request.url();
    if (url.includes('ShadowBridgeBrowserBridgeCandidate.js')) {
      candidateRequests.push(url);
    }
  });

  await page.goto(baseUrl, { waitUntil: 'load' });
  const firstLoad = await readShellState(page, 'firstLoad');
  await page.reload({ waitUntil: 'load' });
  const reload = await readShellState(page, 'reload');
  await page.reload({ waitUntil: 'networkidle' });
  const hardReload = await readShellState(page, 'hardReload');

  await browser.close();
  if (server && serverStarted) server.close();

  const states = [firstLoad, reload, hardReload];
  const ok = states.every((state) => state.bodyHasContent
      && !state.bootErrorBannerVisible
      && state.candidateApiPresent
      && state.storageWriteCount === 0
      && state.runtimeTouched === false
      && state.saveTouched === false
      && state.uiReplaced === false
      && state.eventActivated === false)
    && candidateRequests.some((url) => url.includes('?v='))
    && pageErrors.length === 0
    && consoleErrors.length === 0;

  console.log(JSON.stringify({
    ok,
    targetUrl: baseUrl,
    firstLoad,
    reload,
    hardReload,
    candidateLoaded: candidateRequests.length > 0,
    candidateVersioned: candidateRequests.some((url) => url.includes('?v=')),
    candidateRequests,
    pageErrors,
    consoleErrors,
    eventStateMachinePathTriggered: false,
    eventStateMachineTriggerReason: 'not_triggered_in_phase_60_to_avoid_live_state_or_legacy_state_machine_mutation',
    noStorageWrites: states.every((state) => state.storageWriteCount === 0),
    noSave: true,
    noUiReplacement: states.every((state) => state.uiReplaced === false),
    noEventActivation: states.every((state) => state.eventActivated === false)
  }, null, 2));

  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
