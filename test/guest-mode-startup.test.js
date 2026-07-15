#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  advanceOnboardingToStart,
  clearClientStorage,
  waitForBoot: waitForBootReady
} = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';
const LS_STATE_KEY = 'grow-sim-state-v2';

async function installSignedOutApiMocks(page) {
  const stats = {
    authMeRequests: 0,
    saveGetRequests: 0,
    savePostRequests: 0
  };

  await page.route('https://api.growsimulator.tech/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/auth/me') {
      stats.authMeRequests += 1;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
      return;
    }

    if (url.pathname === '/api/save' && request.method() === 'GET') {
      stats.saveGetRequests += 1;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
      return;
    }

    if (url.pathname === '/api/save' && request.method() === 'POST') {
      stats.savePostRequests += 1;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unhandled test route' })
    });
  });

  return stats;
}

async function assertGuestBoot(page, messagePrefix) {
  await waitForBootReady(page);
  const state = await page.evaluate(() => {
    const modal = document.getElementById('authModal');
    const landing = document.getElementById('landing');
    const welcomeNote = document.querySelector('[data-guest-welcome-note]');
    return {
      bootOk: window.__gsBootOk === true,
      authenticated: Boolean(window.GrowSimAuth && window.GrowSimAuth.isAuthenticated()),
      authGateActive: Boolean(window.__gsState && window.__gsState.ui && window.__gsState.ui.authGateActive),
      modalVisible: Boolean(modal && !modal.classList.contains('hidden')),
      landingVisible: Boolean(landing && !landing.classList.contains('hidden')),
      welcomeVisible: Boolean(welcomeNote),
      welcomeText: welcomeNote ? welcomeNote.textContent.replace(/\s+/g, ' ').trim() : '',
      activeTitle: document.querySelector('.run-builder-step.is-active h3')?.textContent.trim() || '',
      activeBuddyText: document.querySelector('.run-builder-step.is-active .onboarding-buddy-tip p')?.textContent.replace(/\s+/g, ' ').trim() || '',
      hasSimulation: Boolean(window.__gsState && window.__gsState.simulation && Number.isFinite(Number(window.__gsState.simulation.simTimeMs))),
      hasProfile: Boolean(window.__gsState && window.__gsState.profile),
      hasSettings: Boolean(window.__gsState && window.__gsState.settings),
      localToken: localStorage.getItem('grow-sim-auth-token-v1')
    };
  });

  assert.strictEqual(state.bootOk, true, `${messagePrefix}: boot should complete`);
  assert.strictEqual(state.authenticated, false, `${messagePrefix}: guest boot should not create an auth session`);
  assert.strictEqual(state.authGateActive, false, `${messagePrefix}: auth gate should stay inactive`);
  assert.strictEqual(state.modalVisible, false, `${messagePrefix}: auth modal should not be shown automatically`);
  assert.strictEqual(state.hasSimulation, true, `${messagePrefix}: local simulation state should be initialized`);
  assert.strictEqual(state.hasProfile, true, `${messagePrefix}: local profile state should be initialized`);
  assert.strictEqual(state.hasSettings, true, `${messagePrefix}: local settings state should be initialized`);
  assert.strictEqual(state.localToken, null, `${messagePrefix}: no auth token should be written`);
  if (state.landingVisible) {
    assert.strictEqual(state.welcomeVisible, true, `${messagePrefix}: guest welcome note should be present in the run setup`);
    assert.match(state.activeTitle, /erster Grow beginnt/i, `${messagePrefix}: first run setup should use the new guided welcome copy`);
    assert.match(state.welcomeText, /Gastmodus aktiv/i, `${messagePrefix}: guest note should explain local guest mode`);
    assert.match(state.welcomeText, /Cloud Sync/i, `${messagePrefix}: guest note may mention optional cloud sync`);
    assert.doesNotMatch(state.activeBuddyText, /onboarding\./i, `${messagePrefix}: intro copy should not leak raw onboarding keys`);
    assert.doesNotMatch(
      `${state.welcomeText} ${state.activeTitle} ${state.activeBuddyText}`,
      /(MVP|Dev|Legacy|Pflicht|required|onboarding\.guest)/i,
      `${messagePrefix}: guest start copy should avoid technical or pressure wording`
    );
  }

  return state;
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    const stats = await installSignedOutApiMocks(page);
    const url = `${baseUrl}/`;

    await page.goto(url, { waitUntil: 'networkidle' });
    await clearClientStorage(page);
    await page.goto(url, { waitUntil: 'networkidle' });

    const freshGuest = await assertGuestBoot(page, 'fresh signed-out startup');
    assert.strictEqual(freshGuest.landingVisible, true, 'fresh guest startup should expose local run setup');

    await advanceOnboardingToStart(page);
    await page.click('#startRunBtn');
    await page.waitForFunction(() => document.getElementById('landing').classList.contains('hidden'), null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return Boolean(overlay && !overlay.classList.contains('hidden'));
    }, null, { timeout: 10000 });
    const introStartState = await page.evaluate(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      const hero = overlay ? overlay.querySelector('.first-run-intro-plant-hero') : null;
      const heroImg = hero ? hero.querySelector('img') : null;
      const heroImgStyle = heroImg ? window.getComputedStyle(heroImg) : null;
      const heroRect = hero ? hero.getBoundingClientRect() : null;
      const heroImgRect = heroImg ? heroImg.getBoundingClientRect() : null;
      return {
        text: overlay ? overlay.textContent.replace(/\s+/g, ' ').trim() : '',
        visible: Boolean(overlay && !overlay.classList.contains('hidden')),
        heroClassName: hero ? hero.className : '',
        heroImgSrc: heroImg ? heroImg.getAttribute('src') || '' : '',
        heroImgObjectFit: heroImgStyle ? heroImgStyle.objectFit : '',
        heroHeight: heroRect ? heroRect.height : 0,
        heroImgHeight: heroImgRect ? heroImgRect.height : 0
      };
    });
    assert.strictEqual(introStartState.visible, true, 'fresh first run should surface the guided first-day overlay');
    assert.match(introStartState.text, /Tag 1|Keimling/i, 'guided first-day overlay should start with the seedling moment');
    assert.match(introStartState.heroClassName, /first-run-intro-plant-hero--seedling/, 'first-day overlay should use the seedling-specific hero frame');
    assert.match(introStartState.heroImgSrc, /assets\/plant_growth\/aligned_frames\/frame_006\.png$/, 'first-day overlay should use the transparent aligned seedling asset');
    assert.strictEqual(introStartState.heroImgObjectFit, 'contain', 'first-day overlay seedling should stay contained inside the hero card');
    assert(introStartState.heroImgHeight > 0 && introStartState.heroHeight > 0, 'first-day overlay should expose measurable seedling hero geometry');
    assert(introStartState.heroImgHeight < introStartState.heroHeight * 0.8, 'first-day overlay seedling image should not fill the full hero card height');
    await page.click('#firstRunIntroPrimaryBtn');
    await page.waitForFunction(() => Boolean(document.querySelector('[data-first-run-decision="gentle_water"]')), null, { timeout: 10000 });
    await page.click('[data-first-run-decision="gentle_water"]');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return Boolean(overlay && /Guter Start/i.test(overlay.textContent || ''));
    }, null, { timeout: 10000 });
    const guestIntroState = await page.evaluate(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return {
        fullText: overlay ? overlay.textContent.replace(/\s+/g, ' ').trim() : ''
      };
    });
    assert.match(guestIntroState.fullText, /\+5 Coins/i, 'guided first-day result should show a visible reward');
    await page.click('#firstRunIntroPrimaryBtn');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return Boolean(overlay && /Tag 1 geschafft/i.test(overlay.textContent || ''));
    }, null, { timeout: 10000 });
    await page.click('#firstRunIntroPrimaryBtn');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunIntroOverlay');
      return Boolean(overlay && overlay.classList.contains('hidden'));
    }, null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunDashboardFollowupOverlay');
      return Boolean(overlay && !overlay.classList.contains('hidden'));
    }, null, { timeout: 10000 });
    const followupState = await page.evaluate(() => {
      const overlay = document.getElementById('firstRunDashboardFollowupOverlay');
      return {
        visible: Boolean(overlay && !overlay.classList.contains('hidden')),
        text: overlay ? overlay.textContent.replace(/\s+/g, ' ').trim() : ''
      };
    });
    assert.strictEqual(followupState.visible, true, 'fresh first run should show the one-time dashboard follow-up after the intro');
    assert.match(followupState.text, /Dein Grow läuft/i, 'dashboard follow-up should confirm that the grow is now running');
    assert.match(followupState.text, /Weiter/i, 'dashboard follow-up should provide a simple continue CTA');
    await page.click('#firstRunDashboardFollowupBtn');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('firstRunDashboardFollowupOverlay');
      return Boolean(overlay && overlay.classList.contains('hidden'));
    }, null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const teaser = document.getElementById('homeMetaRetentionTeaser');
      return Boolean(teaser && teaser.dataset.mode === 'starter' && teaser.dataset.actionTarget === 'dashboard');
    }, null, { timeout: 10000 });
    const starterGoalState = await page.evaluate(() => {
      const teaser = document.getElementById('homeMetaRetentionTeaser');
      return {
        text: teaser ? teaser.textContent.replace(/\s+/g, ' ').trim() : '',
        actionTarget: teaser ? teaser.dataset.actionTarget || '' : '',
        mode: teaser ? teaser.dataset.mode || '' : ''
      };
    });
    assert.strictEqual(starterGoalState.mode, 'starter', 'post-intro first-day goal should use the starter teaser slot');
    assert.strictEqual(starterGoalState.actionTarget, 'dashboard', 'post-intro first-day goal should route into the dashboard');
    assert.match(starterGoalState.text, /Nächster Schritt|Wachstumsreaktion/i, 'post-intro teaser should explain the next first-day step');
    await page.evaluate(() => window.__gsOpenBuddyCare?.());
    await page.waitForFunction(() => {
      const screen = document.getElementById('buddyCareScreen');
      return Boolean(screen && !screen.hidden && screen.getAttribute('aria-hidden') === 'false');
    }, null, { timeout: 10000 });
    const guestBuddyCareState = await page.evaluate(() => {
      const screen = document.getElementById('buddyCareScreen');
      const introOverlay = document.getElementById('firstRunIntroOverlay');
      const followupOverlay = document.getElementById('firstRunDashboardFollowupOverlay');
      return {
        activeScreen: window.__gsState?.ui?.activeScreen || '',
        screenText: screen?.textContent.replace(/\s+/g, ' ').trim() || '',
        introHidden: Boolean(introOverlay?.classList.contains('hidden')),
        followupHidden: Boolean(followupOverlay?.classList.contains('hidden')),
        authGateActive: Boolean(window.__gsState?.ui?.authGateActive)
      };
    });
    assert.strictEqual(guestBuddyCareState.activeScreen, 'buddyCare', 'completed first-day flow should keep Buddy Care reachable for guests');
    assert.strictEqual(guestBuddyCareState.introHidden, true, 'first-day intro must not cover Buddy Care');
    assert.strictEqual(guestBuddyCareState.followupHidden, true, 'dashboard follow-up must not cover Buddy Care');
    assert.strictEqual(guestBuddyCareState.authGateActive, false, 'opening Buddy Care must not activate login for guests');
    assert.doesNotMatch(guestBuddyCareState.screenText, /\bMarco\b/i, 'guest Buddy Care must use neutral copy');
    await page.click('#buddyCareAgeGateBackBtn');
    await page.waitForFunction(() => window.__gsState?.ui?.activeScreen === 'home', null, { timeout: 10000 });
    if (false) {
    const guestCareState = await page.evaluate(() => {
      const careSheet = document.getElementById('careSheet');
      return {
        coachLine: document.getElementById('careStudioCoachLine')?.textContent.trim() || '',
        closeLabel: document.querySelector('#careSheet .care-sheet-close')?.textContent.trim() || '',
        fullText: careSheet ? careSheet.textContent.replace(/\s+/g, ' ').trim() : ''
      };
    });
    assert.strictEqual(guestCareState.closeLabel, 'Schließen', 'guest care sheet close button should stay localized');
    assert.match(`${guestCareState.coachLine} ${guestCareState.fullText}`, /Feuchte|Risiko|Wasser/i, 'guest first visit should steer the player toward moisture, water, or risk');
    assert.doesNotMatch(guestCareState.fullText, /careStudio\./i, 'guest care sheet should not leak raw care studio keys');
    await page.click('#careSheet [data-close-sheet]');
    await page.waitForFunction(() => document.getElementById('careSheet').classList.contains('hidden'), null, { timeout: 10000 });
    }
    await page.waitForFunction((stateKey) => {
      const raw = localStorage.getItem(stateKey);
      return Boolean(raw && raw.includes('"simulation"') && raw.includes('"setup"'));
    }, LS_STATE_KEY, { timeout: 10000 });

    const savedBeforeReload = await page.evaluate((stateKey) => {
      const raw = localStorage.getItem(stateKey);
      return {
        hasLocalSave: Boolean(raw),
        token: localStorage.getItem('grow-sim-auth-token-v1'),
        landingVisible: !document.getElementById('landing').classList.contains('hidden')
      };
    }, LS_STATE_KEY);
    assert.strictEqual(savedBeforeReload.hasLocalSave, true, 'guest run should write a local save');
    assert.strictEqual(savedBeforeReload.token, null, 'guest run should not write an auth token');
    assert.strictEqual(savedBeforeReload.landingVisible, false, 'run setup should be closed after starting a local guest run');

    await page.reload({ waitUntil: 'networkidle' });
    await waitForBootReady(page);
    const immediateReloadState = await page.evaluate(() => {
      const introOverlay = document.getElementById('firstRunIntroOverlay');
      const followupOverlay = document.getElementById('firstRunDashboardFollowupOverlay');
      const teaser = document.getElementById('homeMetaRetentionTeaser');
      return {
        introVisible: Boolean(introOverlay && !introOverlay.classList.contains('hidden')),
        followupVisible: Boolean(followupOverlay && !followupOverlay.classList.contains('hidden')),
        teaserMode: teaser ? teaser.dataset.mode || '' : '',
        teaserTarget: teaser ? teaser.dataset.actionTarget || '' : ''
      };
    });
    assert.strictEqual(immediateReloadState.introVisible, false, 'completed first-day intro should stay closed after reload');
    assert.strictEqual(immediateReloadState.followupVisible, false, 'confirmed dashboard follow-up should not reopen after reload');
    assert.strictEqual(immediateReloadState.teaserMode, 'starter', 'fresh first run should still expose the starter teaser after reload');
    assert.strictEqual(immediateReloadState.teaserTarget, 'dashboard', 'fresh first run teaser should keep routing into the dashboard');

    await page.evaluate((stateKey) => {
      const raw = localStorage.getItem(stateKey);
      if (!raw) {
        return;
      }
      const snapshot = JSON.parse(raw);
      snapshot.run.startedAtRealMs = Date.now() - (16 * 60 * 1000);
      localStorage.setItem(stateKey, JSON.stringify(snapshot));
      if (window.__gsState && window.__gsState.run) {
        window.__gsState.run.startedAtRealMs = snapshot.run.startedAtRealMs;
      }
    }, LS_STATE_KEY);
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('grow-sim-db');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    });
    await page.reload({ waitUntil: 'networkidle' });
    const agedTeaserState = await page.evaluate(() => {
      const teaser = document.getElementById('homeMetaRetentionTeaser');
      const overlay = document.getElementById('firstRunIntroOverlay');
      return {
        text: teaser ? teaser.textContent.replace(/\s+/g, ' ').trim() : '',
        actionTarget: teaser ? teaser.dataset.actionTarget || '' : '',
        mode: teaser ? teaser.dataset.mode || '' : '',
        overlayVisible: Boolean(overlay && !overlay.classList.contains('hidden')),
        landingVisible: !document.getElementById('landing').classList.contains('hidden'),
        missionsSheetVisible: !document.getElementById('missionsSheet').classList.contains('hidden')
      };
    });
    assert.strictEqual(agedTeaserState.landingVisible, false, 'restored run should stay in the active HUD after reload');
    assert.strictEqual(agedTeaserState.overlayVisible, false, 'completed guided first-day overlay should not reopen after reload');
    assert.strictEqual(agedTeaserState.mode, 'daily', 'older restored runs should fall back to the normal daily teaser');
    assert.strictEqual(agedTeaserState.actionTarget, 'missions', 'older restored runs should no longer route the teaser into Care Studio');
    assert.strictEqual(agedTeaserState.missionsSheetVisible, false, 'daily buddy check must not auto-open the missions sheet on reload');

    await page.click('#menuToggleBtn');
    await page.waitForFunction(() => {
      const menu = document.getElementById('gameMenu');
      return Boolean(menu && !menu.classList.contains('hidden'));
    }, null, { timeout: 10000 });
    const guestMenuState = await page.evaluate(() => {
      const modal = document.getElementById('authModal');
      const menu = document.getElementById('gameMenu');
      return {
        authGateActive: Boolean(window.__gsState && window.__gsState.ui && window.__gsState.ui.authGateActive),
        modalVisible: Boolean(modal && !modal.classList.contains('hidden')),
        menuText: menu ? menu.textContent.replace(/\s+/g, ' ').trim() : ''
      };
    });
    assert.strictEqual(guestMenuState.authGateActive, false, 'guest menu should not activate the auth gate');
    assert.strictEqual(guestMenuState.modalVisible, false, 'guest menu should not open login automatically');
    assert.match(guestMenuState.menuText, /Optional/, 'guest menu should include optional grouping');
    assert.doesNotMatch(guestMenuState.menuText, /(MVP|Dev|Legacy|Runtime|AuthGate|Debug|Local Dev|DEFAULT|SAVE|Pflicht|onboarding\.)/i, 'guest menu should avoid internal wording');

    await page.click('#menuLanguageBtn');
    await page.waitForFunction(() => {
      const settings = document.getElementById('diagnosisSheet');
      return Boolean(settings && !settings.classList.contains('hidden'));
    }, null, { timeout: 10000 });
    const guestSettingsState = await page.evaluate(() => {
      const modal = document.getElementById('authModal');
      const settings = document.getElementById('diagnosisSheet');
      return {
        authGateActive: Boolean(window.__gsState && window.__gsState.ui && window.__gsState.ui.authGateActive),
        modalVisible: Boolean(modal && !modal.classList.contains('hidden')),
        cloudValue: document.getElementById('settingsCloudSyncValue')?.textContent.trim() || '',
        cloudTitle: document.getElementById('settingsCloudSyncValue')?.getAttribute('title') || '',
        pushFeedback: document.getElementById('settingsPushFeedback')?.textContent.replace(/\s+/g, ' ').trim() || '',
        settingsText: settings ? settings.textContent.replace(/\s+/g, ' ').trim() : ''
      };
    });
    assert.strictEqual(guestSettingsState.authGateActive, false, 'guest settings should not activate the auth gate');
    assert.strictEqual(guestSettingsState.modalVisible, false, 'guest settings should not open login automatically');
    assert.strictEqual(guestSettingsState.cloudValue, 'Lokal auf diesem Gerät', 'guest settings should explain local save mode');
    assert.match(guestSettingsState.cloudTitle, /optional/i, 'cloud sync title should frame sync as optional');
    assert.match(
      guestSettingsState.pushFeedback,
      /lokaler Run bleibt spielbar|lokal weiterspielen|lokales Spielen bleibt möglich|optional/i,
      'push feedback should stay optional for guests'
    );
    assert.doesNotMatch(guestSettingsState.settingsText, /(MVP|Dev|Legacy|Runtime|AuthGate|Debug|Local Dev|DEFAULT|SAVE|Pflicht|onboarding\.)/i, 'guest settings should avoid internal wording');

    await page.click('#settingsCloudSyncRow');
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      const loggedOutView = document.getElementById('authModalLoggedOutView');
      return Boolean(
        modal
        && loggedOutView
        && !modal.classList.contains('hidden')
        && !loggedOutView.classList.contains('hidden')
      );
    }, null, { timeout: 10000 });
    const guestAuthModalState = await page.evaluate(() => ({
      title: document.getElementById('authModalTitle')?.textContent.trim() || '',
      note: document.querySelector('#authModalLoggedOutView .auth-modal-note')?.textContent.replace(/\s+/g, ' ').trim() || '',
      modeAria: document.querySelector('#authModalLoggedOutView .auth-modal-tabs')?.getAttribute('aria-label') || ''
    }));
    assert.strictEqual(guestAuthModalState.title, 'Konto & Cloud', 'guest cloud entry should open an optional account modal');
    assert.match(guestAuthModalState.note, /ohne Konto/i, 'guest auth modal should explicitly allow local play without an account');
    assert.match(guestAuthModalState.note, /optionale Cloud-Sicherung|Cloud-Sicherung|Gerätewechsel/i, 'guest auth modal should explain the benefit of signing in later');
    assert.strictEqual(guestAuthModalState.modeAria, 'Kontomodus', 'guest auth modal should expose a calm localized mode label');
    await page.click('#authModalCancelBtn');
    await page.waitForFunction(() => {
      const modal = document.getElementById('authModal');
      return Boolean(modal && modal.classList.contains('hidden'));
    }, null, { timeout: 10000 });
    await page.click('#diagnosisSheet [data-close-sheet]');

    const legacyGateSave = await page.evaluate((stateKey) => {
      const raw = localStorage.getItem(stateKey);
      if (!raw) {
        throw new Error('legacy gate setup requires an existing local save');
      }
      const parsed = JSON.parse(raw);
      parsed.ui = {
        ...(parsed.ui && typeof parsed.ui === 'object' ? parsed.ui : {}),
        authGateActive: true,
        menuOpen: true,
        menuDialogOpen: true,
        openSheet: 'leaderboard'
      };
      localStorage.setItem(stateKey, JSON.stringify(parsed));
      return {
        storedAuthGateActive: parsed.ui.authGateActive,
        storedOpenSheet: parsed.ui.openSheet
      };
    }, LS_STATE_KEY);
    assert.strictEqual(legacyGateSave.storedAuthGateActive, true, 'test should seed a legacy save with authGateActive true');
    assert.strictEqual(legacyGateSave.storedOpenSheet, 'leaderboard', 'test should seed transient legacy UI state');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('grow-sim-db');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    });

    await page.reload({ waitUntil: 'networkidle' });
    const reloadedGuest = await assertGuestBoot(page, 'guest reload');
    assert.strictEqual(reloadedGuest.landingVisible, false, 'guest reload should restore the started local run');
    await page.waitForFunction(() => {
      const menu = document.getElementById('gameMenu');
      const dialog = document.getElementById('menuDialog');
      return Boolean(
        menu
        && dialog
        && menu.classList.contains('hidden')
        && dialog.classList.contains('hidden')
        && window.__gsState
        && window.__gsState.ui
        && window.__gsState.ui.menuOpen === false
        && window.__gsState.ui.menuDialogOpen === false
      );
    }, null, { timeout: 10000 });
    const legacyGateRestore = await page.evaluate(() => {
      const modal = document.getElementById('authModal');
      const menu = document.getElementById('gameMenu');
      return {
        authGateActive: Boolean(window.__gsState && window.__gsState.ui && window.__gsState.ui.authGateActive),
        modalVisible: Boolean(modal && !modal.classList.contains('hidden')),
        menuVisible: Boolean(menu && !menu.classList.contains('hidden')),
        openSheet: window.__gsState && window.__gsState.ui ? window.__gsState.ui.openSheet : 'missing'
      };
    });
    assert.strictEqual(legacyGateRestore.authGateActive, false, 'legacy saved authGateActive should be neutralized on restore');
    assert.strictEqual(legacyGateRestore.modalVisible, false, 'legacy saved auth gate should not reopen the auth modal');
    assert.strictEqual(legacyGateRestore.menuVisible, false, 'legacy transient menu state should not restore as blocking UI');
    assert.strictEqual(legacyGateRestore.openSheet, null, 'legacy transient sheet state should be cleared on restore');

    await page.waitForFunction(() => {
      const completed = Array.isArray(window.__gsState && window.__gsState.missions && window.__gsState.missions.completed)
        ? window.__gsState.missions.completed
        : [];
      return completed.includes('mission_004');
    }, null, { timeout: 15000 });
    const passiveMissionRestoreState = await page.evaluate(() => {
      const menu = document.getElementById('gameMenu');
      const dialog = document.getElementById('menuDialog');
      return {
        completedMissionIds: Array.isArray(window.__gsState && window.__gsState.missions && window.__gsState.missions.completed)
          ? window.__gsState.missions.completed.slice()
          : [],
        coins: Number(window.__gsState && window.__gsState.status && window.__gsState.status.coins || 0),
        menuVisible: Boolean(menu && !menu.classList.contains('hidden')),
        dialogVisible: Boolean(dialog && !dialog.classList.contains('hidden')),
        dialogVariant: dialog ? String(dialog.dataset.variant || '') : ''
      };
    });
    assert(passiveMissionRestoreState.completedMissionIds.includes('mission_004'), 'passive health mission should still complete after guest reload');
    assert(passiveMissionRestoreState.coins >= 1000, 'mission reward coins should still be granted after guest reload');
    assert.strictEqual(passiveMissionRestoreState.menuVisible, false, 'passive mission completion should not reopen the menu after guest reload');
    assert.strictEqual(passiveMissionRestoreState.dialogVisible, false, 'passive mission completion should not reopen the reward dialog after guest reload');
    assert.notStrictEqual(passiveMissionRestoreState.dialogVariant, 'mission-reward', 'passive guest reload should suppress the blocking mission-reward dialog');

    assert.strictEqual(stats.saveGetRequests >= 1, true, 'signed-out guest boot may probe remote save but must fall back locally');
    console.log('guest mode startup smoke test passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
