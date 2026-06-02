'use strict';

function toData(changeLog) {
  const entries = changeLog && typeof changeLog.listEntries === 'function' ? changeLog.listEntries() : [];
  const summary = changeLog && typeof changeLog.summarize === 'function' ? changeLog.summarize() : { total: 0, allow: 0, requiresReview: 0, reject: 0 };
  return Object.freeze({ summary, entries });
}

function toMarkdown(changeLog) {
  const data = toData(changeLog);
  const lines = [
    '# QA Change Log Report',
    '',
    '- total: ' + String(data.summary.total),
    '- allow: ' + String(data.summary.allow),
    '- requiresReview: ' + String(data.summary.requiresReview),
    '- reject: ' + String(data.summary.reject),
    '- withTrace: ' + String(data.summary.withTrace || 0),
    '',
    '## Entries'
  ];

  data.entries.forEach((e, idx) => {
    lines.push('- entry_' + String(idx + 1) + ': decision=' + String(e.decision || 'n/a') + ', reason=' + String(e.reason || ''));
  });
  return lines.join('\n');
}

module.exports = Object.freeze({ toData, toMarkdown });
