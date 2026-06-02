'use strict';

(function initShadowBridgeBrowserGuardedEntryCandidate(moduleScope) {
  const METADATA = Object.freeze({
    kind: 'event_v2_shadow_bridge_browser_guarded_entry_candidate',
    version: 'phase-45',
    defaultEnabled: false,
    noop: true,
    legacyAuthoritative: true
  });

  const PROTECTION_FLAGS = Object.freeze([
    'runtimeTouched',
    'saveTouched',
    'uiReplaced',
    'featureFlagsTouched',
    'legacyEventsTouched',
    'eventActivated'
  ]);

  function createResult(overrides) {
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

  function hasGuardrailViolation(source) {
    const value = source && typeof source === 'object' ? source : {};
    const nestedGuardrails = value.guardrails && typeof value.guardrails === 'object' ? value.guardrails : {};
    return PROTECTION_FLAGS.some((flag) => value[flag] === true || nestedGuardrails[flag] === true);
  }

  function hasBlockingDiagnostics(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return false;
    }
    const diagnostics = Array.isArray(snapshot.diagnostics) ? snapshot.diagnostics : [];
    return diagnostics.some((item) => {
      const severity = String(item && item.severity || '').toLowerCase();
      return severity === 'blocker' || severity === 'error' || severity === 'warning';
    });
  }

  function normalizeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }
    return JSON.parse(JSON.stringify(snapshot));
  }

  function resolveSnapshotFactory(deps) {
    if (!deps || typeof deps !== 'object') {
      return null;
    }
    if (typeof deps.createReadOnlySnapshot === 'function') {
      return deps.createReadOnlySnapshot;
    }
    if (typeof deps.snapshotFactory === 'function') {
      return deps.snapshotFactory;
    }
    return null;
  }

  function createShadowBridgeBrowserGuardedEntryCandidate(deps) {
    const dependencyBag = deps && typeof deps === 'object' ? deps : {};
    const snapshotFactory = resolveSnapshotFactory(dependencyBag);

    function runShadowBridgeGuardedEntry(input, options) {
      try {
        const opts = Object.assign({ enabled: false, allowSnapshot: false }, options || {});
        const guardrailSource = Object.assign({}, input && typeof input === 'object' ? input : {}, opts);

        if (hasGuardrailViolation(guardrailSource)) {
          return createResult({
            ok: false,
            safeToProceed: false,
            abortReason: 'guardrail_violation',
            diagnostics: [{ severity: 'blocker', code: 'guardrail_violation' }]
          });
        }

        if (opts.enabled !== true) {
          return createResult();
        }

        if (opts.allowSnapshot !== true) {
          return createResult({
            ok: false,
            safeToProceed: false,
            abortReason: 'guarded_entry_snapshot_not_allowed',
            diagnostics: [{ severity: 'blocker', code: 'guarded_entry_snapshot_not_allowed' }]
          });
        }

        if (!snapshotFactory) {
          return createResult({
            ok: false,
            safeToProceed: false,
            abortReason: 'browser_snapshot_dependency_missing',
            diagnostics: [{ severity: 'blocker', code: 'browser_snapshot_dependency_missing' }]
          });
        }

        const snapshot = normalizeSnapshot(snapshotFactory(input || null, opts));

        if (hasGuardrailViolation(snapshot)) {
          return createResult({
            ok: false,
            safeToProceed: false,
            abortReason: 'snapshot_guardrail_violation',
            diagnostics: [{ severity: 'blocker', code: 'snapshot_guardrail_violation' }]
          });
        }

        if (hasBlockingDiagnostics(snapshot)) {
          return createResult({
            ok: false,
            safeToProceed: false,
            abortReason: 'snapshot_blocking_diagnostics',
            diagnostics: snapshot.diagnostics
          });
        }

        return createResult({
          mode: 'guarded_read_only_snapshot_noop',
          snapshot
        });
      } catch (error) {
        return createResult({
          ok: false,
          safeToProceed: false,
          abortReason: 'browser_snapshot_factory_exception',
          diagnostics: [{
            severity: 'blocker',
            code: 'browser_snapshot_factory_exception',
            message: error && error.message ? error.message : String(error)
          }]
        });
      }
    }

    return Object.freeze({
      runShadowBridgeGuardedEntry,
      metadata: Object.freeze(Object.assign({}, METADATA, dependencyBag.metadata && typeof dependencyBag.metadata === 'object' ? dependencyBag.metadata : {})),
      noop: true,
      legacyAuthoritative: true
    });
  }

  const api = Object.freeze({
    createShadowBridgeBrowserGuardedEntryCandidate
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
})(typeof module !== 'undefined' ? module : null);

