'use strict';

function toData(deltaReport) {
  return Object.freeze(Object.assign({}, deltaReport || {}));
}

function toMarkdown(deltaReport) {
  const d = deltaReport || {};
  const lines = [
    '# V2 Validation Delta Report',
    '',
    '- previousId: ' + String(d.previousId || 'n/a'),
    '- nextId: ' + String(d.nextId || 'n/a'),
    '- previousSourceMode: ' + String(d.previousSourceMode || 'examplesOnly'),
    '- nextSourceMode: ' + String(d.nextSourceMode || 'examplesOnly'),
    '- scoreBefore: ' + String(d.scoreBefore || 0),
    '- scoreAfter: ' + String(d.scoreAfter || 0),
    '- scoreDelta: ' + String(d.scoreDelta || 0),
    '',
    '## Changes',
    '- new issues: ' + String((d.added || []).length),
    '- new blockers: ' + String((d.counters && d.counters.newBlockers) || 0),
    '- new errors: ' + String((d.counters && d.counters.newErrors) || 0),
    '- resolved issues: ' + String((d.resolved || []).length),
    '- escalated issues: ' + String((d.escalated || []).length),
    '- de-escalated issues: ' + String((d.deEscalated || []).length)
  ];
  return lines.join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
