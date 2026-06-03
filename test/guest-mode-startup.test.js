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
    assert.match(state.activeTitle, /Grow-Run/i, `${messagePrefix}: first run setup should use friendly grow-run copy`);
    assert.match(state.welcomeText, /Gastmodus aktiv/i, `${messagePrefix}: guest note should explain local guest mode`);
    assert.match(state.welcomeText, /Cloud Sync/i, `${messagePrefix}: guest note may mention optional cloud sync`);
    assert.match(state.activeBuddyText, /Schritt/i, `${messagePrefix}: Buddy should provide a short guided start hint`);
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
      const toast = document.getElementById('retentionToast');
      return Boolean(toast && /lokaler Run ist gestartet/i.test(toast.textContent || ''));
    }, null, { timeout: 10000 });
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
    assert.match(guestSettingsState.pushFeedback, /lokaler Run bleibt spielbar|lokal weiterspielen|optional/i, 'push feedback should stay optional for guests');
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
    assert.match(guestAuthModalState.note, /optionale Cloud-Sicherung|Cloud-Sicherung|Geraetewechsel/i, 'guest auth modal should explain the benefit of signing in later');
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

    await page.reload({ waitUntil: 'networkidle' });
    const reloadedGuest = await assertGuestBoot(page, 'guest reload');
    assert.strictEqual(reloadedGuest.landingVisible, false, 'guest reload should restore the started local run');
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
