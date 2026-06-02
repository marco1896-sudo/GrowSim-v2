'use strict';

function createScenarioVersion(input) {
  const value = input || {};
  return Object.freeze({
    version: value.version || 'v1',
    scenarioSetId: value.scenarioSetId || 'default-scenarios',
    createdAt: value.createdAt || new Date().toISOString(),
    reason: value.reason || 'Initial version',
    scenarios: Object.freeze(Array.isArray(value.scenarios) ? value.scenarios : []),
    compatibilityNotes: value.compatibilityNotes || ''
  });
}

module.exports = Object.freeze({ createScenarioVersion });
