#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  waitForBoot,
  advanceOnboardingToStart,
  clearClientStorage
} = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';

async function openBuddyCare(page) {
  await page.evaluate(() => {
    if (typeof window.__gsOpenBuddyCare === 'function') {
      window.__gsOpenBuddyCare();
    }
  });
  await page.waitForFunction(() => {
    const screen = document.getElementById('buddyCareScreen');
    return Boolean(screen && !screen.hidden && screen.getAttribute('aria-hidden') === 'false');
  });
}

async function closeBuddyCare(page) {
  const ageGateVisible = await page.locator('#buddyCareAgeGateCard').isVisible();
  await page.click(ageGateVisible ? '#buddyCareAgeGateBackBtn' : '#buddyCareBackBtn');
  await page.waitForFunction(() => {
    return Boolean(window.__gsState && window.__gsState.ui && window.__gsState.ui.activeScreen === 'home');
  });
}

async function switchBuddyCareView(page, view) {
  await page.click(`[data-buddy-care-view="${view}"]`);
  await page.waitForFunction((nextView) => {
    const viewButton = document.querySelector(`[data-buddy-care-view="${nextView}"]`);
    const viewPanel = document.querySelector(`[data-buddy-care-view-panel="${nextView}"]`);
    return Boolean(viewButton && viewButton.classList.contains('is-active') && viewPanel && viewPanel.hidden === false);
  }, view);
}

async function openMissionRewardDialog(page, message = 'Test reward') {
  await page.evaluate((dialogMessage) => {
    if (typeof window.openMenuDialog === 'function') {
      window.openMenuDialog({
        title: 'Mission geschafft',
        message: dialogMessage,
        kicker: 'Mission geschafft',
        confirmLabel: 'Weiter',
        cancelLabel: 'Schliessen',
        variant: 'mission-reward'
      });
    }
  }, message);
}

async function waitForMenuDialogVisible(page) {
  await page.waitForFunction(() => {
    const dialog = document.getElementById('menuDialog');
    return Boolean(dialog && !dialog.classList.contains('hidden') && dialog.getAttribute('aria-hidden') === 'false');
  });
}

async function fillPlantSetup(page, name) {
  await page.evaluate(() => {
    if (typeof window.__gsOpenBuddyCarePlantSetup === 'function') {
      window.__gsOpenBuddyCarePlantSetup();
    }
  });
  await page.fill('#buddyCarePlantNameInput', name);
  await page.selectOption('#buddyCarePlantTypeSelect', 'auto');
  await page.selectOption('#buddyCarePlantEnvironmentSelect', 'indoor');
  await page.fill('#buddyCarePlantStartDateInput', await page.evaluate(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }));
  await page.click('#buddyCareAddPlantBtn');
}

async function openPlantDetails(page, plantId) {
  await switchBuddyCareView(page, 'plants');
  await page.evaluate((targetPlantId) => {
    const button = document.querySelector(`#buddyCarePlantsView [data-buddy-care-open-plant="${targetPlantId}"]`);
    if (button instanceof HTMLElement) button.click();
  }, plantId);
  await page.waitForFunction(() => {
    const card = document.getElementById('buddyCarePlantDetailCard');
    return Boolean(card && card.hidden === false);
  });
}

