'use strict';

function decideApproval(input) {
  const value = input || {};
  const expectedChange = value.expectedChange || {};
  const profile = value.profile || {};
  const traces = Array.isArray(value.traces) ? value.traces : [];

  if (!expectedChange || !expectedChange.scenarioId) {
    return Object.freeze({ decision: 'invalid', reason: 'Missing expected change target.' });
  }

  const approvedTraces = traces.filter((t) => t.status === 'approved');
  const roleSet = new Set(approvedTraces.map((t) => t.approvedByRole));
  const allowedRoles = new Set(Array.isArray(profile.allowedRoles) ? profile.allowedRoles : []);
  const hasInvalidRole = approvedTraces.some((t) => !allowedRoles.has(t.approvedByRole));

  if (hasInvalidRole) {
    return Object.freeze({ decision: 'rejected', reason: 'Approval trace contains disallowed role.' });
  }

  if (!profile.canApproveExpectedChanges) {
    return Object.freeze({ decision: 'rejected', reason: 'Profile cannot approve expected changes.' });
  }

  const required = Number(profile.requiredApprovals || 1);
  if (approvedTraces.length < required) {
    return Object.freeze({ decision: 'requiresMoreApprovals', reason: 'Need ' + required + ' approvals, got ' + approvedTraces.length + '.' });
  }

  return Object.freeze({ decision: 'approved', reason: 'Approval requirements satisfied.', approvals: approvedTraces.length, uniqueRoles: roleSet.size });
}

module.exports = Object.freeze({ decideApproval });
