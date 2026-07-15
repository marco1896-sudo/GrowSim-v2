#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const { waitForBoot, advanceOnboardingToStart } = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const PHOTO_PATH = path.join(ROOT, 'assets', 'gameplay', 'states', 'healthy.png');
const SCREENSHOT_DIR = path.join(ROOT, 'visual-tests', 'screenshots', 'buddy-care-photos');

(async () => {
  let browser;
  let serverRuntime;
  try {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    serverRuntime = await startStaticServer(ROOT);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(serverRuntime.baseUrl, { waitUntil: 'domcontentloaded' });
    await waitForBoot(page);
    await advanceOnboardingToStart(page);
    await page.click('#startRunBtn');
    await page.waitForFunction(() => document.getElementById('landing')?.classList.contains('hidden'));
    await page.evaluate(() => {
      window.__gsState.buddyCare = window.GrowSimBuddyCareState.normalizeBuddyCareState({
        version: 3,
        ageGateAccepted: true,
        ageGateAcceptedAt: Date.now(),
        entitlement: 'care_plus_mock',
        activePlantId: 'photo-plant',
        plants: [{ id: 'photo-plant', nickname: 'Nova', plantType: 'auto', environment: 'indoor', startDate: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10), phase: 'veg', createdAt: Date.now() }]
      });
      window.__gsOpenBuddyCare();
      window.__gsSetActiveBuddyCareView('plants');
      window.__gsOpenBuddyCarePlantDetails('photo-plant', 'overview');
    });
    await page.waitForSelector('#buddyCarePlantDetailCard:not([hidden])');

    const profileGalleryInput = page.locator('[data-buddy-care-photo-input="profile"]:not([capture])');
    await profileGalleryInput.setInputFiles(PHOTO_PATH);
    await page.waitForFunction(() => Boolean(window.__gsState.buddyCare.plants[0].primaryPhotoId));
    const primaryPhotoId = await page.evaluate(() => window.__gsState.buddyCare.plants[0].primaryPhotoId);
    const profileBlob = await page.evaluate(async (id) => {
      const blob = await window.GrowSimBuddyCarePhotoStorage.storage.getPhotoBlob(id);
      return blob ? { size: blob.size, type: blob.type } : null;
    }, primaryPhotoId);
    assert.ok(profileBlob && profileBlob.size > 0);
    assert.ok(['image/webp', 'image/jpeg'].includes(profileBlob.type));

    await page.evaluate(() => {
      window.__gsOpenBuddyCareDailyCheck('photo-plant');
      for (let index = 0; index < 5; index += 1) window.__gsMoveBuddyCareDailyCheckStep(1);
    });
    await page.waitForSelector('[data-buddy-care-photo-input="daily"]:not([capture])');
    await page.fill('[data-buddy-care-wizard-note]', 'Check-Eingabe bleibt erhalten');
    await page.locator('[data-buddy-care-photo-input="daily"]:not([capture])').setInputFiles({ name: 'not-an-image.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await page.waitForFunction(() => document.querySelector('.buddy-care-photo-message--error'));
    assert.strictEqual(await page.inputValue('[data-buddy-care-wizard-note]'), 'Check-Eingabe bleibt erhalten', 'failed photo processing must preserve check input');
    await page.locator('[data-buddy-care-photo-input="daily"]:not([capture])').setInputFiles(PHOTO_PATH);
    await page.waitForFunction(() => document.querySelectorAll('[data-buddy-care-photo-draft]').length === 1);
    await page.selectOption('[data-buddy-care-photo-draft-field="category"]', 'leaf_bottom');
    await page.fill('[data-buddy-care-photo-draft-field="note"]', 'Unterseite dokumentiert');
    await page.evaluate(() => window.__gsMoveBuddyCareDailyCheckStep(1));
    await page.waitForSelector('[data-buddy-care-wizard-result]');
    await page.evaluate(() => window.__gsSubmitBuddyCareDailyCheck());
    await page.waitForFunction(() => Boolean(window.__gsState.buddyCare.dailyChecks[0] && window.__gsState.buddyCare.dailyChecks[0].photoIds.length === 1));

    await page.evaluate(() => {
      window.__gsOpenBuddyCareDiaryComposer('photo-plant');
    });
    await page.waitForSelector('#buddyCareDiaryHubForm');
    await page.fill('#buddyCareDiaryHubForm [name="buddyCareDiaryNote"]', 'Wachstum mit Foto dokumentiert');
    await page.locator('#buddyCareDiaryHubForm [data-buddy-care-photo-input="diary"]:not([capture])').setInputFiles(PHOTO_PATH);
    await page.waitForFunction(() => document.querySelectorAll('#buddyCareDiaryHubForm [data-buddy-care-photo-draft]').length === 1);
    await page.click('#buddyCareDiaryHubForm button[type="submit"]');
    await page.waitForFunction(() => window.__gsState.buddyCare.diaryEntries.some((entry) => entry.entryType === 'manual' && entry.photoIds.length === 1));

    const manualEntryId = await page.evaluate(() => window.__gsState.buddyCare.diaryEntries.find((entry) => entry.entryType === 'manual').id);
    const manualPhotoId = await page.evaluate((entryId) => window.__gsState.buddyCare.diaryEntries.find((entry) => entry.id === entryId).photoIds[0], manualEntryId);
    await page.evaluate(() => window.__gsOpenBuddyCarePlantDetails('photo-plant', 'diary'));
    await page.waitForSelector(`[data-buddy-care-edit-entry="${manualEntryId}"]`);
    await page.click(`[data-buddy-care-edit-entry="${manualEntryId}"]`);
    await page.waitForSelector(`[data-buddy-care-edit-diary-id="${manualEntryId}"]`);
    await page.fill(`[data-buddy-care-edit-diary-id="${manualEntryId}"] [name="buddyCareDiaryNote"]`, 'Bearbeitet, Foto bleibt');
    await page.click(`[data-buddy-care-edit-diary-id="${manualEntryId}"] button[type="submit"]`);
    await page.waitForFunction((entryId) => {
      const entry = window.__gsState.buddyCare.diaryEntries.find((item) => item.id === entryId);
      return Boolean(entry && entry.note === 'Bearbeitet, Foto bleibt' && entry.photoIds.length === 1);
    }, manualEntryId);

    await page.evaluate(() => {
      window.__gsSetActiveBuddyCareView('diary');
      window.__gsSetBuddyCareHistoryMode('photos');
    });
    await page.waitForFunction(() => document.querySelectorAll('.buddy-care-photo-card').length >= 3);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '390x844-gallery.png'), fullPage: false });
    const compareButtons = page.locator('.buddy-care-photo-card [data-buddy-care-photo-compare]');
    await compareButtons.nth(0).click();
    await compareButtons.nth(1).click();
    await page.waitForSelector('.buddy-care-photo-comparison');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '390x844-compare.png'), fullPage: false });

    for (const viewport of [{ width: 375, height: 667 }, { width: 430, height: 932 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${viewport.width}x${viewport.height}-compare.png`), fullPage: false });
      const layout = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${viewport.width}px viewport must not overflow horizontally`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate((photoId) => window.__gsOpenBuddyCarePhoto(photoId), manualPhotoId);
    await page.waitForSelector(`[data-buddy-care-photo-delete="${manualPhotoId}"]`);
    await page.click(`[data-buddy-care-photo-delete="${manualPhotoId}"]`);
    await page.waitForSelector('#menuDialogConfirmBtn:not(.hidden)');
    await page.click('#menuDialogConfirmBtn');
    await page.waitForFunction(async (photoId) => {
      const metadata = await window.GrowSimBuddyCarePhotoStorage.storage.getPhoto(photoId);
      const referenced = window.__gsState.buddyCare.diaryEntries.some((entry) => entry.photoIds.includes(photoId));
      return !metadata && !referenced;
    }, manualPhotoId);

    const localSnapshot = await page.evaluate(() => localStorage.getItem('grow-sim-state-v2') || '');
    assert.ok(!localSnapshot.includes('data:image/'), 'normal localStorage must not contain image data URLs');
    assert.ok(!localSnapshot.includes('iVBOR'), 'normal localStorage must not contain PNG base64 payloads');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page);
    const reloaded = await page.evaluate(async () => {
      const id = window.__gsState.buddyCare.plants[0].primaryPhotoId;
      const blob = await window.GrowSimBuddyCarePhotoStorage.storage.getPhotoBlob(id);
      return { id, blobSize: blob && blob.size, checkPhotoIds: window.__gsState.buddyCare.dailyChecks[0].photoIds, diaryPhotoCount: window.__gsState.buddyCare.diaryEntries.reduce((count, entry) => count + entry.photoIds.length, 0) };
    });
    assert.strictEqual(reloaded.id, primaryPhotoId);
    assert.ok(reloaded.blobSize > 0);
    assert.strictEqual(reloaded.checkPhotoIds.length, 1);
    assert.ok(reloaded.diaryPhotoCount >= 1, 'remaining daily-check photo references should survive reload after deleting the manual diary photo');

    console.log('buddy-care-photo-e2e.test.js passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(serverRuntime && serverRuntime.server);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
