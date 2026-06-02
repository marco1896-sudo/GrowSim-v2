'use strict';

const RuleScope = require('./RuleScope');
const { ORDER, normalizeSeverity } = require('./DiagnosticSeverity');
const { normalizeRuleFamily } = require('./RuleFamily');

function ensureSet(value) {
  if (!value) return null;
  if (Array.isArray(value)) return new Set(value);
  return new Set([value]);
}

function includeByMinSeverity(diagnostic, minimumSeverity) {
  if (!minimumSeverity) return true;
  const current = ORDER[normalizeSeverity(diagnostic && diagnostic.severity)] || 0;
  const min = ORDER[normalizeSeverity(minimumSeverity)] || 0;
  return current >= min;
}

function filterDiagnostics(diagnostics, options) {
  const value = options || {};
  const allowedScopes = ensureSet(value.ruleScope || null);
  const allowedFamilies = ensureSet(value.ruleFamily || null);
  const allowedEntryKinds = ensureSet(value.entryKind || null);

  return Object.freeze((Array.isArray(diagnostics) ? diagnostics : []).filter((diag) => {
    if (!includeByMinSeverity(diag, value.minimumSeverity)) return false;

    if (allowedScopes && !allowedScopes.has((diag && diag.ruleScope) || RuleScope.RECOMMENDED)) {
      return false;
    }

    if (allowedFamilies && !allowedFamilies.has(normalizeRuleFamily(diag && diag.ruleFamily))) {
      return false;
    }

    if (allowedEntryKinds) {
      const kind = (diag && diag.details && diag.details.entryKind) || (diag && diag.entryKind) || 'unknown';
      if (!allowedEntryKinds.has(kind)) return false;
    }

    return true;
  }));
}

module.exports = Object.freeze({
  filterDiagnostics
});
