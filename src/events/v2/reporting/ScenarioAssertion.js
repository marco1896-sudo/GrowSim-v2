'use strict';

function createScenarioAssertion(input) {
  const value = input || {};
  return Object.freeze({
    scenarioId: value.scenarioId || 'unknownScenario',
    expectedDecision: value.expectedDecision || null,
    expectedTrafficLight: value.expectedTrafficLight || null,
    allowedScoreRange: Object.freeze(value.allowedScoreRange || { min: 0, max: 100 }),
    maxBlockers: Number.isFinite(Number(value.maxBlockers)) ? Number(value.maxBlockers) : Number.MAX_SAFE_INTEGER,
    maxErrors: Number.isFinite(Number(value.maxErrors)) ? Number(value.maxErrors) : Number.MAX_SAFE_INTEGER,
    maxWarnings: Number.isFinite(Number(value.maxWarnings)) ? Number(value.maxWarnings) : Number.MAX_SAFE_INTEGER,
    assertionMode: value.assertionMode || 'informational',
    assertionSetVersion: value.assertionSetVersion || 'v1'
  });
}

module.exports = Object.freeze({
  createScenarioAssertion
});
