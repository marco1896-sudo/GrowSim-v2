'use strict';

(function attachGrowSimBuddyCareFlags(globalScope) {
  const FLAGS = Object.freeze({
    BUDDY_CARE_ENABLED: true,
    BUDDY_CARE_EXTERNAL_TEST_ENABLED: true,
    BUDDY_CARE_AGE_GATE_ENABLED: true,
    BUDDY_CARE_PLUS_MOCK_ENABLED: true,
    BUDDY_CARE_PAYWALL_MOCK_ENABLED: true,
    BUDDY_CARE_REAL_PAYMENT_ENABLED: false,
    BUDDY_CARE_APP_STORE_ENABLED: false,
    CARE_PLUS_MOCK_ENABLED: true,
    CARE_PLUS_PAYWALL_ENABLED: false,
    CARE_PLUS_CHECKOUT_ENABLED: false,
    CARE_PLUS_PAYMENT_READY: false,
    BUDDY_CARE_PDF_EXPORT_ENABLED: false,
    BUDDY_CARE_PHOTO_UPLOAD_ENABLED: false,
    BUDDY_CARE_FREE_PLANT_LIMIT: 1,
    BUDDY_CARE_PLUS_MOCK_PLANT_LIMIT: 3,
    BUDDY_CARE_MAX_PLANTS: 3
  });

  function isBuddyCareEnabled() {
    return FLAGS.BUDDY_CARE_ENABLED === true;
  }

  function isBuddyCareExternalTestEnabled(overrides = null) {
    if (overrides && typeof overrides === 'object' && Object.prototype.hasOwnProperty.call(overrides, 'BUDDY_CARE_EXTERNAL_TEST_ENABLED')) {
      return overrides.BUDDY_CARE_EXTERNAL_TEST_ENABLED === true;
    }
    return FLAGS.BUDDY_CARE_EXTERNAL_TEST_ENABLED === true;
  }

  function isBuddyCareAgeGateEnabled() {
    return FLAGS.BUDDY_CARE_AGE_GATE_ENABLED === true;
  }

  function isBuddyCarePlusMockEnabled() {
    return FLAGS.BUDDY_CARE_PLUS_MOCK_ENABLED === true;
  }

  function isBuddyCarePaywallMockEnabled() {
    return FLAGS.BUDDY_CARE_PAYWALL_MOCK_ENABLED === true;
  }

  function isBuddyCareCheckoutEnabled() {
    return FLAGS.CARE_PLUS_CHECKOUT_ENABLED === true
      && FLAGS.CARE_PLUS_PAYMENT_READY === true
      && FLAGS.BUDDY_CARE_REAL_PAYMENT_ENABLED === true;
  }

  function getFreePlantLimit() {
    return Number(FLAGS.BUDDY_CARE_FREE_PLANT_LIMIT || 1);
  }

  function getCarePlusMockPlantLimit() {
    return Number(FLAGS.BUDDY_CARE_PLUS_MOCK_PLANT_LIMIT || 3);
  }

  function getMaximumPlantLimit() {
    return Number(FLAGS.BUDDY_CARE_MAX_PLANTS || 3);
  }

  const api = Object.freeze({
    ...FLAGS,
    isBuddyCareEnabled,
    isBuddyCareExternalTestEnabled,
    isBuddyCareAgeGateEnabled,
    isBuddyCarePlusMockEnabled,
    isBuddyCarePaywallMockEnabled,
    isBuddyCareCheckoutEnabled,
    getFreePlantLimit,
    getCarePlusMockPlantLimit,
    getMaximumPlantLimit
  });

  globalScope.GrowSimBuddyCareFlags = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
