#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const { chromium } = require('playwright');
const { closeBrowser, closeContext, closeServer, startStaticServer } = require('../test/support/serverRuntime');
const { installAuthHarness, waitForBoot } = require('../test/support/browserRuntime');

const ROOT = process.cwd();
const HOST = '127.0.0.1';
const STORAGE_KEY = 'grow-sim-state-v2';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token';
const EVENT_ID = 'shared_panic_watering_misread';
const OPTION_ID = 'check_weight_before_watering';
const INSTANCE_ID = `evt_v2_smoke_${EVENT_ID}_001`;

async function openApp(page, baseUrl, cacheKey) {
  await page.goto(`${baseUrl}/?dev=1&gs_event_v2_dev_preview=unlock&shared_pilot_smoke=${cacheKey}`, {
    waitUntil: 'domcontentloaded',
  });
  await waitForBoot(page, 20000);
  await page.waitForFunction(() => Boolean(window.GrowSimEventSystemRuntimeBridge), null, { timeout: 10000 });
}

async function ensureRunStartedViaUi(page) {
  const landingVisible = await page.evaluate(() => {
    const landing = document.getElementById('landing');
    if (!landing) return false;
    return !landing.classList.contains('hidden') && landing.getAttribute('aria-hidden') !== 'true';
  });
  if (!landingVisible) return false;

  for (let index = 0; index < 8; index += 1) {
    const startVisible = await page.evaluate(() => {
      const start = document.getElementById('startRunBtn');
      return Boolean(start && !start.classList.contains('hidden') && start.getAttribute('aria-hidden') !== 'true');
    });
    if (startVisible) {
      await page.locator('#startRunBtn').click({ timeout: 10000, force: true });
      await page.waitForFunction(() => Boolean(window.__gsState && window.__gsState.setup), null, { timeout: 10000 });
      return true;
    }
    await page.locator('#setupNextBtn').click({ timeout: 10000, force: true });
    await page.waitForTimeout(100);
  }
  throw new Error('Unable to start run through onboarding UI');
}

async function prepareSharedPilotStateViaDevTools(page) {
  await page.waitForFunction(() => {
    return typeof window.__seedEventV2PilotSharedPanicWateringMisread === 'function'
      && typeof window.__resetEventV2Pilot === 'function'
      && typeof window.__getEventV2PilotState === 'function';
  }, null, { timeout: 10000 });

  const prep = await page.evaluate(({ instanceId }) => {
    const resetResult = window.__resetEventV2Pilot({ clearHistory: true, resetStatus: true });
    const seedResult = window.__seedEventV2PilotSharedPanicWateringMisread({ instanceId });
    const afterSeed = window.__getEventV2PilotState();
    return { resetResult, seedResult, afterSeed };
  }, { instanceId: INSTANCE_ID });

  assert.strictEqual(prep.resetResult && prep.resetResult.ok, true, 'reset helper should succeed');
  assert.strictEqual(prep.seedResult && prep.seedResult.ok, true, 'shared seed helper should succeed');
  assert.strictEqual(prep.seedResult && prep.seedResult.eventId, EVENT_ID, 'seed helper should target shared pilot event');
  assert.strictEqual(Array.isArray(prep.afterSeed.openEvents), true, 'seed snapshot should expose open events');
  assert.strictEqual(prep.afterSeed.openEvents.length, 1, 'seed should create one open event');
  assert.strictEqual(prep.afterSeed.openEvents[0].eventId, EVENT_ID, 'seeded open event id should match shared pilot');
}

async function clickEventCenterButton(page) {
  await page.locator('#eventsActionBtn').click({ timeout: 10000, force: true });
  await page.waitForFunction(() => {
    const root = document.getElementById('eventSheetModernRoot');
    return Boolean(root && root.innerText && root.innerText.trim().length > 0);
  }, null, { timeout: 10000 });
}

async function inspectVisibleEventSheet(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.event-sheet-modern-card');
    const buttons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'));
    return {
      sheetText: document.getElementById('eventSheetModernRoot')?.innerText || '',
      dataset: card ? { ...card.dataset } : {},
      optionButtons: buttons.map((button) => ({
        id: button.getAttribute('data-event-option-id') || '',
        text: button.textContent || '',
      })),
    };
  });
}

async function clickOption(page, optionId) {
  const clicked = await page.evaluate((selected) => {
    const buttons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'));
    const button = buttons.find((entry) => entry.getAttribute('data-event-option-id') === selected);
    if (!button) return false;
    button.click();
    return true;
  }, optionId);
  assert.strictEqual(clicked, true, `${optionId} button should be clickable`);
}

