'use strict';

(function attachGrowSimCareProfileLearner(globalScope) {
  const trendApi = globalScope.GrowSimCareTrendAnalyzer
    || (typeof require === 'function' ? require('./trendAnalyzer.js') : null);
  const contextApi = globalScope.GrowSimCareContextBuilder
    || (typeof require === 'function' ? require('./contextBuilder.js') : null);

  const DAY_MS = 24 * 60 * 60 * 1000;

  function toArray(value) { return Array.isArray(value) ? value : []; }
  function timestampOf(value) { return contextApi && contextApi.timestampOf ? contextApi.timestampOf(value) : null; }
  function median(values) { return trendApi && trendApi.median ? trendApi.median(values) : null; }

  function intervalsFromTimestamps(values) {
    const sorted = toArray(values).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    const intervals = [];
    for (let index = 1; index < sorted.length; index += 1) {
      const days = (sorted[index] - sorted[index - 1]) / DAY_MS;
      if (days >= 0.25 && days <= 30) intervals.push(days);
    }
    return intervals;
  }

  function derivePlantPatterns(context, trend) {
    const checks = toArray(context && context.checks);
    const actions = toArray(context && context.actions);
    const diaryEntries = toArray(context && context.diaryEntries);
    const checkIntervals = intervalsFromTimestamps(checks.map(timestampOf));
    const wateringTimes = actions
      .filter((action) => ['water', 'water_if_dry', 'confirmed_watering'].includes(String(action && action.actionId || ''))
        && ['performed', 'effect_pending', 'improved', 'unchanged', 'worsened'].includes(String(action && action.status || '')))
      .map((action) => Number(action.performedAt || action.updatedAt || action.createdAt))
      .concat(diaryEntries.filter((entry) => toArray(entry && entry.tags).includes('watering')).map(timestampOf));
    const wateringIntervals = intervalsFromTimestamps(Array.from(new Set(wateringTimes)));
    const helped = actions.filter((action) => action && action.status === 'improved').map((action) => String(action.actionId || '')).filter(Boolean);
    const ineffective = actions.filter((action) => action && ['unchanged', 'worsened'].includes(action.status)).map((action) => String(action.actionId || '')).filter(Boolean);
    const recurring = toArray(trend && trend.recurringPatterns);
    const sampleCount = checks.length + actions.length;
    const confidence = Math.max(0, Math.min(1, sampleCount < 3 ? 0 : 0.25 + Math.min(0.65, sampleCount * 0.06)));
    const wateringMedian = wateringIntervals.length >= 2 ? median(wateringIntervals) : null;
    const checkMedian = checkIntervals.length >= 2 ? median(checkIntervals) : null;

    return Object.freeze({
      id: `plant-pattern-${String(context && context.plantId || '').trim()}`,
      plantId: String(context && context.plantId || '').trim(),
      updatedAt: Number(context && context.generatedAt || Date.now()),
      confidence: Math.round(confidence * 1000) / 1000,
      metrics: Object.freeze({
        checkSampleCount: checks.length,
        medianCheckIntervalDays: Number.isFinite(checkMedian) ? Math.round(checkMedian * 10) / 10 : null,
        wateringSampleCount: wateringTimes.length,
        medianWateringIntervalDays: Number.isFinite(wateringMedian) ? Math.round(wateringMedian * 10) / 10 : null,
        typicalWateringRangeDays: Number.isFinite(wateringMedian)
          ? [Math.max(0.5, Math.round((wateringMedian - 0.75) * 10) / 10), Math.round((wateringMedian + 0.75) * 10) / 10]
          : null,
        recurringPatterns: recurring.slice(0, 6),
        helpfulActions: Array.from(new Set(helped)).slice(0, 6),
        ineffectiveActions: Array.from(new Set(ineffective)).slice(0, 6)
      })
    });
  }

  const api = Object.freeze({ derivePlantPatterns });
  globalScope.GrowSimCareProfileLearner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
