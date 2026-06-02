'use strict';

function createGovernanceProfile(input) {
  const value = input || {};
  return Object.freeze({
    profileId: value.profileId || 'soloDevelopment',
    label: value.label || 'Unnamed Profile',
    allowedRoles: Object.freeze(Array.isArray(value.allowedRoles) ? value.allowedRoles : []),
    requiredApprovals: Number.isFinite(Number(value.requiredApprovals)) ? Number(value.requiredApprovals) : 1,
    canApproveExpectedChanges: value.canApproveExpectedChanges === true,
    canApproveBaselineUpdates: value.canApproveBaselineUpdates === true,
    canApproveReleaseCandidate: value.canApproveReleaseCandidate === true
  });
}

module.exports = Object.freeze({ createGovernanceProfile });
