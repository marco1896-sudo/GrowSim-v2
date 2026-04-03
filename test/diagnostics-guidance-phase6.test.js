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
const PORT = 4178;
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
      res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
      res.end(data);
    });
  });
}

async function waitForBoot(page) {
  await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: 25000 });
}

async function installAuthHarness(page) {
  await page.addInitScript((tokenKey) => {
    localStorage.setItem(tokenKey, 'test-auth-token');
  }, AUTH_TOKEN_KEY);

  await page.route('https://api.growsimulator.tech/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'diagnostics-test-user',
            email: 'diagnostics@test.local',
            displayName: 'Diagnostics Test'
          }
        })
      });
      return;
    }

    if (url.pathname === '/api/save') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: request.method() === 'GET'
          ? JSON.stringify({ save: null })
          : JSON.stringify({ ok: true })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unhandled test route' })
    });
  });
}

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

    const homeHints = Array.from(document.querySelectorAll('#homeGuidanceList .home-guidance-item')).map((node) => ({
      title: (node.querySelector('.home-guidance-item__title') || {}).textContent || '',
      body: (node.querySelector('.home-guidance-item__body') || {}).textContent || ''
    }));

    return {
      primaryIssueId: diagnostics.primaryIssue ? diagnostics.primaryIssue.id : null,
      summary: diagnostics.summary,
      hints,
      homeHints
    };
  }, scenario);
}

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    await installAuthHarness(page);
    await page.goto(`http://${CLIENT_HOST}:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await waitForBoot(page);

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
    assert.ok(stackedProblems.homeHints.length <= 3, 'home HUD should also stay capped at three hints');
    assert.ok(stackedProblems.homeHints.length >= 1, 'home HUD should show at least one relevant hint in bad states');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
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
