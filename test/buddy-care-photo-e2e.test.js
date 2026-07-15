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
const requestedViewport = String(process.env.BUDDY_CARE_PHOTO_VIEWPORT || '390x844').match(/^(\d+)x(\d+)$/);
const PRIMARY_VIEWPORT = requestedViewport
  ? { width: Number(requestedViewport[1]), height: Number(requestedViewport[2]) }
  : { width: 390, height: 844 };

async function waitForLoadedPhotoImages(page, selector, minimumCount = 1) {
  await page.waitForFunction(({ selector: targetSelector, minimum }) => {
    const images = Array.from(document.querySelectorAll(targetSelector));
    return images.length >= minimum && images.every((image) => (
      image.dataset.buddyCarePhotoState === 'loaded'
      && image.src.startsWith('blob:')
      && image.complete
      && image.naturalWidth > 0
      && image.naturalHeight > 0
    ));
  }, { selector, minimum: minimumCount });
}

(async () => {
  let browser;
  let serverRuntime;
  try {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    serverRuntime = await startStaticServer(ROOT);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: PRIMARY_VIEWPORT, serviceWorkers: 'block' });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(String(error && error.stack || error)));
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
        plants: [
          { id: 'photo-plant', nickname: 'Nova', plantType: 'auto', environment: 'indoor', startDate: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10), phase: 'veg', createdAt: Date.now() },
          { id: 'photo-plant-b', nickname: 'Mira', plantType: 'photo', environment: 'outdoor', startDate: new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10), phase: 'veg', createdAt: Date.now() + 1 }
        ]
      });
      window.__gsOpenBuddyCare();
      window.__gsSetActiveBuddyCareView('plants');
      window.__gsOpenBuddyCarePlantDetails('photo-plant', 'overview');
    });
    await page.waitForSelector('#buddyCarePlantDetailCard:not([hidden])');
    await page.evaluate(() => {
      const lifecycle = { created: [], revoked: [] };
      const createObjectURL = URL.createObjectURL.bind(URL);
      const revokeObjectURL = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        const url = createObjectURL(blob);
        lifecycle.created.push(url);
        return url;
      };
      URL.revokeObjectURL = (url) => {
        lifecycle.revoked.push(String(url || ''));
        return revokeObjectURL(url);
      };
      window.__carePhotoUrlLifecycle = lifecycle;
    });

    const profileGalleryInput = page.locator('[data-buddy-care-photo-input="profile"]:not([capture])');
    await profileGalleryInput.dispatchEvent('click');
    await profileGalleryInput.setInputFiles(PHOTO_PATH);
    await page.waitForFunction(() => Boolean(
      window.__gsState.buddyCare.plants[0].primaryPhotoId
      || document.querySelector('.buddy-care-photo-message--error')
    ), null, { timeout: 10000 }).catch(() => {});
    const profileDiagnostic = await page.evaluate(async () => {
      const storage = window.GrowSimBuddyCarePhotoStorage.storage;
      const plant = window.__gsState.buddyCare.plants[0];
      const storedPhotos = await Promise.race([
        storage.getPhotosForPlant(plant.id).then((photos) => photos.map((photo) => photo.id)),
        new Promise((resolve) => setTimeout(() => resolve(['storage-read-timeout']), 2000))
      ]);
      return {
        primaryPhotoId: plant.primaryPhotoId,
        message: document.querySelector('.buddy-care-photo-message')?.textContent?.trim() || '',
        photoBusy: Boolean(document.querySelector('[aria-busy="true"]')),
        storedPhotos
      };
    });
    assert.ok(profileDiagnostic.primaryPhotoId, `profile photo must persist; diagnostic=${JSON.stringify({ ...profileDiagnostic, runtimeErrors })}`);
    const firstPrimaryPhotoId = await page.evaluate(() => window.__gsState.buddyCare.plants[0].primaryPhotoId);
    const profileBlob = await page.evaluate(async (id) => {
      const blob = await window.GrowSimBuddyCarePhotoStorage.storage.getPhotoBlob(id);
      return blob ? { size: blob.size, type: blob.type } : null;
    }, firstPrimaryPhotoId);
    assert.ok(profileBlob && profileBlob.size > 0);
    assert.ok(['image/webp', 'image/jpeg'].includes(profileBlob.type));
    await waitForLoadedPhotoImages(page, `#buddyCarePlantDetailCard img[data-buddy-care-photo-id="${firstPrimaryPhotoId}"]`);
    const firstPrimaryUrl = await page.locator(`#buddyCarePlantDetailCard img[data-buddy-care-photo-id="${firstPrimaryPhotoId}"]`).getAttribute('src');

    await page.locator('[data-buddy-care-photo-input="profile"]:not([capture])').dispatchEvent('click');
    await page.locator('[data-buddy-care-photo-input="profile"]:not([capture])').setInputFiles(PHOTO_PATH);
    await page.waitForFunction((previousId) => {
      const currentId = window.__gsState.buddyCare.plants[0].primaryPhotoId;
      return Boolean(currentId && currentId !== previousId);
    }, firstPrimaryPhotoId);
    const primaryPhotoId = await page.evaluate(() => window.__gsState.buddyCare.plants[0].primaryPhotoId);
    await waitForLoadedPhotoImages(page, `#buddyCarePlantDetailCard img[data-buddy-care-photo-id="${primaryPhotoId}"]`);
    await page.waitForFunction((url) => window.__carePhotoUrlLifecycle.revoked.includes(url), firstPrimaryUrl);
    const replacementVerification = await page.evaluate(async ({ previousId, previousUrl }) => ({
      previousMetadata: await window.GrowSimBuddyCarePhotoStorage.storage.getPhoto(previousId),
      previousBlob: await window.GrowSimBuddyCarePhotoStorage.storage.getPhotoBlob(previousId),
      previousUrlRevoked: window.__carePhotoUrlLifecycle.revoked.includes(previousUrl)
    }), { previousId: firstPrimaryPhotoId, previousUrl: firstPrimaryUrl });
    assert.strictEqual(replacementVerification.previousMetadata, null, 'replacing a profile photo must remove superseded profile metadata');
    assert.strictEqual(replacementVerification.previousBlob, null, 'replacing a profile photo must remove the superseded blob');
    assert.strictEqual(replacementVerification.previousUrlRevoked, true, 'replacing a visible photo must revoke its superseded object URL');

    await page.evaluate(() => window.__gsOpenBuddyCarePlantDetails('photo-plant', 'overview'));
    await waitForLoadedPhotoImages(page, `#buddyCarePlantDetailCard img[data-buddy-care-photo-id="${primaryPhotoId}"]`);
    const rerenderedPrimary = await page.locator(`#buddyCarePlantDetailCard img[data-buddy-care-photo-id="${primaryPhotoId}"]`).evaluate((image) => ({
      src: image.src,
      revoked: window.__carePhotoUrlLifecycle.revoked.includes(image.src)
    }));
    assert.strictEqual(rerenderedPrimary.revoked, false, 'the current profile URL must remain valid after a Care+ rerender');
    await page.evaluate(() => window.__gsOpenBuddyCarePlantDetails('photo-plant-b', 'overview'));
    await page.waitForSelector('#buddyCarePlantDetailCard:not([hidden])');
    assert.strictEqual(
      await page.locator('#buddyCarePlantDetailCard .buddy-care-detail-hero-image').getAttribute('data-buddy-care-photo-id'),
      null,
      'switching plants must not leak another plant\'s profile photo'
    );
    await page.evaluate(() => window.__gsOpenBuddyCarePlantDetails('photo-plant', 'overview'));
    await waitForLoadedPhotoImages(page, `#buddyCarePlantDetailCard img[data-buddy-care-photo-id="${primaryPhotoId}"]`);

    await page.evaluate(() => {
      window.__gsOpenBuddyCareDailyCheck('photo-plant');
      for (let index = 0; index < 5; index += 1) window.__gsMoveBuddyCareDailyCheckStep(1);
    });
    await page.waitForSelector('[data-buddy-care-photo-input="daily"]:not([capture])');
    await page.fill('[data-buddy-care-wizard-note]', 'Check-Eingabe bleibt erhalten');
    await page.locator('[data-buddy-care-photo-input="daily"]:not([capture])').dispatchEvent('click');
    await page.locator('[data-buddy-care-photo-input="daily"]:not([capture])').setInputFiles({ name: 'not-an-image.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await page.waitForFunction(() => document.querySelector('.buddy-care-photo-message--error'));
    assert.strictEqual(await page.inputValue('[data-buddy-care-wizard-note]'), 'Check-Eingabe bleibt erhalten', 'failed photo processing must preserve check input');
    await page.locator('[data-buddy-care-photo-input="daily"]:not([capture])').dispatchEvent('click');
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
    await page.locator('#buddyCareDiaryHubForm [data-buddy-care-photo-input="diary"]:not([capture])').dispatchEvent('click');
    await page.locator('#buddyCareDiaryHubForm [data-buddy-care-photo-input="diary"]:not([capture])').setInputFiles(PHOTO_PATH);
    await page.waitForFunction(() => document.querySelectorAll('#buddyCareDiaryHubForm [data-buddy-care-photo-draft]').length === 1);
    await page.evaluate(() => window.__gsSubmitBuddyCareDiaryHubEntry(document.getElementById('buddyCareDiaryHubForm')));
    await page.waitForFunction(() => window.__gsState.buddyCare.diaryEntries.some((entry) => entry.entryType === 'manual' && entry.photoIds.length === 1));
    assert.strictEqual(
      await page.evaluate(() => window.__gsState.buddyCare.diaryEntries.find((entry) => entry.entryType === 'manual').note),
      'Wachstum mit Foto dokumentiert',
      'adding a photo must preserve the diary text entered before opening the picker'
    );

    const manualEntryId = await page.evaluate(() => window.__gsState.buddyCare.diaryEntries.find((entry) => entry.entryType === 'manual').id);
    const manualPhotoId = await page.evaluate((entryId) => window.__gsState.buddyCare.diaryEntries.find((entry) => entry.id === entryId).photoIds[0], manualEntryId);
    await page.evaluate(() => window.__gsOpenBuddyCarePlantDetails('photo-plant', 'diary'));
    await page.waitForSelector(`[data-buddy-care-edit-entry="${manualEntryId}"]`);
    await page.click(`[data-buddy-care-edit-entry="${manualEntryId}"]`);
    await page.waitForSelector(`[data-buddy-care-edit-diary-id="${manualEntryId}"]`);
    await page.fill(`[data-buddy-care-edit-diary-id="${manualEntryId}"] [name="buddyCareDiaryNote"]`, 'Bearbeitet, Foto bleibt');
    await page.evaluate(({ entryId, plantId }) => window.__gsSubmitBuddyCareDiaryEntry(
      plantId,
      document.querySelector(`[data-buddy-care-edit-diary-id="${entryId}"]`)
    ), { entryId: manualEntryId, plantId: 'photo-plant' });
    await page.waitForFunction((entryId) => {
      const entry = window.__gsState.buddyCare.diaryEntries.find((item) => item.id === entryId);
      return Boolean(entry && entry.note === 'Bearbeitet, Foto bleibt' && entry.photoIds.length === 1);
    }, manualEntryId);

    await page.evaluate(() => {
      window.__gsSetActiveBuddyCareView('diary');
      window.__gsSetBuddyCareHistoryMode('photos');
    });
    await page.waitForFunction(() => document.querySelectorAll('.buddy-care-photo-card').length >= 3);
    const galleryPhotoCount = await page.locator('.buddy-care-photo-card img[data-buddy-care-photo-id]').count();
    await waitForLoadedPhotoImages(page, '.buddy-care-photo-card img[data-buddy-care-photo-id]', galleryPhotoCount);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${PRIMARY_VIEWPORT.width}x${PRIMARY_VIEWPORT.height}-gallery.png`), fullPage: false });
    const compareButtons = page.locator('.buddy-care-photo-card [data-buddy-care-photo-compare]');
    await compareButtons.nth(0).click();
    await compareButtons.nth(1).click();
    await page.waitForSelector('.buddy-care-photo-comparison');
    await waitForLoadedPhotoImages(page, '.buddy-care-photo-comparison img[data-buddy-care-photo-id]', 2);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${PRIMARY_VIEWPORT.width}x${PRIMARY_VIEWPORT.height}-compare.png`), fullPage: false });

    for (const viewport of [{ width: 375, height: 667 }, { width: 360, height: 800 }, { width: 430, height: 932 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${viewport.width}x${viewport.height}-compare.png`), fullPage: false });
      const layout = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${viewport.width}px viewport must not overflow horizontally`);
    }

    await page.setViewportSize(PRIMARY_VIEWPORT);
    const comparisonUrlsBeforeClose = await page.locator('.buddy-care-photo-comparison img[data-buddy-care-photo-id]').evaluateAll((images) => images.map((image) => image.src));
    await page.evaluate(() => window.__gsCloseBuddyCare());
    await page.waitForFunction(() => window.__gsState.ui.activeScreen === 'home');
    assert.strictEqual(await page.evaluate((urls) => urls.every((url) => window.__carePhotoUrlLifecycle.revoked.includes(url)), comparisonUrlsBeforeClose), true, 'leaving Care+ must release visible comparison URLs');
    await page.evaluate(() => {
      window.__gsOpenBuddyCare();
      window.__gsSetActiveBuddyCareView('diary');
      window.__gsSetBuddyCareHistoryMode('photos');
    });
    await page.waitForFunction(() => document.querySelectorAll('.buddy-care-photo-card').length >= 3);
    await page.evaluate((photoId) => window.__gsOpenBuddyCarePhoto(photoId), manualPhotoId);
    await page.waitForSelector(`[data-buddy-care-photo-delete="${manualPhotoId}"]`);
    await waitForLoadedPhotoImages(page, '.buddy-care-photo-detail img[data-buddy-care-photo-id]', 1);
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
    await page.evaluate(() => {
      window.__gsOpenBuddyCare();
      window.__gsSetActiveBuddyCareView('plants');
      window.__gsOpenBuddyCarePlantDetails('photo-plant', 'overview');
    });
    await waitForLoadedPhotoImages(page, `#buddyCarePlantDetailCard img[data-buddy-care-photo-id="${primaryPhotoId}"]`);
    await page.evaluate(() => {
      window.__gsSetActiveBuddyCareView('diary');
      window.__gsSetBuddyCareHistoryMode('photos');
    });
    await page.waitForFunction(() => document.querySelectorAll('.buddy-care-photo-card').length >= 2);
    const reloadedGalleryCount = await page.locator('.buddy-care-photo-card img[data-buddy-care-photo-id]').count();
    await waitForLoadedPhotoImages(page, '.buddy-care-photo-card img[data-buddy-care-photo-id]', reloadedGalleryCount);

    await page.evaluate((plantId) => window.__gsRemoveBuddyCarePrimaryPhoto(plantId), 'photo-plant');
    await page.waitForSelector('#menuDialogConfirmBtn:not(.hidden)');
    await page.click('#menuDialogConfirmBtn');
    await page.waitForFunction(() => window.__gsState.buddyCare.plants.find((plant) => plant.id === 'photo-plant').primaryPhotoId === null);
    const retainedProfilePhoto = await page.evaluate(async (photoId) => window.GrowSimBuddyCarePhotoStorage.storage.getPhoto(photoId), primaryPhotoId);
    assert.ok(retainedProfilePhoto && retainedProfilePhoto.isPrimary === false, 'removing the profile assignment must retain the photo in local history');

    await page.evaluate(() => {
      window.GrowSimBuddyCareState.setPlantPrimaryPhoto(window.__gsState, 'photo-plant', 'missing-photo-id');
      window.__gsOpenBuddyCare();
      window.__gsSetActiveBuddyCareView('plants');
      window.__gsOpenBuddyCarePlantDetails('photo-plant', 'overview');
    });
    await page.waitForFunction(() => document.querySelector('#buddyCarePlantDetailCard img[data-buddy-care-photo-id="missing-photo-id"]')?.dataset.buddyCarePhotoState === 'missing');
    const missingPhotoFallback = await page.locator('#buddyCarePlantDetailCard img[data-buddy-care-photo-id="missing-photo-id"]').evaluate((image) => ({
      src: image.src,
      complete: image.complete,
      naturalWidth: image.naturalWidth
    }));
    assert.ok(!missingPhotoFallback.src.startsWith('blob:') && missingPhotoFallback.complete && missingPhotoFallback.naturalWidth > 0, 'a missing blob must keep the controlled local fallback visible');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${PRIMARY_VIEWPORT.width}x${PRIMARY_VIEWPORT.height}-missing-photo.png`), fullPage: false });
    assert.deepStrictEqual(runtimeErrors, [], `photo flow must not raise page errors: ${runtimeErrors.join('\n')}`);

    console.log('buddy-care-photo-e2e.test.js passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(serverRuntime && serverRuntime.server);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
