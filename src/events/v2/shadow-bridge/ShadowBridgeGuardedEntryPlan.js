'use strict';

(function initShadowBridgeGuardedEntryPlan(globalScope) {
  const GUARDED_ENTRY_PLAN = Object.freeze({
    phase: 35,
    status: 'plan_only_no_runtime_hook',
    defaultEnabled: false,
    defaultMode: 'noop',
    authority: 'legacy_authoritative',
    output: 'diagnostic_snapshot_only',
    expectedReturnShape: Object.freeze({
      ok: 'boolean',
      safeToProceed: 'boolean',
      mode: 'guarded_read_only_noop',
      runtimeTouched: false,
      saveTouched: false,
      uiReplaced: false,
      featureFlagsTouched: false,
      legacyEventsTouched: false,
      eventActivated: false,
      legacyAuthoritative: true,
      noop: true,
      snapshot: 'optional_diagnostic_snapshot',
      abortReason: 'null_or_string'
    }),
    allowedInputs: Object.freeze([
      'nowMs',
      'sanitized_read_only_state_snapshot',
      'manual_guard_options'
    ]),
    forbiddenInputs: Object.freeze([
      'live_state_reference_retained',
      'dom_reference',
      'storage_reference',
      'feature_flag_mutator',
      'event_activation_callback'
    ]),
    abortWhen: Object.freeze([
      'default_enabled_not_false',
      'combined_report_not_green',
      'snapshot_validation_failed',
      'runtime_or_save_or_ui_flag_true',
      'blocker_error_or_warning_gt_zero',
      'noop_or_legacy_authority_missing'
    ])
  });

  function describeGuardedEntryPlan() {
    return GUARDED_ENTRY_PLAN;
  }

  const api = Object.freeze({
    GUARDED_ENTRY_PLAN,
    describeGuardedEntryPlan
  });

  globalScope.ShadowBridgeGuardedEntryPlan = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

