'use strict';

(function initShadowBridgeHookReadinessChecklist(globalScope) {
  function createCheck(id, passed, message) {
    return {
      id,
      passed: Boolean(passed),
      message
    };
  }

  function evaluateShadowBridgeHookReadiness(input) {
    const data = input || {};
    const combined = data.combinedReport || {};
    const contractTests = data.contractTests || {};
    const fileStatus = data.fileStatus || {};

    const checks = [
      createCheck('combined_report_green', combined.ok === true && combined.safeToProceed === true && combined.combinedStatus === 'pass', 'Combined report must be green.'),
      createCheck('contract_tests_green', contractTests.ok === true && Number(contractTests.failed || 0) === 0, 'Guarded Entry contract tests must pass.'),
      createCheck('noop_confirmed', combined.noop === true, 'No-op guarantee must be confirmed.'),
      createCheck('legacy_authoritative_confirmed', combined.legacyAuthoritative === true, 'Legacy authority must be confirmed.'),
      createCheck('no_app_js_change', fileStatus.appJsChanged !== true, 'app.js must not be changed in Phase 37.'),
      createCheck('package_json_unchanged', fileStatus.packageJsonChanged !== true, 'package.json must remain unchanged.'),
      createCheck('no_save_persistence_changes', fileStatus.savePersistenceChanged !== true, 'Save/persistence files must remain unchanged.'),
      createCheck('no_existing_events_changes', fileStatus.existingEventsChanged !== true, 'Existing src/events/*.js files must remain unchanged.'),
      createCheck('no_ui_changes', fileStatus.uiChanged !== true, 'Existing UI files must remain unchanged.'),
      createCheck('no_blocker_error_warning', Number(combined.blocker || 0) === 0 && Number(combined.error || 0) === 0 && Number(combined.warning || 0) === 0, 'Combined blocker/error/warning counts must be zero.')
    ];

    const failed = checks.filter((check) => check.passed !== true);
    return {
      ok: failed.length === 0,
      readyForHookProposal: failed.length === 0,
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      checks,
      failedCheckIds: failed.map((check) => check.id)
    };
  }

  const api = Object.freeze({
    evaluateShadowBridgeHookReadiness
  });

  globalScope.ShadowBridgeHookReadinessChecklist = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

