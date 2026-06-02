'use strict';

(function initShadowBridgeBrowserExposureCandidate(moduleScope) {
  const OWNERSHIP_MARKER = '__eventV2ShadowBridgeExposureCandidateOwner';
  const OWNERSHIP_VALUE = 'event_v2_shadow_bridge_browser_exposure_candidate';
  const ALLOWED_GLOBAL_KEYS = Object.freeze([
    'runShadowBridgeGuardedEntry',
    'metadata',
    'noop',
    'legacyAuthoritative'
  ]);

  function createResult(overrides) {
    return Object.assign({
      ok: true,
      safeToProceed: true,
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
      noop: true,
      legacyAuthoritative: true,
      diagnostics: []
    }, overrides || {});
  }

  function isValidTargetWindow(targetWindow) {
    return Boolean(targetWindow && typeof targetWindow === 'object');
  }

  function isValidDeps(deps) {
    return Boolean(deps && typeof deps.runShadowBridgeGuardedEntry === 'function');
  }

  function createMetadata(deps, options) {
    const sourceMetadata = deps && deps.metadata && typeof deps.metadata === 'object' ? deps.metadata : {};
    return Object.freeze(Object.assign({}, sourceMetadata, {
      kind: 'event_v2_shadow_bridge_guarded_entry_global',
      exposureKind: 'browser_candidate',
      version: 'phase-43',
      defaultEnabled: false,
      noop: true,
      legacyAuthoritative: true,
      registeredBy: OWNERSHIP_VALUE,
      registeredAt: options && options.registeredAt ? String(options.registeredAt) : null
    }));
  }

  function createExposedGlobal(deps, options) {
    const exposedGlobal = {
      runShadowBridgeGuardedEntry: deps.runShadowBridgeGuardedEntry,
      metadata: createMetadata(deps, options),
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

  function createShadowBridgeBrowserExposureCandidate(deps) {
    const dependencyValid = isValidDeps(deps);
    return Object.freeze({
      ok: dependencyValid,
      safeToProceed: dependencyValid,
      dependencyValid,
      noop: true,
      legacyAuthoritative: true,
      reason: dependencyValid ? null : 'missing_run_shadow_bridge_guarded_entry',
      allowedGlobalKeys: ALLOWED_GLOBAL_KEYS.slice()
    });
  }

  function registerShadowBridgeBrowserExposureCandidate(targetWindow, deps, options) {
    const opts = Object.assign({
      enabled: false,
      allowGlobalRegistration: false,
      allowOverwrite: false,
      registeredAt: null
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
    if (!isValidDeps(deps)) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'missing_run_shadow_bridge_guarded_entry' });
    }
    if (targetWindow.ShadowBridgeGuardedEntry && opts.allowOverwrite !== true) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'global_already_exists' });
    }

    targetWindow.ShadowBridgeGuardedEntry = createExposedGlobal(deps, { registeredAt: opts.registeredAt });
    return createResult({ registered: true, reason: 'registered' });
  }

  function unregisterShadowBridgeBrowserExposureCandidate(targetWindow) {
    if (!isValidTargetWindow(targetWindow)) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'invalid_target_window' });
    }

    const current = targetWindow.ShadowBridgeGuardedEntry;
    if (!current) {
      return createResult({ skipped: true, reason: 'global_not_present' });
    }
    if (current[OWNERSHIP_MARKER] !== OWNERSHIP_VALUE) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'global_not_owned_by_candidate' });
    }

    delete targetWindow.ShadowBridgeGuardedEntry;
    return createResult({ unregistered: true, reason: 'unregistered' });
  }

  function getAllowedGlobalKeys() {
    return ALLOWED_GLOBAL_KEYS.slice();
  }

  const api = Object.freeze({
    createShadowBridgeBrowserExposureCandidate,
    registerShadowBridgeBrowserExposureCandidate,
    unregisterShadowBridgeBrowserExposureCandidate,
    getAllowedGlobalKeys,
    OWNERSHIP_MARKER,
    OWNERSHIP_VALUE
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
})(typeof module !== 'undefined' ? module : null);

