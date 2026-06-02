'use strict';

const GovernanceRole = Object.freeze({
  OWNER: 'owner',
  REVIEWER: 'reviewer',
  CONTENT_REVIEWER: 'contentReviewer',
  TECHNICAL_REVIEWER: 'technicalReviewer',
  QA_REVIEWER: 'qaReviewer',
  OBSERVER: 'observer'
});

function normalizeGovernanceRole(value) {
  const raw = String(value || '').trim();
  const values = Object.values(GovernanceRole);
  return values.indexOf(raw) >= 0 ? raw : GovernanceRole.OBSERVER;
}

module.exports = Object.freeze({ GovernanceRole, normalizeGovernanceRole });
