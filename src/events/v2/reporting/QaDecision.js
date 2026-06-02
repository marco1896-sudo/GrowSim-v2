'use strict';

function deriveQaDecision(input) {
  const value = input || {};
  const readiness = value.readiness || { ready: false, checks: [] };
  const release = value.release || { blocked: false };
  const health = value.health || { score: 0 };

  if (release.blocked) {
    return Object.freeze({ decision: 'blocked', reason: 'Release blocker gates failed.' });
  }

  if (value.notApplicable === true) {
    return Object.freeze({ decision: 'notReady', reason: 'Scenario marked as not applicable.' });
  }

  if (!readiness.ready || Number(health.score || 0) < Number(value.warningHealthBelow || 75)) {
    return Object.freeze({ decision: 'warning', reason: 'Readiness or health below target.' });
  }

  return Object.freeze({ decision: 'pass', reason: 'All checks satisfied.' });
}

module.exports = Object.freeze({
  deriveQaDecision
});
