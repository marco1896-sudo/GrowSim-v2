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
      return value.trim();
    }
    const fallbackMs = normalizeTimestamp(fallbackTimestamp);
    if (!Number.isFinite(fallbackMs)) {
      return '';
    }
    return new Date(fallbackMs).toISOString().slice(0, 10);
  }

  function normalizeDayKey(value, fallbackTimestamp = null, fallbackIso = '') {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value.trim();
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
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return null;
    }
    return Math.round(numericValue * 10) / 10;
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
      plants: [],
      dailyChecks: [],
      diaryEntries: [],
      tasks: [],
      riskSignals: [],
      externalTest: createDefaultExternalTestState(),
      settings: {
        notificationsEnabled: false,
        preferredReminderTime: DEFAULT_REMINDER_TIME
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
      id: usedIds
        ? createUniqueBuddyCarePlantId(safeValue.id, index, usedIds)
        : normalizeString(safeValue.id, `buddy-plant-${index + 1}`),
      nickname: normalizeString(safeValue.nickname, `${DEFAULT_PLANT_NAME_PREFIX} ${index + 1}`),
      plantType: normalizeBuddyPlantType(safeValue.plantType || safeValue.type),
      environment: normalizeBuddyEnvironment(safeValue.environment),
      startDate,
      phase: normalizePlantPhase(safeValue.phase),
      createdAt: createdAt || normalizeTimestamp(Date.parse(startDate)),
      archived: safeValue.archived === true
    };
  }

  function normalizePlantProfiles(sourceList, limit) {
    const usedIds = new Set();
    return clampList(sourceList, limit).map((value, index) => normalizePlantProfile(value, index, { usedIds }));
  }

  function normalizeDailyCheck(value, index) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const createdAt = normalizeTimestamp(safeValue.createdAt)
      || normalizeTimestamp(Date.parse(String(safeValue.createdAtIso || '').trim()));
    const createdAtIso = normalizeIsoTimestampString(safeValue.createdAtIso, createdAt);
    return {
      id: normalizeString(safeValue.id, `daily-check-${index + 1}`),
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
      note: normalizeString(safeValue.note || safeValue.notes)
    };
  }

  function normalizeDiaryEntry(value, index) {
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
      id: normalizeString(safeValue.id, `diary-entry-${index + 1}`),
      plantId: normalizeString(safeValue.plantId),
      entryType: linkedCheckId ? 'daily_check' : normalizeEnumValue(safeValue.entryType, ['manual', 'daily_check'], 'manual'),
      entryDate: normalizeDayKey(safeValue.entryDate || safeValue.dayKey, updatedAtMs || createdAtMs, updatedAt || createdAt),
      title: normalizeString(safeValue.title),
      note,
      tags: normalizeDiaryTags(safeValue.tags),
      linkedCheckId: linkedCheckId || null,
      heightCm: normalizeHeightCm(safeValue.heightCm),
      buddyComment: buddyComment || null,
      photoUrls: [],
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
    const dailyChecks = filterEntriesByKnownPlantIds(clampList(safeState.dailyChecks, 180).map(normalizeDailyCheck), knownPlantIds);
    const diaryEntries = filterEntriesByKnownPlantIds(clampList(safeState.diaryEntries, 180).map(normalizeDiaryEntry), knownPlantIds);
    const tasks = filterEntriesByKnownPlantIds(clampList(safeState.tasks, 180).map(normalizeTask), knownPlantIds);
    const riskSignals = filterEntriesByKnownPlantIds(clampList(safeState.riskSignals, 180).map(normalizeRiskSignal), knownPlantIds);

    return {
      version: VERSION,
      ageGateAccepted: safeState.ageGateAccepted === true,
      ageGateAcceptedAt: safeState.ageGateAccepted === true
        ? normalizeTimestamp(safeState.ageGateAcceptedAt)
        : null,
      entitlement,
      plants,
      dailyChecks,
      diaryEntries,
      tasks,
      riskSignals,
      externalTest: normalizeExternalTestState(safeState.externalTest),
      settings: {
        notificationsEnabled: safeState.settings && safeState.settings.notificationsEnabled === true,
        preferredReminderTime: normalizeReminderTime(safeState.settings && safeState.settings.preferredReminderTime)
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
    const normalized = normalizeBuddyCareState(slice);
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
    return new Date(nowMs).toISOString().slice(0, 10);
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
      note: input.note
    }, 0);
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
      createdAt: normalizeIsoTimestampString(input.createdAt, fallbackCreatedAt),
      updatedAt: normalizeIsoTimestampString(input.updatedAt, fallbackUpdatedAt)
    }, 0);
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
    const nextEntry = createDiaryEntry({
      ...input,
      plantId: safePlantId,
      entryType: input && input.entryType ? input.entryType : 'manual'
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
    const nextCheck = createDailyCheck({
      ...input,
      plantId: safePlantId
    }, options);
    let normalized = normalizeBuddyCareState({
      ...normalizedBefore,
      dailyChecks: normalizedBefore.dailyChecks.concat(nextCheck)
    });
    const diaryEntryResult = createDiaryEntryFromDailyCheck({ buddyCare: normalized }, safePlantId, nextCheck.id, options);
    normalized = diaryEntryResult && diaryEntryResult.state
      ? normalizeBuddyCareState(diaryEntryResult.state)
      : normalized;
    if (rootState) {
      rootState.buddyCare = normalized;
    } else {
      Object.assign(slice, normalized);
    }
    return {
      ok: true,
      reason: 'daily_check_added',
      check: nextCheck,
      diaryEntry: diaryEntryResult && diaryEntryResult.entry ? diaryEntryResult.entry : null,
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
    const nextPlant = createBuddyCarePlantProfile(input, { existingPlants: normalizedBefore.plants });
    const normalized = normalizeBuddyCareState({
      ...normalizedBefore,
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
    deleteDiaryEntry,
    removeBuddyCarePlant,
    resetBuddyCareTestData
  });

  globalScope.GrowSimBuddyCareState = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
