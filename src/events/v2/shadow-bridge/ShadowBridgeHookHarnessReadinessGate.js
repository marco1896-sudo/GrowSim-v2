'use strict';

const hookHarnessReadinessGate = Object.freeze({
  id: 'shadow_bridge_hook_harness_readiness_gate',
  phase: 62,
  requiredBeforePhase63: Object.freeze([
    'hook_aware_static_check_pass',
    'browser_bridge_candidate_tests_pass',
    'browser_global_registration_smoke_pass',
    'legacy_smoke_pass',
    'combined_report_pass',
    'guarded_entry_tests_pass',
    'no_direct_runEventStateMachine_trigger',
    'no_browser_monkeypatch',
    'no_save',
    'no_ui',
    'no_event_activation',
    'no_live_state_to_v2'
  ]),
  requiredResultLabels: Object.freeze([
    'hook_unit_harness_pass',
    'runtime_path_not_triggered',
    'full_runtime_tick_not_claimed'
  ]),
  failIf: Object.freeze([
    'storage_writes_above_zero',
    'page_or_console_errors',
    'event_activation_detected',
    'ui_replacement_detected',
    'snapshot_created',
    'state_or_nowMs_passed_to_v2',
    'runtime_tick_claimed_without_real_safe_trigger'
  ])
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hookHarnessReadinessGate };
}
