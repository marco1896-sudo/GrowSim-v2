'use strict';

const { createApprovalTrace } = require('./ApprovalTrace');

function createApprovalTraceRegistry(initial) {
  const traces = Array.isArray(initial) ? initial.map(createApprovalTrace) : [];

  function addTrace(trace) {
    const t = createApprovalTrace(trace);
    traces.push(t);
    return t;
  }

  function listTraces() {
    return Object.freeze(traces.slice());
  }

  function findByTarget(targetType, targetId) {
    return Object.freeze(traces.filter((t) => t.targetType === targetType && t.targetId === targetId));
  }

  return Object.freeze({ addTrace, listTraces, findByTarget });
}

module.exports = Object.freeze({ createApprovalTraceRegistry });
