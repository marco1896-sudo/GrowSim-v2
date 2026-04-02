const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const http = require('http');
const fs = require('fs');

async function runOfflineRegressionTest() {
const ROOT = path.resolve(__dirname, '..');
const HOST = '0.0.0.0';
const CLIENT_HOST = '127.0.0.1';
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

  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  async function evaluateWithRetry(fn, arg) {
    try {
      return await page.evaluate(fn, arg);
    } catch (error) {
      const message = String(error && error.message || '');
      if (!message.includes('Execution context was destroyed')) {
        throw error;
      }
      await page.waitForLoadState('domcontentloaded');
      return page.evaluate(fn, arg);
    }
  }

  try {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Browser Error: ${msg.text()}`);
      }
    });

    const url = `http://${CLIENT_HOST}:${PORT}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await evaluateWithRetry(() => {
      const now = Date.now();
      const initialSimTimeMs = now;
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
          simHour: 8,
          simMinute: 0,
          tickCount: 0,
          mode: 'prod',
          tickIntervalMs: 1000,
          timeCompression: 12,
          globalSeed: 'grow-sim-v1-seed',
          plantId: 'plant-001',
          dayWindow: { startHour: 6, endHour: 22 },
          isDaytime: true,
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
            totalSimDays: 88,
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
            nextEventRealTimeMs: now + (30 * 60 * 1000),
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
          dayStamp: '2026-03-22'
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
            feedback: { kind: 'info', text: 'Waehle eine Aktion.' }
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

    await page.reload({ waitUntil: 'networkidle' });

    const now = Date.now();
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
    await evaluateWithRetry((timestamp) => {
      const raw = localStorage.getItem('grow-sim-state-v2');
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem('grow-sim-state-v2', JSON.stringify({
        ...parsed,
        simulation: { ...(parsed.simulation || {}), lastTickRealTimeMs: timestamp }
      }));
    }, twoDaysAgo);

    const eventDialogs = await page.$$('.event-dialog');
    const logEntries = await page.evaluate(() => {
      const appState = window.state;
      if (!appState || !appState.history || !appState.history.systemLog) {
        return [];
      }
      return appState.history.systemLog.filter((log) => log.type === 'event_roll' || log.type === 'event_shown');
    });

    assert.strictEqual(eventDialogs.length, 0, 'No event dialogs should be visible immediately after catch-up reload');
    const actualEventRolls = logEntries.filter((entry) => {
      const message = String(entry && entry.message || '');
      return message.includes('Ereignisgrenze erreicht') && !message.includes('unterdr');
    }).length;
    assert.strictEqual(actualEventRolls, 0, 'No actual event rolls should trigger during catch-up mode');

    const deathOverlay = await page.$('#deathOverlay');
    const deathOverlayVisible = deathOverlay ? await deathOverlay.isVisible() : false;
    const plantIsDead = await page.evaluate(() => {
      let appState = window.state;
      if (!appState) {
        const storedState = localStorage.getItem('grow-sim-state-v2');
        if (storedState) {
          try {
            appState = JSON.parse(storedState);
          } catch (_error) {
            return true;
          }
        }
      }
      return Boolean(appState && appState.plant && appState.plant.isDead);
    });

    if (plantIsDead) {
      const dialogs = await page.$$('.open-menu-dialog');
      assert.strictEqual(dialogs.length, 1, 'Only one death/mission dialog should show if plant died during offline');
      assert.ok(deathOverlayVisible, 'Death overlay should be visible if plant died');
    } else {
      assert.strictEqual(deathOverlayVisible, false, 'Death overlay should not be visible if plant is not dead');
    }

    console.log('Offline event spam regression test passed');
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

runOfflineRegressionTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
