#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.EVENT_V2_HOOK_TRIGGER_SMOKE_PORT || 5173);
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

async function readState(page, label) {
  await settle(page);
  return page.evaluate((label) => {
    const guarded = window.ShadowBridgeGuardedEntry;
    const candidate = window.ShadowBridgeBrowserBridgeCandidate;
    const runFn = window.runEventStateMachine;
    const runSource = typeof runFn === 'function' ? String(runFn) : '';
    const guardedKeys = guarded ? Object.keys(guarded).sort() : [];
    const noopResult = guarded && typeof guarded.runShadowBridgeGuardedEntry === 'function'
      ? guarded.runShadowBridgeGuardedEntry(null, { enabled: false })
      : null;
    const text = document.body && document.body.textContent ? document.body.textContent : '';
    return {
      label,
      title: document.title,
      bodyHasContent: Boolean(text.trim().length > 0),
      bootErrorBannerVisible: Boolean(document.querySelector('[data-boot-error-banner], .boot-error, #boot-error')),
      candidateApiPresent: Boolean(candidate),
      guardedEntryPresent: Boolean(guarded),
      guardedVisibleKeys: guardedKeys,
      guardedVisibleKeysOk: !guarded || JSON.stringify(guardedKeys) === JSON.stringify(['legacyAuthoritative', 'metadata', 'noop', 'runShadowBridgeGuardedEntry']),
      noopResult,
      runEventStateMachineVisible: typeof runFn === 'function',
      runEventStateMachineSourceMentionsState: /\bstate\b/.test(runSource),
      runEventStateMachineSourceMentionsRouteTick: /routeTick\s*\(/.test(runSource),
      runEventStateMachineSourceMentionsCanonicalRuntime: /callCanonicalEventsRuntime\s*\(/.test(runSource),
      storageWriteCount: window.__eventV2HookTriggerStorageWrites || 0,
      runtimeTouched: Boolean(noopResult && noopResult.runtimeTouched),
      saveTouched: Boolean(noopResult && noopResult.saveTouched),
      uiReplaced: Boolean(noopResult && noopResult.uiReplaced),
      eventActivated: Boolean(noopResult && noopResult.eventActivated)
    };
  }, label);
}

function evaluateTriggerSafety(state) {
  if (!state.runEventStateMachineVisible) {
    return {
      safeToTrigger: false,
      decision: 'blocked_trigger_not_safe',
      reason: 'runEventStateMachine_not_visible'
    };
  }
  if (state.runEventStateMachineSourceMentionsState || state.runEventStateMachineSourceMentionsRouteTick || state.runEventStateMachineSourceMentionsCanonicalRuntime) {
    return {
      safeToTrigger: false,
      decision: 'blocked_trigger_not_safe',
      reason: 'direct_call_would_enter_legacy_state_machine_with_state_or_canonical_runtime'
    };
  }
  return {
    safeToTrigger: true,
    decision: 'safe_to_trigger',
    reason: null
  };
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
    window.__eventV2HookTriggerStorageWrites = 0;
    for (const storageName of ['localStorage', 'sessionStorage']) {
      const storage = window[storageName];
      if (!storage) continue;
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = storage[method].bind(storage);
        storage[method] = (...args) => {
          window.__eventV2HookTriggerStorageWrites += 1;
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

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const before = await readState(page, 'beforeTrigger');
  const triggerSafety = evaluateTriggerSafety(before);

  let triggerResult = null;
  let triggered = false;
  if (triggerSafety.safeToTrigger) {
    triggerResult = await page.evaluate(() => {
      try {
        window.runEventStateMachine(0);
        return { ok: true, threw: false };
      } catch (error) {
        return { ok: false, threw: true, message: String(error && error.message || error) };
      }
    });
    triggered = true;
  }

  const after = await readState(page, 'afterTriggerDecision');
  await page.reload({ waitUntil: 'networkidle' });
  const afterReload = await readState(page, 'afterReload');

  await browser.close();
  if (server && serverStarted) server.close();

  const noSideEffects = [before, after, afterReload].every((state) => state.storageWriteCount === 0
    && state.runtimeTouched === false
    && state.saveTouched === false
    && state.uiReplaced === false
    && state.eventActivated === false)
    && pageErrors.length === 0
    && consoleErrors.length === 0;

  const decision = triggered
    ? (noSideEffects && after.guardedEntryPresent ? 'pass_triggered_hook_passive' : 'fail_hook_side_effect_detected')
    : triggerSafety.decision;

  const ok = decision === 'pass_triggered_hook_passive' || decision === 'blocked_trigger_not_safe';

  console.log(JSON.stringify({
    ok,
    decision,
    targetUrl: baseUrl,
    triggerSafety,
    triggered,
    triggerResult,
    before,
    after,
    afterReload,
    candidateLoaded: candidateRequests.length > 0,
    candidateVersioned: candidateRequests.some((url) => url.includes('?v=')),
    candidateRequests,
    pageErrors,
    consoleErrors,
    storage: {
      beforeWrites: before.storageWriteCount,
      afterWrites: after.storageWriteCount,
      afterReloadWrites: afterReload.storageWriteCount,
      v2CausedWrites: Math.max(before.storageWriteCount, after.storageWriteCount, afterReload.storageWriteCount),
      ok: [before, after, afterReload].every((state) => state.storageWriteCount === 0)
    },
    uiEventSafety: {
      noUiReplacement: [before, after, afterReload].every((state) => state.uiReplaced === false),
      noEventActivation: [before, after, afterReload].every((state) => state.eventActivated === false),
      ok: [before, after, afterReload].every((state) => state.uiReplaced === false && state.eventActivated === false)
    },
    legacy: {
      appStarted: before.bodyHasContent === true,
      reloadStillStarts: afterReload.bodyHasContent === true,
      bootErrorBannerVisible: before.bootErrorBannerVisible || after.bootErrorBannerVisible || afterReload.bootErrorBannerVisible,
      pageErrors: pageErrors.length,
      consoleErrors: consoleErrors.length,
      ok: before.bodyHasContent === true && afterReload.bodyHasContent === true && pageErrors.length === 0 && consoleErrors.length === 0
    }
  }, null, 2));

  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
