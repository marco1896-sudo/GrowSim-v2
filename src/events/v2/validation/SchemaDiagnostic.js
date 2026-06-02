'use strict';

const RuleScope = require('./RuleScope');
const { normalizeSeverity } = require('./DiagnosticSeverity');

function createSchemaDiagnostic(input) {
  const value = input || {};
  return Object.freeze({
    scope: 'schema',
    ruleFamily: value.ruleFamily || 'schema',
    ruleScope: value.ruleScope || RuleScope.REQUIRED,
    ruleId: value.ruleId || 'schema_unknown_rule',
    severity: normalizeSeverity(value.severity),
    fileName: value.fileName || null,
    message: value.message || 'Schema diagnostic emitted.',
    details: Object.freeze(value.details || {})
  });
}

module.exports = Object.freeze({
  createSchemaDiagnostic
});
