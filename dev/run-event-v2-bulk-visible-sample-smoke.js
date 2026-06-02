#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const { chromium } = require('playwright');
const { closeBrowser, closeContext, closeServer, startStaticServer } = require('../test/support/serverRuntime');
const { installAuthHarness, waitForBoot } = require('../test/support/browserRuntime');

const ROOT = process.cwd();
const HOST = '127.0.0.1';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token';
const STORAGE_KEY = 'grow-sim-state-v2';

const SAMPLE_CASES = Object.freeze([
  'indoor_heat_stress_air',
  'indoor_overwatering_early',
  'outdoor_heatwave_dry_wind',
  'shared_rootbound_warning',
  'shared_early_pest_signs_mild',
]);

async function openApp(page, baseUrl, cacheKey) {
  await page.goto(`${baseUrl}/?dev=1&gs_event_v2_dev_preview=unlock&bulk_visible_sample=${cacheKey}`, { waitUntil: 'domcontentloaded' });
  await waitForBoot(page, 20000);
}

async function ensureRunStartedViaUi(page) {
  const landingVisible = await page.evaluate(() => {
    const landing = document.getElementById('landing');
    return Boolean(landing && !landing.classList.contains('hidden') && landing.getAttribute('aria-hidden') !== 'true');
  });
  if (!landingVisible) return;
  for (let index = 0; index < 8; index += 1) {
    const startVisible = await page.evaluate(() => {
      const start = document.getElementById('startRunBtn');
      return Boolean(start && !start.classList.contains('hidden') && start.getAttribute('aria-hidden') !== 'true');
    });
    if (startVisible) {
      await page.locator('#startRunBtn').click({ timeout: 10000, force: true });
      await page.waitForFunction(() => Boolean(window.__gsState && window.__gsState.setup), null, { timeout: 10000 });
      return;
    }
    await page.locator('#setupNextBtn').click({ timeout: 10000, force: true });
    await page.waitForTimeout(120);
  }
}

