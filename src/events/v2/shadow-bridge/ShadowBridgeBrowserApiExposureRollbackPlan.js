'use strict';

const API_EXPOSURE_ROLLBACK_PLAN = Object.freeze({
  phase: 54,
  status: 'plan_only',
  rollbackTarget: 'window.ShadowBridgeBrowserBridgeCandidate API container',
  rollbackTriggers: Object.freeze([
    'window.ShadowBridgeGuardedEntry appears on script load',
    'visible API keys exceed the contract',
    'Boot error appears after API exposure patch',
    'Page or console errors appear after API exposure patch',
    'Storage writes appear during API exposure smoke',
    'Bundle Candidate Tests fail',
    'Phase 53 registration smoke remains blocked after patch'
  ]),
  rollbackSteps: Object.freeze([
    'Remove only the API-container exposure block from ShadowBridgeBrowserBridgeCandidate.js.',
    'Confirm Node module.exports path remains intact.',
    'Confirm window.ShadowBridgeGuardedEntry is absent on load.',
    'Re-run loading safety static check.',
    'Re-run bundle candidate tests, comparison smoke, combined report, and guarded entry contract tests.',
    'Re-run browser shell smoke.'
  ]),
  mustNotDo: Object.freeze([
    'Do not remove the passive script tag unless Phase 55 rollback explicitly requires it.',
    'Do not touch app.js as part of API exposure rollback.',
    'Do not touch sw.js or package.json.',
    'Do not write saves or activate events.'
  ])
});

function getShadowBridgeBrowserApiExposureRollbackPlan() {
  return API_EXPOSURE_ROLLBACK_PLAN;
}

module.exports = {
  API_EXPOSURE_ROLLBACK_PLAN,
  getShadowBridgeBrowserApiExposureRollbackPlan
};
