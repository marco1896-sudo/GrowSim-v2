'use strict';

(function initShadowBridgeBrowserGuardedEntryCandidateTests(globalScope) {
  const GuardedEntryCandidate = typeof require !== 'undefined'
    ? require('./ShadowBridgeBrowserGuardedEntryCandidate.js')
    : null;
  const ExposureCandidate = typeof require !== 'undefined'
    ? require('./ShadowBridgeBrowserExposureCandidate.js')
    : null;

  function createCandidate(deps) {
    return GuardedEntryCandidate.createShadowBridgeBrowserGuardedEntryCandidate(deps || {});
  }

  function createCleanSnapshot() {
    return {
      meta: { source: 'browser_guarded_entry_candidate_test' },
      guardrails: {
        runtimeTouched: false,
        saveTouched: false,
        uiReplaced: false,
        featureFlagsTouched: false,
        legacyEventsTouched: false,
        eventActivated: false
      },
      diagnostics: []
    };
  }

  function runCase(id, description, execute, expect) {
    try {
      const data = execute();
      const passed = Boolean(expect(data));
      return {
        id,
        description,
        passed,
        result: data && data.result ? {
          ok: Boolean(data.result.ok),
          safeToProceed: Boolean(data.result.safeToProceed),
          mode: data.result.mode || null,
          noop: Boolean(data.result.noop),
          legacyAuthoritative: Boolean(data.result.legacyAuthoritative),
          abortReason: data.result.abortReason || null
        } : null,
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

  function runBrowserGuardedEntryCandidateTests() {
    const cases = [
      runCase(
        'candidate_api_loads',
        'Candidate API loads.',
        () => ({ result: { ok: Boolean(GuardedEntryCandidate && typeof GuardedEntryCandidate.createShadowBridgeBrowserGuardedEntryCandidate === 'function'), safeToProceed: true, noop: true, legacyAuthoritative: true } }),
        ({ result }) => result.ok === true
      ),
      runCase(
        'no_automatic_global',
        'Candidate does not create an automatic global.',
        () => ({ result: { ok: !globalScope.ShadowBridgeGuardedEntry, safeToProceed: true, noop: true, legacyAuthoritative: true } }),
        ({ result }) => result.ok === true
      ),
      runCase(
        'default_noop',
        'Default call is a safe no-op.',
        () => ({ result: createCandidate().runShadowBridgeGuardedEntry() }),
        ({ result }) => result.ok === true && result.safeToProceed === true && result.mode === 'guarded_read_only_noop' && result.snapshot === null && result.noop === true
      ),
      runCase(
        'enabled_without_allow_snapshot_blocks',
        'enabled=true without allowSnapshot blocks.',
        () => ({ result: createCandidate().runShadowBridgeGuardedEntry(null, { enabled: true }) }),
        ({ result }) => result.ok === false && result.safeToProceed === false && result.abortReason === 'guarded_entry_snapshot_not_allowed'
      ),
      runCase(
        'snapshot_dependency_missing_blocks',
        'enabled=true with allowSnapshot but no factory blocks.',
        () => ({ result: createCandidate().runShadowBridgeGuardedEntry(null, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.ok === false && result.safeToProceed === false && result.abortReason === 'browser_snapshot_dependency_missing'
      ),
      runCase(
        'snapshot_factory_works',
        'Clean explicit snapshot factory works.',
        () => ({ result: createCandidate({ createReadOnlySnapshot: createCleanSnapshot }).runShadowBridgeGuardedEntry(null, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.ok === true && result.safeToProceed === true && result.mode === 'guarded_read_only_snapshot_noop' && result.snapshot && result.noop === true
      ),
      runCase(
        'guardrail_violation_blocks',
        'Guardrail violation blocks.',
        () => ({ result: createCandidate({ createReadOnlySnapshot: createCleanSnapshot }).runShadowBridgeGuardedEntry({ runtimeTouched: true }, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.ok === false && result.safeToProceed === false && result.abortReason === 'guardrail_violation'
      ),
      runCase(
        'snapshot_factory_exception_caught',
        'Snapshot factory exception is caught.',
        () => ({ result: createCandidate({ createReadOnlySnapshot: () => { throw new Error('factory boom'); } }).runShadowBridgeGuardedEntry(null, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.ok === false && result.safeToProceed === false && result.abortReason === 'browser_snapshot_factory_exception'
      ),
      runCase(
        'no_runtime_save_ui_event_flags',
        'Protection flags remain false.',
        () => ({ result: createCandidate({ createReadOnlySnapshot: createCleanSnapshot }).runShadowBridgeGuardedEntry(null, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.runtimeTouched === false && result.saveTouched === false && result.uiReplaced === false && result.eventActivated === false
      ),
      runCase(
        'noop_and_legacy_authoritative',
        'Result confirms noop and legacy authority.',
        () => ({ result: createCandidate().runShadowBridgeGuardedEntry(null, { enabled: false }) }),
        ({ result }) => result.noop === true && result.legacyAuthoritative === true
      ),
      runCase(
        'candidate_can_feed_exposure_candidate',
        'Guarded entry candidate can be passed to exposure candidate.',
        () => {
          const entry = createCandidate();
          const exposureReadiness = ExposureCandidate.createShadowBridgeBrowserExposureCandidate(entry);
          return { result: { ok: exposureReadiness.ok, safeToProceed: exposureReadiness.safeToProceed, noop: exposureReadiness.noop, legacyAuthoritative: exposureReadiness.legacyAuthoritative } };
        },
        ({ result }) => result.ok === true && result.safeToProceed === true
      ),
      runCase(
        'exposure_registered_global_works',
        'Registered global through exposure candidate works with browser guarded entry candidate.',
        () => {
          const targetWindow = {};
          const entry = createCandidate();
          const registration = ExposureCandidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, entry, { enabled: true, allowGlobalRegistration: true });
          const result = targetWindow.ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: false });
          ExposureCandidate.unregisterShadowBridgeBrowserExposureCandidate(targetWindow);
          return { result: Object.assign({}, result, { registered: registration.registered }) };
        },
        ({ result }) => result.registered === true && result.ok === true && result.safeToProceed === true && result.noop === true
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
    runBrowserGuardedEntryCandidateTests
  });

  globalScope.ShadowBridgeBrowserGuardedEntryCandidateTests = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : {});

