'use strict';

const Loader = require('../catalog/CatalogLoader');
const Parser = require('../catalog/CatalogParser');
const Index = require('../catalog/CatalogIndex');
const { computeCoverageReport } = require('../catalog/CatalogCoverageReport');
const Rules = require('./CatalogValidationRules');
const { runValidationPipeline } = require('./ValidationPipeline');
const { createValidationDiagnostic } = require('./ValidationDiagnostic');
const RuleScope = require('./RuleScope');
const { DiagnosticSeverity } = require('./DiagnosticSeverity');
const { RuleFamily } = require('./RuleFamily');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateCatalogExamples(options) {
  const value = options || {};
  const mode = value.sourceMode || 'examplesOnly';
  const catalog = Loader.loadCatalogByMode(mode, { includeFixtures: value.includeFixtures === true });
  const parsed = Parser.parseCatalogRecords(catalog.examples);
  const index = Index.buildCatalogIndex(parsed);
  const coverageReport = computeCoverageReport(parsed);

  const errors = [];
  const warnings = [];
  const infos = [];
  const blockers = [];

  parsed.forEach((entry) => {
    const baseDiagnostics = [];
    if (entry.kind === 'unknown') {
      baseDiagnostics.push(createValidationDiagnostic({
        ruleId: Rules.supportedExampleType.id,
        ruleFamily: RuleFamily.SCHEMA,
        severity: DiagnosticSeverity.ERROR,
        ruleScope: RuleScope.REQUIRED,
        fileName: entry.fileName,
        message: 'Unsupported example file suffix.'
      }));
    }

    if (entry.kind !== 'unknown' && !catalog.schemas[entry.expectedSchema]) {
      baseDiagnostics.push(createValidationDiagnostic({
        ruleId: Rules.schemaPresence.id,
        ruleFamily: RuleFamily.SCHEMA,
        severity: DiagnosticSeverity.ERROR,
        ruleScope: RuleScope.REQUIRED,
        fileName: entry.fileName,
        message: 'Expected schema file not found: ' + entry.expectedSchema
      }));
    }

    if (!isPlainObject(entry.data)) {
      baseDiagnostics.push(createValidationDiagnostic({
        ruleId: Rules.jsonRootObject.id,
        ruleFamily: RuleFamily.SCHEMA,
        severity: DiagnosticSeverity.ERROR,
        ruleScope: RuleScope.REQUIRED,
        fileName: entry.fileName,
        message: 'JSON root must be an object.'
      }));
    }

    baseDiagnostics.forEach((diag) => {
      if (diag.severity === 'error') errors.push(diag);
    });
  });

  const pipelineResult = runValidationPipeline({
    entries: parsed,
    schemas: catalog.schemas,
    sourceMode: catalog.sourceMode || mode
  });
  pipelineResult.diagnostics.forEach((diag) => {
    if (diag.severity === 'blocker') {
      blockers.push(diag);
    } else if (diag.severity === 'error') {
      errors.push(diag);
    } else if (diag.severity === 'info') {
      infos.push(diag);
    } else {
      warnings.push(diag);
    }
  });

  return Object.freeze({
    ok: blockers.length === 0 && errors.length === 0,
    filesChecked: parsed.length,
    sourceMode: catalog.sourceMode || mode,
    counts: Object.freeze({
      events: index.byKind.event.length,
      chains: index.byKind.chain.length,
      learningCards: index.byKind['learning-card'].length,
      unknown: index.byKind.unknown.length
    }),
    coverage: coverageReport,
    blockers: Object.freeze(blockers),
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    infos: Object.freeze(infos),
    pipeline: pipelineResult
  });
}

module.exports = Object.freeze({
  validateCatalogExamples
});
