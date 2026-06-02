'use strict';

const { validateSchemaShape } = require('./SchemaShapeValidator');
const { validateJsonSchemaDeep } = require('./JsonSchemaDeepValidator');
const { validateI18nKeys } = require('./I18nKeyValidator');
const { validateLocaleIntegrity } = require('./LocaleIntegrityValidator');
const { validateAssetRefs } = require('./AssetRefValidator');
const { validateAssetIntegrity } = require('./AssetIntegrityValidator');
const { validateStageModeCategory } = require('./StageModeCategoryValidator');
const { validateQualityRules } = require('./QualityRuleValidator');
const { validateCrossReferences } = require('./CrossReferenceValidator');
const { runValidationPipeline } = require('./ValidationPipeline');
const ValidationStage = require('./ValidationStage');
const { filterDiagnostics } = require('./NoiseFilter');
const { RuleFamily, normalizeRuleFamily, summarizeByRuleFamily } = require('./RuleFamily');
const { DEFAULT_RULE_FAMILY_WEIGHTS, resolveRuleFamilyWeight } = require('./RuleFamilyWeights');
const { getRuleProfile } = require('./RuleProfileRegistry');
const { missingFieldSeverity, invalidReferenceSeverity, resolveSeverity } = require('./SeverityThresholds');
const { resolveLocaleKey } = require('./LocaleKeyResolver');
const { classifyExtension } = require('./AssetTypeRules');
const RuleScope = require('./RuleScope');
const { DiagnosticSeverity } = require('./DiagnosticSeverity');

function runAllValidators(entry, schemas) {
  return Object.freeze([]
    .concat(validateSchemaShape(entry, schemas))
    .concat(validateJsonSchemaDeep(entry, schemas))
    .concat(validateI18nKeys(entry))
    .concat(validateLocaleIntegrity(entry))
    .concat(validateAssetRefs(entry))
    .concat(validateAssetIntegrity(entry))
    .concat(validateStageModeCategory(entry))
    .concat(validateQualityRules(entry)));
}

module.exports = Object.freeze({
  runAllValidators,
  validateSchemaShape,
  validateJsonSchemaDeep,
  validateI18nKeys,
  validateLocaleIntegrity,
  validateAssetRefs,
  validateAssetIntegrity,
  validateStageModeCategory,
  validateQualityRules,
  validateCrossReferences,
  runValidationPipeline,
  ValidationStage,
  filterDiagnostics,
  RuleFamily,
  normalizeRuleFamily,
  summarizeByRuleFamily,
  DEFAULT_RULE_FAMILY_WEIGHTS,
  resolveRuleFamilyWeight,
  getRuleProfile,
  missingFieldSeverity,
  invalidReferenceSeverity,
  resolveSeverity,
  resolveLocaleKey,
  classifyExtension,
  RuleScope,
  DiagnosticSeverity
});
