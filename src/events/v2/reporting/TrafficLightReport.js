'use strict';

const { decideTrafficLight } = require('./TrafficLightDecision');

function toData(input) {
  const value = input || {};
  return Object.freeze({
    decision: value.decision || null,
    trafficLight: decideTrafficLight(value),
    source: value.source || null,
    scenarioSetVersion: value.scenarioSetVersion || 'v1',
    assertionSetVersion: value.assertionSetVersion || 'v1'
  });
}

function toMarkdown(input) {
  const data = toData(input);
  return [
    '# Traffic Light',
    '',
    '- decision: ' + String(data.decision || 'n/a'),
    '- trafficLight: ' + String(data.trafficLight),
    '- source: ' + String(data.source || 'n/a'),
    '- scenarioSetVersion: ' + String(data.scenarioSetVersion || 'v1'),
    '- assertionSetVersion: ' + String(data.assertionSetVersion || 'v1')
  ].join('\n');
}

module.exports = Object.freeze({
  toData,
  toMarkdown
});
