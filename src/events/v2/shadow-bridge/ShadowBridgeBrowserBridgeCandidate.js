'use strict';

(function initShadowBridgeBrowserBridgeCandidate(moduleScope) {
  const OWNERSHIP_MARKER = '__eventV2ShadowBridgeBrowserBridgeCandidateOwner';
  const OWNERSHIP_VALUE = 'event_v2_shadow_bridge_browser_bridge_candidate';
  const ALLOWED_GLOBAL_KEYS = Object.freeze([
    'runShadowBridgeGuardedEntry',
    'metadata',
    'noop',
    'legacyAuthoritative'
  ]);
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
      registered: false,
      unregistered: false,
      skipped: false,
      reason: null,
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

  function createMetadata(options) {
    const sourceMetadata = options && options.metadata && typeof options.metadata === 'object' ? options.metadata : {};
    return Object.freeze(Object.assign({}, sourceMetadata, {
      kind: 'event_v2_shadow_bridge_browser_bridge_candidate',
      version: 'phase-47',
      defaultEnabled: false,
      noop: true,
      legacyAuthoritative: true,
      registeredBy: OWNERSHIP_VALUE,
      registeredAt: options && options.registeredAt ? String(options.registeredAt) : null
    }));
  }

  function isValidTargetWindow(targetWindow) {
    return Boolean(targetWindow && typeof targetWindow === 'object');
  }

  function resolveSnapshotFactory(candidateOptions, runOptions) {
    if (runOptions && typeof runOptions.snapshotFactory === 'function') {
      return runOptions.snapshotFactory;
    }
    if (runOptions && typeof runOptions.createReadOnlySnapshot === 'function') {
      return runOptions.createReadOnlySnapshot;
    }
    if (candidateOptions && typeof candidateOptions.snapshotFactory === 'function') {
      return candidateOptions.snapshotFactory;
    }
    if (candidateOptions && typeof candidateOptions.createReadOnlySnapshot === 'function') {
      return candidateOptions.createReadOnlySnapshot;
    }
    return null;
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

  function cloneSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }
    return JSON.parse(JSON.stringify(snapshot));
  }

  function createShadowBridgeBrowserBridgeCandidate(options) {
    const candidateOptions = options && typeof options === 'object' ? options : {};
    const metadata = createMetadata(candidateOptions);

    function runShadowBridgeGuardedEntry(input, runOptions) {
      try {
        const opts = Object.assign({ enabled: false, allowSnapshot: false }, runOptions || {});
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

        const snapshotFactory = resolveSnapshotFactory(candidateOptions, opts);
        if (!snapshotFactory) {
          return createResult({
            ok: false,
            safeToProceed: false,
            abortReason: 'browser_snapshot_dependency_missing',
            diagnostics: [{ severity: 'blocker', code: 'browser_snapshot_dependency_missing' }]
          });
        }

        const snapshot = cloneSnapshot(snapshotFactory(input || null, opts));
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
      metadata,
      noop: true,
      legacyAuthoritative: true
    });
  }

  function createExposedGlobal(candidate) {
    const exposedGlobal = {
      runShadowBridgeGuardedEntry: candidate.runShadowBridgeGuardedEntry,
      metadata: candidate.metadata,
      noop: true,
      legacyAuthoritative: true
    };

    Object.defineProperty(exposedGlobal, OWNERSHIP_MARKER, {
      value: OWNERSHIP_VALUE,
      enumerable: false,
      configurable: false,
      writable: false
    });

    return Object.freeze(exposedGlobal);
  }

  function registerShadowBridgeBrowserBridgeCandidate(targetWindow, options) {
    const opts = Object.assign({
      enabled: false,
      allowGlobalRegistration: false,
      allowOverwrite: false,
      registeredAt: null,
      metadata: null,
      snapshotFactory: null,
      createReadOnlySnapshot: null
    }, options || {});

    if (!isValidTargetWindow(targetWindow)) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'invalid_target_window' });
    }
    if (opts.enabled !== true) {
      return createResult({ skipped: true, reason: 'registration_disabled' });
    }
    if (opts.allowGlobalRegistration !== true) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'global_registration_not_allowed' });
    }
    if (targetWindow.ShadowBridgeGuardedEntry && opts.allowOverwrite !== true) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'global_already_exists' });
    }

    const candidate = createShadowBridgeBrowserBridgeCandidate(opts);
    targetWindow.ShadowBridgeGuardedEntry = createExposedGlobal(candidate);
    return createResult({ registered: true, reason: 'registered' });
  }

  function unregisterShadowBridgeBrowserBridgeCandidate(targetWindow) {
    if (!isValidTargetWindow(targetWindow)) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'invalid_target_window' });
    }
    const current = targetWindow.ShadowBridgeGuardedEntry;
    if (!current) {
      return createResult({ skipped: true, reason: 'global_not_present' });
    }
    if (current[OWNERSHIP_MARKER] !== OWNERSHIP_VALUE) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'global_not_owned_by_bridge_candidate' });
    }

    delete targetWindow.ShadowBridgeGuardedEntry;
    return createResult({ unregistered: true, reason: 'unregistered' });
  }

  function getAllowedGlobalKeys() {
    return ALLOWED_GLOBAL_KEYS.slice();
  }

  function createBrowserApiContainer() {
    return Object.freeze({
      registerShadowBridgeBrowserBridgeCandidate,
      unregisterShadowBridgeBrowserBridgeCandidate,
      createShadowBridgeBrowserBridgeCandidate,
      getAllowedGlobalKeys,
      metadata: Object.freeze({
        kind: 'event_v2_shadow_bridge_browser_bridge_candidate_api',
        version: 'phase-55',
        defaultEnabled: false,
        noop: true,
        legacyAuthoritative: true
      }),
      noop: true,
      legacyAuthoritative: true
    });
  }

  const api = Object.freeze({
    createShadowBridgeBrowserBridgeCandidate,
    registerShadowBridgeBrowserBridgeCandidate,
    unregisterShadowBridgeBrowserBridgeCandidate,
    getAllowedGlobalKeys,
    OWNERSHIP_MARKER,
    OWNERSHIP_VALUE
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
  if (typeof window !== 'undefined' && window && !window.ShadowBridgeBrowserBridgeCandidate) {
    window.ShadowBridgeBrowserBridgeCandidate = createBrowserApiContainer();
  }
})(typeof module !== 'undefined' ? module : null);