async function readStoredState(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

function summarizeState(saved) {
  const eventV2 = saved && saved.eventV2 ? saved.eventV2 : {};
  const openEvents = Array.isArray(eventV2.openEvents) ? eventV2.openEvents : [];
  const history = Array.isArray(eventV2.history) ? eventV2.history : [];
  const matchingHistory = history.filter((entry) => entry && entry.instanceId === INSTANCE_ID);
  const resolvedEntry = matchingHistory[0] || null;
  const status = saved && saved.status && typeof saved.status === 'object' ? saved.status : {};
  const v1History = saved && saved.events && Array.isArray(saved.events.history) ? saved.events.history : [];

  return {
    openEventCount: openEvents.length,
    matchingHistoryCount: matchingHistory.length,
    eventId: resolvedEntry ? resolvedEntry.eventId : null,
    selectedOption: resolvedEntry ? resolvedEntry.selectedOption : null,
    applyPreviewStored: Boolean(resolvedEntry && resolvedEntry.applyPreview && typeof resolvedEntry.applyPreview === 'object'),
    appliedDeltaStored: Boolean(resolvedEntry && resolvedEntry.appliedDelta && typeof resolvedEntry.appliedDelta === 'object'),
    appliedDeltaApplied: Boolean(resolvedEntry && resolvedEntry.appliedDelta && resolvedEntry.appliedDelta.applied === true),
    appliedDeltaReason: resolvedEntry && resolvedEntry.appliedDelta ? String(resolvedEntry.appliedDelta.reason || '') : '',
    status: {
      stress: Number(status.stress),
      risk: Number(status.risk),
      water: Number(status.water),
    },
    v1HistoryCount: v1History.length,
  };
}

function nearlySameCoreStatus(left, right, epsilon) {
  return ['stress', 'risk'].every((key) => {
    const a = Number(left[key]);
    const b = Number(right[key]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a - b) <= epsilon;
  });
}

async function main() {
  const serverRuntime = await startStaticServer(ROOT, HOST, 0, {
    defaultHeaders: {
      'Cache-Control': 'no-store',
    },
  });
  let browser = null;
  let context = null;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await installAuthHarness(page, AUTH_TOKEN_KEY);

    await openApp(page, serverRuntime.baseUrl, Date.now());
    await ensureRunStartedViaUi(page);
    await prepareSharedPilotStateViaDevTools(page);
    const beforeResolveState = summarizeState(await readStoredState(page));
    const initialV1HistoryCount = beforeResolveState.v1HistoryCount;

    await clickEventCenterButton(page);
    const beforeResolveUi = await inspectVisibleEventSheet(page);
    const optionIds = beforeResolveUi.optionButtons.map((button) => button.id).filter(Boolean).sort();

    assert.strictEqual(beforeResolveUi.dataset.eventSystem, 'v2', 'sheet should mark event system v2');
    assert.strictEqual(beforeResolveUi.dataset.eventAuthority, 'v2', 'sheet should mark event authority v2');
    assert.strictEqual(beforeResolveUi.dataset.eventId, EVENT_ID, 'sheet should mark shared pilot event id');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Panikgiessen vermeiden'), true, 'sheet should show shared pilot copy');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Abklingzeit aktiv'), false, 'sheet should not show cooldown fallback');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Autoritativ bleibt Legacy'), false, 'sheet should not show legacy authority copy');
    assert.deepStrictEqual(
      optionIds,
      ['check_weight_before_watering', 'inspect_rootzone_then_wait', 'water_on_panic_signal'].sort(),
      'sheet should expose the three shared pilot options'
    );

    await clickOption(page, OPTION_ID);
    await page.waitForFunction(({ key, instanceId }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      const eventV2 = saved && saved.eventV2;
      return Boolean(eventV2)
        && Array.isArray(eventV2.openEvents)
        && eventV2.openEvents.length === 0
        && Array.isArray(eventV2.history)
        && eventV2.history.some((entry) => entry && entry.instanceId === instanceId && entry.selectedOption === 'check_weight_before_watering');
    }, { key: STORAGE_KEY, instanceId: INSTANCE_ID }, { timeout: 10000 });

    const afterResolve = summarizeState(await readStoredState(page));
    assert.strictEqual(afterResolve.openEventCount, 0, 'open events should be empty after resolve');
    assert.strictEqual(afterResolve.matchingHistoryCount, 1, 'history should contain one resolved shared pilot entry');
    assert.strictEqual(afterResolve.eventId, EVENT_ID, 'history event id should match shared pilot');
    assert.strictEqual(afterResolve.selectedOption, OPTION_ID, 'history selected option should match selected branch');
    assert.strictEqual(afterResolve.applyPreviewStored, true, 'history should store applyPreview');
    assert.strictEqual(afterResolve.appliedDeltaStored, true, 'history should store appliedDelta');
    assert.strictEqual(afterResolve.appliedDeltaApplied, false, 'shared pilot should not apply status delta');
    assert.strictEqual(afterResolve.appliedDeltaReason, 'diagnostic_weight_check', 'shared pilot should report diagnostic no-delta reason');
    assert.strictEqual(nearlySameCoreStatus(afterResolve.status, beforeResolveState.status, 0.05), true, 'stress/risk should stay effectively unchanged for no-delta shared pilot');
    assert.strictEqual(afterResolve.v1HistoryCount, initialV1HistoryCount, 'V1 should not write in parallel');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 20000);
    await ensureRunStartedViaUi(page);
    await clickEventCenterButton(page);
    const afterReload = summarizeState(await readStoredState(page));
    assert.strictEqual(afterReload.openEventCount, 0, 'open events should stay empty after reload');
    assert.strictEqual(afterReload.matchingHistoryCount, 1, 'reload should not duplicate shared pilot history');
    assert.strictEqual(afterReload.appliedDeltaApplied, false, 'no-delta branch should stay no-delta after reload');
    assert.strictEqual(nearlySameCoreStatus(afterReload.status, afterResolve.status, 0.05), true, 'reload should keep stress/risk effectively unchanged');

    console.log(JSON.stringify({
      ok: true,
      mode: 'event_center_v2_shared_panic_watering_pilot_smoke',
      eventId: EVENT_ID,
      selectedOption: OPTION_ID,
      optionIds,
      afterResolve,
      afterReload,
      v1DidNotWriteParallel: afterResolve.v1HistoryCount === initialV1HistoryCount,
      reloadIdempotent: afterReload.matchingHistoryCount === 1,
    }, null, 2));
  } finally {
    await closeContext(context);
    await closeBrowser(browser);
    await closeServer(serverRuntime.server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
