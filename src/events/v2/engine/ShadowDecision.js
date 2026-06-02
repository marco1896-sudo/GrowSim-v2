'use strict';

/**
 * Shadow decision record contract (read-only).
 */
function createShadowDecision(input) {
  const value = input || {};

  return Object.freeze({
    decisionId: value.decisionId || null,
    candidateId: value.candidateId || null,
    decisionType: value.decisionType || 'noop',
    score: Number(value.score) || 0,
    reason: value.reason || 'stub_noop',
    details: Object.freeze(value.details || {})
  });
}

module.exports = Object.freeze({
  createShadowDecision
});
