'use strict';

function buildScenarioAssertionResult(input) {
  const value = input || {};
  const observed = value.observed || {};
  const assertion = value.assertion || {};

  const score = Number(observed.healthScore || 0);
  const range = assertion.allowedScoreRange || { min: 0, max: 100 };
  const scoreInRange = score >= Number(range.min) && score <= Number(range.max);

  const issueLimitsOk = Number(observed.blockerCount || 0) <= Number(assertion.maxBlockers)
    && Number(observed.errorCount || 0) <= Number(assertion.maxErrors)
    && Number(observed.warningCount || 0) <= Number(assertion.maxWarnings);

  const decisionMatches = assertion.expectedDecision ? observed.qaDecision === assertion.expectedDecision : true;
  const trafficMatches = assertion.expectedTrafficLight ? observed.trafficLight === assertion.expectedTrafficLight : true;

  const mode = assertion.assertionMode || 'informational';
  let modePass = true;
  if (mode === 'mustPass') modePass = observed.qaDecision === 'pass';
  if (mode === 'mustWarn') modePass = observed.qaDecision === 'warning';
  if (mode === 'mustBlock') modePass = observed.qaDecision === 'blocked';

  const failedReasons = [];
  if (!decisionMatches) failedReasons.push('Decision mismatch.');
  if (!trafficMatches) failedReasons.push('Traffic light mismatch.');
  if (!scoreInRange) failedReasons.push('Score out of allowed range.');
  if (!issueLimitsOk) failedReasons.push('Issue limits exceeded.');
  if (!modePass) failedReasons.push('Assertion mode failed: ' + mode);

  return Object.freeze({
    scenarioId: assertion.scenarioId || observed.scenarioId || null,
    passed: failedReasons.length === 0,
    failedReasons: Object.freeze(failedReasons),
    observedDecision: observed.qaDecision || null,
    expectedDecision: assertion.expectedDecision || null,
    observedTrafficLight: observed.trafficLight || null,
    expectedTrafficLight: assertion.expectedTrafficLight || null,
    scoreInRange,
    issueLimitsOk,
    assertionMode: mode
  });
}

module.exports = Object.freeze({
  buildScenarioAssertionResult
});
