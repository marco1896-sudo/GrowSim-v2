'use strict';

const isolatedHookHarnessPlan = Object.freeze({
  id: 'shadow_bridge_isolated_hook_harness_plan',
  phase: 62,
  status: 'planning_only',
  objective: 'prove_noop_hook_unit_without_triggering_live_event_state_machine',
  recommendedStrategy: 'combined_static_and_browser_api_harness',
  mustNotDo: Object.freeze([
    'do_not_call_window_runEventStateMachine_directly',
    'do_not_monkeypatch_legacy_browser_flow',
    'do_not_touch_app_live_state',
    'do_not_write_save_or_storage',
    'do_not_activate_events',
    'do_not_replace_ui',
    'do_not_claim_full_runtime_tick_coverage'
  ]),
  staticPart: Object.freeze([
    'verify_single_app_js_hook_call',
    'verify_single_noop_preflight_helper',
    'verify_no_state_or_nowMs_passed_to_v2',
    'verify_no_snapshot_save_ui_event_activation_patterns',
    'verify_legacy_path_remains_reachable'
  ]),
  browserPart: Object.freeze([
    'load_app_shell',
    'verify_candidate_api_visible',
    'explicitly_register_guarded_entry',
    'call_guarded_entry_noop_with_enabled_false',
    'verify_storage_writes_zero',
    'verify_no_ui_or_event_activation',
    'unregister_guarded_entry'
  ]),
  reportPart: Object.freeze([
    'report_hook_unit_harness_pass_or_fail',
    'report_runtime_path_not_triggered',
    'report_full_runtime_tick_not_claimed'
  ])
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isolatedHookHarnessPlan };
}
