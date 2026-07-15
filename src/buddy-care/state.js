'use strict';

(function attachGrowSimBuddyCareState(globalScope) {
  const typesApi = globalScope.GrowSimBuddyCareTypes
    || (typeof require === 'function' ? require('./types.js') : null);
  const flagsApi = globalScope.GrowSimBuddyCareFlags
    || (typeof require === 'function' ? require('./featureFlags.js') : null);
  const externalTestApi = globalScope.GrowSimBuddyCareExternalTestReadiness
    || (typeof require === 'function' ? require('./externalTestReadiness.js') : null);

  const VERSION = Number(typesApi && typesApi.VERSION) || 1;
  const ENTITLEMENTS = typesApi && typesApi.ENTITLEMENTS
    ? typesApi.ENTITLEMENTS
    : { FREE: 'free', CARE_PLUS_MOCK: 'care_plus_mock' };
  const PLANT_PHASES = Array.isArray(typesApi && typesApi.PLANT_PHASES)
    ? typesApi.PLANT_PHASES
    : ['seedling', 'vegetative', 'flowering', 'harvest'];
  const TASK_STATUSES = Array.isArray(typesApi && typesApi.TASK_STATUSES)
    ? typesApi.TASK_STATUSES
    : ['open', 'done', 'skipped'];
  const DAILY_CHECK_STATUSES = Array.isArray(typesApi && typesApi.DAILY_CHECK_STATUSES)
    ? typesApi.DAILY_CHECK_STATUSES
    : ['no_check_today', 'checked_today', 'needs_attention'];
  const DIARY_TAGS = Array.isArray(typesApi && typesApi.DIARY_TAGS)
    ? typesApi.DIARY_TAGS
    : ['observation', 'watering', 'height', 'environment', 'issue', 'weekly_review', 'other', 'daily_check'];
  const RISK_LEVELS = Array.isArray(typesApi && typesApi.RISK_LEVELS)
    ? typesApi.RISK_LEVELS
    : ['low', 'medium', 'high'];
  const INTELLIGENCE_VERSION = Number(typesApi && typesApi.INTELLIGENCE_VERSION) || 1;
  const CARE_ACTION_STATUSES = Array.isArray(typesApi && typesApi.CARE_ACTION_STATUSES)
    ? typesApi.CARE_ACTION_STATUSES
    : ['recommended', 'confirmed', 'performed', 'effect_pending', 'improved', 'unchanged', 'worsened', 'cancelled'];
  const CARE_PRIORITIES = Array.isArray(typesApi && typesApi.CARE_PRIORITIES)
    ? typesApi.CARE_PRIORITIES
    : ['urgent_check', 'today', 'observe', 'routine', 'no_action'];
  const DEFAULT_REMINDER_TIME = '18:00';
  const DEFAULT_PLANT_NAME_PREFIX = 'Plant';
  const DAILY_CHECK_MEDIUM_MOISTURE = ['dry', 'moist', 'wet', 'unknown'];
  const DAILY_CHECK_LEAF_STATES = ['normal', 'hanging', 'curling', 'spots', 'yellowing', 'unknown'];
  const DAILY_CHECK_GROWTH_STATES = ['normal', 'fast', 'slow', 'unknown'];
  const DAILY_CHECK_ENVIRONMENT_STATES = ['normal', 'hot', 'humid', 'cold', 'windy', 'unknown'];
  const DAILY_CHECK_PEST_STATES = ['no', 'unsure', 'yes'];

  function clampList(sourceList, limit) {
    if (!Array.isArray(sourceList)) {
      return [];
    }
    return sourceList.slice(0, Math.max(0, limit));
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

  function normalizeConfidence(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return 0;
    }
    return Math.round(Math.max(0, Math.min(1, numericValue)) * 1000) / 1000;
  }

  function normalizeStringList(value, limit = 12) {
    const sourceList = Array.isArray(value) ? value : [];
    const seen = new Set();
    return sourceList.reduce((items, entry) => {
      const safeEntry = normalizeString(entry);
      if (!safeEntry || seen.has(safeEntry) || items.length >= limit) {
        return items;
      }
      seen.add(safeEntry);
      items.push(safeEntry);
      return items;
    }, []);
  }

  function normalizeIsoTimestampString(value, fallbackTimestamp = null) {
    if (typeof value === 'string' && value.trim()) {
      const parsed = Date.parse(value.trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        return new Date(parsed).toISOString();
      }
    }
    const fallbackMs = normalizeTimestamp(fallbackTimestamp);
    if (!Number.isFinite(fallbackMs)) {
      return '';
    }
    return new Date(fallbackMs).toISOString();
  }

  function normalizeDateString(value, fallbackTimestamp = null) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const safeValue = value.trim();
      const [year, month, day] = safeValue.split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day) {
        return safeValue;
      }
    }
    const fallbackMs = normalizeTimestamp(fallbackTimestamp);
    if (!Number.isFinite(fallbackMs)) {
      return '';
    }
    return new Date(fallbackMs).toISOString().slice(0, 10);
  }

  function normalizeDayKey(value, fallbackTimestamp = null, fallbackIso = '') {
    const normalizedValue = normalizeDateString(value);
    if (normalizedValue) {
      return normalizedValue;
    }
    const fallbackIsoValue = typeof fallbackIso === 'string' ? fallbackIso.trim() : '';
    if (fallbackIsoValue) {
      const parsed = Date.parse(fallbackIsoValue);
      if (Number.isFinite(parsed) && parsed > 0) {
        return new Date(parsed).toISOString().slice(0, 10);
      }
    }
    return normalizeDateString('', fallbackTimestamp);
  }

  function normalizeEnumValue(value, allowedValues, fallback) {
    const safeValue = String(value || '').trim().toLowerCase();
    return allowedValues.includes(safeValue) ? safeValue : fallback;
  }

  function normalizeReminderTime(value) {
    const safeValue = String(value || '').trim();
    const match = /^(\d{2}):(\d{2})$/.exec(safeValue);
    if (!match) {
      return DEFAULT_REMINDER_TIME;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return DEFAULT_REMINDER_TIME;
    }
    return safeValue;
  }

  function normalizeEntitlement(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    if (safeValue === ENTITLEMENTS.CARE_PLUS_MOCK && isBuddyCarePlusMockEnabled()) {
      return ENTITLEMENTS.CARE_PLUS_MOCK;
    }
    return ENTITLEMENTS.FREE;
  }

  function normalizePlantPhase(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    return PLANT_PHASES.includes(safeValue) ? safeValue : 'seedling';
  }

  function normalizeTaskStatus(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    return TASK_STATUSES.includes(safeValue) ? safeValue : 'open';
  }

  function normalizeRiskLevel(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    return RISK_LEVELS.includes(safeValue) ? safeValue : 'low';
  }

  function normalizeDailyCheckMediumMoisture(value) {
    return normalizeEnumValue(value, DAILY_CHECK_MEDIUM_MOISTURE, 'unknown');
  }

  function normalizeDailyCheckLeafState(value) {
    return normalizeEnumValue(value, DAILY_CHECK_LEAF_STATES, 'unknown');
  }

  function normalizeDailyCheckGrowthState(value) {
    return normalizeEnumValue(value, DAILY_CHECK_GROWTH_STATES, 'unknown');
  }

  function normalizeDailyCheckEnvironmentStress(value) {
    return normalizeEnumValue(value, DAILY_CHECK_ENVIRONMENT_STATES, 'unknown');
  }

  function normalizeDailyCheckPestsVisible(value) {
    return normalizeEnumValue(value, DAILY_CHECK_PEST_STATES, 'unsure');
  }

  function normalizeHeightCm(value) {
    if (value == null) {
      return null;
    }
    if (typeof value === 'string' && !value.trim()) {
      return null;
    }
    const normalizedValue = typeof value === 'string'
      ? value.trim().replace(',', '.')
      : value;
    const numericValue = Number(normalizedValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue > 1000) {
      return null;
    }
    return Math.round(numericValue * 10) / 10;
  }

  function validateHeightCm(value) {
    const provided = !(value == null || (typeof value === 'string' && !value.trim()));
    return {
      provided,
      valid: !provided || normalizeHeightCm(value) != null,
      value: provided ? normalizeHeightCm(value) : null
    };
  }

  function normalizeDiaryTag(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    return DIARY_TAGS.includes(safeValue) ? safeValue : 'other';
  }

  function normalizeDiaryTags(value) {
    const sourceList = Array.isArray(value)
      ? value
      : (value == null || value === '' ? [] : [value]);
    const normalizedTags = [];
    const seen = new Set();
    sourceList.forEach((tagValue) => {
      const safeTag = normalizeDiaryTag(tagValue);
      if (!safeTag || seen.has(safeTag)) {
        return;
      }
      seen.add(safeTag);
      normalizedTags.push(safeTag);
    });
    return normalizedTags.slice(0, 8);
  }

  function normalizeBuddyPlantType(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    if (safeValue === 'auto' || safeValue === 'autoflower') {
      return 'auto';
    }
    if (safeValue === 'photoperiod' || safeValue === 'photo') {
      return 'photoperiod';
    }
    return 'unknown';
  }

  function normalizeBuddyEnvironment(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    if (safeValue === 'indoor' || safeValue === 'outdoor' || safeValue === 'greenhouse') {
      return safeValue;
    }
    return 'unknown';
  }

  function getRootState(source) {
    if (source && typeof source === 'object' && source.buddyCare && typeof source.buddyCare === 'object') {
      return source;
    }
    return null;
  }

  function getBuddyCareSlice(source) {
    const rootState = getRootState(source);
    if (rootState) {
      return rootState.buddyCare;
    }
    return source && typeof source === 'object' ? source : null;
  }

  function resolveTargetSlice(target) {
    const rootState = getRootState(target);
    if (rootState) {
      rootState.buddyCare = normalizeBuddyCareState(rootState.buddyCare);
      return rootState.buddyCare;
    }
    if (target && typeof target === 'object') {
      const normalized = normalizeBuddyCareState(target);
      Object.assign(target, normalized);
      return target;
    }
    return null;
  }

  function isBuddyCareEnabled() {
    return !flagsApi || typeof flagsApi.isBuddyCareEnabled !== 'function'
      ? true
      : flagsApi.isBuddyCareEnabled();
  }

  function isBuddyCareAgeGateEnabled() {
    return !flagsApi || typeof flagsApi.isBuddyCareAgeGateEnabled !== 'function'
      ? true
      : flagsApi.isBuddyCareAgeGateEnabled();
  }

  function isBuddyCarePlusMockEnabled() {
    return !flagsApi || typeof flagsApi.isBuddyCarePlusMockEnabled !== 'function'
      ? true
      : flagsApi.isBuddyCarePlusMockEnabled();
  }

  function getFreePlantLimit() {
    return flagsApi && typeof flagsApi.getFreePlantLimit === 'function'
      ? Math.max(1, Number(flagsApi.getFreePlantLimit()) || 1)
      : 1;
  }

  function getCarePlusMockPlantLimit() {
    return flagsApi && typeof flagsApi.getCarePlusMockPlantLimit === 'function'
      ? Math.max(1, Number(flagsApi.getCarePlusMockPlantLimit()) || 3)
      : 3;
  }

  function getMaximumPlantLimit() {
    return flagsApi && typeof flagsApi.getMaximumPlantLimit === 'function'
      ? Math.max(1, Number(flagsApi.getMaximumPlantLimit()) || 3)
      : 3;
  }

  function createDefaultExternalTestState() {
    if (externalTestApi && typeof externalTestApi.createDefaultBuddyCareExternalTestState === 'function') {
      return externalTestApi.createDefaultBuddyCareExternalTestState();
    }
    return {
      introDismissedAt: null,
      checklistDismissedAt: null,
      sessionsSeen: [],
      events: [],
      feedback: {
        clarityRating: 0,
        helpfulFeatures: [],
        confusionNote: '',
        wouldContinue: '',
        wouldPay: '',
        pricingModel: '',
        seasonPassPrice: '',
        openedAt: null,
        submittedAt: null
      }
    };
  }

  function normalizeExternalTestState(value) {
    if (externalTestApi && typeof externalTestApi.normalizeBuddyCareExternalTestState === 'function') {
      return externalTestApi.normalizeBuddyCareExternalTestState(value);
    }
    return createDefaultExternalTestState();
  }

  function createDefaultBuddyCareState() {
    return {
      version: VERSION,
      ageGateAccepted: false,
      ageGateAcceptedAt: null,
      entitlement: ENTITLEMENTS.FREE,
      activePlantId: null,
      plants: [],
      dailyChecks: [],
      diaryEntries: [],
      tasks: [],
      riskSignals: [],
      intelligence: {
        version: INTELLIGENCE_VERSION,
        actions: [],
        questionAnswers: [],
        insights: [],
        plantPatterns: []
      },
      externalTest: createDefaultExternalTestState(),
      settings: {
        notificationsEnabled: false,
        preferredReminderTime: DEFAULT_REMINDER_TIME,
        photoPrivacyNoticeSeen: false
      }
    };
  }

  function createUniqueBuddyCarePlantId(preferredId, index, usedIds) {
    const safeUsedIds = usedIds instanceof Set ? usedIds : new Set();
    const preferred = normalizeString(preferredId, `buddy-plant-${index + 1}`);
    if (preferred && !safeUsedIds.has(preferred)) {
      safeUsedIds.add(preferred);
      return preferred;
    }
    let sequence = Math.max(1, index + 1);
    let candidate = `buddy-plant-${sequence}`;
    while (safeUsedIds.has(candidate)) {
      sequence += 1;
      candidate = `buddy-plant-${sequence}`;
    }
    safeUsedIds.add(candidate);
    return candidate;
  }

  function normalizePlantProfile(value, index, options = {}) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const usedIds = options.usedIds instanceof Set ? options.usedIds : null;
    const createdAt = normalizeTimestamp(safeValue.createdAt);
    const startDate = normalizeDateString(safeValue.startDate, createdAt || Date.now());
    return {
      ...safeValue,
      id: usedIds
        ? createUniqueBuddyCarePlantId(safeValue.id, index, usedIds)
        : normalizeString(safeValue.id, `buddy-plant-${index + 1}`),
      nickname: normalizeString(safeValue.nickname, `${DEFAULT_PLANT_NAME_PREFIX} ${index + 1}`),
      plantType: normalizeBuddyPlantType(safeValue.plantType || safeValue.type),
      environment: normalizeBuddyEnvironment(safeValue.environment),
      startDate,
      phase: normalizePlantPhase(safeValue.phase),
      createdAt: createdAt || normalizeTimestamp(Date.parse(startDate)),
      archived: safeValue.archived === true,
      primaryPhotoId: normalizeString(safeValue.primaryPhotoId) || null
    };
  }

  function normalizePlantProfiles(sourceList, limit) {
    const usedIds = new Set();
    return clampList(sourceList, limit).map((value, index) => normalizePlantProfile(value, index, { usedIds }));
  }

  function createUniqueBuddyCareRecordId(preferredId, prefix, index, usedIds) {
    const safeUsedIds = usedIds instanceof Set ? usedIds : new Set();
    const preferred = normalizeString(preferredId, `${prefix}-${index + 1}`);
    if (!safeUsedIds.has(preferred)) {
      safeUsedIds.add(preferred);
      return preferred;
    }
    let sequence = Math.max(2, index + 1);
    let candidate = `${preferred}-${sequence}`;
    while (safeUsedIds.has(candidate)) {
      sequence += 1;
      candidate = `${preferred}-${sequence}`;
    }
    safeUsedIds.add(candidate);
    return candidate;
  }

  function normalizeDailyCheck(value, index, options = {}) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const createdAt = normalizeTimestamp(safeValue.createdAt)
      || normalizeTimestamp(Date.parse(String(safeValue.createdAtIso || '').trim()));
    const createdAtIso = normalizeIsoTimestampString(safeValue.createdAtIso, createdAt);
    return {
      ...safeValue,
      id: createUniqueBuddyCareRecordId(safeValue.id, 'daily-check', index, options.usedIds),
      plantId: normalizeString(safeValue.plantId),
      dayKey: normalizeDayKey(safeValue.dayKey, createdAt, createdAtIso),
      createdAtIso,
      createdAt,
      mediumMoisture: normalizeDailyCheckMediumMoisture(safeValue.mediumMoisture),
      leafState: normalizeDailyCheckLeafState(safeValue.leafState),
      growthState: normalizeDailyCheckGrowthState(safeValue.growthState),
      environmentStress: normalizeDailyCheckEnvironmentStress(safeValue.environmentStress),
      pestsVisible: normalizeDailyCheckPestsVisible(safeValue.pestsVisible),
      heightCm: normalizeHeightCm(safeValue.heightCm),
      note: normalizeString(safeValue.note || safeValue.notes),
      photoIds: normalizeStringList(safeValue.photoIds, 3)
    };
  }

  function normalizeDiaryEntry(value, index, options = {}) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const createdAtMs = normalizeTimestamp(safeValue.createdAtMs || safeValue.createdAt)
      || normalizeTimestamp(Date.parse(String(safeValue.createdAt || safeValue.createdAtIso || '').trim()))
      || normalizeTimestamp(Date.parse(String(safeValue.updatedAt || safeValue.updatedAtIso || '').trim()));
    const updatedAtMs = normalizeTimestamp(safeValue.updatedAtMs || safeValue.updatedAt)
      || normalizeTimestamp(Date.parse(String(safeValue.updatedAt || safeValue.updatedAtIso || '').trim()))
      || createdAtMs;
    const createdAt = normalizeIsoTimestampString(safeValue.createdAtIso || safeValue.createdAt, createdAtMs);
    const updatedAt = normalizeIsoTimestampString(safeValue.updatedAtIso || safeValue.updatedAt, updatedAtMs);
    const linkedCheckId = normalizeString(safeValue.linkedCheckId || safeValue.checkId);
    const buddyComment = normalizeString(safeValue.buddyComment);
    const note = normalizeString(safeValue.note || safeValue.text);
    return {
      ...safeValue,
      id: createUniqueBuddyCareRecordId(safeValue.id, 'diary-entry', index, options.usedIds),
      plantId: normalizeString(safeValue.plantId),
      entryType: linkedCheckId ? 'daily_check' : normalizeEnumValue(safeValue.entryType, ['manual', 'daily_check'], 'manual'),
      entryDate: normalizeDayKey(safeValue.entryDate || safeValue.dayKey, updatedAtMs || createdAtMs, updatedAt || createdAt),
      title: normalizeString(safeValue.title),
      note,
      tags: normalizeDiaryTags(safeValue.tags),
      linkedCheckId: linkedCheckId || null,
      heightCm: normalizeHeightCm(safeValue.heightCm),
      buddyComment: buddyComment || null,
      photoUrls: normalizeStringList(safeValue.photoUrls, 3),
      photoIds: normalizeStringList(safeValue.photoIds, 5),
      createdAt,
      updatedAt
    };
  }

  function normalizeTask(value, index) {
    const safeValue = value && typeof value === 'object' ? value : {};
    return {
      id: normalizeString(safeValue.id, `care-task-${index + 1}`),
      plantId: normalizeString(safeValue.plantId),
      title: normalizeString(safeValue.title),
      status: normalizeTaskStatus(safeValue.status),
      dueAt: normalizeTimestamp(safeValue.dueAt),
      createdAt: normalizeTimestamp(safeValue.createdAt)
    };
  }

  function normalizeRiskSignal(value, index) {
    const safeValue = value && typeof value === 'object' ? value : {};
    return {
      id: normalizeString(safeValue.id, `risk-signal-${index + 1}`),
      plantId: normalizeString(safeValue.plantId),
      level: normalizeRiskLevel(safeValue.level),
      label: normalizeString(safeValue.label),
      source: normalizeString(safeValue.source),
      createdAt: normalizeTimestamp(safeValue.createdAt)
    };
  }

  function normalizeCareActionStatus(value) {
    return normalizeEnumValue(value, CARE_ACTION_STATUSES, 'recommended');
  }

  function normalizeCarePriority(value) {
    return normalizeEnumValue(value, CARE_PRIORITIES, 'no_action');
  }

  function normalizeCareAction(value, index, options = {}) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const createdAt = normalizeTimestamp(safeValue.createdAt || safeValue.recommendedAt) || Date.now();
    const updatedAt = normalizeTimestamp(safeValue.updatedAt) || createdAt;
    const status = normalizeCareActionStatus(safeValue.status);
    return {
      ...safeValue,
      id: createUniqueBuddyCareRecordId(safeValue.id, 'care-action', index, options.usedIds),
      plantId: normalizeString(safeValue.plantId),
      actionId: normalizeString(safeValue.actionId),
      origin: normalizeString(safeValue.origin, 'local_intelligence'),
      insightId: normalizeString(safeValue.insightId) || null,
      sourceCheckId: normalizeString(safeValue.sourceCheckId) || null,
      triggerIds: normalizeStringList(safeValue.triggerIds, 12),
      status,
      createdAt,
      updatedAt,
      recommendedAt: normalizeTimestamp(safeValue.recommendedAt) || createdAt,
      confirmedAt: normalizeTimestamp(safeValue.confirmedAt),
      performedAt: normalizeTimestamp(safeValue.performedAt),
      controlDueAt: normalizeTimestamp(safeValue.controlDueAt),
      controlWindowHours: Number.isFinite(Number(safeValue.controlWindowHours))
        ? Math.max(1, Math.min(336, Number(safeValue.controlWindowHours)))
        : 48,
      outcome: normalizeEnumValue(
        safeValue.outcome || (['improved', 'unchanged', 'worsened', 'cancelled'].includes(status) ? status : ''),
        ['pending', 'improved', 'unchanged', 'worsened', 'cancelled'],
        status === 'effect_pending' ? 'pending' : ''
      ),
      userNote: normalizeString(safeValue.userNote),
      lastAskedAt: normalizeTimestamp(safeValue.lastAskedAt)
    };
  }

  function normalizeCareQuestionAnswer(value, index, options = {}) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const answeredAt = normalizeTimestamp(safeValue.answeredAt) || Date.now();
    return {
      ...safeValue,
      id: createUniqueBuddyCareRecordId(safeValue.id, 'care-answer', index, options.usedIds),
      plantId: normalizeString(safeValue.plantId),
      questionId: normalizeString(safeValue.questionId),
      value: normalizeString(safeValue.value),
      answeredAt,
      sourceCheckId: normalizeString(safeValue.sourceCheckId) || null,
      insightId: normalizeString(safeValue.insightId) || null
    };
  }

  function normalizeCareCause(value, index) {
    const safeValue = value && typeof value === 'object' ? value : {};
    return {
      ...safeValue,
      id: normalizeString(safeValue.id, `cause-${index + 1}`),
      titleKey: normalizeString(safeValue.titleKey),
      score: Number.isFinite(Number(safeValue.score)) ? Math.round(Number(safeValue.score) * 100) / 100 : 0,
      confidence: normalizeConfidence(safeValue.confidence),
      supportingSignals: normalizeStringList(safeValue.supportingSignals, 12),
      contradictingSignals: normalizeStringList(safeValue.contradictingSignals, 12),
      missingData: normalizeStringList(safeValue.missingData, 12),
      safeCheckId: normalizeString(safeValue.safeCheckId) || null,
      actionId: normalizeString(safeValue.actionId) || null
    };
  }

  function normalizeCareQuestion(value) {
    const safeValue = value && typeof value === 'object' ? value : null;
    if (!safeValue || !normalizeString(safeValue.id)) {
      return null;
    }
    return {
      ...safeValue,
      id: normalizeString(safeValue.id),
      promptKey: normalizeString(safeValue.promptKey),
      reasonKey: normalizeString(safeValue.reasonKey),
      options: (Array.isArray(safeValue.options) ? safeValue.options : []).slice(0, 6).map((option) => {
        const safeOption = option && typeof option === 'object' ? option : {};
        return {
          value: normalizeString(safeOption.value),
          labelKey: normalizeString(safeOption.labelKey)
        };
      }).filter((option) => option.value && option.labelKey)
    };
  }

  function normalizeRecommendedCareAction(value, index) {
    const safeValue = value && typeof value === 'object' ? value : {};
    return {
      ...safeValue,
      id: normalizeString(safeValue.id, `recommended-action-${index + 1}`),
      titleKey: normalizeString(safeValue.titleKey),
      reasonKey: normalizeString(safeValue.reasonKey),
      priority: normalizeCarePriority(safeValue.priority),
      reversible: safeValue.reversible !== false,
      interventionRisk: normalizeEnumValue(safeValue.interventionRisk, ['low', 'medium', 'high'], 'low'),
      controlWindowHours: Number.isFinite(Number(safeValue.controlWindowHours))
        ? Math.max(1, Math.min(336, Number(safeValue.controlWindowHours)))
        : 48
    };
  }

  function normalizeCareInsight(value, index, options = {}) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const generatedAt = normalizeTimestamp(safeValue.generatedAt) || Date.now();
    const safeTrend = safeValue.trend && typeof safeValue.trend === 'object' ? safeValue.trend : {};
    return {
      ...safeValue,
      id: createUniqueBuddyCareRecordId(safeValue.id, 'care-insight', index, options.usedIds),
      plantId: normalizeString(safeValue.plantId),
      generatedAt,
      sourceCheckId: normalizeString(safeValue.sourceCheckId) || null,
      status: normalizeEnumValue(safeValue.status, ['stable', 'watch', 'attention', 'unknown'], 'unknown'),
      priority: normalizeCarePriority(safeValue.priority),
      headlineKey: normalizeString(safeValue.headlineKey),
      summaryKey: normalizeString(safeValue.summaryKey),
      confidence: normalizeConfidence(safeValue.confidence),
      trend: {
        ...safeTrend,
        direction: normalizeEnumValue(safeTrend.direction, ['improving', 'stable', 'worsening', 'unknown'], 'unknown'),
        confidence: normalizeConfidence(safeTrend.confidence),
        signals: normalizeStringList(safeTrend.signals, 16),
        recurringPatterns: normalizeStringList(safeTrend.recurringPatterns, 12),
        contradictions: normalizeStringList(safeTrend.contradictions, 12),
        insufficientData: normalizeStringList(safeTrend.insufficientData, 12)
      },
      possibleCauses: (Array.isArray(safeValue.possibleCauses) ? safeValue.possibleCauses : []).slice(0, 3).map(normalizeCareCause),
      primaryQuestion: normalizeCareQuestion(safeValue.primaryQuestion),
      recommendedActions: (Array.isArray(safeValue.recommendedActions) ? safeValue.recommendedActions : []).slice(0, 5).map(normalizeRecommendedCareAction),
      activeFollowUps: normalizeStringList(safeValue.activeFollowUps, 8),
      safetyNotes: normalizeStringList(safeValue.safetyNotes, 12),
      supportingSignals: normalizeStringList(safeValue.supportingSignals, 20)
    };
  }

  function normalizePlantPattern(value, index, options = {}) {
    const safeValue = value && typeof value === 'object' ? value : {};
    return {
      ...safeValue,
      id: createUniqueBuddyCareRecordId(safeValue.id, 'plant-pattern', index, options.usedIds),
      plantId: normalizeString(safeValue.plantId),
      updatedAt: normalizeTimestamp(safeValue.updatedAt) || Date.now(),
      confidence: normalizeConfidence(safeValue.confidence),
      metrics: safeValue.metrics && typeof safeValue.metrics === 'object' ? { ...safeValue.metrics } : {}
    };
  }

  function normalizeCareIntelligence(value, plantIds) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const actionIds = new Set();
    const answerIds = new Set();
    const insightIds = new Set();
    const patternIds = new Set();
    const filterKnown = (entries) => filterEntriesByKnownPlantIds(entries, plantIds);
    return {
      ...safeValue,
      version: INTELLIGENCE_VERSION,
      actions: filterKnown(clampList(safeValue.actions, 180)
        .map((entry, index) => normalizeCareAction(entry, index, { usedIds: actionIds }))),
      questionAnswers: filterKnown(clampList(safeValue.questionAnswers, 180)
        .map((entry, index) => normalizeCareQuestionAnswer(entry, index, { usedIds: answerIds })))
        .filter((entry) => entry.questionId && entry.value),
      insights: filterKnown(clampList(safeValue.insights, 30)
        .map((entry, index) => normalizeCareInsight(entry, index, { usedIds: insightIds }))),
      plantPatterns: filterKnown(clampList(safeValue.plantPatterns, 12)
        .map((entry, index) => normalizePlantPattern(entry, index, { usedIds: patternIds })))
    };
  }

  function buildKnownPlantIdSet(plants) {
    const safePlants = Array.isArray(plants) ? plants : [];
    return new Set(safePlants
      .map((plant) => String(plant && plant.id || '').trim())
      .filter(Boolean));
  }

  function filterEntriesByKnownPlantIds(entries, plantIds) {
    const safeEntries = Array.isArray(entries) ? entries : [];
    if (!(plantIds instanceof Set) || !plantIds.size) {
      return [];
    }
    return safeEntries.filter((entry) => plantIds.has(String(entry && entry.plantId || '').trim()));
  }

  function normalizeBuddyCareState(rawState) {
    const safeState = rawState && typeof rawState === 'object' ? rawState : {};
    const entitlement = normalizeEntitlement(safeState.entitlement);
    const plants = normalizePlantProfiles(safeState.plants, getMaximumPlantLimit());
    const knownPlantIds = buildKnownPlantIdSet(plants);
    const dailyCheckIds = new Set();
    const diaryEntryIds = new Set();
    const dailyChecks = filterEntriesByKnownPlantIds(clampList(safeState.dailyChecks, 180)
      .map((value, index) => normalizeDailyCheck(value, index, { usedIds: dailyCheckIds })), knownPlantIds);
    const diaryEntries = filterEntriesByKnownPlantIds(clampList(safeState.diaryEntries, 180)
      .map((value, index) => normalizeDiaryEntry(value, index, { usedIds: diaryEntryIds })), knownPlantIds);
    const tasks = filterEntriesByKnownPlantIds(clampList(safeState.tasks, 180).map(normalizeTask), knownPlantIds);
    const riskSignals = filterEntriesByKnownPlantIds(clampList(safeState.riskSignals, 180).map(normalizeRiskSignal), knownPlantIds);

    return {
      ...safeState,
      version: VERSION,
      ageGateAccepted: safeState.ageGateAccepted === true,
      ageGateAcceptedAt: safeState.ageGateAccepted === true
        ? normalizeTimestamp(safeState.ageGateAcceptedAt)
        : null,
      entitlement,
      activePlantId: knownPlantIds.has(String(safeState.activePlantId || '').trim())
        ? String(safeState.activePlantId).trim()
        : (plants[0] ? plants[0].id : null),
      plants,
      dailyChecks,
      diaryEntries,
      tasks,
      riskSignals,
      intelligence: normalizeCareIntelligence(safeState.intelligence, knownPlantIds),
      externalTest: normalizeExternalTestState(safeState.externalTest),
      settings: {
        ...(safeState.settings && typeof safeState.settings === 'object' ? safeState.settings : {}),
        notificationsEnabled: safeState.settings && safeState.settings.notificationsEnabled === true,
        preferredReminderTime: normalizeReminderTime(safeState.settings && safeState.settings.preferredReminderTime),
        photoPrivacyNoticeSeen: Boolean(safeState.settings && safeState.settings.photoPrivacyNoticeSeen === true)
      }
    };
  }

  function getBuddyCareEntitlement(source) {
    const slice = normalizeBuddyCareState(getBuddyCareSlice(source));
    return slice.entitlement;
  }

  function getBuddyCarePlantLimit(source) {
    const entitlement = getBuddyCareEntitlement(source);
    return entitlement === ENTITLEMENTS.CARE_PLUS_MOCK
      ? getCarePlusMockPlantLimit()
      : getFreePlantLimit();
  }

  function getBuddyCarePlantCount(source) {
    const slice = normalizeBuddyCareState(getBuddyCareSlice(source));
    return Array.isArray(slice.plants) ? slice.plants.length : 0;
  }

  function getActiveBuddyCarePlantId(source) {
    const slice = normalizeBuddyCareState(getBuddyCareSlice(source));
    return slice.activePlantId || null;
  }

  function getCareIntelligence(source) {
    const slice = normalizeBuddyCareState(getBuddyCareSlice(source));
    return slice.intelligence;
  }

  function getCareActionsForPlant(source, plantId) {
    const safePlantId = String(plantId || '').trim();
    if (!safePlantId) {
      return [];
    }
    return getCareIntelligence(source).actions
      .filter((entry) => entry.plantId === safePlantId)
      .slice()
      .sort((left, right) => Number(right.updatedAt || right.createdAt || 0) - Number(left.updatedAt || left.createdAt || 0));
  }

  function getCareQuestionAnswersForPlant(source, plantId) {
    const safePlantId = String(plantId || '').trim();
    if (!safePlantId) {
      return [];
    }
    return getCareIntelligence(source).questionAnswers
      .filter((entry) => entry.plantId === safePlantId)
      .slice()
      .sort((left, right) => Number(right.answeredAt || 0) - Number(left.answeredAt || 0));
  }

  function getLatestCareInsightForPlant(source, plantId) {
    const safePlantId = String(plantId || '').trim();
    if (!safePlantId) {
      return null;
    }
    return getCareIntelligence(source).insights
      .filter((entry) => entry.plantId === safePlantId)
      .slice()
      .sort((left, right) => Number(right.generatedAt || 0) - Number(left.generatedAt || 0))[0] || null;
  }

  function updateCareIntelligence(target, mutate) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    if (!slice || typeof mutate !== 'function') {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    const nextIntelligence = mutate({
      ...normalizedBefore.intelligence,
      actions: normalizedBefore.intelligence.actions.slice(),
      questionAnswers: normalizedBefore.intelligence.questionAnswers.slice(),
      insights: normalizedBefore.intelligence.insights.slice(),
      plantPatterns: normalizedBefore.intelligence.plantPatterns.slice()
    }, normalizedBefore);
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      intelligence: nextIntelligence && typeof nextIntelligence === 'object'
        ? nextIntelligence
        : normalizedBefore.intelligence
    });
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return { ok: true, reason: 'care_intelligence_updated', state: normalized };
  }

  function upsertCareInsight(target, insight, plantPattern = null) {
    const safeInsight = insight && typeof insight === 'object' ? insight : {};
    const safePlantId = String(safeInsight.plantId || '').trim();
    if (!safePlantId) {
      return { ok: false, reason: 'plant_id_missing', state: normalizeBuddyCareState(getBuddyCareSlice(target)) };
    }
    let storedInsight = null;
    const result = updateCareIntelligence(target, (intelligence, stateBefore) => {
      if (!stateBefore.plants.some((plant) => plant.id === safePlantId)) {
        return intelligence;
      }
      storedInsight = normalizeCareInsight({
        ...safeInsight,
        id: normalizeString(safeInsight.id, `care-insight-${safePlantId}-${Math.trunc(Number(safeInsight.generatedAt) || Date.now())}`)
      }, 0, { usedIds: new Set() });
      intelligence.insights = intelligence.insights
        .filter((entry) => !(entry.plantId === safePlantId && entry.id === storedInsight.id))
        .concat(storedInsight);
      if (plantPattern && typeof plantPattern === 'object') {
        const storedPattern = normalizePlantPattern({
          ...plantPattern,
          plantId: safePlantId,
          id: normalizeString(plantPattern.id, `plant-pattern-${safePlantId}`)
        }, 0, { usedIds: new Set() });
        intelligence.plantPatterns = intelligence.plantPatterns
          .filter((entry) => entry.plantId !== safePlantId)
          .concat(storedPattern);
      }
      return intelligence;
    });
    if (!storedInsight) {
      return { ...result, ok: false, reason: 'plant_not_found' };
    }
    return { ...result, insight: storedInsight };
  }

  function recordCareQuestionAnswer(target, answer) {
    const safeAnswer = answer && typeof answer === 'object' ? answer : {};
    const safePlantId = String(safeAnswer.plantId || '').trim();
    const safeQuestionId = String(safeAnswer.questionId || '').trim();
    const safeValue = String(safeAnswer.value || '').trim();
    if (!safePlantId || !safeQuestionId || !safeValue) {
      return { ok: false, reason: 'care_answer_invalid', state: normalizeBuddyCareState(getBuddyCareSlice(target)) };
    }
    let storedAnswer = null;
    const result = updateCareIntelligence(target, (intelligence, stateBefore) => {
      if (!stateBefore.plants.some((plant) => plant.id === safePlantId)) {
        return intelligence;
      }
      const answeredAt = normalizeTimestamp(safeAnswer.answeredAt) || Date.now();
      storedAnswer = normalizeCareQuestionAnswer({
        ...safeAnswer,
        id: normalizeString(safeAnswer.id, `care-answer-${safePlantId}-${safeQuestionId}-${Math.trunc(answeredAt)}`),
        answeredAt
      }, 0, { usedIds: new Set() });
      intelligence.questionAnswers = intelligence.questionAnswers
        .filter((entry) => !(entry.plantId === safePlantId && entry.questionId === safeQuestionId && entry.sourceCheckId === storedAnswer.sourceCheckId))
        .concat(storedAnswer);
      return intelligence;
    });
    if (!storedAnswer) {
      return { ...result, ok: false, reason: 'plant_not_found' };
    }
    return { ...result, answer: storedAnswer };
  }

  function upsertCareAction(target, action) {
    const safeAction = action && typeof action === 'object' ? action : {};
    const safePlantId = String(safeAction.plantId || '').trim();
    const safeActionId = String(safeAction.actionId || '').trim();
    if (!safePlantId || !safeActionId) {
      return { ok: false, reason: 'care_action_invalid', state: normalizeBuddyCareState(getBuddyCareSlice(target)) };
    }
    let storedAction = null;
    const result = updateCareIntelligence(target, (intelligence, stateBefore) => {
      if (!stateBefore.plants.some((plant) => plant.id === safePlantId)) {
        return intelligence;
      }
      const existing = intelligence.actions.find((entry) => (
        entry.plantId === safePlantId
        && (entry.id === String(safeAction.id || '').trim()
          || (entry.actionId === safeActionId && !['improved', 'unchanged', 'worsened', 'cancelled'].includes(entry.status)))
      )) || null;
      const timestamp = normalizeTimestamp(safeAction.updatedAt) || Date.now();
      storedAction = normalizeCareAction({
        ...(existing || {}),
        ...safeAction,
        id: normalizeString(safeAction.id || (existing && existing.id), `care-action-${safePlantId}-${safeActionId}-${Math.trunc(timestamp)}`),
        createdAt: normalizeTimestamp(safeAction.createdAt || (existing && existing.createdAt)) || timestamp,
        updatedAt: timestamp
      }, 0, { usedIds: new Set() });
      intelligence.actions = intelligence.actions
        .filter((entry) => entry.id !== storedAction.id)
        .concat(storedAction);
      return intelligence;
    });
    if (!storedAction) {
      return { ...result, ok: false, reason: 'plant_not_found' };
    }
    return { ...result, action: storedAction };
  }

  function selectBuddyCarePlant(target, plantId) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safePlantId = String(plantId || '').trim();
    if (!slice) {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    if (!normalizedBefore.plants.some((plant) => plant.id === safePlantId)) {
      return { ok: false, reason: 'plant_not_found', state: normalizedBefore };
    }
    const normalized = normalizeBuddyCareState({ ...normalizedBefore, activePlantId: safePlantId });
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return { ok: true, reason: 'plant_selected', plantId: safePlantId, state: normalized };
  }

  function isBuddyCarePlantReadOnly(source, plantId) {
    const slice = normalizeBuddyCareState(getBuddyCareSlice(source));
    const safePlantId = String(plantId || '').trim();
    if (!safePlantId) {
      return false;
    }
    const plantIndex = slice.plants.findIndex((plant) => String(plant && plant.id || '').trim() === safePlantId);
    if (plantIndex < 0) {
      return false;
    }
    return plantIndex >= getBuddyCarePlantLimit(slice);
  }

  function getBuddyCareRemainingPlantSlots(source) {
    return Math.max(0, getBuddyCarePlantLimit(source) - getBuddyCarePlantCount(source));
  }

  function canAddBuddyCarePlant(source) {
    return getBuddyCareRemainingPlantSlots(source) > 0;
  }

  function hasAcceptedBuddyCareAgeGate(source) {
    const slice = normalizeBuddyCareState(getBuddyCareSlice(source));
    return slice.ageGateAccepted === true;
  }

  function isBuddyCareUnlocked(source) {
    return isBuddyCareEnabled() && (!isBuddyCareAgeGateEnabled() || hasAcceptedBuddyCareAgeGate(source));
  }

  function acceptBuddyCareAgeGate(target, acceptedAtMs = Date.now()) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    if (!slice) {
      return createDefaultBuddyCareState();
    }
    slice.ageGateAccepted = true;
    slice.ageGateAcceptedAt = normalizeTimestamp(acceptedAtMs) || Date.now();
    const normalized = normalizeBuddyCareState(slice);
    if (rootState) {
      rootState.buddyCare = normalized;
    }
    return normalized;
  }

  function setBuddyCareEntitlement(target, entitlement) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    if (!slice) {
      return createDefaultBuddyCareState();
    }
    slice.entitlement = normalizeEntitlement(entitlement);
    let normalized = normalizeBuddyCareState(slice);
    if (normalized.entitlement === ENTITLEMENTS.FREE && isBuddyCarePlantReadOnly(normalized, normalized.activePlantId)) {
      normalized = normalizeBuddyCareState({
        ...normalized,
        activePlantId: normalized.plants[0] ? normalized.plants[0].id : null
      });
    }
    if (rootState) {
      rootState.buddyCare = normalized;
    }
    return normalized;
  }

  function activateBuddyCarePlusMock(target) {
    if (!isBuddyCarePlusMockEnabled()) {
      return normalizeBuddyCareState(getBuddyCareSlice(target));
    }
    return setBuddyCareEntitlement(target, ENTITLEMENTS.CARE_PLUS_MOCK);
  }

  function buildBuddyCarePlantId(existingPlants) {
    const plants = Array.isArray(existingPlants) ? existingPlants : [];
    const knownIds = new Set(plants.map((plant) => String(plant && plant.id || '').trim()).filter(Boolean));
    let sequence = plants.length + 1;
    let candidate = `buddy-plant-${sequence}`;
    while (knownIds.has(candidate)) {
      sequence += 1;
      candidate = `buddy-plant-${sequence}`;
    }
    return candidate;
  }

  function createBuddyCarePlantProfile(input = {}, options = {}) {
    const existingPlants = Array.isArray(options.existingPlants) ? options.existingPlants : [];
    const fallbackIndex = Math.max(0, existingPlants.length);
    return normalizePlantProfile({
      ...input,
      id: normalizeString(input.id, buildBuddyCarePlantId(existingPlants)),
      nickname: normalizeString(input.nickname, `${DEFAULT_PLANT_NAME_PREFIX} ${fallbackIndex + 1}`),
      plantType: normalizeBuddyPlantType(input.plantType || input.type),
      environment: normalizeBuddyEnvironment(input.environment),
      startDate: normalizeDateString(input.startDate, input.createdAt || Date.now()),
      phase: normalizePlantPhase(input.phase),
      createdAt: normalizeTimestamp(input.createdAt) || Date.now(),
      archived: input.archived === true
    }, fallbackIndex);
  }

  function getTodayDayKey(options = {}) {
    const nowSource = options && Object.prototype.hasOwnProperty.call(options, 'now')
      ? options.now
      : Date.now();
    const nowMs = normalizeTimestamp(nowSource) || Date.now();
    const date = new Date(nowMs);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getDailyCheckSortValue(check) {
    const safeCheck = check && typeof check === 'object' ? check : {};
    const createdAt = normalizeTimestamp(safeCheck.createdAt);
    if (Number.isFinite(createdAt)) {
      return createdAt;
    }
    const createdAtIso = typeof safeCheck.createdAtIso === 'string' ? safeCheck.createdAtIso.trim() : '';
    if (!createdAtIso) {
      return 0;
    }
    const parsed = Date.parse(createdAtIso);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getDiaryEntrySortValue(entry) {
    const safeEntry = entry && typeof entry === 'object' ? entry : {};
    const updatedAt = typeof safeEntry.updatedAt === 'string' ? safeEntry.updatedAt.trim() : '';
    const createdAt = typeof safeEntry.createdAt === 'string' ? safeEntry.createdAt.trim() : '';
    const updatedParsed = updatedAt ? Date.parse(updatedAt) : NaN;
    if (Number.isFinite(updatedParsed)) {
      return updatedParsed;
    }
    const createdParsed = createdAt ? Date.parse(createdAt) : NaN;
    if (Number.isFinite(createdParsed)) {
      return createdParsed;
    }
    return 0;
  }

  function createDailyCheck(input = {}, options = {}) {
    const nowSource = options && Object.prototype.hasOwnProperty.call(options, 'now')
      ? options.now
      : Date.now();
    const fallbackCreatedAt = normalizeTimestamp(input.createdAt)
      || normalizeTimestamp(nowSource)
      || Date.now();
    const createdAtIso = normalizeIsoTimestampString(input.createdAtIso, fallbackCreatedAt);
    return normalizeDailyCheck({
      ...input,
      id: input.id,
      plantId: input.plantId,
      dayKey: input.dayKey,
      createdAt: fallbackCreatedAt,
      createdAtIso,
      mediumMoisture: input.mediumMoisture,
      leafState: input.leafState,
      growthState: input.growthState,
      environmentStress: input.environmentStress,
      pestsVisible: input.pestsVisible,
      heightCm: input.heightCm,
      note: input.note,
      photoIds: input.photoIds
    }, 0, { usedIds: new Set() });
  }

  function createDiaryEntry(input = {}, options = {}) {
    const nowSource = options && Object.prototype.hasOwnProperty.call(options, 'now')
      ? options.now
      : Date.now();
    const fallbackUpdatedAt = normalizeTimestamp(input.updatedAtMs || input.updatedAt)
      || normalizeTimestamp(nowSource)
      || Date.now();
    const fallbackCreatedAt = normalizeTimestamp(input.createdAtMs || input.createdAt)
      || fallbackUpdatedAt;
    return normalizeDiaryEntry({
      ...input,
      id: input.id,
      plantId: input.plantId,
      entryType: input.entryType,
      entryDate: input.entryDate || input.dayKey,
      title: input.title,
      note: input.note || input.text,
      tags: input.tags,
      linkedCheckId: input.linkedCheckId,
      heightCm: input.heightCm,
      buddyComment: input.buddyComment,
      photoUrls: [],
      photoIds: input.photoIds,
      createdAt: normalizeIsoTimestampString(input.createdAt, fallbackCreatedAt),
      updatedAt: normalizeIsoTimestampString(input.updatedAt, fallbackUpdatedAt)
    }, 0, { usedIds: new Set() });
  }

  function buildUniqueMutationId(prefix, entries, nowValue = Date.now()) {
    const knownIds = new Set((Array.isArray(entries) ? entries : [])
      .map((entry) => String(entry && entry.id || '').trim())
      .filter(Boolean));
    const timestamp = Math.max(1, Math.trunc(Number(nowValue) || Date.now()));
    let candidate = `${prefix}-${timestamp}`;
    let sequence = 2;
    while (knownIds.has(candidate)) {
      candidate = `${prefix}-${timestamp}-${sequence}`;
      sequence += 1;
    }
    return candidate;
  }

  function getDailyChecksForPlant(source, plantId) {
    const slice = normalizeBuddyCareState(getBuddyCareSlice(source));
    const safePlantId = String(plantId || '').trim();
    if (!safePlantId) {
      return [];
    }
    return slice.dailyChecks
      .filter((check) => String(check && check.plantId || '').trim() === safePlantId)
      .slice()
      .sort((left, right) => getDailyCheckSortValue(right) - getDailyCheckSortValue(left));
  }

  function getLatestDailyCheckForPlant(source, plantId) {
    const checks = getDailyChecksForPlant(source, plantId);
    return checks.length ? checks[0] : null;
  }

  function getDailyCheckById(source, checkId) {
    const slice = normalizeBuddyCareState(getBuddyCareSlice(source));
    const safeCheckId = String(checkId || '').trim();
    if (!safeCheckId) {
      return null;
    }
    return slice.dailyChecks.find((check) => String(check && check.id || '').trim() === safeCheckId) || null;
  }

  function hasDailyCheckToday(source, plantId, options = {}) {
    const checks = getDailyChecksForPlant(source, plantId);
    const todayKey = getTodayDayKey(options);
    return checks.some((check) => String(check && check.dayKey || '') === todayKey);
  }

  function getDiaryEntriesForPlant(source, plantId) {
    const slice = normalizeBuddyCareState(getBuddyCareSlice(source));
    const safePlantId = String(plantId || '').trim();
    if (!safePlantId) {
      return [];
    }
    return slice.diaryEntries
      .filter((entry) => String(entry && entry.plantId || '').trim() === safePlantId)
      .slice()
      .sort((left, right) => getDiaryEntrySortValue(right) - getDiaryEntrySortValue(left));
  }

  function getLatestDiaryEntryForPlant(source, plantId) {
    const entries = getDiaryEntriesForPlant(source, plantId);
    return entries.length ? entries[0] : null;
  }

  function getDiaryEntriesForToday(source, plantId, options = {}) {
    const todayKey = getTodayDayKey(options);
    return getDiaryEntriesForPlant(source, plantId)
      .filter((entry) => String(entry && entry.entryDate || '').trim() === todayKey);
  }

  function isDailyCheckAttentionWorthy(check) {
    const safeCheck = check && typeof check === 'object' ? check : {};
    return safeCheck.leafState !== 'normal'
      || safeCheck.pestsVisible !== 'no'
      || safeCheck.environmentStress !== 'normal'
      || (safeCheck.mediumMoisture === 'wet' && safeCheck.leafState === 'hanging');
  }

  function getPlantDailyCheckStatus(source, plantId, options = {}) {
    const safePlantId = String(plantId || '').trim();
    if (!safePlantId) {
      return 'no_check_today';
    }
    const checks = getDailyChecksForPlant(source, safePlantId);
    const todayKey = getTodayDayKey(options);
    const latestTodayCheck = checks.find((check) => String(check && check.dayKey || '') === todayKey) || null;
    if (!latestTodayCheck) {
      return 'no_check_today';
    }
    return isDailyCheckAttentionWorthy(latestTodayCheck)
      ? 'needs_attention'
      : 'checked_today';
  }

  function buildDiaryEntryFromDailyCheck(plantId, check, options = {}) {
    const safeCheck = check && typeof check === 'object' ? check : {};
    const safePlantId = String(plantId || safeCheck.plantId || '').trim();
    const attentionWorthy = isDailyCheckAttentionWorthy(safeCheck);
    const tags = ['daily_check', 'observation'];
    if (safeCheck.heightCm != null) {
      tags.push('height');
    }
    if (attentionWorthy) {
      tags.push('issue');
    }
    return createDiaryEntry({
      plantId: safePlantId,
      entryType: 'daily_check',
      entryDate: safeCheck.dayKey,
      title: attentionWorthy
        ? 'buddyCare.diary.auto_title_attention'
        : 'buddyCare.diary.auto_title_complete',
      note: normalizeString(safeCheck.note),
      tags,
      linkedCheckId: safeCheck.id,
      heightCm: safeCheck.heightCm,
      buddyComment: attentionWorthy
        ? 'buddyCare.summary.needs_attention'
        : 'buddyCare.summary.checked_today',
      photoIds: safeCheck.photoIds,
      createdAt: safeCheck.createdAtIso,
      updatedAt: safeCheck.createdAtIso
    }, options);
  }

  function addDiaryEntry(target, plantId, input = {}, options = {}) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safePlantId = String(plantId || '').trim();
    if (!slice) {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    if (!safePlantId) {
      return { ok: false, reason: 'plant_id_missing', state: normalizeBuddyCareState(slice) };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    const hasPlant = normalizedBefore.plants.some((plant) => String(plant && plant.id || '').trim() === safePlantId);
    if (!hasPlant) {
      return { ok: false, reason: 'plant_not_found', state: normalizedBefore };
    }
    const heightValidation = validateHeightCm(input && input.heightCm);
    if (!heightValidation.valid) {
      return { ok: false, reason: 'invalid_height', state: normalizedBefore };
    }
    const nowValue = options && Object.prototype.hasOwnProperty.call(options, 'now') ? options.now : Date.now();
    const nextEntry = createDiaryEntry({
      ...input,
      id: normalizeString(input && input.id, buildUniqueMutationId('diary-entry', normalizedBefore.diaryEntries, nowValue)),
      plantId: safePlantId,
      entryType: input && input.entryType ? input.entryType : 'manual',
      heightCm: heightValidation.value
    }, options);
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      diaryEntries: normalizedBefore.diaryEntries.concat(nextEntry)
    });
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return {
      ok: true,
      reason: 'diary_entry_added',
      entry: nextEntry,
      state: normalized
    };
  }

  function createDiaryEntryFromDailyCheck(target, plantId, checkId, options = {}) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safePlantId = String(plantId || '').trim();
    const safeCheckId = String(checkId || '').trim();
    if (!slice) {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    if (!safePlantId) {
      return { ok: false, reason: 'plant_id_missing', state: normalizeBuddyCareState(slice) };
    }
    if (!safeCheckId) {
      return { ok: false, reason: 'check_id_missing', state: normalizeBuddyCareState(slice) };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    const hasPlant = normalizedBefore.plants.some((plant) => String(plant && plant.id || '').trim() === safePlantId);
    if (!hasPlant) {
      return { ok: false, reason: 'plant_not_found', state: normalizedBefore };
    }
    const check = normalizedBefore.dailyChecks.find((entry) => (
      String(entry && entry.id || '').trim() === safeCheckId
      && String(entry && entry.plantId || '').trim() === safePlantId
    )) || null;
    if (!check) {
      return { ok: false, reason: 'daily_check_not_found', state: normalizedBefore };
    }
    const existingEntry = normalizedBefore.diaryEntries.find((entry) => String(entry && entry.linkedCheckId || '').trim() === safeCheckId) || null;
    if (existingEntry) {
      return {
        ok: true,
        reason: 'diary_entry_exists',
        entry: existingEntry,
        state: normalizedBefore
      };
    }
    const nextEntry = buildDiaryEntryFromDailyCheck(safePlantId, check, options);
    nextEntry.id = buildUniqueMutationId(
      'diary-entry',
      normalizedBefore.diaryEntries,
      options && Object.prototype.hasOwnProperty.call(options, 'now') ? options.now : Date.now()
    );
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      activePlantId: safePlantId,
      diaryEntries: normalizedBefore.diaryEntries.concat(nextEntry)
    });
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return {
      ok: true,
      reason: 'diary_entry_added',
      entry: nextEntry,
      state: normalized
    };
  }

  function deleteDiaryEntry(target, entryId) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safeEntryId = String(entryId || '').trim();
    if (!slice) {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    if (!safeEntryId) {
      return { ok: false, reason: 'entry_id_missing', state: normalizeBuddyCareState(slice) };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    const nextEntries = normalizedBefore.diaryEntries.filter((entry) => String(entry && entry.id || '').trim() !== safeEntryId);
    if (nextEntries.length === normalizedBefore.diaryEntries.length) {
      return { ok: false, reason: 'entry_not_found', state: normalizedBefore };
    }
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      diaryEntries: nextEntries
    });
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return {
      ok: true,
      reason: 'diary_entry_deleted',
      state: normalized
    };
  }

  function deleteDailyCheck(target, checkId) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safeCheckId = String(checkId || '').trim();
    if (!slice) {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    if (!safeCheckId) {
      return { ok: false, reason: 'check_id_missing', state: normalizeBuddyCareState(slice) };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    const nextChecks = normalizedBefore.dailyChecks.filter((check) => String(check && check.id || '').trim() !== safeCheckId);
    if (nextChecks.length === normalizedBefore.dailyChecks.length) {
      return { ok: false, reason: 'daily_check_not_found', state: normalizedBefore };
    }
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      dailyChecks: nextChecks,
      diaryEntries: normalizedBefore.diaryEntries.filter((entry) => entry.linkedCheckId !== safeCheckId)
    });
    if (rootState) rootState.buddyCare = normalized;
    else Object.assign(slice, normalized);
    return { ok: true, reason: 'daily_check_deleted', state: normalized };
  }

  function updateDiaryEntry(target, entryId, input = {}, options = {}) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safeEntryId = normalizeString(entryId);
    if (!slice || !safeEntryId) return { ok: false, reason: 'entry_id_missing', state: normalizeBuddyCareState(slice) };
    const normalizedBefore = normalizeBuddyCareState(slice);
    const existingIndex = normalizedBefore.diaryEntries.findIndex((entry) => entry.id === safeEntryId);
    if (existingIndex < 0) return { ok: false, reason: 'entry_not_found', state: normalizedBefore };
    const existing = normalizedBefore.diaryEntries[existingIndex];
    const heightValidation = validateHeightCm(input && input.heightCm);
    if (!heightValidation.valid) return { ok: false, reason: 'invalid_height', state: normalizedBefore };
    const updated = createDiaryEntry({
      ...existing,
      ...input,
      id: existing.id,
      plantId: existing.plantId,
      entryType: existing.entryType,
      linkedCheckId: existing.linkedCheckId,
      createdAt: existing.createdAt,
      updatedAt: new Date(normalizeTimestamp(options.now) || Date.now()).toISOString(),
      heightCm: heightValidation.value,
      photoIds: Object.prototype.hasOwnProperty.call(input, 'photoIds') ? input.photoIds : existing.photoIds
    }, options);
    const diaryEntries = normalizedBefore.diaryEntries.slice();
    diaryEntries[existingIndex] = updated;
    const normalized = normalizeBuddyCareState({ ...normalizedBefore, diaryEntries });
    if (rootState) rootState.buddyCare = normalized;
    else Object.assign(slice, normalized);
    return { ok: true, reason: 'diary_entry_updated', entry: updated, state: normalized };
  }

  function addDailyCheck(target, plantId, input = {}, options = {}) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safePlantId = String(plantId || '').trim();
    if (!slice) {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    if (!safePlantId) {
      return { ok: false, reason: 'plant_id_missing', state: normalizeBuddyCareState(slice) };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    const hasPlant = normalizedBefore.plants.some((plant) => String(plant && plant.id || '').trim() === safePlantId);
    if (!hasPlant) {
      return { ok: false, reason: 'plant_not_found', state: normalizedBefore };
    }
    const heightValidation = validateHeightCm(input && input.heightCm);
    if (!heightValidation.valid) {
      return { ok: false, reason: 'invalid_height', state: normalizedBefore };
    }
    const nowValue = options && Object.prototype.hasOwnProperty.call(options, 'now') ? options.now : Date.now();
    const dayKey = getTodayDayKey({ now: nowValue });
    const existingCheckIndex = normalizedBefore.dailyChecks.findIndex((check) => (
      check.plantId === safePlantId && check.dayKey === dayKey
    ));
    const existingCheck = existingCheckIndex >= 0 ? normalizedBefore.dailyChecks[existingCheckIndex] : null;
    const nextCheck = createDailyCheck({
      ...input,
      id: existingCheck
        ? existingCheck.id
        : normalizeString(input && input.id, buildUniqueMutationId('daily-check', normalizedBefore.dailyChecks, nowValue)),
      plantId: safePlantId,
      dayKey,
      heightCm: heightValidation.value,
      photoIds: input && Object.prototype.hasOwnProperty.call(input, 'photoIds')
        ? input.photoIds
        : (existingCheck && existingCheck.photoIds)
    }, options);
    const nextChecks = normalizedBefore.dailyChecks.slice();
    if (existingCheckIndex >= 0) {
      nextChecks[existingCheckIndex] = nextCheck;
    } else {
      nextChecks.push(nextCheck);
    }
    const existingDiaryIndex = normalizedBefore.diaryEntries.findIndex((entry) => entry.linkedCheckId === nextCheck.id);
    const nextDiaryEntries = normalizedBefore.diaryEntries.slice();
    const nextDiaryEntry = buildDiaryEntryFromDailyCheck(safePlantId, nextCheck, options);
    nextDiaryEntry.id = existingDiaryIndex >= 0
      ? nextDiaryEntries[existingDiaryIndex].id
      : buildUniqueMutationId('diary-entry', nextDiaryEntries, nowValue);
    if (existingDiaryIndex >= 0) {
      nextDiaryEntries[existingDiaryIndex] = nextDiaryEntry;
    } else {
      nextDiaryEntries.push(nextDiaryEntry);
    }
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      activePlantId: safePlantId,
      dailyChecks: nextChecks,
      diaryEntries: nextDiaryEntries
    });
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return {
      ok: true,
      reason: existingCheck ? 'daily_check_updated' : 'daily_check_added',
      check: nextCheck,
      diaryEntry: nextDiaryEntry,
      state: normalized
    };
  }

  function addBuddyCarePlant(target, input = {}) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    if (!slice) {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    if (!canAddBuddyCarePlant(normalizedBefore)) {
      return { ok: false, reason: 'plant_limit_reached', state: normalizedBefore };
    }
    const safeNickname = normalizeString(input && input.nickname);
    if (!safeNickname) {
      return { ok: false, reason: 'plant_name_missing', state: normalizedBefore };
    }
    if (safeNickname.length > 28) {
      return { ok: false, reason: 'plant_name_too_long', state: normalizedBefore };
    }
    const nextPlant = createBuddyCarePlantProfile(input, { existingPlants: normalizedBefore.plants });
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      activePlantId: nextPlant.id,
      plants: normalizedBefore.plants.concat(nextPlant)
    });
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return {
      ok: true,
      reason: 'plant_added',
      plant: nextPlant,
      state: normalized
    };
  }

  function removeBuddyCarePlant(target, plantId) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safePlantId = String(plantId || '').trim();
    if (!slice) {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    if (!safePlantId) {
      return { ok: false, reason: 'plant_id_missing', state: normalizeBuddyCareState(slice) };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    const nextPlants = normalizedBefore.plants.filter((plant) => String(plant && plant.id || '').trim() !== safePlantId);
    if (nextPlants.length === normalizedBefore.plants.length) {
      return { ok: false, reason: 'plant_not_found', state: normalizedBefore };
    }
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      plants: nextPlants,
      dailyChecks: normalizedBefore.dailyChecks.filter((entry) => String(entry && entry.plantId || '').trim() !== safePlantId),
      diaryEntries: normalizedBefore.diaryEntries.filter((entry) => String(entry && entry.plantId || '').trim() !== safePlantId),
      tasks: normalizedBefore.tasks.filter((entry) => String(entry && entry.plantId || '').trim() !== safePlantId),
      riskSignals: normalizedBefore.riskSignals.filter((entry) => String(entry && entry.plantId || '').trim() !== safePlantId)
    });
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return {
      ok: true,
      reason: 'plant_removed',
      state: normalized
    };
  }

  function setPlantPrimaryPhoto(target, plantId, photoId) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safePlantId = String(plantId || '').trim();
    const safePhotoId = normalizeString(photoId) || null;
    if (!slice || !safePlantId) {
      return { ok: false, reason: 'plant_id_missing', state: normalizeBuddyCareState(slice) };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    let found = false;
    const plants = normalizedBefore.plants.map((plant) => {
      if (plant.id !== safePlantId) return plant;
      found = true;
      return { ...plant, primaryPhotoId: safePhotoId };
    });
    if (!found) return { ok: false, reason: 'plant_not_found', state: normalizedBefore };
    const normalized = normalizeBuddyCareState({ ...normalizedBefore, plants });
    if (rootState) rootState.buddyCare = normalized;
    else Object.assign(slice, normalized);
    return { ok: true, reason: safePhotoId ? 'primary_photo_set' : 'primary_photo_removed', state: normalized };
  }

  function removePhotoReference(target, photoId) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safePhotoId = normalizeString(photoId);
    if (!slice || !safePhotoId) {
      return { ok: false, reason: 'photo_id_missing', state: normalizeBuddyCareState(slice) };
    }
    const normalizedBefore = normalizeBuddyCareState(slice);
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      plants: normalizedBefore.plants.map((plant) => plant.primaryPhotoId === safePhotoId ? { ...plant, primaryPhotoId: null } : plant),
      dailyChecks: normalizedBefore.dailyChecks.map((check) => ({ ...check, photoIds: check.photoIds.filter((id) => id !== safePhotoId) })),
      diaryEntries: normalizedBefore.diaryEntries.map((entry) => ({ ...entry, photoIds: entry.photoIds.filter((id) => id !== safePhotoId) }))
    });
    if (rootState) rootState.buddyCare = normalized;
    else Object.assign(slice, normalized);
    return { ok: true, reason: 'photo_reference_removed', state: normalized };
  }

  function setDailyCheckPhotoIds(target, checkId, photoIds) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safeCheckId = normalizeString(checkId);
    if (!slice || !safeCheckId) return { ok: false, reason: 'check_id_missing', state: normalizeBuddyCareState(slice) };
    const normalizedBefore = normalizeBuddyCareState(slice);
    let found = false;
    const safePhotoIds = normalizeStringList(photoIds, 3);
    const dailyChecks = normalizedBefore.dailyChecks.map((check) => {
      if (check.id !== safeCheckId) return check;
      found = true;
      return { ...check, photoIds: safePhotoIds };
    });
    if (!found) return { ok: false, reason: 'daily_check_not_found', state: normalizedBefore };
    const diaryEntries = normalizedBefore.diaryEntries.map((entry) => entry.linkedCheckId === safeCheckId
      ? { ...entry, photoIds: safePhotoIds }
      : entry);
    const normalized = normalizeBuddyCareState({ ...normalizedBefore, dailyChecks, diaryEntries });
    if (rootState) rootState.buddyCare = normalized;
    else Object.assign(slice, normalized);
    return { ok: true, reason: 'daily_check_photos_updated', state: normalized };
  }

  function setDiaryEntryPhotoIds(target, entryId, photoIds) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    const safeEntryId = normalizeString(entryId);
    if (!slice || !safeEntryId) return { ok: false, reason: 'entry_id_missing', state: normalizeBuddyCareState(slice) };
    const normalizedBefore = normalizeBuddyCareState(slice);
    let found = false;
    const safePhotoIds = normalizeStringList(photoIds, 5);
    const diaryEntries = normalizedBefore.diaryEntries.map((entry) => {
      if (entry.id !== safeEntryId) return entry;
      found = true;
      return { ...entry, photoIds: safePhotoIds, updatedAt: new Date().toISOString() };
    });
    if (!found) return { ok: false, reason: 'entry_not_found', state: normalizedBefore };
    const normalized = normalizeBuddyCareState({ ...normalizedBefore, diaryEntries });
    if (rootState) rootState.buddyCare = normalized;
    else Object.assign(slice, normalized);
    return { ok: true, reason: 'diary_entry_photos_updated', state: normalized };
  }

  function setPhotoPrivacyNoticeSeen(target, seen = true) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    if (!slice) return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    const normalizedBefore = normalizeBuddyCareState(slice);
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      settings: { ...normalizedBefore.settings, photoPrivacyNoticeSeen: seen === true }
    });
    if (rootState) rootState.buddyCare = normalized;
    else Object.assign(slice, normalized);
    return { ok: true, reason: 'photo_privacy_notice_updated', state: normalized };
  }

  function resetBuddyCareTestData(target) {
    const rootState = getRootState(target);
    const slice = resolveTargetSlice(target);
    if (!slice) {
      return { ok: false, reason: 'buddy_care_state_missing', state: createDefaultBuddyCareState() };
    }
    const nextState = createDefaultBuddyCareState();
    const normalized = normalizeBuddyCareState(nextState);
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return {
      ok: true,
      reason: 'buddy_care_test_data_reset',
      state: normalized
    };
  }

  const api = Object.freeze({
    VERSION,
    ENTITLEMENTS,
    DIARY_TAGS,
    createDefaultBuddyCareState,
    normalizeBuddyCareState,
    createBuddyCarePlantProfile,
    createDailyCheck,
    createDiaryEntry,
    getBuddyCareEntitlement,
    getBuddyCarePlantLimit,
    getBuddyCarePlantCount,
    getActiveBuddyCarePlantId,
    getCareIntelligence,
    getCareActionsForPlant,
    getCareQuestionAnswersForPlant,
    getLatestCareInsightForPlant,
    upsertCareInsight,
    recordCareQuestionAnswer,
    upsertCareAction,
    selectBuddyCarePlant,
    isBuddyCarePlantReadOnly,
    getBuddyCareRemainingPlantSlots,
    getDailyCheckById,
    getDailyChecksForPlant,
    getLatestDailyCheckForPlant,
    getDiaryEntriesForPlant,
    getLatestDiaryEntryForPlant,
    getDiaryEntriesForToday,
    hasDailyCheckToday,
    getPlantDailyCheckStatus,
    canAddBuddyCarePlant,
    hasAcceptedBuddyCareAgeGate,
    isBuddyCareEnabled,
    isBuddyCareAgeGateEnabled,
    isBuddyCareUnlocked,
    acceptBuddyCareAgeGate,
    setBuddyCareEntitlement,
    activateBuddyCarePlusMock,
    addBuddyCarePlant,
    addDiaryEntry,
    createDiaryEntryFromDailyCheck,
    addDailyCheck,
    deleteDailyCheck,
    updateDiaryEntry,
    deleteDiaryEntry,
    removeBuddyCarePlant,
    setPlantPrimaryPhoto,
    removePhotoReference,
    setDailyCheckPhotoIds,
    setDiaryEntryPhotoIds,
    setPhotoPrivacyNoticeSeen,
    resetBuddyCareTestData
  });

  globalScope.GrowSimBuddyCareState = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
