'use strict';

(function initShadowBridgeRollbackPlan(globalScope) {
  const ROLLBACK_PLAN = Object.freeze({
    phase: 35,
    status: 'plan_only',
    rollbackDefinition: 'Return the guarded entry to disabled/no-op and remove the single future hook if required.',
    persistenceRollbackRequired: false,
    saveMigrationRollbackRequired: false,
    uiRollbackRequired: false,
    steps: Object.freeze([
      'keep_legacy_authoritative',
      'disable_guarded_entry',
      'return_noop_result',
      'remove_future_hook_if_added',
      'rerun_combined_report_harness',
      'verify_no_save_or_ui_changes'
    ]),
    abortCriteria: Object.freeze([
      'combined_report_blocked',
      'any_guardrail_true',
      'exception_in_future_hook',
      'performance_regression_in_tick_path',
      'unexpected_runtime_import'
    ])
  });

  function describeRollbackPlan() {
    return ROLLBACK_PLAN;
  }

  const api = Object.freeze({
    ROLLBACK_PLAN,
    describeRollbackPlan
  });

  globalScope.ShadowBridgeRollbackPlan = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

