'use strict';

const API_EXPOSURE_READINESS_GATES = Object.freeze([
  'phase_53_blocker_confirmed_safe',
  'candidate_loaded_versioned',
  'no_boot_error_banner',
  'no_page_errors',
  'no_console_errors',
  'no_storage_writes',
  'shadow_bridge_guarded_entry_absent_before_registration',
  'bundle_candidate_tests_pass',
  'combined_report_pass',
  'guarded_entry_contract_tests_pass',
  'no_app_js_change',
  'no_sw_change',
  'no_package_change',
  'patch_proposal_documented',
  'automatic_guarded_entry_registration_forbidden'
]);

function evaluateBrowserApiExposureReadiness(input) {
  const values = input && typeof input === 'object' ? input : {};
  const failedGateIds = API_EXPOSURE_READINESS_GATES.filter((gateId) => values[gateId] !== true);
  return Object.freeze({
    ok: failedGateIds.length === 0,
    readyForPhase55CandidatePatch: failedGateIds.length === 0,
    requiredGateCount: API_EXPOSURE_READINESS_GATES.length,
    passed: API_EXPOSURE_READINESS_GATES.length - failedGateIds.length,
    failed: failedGateIds.length,
    failedGateIds
  });
}

module.exports = {
  API_EXPOSURE_READINESS_GATES,
  evaluateBrowserApiExposureReadiness
};
