'use strict';

const RuleFamily = Object.freeze({
  SCHEMA: 'schema',
  I18N: 'i18n',
  ASSET: 'asset',
  CROSS_REFERENCE: 'crossReference',
  QUALITY: 'quality',
  SCORING: 'scoring',
  FUTURE: 'future'
});

function normalizeRuleFamily(value) {
  const raw = String(value || '').trim();
  const values = Object.values(RuleFamily);
  return values.indexOf(raw) >= 0 ? raw : RuleFamily.FUTURE;
}

function summarizeByRuleFamily(diagnostics) {
  const out = {};
  Object.values(RuleFamily).forEach((family) => {
    out[family] = 0;
  });

  (Array.isArray(diagnostics) ? diagnostics : []).forEach((diag) => {
    const family = normalizeRuleFamily(diag && diag.ruleFamily);
    out[family] += 1;
  });

  return Object.freeze(out);
}

module.exports = Object.freeze({
  RuleFamily,
  normalizeRuleFamily,
  summarizeByRuleFamily
});
