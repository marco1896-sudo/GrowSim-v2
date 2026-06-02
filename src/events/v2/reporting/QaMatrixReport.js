'use strict';

function toData(matrix) {
  const cells = matrix && typeof matrix.listCells === 'function' ? matrix.listCells() : [];
  const summary = matrix && typeof matrix.summarize === 'function' ? matrix.summarize() : { green: 0, yellow: 0, red: 0, gray: 0 };
  return Object.freeze({
    runId: (matrix && matrix.runId) || null,
    scenarioSetVersion: (matrix && matrix.scenarioSetVersion) || 'v1',
    assertionSetVersion: (matrix && matrix.assertionSetVersion) || 'v1',
    summary,
    cells
  });
}

function toMarkdown(matrix) {
  const data = toData(matrix);
  const lines = [
    '# QA Matrix Report',
    '',
    '- runId: ' + String(data.runId || 'n/a'),
    '- scenarioSetVersion: ' + String(data.scenarioSetVersion || 'v1'),
    '- assertionSetVersion: ' + String(data.assertionSetVersion || 'v1'),
    '',
    '- green: ' + String(data.summary.green),
    '- yellow: ' + String(data.summary.yellow),
    '- red: ' + String(data.summary.red),
    '- gray: ' + String(data.summary.gray),
    '',
    '## Cells'
  ];

  data.cells.forEach((cell) => {
    lines.push('- ' + String(cell.scenarioId) + ': ' + String(cell.trafficLight) + ' (decision=' + String(cell.qaDecision) + ', score=' + String(cell.healthScore) + ')');
  });

  return lines.join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
