'use strict';

(function attachGrowSimCareContextBuilder(globalScope) {
  const stateApi = globalScope.GrowSimBuddyCareState
    || (typeof require === 'function' ? require('../state.js') : null);

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function timestampOf(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const parsed = Date.parse(String(value || '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  function recordTimestamp(record) {
    const safeRecord = record && typeof record === 'object' ? record : {};
    return timestampOf(safeRecord.createdAt)
      || timestampOf(safeRecord.createdAtIso)
      || timestampOf(safeRecord.updatedAt)
      || timestampOf(safeRecord.answeredAt)
      || timestampOf(safeRecord.dayKey)
      || timestampOf(safeRecord.entryDate);
  }

  function sortNewest(entries) {
    return toArray(entries).slice().sort((left, right) => Number(recordTimestamp(right) || 0) - Number(recordTimestamp(left) || 0));
  }

  function normalizeNow(value) {
    return timestampOf(value) || Date.now();
  }

  function findLatestActionTimestamp(actions, actionIds) {
    const ids = new Set(toArray(actionIds));
    const match = sortNewest(actions).find((action) => (
      ids.has(String(action && action.actionId || '').trim())
      && ['performed', 'effect_pending', 'improved', 'unchanged', 'worsened'].includes(String(action && action.status || '').trim())
    ));
    return match ? (timestampOf(match.performedAt) || timestampOf(match.updatedAt) || timestampOf(match.createdAt)) : null;
  }

  function buildAnswerMap(answers, nowMs) {
    const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
    const map = {};
    sortNewest(answers).forEach((answer) => {
      const questionId = String(answer && answer.questionId || '').trim();
      const answeredAt = timestampOf(answer && answer.answeredAt);
      if (!questionId || Object.prototype.hasOwnProperty.call(map, questionId)) {
        return;
      }
      if (Number.isFinite(answeredAt) && nowMs - answeredAt > maxAgeMs) {
        return;
      }
      map[questionId] = String(answer && answer.value || '').trim();
    });
    return map;
  }

  function buildPlantProfile(plant, nowMs) {
    const safePlant = plant && typeof plant === 'object' ? plant : {};
    const startAt = timestampOf(safePlant.startDate);
    return {
      id: String(safePlant.id || '').trim(),
      name: String(safePlant.nickname || '').trim(),
      environment: String(safePlant.environment || 'unknown').trim().toLowerCase(),
      phase: String(safePlant.phase || 'unknown').trim().toLowerCase(),
      startDate: String(safePlant.startDate || '').trim(),
      ageDays: Number.isFinite(startAt) ? Math.max(0, Math.floor((nowMs - startAt) / (24 * 60 * 60 * 1000))) : null,
      potSize: safePlant.potSize == null ? null : safePlant.potSize,
      substrate: String(safePlant.substrate || safePlant.medium || '').trim() || null,
      cultivationMethod: String(safePlant.cultivationMethod || safePlant.growMethod || '').trim() || null,
      lightConditions: String(safePlant.lightConditions || safePlant.light || '').trim() || null,
      strain: String(safePlant.strain || '').trim() || null,
      plantType: String(safePlant.plantType || 'unknown').trim().toLowerCase(),
      userContext: safePlant.userContext && typeof safePlant.userContext === 'object' ? { ...safePlant.userContext } : null
    };
  }

  function buildCareContext(source, plantId, options = {}) {
    const normalized = stateApi && typeof stateApi.normalizeBuddyCareState === 'function'
      ? stateApi.normalizeBuddyCareState(source && source.buddyCare ? source.buddyCare : source)
      : (source && source.buddyCare ? source.buddyCare : source || {});
    const safePlantId = String(plantId || '').trim();
    const nowMs = normalizeNow(options.now);
    const plant = toArray(normalized.plants).find((entry) => String(entry && entry.id || '').trim() === safePlantId) || null;
    const checks = sortNewest(toArray(normalized.dailyChecks).filter((entry) => entry && entry.plantId === safePlantId));
    const diaryEntries = sortNewest(toArray(normalized.diaryEntries).filter((entry) => entry && entry.plantId === safePlantId));
    const intelligence = normalized.intelligence && typeof normalized.intelligence === 'object'
      ? normalized.intelligence
      : { actions: [], questionAnswers: [], insights: [], plantPatterns: [] };
    const actions = sortNewest(toArray(intelligence.actions).filter((entry) => entry && entry.plantId === safePlantId));
    const questionAnswers = sortNewest(toArray(intelligence.questionAnswers).filter((entry) => entry && entry.plantId === safePlantId));
    const insights = sortNewest(toArray(intelligence.insights).filter((entry) => entry && entry.plantId === safePlantId));
    const plantPattern = toArray(intelligence.plantPatterns).find((entry) => entry && entry.plantId === safePlantId) || null;
    const currentCheck = checks[0] || null;
    const answers = buildAnswerMap(questionAnswers, nowMs);
    const wateringDiary = diaryEntries.find((entry) => toArray(entry && entry.tags).includes('watering')) || null;
    const lastWateringAt = findLatestActionTimestamp(actions, ['water', 'water_if_dry', 'confirmed_watering'])
      || (wateringDiary ? recordTimestamp(wateringDiary) : null);
    const lastFeedingAt = findLatestActionTimestamp(actions, ['feed', 'light_feed', 'balanced_feed'])
      || (answers.recent_feeding === 'yes' ? recordTimestamp(questionAnswers.find((entry) => entry.questionId === 'recent_feeding')) : null);
    const photoRecords = checks.concat(diaryEntries).filter((entry) => toArray(entry && entry.photoIds).length > 0);
    const latestPhotoAt = photoRecords.length ? Math.max(...photoRecords.map((entry) => Number(recordTimestamp(entry) || 0))) : null;
    const activeFollowUp = actions.find((action) => action && ['performed', 'effect_pending'].includes(String(action.status || ''))) || null;
    const followUpPhotoPresent = Boolean(activeFollowUp && photoRecords.some((entry) => Number(recordTimestamp(entry) || 0) >= Number(recordTimestamp(activeFollowUp) || 0)));

    return Object.freeze({
      plantId: safePlantId,
      generatedAt: nowMs,
      profile: buildPlantProfile(plant, nowMs),
      plant,
      currentCheck,
      checks,
      diaryEntries,
      actions,
      questionAnswers,
      answers,
      previousInsights: insights,
      plantPattern,
      derived: Object.freeze({
        lastCheckAt: currentCheck ? recordTimestamp(currentCheck) : null,
        lastWateringAt,
        lastFeedingAt,
        photoPresent: photoRecords.length > 0,
        currentCheckPhotoCount: toArray(currentCheck && currentCheck.photoIds).length,
        latestPhotoAt,
        followUpPhotoPresent,
        checkCount: checks.length,
        diaryCount: diaryEntries.length
      })
    });
  }

  const api = Object.freeze({
    buildCareContext,
    timestampOf: recordTimestamp
  });

  globalScope.GrowSimCareContextBuilder = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
