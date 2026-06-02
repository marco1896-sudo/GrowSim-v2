'use strict';

const { createScenarioAssertion } = require('./ScenarioAssertion');

const DEFAULT_ASSERTIONS = Object.freeze([
  Object.freeze({ scenarioId: 'examplesOnlyDevelopment', expectedDecision: 'blocked', expectedTrafficLight: 'red', allowedScoreRange: { min: 0, max: 10 }, maxBlockers: 20, maxErrors: 200, maxWarnings: 200, assertionMode: 'mustBlock', assertionSetVersion: 'v1' }),
  Object.freeze({ scenarioId: 'fixturesDevelopment', expectedDecision: 'blocked', expectedTrafficLight: 'red', allowedScoreRange: { min: 20, max: 40 }, maxBlockers: 20, maxErrors: 200, maxWarnings: 200, assertionMode: 'mustBlock', assertionSetVersion: 'v1' }),
  Object.freeze({ scenarioId: 'fixturesBeta', expectedDecision: 'blocked', expectedTrafficLight: 'red', allowedScoreRange: { min: 20, max: 40 }, maxBlockers: 20, maxErrors: 200, maxWarnings: 200, assertionMode: 'mustBlock', assertionSetVersion: 'v1' }),
  Object.freeze({ scenarioId: 'fullCatalogEmptyDevelopment', expectedDecision: 'warning', expectedTrafficLight: 'yellow', allowedScoreRange: { min: 90, max: 100 }, maxBlockers: 0, maxErrors: 0, maxWarnings: 20, assertionMode: 'mustWarn', assertionSetVersion: 'v1' }),
  Object.freeze({ scenarioId: 'fullCatalogReleaseCandidate', expectedDecision: 'warning', expectedTrafficLight: 'yellow', allowedScoreRange: { min: 90, max: 100 }, maxBlockers: 0, maxErrors: 0, maxWarnings: 20, assertionMode: 'mustWarn', assertionSetVersion: 'v1' })
]);

function listAssertions() {
  return Object.freeze(DEFAULT_ASSERTIONS.map((a) => createScenarioAssertion(a)));
}

function getAssertionByScenarioId(scenarioId) {
  const found = DEFAULT_ASSERTIONS.find((a) => a.scenarioId === scenarioId);
  return found ? createScenarioAssertion(found) : null;
}

module.exports = Object.freeze({
  DEFAULT_ASSERTIONS,
  listAssertions,
  getAssertionByScenarioId
});
