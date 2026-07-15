'use strict';

const assert = require('assert');
const types = require('../src/buddy-care/types.js');
const stateApi = require('../src/buddy-care/state.js');
const photoStorageApi = require('../src/buddy-care/photoStorage.js');
const photoProcessingApi = require('../src/buddy-care/photoProcessing.js');
const contextBuilder = require('../src/buddy-care/intelligence/contextBuilder.js');

(function testPhotoDefaultsAndMigration() {
  assert.strictEqual(types.VERSION, 4, 'photo references should use the v4 Care+ slice');
  const migrated = stateApi.normalizeBuddyCareState({
    version: 3,
    plants: [{ id: 'plant-a', nickname: 'A', startDate: '2026-07-01' }],
    dailyChecks: [{ id: 'check-a', plantId: 'plant-a', dayKey: '2026-07-15', photoIds: ['p1', 'p2', 'p3', 'p4'] }],
    diaryEntries: [{ id: 'entry-a', plantId: 'plant-a', entryDate: '2026-07-15', photoIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] }]
  });
  assert.strictEqual(migrated.version, 4);
  assert.strictEqual(migrated.plants[0].primaryPhotoId, null);
  assert.deepStrictEqual(migrated.dailyChecks[0].photoIds, ['p1', 'p2', 'p3']);
  assert.deepStrictEqual(migrated.diaryEntries[0].photoIds, ['p1', 'p2', 'p3', 'p4', 'p5']);
  assert.strictEqual(migrated.settings.photoPrivacyNoticeSeen, false);
})();

(function testPhotoReferenceMutationsAndIsolation() {
  const root = {
    buddyCare: stateApi.normalizeBuddyCareState({
      plants: [
        { id: 'plant-a', nickname: 'A', startDate: '2026-07-01' },
        { id: 'plant-b', nickname: 'B', startDate: '2026-07-01' }
      ]
    })
  };
  const check = stateApi.addDailyCheck(root, 'plant-a', {
    id: 'check-a', mediumMoisture: 'moist', leafState: 'normal', growthState: 'normal', environmentStress: 'normal', pestsVisible: 'no', photoIds: ['photo-a']
  }, { now: Date.parse('2026-07-15T10:00:00Z') });
  assert.strictEqual(check.ok, true);
  assert.deepStrictEqual(check.check.photoIds, ['photo-a']);
  const entry = stateApi.addDiaryEntry(root, 'plant-b', { id: 'entry-b', title: 'B', photoIds: ['photo-b'] }, { now: Date.parse('2026-07-15T11:00:00Z') });
  assert.strictEqual(entry.ok, true);
  const updatedEntry = stateApi.updateDiaryEntry(root, 'entry-b', { title: 'B updated', note: 'kept photo' });
  assert.strictEqual(updatedEntry.ok, true);
  assert.deepStrictEqual(updatedEntry.entry.photoIds, ['photo-b'], 'editing an entry must preserve its photos');
  stateApi.setPlantPrimaryPhoto(root, 'plant-a', 'photo-a');
  stateApi.removePhotoReference(root, 'photo-a');
  const normalized = stateApi.normalizeBuddyCareState(root.buddyCare);
  assert.strictEqual(normalized.plants.find((plant) => plant.id === 'plant-a').primaryPhotoId, null);
  assert.deepStrictEqual(normalized.dailyChecks.find((item) => item.id === 'check-a').photoIds, []);
  assert.deepStrictEqual(normalized.diaryEntries.find((item) => item.id === 'entry-b').photoIds, ['photo-b'], 'other plant photos must stay isolated');
})();

(function testDailyCheckDeletionRemovesLinkedAutoDiaryOnly() {
  const root = {
    buddyCare: stateApi.normalizeBuddyCareState({
      plants: [{ id: 'plant-a', nickname: 'A', startDate: '2026-07-01' }]
    })
  };
  const checkResult = stateApi.addDailyCheck(root, 'plant-a', {
    id: 'check-delete', mediumMoisture: 'moist', leafState: 'normal', growthState: 'normal', environmentStress: 'normal', pestsVisible: 'no', photoIds: ['photo-delete']
  }, { now: Date.parse('2026-07-15T10:00:00Z') });
  stateApi.addDiaryEntry(root, 'plant-a', { id: 'entry-keep', title: 'Keep', photoIds: ['photo-keep'] }, { now: Date.parse('2026-07-15T11:00:00Z') });
  const deleted = stateApi.deleteDailyCheck(root, checkResult.check.id);
  assert.strictEqual(deleted.ok, true);
  assert.strictEqual(root.buddyCare.dailyChecks.some((check) => check.id === checkResult.check.id), false);
  assert.strictEqual(root.buddyCare.diaryEntries.some((entry) => entry.linkedCheckId === checkResult.check.id), false);
  assert.strictEqual(root.buddyCare.diaryEntries.some((entry) => entry.id === 'entry-keep'), true, 'manual diary entries must remain');
})();

(function testPhotoMetadataNormalization() {
  const normalized = photoStorageApi.normalizePhotoMetadata({
    id: 'photo-a', plantId: 'plant-a', sourceType: 'daily_check', sourceId: 'check-a', category: 'leaf_bottom', width: 1200, height: 900, byteSize: 250000, note: ' underside '
  });
  assert.strictEqual(normalized.schemaVersion, 1);
  assert.strictEqual(normalized.sourceType, 'daily_check');
  assert.strictEqual(normalized.category, 'leaf_bottom');
  assert.strictEqual(normalized.note, 'underside');
  assert.ok(normalized.id.startsWith('photo-'));
})();

(function testProcessingValidationAndDimensions() {
  const validFile = { size: 1024, type: 'image/jpeg' };
  assert.strictEqual(photoProcessingApi.validateCarePhotoFile(validFile).mimeType, 'image/jpeg');
  assert.deepStrictEqual(photoProcessingApi.calculateOutputDimensions(3200, 2400, 1600), { width: 1600, height: 1200 });
  assert.deepStrictEqual(photoProcessingApi.calculateOutputDimensions(800, 600, 1600), { width: 800, height: 600 }, 'small images must not be upscaled');
  assert.throws(() => photoProcessingApi.validateCarePhotoFile({ size: 100, type: 'image/heic' }), /heic_unsupported/);
  assert.throws(() => photoProcessingApi.validateCarePhotoFile({ size: 16 * 1024 * 1024, type: 'image/jpeg' }), /file_too_large/);
})();

(function testIntelligenceUsesMetadataOnly() {
  const source = stateApi.normalizeBuddyCareState({
    plants: [{ id: 'plant-a', nickname: 'A', startDate: '2026-07-01' }],
    dailyChecks: [{ id: 'check-a', plantId: 'plant-a', dayKey: '2026-07-15', createdAt: Date.parse('2026-07-15T10:00:00Z'), photoIds: ['photo-a'] }]
  });
  const context = contextBuilder.buildCareContext(source, 'plant-a', { now: Date.parse('2026-07-15T12:00:00Z') });
  assert.strictEqual(context.derived.photoPresent, true);
  assert.strictEqual(context.derived.currentCheckPhotoCount, 1);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(context.derived, 'imageDiagnosis'), false, 'no image diagnosis may be created');
})();

console.log('buddy-care-photo-model.test.js passed');
