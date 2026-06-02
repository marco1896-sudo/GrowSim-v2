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
const VIEWPORTS = [
  { name: '360x740', width: 360, height: 740 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
];

function isIgnorableConsoleError(message) {
  const text = String(message || '');
  if (!text) return true;
  return text.includes('favicon')
    || text.includes('Failed to load resource: the server responded with a status of 404')
    || text.includes('ERR_BLOCKED_BY_CLIENT')
    || text.includes('[sw-update] register failed TypeError: Cannot read properties of undefined (reading \'update\')');
}

function createPilotState(nowMs, instanceId) {
  return {
    meta: { persistence: { lastSavedAtRealMs: nowMs } },
    simulation: { nowMs, lastTickRealTimeMs: nowMs, simTimeMs: 123456, tickCount: 7 },
    run: { status: 'active', startedAtRealMs: nowMs - 60000, finalizedAtRealMs: 0, endedAtRealMs: 0 },
    status: { health: 85, stress: 20, risk: 30, water: 60, nutrition: 55, growth: 25 },
    events: {
      machineState: 'cooldown',
      activeEventId: 'legacy_v1_read_only_event',
      activeEventTitle: 'Legacy V1 Read Only Event',
      activeEventText: 'Legacy data remains readable but must not write.',
      activeImagePath: 'assets/events/event-overwatering.png',
      activeOptions: [{ id: 'legacy_choice', label: 'Legacy choice' }],
      history: [{ eventId: 'legacy_v1_history_entry', optionId: 'legacy_choice' }],
      scheduler: {},
    },
    eventV2: {
      schemaVersion: 1,
      mode: 'active',
      openEvents: [{
        eventId: PILOT_EVENT_ID,
        instanceId,
        eventVersion: 3,
        createdAt: nowMs,
        stage: 'vegetative',
        category: 'care',
        severity: 'warning',
        source: 'event-center-v2-mobile-qa-smoke',
        options: ['inspect', 'stabilize', 'overreact'],
        status: 'active',
        previewPayload: {
          title: 'Trockener Wurzelballen',
          description: 'Der Wurzelballen trocknet ungleichmaessig aus. Reagiere behutsam, statt hektisch zu giessen.',
        },
      }],
      history: [],
      meta: {
        lastGeneratedAt: nowMs,
        lastResolvedAt: null,
        lastAuditAt: null,
        lastError: null,
        counters: { generated: 1, resolved: 0, rejected: 0, expired: 0 },
      },
    },
  };
}

function hasRawI18nKey(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (text.includes('${')) return true;
  return /^[a-z]+(\.[a-z0-9_-]+){1,}$/i.test(text);
}

async function seedState(page, snapshot) {
  await page.addInitScript(({ key, state }) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, { key: STORAGE_KEY, state: snapshot });
}

async function readStoredState(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

async function openApp(page, baseUrl, cacheKey, viewportName) {
  await page.goto(`${baseUrl}/?dev=1&gs_event_v2_dev_preview=unlock&event_v2_mobile_qa_smoke=${cacheKey}&vp=${viewportName}`, {
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

async function inspectEventCenter(page) {
  return page.evaluate(() => {
    const titleNode = document.querySelector('.event-sheet-modern__title') || document.getElementById('eventTitle');
    const descriptionNode = document.querySelector('.event-sheet-modern__text') || document.getElementById('eventText');
    const optionButtons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'));
    const card = document.querySelector('.event-sheet-modern-card');
    const visual = document.querySelector('.event-sheet-modern-card .event-visual');
    const visualImage = document.querySelector('.event-sheet-modern-card .event-visual-image:not(.hidden)');
    const layoutRects = optionButtons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height, left: rect.left, top: rect.top };
    });
    return {
      title: titleNode ? titleNode.textContent || '' : '',
      description: descriptionNode ? descriptionNode.textContent || '' : '',
      subtitle: document.querySelector('.figma-top-player-subtitle')?.textContent || '',
      badge: document.querySelector('.sheet-badge')?.textContent || '',
      sheetText: document.getElementById('eventSheetModernRoot')?.innerText || '',
      dataset: card ? { ...card.dataset } : {},
      visual: {
        kind: visual ? visual.getAttribute('data-kind') || '' : '',
        origin: visual ? visual.getAttribute('data-origin') || '' : '',
        src: visualImage ? visualImage.getAttribute('src') || '' : '',
      },
      optionButtons: optionButtons.map((button) => ({
        id: button.getAttribute('data-event-option-id') || '',
        text: button.textContent || '',
      })),
      layoutRects,
    };
  });
}

async function clickStabilize(page) {
  const clicked = await page.evaluate((optionId) => {
    const buttons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'));
    const button = buttons.find((entry) => entry.getAttribute('data-event-option-id') === optionId);
    if (!button) return false;
    button.click();
    return true;
  }, PILOT_OPTION_ID);
  assert.strictEqual(clicked, true, 'stabilize button should be clickable');
}

function summarizeResolvedState(saved, instanceId) {
  const eventV2 = saved && saved.eventV2 ? saved.eventV2 : {};
  const openEvents = Array.isArray(eventV2.openEvents) ? eventV2.openEvents : [];
  const history = Array.isArray(eventV2.history) ? eventV2.history : [];
  const matchingHistory = history.filter((entry) => entry && entry.instanceId === instanceId);
  const resolvedEntry = matchingHistory[0] || null;
  const status = saved && saved.status && typeof saved.status === 'object' ? saved.status : {};
  const v1History = saved && saved.events && Array.isArray(saved.events.history) ? saved.events.history : [];
  return {
    openEventCount: openEvents.length,
    matchingHistoryCount: matchingHistory.length,
    selectedOption: resolvedEntry ? resolvedEntry.selectedOption : null,
    appliedDeltaStored: Boolean(resolvedEntry && resolvedEntry.appliedDelta && resolvedEntry.appliedDelta.applied === true),
    applyPreviewStored: Boolean(resolvedEntry && resolvedEntry.applyPreview),
    status: {
      stress: status.stress,
      risk: status.risk,
      water: status.water,
    },
    v1HistoryCount: v1History.length,
  };
}

function statusChangedWithinPilotScope(before, after) {
  return ['stress', 'risk', 'water'].some((key) => Number(before[key]) !== Number(after[key]));
}

function statusWithinBounds(status) {
  return ['stress', 'risk', 'water'].every((key) => {
    const value = Number(status[key]);
    return Number.isFinite(value) && value >= 0 && value <= 100;
  });
}

function statusApproximatelyEqual(left, right, epsilon) {
  return ['stress', 'risk', 'water'].every((key) => {
    const a = Number(left[key]);
    const b = Number(right[key]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a - b) <= epsilon;
  });
}

async function runViewportScenario(browser, baseUrl, viewport, nowMs) {
  const instanceId = `evt_v2_mobile_qa_${viewport.name}_${PILOT_EVENT_ID}_001`;
  const initialState = createPilotState(nowMs, instanceId);
  const initialV1HistoryCount = initialState.events.history.length;
  const consoleErrors = [];
  let context = null;

  try {
    context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') {
      consoleErrors.push(message.text());
      }
    });

    await installAuthHarness(page, AUTH_TOKEN_KEY);
    await seedState(page, initialState);
    await openApp(page, baseUrl, nowMs, viewport.name);
    await openEventCenter(page);
    const beforeResolveUi = await inspectEventCenter(page);

    assert.strictEqual(beforeResolveUi.title, 'Trockener Wurzelballen', `${viewport.name}: pilot title should be visible`);
    assert.strictEqual(beforeResolveUi.dataset.eventSystem, 'v2', `${viewport.name}: V2 pilot should mark event system as v2`);
    assert.strictEqual(beforeResolveUi.dataset.eventId, PILOT_EVENT_ID, `${viewport.name}: V2 pilot should expose event id marker`);
    assert.strictEqual(beforeResolveUi.dataset.eventAuthority, 'v2', `${viewport.name}: V2 pilot should mark V2 authority`);
    assert.strictEqual(beforeResolveUi.subtitle.includes('Autoritativ bleibt Legacy'), false, `${viewport.name}: V2 pilot should not show legacy authoritative subtitle`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('eventV2PilotActive'), false, `${viewport.name}: should not show raw machine-state key`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('Indoor dry rootball'), false, `${viewport.name}: should not show raw english title`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('The rootball is drying unevenly'), false, `${viewport.name}: should not show raw english description`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('Authority: V2 Pilot'), false, `${viewport.name}: should not show technical authority text`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('V1 bleibt Legacy-Read-Fallback'), false, `${viewport.name}: should not show technical legacy copy`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('Behutsam stabilisieren'), true, `${viewport.name}: should show localized stabilize option`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('Substrat zuerst pruefen'), true, `${viewport.name}: should show localized inspect option`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('Sofort stark eingreifen'), true, `${viewport.name}: should show localized overreact option`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('Abklingzeit aktiv'), false, `${viewport.name}: V2 pilot should not show cooldown title`);
    assert.strictEqual(beforeResolveUi.sheetText.includes('Das Ereignissystem befindet sich in der Abklingzeit'), false, `${viewport.name}: V2 pilot should not show cooldown fallback text`);
    assert.strictEqual(beforeResolveUi.visual.src.includes('event-overwatering'), false, `${viewport.name}: V2 pilot should not reuse legacy overwatering visual`);
    assert.notStrictEqual(beforeResolveUi.visual.origin, 'legacy_active_image', `${viewport.name}: V2 pilot should not use legacy image origin`);
    assert(beforeResolveUi.description.length > 10, `${viewport.name}: description should be readable`);
    const optionIds = beforeResolveUi.optionButtons.map((button) => button.id).filter(Boolean).sort();
    assert.deepStrictEqual(optionIds, ['inspect', 'overreact', 'stabilize'].sort(), `${viewport.name}: expected pilot options`);
    assert.strictEqual(hasRawI18nKey(beforeResolveUi.title), false, `${viewport.name}: title should not expose i18n key`);
    assert.strictEqual(beforeResolveUi.optionButtons.some((button) => hasRawI18nKey(button.text)), false, `${viewport.name}: options should not expose i18n keys`);
    assert(beforeResolveUi.layoutRects.every((rect) => rect.width > 40 && rect.height > 20), `${viewport.name}: buttons should have usable touch size`);

    await clickStabilize(page);
    await page.waitForFunction(({ key, id }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      const eventV2 = saved && saved.eventV2;
      if (!eventV2) return false;
      return Array.isArray(eventV2.openEvents)
        && Array.isArray(eventV2.history)
        && eventV2.openEvents.length === 0
        && eventV2.history.some((entry) => entry && entry.instanceId === id && entry.selectedOption === 'stabilize');
    }, { key: STORAGE_KEY, id: instanceId }, { timeout: 10000 });

    const afterResolveState = await readStoredState(page);
    const afterResolve = summarizeResolvedState(afterResolveState, instanceId);

    assert.strictEqual(afterResolve.openEventCount, 0, `${viewport.name}: open events should be empty after resolve`);
    assert.strictEqual(afterResolve.matchingHistoryCount, 1, `${viewport.name}: exactly one matching history entry expected`);
    assert.strictEqual(afterResolve.selectedOption, PILOT_OPTION_ID, `${viewport.name}: selected option should persist`);
    assert.strictEqual(afterResolve.applyPreviewStored, true, `${viewport.name}: applyPreview should be stored`);
    assert.strictEqual(afterResolve.appliedDeltaStored, true, `${viewport.name}: appliedDelta should be stored`);
    assert.strictEqual(statusChangedWithinPilotScope(initialState.status, afterResolve.status), true, `${viewport.name}: status should change in allowed scope`);
    assert.strictEqual(statusWithinBounds(afterResolve.status), true, `${viewport.name}: status should stay in bounds`);
    assert.strictEqual(afterResolve.v1HistoryCount, initialV1HistoryCount, `${viewport.name}: V1 history must stay unchanged`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 20000);
    await openEventCenter(page);
    const afterReloadState = await readStoredState(page);
    const afterReload = summarizeResolvedState(afterReloadState, instanceId);

    assert.strictEqual(afterReload.openEventCount, 0, `${viewport.name}: open events should stay empty after reload`);
    assert.strictEqual(afterReload.matchingHistoryCount, 1, `${viewport.name}: reload must not duplicate history`);
    assert.strictEqual(
      statusApproximatelyEqual(afterReload.status, afterResolve.status, 0.02),
      true,
      `${viewport.name}: reload status drift exceeded tolerance`
    );
    assert.strictEqual(afterReload.v1HistoryCount, initialV1HistoryCount, `${viewport.name}: reload must not trigger V1 write`);

    const criticalConsoleErrors = consoleErrors.filter((entry) => !isIgnorableConsoleError(entry));

    return {
      viewport: viewport.name,
      ok: true,
      optionIds,
      consoleErrors,
      criticalConsoleErrors,
      state: {
        afterResolve,
        afterReload,
      },
      checks: {
        eventCenterOpens: true,
        stabilizeClickable: true,
        resolveStable: true,
        reloadStable: true,
        noDoubleApply: true,
        noRawI18nKeys: true,
        noParallelV1Write: true,
      },
    };
  } finally {
    await closeContext(context);
  }
}

