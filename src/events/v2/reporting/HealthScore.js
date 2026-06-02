'use strict';

const { normalizeSeverity } = require('../validation/DiagnosticSeverity');
const { normalizeRuleFamily } = require('../validation/RuleFamily');
const { resolveRuleFamilyWeight } = require('../validation/RuleFamilyWeights');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const SEVERITY_BASE_PENALTY = Object.freeze({
  blocker: 30,
  error: 10,
  warning: 2,
  info: 0.25
});

function computeHealthScore(input) {
  const value = input || {};
  const diagnostics = Array.isArray(value.diagnostics) ? value.diagnostics : [];
  const coverage = value.coverage || {};
  let blocker = Number(value.blocker || 0);
  let error = Number(value.error || 0);
  let warning = Number(value.warning || 0);
  let info = Number(value.info || 0);
  let penalty = 0;

  if (diagnostics.length > 0) {
    blocker = 0;
    error = 0;
    warning = 0;
    info = 0;
    diagnostics.forEach((diag) => {
      const severity = normalizeSeverity(diag && diag.severity);
      const family = normalizeRuleFamily(diag && diag.ruleFamily);
      const familyWeight = resolveRuleFamilyWeight(family, value.ruleFamilyWeights);
      const base = Number(SEVERITY_BASE_PENALTY[severity] || 0);
      penalty += base * familyWeight;
      if (severity === 'blocker') blocker += 1;
      if (severity === 'error') error += 1;
      if (severity === 'warning') warning += 1;
      if (severity === 'info') info += 1;
    });
  } else {
    penalty = (blocker * 30) + (error * 10) + (warning * 2) + (info * 0.25);
  }

  const base = 100 - penalty;
  const score = clamp(Number(base.toFixed(2)), 0, 100);

  const hints = [];
  if (Number(coverage.events || 0) === 0) hints.push('No event examples detected.');
  if (Number(coverage.chains || 0) === 0) hints.push('No chain examples detected.');
  if (Number(coverage.learningCards || 0) === 0) hints.push('No learning-card examples detected.');
  if (Number(coverage.unknown || 0) > 0) hints.push('Unknown example kinds detected.');

  return Object.freeze({
    score: score,
    penalty: Number(penalty.toFixed(2)),
    breakdown: Object.freeze({ blocker, error, warning, info }),
    coverageHints: Object.freeze(hints)
  });
}

module.exports = Object.freeze({
  computeHealthScore
});
