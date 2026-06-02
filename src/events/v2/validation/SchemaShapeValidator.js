'use strict';

const { createValidationDiagnostic } = require('./ValidationDiagnostic');

function validateSchemaShape(entry, schemas) {
  const diagnostics = [];
  const data = entry && entry.data ? entry.data : {};
  const schemaFile = entry ? entry.expectedSchema : null;

  if (!schemaFile) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'schema_shape_missing_expected_schema',
      severity: 'error',
      fileName: entry && entry.fileName,
      message: 'Missing expected schema mapping for example kind.'
    }));
    return Object.freeze(diagnostics);
  }

  if (!schemas || !schemas[schemaFile]) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'schema_shape_schema_not_found',
      severity: 'error',
      fileName: entry && entry.fileName,
      message: 'Expected schema file is not loaded: ' + schemaFile
    }));
    return Object.freeze(diagnostics);
  }

  if (!Object.prototype.hasOwnProperty.call(data, 'schemaVersion')) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'schema_shape_missing_schema_version',
      severity: 'error',
      fileName: entry && entry.fileName,
      message: 'Missing required top-level field: schemaVersion.'
    }));
  }

  if (!Object.prototype.hasOwnProperty.call(data, 'id')) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'schema_shape_missing_id',
      severity: 'error',
      fileName: entry && entry.fileName,
      message: 'Missing required top-level field: id.'
    }));
  }

  return Object.freeze(diagnostics);
}

module.exports = Object.freeze({
  validateSchemaShape
});

