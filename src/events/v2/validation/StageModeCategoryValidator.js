'use strict';

const { createValidationDiagnostic } = require('./ValidationDiagnostic');

const ALLOWED_CATEGORIES = Object.freeze([
  'water', 'nutrition', 'environment', 'pest', 'disease', 'positive', 'special'
]);

const ALLOWED_SETUP_MODES = Object.freeze(['indoor', 'outdoor', 'greenhouse']);

function validateStageModeCategory(entry) {
  const diagnostics = [];
  const data = entry && entry.data ? entry.data : {};

  if (data.category && ALLOWED_CATEGORIES.indexOf(data.category) < 0) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'stage_mode_category_invalid_category',
      severity: 'warning',
      fileName: entry && entry.fileName,
      message: 'Unknown category: ' + String(data.category),
      details: { allowed: ALLOWED_CATEGORIES }
    }));
  }

  if (data.triggers && data.triggers.stage) {
    const min = Number(data.triggers.stage.min);
    const max = Number(data.triggers.stage.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      diagnostics.push(createValidationDiagnostic({
        ruleId: 'stage_mode_category_invalid_stage_range',
        severity: 'warning',
        fileName: entry && entry.fileName,
        message: 'Invalid triggers.stage range.'
      }));
    }
  }

  const setupModes = data.triggers && data.triggers.setup && Array.isArray(data.triggers.setup.modeIn)
    ? data.triggers.setup.modeIn
    : [];
  setupModes.forEach((modeValue) => {
    if (ALLOWED_SETUP_MODES.indexOf(modeValue) < 0) {
      diagnostics.push(createValidationDiagnostic({
        ruleId: 'stage_mode_category_invalid_setup_mode',
        severity: 'warning',
        fileName: entry && entry.fileName,
        message: 'Unknown setup mode in triggers.setup.modeIn: ' + String(modeValue),
        details: { allowed: ALLOWED_SETUP_MODES }
      }));
    }
  });

  return Object.freeze(diagnostics);
}

module.exports = Object.freeze({
  ALLOWED_CATEGORIES,
  ALLOWED_SETUP_MODES,
  validateStageModeCategory
});

