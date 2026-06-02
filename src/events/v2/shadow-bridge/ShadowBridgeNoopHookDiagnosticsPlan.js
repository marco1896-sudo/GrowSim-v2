'use strict';

const noopHookDiagnosticsPlan = Object.freeze({
  id: 'shadow_bridge_noop_hook_diagnostics_plan',
  phase: 64,
  strategy: 'dev_only_noop_hook_diagnostics_report',
  status: 'planning_only',
  scope: Object.freeze({
    allowed: Object.freeze([
      'verify_hook_reachable',
      'verify_candidate_api_visible',
      'verify_explicit_registration_works',
      'verify_noop_call_stays_passive',
      'verify_forbidden_side_effects_absent'
    ]),
    forbidden: Object.freeze([
      'no_real_telemetry',
      'no_save_write',
      'no_ui_output',
      'no_event_activation',
      'no_runtime_state_read_or_mutation',
      'no_state_or_nowMs_to_v2',
      'no_full_runtime_tick_claim'
    ])
  }),
  labels: Object.freeze([
    'hook_unit_harness_pass',
    'runtime_path_not_triggered',
    'full_runtime_tick_not_claimed'
  ]),
  execution: Object.freeze([
    'manual_dev_run_only',
    'no_productive_runtime_changes',
    'no_console_spam_defaults',
    'single_report_output_for_review'
  ])
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { noopHookDiagnosticsPlan };
}
