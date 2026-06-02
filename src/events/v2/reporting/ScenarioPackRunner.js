'use strict';

const { validateCatalogExamples } = require('../validation/validateCatalogExamples');
const { buildCatalogIntegrityReport } = require('../validation/CatalogIntegrityReport');
const { runBaselineWorkflow } = require('./BaselineWorkflow');
const { createReportSnapshot } = require('./ReportSnapshot');
const { createBaselineSnapshot } = require('./BaselineSnapshot');
const { createScenarioPack } = require('./ScenarioPack');

function runScenarioPack(packInput) {
  const pack = createScenarioPack(packInput);
  const validation = validateCatalogExamples({
    sourceMode: pack.sourceMode,
    includeFixtures: pack.includeFixtures
  });
  const summary = buildCatalogIntegrityReport(validation);

  const baselineSnapshot = createBaselineSnapshot({
    id: 'baseline_' + pack.id,
    type: pack.sourceMode,
    snapshot: createReportSnapshot({
      id: 'baseline_snapshot_' + pack.id,
      sourceMode: pack.sourceMode,
      health: summary.health,
      bySeverity: summary.bySeverity,
      byRuleFamily: summary.byRuleFamily,
      diagnostics: summary.diagnostics,
      topIssues: summary.topIssues
    })
  });

  const run = runBaselineWorkflow({
    baseline: baselineSnapshot,
    snapshot: createReportSnapshot({
      id: 'snapshot_' + pack.id,
      sourceMode: pack.sourceMode,
      health: summary.health,
      bySeverity: summary.bySeverity,
      byRuleFamily: summary.byRuleFamily,
      diagnostics: summary.diagnostics,
      topIssues: summary.topIssues
    }),
    policyPreset: pack.gatePreset,
    readinessStage: pack.readinessProfile,
    summary,
    coverage: summary.coverage && summary.coverage.coverage ? summary.coverage.coverage : {}
  });

  return Object.freeze({
    pack,
    validation,
    summary,
    run,
    expectedDecision: pack.expectedDecision,
    expectedTrafficLight: pack.expectedTrafficLight || null,
    matchesExpectedDecision: (run.qaDecision && run.qaDecision.decision) === pack.expectedDecision,
    matchesExpectedTrafficLight: pack.expectedTrafficLight ? run.trafficLight === pack.expectedTrafficLight : true
  });
}

module.exports = Object.freeze({
  runScenarioPack
});
