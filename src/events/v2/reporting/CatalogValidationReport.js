'use strict';

const { buildCatalogIntegrityReport } = require('../validation/CatalogIntegrityReport');
const HealthScoreReport = require('./HealthScoreReport');

function toMarkdown(validationResult) {
  const summary = buildCatalogIntegrityReport(validationResult);
  const lines = [
    '# V2 Catalog Validation Report',
    '',
    '- sourceMode: ' + String(summary.sourceMode || 'examplesOnly'),
    '',
    '- ok: ' + String(summary.ok),
    '- filesChecked: ' + String(summary.filesChecked),
    '- diagnostics: ' + String(summary.totals.diagnostics),
    '- blockers: ' + String(summary.bySeverity.blocker),
    '- errors: ' + String(summary.bySeverity.error),
    '- warnings: ' + String(summary.bySeverity.warning),
    '- infos: ' + String(summary.bySeverity.info)
  ];

  lines.push('');
  lines.push('## Top Issues');
  if (!summary.topIssues || summary.topIssues.length === 0) {
    lines.push('- none');
  } else {
    summary.topIssues.forEach((issue) => {
      const affectedCount = Array.isArray(issue.affectedFiles) ? issue.affectedFiles.length : 0;
      lines.push('- [' + String(issue.severity) + '/' + String(issue.ruleScope || 'recommended') + '/' + String(issue.ruleFamily || 'future') + '] ' + String(issue.ruleId) +
        ' (occ=' + String(issue.occurrences) + ', files=' + String(affectedCount) + '): ' + String(issue.message));
    });
  }
  lines.push('');
  lines.push('## Rule Families');
  Object.keys(summary.byRuleFamily || {}).forEach((family) => {
    lines.push('- ' + family + ': ' + String(summary.byRuleFamily[family]));
  });
  lines.push('');
  lines.push(HealthScoreReport.toMarkdown(summary.health));
  return lines.join('\n');
}

function toData(validationResult) {
  return buildCatalogIntegrityReport(validationResult);
}

module.exports = Object.freeze({
  toMarkdown,
  toData
});
