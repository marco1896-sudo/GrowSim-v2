'use strict';

function createExpectedChange(input) {
  const value = input || {};
  return Object.freeze({
    scenarioId: value.scenarioId || null,
    version: value.version || 'v1',
    fromDecision: value.fromDecision || null,
    toDecision: value.toDecision || null,
    fromTrafficLight: value.fromTrafficLight || null,
    toTrafficLight: value.toTrafficLight || null,
    reason: value.reason || '',
    approved: value.approved === true
  });
}

module.exports = Object.freeze({ createExpectedChange });
