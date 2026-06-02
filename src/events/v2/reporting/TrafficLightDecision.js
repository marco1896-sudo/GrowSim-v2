'use strict';

function decideTrafficLight(input) {
  const value = input || {};
  if (value.notApplicable === true || !value.decision || value.decision === 'notReady') {
    return 'gray';
  }
  if (value.decision === 'blocked') return 'red';
  if (value.decision === 'warning') return 'yellow';
  if (value.decision === 'pass') return 'green';
  return 'gray';
}

module.exports = Object.freeze({
  decideTrafficLight
});
