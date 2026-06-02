'use strict';

const { decideApproval } = require('./ApprovalDecision');

function toData(input) {
  return decideApproval(input);
}

function toMarkdown(input) {
  const d = decideApproval(input);
  return [
    '# Approval Decision',
    '',
    '- decision: ' + String(d.decision),
    '- reason: ' + String(d.reason)
  ].join('\n');
}

module.exports = Object.freeze({ toData, toMarkdown });