async function main() {
  const serverRuntime = await startStaticServer(ROOT, HOST, 0, {
    defaultHeaders: { 'Cache-Control': 'no-store' },
  });
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const nowMs = Date.now();
    const results = [];
    for (const viewport of VIEWPORTS) {
      // Each viewport run gets isolated local storage and state lifecycle.
      const result = await runViewportScenario(browser, serverRuntime.baseUrl, viewport, nowMs + results.length);
      results.push(result);
    }

    const summary = {
      ok: true,
      mode: 'event_center_v2_mobile_qa_smoke',
      eventId: PILOT_EVENT_ID,
      selectedOption: PILOT_OPTION_ID,
      viewports: results.map((entry) => entry.viewport),
      passedViewports: results.filter((entry) => entry.ok).length,
      hasConsoleErrors: results.some((entry) => entry.consoleErrors.length > 0),
      hasCriticalConsoleErrors: results.some((entry) => entry.criticalConsoleErrors.length > 0),
      noDuplicateHistoryAcrossViewports: results.every((entry) => entry.state.afterReload.matchingHistoryCount === 1),
      noDoubleApplyAcrossViewports: results.every((entry) => entry.checks.noDoubleApply === true),
      v1ParallelWriteBlockedAcrossViewports: results.every((entry) => entry.checks.noParallelV1Write === true),
      rawI18nKeysVisible: false,
      results,
    };

    assert.strictEqual(summary.hasCriticalConsoleErrors, false, 'mobile QA should not produce critical console errors in pilot path');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await closeBrowser(browser);
    await closeServer(serverRuntime.server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
