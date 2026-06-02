'use strict';

const { createValidationDiagnostic } = require('./ValidationDiagnostic');
const RuleScope = require('./RuleScope');
const { DiagnosticSeverity } = require('./DiagnosticSeverity');

function validateAssetRefs(entry) {
  const diagnostics = [];
  const data = entry && entry.data ? entry.data : {};
  const assets = data.assets;

  if (!assets) {
    const isLearningCard = entry && entry.kind === 'learning-card';
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'asset_refs_missing_assets_block',
      severity: isLearningCard ? DiagnosticSeverity.INFO : DiagnosticSeverity.WARNING,
      ruleScope: isLearningCard ? RuleScope.OPTIONAL : RuleScope.RECOMMENDED,
      fileName: entry && entry.fileName,
      message: isLearningCard
        ? 'assets block is missing for learning-card payload. Allowed as optional in current UI-Lab phase.'
        : 'assets block is missing. Asset reference checks are limited.'
    }));
    return Object.freeze(diagnostics);
  }

  if (assets.cover) {
    if (typeof assets.cover.src !== 'string' || assets.cover.src.trim().length === 0) {
      diagnostics.push(createValidationDiagnostic({
        ruleId: 'asset_refs_missing_cover_src',
        severity: DiagnosticSeverity.WARNING,
        ruleScope: RuleScope.RECOMMENDED,
        fileName: entry && entry.fileName,
        message: 'assets.cover.src is missing or empty.'
      }));
    }
  } else {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'asset_refs_missing_cover',
      severity: DiagnosticSeverity.WARNING,
      ruleScope: RuleScope.RECOMMENDED,
      fileName: entry && entry.fileName,
      message: 'assets.cover is missing for visual event payload.'
    }));
  }

  diagnostics.push(createValidationDiagnostic({
    ruleId: 'asset_refs_filesystem_integrity_todo',
    severity: DiagnosticSeverity.INFO,
    ruleScope: RuleScope.FUTURE,
    fileName: entry && entry.fileName,
    message: 'Filesystem asset existence checks are TODO for a later phase.'
  }));

  return Object.freeze(diagnostics);
}

module.exports = Object.freeze({
  validateAssetRefs
});
