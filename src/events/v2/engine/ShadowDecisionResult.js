'use strict';

/**
 * Final shadow evaluation payload contract.
 */
function createShadowDecisionResult(input) {
  const value = input || {};

  return Object.freeze({
    ok: Boolean(value.ok),
    contractVersion: 'phase-3-shadow-stub',
    contextErrors: Object.freeze(value.contextErrors || []),
    diagnostics: Object.freeze(value.diagnostics || []),
    decisions: Object.freeze(value.decisions || []),
    summary: Object.freeze(value.summary || {
      evaluatedCandidates: 0,
      selectedCandidates: 0,
      noop: true
    })
  });
}

module.exports = Object.freeze({
  createShadowDecisionResult
});
