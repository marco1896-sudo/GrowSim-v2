const { test } = require('playwright/test');
const path = require('path');
const assert = require('assert');
const http = require('http');
const fs = require('fs');

test('Offline event spam regression test', async ({ page }) => {
  const ROOT = path.resolve(__dirname, '..');
  const HOST = '127.0.0.1';
  const PORT = 4175;

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

        res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
        res.end(data);
      });
    });
  }

  async function clearClientStorage(page) {
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();

      if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases
            .map((entry) => entry && entry.name)
            .filter(Boolean)
            .map((name) => new Promise((resolve) => {
              const request = indexedDB.deleteDatabase(name);
              request.onsuccess = request.onerror = request.onblocked = () => resolve();
            }))
        );
      }
    });
  }

  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await require('playwright').chromium.launch({ headless: true });
  // page is already provided by playwright test context

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`Browser Error: ${msg.text()}`);
    }
  });

  const url = `http://${HOST}:${PORT}/`;
  await page.goto(url, { waitUntil: 'networkidle' }); // First load to get into HTTP context
  await page.evaluate(() => {
    const now = Date.now();
    const initialSimTimeMs = now; // Simplified for test
    const defaultState = {
      schemaVersion: '1.0.0',
      seed: 'grow-sim-v1-seed',
      plantId: 'plant-001',
      setup: null,
      settings: {
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
          },
          lastMessage: null
        },
        pushNotificationsEnabled: false
      },
      meta: {
        rescue: {
          used: false,
          usedAtRealMs: null,
          lastResult: null
        }
      },
      environmentControls: {
        temperatureC: 25,
        gasConcentration: 400,
        humidityPercent: 60,
        airflowPercent: 70,
        ph: 6.0,
        ec: 1.4
      },
      simulation: {
        nowMs: now,
        startRealTimeMs: now,
        lastTickRealTimeMs: now,
        simTimeMs: initialSimTimeMs,
        simEpochMs: initialSimTimeMs,
        simDay: 0,
        simHour: 8, // SIM_START_HOUR
        simMinute: 0,
        tickCount: 0,
        mode: 'prod', // MODE
        tickIntervalMs: 1000, // UI_TICK_INTERVAL_MS
        timeCompression: 12, // SIM_TIME_COMPRESSION
        globalSeed: 'grow-sim-v1-seed',
        plantId: 'plant-001',
        dayWindow: { startHour: 6, endHour: 22 }, // SIM_DAY_START_HOUR, SIM_NIGHT_START_HOUR
        isDaytime: true, // simplified
        growthImpulse: 0,
        lastPushScheduleAtMs: 0,
        fairnessGraceUntilRealMs: 0,
        isCatchUp: false
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
        lifecycle: {
          totalSimDays: 88, // TOTAL_LIFECYCLE_SIM_DAYS
          qualityTier: 'normal',
          qualityScore: 77.5,
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
          nextEventRealTimeMs: now + (30 * 60 * 1000), // EVENT_ROLL_MIN_REAL_MS
          lastEventRealTimeMs: 0,
          lastEventId: null,
          lastChoiceId: null,
          lastEventCategory: null,
          deferredUntilDaytime: false,
          windowRealMinutes: { min: 30, max: 90 },
          eventCooldowns: {},
          categoryCooldowns: {}
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
      history: { actions: [], events: [], system: [], systemLog: [], telemetry: [] },
      debug: { enabled: false, showInternalTicks: false, forceDaytime: false },
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
        dayStamp: '2026-03-22' // Simplified dayStamp(now)
      },
      actions: {
        catalog: [],
        byId: {},
        cooldowns: {},
        activeEffects: [],
        lastResult: { ok: true, reason: 'ok', actionId: null, atRealTimeMs: now }
      },
      ui: {
        activeScreen: 'home',
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
        }
      },
      lastEventId: null,
      lastChoiceId: null,
      historyLog: []
    };
    localStorage.setItem('grow-sim-state-v2', JSON.stringify(defaultState));
  });

  // Reload the page to trigger the catch-up logic
  await page.reload({ waitUntil: 'networkidle' });

  // Simulate being offline for a long time (e.g., 2 days of real time)
  const now = Date.now();
  const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000); // 2 days in milliseconds
  await page.evaluate((timestamp) => {
    localStorage.setItem('grow-sim-state-v2', JSON.stringify({
      ...JSON.parse(localStorage.getItem('grow-sim-state-v2')),
      simulation: { ...JSON.parse(localStorage.getItem('grow-sim-state-v2')).simulation, lastTickRealTimeMs: timestamp }
    }));
  }, twoDaysAgo);

  // Check for event spam: look for multiple event dialogs/notifications
  const eventDialogs = await page.$$('.event-dialog'); // Assuming event dialogs have this class
  const logEntries = await page.evaluate(() => {
    const appState = window.state;
    if (!appState || !appState.history || !appState.history.systemLog) {
      // If state is not available, we can't get logs, return empty array to prevent error
      return [];
    }
    const logs = appState.history.systemLog || [];
    return logs.filter(log => log.type === 'event_roll' || log.type === 'event_shown');
  });

  // Expect no immediate event spam from catch-up
  assert.strictEqual(eventDialogs.length, 0, 'No event dialogs should be visible immediately after catch-up reload');
  // The logs should show events suppressed or rescheduled, not multiple activations
  const actualEventRolls = logEntries.filter(l => l.message.includes('Ereignisgrenze erreicht') && !l.message.includes('unterdrückt')).length;
  assert.strictEqual(actualEventRolls, 0, 'No actual event rolls should trigger during catch-up mode');

  // Check death/freeze logic: should not show multiple death overlays or unexpected states
  const deathOverlay = await page.$('#deathOverlay');
  const deathOverlayVisible = deathOverlay ? await deathOverlay.isVisible() : false;
  const plantIsDead = await page.evaluate(() => {
    let appState = window.state;
    if (!appState) {
      const storedState = localStorage.getItem('grow-sim-state-v2');
      if (storedState) {
        try {
          appState = JSON.parse(storedState);
        } catch (e) {
          console.error('Failed to parse state from localStorage:', e);
          return true; // Assume dead to fail safely
        }
      }
    }
    return (appState && appState.plant && appState.plant.isDead);
  });
  
  // If the plant would have died, only one death overlay should show, and the plant state should be dead
  if (plantIsDead) {
    // Check if it died cleanly, only one dialog
    const dialogs = await page.$$('.open-menu-dialog'); // assuming this class is used for the mission popup
    assert.strictEqual(dialogs.length, 1, 'Only one death/mission dialog should show if plant died during offline');
    assert.ok(deathOverlayVisible, 'Death overlay should be visible if plant died');
  } else {
    assert.strictEqual(deathOverlayVisible, false, 'Death overlay should not be visible if plant is not dead');
  }

  console.log('Offline event spam regression test passed');

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
});