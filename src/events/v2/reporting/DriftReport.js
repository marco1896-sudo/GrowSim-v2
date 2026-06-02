'use strict';

function toData(drift) {
  return Object.freeze(drift || {});
}

function toMarkdown(drift) {
  const d = drift || {};
  const lines = [
    '# Drift Report',
    '',
    '- regressions: ' + String(d.regressions || 0),
    '- newRedCells: ' + String(d.newRedCells || 0),
    '- resolvedRedCells: ' + String(d.resolvedRedCells || 0),
    '- trafficChanges: ' + String((d.trafficChanges || []).length),
    '- policyVersion: ' + String(d.policyVersion || 'n/a'),
    '',
    '## Per Scenario'
  ];

  (d.perScenario || []).forEach((s) => {
    lines.push('- ' + String(s.scenarioId) + ': scoreDelta=' + String(s.scoreDelta) + ', violations=' + String((s.toleranceViolation || []).join(',') || 'none'));
  });

  return lines.join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
