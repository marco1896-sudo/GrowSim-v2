'use strict';

const fs = require('fs');
const path = require('path');
const { createValidationDiagnostic } = require('./ValidationDiagnostic');
const RuleScope = require('./RuleScope');
const { DiagnosticSeverity } = require('./DiagnosticSeverity');
const { classifyExtension } = require('./AssetTypeRules');
const UI_LAB_ACCEPTED_FALLBACKS = Object.freeze([
  'assets/events/event-stress-recovery.png'
]);

function toAbsoluteProjectPath(relativePathValue) {
  const root = path.resolve(__dirname, '..', '..', '..', '..');
  return path.join(root, relativePathValue);
}

function collectAssetPaths(data) {
  const results = [];
  if (!data || typeof data !== 'object') {
    return results;
  }

  if (data.assets && data.assets.cover && typeof data.assets.cover.src === 'string') {
    results.push(data.assets.cover.src);
  }

  if (data.assets && data.assets.cover && typeof data.assets.cover.fallback === 'string') {
    results.push(data.assets.cover.fallback);
  }

  if (data.assets && data.assets.spriteOverlays && typeof data.assets.spriteOverlays === 'object') {
    Object.keys(data.assets.spriteOverlays).forEach((key) => {
      const value = data.assets.spriteOverlays[key];
      if (typeof value === 'string') {
        results.push(value);
      }
    });
  }

  if (data.presentation && typeof data.presentation.preferredHeroAsset === 'string') {
    results.push(data.presentation.preferredHeroAsset);
  }

  return results;
}

function validateAssetIntegrity(entry) {
  const diagnostics = [];
  const data = entry && entry.data ? entry.data : {};
  const fileName = entry && entry.fileName;
  const assetPaths = collectAssetPaths(data);

  if (assetPaths.length === 0) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'asset_integrity_no_assets_detected',
      severity: DiagnosticSeverity.INFO,
      ruleScope: RuleScope.FUTURE,
      fileName,
      message: 'No asset paths detected in example payload.'
    }));
    return Object.freeze(diagnostics);
  }

  assetPaths.forEach((assetPath) => {
    if (assetPath.indexOf('..') >= 0) {
      diagnostics.push(createValidationDiagnostic({
        ruleId: 'asset_integrity_relative_escape_detected',
        severity: DiagnosticSeverity.ERROR,
        ruleScope: RuleScope.REQUIRED,
        fileName,
        message: 'Asset path contains disallowed parent traversal.',
        details: { assetPath: assetPath }
      }));
      return;
    }

    const extensionRule = classifyExtension(assetPath);
    if (extensionRule.label !== 'preferred') {
      const isMiniCatalogUiLabFallback =
        extensionRule.label === 'legacy-fallback' &&
        Array.isArray(data.tags) &&
        data.tags.indexOf('mini_catalog_startset') >= 0;
      const isUiLabAcceptedFallback =
        extensionRule.label === 'legacy-fallback' &&
        UI_LAB_ACCEPTED_FALLBACKS.indexOf(assetPath) >= 0;
      const treatAsUiLabAccepted = isUiLabAcceptedFallback || isMiniCatalogUiLabFallback;
      diagnostics.push(createValidationDiagnostic({
        ruleId: 'asset_integrity_extension_check',
        severity: treatAsUiLabAccepted ? DiagnosticSeverity.INFO : extensionRule.severity,
        ruleScope: treatAsUiLabAccepted ? RuleScope.FUTURE : extensionRule.scope,
        fileName,
        message: treatAsUiLabAccepted
          ? 'Legacy PNG accepted for UI-Lab transition: ' + assetPath
          : 'Asset extension classified as ' + extensionRule.label + ' for: ' + assetPath,
        details: {
          assetPath: assetPath,
          extension: extensionRule.extension,
          uiLabAcceptedFallback: treatAsUiLabAccepted
        }
      }));
    }

    const abs = toAbsoluteProjectPath(assetPath);
    if (!fs.existsSync(abs)) {
      diagnostics.push(createValidationDiagnostic({
        ruleId: 'asset_integrity_missing_file',
        severity: DiagnosticSeverity.WARNING,
        ruleScope: RuleScope.RECOMMENDED,
        fileName,
        message: 'Referenced asset file does not exist.',
        details: { assetPath: assetPath, absolutePath: abs }
      }));
    }
  });

  return Object.freeze(diagnostics);
}

module.exports = Object.freeze({
  validateAssetIntegrity
});
