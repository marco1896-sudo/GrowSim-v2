'use strict';

const { runBaselineWorkflow } = require('./BaselineWorkflow');

function toData(input) {
  return runBaselineWorkflow(input);
}

function toMarkdown(input) {
  const data = runBaselineWorkflow(input);
  const lines = [
    '# Baseline Workflow Report',
    '',
    '- baselineId: ' + String((data.baseline && data.baseline.id) || 'n/a'),
    '- snapshotId: ' + String((data.snapshot && data.snapshot.id) || 'n/a'),
    '- policyPreset: ' + String(data.policyPreset || 'custom/default'),
    '- readinessProfile: ' + String((data.readinessProfile && data.readinessProfile.id) || 'development'),
    '- scoreDelta: ' + String((data.delta && data.delta.scoreDelta) || 0),
    '- releaseBlocked: ' + String(Boolean(data.release && data.release.blocked)),
    '- qaDecision: ' + String((data.qaDecision && data.qaDecision.decision) || 'unknown'),
    '- trafficLight: ' + String(data.trafficLight || 'gray')
  ];
  return lines.join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
