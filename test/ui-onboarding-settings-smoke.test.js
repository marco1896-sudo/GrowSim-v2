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
      const uiState = window.__gsState && window.__gsState.ui && typeof window.__gsState.ui === 'object'
        ? window.__gsState.ui
        : {};

      return {
        bootOk: window.__gsBootOk === true,
        menuHidden: Boolean(menu && menu.classList.contains('hidden')),
        menuAriaHidden: menu ? menu.getAttribute('aria-hidden') : null,
        dialogHidden: Boolean(dialog && dialog.classList.contains('hidden')),
        dialogAriaHidden: dialog ? dialog.getAttribute('aria-hidden') : null,
        uiMenuOpen: Boolean(uiState.menuOpen),
        uiMenuDialogOpen: Boolean(uiState.menuDialogOpen)
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

    await page.waitForTimeout(120);
  }

  throw new Error(`transient UI state did not settle after reload: ${JSON.stringify(lastSnapshot)}`);
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

    const initialBuilderState = await page.evaluate(() => ({
      stepLabel: document.getElementById('onboardingStepLabel')?.textContent.trim() || null,
      activeTitle: document.querySelector('.run-builder-step.is-active h3')?.textContent.trim() || null,
      activePot: Boolean(document.querySelector('[data-setup-select="setupPotSize"].is-active')),
      buddySrc: document.querySelector('.run-builder-step.is-active .onboarding-buddy-tip img')?.getAttribute('src') || null,
      potIconSrc: document.querySelector('[data-setup-select="setupPotSize"][data-setup-value="small"] .onboarding-option-media__image')?.getAttribute('src') || null,
      nextHidden: document.getElementById('setupNextBtn')?.classList.contains('hidden') || false,
      startHidden: document.getElementById('startRunBtn')?.classList.contains('hidden') || false,
      outdoorDisabled: Boolean(document.querySelector('[data-setup-select="setupMode"][data-setup-value="outdoor"]')?.disabled),
      highLightDisabled: Boolean(document.querySelector('[data-setup-select="setupLight"][data-setup-value="high"]')?.disabled)
    }));
    assert.strictEqual(initialBuilderState.stepLabel, 'Schritt 1 von 6', 'run builder should start directly at step 1');
    assert.strictEqual(initialBuilderState.activeTitle, 'Topfgröße', 'first onboarding step should be pot size');
    assert.strictEqual(initialBuilderState.activePot, true, 'first step should have an active default pot selection');
    assert.strictEqual(initialBuilderState.buddySrc, 'assets/onboarding/buddy_pot.png', 'pot step should use the pot Buddy asset');
    assert.strictEqual(initialBuilderState.potIconSrc, 'assets/onboarding/pot_s.png', 'small pot card should use the small pot PNG asset');
    assert.strictEqual(initialBuilderState.nextHidden, false, 'next button should be visible before summary');
    assert.strictEqual(initialBuilderState.startHidden, true, 'start button should stay hidden before summary');
    assert.strictEqual(initialBuilderState.outdoorDisabled, true, 'locked outdoor setup should remain disabled for a fresh profile');
    assert.strictEqual(initialBuilderState.highLightDisabled, true, 'locked high light setup should remain disabled for a fresh profile');

    for (let index = 0; index < 5; index += 1) {
      if (index === 0) {
        await page.click('#setupNextBtn');
        const geneticsBuddySrc = await page.locator('.run-builder-step.is-active .onboarding-buddy-tip img').getAttribute('src');
        const geneticsIconSrc = await page.locator('[data-setup-select="setupGenetics"][data-setup-value="hybrid"] .onboarding-option-media__image').getAttribute('src');
        assert.strictEqual(geneticsBuddySrc, 'assets/onboarding/buddy_genetics.png', 'genetics step should use the genetics Buddy asset');
        assert.strictEqual(geneticsIconSrc, 'assets/onboarding/genetic_hybrid.png', 'hybrid genetics card should use the hybrid PNG asset');
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
    assert.strictEqual(summaryState.stepLabel, 'Schritt 6 von 6', 'summary should be the sixth onboarding step');
    assert.strictEqual(summaryState.activeTitle, 'Dein Run ist bereit.', 'summary step should show the final run state');
    assert.strictEqual(summaryState.nextHidden, true, 'next button should be hidden on summary');
    assert.strictEqual(summaryState.startHidden, false, 'start button should be visible on summary');
    assert.strictEqual(summaryState.backDisabled, false, 'back button should be available on summary');
    assert.strictEqual(summaryState.pot, '2 Liter (S)', 'summary should include selected pot size');
    assert.strictEqual(summaryState.genetics, 'Hybrid', 'summary should include selected genetics');
    assert.strictEqual(summaryState.mode, 'Indoor Run', 'summary should include selected setup mode');
    assert.strictEqual(summaryState.medium, 'Soil Medium', 'summary should include selected medium');
    assert.strictEqual(summaryState.light, 'Medium Light', 'summary should include selected light');
    assert.strictEqual(summaryState.profileTitle, 'Balanced Control', 'summary should reuse the run build presentation');
    assert.strictEqual(summaryState.buddySrc, 'assets/onboarding/buddy_summary.png', 'summary step should use the summary Buddy asset');
    assert.strictEqual(summaryState.mediumLightIconSrc, 'assets/onboarding/light_medium.png', 'medium light card should use the medium light PNG asset');
    assert.strictEqual(summaryState.summaryPotIconSrc, 'assets/onboarding/pot_s.png', 'summary pot should use the selected pot PNG asset');
    assert.strictEqual(summaryState.summaryGeneticsIconSrc, 'assets/onboarding/genetic_hybrid.png', 'summary genetics should use the selected genetics PNG asset');
    assert.strictEqual(summaryState.summaryLightIconSrc, 'assets/onboarding/light_medium.png', 'summary light should use the selected light PNG asset');

    await page.click('#startRunBtn');
    await page.waitForFunction(() => document.getElementById('landing').classList.contains('hidden'));

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
    assert.strictEqual(cloudSync.title, 'Cloud Sync aktiv. Klick öffnet Account-Optionen.', 'cloud status should explain the connected account path');

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
    assert.strictEqual(runtimeSettings.eventWindow, 'Fix 30-90m', 'event frequency should reflect the fixed runtime window');
    assert.strictEqual(runtimeSettings.tutorial, 'Nicht aktiv', 'tutorial setting should describe its current inactive state honestly');
    assert.strictEqual(runtimeSettings.autosave, 'Lokal 3s', 'autosave should reflect the local persistence interval');
    assert.strictEqual(runtimeSettings.volume, 'Nicht aktiv', 'audio setting should describe its current inactive state honestly');

    await page.click('#diagnosisSheet [data-close-sheet]');
    await page.click('#menuToggleBtn');

    const menuState = await page.evaluate(() => ({
      statsLabel: document.querySelector('#menuStatsBtn span')?.textContent.trim() || null,
      rescueLabel: document.querySelector('#menuRescueBtn span')?.textContent.trim() || null,
      rescueSubtitle: document.querySelector('#menuRescueBtn small')?.textContent.trim() || null,
      rescueTitle: document.getElementById('menuRescueBtn')?.getAttribute('title') || null,
      statsTitle: document.getElementById('menuStatsBtn')?.getAttribute('title') || null,
      missionsSubtitle: document.querySelector('#menuMissionsBtn small')?.textContent.trim() || null,
      aboutLabel: document.querySelector('#menuAboutBtn span')?.textContent.trim() || null,
      quickHomeDisabled: Boolean(document.getElementById('menuAchievementsBtn')?.disabled),
      quickOpsDisabled: Boolean(document.getElementById('menuLeaderboardBtn')?.disabled),
      quickHomeTitle: document.getElementById('menuAchievementsBtn')?.getAttribute('title') || null,
      resetTitle: document.getElementById('analysisResetBtn')?.getAttribute('title') || null
    }));
    assert.strictEqual(menuState.statsLabel, 'Analyse', 'menu analysis entry should describe the actual dashboard path');
    assert.strictEqual(menuState.statsTitle, 'Öffnet denselben Analyse-Report wie Analyse-Button und Death-Flow.', 'menu analysis entry should explain the shared report path');
    assert.strictEqual(menuState.rescueLabel, 'Notfallrettung', 'menu rescue entry should describe the actual rescue mechanic');
    assert.strictEqual(menuState.rescueSubtitle, 'Notfallrettung ist aktuell nicht erforderlich.', 'menu rescue subtitle should describe the actual current state honestly');
    assert.strictEqual(menuState.rescueTitle, 'Kein Inventarsystem. Startet dieselbe einmalige Notfallrettung wie im Death-Overlay.', 'menu rescue entry should explain that it is the same rescue path');
    assert.strictEqual(menuState.missionsSubtitle, 'Missionen & Fortschritt', 'missions entry should describe the real missions sheet');
    assert.strictEqual(menuState.aboutLabel, 'Projektinfo', 'about entry should not pretend to be a full tutorial');
    assert.strictEqual(menuState.quickHomeDisabled, true, 'prepared quick action should be non-interactive');
    assert.strictEqual(menuState.quickOpsDisabled, false, 'leaderboard entry should stay available in the current build');
    assert.strictEqual(menuState.quickHomeTitle, 'Im aktuellen Build noch nicht freigeschaltet.', 'hidden quick action should explain its availability honestly');
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
    assert.strictEqual(analysisState.subtitle, 'Run-Report & Verlauf', 'analysis sheet should describe the real report scope');
    assert.strictEqual(analysisState.overviewLabel, 'Report', 'overview tab should remain the report entry');
    assert.strictEqual(analysisState.diagnosisLabel, 'Treiber', 'diagnosis tab should describe driver analysis instead of filters');
    assert.strictEqual(analysisState.timelineLabel, 'Verlauf', 'timeline tab should not promise export');
    assert.strictEqual(analysisState.timelineTitle, 'Kein Dateiexport. Zeigt den letzten protokollierten Run-Verlauf.', 'timeline tab should explain its real scope');

    await page.click('#analysisTabTimeline');
    await page.waitForFunction(() => document.getElementById('analysisPanelTimeline') && !document.getElementById('analysisPanelTimeline').classList.contains('hidden'));
    const timelinePanelTitle = await page.evaluate(() => document.getElementById('analysisPanelTimeline')?.getAttribute('title') || null);
    assert.strictEqual(timelinePanelTitle, 'Zeigt die letzten protokollierten Aktionen, Ereignisse und Systemeintraege. Kein Dateiexport.', 'timeline panel should describe the real history view');
    await page.click('#dashboardSheet [data-close-sheet]');

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
    await page.click('#missionsSheet [data-close-sheet]');

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
