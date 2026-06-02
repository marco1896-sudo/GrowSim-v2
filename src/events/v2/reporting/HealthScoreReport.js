'use strict';

const { computeHealthScore } = require('./HealthScore');

function toData(input) {
  if (input && typeof input.score === 'number' && input.breakdown) {
    return Object.freeze(input);
  }
  return computeHealthScore(input);
}

function toMarkdown(input) {
  const data = toData(input);
  const lines = [
    '## Health Score',
    '',
    '- score: ' + String(data.score) + '/100',
    '- penalty: ' + String(data.penalty || 0),
    '- blockers: ' + String(data.breakdown.blocker),
    '- errors: ' + String(data.breakdown.error),
    '- warnings: ' + String(data.breakdown.warning),
    '- infos: ' + String(data.breakdown.info)
  ];
  if (data.coverageHints.length > 0) {
    lines.push('');
    lines.push('### Coverage Hints');
    data.coverageHints.forEach((h) => lines.push('- ' + h));
  }
  if (input && input.baseline && typeof input.baseline.score === 'number') {
    const delta = Number((data.score - Number(input.baseline.score || 0)).toFixed(2));
    lines.push('');
    lines.push('### Baseline Comparison');
    lines.push('- baselineScore: ' + String(input.baseline.score));
    lines.push('- scoreDelta: ' + String(delta));
  }
  if (input && typeof input.targetScore === 'number') {
    lines.push('');
    lines.push('### Target');
    lines.push('- targetScore: ' + String(input.targetScore));
    lines.push('- targetReached: ' + String(data.score >= Number(input.targetScore)));
  }
  if (input && input.stage) {
    lines.push('');
    lines.push('### Stage');
    lines.push('- readinessStage: ' + String(input.stage));
  }
  return lines.join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
