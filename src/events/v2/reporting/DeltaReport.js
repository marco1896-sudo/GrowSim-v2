'use strict';

const { ORDER, normalizeSeverity } = require('../validation/DiagnosticSeverity');

function issueKey(diag) {
  const d = diag || {};
  return [
    d.ruleId || 'unknown_rule',
    d.fileName || 'unknown_file',
    d.message || '',
    d.ruleScope || 'recommended',
    d.ruleFamily || 'future'
  ].join('::');
}

function mapByKey(diagnostics) {
  const map = new Map();
  (Array.isArray(diagnostics) ? diagnostics : []).forEach((diag) => {
    map.set(issueKey(diag), diag);
  });
  return map;
}

function computeDeltaReport(previousSnapshot, nextSnapshot) {
  const prev = previousSnapshot || {};
  const next = nextSnapshot || {};
  const prevMap = mapByKey(prev.diagnostics);
  const nextMap = mapByKey(next.diagnostics);
  const allKeys = new Set([].concat(Array.from(prevMap.keys()), Array.from(nextMap.keys())));

  const added = [];
  const resolved = [];
  const escalated = [];
  const deEscalated = [];

  Array.from(allKeys).forEach((key) => {
    const before = prevMap.get(key);
    const after = nextMap.get(key);

    if (!before && after) {
      added.push(after);
      return;
    }

    if (before && !after) {
      resolved.push(before);
      return;
    }

    const beforeOrder = ORDER[normalizeSeverity(before && before.severity)] || 0;
    const afterOrder = ORDER[normalizeSeverity(after && after.severity)] || 0;
    if (afterOrder > beforeOrder) escalated.push(Object.freeze({ before, after }));
    if (afterOrder < beforeOrder) deEscalated.push(Object.freeze({ before, after }));
  });

  const scoreBefore = Number((prev.health && prev.health.score) || 0);
  const scoreAfter = Number((next.health && next.health.score) || 0);

  return Object.freeze({
    previousId: prev.id || null,
    nextId: next.id || null,
    previousSourceMode: prev.sourceMode || 'examplesOnly',
    nextSourceMode: next.sourceMode || 'examplesOnly',
    added: Object.freeze(added),
    resolved: Object.freeze(resolved),
    escalated: Object.freeze(escalated),
    deEscalated: Object.freeze(deEscalated),
    scoreBefore: scoreBefore,
    scoreAfter: scoreAfter,
    scoreDelta: Number((scoreAfter - scoreBefore).toFixed(2)),
    counters: Object.freeze({
      newBlockers: added.filter((d) => normalizeSeverity(d && d.severity) === 'blocker').length,
      newErrors: added.filter((d) => normalizeSeverity(d && d.severity) === 'error').length,
      requiredEscalations: escalated.filter((pair) => String(pair.after && pair.after.ruleScope) === 'required').length
    })
  });
}

module.exports = Object.freeze({
  computeDeltaReport
});
