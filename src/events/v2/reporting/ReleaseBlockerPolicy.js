'use strict';

const { createDefaultDeltaGatePolicy } = require('./DeltaGatePolicy');
const { createPresetPolicy } = require('./GatePolicyPresets');

function evaluateReleaseBlocker(deltaReport, policy) {
  let selectedPolicy = policy || createDefaultDeltaGatePolicy();
  if (typeof policy === 'string') {
    selectedPolicy = createPresetPolicy(policy);
  } else if (policy && typeof policy === 'object' && policy.presetName) {
    selectedPolicy = createPresetPolicy(policy.presetName, policy.overrides || {});
  }
  const gateResult = selectedPolicy.evaluate(deltaReport || {});

  const blockers = (gateResult.gates || []).filter((g) => !g.result.pass);

  return Object.freeze({
    blocked: blockers.length > 0,
    policyName: selectedPolicy.name || 'unknown_policy',
    policyMeta: Object.freeze({
      allowedNewErrors: selectedPolicy.allowedNewErrors,
      minScore: selectedPolicy.minScore,
      blockedFamilies: selectedPolicy.blockedFamilies || []
    }),
    blockers: Object.freeze(blockers),
    gateResult
  });
}

module.exports = Object.freeze({
  evaluateReleaseBlocker
});
