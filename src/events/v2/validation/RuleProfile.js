'use strict';

function createRuleProfile(input) {
  const value = input || {};
  return Object.freeze({
    type: value.type || 'unknown',
    requiredFields: Object.freeze(value.requiredFields || []),
    recommendedFields: Object.freeze(value.recommendedFields || []),
    optionalFields: Object.freeze(value.optionalFields || []),
    futureFields: Object.freeze(value.futureFields || []),
    severityOverrides: Object.freeze(value.severityOverrides || {})
  });
}

module.exports = Object.freeze({
  createRuleProfile
});

