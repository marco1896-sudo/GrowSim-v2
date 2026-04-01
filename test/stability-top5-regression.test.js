#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const HOST = '0.0.0.0';
const CLIENT_HOST = '127.0.0.1';
const PORT = 4187;
const APP_URL = `http://${CLIENT_HOST}:${PORT}/`;
const DB_NAME = 'grow-sim-db';
const DB_STORE = 'kv';
const DB_KEY = 'state-v2';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const byExt = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.webp': 'image/webp'
  };
  return byExt[ext] || 'application/octet-stream';
}

function createStaticServer(rootDir) {
  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const relativePath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const safeRelativePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(rootDir, safeRelativePath);

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(error.code === 'ENOENT' ? 404 : 500);
        res.end(error.code === 'ENOENT' ? 'Not found' : 'Internal server error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentTypeFor(filePath),
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  });
}

function createRemoteState({ simTimeMs, savedAtRealMs, displayName = 'Cloud Save' }) {
  const nowMs = Number(savedAtRealMs) || Date.now();
  return {
    schemaVersion: '1.0.0',
    seed: 'grow-sim-v1-seed',
    plantId: 'plant-001',
    setup: {
      mode: 'indoor',
      light: 'medium',
      medium: 'soil',
      potSize: 'medium',
      genetics: 'hybrid',
      createdAtReal: nowMs
    },
    settings: {
      gameplay: {
        simSpeed: 12,
        eventFrequency: 'Normal',
        tutorial: true,
        autosave: 5
      },
      notifications: {
        enabled: false,
        types: {
          events: true,
          critical: true,
          reminder: true
        },
        runtime: {
          lastNotifiedEventId: null,
          lastCriticalAtRealMs: 0,
          lastReminderAtRealMs: 0
        }
      },
      pushNotificationsEnabled: false
    },
    meta: {
      rescue: {
        used: false,
        usedAtRealMs: null,
        lastResult: null
      },
      persistence: {
        lastSavedAtRealMs: nowMs
      }
    },
    profile: {
      displayName,
      totalXp: 0,
      level: 1,
      unlocks: {
        setupModes: ['indoor'],
        media: ['soil'],
        lights: ['medium'],
        genetics: ['hybrid']
      },
      stats: {
        totalRuns: 0,
        deathRuns: 0,
        harvestRuns: 0
      }
    },
    simulation: {
      nowMs,
      startRealTimeMs: nowMs,
      lastTickRealTimeMs: nowMs,
      simTimeMs,
      simEpochMs: simTimeMs,
      simDay: 0,
      simHour: 8,
      simMinute: 0,
      tickCount: 0,
      mode: 'prod',
      tickIntervalMs: 1000,
      timeCompression: 12,
      baseSpeed: 12,
      effectiveSpeed: 12,
      globalSeed: 'grow-sim-v1-seed',
      plantId: 'plant-001',
      dayWindow: { startHour: 6, endHour: 22 },
      isDaytime: true,
      growthImpulse: 0,
      tempoOffsetDays: 0,
      lastPushScheduleAtMs: 0,
      fairnessGraceEndsAtRealMs: 0
    },
    plant: {
      phase: 'seedling',
      isDead: false,
      stageIndex: 0,
      stageKey: 'stage_01',
      stageProgress: 0,
      stageStartSimDay: 0,
      lastValidStageKey: 'stage_01',
      averageHealth: 85,
      averageStress: 15,
      observedSimMs: 0,
      progressOffsetSimMs: 0,
      lifecycle: {
        totalSimDays: 84,
        qualityTier: 'normal',
        qualityScore: 75,
        qualityLocked: false
      },
      assets: {
        basePath: 'assets/plant_growth/',
        resolvedStagePath: ''
      }
    },
    events: {
      machineState: 'idle',
      scheduler: {
        nextEventSimTimeMs: simTimeMs + (30 * 60 * 1000 * 12),
        nextEventRealTimeMs: nowMs + (30 * 60 * 1000),
        lastEventSimTimeMs: 0,
        lastEventRealTimeMs: 0,
        lastEventId: null,
        lastChoiceId: null,
        lastEventCategory: null,
        deferredUntilDaytime: false,
        windowRealMinutes: { min: 30, max: 90 },
        eventCooldowns: {},
        categoryCooldowns: {},
        eventCooldownsSim: {},
        categoryCooldownsSim: {}
      },
      active: null,
      history: [],
      activeEventId: null,
      activeEventTitle: '',
      activeEventText: '',
      activeLearningNote: '',
      activeOptions: [],
      activeSeverity: 1,
      activeCooldownRealMinutes: 120,
      activeCategory: 'generic',
      activeTags: [],
      resolvingUntilMs: 0,
      pendingOutcome: null,
      resolvedOutcome: null,
      lastEventAtMs: 0,
      cooldownUntilMs: 0,
      catalog: []
    },
    history: {
      actions: [],
      events: [],
      system: [],
      systemLog: [],
      telemetry: []
    },
    debug: {
      enabled: false,
      showInternalTicks: false,
      forceDaytime: false
    },
    status: {
      health: 85,
      stress: 15,
      water: 70,
      nutrition: 65,
      growth: 0,
      risk: 20
    },
    boost: {
      boostUsedToday: 0,
      boostMaxPerDay: 6,
      dayStamp: '2026-04-01',
      boostEndsAtMs: 0
    },
    actions: {
      catalog: [],
      byId: {},
      cooldowns: {},
      activeEffects: [],
      lastResult: { ok: true, reason: 'ok', actionId: null, atRealTimeMs: nowMs }
    },
    ui: {
      authGateActive: false,
      openSheet: null,
      menuOpen: false,
      menuDialogOpen: false,
      selectedBackground: 'bg_dark_01.jpg',
      visibleOverlayIds: [],
      deathOverlayOpen: false,
      deathOverlayAcknowledged: false,
      care: {
        selectedCategory: null,
        selectedActionId: null,
        feedback: { kind: 'info', text: 'Wähle eine Aktion.' }
      },
      analysis: {
        activeTab: 'overview'
      },
      statDetailKey: null,
      lastRenderRealMs: nowMs
    },
    run: {
      status: 'idle'
    },
    lastEventId: null,
    lastChoiceId: null,
    historyLog: []
  };
}

