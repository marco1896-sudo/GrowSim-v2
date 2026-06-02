'use strict';

const { createValidationDiagnostic } = require('./ValidationDiagnostic');

function isValidKey(value) {
  return typeof value === 'string' && value.trim().length > 2 && value.indexOf('.') > 0;
}

function validateI18nKeys(entry) {
  const diagnostics = [];
  const data = entry && entry.data ? entry.data : {};
  const i18n = data.i18n;

  if (!i18n) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'i18n_missing_block',
      severity: 'warning',
      fileName: entry && entry.fileName,
      message: 'i18n block is missing. Skipping key checks in Phase 4.'
    }));
    return Object.freeze(diagnostics);
  }

  const requiredKeys = Array.isArray(i18n.requiredKeys) ? i18n.requiredKeys : [];
  if (requiredKeys.length === 0) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'i18n_missing_required_keys',
      severity: 'warning',
      fileName: entry && entry.fileName,
      message: 'i18n.requiredKeys is missing or empty.'
    }));
  }

  requiredKeys.forEach((keyValue, idx) => {
    if (!isValidKey(keyValue)) {
      diagnostics.push(createValidationDiagnostic({
        ruleId: 'i18n_invalid_key_format',
        severity: 'warning',
        fileName: entry && entry.fileName,
        message: 'Invalid i18n key format at requiredKeys[' + idx + '].',
        details: { keyValue: keyValue }
      }));
    }
  });

  return Object.freeze(diagnostics);
}

module.exports = Object.freeze({
  validateI18nKeys
});

