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
const INSTANCE_ID = `evt_v2_browser_reload_${PILOT_EVENT_ID}_001`;

function hasRawI18nKey(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (text.includes('${')) return true;
  return /^[a-z]+(\.[a-z0-9_-]+){1,}$/i.test(text);
}

async function readStoredState(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

async function openApp(page, baseUrl, cacheKey) {
  await page.goto(`${baseUrl}/?dev=1&gs_event_v2_dev_preview=unlock&event_v2_reload_smoke=${cacheKey}`, {
    waitUntil: 'domcontentloaded',
  });
  await waitForBoot(page, 20000);
  await page.waitForFunction(() => Boolean(window.GrowSimEventSystemRuntimeBridge), null, { timeout: 10000 });
}

async function openEventCenter(page) {
  await page.evaluate(() => {
    if (typeof window.openSheet === 'function') {
      window.openSheet('event');
      return;
    }
    if (window.__gsState && window.__gsState.ui) {
      window.__gsState.ui.openSheet = 'event';
    }
    if (typeof window.renderAll === 'function') {
      window.renderAll();
    }
  });
}

async function preparePilotStateViaDevTools(page) {
  await page.waitForFunction(() => {
    return typeof window.__seedEventV2PilotIndoorDryRootball === 'function'
      && typeof window.__resetEventV2Pilot === 'function'
      && typeof window.__getEventV2PilotState === 'function';
  }, null, { timeout: 10000 });

  const prep = await page.evaluate(({ eventId, instanceId }) => {
    const resetResult = window.__resetEventV2Pilot({ clearHistory: true, resetStatus: true });
    const seedResult = window.__seedEventV2PilotIndoorDryRootball({ instanceId });
    const snapshot = window.__getEventV2PilotState();
    return { resetResult, seedResult, snapshot, eventId };
  }, {
    eventId: PILOT_EVENT_ID,
    instanceId: INSTANCE_ID
  });

  assert.strictEqual(prep.resetResult && prep.resetResult.ok, true, 'reset helper should succeed');
  assert.strictEqual(prep.seedResult && prep.seedResult.ok, true, 'seed helper should succeed');
  assert.strictEqual(prep.seedResult && prep.seedResult.eventId, PILOT_EVENT_ID, 'seed helper should target pilot event');
  assert.strictEqual(prep.snapshot && prep.snapshot.ok, true, 'snapshot helper should succeed');
  assert.strictEqual(Array.isArray(prep.snapshot.openEvents), true, 'snapshot should expose openEvents');
  assert.strictEqual(prep.snapshot.openEvents.length, 1, 'snapshot should report exactly one open event after seed');
  assert.strictEqual(prep.snapshot.openEvents[0].eventId, PILOT_EVENT_ID, 'snapshot open event should match pilot id');

  return prep;
}

async function inspectEventCenter(page) {
  return page.evaluate(() => {
    const title = document.querySelector('.event-sheet-modern__title')?.textContent || document.getElementById('eventTitle')?.textContent || '';
    const description = document.querySelector('.event-sheet-modern__text')?.textContent || document.getElementById('eventText')?.textContent || '';
    const meta = document.querySelector('.event-sheet-modern__meta')?.textContent || document.getElementById('eventMeta')?.textContent || '';
    const subtitle = document.querySelector('.figma-top-player-subtitle')?.textContent || '';
    const badge = document.querySelector('.sheet-badge')?.textContent || '';
    const card = document.querySelector('.event-sheet-modern-card');
    const visual = document.querySelector('.event-sheet-modern-card .event-visual');
    const visualImage = document.querySelector('.event-sheet-modern-card .event-visual-image:not(.hidden)');
    const optionButtons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button')).map((button) => ({
      id: button.getAttribute('data-event-option-id') || '',
      text: button.textContent || '',
    }));
    return {
      title,
      description,
      meta,
      subtitle,
      badge,
      sheetText: document.getElementById('eventSheetModernRoot')?.innerText || '',
      dataset: card ? { ...card.dataset } : {},
      visual: {
        kind: visual ? visual.getAttribute('data-kind') || '' : '',
        origin: visual ? visual.getAttribute('data-origin') || '' : '',
        src: visualImage ? visualImage.getAttribute('src') || '' : '',
      },
      optionButtons,
    };
  });
}

