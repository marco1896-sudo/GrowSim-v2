'use strict';

const DiagnosticSeverity = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  BLOCKER: 'blocker'
});

const ORDER = Object.freeze({
  info: 0,
  warning: 1,
  error: 2,
  blocker: 3
});

function normalizeSeverity(value) {
  const normalized = String(value || '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(ORDER, normalized) ? normalized : DiagnosticSeverity.WARNING;
}

function compareSeverityDesc(a, b) {
  return (ORDER[normalizeSeverity(b)] || 0) - (ORDER[normalizeSeverity(a)] || 0);
}

module.exports = Object.freeze({
  DiagnosticSeverity,
  ORDER,
  normalizeSeverity,
  compareSeverityDesc
});

