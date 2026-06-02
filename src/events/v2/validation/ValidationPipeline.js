'use strict';

const ValidationStage = require('./ValidationStage');
const { filterDiagnostics } = require('./NoiseFilter');
const { validateCrossReferences } = require('./CrossReferenceValidator');
const { validateSchemaShape } = require('./SchemaShapeValidator');
const { validateJsonSchemaDeep } = require('./JsonSchemaDeepValidator');
const { validateI18nKeys } = require('./I18nKeyValidator');
const { validateLocaleIntegrity } = require('./LocaleIntegrityValidator');
const { validateAssetRefs } = require('./AssetRefValidator');
const { validateAssetIntegrity } = require('./AssetIntegrityValidator');
const { validateStageModeCategory } = require('./StageModeCategoryValidator');
const { validateQualityRules } = require('./QualityRuleValidator');

function collectStage(stageId, diagnostics) {
  return Object.freeze({
    stage: stageId,
    count: Array.isArray(diagnostics) ? diagnostics.length : 0,
    diagnostics: Object.freeze(Array.isArray(diagnostics) ? diagnostics : [])
  });
}

function runSchemaStage(entries, schemas) {
  const out = [];
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    out.push.apply(out, validateSchemaShape(entry, schemas));
    out.push.apply(out, validateJsonSchemaDeep(entry, schemas));
  });
  return out;
}

function runIntegrityStage(entries, schemas) {
  const out = [];
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    out.push.apply(out, validateI18nKeys(entry, schemas));
    out.push.apply(out, validateLocaleIntegrity(entry, schemas));
    out.push.apply(out, validateAssetRefs(entry, schemas));
    out.push.apply(out, validateAssetIntegrity(entry, schemas));
    out.push.apply(out, validateStageModeCategory(entry, schemas));
  });
  return out;
}

function runCrossRefStage(entries) {
  return validateCrossReferences(entries);
}

function runQualityStage(entries, schemas) {
  const out = [];
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    out.push.apply(out, validateQualityRules(entry, schemas));
  });
  return out;
}

function runValidationPipeline(input) {
  const value = input || {};
  const entries = Array.isArray(value.entries) ? value.entries : [];
  const schemas = value.schemas || {};
  const filter = value.filter || null;
  const stageSelection = Array.isArray(value.stages) ? value.stages : [
    ValidationStage.SCHEMA,
    ValidationStage.INTEGRITY,
    ValidationStage.CROSS_REF,
    ValidationStage.QUALITY
  ];

  const stageResults = [];
  let diagnostics = [];
  const entryKinds = { event: 0, chain: 0, 'learning-card': 0, unknown: 0 };
  entries.forEach((entry) => {
    const kind = entryKinds[entry.kind] !== undefined ? entry.kind : 'unknown';
    entryKinds[kind] += 1;
  });

  stageSelection.forEach((stageId) => {
    let stageDiagnostics = [];
    if (stageId === ValidationStage.SCHEMA) stageDiagnostics = runSchemaStage(entries, schemas);
    if (stageId === ValidationStage.INTEGRITY) stageDiagnostics = runIntegrityStage(entries, schemas);
    if (stageId === ValidationStage.CROSS_REF) stageDiagnostics = runCrossRefStage(entries);
    if (stageId === ValidationStage.QUALITY) stageDiagnostics = runQualityStage(entries, schemas);
    diagnostics = diagnostics.concat(stageDiagnostics);
    stageResults.push(collectStage(stageId, stageDiagnostics));
  });

  const filteredDiagnostics = filter ? filterDiagnostics(diagnostics, filter) : Object.freeze(diagnostics.slice());

  return Object.freeze({
    sourceMode: value.sourceMode || 'examplesOnly',
    entryKinds: Object.freeze(entryKinds),
    stages: Object.freeze(stageResults),
    diagnostics: Object.freeze(diagnostics),
    filteredDiagnostics: filteredDiagnostics
  });
}

module.exports = Object.freeze({
  runValidationPipeline,
  ValidationStage
});
