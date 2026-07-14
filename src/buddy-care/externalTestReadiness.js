'use strict';

(function attachGrowSimBuddyCareExternalTestReadiness(globalScope) {
  const flagsApi = globalScope.GrowSimBuddyCareFlags
    || (typeof require === 'function' ? require('./featureFlags.js') : null);

  const ALLOWED_EVENTS = new Set([
    'buddy_care_test_started',
    'buddy_care_age_gate_completed',
    'buddy_care_first_plant_created',
    'buddy_care_dashboard_viewed',
    'buddy_care_daily_check_started',
    'buddy_care_daily_check_completed',
    'buddy_care_diary_opened',
    'buddy_care_manual_diary_created',
    'buddy_care_test_access_viewed',
    'buddy_care_test_access_activated',
    'buddy_care_second_plant_created',
    'buddy_care_weekly_review_viewed',
    'buddy_care_test_feedback_opened',
    'buddy_care_test_feedback_submitted'
  ]);

  const ALLOWED_PAYLOAD_KEYS = new Set([
    'source',
    'plantCount',
    'entitlement',
    'locale'
  ]);

  const FEEDBACK_HELPFUL_FEATURES = Object.freeze([
    'today_view',
    'daily_check',
    'buddy_hints',
    'diary',
    'risk_light',
    'trend',
    'weekly_review',
    'three_plant_overview'
  ]);

  const FEEDBACK_CHOICES = Object.freeze({
    continueUse: ['yes', 'maybe', 'no'],
    wouldPay: ['yes', 'maybe', 'no'],
    pricingModel: ['season_pass', 'monthly_subscription', 'one_time_purchase', 'free_only'],
    seasonPassPrice: ['under_10', '10_15', '15_20', 'over_20', 'would_not_pay']
  });

  let eventSequence = 0;

  function isBuddyCareExternalTestEnabled(overrides = null) {
    if (overrides && typeof overrides === 'object' && Object.prototype.hasOwnProperty.call(overrides, 'BUDDY_CARE_EXTERNAL_TEST_ENABLED')) {
      return overrides.BUDDY_CARE_EXTERNAL_TEST_ENABLED === true;
    }
    return !flagsApi || flagsApi.BUDDY_CARE_EXTERNAL_TEST_ENABLED === true;
  }

  function normalizeString(value, fallback = '') {
    const safeValue = typeof value === 'string' ? value.trim() : '';
    return safeValue || fallback;
  }

  function normalizeTimestamp(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0
      ? numericValue
      : null;
  }

  function clampInt(value, min, max) {
    const numericValue = Math.trunc(Number(value) || 0);
    return Math.min(max, Math.max(min, numericValue));
  }

  function createDefaultBuddyCareExternalTestFeedback() {
    return {
      clarityRating: 0,
      helpfulFeatures: [],
      confusionNote: '',
      wouldContinue: '',
      wouldPay: '',
      pricingModel: '',
      seasonPassPrice: '',
      openedAt: null,
      submittedAt: null
    };
  }

  function createDefaultBuddyCareExternalTestState() {
    return {
      introDismissedAt: null,
      checklistDismissedAt: null,
      sessionsSeen: [],
      events: [],
      feedback: createDefaultBuddyCareExternalTestFeedback()
    };
  }

  function normalizeChoice(value, allowedValues) {
    const safeValue = normalizeString(value).toLowerCase();
    return allowedValues.includes(safeValue) ? safeValue : '';
  }

  function normalizeHelpfulFeatures(value) {
    const sourceList = Array.isArray(value) ? value : [];
    const normalized = [];
    const seen = new Set();
    sourceList.forEach((entry) => {
      const safeEntry = normalizeString(entry).toLowerCase();
      if (!FEEDBACK_HELPFUL_FEATURES.includes(safeEntry) || seen.has(safeEntry)) {
        return;
      }
      seen.add(safeEntry);
      normalized.push(safeEntry);
    });
    return normalized.slice(0, FEEDBACK_HELPFUL_FEATURES.length);
  }

  function normalizeLongText(value, maxLength = 1200) {
    return normalizeString(value).slice(0, Math.max(0, Math.trunc(Number(maxLength) || 0)) || 1200);
  }

  function normalizeBuddyCareExternalTestFeedback(rawFeedback) {
    const safeFeedback = rawFeedback && typeof rawFeedback === 'object' ? rawFeedback : {};
    return {
      clarityRating: clampInt(safeFeedback.clarityRating, 0, 5),
      helpfulFeatures: normalizeHelpfulFeatures(safeFeedback.helpfulFeatures),
      confusionNote: normalizeLongText(safeFeedback.confusionNote, 1200),
      wouldContinue: normalizeChoice(safeFeedback.wouldContinue, FEEDBACK_CHOICES.continueUse),
      wouldPay: normalizeChoice(safeFeedback.wouldPay, FEEDBACK_CHOICES.wouldPay),
      pricingModel: normalizeChoice(safeFeedback.pricingModel, FEEDBACK_CHOICES.pricingModel),
      seasonPassPrice: normalizeChoice(safeFeedback.seasonPassPrice, FEEDBACK_CHOICES.seasonPassPrice),
      openedAt: normalizeTimestamp(safeFeedback.openedAt),
      submittedAt: normalizeTimestamp(safeFeedback.submittedAt)
    };
  }

  function sanitizeExternalTestPayload(facts, payload = {}) {
    const safeFacts = facts && typeof facts === 'object' ? facts : {};
    const safePayload = payload && typeof payload === 'object' ? payload : {};
    const nextPayload = {};
    nextPayload.plantCount = clampInt(
      Object.prototype.hasOwnProperty.call(safePayload, 'plantCount') ? safePayload.plantCount : safeFacts.plantCount,
      0,
      3
    );
    nextPayload.entitlement = normalizeChoice(
      Object.prototype.hasOwnProperty.call(safePayload, 'entitlement') ? safePayload.entitlement : safeFacts.entitlement,
      ['free', 'care_plus_mock']
    ) || 'free';
    if (ALLOWED_PAYLOAD_KEYS.has('locale')) {
      const locale = normalizeChoice(safePayload.locale, ['de', 'en', 'es']);
      if (locale) {
        nextPayload.locale = locale;
      }
    }
    if (ALLOWED_PAYLOAD_KEYS.has('source')) {
      const source = normalizeString(safePayload.source).toLowerCase().slice(0, 64);
      if (source) {
        nextPayload.source = source;
      }
    }
    return nextPayload;
  }

  function normalizeExternalTestEvent(entry, index) {
    const safeEntry = entry && typeof entry === 'object' ? entry : {};
    const safeEventName = normalizeString(safeEntry.eventName).toLowerCase();
    if (!ALLOWED_EVENTS.has(safeEventName)) {
      return null;
    }
    const createdAt = typeof safeEntry.createdAt === 'string' && safeEntry.createdAt.trim()
      ? safeEntry.createdAt.trim()
      : new Date(Date.now() + index).toISOString();
    return {
      id: normalizeString(safeEntry.id, `buddy-care-test-event-${index + 1}`),
      eventName: safeEventName,
      createdAt,
      payload: sanitizeExternalTestPayload({
        plantCount: safeEntry && safeEntry.payload ? safeEntry.payload.plantCount : 0,
        entitlement: safeEntry && safeEntry.payload ? safeEntry.payload.entitlement : 'free'
      }, safeEntry.payload)
    };
  }

  function normalizeBuddyCareExternalTestState(rawState) {
    const safeState = rawState && typeof rawState === 'object' ? rawState : {};
    const sessions = Array.isArray(safeState.sessionsSeen) ? safeState.sessionsSeen : [];
    const sessionIds = [];
    const seenSessions = new Set();
    sessions.forEach((sessionId) => {
      const safeSessionId = normalizeString(sessionId).slice(0, 80);
      if (!safeSessionId || seenSessions.has(safeSessionId)) {
        return;
      }
      seenSessions.add(safeSessionId);
      sessionIds.push(safeSessionId);
    });
    const events = (Array.isArray(safeState.events) ? safeState.events : [])
      .map((entry, index) => normalizeExternalTestEvent(entry, index))
      .filter(Boolean)
      .slice(-64);
    return {
      introDismissedAt: normalizeTimestamp(safeState.introDismissedAt),
      checklistDismissedAt: normalizeTimestamp(safeState.checklistDismissedAt),
      sessionsSeen: sessionIds.slice(-6),
      events,
      feedback: normalizeBuddyCareExternalTestFeedback(safeState.feedback)
    };
  }

  function resolveBuddyCareFacts(source) {
    const safeSource = source && typeof source === 'object' ? source : {};
    const buddyCare = safeSource.buddyCare && typeof safeSource.buddyCare === 'object'
      ? safeSource.buddyCare
      : safeSource;
    const entitlement = normalizeChoice(buddyCare && buddyCare.entitlement, ['free', 'care_plus_mock']) || 'free';
    const plantCount = Array.isArray(buddyCare && buddyCare.plants) ? buddyCare.plants.length : 0;
    return {
      entitlement,
      plantCount: clampInt(plantCount, 0, 3)
    };
  }

  function getBuddyCareExternalTestSlice(source) {
    const safeSource = source && typeof source === 'object' ? source : {};
    if (safeSource.buddyCare && typeof safeSource.buddyCare === 'object') {
      return safeSource.buddyCare.externalTest;
    }
    if (safeSource.externalTest && typeof safeSource.externalTest === 'object') {
      return safeSource.externalTest;
    }
    return safeSource;
  }

  function resolveTargetExternalTestState(target) {
    if (target && typeof target === 'object' && target.buddyCare && typeof target.buddyCare === 'object') {
      target.buddyCare.externalTest = normalizeBuddyCareExternalTestState(target.buddyCare.externalTest);
      return target.buddyCare.externalTest;
    }
    if (target && typeof target === 'object' && target.externalTest && typeof target.externalTest === 'object') {
      target.externalTest = normalizeBuddyCareExternalTestState(target.externalTest);
      return target.externalTest;
    }
    if (target && typeof target === 'object') {
      const normalized = normalizeBuddyCareExternalTestState(target);
      Object.assign(target, normalized);
      return target;
    }
    return createDefaultBuddyCareExternalTestState();
  }

  function getBuddyCareExternalTestEvents(source) {
    const slice = normalizeBuddyCareExternalTestState(getBuddyCareExternalTestSlice(source));
    return slice.events.map((entry) => ({
      ...entry,
      payload: { ...entry.payload }
    }));
  }

  function hasBuddyCareExternalTestEvent(source, eventName) {
    const safeEventName = normalizeString(eventName).toLowerCase();
    return getBuddyCareExternalTestEvents(source).some((entry) => entry.eventName === safeEventName);
  }

  function buildExternalTestEventId() {
    eventSequence += 1;
    return `buddy-care-test-event-${Date.now()}-${eventSequence}`;
  }

  function trackBuddyCareExternalTestEvent(target, eventName, payload = {}, options = {}) {
    const safeEventName = normalizeString(eventName).toLowerCase();
    if (!ALLOWED_EVENTS.has(safeEventName)) {
      return null;
    }
    const store = resolveTargetExternalTestState(target);
    const once = options && Object.prototype.hasOwnProperty.call(options, 'once')
      ? options.once !== false
      : true;
    if (once && Array.isArray(store.events) && store.events.some((entry) => entry && entry.eventName === safeEventName)) {
      return null;
    }
    const facts = resolveBuddyCareFacts(target);
    const nextEvent = {
      id: buildExternalTestEventId(),
      eventName: safeEventName,
      createdAt: new Date().toISOString(),
      payload: sanitizeExternalTestPayload(facts, payload)
    };
    store.events = store.events.slice(-63).concat(nextEvent);
    return nextEvent;
  }

  function registerBuddyCareExternalTestSession(target, sessionId) {
    const safeSessionId = normalizeString(sessionId).slice(0, 80);
    if (!safeSessionId) {
      return { ok: false, reason: 'session_id_missing' };
    }
    const store = resolveTargetExternalTestState(target);
    if (store.sessionsSeen.includes(safeSessionId)) {
      return { ok: false, reason: 'session_already_seen', state: store };
    }
    store.sessionsSeen = store.sessionsSeen.concat(safeSessionId).slice(-6);
    return { ok: true, reason: 'session_registered', state: store };
  }

  function dismissBuddyCareExternalTestIntro(target, dismissedAt = Date.now()) {
    const store = resolveTargetExternalTestState(target);
    store.introDismissedAt = normalizeTimestamp(dismissedAt) || Date.now();
    return store;
  }

  function dismissBuddyCareExternalTestChecklist(target, dismissedAt = Date.now()) {
    const store = resolveTargetExternalTestState(target);
    store.checklistDismissedAt = normalizeTimestamp(dismissedAt) || Date.now();
    return store;
  }

  function reopenBuddyCareExternalTestChecklist(target) {
    const store = resolveTargetExternalTestState(target);
    store.checklistDismissedAt = null;
    return store;
  }

  function markBuddyCareExternalTestFeedbackOpened(target, openedAt = Date.now()) {
    const store = resolveTargetExternalTestState(target);
    if (!store.feedback.openedAt) {
      store.feedback.openedAt = normalizeTimestamp(openedAt) || Date.now();
    }
    return store.feedback;
  }

  function saveBuddyCareExternalTestFeedback(target, feedbackInput = {}, submittedAt = Date.now()) {
    const store = resolveTargetExternalTestState(target);
    const nextFeedback = normalizeBuddyCareExternalTestFeedback({
      ...store.feedback,
      ...feedbackInput,
      openedAt: store.feedback.openedAt || normalizeTimestamp(submittedAt) || Date.now(),
      submittedAt: normalizeTimestamp(submittedAt) || Date.now()
    });
    store.feedback = nextFeedback;
    return nextFeedback;
  }

  function clearBuddyCareTestEvents(target) {
    const store = resolveTargetExternalTestState(target);
    store.events = [];
    return store;
  }

  function getBuddyCareExternalTestSummary(source) {
    const facts = resolveBuddyCareFacts(source);
    const slice = normalizeBuddyCareExternalTestState(getBuddyCareExternalTestSlice(source));
    const buddyCare = source && source.buddyCare && typeof source.buddyCare === 'object'
      ? source.buddyCare
      : source;
    const diaryEntries = Array.isArray(buddyCare && buddyCare.diaryEntries) ? buddyCare.diaryEntries : [];
    const dailyChecks = Array.isArray(buddyCare && buddyCare.dailyChecks) ? buddyCare.dailyChecks : [];
    const manualDiaryEntries = diaryEntries.filter((entry) => String(entry && entry.entryType || '').trim().toLowerCase() === 'manual');
    return {
      started: Boolean(slice.introDismissedAt || hasBuddyCareExternalTestEvent(source, 'buddy_care_test_started')),
      plantCount: facts.plantCount,
      dailyCheckCompleted: dailyChecks.length > 0 || hasBuddyCareExternalTestEvent(source, 'buddy_care_daily_check_completed'),
      diaryEntryCreated: manualDiaryEntries.length > 0 || hasBuddyCareExternalTestEvent(source, 'buddy_care_manual_diary_created'),
      testAccessActivated: facts.entitlement === 'care_plus_mock' || hasBuddyCareExternalTestEvent(source, 'buddy_care_test_access_activated'),
      secondPlantCreated: facts.plantCount >= 2 || hasBuddyCareExternalTestEvent(source, 'buddy_care_second_plant_created'),
      weeklyReviewViewed: hasBuddyCareExternalTestEvent(source, 'buddy_care_weekly_review_viewed'),
      feedbackOpened: Boolean(slice.feedback.openedAt) || hasBuddyCareExternalTestEvent(source, 'buddy_care_test_feedback_opened'),
      feedbackSubmitted: Boolean(slice.feedback.submittedAt) || hasBuddyCareExternalTestEvent(source, 'buddy_care_test_feedback_submitted'),
      reloadCompleted: Array.isArray(slice.sessionsSeen) && slice.sessionsSeen.length >= 2,
      eventCount: Array.isArray(slice.events) ? slice.events.length : 0
    };
  }

  function exportBuddyCareTestEvents(source) {
    return JSON.stringify(getBuddyCareExternalTestEvents(source), null, 2);
  }

  const api = Object.freeze({
    ALLOWED_EVENTS,
    FEEDBACK_HELPFUL_FEATURES,
    FEEDBACK_CHOICES,
    isBuddyCareExternalTestEnabled,
    createDefaultBuddyCareExternalTestFeedback,
    createDefaultBuddyCareExternalTestState,
    normalizeBuddyCareExternalTestFeedback,
    normalizeBuddyCareExternalTestState,
    getBuddyCareExternalTestEvents,
    hasBuddyCareExternalTestEvent,
    trackBuddyCareExternalTestEvent,
    registerBuddyCareExternalTestSession,
    dismissBuddyCareExternalTestIntro,
    dismissBuddyCareExternalTestChecklist,
    reopenBuddyCareExternalTestChecklist,
    markBuddyCareExternalTestFeedbackOpened,
    saveBuddyCareExternalTestFeedback,
    clearBuddyCareTestEvents,
    getBuddyCareExternalTestSummary,
    exportBuddyCareTestEvents
  });

  globalScope.GrowSimBuddyCareExternalTestReadiness = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
