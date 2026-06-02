'use strict';

function createRegressionSet(input) {
  const value = input || {};
  const runs = Array.isArray(value.runs) ? value.runs.slice() : [];

  function addRun(run) {
    runs.push(Object.freeze(run || {}));
  }

  function listRuns() {
    return Object.freeze(runs.slice());
  }

  function summarize() {
    const total = runs.length;
    const blocked = runs.filter((r) => r && r.release && r.release.blocked).length;
    const warnings = runs.filter((r) => r && r.qaDecision && r.qaDecision.decision === 'warning').length;
    const pass = runs.filter((r) => r && r.qaDecision && r.qaDecision.decision === 'pass').length;
    const green = runs.filter((r) => r && r.trafficLight === 'green').length;
    const yellow = runs.filter((r) => r && r.trafficLight === 'yellow').length;
    const red = runs.filter((r) => r && r.trafficLight === 'red').length;
    const gray = runs.filter((r) => r && r.trafficLight === 'gray').length;
    const assertionFailures = runs.filter((r) => r && r.assertionResult && r.assertionResult.passed === false).length;
    return Object.freeze({ total, blocked, warnings, pass, green, yellow, red, gray, assertionFailures });
  }

  return Object.freeze({
    addRun,
    listRuns,
    summarize
  });
}

module.exports = Object.freeze({
  createRegressionSet
});
