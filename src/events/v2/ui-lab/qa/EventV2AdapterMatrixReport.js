'use strict';

(function initEventV2AdapterMatrixReport(globalScope) {
  function toMarkdown(matrixResult) {
    const rows = (matrixResult && matrixResult.rows) || [];
    const baseline = (matrixResult && matrixResult.baseline) || {};
    const header = [
      '| eventId | setup | category | stage | hero | title | symptom | coach | decisions | learning | aftermath | diag(B/E/W/I) | budgetWarnings | readiness |',
      '|---|---|---|---|---|---|---|---|---:|---|---|---|---:|---|'
    ];

    const tableRows = rows.map((row) => (
      '| ' + row.eventId +
      ' | ' + row.setup +
      ' | ' + row.category +
      ' | ' + row.stage +
      ' | ' + row.heroStatus +
      ' | ' + row.titleStatus +
      ' | ' + row.symptomStatus +
      ' | ' + row.coachStatus +
      ' | ' + row.decisionsCount +
      ' | ' + row.learningStatus +
      ' | ' + row.aftermathStatus +
      ' | ' + row.blocker + '/' + row.error + '/' + row.warning + '/' + row.info +
      ' | ' + row.budgetWarnings +
      ' | ' + row.bridgeReadiness +
      ' |'
    ));

    const baselineLines = [
      '',
      '## Baseline',
      '- totalEvents: ' + (baseline.totalEvents || 0),
      '- requiredCompleteEvents: ' + (baseline.requiredCompleteEvents || 0),
      '- eventsWithRecommendedFallbacks: ' + (baseline.eventsWithRecommendedFallbacks || 0),
      '- eventsWithOptionalMissing: ' + (baseline.eventsWithOptionalMissing || 0),
      '- budgetWarningsTotal: ' + (baseline.budgetWarningsTotal || 0),
      '- bridgePass: ' + (baseline.bridgePass || 0),
      '- bridgeWarning: ' + (baseline.bridgeWarning || 0),
      '- bridgeBlocked: ' + (baseline.bridgeBlocked || 0)
    ];

    return header.concat(tableRows).concat(baselineLines).join('\n');
  }

  const api = Object.freeze({
    toMarkdown
  });

  globalScope.EventV2AdapterMatrixReport = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

