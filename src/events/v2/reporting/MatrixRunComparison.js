'use strict';

const { analyzeDrift } = require('./DriftAnalysis');
const { buildScenarioAssertionResult } = require('./ScenarioAssertionResult');
const { getAssertionByScenarioId } = require('./ScenarioAssertionRegistry');
const { createBaselineEvolutionPolicy } = require('./BaselineEvolutionPolicy');
const { reviewExpectedChange } = require('./ExpectedChangeReviewGate');
const { decideApproval } = require('./ApprovalDecision');
const { getGovernanceProfile } = require('./GovernanceProfileRegistry');

function compareMatrixRuns(previousMatrixData, nextMatrixData, tolerance, expectedChanges, governanceInput) {
  const prev = previousMatrixData || { cells: [] };
  const next = nextMatrixData || { cells: [] };

  const assertionResults = (next.cells || []).map((cell) => {
    const assertion = getAssertionByScenarioId(cell.scenarioId);
    if (!assertion) {
      return buildScenarioAssertionResult({
        assertion: { scenarioId: cell.scenarioId, assertionMode: 'informational', allowedScoreRange: { min: 0, max: 100 }, maxBlockers: Number.MAX_SAFE_INTEGER, maxErrors: Number.MAX_SAFE_INTEGER, maxWarnings: Number.MAX_SAFE_INTEGER },
        observed: cell
      });
    }
    return buildScenarioAssertionResult({ assertion, observed: cell });
  });

  const drift = analyzeDrift(prev, next, tolerance);
  const profile = getGovernanceProfile((governanceInput && governanceInput.profileId) || 'soloDevelopment');
  const traces = Array.isArray(governanceInput && governanceInput.traces) ? governanceInput.traces : [];
  const gateChecks = (drift.trafficChanges || []).map((change) => {
    const approvalDecision = decideApproval({
      expectedChange: Object.assign({ scenarioId: change.scenarioId }, (Array.isArray(expectedChanges) ? expectedChanges : []).find((e) => e.scenarioId === change.scenarioId) || {}),
      profile,
      traces: traces.filter((t) => t.targetType === 'expectedChange' && t.targetId === change.scenarioId)
    });
    return Object.freeze({
      change,
      approvalDecision,
      gate: reviewExpectedChange(change, expectedChanges, approvalDecision)
    });
  });
  const unexpectedChanges = gateChecks.filter((item) => item.gate.expected === false);
  const approvedExpectedChanges = gateChecks.filter((item) => item.gate.expected === true && item.gate.approved === true);
  const evolutionPolicy = createBaselineEvolutionPolicy();
  const evolution = evolutionPolicy.evaluate({
    unexpectedChanges,
    newBlockers: (drift.perScenario || []).reduce((acc, x) => acc + Math.max(0, x.blockerDelta), 0),
    newErrors: (drift.perScenario || []).reduce((acc, x) => acc + Math.max(0, x.errorDelta), 0),
    trafficChanges: drift.trafficChanges || [],
    improvements: (drift.perScenario || []).filter((x) => x.lightRegression === false && x.decisionRegression === false && (x.scoreDelta > 0 || x.blockerDelta < 0 || x.errorDelta < 0 || x.warningDelta < 0)).length
  });

  return Object.freeze({
    assertionResults: Object.freeze(assertionResults),
    drift,
    gateChecks: Object.freeze(gateChecks),
    governanceProfile: profile,
    approvedExpectedChanges: Object.freeze(approvedExpectedChanges),
    unexpectedChanges: Object.freeze(unexpectedChanges),
    evolution
  });
}

module.exports = Object.freeze({
  compareMatrixRuns
});
