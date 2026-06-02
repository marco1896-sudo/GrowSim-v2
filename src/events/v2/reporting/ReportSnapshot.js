'use strict';

function createReportSnapshot(input) {
  const value = input || {};
  return Object.freeze({
    id: value.id || null,
    label: value.label || null,
    createdAt: value.createdAt || new Date().toISOString(),
    sourceMode: value.sourceMode || 'examplesOnly',
    health: Object.freeze(value.health || {}),
    bySeverity: Object.freeze(value.bySeverity || {}),
    byRuleFamily: Object.freeze(value.byRuleFamily || {}),
    topIssues: Object.freeze(Array.isArray(value.topIssues) ? value.topIssues : []),
    diagnostics: Object.freeze(Array.isArray(value.diagnostics) ? value.diagnostics : [])
  });
}

module.exports = Object.freeze({
  createReportSnapshot
});
