const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const { installAuthHarness: setupAuthHarness } = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
let APP_URL = '';
const LS_STATE_KEY = 'grow-sim-state-v2';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function waitForRuntime(page) {
  await page.waitForFunction(() => {
    return window.__gsBootOk === true
      && window.__gsState
      && window.__gsState.simulation
      && window.__gsState.environmentControls
      && window.__gsState.climate
      && window.__gsState.events;
  });
}

async function clearPersistence(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.evaluate(async (stateKey) => {
    localStorage.removeItem(stateKey);
    if (typeof indexedDB !== 'undefined') {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('grow-sim-db');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    }
  }, LS_STATE_KEY);
}

async function startFreshRun(page) {
  await clearPersistence(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#landing:not(.hidden)');
  await page.click('#startRunBtn');
  await page.waitForFunction(() => {
    const node = document.getElementById('landing');
    return Boolean(node && node.classList.contains('hidden'));
  });
  await waitForRuntime(page);
  await page.waitForTimeout(1200);
}

async function scenarioImmediateClimateRuntimeSync(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    const before = {
      simTimeMs: Number(window.__gsState.simulation.simTimeMs || 0),
      tickCount: Number(window.__gsState.simulation.tickCount || 0),
      machineState: String(window.__gsState.events.machineState || ''),
      demand: JSON.parse(JSON.stringify(window.__gsState.climate.runtime.controlDemand || {})),
      targets: {
        exhaust: Number(window.__gsState.climate.devices?.exhaust?.targetPercent || 0),
        heater: Number(window.__gsState.climate.devices?.heater?.targetPercent || 0),
        humidifier: Number(window.__gsState.climate.devices?.humidifier?.targetPercent || 0),
        dehumidifier: Number(window.__gsState.climate.devices?.dehumidifier?.targetPercent || 0)
      }
    };

    onEnvironmentControlInput('vpdTargetEnabled', true);
    onEnvironmentControlInput('temperatureC', 27.5);
    onEnvironmentControlInput('humidityPercent', 52);
    onEnvironmentControlInput('dayVpdKpa', 1.48);
    onEnvironmentControlInput('nightVpdKpa', 0.92);
    onEnvironmentControlInput('fanMaxPercent', 88);

    return {
      before,
      after: {
        simTimeMs: Number(window.__gsState.simulation.simTimeMs || 0),
        tickCount: Number(window.__gsState.simulation.tickCount || 0),
        machineState: String(window.__gsState.events.machineState || ''),
        controls: JSON.parse(JSON.stringify(window.__gsState.environmentControls)),
        demand: JSON.parse(JSON.stringify(window.__gsState.climate.runtime.controlDemand || {})),
        targets: {
          exhaust: Number(window.__gsState.climate.devices?.exhaust?.targetPercent || 0),
          heater: Number(window.__gsState.climate.devices?.heater?.targetPercent || 0),
          humidifier: Number(window.__gsState.climate.devices?.humidifier?.targetPercent || 0),
          dehumidifier: Number(window.__gsState.climate.devices?.dehumidifier?.targetPercent || 0)
        },
        ui: {
          vpdEnabled: String(document.getElementById('envCtrlVpdEnabledOut')?.textContent || ''),
          dayVpd: String(document.getElementById('envCtrlDayVpdOut')?.textContent || ''),
          temp: String(document.getElementById('envCtrlTempOut')?.textContent || '')
        }
      }
    };
  });

  assert.strictEqual(result.after.controls.vpdTargetEnabled, true, 'VPD toggle should be committed');
  assert.strictEqual(result.after.controls.targets.day.temperatureC, 27.5, 'day temperature should be committed');
  assert.strictEqual(result.after.controls.targets.day.humidityPercent, 52, 'day humidity should be committed');
  assert.strictEqual(result.after.controls.targets.day.vpdKpa, 1.48, 'day VPD target should be committed');
  assert.strictEqual(result.after.controls.targets.night.vpdKpa, 0.92, 'night VPD target should be committed');
  assert.strictEqual(result.after.demand.targetTemperatureC, 27.5, 'runtime demand should immediately use the new day temperature target');
  assert.strictEqual(result.after.demand.targetHumidityPercent, 52, 'runtime demand should immediately use the new day humidity target');
  assert.strictEqual(result.after.demand.targetVpdKpa, 1.48, 'runtime demand should immediately use the new day VPD target');
  assert.notDeepStrictEqual(result.after.targets, result.before.targets, 'device targets should be recomputed immediately after control input');
  assert.strictEqual(result.after.simTimeMs, result.before.simTimeMs, 'climate runtime sync must not advance simulation time');
  assert.strictEqual(result.after.tickCount, result.before.tickCount, 'climate runtime sync must not increment tick count');
  assert.strictEqual(result.after.machineState, result.before.machineState, 'climate runtime sync must not trigger event state changes');
  assert.strictEqual(result.after.ui.vpdEnabled, 'An', 'UI should reflect the committed VPD toggle');
  assert.strictEqual(result.after.ui.dayVpd, '1.48 kPa', 'UI should reflect the committed day VPD target');
  assert.strictEqual(result.after.ui.temp, '27.5°C', 'UI should reflect the committed day temperature target');
}

