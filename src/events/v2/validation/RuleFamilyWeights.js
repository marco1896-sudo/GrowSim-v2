'use strict';

const { RuleFamily, normalizeRuleFamily } = require('./RuleFamily');

const DEFAULT_RULE_FAMILY_WEIGHTS = Object.freeze({
  [RuleFamily.SCHEMA]: 1.25,
  [RuleFamily.I18N]: 1.0,
  [RuleFamily.ASSET]: 1.0,
  [RuleFamily.CROSS_REFERENCE]: 1.2,
  [RuleFamily.QUALITY]: 1.1,
  [RuleFamily.SCORING]: 0.8,
  [RuleFamily.FUTURE]: 0.5
});

function resolveRuleFamilyWeight(ruleFamily, overrides) {
  const family = normalizeRuleFamily(ruleFamily);
  const merged = Object.assign({}, DEFAULT_RULE_FAMILY_WEIGHTS, overrides || {});
  const weight = Number(merged[family]);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
}

module.exports = Object.freeze({
  DEFAULT_RULE_FAMILY_WEIGHTS,
  resolveRuleFamilyWeight
});
