#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const {
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady,
  clearClientStorage: resetClientStorage
} = require('./support/browserRuntime');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const CLIENT_HOST = HOST;
let PORT = 0;
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function evaluateScenario(page, scenario) {
  return page.evaluate((input) => {
    const state = window.__gsState;
    const controls = typeof window.ensureEnvironmentControls === 'function'
      ? window.ensureEnvironmentControls(state)
      : (state.environmentControls || {});

    Object.assign(state.status, {
      health: 82,
      water: 68,
      nutrition: 62,
      stress: 14,
      risk: 12,
      growth: 38
    }, input.status || {});

    Object.assign(state.simulation, {
      isDaytime: true
    }, input.simulation || {});

    if (state.plant) {
      state.plant.stageIndex = Number.isFinite(Number(input.stageIndex)) ? Number(input.stageIndex) : 4;
    }

    Object.assign(controls, {
      temperatureC: 25,
      humidityPercent: 60,
      airflowPercent: 70,
      ph: 6.1,
      ec: 1.4
    }, input.controls || {});

    if (!controls.targets || typeof controls.targets !== 'object') {
      controls.targets = {};
    }
    if (!controls.targets.day || typeof controls.targets.day !== 'object') {
      controls.targets.day = {};
    }
    if (!controls.targets.night || typeof controls.targets.night !== 'object') {
      controls.targets.night = {};
    }
    if (!controls.fan || typeof controls.fan !== 'object') {
      controls.fan = {};
    }

    controls.targets.day.temperatureC = Number.isFinite(Number(input.controls && input.controls.temperatureC))
      ? Number(input.controls.temperatureC)
      : 25;
    controls.targets.day.humidityPercent = Number.isFinite(Number(input.controls && input.controls.humidityPercent))
      ? Number(input.controls.humidityPercent)
      : 60;
    controls.targets.day.vpdKpa = Number.isFinite(Number(input.controls && input.controls.dayVpdKpa))
      ? Number(input.controls.dayVpdKpa)
      : 1.15;
    controls.targets.night.temperatureC = Number.isFinite(Number(input.controls && input.controls.nightTemperatureC))
      ? Number(input.controls.nightTemperatureC)
      : 21;
    controls.targets.night.humidityPercent = Number.isFinite(Number(input.controls && input.controls.nightHumidityPercent))
      ? Number(input.controls.nightHumidityPercent)
      : 55;
    controls.targets.night.vpdKpa = Number.isFinite(Number(input.controls && input.controls.nightVpdKpa))
      ? Number(input.controls.nightVpdKpa)
      : 0.95;
    controls.fan.minPercent = Number.isFinite(Number(input.controls && input.controls.airflowPercent))
      ? Number(input.controls.airflowPercent)
      : 70;

    const diagnostics = window.GrowSimDiagnostics.computePlantDiagnostics(state);
    const hints = window.GrowSimDiagnostics.buildGuidanceHints(diagnostics);
    if (typeof window.renderHud === 'function') {
      window.renderHud();
    }

    const homeGuidancePanel = document.querySelector('#homeGuidancePanel');
    const homeGuidanceStyle = homeGuidancePanel ? window.getComputedStyle(homeGuidancePanel) : null;
    const homeGuidanceRect = homeGuidancePanel ? homeGuidancePanel.getBoundingClientRect() : { width: 0, height: 0 };

    return {
      primaryIssueId: diagnostics.primaryIssue ? diagnostics.primaryIssue.id : null,
      summary: diagnostics.summary,
      hints,
      homeHintCount: document.querySelectorAll('#homeGuidanceList .home-guidance-item').length,
      homeGuidanceVisible: Boolean(
        homeGuidancePanel
        && homeGuidanceStyle
        && homeGuidanceStyle.display !== 'none'
        && homeGuidanceStyle.visibility !== 'hidden'
        && homeGuidanceRect.width > 0
        && homeGuidanceRect.height > 0
      )
    };
  }, scenario);
}

