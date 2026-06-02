'use strict';

(function initShadowBridgeRuntimeBoundaryReportFormatter(globalScope) {
  function statusFrom(ok) {
    return ok ? 'pass' : 'fail';
  }

  function toConsolidatedResult(raw) {
    const source = raw || {};
    const diagnosticsReport = source.diagnosticsReport || {};
    const hookAwareStaticCheck = source.hookAwareStaticCheck || {};
    const isolatedHookUnitHarness = source.isolatedHookUnitHarness || {};
    const shadowOnlyRuntimeBoundaryHarness = source.shadowOnlyRuntimeBoundaryHarness || {};
    const browserGlobalRegistrationSmoke = source.browserGlobalRegistrationSmoke || {};
    const legacySmoke = source.legacySmoke || {};
    const combinedReport = source.combinedReport || {};
    const guardedEntryContractTests = source.guardedEntryContractTests || {};
    const browserBridgeCandidateTests = source.browserBridgeCandidateTests || {};
    const legacyPreHookCheck = source.legacyPreHookCheck || {};

    const labels = Object.assign({
      hook_unit_harness_pass: false,
      shadow_only_runtime_boundary_harness_pass: false,
      runtime_path_not_triggered: true,
      full_runtime_tick_not_claimed: true,
      full_app_runtime_tick_not_claimed: true,
      no_live_state_used: false
    }, diagnosticsReport.labels || {}, shadowOnlyRuntimeBoundaryHarness.labels || {});

    const legacyPreHookStatus = legacyPreHookCheck.expectedRed
      ? 'expected_red_noAppHook_false'
      : statusFrom(Boolean(legacyPreHookCheck.ok));

    const result = {
      ok: Boolean(
        diagnosticsReport.ok &&
        hookAwareStaticCheck.ok &&
        isolatedHookUnitHarness.ok &&
        shadowOnlyRuntimeBoundaryHarness.ok &&
        browserGlobalRegistrationSmoke.ok &&
        legacySmoke.ok &&
        combinedReport.ok &&
        guardedEntryContractTests.ok &&
        browserBridgeCandidateTests.ok
      ),
      status: 'fail',
      mode: 'dev_only_shadow_runtime_boundary_report',
      diagnosticsReport: statusFrom(Boolean(diagnosticsReport.ok)),
      hookAwareStaticCheck: statusFrom(Boolean(hookAwareStaticCheck.ok)),
      isolatedHookUnitHarness: statusFrom(Boolean(isolatedHookUnitHarness.ok)),
      shadowOnlyRuntimeBoundaryHarness: statusFrom(Boolean(shadowOnlyRuntimeBoundaryHarness.ok)),
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
        liveStateToV2: false,
        appStateMutation: false
      },
      prohibitedClaims: {
        fullRuntimeTickTested: false,
        v2RunsInRealTick: false,
        eventSystemV2Live: false,
        liveStateTested: false,
        legacyStateMachineFullyVerified: false
      }
    };

    result.status = result.ok ? 'pass' : 'fail';
    return result;
  }

  const api = Object.freeze({
    toConsolidatedResult
  });

  globalScope.ShadowBridgeRuntimeBoundaryReportFormatter = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
