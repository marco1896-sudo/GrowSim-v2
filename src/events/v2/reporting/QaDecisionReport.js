'use strict';

const { deriveQaDecision } = require('./QaDecision');
const { decideTrafficLight } = require('./TrafficLightDecision');

function toData(input) {
  const decision = deriveQaDecision(input);
  return Object.freeze({
    decision: decision.decision,
    reason: decision.reason,
    trafficLight: decideTrafficLight({ decision: decision.decision, notApplicable: decision.decision === 'notReady' })
  });
}

function toMarkdown(input) {
  const decision = toData(input);
  return [
    '# QA Decision',
    '',
    '- decision: ' + String(decision.decision),
    '- reason: ' + String(decision.reason),
    '- trafficLight: ' + String(decision.trafficLight)
  ].join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
