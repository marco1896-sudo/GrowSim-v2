'use strict';

const { normalizeGovernanceRole } = require('./GovernanceRole');

function createApprovalTrace(input) {
  const value = input || {};
  return Object.freeze({
    traceId: value.traceId || 'trace_' + Math.random().toString(36).slice(2, 8),
    targetType: value.targetType || 'expectedChange',
    targetId: value.targetId || null,
    targetVersion: value.targetVersion || 'v1',
    approvedByRole: normalizeGovernanceRole(value.approvedByRole),
    approvalProfile: value.approvalProfile || 'soloDevelopment',
    approvedAt: value.approvedAt || new Date().toISOString(),
    reason: value.reason || '',
    status: value.status || 'approved'
  });
}

module.exports = Object.freeze({ createApprovalTrace });
