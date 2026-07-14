#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

require('../src/buddy-care/types.js');
const buddyCareState = require('../src/buddy-care/state.js');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const deLocale = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'locales', 'de.json'), 'utf8');
const enLocale = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en.json'), 'utf8');
const esLocale = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'locales', 'es.json'), 'utf8');

(function testVisibleBuddyCareCopyStaysProductReady() {
  const sourceBundle = `${indexHtml}\n${deLocale}\n${enLocale}\n${esLocale}`;

  assert.doesNotMatch(sourceBundle, /(Technisches Fundament|Phase 5 ist bereit|MVP 0\.1|Mock freischalten|Testmodus:)/i, 'Buddy Care should avoid internal rollout wording in visible copy');
  assert.match(sourceBundle, /Testzugang aktivieren|Care\+ Test Access|Acceso de prueba Care\+/i, 'Buddy Care should use consistent test access wording across locales');
})();

(function testOverlayCoordinationStaysGuarded() {
  assert.match(appJs, /function flushBuddyCareDeferredMenuDialog\(\)/, 'Buddy Care should expose a deferred dialog flush helper');
  assert.match(appJs, /if \(isBuddyCareScreenActive\(\) && allowWhileBuddyCare !== true && safeVariant === 'mission-reward'\)/, 'mission reward dialogs should be deferred while Buddy Care is active');
  assert.match(appJs, /renderFirstRunIntroOverlay\(\);\s+renderFirstRunDashboardFollowupOverlay\(\);/s, 'Buddy Care open and close flow should resync first-run overlays');
})();

(function testReadOnlyGuardsProtectDowngradedPlants() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.activateBuddyCarePlusMock(rootState);
  const alpha = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Alpha' }).plant;
  const beta = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Beta' }).plant;
  const gamma = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Gamma' }).plant;

  buddyCareState.setBuddyCareEntitlement(rootState, 'free');

  assert.strictEqual(rootState.buddyCare.plants.length, 3, 'downgrades should keep all stored plants');
  assert.strictEqual(buddyCareState.isBuddyCarePlantReadOnly(rootState, alpha.id), false, 'slot 1 should stay active after downgrade');
  assert.strictEqual(buddyCareState.isBuddyCarePlantReadOnly(rootState, beta.id), true, 'slot 2 should become read-only after downgrade');
  assert.strictEqual(buddyCareState.isBuddyCarePlantReadOnly(rootState, gamma.id), true, 'slot 3 should become read-only after downgrade');
})();

(function testRemovalCleansLinkedBuddyCareData() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.activateBuddyCarePlusMock(rootState);
  const plant = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Cleanup' }).plant;
  buddyCareState.addDailyCheck(rootState, plant.id, {
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no'
  });
  buddyCareState.addDiaryEntry(rootState, plant.id, {
    entryDate: '2026-07-10',
    title: 'Manual note',
    note: 'Linked cleanup'
  });
  rootState.buddyCare.tasks.push({ id: 'task-1', plantId: plant.id, title: 'Observe', status: 'open' });
  rootState.buddyCare.riskSignals.push({ id: 'risk-1', plantId: plant.id, level: 'medium', label: 'Watch', source: 'test' });

  const result = buddyCareState.removeBuddyCarePlant(rootState, plant.id);

  assert.strictEqual(result.ok, true, 'plants should still be removable');
  assert.strictEqual(rootState.buddyCare.plants.length, 0, 'removing a plant should clear the profile');
  assert.strictEqual(rootState.buddyCare.dailyChecks.length, 0, 'removing a plant should clear linked daily checks');
  assert.strictEqual(rootState.buddyCare.diaryEntries.length, 0, 'removing a plant should clear linked diary entries');
  assert.strictEqual(rootState.buddyCare.tasks.length, 0, 'removing a plant should clear linked tasks');
  assert.strictEqual(rootState.buddyCare.riskSignals.length, 0, 'removing a plant should clear linked risk signals');
})();

(function testNormalizationFiltersBrokenPlantReferences() {
  const normalized = buddyCareState.normalizeBuddyCareState({
    entitlement: 'care_plus_mock',
    plants: [
      { id: '', nickname: '', startDate: 'not-a-date' },
      { id: 'dup', nickname: 'Alpha', environment: 'mars' },
      { id: 'dup', nickname: 'Beta', plantType: 'mystery' }
    ],
    dailyChecks: [
      { id: 'check-ok', plantId: 'dup', createdAtIso: '2026-07-10T08:00:00.000Z' },
      { id: 'check-orphan', plantId: 'missing', createdAtIso: '2026-07-10T09:00:00.000Z' }
    ],
    diaryEntries: [
      { id: 'entry-ok', plantId: 'dup', createdAt: '2026-07-10T08:10:00.000Z', updatedAt: '2026-07-10T08:10:00.000Z' },
      { id: 'entry-orphan', plantId: 'missing', createdAt: '2026-07-10T09:10:00.000Z', updatedAt: '2026-07-10T09:10:00.000Z' }
    ]
  });

  assert.strictEqual(normalized.plants.length, 3, 'normalization should keep valid stored plants up to the safe maximum');
  assert.ok(normalized.plants[0].id, 'missing plant ids should be replaced with safe ids');
  assert.notStrictEqual(normalized.plants[1].id, normalized.plants[2].id, 'duplicate plant ids should be deduplicated');
  assert.strictEqual(normalized.plants[1].environment, 'unknown', 'unsupported environments should normalize safely');
  assert.strictEqual(normalized.plants[2].plantType, 'unknown', 'unsupported plant types should normalize safely');
  assert.strictEqual(normalized.dailyChecks.length, 1, 'orphaned daily checks should be filtered out');
  assert.strictEqual(normalized.diaryEntries.length, 1, 'orphaned diary entries should be filtered out');
})();

console.log('buddy-care-product-hardening.test.js passed');
