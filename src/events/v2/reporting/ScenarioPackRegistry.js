'use strict';

const { createScenarioPack } = require('./ScenarioPack');

const DEFAULT_SCENARIO_PACKS = Object.freeze([
  Object.freeze({ id: 'examplesOnlyDevelopment', label: 'Examples Only / Development', sourceMode: 'examplesOnly', includeFixtures: false, readinessProfile: 'development', gatePreset: 'development', expectedDecision: 'blocked', expectedTrafficLight: 'red', scenarioSetVersion: 'v1' }),
  Object.freeze({ id: 'fixturesDevelopment', label: 'Fixtures / Development', sourceMode: 'fullCatalog', includeFixtures: true, readinessProfile: 'development', gatePreset: 'development', expectedDecision: 'blocked', expectedTrafficLight: 'red', scenarioSetVersion: 'v1' }),
  Object.freeze({ id: 'fixturesBeta', label: 'Fixtures / Beta', sourceMode: 'fullCatalog', includeFixtures: true, readinessProfile: 'beta', gatePreset: 'releaseCandidate', expectedDecision: 'blocked', expectedTrafficLight: 'red', scenarioSetVersion: 'v1' }),
  Object.freeze({ id: 'fullCatalogEmptyDevelopment', label: 'Full Catalog Empty / Development', sourceMode: 'fullCatalog', includeFixtures: false, readinessProfile: 'development', gatePreset: 'development', expectedDecision: 'warning', expectedTrafficLight: 'yellow', scenarioSetVersion: 'v1' }),
  Object.freeze({ id: 'fullCatalogReleaseCandidate', label: 'Full Catalog Empty / Release Candidate', sourceMode: 'fullCatalog', includeFixtures: false, readinessProfile: 'releaseCandidate', gatePreset: 'releaseCandidate', expectedDecision: 'warning', expectedTrafficLight: 'yellow', scenarioSetVersion: 'v1' })
]);

function listScenarioPacks() {
  return Object.freeze(DEFAULT_SCENARIO_PACKS.map((item) => createScenarioPack(item)));
}

function getScenarioPack(id) {
  const found = DEFAULT_SCENARIO_PACKS.find((item) => item.id === id);
  return found ? createScenarioPack(found) : null;
}

module.exports = Object.freeze({
  DEFAULT_SCENARIO_PACKS,
  listScenarioPacks,
  getScenarioPack
});
