'use strict';

const { createDriftTolerance } = require('./DriftTolerance');

const LIGHT_ORDER = Object.freeze({ gray: 0, green: 1, yellow: 2, red: 3 });
const DECISION_ORDER = Object.freeze({ notReady: 0, pass: 1, warning: 2, blocked: 3 });

function indexByScenario(cells) {
  const map = new Map();
  (Array.isArray(cells) ? cells : []).forEach((c) => map.set(c.scenarioId, c));
  return map;
}

function analyzeDrift(previousRun, nextRun, toleranceInput) {
  const tolerance = createDriftTolerance(toleranceInput);
  const prev = previousRun || { cells: [], summary: {} };
  const next = nextRun || { cells: [], summary: {} };

  const prevMap = indexByScenario(prev.cells);
  const nextMap = indexByScenario(next.cells);
  const ids = Array.from(new Set([].concat(Array.from(prevMap.keys()), Array.from(nextMap.keys()))));

  const perScenario = [];
  let regressions = 0;
  let newRedCells = 0;
  let resolvedRedCells = 0;

  ids.forEach((id) => {
    const a = prevMap.get(id);
    const b = nextMap.get(id);
    if (!a || !b) return;

    const scoreDelta = Number((Number(b.healthScore || 0) - Number(a.healthScore || 0)).toFixed(2));
    const blockerDelta = Number(b.blockerCount || 0) - Number(a.blockerCount || 0);
    const errorDelta = Number(b.errorCount || 0) - Number(a.errorCount || 0);
    const warningDelta = Number(b.warningCount || 0) - Number(a.warningCount || 0);

    const lightRegression = (LIGHT_ORDER[b.trafficLight] || 0) > (LIGHT_ORDER[a.trafficLight] || 0);
    const decisionRegression = (DECISION_ORDER[b.qaDecision] || 0) > (DECISION_ORDER[a.qaDecision] || 0);

    if (a.trafficLight !== 'red' && b.trafficLight === 'red') newRedCells += 1;
    if (a.trafficLight === 'red' && b.trafficLight !== 'red') resolvedRedCells += 1;

    const toleranceViolation = [];
    if (Math.abs(scoreDelta) > tolerance.allowedScoreDelta) toleranceViolation.push('scoreDelta');
    if (blockerDelta > tolerance.allowedNewBlockers) toleranceViolation.push('newBlockers');
    if (errorDelta > tolerance.allowedNewErrors) toleranceViolation.push('newErrors');
    if (warningDelta > tolerance.allowedNewWarnings) toleranceViolation.push('newWarnings');
    if (lightRegression && !tolerance.allowTrafficLightRegression) toleranceViolation.push('trafficLightRegression');
    if (decisionRegression && !tolerance.allowDecisionRegression) toleranceViolation.push('decisionRegression');

    if (toleranceViolation.length > 0) regressions += 1;

    perScenario.push(Object.freeze({
      scenarioId: id,
      scoreDelta,
      blockerDelta,
      errorDelta,
      warningDelta,
      lightRegression,
      decisionRegression,
      toleranceViolation: Object.freeze(toleranceViolation)
    }));
  });

  return Object.freeze({
    tolerance,
    regressions,
    newRedCells,
    resolvedRedCells,
    perScenario: Object.freeze(perScenario),
    trafficChanges: Object.freeze(perScenario
      .filter((s) => s.lightRegression || s.decisionRegression || s.scoreDelta !== 0 || s.blockerDelta !== 0 || s.errorDelta !== 0 || s.warningDelta !== 0)
      .map((s) => {
        const a = prevMap.get(s.scenarioId);
        const b = nextMap.get(s.scenarioId);
        return Object.freeze({
          scenarioId: s.scenarioId,
          fromDecision: a ? a.qaDecision : null,
          toDecision: b ? b.qaDecision : null,
          fromTrafficLight: a ? a.trafficLight : null,
          toTrafficLight: b ? b.trafficLight : null
        });
      }))
  });
}

module.exports = Object.freeze({
  analyzeDrift
});
