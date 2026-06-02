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
const PILOT_EVENT_ID = 'indoor_dry_rootball';
const PILOT_OPTION_ID = 'stabilize';
const INSTANCE_ID = `evt_v2_real_visible_${PILOT_EVENT_ID}_001`;

function hasRawI18nKey(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (text.includes('${')) return true;
  return /^[a-z]+(\.[a-z0-9_-]+){1,}$/i.test(text);
}

async function openApp(page, baseUrl, cacheKey) {
  await page.goto(`${baseUrl}/?dev=1&gs_event_v2_dev_preview=unlock&real_visible_smoke=${cacheKey}`, {
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
  if (!landingVisible) {
    return false;
  }

  for (let index = 0; index < 8; index += 1) {
    const startVisible = await page.evaluate(() => {
      const start = document.getElementById('startRunBtn');
      return Boolean(start && !start.classList.contains('hidden') && start.getAttribute('aria-hidden') !== 'true');
    });
    if (startVisible) {
      await page.locator('#startRunBtn').click({ timeout: 10000, force: true });
      await page.waitForFunction(() => {
        const landing = document.getElementById('landing');
        return Boolean(window.__gsState && window.__gsState.setup)
          && (!landing || landing.classList.contains('hidden') || landing.getAttribute('aria-hidden') === 'true');
      }, null, { timeout: 10000 });
      await page.waitForFunction((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
          const saved = JSON.parse(raw);
          return Boolean(saved && saved.setup && saved.run && saved.run.status === 'active');
        } catch (_error) {
          return false;
        }
      }, STORAGE_KEY, { timeout: 10000 });
      return true;
    }
    await page.locator('#setupNextBtn').click({ timeout: 10000, force: true });
    await page.waitForTimeout(100);
  }

  throw new Error('Unable to start run through onboarding UI');
}

async function preparePilotStateViaDevTools(page) {
  await page.waitForFunction(() => {
    return typeof window.__seedEventV2PilotIndoorDryRootball === 'function'
      && typeof window.__resetEventV2Pilot === 'function'
      && typeof window.__getEventV2PilotState === 'function';
  }, null, { timeout: 10000 });

  const prep = await page.evaluate(({ instanceId }) => {
    const beforeReset = window.__getEventV2PilotState();
    const resetResult = window.__resetEventV2Pilot({ clearHistory: true, resetStatus: true });
    const afterReset = window.__getEventV2PilotState();
    const seedResult = window.__seedEventV2PilotIndoorDryRootball({ instanceId });
    const afterSeed = window.__getEventV2PilotState();
    return { beforeReset, resetResult, afterReset, seedResult, afterSeed };
  }, { instanceId: INSTANCE_ID });

  assert.strictEqual(prep.resetResult && prep.resetResult.ok, true, 'reset helper should succeed');
  assert.strictEqual(prep.seedResult && prep.seedResult.ok, true, 'seed helper should succeed');
  assert.strictEqual(prep.seedResult && prep.seedResult.eventId, PILOT_EVENT_ID, 'seed helper should target pilot event');
  assert.strictEqual(Array.isArray(prep.afterReset.openEvents), true, 'reset snapshot should expose open events');
  assert.strictEqual(prep.afterReset.openEvents.length, 0, 'reset should clear open events before seed');
  assert.strictEqual(Array.isArray(prep.afterSeed.openEvents), true, 'seed snapshot should expose open events');
  assert.strictEqual(prep.afterSeed.openEvents.length, 1, 'seed should create exactly one open event');
  assert.strictEqual(prep.afterSeed.openEvents[0].eventId, PILOT_EVENT_ID, 'seeded event should be the pilot event');

  return prep;
}

async function clickEventCenterButton(page) {
  await page.locator('#eventsActionBtn').click({ timeout: 10000, force: true });
  await page.waitForFunction(() => {
    const sheet = document.getElementById('eventSheet');
    const root = document.getElementById('eventSheetModernRoot');
    return Boolean(sheet && root && root.innerText && root.innerText.trim().length > 0);
  }, null, { timeout: 10000 });
}

async function inspectVisibleEventSheet(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.event-sheet-modern-card');
    const visual = document.querySelector('.event-sheet-modern-card .event-visual');
    const visualImage = document.querySelector('.event-sheet-modern-card .event-visual-image:not(.hidden)');
    const buttons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'));
    return {
      buildId: window.GrowSimBuild && window.GrowSimBuild.id ? String(window.GrowSimBuild.id) : '',
      openSheet: window.__gsState && window.__gsState.ui ? window.__gsState.ui.openSheet : null,
      title: document.querySelector('.event-sheet-modern__title')?.textContent || '',
      subtitle: document.querySelector('.figma-top-player-subtitle')?.textContent || '',
      sheetText: document.getElementById('eventSheetModernRoot')?.innerText || '',
      dataset: card ? { ...card.dataset } : {},
      visual: {
        kind: visual ? visual.getAttribute('data-kind') || '' : '',
        origin: visual ? visual.getAttribute('data-origin') || '' : '',
        src: visualImage ? visualImage.getAttribute('src') || '' : '',
      },
      optionButtons: buttons.map((button) => ({
        id: button.getAttribute('data-event-option-id') || '',
        text: button.textContent || '',
      })),
    };
  });
}

