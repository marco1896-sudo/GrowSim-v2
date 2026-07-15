#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const { waitForBoot, advanceOnboardingToStart, clearClientStorage } = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'output', 'care-intelligence-e2e');

async function openCare(page) {
  await page.evaluate(() => window.__gsOpenBuddyCare && window.__gsOpenBuddyCare());
  await page.waitForFunction(() => document.getElementById('buddyCareScreen')?.getAttribute('aria-hidden') === 'false');
}

async function setCareScenario(page, checks) {
  await page.evaluate((scenarioChecks) => {
    const api = window.GrowSimBuddyCareState;
    window.__gsState.buddyCare = api.normalizeBuddyCareState({
      version: 3,
      ageGateAccepted: true,
      ageGateAcceptedAt: Date.now(),
      entitlement: 'free',
      activePlantId: 'plant-1',
      plants: [{
        id: 'plant-1',
        nickname: 'Testpflanze',
        plantType: 'auto',
        environment: 'indoor',
        startDate: '2026-06-01',
        phase: 'veg',
        createdAt: Date.now() - 30 * 86400000
      }],
      dailyChecks: scenarioChecks,
      diaryEntries: [],
      tasks: [],
      riskSignals: [],
      intelligence: { version: 1, actions: [], questionAnswers: [], insights: [], plantPatterns: [] },
      settings: { notificationsEnabled: false, preferredReminderTime: '18:00' }
    });
    if (typeof window.renderBuddyCareScreen === 'function') window.renderBuddyCareScreen();
  }, checks);
}

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer(ROOT, '127.0.0.1');
  const browser = await chromium.launch({ headless: true });
  const viewportWidth = Math.max(320, Number(process.env.BUDDY_CARE_VIEWPORT_WIDTH) || 390);
  const viewportHeight = Math.max(568, Number(process.env.BUDDY_CARE_VIEWPORT_HEIGHT) || 844);
  const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await waitForBoot(page);
    await clearClientStorage(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await waitForBoot(page);
    await advanceOnboardingToStart(page);
    await page.click('#startRunBtn');
    await page.waitForFunction(() => document.getElementById('landing')?.classList.contains('hidden'));
    await openCare(page);
    await page.waitForTimeout(3800);

    const now = Date.now();
    const buildCheck = (id, daysAgo, overrides = {}) => ({
      id,
      plantId: 'plant-1',
      dayKey: new Date(now - daysAgo * 86400000).toISOString().slice(0, 10),
      createdAt: now - daysAgo * 86400000,
      createdAtIso: new Date(now - daysAgo * 86400000).toISOString(),
      mediumMoisture: 'moist',
      leafState: 'normal',
      growthState: 'normal',
      environmentStress: 'normal',
      pestsVisible: 'no',
      ...overrides
    });

    await setCareScenario(page, [
      buildCheck('check-3', 0, { mediumMoisture: 'wet', leafState: 'hanging', growthState: 'slow' }),
      buildCheck('check-2', 1, { mediumMoisture: 'wet', leafState: 'yellowing' }),
      buildCheck('check-1', 2, { mediumMoisture: 'moist' })
    ]);
    await page.waitForSelector('.buddy-care-priority-card');
    const todayText = await page.locator('#buddyCareTodayView').textContent();
    assert.match(todayText || '', /Heute nicht erneut gießen|Substratfeuchte prüfen/i, 'wet-root context should produce one safe primary action');
    assert.strictEqual(await page.locator('.buddy-care-priority-card').count(), 1, 'Today should expose one main priority card');
    assert.ok(await page.locator('.buddy-care-intelligence-why').count() >= 1, 'transparent Why details should be available');
    assert.doesNotMatch(todayText || '', /Stickstoffmangel\b/i, 'UI must not claim a hard nutrient diagnosis');
    assert.doesNotMatch(todayText || '', /\bMarco\b/i, 'guest UI must not use a foreign user name');
    const mobileLayout = await page.evaluate(() => {
      const screen = document.getElementById('buddyCareScreen');
      const scroll = document.getElementById('buddyCareScrollContent');
      const nav = document.getElementById('buddyCareViewNav');
      const priorityCard = document.querySelector('.buddy-care-priority-card');
      const coachCard = document.querySelector('.buddy-care-buddy-note--today-hero');
      const coachBody = coachCard?.querySelector('.buddy-care-buddy-body');
      const navRect = nav?.getBoundingClientRect();
      const scrollRect = scroll?.getBoundingClientRect();
      const screenRect = screen?.getBoundingClientRect();
      const coachRect = coachCard?.getBoundingClientRect();
      const coachBodyRect = coachBody?.getBoundingClientRect();
      const navButtons = Array.from(nav?.querySelectorAll('button') || []).map((button) => button.getBoundingClientRect().height);
      return {
        viewportWidth: document.documentElement.clientWidth,
        pageScrollWidth: document.documentElement.scrollWidth,
        priorityFits: Boolean(priorityCard && priorityCard.scrollWidth <= priorityCard.clientWidth + 1),
        coachFits: Boolean(coachCard && coachCard.scrollWidth <= coachCard.clientWidth + 1),
        coachBodyFits: Boolean(coachRect && coachBodyRect && coachBodyRect.left >= coachRect.left && coachBodyRect.right <= coachRect.right + 1),
        oneActiveNav: document.querySelectorAll('#buddyCareViewNav [aria-current="page"]').length,
        navOutsideScroll: Boolean(nav && scroll && !scroll.contains(nav)),
        navAtBottom: Boolean(navRect && screenRect && Math.abs(navRect.bottom - screenRect.bottom) <= 1),
        regionsSeparated: Boolean(navRect && scrollRect && scrollRect.bottom <= navRect.top + 1),
        navButtonsTallEnough: navButtons.length === 4 && navButtons.every((height) => height >= 44)
      };
    });
    assert.ok(mobileLayout.pageScrollWidth <= mobileLayout.viewportWidth + 1, `Care+ must not overflow horizontally at ${viewportWidth}px`);
    assert.strictEqual(mobileLayout.priorityFits, true, 'long intelligence copy should stay inside its main card');
    assert.strictEqual(mobileLayout.coachFits, true, 'Buddy coach content should stay inside its card');
    assert.strictEqual(mobileLayout.coachBodyFits, true, 'Buddy coach text should remain fully visible inside its card');
    assert.strictEqual(mobileLayout.oneActiveNav, 1, 'one Care+ navigation target should be active');
    assert.strictEqual(mobileLayout.navOutsideScroll, true, 'Care+ navigation should remain reachable outside the scroll region');
    assert.strictEqual(mobileLayout.navAtBottom, true, 'Care+ navigation should stay aligned with the screen bottom');
    assert.strictEqual(mobileLayout.regionsSeparated, true, 'Care+ content should not be covered by navigation');
    assert.strictEqual(mobileLayout.navButtonsTallEnough, true, 'Care+ navigation targets should remain touch-friendly');
    await page.screenshot({ path: path.join(OUTPUT, `wet-root-today-${viewportWidth}x${viewportHeight}.png`), fullPage: true });

    await setCareScenario(page, [buildCheck('check-question', 0, { leafState: 'yellowing' })]);
    await page.waitForSelector('[data-buddy-care-answer-question="leaf_area"]');
    assert.strictEqual(await page.locator('.buddy-care-intelligence-question').count(), 1, 'only one primary question module should be shown');
    assert.ok(await page.locator('[data-buddy-care-answer-question="leaf_area"]').first().evaluate((button) => button.getBoundingClientRect().height >= 44), 'question answers should remain touch-friendly');
    await page.click('[data-buddy-care-answer-question="leaf_area"][data-buddy-care-question-value="lower"]');
    await page.waitForFunction(() => window.__gsState.buddyCare.intelligence.questionAnswers.some((entry) => entry.questionId === 'leaf_area' && entry.value === 'lower'));
    assert.strictEqual(await page.locator('[data-buddy-care-answer-question="leaf_area"]').count(), 0, 'answered question should disappear instead of repeating');

    const confirmButton = page.locator('[data-buddy-care-confirm-action]').first();
    await confirmButton.waitFor();
    await confirmButton.click();
    await page.waitForFunction(() => window.__gsState.buddyCare.intelligence.actions.some((entry) => entry.status === 'confirmed'));
    assert.strictEqual(await page.locator('[data-buddy-care-mark-action-performed]').count(), 1, 'confirmed action should become explicitly completable');
    await page.locator('[data-buddy-care-mark-action-performed]').click();
    await page.waitForFunction(() => window.__gsState.buddyCare.intelligence.actions.some((entry) => entry.status === 'performed'));

    await page.evaluate(() => {
      const api = window.GrowSimBuddyCareState;
      const action = api.getCareActionsForPlant(window.__gsState, 'plant-1')[0];
      api.upsertCareAction(window.__gsState, { ...action, status: 'performed', outcome: 'pending', controlDueAt: Date.now() - 1, updatedAt: Date.now() });
      window.renderBuddyCareScreen();
      const scroll = document.getElementById('buddyCareScrollContent');
      if (scroll) scroll.scrollTop = 0;
    });
    await page.waitForSelector('[data-buddy-care-action-outcome-value="improved"]');
    const effectHeadline = await page.locator('.buddy-care-priority-card h2').textContent();
    assert.match(effectHeadline || '', /Wirkung der letzten Maßnahme prüfen/);
    assert.ok(await page.locator('[data-buddy-care-action-outcome-value="improved"]').evaluate((button) => button.getBoundingClientRect().height >= 44), 'effect outcome controls should remain touch-friendly');
    await page.screenshot({ path: path.join(OUTPUT, `effect-check-${viewportWidth}x${viewportHeight}.png`), fullPage: true });
    await page.click('[data-buddy-care-action-outcome-value="improved"]');
    await page.waitForFunction(() => window.__gsState.buddyCare.intelligence.actions.some((entry) => entry.status === 'improved'));
    await page.waitForTimeout(250);

    await page.reload({ waitUntil: 'networkidle' });
    await waitForBoot(page);
    const restored = await page.evaluate(() => ({
      plants: window.__gsState.buddyCare.plants.length,
      answer: window.__gsState.buddyCare.intelligence.questionAnswers.find((entry) => entry.questionId === 'leaf_area')?.value || '',
      actionStatus: window.__gsState.buddyCare.intelligence.actions[0]?.status || '',
      insightCount: window.__gsState.buddyCare.intelligence.insights.length
    }));
    assert.strictEqual(restored.plants, 1, 'reload must keep existing plants');
    assert.strictEqual(restored.answer, 'lower', 'reload must restore the open-question context');
    assert.strictEqual(restored.actionStatus, 'improved', 'reload must restore the action outcome');
    assert.ok(restored.insightCount >= 1, 'reload must restore persisted insights');
    const relevantErrors = errors.filter((message) => (
      !message.includes('api.growsimulator.tech')
      && !message.includes('Failed to load resource: net::ERR_FAILED')
    ));
    assert.deepStrictEqual(relevantErrors, [], 'the Care+ intelligence flow should not create browser errors beyond the known local remote-save CORS fallback');

    console.log('buddy-care-intelligence-e2e.test.js passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