async function waitForPilotOptions(page) {
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'));
    return buttons.some((button) => button.getAttribute('data-event-option-id') === 'stabilize' || /stabilisieren|stabilize/i.test(button.textContent || ''));
  }, null, { timeout: 10000 });
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
  assert.strictEqual(clicked, true, 'stabilize button should be clickable');
}

async function waitForResolvedStorage(page) {
  await page.waitForFunction(({ key, instanceId }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    const eventV2 = saved && saved.eventV2;
    if (!eventV2 || !Array.isArray(eventV2.openEvents) || !Array.isArray(eventV2.history)) return false;
    return eventV2.openEvents.length === 0
      && eventV2.history.some((entry) => entry && entry.instanceId === instanceId && entry.selectedOption === 'stabilize');
  }, {
    key: STORAGE_KEY,
    instanceId: INSTANCE_ID,
  }, { timeout: 10000 });
}

function summarizeResolvedState(saved) {
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
    applyPreviewStored: Boolean(resolvedEntry && resolvedEntry.applyPreview && typeof resolvedEntry.applyPreview === 'object'),
    mutationPreviewCount: resolvedEntry && resolvedEntry.applyPreview && Array.isArray(resolvedEntry.applyPreview.mutationPreview)
      ? resolvedEntry.applyPreview.mutationPreview.length
      : 0,
    appliedDeltaStored: Boolean(resolvedEntry && resolvedEntry.appliedDelta && resolvedEntry.appliedDelta.applied === true),
    appliedDeltaCount: resolvedEntry && resolvedEntry.appliedDelta && Array.isArray(resolvedEntry.appliedDelta.deltas)
      ? resolvedEntry.appliedDelta.deltas.length
      : 0,
    status: {
      health: status.health,
      stress: status.stress,
      risk: status.risk,
      water: status.water,
    },
    v1HistoryCount: v1History.length,
  };
}

function statusChangedWithinPilotScope(before, after) {
  if (!before || !after) return false;
  return ['stress', 'risk', 'water'].some((key) => after[key] !== before[key]);
}

function statusWithinBounds(status) {
  return ['health', 'stress', 'risk', 'water'].every((key) => {
    if (!Object.prototype.hasOwnProperty.call(status, key)) return true;
    const value = Number(status[key]);
    return Number.isFinite(value) && value >= 0 && value <= 100;
  });
}