async function clickStabilize(page) {
  const clicked = await page.evaluate((optionId) => {
    const buttons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'));
    const button = buttons.find((entry) => entry.getAttribute('data-event-option-id') === optionId)
      || buttons.find((entry) => /stabilisieren|stabilize/i.test(entry.textContent || ''));
    if (!button) return false;
    button.click();
    return true;
  }, PILOT_OPTION_ID);
  assert.strictEqual(clicked, true, 'stabilize button should be clickable in visible sheet');
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
  const v1History = saved && saved.events && Array.isArray(saved.events.history) ? saved.events.history : [];
  const status = saved && saved.status && typeof saved.status === 'object' ? saved.status : {};
  return {
    openEventCount: openEvents.length,
    historyCount: history.length,
    matchingHistoryCount: matchingHistory.length,
    eventId: resolvedEntry ? resolvedEntry.eventId : null,
    selectedOption: resolvedEntry ? resolvedEntry.selectedOption : null,
    appliedDeltaStored: Boolean(resolvedEntry && resolvedEntry.appliedDelta && resolvedEntry.appliedDelta.applied === true),
    applyPreviewStored: Boolean(resolvedEntry && resolvedEntry.applyPreview && typeof resolvedEntry.applyPreview === 'object'),
    status: {
      stress: status.stress,
      risk: status.risk,
      water: status.water,
    },
    v1HistoryCount: v1History.length,
  };
}

