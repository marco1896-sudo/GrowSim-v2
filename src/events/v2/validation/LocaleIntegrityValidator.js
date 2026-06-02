'use strict';

const fs = require('fs');
const path = require('path');
const { createValidationDiagnostic } = require('./ValidationDiagnostic');
const RuleScope = require('./RuleScope');
const { DiagnosticSeverity } = require('./DiagnosticSeverity');
const { resolveLocaleKey } = require('./LocaleKeyResolver');

function readLocaleFile(localeName) {
  const root = path.resolve(__dirname, '..', '..', '..', '..');
  const localePath = path.join(root, 'src', 'i18n', 'locales', localeName + '.json');
  if (!fs.existsSync(localePath)) {
    return Object.freeze({ exists: false, data: null, localePath: localePath });
  }
  const raw = fs.readFileSync(localePath, 'utf8');
  return Object.freeze({ exists: true, data: JSON.parse(raw), localePath: localePath });
}

function validateLocaleIntegrity(entry) {
  const diagnostics = [];
  const fileName = entry && entry.fileName;
  const data = entry && entry.data ? entry.data : {};
  const i18n = data.i18n || {};
  const requiredKeys = Array.isArray(i18n.requiredKeys) ? i18n.requiredKeys : [];
  const supportedLocales = Array.isArray(i18n.supportedLocales) ? i18n.supportedLocales : [];

  if (requiredKeys.length === 0 || supportedLocales.length === 0) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'locale_integrity_insufficient_i18n_block',
      severity: DiagnosticSeverity.INFO,
      ruleScope: RuleScope.FUTURE,
      fileName,
      message: 'Skipping locale key resolution because i18n.requiredKeys or supportedLocales is empty.'
    }));
    return Object.freeze(diagnostics);
  }

  supportedLocales.forEach((localeName) => {
    const localeFile = readLocaleFile(localeName);
    if (!localeFile.exists) {
      diagnostics.push(createValidationDiagnostic({
        ruleId: 'locale_integrity_locale_file_missing',
        severity: DiagnosticSeverity.ERROR,
        ruleScope: RuleScope.REQUIRED,
        fileName,
        message: 'Locale file not found for: ' + localeName,
        details: { localePath: localeFile.localePath }
      }));
      return;
    }

    requiredKeys.forEach((keyPath) => {
      const resolution = resolveLocaleKey(localeFile.data, keyPath);
      if (!resolution.matched) {
        diagnostics.push(createValidationDiagnostic({
          ruleId: 'locale_integrity_key_missing',
          severity: DiagnosticSeverity.WARNING,
          ruleScope: RuleScope.RECOMMENDED,
          fileName,
          message: 'Locale key is missing in ' + localeName + ': ' + keyPath,
          details: { locale: localeName, keyPath: keyPath, resolution: resolution.strategy }
        }));
      }
    });
  });

  return Object.freeze(diagnostics);
}

module.exports = Object.freeze({
  validateLocaleIntegrity
});