async function installApiMocks(page, options = {}) {
  const stats = {
    saveGetRequests: 0,
    authMeRequests: 0,
    loginRequests: 0
  };

  const routeHandler = async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const authHeader = request.headers().authorization || '';
    const hasAuth = authHeader === 'Bearer test-token';

    if (pathname === '/api/auth/me') {
      stats.authMeRequests += 1;
      if (options.allowAuthSession && hasAuth) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'user-1',
              email: 'test@example.com',
              displayName: 'Tester'
            }
          })
        });
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
      return;
    }

    if (pathname === '/api/auth/login') {
      stats.loginRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'test-token',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            displayName: 'Tester'
          }
        })
      });
      return;
    }

    if (pathname === '/api/auth/register') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'test-token',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            displayName: 'Tester'
          }
        })
      });
      return;
    }

    if (pathname === '/api/save' && request.method() === 'GET') {
      stats.saveGetRequests += 1;
      if (!hasAuth && options.requireAuthForSave !== false) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        });
        return;
      }

      if (options.remoteState) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            state: options.remoteState
          })
        });
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No save' })
      });
      return;
    }

    if (pathname === '/api/save' && request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unhandled API route' })
    });
  };

  await page.route('https://api.growsimulator.tech/api/**', routeHandler);
  return stats;
}

async function clearPersistence(page) {
  await page.evaluate(async (authTokenKey) => {
    localStorage.clear();
    localStorage.removeItem(authTokenKey);
    sessionStorage.clear();

    if ('indexedDB' in window) {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('grow-sim-db');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    }
  }, AUTH_TOKEN_KEY);
}

async function writeIndexedDbState(page, snapshot) {
  await page.evaluate(async ({ snapshot, dbName, storeName, key }) => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(snapshot, key);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'));
      };
    });
  }, { snapshot, dbName: DB_NAME, storeName: DB_STORE, key: DB_KEY });
}

async function waitForBoot(page) {
  await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: 15000 });
}

async function waitForGate(page) {
  await page.evaluate(() => {
    const isAuthed = Boolean(window.GrowSimAuth && typeof window.GrowSimAuth.isAuthenticated === 'function' && window.GrowSimAuth.isAuthenticated());
    const modal = document.getElementById('authModal');
    const isVisible = Boolean(modal && !modal.classList.contains('hidden'));
    if (!isAuthed && !isVisible && typeof openCloudAuthModal === 'function') {
      openCloudAuthModal({ gate: true });
    }
  });
  await page.waitForFunction(() => {
    const modal = document.getElementById('authModal');
    return Boolean(modal && !modal.classList.contains('hidden'));
  }, null, { timeout: 15000 });
}

