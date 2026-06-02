'use strict';

const { createBaselineSnapshot } = require('./BaselineSnapshot');
const { createReportSnapshot } = require('./ReportSnapshot');
const { computeDeltaReport } = require('./DeltaReport');
const { evaluateReleaseBlocker } = require('./ReleaseBlockerPolicy');
const { createPresetPolicy } = require('./GatePolicyPresets');
const { getReadinessProfile } = require('./ReadinessProfileRegistry');
const { getCalibration } = require('./PolicyCalibration');
const { evaluateReadiness } = require('./ReadinessChecklist');
const { deriveQaDecision } = require('./QaDecision');
const { decideTrafficLight } = require('./TrafficLightDecision');

function runBaselineWorkflow(input) {
  const value = input || {};
  const baseline = createBaselineSnapshot(value.baseline || {});
  const snapshot = createReportSnapshot(value.snapshot || {});
  const delta = computeDeltaReport(baseline.snapshot, snapshot);
  const readinessProfile = getReadinessProfile(value.readinessStage || 'development');
  const calibration = getCalibration(value.readinessStage || readinessProfile.id);
  const selectedPolicy = value.policyPreset
    ? createPresetPolicy(value.policyPreset, Object.assign({}, value.policyOverrides || {}, { blockedEscalationFamilies: value.blockedEscalationFamilies || undefined }))
    : value.policy;
  const calibratedPolicy = selectedPolicy && selectedPolicy.name
    ? selectedPolicy
    : createPresetPolicy(value.policyPreset || 'development', Object.assign({}, value.policyOverrides || {}, { blockedEscalationFamilies: value.blockedEscalationFamilies || undefined }));
  const release = evaluateReleaseBlocker(delta, calibratedPolicy);
  const readiness = evaluateReadiness({
    summary: value.summary || {},
    health: snapshot.health || {},
    diagnostics: snapshot.diagnostics || [],
    coverage: value.coverage || {},
    profile: readinessProfile
  });
  const qaDecision = deriveQaDecision({
    readiness,
    release,
    health: snapshot.health || {}
  });
  const trafficLight = decideTrafficLight({
    decision: qaDecision.decision,
    notApplicable: qaDecision.decision === 'notReady'
  });

  return Object.freeze({
    baseline,
    snapshot,
    delta,
    release,
    policyPreset: value.policyPreset || null,
    readinessProfile,
    calibration,
    readiness,
    qaDecision,
    trafficLight
  });
}

module.exports = Object.freeze({
  runBaselineWorkflow
});
