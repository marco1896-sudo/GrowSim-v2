#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.EVENT_V2_ISOLATED_HOOK_HARNESS_PORT || 5173);
const baseUrl = `http://127.0.0.1:${port}/`;
let serverStarted = false;

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function findFunctionBody(source, functionName) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const open = source.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

function runStaticPart() {
  const appPath = path.join(root, 'app.js');
  const indexPath = path.join(root, 'index.html');
  const appJs = read(appPath);
  const indexHtml = read(indexPath);
  const helperBody = findFunctionBody(appJs, 'runEventV2ShadowBridgeBrowserNoopPreflight') || '';
  const runBody = findFunctionBody(appJs, 'runEventStateMachine') || '';

  const callLineCount = countMatches(appJs, /^\s*runEventV2ShadowBridgeBrowserNoopPreflight\(\);\s*$/gm);
  const helperDefinitionCount = countMatches(appJs, /function\s+runEventV2ShadowBridgeBrowserNoopPreflight\s*\(/g);
  const candidateScriptCount = countMatches(indexHtml, /src\/events\/v2\/shadow-bridge\/ShadowBridgeBrowserBridgeCandidate\.js/g);

  const helperHas = {
    candidateLookup: /window\.ShadowBridgeBrowserBridgeCandidate/.test(helperBody),
    explicitRegistration: /registerShadowBridgeBrowserBridgeCandidate\s*\(\s*window\s*,\s*\{[\s\S]*enabled\s*:\s*true[\s\S]*allowGlobalRegistration\s*:\s*true[\s\S]*\}\s*\)/.test(helperBody),
    guardedEntryLookup: /window\.ShadowBridgeGuardedEntry/.test(helperBody),
    noopCall: /runShadowBridgeGuardedEntry\s*\(\s*null\s*,\s*\{\s*enabled\s*:\s*false\s*\}\s*\)/.test(helperBody),
    tryCatch: /try\s*\{[\s\S]*catch\s*\(/.test(helperBody)
  };

  const forbidden = {
    stateToken: /\bstate\b/.test(helperBody),
    nowMsToken: /\bnowMs\b/.test(helperBody),
    snapshotToken: /snapshot|createShadowBridgeSnapshot|allowSnapshot/i.test(helperBody),
    saveOrStorageToken: /localStorage|sessionStorage|indexedDB|saveGame|saveState|persist|storage/i.test(helperBody),
    uiDomToken: /document\.|querySelector|getElementById|classList|innerHTML|replaceChildren|appendChild|render/i.test(helperBody),
    eventActivationToken: /activateEvent|eventActivated\s*:\s*true|triggerEvent|startEvent/i.test(helperBody),
    consoleToken: /console\./.test(helperBody)
  };

  const returnUsage = {
    assigned: /=\s*runEventV2ShadowBridgeBrowserNoopPreflight\s*\(/.test(appJs),
    returned: /return\s+runEventV2ShadowBridgeBrowserNoopPreflight\s*\(/.test(appJs),
    conditional: /if\s*\(\s*runEventV2ShadowBridgeBrowserNoopPreflight\s*\(/.test(appJs)
  };

  const legacyPath = {
    routeTickStillPresent: /eventEngine\.routeTick\s*\(\s*nowMs\s*,\s*state\s*\)\.result/.test(runBody),
    canonicalFallbackStillPresent: /callCanonicalEventsRuntime\s*\(\s*'runEventStateMachine'\s*,\s*nowMs\s*\)/.test(runBody),
    hookCallBeforeLegacy: runBody.indexOf('runEventV2ShadowBridgeBrowserNoopPreflight();') >= 0
      && runBody.indexOf('runEventV2ShadowBridgeBrowserNoopPreflight();') < runBody.indexOf('const eventEngine')
  };

  const ok = callLineCount === 1
    && helperDefinitionCount === 1
    && candidateScriptCount === 1
    && Object.values(helperHas).every(Boolean)
    && Object.values(forbidden).every((value) => value === false)
    && Object.values(returnUsage).every((value) => value === false)
    && Object.values(legacyPath).every(Boolean);

  return {
    ok,
    callLineCount,
    helperDefinitionCount,
    candidateScriptCount,
    helperHas,
    forbidden,
    returnUsage,
    legacyPath,
    labels: {
      runtimePathNotTriggered: true,
      fullRuntimeTickNotClaimed: true
    }
  };
}

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

async function runBrowserApiPart() {
  let server = null;
  try {
    server = await startServer();
  } catch (error) {
    if (!error || error.code !== 'EADDRINUSE') throw error;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const candidateRequests = [];

  await page.addInitScript(() => {
    window.__eventV2IsolatedHookStorageWrites = 0;
    for (const storageName of ['localStorage', 'sessionStorage']) {
      const storage = window[storageName];
      if (!storage) continue;
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = storage[method].bind(storage);
        storage[method] = (...args) => {
          window.__eventV2IsolatedHookStorageWrites += 1;
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
    if (url.includes('ShadowBridgeBrowserBridgeCandidate.js')) candidateRequests.push(url);
  });

  await page.goto(baseUrl, { waitUntil: 'load' });
  await settle(page);

  const before = await page.evaluate(() => ({
    title: document.title,
    bodyHasContent: Boolean(document.body && document.body.textContent && document.body.textContent.trim().length > 0),
    bootErrorBannerVisible: Boolean(document.querySelector('[data-boot-error-banner], .boot-error, #boot-error')),
    candidateApiPresent: Boolean(window.ShadowBridgeBrowserBridgeCandidate),
    guardedEntryPresent: Boolean(window.ShadowBridgeGuardedEntry),
    runEventStateMachineVisible: typeof window.runEventStateMachine === 'function',
    storageWriteCount: window.__eventV2IsolatedHookStorageWrites || 0
  }));

  const registration = await page.evaluate(() => {
    const api = window.ShadowBridgeBrowserBridgeCandidate;
    if (!api || typeof api.registerShadowBridgeBrowserBridgeCandidate !== 'function') {
      return { ok: false, abortReason: 'candidate_api_missing' };
    }
    return api.registerShadowBridgeBrowserBridgeCandidate(window, {
      enabled: true,
      allowGlobalRegistration: true
    });
  });

  const afterRegistration = await page.evaluate(() => {
    const bridge = window.ShadowBridgeGuardedEntry;
    const visibleKeys = bridge ? Object.keys(bridge).sort() : [];
    const noopCall = bridge && typeof bridge.runShadowBridgeGuardedEntry === 'function'
      ? bridge.runShadowBridgeGuardedEntry(null, { enabled: false })
      : null;
    const negativeCall = bridge && typeof bridge.runShadowBridgeGuardedEntry === 'function'
      ? bridge.runShadowBridgeGuardedEntry(null, { enabled: true })
      : null;
    return {
      guardedEntryPresent: Boolean(bridge),
      visibleKeys,
      visibleKeysOk: JSON.stringify(visibleKeys) === JSON.stringify(['legacyAuthoritative', 'metadata', 'noop', 'runShadowBridgeGuardedEntry']),
      noopCall,
      noopOk: Boolean(noopCall && noopCall.ok === true && noopCall.safeToProceed === true && noopCall.snapshot === null && noopCall.runtimeTouched === false && noopCall.saveTouched === false && noopCall.uiReplaced === false && noopCall.eventActivated === false && noopCall.noop === true && noopCall.legacyAuthoritative === true),
      negativeCall,
      negativeOk: Boolean(negativeCall && negativeCall.ok === false && negativeCall.safeToProceed === false && negativeCall.abortReason === 'guarded_entry_snapshot_not_allowed'),
      storageWriteCount: window.__eventV2IsolatedHookStorageWrites || 0
    };
  });

  const unregister = await page.evaluate(() => {
    const api = window.ShadowBridgeBrowserBridgeCandidate;
    if (!api || typeof api.unregisterShadowBridgeBrowserBridgeCandidate !== 'function') {
      return { ok: false, abortReason: 'candidate_unregister_api_missing' };
    }
    return api.unregisterShadowBridgeBrowserBridgeCandidate(window);
  });

  const afterUnregister = await page.evaluate(() => ({
    guardedEntryPresent: Boolean(window.ShadowBridgeGuardedEntry),
    storageWriteCount: window.__eventV2IsolatedHookStorageWrites || 0
  }));

  await page.reload({ waitUntil: 'networkidle' });
  await settle(page);
  const afterReload = await page.evaluate(() => ({
    title: document.title,
    bodyHasContent: Boolean(document.body && document.body.textContent && document.body.textContent.trim().length > 0),
    bootErrorBannerVisible: Boolean(document.querySelector('[data-boot-error-banner], .boot-error, #boot-error')),
    candidateApiPresent: Boolean(window.ShadowBridgeBrowserBridgeCandidate),
    guardedEntryPresent: Boolean(window.ShadowBridgeGuardedEntry),
    storageWriteCount: window.__eventV2IsolatedHookStorageWrites || 0
  }));

  await browser.close();
  if (server && serverStarted) server.close();

  const storageWrites = Math.max(
    before.storageWriteCount || 0,
    afterRegistration.storageWriteCount || 0,
    afterUnregister.storageWriteCount || 0,
    afterReload.storageWriteCount || 0
  );

  const ok = before.bodyHasContent === true
    && before.bootErrorBannerVisible === false
    && before.candidateApiPresent === true
    && before.guardedEntryPresent === false
    && registration.ok === true
    && afterRegistration.guardedEntryPresent === true
    && afterRegistration.visibleKeysOk === true
    && afterRegistration.noopOk === true
    && afterRegistration.negativeOk === true
    && unregister.ok === true
    && afterUnregister.guardedEntryPresent === false
    && afterReload.bodyHasContent === true
    && afterReload.bootErrorBannerVisible === false
    && storageWrites === 0
    && pageErrors.length === 0
    && consoleErrors.length === 0;

  return {
    ok,
    targetUrl: baseUrl,
    before,
    registration,
    afterRegistration,
    unregister,
    afterUnregister,
    afterReload,
    candidateLoaded: candidateRequests.length > 0,
    candidateVersioned: candidateRequests.some((url) => url.includes('?v=')),
    candidateRequests,
    pageErrors,
    consoleErrors,
    storage: {
      writes: storageWrites,
      ok: storageWrites === 0
    },
    uiEventSafety: {
      noUiReplacement: true,
      noEventActivation: true,
      ok: true
    },
    labels: {
      runtimePathNotTriggered: true,
      fullRuntimeTickNotClaimed: true
    }
  };
}

(async () => {
  const staticPart = runStaticPart();
  const browserApiPart = await runBrowserApiPart();
  const labels = {
    hook_unit_harness_pass: staticPart.ok === true && browserApiPart.ok === true,
    runtime_path_not_triggered: true,
    full_runtime_tick_not_claimed: true
  };
  const ok = labels.hook_unit_harness_pass
    && labels.runtime_path_not_triggered
    && labels.full_runtime_tick_not_claimed;

  console.log(JSON.stringify({
    ok,
    status: ok ? 'pass' : 'fail',
    labels,
    staticPart,
    browserApiPart,
    prohibitedClaims: {
      fullRuntimeTickTested: false,
      realEventStateMachineFullyExecuted: false,
      v2RunsInRealTick: false,
      liveStateTested: false
    }
  }, null, 2));

  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
