'use strict';

/**
 * Eligibility result stub.
 * TODO: stage/setup/category and quality-rule checks in Phase 4+.
 */
function createEligibilityResult(input) {
  const value = input || {};
  const score = typeof value.score === 'number' ? value.score : (Boolean(value.eligible) ? 100 : 0);

  return Object.freeze({
    eligible: Boolean(value.eligible),
    score: score,
    reasons: Object.freeze(value.reasons || []),
    warnings: Object.freeze(value.warnings || [])
  });
}

module.exports = Object.freeze({
  createEligibilityResult
});
