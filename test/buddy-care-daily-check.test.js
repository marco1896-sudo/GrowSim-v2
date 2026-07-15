#!/usr/bin/env node
'use strict';

const assert = require('assert');
const buddyCareFlags = require('../src/buddy-care/featureFlags.js');
require('../src/buddy-care/types.js');
const buddyCareState = require('../src/buddy-care/state.js');

const NOW = Date.UTC(2026, 6, 10, 10, 30, 0);
const TODAY_KEY = '2026-07-10';

(function testCreateDailyCheck() {
  const check = buddyCareState.createDailyCheck({
    plantId: 'plant-1',
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'slow',
    environmentStress: 'normal',
    pestsVisible: 'no',
    heightCm: 24.5,
    note: 'ruhiger tag'
  }, { now: NOW });

  assert.strictEqual(check.plantId, 'plant-1', 'daily check should keep the plant id');
  assert.strictEqual(check.dayKey, TODAY_KEY, 'daily check should derive the current day key');
  assert.strictEqual(check.mediumMoisture, 'moist', 'daily check should keep the medium state');
  assert.strictEqual(check.heightCm, 24.5, 'daily check should keep the height');
  assert.ok(check.createdAtIso.startsWith('2026-07-10T'), 'daily check should store an ISO timestamp');
})();

(function testAddAndReadDailyChecks() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.acceptBuddyCareAgeGate(rootState, NOW);
  const addPlant = buddyCareState.addBuddyCarePlant(rootState, {
    nickname: 'Alpha',
    plantType: 'auto',
    environment: 'indoor',
    startDate: '2026-07-01'
  });
  assert.strictEqual(addPlant.ok, true, 'setup plant should be added');

  const addCheck = buddyCareState.addDailyCheck(rootState, addPlant.plant.id, {
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no',
    heightCm: 19
  }, { now: NOW });

  assert.strictEqual(addCheck.ok, true, 'daily check should be stored');
  assert.strictEqual(rootState.buddyCare.dailyChecks.length, 1, 'daily check should land in buddyCare.dailyChecks');

  const checks = buddyCareState.getDailyChecksForPlant(rootState, addPlant.plant.id);
  assert.strictEqual(checks.length, 1, 'daily checks for the plant should be returned');
  assert.strictEqual(buddyCareState.getLatestDailyCheckForPlant(rootState, addPlant.plant.id).heightCm, 19, 'latest check should be found');
  assert.strictEqual(buddyCareState.hasDailyCheckToday(rootState, addPlant.plant.id, { now: NOW }), true, 'hasDailyCheckToday should detect the new check');
})();

(function testSameDayCheckUpdatesWithoutCrossPlantLeakage() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.activateBuddyCarePlusMock(rootState);
  const alpha = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Alpha' }).plant;
  const beta = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Beta' }).plant;

  const first = buddyCareState.addDailyCheck(rootState, alpha.id, {
    mediumMoisture: 'dry', leafState: 'normal', growthState: 'normal', environmentStress: 'normal', pestsVisible: 'no', heightCm: '12,5'
  }, { now: NOW });
  const updated = buddyCareState.addDailyCheck(rootState, alpha.id, {
    mediumMoisture: 'moist', leafState: 'normal', growthState: 'normal', environmentStress: 'normal', pestsVisible: 'no', heightCm: '13.2'
  }, { now: NOW + 60_000 });
  const betaCheck = buddyCareState.addDailyCheck(rootState, beta.id, {
    mediumMoisture: 'wet', leafState: 'hanging', growthState: 'slow', environmentStress: 'humid', pestsVisible: 'no', heightCm: 20
  }, { now: NOW + 120_000 });

  assert.strictEqual(first.ok, true, 'first daily check should save');
  assert.strictEqual(first.check.heightCm, 12.5, 'decimal comma should normalize safely');
  assert.strictEqual(updated.reason, 'daily_check_updated', 'second same-day check should update the existing record');
  assert.strictEqual(updated.check.id, first.check.id, 'same-day update should keep a stable check id');
  assert.strictEqual(rootState.buddyCare.dailyChecks.length, 2, 'separate plants should keep separate same-day records');
  assert.strictEqual(rootState.buddyCare.diaryEntries.length, 2, 'each plant check should keep one linked diary record');
  assert.strictEqual(buddyCareState.getLatestDailyCheckForPlant(rootState, alpha.id).heightCm, 13.2, 'updated Alpha height should be isolated');
  assert.strictEqual(buddyCareState.getLatestDailyCheckForPlant(rootState, beta.id).heightCm, 20, 'Beta height should stay isolated');
  assert.notStrictEqual(updated.check.id, betaCheck.check.id, 'different plant checks need unique ids');
  assert.notStrictEqual(updated.diaryEntry.id, betaCheck.diaryEntry.id, 'different diary records need unique ids');
})();

