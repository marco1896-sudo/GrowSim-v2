'use strict';

const noopHookDiagnosticsReadinessGate = Object.freeze({
  id: 'shadow_bridge_noop_hook_diagnostics_readiness_gate',
  phase: 64,
  requiredChecks: Object.freeze([
    'hook_aware_static_check_pass',
    'isolated_hook_unit_harness_pass',
    'browser_global_registration_smoke_pass',
    'legacy_smoke_pass',
    'combined_report_pass',
    'guarded_entry_tests_pass',
    'storage_writes_zero',
    'page_errors_zero',
    'console_errors_zero',
    'no_save',
    'no_ui',
    'no_event_activation',
    'no_telemetry',
    'no_live_state_to_v2',
    'honest_limited_result_labels'
  ]),
  requiredLabels: Object.freeze([
    'hook_unit_harness_pass',
    'runtime_path_not_triggered',
    'full_runtime_tick_not_claimed'
  ]),
  failIf: Object.freeze([
    'runtime_tick_claimed',
    'telemetry_emitted',
    'storage_or_save_write_detected',
    'ui_output_detected',
    'event_activation_detected',
    'state_or_nowMs_passed_to_v2',
    'live_state_read_or_mutation_detected'
  ])
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { noopHookDiagnosticsReadinessGate };
}
