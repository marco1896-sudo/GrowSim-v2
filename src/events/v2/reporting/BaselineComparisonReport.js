'use strict';

const { computeDeltaReport } = require('./DeltaReport');
const { evaluateReleaseBlocker } = require('./ReleaseBlockerPolicy');
const { deriveQaDecision } = require('./QaDecision');
const { decideTrafficLight } = require('./TrafficLightDecision');

function toData(baselineSnapshot, latestSnapshot, policy) {
  const delta = computeDeltaReport(
    baselineSnapshot && baselineSnapshot.snapshot ? baselineSnapshot.snapshot : baselineSnapshot,
    latestSnapshot && latestSnapshot.snapshot ? latestSnapshot.snapshot : latestSnapshot
  );

  const release = evaluateReleaseBlocker(delta, policy);

  const qaDecision = deriveQaDecision({
    readiness: { ready: !release.blocked, checks: [] },
    release,
    health: (latestSnapshot && latestSnapshot.health) || {}
  });
  const trafficLight = decideTrafficLight({ decision: qaDecision.decision, notApplicable: qaDecision.decision === 'notReady' });

  return Object.freeze({
    delta,
    release,
    policyInput: policy || null,
    qaDecision,
    trafficLight
  });
}

function toMarkdown(baselineSnapshot, latestSnapshot, policy) {
  const data = toData(baselineSnapshot, latestSnapshot, policy);
  const lines = [
    '# Baseline Comparison Report',
    '',
    '- scoreDelta: ' + String(data.delta.scoreDelta),
    '- new issues: ' + String((data.delta.added || []).length),
    '- resolved issues: ' + String((data.delta.resolved || []).length),
    '- escalated issues: ' + String((data.delta.escalated || []).length),
    '- de-escalated issues: ' + String((data.delta.deEscalated || []).length),
    '- releaseBlocked: ' + String(data.release.blocked),
    '- policy: ' + String(data.release.policyName),
    '- qaDecision: ' + String((data.qaDecision && data.qaDecision.decision) || 'warning'),
    '- trafficLight: ' + String(data.trafficLight || 'gray'),
    '- newBlockers: ' + String((data.delta.counters && data.delta.counters.newBlockers) || 0),
    '- newErrors: ' + String((data.delta.counters && data.delta.counters.newErrors) || 0),
    '- requiredEscalations: ' + String((data.delta.counters && data.delta.counters.requiredEscalations) || 0),
    ''
  ];

  lines.push('## Gate Results');
  (data.release.gateResult.gates || []).forEach((g) => {
    lines.push('- [' + (g.result.pass ? 'pass' : 'fail') + '] ' + g.id + ': ' + g.result.reason);
  });

  return lines.join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
