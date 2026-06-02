'use strict';

(function initShadowBridgePreflight(globalScope) {
  function evaluatePreflight(input) {
    const metrics = input || {};
    const blockers = Number(metrics.blocker || 0);
    const errors = Number(metrics.error || 0);
    const warnings = Number(metrics.warning || 0);
    const budgetWarnings = Number(metrics.budgetWarnings || 0);
    const passCount = Number(metrics.bridgePass || 0);
    const totalEvents = Number(metrics.totalEvents || 0);
    const infoDensity = Number(metrics.infoDensity || 0);
    const runtimeTouched = Boolean(metrics.runtimeTouched);
    const saveTouched = Boolean(metrics.saveTouched);
    const uiReplaced = Boolean(metrics.uiReplaced);
    const featureFlagsTouched = Boolean(metrics.featureFlagsTouched);
    const legacyEventsTouched = Boolean(metrics.legacyEventsTouched);

    if (runtimeTouched || saveTouched || uiReplaced || featureFlagsTouched || legacyEventsTouched) {
      return { decision: 'not_ready', reasons: ['shadow_bridge_guardrail_violation'] };
    }
    if (blockers > 0 || errors > 0) {
      return { decision: 'not_ready', reasons: ['blocking_diagnostics_present'] };
    }
    if (warnings > 0 || budgetWarnings > 0) {
      return { decision: 'ready_with_conditions', reasons: ['warnings_must_be_cleared_before_bridge'] };
    }
    if (passCount < totalEvents) {
      return { decision: 'ready_with_conditions', reasons: ['bridge_pass_count_not_complete'] };
    }
    if (infoDensity > 8.0) {
      return { decision: 'ready_with_conditions', reasons: ['info_density_too_high_for_prep_lock'] };
    }
    return { decision: 'ready_for_bridge_planning', reasons: ['all_core_preflight_gates_green'] };
  }

  const api = Object.freeze({
    evaluatePreflight
  });

  globalScope.ShadowBridgePreflight = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
