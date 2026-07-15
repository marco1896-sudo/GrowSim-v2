'use strict';

(function attachGrowSimCareTrendAnalyzer(globalScope) {
  const contextApi = globalScope.GrowSimCareContextBuilder
    || (typeof require === 'function' ? require('./contextBuilder.js') : null);

  const DAY_MS = 24 * 60 * 60 * 1000;

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function timestampOf(record) {
    return contextApi && typeof contextApi.timestampOf === 'function'
      ? contextApi.timestampOf(record)
      : Date.parse(String(record && (record.createdAtIso || record.dayKey) || ''));
  }

  function checkSeverity(check) {
    const safe = check && typeof check === 'object' ? check : {};
    let severity = 0;
    if (safe.mediumMoisture === 'dry' || safe.mediumMoisture === 'wet') severity += 0.7;
    if (safe.leafState === 'hanging' || safe.leafState === 'curling' || safe.leafState === 'yellowing') severity += 1;
    if (safe.leafState === 'spots') severity += 1.25;
    if (safe.growthState === 'slow') severity += 0.8;
    if (safe.environmentStress && !['normal', 'unknown'].includes(safe.environmentStress)) severity += 0.8;
    if (safe.pestsVisible === 'unsure') severity += 0.5;
    if (safe.pestsVisible === 'yes') severity += 2;
    return Math.round(Math.min(5, severity) * 100) / 100;
  }

  function signalSet(check) {
    const safe = check && typeof check === 'object' ? check : {};
    const signals = [];
    if (safe.mediumMoisture === 'wet') signals.push('repeated_wet');
    if (safe.mediumMoisture === 'dry') signals.push('repeated_dry');
    if (safe.leafState && !['normal', 'unknown'].includes(safe.leafState)) signals.push(`leaf_${safe.leafState}`);
    if (safe.growthState === 'slow') signals.push('growth_slow');
    if (safe.environmentStress && !['normal', 'unknown'].includes(safe.environmentStress)) signals.push(`environment_${safe.environmentStress}`);
    if (safe.pestsVisible === 'yes' || safe.pestsVisible === 'unsure') signals.push(`pests_${safe.pestsVisible}`);
    return signals;
  }

  function median(values) {
    const sorted = toArray(values).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function getCheckIntervals(checks) {
    const ascending = toArray(checks).slice().sort((left, right) => Number(timestampOf(left) || 0) - Number(timestampOf(right) || 0));
    const intervals = [];
    for (let index = 1; index < ascending.length; index += 1) {
      const current = timestampOf(ascending[index]);
      const previous = timestampOf(ascending[index - 1]);
      if (Number.isFinite(current) && Number.isFinite(previous)) {
        const days = (current - previous) / DAY_MS;
        if (days > 0 && days <= 30) intervals.push(days);
      }
    }
    return intervals;
  }

  function detectContradictions(checks, actions) {
    const newest = toArray(checks).slice(0, 4);
    const contradictions = [];
    for (let index = 0; index < newest.length - 1; index += 1) {
      const current = newest[index];
      const previous = newest[index + 1];
      const currentAt = timestampOf(current);
      const previousAt = timestampOf(previous);
      if (!Number.isFinite(currentAt) || !Number.isFinite(previousAt) || currentAt - previousAt > DAY_MS) continue;
      const hasWateringBetween = toArray(actions).some((action) => {
        const at = Number(action && (action.performedAt || action.updatedAt) || 0);
        return ['water', 'water_if_dry', 'confirmed_watering'].includes(String(action && action.actionId || ''))
          && at >= previousAt && at <= currentAt;
      });
      if (!hasWateringBetween && ((current.mediumMoisture === 'dry' && previous.mediumMoisture === 'wet')
        || (current.mediumMoisture === 'wet' && previous.mediumMoisture === 'dry'))) {
        contradictions.push('moisture_changed_quickly');
      }
      if ((current.pestsVisible === 'yes' && previous.pestsVisible === 'no')
        || (current.pestsVisible === 'no' && previous.pestsVisible === 'yes')) {
        contradictions.push('pest_report_changed_quickly');
      }
    }
    return Array.from(new Set(contradictions));
  }

  function analyzeCareTrends(context) {
    const checks = toArray(context && context.checks);
    const newest = checks.slice(0, 6);
    const insufficientData = [];
    const signals = [];
    const recurringPatterns = [];
    const contradictions = detectContradictions(newest, context && context.actions);
    const severities = newest.map(checkSeverity);
    let direction = 'unknown';
    let confidence = 0;

    if (newest.length < 2) {
      insufficientData.push('need_two_checks');
      confidence = newest.length ? 0.15 : 0;
    } else {
      const recent = severities.slice(0, Math.min(3, severities.length)).reverse();
      const totalDelta = recent[recent.length - 1] - recent[0];
      const rising = recent.length >= 3 && recent.every((value, index) => index === 0 || value >= recent[index - 1]);
      const falling = recent.every((value, index) => index === 0 || value <= recent[index - 1]);
      if (recent.length >= 3 && rising && totalDelta >= 1.1) {
        direction = 'worsening';
        confidence = clamp01(0.48 + (recent.length * 0.1) + (Math.min(2.5, totalDelta) * 0.08));
        signals.push('progressive_worsening');
      } else if (falling && totalDelta <= -1.1) {
        direction = 'improving';
        confidence = clamp01(0.42 + (recent.length * 0.1) + (Math.min(2.5, Math.abs(totalDelta)) * 0.08));
        signals.push('progressive_improvement');
      } else {
        direction = 'stable';
        confidence = clamp01(0.35 + Math.min(0.4, newest.length * 0.08));
        signals.push('no_clear_direction');
      }
    }

    const recentSignalSets = newest.slice(0, 3).map(signalSet);
    const signalCounts = {};
    recentSignalSets.forEach((set) => set.forEach((signal) => { signalCounts[signal] = (signalCounts[signal] || 0) + 1; }));
    Object.entries(signalCounts).forEach(([signal, count]) => {
      if (count >= 2) recurringPatterns.push(signal);
    });
    if (recurringPatterns.includes('repeated_wet')) signals.push('substrate_repeatedly_wet');
    if (recurringPatterns.includes('repeated_dry')) signals.push('substrate_repeatedly_dry');
    if (recurringPatterns.some((entry) => entry.startsWith('leaf_'))) signals.push('same_leaf_issue_recurring');

    const latestSignals = new Set(recentSignalSets[0] || []);
    const olderSignals = new Set([...(recentSignalSets[1] || []), ...(recentSignalSets[2] || [])]);
    const newSignals = Array.from(latestSignals).filter((signal) => !olderSignals.has(signal));
    if (newSignals.length) signals.push('new_issue');

    const recentSlowGrowth = newest.slice(0, 3).filter((check) => check && check.growthState === 'slow').length;
    if (recentSlowGrowth >= 2) {
      signals.push('growth_stagnating');
      recurringPatterns.push('growth_slow');
    }

    const intervals = getCheckIntervals(checks);
    const medianIntervalDays = median(intervals);
    const latestAt = newest[0] ? timestampOf(newest[0]) : null;
    const daysSinceLastCheck = Number.isFinite(latestAt)
      ? Math.max(0, (Number(context && context.generatedAt || Date.now()) - latestAt) / DAY_MS)
      : null;
    if (intervals.length >= 2 && Number.isFinite(daysSinceLastCheck)
      && daysSinceLastCheck > Math.max(3, Number(medianIntervalDays) * 2.2)) {
      signals.push('check_overdue_for_pattern');
      if (severities[0] > 0) signals.push('attention_check_overdue');
    }

    const actions = toArray(context && context.actions);
    if (actions.some((action) => action && action.status === 'improved')) signals.push('action_helped');
    if (actions.some((action) => action && ['unchanged', 'worsened'].includes(action.status))) signals.push('action_no_improvement');
    const performedActions = actions.filter((action) => action && ['performed', 'effect_pending', 'improved', 'unchanged', 'worsened'].includes(action.status));
    const recentInterventions = performedActions.filter((action) => {
      const at = Number(action.performedAt || action.updatedAt || action.createdAt || 0);
      return at > 0 && Number(context && context.generatedAt || Date.now()) - at <= 3 * DAY_MS;
    });
    if (recentInterventions.length >= 4) signals.push('care_interventions_frequent');
    const wateringTimes = performedActions
      .filter((action) => ['water', 'water_if_dry', 'confirmed_watering'].includes(String(action.actionId || '')))
      .map((action) => Number(action.performedAt || action.updatedAt || action.createdAt || 0))
      .filter((value) => value > 0)
      .sort((left, right) => left - right);
    if (wateringTimes.length >= 5) {
      const wateringIntervals = [];
      for (let index = 1; index < wateringTimes.length; index += 1) {
        const days = (wateringTimes[index] - wateringTimes[index - 1]) / DAY_MS;
        if (days >= 0.25 && days <= 30) wateringIntervals.push(days);
      }
      if (wateringIntervals.length >= 4) {
        const split = Math.floor(wateringIntervals.length / 2);
        const olderMedian = median(wateringIntervals.slice(0, split));
        const recentMedian = median(wateringIntervals.slice(split));
        if (Number.isFinite(olderMedian) && Number.isFinite(recentMedian)) {
          if (recentMedian <= olderMedian * 0.75) signals.push('water_demand_increasing');
          if (recentMedian >= olderMedian * 1.35) signals.push('water_demand_decreasing');
        }
      }
    }
    if ((recentSignalSets[0] || []).length >= 3 || severities[0] >= 3) signals.push('multiple_risk_signals');

    if (contradictions.length) {
      confidence = clamp01(confidence - Math.min(0.25, contradictions.length * 0.12));
    }

    return Object.freeze({
      direction,
      confidence: Math.round(confidence * 1000) / 1000,
      signals: Object.freeze(Array.from(new Set(signals))),
      recurringPatterns: Object.freeze(Array.from(new Set(recurringPatterns))),
      contradictions: Object.freeze(contradictions),
      insufficientData: Object.freeze(insufficientData),
      metrics: Object.freeze({
        checkCount: checks.length,
        latestSeverity: severities[0] == null ? null : severities[0],
        medianCheckIntervalDays: Number.isFinite(medianIntervalDays) ? Math.round(medianIntervalDays * 10) / 10 : null,
        daysSinceLastCheck: Number.isFinite(daysSinceLastCheck) ? Math.round(daysSinceLastCheck * 10) / 10 : null
      })
    });
  }

  const api = Object.freeze({ analyzeCareTrends, checkSeverity, median });
  globalScope.GrowSimCareTrendAnalyzer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
