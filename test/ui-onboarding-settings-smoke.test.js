#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady,
  clearClientStorage: resetClientStorage
} = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const CLIENT_HOST = HOST;
const PORT = 0;
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function expectDisabled(page, selector) {
  const state = await page.locator(selector).evaluate((node) => ({
    disabled: Boolean(node.disabled),
    ariaDisabled: node.getAttribute('aria-disabled')
  }));

  assert.strictEqual(state.disabled, true, `${selector} should be disabled`);
  assert.strictEqual(state.ariaDisabled, 'true', `${selector} should expose disabled state`);
}

async function waitForTransientUiSettled(page, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot = null;

  while (Date.now() < deadline) {
    lastSnapshot = await page.evaluate(() => {
      const menu = document.getElementById('gameMenu');
      const dialog = document.getElementById('menuDialog');
      const dialogKicker = document.getElementById('menuDialogKicker');
      const uiState = window.__gsState && window.__gsState.ui && typeof window.__gsState.ui === 'object'
        ? window.__gsState.ui
        : {};

      return {
        bootOk: window.__gsBootOk === true,
        menuHidden: Boolean(menu && menu.classList.contains('hidden')),
        menuAriaHidden: menu ? menu.getAttribute('aria-hidden') : null,
        dialogHidden: Boolean(dialog && dialog.classList.contains('hidden')),
        dialogAriaHidden: dialog ? dialog.getAttribute('aria-hidden') : null,
        dialogVariant: dialog ? dialog.dataset.variant || '' : '',
        dialogKickerText: dialogKicker ? dialogKicker.textContent.trim() : '',
        uiMenuOpen: Boolean(uiState.menuOpen),
        uiMenuDialogOpen: Boolean(uiState.menuDialogOpen),
        uiOpenSheet: uiState.openSheet || null,
        storedUi: (() => {
          try {
            const raw = localStorage.getItem('grow-sim-state-v2');
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed && parsed.ui ? {
              menuOpen: Boolean(parsed.ui.menuOpen),
              menuDialogOpen: Boolean(parsed.ui.menuDialogOpen),
              openSheet: parsed.ui.openSheet || null
            } : null;
          } catch (error) {
            return { error: String(error && error.message ? error.message : error) };
          }
        })(),
        bootTraceTail: Array.isArray(window.__gsBootTrace) ? window.__gsBootTrace.slice(-8).map((entry) => entry.step || '') : []
      };
    });

    const domSettled = lastSnapshot.menuHidden
      && lastSnapshot.dialogHidden
      && lastSnapshot.menuAriaHidden === 'true'
      && lastSnapshot.dialogAriaHidden === 'true';
    const stateSettled = !lastSnapshot.uiMenuOpen && !lastSnapshot.uiMenuDialogOpen;

    if (lastSnapshot.bootOk && domSettled && stateSettled) {
      return lastSnapshot;
    }

    const storedTransientOpen = Boolean(lastSnapshot.storedUi && (
      lastSnapshot.storedUi.menuOpen
      || lastSnapshot.storedUi.menuDialogOpen
      || lastSnapshot.storedUi.openSheet
    ));
    const runtimeMissionRewardDialog = lastSnapshot.bootOk
      && !storedTransientOpen
      && lastSnapshot.dialogVariant === 'mission-reward'
      && /Mission geschafft/i.test(lastSnapshot.dialogKickerText || '');
    if (runtimeMissionRewardDialog) {
      await page.click('#menuDialogCancelBtn');
      await page.waitForTimeout(120);
      const menuStillOpen = await page.evaluate(() => {
        const menu = document.getElementById('gameMenu');
        return Boolean(menu && !menu.classList.contains('hidden'));
      });
      if (menuStillOpen) {
        await page.evaluate(() => {
          if (typeof closeMenu === 'function') {
            closeMenu();
          }
        });
        await page.waitForTimeout(120);
      }
      continue;
    }

    await page.waitForTimeout(120);
  }

  throw new Error(`transient UI state did not settle after reload: ${JSON.stringify(lastSnapshot)}`);
}

async function dismissMissionRewardDialogIfPresent(page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const dialogState = await page.evaluate(() => {
      const dialog = document.getElementById('menuDialog');
      return {
        open: Boolean(dialog && !dialog.classList.contains('hidden')),
        variant: dialog ? dialog.dataset.variant || '' : ''
      };
    });
    if (!(dialogState.open && dialogState.variant === 'mission-reward')) {
      if (attempt > 1) {
        return;
      }
      await page.waitForTimeout(150);
      continue;
    }
    await page.click('#menuDialogCancelBtn');
    await page.waitForFunction(() => {
      const dialog = document.getElementById('menuDialog');
      return Boolean(dialog && dialog.classList.contains('hidden'));
    });
    await page.waitForTimeout(150);
  }
}