async function scenarioReloadPreservesActiveVpdTargets(page) {
  await startFreshRun(page);
  await page.evaluate(async () => {
    onEnvironmentControlInput('vpdTargetEnabled', true);
    onEnvironmentControlInput('temperatureC', 27.5);
    onEnvironmentControlInput('humidityPercent', 52);
    onEnvironmentControlInput('dayVpdKpa', 1.48);
    onEnvironmentControlInput('nightVpdKpa', 0.92);
    onEnvironmentControlInput('fanMaxPercent', 88);
    if (typeof persistState === 'function') {
      await persistState();
    }
  });

  await page.reload({ waitUntil: 'networkidle' });
  await waitForRuntime(page);

  const result = await page.evaluate(() => ({
    controls: JSON.parse(JSON.stringify(window.__gsState.environmentControls)),
    demand: JSON.parse(JSON.stringify(window.__gsState.climate.runtime.controlDemand || {})),
    ui: {
      vpdEnabled: String(document.getElementById('envCtrlVpdEnabledOut')?.textContent || ''),
      dayVpd: String(document.getElementById('envCtrlDayVpdOut')?.textContent || ''),
      nightVpd: String(document.getElementById('envCtrlNightVpdOut')?.textContent || '')
    }
  }));

  assert.strictEqual(result.controls.vpdTargetEnabled, true, 'reload should preserve active VPD mode');
  assert.strictEqual(result.controls.targets.day.vpdKpa, 1.48, 'reload should preserve the day VPD target');
  assert.strictEqual(result.controls.targets.night.vpdKpa, 0.92, 'reload should preserve the night VPD target');
  assert.strictEqual(result.demand.targetTemperatureC, 27.5, 'reload runtime should use the persisted day temperature target');
  assert.strictEqual(result.demand.targetHumidityPercent, 52, 'reload runtime should use the persisted day humidity target');
  assert.strictEqual(result.demand.targetVpdKpa, 1.48, 'reload runtime should use the persisted day VPD target');
  assert.strictEqual(result.ui.vpdEnabled, 'An', 'reload UI should show the persisted VPD toggle');
  assert.strictEqual(result.ui.dayVpd, '1.48 kPa', 'reload UI should show the persisted day VPD target');
  assert.strictEqual(result.ui.nightVpd, '0.92 kPa', 'reload UI should show the persisted night VPD target');
}

async function scenarioResumeKeepsClimateTargetsAuthoritative(page) {
  await startFreshRun(page);
  const result = await page.evaluate(() => {
    onEnvironmentControlInput('vpdTargetEnabled', true);
    onEnvironmentControlInput('temperatureC', 27.5);
    onEnvironmentControlInput('humidityPercent', 52);
    onEnvironmentControlInput('dayVpdKpa', 1.48);

    const before = {
      simTimeMs: Number(window.__gsState.simulation.simTimeMs || 0),
      controls: JSON.parse(JSON.stringify(window.__gsState.environmentControls)),
      demand: JSON.parse(JSON.stringify(window.__gsState.climate.runtime.controlDemand || {}))
    };

    const resumeNowMs = Date.now() + (10 * 60 * 1000);
    window.__gsState.simulation.lastTickRealTimeMs = Date.now() - (10 * 60 * 1000);
    syncSimulationFromElapsedTime(resumeNowMs);

    return {
      before,
      after: {
        simTimeMs: Number(window.__gsState.simulation.simTimeMs || 0),
        controls: JSON.parse(JSON.stringify(window.__gsState.environmentControls)),
        demand: JSON.parse(JSON.stringify(window.__gsState.climate.runtime.controlDemand || {}))
      }
    };
  });

  assert.strictEqual(result.after.controls.vpdTargetEnabled, true, 'resume should keep VPD mode active');
  assert.strictEqual(result.after.controls.targets.day.temperatureC, 27.5, 'resume should keep the day temperature target');
  assert.strictEqual(result.after.controls.targets.day.humidityPercent, 52, 'resume should keep the day humidity target');
  assert.strictEqual(result.after.controls.targets.day.vpdKpa, 1.48, 'resume should keep the day VPD target');
  assert.strictEqual(result.after.demand.targetTemperatureC, 27.5, 'resume runtime should still target the day temperature');
  assert.strictEqual(result.after.demand.targetHumidityPercent, 52, 'resume runtime should still target the day humidity');
  assert.strictEqual(result.after.demand.targetVpdKpa, 1.48, 'resume runtime should still target the day VPD');
  assert(result.after.simTimeMs > result.before.simTimeMs, 'resume path should still advance simulation time');
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST, undefined, {
    defaultHeaders: { 'Cache-Control': 'no-store' }
  });
  APP_URL = `${baseUrl}/`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  await setupAuthHarness(page, AUTH_TOKEN_KEY, {
    email: 'climate-sync@test.local',
    displayName: 'Climate Sync Test'
  });

  try {
    await scenarioImmediateClimateRuntimeSync(page);
    await scenarioReloadPreservesActiveVpdTargets(page);
    await scenarioResumeKeepsClimateTargetsAuthoritative(page);
    console.log('climate-runtime-sync: all scenarios passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
