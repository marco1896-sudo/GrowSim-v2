#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const deLocale = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'locales', 'de.json'), 'utf8');

(function testMockUnlockKeepsEntitlementAndOpensActivationFlow() {
  assert.ok(appJs.includes("state.buddyCare.entitlement = 'care_plus_mock'") || appJs.includes('activateBuddyCarePlusMock'), 'mock unlock should still only activate the care_plus_mock entitlement');
  assert.ok(appJs.includes('buddyCareActivationOnboardingVisible = true;'), 'mock unlock should open the activation onboarding after activation');
})();

(function testActivationCardExistsInUi() {
  assert.ok(indexHtml.includes('id="buddyCareActivationCard"'), 'activation onboarding card should exist in the buddy care shell');
  assert.ok(appJs.includes('function renderBuddyCareActivationOnboardingCard('), 'app should render the activation onboarding card');
})();

(function testPlantCountCtasExist() {
  assert.ok(appJs.includes("primaryLabelKey: 'buddyCare.screen.activation_cta_first_plant'"), 'zero plants should guide into the first-plant CTA');
  assert.ok(appJs.includes("primaryLabelKey: 'buddyCare.screen.activation_cta_second_plant'"), 'one plant should guide into the second-plant CTA');
  assert.ok(appJs.includes("primaryLabelKey: 'buddyCare.screen.activation_cta_third_plant'"), 'two plants should guide into the third-plant CTA');
  assert.ok(appJs.includes("primaryLabelKey: 'buddyCare.screen.activation_cta_today_start'"), 'three plants should guide into the start-today CTA');
})();

(function testFreeDoesNotUseActivationCard() {
  assert.ok(appJs.includes("if (safeEntitlement !== 'care_plus_mock' || !buddyCareActivationOnboardingVisible)"), 'free users should not build an activation onboarding card');
  assert.ok(appJs.includes("const lockedSlotMarkup = entitlement === 'free'"), 'free users should still get locked slot cards instead');
})();

(function testDismissFlowExists() {
  assert.ok(appJs.includes('function dismissBuddyCareActivationOnboarding()'), 'activation onboarding should expose a dismiss helper');
  assert.ok(appJs.includes('data-buddy-care-activation-dismiss="later"'), 'activation onboarding should expose a later/dismiss action');
  assert.ok(appJs.includes('buddyCareActivationOnboardingVisible = false;'), 'dismissing the activation onboarding should hide it');
})();

(function testCarePlusMockHasNoLockedSlotsAndCheckoutStaysOff() {
  assert.ok(appJs.includes("entitlement === 'free' && safeCards.length >= 1"), 'locked slots should only render for free users');
  assert.ok(!appJs.includes('__gsStartBuddyCareCheckout'), 'activation onboarding should not add a checkout flow');
})();

(function testGermanCopyKeysExist() {
  const requiredKeys = [
    '"activation_zero_plants_body"',
    '"activation_one_plant_body"',
    '"activation_two_plants_body"',
    '"activation_complete_title"',
    '"activation_cta_first_plant"',
    '"activation_cta_second_plant"',
    '"activation_cta_third_plant"',
    '"activation_cta_today_start"',
    '"activation_cta_later"'
  ];

  requiredKeys.forEach((key) => {
    assert.ok(deLocale.includes(key), `missing activation onboarding copy key: ${key}`);
  });
})();

console.log('buddy-care-activation-onboarding.test.js passed');
