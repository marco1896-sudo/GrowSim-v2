'use strict';

function toData(input) {
  const value = input || {};
  return Object.freeze({
    scenarioVersion: value.scenarioVersion || null,
    assertionVersion: value.assertionVersion || null,
    expectedChangeVersion: value.expectedChangeVersion || null,
    approvalTraces: Object.freeze(Array.isArray(value.approvalTraces) ? value.approvalTraces : []),
    qaChangeLog: Object.freeze(Array.isArray(value.qaChangeLog) ? value.qaChangeLog : [])
  });
}

function toMarkdown(input) {
  const d = toData(input);
  return [
    '# Version Audit Report',
    '',
    '- scenarioVersion: ' + String(d.scenarioVersion || 'n/a'),
    '- assertionVersion: ' + String(d.assertionVersion || 'n/a'),
    '- expectedChangeVersion: ' + String(d.expectedChangeVersion || 'n/a'),
    '- approvalTraces: ' + String(d.approvalTraces.length),
    '- qaChangeLogEntries: ' + String(d.qaChangeLog.length)
  ].join('\n');
}

module.exports = Object.freeze({ toData, toMarkdown });
