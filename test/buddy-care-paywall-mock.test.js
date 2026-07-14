#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const buddyCareFlags = require('../src/buddy-care/featureFlags.js');
require('../src/buddy-care/types.js');
const buddyCareState = require('../src/buddy-care/state.js');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

(function testFeatureFlagsStayMockOnly() {
  assert.strictEqual(buddyCareFlags.CARE_PLUS_MOCK_ENABLED, true, 'care+ mock flag should stay enabled');
  assert.strictEqual(buddyCareFlags.CARE_PLUS_PAYWALL_ENABLED, false, 'real paywall flag should stay disabled');
  assert.strictEqual(buddyCareFlags.CARE_PLUS_CHECKOUT_ENABLED, false, 'checkout flag should stay disabled');
  assert.strictEqual(buddyCareFlags.CARE_PLUS_PAYMENT_READY, false, 'payment readiness should stay disabled');
  assert.strictEqual(buddyCareFlags.isBuddyCareCheckoutEnabled(), false, 'checkout helper should stay disabled');
})();

(function testFreeStaysDefaultAndLimitedToOnePlant() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  assert.strictEqual(buddyCareState.getBuddyCareEntitlement(rootState), 'free', 'free should remain the default entitlement');

  const firstAdd = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Alpha' });
  const secondAdd = buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Beta' });

  assert.strictEqual(firstAdd.ok, true, 'free should allow the first plant');
  assert.strictEqual(secondAdd.ok, false, 'free should block the second plant');
  assert.strictEqual(secondAdd.reason, 'plant_limit_reached', 'free limit should still be enforced');
})();

(function testMockActivationUnlocksThreePlants() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.activateBuddyCarePlusMock(rootState);

  assert.strictEqual(buddyCareState.getBuddyCareEntitlement(rootState), 'care_plus_mock', 'mock unlock should activate the care+ entitlement');
  assert.strictEqual(buddyCareState.getBuddyCarePlantLimit(rootState), 3, 'mock unlock should expand the plant limit to three');
})();

(function testPaywallUiAndLockedSlotsExist() {
  assert.ok(indexHtml.includes('id="buddyCareSeasonPassCard"'), 'season pass preview card should exist in the buddy care shell');
  assert.ok(indexHtml.includes('id="buddyCareSeasonPassActivateBtn"'), 'season pass preview should expose a mock unlock button');
  assert.ok(appJs.includes("function openBuddyCarePaywallMock(source = '')"), 'app should expose a paywall preview opener');
  assert.ok(appJs.includes('renderBuddyCareLockedSlotCard('), 'app should render locked slot cards in free mode');
  assert.ok(appJs.includes('data-buddy-care-open-paywall="locked-slot"'), 'locked slot cards should open the season pass preview');
})();

(function testNoCheckoutHooksAreActivated() {
  assert.ok(!indexHtml.includes('data-buddy-care-checkout'), 'buddy care should not expose a checkout action id');
  assert.ok(!appJs.includes('buddyCareCheckout'), 'app should not wire a real buddy care checkout flow');
  assert.ok(!indexHtml.includes('id="buddyCareCheckoutBtn"'), 'buddy care should not render a checkout button');
  assert.ok(!appJs.includes('__gsStartBuddyCareCheckout'), 'buddy care should not export a checkout starter');
})();

(function testLegacyCompatibilityStaysFree() {
  const restored = buddyCareState.normalizeBuddyCareState({
    version: 0,
    plants: [{ id: 'legacy-1' }, { id: 'legacy-2' }]
  });

  assert.strictEqual(restored.entitlement, 'free', 'legacy snapshots without an entitlement should still normalize to free');
  assert.strictEqual(restored.plants.length, 2, 'legacy snapshots should keep stored plants for a future Care+ reactivation');
  assert.strictEqual(buddyCareState.getBuddyCarePlantLimit({ buddyCare: restored }), 1, 'free entitlement should still expose only one active slot');
  assert.strictEqual(buddyCareState.isBuddyCarePlantReadOnly({ buddyCare: restored }, 'legacy-2'), true, 'extra stored plants should become read-only in free access');
})();

console.log('buddy-care-paywall-mock.test.js passed');
