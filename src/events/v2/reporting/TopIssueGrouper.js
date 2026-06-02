'use strict';

const { sortByPriority, priorityKey } = require('./ReportPriority');

function groupTopIssues(diagnostics, maxItems) {
  const ordered = sortByPriority(diagnostics);
  const map = new Map();

  ordered.forEach((diag) => {
    const ruleId = diag && diag.ruleId ? diag.ruleId : 'unknown_rule';
    const severity = diag && diag.severity ? diag.severity : 'warning';
    const ruleScope = diag && diag.ruleScope ? diag.ruleScope : 'recommended';
    const message = diag && diag.message ? diag.message : '';
    const ruleFamily = diag && diag.ruleFamily ? diag.ruleFamily : 'future';
    const key = severity + '::' + ruleScope + '::' + ruleFamily + '::' + ruleId + '::' + message;
    if (!map.has(key)) {
      map.set(key, Object.freeze({
        key: key,
        ruleId: ruleId,
        severity: severity,
        ruleScope: ruleScope,
        ruleFamily: ruleFamily,
        fileName: diag.fileName || null,
        message: message,
        occurrences: 1,
        affectedFiles: Object.freeze(diag && diag.fileName ? [diag.fileName] : [])
      }));
      return;
    }

    const existing = map.get(key);
    const nextFiles = existing.affectedFiles.slice();
    if (diag && diag.fileName && nextFiles.indexOf(diag.fileName) < 0) {
      nextFiles.push(diag.fileName);
    }
    map.set(key, Object.freeze({
      key: existing.key,
      ruleId: existing.ruleId,
      severity: existing.severity,
      ruleScope: existing.ruleScope,
      ruleFamily: existing.ruleFamily,
      fileName: existing.fileName,
      message: existing.message,
      occurrences: existing.occurrences + 1,
      affectedFiles: Object.freeze(nextFiles)
    }));
  });

  const grouped = Array.from(map.values());
  const sorted = sortByPriority(grouped).sort((a, b) => {
    if (a.severity === b.severity) {
      return b.occurrences - a.occurrences;
    }
    return 0;
  });
  const limit = Number.isFinite(Number(maxItems)) ? Number(maxItems) : 20;
  return Object.freeze(sorted.slice(0, limit));
}

module.exports = Object.freeze({
  groupTopIssues
});
