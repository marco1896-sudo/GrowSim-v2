'use strict';

const { createSchemaDiagnostic } = require('./SchemaDiagnostic');
const { getSchemaRegistration } = require('./SchemaRegistry');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function typeMatches(expectedType, value) {
  if (expectedType === 'array') {
    return Array.isArray(value);
  }
  if (expectedType === 'object') {
    return isObject(value);
  }
  if (expectedType === 'number') {
    return typeof value === 'number' && Number.isFinite(value);
  }
  return typeof value === expectedType;
}

function validateRequiredFields(fileName, data, requiredTopFields) {
  const diagnostics = [];
  requiredTopFields.forEach((fieldName) => {
    if (!Object.prototype.hasOwnProperty.call(data, fieldName)) {
      diagnostics.push(createSchemaDiagnostic({
        ruleId: 'schema_required_top_field_missing',
        severity: 'error',
        fileName,
        message: 'Missing required top-level field: ' + fieldName,
        details: { fieldName: fieldName }
      }));
    }
  });
  return diagnostics;
}

function validateDeclaredRequired(fileName, data, schema) {
  const diagnostics = [];
  const requiredList = Array.isArray(schema.required) ? schema.required : [];
  requiredList.forEach((fieldName) => {
    if (!Object.prototype.hasOwnProperty.call(data, fieldName)) {
      diagnostics.push(createSchemaDiagnostic({
        ruleId: 'schema_declared_required_missing',
        severity: 'warning',
        fileName,
        message: 'Field listed in schema.required is missing: ' + fieldName,
        details: { fieldName: fieldName }
      }));
    }
  });
  return diagnostics;
}

function validateDeclaredPropertyTypes(fileName, data, schema) {
  const diagnostics = [];
  const properties = isObject(schema.properties) ? schema.properties : {};
  Object.keys(properties).forEach((fieldName) => {
    const propertySchema = properties[fieldName];
    if (!propertySchema || !propertySchema.type) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(data, fieldName)) {
      return;
    }
    if (!typeMatches(propertySchema.type, data[fieldName])) {
      diagnostics.push(createSchemaDiagnostic({
        ruleId: 'schema_type_mismatch',
        severity: 'warning',
        fileName,
        message: 'Type mismatch for field: ' + fieldName,
        details: {
          fieldName: fieldName,
          expectedType: propertySchema.type,
          actualType: Array.isArray(data[fieldName]) ? 'array' : typeof data[fieldName]
        }
      }));
    }
  });
  return diagnostics;
}

function validateJsonSchemaDeep(entry, schemas) {
  const diagnostics = [];
  const fileName = entry && entry.fileName ? entry.fileName : null;
  const data = entry && entry.data ? entry.data : {};
  const kind = entry && entry.kind ? entry.kind : 'unknown';
  const registration = getSchemaRegistration(kind);

  if (!registration) {
    diagnostics.push(createSchemaDiagnostic({
      ruleId: 'schema_registry_kind_unmapped',
      severity: 'warning',
      fileName,
      message: 'No schema registry mapping for kind: ' + String(kind)
    }));
    return Object.freeze(diagnostics);
  }

  const schema = schemas && schemas[registration.schemaFile];
  if (!schema) {
    diagnostics.push(createSchemaDiagnostic({
      ruleId: 'schema_registry_file_missing',
      severity: 'error',
      fileName,
      message: 'Schema file not loaded: ' + registration.schemaFile
    }));
    return Object.freeze(diagnostics);
  }

  diagnostics.push.apply(diagnostics, validateRequiredFields(fileName, data, registration.requiredTopFields));
  diagnostics.push.apply(diagnostics, validateDeclaredRequired(fileName, data, schema));
  diagnostics.push.apply(diagnostics, validateDeclaredPropertyTypes(fileName, data, schema));

  diagnostics.push(createSchemaDiagnostic({
    ruleId: 'schema_deep_validation_stub_notice',
    severity: 'info',
    fileName,
    message: 'Deep validation is internal/shallow in Phase 5 (no external JSON-schema engine).'
  }));

  return Object.freeze(diagnostics);
}

module.exports = Object.freeze({
  validateJsonSchemaDeep
});

