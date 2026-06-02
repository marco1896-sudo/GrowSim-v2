'use strict';

const { createBaselineEvolutionRule } = require('./BaselineEvolutionRule');

function isWorseTraffic(from, to) {
  const order = { gray: 0, green: 1, yellow: 2, red: 3 };
  return (order[to] || 0) > (order[from] || 0);
}

function createBaselineEvolutionPolicy() {
  const rules = [
    createBaselineEvolutionRule({
      id: 'expected_and_approved_changes',
      description: 'Baseline can evolve when changes are expected and approved.',
      evaluate: (ctx) => {
        const unexpected = (ctx.unexpectedChanges || []).length;
        if (unexpected > 0) return { status: 'requiresReview', reason: 'Unexpected changes detected: ' + unexpected };
        return { status: 'allow', reason: 'All changes expected.' };
      }
    }),
    createBaselineEvolutionRule({
      id: 'no_new_blockers_without_review',
      description: 'New blockers/errors require review gate.',
      evaluate: (ctx) => {
        const newBlockers = Number(ctx.newBlockers || 0);
        const newErrors = Number(ctx.newErrors || 0);
        if (newBlockers > 0 || newErrors > 0) return { status: 'requiresReview', reason: 'New blockers/errors present.' };
        return { status: 'allow', reason: 'No new blockers/errors.' };
      }
    }),
    createBaselineEvolutionRule({
      id: 'traffic_regression_requires_review',
      description: 'green->yellow or yellow->red requires review.',
      evaluate: (ctx) => {
        const regressions = (ctx.trafficChanges || []).filter((c) => isWorseTraffic(c.fromTrafficLight, c.toTrafficLight));
        if (regressions.length > 0) return { status: 'requiresReview', reason: 'Traffic regressions: ' + regressions.length };
        return { status: 'allow', reason: 'No traffic regressions.' };
      }
    }),
    createBaselineEvolutionRule({
      id: 'improvements_allowed',
      description: 'red->yellow or yellow->green can be marked as improvement.',
      evaluate: (ctx) => {
        const improvements = Number(ctx.improvements || 0);
        return { status: 'allow', reason: 'Improvements detected: ' + improvements };
      }
    })
  ];

  function evaluate(context) {
    const results = rules.map((rule) => Object.freeze({ id: rule.id, outcome: rule.evaluate(context || {}) }));
    const hasReject = results.some((r) => r.outcome.status === 'reject');
    if (hasReject) return Object.freeze({ decision: 'reject', results, policyVersion: 'v1' });
    const hasReview = results.some((r) => r.outcome.status === 'requiresReview');
    if (hasReview) return Object.freeze({ decision: 'requiresReview', results, policyVersion: 'v1' });
    return Object.freeze({ decision: 'allow', results, policyVersion: 'v1' });
  }

  return Object.freeze({ evaluate });
}

module.exports = Object.freeze({ createBaselineEvolutionPolicy });
