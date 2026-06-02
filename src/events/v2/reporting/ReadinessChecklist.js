'use strict';

function hasInvalidAssetFormat(diagnostics) {
  return (Array.isArray(diagnostics) ? diagnostics : []).some((diag) => {
    const ruleId = String((diag && diag.ruleId) || '');
    return ruleId.indexOf('asset') >= 0 && String(diag.severity) !== 'info' && String(diag.severity) !== 'warning';
  });
}

function countRequiredCrossRefErrors(diagnostics) {
  return (Array.isArray(diagnostics) ? diagnostics : []).filter((diag) => {
    return String(diag.ruleFamily || '') === 'crossReference'
      && String(diag.ruleScope || '') === 'required'
      && (String(diag.severity) === 'error' || String(diag.severity) === 'blocker');
  }).length;
}

function evaluateReadiness(input) {
  const value = input || {};
  const summary = value.summary || {};
  const health = value.health || {};
  const diagnostics = Array.isArray(value.diagnostics) ? value.diagnostics : [];
  const coverage = value.coverage || {};
  const profile = value.profile || {};
  const minHealth = Number.isFinite(Number(value.minHealthScore)) ? Number(value.minHealthScore) : (Number(profile.minHealthScore) || 70);
  const minStageCoverage = Number.isFinite(Number(value.minStageCoverage)) ? Number(value.minStageCoverage) : (Number(profile.minStageCoverage) || 2);
  const minModeCoverage = Number.isFinite(Number(value.minModeCoverage)) ? Number(value.minModeCoverage) : (Number(profile.minModeCoverage) || 2);
  const minCategoryCoverage = Number.isFinite(Number(value.minCategoryCoverage)) ? Number(value.minCategoryCoverage) : (Number(profile.minCategoryCoverage) || 2);

  const checks = [
    Object.freeze({ id: 'no_blockers', pass: Number((summary.bySeverity && summary.bySeverity.blocker) || 0) === 0 }),
    Object.freeze({ id: 'health_over_target', pass: Number(health.score || 0) >= minHealth }),
    Object.freeze({ id: 'stage_coverage', pass: Number(coverage.stageCount || 0) >= minStageCoverage }),
    Object.freeze({ id: 'mode_coverage', pass: Number((coverage.modes && coverage.modes.length) || 0) >= minModeCoverage }),
    Object.freeze({ id: 'category_coverage', pass: Number(coverage.categoryCount || 0) >= minCategoryCoverage }),
    Object.freeze({ id: 'required_cross_ref', pass: countRequiredCrossRefErrors(diagnostics) === 0 }),
    Object.freeze({ id: 'asset_formats', pass: !hasInvalidAssetFormat(diagnostics) })
  ];

  return Object.freeze({
    ready: checks.every((c) => c.pass),
    profileId: profile.id || null,
    checks: Object.freeze(checks)
  });
}

module.exports = Object.freeze({
  evaluateReadiness
});
