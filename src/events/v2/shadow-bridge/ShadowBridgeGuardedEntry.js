'use strict';

(function initShadowBridgeGuardedEntry(globalScope) {
  const Snapshot = (globalScope && globalScope.ShadowBridgeReadOnlySnapshot) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeReadOnlySnapshot.js') : null);

  function createNoopResult(overrides) {
    return Object.assign({
      ok: true,
      safeToProceed: true,
      mode: 'guarded_read_only_noop',
      runtimeTouched: false,
      saveTouched: false,
      uiReplaced: false,
      featureFlagsTouched: false,
      legacyEventsTouched: false,
      eventActivated: false,
      legacyAuthoritative: true,
      noop: true,
      snapshot: null,
      diagnostics: [],
      abortReason: null
    }, overrides || {});
  }

  function createAbortResult(reason, diagnostics) {
    return createNoopResult({
      ok: false,
      safeToProceed: false,
      snapshot: null,
      diagnostics: Array.isArray(diagnostics) ? diagnostics : [],
      abortReason: reason || 'guarded_entry_aborted'
    });
  }

  function hasUnsafeDiagnostics(snapshotResult) {
    if (!snapshotResult) return false;
    return Number(snapshotResult.blocker || 0) > 0 ||
      Number(snapshotResult.error || 0) > 0 ||
      Number(snapshotResult.warning || 0) > 0;
  }

  function runShadowBridgeGuardedEntry(input, options) {
    const opts = Object.assign({
      enabled: false,
      allowSnapshot: false,
      locale: 'de',
      fallbackLocale: 'en',
      guardrails: null,
      snapshotFactory: null
    }, options || {});

    if (opts.enabled !== true) {
      return createNoopResult();
    }

    if (opts.allowSnapshot !== true) {
      return createAbortResult('guarded_entry_snapshot_not_allowed', [{
        severity: 'info',
        code: 'guarded_entry_default_off',
        message: 'Guarded entry was enabled without explicit snapshot permission.',
        source: 'shadow_bridge_guarded_entry'
      }]);
    }

    try {
      const createSnapshot = typeof opts.snapshotFactory === 'function'
        ? opts.snapshotFactory
        : Snapshot.createShadowBridgeSnapshot;
      const snapshotResult = createSnapshot(input || {}, {
        source: 'guarded_entry_manual_snapshot',
        locale: opts.locale,
        fallbackLocale: opts.fallbackLocale,
        guardrails: opts.guardrails || null
      });

      if (!snapshotResult.ok || !snapshotResult.safeToProceed || hasUnsafeDiagnostics(snapshotResult)) {
        return createAbortResult('guarded_entry_snapshot_blocked', snapshotResult.diagnostics || []);
      }

      return createNoopResult({
        mode: 'guarded_read_only_snapshot_noop',
        snapshot: snapshotResult.snapshot,
        diagnostics: snapshotResult.diagnostics || []
      });
    } catch (error) {
      return createAbortResult('guarded_entry_exception', [{
        severity: 'blocker',
        code: 'guarded_entry_exception',
        message: error && error.message ? error.message : String(error),
        source: 'shadow_bridge_guarded_entry'
      }]);
    }
  }

  const api = Object.freeze({
    runShadowBridgeGuardedEntry,
    createNoopResult
  });

  globalScope.ShadowBridgeGuardedEntry = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
