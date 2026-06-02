'use strict';

const GLOBAL_REGISTRATION_ROLLBACK_PLAN = Object.freeze({
  phase: 52,
  status: 'plan_only',
  rollbackTrigger: Object.freeze([
    'unexpected_global_registration',
    'boot_error_banner',
    'runtime_or_save_side_effect',
    'visible_global_keys_outside_contract',
    'unregister_failure',
    'candidate_test_failure',
    'combined_report_failure'
  ]),
  rollbackSteps: Object.freeze([
    'Call unregisterShadowBridgeBrowserBridgeCandidate(targetWindow) when the bridge owns the global.',
    'Verify window.ShadowBridgeGuardedEntry is absent after unregister.',
    'If a future script or hook introduced the registration, remove that single loading or hook step.',
    'Re-run browser shell smoke, bundle candidate tests, combined report, and guarded entry contract tests.',
    'Keep legacy event runtime authoritative throughout rollback.'
  ]),
  mustNotDo: Object.freeze([
    'Do not delete foreign ShadowBridgeGuardedEntry globals.',
    'Do not write saves during rollback.',
    'Do not switch feature flags during rollback.',
    'Do not patch app.js as part of Phase 52.'
  ])
});

function getShadowBridgeGlobalRegistrationRollbackPlan() {
  return GLOBAL_REGISTRATION_ROLLBACK_PLAN;
}

module.exports = {
  GLOBAL_REGISTRATION_ROLLBACK_PLAN,
  getShadowBridgeGlobalRegistrationRollbackPlan
};
