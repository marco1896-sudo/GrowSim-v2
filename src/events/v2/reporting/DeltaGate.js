'use strict';

function createDeltaGate(input) {
  const value = input || {};
  return Object.freeze({
    id: value.id || 'gate_unknown',
    label: value.label || 'Unnamed gate',
    evaluate: typeof value.evaluate === 'function' ? value.evaluate : function () {
      return Object.freeze({ pass: true, reason: 'No evaluator provided.' });
    }
  });
}

module.exports = Object.freeze({
  createDeltaGate
});