function statusApproximatelyEqual(left, right, epsilon) {
  return ['stress', 'risk', 'water'].every((key) => {
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
    const cacheKey = Date.now();
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await installAuthHarness(page, AUTH_TOKEN_KEY);

    await openApp(page, serverRuntime.baseUrl, cacheKey);
    const startedRunViaUi = await ensureRunStartedViaUi(page);
    const prep = await preparePilotStateViaDevTools(page);
    const preparedState = await readStoredState(page);
    const initialV1HistoryCount = preparedState && preparedState.events && Array.isArray(preparedState.events.history)
      ? preparedState.events.history.length
      : 0;

    await clickEventCenterButton(page);
    const beforeResolveUi = await inspectVisibleEventSheet(page);
    const optionIds = beforeResolveUi.optionButtons.map((button) => button.id).filter(Boolean).sort();

    assert.strictEqual(beforeResolveUi.openSheet, 'event', 'real button should open the event sheet');
    assert.strictEqual(beforeResolveUi.dataset.eventSystem, 'v2', 'visible sheet should mark V2 event system');
    assert.strictEqual(beforeResolveUi.dataset.eventAuthority, 'v2', 'visible sheet should mark V2 authority');
    assert.strictEqual(beforeResolveUi.dataset.eventId, PILOT_EVENT_ID, 'visible sheet should mark pilot event id');
    assert.strictEqual(beforeResolveUi.title, 'Trockener Wurzelballen', 'visible sheet should show localized pilot title');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Behutsam stabilisieren'), true, 'visible sheet should show stabilize decision copy');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Substrat zuerst pruefen'), true, 'visible sheet should show inspect decision copy');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Sofort stark eingreifen'), true, 'visible sheet should show overreact decision copy');
    assert.strictEqual(beforeResolveUi.sheetText.includes('eventV2PilotActive'), false, 'visible sheet should not show raw machine-state key');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Indoor dry rootball'), false, 'visible sheet should not show raw english pilot title');
    assert.strictEqual(beforeResolveUi.sheetText.includes('The rootball is drying unevenly'), false, 'visible sheet should not show raw english pilot description');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Authority: V2 Pilot'), false, 'visible sheet should not show technical authority copy');
    assert.strictEqual(beforeResolveUi.sheetText.includes('V1 bleibt Legacy-Read-Fallback'), false, 'visible sheet should not show technical legacy fallback copy');
    assert.strictEqual(beforeResolveUi.subtitle.includes('Neues Ereignissystem aktiv'), true, 'visible sheet should expose player-facing V2 subtitle');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Autoritativ bleibt Legacy'), false, 'visible V2 sheet should not show legacy authority copy');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Abklingzeit aktiv'), false, 'visible V2 sheet should not show cooldown title');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Das Ereignissystem befindet sich in der Abklingzeit'), false, 'visible V2 sheet should not show cooldown text');
    assert.strictEqual(beforeResolveUi.sheetText.includes('LETZTE ANALYSE'), false, 'active V2 sheet should not show legacy history slot');
    assert.strictEqual(beforeResolveUi.visual.src.includes('event-overwatering'), false, 'visible V2 sheet should not show legacy overwatering image');
    assert.notStrictEqual(beforeResolveUi.visual.origin, 'legacy_active_image', 'visible V2 sheet should not use legacy visual origin');
    assert.deepStrictEqual(optionIds, ['inspect', 'overreact', 'stabilize'].sort(), 'visible V2 sheet should expose pilot options');
    assert.strictEqual(beforeResolveUi.optionButtons.some((button) => hasRawI18nKey(button.text)), false, 'pilot options should not expose raw i18n keys');

    await clickStabilize(page);
    await page.waitForFunction(({ key, instanceId }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      const eventV2 = saved && saved.eventV2;
      return Boolean(eventV2)
        && Array.isArray(eventV2.openEvents)
        && Array.isArray(eventV2.history)
        && eventV2.openEvents.length === 0
        && eventV2.history.some((entry) => entry && entry.instanceId === instanceId && entry.selectedOption === 'stabilize');
    }, { key: STORAGE_KEY, instanceId: INSTANCE_ID }, { timeout: 10000 });

    const afterResolveSummary = summarizeState(await readStoredState(page));
    assert.strictEqual(afterResolveSummary.openEventCount, 0, 'open events should be empty after resolve');
    assert.strictEqual(afterResolveSummary.matchingHistoryCount, 1, 'history should contain one resolved pilot entry');
    assert.strictEqual(afterResolveSummary.eventId, PILOT_EVENT_ID, 'history event id should match pilot');
    assert.strictEqual(afterResolveSummary.selectedOption, PILOT_OPTION_ID, 'history selected option should be stabilize');
    assert.strictEqual(afterResolveSummary.applyPreviewStored, true, 'history should contain applyPreview');
    assert.strictEqual(afterResolveSummary.appliedDeltaStored, true, 'history should contain appliedDelta');
    assert.strictEqual(afterResolveSummary.v1HistoryCount, initialV1HistoryCount, 'V1 should not write in parallel');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 20000);
    await ensureRunStartedViaUi(page);
    await clickEventCenterButton(page);
    const afterReloadSummary = summarizeState(await readStoredState(page));
    const afterReloadUi = await inspectVisibleEventSheet(page);

    assert.strictEqual(afterReloadSummary.openEventCount, 0, 'open events should stay empty after reload');
    assert.strictEqual(afterReloadSummary.matchingHistoryCount, 1, 'reload should not duplicate history');
    assert.strictEqual(afterReloadSummary.applyPreviewStored, true, 'applyPreview should persist after reload');
    assert.strictEqual(afterReloadSummary.appliedDeltaStored, true, 'appliedDelta should persist after reload');
    assert.strictEqual(statusApproximatelyEqual(afterReloadSummary.status, afterResolveSummary.status, 0.02), true, 'reload should not double-apply status delta');
    assert.strictEqual(afterReloadUi.dataset.eventSystem, 'v2', 'resolved history sheet should keep V2 marker after reload');
    assert.strictEqual(afterReloadUi.dataset.eventAuthority, 'v2', 'resolved history sheet should keep V2 authority after reload');
    assert.strictEqual(afterReloadUi.dataset.eventId, PILOT_EVENT_ID, 'resolved history sheet should keep pilot id after reload');

    const rawI18nKeysVisible = [
      beforeResolveUi.title,
      beforeResolveUi.subtitle,
      afterReloadUi.title,
      afterReloadUi.subtitle,
      ...beforeResolveUi.optionButtons.map((button) => button.text),
      ...afterReloadUi.optionButtons.map((button) => button.text),
    ].some(hasRawI18nKey);

    const summary = {
      ok: true,
      mode: 'event_center_v2_real_browser_visible_smoke',
      buildId: beforeResolveUi.buildId,
      startedRunViaUi,
      eventId: PILOT_EVENT_ID,
      selectedOption: PILOT_OPTION_ID,
      devHelpersAvailable: true,
      seedResultOk: prep.seedResult && prep.seedResult.ok === true,
      seededOpenEvents: prep.afterSeed.openEvents.length,
      realEventButtonPathUsed: true,
      visibleV2Sheet: beforeResolveUi.dataset.eventSystem === 'v2'
        && beforeResolveUi.dataset.eventAuthority === 'v2'
        && beforeResolveUi.dataset.eventId === PILOT_EVENT_ID,
      optionIds,
      forbiddenLegacyCopyVisible: beforeResolveUi.sheetText.includes('Autoritativ bleibt Legacy')
        || beforeResolveUi.sheetText.includes('Abklingzeit aktiv')
        || beforeResolveUi.sheetText.includes('Das Ereignissystem befindet sich in der Abklingzeit')
        || beforeResolveUi.sheetText.includes('LETZTE ANALYSE'),
      forbiddenLegacyVisualVisible: beforeResolveUi.visual.src.includes('event-overwatering')
        || beforeResolveUi.visual.origin === 'legacy_active_image',
      afterResolve: afterResolveSummary,
      afterReload: afterReloadSummary,
      rawI18nKeysVisible,
    };

    assert.strictEqual(summary.forbiddenLegacyCopyVisible, false, 'visible path should not contain legacy/cooldown copy');
    assert.strictEqual(summary.forbiddenLegacyVisualVisible, false, 'visible path should not contain legacy visual');
    assert.strictEqual(summary.rawI18nKeysVisible, false, 'visible path should not expose raw i18n keys');

    console.log(JSON.stringify(summary, null, 2));
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
