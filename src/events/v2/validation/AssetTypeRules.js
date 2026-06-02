'use strict';

const RuleScope = require('./RuleScope');
const { DiagnosticSeverity } = require('./DiagnosticSeverity');

const AssetTypeRules = Object.freeze({
  webp: Object.freeze({ severity: DiagnosticSeverity.INFO, scope: RuleScope.RECOMMENDED, label: 'preferred' }),
  png: Object.freeze({ severity: DiagnosticSeverity.WARNING, scope: RuleScope.RECOMMENDED, label: 'legacy-fallback' }),
  jpg: Object.freeze({ severity: DiagnosticSeverity.WARNING, scope: RuleScope.OPTIONAL, label: 'lossy-warning' }),
  jpeg: Object.freeze({ severity: DiagnosticSeverity.WARNING, scope: RuleScope.OPTIONAL, label: 'lossy-warning' })
});

function extensionOf(filePath) {
  if (typeof filePath !== 'string') {
    return '';
  }
  const idx = filePath.lastIndexOf('.');
  return idx >= 0 ? filePath.slice(idx + 1).toLowerCase() : '';
}

function classifyExtension(filePath) {
  const ext = extensionOf(filePath);
  const rule = AssetTypeRules[ext];
  if (!rule) {
    return Object.freeze({
      extension: ext,
      severity: DiagnosticSeverity.ERROR,
      scope: RuleScope.REQUIRED,
      label: 'unsupported-format'
    });
  }
  return Object.freeze({
    extension: ext,
    severity: rule.severity,
    scope: rule.scope,
    label: rule.label
  });
}

module.exports = Object.freeze({
  AssetTypeRules,
  classifyExtension
});

