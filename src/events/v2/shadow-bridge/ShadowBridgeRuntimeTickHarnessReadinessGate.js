'use strict';

const runtimeTickHarnessReadinessGate = Object.freeze({
  id: 'shadow_bridge_runtime_tick_harness_readiness_gate',
  phase: 66,
  requiredChecks: Object.freeze([
    'phase_65_diagnostics_report_pass',
    'hook_aware_static_check_pass',
    'isolated_hook_unit_harness_pass',
    'browser_global_registration_smoke_pass',
    'legacy_smoke_pass',
    'combined_report_pass',
    'guarded_entry_tests_pass',
    'candidate_tests_pass',
    'storage_writes_zero',
    'page_errors_zero',
    'console_errors_zero',
    'no_save',
    'no_ui',
    'no_event_activation',
    'no_live_state_to_v2',
    'no_direct_browser_trigger',
    'no_monkeypatch_of_real_legacy_state_machine',
    'honest_result_labels_only'
  ]),
  requiredLabels: Object.freeze([
    'runtime_tick_boundary_harness_pass',
    'no_live_state_used',
    'no_save',
    'no_ui',
    'no_event_activation',
    'full_app_runtime_tick_not_claimed'
  ]),
  blockedBy: Object.freeze([
    'real_save_touched',
    'ui_changed',
    'event_activated',
    'state_passed_to_v2',
    'nowMs_passed_to_v2',
    'legacy_state_machine_patch_required',
    'result_overclaims_runtime_tick'
  ])
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runtimeTickHarnessReadinessGate };
}