async function loginThroughGate(page) {
  await page.fill('#authEmailInput', 'test@example.com');
  await page.fill('#authPasswordInput', 'secret123');
  await page.evaluate(() => {
    submitAuthModal();
  });
  await page.waitForFunction(() => {
    const modal = document.getElementById('authModal');
    return Boolean(modal && modal.classList.contains('hidden'));
  }, null, { timeout: 15000 });
}

async function startRun(page) {
  await page.waitForSelector('#landing:not(.hidden)', { timeout: 15000 });
  await page.click('#startRunBtn');
  await page.waitForFunction(() => {
    const landing = document.getElementById('landing');
    return Boolean(landing && landing.classList.contains('hidden'));
  }, null, { timeout: 15000 });
}

async function scenarioResetPath(page) {
  await installApiMocks(page, { allowAuthSession: false });
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await waitForBoot(page);

  const result = await page.evaluate(() => {
    resetStateToDefaults();
    ensureStateIntegrity(Date.now());
    syncCanonicalStateShape();
    return {
      simTimeMs: Number(window.__gsState.simulation.simTimeMs),
      nextEventSimTimeMs: Number(window.__gsState.events.scheduler.nextEventSimTimeMs),
      authGateActive: Boolean(window.__gsState.ui.authGateActive)
    };
  });

  assert(Number.isFinite(result.simTimeMs), 'reset path should produce a finite sim time');
  assert(Number.isFinite(result.nextEventSimTimeMs), 'reset path should produce a finite next event time');
  assert(result.nextEventSimTimeMs > result.simTimeMs, 'reset path should schedule the next event after current sim time');
  assert.strictEqual(result.authGateActive, false, 'reset path should rebuild UI auth gate state deterministically');
}

