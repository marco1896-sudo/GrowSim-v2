'use strict';

(function initEventV2BridgeReadinessGate(globalScope) {
  function evaluateBridgeReadiness(input) {
    const completeness = input.completeness || {};
    const diagnostics = input.diagnosticSummary || {};
    const budgetWarningCount = Number(input.budgetWarningCount || 0);
    const learningMissingOptional = Boolean(input.learningMissingOptional);

    const blocker = Number(diagnostics.blocker || 0);
    const error = Number(diagnostics.error || 0);
    const warning = Number(diagnostics.warning || 0);

    const reasons = [];
    if (!completeness.requiredComplete) reasons.push('required_slot_missing');
    if (blocker > 0) reasons.push('blocker_diagnostics_present');
    if (error > 0) reasons.push('error_diagnostics_present');

    if (reasons.length > 0) {
      return { bridgeReadiness: 'blocked', reasons };
    }

    const softReasons = [];
    if ((completeness.recommendedMissing || []).length > 0) softReasons.push('recommended_slot_missing');
    if (warning > 0) softReasons.push('warning_diagnostics_present');
    if (budgetWarningCount > 0) softReasons.push('budget_warning_present');
    if (learningMissingOptional) softReasons.push('learning_optional_missing');

    if (softReasons.length > 0) {
      return { bridgeReadiness: 'warning', reasons: softReasons };
    }

    return { bridgeReadiness: 'pass', reasons: ['info_or_clean_only'] };
  }

  const api = Object.freeze({
    evaluateBridgeReadiness
  });

  globalScope.EventV2BridgeReadinessGate = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

