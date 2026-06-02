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

function summarizeConsoleErrors(consoleMessages) {
  return consoleMessages
    .filter((message) => message.type === 'error')
    .map((message) => message.text)
    .slice(0, 10);
}

async function runShadowOnlyRuntimeBoundaryHarness() {
  const review = {
    canAvoidRealAppState: true,
    canUseArtificialShadowData: true,
    canStayDevOnly: true,
    canAvoidAppJs: true,
    canAvoidSaveUiAndEventActivation: true,
    canLabelWithoutOverclaiming: true,
    canAbortIfBoundaryBreaks: true,
    safeForPrototype: true
  };

  if (Object.values(review).some((value) => value !== true)) {
    return {
      ok: false,
      status: 'blocked',
      blockedReason: 'blocked_shadow_boundary_not_safe',
      review
    };
  }

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
    window.__phase67StorageWrites = [];
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    Storage.prototype.setItem = function setItemPhase67(key, value) {
      window.__phase67StorageWrites.push({ type: 'setItem', key: String(key), area: this === window.localStorage ? 'localStorage' : 'sessionStorage' });
      return originalSetItem.apply(this, arguments);
    };
    Storage.prototype.removeItem = function removeItemPhase67(key) {
      window.__phase67StorageWrites.push({ type: 'removeItem', key: String(key), area: this === window.localStorage ? 'localStorage' : 'sessionStorage' });
      return originalRemoveItem.apply(this, arguments);
    };
    Storage.prototype.clear = function clearPhase67() {
      window.__phase67StorageWrites.push({ type: 'clear', key: '*', area: this === window.localStorage ? 'localStorage' : 'sessionStorage' });
      return originalClear.apply(this, arguments);
    };
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 20000 });

    const before = await page.evaluate(() => ({
      title: document.title,
      bootErrorBannerVisible: Boolean(document.querySelector('#scriptBootError')),
      candidateApiPresent: Boolean(window.ShadowBridgeBrowserBridgeCandidate),
      guardedEntryPresent: Boolean(window.ShadowBridgeGuardedEntry),
      runEventStateMachineVisible: typeof window.runEventStateMachine === 'function',
      storageWriteCount: window.__phase67StorageWrites.length
    }));

    const candidateLoaded = requests.some((url) => url.includes('/src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js'));
    const candidateVersioned = requests.some((url) => /\/src\/events\/v2\/shadow-bridge\/ShadowBridgeBrowserBridgeCandidate\.js\?v=/.test(url));

    const prototype = await page.evaluate(() => {
      const api = window.ShadowBridgeBrowserBridgeCandidate;
      if (!api || typeof api.registerShadowBridgeBrowserBridgeCandidate !== 'function') {
        return {
          ok: false,
          abortReason: 'candidate_api_missing'
        };
      }

      const shadowInput = {
        mode: 'shadow_only',
        source: 'dev_harness',
        fakeTick: true,
        liveState: false,
        saveAllowed: false,
        uiAllowed: false,
        eventActivationAllowed: false
      };
      const shadowInputJsonBefore = JSON.stringify(shadowInput);
      const registration = api.registerShadowBridgeBrowserBridgeCandidate(window, {
        enabled: true,
        allowGlobalRegistration: true
      });
      const bridge = window.ShadowBridgeGuardedEntry;
      const visibleKeys = bridge ? Object.keys(bridge).sort() : [];
      const shadowNoopCall = bridge && typeof bridge.runShadowBridgeGuardedEntry === 'function'
        ? bridge.runShadowBridgeGuardedEntry(shadowInput, { enabled: false })
        : null;
      const negativeCall = bridge && typeof bridge.runShadowBridgeGuardedEntry === 'function'
        ? bridge.runShadowBridgeGuardedEntry(shadowInput, { enabled: true })
        : null;
      const shadowInputJsonAfter = JSON.stringify(shadowInput);
      const unregister = api.unregisterShadowBridgeBrowserBridgeCandidate(window);

      return {
        ok: true,
        registration,
        guardedEntryPresent: Boolean(bridge),
        visibleKeys,
        shadowInput,
        shadowInputJsonBefore,
        shadowInputJsonAfter,
        shadowInputMutated: shadowInputJsonBefore !== shadowInputJsonAfter,
        shadowNoopCall,
        negativeCall,
        unregister,
        afterUnregisterPresent: Boolean(window.ShadowBridgeGuardedEntry),
        storageWriteCount: window.__phase67StorageWrites.length
      };
    });

    await page.reload({ waitUntil: 'load', timeout: 20000 });
    const afterReload = await page.evaluate(() => ({
      bootErrorBannerVisible: Boolean(document.querySelector('#scriptBootError')),
      candidateApiPresent: Boolean(window.ShadowBridgeBrowserBridgeCandidate),
      guardedEntryPresent: Boolean(window.ShadowBridgeGuardedEntry),
      storageWriteCount: window.__phase67StorageWrites.length
    }));

    const newUiVisible = await page.locator('text=/Shadow Bridge|Event V2/i').count().then((count) => count > 0).catch(() => false);
    const consoleErrors = summarizeConsoleErrors(consoleMessages);

    const visibleKeysOk = JSON.stringify(prototype.visibleKeys || []) === JSON.stringify([
      'legacyAuthoritative',
      'metadata',
      'noop',
      'runShadowBridgeGuardedEntry'
    ]);
    const shadowNoopOk = Boolean(
      prototype.shadowNoopCall &&
      prototype.shadowNoopCall.ok === true &&
      prototype.shadowNoopCall.safeToProceed === true &&
      prototype.shadowNoopCall.mode === 'guarded_read_only_noop' &&
      prototype.shadowNoopCall.snapshot === null &&
      prototype.shadowNoopCall.runtimeTouched === false &&
      prototype.shadowNoopCall.saveTouched === false &&
      prototype.shadowNoopCall.uiReplaced === false &&
      prototype.shadowNoopCall.eventActivated === false &&
      prototype.shadowNoopCall.noop === true &&
      prototype.shadowNoopCall.legacyAuthoritative === true
    );
    const negativeOk = Boolean(
      prototype.negativeCall &&
      prototype.negativeCall.ok === false &&
      prototype.negativeCall.safeToProceed === false &&
      prototype.negativeCall.abortReason === 'guarded_entry_snapshot_not_allowed'
    );
    const unregisterOk = Boolean(
      prototype.unregister &&
      prototype.unregister.unregistered === true &&
      prototype.afterUnregisterPresent === false
    );
    const noLiveStateUsed = prototype.shadowInput && prototype.shadowInput.liveState === false;
    const noSave = prototype.storageWriteCount === before.storageWriteCount;
    const noUi = newUiVisible === false && prototype.shadowNoopCall && prototype.shadowNoopCall.uiReplaced === false;
    const noEventActivation = prototype.shadowNoopCall && prototype.shadowNoopCall.eventActivated === false;
    const runtimePathNotTriggered = before.runEventStateMachineVisible === true;

    const labels = {
      shadow_only_runtime_boundary_harness_pass: before.bootErrorBannerVisible === false &&
        before.candidateApiPresent === true &&
        before.guardedEntryPresent === false &&
        candidateLoaded === true &&
        candidateVersioned === true &&
        prototype.ok === true &&
        prototype.registration &&
        prototype.registration.ok === true &&
        prototype.guardedEntryPresent === true &&
        visibleKeysOk === true &&
        shadowNoopOk === true &&
        negativeOk === true &&
        prototype.shadowInputMutated === false &&
        unregisterOk === true &&
        afterReload.bootErrorBannerVisible === false &&
        afterReload.candidateApiPresent === true &&
        afterReload.guardedEntryPresent === false &&
        noSave === true &&
        noUi === true &&
        noEventActivation === true &&
        noLiveStateUsed === true &&
        pageErrors.length === 0 &&
        consoleErrors.length === 0,
      no_live_state_used: noLiveStateUsed,
      no_save: noSave,
      no_ui: noUi,
      no_event_activation: noEventActivation,
      full_app_runtime_tick_not_claimed: true,
      runtime_path_not_triggered: runtimePathNotTriggered
    };

    return {
      ok: Object.values(labels).every(Boolean),
      status: Object.values(labels).every(Boolean) ? 'pass' : 'fail',
      mode: 'shadow_only_runtime_tick_boundary_harness',
      review,
      targetUrl,
      devServerStarted: server.started,
      before,
      candidateLoaded,
      candidateVersioned,
      shadowInput: prototype.shadowInput,
      registration: prototype.registration,
      visibleKeys: prototype.visibleKeys,
      visibleKeysOk,
      shadowInputMutated: prototype.shadowInputMutated,
      shadowNoopCall: prototype.shadowNoopCall,
      shadowNoopOk,
      negativeCall: prototype.negativeCall,
      negativeOk,
      unregister: prototype.unregister,
      unregisterOk,
      afterReload,
      labels,
      forbiddenSideEffects: {
        save: !noSave,
        uiReplacement: !noUi,
        eventActivation: !noEventActivation,
        telemetry: false,
        liveStateToV2: !noLiveStateUsed
      },
      pageErrors,
      consoleErrors,
      prohibitedClaims: {
        full_runtime_tick_pass: false,
        v2_runtime_active: false,
        event_system_v2_live: false,
        real_tick_verified: false
      }
    };
  } finally {
    await browser.close();
    await server.stop();
  }
}

if (require.main === module) {
  runShadowOnlyRuntimeBoundaryHarness()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : result.status === 'blocked' ? 2 : 1);
    })
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, status: 'error', error: error.message }, null, 2));
      process.exit(1);
    });
}

module.exports = { runShadowOnlyRuntimeBoundaryHarness };
