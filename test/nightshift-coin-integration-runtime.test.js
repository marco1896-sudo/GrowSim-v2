'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady
} = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

const HOUR_MS = 60 * 60 * 1000;

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

  try {
    await setupAuthHarness(page, AUTH_TOKEN_KEY, {
      id: 'nightshift-runtime-user',
      email: 'nightshift@test.local',
      displayName: 'Nightshift Runtime',
      token: 'nightshift-runtime-test'
    });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await waitForBootReady(page, 25000);

    const report = await page.evaluate(async ({ hourMs }) => {
      if (typeof window.onStartRun === 'function' && (!window.__gsState.run || window.__gsState.run.status !== 'active')) {
        window.onStartRun();
      }

      const setSimHour = (targetHour) => {
        const currentSim = Number(window.__gsState.simulation.simTimeMs) || Date.now();
        const shifted = new Date(currentSim);
        const currentHour = shifted.getHours();
        if (targetHour <= currentHour) {
          shifted.setDate(shifted.getDate() + 1);
        }
        shifted.setHours(targetHour, 0, 0, 0);
        window.setSimulationTimeMs(shifted.getTime(), Date.now(), {
          suppressLogs: true,
          reason: `nightshift_test_set_hour_${targetHour}`
        });
      };

      const setNightWindow = () => {
        setSimHour(23);
      };

      const setDayWindow = () => {
        setSimHour(12);
      };

      window.ensureCurrencyState(window.__gsState);
      setNightWindow();
      window.grantCoins(300, 'test_runtime', 'test:nightshift:initial_fund');

      const beforeCoins = window.getCoins();
      const beforeSimMs = Number(window.__gsState.simulation.simTimeMs) || 0;
      const eventRemainingBeforeMs = Math.max(
        0,
        (Number(window.__gsState.events && window.__gsState.events.scheduler && window.__gsState.events.scheduler.nextEventRealTimeMs) || Date.now()) - Date.now()
      );

      const [firstResult, secondResult] = await Promise.all([
        window.triggerRewardAction('night_shift', { openShopOnBlocked: false }),
        window.triggerRewardAction('night_shift', { openShopOnBlocked: false })
      ]);

      const afterCoins = window.getCoins();
      const afterSimMs = Number(window.__gsState.simulation.simTimeMs) || 0;
      await new Promise((resolve) => window.setTimeout(resolve, 1400));
      const afterWaitSimMs = Number(window.__gsState.simulation.simTimeMs) || 0;
      const eventRemainingAfterMs = Math.max(
        0,
        (Number(window.__gsState.events && window.__gsState.events.scheduler && window.__gsState.events.scheduler.nextEventRealTimeMs) || Date.now()) - Date.now()
      );

      const nightUsage = window.__gsState.rewardActions && window.__gsState.rewardActions.byType
        ? window.__gsState.rewardActions.byType.night_shift || {}
        : {};
      nightUsage.lastUsedAtMs = 0;
      nightUsage.lastExecutedAtMs = 0;
      nightUsage.lastTriggeredAtMs = 0;
      nightUsage.lastGrantedAtMs = 0;
      window.__gsState.rewardActions.byType.night_shift = nightUsage;

      setNightWindow();
      const coinsBeforeDrain = window.getCoins();
      if (coinsBeforeDrain > 0) {
        window.spendCoins(coinsBeforeDrain, 'test_runtime_drain');
      }
      const beforeNoCoinSimMs = Number(window.__gsState.simulation.simTimeMs) || 0;
      const noCoinResult = await window.triggerRewardAction('night_shift', { openShopOnBlocked: false });
      const afterNoCoinSimMs = Number(window.__gsState.simulation.simTimeMs) || 0;

      const boostRect = document.getElementById('boostActionBtn') && document.getElementById('boostActionBtn').getBoundingClientRect
        ? document.getElementById('boostActionBtn').getBoundingClientRect()
        : null;
      const nightRect = document.getElementById('skipNightActionBtn') && document.getElementById('skipNightActionBtn').getBoundingClientRect
        ? document.getElementById('skipNightActionBtn').getBoundingClientRect()
        : null;
      const nightNode = document.getElementById('skipNightActionBtn');
      const nightVisibleAtNight = nightNode ? !nightNode.classList.contains('hidden') : false;

      setDayWindow();
      if (typeof window.renderAll === 'function') {
        window.renderAll();
      }
      const nightVisibleAtDay = nightNode ? !nightNode.classList.contains('hidden') : false;

      return {
        beforeCoins,
        afterCoins,
        beforeSimMs,
        afterSimMs,
        afterWaitSimMs,
        eventRemainingBeforeMs,
        eventRemainingAfterMs,
        firstResult,
        secondResult,
        noCoinResult,
        beforeNoCoinSimMs,
        afterNoCoinSimMs,
        boostRect: boostRect ? { top: boostRect.top, left: boostRect.left, width: boostRect.width, height: boostRect.height } : null,
        nightRect: nightRect ? { top: nightRect.top, left: nightRect.left, width: nightRect.width, height: nightRect.height } : null,
        nightVisibleAtNight,
        nightVisibleAtDay
      };
    }, { hourMs: HOUR_MS });

    const okCount = [report.firstResult, report.secondResult].filter((entry) => entry && entry.ok === true).length;
    assert.strictEqual(okCount, 1, 'night shift spam should only execute once');
    assert.strictEqual(report.afterCoins, report.beforeCoins - 25, 'night shift should cost exactly 25 coins');
    assert(report.afterSimMs > report.beforeSimMs, 'night shift should advance simulation time');
    assert(report.afterWaitSimMs > report.afterSimMs, 'simulation time should keep running after night shift');
    assert(report.eventRemainingAfterMs < report.eventRemainingBeforeMs, 'event countdown should keep running after night shift');
    assert.strictEqual(report.noCoinResult && report.noCoinResult.ok, false, 'night shift should fail with missing coins');
    assert.strictEqual(report.noCoinResult && report.noCoinResult.reason, 'insufficient_coins', 'missing coins should report insufficient_coins');
    assert.strictEqual(report.afterNoCoinSimMs, report.beforeNoCoinSimMs, 'failed no-coin night shift must not advance time');
    assert.strictEqual(report.nightVisibleAtNight, true, 'night shift should be visible at night');
    assert.strictEqual(report.nightVisibleAtDay, false, 'night shift should be hidden during daytime');
    assert(report.nightRect && report.boostRect, 'night/boost action buttons should be present in DOM');
    assert(report.nightRect.top < report.boostRect.top, 'night shift icon should be above x24 boost icon');
    assert(Math.abs(report.nightRect.left - report.boostRect.left) <= 2, 'night shift and x24 should align in the same left stack');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main()
  .then(() => {
    console.log('nightshift coin integration runtime test passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
