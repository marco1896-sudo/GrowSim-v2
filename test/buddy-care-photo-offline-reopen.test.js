#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const { waitForBoot } = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');

(async () => {
  let browser;
  let serverRuntime;
  try {
    serverRuntime = await startStaticServer(ROOT);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage();
    await page.goto(serverRuntime.baseUrl, { waitUntil: 'networkidle' });
    await waitForBoot(page);
    const seeded = await page.evaluate(async () => {
      const imageResponse = await fetch('./assets/gameplay/states/healthy.png');
      const originalBlob = await imageResponse.blob();
      const file = new File([originalBlob], 'healthy.png', { type: 'image/png' });
      const processed = await window.GrowSimBuddyCarePhotoProcessing.processCarePhoto(file);
      const storage = window.GrowSimBuddyCarePhotoStorage.storage;
      const photos = await storage.savePhotos([
        { blob: processed.blob, metadata: { id: 'offline-photo-a', plantId: 'offline-plant', sourceType: 'profile', category: 'whole_plant', isPrimary: true, createdAt: Date.now() - 86400000, width: processed.width, height: processed.height, mimeType: processed.mimeType, byteSize: processed.byteSize } },
        { blob: processed.blob, metadata: { id: 'offline-photo-b', plantId: 'offline-plant', sourceType: 'daily_check', sourceId: 'offline-check', category: 'detail', isPrimary: false, createdAt: Date.now(), width: processed.width, height: processed.height, mimeType: processed.mimeType, byteSize: processed.byteSize } }
      ]);
      window.__gsState.buddyCare = window.GrowSimBuddyCareState.normalizeBuddyCareState({
        version: 4,
        ageGateAccepted: true,
        ageGateAcceptedAt: Date.now(),
        activePlantId: 'offline-plant',
        plants: [{ id: 'offline-plant', nickname: 'Offline Nova', plantType: 'auto', environment: 'indoor', startDate: '2026-07-01', primaryPhotoId: 'offline-photo-a' }],
        dailyChecks: [{ id: 'offline-check', plantId: 'offline-plant', dayKey: new Date().toISOString().slice(0, 10), createdAt: Date.now(), createdAtIso: new Date().toISOString(), mediumMoisture: 'moist', leafState: 'normal', growthState: 'normal', environmentStress: 'normal', pestsVisible: 'no', photoIds: ['offline-photo-b'] }]
      });
      await window.GrowSimStorage.persistState();
      return photos.map((photo) => photo.id);
    });
    assert.deepStrictEqual(seeded, ['offline-photo-a', 'offline-photo-b']);

    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
    });
    await page.reload({ waitUntil: 'networkidle' });
    await waitForBoot(page);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker && navigator.serviceWorker.controller));

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 20000);
    await page.evaluate(async () => {
      const storage = window.GrowSimBuddyCarePhotoStorage.storage;
      await Promise.all([storage.getPhotoBlob('offline-photo-a'), storage.getPhotoBlob('offline-photo-b')]);
      window.__gsOpenBuddyCare();
      window.__gsSetActiveBuddyCareView('diary');
      window.__gsSetBuddyCareHistoryMode('photos');
    });
    await page.waitForFunction(() => document.querySelectorAll('.buddy-care-photo-card').length === 2);
    await page.evaluate(() => {
      window.__gsToggleBuddyCareComparePhoto('offline-photo-a');
      window.__gsToggleBuddyCareComparePhoto('offline-photo-b');
    });
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('.buddy-care-photo-comparison img[data-buddy-care-photo-id]'));
      return images.length === 2 && images.every((image) => (
        image.dataset.buddyCarePhotoState === 'loaded'
        && image.src.startsWith('blob:')
        && image.complete
        && image.naturalWidth > 0
      ));
    });
    const offlineState = await page.evaluate(async () => {
      const storage = window.GrowSimBuddyCarePhotoStorage.storage;
      const [first, second] = await Promise.all([storage.getPhotoBlob('offline-photo-a'), storage.getPhotoBlob('offline-photo-b')]);
      const comparisonImages = Array.from(document.querySelectorAll('.buddy-care-photo-comparison img[data-buddy-care-photo-id]'));
      return {
        firstSize: first && first.size,
        secondSize: second && second.size,
        comparisonVisible: Boolean(document.querySelector('.buddy-care-photo-comparison')),
        comparisonSourcesLocal: comparisonImages.length === 2 && comparisonImages.every((image) => image.src.startsWith('blob:')),
        online: navigator.onLine
      };
    });
    assert.ok(offlineState.firstSize > 0 && offlineState.secondSize > 0);
    assert.strictEqual(offlineState.comparisonVisible, true);
    assert.strictEqual(offlineState.comparisonSourcesLocal, true, 'offline comparison images must be decoded from local blob URLs');
    assert.strictEqual(offlineState.online, false);

    await page.evaluate(async () => {
      await window.GrowSimBuddyCarePhotoStorage.storage.deletePhoto('offline-photo-b');
      window.GrowSimBuddyCareState.removePhotoReference(window.__gsState, 'offline-photo-b');
      await window.GrowSimStorage.persistState();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 20000);
    const deleted = await page.evaluate(async () => ({
      metadata: await window.GrowSimBuddyCarePhotoStorage.storage.getPhoto('offline-photo-b'),
      blob: await window.GrowSimBuddyCarePhotoStorage.storage.getPhotoBlob('offline-photo-b'),
      refs: window.__gsState.buddyCare.dailyChecks.flatMap((check) => check.photoIds)
    }));
    assert.strictEqual(deleted.metadata, null);
    assert.strictEqual(deleted.blob, null);
    assert.ok(!deleted.refs.includes('offline-photo-b'));

    console.log('buddy-care-photo-offline-reopen.test.js passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(serverRuntime && serverRuntime.server);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
