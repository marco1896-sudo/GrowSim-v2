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
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(serverRuntime.baseUrl, { waitUntil: 'domcontentloaded' });
    await waitForBoot(page);
    const result = await page.evaluate(async () => {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('grow-sim-care-photos');
        request.onsuccess = resolve;
        request.onerror = resolve;
        request.onblocked = resolve;
      });
      const storage = window.GrowSimBuddyCarePhotoStorage.createPhotoStorage();
      const processing = window.GrowSimBuddyCarePhotoProcessing;
      const canvas = document.createElement('canvas');
      canvas.width = 3200;
      canvas.height = 2400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#4f8d58';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e5d987';
      ctx.fillRect(1200, 800, 800, 800);
      const rawBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const file = new File([rawBlob, new TextEncoder().encode('ExifGPSLocationDeviceModel')], 'plant.png', { type: 'image/png' });
      const processed = await processing.processCarePhoto(file);
      const processedText = new TextDecoder('latin1').decode(await processed.blob.arrayBuffer());
      const first = await storage.savePhoto({
        blob: processed.blob,
        metadata: { id: 'photo-a', plantId: 'plant-a', sourceType: 'daily_check', sourceId: 'check-a', category: 'whole_plant', width: processed.width, height: processed.height, mimeType: processed.mimeType, byteSize: processed.byteSize, createdAt: 1000 }
      });
      storage.close();
      const loadedAfterReopen = await storage.getPhotoBlob('photo-a');
      const reopenedDb = await storage.openDatabase();
      const rawBlobRecord = await new Promise((resolve, reject) => {
        const request = reopenedDb.transaction('blobs', 'readonly').objectStore('blobs').get('photo-a');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await storage.savePhoto({
        blob: processed.blob,
        metadata: { id: 'photo-b', plantId: 'plant-b', sourceType: 'journal', sourceId: 'entry-b', category: 'detail', width: processed.width, height: processed.height, mimeType: processed.mimeType, byteSize: processed.byteSize, createdAt: 2000 }
      });
      await storage.savePhoto({
        blob: processed.blob,
        metadata: { id: 'photo-a-primary-next', plantId: 'plant-a', sourceType: 'journal', sourceId: 'entry-a', category: 'detail', width: processed.width, height: processed.height, mimeType: processed.mimeType, byteSize: processed.byteSize, createdAt: 2500 }
      });
      await storage.setPrimaryPhoto('plant-a', 'photo-a');
      const plantAWithFirstPrimary = await storage.getPhotosForPlant('plant-a');
      await storage.setPrimaryPhoto('plant-a', 'photo-a-primary-next');
      const plantA = await storage.getPhotosForPlant('plant-a');
      const plantB = await storage.getPhotosForPlant('plant-b');
      const loadedBlob = await storage.getPhotoBlob('photo-a');
      await storage.deletePhoto('photo-a');
      const deletedBlob = await storage.getPhotoBlob('photo-a');
      await storage.savePhoto({
        blob: processed.blob,
        metadata: { id: 'photo-a2', plantId: 'plant-a', sourceType: 'profile', category: 'whole_plant', width: processed.width, height: processed.height, mimeType: processed.mimeType, byteSize: processed.byteSize, createdAt: 3000 }
      });
      await storage.deletePhotosForPlant('plant-a');
      const plantDeletionKeptB = Boolean(await storage.getPhoto('photo-b'));
      const cleanup = await storage.cleanupOrphanedPhotos({ validPlantIds: new Set(['plant-a']) });
      const remainingB = await storage.getPhoto('photo-b');
      storage.close();
      return {
        original: { width: canvas.width, height: canvas.height, size: file.size },
        processed: { width: processed.width, height: processed.height, size: processed.byteSize, type: processed.mimeType },
        metadataMarkerPresent: processedText.includes('ExifGPSLocationDeviceModel'),
        first,
        loadedAfterReopen: Boolean(loadedAfterReopen && loadedAfterReopen.size > 0),
        rawBlobRecord: rawBlobRecord ? {
          id: rawBlobRecord.id,
          isBlob: rawBlobRecord.blob instanceof Blob,
          byteSize: rawBlobRecord.byteSize,
          mimeType: rawBlobRecord.mimeType,
          createdAt: rawBlobRecord.createdAt
        } : null,
        plantACount: plantA.length,
        plantBCount: plantB.length,
        firstPrimaryWasSet: plantAWithFirstPrimary.find((photo) => photo.id === 'photo-a').isPrimary,
        primaryIds: plantA.filter((photo) => photo.isPrimary).map((photo) => photo.id),
        priorPrimaryDowngraded: plantA.find((photo) => photo.id === 'photo-a').isPrimary === false,
        blobLoaded: Boolean(loadedBlob && loadedBlob.size),
        deletedBlob: Boolean(deletedBlob),
        plantDeletionKeptB,
        cleanup,
        remainingB: Boolean(remainingB)
      };
    });
    assert.deepStrictEqual([result.processed.width, result.processed.height], [1600, 1200]);
    assert.ok(['image/webp', 'image/jpeg'].includes(result.processed.type));
    assert.ok(result.processed.size < result.original.size);
    assert.strictEqual(result.metadataMarkerPresent, false, 'canvas re-encoding must not preserve source metadata payloads');
    assert.strictEqual(result.loadedAfterReopen, true, 'photo blobs must survive closing and reopening the IndexedDB connection');
    assert.deepStrictEqual(result.rawBlobRecord, {
      id: 'photo-a',
      isBlob: true,
      byteSize: result.processed.size,
      mimeType: result.processed.type,
      createdAt: 1000
    });
    assert.strictEqual(result.plantACount, 2);
    assert.strictEqual(result.plantBCount, 1);
    assert.strictEqual(result.firstPrimaryWasSet, true);
    assert.deepStrictEqual(result.primaryIds, ['photo-a-primary-next']);
    assert.strictEqual(result.priorPrimaryDowngraded, true);
    assert.strictEqual(result.blobLoaded, true);
    assert.strictEqual(result.deletedBlob, false);
    assert.strictEqual(result.plantDeletionKeptB, true, 'plant deletion must not remove another plant photo');
    assert.strictEqual(result.remainingB, false, 'cleanup must remove photos for deleted plants only');
    assert.ok(result.cleanup.removedPhotoIds.includes('photo-b'));
    const resetClearedPhotos = await page.evaluate(async () => {
      const storage = window.GrowSimBuddyCarePhotoStorage.storage;
      await storage.savePhoto({ blob: new Blob(['reset-photo'], { type: 'image/webp' }), metadata: { id: 'reset-photo', plantId: 'plant-reset', sourceType: 'profile', width: 1, height: 1, mimeType: 'image/webp', byteSize: 11 } });
      await window.GrowSimStorage.clearStoredState();
      return (await storage.getPhoto('reset-photo')) === null && (await storage.getPhotoBlob('reset-photo')) === null;
    });
    assert.strictEqual(resetClearedPhotos, true, 'full stored-state reset must clear Care+ photo metadata and blobs');
    console.log('buddy-care-photo-browser.test.js passed');
  } finally {
    await closeBrowser(browser);
    await closeServer(serverRuntime && serverRuntime.server);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
