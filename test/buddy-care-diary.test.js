#!/usr/bin/env node
'use strict';

const assert = require('assert');
const buddyCareFlags = require('../src/buddy-care/featureFlags.js');
require('../src/buddy-care/types.js');
const buddyCareState = require('../src/buddy-care/state.js');

const NOW = Date.UTC(2026, 6, 10, 10, 30, 0);
const TODAY_KEY = '2026-07-10';

function createRootStateWithPlant(nickname = 'Alpha') {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  const addPlantResult = buddyCareState.addBuddyCarePlant(rootState, {
    nickname,
    plantType: 'auto',
    environment: 'indoor',
    startDate: '2026-07-01'
  });
  assert.strictEqual(addPlantResult.ok, true, 'test plant should be created');
  return { rootState, plant: addPlantResult.plant };
}

(function testDefaultStateAndLegacyNormalization() {
  const defaults = buddyCareState.createDefaultBuddyCareState();
  assert.deepStrictEqual(defaults.diaryEntries, [], 'default state should expose diaryEntries');

  const normalized = buddyCareState.normalizeBuddyCareState({
    entitlement: 'free',
    plants: [{ id: 'plant-1', nickname: 'Legacy' }]
  });
  assert.deepStrictEqual(normalized.diaryEntries, [], 'legacy states without diaryEntries should normalize cleanly');
})();

(function testManualDiaryEntryLifecycle() {
  const { rootState, plant } = createRootStateWithPlant('Beta');

  const addResult = buddyCareState.addDiaryEntry(rootState, plant.id, {
    entryDate: TODAY_KEY,
    title: 'Morning note',
    note: 'Leaves looked calm.',
    tags: ['observation', 'height'],
    heightCm: 18.5
  }, { now: NOW });

  assert.strictEqual(addResult.ok, true, 'manual diary entry should be added');
  assert.strictEqual(rootState.buddyCare.diaryEntries.length, 1, 'manual diary entry should persist');
  assert.strictEqual(rootState.buddyCare.diaryEntries[0].entryType, 'manual', 'manual entry should keep its type');

  const entries = buddyCareState.getDiaryEntriesForPlant(rootState, plant.id);
  assert.strictEqual(entries.length, 1, 'entries should be returned per plant');
  assert.strictEqual(entries[0].title, 'Morning note', 'manual title should survive');
  assert.deepStrictEqual(entries[0].tags, ['observation', 'height'], 'manual tags should survive normalization');

  const latestEntry = buddyCareState.getLatestDiaryEntryForPlant(rootState, plant.id);
  assert.strictEqual(latestEntry.id, entries[0].id, 'latest entry should resolve correctly');
  assert.strictEqual(
    buddyCareState.getDiaryEntriesForToday(rootState, plant.id, { now: NOW }).length,
    1,
    'today query should find today diary entries'
  );

  const deleteResult = buddyCareState.deleteDiaryEntry(rootState, latestEntry.id);
  assert.strictEqual(deleteResult.ok, true, 'entries should be deletable');
  assert.strictEqual(rootState.buddyCare.diaryEntries.length, 0, 'deleting should remove the diary entry');
})();

(function testDailyCheckCreatesLinkedDiaryEntryWithoutDuplicates() {
  const { rootState, plant } = createRootStateWithPlant('Gamma');

  const addCheckResult = buddyCareState.addDailyCheck(rootState, plant.id, {
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no',
    note: 'short calm check'
  }, { now: NOW });

  assert.strictEqual(addCheckResult.ok, true, 'daily check should be stored');
  assert.strictEqual(rootState.buddyCare.diaryEntries.length, 1, 'daily check should create a linked diary entry');
  assert.strictEqual(
    rootState.buddyCare.diaryEntries[0].linkedCheckId,
    addCheckResult.check.id,
    'linked diary entry should point to the saved check'
  );
  assert.strictEqual(
    rootState.buddyCare.diaryEntries[0].entryType,
    'daily_check',
    'linked diary entry should be marked as daily_check'
  );
  assert.deepStrictEqual(
    rootState.buddyCare.diaryEntries[0].tags,
    ['daily_check', 'observation'],
    'calm daily checks should create the base diary tags'
  );

  const duplicateResult = buddyCareState.createDiaryEntryFromDailyCheck(rootState, plant.id, addCheckResult.check.id, { now: NOW });
  assert.strictEqual(duplicateResult.ok, true, 're-linking an existing check should succeed');
  assert.strictEqual(duplicateResult.reason, 'diary_entry_exists', 're-linking should not create duplicates');
  assert.strictEqual(rootState.buddyCare.diaryEntries.length, 1, 're-linking should keep diary entries deduplicated');
})();

(function testAttentionCheckDiaryAndLimitsStayUnchanged() {
  const { rootState, plant } = createRootStateWithPlant('Delta');

  const addCheckResult = buddyCareState.addDailyCheck(rootState, plant.id, {
    mediumMoisture: 'wet',
    leafState: 'hanging',
    growthState: 'slow',
    environmentStress: 'normal',
    pestsVisible: 'no',
    heightCm: 24
  }, { now: NOW });

  assert.strictEqual(addCheckResult.ok, true, 'attention daily check should be stored');
  assert.deepStrictEqual(
    rootState.buddyCare.diaryEntries[0].tags,
    ['daily_check', 'observation', 'height', 'issue'],
    'attention checks should carry height and issue tags'
  );
  assert.strictEqual(
    rootState.buddyCare.diaryEntries[0].buddyComment,
    'buddyCare.summary.needs_attention',
    'attention checks should store the buddy summary key for UI rendering'
  );

  assert.strictEqual(buddyCareFlags.getFreePlantLimit(), 1, 'free limit should stay unchanged');
  buddyCareState.activateBuddyCarePlusMock(rootState);
  assert.strictEqual(buddyCareState.getBuddyCarePlantLimit(rootState), 3, 'care+ mock limit should stay unchanged');
})();

console.log('buddy-care-diary.test.js passed');
