'use strict';

const REQUIRED_REGISTRATION_GATES = Object.freeze([
  'browser_shell_smoke_pass',
  'bundle_candidate_tests_pass',
  'comparison_smoke_pass',
  'combined_report_pass',
  'guarded_entry_contract_tests_pass',
  'no_app_js_hook',
  'no_save',
  'no_ui',
  'no_event_activation',
  'no_live_state',
  'explicit_registration_only',
  'unregister_verified',
  'visible_global_keys_allowed_only'
]);

const ALLOWED_VISIBLE_GLOBAL_KEYS = Object.freeze([
  'runShadowBridgeGuardedEntry',
  'metadata',
  'noop',
  'legacyAuthoritative'
]);

function evaluateGlobalRegistrationReadiness(input) {
  const values = input && typeof input === 'object' ? input : {};
  const failedGateIds = REQUIRED_REGISTRATION_GATES.filter((gateId) => values[gateId] !== true);
  return Object.freeze({
    ok: failedGateIds.length === 0,
    readyForManualRegistrationSmoke: failedGateIds.length === 0,
    requiredGateCount: REQUIRED_REGISTRATION_GATES.length,
    passed: REQUIRED_REGISTRATION_GATES.length - failedGateIds.length,
    failed: failedGateIds.length,
    failedGateIds,
    allowedVisibleGlobalKeys: ALLOWED_VISIBLE_GLOBAL_KEYS.slice()
  });
}

module.exports = {
  REQUIRED_REGISTRATION_GATES,
  ALLOWED_VISIBLE_GLOBAL_KEYS,
  evaluateGlobalRegistrationReadiness
};
