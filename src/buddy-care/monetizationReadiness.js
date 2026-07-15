'use strict';

(function attachGrowSimBuddyCareMonetizationReadiness(globalScope) {
  const flagsApi = globalScope.GrowSimBuddyCareFlags
    || (typeof require === 'function' ? require('./featureFlags.js') : null);
  const stateApi = globalScope.GrowSimBuddyCareState
    || (typeof require === 'function' ? require('./state.js') : null);

  const OFFER_TEMPLATE = Object.freeze({
    id: 'buddy_care_season_pass_mock',
    nameKey: 'buddyCare.screen.seasonpass_title',
    nameFallback: 'Buddy Care+ Saisonpass',
    priceLabel: '19,99 EUR',
    periodKey: 'buddyCare.screen.seasonpass_period',
    periodFallback: 'Einmalig fuer eine Saison',
    billingLabelKey: 'buddyCare.screen.seasonpass_label',
    billingLabelFallback: 'Eine Saison, bis zu 3 Pflanzen',
    isMock: true,
    featureKeys: Object.freeze([
      ['buddyCare.screen.seasonpass_feature_3_plants', 'bis zu 3 Pflanzen'],
      ['buddyCare.screen.seasonpass_feature_daily_checks', 'Tageschecks'],
      ['buddyCare.screen.seasonpass_feature_diary', 'Tagebuch pro Pflanze'],
      ['buddyCare.screen.seasonpass_feature_risk', 'Ampel und Buddy-Hinweise'],
      ['buddyCare.screen.seasonpass_feature_trends', 'Verlauf und Trends'],
      ['buddyCare.screen.seasonpass_feature_weekly', 'Wochenrueckblick']
    ])
  });

  const ALLOWED_EVENTS = new Set([
    'buddy_care_upgrade_viewed',
    'buddy_care_season_pass_viewed',
    'buddy_care_mock_unlock_clicked',
    'buddy_care_mock_unlocked',
    'buddy_care_locked_slot_clicked',
    'buddy_care_activation_cta_clicked',
    'buddy_care_second_plant_started',
    'buddy_care_third_plant_started'
  ]);

  const ALLOWED_PAYLOAD_KEYS = new Set([
    'source',
    'slotNumber',
    'plantCount',
    'plantLimit',
    'entitlement',
    'actionId',
    'context',
    'reasonCode',
    'screen',
    'cta'
  ]);

  let conversionEventSequence = 0;

  function getEffectiveFlags(overrides = null) {
    const safeOverrides = overrides && typeof overrides === 'object' ? overrides : {};
    return {
      CARE_PLUS_MOCK_ENABLED: Object.prototype.hasOwnProperty.call(safeOverrides, 'CARE_PLUS_MOCK_ENABLED')
        ? safeOverrides.CARE_PLUS_MOCK_ENABLED === true
        : (!flagsApi || flagsApi.CARE_PLUS_MOCK_ENABLED === true),
      CARE_PLUS_CHECKOUT_ENABLED: Object.prototype.hasOwnProperty.call(safeOverrides, 'CARE_PLUS_CHECKOUT_ENABLED')
        ? safeOverrides.CARE_PLUS_CHECKOUT_ENABLED === true
        : Boolean(flagsApi && flagsApi.CARE_PLUS_CHECKOUT_ENABLED === true),
      CARE_PLUS_PAYMENT_READY: Object.prototype.hasOwnProperty.call(safeOverrides, 'CARE_PLUS_PAYMENT_READY')
        ? safeOverrides.CARE_PLUS_PAYMENT_READY === true
        : Boolean(flagsApi && flagsApi.CARE_PLUS_PAYMENT_READY === true),
      BUDDY_CARE_REAL_PAYMENT_ENABLED: Object.prototype.hasOwnProperty.call(safeOverrides, 'BUDDY_CARE_REAL_PAYMENT_ENABLED')
        ? safeOverrides.BUDDY_CARE_REAL_PAYMENT_ENABLED === true
        : Boolean(flagsApi && flagsApi.BUDDY_CARE_REAL_PAYMENT_ENABLED === true)
    };
  }

  function getBuddyCareFacts(source) {
    const safeSource = source && typeof source === 'object' ? source : {};
    const entitlement = stateApi && typeof stateApi.getBuddyCareEntitlement === 'function'
      ? stateApi.getBuddyCareEntitlement(safeSource)
      : String(safeSource && safeSource.buddyCare && safeSource.buddyCare.entitlement || 'free').trim().toLowerCase();
    const plantCount = stateApi && typeof stateApi.getBuddyCarePlantCount === 'function'
      ? stateApi.getBuddyCarePlantCount(safeSource)
      : (Array.isArray(safeSource && safeSource.buddyCare && safeSource.buddyCare.plants)
        ? safeSource.buddyCare.plants.length
        : 0);
    const plantLimit = stateApi && typeof stateApi.getBuddyCarePlantLimit === 'function'
      ? stateApi.getBuddyCarePlantLimit(safeSource)
      : (entitlement === 'care_plus_mock' ? 3 : 1);

    return {
      entitlement,
      plantCount: Math.max(0, Math.trunc(Number(plantCount) || 0)),
      plantLimit: Math.max(1, Math.trunc(Number(plantLimit) || 0) || 1)
    };
  }

  function isCarePlusMockEnabled(overrides = null) {
    return getEffectiveFlags(overrides).CARE_PLUS_MOCK_ENABLED === true;
  }

  function isCarePlusPaymentReady(overrides = null) {
    return getEffectiveFlags(overrides).CARE_PLUS_PAYMENT_READY === true;
  }

  function isCarePlusCheckoutEnabled(overrides = null) {
    const flags = getEffectiveFlags(overrides);
    return flags.CARE_PLUS_CHECKOUT_ENABLED === true
      && flags.CARE_PLUS_PAYMENT_READY === true
      && flags.BUDDY_CARE_REAL_PAYMENT_ENABLED === true;
  }

  function getCarePlusOffer(overrides = null) {
    return {
      id: OFFER_TEMPLATE.id,
      nameKey: OFFER_TEMPLATE.nameKey,
      nameFallback: OFFER_TEMPLATE.nameFallback,
      priceLabel: OFFER_TEMPLATE.priceLabel,
      periodKey: OFFER_TEMPLATE.periodKey,
      periodFallback: OFFER_TEMPLATE.periodFallback,
      billingLabelKey: OFFER_TEMPLATE.billingLabelKey,
      billingLabelFallback: OFFER_TEMPLATE.billingLabelFallback,
      isMock: OFFER_TEMPLATE.isMock,
      checkoutEnabled: isCarePlusCheckoutEnabled(overrides),
      featureKeys: OFFER_TEMPLATE.featureKeys.map(([key, fallback]) => ({ key, fallback }))
    };
  }

  function getCarePlusCheckoutState(overrides = null) {
    const flags = getEffectiveFlags(overrides);
    return {
      enabled: isCarePlusCheckoutEnabled(flags),
      isMock: true,
      paymentReady: flags.CARE_PLUS_PAYMENT_READY === true,
      checkoutFlagEnabled: flags.CARE_PLUS_CHECKOUT_ENABLED === true,
      realPaymentEnabled: flags.BUDDY_CARE_REAL_PAYMENT_ENABLED === true,
      disabledReasonKey: '',
      testModeKey: 'buddyCare.screen.test_mode_note'
    };
  }

  function getCarePlusAccessStatus(source, overrides = null) {
    const facts = getBuddyCareFacts(source);
    if (facts.entitlement === 'care_plus_mock') {
      return {
        id: 'test_active',
        entitlement: facts.entitlement,
        plantLimit: facts.plantLimit,
        showOffer: false,
        showActiveState: true
      };
    }
    if (isCarePlusMockEnabled(overrides)) {
      return {
        id: 'test_available',
        entitlement: facts.entitlement,
        plantLimit: facts.plantLimit,
        showOffer: true,
        showActiveState: false
      };
    }
    return {
      id: 'free_active',
      entitlement: facts.entitlement,
      plantLimit: facts.plantLimit,
      showOffer: false,
      showActiveState: false
    };
  }

  function getCarePlusUpgradeReasons(source, context = 'dashboard') {
    const safeContext = String(context || 'dashboard').trim().toLowerCase();
    const facts = getBuddyCareFacts(source);
    if (facts.entitlement !== 'free') {
      return {
        code: 'care_plus_active',
        bodyKey: 'buddyCare.screen.mock_active_body'
      };
    }

    if (safeContext === 'locked_slot') {
      return {
        code: 'locked_slot',
        bodyKey: 'buddyCare.screen.upgrade_reason_locked_slot'
      };
    }

    if (safeContext === 'limit_reached') {
      return {
        code: 'limit_reached',
        bodyKey: 'buddyCare.screen.upgrade_reason_limit_reached'
      };
    }

    if (facts.plantCount <= 0) {
      return {
        code: 'free_zero_plants',
        bodyKey: 'buddyCare.screen.upgrade_reason_free_zero'
      };
    }

    return {
      code: 'free_one_plant',
      bodyKey: 'buddyCare.screen.upgrade_reason_free_one'
    };
  }

  function sanitizeConversionPayload(payload = {}) {
    const safePayload = payload && typeof payload === 'object' ? payload : {};
    return Object.keys(safePayload).reduce((accumulator, key) => {
      if (!ALLOWED_PAYLOAD_KEYS.has(key)) {
        return accumulator;
      }
      const value = safePayload[key];
      if (value == null) {
        return accumulator;
      }
      if (typeof value === 'string') {
        const safeValue = value.trim();
        if (safeValue) {
          accumulator[key] = safeValue;
        }
        return accumulator;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        accumulator[key] = value;
        return accumulator;
      }
      if (typeof value === 'boolean') {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
  }

  function resolveConversionStore(target) {
    if (Array.isArray(target)) {
      return { conversionEvents: target };
    }
    if (target && typeof target === 'object') {
      if (!Array.isArray(target.conversionEvents)) {
        target.conversionEvents = [];
      }
      return target;
    }
    return { conversionEvents: [] };
  }

  function buildConversionEventId() {
    conversionEventSequence += 1;
    return `buddy-care-conv-${Date.now()}-${conversionEventSequence}`;
  }

  function trackBuddyCareConversionIntent(target, eventName, payload = {}) {
    const safeEventName = String(eventName || '').trim().toLowerCase();
    if (!ALLOWED_EVENTS.has(safeEventName)) {
      return null;
    }
    const store = resolveConversionStore(target);
    const facts = getBuddyCareFacts(target);
    const nextEvent = {
      id: buildConversionEventId(),
      eventName: safeEventName,
      createdAt: new Date().toISOString(),
      payload: sanitizeConversionPayload({
        entitlement: facts.entitlement,
        plantCount: facts.plantCount,
        plantLimit: facts.plantLimit,
        ...payload
      })
    };
    const nextEvents = store.conversionEvents.slice(-39).concat(nextEvent);
    store.conversionEvents.length = 0;
    nextEvents.forEach((entry) => {
      store.conversionEvents.push(entry);
    });
    return nextEvent;
  }

  function getBuddyCareConversionEvents(target) {
    const store = resolveConversionStore(target);
    return store.conversionEvents.map((entry) => ({
      ...entry,
      payload: entry && entry.payload && typeof entry.payload === 'object'
        ? { ...entry.payload }
        : {}
    }));
  }

  const api = Object.freeze({
    isCarePlusMockEnabled,
    isCarePlusCheckoutEnabled,
    isCarePlusPaymentReady,
    getCarePlusOffer,
    getCarePlusCheckoutState,
    getCarePlusAccessStatus,
    getCarePlusUpgradeReasons,
    trackBuddyCareConversionIntent,
    getBuddyCareConversionEvents
  });

  globalScope.GrowSimBuddyCareMonetizationReadiness = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