(function testInvalidHeightDoesNotMutateState() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  const plant = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Height Guard' }).plant;
  for (const invalidHeight of [0, -1, 'abc', 1001]) {
    const result = buddyCareState.addDailyCheck(rootState, plant.id, {
      mediumMoisture: 'moist', leafState: 'normal', growthState: 'normal', environmentStress: 'normal', pestsVisible: 'no', heightCm: invalidHeight
    }, { now: NOW });
    assert.strictEqual(result.ok, false, `height ${invalidHeight} should be rejected`);
    assert.strictEqual(result.reason, 'invalid_height', 'invalid height should expose a stable reason');
  }
  assert.strictEqual(rootState.buddyCare.dailyChecks.length, 0, 'invalid heights must not save a daily check');
  assert.strictEqual(rootState.buddyCare.diaryEntries.length, 0, 'invalid heights must not create linked diary data');
})();

(function testStatusCheckedToday() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  const addPlant = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Alpha' });
  buddyCareState.addDailyCheck(rootState, addPlant.plant.id, {
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no'
  }, { now: NOW });

  assert.strictEqual(
    buddyCareState.getPlantDailyCheckStatus(rootState, addPlant.plant.id, { now: NOW }),
    'checked_today',
    'calm daily checks should map to checked_today'
  );
})();

(function testStatusNeedsAttentionFromLeafState() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  const addPlant = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Beta' });
  buddyCareState.addDailyCheck(rootState, addPlant.plant.id, {
    mediumMoisture: 'moist',
    leafState: 'spots',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no'
  }, { now: NOW });

  assert.strictEqual(
    buddyCareState.getPlantDailyCheckStatus(rootState, addPlant.plant.id, { now: NOW }),
    'needs_attention',
    'visible leaf issues should trigger needs_attention'
  );
})();

(function testStatusNeedsAttentionFromPests() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  const addPlant = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Gamma' });
  buddyCareState.addDailyCheck(rootState, addPlant.plant.id, {
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'yes'
  }, { now: NOW });

  assert.strictEqual(
    buddyCareState.getPlantDailyCheckStatus(rootState, addPlant.plant.id, { now: NOW }),
    'needs_attention',
    'visible pests should trigger needs_attention'
  );
})();

(function testStatusNeedsAttentionFromWetAndHanging() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  const addPlant = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Delta' });
  buddyCareState.addDailyCheck(rootState, addPlant.plant.id, {
    mediumMoisture: 'wet',
    leafState: 'hanging',
    growthState: 'slow',
    environmentStress: 'normal',
    pestsVisible: 'no'
  }, { now: NOW });

  assert.strictEqual(
    buddyCareState.getPlantDailyCheckStatus(rootState, addPlant.plant.id, { now: NOW }),
    'needs_attention',
    'wet medium plus hanging leaves should trigger needs_attention'
  );
})();

(function testNoCheckTodayAndLegacyNormalization() {
  const normalized = buddyCareState.normalizeBuddyCareState({
    entitlement: 'free',
    plants: [{ id: 'plant-1', nickname: 'Legacy' }]
  });

  assert.deepStrictEqual(normalized.dailyChecks, [], 'legacy states without dailyChecks should normalize cleanly');
  assert.strictEqual(
    buddyCareState.getPlantDailyCheckStatus(normalized, 'plant-1', { now: NOW }),
    'no_check_today',
    'plants without checks should report no_check_today'
  );
})();

(function testPlantLimitsStayUnchanged() {
  assert.strictEqual(buddyCareFlags.getFreePlantLimit(), 1, 'free limit should stay at one plant');
  assert.strictEqual(buddyCareFlags.getCarePlusMockPlantLimit(), 3, 'care+ mock limit should stay at three plants');
})();

console.log('buddy-care-daily-check.test.js passed');