async function scenarioCanonicalOwnership(page) {
  await installApiMocks(page, { allowAuthSession: false });
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await waitForBoot(page);

  const ownership = await page.evaluate(() => ({
    domainOwnership: window.__gsDomainOwnership,
    canonicalSimulationOwned: window.getCanonicalSimulation === window.GrowSimStorage.getCanonicalSimulation,
    canonicalPlantOwned: window.getCanonicalPlant === window.GrowSimStorage.getCanonicalPlant,
    canonicalEventsOwned: window.getCanonicalEvents === window.GrowSimStorage.getCanonicalEvents,
    canonicalHistoryOwned: window.getCanonicalHistory === window.GrowSimStorage.getCanonicalHistory,
    canonicalMetaOwned: window.getCanonicalMeta === window.GrowSimStorage.getCanonicalMeta,
    canonicalSettingsOwned: window.getCanonicalSettings === window.GrowSimStorage.getCanonicalSettings,
    canonicalNotificationsOwned: window.getCanonicalNotificationsSettings === window.GrowSimStorage.getCanonicalNotificationsSettings,
    canonicalProfileOwned: window.getCanonicalProfile === window.GrowSimStorage.getCanonicalProfile,
    canonicalRunOwned: window.getCanonicalRun === window.GrowSimStorage.getCanonicalRun,
    storageRestoreOwned: window.restoreState === window.GrowSimStorage.restoreState,
    storagePersistOwned: window.persistState === window.GrowSimStorage.persistState,
    storageScheduleOwned: window.schedulePersistState === window.GrowSimStorage.schedulePersistState,
    storageMigrateOwned: window.migrateState === window.GrowSimStorage.migrateState,
    storageLegacyMigrateOwned: window.migrateLegacyStateIntoCanonical === window.GrowSimStorage.migrateLegacyStateIntoCanonical,
    storageResetOwned: window.resetStateToDefaults === window.GrowSimStorage.resetStateToDefaults,
    storageIntegrityOwned: window.ensureStateIntegrity === window.GrowSimStorage.ensureStateIntegrity,
    storageSyncOwned: window.syncCanonicalStateShape === window.GrowSimStorage.syncCanonicalStateShape,
    storageLegacyMirrorOwned: window.syncLegacyMirrorsFromCanonical === window.GrowSimStorage.syncLegacyMirrorsFromCanonical,
    storageAdapterOwned: window.createStorageAdapter === window.GrowSimStorage.createStorageAdapter,
    visibilityOwned: window.onVisibilityChange === window.GrowSimUiRuntime.onVisibilityChange,
    haltBannerOwned: window.showRuntimeHaltBanner === window.GrowSimUiRuntime.showRuntimeHaltBanner
  }));

  assert.strictEqual(ownership.domainOwnership.storage, 'storage_module', 'storage ownership should resolve to the canonical storage module');
  assert.strictEqual(ownership.domainOwnership.uiRuntime, 'ui.js', 'ui runtime ownership should resolve to ui.js');
  assert.strictEqual(ownership.canonicalSimulationOwned, true, 'getCanonicalSimulation should point at storage.js');
  assert.strictEqual(ownership.canonicalPlantOwned, true, 'getCanonicalPlant should point at storage.js');
  assert.strictEqual(ownership.canonicalEventsOwned, true, 'getCanonicalEvents should point at storage.js');
  assert.strictEqual(ownership.canonicalHistoryOwned, true, 'getCanonicalHistory should point at storage.js');
  assert.strictEqual(ownership.canonicalMetaOwned, true, 'getCanonicalMeta should point at storage.js');
  assert.strictEqual(ownership.canonicalSettingsOwned, true, 'getCanonicalSettings should point at storage.js');
  assert.strictEqual(ownership.canonicalNotificationsOwned, true, 'getCanonicalNotificationsSettings should point at storage.js');
  assert.strictEqual(ownership.canonicalProfileOwned, true, 'getCanonicalProfile should point at storage.js');
  assert.strictEqual(ownership.canonicalRunOwned, true, 'getCanonicalRun should point at storage.js');
  assert.strictEqual(ownership.storageRestoreOwned, true, 'restoreState should point at the canonical storage module implementation');
  assert.strictEqual(ownership.storagePersistOwned, true, 'persistState should point at the canonical storage module implementation');
  assert.strictEqual(ownership.storageScheduleOwned, true, 'schedulePersistState should point at the canonical storage module implementation');
  assert.strictEqual(ownership.storageMigrateOwned, true, 'migrateState should point at the canonical storage module implementation');
  assert.strictEqual(ownership.storageLegacyMigrateOwned, true, 'migrateLegacyStateIntoCanonical should point at the canonical storage module implementation');
  assert.strictEqual(ownership.storageResetOwned, true, 'resetStateToDefaults should point at the canonical storage module implementation');
  assert.strictEqual(ownership.storageIntegrityOwned, true, 'ensureStateIntegrity should point at the canonical storage module implementation');
  assert.strictEqual(ownership.storageSyncOwned, true, 'syncCanonicalStateShape should point at the canonical storage module implementation');
  assert.strictEqual(ownership.storageLegacyMirrorOwned, true, 'syncLegacyMirrorsFromCanonical should point at the canonical storage module implementation');
  assert.strictEqual(ownership.storageAdapterOwned, true, 'createStorageAdapter should point at the canonical storage module implementation');
  assert.strictEqual(ownership.visibilityOwned, true, 'visibility resume handling should point at the canonical ui runtime implementation');
  assert.strictEqual(ownership.haltBannerOwned, true, 'runtime halt banner handling should point at the canonical ui runtime implementation');
}

async function scenarioCloudRetryAfterLogin(page) {
  const remoteState = createRemoteState({
    simTimeMs: 8_640_000,
    savedAtRealMs: Date.now() + 50_000,
    displayName: 'Remote Retry'
  });
  const stats = await installApiMocks(page, {
    allowAuthSession: false,
    remoteState
  });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await waitForBoot(page);
  await waitForGate(page);
  await loginThroughGate(page);

  const restored = await page.evaluate(() => ({
    simTimeMs: Number(window.__gsState.simulation.simTimeMs),
    displayName: window.__gsState.profile && window.__gsState.profile.displayName
  }));

  assert.strictEqual(stats.saveGetRequests >= 2, true, 'cloud restore should retry save fetch after login in the same session');
  assert.strictEqual(restored.simTimeMs, remoteState.simulation.simTimeMs, 'post-login restore should apply the cloud save immediately');
  assert.strictEqual(restored.displayName, 'Remote Retry', 'post-login restore should replace local defaults with remote profile state');
}

