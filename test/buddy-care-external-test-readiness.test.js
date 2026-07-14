#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const featureFlags = require('../src/buddy-care/featureFlags.js');
require('../src/buddy-care/types.js');
const externalTest = require('../src/buddy-care/externalTestReadiness.js');
const buddyCareState = require('../src/buddy-care/state.js');
const monetization = require('../src/buddy-care/monetizationReadiness.js');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const deLocale = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'locales', 'de.json'), 'utf8');

(function testExternalTestFlagIsSteerable() {
  assert.strictEqual(featureFlags.BUDDY_CARE_EXTERNAL_TEST_ENABLED, true, 'external test mode should default to enabled for the test build');
  assert.strictEqual(featureFlags.isBuddyCareExternalTestEnabled(), true, 'external test helper should reflect the enabled test build');
  assert.strictEqual(featureFlags.isBuddyCareExternalTestEnabled({ BUDDY_CARE_EXTERNAL_TEST_ENABLED: false }), false, 'external test helper should allow disabled override checks');
})();

(function testDefaultStateCarriesExternalTestSlice() {
  const defaults = buddyCareState.createDefaultBuddyCareState();
  assert.ok(defaults.externalTest && typeof defaults.externalTest === 'object', 'buddy care state should expose a dedicated external test slice');
  assert.deepStrictEqual(defaults.externalTest.events, [], 'external test state should start with no events');
})();

(function testSummaryDerivesChecklistMilestonesFromStateAndEvents() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.acceptBuddyCareAgeGate(rootState, Date.now());
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Alpha' });
  buddyCareState.addDailyCheck(rootState, rootState.buddyCare.plants[0].id, {
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no'
  });
  buddyCareState.addDiaryEntry(rootState, rootState.buddyCare.plants[0].id, {
    entryDate: '2026-07-11',
    title: 'Manual note',
    note: 'Short local feedback note'
  });
  buddyCareState.activateBuddyCarePlusMock(rootState);
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Beta' });
  externalTest.registerBuddyCareExternalTestSession(rootState, 'session-a');
  externalTest.registerBuddyCareExternalTestSession(rootState, 'session-b');
  externalTest.trackBuddyCareExternalTestEvent(rootState, 'buddy_care_diary_opened', { source: 'plant_details', locale: 'de' });
  externalTest.trackBuddyCareExternalTestEvent(rootState, 'buddy_care_weekly_review_viewed', { source: 'plant_details', locale: 'de' });

  const summary = externalTest.getBuddyCareExternalTestSummary(rootState);

  assert.strictEqual(summary.plantCount, 2, 'summary should report the current plant count');
  assert.strictEqual(summary.dailyCheckCompleted, true, 'summary should detect saved daily checks');
  assert.strictEqual(summary.diaryEntryCreated, true, 'summary should detect manual diary entries');
  assert.strictEqual(summary.testAccessActivated, true, 'summary should detect activated test access');
  assert.strictEqual(summary.secondPlantCreated, true, 'summary should detect the second plant');
  assert.strictEqual(summary.weeklyReviewViewed, true, 'summary should reflect weekly review milestone events');
  assert.strictEqual(summary.reloadCompleted, true, 'summary should detect a return session after reload');
})();

(function testEventsStaySanitizedAndAvoidGrowContent() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Visible Plant' });

  const event = externalTest.trackBuddyCareExternalTestEvent(rootState, 'buddy_care_first_plant_created', {
    source: 'setup_form',
    locale: 'de',
    nickname: 'Visible Plant',
    note: 'private note',
    heightCm: 12.4
  });

  assert.ok(event, 'external test events should be stored');
  assert.deepStrictEqual(Object.keys(event.payload).sort(), ['entitlement', 'locale', 'plantCount', 'source'], 'external test events should only keep the allowed technical payload fields');
  assert.strictEqual(event.payload.plantCount, 1, 'plant count should be sanitized to a simple numeric summary');
  assert.strictEqual(event.payload.entitlement, 'free', 'entitlement should be sanitized to the current technical state');

  const exported = externalTest.exportBuddyCareTestEvents(rootState);
  assert.ok(!exported.includes('Visible Plant'), 'exported external test events should not include plant names');
  assert.ok(!exported.includes('private note'), 'exported external test events should not include notes');
})();

