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
  await page.click('#buddyCareBackBtn');
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
  await switchBuddyCareView(page, 'plants');
  await page.fill('#buddyCarePlantNameInput', name);
  await page.selectOption('#buddyCarePlantTypeSelect', 'auto');
  await page.selectOption('#buddyCarePlantEnvironmentSelect', 'indoor');
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
  const viewportHeight = Math.max(640, Number(process.env.BUDDY_CARE_VIEWPORT_HEIGHT) || 844);
  const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight } });

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

    const productCopy = await page.locator('#buddyCareScreen').textContent();
    assert.doesNotMatch(productCopy || '', /(Technisches Fundament|Phase 5|MVP 0\.1|Mock freischalten|Testmodus:)/i, 'Buddy Care should not show internal rollout wording');
    assert.match(productCopy || '', /Testzugang aktivieren/i, 'Buddy Care should use product-ready test access wording');

    await fillPlantSetup(page, 'Audit Alpha');
    await page.waitForFunction(() => {
      const badge = document.getElementById('buddyCarePlantCount');
      return Boolean(badge && badge.textContent.includes('1 / 1'));
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

    await fillPlantSetup(page, 'Audit Beta');
    await fillPlantSetup(page, 'Audit Gamma');
    await page.waitForFunction(() => {
      const badge = document.getElementById('buddyCarePlantCount');
      return Boolean(badge && badge.textContent.includes('3 / 3'));
    });

    await switchBuddyCareView(page, 'plants');
    await page.click('#buddyCarePlantsView [data-buddy-care-open-check="buddy-plant-1"]');
    await page.waitForFunction(() => {
      const card = document.getElementById('buddyCareDailyCheckCard');
      return Boolean(card && card.hidden === false);
    });
    await page.selectOption('#buddyCareDailyCheckMoistureSelect', 'moist');
    await page.selectOption('#buddyCareDailyCheckLeafStateSelect', 'normal');
    await page.selectOption('#buddyCareDailyCheckGrowthStateSelect', 'normal');
    await page.selectOption('#buddyCareDailyCheckEnvironmentStressSelect', 'normal');
    await page.selectOption('#buddyCareDailyCheckPestsVisibleSelect', 'no');
    await page.fill('#buddyCareDailyCheckHeightInput', '12.5');
    await page.fill('#buddyCareDailyCheckNoteInput', 'Audit check');
    await page.click('#buddyCareDailyCheckSubmitBtn');
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
      return Boolean(card && /Wochenrueckblick|Wochenrückblick/i.test(card.textContent || ''));
    });
    await openPlantDetailSection(page, 'data');
    const detailText = await page.locator('#buddyCarePlantDetailCard').textContent();
    assert.match(detailText || '', /Daten/i, 'plant data should stay in the dedicated detail area');
    await switchBuddyCareView(page, 'history');
    const composerState = await page.evaluate(() => {
      window.__gsOpenBuddyCareDiaryComposer('buddy-plant-1');
      const hub = document.getElementById('buddyCareDiaryHubCard');
      return {
        activeView: document.querySelector('[data-buddy-care-view="history"]')?.classList.contains('is-active'),
        hubHidden: hub?.hidden,
        formCount: hub?.querySelectorAll('#buddyCareDiaryHubForm').length || 0,
        text: hub?.textContent.trim().slice(0, 120) || ''
      };
    });
    assert.strictEqual(composerState.formCount, 1, `history composer should open: ${JSON.stringify(composerState)}`);

    const diaryForm = page.locator('#buddyCareDiaryHubForm');
    await diaryForm.locator('select[name="buddyCareDiaryPlantId"]').selectOption('buddy-plant-1');
    await diaryForm.locator('input[name="buddyCareDiaryTitle"]').fill('Manual note');
    await diaryForm.locator('textarea[name="buddyCareDiaryNote"]').fill('Observed calmly.');
    await diaryForm.locator('input[name="buddyCareDiaryHeight"]').fill('13.0');
    await diaryForm.locator('input[type="checkbox"][value="observation"]').check();
    await diaryForm.locator('button[type="submit"]').click();
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
    assert.match(deletePromptState.title, /Eintrag wirklich loeschen\?/i, 'deleting a diary entry should require confirmation');
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
        lockedSlots: document.querySelectorAll('.buddy-care-plant-item--locked').length
      };
    });

    assert.strictEqual(beforeReload.entitlement, 'care_plus_mock', 'test access entitlement should stay active');
    assert.strictEqual(beforeReload.plants, 3, 'three Buddy Care plants should be present before reload');
    assert.ok(beforeReload.dailyChecks >= 1, 'a daily check should be stored before reload');
    assert.ok(beforeReload.diaryEntries >= 1, 'at least one diary entry should remain before reload');
    assert.strictEqual(beforeReload.lockedSlots, 0, 'test access should hide locked slots');

    const captureScreenshots = process.env.BUDDY_CARE_CAPTURE_SCREENSHOTS === '1';
    const screenshotDir = path.join(ROOT, 'output', 'care-reference-e2e');
    if (captureScreenshots) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.evaluate(() => {
      const gameMenu = document.getElementById('gameMenu');
      if (gameMenu && gameMenu.getAttribute('aria-hidden') === 'false') {
        document.getElementById('menuCloseBtn')?.click();
      }
    });
    for (const view of ['today', 'plants', 'history', 'more']) {
      await switchBuddyCareView(page, view);
      await page.waitForTimeout(360);
      if (captureScreenshots) {
        await page.screenshot({ path: path.join(screenshotDir, `${view}-${viewportWidth}x${viewportHeight}.png`), fullPage: true });
      }
    }
    await openPlantDetails(page, 'buddy-plant-1');
    await page.waitForTimeout(360);
    if (captureScreenshots) {
      await page.screenshot({ path: path.join(screenshotDir, `plant-detail-${viewportWidth}x${viewportHeight}.png`), fullPage: true });
    }

    const mobileLayout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      activeNavCount: document.querySelectorAll('#buddyCareViewNav [aria-current="page"]').length,
      detailTabCount: document.querySelectorAll('#buddyCarePlantDetailCard [role="tab"]').length
    }));
    assert.ok(mobileLayout.scrollWidth <= mobileLayout.viewportWidth + 1, `Buddy Care should not create horizontal page overflow at ${viewportWidth}px`);
    assert.strictEqual(mobileLayout.activeNavCount, 1, 'exactly one bottom navigation item should be active');
    assert.strictEqual(mobileLayout.detailTabCount, 3, 'plant detail should expose overview, history, and data tabs');

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
        plantCountLabel: document.getElementById('buddyCarePlantCount')?.textContent.trim() || '',
        ageGateHidden: Boolean(document.getElementById('buddyCareAgeGateCard')?.hidden)
      };
    });

    assert.strictEqual(afterReload.entitlement, 'care_plus_mock', 'test access entitlement should persist after reload');
    assert.strictEqual(afterReload.plants, 3, 'Buddy Care plants should persist after reload');
    assert.ok(afterReload.dailyChecks >= 1, 'daily checks should persist after reload');
    assert.ok(afterReload.diaryEntries >= 1, 'diary entries should persist after reload');
    assert.strictEqual(afterReload.plantCountLabel, '3 / 3', 'plant count label should restore after reload');
    assert.strictEqual(afterReload.ageGateHidden, true, 'age gate should stay accepted after reload');
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
