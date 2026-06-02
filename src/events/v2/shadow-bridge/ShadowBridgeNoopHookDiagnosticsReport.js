'use strict';

(function initShadowBridgeNoopHookDiagnosticsReport(globalScope) {
  const Formatter = (globalScope && globalScope.ShadowBridgeNoopHookDiagnosticsFormatter) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeNoopHookDiagnosticsFormatter.js') : null);

  function runNodeCheck(projectRoot, relativeScriptPath) {
    if (typeof require === 'undefined') {
      return { ok: false, error: 'node_require_unavailable' };
    }

    const path = require('path');
    const childProcess = require('child_process');
    const absoluteScriptPath = path.resolve(projectRoot, relativeScriptPath);
    const result = childProcess.spawnSync(process.execPath, [absoluteScriptPath], {
      cwd: projectRoot,
      encoding: 'utf8'
    });
    const stdout = String(result.stdout || '').trim();
    const stderr = String(result.stderr || '').trim();
    let parsed = null;

    if (stdout) {
      try {
        parsed = JSON.parse(stdout);
      } catch (error) {
        parsed = null;
      }
    }

    return {
      ok: result.status === 0,
      exitCode: typeof result.status === 'number' ? result.status : 1,
      stdout,
      stderr,
      parsed,
      script: relativeScriptPath
    };
  }

  function normalizeLegacyPreHookCheck(checkResult) {
    const parsed = checkResult && checkResult.parsed ? checkResult.parsed : {};
    const checks = parsed.checks || {};
    return {
      ok: Boolean(checkResult && checkResult.ok),
      expectedRed: parsed.ok === false && checks.noAppHook === false,
      checks
    };
  }

  function normalizeHookAwareStaticCheck(checkResult) {
    const parsed = checkResult && checkResult.parsed ? checkResult.parsed : {};
    return {
      ok: Boolean(checkResult && checkResult.ok && parsed.ok === true),
      summary: parsed.summary || {}
    };
  }

  function normalizeIsolatedHookUnitHarness(checkResult) {
    const parsed = checkResult && checkResult.parsed ? checkResult.parsed : {};
    const labels = parsed.labels || {};
    return {
      ok: Boolean(checkResult && checkResult.ok && parsed.ok === true),
      labels
    };
  }

  function normalizeBrowserGlobalRegistrationSmoke(checkResult) {
    const parsed = checkResult && checkResult.parsed ? checkResult.parsed : {};
    const storage = parsed.storage || {};
    const uiEventSafety = parsed.uiEventSafety || {};
    return {
      ok: Boolean(
        checkResult &&
        checkResult.ok &&
        parsed.ok === true &&
        parsed.status === 'pass' &&
        storage.v2CausedWrites === 0 &&
        uiEventSafety.ok === true
      )
    };
  }

  function normalizeLegacySmoke(checkResult) {
    const parsed = checkResult && checkResult.parsed ? checkResult.parsed : {};
    return {
      ok: Boolean(
        checkResult &&
        checkResult.ok &&
        parsed.ok === true &&
        parsed.noStorageWrites === true &&
        parsed.noSave === true &&
        parsed.noUiReplacement === true &&
        parsed.noEventActivation === true
      )
    };
  }

  function normalizeCombinedReport(checkResult) {
    const parsed = checkResult && checkResult.parsed ? checkResult.parsed : {};
    return {
      ok: Boolean(
        checkResult &&
        checkResult.ok &&
        parsed.ok === true &&
        parsed.combinedStatus === 'pass'
      )
    };
  }

  function normalizeGuardedEntryContractTests(checkResult) {
    const parsed = checkResult && checkResult.parsed ? checkResult.parsed : {};
    const contractTests = parsed.contractTests || {};
    return {
      ok: Boolean(
        checkResult &&
        checkResult.ok &&
        parsed.ok === true &&
        Number(contractTests.failed || 0) === 0
      )
    };
  }

  function normalizeBrowserBridgeCandidateTests(checkResult) {
    const parsed = checkResult && checkResult.parsed ? checkResult.parsed : {};
    return {
      ok: Boolean(
        checkResult &&
        checkResult.ok &&
        parsed.ok === true &&
        Number(parsed.failed || 0) === 0
      )
    };
  }

  function runNoopHookDiagnosticsReport(options) {
    const opts = Object.assign({
      projectRoot: typeof process !== 'undefined' ? process.cwd() : ''
    }, options || {});

    const hookAwareStaticCheckRaw = runNodeCheck(opts.projectRoot, 'dev/run-event-v2-hook-safety-static-check.js');
    const isolatedHookUnitHarnessRaw = runNodeCheck(opts.projectRoot, 'dev/run-event-v2-isolated-hook-unit-harness.js');
    const browserGlobalRegistrationSmokeRaw = runNodeCheck(opts.projectRoot, 'dev/run-event-v2-browser-global-registration-smoke.js');
    const legacySmokeRaw = runNodeCheck(opts.projectRoot, 'dev/run-event-v2-hook-legacy-smoke.js');
    const combinedReportRaw = runNodeCheck(opts.projectRoot, 'dev/run-event-v2-shadow-bridge-combined-report.js');
    const guardedEntryContractTestsRaw = runNodeCheck(opts.projectRoot, 'dev/run-event-v2-guarded-entry-contract-tests.js');
    const browserBridgeCandidateTestsRaw = runNodeCheck(opts.projectRoot, 'dev/run-event-v2-browser-bridge-candidate-tests.js');
    const legacyPreHookCheckRaw = runNodeCheck(opts.projectRoot, 'dev/run-event-v2-loading-safety-static-check.js');

    const raw = {
      hookAwareStaticCheck: normalizeHookAwareStaticCheck(hookAwareStaticCheckRaw),
      isolatedHookUnitHarness: normalizeIsolatedHookUnitHarness(isolatedHookUnitHarnessRaw),
      browserGlobalRegistrationSmoke: normalizeBrowserGlobalRegistrationSmoke(browserGlobalRegistrationSmokeRaw),
      legacySmoke: normalizeLegacySmoke(legacySmokeRaw),
      combinedReport: normalizeCombinedReport(combinedReportRaw),
      guardedEntryContractTests: normalizeGuardedEntryContractTests(guardedEntryContractTestsRaw),
      browserBridgeCandidateTests: normalizeBrowserBridgeCandidateTests(browserBridgeCandidateTestsRaw),
      legacyPreHookCheck: normalizeLegacyPreHookCheck(legacyPreHookCheckRaw)
    };

    const result = Formatter.toDiagnosticsResult(raw);

    return Object.assign({}, result, {
      rawResults: {
        hookAwareStaticCheck: hookAwareStaticCheckRaw,
        isolatedHookUnitHarness: isolatedHookUnitHarnessRaw,
        browserGlobalRegistrationSmoke: browserGlobalRegistrationSmokeRaw,
        legacySmoke: legacySmokeRaw,
        combinedReport: combinedReportRaw,
        guardedEntryContractTests: guardedEntryContractTestsRaw,
        browserBridgeCandidateTests: browserBridgeCandidateTestsRaw,
        legacyPreHookCheck: legacyPreHookCheckRaw
      }
    });
  }

  const api = Object.freeze({
    runNoopHookDiagnosticsReport
  });

  globalScope.ShadowBridgeNoopHookDiagnosticsReport = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
