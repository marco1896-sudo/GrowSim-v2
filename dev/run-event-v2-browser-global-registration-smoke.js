#!/usr/bin/env node
'use strict';

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const rootDir = path.resolve(__dirname, '..');
const targetUrl = process.env.EVENT_V2_SMOKE_URL || 'http://127.0.0.1:5173/';

function requestHome() {
  return new Promise((resolve) => {
    const req = http.get(targetUrl, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 500));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureDevServer() {
  if (await requestHome()) {
    return { started: false, stop: async () => {} };
  }

  const child = spawn(process.execPath, ['scripts/dev-server.js'], {
    cwd: rootDir,
    stdio: 'ignore',
    windowsHide: true
  });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (await requestHome()) {
      return {
        started: true,
        stop: async () => {
          if (!child.killed) {
            child.kill();
          }
        }
      };
    }
  }

  if (!child.killed) {
    child.kill();
  }
  throw new Error('dev_server_unavailable');
}

function summarizeErrors(consoleMessages) {
  return consoleMessages
    .filter((message) => message.type === 'error')
    .map((message) => message.text)
    .slice(0, 10);
}

async function runBrowserGlobalRegistrationSmoke() {
  const server = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const requests = [];
  const consoleMessages = [];
  const pageErrors = [];

  page.on('requestfinished', (request) => requests.push(request.url()));
  page.on('console', (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    window.__phase53StorageWrites = [];
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    Storage.prototype.setItem = function setItemPhase53(key, value) {
      window.__phase53StorageWrites.push({ type: 'setItem', key: String(key), area: this === window.localStorage ? 'localStorage' : 'sessionStorage' });
      return originalSetItem.apply(this, arguments);
    };
    Storage.prototype.removeItem = function removeItemPhase53(key) {
      window.__phase53StorageWrites.push({ type: 'removeItem', key: String(key), area: this === window.localStorage ? 'localStorage' : 'sessionStorage' });
      return originalRemoveItem.apply(this, arguments);
    };
    Storage.prototype.clear = function clearPhase53() {
      window.__phase53StorageWrites.push({ type: 'clear', key: '*', area: this === window.localStorage ? 'localStorage' : 'sessionStorage' });
      return originalClear.apply(this, arguments);
    };
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 20000 });

    const before = await page.evaluate(() => ({
      title: document.title,
      bootErrorBannerVisible: Boolean(document.querySelector('#scriptBootError')),
      guardedEntryPresent: Boolean(window.ShadowBridgeGuardedEntry),
      candidateApiPresent: Boolean(window.ShadowBridgeBrowserBridgeCandidate),
      candidateApiKeys: window.ShadowBridgeBrowserBridgeCandidate ? Object.keys(window.ShadowBridgeBrowserBridgeCandidate).sort() : [],
      storageWriteCount: window.__phase53StorageWrites.length
    }));

    const candidateLoaded = requests.some((url) => url.includes('/src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js'));
    const candidateVersioned = requests.some((url) => /\/src\/events\/v2\/shadow-bridge\/ShadowBridgeBrowserBridgeCandidate\.js\?v=/.test(url));
    const preflightOk = before.bootErrorBannerVisible === false &&
      before.guardedEntryPresent === false &&
      pageErrors.length === 0 &&
      summarizeErrors(consoleMessages).length === 0 &&
      candidateLoaded &&
      candidateVersioned;

    if (!before.candidateApiPresent) {
      return {
        ok: false,
        status: 'blocked',
        blockedReason: 'candidate_registration_api_not_exposed_in_browser',
        devServerStarted: server.started,
        targetUrl,
        before,
        candidateLoaded,
        candidateVersioned,
        pageErrors,
        consoleErrors: summarizeErrors(consoleMessages),
        registration: null,
        noopCall: null,
        negativeCall: null,
        unregister: null,
        foreignGlobalProtection: null,
        storage: {
          storageWriteCount: before.storageWriteCount,
          v2CausedWrites: 0
        },
        uiEventSafety: {
          newUiVisible: await page.locator('text=/Shadow Bridge|Event V2/i').count().then((count) => count > 0).catch(() => false),
          eventV2HookActive: false
        },
        preflightOk,
        recommendation: 'phase_54_should_prepare_browser_visible_registration_api_before_registration_smoke'
      };
    }

    const after = await page.evaluate(() => {
      const api = window.ShadowBridgeBrowserBridgeCandidate;
      const registration = api.registerShadowBridgeBrowserBridgeCandidate(window, {
        enabled: true,
        allowGlobalRegistration: true
      });
      const keys = Object.keys(window.ShadowBridgeGuardedEntry || {}).sort();
      const noopCall = window.ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: false });
      const negativeCall = window.ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: true });
      const unregister = api.unregisterShadowBridgeBrowserBridgeCandidate(window);
      const afterUnregisterPresent = Boolean(window.ShadowBridgeGuardedEntry);

      window.ShadowBridgeGuardedEntry = { foreign: true };
      const foreignUnregister = api.unregisterShadowBridgeBrowserBridgeCandidate(window);
      const foreignStillPresent = Boolean(window.ShadowBridgeGuardedEntry && window.ShadowBridgeGuardedEntry.foreign === true);
      delete window.ShadowBridgeGuardedEntry;

      return {
        registration,
        keys,
        noop: window.ShadowBridgeGuardedEntry ? window.ShadowBridgeGuardedEntry.noop : true,
        legacyAuthoritative: window.ShadowBridgeGuardedEntry ? window.ShadowBridgeGuardedEntry.legacyAuthoritative : true,
        noopCall,
        negativeCall,
        unregister,
        afterUnregisterPresent,
        foreignUnregister,
        foreignStillPresent,
        storageWriteCount: window.__phase53StorageWrites.length
      };
    });

    const allowedKeys = ['legacyAuthoritative', 'metadata', 'noop', 'runShadowBridgeGuardedEntry'].sort();
    const visibleKeysOk = JSON.stringify(after.keys) === JSON.stringify(allowedKeys);
    const noopOk = after.noopCall && after.noopCall.ok === true && after.noopCall.safeToProceed === true && after.noopCall.mode === 'guarded_read_only_noop' && after.noopCall.snapshot === null && after.noopCall.runtimeTouched === false && after.noopCall.saveTouched === false && after.noopCall.uiReplaced === false && after.noopCall.eventActivated === false && after.noopCall.noop === true && after.noopCall.legacyAuthoritative === true;
    const negativeOk = after.negativeCall && after.negativeCall.ok === false && after.negativeCall.safeToProceed === false && after.negativeCall.abortReason === 'guarded_entry_snapshot_not_allowed';
    const unregisterOk = after.unregister && after.unregister.unregistered === true && after.afterUnregisterPresent === false;
    const foreignOk = after.foreignUnregister && after.foreignUnregister.ok === false && after.foreignUnregister.reason === 'global_not_owned_by_bridge_candidate' && after.foreignStillPresent === true;
    const storageOk = after.storageWriteCount === before.storageWriteCount;
    const newUiVisible = await page.locator('text=/Shadow Bridge|Event V2/i').count().then((count) => count > 0).catch(() => false);

    return {
      ok: preflightOk && visibleKeysOk && noopOk && negativeOk && unregisterOk && foreignOk && storageOk && !newUiVisible,
      status: 'pass',
      devServerStarted: server.started,
      targetUrl,
      before,
      candidateLoaded,
      candidateVersioned,
      registration: after.registration,
      visibleKeys: after.keys,
      visibleKeysOk,
      noopCall: after.noopCall,
      noopOk,
      negativeCall: after.negativeCall,
      negativeOk,
      unregister: after.unregister,
      unregisterOk,
      foreignGlobalProtection: {
        result: after.foreignUnregister,
        foreignStillPresent: after.foreignStillPresent,
        ok: foreignOk
      },
      storage: {
        beforeWrites: before.storageWriteCount,
        afterWrites: after.storageWriteCount,
        v2CausedWrites: after.storageWriteCount - before.storageWriteCount,
        ok: storageOk
      },
      uiEventSafety: {
        newUiVisible,
        eventV2HookActive: false,
        ok: !newUiVisible
      },
      pageErrors,
      consoleErrors: summarizeErrors(consoleMessages),
      preflightOk
    };
  } finally {
    await browser.close();
    await server.stop();
  }
}

if (require.main === module) {
  runBrowserGlobalRegistrationSmoke()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : result.status === 'blocked' ? 2 : 1);
    })
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, status: 'error', error: error.message }, null, 2));
      process.exit(1);
    });
}

module.exports = { runBrowserGlobalRegistrationSmoke };
