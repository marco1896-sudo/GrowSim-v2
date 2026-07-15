'use strict';

(function attachGrowSimCareInsightEngine(globalScope) {
  const contextBuilder = globalScope.GrowSimCareContextBuilder || (typeof require === 'function' ? require('./contextBuilder.js') : null);
  const trendAnalyzer = globalScope.GrowSimCareTrendAnalyzer || (typeof require === 'function' ? require('./trendAnalyzer.js') : null);
  const causeScorer = globalScope.GrowSimCareCauseScorer || (typeof require === 'function' ? require('./causeScorer.js') : null);
  const priorityEngine = globalScope.GrowSimCarePriorityEngine || (typeof require === 'function' ? require('./priorityEngine.js') : null);
  const questionEngine = globalScope.GrowSimCareQuestionEngine || (typeof require === 'function' ? require('./questionEngine.js') : null);
  const actionTracker = globalScope.GrowSimCareActionTracker || (typeof require === 'function' ? require('./actionTracker.js') : null);
  const profileLearner = globalScope.GrowSimCareProfileLearner || (typeof require === 'function' ? require('./profileLearner.js') : null);
  const safetyRules = globalScope.GrowSimCareSafetyRules || (typeof require === 'function' ? require('./safetyRules.js') : null);

  function toArray(value) { return Array.isArray(value) ? value : []; }
  function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

  function insightCopy(status, priority, trend, hasCheck) {
    if (!hasCheck) return { headlineKey: 'buddyCare.intelligence.headline.need_check', summaryKey: 'buddyCare.intelligence.summary.need_check' };
    if (toArray(trend && trend.signals).includes('action_no_improvement')) {
      return { headlineKey: 'buddyCare.intelligence.headline.reassess', summaryKey: 'buddyCare.intelligence.summary.reassess' };
    }
    if (trend && trend.direction === 'worsening') {
      return { headlineKey: 'buddyCare.intelligence.headline.worsening', summaryKey: 'buddyCare.intelligence.summary.worsening' };
    }
    if (trend && trend.direction === 'improving') {
      return { headlineKey: 'buddyCare.intelligence.headline.improving', summaryKey: 'buddyCare.intelligence.summary.improving' };
    }
    if (status === 'stable' && priority === 'no_action') {
      return { headlineKey: 'buddyCare.intelligence.headline.stable', summaryKey: 'buddyCare.intelligence.summary.stable' };
    }
    return { headlineKey: 'buddyCare.intelligence.headline.watch', summaryKey: 'buddyCare.intelligence.summary.observe' };
  }

  function buildCareInsight(source, plantId, options = {}) {
    const context = options.context || contextBuilder.buildCareContext(source, plantId, { now: options.now });
    const trend = trendAnalyzer.analyzeCareTrends(context);
    const causes = causeScorer.scorePossibleCauses(context, trend);
    const priority = priorityEngine.determineCarePriority(context, trend, causes);
    const dueFollowUps = actionTracker.getDueEffectFollowUps(context.actions, { now: context.generatedAt });
    const candidateIds = [];
    if (priority.level === 'urgent_check' && priority.primaryActionId) candidateIds.push(priority.primaryActionId);
    if (dueFollowUps.length) candidateIds.push('review_action_effect');
    if (priority.primaryActionId) candidateIds.push(priority.primaryActionId);
    causes.forEach((cause) => { if (cause && cause.actionId) candidateIds.push(cause.actionId); });
    const safePlan = safetyRules.applyCareSafetyRules(candidateIds, context, trend, causes, priority);
    const hasOpenAction = context.actions.some((action) => action && ['confirmed', 'performed', 'effect_pending'].includes(String(action.status || '')));
    const questionSelection = dueFollowUps.length || hasOpenAction
      ? { primaryQuestion: null, secondaryQuestion: null }
      : questionEngine.selectPrimaryCareQuestion(context, causes, trend);
    const plantPattern = profileLearner.derivePlantPatterns(context, trend);
    const topCauseConfidence = causes[0] && causes[0].id !== 'insufficient_data' ? Number(causes[0].confidence || 0) : 0.15;
    const dataConfidence = Math.min(1, Number(context.derived && context.derived.checkCount || 0) / 3);
    const confidence = clamp01((Number(trend.confidence || 0) * 0.3) + (topCauseConfidence * 0.5) + (dataConfidence * 0.2));
    const status = priority.level === 'urgent_check' || priority.level === 'today'
      ? 'attention'
      : (priority.level === 'observe' ? 'watch' : (context.currentCheck ? 'stable' : 'unknown'));
    const copy = insightCopy(status, priority.level, trend, Boolean(context.currentCheck));
    const sourceCheckId = String(context.currentCheck && context.currentCheck.id || '').trim() || null;
    const generatedAt = Number(context.generatedAt || Date.now());
    const supportingSignals = Array.from(new Set([
      ...toArray(trend.signals),
      ...toArray(priority.reasons),
      ...toArray(causes[0] && causes[0].supportingSignals)
    ])).slice(0, 20);
    const insight = Object.freeze({
      id: `care-insight-${String(context.plantId || '').trim()}-${sourceCheckId || 'no-check'}-${Math.trunc(generatedAt)}`,
      plantId: String(context.plantId || '').trim(),
      generatedAt,
      sourceCheckId,
      status,
      priority: priority.level,
      headlineKey: copy.headlineKey,
      summaryKey: copy.summaryKey,
      trend,
      possibleCauses: causes,
      primaryQuestion: questionSelection.primaryQuestion,
      recommendedActions: safePlan.actions,
      activeFollowUps: Object.freeze(dueFollowUps.map((action) => action.id)),
      safetyNotes: safePlan.safetyNotes,
      confidence: Math.round(confidence * 1000) / 1000,
      supportingSignals: Object.freeze(supportingSignals)
    });
    return Object.freeze({ context, insight, plantPattern, dueFollowUps });
  }

  const api = Object.freeze({ buildCareInsight });
  globalScope.GrowSimCareInsightEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