async function main() {
  const { server, port: resolvedPort } = await startStaticServer(ROOT, HOST);
  PORT = Number(resolvedPort || 0);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    await setupAuthHarness(page, AUTH_TOKEN_KEY, {
      id: 'diagnostics-test-user',
      email: 'diagnostics@test.local',
      displayName: 'Diagnostics Test'
    });
    await page.goto(`http://${CLIENT_HOST}:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await waitForBootReady(page);

    const waterShortage = await evaluateScenario(page, {
      status: { water: 22, nutrition: 54, stress: 24, risk: 16, health: 78 }
    });
    assert.strictEqual(waterShortage.primaryIssueId, 'water_deficit', 'water shortage should be diagnosed as the primary limiter');
    assert.ok(waterShortage.hints.some((hint) => /Wasserversorgung|Stabilisieren/i.test(`${hint.title} ${hint.body}`)), 'water shortage should point toward stabilization of water uptake');

    const nutrientProblem = await evaluateScenario(page, {
      status: { water: 36, nutrition: 26, stress: 38, risk: 42, health: 60 }
    });
    assert.ok(
      ['nutrient_uptake_limited', 'nutrient_deficit', 'root_zone_pressure'].includes(nutrientProblem.primaryIssueId),
      'nutrient trouble should surface as deficit or uptake/root-zone pressure'
    );
    assert.ok(nutrientProblem.hints.some((hint) => /Aufnahme|Versorgung|Wurzelzone/i.test(hint.body)), 'nutrient trouble should explain uptake or root-zone limits');

    const climateProblem = await evaluateScenario(page, {
      controls: { temperatureC: 31.5, humidityPercent: 35, airflowPercent: 22, dayVpdKpa: 2.2, ph: 6.1, ec: 1.4 },
      status: { water: 60, nutrition: 58, stress: 32, risk: 26, health: 78 }
    });
    assert.strictEqual(climateProblem.primaryIssueId, 'climate_pressure', 'climate drift should show as a climate pressure diagnosis');
    assert.ok(climateProblem.hints.some((hint) => /Klima|Rhythmus|Umfeld/i.test(`${hint.title} ${hint.body}`)), 'climate trouble should point to the environment');

    const highStress = await evaluateScenario(page, {
      status: { water: 52, nutrition: 50, stress: 82, risk: 34, health: 52 }
    });
    assert.strictEqual(highStress.primaryIssueId, 'stress_load', 'heavy stress should be recognized as a direct load');
    assert.ok(highStress.hints.some((hint) => /Druck|stabilisieren/i.test(`${hint.title} ${hint.body}`)), 'high stress should explain that pressure needs to be reduced');

    const highRisk = await evaluateScenario(page, {
      status: { water: 60, nutrition: 58, stress: 36, risk: 84, health: 70 }
    });
    assert.strictEqual(highRisk.primaryIssueId, 'risk_exposure', 'high risk should surface as exposure rather than generic stress');
    assert.ok(highRisk.hints.some((hint) => /Risiko|Druck/i.test(`${hint.title} ${hint.body}`)), 'high risk should warn without panicking');

    const goodState = await evaluateScenario(page, {
      status: { water: 68, nutrition: 66, stress: 10, risk: 8, health: 90 }
    });
    assert.strictEqual(goodState.primaryIssueId, null, 'good state should not invent a crisis');
    assert.ok(goodState.hints.some((hint) => /Optimieren|Rhythmus/i.test(`${hint.title} ${hint.body}`)), 'good state may offer a light optimization direction');

    const stackedProblems = await evaluateScenario(page, {
      status: { water: 18, nutrition: 24, stress: 76, risk: 72, health: 42 },
      controls: { temperatureC: 30, humidityPercent: 38, airflowPercent: 28, dayVpdKpa: 2.0, ph: 6.5, ec: 2.1 }
    });
    assert.ok(stackedProblems.hints.length <= 3, 'guidance should stay capped at three hints');
    assert.strictEqual(stackedProblems.homeHintCount, 0, 'home HUD should not render guidance cards in the default homescreen');
    assert.strictEqual(stackedProblems.homeGuidanceVisible, false, 'home HUD guidance panel must not occupy visible homescreen space');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main()
  .then(() => {
    console.log('diagnostics guidance phase 6 tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


