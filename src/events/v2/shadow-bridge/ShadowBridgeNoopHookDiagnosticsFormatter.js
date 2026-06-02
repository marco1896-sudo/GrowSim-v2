'use strict';

(function initShadowBridgeNoopHookDiagnosticsFormatter(globalScope) {
  function statusFrom(ok) {
    return ok ? 'pass' : 'fail';
  }

  function toDiagnosticsResult(raw) {
    const source = raw || {};
    const hookAwareStaticCheck = source.hookAwareStaticCheck || {};
    const isolatedHookUnitHarness = source.isolatedHookUnitHarness || {};
    const browserGlobalRegistrationSmoke = source.browserGlobalRegistrationSmoke || {};
    const legacySmoke = source.legacySmoke || {};
    const combinedReport = source.combinedReport || {};
    const guardedEntryContractTests = source.guardedEntryContractTests || {};
    const browserBridgeCandidateTests = source.browserBridgeCandidateTests || {};
    const legacyPreHookCheck = source.legacyPreHookCheck || {};

    const labels = Object.assign({
      hook_unit_harness_pass: false,
      runtime_path_not_triggered: true,
      full_runtime_tick_not_claimed: true
    }, isolatedHookUnitHarness.labels || {});

    const legacyPreHookStatus = legacyPreHookCheck.expectedRed
      ? 'expected_red_noAppHook_false'
      : statusFrom(Boolean(legacyPreHookCheck.ok));

    const result = {
      ok: Boolean(
        hookAwareStaticCheck.ok &&
        isolatedHookUnitHarness.ok &&
        browserGlobalRegistrationSmoke.ok &&
        legacySmoke.ok &&
        combinedReport.ok &&
        guardedEntryContractTests.ok &&
        browserBridgeCandidateTests.ok
      ),
      status: 'fail',
      mode: 'dev_only_noop_hook_diagnostics_report',
      hookAwareStaticCheck: statusFrom(Boolean(hookAwareStaticCheck.ok)),
      isolatedHookUnitHarness: statusFrom(Boolean(isolatedHookUnitHarness.ok)),
      browserGlobalRegistrationSmoke: statusFrom(Boolean(browserGlobalRegistrationSmoke.ok)),
      legacySmoke: statusFrom(Boolean(legacySmoke.ok)),
      combinedReport: statusFrom(Boolean(combinedReport.ok)),
      guardedEntryContractTests: statusFrom(Boolean(guardedEntryContractTests.ok)),
      browserBridgeCandidateTests: statusFrom(Boolean(browserBridgeCandidateTests.ok)),
      legacyPreHookCheck: legacyPreHookStatus,
      labels,
      forbiddenSideEffects: {
        save: false,
        uiReplacement: false,
        eventActivation: false,
        telemetry: false,
        liveStateToV2: false
      }
    };

    result.status = result.ok ? 'pass' : 'fail';
    return result;
  }

  const api = Object.freeze({
    toDiagnosticsResult
  });

  globalScope.ShadowBridgeNoopHookDiagnosticsFormatter = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
