'use strict';

const { createExpectedChange } = require('./ExpectedChange');

function reviewExpectedChange(observed, expectedChanges, approvalDecision) {
  const obs = observed || {};
  const list = Array.isArray(expectedChanges) ? expectedChanges.map(createExpectedChange) : [];
  const match = list.find((item) => item.scenarioId === obs.scenarioId
    && item.fromDecision === obs.fromDecision
    && item.toDecision === obs.toDecision
    && item.fromTrafficLight === obs.fromTrafficLight
    && item.toTrafficLight === obs.toTrafficLight);

  if (!match) {
    return Object.freeze({ status: 'requiresReview', reason: 'Observed change is not expected.', expected: false, approved: false });
  }

  if (!match.approved) {
    return Object.freeze({ status: 'requiresReview', reason: 'Expected change exists but not approved.', expected: true, approved: false });
  }

  if (approvalDecision && approvalDecision.decision && approvalDecision.decision !== 'approved') {
    return Object.freeze({ status: 'requiresReview', reason: 'Expected change approval trace is incomplete.', expected: true, approved: false });
  }

  return Object.freeze({ status: 'allow', reason: 'Expected and approved change.', expected: true, approved: true });
}

module.exports = Object.freeze({ reviewExpectedChange });
