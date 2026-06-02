'use strict';

const { compareSeverityDesc, normalizeSeverity } = require('../validation/DiagnosticSeverity');

function priorityKey(diagnostic) {
  const ruleId = diagnostic && diagnostic.ruleId ? diagnostic.ruleId : 'unknown_rule';
  const fileName = diagnostic && diagnostic.fileName ? diagnostic.fileName : 'unknown_file';
  return ruleId + '::' + fileName;
}

function sortByPriority(diagnostics) {
  const items = Array.isArray(diagnostics) ? diagnostics.slice() : [];
  return items.sort((a, b) => {
    const sevCmp = compareSeverityDesc(a && a.severity, b && b.severity);
    if (sevCmp !== 0) {
      return sevCmp;
    }
    return String(priorityKey(a)).localeCompare(String(priorityKey(b)));
  });
}

function summarizeBySeverity(diagnostics) {
  const out = { blocker: 0, error: 0, warning: 0, info: 0 };
  (Array.isArray(diagnostics) ? diagnostics : []).forEach((diag) => {
    const sev = normalizeSeverity(diag && diag.severity);
    out[sev] += 1;
  });
  return Object.freeze(out);
}

module.exports = Object.freeze({
  priorityKey,
  sortByPriority,
  summarizeBySeverity
});

