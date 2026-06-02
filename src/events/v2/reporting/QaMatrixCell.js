'use strict';

function createQaMatrixCell(input) {
  const value = input || {};
  const summary = value.summary || {};
  const run = value.run || {};
  const health = summary.health || {};
  const bySeverity = summary.bySeverity || {};

  return Object.freeze({
    scenarioId: value.scenarioId || null,
    sourceMode: value.sourceMode || 'examplesOnly',
    readinessProfile: value.readinessProfile || 'development',
    gatePreset: value.gatePreset || 'development',
    healthScore: Number(health.score || 0),
    qaDecision: (run.qaDecision && run.qaDecision.decision) || 'warning',
    trafficLight: value.trafficLight || 'gray',
    blockerCount: Number(bySeverity.blocker || 0),
    errorCount: Number(bySeverity.error || 0),
    warningCount: Number(bySeverity.warning || 0)
  });
}

module.exports = Object.freeze({
  createQaMatrixCell
});
