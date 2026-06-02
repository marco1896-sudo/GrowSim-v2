'use strict';

const { GovernanceRole } = require('./GovernanceRole');
const { createGovernanceProfile } = require('./GovernanceProfile');

const PROFILES = Object.freeze({
  soloDevelopment: Object.freeze({
    profileId: 'soloDevelopment', label: 'Solo Development',
    allowedRoles: [GovernanceRole.OWNER], requiredApprovals: 1,
    canApproveExpectedChanges: true, canApproveBaselineUpdates: true, canApproveReleaseCandidate: false
  }),
  internalReview: Object.freeze({
    profileId: 'internalReview', label: 'Internal Review',
    allowedRoles: [GovernanceRole.OWNER, GovernanceRole.REVIEWER, GovernanceRole.QA_REVIEWER], requiredApprovals: 2,
    canApproveExpectedChanges: true, canApproveBaselineUpdates: true, canApproveReleaseCandidate: true
  }),
  releaseCandidateReview: Object.freeze({
    profileId: 'releaseCandidateReview', label: 'Release Candidate Review',
    allowedRoles: [GovernanceRole.OWNER, GovernanceRole.TECHNICAL_REVIEWER, GovernanceRole.QA_REVIEWER], requiredApprovals: 2,
    canApproveExpectedChanges: true, canApproveBaselineUpdates: true, canApproveReleaseCandidate: true
  }),
  productionReview: Object.freeze({
    profileId: 'productionReview', label: 'Production Review',
    allowedRoles: [GovernanceRole.OWNER, GovernanceRole.TECHNICAL_REVIEWER, GovernanceRole.CONTENT_REVIEWER, GovernanceRole.QA_REVIEWER], requiredApprovals: 3,
    canApproveExpectedChanges: true, canApproveBaselineUpdates: true, canApproveReleaseCandidate: true
  })
});

function getGovernanceProfile(id) {
  const key = PROFILES[id] ? id : 'soloDevelopment';
  return createGovernanceProfile(PROFILES[key]);
}

function listGovernanceProfiles() {
  return Object.freeze(Object.keys(PROFILES).map((k) => createGovernanceProfile(PROFILES[k])));
}

module.exports = Object.freeze({ PROFILES, getGovernanceProfile, listGovernanceProfiles });
