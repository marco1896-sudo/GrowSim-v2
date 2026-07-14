#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const buddyCareFlags = require('../src/buddy-care/featureFlags.js');
require('../src/buddy-care/types.js');
const buddyCareState = require('../src/buddy-care/state.js');
const monetization = require('../src/buddy-care/monetizationReadiness.js');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const deLocale = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'locales', 'de.json'), 'utf8');

(function testCheckoutStaysDisabledByDefault() {
  assert.strictEqual(buddyCareFlags.CARE_PLUS_CHECKOUT_ENABLED, false, 'checkout flag should stay disabled');
  assert.strictEqual(buddyCareFlags.CARE_PLUS_PAYMENT_READY, false, 'payment readiness should default to false');
  assert.strictEqual(monetization.isCarePlusPaymentReady(), false, 'payment readiness helper should default to false');
  assert.strictEqual(monetization.isCarePlusCheckoutEnabled(), false, 'checkout helper should default to false');
})();

(function testCheckoutNeedsAllReadinessFlags() {
  assert.strictEqual(monetization.isCarePlusCheckoutEnabled({
    CARE_PLUS_CHECKOUT_ENABLED: true,
    CARE_PLUS_PAYMENT_READY: false,
    BUDDY_CARE_REAL_PAYMENT_ENABLED: true
  }), false, 'checkout should stay blocked when payment readiness is false');

  assert.strictEqual(monetization.isCarePlusCheckoutEnabled({
    CARE_PLUS_CHECKOUT_ENABLED: true,
    CARE_PLUS_PAYMENT_READY: true,
    BUDDY_CARE_REAL_PAYMENT_ENABLED: true
  }), true, 'checkout should only become enabled when every readiness flag is true');
})();

(function testOfferStaysMockOnly() {
  const offer = monetization.getCarePlusOffer();

  assert.strictEqual(offer.id, 'buddy_care_season_pass_mock', 'offer id should stay on the mock season pass');
  assert.strictEqual(offer.isMock, true, 'offer should stay marked as mock');
  assert.strictEqual(offer.checkoutEnabled, false, 'offer should not expose checkout');
  assert.strictEqual(offer.priceLabel, '19,99 EUR', 'offer should keep the test access price label');
  assert.ok(Array.isArray(offer.featureKeys) && offer.featureKeys.length === 6, 'offer should describe the current season pass features without future placeholders');
})();

(function testCheckoutStateHidesInternalReadinessReasons() {
  const checkoutState = monetization.getCarePlusCheckoutState();

  assert.strictEqual(checkoutState.enabled, false, 'checkout should stay disabled in the Buddy Care+ test access build');
  assert.strictEqual(checkoutState.disabledReasonKey, '', 'checkout state should not expose internal readiness copy to users');
  assert.strictEqual(checkoutState.testModeKey, 'buddyCare.screen.test_mode_note', 'checkout state should still point to the public test-access note');
})();

(function testUpgradeReasonsMatchFreeContext() {
  const emptyRoot = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  const emptyReason = monetization.getCarePlusUpgradeReasons(emptyRoot, 'dashboard');
  assert.strictEqual(emptyReason.bodyKey, 'buddyCare.screen.upgrade_reason_free_zero', 'free users without plants should get the first-slot upgrade reason');

  const fullFreeRoot = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.addBuddyCarePlant(fullFreeRoot, { nickname: 'Alpha' });
  const fullReason = monetization.getCarePlusUpgradeReasons(fullFreeRoot, 'dashboard');
  assert.strictEqual(fullReason.bodyKey, 'buddyCare.screen.upgrade_reason_free_one', 'free users with one plant should get the full-slot upgrade reason');

  const lockedSlotReason = monetization.getCarePlusUpgradeReasons(fullFreeRoot, 'locked_slot');
  assert.strictEqual(lockedSlotReason.bodyKey, 'buddyCare.screen.upgrade_reason_locked_slot', 'locked slot copy should explain the Care+ separation benefit');
})();

(function testConversionEventsStayLocalAndSanitized() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Visible Plant' });
  const eventStore = {
    buddyCare: rootState.buddyCare,
    conversionEvents: []
  };

  monetization.trackBuddyCareConversionIntent(eventStore, 'buddy_care_locked_slot_clicked', {
    source: 'locked-slot',
    slotNumber: 2,
    nickname: 'Visible Plant',
    note: 'private note',
    plantCount: 1
  });

  const events = monetization.getBuddyCareConversionEvents(eventStore);
  assert.strictEqual(events.length, 1, 'locked slot intent should be stored locally');
  assert.strictEqual(events[0].eventName, 'buddy_care_locked_slot_clicked', 'the locked slot intent should keep its event name');
  assert.strictEqual(events[0].payload.source, 'locked-slot', 'safe conversion metadata should be preserved');
  assert.strictEqual(events[0].payload.slotNumber, 2, 'safe numeric metadata should be preserved');
  assert.ok(!Object.prototype.hasOwnProperty.call(events[0].payload, 'nickname'), 'plant names should not be stored in conversion events');
  assert.ok(!Object.prototype.hasOwnProperty.call(events[0].payload, 'note'), 'notes should not be stored in conversion events');
})();

(function testUiStaysMockOnly() {
  assert.ok(indexHtml.includes('id="buddyCareSeasonPassStatusNote"'), 'season pass UI should expose a status note container');
  assert.ok(indexHtml.includes('data-i18n="buddyCare.screen.test_mode_note"'), 'season pass UI should keep the public test access note visible');
  assert.ok(appJs.includes("trackBuddyCareConversionIntent('buddy_care_mock_unlocked'"), 'test access activation should be tracked locally');
  assert.ok(appJs.includes("trackBuddyCareConversionIntent('buddy_care_locked_slot_clicked'"), 'locked slot taps should be tracked locally');
  assert.ok(!indexHtml.includes('id="buddyCareCheckoutBtn"'), 'season pass UI should still avoid rendering a checkout button');
  assert.ok(!appJs.includes('__gsStartBuddyCareCheckout'), 'runtime should still avoid exporting a checkout starter');
})();

(function testGuardedCopyAvoidsRiskyPhrases() {
  const sourceBundle = `${indexHtml}\n${appJs}\n${deLocale}`;
  assert.ok(!sourceBundle.includes('Jetzt kaufen'), 'buddy care test-access copy should avoid direct buy-now language');
  assert.ok(!sourceBundle.includes('zahlungspflichtig bestellen'), 'buddy care test-access copy should avoid order language');
  assert.ok(!sourceBundle.includes('Cannabis kaufen'), 'buddy care test-access copy should avoid cannabis commerce language');
  assert.ok(!sourceBundle.includes('Seeds kaufen'), 'buddy care test-access copy should avoid seed-shop language');
})();

console.log('buddy-care-monetization-readiness.test.js passed');
