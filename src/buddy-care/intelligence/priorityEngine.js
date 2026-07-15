'use strict';

(function attachGrowSimCarePriorityEngine(globalScope) {
  function toArray(value) { return Array.isArray(value) ? value : []; }

  function determineCarePriority(context, trend, causes) {
    const rawCheck = context && context.currentCheck || null;
    const answers = context && context.answers || {};
    const check = rawCheck ? {
      ...rawCheck,
      mediumMoisture: (!rawCheck.mediumMoisture || rawCheck.mediumMoisture === 'unknown') && answers.medium_moisture
        ? answers.medium_moisture
        : rawCheck.mediumMoisture,
      pestsVisible: rawCheck.pestsVisible === 'unsure' && answers.pests_visible
        ? answers.pests_visible
        : rawCheck.pestsVisible
    } : null;
    const reasons = [];
    let score = 0;
    if (!check) {
      return Object.freeze({ level: 'routine', score: 10, reasons: Object.freeze(['daily_check_missing']), primaryActionId: 'start_daily_check' });
    }
    if (check.pestsVisible === 'yes') { score += 70; reasons.push('pests_visible'); }
    if (check.leafState && !['normal', 'unknown'].includes(check.leafState)) { score += 12; reasons.push('leaf_change'); }
    if (check.environmentStress && !['normal', 'unknown'].includes(check.environmentStress)) { score += 10; reasons.push('environment_change'); }
    if (check.pestsVisible === 'unsure') { score += 10; reasons.push('pests_uncertain'); }
    if (check.mediumMoisture === 'dry' && check.leafState === 'hanging') { score += 65; reasons.push('dry_and_hanging'); }
    if (check.mediumMoisture === 'wet' && check.leafState === 'hanging') { score += 42; reasons.push('wet_and_hanging'); }
    if (trend && trend.direction === 'worsening') { score += 35 * Number(trend.confidence || 0); reasons.push('worsening_trend'); }
    if (toArray(trend && trend.contradictions).length) { score += 18; reasons.push('critical_data_contradiction'); }
    if (toArray(trend && trend.signals).includes('check_overdue_for_pattern')) { score += 14; reasons.push('check_overdue_for_pattern'); }
    if (toArray(trend && trend.signals).includes('action_no_improvement')) { score += 16; reasons.push('action_no_improvement'); }
    const topCause = toArray(causes)[0] || null;
    if (topCause) score += Number(topCause.confidence || 0) * 18;
    const activeFollowUp = toArray(context && context.actions).find((action) => (
      action && action.status === 'effect_pending' && Number(action.controlDueAt || 0) <= Number(context.generatedAt || Date.now())
    ));
    if (activeFollowUp) { score += 25; reasons.push('effect_check_due'); }

    let level = 'no_action';
    if (score >= 65) level = 'urgent_check';
    else if (score >= 30) level = 'today';
    else if (score >= 12 || (trend && trend.direction === 'worsening') || (topCause && topCause.id !== 'insufficient_data')) level = 'observe';
    else if (trend && trend.direction === 'stable') level = 'no_action';
    else level = 'routine';

    if (topCause && topCause.id === 'insufficient_data' && level === 'urgent_check') level = 'today';
    const checkIsOverdue = toArray(trend && trend.signals).includes('check_overdue_for_pattern');
    const hasCurrentRapidRisk = check.pestsVisible === 'yes'
      || (check.leafState === 'hanging' && ['dry', 'wet'].includes(check.mediumMoisture));
    if (checkIsOverdue && !hasCurrentRapidRisk && level === 'urgent_check') level = 'today';

    const primaryActionId = activeFollowUp && level !== 'urgent_check'
      ? 'review_action_effect'
      : (level === 'no_action' ? 'observe_two_days' : (topCause && topCause.actionId || 'start_daily_check'));
    return Object.freeze({ level, score: Math.round(score), reasons: Object.freeze(reasons), primaryActionId });
  }

  const api = Object.freeze({ determineCarePriority });
  globalScope.GrowSimCarePriorityEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