(function testFeedbackStaysLocalAndSeparateFromTracking() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  externalTest.markBuddyCareExternalTestFeedbackOpened(rootState, Date.now());
  externalTest.saveBuddyCareExternalTestFeedback(rootState, {
    clarityRating: 4,
    helpfulFeatures: ['today_view', 'buddy_hints'],
    confusionNote: 'The weekly review could be easier to find.',
    wouldContinue: 'yes',
    wouldPay: 'maybe',
    pricingModel: 'season_pass',
    seasonPassPrice: '10_15'
  }, Date.now());
  externalTest.trackBuddyCareExternalTestEvent(rootState, 'buddy_care_test_feedback_submitted', {
    source: 'feedback_form',
    locale: 'en'
  });

  const feedback = rootState.buddyCare.externalTest.feedback;
  const exported = externalTest.exportBuddyCareTestEvents(rootState);

  assert.strictEqual(feedback.confusionNote, 'The weekly review could be easier to find.', 'feedback free text should stay in local feedback storage');
  assert.ok(!exported.includes('The weekly review could be easier to find.'), 'feedback free text should never be copied into tracking events');
})();

(function testResetOnlyTouchesBuddyCareData() {
  const rootState = {
    plant: { phase: 'seedling', name: 'Core Plant' },
    ui: { activeScreen: 'home' },
    buddyCare: buddyCareState.createDefaultBuddyCareState()
  };
  buddyCareState.acceptBuddyCareAgeGate(rootState, Date.now());
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Alpha' });
  buddyCareState.addDailyCheck(rootState, rootState.buddyCare.plants[0].id, {
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no'
  });
  externalTest.trackBuddyCareExternalTestEvent(rootState, 'buddy_care_daily_check_completed', {
    source: 'daily_check_form',
    locale: 'de'
  });

  const resetResult = buddyCareState.resetBuddyCareTestData(rootState);

  assert.strictEqual(resetResult.ok, true, 'buddy care test data should reset cleanly');
  assert.strictEqual(rootState.buddyCare.plants.length, 0, 'reset should clear buddy care plants');
  assert.strictEqual(rootState.buddyCare.dailyChecks.length, 0, 'reset should clear buddy care daily checks');
  assert.strictEqual(rootState.buddyCare.diaryEntries.length, 0, 'reset should clear buddy care diary entries');
  assert.strictEqual(rootState.buddyCare.entitlement, 'free', 'reset should restore the free entitlement state');
  assert.strictEqual(rootState.plant.name, 'Core Plant', 'reset should not touch the normal simulator state');
  assert.strictEqual(rootState.ui.activeScreen, 'home', 'reset should not touch the normal UI state outside buddy care');
})();

(function testUiHooksAndCopyExist() {
  assert.ok(indexHtml.includes('id="buddyCareExternalTestIntroCard"'), 'buddy care shell should expose the external test intro card');
  assert.ok(indexHtml.includes('id="buddyCareExternalTestChecklistCard"'), 'buddy care shell should expose the external test checklist card');
  assert.ok(indexHtml.includes('id="buddyCareExternalTestFeedbackCard"'), 'buddy care shell should expose the external test feedback card');
  assert.ok(indexHtml.includes('id="buddyCareExternalTestToolsCard"'), 'buddy care shell should expose the external test tools card');
  assert.ok(appJs.includes('function getBuddyCareExternalTestSummary()'), 'app should expose the external test summary helper');
  assert.ok(appJs.includes('function exportBuddyCareTestEvents()'), 'app should expose a local export helper');
  assert.ok(appJs.includes('function resetBuddyCareTestData()'), 'app should expose a buddy-care-only reset helper');
  assert.ok(deLocale.includes('"feedback_title": "Deine Einschätzung"'), 'German copy should include the feedback title');
})();

(function testExternalTestModeDoesNotEnableCheckout() {
  assert.strictEqual(monetization.isCarePlusCheckoutEnabled(), false, 'external test mode must not enable checkout');
  assert.ok(!appJs.includes('__gsStartBuddyCareCheckout'), 'external test mode must not wire a checkout flow');
})();

console.log('buddy-care-external-test-readiness.test.js passed');
