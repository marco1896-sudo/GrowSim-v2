'use strict';

function toData(regressionSet) {
  const runs = regressionSet && typeof regressionSet.listRuns === 'function' ? regressionSet.listRuns() : [];
  const summary = regressionSet && typeof regressionSet.summarize === 'function'
    ? regressionSet.summarize()
    : { total: 0, blocked: 0, warnings: 0, pass: 0 };

  return Object.freeze({
    summary,
    runs
  });
}

function toMarkdown(regressionSet) {
  const data = toData(regressionSet);
  const lines = [
    '# Regression Set Report',
    '',
    '- totalRuns: ' + String(data.summary.total),
    '- blocked: ' + String(data.summary.blocked),
    '- warning: ' + String(data.summary.warnings),
    '- pass: ' + String(data.summary.pass),
    '- green: ' + String(data.summary.green || 0),
    '- yellow: ' + String(data.summary.yellow || 0),
    '- red: ' + String(data.summary.red || 0),
    '- gray: ' + String(data.summary.gray || 0),
    '- assertionFailures: ' + String(data.summary.assertionFailures || 0),
    '',
    '## Runs'
  ];

  data.runs.forEach((run, idx) => {
    const decision = run && run.qaDecision ? run.qaDecision.decision : 'unknown';
    lines.push('- run_' + String(idx + 1) + ': ' + decision);
  });

  return lines.join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
