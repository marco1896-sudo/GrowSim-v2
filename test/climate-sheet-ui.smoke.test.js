#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const {
  clearClientStorage,
  installAuthHarness: setupAuthHarness,
  waitForBoot
} = require('./support/browserRuntime');
const { closeBrowser, closeServer, startStaticServer } = require('./support/serverRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function startRun(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForBoot(page);
  await clearClientStorage(page, { preserveLocalStorageKeys: [AUTH_TOKEN_KEY] });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForBoot(page);
  await page.evaluate(() => window.onStartRun());
  await page.waitForFunction(() => window.__gsState && window.__gsState.run && window.__gsState.run.status === 'active');
  await page.waitForFunction(() => document.getElementById('landing')?.classList.contains('hidden'));
}

async function dismissIncidentalDialog(page) {
  await page.evaluate(() => {
    const dialog = document.getElementById('menuDialog');
    if (dialog && !dialog.classList.contains('hidden')) {
      dialog.classList.add('hidden');
      dialog.setAttribute('aria-hidden', 'true');
      dialog.style.display = 'none';
    }
  });
}

async function clickClimateStepper(page, key, direction) {
  await page.evaluate(({ stepKey, stepDirection }) => {
    const node = document.querySelector(`[data-env-step-key="${stepKey}"][data-env-step-dir="${stepDirection}"]`);
    if (node) node.click();
  }, { stepKey: key, stepDirection: String(direction) });
  await dismissIncidentalDialog(page);
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST, undefined, {
    defaultHeaders: { 'Cache-Control': 'no-store' }
  });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await setupAuthHarness(page, AUTH_TOKEN_KEY, {
    email: 'climate-sheet@test.local',
    displayName: 'Climate Sheet Test'
  });

  try {
    const url = `${baseUrl}/`;
    await startRun(page, url);

    await page.click('#homeClimateCard');
    await page.waitForFunction(() => {
      const sheet = document.getElementById('climateSheet');
      return Boolean(sheet && !sheet.classList.contains('hidden') && sheet.getAttribute('aria-hidden') === 'false');
    });

    const initialSheet = await page.evaluate(() => {
      const sheet = document.getElementById('climateSheet');
      const text = sheet ? sheet.textContent : '';
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return {
        text,
        hasPhInput: Boolean(document.getElementById('envCtrlPh')),
        hasEcInput: Boolean(document.getElementById('envCtrlEc')),
        hasPpfdInput: Boolean(document.getElementById('envCtrlPpfd')),
        overflow
      };
    });

    assert.strictEqual(initialSheet.hasPhInput, false, 'climate sheet should not contain pH controls');
    assert.strictEqual(initialSheet.hasEcInput, false, 'climate sheet should not contain EC controls');
    assert.strictEqual(initialSheet.hasPpfdInput, true, 'climate sheet should contain the PPFD target control');
    assert(!/Medium|Lösung|Loesung|\bpH\b|\bEC\b/.test(initialSheet.text), 'climate sheet should not show root-zone or nutrient solution copy');
    assert(initialSheet.overflow <= 1, 'iPhone viewport should not create horizontal page overflow');

    const before = await page.evaluate(() => ({
      temp: window.__gsState.environmentControls.targets.day.temperatureC,
      humidity: window.__gsState.environmentControls.targets.day.humidityPercent,
      ppfd: window.__gsState.environmentControls.light.ppfdTarget,
      vpdEnabled: window.__gsState.environmentControls.vpdTargetEnabled,
      dayVpd: window.__gsState.environmentControls.targets.day.vpdKpa,
      nightVpd: window.__gsState.environmentControls.targets.night.vpdKpa,
      minFan: window.__gsState.environmentControls.fan.minPercent,
      maxFan: window.__gsState.environmentControls.fan.maxPercent,
      transition: window.__gsState.environmentControls.transitionMinutes
    }));

    await clickClimateStepper(page, 'temperatureC', 1);
    await clickClimateStepper(page, 'humidityPercent', -1);
    await clickClimateStepper(page, 'ppfdTarget', 1);
    await clickClimateStepper(page, 'dayVpdKpa', 1);
    await clickClimateStepper(page, 'nightVpdKpa', -1);
    await clickClimateStepper(page, 'airflowPercent', 1);
    await clickClimateStepper(page, 'fanMaxPercent', -1);
    await clickClimateStepper(page, 'transitionMinutes', 1);
    await page.evaluate(() => document.getElementById('envCtrlVpdEnabled')?.click());

    const after = await page.evaluate(async () => {
      if (typeof persistState === 'function') {
        await persistState();
      }
      return {
        temp: window.__gsState.environmentControls.targets.day.temperatureC,
        humidity: window.__gsState.environmentControls.targets.day.humidityPercent,
        ppfd: window.__gsState.environmentControls.light.ppfdTarget,
        vpdEnabled: window.__gsState.environmentControls.vpdTargetEnabled,
        dayVpd: window.__gsState.environmentControls.targets.day.vpdKpa,
        nightVpd: window.__gsState.environmentControls.targets.night.vpdKpa,
        minFan: window.__gsState.environmentControls.fan.minPercent,
        maxFan: window.__gsState.environmentControls.fan.maxPercent,
        transition: window.__gsState.environmentControls.transitionMinutes
      };
    });

    assert.strictEqual(after.temp, before.temp + 0.5, 'day temperature stepper should update state');
    assert.strictEqual(after.humidity, before.humidity - 1, 'day humidity stepper should update state');
    assert.strictEqual(after.ppfd, before.ppfd + 25, 'PPFD target stepper should update persistent climate controls');
    assert.strictEqual(Number(after.dayVpd.toFixed(2)), Number((before.dayVpd + 0.05).toFixed(2)), 'day VPD stepper should update state');
    assert.strictEqual(Number(after.nightVpd.toFixed(2)), Number((before.nightVpd - 0.05).toFixed(2)), 'night VPD stepper should update state');
    assert.strictEqual(after.vpdEnabled, !before.vpdEnabled, 'VPD toggle should update state');
    assert(after.minFan >= before.minFan, 'min airflow stepper should keep working');
    assert(after.maxFan >= after.minFan, 'max airflow should not fall below min airflow');
    assert.strictEqual(after.transition, before.transition + 5, 'transition stepper should update state');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page);
    const reloadedPpfd = await page.evaluate(() => window.__gsState.environmentControls.light.ppfdTarget);
    assert.strictEqual(reloadedPpfd, after.ppfd, 'PPFD target should survive reload');

    console.log('climate-sheet-ui: all scenarios passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
