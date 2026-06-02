'use strict';

const RuleScope = require('./RuleScope');
const { normalizeSeverity } = require('./DiagnosticSeverity');

function createValidationDiagnostic(input) {
  const value = input || {};
  return Object.freeze({
    scope: value.scope || 'validation',
    ruleFamily: value.ruleFamily || 'future',
    ruleScope: value.ruleScope || RuleScope.RECOMMENDED,
    ruleId: value.ruleId || 'unknown_rule',
    severity: normalizeSeverity(value.severity),
    fileName: value.fileName || null,
    message: value.message || 'No diagnostic message provided.',
    details: Object.freeze(value.details || {})
  });
}

module.exports = Object.freeze({
  createValidationDiagnostic
});