async function scenarioFreshnessArbitration(page) {
  const olderRemoteState = createRemoteState({
    simTimeMs: 4_320_000,
    savedAtRealMs: Date.now() - 60_000,
    displayName: 'Older Remote'
  });
  await installApiMocks(page, {
    allowAuthSession: true,
    remoteState: olderRemoteState
  });

  const newerLocalState = createRemoteState({
    simTimeMs: 12_960_000,
    savedAtRealMs: Date.now() + 60_000,
    displayName: 'Newer Local'
  });

  await page.addInitScript(({ authTokenKey, localState }) => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: undefined
    });
    localStorage.setItem(authTokenKey, 'test-token');
    localStorage.setItem('grow-sim-state-v2', JSON.stringify(localState));
  }, { authTokenKey: AUTH_TOKEN_KEY, localState: newerLocalState });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await waitForBoot(page);

  const restored = await page.evaluate(() => ({
    simTimeMs: Number(window.__gsState.simulation.simTimeMs),
    displayName: window.__gsState.profile && window.__gsState.profile.displayName
  }));

  assert.strictEqual(restored.simTimeMs, newerLocalState.simulation.simTimeMs, 'restore should keep the newer local snapshot when remote is older');
  assert.strictEqual(restored.displayName, 'Newer Local', 'freshness arbitration should preserve newer local profile data');
}

async function scenarioAuthGateFreeze(page) {
  await installApiMocks(page, {
    allowAuthSession: false,
    remoteState: createRemoteState({
      simTimeMs: 6_000_000,
      savedAtRealMs: Date.now() + 20_000,
      displayName: 'Post Gate Resume'
    })
  });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await waitForBoot(page);
  await waitForGate(page);

  const before = await page.evaluate(() => ({
    simTimeMs: Number(window.__gsState.simulation.simTimeMs),
    lastTickRealTimeMs: Number(window.__gsState.simulation.lastTickRealTimeMs)
  }));
  await page.waitForTimeout(2500);
  const duringGate = await page.evaluate(() => ({
    simTimeMs: Number(window.__gsState.simulation.simTimeMs),
    lastTickRealTimeMs: Number(window.__gsState.simulation.lastTickRealTimeMs)
  }));

  assert.strictEqual(duringGate.simTimeMs, before.simTimeMs, 'simulation time should stay frozen while the required auth gate is active');
  assert.strictEqual(duringGate.lastTickRealTimeMs >= before.lastTickRealTimeMs, true, 'auth gate freeze should keep runtime clocks sane');

  await loginThroughGate(page);
  const resumedBefore = await page.evaluate(() => Number(window.__gsState.simulation.simTimeMs));
  await page.waitForTimeout(1800);
  const resumedAfter = await page.evaluate(() => Number(window.__gsState.simulation.simTimeMs));

  assert(resumedAfter > resumedBefore, 'simulation should resume after the auth gate is cleared');
}

async function scenarioWatchdogTerminalState(page) {
  await installApiMocks(page, {
    allowAuthSession: true,
    remoteState: null
  });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await waitForBoot(page);
  await page.evaluate((authTokenKey) => {
    localStorage.setItem(authTokenKey, 'test-token');
  }, AUTH_TOKEN_KEY);
  await page.reload({ waitUntil: 'networkidle' });
  await waitForBoot(page);
  await startRun(page);

  await page.evaluate(() => {
    window.__gsState.run = window.__gsState.run || {};
    window.__gsState.run.status = 'ended';
    window.__gsState.ui.lastRenderRealMs = Date.now() - 16_000;
    renderAll();
  });

  await page.waitForTimeout(3500);
  const result = await page.evaluate(() => ({
    lastRenderRealMs: Number(window.__gsState.ui.lastRenderRealMs),
    bannerVisible: Boolean(document.getElementById('runtimeHaltBanner'))
  }));

  assert(result.lastRenderRealMs > (Date.now() - 10_000), 'terminal-state rendering should refresh the watchdog heartbeat');
  assert.strictEqual(result.bannerVisible, false, 'watchdog should not raise a false runtime halt banner in terminal states');
}

async function runScenario(browser, name, scenario) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await scenario(page);
    console.log(`ok - ${name}`);
  } finally {
    await context.close();
  }
}

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  try {
    await runScenario(browser, 'reset path rebuild is valid', scenarioResetPath);
    await runScenario(browser, 'canonical ownership stays wired after boot', scenarioCanonicalOwnership);
    await runScenario(browser, 'cloud save retries after login', scenarioCloudRetryAfterLogin);
    await runScenario(browser, 'restore prefers newer local snapshot', scenarioFreshnessArbitration);
    await runScenario(browser, 'auth gate freezes and resumes simulation', scenarioAuthGateFreeze);
    await runScenario(browser, 'watchdog ignores valid terminal render loop', scenarioWatchdogTerminalState);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
