'use strict';

function toData(results) {
  const list = Array.isArray(results) ? results : [];
  const passed = list.filter((r) => r && r.passed).length;
  const failed = list.length - passed;
  return Object.freeze({
    total: list.length,
    passed,
    failed,
    results: Object.freeze(list)
  });
}

function toMarkdown(results) {
  const data = toData(results);
  const lines = [
    '# Scenario Assertion Report',
    '',
    '- total: ' + String(data.total),
    '- passed: ' + String(data.passed),
    '- failed: ' + String(data.failed),
    '',
    '## Results'
  ];

  data.results.forEach((r) => {
    lines.push('- ' + String(r.scenarioId) + ': ' + (r.passed ? 'PASS' : 'FAIL') + ' (observed=' + String(r.observedDecision) + ', expected=' + String(r.expectedDecision || 'n/a') + ')');
  });
  return lines.join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
