'use strict';

function createBaselineEvolutionRule(input) {
  const value = input || {};
  return Object.freeze({
    id: value.id || 'rule_unknown',
    description: value.description || 'No rule description.',
    evaluate: typeof value.evaluate === 'function' ? value.evaluate : function () { return { status: 'allow', reason: 'No-op rule.' }; }
  });
}

module.exports = Object.freeze({ createBaselineEvolutionRule });