async function openPlantDetailSection(page, section) {
  await page.evaluate((nextSection) => {
    const button = document.querySelector(`#buddyCarePlantDetailCard [data-buddy-care-detail-section="${nextSection}"]`);
    if (button instanceof HTMLElement) {
      button.click();
    }
  }, section);
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST);
  const browser = await chromium.launch({ headless: true });
  const viewportWidth = Math.max(320, Number(process.env.BUDDY_CARE_VIEWPORT_WIDTH) || 390);
  const viewportHeight = Math.max(568, Number(process.env.BUDDY_CARE_VIEWPORT_HEIGHT) || 844);
  const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight } });
  const captureScreenshots = process.env.BUDDY_CARE_CAPTURE_SCREENSHOTS === '1';
  const screenshotDir = path.join(ROOT, 'output', 'care-reference-e2e');
  if (captureScreenshots) fs.mkdirSync(screenshotDir, { recursive: true });

  try {
    const url = `${baseUrl}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBoot(page);
    await clearClientStorage(page);
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBoot(page);

    await advanceOnboardingToStart(page);
    await page.click('#startRunBtn');
    await page.waitForFunction(() => {
      const landing = document.getElementById('landing');
      return Boolean(landing && landing.classList.contains('hidden'));
    }, null, { timeout: 10000 });

    await openMissionRewardDialog(page, 'Reward before Buddy Care');
    await waitForMenuDialogVisible(page);

    await openBuddyCare(page);

    const firstRunAccessibility = await page.evaluate(() => {
      const screen = document.getElementById('buddyCareScreen');
      const ageGate = document.getElementById('buddyCareAgeGateCard');
      const introOverlay = document.getElementById('firstRunIntroOverlay');
      const dialog = document.getElementById('menuDialog');
      return {
        activeScreen: window.__gsState && window.__gsState.ui ? window.__gsState.ui.activeScreen : '',
        screenVisible: Boolean(screen && !screen.hidden),
        ageGateVisible: Boolean(ageGate && ageGate.hidden === false),
        introHidden: Boolean(introOverlay && introOverlay.classList.contains('hidden')),
        dialogHidden: Boolean(dialog && dialog.classList.contains('hidden'))
      };
    });

    assert.strictEqual(firstRunAccessibility.activeScreen, 'buddyCare', 'Buddy Care should become the active screen even during the first-run flow');
    assert.strictEqual(firstRunAccessibility.screenVisible, true, 'Buddy Care screen should open successfully');
    assert.strictEqual(firstRunAccessibility.ageGateVisible, true, 'age gate should stay reachable when Buddy Care opens');
    assert.strictEqual(firstRunAccessibility.introHidden, true, 'first-run intro overlay should not cover Buddy Care');
    assert.strictEqual(firstRunAccessibility.dialogHidden, true, 'existing noncritical simulator dialogs should close when Buddy Care opens');

    await page.waitForFunction(() => document.activeElement?.id === 'buddyCareAgeGateAcceptBtn');
    const ageGateLockState = await page.evaluate(() => {
      const screen = document.getElementById('buddyCareScreen');
      const dialog = document.getElementById('buddyCareAgeGateCard');
      const scrollContent = document.getElementById('buddyCareScrollContent');
      const nav = document.getElementById('buddyCareViewNav');
      return {
        role: dialog?.getAttribute('role') || '',
        modal: dialog?.getAttribute('aria-modal') || '',
        backgroundInert: Boolean(scrollContent?.inert),
        navInert: Boolean(nav?.inert),
        bodyLocked: document.body.classList.contains('buddy-care-age-gate-open'),
        guestCopy: screen?.textContent || ''
      };
    });
    assert.strictEqual(ageGateLockState.role, 'dialog', 'age gate should expose a dialog role');
    assert.strictEqual(ageGateLockState.modal, 'true', 'age gate should expose modal semantics');
    assert.strictEqual(ageGateLockState.backgroundInert, true, 'age gate should make Care+ background inert');
    assert.strictEqual(ageGateLockState.navInert, true, 'age gate should lock the bottom navigation');
    assert.strictEqual(ageGateLockState.bodyLocked, true, 'age gate should lock background scrolling');
    assert.doesNotMatch(ageGateLockState.guestCopy, /\b(?:Marco|Max Mustergrower|Max)\b/i, 'guest Care+ must not show a foreign name');
    if (captureScreenshots) {
      await page.screenshot({ path: path.join(screenshotDir, `age-gate-${viewportWidth}x${viewportHeight}.png`), fullPage: true });
    }
    await page.keyboard.press('Escape');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'buddyCareAgeGateAcceptBtn', 'age gate should retain focus and ignore Escape dismissal');

    await openMissionRewardDialog(page, 'Reward while Buddy Care is active');
    await page.waitForTimeout(160);

    const deferredDialogState = await page.evaluate(() => {
      const dialog = document.getElementById('menuDialog');
      return {
        dialogHidden: Boolean(dialog && dialog.classList.contains('hidden')),
        activeScreen: window.__gsState && window.__gsState.ui ? window.__gsState.ui.activeScreen : ''
      };
    });

    assert.strictEqual(deferredDialogState.activeScreen, 'buddyCare', 'Buddy Care should stay focused while deferred dialogs wait');
    assert.strictEqual(deferredDialogState.dialogHidden, true, 'mission reward dialog should be deferred while Buddy Care is active');

    await closeBuddyCare(page);
    await waitForMenuDialogVisible(page);

    const resumedDialogState = await page.evaluate(() => {
      const dialog = document.getElementById('menuDialog');
      const kicker = document.getElementById('menuDialogKicker');
      return {
        variant: dialog ? dialog.dataset.variant || '' : '',
        kicker: kicker ? kicker.textContent.trim() : ''
      };
    });

    assert.strictEqual(resumedDialogState.variant, 'mission-reward', 'deferred simulator dialog should resume after leaving Buddy Care');
    assert.match(resumedDialogState.kicker, /Mission geschafft/i, 'resumed dialog should keep its reward framing');

    await page.click('#menuDialogCancelBtn');
    await page.waitForFunction(() => {
      const dialog = document.getElementById('menuDialog');
      return Boolean(dialog && dialog.classList.contains('hidden'));
    });

    await openBuddyCare(page);
    await page.click('#buddyCareAgeGateAcceptBtn');
    await page.waitForFunction(() => {
      const card = document.getElementById('buddyCareAgeGateCard');
      return Boolean(card && card.hidden === true);
    });
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'buddyCareTodayGreeting', 'age confirmation should restore focus to the active Care+ view');

    const productCopy = await page.locator('#buddyCareScreen').textContent();
    assert.doesNotMatch(productCopy || '', /(Technisches Fundament|Phase 5|MVP 0\.1|Mock freischalten|Testmodus:)/i, 'Buddy Care should not show internal rollout wording');
    assert.match(productCopy || '', /Testzugang aktivieren/i, 'Buddy Care should use product-ready test access wording');

    const emptyTodayState = await page.evaluate(() => {
      const screen = document.getElementById('buddyCareScreen');
      const scrollContent = document.getElementById('buddyCareScrollContent');
      const nav = document.getElementById('buddyCareViewNav');
      return {
        navCount: document.querySelectorAll('#buddyCareViewNav').length,
        navOutsideScroll: Boolean(screen && scrollContent && nav && screen.contains(nav) && !scrollContent.contains(nav)),
        primarySetupCtas: document.querySelectorAll('#buddyCareTodayView [data-buddy-care-open-setup]').length,
        heroImages: document.querySelectorAll('#buddyCareTodayCard .buddy-care-today-hero-asset').length,
        placeholderHidden: Boolean(document.getElementById('buddyCarePlaceholderCard')?.hidden),
        summaryHidden: Boolean(document.getElementById('buddyCareSummaryCard')?.hidden),
        todayListChildren: document.getElementById('buddyCareTodayList')?.children.length || 0
      };
    });
    assert.strictEqual(emptyTodayState.navCount, 1, 'Buddy Care should render one bottom navigation');
    assert.strictEqual(emptyTodayState.navOutsideScroll, true, 'bottom navigation should be outside the scroll region');
    assert.strictEqual(emptyTodayState.primarySetupCtas, 1, 'empty Today should expose one primary setup CTA');
    assert.strictEqual(emptyTodayState.heroImages, 1, 'empty Today should expose one dominant Buddy asset');
    assert.strictEqual(emptyTodayState.placeholderHidden, true, 'legacy placeholder should stay hidden in the empty Today view');
    assert.strictEqual(emptyTodayState.summaryHidden, true, 'empty Today should not show the metric summary');
    assert.strictEqual(emptyTodayState.todayListChildren, 0, 'empty Today should not append a second empty card');
    assert.strictEqual(await page.evaluate(() => Array.from(document.querySelectorAll('#buddyCareScreen h1')).filter((heading) => heading.getClientRects().length > 0).length), 1, 'active Care+ view should expose exactly one visible main heading');
    const viewIsolation = await page.evaluate(() => Array.from(document.querySelectorAll('[data-buddy-care-view-panel]')).map((panel) => ({
      view: panel.dataset.buddyCareViewPanel,
      hidden: panel.hidden,
      inert: panel.inert,
      ariaHidden: panel.getAttribute('aria-hidden')
    })));
    assert.strictEqual(viewIsolation.filter((panel) => !panel.hidden).length, 1, 'exactly one Care+ main view should be visible');
    assert.ok(viewIsolation.filter((panel) => panel.hidden).every((panel) => panel.inert && panel.ariaHidden === 'true'), 'inactive views should be inert and hidden from assistive technology');
    const toastLayout = await page.evaluate(() => {
      window.showRetentionToast?.('Care toast test');
      const toast = document.getElementById('retentionToast');
      const nav = document.getElementById('buddyCareViewNav');
      const toastRect = toast?.getBoundingClientRect();
      const navRect = nav?.getBoundingClientRect();
      return {
        anchor: toast?.dataset.anchor || '',
        separated: Boolean(toastRect && navRect && toastRect.bottom <= navRect.top)
      };
    });
    assert.strictEqual(toastLayout.anchor, 'buddy-care', 'global toasts should use the Care+ navigation anchor');
    assert.strictEqual(toastLayout.separated, true, 'global toasts should not cover Care+ bottom navigation');
    await page.evaluate(() => document.getElementById('retentionToast')?.remove());
    if (captureScreenshots) {
      await page.waitForTimeout(360);
      await page.screenshot({ path: path.join(screenshotDir, `today-empty-${viewportWidth}x${viewportHeight}.png`), fullPage: true });
      await switchBuddyCareView(page, 'plants');
      await page.waitForTimeout(360);
      await page.screenshot({ path: path.join(screenshotDir, `plants-empty-${viewportWidth}x${viewportHeight}.png`), fullPage: true });
    }
    await switchBuddyCareView(page, 'plants');
    await page.click('#buddyCarePlantsView [data-buddy-care-open-setup]');
    await page.waitForFunction(() => document.getElementById('buddyCareSetupCard')?.hidden === false);
    assert.strictEqual(await page.evaluate(() => Array.from(document.querySelectorAll('#buddyCareScreen h1')).filter((heading) => heading.getClientRects().length > 0).length), 1, 'plant setup should expose exactly one visible main heading');
    const setupReachability = await page.evaluate(() => {
      const scrollContent = document.getElementById('buddyCareScrollContent');
      if (scrollContent) scrollContent.scrollTop = scrollContent.scrollHeight;
      const addButton = document.getElementById('buddyCareAddPlantBtn');
      const nav = document.getElementById('buddyCareViewNav');
      const scrollRect = scrollContent?.getBoundingClientRect();
      const buttonRect = addButton?.getBoundingClientRect();
      const navRect = nav?.getBoundingClientRect();
      return {
        buttonInsideScrollViewport: Boolean(scrollRect && buttonRect && buttonRect.top >= scrollRect.top - 1 && buttonRect.bottom <= scrollRect.bottom + 1),
        navSeparated: Boolean(scrollRect && navRect && scrollRect.bottom <= navRect.top + 1)
      };
    });
    assert.strictEqual(setupReachability.buttonInsideScrollViewport, true, 'setup submit should remain reachable above bottom navigation');
    assert.strictEqual(setupReachability.navSeparated, true, 'setup scroll region should not overlap bottom navigation');
    await page.click('#buddyCareAddPlantBtn');
    const invalidSetupState = await page.evaluate(() => ({
      plants: window.__gsState?.buddyCare?.plants?.length || 0,
      nameInvalid: document.getElementById('buddyCarePlantNameInput')?.getAttribute('aria-invalid'),
      typeInvalid: document.getElementById('buddyCarePlantTypeSelect')?.getAttribute('aria-invalid'),
      environmentInvalid: document.getElementById('buddyCarePlantEnvironmentSelect')?.getAttribute('aria-invalid')
    }));
    assert.strictEqual(invalidSetupState.plants, 0, 'invalid empty setup must not create a plant');
    assert.strictEqual(invalidSetupState.nameInvalid, 'true', 'empty plant name should receive an inline error');
    assert.strictEqual(invalidSetupState.typeInvalid, 'true', 'missing plant type should receive an inline error');
    assert.strictEqual(invalidSetupState.environmentInvalid, 'true', 'missing environment should receive an inline error');
    await page.fill('#buddyCarePlantNameInput', 'Future plant');
    await page.selectOption('#buddyCarePlantTypeSelect', 'auto');
    await page.selectOption('#buddyCarePlantEnvironmentSelect', 'indoor');
    await page.fill('#buddyCarePlantStartDateInput', '2099-01-01');
    await page.click('#buddyCareAddPlantBtn');
    const invalidFutureDateState = await page.evaluate(() => ({
      plants: window.__gsState?.buddyCare?.plants?.length || 0,
      dateInvalid: document.getElementById('buddyCarePlantStartDateInput')?.getAttribute('aria-invalid'),
      dateError: document.getElementById('buddyCarePlantStartDateError')?.textContent.trim() || ''
    }));
    assert.strictEqual(invalidFutureDateState.plants, 0, 'future start dates must not create a plant');
    assert.strictEqual(invalidFutureDateState.dateInvalid, 'true', 'future start dates should receive an inline error');
    assert.ok(invalidFutureDateState.dateError.length > 0, 'future date validation should explain the error');
    await switchBuddyCareView(page, 'today');

    await fillPlantSetup(page, 'Audit Alpha');
    await page.waitForFunction(() => {
      const badge = document.getElementById('buddyCarePlantCount');
      return Boolean(badge && badge.textContent.includes('1 von 1'));
    });

    const collapsedCardText = await page.locator('#buddyCarePlantsView .buddy-care-plant-profile-card').first().textContent();
    const collapsedCardStructure = await page.locator('#buddyCarePlantsView .buddy-care-plant-profile-card').first().evaluate((node) => ({
      hasDetails: Boolean(node.querySelector('.buddy-care-plant-detail-section')),
      hasDiaryTimeline: Boolean(node.querySelector('.buddy-care-diary-timeline')),
      hasWeeklyCard: Boolean(node.querySelector('.buddy-care-weekly-card'))
    }));
    assert.match(collapsedCardText || '', /Audit Alpha/i, 'plant overview cards should keep the real plant name visible');
    assert.match(collapsedCardText || '', /Tagescheck offen/i, 'collapsed plant cards should keep the daily check state visible');
    assert.strictEqual(collapsedCardStructure.hasDetails, false, 'collapsed plant cards should keep the detail container closed');
    assert.strictEqual(collapsedCardStructure.hasDiaryTimeline, false, 'collapsed plant cards should keep the diary timeline out of the collapsed view');
    assert.strictEqual(collapsedCardStructure.hasWeeklyCard, false, 'collapsed plant cards should keep the weekly review out of the collapsed view');

    await switchBuddyCareView(page, 'more');
    const freeAccessState = await page.evaluate(() => ({
      id: document.getElementById('buddyCareScreen')?.dataset.buddyCareAccessStatus || '',
      visibleStatuses: ['buddyCareFreeHintCard', 'buddyCareMockCard', 'buddyCareMockActiveState', 'buddyCareActivationCard', 'buddyCareSeasonPassCard']
        .filter((id) => document.getElementById(id)?.hidden === false)
    }));
    assert.strictEqual(freeAccessState.id, 'test_available', 'free state should centrally resolve to test available');
    assert.deepStrictEqual(freeAccessState.visibleStatuses, ['buddyCareFreeHintCard'], 'free state should show exactly one access-status surface');
    await page.click('[data-buddy-care-open-paywall="dashboard"]');
    await page.waitForFunction(() => {
      const card = document.getElementById('buddyCareSeasonPassCard');
      return Boolean(card && card.hidden === false);
    });
    await page.click('#buddyCareSeasonPassActivateBtn');
    await page.waitForFunction(() => {
      const card = document.getElementById('buddyCareActivationCard');
      return Boolean(card && card.hidden === false);
    });
    const activeAccessState = await page.evaluate(() => ({
      id: document.getElementById('buddyCareScreen')?.dataset.buddyCareAccessStatus || '',
      visibleStatuses: ['buddyCareFreeHintCard', 'buddyCareMockCard', 'buddyCareMockActiveState', 'buddyCareActivationCard', 'buddyCareSeasonPassCard']
        .filter((id) => document.getElementById(id)?.hidden === false)
    }));
    assert.strictEqual(activeAccessState.id, 'test_active', 'activated state should centrally resolve to test active');
    assert.deepStrictEqual(activeAccessState.visibleStatuses, ['buddyCareActivationCard'], 'activation should show one access-status surface');

    await fillPlantSetup(page, 'Audit Blüte');
    await fillPlantSetup(page, 'Audit Gamma');
    await page.waitForFunction(() => {
      const badge = document.getElementById('buddyCarePlantCount');
      return Boolean(badge && badge.textContent.includes('3 von 3'));
    });

    await page.evaluate(() => {
      window.__gsOpenBuddyCarePlantSetup?.();
      const form = document.getElementById('buddyCareSetupForm');
      document.getElementById('buddyCarePlantNameInput').value = 'Blocked Delta';
      document.getElementById('buddyCarePlantTypeSelect').value = 'auto';
      document.getElementById('buddyCarePlantEnvironmentSelect').value = 'indoor';
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.strictEqual(await page.evaluate(() => window.__gsState?.buddyCare?.plants?.length), 3, 'fourth plant should remain blocked through the UI submit path');

    await switchBuddyCareView(page, 'plants');
    await page.click('#buddyCarePlantsView [data-buddy-care-open-check="buddy-plant-1"]');
    await page.waitForFunction(() => {
      const card = document.getElementById('buddyCareDailyCheckCard');
      return Boolean(card && card.hidden === false);
    });
    assert.strictEqual(await page.evaluate(() => Array.from(document.querySelectorAll('#buddyCareScreen h1')).filter((heading) => heading.getClientRects().length > 0).length), 1, 'daily check should expose exactly one visible main heading');
    await page.click('[data-buddy-care-wizard-option-field="mediumMoisture"][data-buddy-care-wizard-option-value="moist"]');
    await page.click('[data-buddy-care-wizard-next]');
    await page.click('[data-buddy-care-wizard-option-field="leafState"][data-buddy-care-wizard-option-value="normal"]');
    await page.click('[data-buddy-care-wizard-next]');
    await page.click('[data-buddy-care-wizard-option-field="growthState"][data-buddy-care-wizard-option-value="normal"]');
    await page.click('[data-buddy-care-wizard-next]');
    await page.click('[data-buddy-care-wizard-option-field="environmentStress"][data-buddy-care-wizard-option-value="normal"]');
    await page.click('[data-buddy-care-wizard-next]');
    await page.click('[data-buddy-care-wizard-option-field="pestsVisible"][data-buddy-care-wizard-option-value="no"]');
    await page.click('[data-buddy-care-wizard-next]');
    await page.fill('[data-buddy-care-wizard-height]', '12.5');
    await page.fill('[data-buddy-care-wizard-note]', 'Audit check');
    await page.click('[data-buddy-care-wizard-next]');
    await page.waitForSelector('[data-buddy-care-wizard-result]');
    await page.click('[data-buddy-care-wizard-submit]');
    await page.waitForFunction(() => {
      const state = window.__gsState && window.__gsState.buddyCare;
      return Boolean(
        state
        && Array.isArray(state.dailyChecks)
        && state.dailyChecks.length >= 1
        && Array.isArray(state.diaryEntries)
        && state.diaryEntries.length >= 1
      );
    });

    await openPlantDetails(page, 'buddy-plant-1');
    await openPlantDetailSection(page, 'history');
    await page.waitForFunction(() => {
      const card = document.getElementById('buddyCarePlantDetailCard');
      return Boolean(card && /Trend|Verlauf|Entwicklung/i.test(card.textContent || ''));
    });
    await openPlantDetailSection(page, 'week');
    const weekText = await page.locator('#buddyCarePlantDetailCard').textContent();
    assert.match(weekText || '', /Woche|Wochenrückblick/i, 'weekly review should stay in the dedicated week detail area');
    await switchBuddyCareView(page, 'diary');
    const composerState = await page.evaluate(() => {
      window.__gsOpenBuddyCareDiaryComposer('buddy-plant-1');
      const hub = document.getElementById('buddyCareDiaryHubCard');
      return {
        activeView: document.querySelector('[data-buddy-care-view="diary"]')?.classList.contains('is-active'),
        hubHidden: hub?.hidden,
        formCount: hub?.querySelectorAll('#buddyCareDiaryHubForm').length || 0,
        text: hub?.textContent.trim().slice(0, 120) || ''
      };
    });
    assert.strictEqual(composerState.formCount, 1, `diary composer should open: ${JSON.stringify(composerState)}`);

    const diaryForm = page.locator('#buddyCareDiaryHubForm');
    await diaryForm.locator('select[name="buddyCareDiaryPlantId"]').selectOption('buddy-plant-1');
    await diaryForm.locator('input[name="buddyCareDiaryTitle"]').fill('Blütennotiz');
    await diaryForm.locator('textarea[name="buddyCareDiaryNote"]').fill('Blätter ruhig, Höhe geprüft.');
    await diaryForm.locator('input[name="buddyCareDiaryHeight"]').fill('13.0');
    await diaryForm.locator('input[type="checkbox"][value="observation"]').check();
    await diaryForm.evaluate((form) => {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
        return;
      }
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(() => {
      const state = window.__gsState && window.__gsState.buddyCare;
      return Boolean(state && Array.isArray(state.diaryEntries) && state.diaryEntries.length >= 2);
    });

    const diaryCountBeforeDelete = await page.evaluate(() => {
      const state = window.__gsState && window.__gsState.buddyCare;
      return state && Array.isArray(state.diaryEntries) ? state.diaryEntries.length : 0;
    });

    await page.click('[data-buddy-care-delete-entry]');
    await waitForMenuDialogVisible(page);

    const deletePromptState = await page.evaluate(() => {
      const state = window.__gsState && window.__gsState.buddyCare;
      return {
        diaryEntries: state && Array.isArray(state.diaryEntries) ? state.diaryEntries.length : 0,
        title: document.getElementById('menuDialogTitle')?.textContent.trim() || '',
        message: document.getElementById('menuDialogText')?.textContent.trim() || ''
      };
    });

    assert.strictEqual(deletePromptState.diaryEntries, diaryCountBeforeDelete, 'opening the delete dialog should not delete a diary entry yet');
    assert.match(deletePromptState.title, /Eintrag wirklich löschen\?/i, 'deleting a diary entry should require confirmation');
    assert.match(deletePromptState.message, /Buddy Care\+/i, 'delete confirmation should explain the affected diary entry scope');

    await page.click('#menuDialogCancelBtn');
    await page.waitForFunction(() => {
      const dialog = document.getElementById('menuDialog');
      return Boolean(dialog && dialog.classList.contains('hidden'));
    });

    const diaryCountAfterCancel = await page.evaluate(() => {
      const state = window.__gsState && window.__gsState.buddyCare;
      return state && Array.isArray(state.diaryEntries) ? state.diaryEntries.length : 0;
    });

    assert.strictEqual(diaryCountAfterCancel, diaryCountBeforeDelete, 'canceling the delete prompt should keep the diary entry untouched');

    const beforeReload = await page.evaluate(() => {
      const state = window.__gsState && window.__gsState.buddyCare;
      return {
        entitlement: state && state.entitlement,
        plants: state && Array.isArray(state.plants) ? state.plants.length : 0,
        dailyChecks: state && Array.isArray(state.dailyChecks) ? state.dailyChecks.length : 0,
        diaryEntries: state && Array.isArray(state.diaryEntries) ? state.diaryEntries.length : 0,
        activePlantId: state && state.activePlantId,
        lockedSlots: document.querySelectorAll('.buddy-care-plant-item--locked').length
      };
    });

    assert.strictEqual(beforeReload.entitlement, 'care_plus_mock', 'test access entitlement should stay active');
    assert.strictEqual(beforeReload.plants, 3, 'three Buddy Care plants should be present before reload');
    assert.ok(beforeReload.dailyChecks >= 1, 'a daily check should be stored before reload');
    assert.ok(beforeReload.diaryEntries >= 1, 'at least one diary entry should remain before reload');
    assert.strictEqual(beforeReload.lockedSlots, 0, 'test access should hide locked slots');
    assert.strictEqual(beforeReload.activePlantId, 'buddy-plant-1', 'last opened plant should be the persisted active plant');

    await page.evaluate(() => {
      const gameMenu = document.getElementById('gameMenu');
      if (gameMenu && gameMenu.getAttribute('aria-hidden') === 'false') {
        document.getElementById('menuCloseBtn')?.click();
      }
    });
    for (const view of ['today', 'plants', 'diary', 'more']) {
      await switchBuddyCareView(page, view);
      await page.waitForTimeout(360);
      assert.strictEqual(await page.evaluate(() => Array.from(document.querySelectorAll('#buddyCareScreen h1')).filter((heading) => heading.getClientRects().length > 0).length), 1, `${view} should expose exactly one visible main heading`);
      if (captureScreenshots) {
        await page.screenshot({ path: path.join(screenshotDir, `${view}-${viewportWidth}x${viewportHeight}.png`), fullPage: true });
      }
    }
    await openPlantDetails(page, 'buddy-plant-1');
    await page.waitForTimeout(360);
    if (captureScreenshots) {
      await page.screenshot({ path: path.join(screenshotDir, `plant-detail-${viewportWidth}x${viewportHeight}.png`), fullPage: true });
    }

    const mobileLayout = await page.evaluate(() => {
      const screen = document.getElementById('buddyCareScreen');
      const scrollContent = document.getElementById('buddyCareScrollContent');
      const nav = document.getElementById('buddyCareViewNav');
      const screenRect = screen?.getBoundingClientRect();
      const scrollRect = scrollContent?.getBoundingClientRect();
      const navRect = nav?.getBoundingClientRect();
      return {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        activeNavCount: document.querySelectorAll('#buddyCareViewNav [aria-current="page"]').length,
        detailTabCount: document.querySelectorAll('#buddyCarePlantDetailCard [role="tab"]').length,
        navOutsideScroll: Boolean(scrollContent && nav && !scrollContent.contains(nav)),
        navBottomDelta: screenRect && navRect ? Math.abs(screenRect.bottom - navRect.bottom) : 999,
        separatedRegions: Boolean(scrollRect && navRect && scrollRect.bottom <= navRect.top + 1)
      };
    });
    assert.ok(mobileLayout.scrollWidth <= mobileLayout.viewportWidth + 1, `Buddy Care should not create horizontal page overflow at ${viewportWidth}px`);
    assert.strictEqual(mobileLayout.activeNavCount, 1, 'exactly one bottom navigation item should be active');
    assert.strictEqual(mobileLayout.detailTabCount, 6, 'plant detail should expose overview, daily check, diary, history, photos, and week tabs');
    assert.strictEqual(mobileLayout.navOutsideScroll, true, 'bottom navigation should remain outside the scroll content');
    assert.ok(mobileLayout.navBottomDelta <= 1, 'bottom navigation should stay aligned with the Care screen bottom');
    assert.strictEqual(mobileLayout.separatedRegions, true, 'scroll content and bottom navigation should not overlap');

    await page.reload({ waitUntil: 'networkidle' });
    await waitForBoot(page);
    await openBuddyCare(page);
    await switchBuddyCareView(page, 'plants');

    const afterReload = await page.evaluate(() => {
      const state = window.__gsState && window.__gsState.buddyCare;
      return {
        entitlement: state && state.entitlement,
        plants: state && Array.isArray(state.plants) ? state.plants.length : 0,
        dailyChecks: state && Array.isArray(state.dailyChecks) ? state.dailyChecks.length : 0,
        diaryEntries: state && Array.isArray(state.diaryEntries) ? state.diaryEntries.length : 0,
        activePlantId: state && state.activePlantId,
        activePlantCards: document.querySelectorAll('#buddyCarePlantsView .buddy-care-plant-profile-card[data-active-plant="true"]').length,
        plantCountLabel: document.getElementById('buddyCarePlantCount')?.textContent.trim() || '',
        ageGateHidden: Boolean(document.getElementById('buddyCareAgeGateCard')?.hidden)
      };
    });

    assert.strictEqual(afterReload.entitlement, 'care_plus_mock', 'test access entitlement should persist after reload');
    assert.strictEqual(afterReload.plants, 3, 'Buddy Care plants should persist after reload');
    assert.ok(afterReload.dailyChecks >= 1, 'daily checks should persist after reload');
    assert.ok(afterReload.diaryEntries >= 1, 'diary entries should persist after reload');
    assert.strictEqual(afterReload.plantCountLabel, '3 von 3 Pflanzen', 'plant count label should restore after reload');
    assert.strictEqual(afterReload.ageGateHidden, true, 'age gate should stay accepted after reload');
    assert.strictEqual(afterReload.activePlantId, 'buddy-plant-1', 'active plant should persist after reload');
    assert.strictEqual(afterReload.activePlantCards, 1, 'restored active plant should have one visible selected card');
    const persistedUnicode = await page.locator('#buddyCareScreen').textContent();
    assert.match(persistedUnicode || '', /Audit Blüte/i, 'plant names with umlauts should persist and render after reload');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }

  console.log('buddy-care-e2e-smoke.test.js passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
