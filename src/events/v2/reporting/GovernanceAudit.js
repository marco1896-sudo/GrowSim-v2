'use strict';

const { decideApproval } = require('./ApprovalDecision');
const { getGovernanceProfile } = require('./GovernanceProfileRegistry');

function runGovernanceAudit(input) {
  const value = input || {};
  const expectedChanges = Array.isArray(value.expectedChanges) ? value.expectedChanges : [];
  const traces = Array.isArray(value.traces) ? value.traces : [];
  const profile = getGovernanceProfile(value.profileId || 'soloDevelopment');

  const findings = [];

  expectedChanges.forEach((change) => {
    const targetTraces = traces.filter((t) => t.targetType === 'expectedChange' && t.targetId === change.scenarioId);
    const decision = decideApproval({ expectedChange: change, profile, traces: targetTraces });

    if (decision.decision !== 'approved') {
      findings.push(Object.freeze({ type: 'approval', scenarioId: change.scenarioId, severity: 'error', message: decision.reason }));
    }

    if (!change.reason || String(change.reason).trim().length < 5) {
      findings.push(Object.freeze({ type: 'reason', scenarioId: change.scenarioId, severity: 'warning', message: 'Expected change reason is too short.' }));
    }

    if (!change.version) {
      findings.push(Object.freeze({ type: 'versioning', scenarioId: change.scenarioId, severity: 'warning', message: 'Expected change is not versioned.' }));
    }

    const trafficRegression = (change.fromTrafficLight === 'green' && change.toTrafficLight === 'yellow') || (change.fromTrafficLight === 'yellow' && change.toTrafficLight === 'red');
    if (trafficRegression && !change.approved) {
      findings.push(Object.freeze({ type: 'trafficRegression', scenarioId: change.scenarioId, severity: 'error', message: 'Traffic regression is not approved.' }));
    }
  });

  return Object.freeze({
    profile,
    findings: Object.freeze(findings),
    ok: findings.filter((f) => f.severity === 'error').length === 0
  });
}

module.exports = Object.freeze({ runGovernanceAudit });
