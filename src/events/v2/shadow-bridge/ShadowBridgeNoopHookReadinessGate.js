'use strict';

const NOOP_HOOK_READINESS_GATES = Object.freeze([
  'browser_global_registration_smoke_pass',
  'browser_api_container_visible',
  'guarded_entry_absent_before_registration',
  'explicit_registration_pass',
  'noop_call_pass',
  'negative_case_blocks',
  'unregister_pass',
  'foreign_global_protection_pass',
  'candidate_tests_pass',
  'combined_report_pass',
  'guarded_entry_tests_pass',
  'loading_safety_pass',
  'storage_writes_zero',
  'page_errors_zero',
  'console_errors_zero',
  'no_save',
  'no_ui',
  'no_event_activation',
  'no_live_state_access',
  'hook_plan_noop_only',
  'hook_plan_passes_no_live_state',
  'hook_plan_ignores_return_value',
  'hook_plan_legacy_always_continues',
  'hook_plan_trivial_rollback'
]);

function evaluateNoopHookReadiness(input) {
  const values = input && typeof input === 'object' ? input : {};
  const failedGateIds = NOOP_HOOK_READINESS_GATES.filter((gateId) => values[gateId] !== true);
  return Object.freeze({
    ok: failedGateIds.length === 0,
    readyForNoopHookPlanRefresh: failedGateIds.length === 0,
    requiredGateCount: NOOP_HOOK_READINESS_GATES.length,
    passed: NOOP_HOOK_READINESS_GATES.length - failedGateIds.length,
    failed: failedGateIds.length,
    failedGateIds
  });
}

module.exports = {
  NOOP_HOOK_READINESS_GATES,
  evaluateNoopHookReadiness
};
