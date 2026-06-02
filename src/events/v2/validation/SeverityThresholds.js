'use strict';

const RuleScope = require('./RuleScope');
const { DiagnosticSeverity, normalizeSeverity } = require('./DiagnosticSeverity');

const MISSING_FIELD_DEFAULT = Object.freeze({
  required: DiagnosticSeverity.BLOCKER,
  recommended: DiagnosticSeverity.WARNING,
  optional: DiagnosticSeverity.INFO,
  future: DiagnosticSeverity.INFO
});

function missingFieldSeverity(scope, type) {
  if (scope === RuleScope.REQUIRED && type === 'chain') {
    return DiagnosticSeverity.ERROR;
  }
  return MISSING_FIELD_DEFAULT[scope] || DiagnosticSeverity.WARNING;
}

function invalidReferenceSeverity(type) {
  return type === 'chain' ? DiagnosticSeverity.BLOCKER : DiagnosticSeverity.ERROR;
}

function resolveSeverity(baseSeverity, overrideSeverity) {
  if (overrideSeverity) {
    return normalizeSeverity(overrideSeverity);
  }
  return normalizeSeverity(baseSeverity);
}

module.exports = Object.freeze({
  missingFieldSeverity,
  invalidReferenceSeverity,
  resolveSeverity
});

