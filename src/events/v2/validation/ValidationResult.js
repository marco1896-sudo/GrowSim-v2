'use strict';

/**
 * Validation result contract stub.
 * Phase 1: data shape only.
 */
const ValidationResult = Object.freeze({
  ok: false,
  errors: Object.freeze([]),
  warnings: Object.freeze([]),
  filesChecked: 0
});

module.exports = ValidationResult;
