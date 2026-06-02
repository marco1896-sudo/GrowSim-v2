'use strict';

const { summarizeBySeverity, sortByPriority } = require('../reporting/ReportPriority');
const { groupTopIssues } = require('../reporting/TopIssueGrouper');
const { computeHealthScore } = require('../reporting/HealthScore');
const { summarizeByRuleFamily } = require('./RuleFamily');

function buildCatalogIntegrityReport(validationResult) {
  const value = validationResult || {};
  const errors = Array.isArray(value.errors) ? value.errors : [];
  const warnings = Array.isArray(value.warnings) ? value.warnings : [];
  const infos = Array.isArray(value.infos) ? value.infos : [];
  const blockers = Array.isArray(value.blockers) ? value.blockers : [];
  const allDiagnostics = blockers.concat(errors, warnings, infos);

  const bySeverity = summarizeBySeverity(allDiagnostics);
  const byRuleFamily = summarizeByRuleFamily(allDiagnostics);
  const prioritized = sortByPriority(allDiagnostics);
  const topIssues = groupTopIssues(prioritized, 20);
  const health = computeHealthScore({
    diagnostics: allDiagnostics,
    coverage: value.counts || {}
  });

  return Object.freeze({
    ok: Boolean(value.ok),
    sourceMode: value.sourceMode || 'examplesOnly',
    filesChecked: Number(value.filesChecked) || 0,
    counts: Object.freeze(value.counts || {}),
    bySeverity: Object.freeze(bySeverity),
    byRuleFamily: Object.freeze(byRuleFamily),
    topIssues: Object.freeze(topIssues),
    health: health,
    coverage: Object.freeze(value.coverage || {}),
    totals: Object.freeze({
      diagnostics: allDiagnostics.length
    }),
    pipeline: Object.freeze((value.pipeline && value.pipeline.stages) ? value.pipeline : { stages: [], diagnostics: [], filteredDiagnostics: [] }),
    diagnostics: Object.freeze(prioritized)
  });
}

module.exports = Object.freeze({
  buildCatalogIntegrityReport
});