async function readState(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

async function runCase(page, eventId, index) {
  const instanceId = `evt_v2_bulk_visible_${eventId}_${index}`;
  const seeded = await page.evaluate(({ id, instance }) => {
    const reset = window.__resetEventV2Pilot({ clearHistory: true, resetStatus: true });
    const seed = window.__seedEventV2PilotEvent(id, { instanceId: instance });
    return { reset, seed, snapshot: window.__getEventV2PilotState() };
  }, { id: eventId, instance: instanceId });

  assert.strictEqual(seeded.reset.ok, true, `reset failed for ${eventId}`);
  assert.strictEqual(seeded.seed.ok, true, `seed failed for ${eventId}`);
  assert.strictEqual(seeded.seed.eventId, eventId, `seed event mismatch for ${eventId}`);

  await page.locator('#eventsActionBtn').click({ timeout: 10000, force: true });
  await page.waitForFunction(() => {
    const root = document.getElementById('eventSheetModernRoot');
    return Boolean(root && root.innerText && root.innerText.trim().length > 0);
  }, null, { timeout: 10000 });

  const ui = await page.evaluate(() => {
    const card = document.querySelector('.event-sheet-modern-card');
    const visual = document.querySelector('.event-visual');
    const image = document.querySelector('.event-visual .event-visual-image:not(.hidden)');
    const buttons = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'))
      .map((button) => ({ id: button.getAttribute('data-event-option-id') || '', text: button.textContent || '' }));
    return {
      text: document.getElementById('eventSheetModernRoot')?.innerText || '',
      dataset: card ? { ...card.dataset } : {},
      visualDataset: visual ? { ...visual.dataset } : {},
      visualSrc: image ? String(image.getAttribute('src') || '') : '',
      firstOptionId: buttons.find((button) => button.id)?.id || '',
      buttons,
    };
  });

  assert.strictEqual(ui.dataset.eventSystem, 'v2', `event system marker mismatch for ${eventId}`);
  assert.strictEqual(ui.dataset.eventAuthority, 'v2', `event authority marker mismatch for ${eventId}`);
  assert.strictEqual(ui.dataset.eventId, eventId, `event id marker mismatch for ${eventId}`);
  assert.strictEqual(ui.visualDataset.eventVisualSystem, 'v2', `visual marker mismatch for ${eventId}`);
  assert.strictEqual(ui.visualSrc.includes(`/assets/events/v2/final/${eventId}/hero.webp`) || ui.visualSrc.includes(`assets/events/v2/final/${eventId}/hero.webp`), true, `hero image not visible for ${eventId}`);
  assert.strictEqual(
    ui.text.includes('Autoritativ bleibt Legacy')
      || ui.text.includes('Abklingzeit aktiv')
      || ui.text.includes('Pilotpfad')
      || ui.text.includes('Kategorie Visual'),
    false,
    `legacy/debug text visible for ${eventId}`
  );

  const optionToResolve = ui.firstOptionId || (seeded.snapshot.openEvents[0] && seeded.snapshot.openEvents[0].options[0]) || '';
  assert.ok(optionToResolve, `no resolvable option for ${eventId}`);
  await page.evaluate((optionId) => {
    const button = Array.from(document.querySelectorAll('[data-event-option-id], #eventOptionList button'))
      .find((entry) => entry.getAttribute('data-event-option-id') === optionId);
    if (!button) throw new Error(`missing option button: ${optionId}`);
    button.click();
  }, optionToResolve);

  await page.waitForFunction(({ key, id }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    const history = saved && saved.eventV2 && Array.isArray(saved.eventV2.history) ? saved.eventV2.history : [];
    const openEvents = saved && saved.eventV2 && Array.isArray(saved.eventV2.openEvents) ? saved.eventV2.openEvents : [];
    return openEvents.length === 0 && history.some((entry) => entry && entry.instanceId === id);
  }, { key: STORAGE_KEY, id: instanceId }, { timeout: 10000 });

  const afterResolve = await readState(page);
  const history = afterResolve && afterResolve.eventV2 && Array.isArray(afterResolve.eventV2.history)
    ? afterResolve.eventV2.history
    : [];
  const resolvedEntry = history.find((entry) => entry && entry.instanceId === instanceId);
  assert.ok(resolvedEntry, `history entry missing for ${eventId}`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForBoot(page, 20000);
  await ensureRunStartedViaUi(page);
  const afterReload = await readState(page);
  const reloadHistory = afterReload && afterReload.eventV2 && Array.isArray(afterReload.eventV2.history)
    ? afterReload.eventV2.history
    : [];
  const reloadMatches = reloadHistory.filter((entry) => entry && entry.instanceId === instanceId);
  assert.strictEqual(reloadMatches.length, 1, `reload duplicated history for ${eventId}`);

  return {
    eventId,
    optionId: resolvedEntry.selectedOption || optionToResolve,
    reason: resolvedEntry.appliedDelta ? resolvedEntry.appliedDelta.reason : null,
    applied: Boolean(resolvedEntry.appliedDelta && resolvedEntry.appliedDelta.applied === true),
  };
}

async function main() {
  const serverRuntime = await startStaticServer(ROOT, HOST, 0, {
    defaultHeaders: { 'Cache-Control': 'no-store' },
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
    await page.waitForFunction(() => {
      return typeof window.__seedEventV2PilotEvent === 'function'
        && typeof window.__resetEventV2Pilot === 'function'
        && typeof window.__listEventV2PilotEvents === 'function';
    }, null, { timeout: 25000 });

    const enabledEvents = await page.evaluate(() => window.__listEventV2PilotEvents());
    SAMPLE_CASES.forEach((eventId) => assert.ok(enabledEvents.includes(eventId), `sample event not enabled: ${eventId}`));

    const results = [];
    for (let index = 0; index < SAMPLE_CASES.length; index += 1) {
      results.push(await runCase(page, SAMPLE_CASES[index], index + 1));
    }

    const summary = {
      ok: true,
      mode: 'event_v2_bulk_visible_sample_smoke',
      sampleCount: SAMPLE_CASES.length,
      sampleEventIds: SAMPLE_CASES.slice(),
      results,
    };
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
