'use strict';

const { createValidationDiagnostic } = require('./ValidationDiagnostic');
const RuleScope = require('./RuleScope');
const { DiagnosticSeverity } = require('./DiagnosticSeverity');
const { getRuleProfile } = require('./RuleProfileRegistry');
const { missingFieldSeverity, resolveSeverity } = require('./SeverityThresholds');

const ALLOWED_SEVERITY_LEVELS = Object.freeze(['info', 'warning', 'critical', 'emergency', 1, 2, 3, 4, 5]);

function hasVisualAssetTagOrCover(data) {
  if (typeof data.assetTag === 'string' && data.assetTag.trim().length > 0) {
    return true;
  }
  return Boolean(data.assets && data.assets.cover && typeof data.assets.cover.src === 'string' && data.assets.cover.src.trim().length > 0);
}

function validateQualityRules(entry) {
  const diagnostics = [];
  const data = entry && entry.data ? entry.data : {};
  const kind = entry && entry.kind ? entry.kind : 'unknown';
  const profile = getRuleProfile(kind);
  const overrides = profile.severityOverrides || {};
  const fileName = entry && entry.fileName;

  function hasField(fieldName) {
    return Object.prototype.hasOwnProperty.call(data, fieldName);
  }

  function pushMissingFieldDiagnostic(fieldName, scope) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'profile_missing_field',
      severity: resolveSeverity(missingFieldSeverity(scope, kind), overrides.profile_missing_field),
      ruleScope: scope,
      fileName: fileName,
      message: 'Missing field for profile [' + kind + ']: ' + fieldName,
      details: { kind: kind, fieldName: fieldName, scope: scope }
    }));
  }

  profile.requiredFields.forEach((fieldName) => {
    if (!hasField(fieldName)) {
      pushMissingFieldDiagnostic(fieldName, RuleScope.REQUIRED);
    }
  });
  profile.recommendedFields.forEach((fieldName) => {
    if (!hasField(fieldName)) {
      pushMissingFieldDiagnostic(fieldName, RuleScope.RECOMMENDED);
    }
  });

  if (typeof data.id !== 'string' || data.id.trim().length === 0) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'qr_missing_id',
      severity: resolveSeverity(DiagnosticSeverity.BLOCKER, overrides.qr_missing_id),
      ruleScope: RuleScope.REQUIRED,
      fileName: fileName,
      message: 'Missing or empty id.'
    }));
  }

  if (kind === 'event' && (typeof data.category !== 'string' || data.category.trim().length === 0)) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'qr_missing_category',
      severity: resolveSeverity(DiagnosticSeverity.ERROR, overrides.qr_missing_category),
      ruleScope: RuleScope.REQUIRED,
      fileName: fileName,
      message: 'Missing or empty category.'
    }));
  }

  if (kind === 'event' && (!data.triggers || !data.triggers.stage)) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'qr_missing_stages',
      severity: resolveSeverity(DiagnosticSeverity.WARNING, overrides.qr_missing_stages),
      ruleScope: RuleScope.RECOMMENDED,
      fileName: fileName,
      message: 'Missing trigger stage information.'
    }));
  }

  const isLearningOrStory = data.type === 'learning_beat' || data.type === 'story_beat' || (Array.isArray(data.tags) && data.tags.indexOf('learning_beat') >= 0);
  if (isLearningOrStory && (!data.learningCard || typeof data.learningCard.ref !== 'string' || data.learningCard.ref.trim().length === 0)) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'qr_missing_learning_fields',
      severity: resolveSeverity(DiagnosticSeverity.WARNING, overrides.qr_missing_learning_fields),
      ruleScope: RuleScope.RECOMMENDED,
      fileName: fileName,
      message: 'Learning/story beat is missing learningCard.ref.'
    }));
  }

  const severityValue = data.severity && Object.prototype.hasOwnProperty.call(data.severity, 'level')
    ? data.severity.level
    : data.severity;
  if (!ALLOWED_SEVERITY_LEVELS.some((allowed) => allowed === severityValue)) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'qr_unclear_severity',
      severity: resolveSeverity(DiagnosticSeverity.ERROR, overrides.qr_unclear_severity),
      ruleScope: RuleScope.REQUIRED,
      fileName: fileName,
      message: 'Severity value is missing or outside allowed levels.'
    }));
  }

  if (kind === 'event' && !hasVisualAssetTagOrCover(data)) {
    diagnostics.push(createValidationDiagnostic({
      ruleId: 'qr_missing_asset_tag_or_cover',
      severity: resolveSeverity(DiagnosticSeverity.WARNING, overrides.qr_missing_asset_tag_or_cover),
      ruleScope: RuleScope.RECOMMENDED,
      fileName: fileName,
      message: 'Visual payload has no assetTag and no assets.cover.src.'
    }));
  }

  return Object.freeze(diagnostics);
}

module.exports = Object.freeze({
  ALLOWED_SEVERITY_LEVELS,
  validateQualityRules
});
