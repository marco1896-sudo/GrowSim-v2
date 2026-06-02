'use strict';

const { createScenarioVersion } = require('./ScenarioVersion');
const { DEFAULT_SCENARIO_PACKS } = require('./ScenarioPackRegistry');

const REGISTRY = Object.freeze([
  Object.freeze({
    version: 'v1',
    scenarioSetId: 'default-scenarios',
    createdAt: '2026-05-12T00:00:00.000Z',
    reason: 'Initial deterministic QA matrix scenario set.',
    scenarios: DEFAULT_SCENARIO_PACKS,
    compatibilityNotes: 'Compatible with Phase 12+ QA modules.'
  })
]);

function listScenarioVersions() {
  return Object.freeze(REGISTRY.map((entry) => createScenarioVersion(entry)));
}

function getScenarioVersion(version) {
  const found = REGISTRY.find((entry) => entry.version === version);
  return found ? createScenarioVersion(found) : null;
}

function getLatestScenarioVersion() {
  return REGISTRY.length > 0 ? createScenarioVersion(REGISTRY[REGISTRY.length - 1]) : null;
}

module.exports = Object.freeze({ listScenarioVersions, getScenarioVersion, getLatestScenarioVersion });
