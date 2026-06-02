'use strict';

function createScoringDiagnostic(input) {
  const value = input || {};
  return Object.freeze({
    code: value.code || 'scoring_info',
    severity: value.severity || 'info',
    message: value.message || 'No scoring diagnostic message provided.',
    details: Object.freeze(value.details || {})
  });
}

module.exports = Object.freeze({
  createScoringDiagnostic
});

