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
const PORT = 4181;
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
            id: 'ui-feedback-user',
            email: 'feedback@test.local',
            displayName: 'Feedback Test'
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

async function waitForBoot(page) {
  await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: 25000 });
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

    const baseline = await page.evaluate(() => {
      Object.assign(window.__gsState.status, {
        health: 90,
        water: 70,
        nutrition: 66,
        growth: 40,
        stress: 12,
        risk: 10
      });
      window.__gsState.simulation.growthImpulse = 1.22;
      window.renderHud();

      const growthRing = document.getElementById('growthRing');
      const stressRing = document.getElementById('stressRing');
      const plantImage = document.getElementById('plantImage');
      return {
        growthVisual: growthRing ? growthRing.dataset.growthVisual : '',
        stressVisual: stressRing ? stressRing.dataset.stressVisual : '',
        plantGrowthVisual: plantImage ? plantImage.dataset.growthVisual : ''
      };
    });

    assert.ok(['steady', 'boosted'].includes(baseline.growthVisual), 'good growth should produce an active visual growth state');
    assert.strictEqual(baseline.stressVisual, 'calm', 'good state should keep stress visuals calm');
    assert.ok(['steady', 'boosted'].includes(baseline.plantGrowthVisual), 'plant image should mirror the growth visual state');

    const stressRiskState = await page.evaluate(() => {
      Object.assign(window.__gsState.status, {
        health: 58,
        water: 52,
        nutrition: 48,
        growth: 18,
        stress: 84,
        risk: 78
      });
      window.__gsState.simulation.growthImpulse = 0.34;
      window.renderHud();

      const stressRing = document.getElementById('stressRing');
      const riskRing = document.getElementById('riskRing');
      const plantImage = document.getElementById('plantImage');
      const freshHints = document.querySelectorAll('.home-guidance-item--fresh').length;
      return {
        stressVisual: stressRing ? stressRing.dataset.stressVisual : '',
        riskVisual: riskRing ? riskRing.dataset.riskVisual : '',
        plantStressVisual: plantImage ? plantImage.dataset.stressVisual : '',
        freshHints
      };
    });

    assert.ok(['high', 'critical'].includes(stressRiskState.stressVisual), 'high stress should activate visible stress motion');
    assert.ok(['high', 'critical'].includes(stressRiskState.riskVisual), 'high risk should activate visible risk motion');
    assert.ok(['high', 'critical'].includes(stressRiskState.plantStressVisual), 'plant image should reflect stressed state');
    assert.ok(stressRiskState.freshHints >= 1, 'new important guidance should be briefly highlighted');

    const animatedWater = await page.evaluate(async () => {
      Object.assign(window.__gsState.status, {
        health: 80,
        water: 74,
        nutrition: 64,
        growth: 35,
        stress: 18,
        risk: 14
      });
      window.__gsState.simulation.growthImpulse = 0.98;
      window.renderHud();

      await new Promise((resolve) => setTimeout(resolve, 60));

      window.__gsState.status.water = 28;
      window.renderHud();

      const waterRing = document.getElementById('waterRing');
      const waterValue = document.getElementById('waterValue');
      const immediate = {
        animating: waterRing ? waterRing.dataset.animating : '',
        text: waterValue ? waterValue.textContent : ''
      };

      await new Promise((resolve) => setTimeout(resolve, 700));

      return {
        immediate,
        settled: {
          animating: waterRing ? waterRing.dataset.animating : '',
          text: waterValue ? waterValue.textContent : ''
        }
      };
    });

    assert.strictEqual(animatedWater.immediate.animating, 'true', 'status changes should interpolate instead of hard jumping');
    assert.strictEqual(animatedWater.settled.animating, 'false', 'status interpolation should settle after a short duration');
    assert.strictEqual(animatedWater.settled.text, '28', 'status interpolation should land on the requested value');

    const actionFeedback = await page.evaluate(() => {
      Object.assign(window.__gsState.status, {
        health: 76,
        water: 58,
        nutrition: 55,
        growth: 32,
        stress: 22,
        risk: 18
      });
      window.__gsState.ui.care.selectedCategory = 'watering';
      window.__gsState.ui.care.selectedActionId = 'watering_low_mist';
      window.renderCareSheet(true);
      window.onCareExecuteAction();

      const executeButton = document.getElementById('careExecuteButton');
      const feedback = document.getElementById('careFeedback');
      return {
        buttonClass: executeButton ? executeButton.className : '',
        feedbackClass: feedback ? feedback.className : ''
      };
    });

    assert.ok(/care-execute-btn--impact-low/.test(actionFeedback.buttonClass), 'low care action should trigger a subtle impact pulse');
    assert.ok(/care-feedback--fresh/.test(actionFeedback.feedbackClass), 'care feedback should softly refresh after action execution');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main()
  .then(() => {
    console.log('ui feedback phase 7 tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
