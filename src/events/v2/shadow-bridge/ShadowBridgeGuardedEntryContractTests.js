'use strict';

(function initShadowBridgeGuardedEntryContractTests(globalScope) {
  const GuardedEntry = (globalScope && globalScope.ShadowBridgeGuardedEntry) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeGuardedEntry.js') : null);

  function createCleanInput(extra) {
    return Object.assign({
      context: {
        simulation: { tickCount: 4, simTimeMs: 12000 },
        plant: { stageIndex: 2, stageProgress: 0.35 },
        status: { water: 72, nutrition: 64, stress: 6 },
        setup: { mode: 'indoor', type: 'soil' },
        events: { activeEventId: null, machineState: 'idle' }
      },
      v2Diagnostics: {
        blocker: 0,
        error: 0,
        warning: 0,
        info: 0,
        bridgePass: 12,
        bridgeWarning: 0,
        bridgeBlocked: 0,
        budgetWarnings: 0
      }
    }, extra || {});
  }

  function summarizeResult(result) {
    return {
      ok: Boolean(result && result.ok),
      safeToProceed: Boolean(result && result.safeToProceed),
      mode: result && result.mode ? result.mode : 'unknown',
      noop: Boolean(result && result.noop),
      hasSnapshot: Boolean(result && result.snapshot),
      abortReason: result && result.abortReason ? result.abortReason : null,
      diagnostics: Array.isArray(result && result.diagnostics) ? result.diagnostics.map((item) => item.code || item.severity || 'diagnostic') : []
    };
  }

  function evaluateCase(id, description, run, expect) {
    try {
      const result = run();
      const passed = Boolean(expect(result));
      return {
        id,
        description,
        passed,
        result: summarizeResult(result),
        error: null
      };
    } catch (error) {
      return {
        id,
        description,
        passed: false,
        result: null,
        error: error && error.message ? error.message : String(error)
      };
    }
  }

  function runGuardedEntryContractTests() {
    const cases = [
      evaluateCase(
        'default_noop',
        'No options returns safe no-op without snapshot.',
        () => GuardedEntry.runShadowBridgeGuardedEntry(),
        (result) => result.ok === true && result.safeToProceed === true && result.noop === true && result.snapshot === null
      ),
      evaluateCase(
        'enabled_without_allow_snapshot',
        'enabled=true without allowSnapshot blocks.',
        () => GuardedEntry.runShadowBridgeGuardedEntry(createCleanInput(), { enabled: true }),
        (result) => result.ok === false && result.safeToProceed === false && result.abortReason === 'guarded_entry_snapshot_not_allowed'
      ),
      evaluateCase(
        'enabled_allow_snapshot_clean',
        'enabled=true and allowSnapshot=true with clean input creates safe snapshot no-op.',
        () => GuardedEntry.runShadowBridgeGuardedEntry(createCleanInput(), { enabled: true, allowSnapshot: true }),
        (result) => result.ok === true && result.safeToProceed === true && result.mode === 'guarded_read_only_snapshot_noop' && Boolean(result.snapshot)
      ),
      evaluateCase(
        'function_input_omitted',
        'Function input is omitted and remains safe.',
        () => GuardedEntry.runShadowBridgeGuardedEntry(createCleanInput({
          context: Object.assign({}, createCleanInput().context, {
            unsafeCallback: function unsafeCallback() {}
          })
        }), { enabled: true, allowSnapshot: true }),
        (result) => result.ok === true && result.safeToProceed === true && result.diagnostics.some((item) => item.code === 'snapshot_function_omitted')
      ),
      evaluateCase(
        'dom_like_input_blocks',
        'DOM/window-like input is not copied and blocks the snapshot.',
        () => GuardedEntry.runShadowBridgeGuardedEntry(createCleanInput({
          suspiciousRuntimeObject: {
            document: {},
            location: {},
            addEventListener: function addEventListener() {},
            removeEventListener: function removeEventListener() {}
          }
        }), { enabled: true, allowSnapshot: true }),
        (result) => result.ok === false && result.safeToProceed === false && result.abortReason === 'guarded_entry_snapshot_blocked'
      ),
      evaluateCase(
        'guardrail_violation_blocks',
        'runtimeTouched=true guardrail violation blocks.',
        () => GuardedEntry.runShadowBridgeGuardedEntry(createCleanInput(), {
          enabled: true,
          allowSnapshot: true,
          guardrails: { runtimeTouched: true }
        }),
        (result) => result.ok === false && result.safeToProceed === false && result.abortReason === 'guarded_entry_snapshot_blocked'
      ),
      evaluateCase(
        'diagnostic_warning_blocks',
        'Snapshot warning diagnostic blocks.',
        () => GuardedEntry.runShadowBridgeGuardedEntry(createCleanInput({
          v2Diagnostics: { blocker: 0, error: 0, warning: 1, info: 0 }
        }), { enabled: true, allowSnapshot: true }),
        (result) => result.ok === false && result.safeToProceed === false && result.abortReason === 'guarded_entry_snapshot_blocked'
      ),
      evaluateCase(
        'exception_is_caught',
        'Snapshot factory exception is caught and returned as blocked result.',
        () => GuardedEntry.runShadowBridgeGuardedEntry(createCleanInput(), {
          enabled: true,
          allowSnapshot: true,
          snapshotFactory: function throwingSnapshotFactory() {
            throw new Error('simulated_snapshot_failure');
          }
        }),
        (result) => result.ok === false && result.safeToProceed === false && result.abortReason === 'guarded_entry_exception'
      )
    ];

    const failed = cases.filter((item) => item.passed !== true);
    return {
      ok: failed.length === 0,
      total: cases.length,
      passed: cases.length - failed.length,
      failed: failed.length,
      cases
    };
  }

  const api = Object.freeze({
    runGuardedEntryContractTests
  });

  globalScope.ShadowBridgeGuardedEntryContractTests = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

