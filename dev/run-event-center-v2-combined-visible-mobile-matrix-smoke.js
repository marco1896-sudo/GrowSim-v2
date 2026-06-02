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

const VIEWPORTS = Object.freeze([
  { name: '360x740', width: 360, height: 740 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
]);

const CASES = Object.freeze([
  {
    eventId: 'indoor_dry_rootball',
    optionId: 'stabilize',
    expectedOutcome: 'stabilizing_action',
    expectStatusMutation: true,
    expectedVisible: ['Trockener Wurzelballen', 'Behutsam stabilisieren', 'Substrat zuerst', 'Sofort stark eingreifen'],
    expectedResolvedVisible: ['Behutsam stabilisiert'],
  },
  {
    eventId: 'shared_panic_watering_misread',
    optionId: 'check_weight_before_watering',
    expectedOutcome: 'diagnostic_weight_check',
    expectStatusMutation: false,
    expectedVisible: ['Panik', 'Topfgewicht', 'Wurzelzone', 'Aus Panik'],
    expectedResolvedVisible: ['Topfgewicht geprueft'],
  },
]);

function hasForbiddenLegacyCopy(text) {
  const safe = String(text || '');
  return safe.includes('Autoritativ bleibt Legacy')
    || safe.includes('Abklingzeit aktiv')
    || safe.includes('eventV2PilotActive')
    || safe.includes('Authority: V2 Pilot')
    || safe.includes('Pilotpfad')
    || safe.includes('Kategorie Visual');
}

function hasForbiddenDebugResolveCopy(text) {
  const safe = String(text || '');
  return safe.includes('V2 Ereignis ausgewertet')
    || safe.includes('ApplyPreview')
    || safe.includes('ApplyDelta')
    || safe.includes('V1: kein paralleler Write')
    || safe.includes('Pilot-Preview')
    || safe.includes('diagnostic_only')
    || safe.includes('guardrail_only')
    || safe.includes('selectedOption');
}

function isNonCriticalConsoleError(message) {
  const safe = String(message || '');
  if (!safe) return false;
  const isServiceWorkerRegisterNoise = safe.includes('[sw-update] register failed')
    && safe.includes("Cannot read properties of undefined (reading 'update')");
  const isGeneric404ResourceNoise = safe.includes('Failed to load resource: the server responded with a status of 404');
  return isServiceWorkerRegisterNoise || isGeneric404ResourceNoise;
}

function hasHorizontalOverflow(metrics) {
  if (!metrics) return false;
  return Number(metrics.scrollWidth || 0) > Number(metrics.clientWidth || 0) + 1;
}

async function openApp(page, baseUrl, cacheKey) {
  await page.goto(`${baseUrl}/?dev=1&gs_event_v2_dev_preview=unlock&combined_mobile_matrix=${cacheKey}`, {
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

async function ensureDevHelpers(page) {
  await page.waitForFunction(() => {
    return typeof window.__seedEventV2PilotIndoorDryRootball === 'function'
      && typeof window.__seedEventV2PilotSharedPanicWateringMisread === 'function'
      && typeof window.__resetEventV2Pilot === 'function'
      && typeof window.__getEventV2PilotState === 'function';
  }, null, { timeout: 10000 });
}

async function seedCase(page, testCase, instanceId) {
  const result = await page.evaluate(({ eventId, instanceId: id }) => {
    const resetResult = window.__resetEventV2Pilot({ clearHistory: true, resetStatus: true });
    let seedResult = null;
    if (eventId === 'indoor_dry_rootball') {
      seedResult = window.__seedEventV2PilotIndoorDryRootball({ instanceId: id });
    } else {
      seedResult = window.__seedEventV2PilotSharedPanicWateringMisread({ instanceId: id });
    }
    const snapshot = window.__getEventV2PilotState();
    return { resetResult, seedResult, snapshot };
  }, { eventId: testCase.eventId, instanceId });
  assert.strictEqual(result.resetResult && result.resetResult.ok, true, 'reset helper should succeed');
  assert.strictEqual(result.seedResult && result.seedResult.ok, true, 'seed helper should succeed');
  assert.strictEqual(result.seedResult && result.seedResult.eventId, testCase.eventId, 'seed event id should match');
  assert.strictEqual(Array.isArray(result.snapshot.openEvents), true, 'seed snapshot should expose open events');
  assert.strictEqual(result.snapshot.openEvents.length, 1, 'seed should produce one open event');
}

async function clickEventCenterButton(page) {
  await page.locator('#eventsActionBtn').click({ timeout: 10000, force: true });
  await page.waitForFunction(() => {
    const root = document.getElementById('eventSheetModernRoot');
    return Boolean(root && root.innerText && root.innerText.trim().length > 0);
  }, null, { timeout: 10000 });
}

async function readUi(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.event-sheet-modern-card');
    const visual = document.querySelector('.event-visual');
    const visualImage = document.querySelector('.event-visual .event-visual-image:not(.hidden)');
    const placeholderGlyph = document.querySelector('.event-visual-placeholder-glyph');
    const optionButtons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'))
      .map((button) => ({
        id: button.getAttribute('data-event-option-id') || '',
        text: button.textContent || '',
        visible: !!(button.offsetParent),
      }));
    const sheet = document.getElementById('eventSheetModernRoot');
    const body = document.body;
    const html = document.documentElement;
    return {
      text: sheet?.innerText || '',
      dataset: card ? { ...card.dataset } : {},
      visualDataset: visual ? { ...visual.dataset } : {},
      visualImageSrc: visualImage ? String(visualImage.getAttribute('src') || '') : '',
      placeholderGlyphText: placeholderGlyph ? String(placeholderGlyph.textContent || '').trim() : '',
      optionButtons,
      overflow: {
        bodyScrollWidth: body ? body.scrollWidth : 0,
        bodyClientWidth: body ? body.clientWidth : 0,
        htmlScrollWidth: html ? html.scrollWidth : 0,
        htmlClientWidth: html ? html.clientWidth : 0,
        sheetScrollWidth: sheet ? sheet.scrollWidth : 0,
        sheetClientWidth: sheet ? sheet.clientWidth : 0,
      },
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
  assert.strictEqual(clicked, true, `option ${optionId} should be clickable`);
}

async function readState(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

function summarize(saved, instanceId) {
  const eventV2 = saved && saved.eventV2 ? saved.eventV2 : {};
  const openEvents = Array.isArray(eventV2.openEvents) ? eventV2.openEvents : [];
  const history = Array.isArray(eventV2.history) ? eventV2.history : [];
  const matching = history.filter((entry) => entry && entry.instanceId === instanceId);
  const entry = matching[0] || null;
  const status = saved && saved.status && typeof saved.status === 'object' ? saved.status : {};
  const v1History = saved && saved.events && Array.isArray(saved.events.history) ? saved.events.history : [];
  return {
    openEventCount: openEvents.length,
    historyCount: history.length,
    matchingHistoryCount: matching.length,
    eventId: entry ? entry.eventId : null,
    selectedOption: entry ? entry.selectedOption : null,
    applyPreviewStored: Boolean(entry && entry.applyPreview && typeof entry.applyPreview === 'object'),
    appliedDeltaStored: Boolean(entry && entry.appliedDelta && typeof entry.appliedDelta === 'object'),
    appliedDeltaApplied: Boolean(entry && entry.appliedDelta && entry.appliedDelta.applied === true),
    appliedDeltaReason: entry && entry.appliedDelta ? String(entry.appliedDelta.reason || '') : '',
    status: {
      stress: Number(status.stress),
      risk: Number(status.risk),
      water: Number(status.water),
    },
    v1HistoryCount: v1History.length,
  };
}

function changedCoreStatusSignificantly(before, after, epsilon) {
  const threshold = Number.isFinite(Number(epsilon)) ? Number(epsilon) : 0.5;
  return Math.abs(Number(before.stress) - Number(after.stress)) > threshold
    || Math.abs(Number(before.risk) - Number(after.risk)) > threshold;
}

async function runCase(page, testCase, viewportName, index) {
  const instanceId = `evt_v2_combined_mobile_${viewportName}_${testCase.eventId}_${testCase.optionId}_${index}`;
  await seedCase(page, testCase, instanceId);
  const seededState = summarize(await readState(page), instanceId);
  const v1HistoryBefore = seededState.v1HistoryCount;

  await clickEventCenterButton(page);
  const uiBefore = await readUi(page);
  assert.strictEqual(uiBefore.dataset.eventSystem, 'v2', 'event system marker must be v2');
  assert.strictEqual(uiBefore.dataset.eventAuthority, 'v2', 'event authority marker must be v2');
  assert.strictEqual(uiBefore.dataset.eventId, testCase.eventId, 'event id marker must match case');
  assert.strictEqual(uiBefore.visualDataset.eventVisualSystem, 'v2', 'visual marker must be v2');
  assert.strictEqual(uiBefore.visualImageSrc.includes(`/assets/events/v2/final/${testCase.eventId}/hero.webp`) || uiBefore.visualImageSrc.includes(`assets/events/v2/final/${testCase.eventId}/hero.webp`), true, 'visual image should point to hero.webp');
  assert.strictEqual(uiBefore.visualImageSrc.includes('/assets/events/legacy/') || uiBefore.visualImageSrc.includes('cooldown'), false, 'visual must not use legacy/cooldown image');
  assert.strictEqual(hasForbiddenLegacyCopy(uiBefore.text), false, 'legacy/cooldown/debug copy must not be visible');
  assert.notStrictEqual(uiBefore.placeholderGlyphText, 'A', 'visual must not fall back to generic letter placeholder');
  for (const token of testCase.expectedVisible) {
    assert.strictEqual(uiBefore.text.includes(token), true, `visible copy should contain: ${token}`);
  }
  assert.strictEqual(uiBefore.optionButtons.some((button) => button.text.includes('Empfohlen') || button.text.includes('Pruefen') || button.text.includes('Riskant')), true, 'decision cards should expose badge copy');
  assert.strictEqual(uiBefore.optionButtons.some((button) => button.id === testCase.optionId && button.visible), true, 'target option must be visible');
  assert.strictEqual(
    hasHorizontalOverflow({ scrollWidth: uiBefore.overflow.bodyScrollWidth, clientWidth: uiBefore.overflow.bodyClientWidth })
      || hasHorizontalOverflow({ scrollWidth: uiBefore.overflow.htmlScrollWidth, clientWidth: uiBefore.overflow.htmlClientWidth }),
    false,
    'no horizontal overflow allowed'
  );

  await clickOption(page, testCase.optionId);
  await page.waitForFunction(({ key, id }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    const history = saved && saved.eventV2 && Array.isArray(saved.eventV2.history) ? saved.eventV2.history : [];
    const openEvents = saved && saved.eventV2 && Array.isArray(saved.eventV2.openEvents) ? saved.eventV2.openEvents : [];
    return openEvents.length === 0 && history.some((entry) => entry && entry.instanceId === id);
  }, { key: STORAGE_KEY, id: instanceId }, { timeout: 10000 });

  const afterResolve = summarize(await readState(page), instanceId);
  assert.strictEqual(afterResolve.openEventCount, 0, 'open events must be empty after resolve');
  assert.strictEqual(afterResolve.matchingHistoryCount, 1, 'history must contain one matching entry');
  assert.strictEqual(afterResolve.eventId, testCase.eventId, 'history event id must match');
  assert.strictEqual(afterResolve.selectedOption, testCase.optionId, 'history option must match');
  assert.strictEqual(afterResolve.applyPreviewStored, true, 'applyPreview must be stored');
  assert.strictEqual(afterResolve.appliedDeltaStored, true, 'appliedDelta must be stored');
  assert.strictEqual(afterResolve.appliedDeltaReason, testCase.expectedOutcome, 'outcome reason must match');
  assert.strictEqual(afterResolve.v1HistoryCount, v1HistoryBefore, 'V1 history must not change');
  const uiAfterResolve = await readUi(page);
  assert.strictEqual(hasForbiddenDebugResolveCopy(uiAfterResolve.text), false, 'resolved UI must not show technical debug copy');
  for (const token of testCase.expectedResolvedVisible || []) {
    assert.strictEqual(uiAfterResolve.text.includes(token), true, `resolved copy should contain: ${token}`);
  }

  const statusMutated = afterResolve.appliedDeltaApplied === true
    || changedCoreStatusSignificantly(seededState.status, afterResolve.status, 0.5);
  assert.strictEqual(statusMutated, testCase.expectStatusMutation, 'status mutation expectation must match');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForBoot(page, 20000);
  await ensureRunStartedViaUi(page);
  await clickEventCenterButton(page);
  const uiAfterReload = await readUi(page);
  const afterReload = summarize(await readState(page), instanceId);
  assert.strictEqual(afterReload.openEventCount, 0, 'reload must keep openEvents empty');
  assert.strictEqual(afterReload.matchingHistoryCount, 1, 'reload must not duplicate history');
  assert.strictEqual(afterReload.appliedDeltaReason, testCase.expectedOutcome, 'reload must keep reason');
  assert.strictEqual(hasForbiddenLegacyCopy(uiAfterReload.text), false, 'reload must not show legacy/cooldown/debug copy');
  assert.strictEqual(hasForbiddenDebugResolveCopy(uiAfterReload.text), false, 'reload resolved UI must not show technical debug copy');
  assert.strictEqual(
    hasHorizontalOverflow({ scrollWidth: uiAfterReload.overflow.bodyScrollWidth, clientWidth: uiAfterReload.overflow.bodyClientWidth })
      || hasHorizontalOverflow({ scrollWidth: uiAfterReload.overflow.htmlScrollWidth, clientWidth: uiAfterReload.overflow.htmlClientWidth }),
    false,
    'reload must keep no horizontal overflow'
  );

  return {
    ok: true,
    viewport: viewportName,
    eventId: testCase.eventId,
    optionId: testCase.optionId,
    expectedOutcome: testCase.expectedOutcome,
    expectedStatusMutation: testCase.expectStatusMutation,
    actualStatusMutation: statusMutated,
    noLegacyCopyVisible: true,
    noHorizontalOverflow: true,
    reloadIdempotent: true,
    v1ParallelWriteBlocked: afterResolve.v1HistoryCount === v1HistoryBefore,
  };
}

async function runViewportCase(serverRuntime, viewport, caseIndex) {
  let browser = null;
  let context = null;
  const caseResults = [];
  const consoleErrors = [];
  const criticalConsoleErrors = [];

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await installAuthHarness(page, AUTH_TOKEN_KEY);
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      consoleErrors.push(text);
      if (!isNonCriticalConsoleError(text)) {
        criticalConsoleErrors.push(text);
      }
    });

    await openApp(page, serverRuntime.baseUrl, `${Date.now()}_${viewport.name}_${caseIndex}`);
    await ensureRunStartedViaUi(page);
    await ensureDevHelpers(page);

    for (let i = 0; i < CASES.length; i += 1) {
      caseResults.push(await runCase(page, CASES[i], viewport.name, i + 1));
    }

    return {
      viewport: viewport.name,
      ok: caseResults.every((entry) => entry.ok),
      caseResults,
      consoleErrors,
      criticalConsoleErrors,
    };
  } finally {
    await closeContext(context);
    await closeBrowser(browser);
  }
}

async function main() {
  const serverRuntime = await startStaticServer(ROOT, HOST, 0, {
    defaultHeaders: { 'Cache-Control': 'no-store' },
  });

  try {
    const viewportResults = [];
    for (let index = 0; index < VIEWPORTS.length; index += 1) {
      viewportResults.push(await runViewportCase(serverRuntime, VIEWPORTS[index], index + 1));
    }

    const allCaseResults = viewportResults.flatMap((entry) => entry.caseResults);
    const totalChecks = allCaseResults.length;
    const passedChecks = allCaseResults.filter((entry) => entry.ok).length;
    const failedChecks = totalChecks - passedChecks;

    const summary = {
      ok: failedChecks === 0 && viewportResults.every((entry) => entry.criticalConsoleErrors.length === 0),
      mode: 'event_center_v2_combined_visible_mobile_matrix_smoke',
      viewportCount: VIEWPORTS.length,
      caseCount: CASES.length,
      totalChecks,
      passedChecks,
      failedChecks,
      visibleEventsChecked: Array.from(new Set(allCaseResults.map((entry) => entry.eventId))),
      checkedOutcomes: Array.from(new Set(allCaseResults.map((entry) => entry.expectedOutcome))),
      noLegacyCopyVisible: allCaseResults.every((entry) => entry.noLegacyCopyVisible === true),
      noHorizontalOverflow: allCaseResults.every((entry) => entry.noHorizontalOverflow === true),
      reloadIdempotent: allCaseResults.every((entry) => entry.reloadIdempotent === true),
      v1ParallelWriteBlocked: allCaseResults.every((entry) => entry.v1ParallelWriteBlocked === true),
      hasConsoleErrors: viewportResults.some((entry) => entry.consoleErrors.length > 0),
      hasCriticalConsoleErrors: viewportResults.some((entry) => entry.criticalConsoleErrors.length > 0),
      results: viewportResults,
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await closeServer(serverRuntime.server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
