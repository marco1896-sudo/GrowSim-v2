'use strict';

function createQaChangeLog() {
  const entries = [];

  function addEntry(entry) {
    entries.push(Object.freeze(entry || {}));
  }

  function listEntries() {
    return Object.freeze(entries.slice());
  }

  function summarize() {
    const total = entries.length;
    const allow = entries.filter((e) => e && e.decision === 'allow').length;
    const requiresReview = entries.filter((e) => e && e.decision === 'requiresReview').length;
    const reject = entries.filter((e) => e && e.decision === 'reject').length;
    const withTrace = entries.filter((e) => e && e.traceId).length;
    return Object.freeze({ total, allow, requiresReview, reject, withTrace });
  }

  return Object.freeze({ addEntry, listEntries, summarize });
}

module.exports = Object.freeze({ createQaChangeLog });
