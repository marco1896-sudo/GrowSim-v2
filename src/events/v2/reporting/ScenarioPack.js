'use strict';

function createScenarioPack(input) {
  const value = input || {};
  return Object.freeze({
    id: value.id || 'scenario_unknown',
    label: value.label || value.id || 'Unnamed Scenario',
    sourceMode: value.sourceMode || 'examplesOnly',
    includeFixtures: value.includeFixtures === true,
    readinessProfile: value.readinessProfile || 'development',
    gatePreset: value.gatePreset || 'development',
    expectedDecision: value.expectedDecision || 'warning',
    expectedTrafficLight: value.expectedTrafficLight || null,
    scenarioSetVersion: value.scenarioSetVersion || 'v1'
  });
}

module.exports = Object.freeze({
  createScenarioPack
});