async function readCareStudioLocaleSnapshot(page) {
  return page.evaluate(() => {
    if (typeof renderAll === 'function' && window.__gsState && window.__gsState.ui) {
      window.__gsState.ui.openSheet = 'care';
      renderAll();
    }
    const careSheet = document.getElementById('careSheet');
    return {
      visible: Boolean(careSheet && !careSheet.classList.contains('hidden')),
      title: document.getElementById('careSheetTitle')?.textContent.trim() || '',
      timing: document.getElementById('careStudioTimingBadge')?.textContent.trim() || '',
      hint: document.getElementById('careStudioHintText')?.textContent.trim() || '',
      coachLine: document.getElementById('careStudioCoachLine')?.textContent.trim() || '',
      closeLabel: document.querySelector('#careSheet .care-sheet-close')?.textContent.trim() || '',
      closeAria: document.querySelector('#careSheet .care-sheet-close')?.getAttribute('aria-label') || '',
      tabs: Array.from(document.querySelectorAll('#careCategoryList .care-category-label')).map((node) => node.textContent.trim()),
      fullText: careSheet ? careSheet.textContent.replace(/\s+/g, ' ').trim() : ''
    };
  });
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await setupAuthHarness(page, AUTH_TOKEN_KEY, {
    email: 'onboarding@test.local',
    displayName: 'Onboarding Test'
  });

  try {
    const url = `${baseUrl}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBootReady(page);
    await resetClientStorage(page, { preserveLocalStorageKeys: [AUTH_TOKEN_KEY] });
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBootReady(page);
    await page.waitForFunction(() => {
      return Boolean(
        window.GrowSimAuth
        && typeof window.GrowSimAuth.isAuthenticated === 'function'
        && window.GrowSimAuth.isAuthenticated()
      );
    }, null, { timeout: 10000 });
    await page.waitForFunction(() => {
      return Boolean(
        window.GrowSimAuth
        && typeof window.GrowSimAuth.getUser === 'function'
        && window.GrowSimAuth.getUser()
        && window.GrowSimAuth.getUser().email
      );
    }, null, { timeout: 10000 });

    const landingState = await page.locator('#landing').evaluate((node) => ({
      hasHiddenClass: node.classList.contains('hidden'),
      ariaHidden: node.getAttribute('aria-hidden')
    }));
    assert.strictEqual(landingState.hasHiddenClass, false, 'landing overlay should be visible before the first run');
    assert.strictEqual(landingState.ariaHidden, 'false', 'landing overlay should expose its visible state');

    const hudState = await page.locator('#app-hud').evaluate((node) => ({
      ariaHidden: node.getAttribute('aria-hidden'),
      inert: Boolean(node.inert),
      blocked: node.classList.contains('app-hud--blocked')
    }));
    assert.strictEqual(hudState.ariaHidden, 'true', 'hud should be hidden from assistive tech while onboarding is open');
    assert.ok(hudState.inert || hudState.blocked, 'hud should not be interactable while onboarding is open');

    await expectDisabled(page, '#setupBackBtn');
    await expectDisabled(page, '#setupPresetBtn');

    const initialBuilderState = await page.evaluate(() => {
      const guestWelcomeNode = document.querySelector('[data-guest-welcome-note]');
      const guestWelcomeVisible = Boolean(
        guestWelcomeNode
        && !guestWelcomeNode.classList.contains('hidden')
        && guestWelcomeNode.getAttribute('aria-hidden') !== 'true'
      );
      return {
        stepLabel: document.getElementById('onboardingStepLabel')?.textContent.trim() || null,
        activeTitle: document.querySelector('.run-builder-step.is-active h3')?.textContent.trim() || null,
        guestWelcomeText: guestWelcomeVisible ? guestWelcomeNode.textContent.replace(/\s+/g, ' ').trim() : '',
        guestWelcomeVisible,
        activePot: Boolean(document.querySelector('[data-setup-select="setupPotSize"].is-active')),
        buddySrc: document.querySelector('.run-builder-step.is-active .onboarding-buddy-tip img')?.getAttribute('src') || null,
        potIconSrc: document.querySelector('[data-setup-select="setupPotSize"][data-setup-value="small"] .onboarding-option-media__image')?.getAttribute('src') || null,
        nextHidden: document.getElementById('setupNextBtn')?.classList.contains('hidden') || false,
        startHidden: document.getElementById('startRunBtn')?.classList.contains('hidden') || false,
        outdoorDisabled: Boolean(document.querySelector('[data-setup-select="setupMode"][data-setup-value="outdoor"]')?.disabled),
        highLightDisabled: Boolean(document.querySelector('[data-setup-select="setupLight"][data-setup-value="high"]')?.disabled)
      };
    });
    assert.strictEqual(initialBuilderState.stepLabel, 'Schritt 1 von 4', 'run builder should start directly at step 1');
    assert.strictEqual(initialBuilderState.activeTitle, 'Dein erster Grow beginnt', 'first onboarding step should use the new welcome screen');
    assert.strictEqual(initialBuilderState.guestWelcomeVisible, false, 'signed-in first run setup should hide the guest-mode welcome note');
    assert.strictEqual(initialBuilderState.guestWelcomeText, '', 'signed-in first run setup should not show the guest-mode welcome note');
    assert.strictEqual(initialBuilderState.activePot, false, 'first step should now be a welcome screen instead of a pot picker');
    assert.strictEqual(initialBuilderState.nextHidden, false, 'next button should be visible before summary');
    assert.strictEqual(initialBuilderState.startHidden, true, 'start button should stay hidden before summary');
    assert.strictEqual(initialBuilderState.outdoorDisabled, false, 'quick setup should keep the environment choices visible for the first-run flow');
    assert.strictEqual(initialBuilderState.highLightDisabled, false, 'quick setup no longer exposes the old light lock card on step 1');

    for (let index = 0; index < 3; index += 1) {
      if (index === 0) {
        await page.click('#setupNextBtn');
        const introBuddySrc = await page.locator('.run-builder-step.is-active .onboarding-buddy-tip img').getAttribute('src');
        assert.strictEqual(introBuddySrc, 'assets/onboarding/buddy_setup.png', 'buddy intro should use the setup Buddy asset');
        continue;
      }
      await page.click('#setupNextBtn');
    }

    const summaryState = await page.evaluate(() => ({
      stepLabel: document.getElementById('onboardingStepLabel')?.textContent.trim() || null,
      activeTitle: document.querySelector('.run-builder-step.is-active h3')?.textContent.trim() || null,
      nextHidden: document.getElementById('setupNextBtn')?.classList.contains('hidden') || false,
      startHidden: document.getElementById('startRunBtn')?.classList.contains('hidden') || false,
      backDisabled: Boolean(document.getElementById('setupBackBtn')?.disabled),
      pot: document.getElementById('onboardingSummaryPot')?.textContent.trim() || null,
      genetics: document.getElementById('onboardingSummaryGenetics')?.textContent.trim() || null,
      mode: document.getElementById('onboardingSummaryMode')?.textContent.trim() || null,
      medium: document.getElementById('onboardingSummaryMedium')?.textContent.trim() || null,
      light: document.getElementById('onboardingSummaryLight')?.textContent.trim() || null,
      profileTitle: document.getElementById('setupStrategyTitle')?.textContent.trim() || null,
      buddySrc: document.querySelector('.run-builder-step.is-active .onboarding-buddy-tip img')?.getAttribute('src') || null,
      mediumLightIconSrc: document.querySelector('[data-setup-select="setupLight"][data-setup-value="medium"] .onboarding-option-media__image')?.getAttribute('src') || null,
      summaryPotIconSrc: document.querySelector('[data-summary-select="setupPotSize"] .summary-setup-media__image')?.getAttribute('src') || null,
      summaryGeneticsIconSrc: document.querySelector('[data-summary-select="setupGenetics"] .summary-setup-media__image')?.getAttribute('src') || null,
      summaryLightIconSrc: document.querySelector('[data-summary-select="setupLight"] .summary-setup-media__image')?.getAttribute('src') || null
    }));
    assert.strictEqual(summaryState.stepLabel, 'Schritt 4 von 4', 'summary should be the fourth onboarding step');
    assert.strictEqual(summaryState.activeTitle, 'Dein Grow ist startbereit', 'summary step should show the final guided run state');
    assert.strictEqual(summaryState.nextHidden, true, 'next button should be hidden on summary');
    assert.strictEqual(summaryState.startHidden, false, 'start button should be visible on summary');
    assert.strictEqual(summaryState.backDisabled, false, 'back button should be available on summary');
    assert.ok((summaryState.pot || '').length > 0, 'summary should include a mapped pot size');
    assert.strictEqual(summaryState.genetics, 'Hybrid', 'summary should include selected genetics');
    assert.ok((summaryState.mode || '').length > 0, 'summary should include selected setup mode');
    assert.ok((summaryState.medium || '').length > 0, 'summary should include selected medium');
    assert.ok((summaryState.light || '').length > 0, 'summary should include selected light');
    assert.strictEqual(summaryState.profileTitle, 'Balanced Control', 'summary should reuse the run build presentation');
    assert.strictEqual(summaryState.buddySrc, 'assets/onboarding/buddy_summary.png', 'summary step should use the summary Buddy asset');
    assert.ok(summaryState.mediumLightIconSrc === null || /light_/.test(summaryState.mediumLightIconSrc), 'light card should keep a stable asset mapping when available');
    assert.ok(summaryState.summaryPotIconSrc === null || /pot_/.test(summaryState.summaryPotIconSrc), 'summary pot should use a stable pot asset when available');
    assert.strictEqual(summaryState.summaryGeneticsIconSrc, 'assets/onboarding/genetic_hybrid.png', 'summary genetics should use the selected genetics PNG asset');
    assert.ok(summaryState.summaryLightIconSrc === null || /light_/.test(summaryState.summaryLightIconSrc), 'summary light should keep a stable light asset when available');

    await page.click('#startRunBtn');
    await page.waitForFunction(() => document.getElementById('landing').classList.contains('hidden'));

    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return Boolean(overlay && !overlay.classList.contains('hidden'));
    });
    const firstRunIntroState = await page.evaluate(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return {
        text: overlay ? overlay.textContent.replace(/\s+/g, ' ').trim() : ''
      };
    });
    assert.match(firstRunIntroState.text, /Tag 1|Keimling/i, 'first started run should open the guided day-1 overlay');
    await page.click('#firstRunIntroPrimaryBtn');
    await page.waitForFunction(() => Boolean(document.querySelector('[data-first-run-decision="gentle_water"]')));
    await page.click('[data-first-run-decision="gentle_water"]');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return Boolean(overlay && /Guter Start/i.test(overlay.textContent || ''));
    });
    await page.click('#firstRunIntroPrimaryBtn');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return Boolean(overlay && /Tag 1 geschafft/i.test(overlay.textContent || ''));
    });
    await page.click('#firstRunIntroPrimaryBtn');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return Boolean(overlay && overlay.classList.contains('hidden'));
    });
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunDashboardFollowupOverlay');
      return Boolean(overlay && !overlay.classList.contains('hidden'));
    });
    const dashboardFollowupState = await page.evaluate(() => {
      const overlay = document.getElementById('firstRunDashboardFollowupOverlay');
      return {
        text: overlay ? overlay.textContent.replace(/\s+/g, ' ').trim() : ''
      };
    });
    assert.match(dashboardFollowupState.text, /Dein Grow laeuft/i, 'first finished intro should surface the calm dashboard follow-up');
    assert.match(dashboardFollowupState.text, /Weiter/i, 'dashboard follow-up should expose the continue CTA');
    await page.click('#firstRunDashboardFollowupBtn');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunDashboardFollowupOverlay');
      return Boolean(overlay && overlay.classList.contains('hidden'));
    });
    await page.waitForFunction(() => {
      const teaser = document.getElementById('homeMetaRetentionTeaser');
      return Boolean(teaser && teaser.dataset.mode === 'starter' && teaser.dataset.actionTarget === 'dashboard');
    });
    const firstRunTeaserState = await page.evaluate(() => {
      const teaser = document.getElementById('homeMetaRetentionTeaser');
      return {
        text: teaser ? teaser.textContent.replace(/\s+/g, ' ').trim() : '',
        actionTarget: teaser ? teaser.dataset.actionTarget || '' : '',
        mode: teaser ? teaser.dataset.mode || '' : ''
      };
    });
    assert.strictEqual(firstRunTeaserState.actionTarget, 'dashboard', 'post-intro first-day goal should route into the dashboard');
    assert.strictEqual(firstRunTeaserState.mode, 'starter', 'post-intro first-day goal should still use the starter teaser slot');
    assert.match(firstRunTeaserState.text, /Naechster Schritt|Wachstumsreaktion/i, 'post-intro teaser should explain the next first-day step');
    await page.locator('#homeMetaRetentionTeaser').evaluate((node) => node.click());
    await page.waitForFunction(() => {
      const dashboardSheet = document.getElementById('dashboardSheet');
      return Boolean(dashboardSheet && !dashboardSheet.classList.contains('hidden'));
    });
    await page.click('#dashboardSheet [data-close-sheet]');
    await waitForTransientUiSettled(page);
    if (false) {

    await page.waitForFunction(() => {
      const teaser = document.getElementById('homeMetaRetentionTeaser');
      return Boolean(teaser && teaser.dataset.mode === 'starter' && teaser.dataset.actionTarget === 'care');
    });
    const firstRunTeaserState = await page.evaluate(() => {
      const teaser = document.getElementById('homeMetaRetentionTeaser');
      return {
        text: teaser ? teaser.textContent.replace(/\s+/g, ' ').trim() : '',
        title: teaser ? teaser.getAttribute('title') || '' : '',
        actionTarget: teaser ? teaser.dataset.actionTarget || '' : '',
        mode: teaser ? teaser.dataset.mode || '' : ''
      };
    });
    assert.match(firstRunTeaserState.text, /Care Studio/i, 'first started run should show the starter check in the home teaser slot');
    assert.strictEqual(firstRunTeaserState.actionTarget, 'care', 'starter teaser should route into Care Studio');
    assert.strictEqual(firstRunTeaserState.mode, 'starter', 'starter teaser should use the starter mode state');
    assert.match(firstRunTeaserState.title, /Feuchte|moisture/i, 'starter teaser tooltip should explain the first check');
    await page.locator('#homeMetaRetentionTeaser').evaluate((node) => node.click());
    await page.waitForFunction(() => {
      const careSheet = document.getElementById('careSheet');
      return Boolean(careSheet && !careSheet.classList.contains('hidden') && window.__gsState && window.__gsState.ui && window.__gsState.ui.openSheet === 'care');
    });
    const firstVisitCareState = await readCareStudioLocaleSnapshot(page);
    assert.strictEqual(firstVisitCareState.visible, true, 'starter teaser should open the care sheet');
    assert.strictEqual(firstVisitCareState.closeLabel, 'Schließen', 'care sheet close button should follow the active German locale');
    assert.strictEqual(firstVisitCareState.closeAria, 'Schließen', 'care sheet close button aria label should follow the active German locale');
    assert.match(firstVisitCareState.coachLine, /Feuchte|Risiko/i, 'first care visit should highlight moisture or risk');
    assert.doesNotMatch(firstVisitCareState.fullText, /careStudio\./i, 'care sheet should not leak raw care studio keys on first visit');
    await page.click('#careSheet [data-close-sheet]');
    await page.waitForFunction(() => document.getElementById('careSheet').classList.contains('hidden'));
    }

    await page.locator('#harvestForecastWidget').evaluate((node) => node.click());
    await page.waitForFunction(() => {
      const harvestSheet = document.getElementById('harvestAnalysisSheet');
      const dashboardSheet = document.getElementById('dashboardSheet');
      return harvestSheet
        && !harvestSheet.classList.contains('hidden')
        && dashboardSheet
        && dashboardSheet.classList.contains('hidden');
    });
    const harvestPopupState = await page.evaluate(() => ({
      openSheet: window.__gsState && window.__gsState.ui ? window.__gsState.ui.openSheet : null,
      projected: document.getElementById('harvestAnalysisProjectedValue')?.textContent.trim() || null,
      quality: document.getElementById('harvestAnalysisQualityValue')?.textContent.trim() || null,
      trend: document.getElementById('harvestAnalysisTrendValue')?.textContent.trim() || null,
      hasRecommendation: Boolean(document.querySelector('#harvestAnalysisRecommendationsList > *'))
    }));
    assert.strictEqual(harvestPopupState.openSheet, 'harvestAnalysis', 'harvest mini card should open the compact harvest analysis sheet');
    assert.ok(/g$/.test(harvestPopupState.projected || ''), 'harvest popup should render a gram forecast');
    assert.ok((harvestPopupState.quality || '').includes('/'), 'harvest popup should render quality grade and score');
    assert.ok(/steigt|stabil|f.llt/.test(harvestPopupState.trend || ''), 'harvest popup should render a readable trend');
    assert.strictEqual(harvestPopupState.hasRecommendation, true, 'harvest popup should render recommendations or fallback guidance');

    await page.click('#harvestAnalysisSheet [data-close-sheet]');
    await page.waitForFunction(() => document.getElementById('harvestAnalysisSheet').classList.contains('hidden'));
    await page.locator('#harvestForecastWidget').evaluate((node) => node.click());
    await page.waitForFunction(() => !document.getElementById('harvestAnalysisSheet').classList.contains('hidden'));
    await page.click('#harvestAnalysisSheet .harvest-analysis-understood-btn');
    await page.waitForFunction(() => document.getElementById('harvestAnalysisSheet').classList.contains('hidden'));
    await page.locator('#harvestForecastWidget').evaluate((node) => node.click());
    await page.waitForFunction(() => !document.getElementById('harvestAnalysisSheet').classList.contains('hidden'));
    await page.click('#harvestAnalysisDetailsBtn');
    await page.waitForFunction(() => {
      const harvestSheet = document.getElementById('harvestAnalysisSheet');
      const dashboardSheet = document.getElementById('dashboardSheet');
      return harvestSheet
        && harvestSheet.classList.contains('hidden')
        && dashboardSheet
        && !dashboardSheet.classList.contains('hidden');
    });
    await page.click('#dashboardSheet [data-close-sheet]');
    await page.evaluate(() => {
      const run = window.getCanonicalRun ? window.getCanonicalRun() : state.run;
      if (run && run.harvest) {
        run.harvest.currentForecast = null;
      }
    });
    await page.locator('#harvestForecastWidget').evaluate((node) => node.click());
    await page.waitForFunction(() => !document.getElementById('harvestAnalysisSheet').classList.contains('hidden'));
    const fallbackPopupState = await page.evaluate(() => ({
      projected: document.getElementById('harvestAnalysisProjectedValue')?.textContent.trim() || null,
      dashboardOpen: document.getElementById('dashboardSheet')?.classList.contains('hidden') === false
    }));
    assert.ok(/g$/.test(fallbackPopupState.projected || ''), 'harvest popup should survive missing forecast data with a gram fallback');
    assert.strictEqual(fallbackPopupState.dashboardOpen, false, 'fallback harvest popup open should still not open dashboard');
    await page.click('#harvestAnalysisSheet [data-close-sheet]');

    await page.evaluate(() => {
      state.ui.openSheet = 'diagnosis';
      renderAll();
    });
    await page.waitForFunction(() => {
      const node = document.getElementById('diagnosisSheet');
      return node && !node.classList.contains('hidden');
    });

    const cloudSync = await page.locator('#settingsCloudSyncValue').evaluate((node) => ({
      text: node.textContent.trim(),
      className: node.className,
      title: node.getAttribute('title')
    }));
    assert.strictEqual(cloudSync.text, 'onboarding@test.local', 'settings should reflect the connected cloud identity from the auth session');
    assert.ok(cloudSync.className.includes('value_green'), 'connected cloud sync should be styled as active');
    assert.strictEqual(cloudSync.title, 'Cloud Sync ist verbunden. Hier kannst du dein Konto verwalten oder dich wieder abmelden.', 'cloud status should explain the connected account path without pressuring startup login');

    await page.click('#settingsCloudSyncRow');
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      const loggedInView = document.getElementById('authModalLoggedInView');
      return Boolean(
        modal
        && loggedInView
        && !modal.classList.contains('hidden')
        && !loggedInView.classList.contains('hidden')
      );
    }, null, { timeout: 10000 });
    const loggedInAuthModalState = await page.evaluate(() => ({
      title: document.getElementById('authModalTitle')?.textContent.trim() || '',
      statusLabel: document.querySelector('#authModalLoggedInView .figma-static-row span')?.textContent.trim() || '',
      note: document.querySelector('#authModalLoggedInView .auth-modal-note')?.textContent.replace(/\s+/g, ' ').trim() || ''
    }));
    assert.strictEqual(loggedInAuthModalState.title, 'Konto & Cloud', 'connected cloud sheet should use the optional account framing');
    assert.strictEqual(loggedInAuthModalState.statusLabel, 'Status', 'connected cloud sheet should use localized status labels');
    assert.match(loggedInAuthModalState.note, /Cloud Sync bleibt optional/i, 'connected cloud sheet should keep cloud sync optional even while signed in');
    await page.click('#authModalLogoutBtn');
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      return Boolean(
        modal
        && modal.classList.contains('hidden')
        && window.GrowSimAuth
        && typeof window.GrowSimAuth.isAuthenticated === 'function'
        && !window.GrowSimAuth.isAuthenticated()
      );
    }, null, { timeout: 10000 });

    const logoutState = await page.evaluate((authTokenKey) => {
      const modal = document.getElementById('authModal');
      const landing = document.getElementById('landing');
      return {
        authGateActive: Boolean(window.__gsState && window.__gsState.ui && window.__gsState.ui.authGateActive),
        modalVisible: Boolean(modal && !modal.classList.contains('hidden')),
        cloudValue: document.getElementById('settingsCloudSyncValue')?.textContent.trim() || '',
        cloudTitle: document.getElementById('settingsCloudSyncValue')?.getAttribute('title') || '',
        landingVisible: Boolean(landing && !landing.classList.contains('hidden')),
        token: localStorage.getItem(authTokenKey)
      };
    }, AUTH_TOKEN_KEY);
    assert.strictEqual(logoutState.authGateActive, false, 'logout should not reactivate the auth gate');
    assert.strictEqual(logoutState.modalVisible, false, 'logout should close the account modal');
    assert.strictEqual(logoutState.cloudValue, 'Lokal auf diesem Gerät', 'logout should fall back to local device save wording');
    assert.match(logoutState.cloudTitle, /optional/i, 'logout cloud status should keep cloud sync optional');
    assert.strictEqual(logoutState.landingVisible, false, 'logout should keep the active local run visible');
    assert.strictEqual(logoutState.token, null, 'logout should remove the auth token');

    await page.selectOption('#settingsLanguageSelect', 'en');
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    const englishRuntimeTexts = await page.evaluate(() => ({
      title: document.querySelector('#diagnosisSheet h2')?.textContent.trim() || '',
      simSpeed: document.getElementById('settingsSimSpeedValue')?.textContent.trim() || '',
      eventWindow: document.getElementById('settingsEventFrequencyValue')?.textContent.trim() || '',
      pushSupport: document.getElementById('settingsPushSupportValue')?.textContent.trim() || '',
      pushFeedback: document.getElementById('settingsPushFeedback')?.textContent.trim() || ''
    }));
    assert.strictEqual(englishRuntimeTexts.title, 'Settings', 'settings sheet should translate its title to English');
    assert.strictEqual(englishRuntimeTexts.simSpeed, 'Base 12x · Active 12x', 'simulation speed summary should translate to English');
    assert.strictEqual(englishRuntimeTexts.eventWindow, 'approx. 30-90 min', 'event window should translate to English');
    assert.strictEqual(englishRuntimeTexts.pushSupport, 'Yes', 'push support label should translate to English');
    assert.match(englishRuntimeTexts.pushFeedback, /browser or system/i, 'push feedback should translate to English');
    assert.doesNotMatch(englishRuntimeTexts.pushFeedback, /Erinnerungen|Browser\/System|weiterspielen/i, 'English push feedback should not fall back to German');
    const englishCareState = await readCareStudioLocaleSnapshot(page);
    assert.strictEqual(englishCareState.visible, true, 'care sheet should still open in English');
    assert.strictEqual(englishCareState.closeLabel, 'Close', 'care sheet close button should translate to English');
    assert.strictEqual(englishCareState.closeAria, 'Close', 'care sheet close aria label should translate to English');
    assert.ok(englishCareState.tabs.includes('Water'), 'care sheet should show the English water tab');
    assert.doesNotMatch(englishCareState.fullText, /Schließen|careStudio\./i, 'English care sheet should avoid German close copy and raw keys');
    await page.evaluate(() => {
      window.__gsState.ui.openSheet = 'diagnosis';
      renderAll();
    });
    await page.waitForFunction(() => {
      const node = document.getElementById('diagnosisSheet');
      return Boolean(node && !node.classList.contains('hidden'));
    });

    await page.selectOption('#settingsLanguageSelect', 'es');
    await page.waitForFunction(() => document.documentElement.lang === 'es');
    const spanishRuntimeTexts = await page.evaluate(() => ({
      title: document.querySelector('#diagnosisSheet h2')?.textContent.trim() || '',
      simSpeed: document.getElementById('settingsSimSpeedValue')?.textContent.trim() || '',
      eventWindow: document.getElementById('settingsEventFrequencyValue')?.textContent.trim() || '',
      pushSupport: document.getElementById('settingsPushSupportValue')?.textContent.trim() || '',
      pushFeedback: document.getElementById('settingsPushFeedback')?.textContent.trim() || ''
    }));
    assert.strictEqual(spanishRuntimeTexts.title, 'Ajustes', 'settings sheet should translate its title to Spanish');
    assert.strictEqual(spanishRuntimeTexts.simSpeed, 'Base 12x · Activo 12x', 'simulation speed summary should translate to Spanish');
    assert.strictEqual(spanishRuntimeTexts.eventWindow, 'aprox. 30-90 min', 'event window should translate to Spanish');
    assert.strictEqual(spanishRuntimeTexts.pushSupport, 'Si', 'push support label should translate to Spanish');
    assert.match(spanishRuntimeTexts.pushFeedback, /navegador o el sistema/i, 'push feedback should translate to Spanish');
    assert.doesNotMatch(spanishRuntimeTexts.pushFeedback, /Erinnerungen|Browser\/System|weiterspielen/i, 'Spanish push feedback should not fall back to German');
    const spanishCareState = await readCareStudioLocaleSnapshot(page);
    assert.strictEqual(spanishCareState.visible, true, 'care sheet should still open in Spanish');
    assert.strictEqual(spanishCareState.closeLabel, 'Cerrar', 'care sheet close button should translate to Spanish');
    assert.strictEqual(spanishCareState.closeAria, 'Cerrar', 'care sheet close aria label should translate to Spanish');
    assert.ok(spanishCareState.tabs.includes('Riego'), 'care sheet should show the Spanish water tab');
    assert.doesNotMatch(spanishCareState.fullText, /Schließen|careStudio\./i, 'Spanish care sheet should avoid German close copy and raw keys');
    await page.evaluate(() => {
      window.__gsState.ui.openSheet = 'diagnosis';
      renderAll();
    });
    await page.waitForFunction(() => {
      const node = document.getElementById('diagnosisSheet');
      return Boolean(node && !node.classList.contains('hidden'));
    });

    await page.selectOption('#settingsLanguageSelect', 'de');
    await page.waitForFunction(() => document.documentElement.lang === 'de');

    const runtimeSettings = await page.evaluate(() => ({
      simSpeed: document.getElementById('settingsSimSpeedValue')?.textContent.trim() || null,
      eventWindow: document.getElementById('settingsEventFrequencyValue')?.textContent.trim() || null,
      tutorial: document.getElementById('settingsTutorialValue')?.textContent.trim() || null,
      autosave: document.getElementById('settingsAutosaveValue')?.textContent.trim() || null,
      volume: document.getElementById('settingsVolumeValue')?.textContent.trim() || null
    }));
    assert.ok(
      runtimeSettings.simSpeed === 'Basis 12x · Aktiv 12x' || runtimeSettings.simSpeed === 'Basis 12x Â· Aktiv 12x',
      `simulation speed should reflect base and active runtime state, got: ${runtimeSettings.simSpeed}`
    );
    assert.strictEqual(runtimeSettings.eventWindow, 'ca. 30-90 Min.', 'event frequency should describe the calm event window without technical wording');
    assert.strictEqual(runtimeSettings.tutorial, 'Vorbereitet', 'tutorial setting should avoid unfinished technical wording');
    assert.strictEqual(runtimeSettings.autosave, 'Lokal alle 3s', 'autosave should explain local persistence');
    assert.strictEqual(runtimeSettings.volume, 'Vorbereitet', 'audio setting should avoid unfinished technical wording');

    await dismissMissionRewardDialogIfPresent(page);
    await page.locator('#diagnosisSheet [data-close-sheet]').evaluate((node) => node.click());
    await dismissMissionRewardDialogIfPresent(page);
    await page.click('#menuToggleBtn');

    const menuState = await page.evaluate(() => ({
      statsLabel: document.querySelector('#menuStatsBtn span')?.textContent.trim() || null,
      rescueLabel: document.querySelector('#menuRescueBtn span')?.textContent.trim() || null,
      rescueSubtitle: document.querySelector('#menuRescueBtn small')?.textContent.trim() || null,
      rescueTitle: document.getElementById('menuRescueBtn')?.getAttribute('title') || null,
      statsTitle: document.getElementById('menuStatsBtn')?.getAttribute('title') || null,
      missionsSubtitle: document.querySelector('#menuMissionsBtn small')?.textContent.trim() || null,
      leaderboardSubtitle: document.querySelector('#menuLeaderboardBtn small')?.textContent.trim() || null,
      coinShopSubtitle: document.querySelector('#menuCoinShopBtn small')?.textContent.trim() || null,
      supportSubtitle: document.querySelector('#menuSupportBtn small')?.textContent.trim() || null,
      settingsSubtitle: document.querySelector('#menuLanguageBtn small')?.textContent.trim() || null,
      sectionLabels: Array.from(document.querySelectorAll('.menu-section-label')).map((node) => node.textContent.trim()),
      visibleText: document.getElementById('gameMenu')?.textContent.replace(/\s+/g, ' ').trim() || '',
      aboutLabel: document.querySelector('#menuAboutBtn span')?.textContent.trim() || null,
      quickHomeDisabled: Boolean(document.getElementById('menuAchievementsBtn')?.disabled),
      quickOpsDisabled: Boolean(document.getElementById('menuLeaderboardBtn')?.disabled),
      quickHomeTitle: document.getElementById('menuAchievementsBtn')?.getAttribute('title') || null,
      resetTitle: document.getElementById('analysisResetBtn')?.getAttribute('title') || null
    }));
    assert.strictEqual(menuState.statsLabel, 'Analyse', 'menu analysis entry should describe the actual dashboard path');
    assert.strictEqual(menuState.statsTitle, 'Oeffnet Analyse, Verlauf und Run-Statistik.', 'menu analysis entry should explain the report path');
    assert.strictEqual(menuState.rescueLabel, 'Notfallrettung', 'menu rescue entry should describe the actual rescue mechanic');
    assert.strictEqual(menuState.rescueSubtitle, 'Notfallrettung ist aktuell nicht erforderlich.', 'menu rescue subtitle should describe the actual current state honestly');
    assert.strictEqual(menuState.rescueTitle, 'Einmalige Hilfe fuer kritische Situationen im aktiven Run.', 'menu rescue entry should explain its real scope');
    assert.strictEqual(menuState.missionsSubtitle, 'Tagesziele & Fortschritt', 'missions entry should describe the real missions sheet');
    assert.strictEqual(menuState.leaderboardSubtitle, 'Verifizierte Ergebnisse mit Konto', 'leaderboard should explain the account-bound verified path');
    assert.strictEqual(menuState.coinShopSubtitle, 'Optionale Komfortaktionen', 'coin shop should be framed as optional');
    assert.strictEqual(menuState.supportSubtitle, 'Freiwilliger Support', 'support should be framed as voluntary');
    assert.strictEqual(menuState.settingsSubtitle, 'Tempo, Sprache, Cloud', 'settings entry should describe its real scope');
    assert.deepStrictEqual(menuState.sectionLabels, ['Run', 'Fortschritt', 'Optional', 'Info'], 'menu should show small logical groups');
    assert.doesNotMatch(menuState.visibleText, /(MVP|Dev|Legacy|Runtime|AuthGate|Debug|Local Dev|DEFAULT|SAVE|Pflicht|onboarding\.)/i, 'menu should avoid internal or pressure wording');
    assert.strictEqual(menuState.aboutLabel, 'Projektinfo', 'about entry should not pretend to be a full tutorial');
    assert.strictEqual(menuState.quickHomeDisabled, true, 'prepared quick action should be non-interactive');
    assert.strictEqual(menuState.quickOpsDisabled, false, 'leaderboard entry should stay available in the current build');
    assert.strictEqual(menuState.quickHomeTitle, 'Aktuell nicht verfuegbar.', 'hidden quick action should explain its availability calmly');
    assert.strictEqual(menuState.resetTitle, 'Setzt den aktuellen Run nach Bestätigung vollständig zurück.', 'reset action should describe its destructive scope');

    await page.click('#menuStatsBtn');
    await page.waitForFunction(() => {
      const node = document.getElementById('dashboardSheet');
      return node && !node.classList.contains('hidden');
    });
    const analysisState = await page.evaluate(() => ({
      subtitle: document.querySelector('#dashboardSheet .figma-top-player-subtitle')?.textContent.trim() || null,
      overviewLabel: document.getElementById('analysisTabOverview')?.textContent.trim() || null,
      diagnosisLabel: document.getElementById('analysisTabDiagnosis')?.textContent.trim() || null,
      timelineLabel: document.getElementById('analysisTabTimeline')?.textContent.trim() || null,
      timelineTitle: document.getElementById('analysisTabTimeline')?.getAttribute('title') || null
    }));
    assert.strictEqual(analysisState.subtitle, 'Erst das Wichtigste, dann Details und Verlauf.', 'analysis sheet should lead with the new coach framing');
    assert.strictEqual(analysisState.overviewLabel, 'Kurzcheck', 'overview tab should prioritize the quick coach summary');
    assert.strictEqual(analysisState.diagnosisLabel, 'Coach', 'diagnosis tab should read like coaching instead of diagnostics');
    assert.strictEqual(analysisState.timelineLabel, 'Verlauf', 'timeline tab should stay focused on history');
    assert.strictEqual(analysisState.timelineTitle, 'Zeigt den letzten protokollierten Verlauf aus Pflege und Ereignissen.', 'timeline tab should explain the player-facing history view');

    await dismissMissionRewardDialogIfPresent(page);
    await page.click('#analysisTabTimeline');
    await page.waitForFunction(() => document.getElementById('analysisPanelTimeline') && !document.getElementById('analysisPanelTimeline').classList.contains('hidden'));
    const timelinePanelTitle = await page.evaluate(() => document.getElementById('analysisPanelTimeline')?.getAttribute('title') || null);
    assert.strictEqual(timelinePanelTitle, 'Zeigt den letzten protokollierten Verlauf aus Pflege, Ereignissen und Run-Updates.', 'timeline panel should describe the calmer player-facing history view');
    await dismissMissionRewardDialogIfPresent(page);
    await page.locator('#dashboardSheet [data-close-sheet]').evaluate((node) => node.click());

    await page.click('#menuToggleBtn');
    const rescueStatus = await page.evaluate(() => ({
      disabled: Boolean(document.getElementById('menuRescueBtn')?.disabled),
      subtitle: document.getElementById('menuRescueSubtext')?.textContent.trim() || null,
      deathVisible: document.getElementById('deathOverlay')?.classList.contains('hidden') === false
    }));
    assert.strictEqual(rescueStatus.disabled, true, 'menu rescue should stay disabled while the run is not critical');
    assert.strictEqual(rescueStatus.subtitle, 'Notfallrettung ist aktuell nicht erforderlich.', 'menu rescue should report the same no-op message as the rescue runtime path');
    assert.strictEqual(rescueStatus.deathVisible, false, 'menu rescue should not open the death overlay when the run is not critical');

    await page.click('#menuLanguageBtn');
    await page.waitForFunction(() => {
      const node = document.getElementById('diagnosisSheet');
      return node && !node.classList.contains('hidden');
    });
    await page.click('#diagnosisSheet [data-close-sheet]');

    await page.click('#menuToggleBtn');
    await page.click('#menuMissionsBtn');
    await page.waitForFunction(() => {
      const node = document.getElementById('missionsSheet');
      return node && !node.classList.contains('hidden');
    });
    await dismissMissionRewardDialogIfPresent(page);
    await page.locator('#missionsSheet [data-close-sheet]').evaluate((node) => node.click());

    await page.reload({ waitUntil: 'networkidle' });
    await waitForBootReady(page);
    await waitForTransientUiSettled(page);

    const transientUiState = await page.evaluate(() => ({
      menuOpen: document.getElementById('gameMenu').classList.contains('hidden') === false,
      dialogOpen: document.getElementById('menuDialog').classList.contains('hidden') === false,
      landingVisible: document.getElementById('landing').classList.contains('hidden') === false
    }));
    assert.strictEqual(transientUiState.menuOpen, false, 'menu should not restore as open after reload');
    assert.strictEqual(transientUiState.dialogOpen, false, 'menu dialog should not restore as open after reload');
    assert.strictEqual(transientUiState.landingVisible, false, 'landing should stay hidden after a restored run');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }

  console.log('ui onboarding/settings smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
