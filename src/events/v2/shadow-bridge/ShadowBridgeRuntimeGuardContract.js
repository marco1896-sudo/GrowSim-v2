'use strict';

(function initShadowBridgeRuntimeGuardContract(globalScope) {
  const RUNTIME_GUARD_CONTRACT = Object.freeze({
    defaultEnabled: false,
    allowedModes: Object.freeze(['manual_diagnostic']),
    hardAbortWhen: Object.freeze([
      'blocker_gt_zero',
      'error_gt_zero',
      'warning_gt_zero',
      'budgetWarnings_gt_zero',
      'noopGuarantee_missing',
      'legacyAuthority_not_confirmed',
      'saveTouched_true',
      'runtimeTouched_true',
      'uiReplaced_true',
      'eventActivated_true',
      'snapshot_live_reference_risk'
    ]),
    successRequires: Object.freeze([
      'legacyAuthority_confirmed',
      'noopGuarantee_confirmed',
      'diagnosticSnapshot_only',
      'no_state_mutation',
      'no_persistence_write',
      'manual_input_only',
      'snapshot_clone_safe'
    ])
  });

  const api = Object.freeze({
    RUNTIME_GUARD_CONTRACT
  });

  globalScope.ShadowBridgeRuntimeGuardContract = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