function statusApproximatelyEqual(left, right, epsilon) {
  return ['health', 'stress', 'risk', 'water'].every((key) => {
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
    const prep = await preparePilotStateViaDevTools(page);
    const preparedState = await readStoredState(page);
    const initialV1HistoryCount = preparedState && preparedState.events && Array.isArray(preparedState.events.history)
      ? preparedState.events.history.length
      : 0;
    const initialStatus = preparedState && preparedState.status && typeof preparedState.status === 'object'
      ? preparedState.status
      : {};
    await openEventCenter(page);
    await waitForPilotOptions(page);
    const beforeResolveUi = await inspectEventCenter(page);

    assert.strictEqual(beforeResolveUi.title, 'Trockener Wurzelballen', 'Event Center should show V2 pilot title');
    assert.strictEqual(beforeResolveUi.dataset.eventSystem, 'v2', 'V2 pilot should mark event system as v2');
    assert.strictEqual(beforeResolveUi.dataset.eventId, PILOT_EVENT_ID, 'V2 pilot should expose internal event id marker');
    assert.strictEqual(beforeResolveUi.dataset.eventAuthority, 'v2', 'V2 pilot should mark V2 as authority');
    assert.strictEqual(beforeResolveUi.subtitle.includes('Autoritativ bleibt Legacy'), false, 'V2 pilot should not show legacy authoritative subtitle');
    assert.strictEqual(beforeResolveUi.sheetText.includes('eventV2PilotActive'), false, 'V2 pilot should not show raw machine-state key');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Indoor dry rootball'), false, 'V2 pilot should not show english title');
    assert.strictEqual(beforeResolveUi.sheetText.includes('The rootball is drying unevenly'), false, 'V2 pilot should not show english description');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Authority: V2 Pilot'), false, 'V2 pilot should not show technical authority text');
    assert.strictEqual(beforeResolveUi.sheetText.includes('V1 bleibt Legacy-Read-Fallback'), false, 'V2 pilot should not show technical legacy text');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Behutsam stabilisieren'), true, 'V2 pilot should show localized stabilize option');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Substrat zuerst pruefen'), true, 'V2 pilot should show localized inspect option');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Sofort stark eingreifen'), true, 'V2 pilot should show localized overreact option');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Abklingzeit aktiv'), false, 'V2 pilot should not show cooldown title');
    assert.strictEqual(beforeResolveUi.sheetText.includes('Das Ereignissystem befindet sich in der Abklingzeit'), false, 'V2 pilot should not show cooldown fallback text');
    assert.strictEqual(beforeResolveUi.visual.src.includes('event-overwatering'), false, 'V2 pilot should not reuse legacy overwatering visual');
    assert.notStrictEqual(beforeResolveUi.visual.origin, 'legacy_active_image', 'V2 pilot should not use legacy active image origin');
    const optionIds = beforeResolveUi.optionButtons.map((button) => button.id).filter(Boolean).sort();
    assert.deepStrictEqual(optionIds, ['inspect', 'overreact', 'stabilize'].sort(), 'Event Center should expose exactly the pilot options');
    assert.strictEqual(beforeResolveUi.optionButtons.some((button) => hasRawI18nKey(button.text)), false, 'Pilot option labels should not expose raw i18n keys');
    assert.strictEqual(hasRawI18nKey(beforeResolveUi.title), false, 'Pilot title should not expose raw i18n key');

    await clickStabilize(page);
    await waitForResolvedStorage(page);
    const afterResolveState = await readStoredState(page);
    const afterResolveSummary = summarizeResolvedState(afterResolveState);

    assert.strictEqual(afterResolveSummary.openEventCount, 0, 'eventV2.openEvents should be empty after resolve');
    assert.strictEqual(afterResolveSummary.matchingHistoryCount, 1, 'history should contain exactly one resolved pilot entry after resolve');
    assert.strictEqual(afterResolveSummary.eventId, PILOT_EVENT_ID, 'resolved eventId should match pilot event');
    assert.strictEqual(afterResolveSummary.selectedOption, PILOT_OPTION_ID, 'resolved selectedOption should be stabilize');
    assert.strictEqual(afterResolveSummary.applyPreviewStored, true, 'applyPreview should be stored');
    assert.strictEqual(afterResolveSummary.appliedDeltaStored, true, 'appliedDelta should be stored after stabilize');
    assert(afterResolveSummary.appliedDeltaCount >= 1, 'appliedDelta should contain at least one delta');
    assert.strictEqual(
      statusChangedWithinPilotScope(initialStatus, afterResolveSummary.status),
      true,
      'stabilize should change at least one allowed pilot status value'
    );
    assert.strictEqual(statusWithinBounds(afterResolveSummary.status), true, 'status values should stay within bounds after resolve');
    assert.strictEqual(afterResolveSummary.v1HistoryCount, initialV1HistoryCount, 'V1 history should not grow after V2 resolve');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 20000);
    await openEventCenter(page);
    const afterReloadState = await readStoredState(page);
    const afterReloadSummary = summarizeResolvedState(afterReloadState);
    const afterReloadUi = await inspectEventCenter(page);

    assert.strictEqual(afterReloadSummary.openEventCount, 0, 'eventV2.openEvents should remain empty after reload');
    assert.strictEqual(afterReloadSummary.matchingHistoryCount, 1, 'reload should not duplicate resolved history');
    assert.strictEqual(afterReloadSummary.eventId, PILOT_EVENT_ID, 'history eventId should persist after reload');
    assert.strictEqual(afterReloadSummary.selectedOption, PILOT_OPTION_ID, 'history selectedOption should persist after reload');
    assert.strictEqual(afterReloadSummary.applyPreviewStored, true, 'applyPreview should persist after reload');
    assert.strictEqual(afterReloadSummary.appliedDeltaStored, true, 'appliedDelta should persist after reload');
    assert.strictEqual(afterReloadUi.dataset.eventSystem, 'v2', 'Reloaded sheet should keep V2 marker');
    assert.strictEqual(afterReloadUi.dataset.eventAuthority, 'v2', 'Reloaded sheet should keep V2 authority marker');
    assert.strictEqual(afterReloadUi.dataset.eventId, PILOT_EVENT_ID, 'Reloaded sheet should keep pilot event marker');
    assert.strictEqual(
      statusApproximatelyEqual(afterReloadSummary.status, afterResolveSummary.status, 0.02),
      true,
      'reload status drift should stay within tolerance'
    );
    assert.strictEqual(afterReloadSummary.v1HistoryCount, initialV1HistoryCount, 'V1 history should not grow after reload');

    const rawI18nKeysVisible = [
      beforeResolveUi.title,
      beforeResolveUi.description,
      beforeResolveUi.meta,
      afterReloadUi.title,
      afterReloadUi.description,
      afterReloadUi.meta,
      ...beforeResolveUi.optionButtons.map((button) => button.text),
      ...afterReloadUi.optionButtons.map((button) => button.text),
    ].some(hasRawI18nKey);

    const summary = {
      ok: true,
      mode: 'event_center_v2_browser_reload_smoke',
      browserSmokeExecuted: true,
      eventId: PILOT_EVENT_ID,
      selectedOption: PILOT_OPTION_ID,
      optionIds,
      seedHelperPathUsed: true,
      resetResultOk: prep.resetResult && prep.resetResult.ok === true,
      seedResultOk: prep.seedResult && prep.seedResult.ok === true,
      seededOpenEvents: prep.snapshot && Array.isArray(prep.snapshot.openEvents) ? prep.snapshot.openEvents.length : 0,
      openEventsEmptyAfterResolve: afterResolveSummary.openEventCount === 0,
      historyContainsResolvedEvent: afterResolveSummary.matchingHistoryCount === 1,
      historyPersistsAfterReload: afterReloadSummary.matchingHistoryCount === 1,
      noDuplicateHistoryAfterReload: afterReloadSummary.matchingHistoryCount === 1,
      v1DidNotWriteParallel: afterResolveSummary.v1HistoryCount === initialV1HistoryCount
        && afterReloadSummary.v1HistoryCount === initialV1HistoryCount,
      applyPreviewStored: afterResolveSummary.applyPreviewStored === true && afterReloadSummary.applyPreviewStored === true,
      appliedDeltaStored: afterResolveSummary.appliedDeltaStored === true && afterReloadSummary.appliedDeltaStored === true,
      statusChangedAfterResolve: statusChangedWithinPilotScope(initialStatus, afterResolveSummary.status),
      statusPersistsAfterReload: statusApproximatelyEqual(afterReloadSummary.status, afterResolveSummary.status, 0.02),
      deltaNotAppliedTwice: statusApproximatelyEqual(afterReloadSummary.status, afterResolveSummary.status, 0.02)
        && afterReloadSummary.matchingHistoryCount === 1,
      rawI18nKeysVisible,
      pilotScopeLimited: optionIds.join('|') === ['inspect', 'overreact', 'stabilize'].sort().join('|'),
      afterResolve: afterResolveSummary,
      afterReload: afterReloadSummary,
      ui: {
        beforeResolveTitle: beforeResolveUi.title,
        afterReloadTitle: afterReloadUi.title,
      },
    };

    assert.strictEqual(summary.rawI18nKeysVisible, false, 'Pilot UI should not expose raw i18n keys');
    assert.strictEqual(summary.pilotScopeLimited, true, 'Pilot scope should remain limited to indoor_dry_rootball options');

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
