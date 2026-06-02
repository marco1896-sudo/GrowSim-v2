'use strict';

(function initShadowBridgeBrowserBridgeCandidateTests(globalScope) {
  const BridgeCandidate = typeof require !== 'undefined'
    ? require('./ShadowBridgeBrowserBridgeCandidate.js')
    : null;
  const fs = typeof require !== 'undefined' ? require('fs') : null;
  const path = typeof require !== 'undefined' ? require('path') : null;
  const vm = typeof require !== 'undefined' ? require('vm') : null;

  function createCleanSnapshot() {
    return {
      meta: { source: 'browser_bridge_candidate_test' },
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
          registered: Boolean(data.result.registered),
          unregistered: Boolean(data.result.unregistered),
          reason: data.result.reason || null,
          abortReason: data.result.abortReason || null,
          noop: Boolean(data.result.noop),
          legacyAuthoritative: Boolean(data.result.legacyAuthoritative)
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

  function runCandidateInBrowserLikeContext(existingApi) {
    const source = fs.readFileSync(path.join(__dirname, 'ShadowBridgeBrowserBridgeCandidate.js'), 'utf8');
    const sandbox = {
      window: {}
    };
    if (existingApi) {
      sandbox.window.ShadowBridgeBrowserBridgeCandidate = existingApi;
    }
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: 'ShadowBridgeBrowserBridgeCandidate.js' });
    return sandbox.window;
  }

  function runBrowserBridgeCandidateTests() {
    const cases = [
      runCase(
        'candidate_api_loads',
        'Candidate API loads.',
        () => ({ result: { ok: Boolean(BridgeCandidate && typeof BridgeCandidate.createShadowBridgeBrowserBridgeCandidate === 'function'), safeToProceed: true, noop: true, legacyAuthoritative: true } }),
        ({ result }) => result.ok === true
      ),
      runCase(
        'no_automatic_global',
        'Candidate does not create an automatic global.',
        () => ({ result: { ok: !globalScope.ShadowBridgeGuardedEntry, safeToProceed: true, noop: true, legacyAuthoritative: true } }),
        ({ result }) => result.ok === true
      ),
      runCase(
        'default_noop_runner',
        'Default runner call is safe no-op.',
        () => ({ result: BridgeCandidate.createShadowBridgeBrowserBridgeCandidate().runShadowBridgeGuardedEntry() }),
        ({ result }) => result.ok === true && result.safeToProceed === true && result.mode === 'guarded_read_only_noop' && result.snapshot === null && result.noop === true
      ),
      runCase(
        'enabled_without_allow_snapshot_blocks',
        'enabled=true without allowSnapshot blocks.',
        () => ({ result: BridgeCandidate.createShadowBridgeBrowserBridgeCandidate().runShadowBridgeGuardedEntry(null, { enabled: true }) }),
        ({ result }) => result.ok === false && result.safeToProceed === false && result.abortReason === 'guarded_entry_snapshot_not_allowed'
      ),
      runCase(
        'missing_snapshot_factory_blocks',
        'enabled=true with allowSnapshot but no factory blocks.',
        () => ({ result: BridgeCandidate.createShadowBridgeBrowserBridgeCandidate().runShadowBridgeGuardedEntry(null, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.ok === false && result.safeToProceed === false && result.abortReason === 'browser_snapshot_dependency_missing'
      ),
      runCase(
        'clean_snapshot_factory_works',
        'Clean explicit snapshot factory works.',
        () => ({ result: BridgeCandidate.createShadowBridgeBrowserBridgeCandidate({ snapshotFactory: createCleanSnapshot }).runShadowBridgeGuardedEntry(null, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.ok === true && result.safeToProceed === true && result.mode === 'guarded_read_only_snapshot_noop' && result.snapshot
      ),
      runCase(
        'guardrail_violation_blocks',
        'Guardrail violation blocks.',
        () => ({ result: BridgeCandidate.createShadowBridgeBrowserBridgeCandidate({ snapshotFactory: createCleanSnapshot }).runShadowBridgeGuardedEntry({ runtimeTouched: true }, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.ok === false && result.safeToProceed === false && result.abortReason === 'guardrail_violation'
      ),
      runCase(
        'snapshot_factory_exception_caught',
        'Snapshot factory exception is caught.',
        () => ({ result: BridgeCandidate.createShadowBridgeBrowserBridgeCandidate({ snapshotFactory: () => { throw new Error('bundle boom'); } }).runShadowBridgeGuardedEntry(null, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.ok === false && result.safeToProceed === false && result.abortReason === 'browser_snapshot_factory_exception'
      ),
      runCase(
        'registration_without_permission_blocks',
        'Registration without explicit allowGlobalRegistration blocks.',
        () => {
          const targetWindow = {};
          return { targetWindow, result: BridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(targetWindow, { enabled: true }) };
        },
        ({ result, targetWindow }) => result.ok === false && result.reason === 'global_registration_not_allowed' && !targetWindow.ShadowBridgeGuardedEntry
      ),
      runCase(
        'registration_with_permission_sets_global',
        'Registration with explicit permission sets global.',
        () => {
          const targetWindow = {};
          return { targetWindow, result: BridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(targetWindow, { enabled: true, allowGlobalRegistration: true }) };
        },
        ({ result, targetWindow }) => result.ok === true && result.registered === true && Boolean(targetWindow.ShadowBridgeGuardedEntry)
      ),
      runCase(
        'global_allowed_fields_only',
        'Registered global exposes only allowed visible fields.',
        () => {
          const targetWindow = {};
          const result = BridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(targetWindow, { enabled: true, allowGlobalRegistration: true });
          return { targetWindow, result };
        },
        ({ targetWindow }) => {
          const allowed = BridgeCandidate.getAllowedGlobalKeys();
          const keys = Object.keys(targetWindow.ShadowBridgeGuardedEntry || {});
          return keys.length === allowed.length && keys.every((key) => allowed.indexOf(key) >= 0);
        }
      ),
      runCase(
        'registered_noop_call_works',
        'No-op call through registered global works.',
        () => {
          const targetWindow = {};
          BridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(targetWindow, { enabled: true, allowGlobalRegistration: true });
          return { targetWindow, result: targetWindow.ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: false }) };
        },
        ({ result }) => result.ok === true && result.safeToProceed === true && result.noop === true && result.snapshot === null
      ),
      runCase(
        'no_overwrite_without_allow',
        'Existing global is not overwritten without allowOverwrite.',
        () => {
          const targetWindow = { ShadowBridgeGuardedEntry: { foreign: true } };
          return { targetWindow, result: BridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(targetWindow, { enabled: true, allowGlobalRegistration: true }) };
        },
        ({ result, targetWindow }) => result.ok === false && result.reason === 'global_already_exists' && targetWindow.ShadowBridgeGuardedEntry.foreign === true
      ),
      runCase(
        'controlled_overwrite',
        'allowOverwrite=true replaces the global in a controlled way.',
        () => {
          const targetWindow = { ShadowBridgeGuardedEntry: { foreign: true } };
          return { targetWindow, result: BridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(targetWindow, { enabled: true, allowGlobalRegistration: true, allowOverwrite: true }) };
        },
        ({ result, targetWindow }) => result.ok === true && result.registered === true && targetWindow.ShadowBridgeGuardedEntry.foreign !== true
      ),
      runCase(
        'unregister_owned_only',
        'Unregister removes only bridge-candidate-owned globals.',
        () => {
          const targetWindow = {};
          BridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(targetWindow, { enabled: true, allowGlobalRegistration: true });
          return { targetWindow, result: BridgeCandidate.unregisterShadowBridgeBrowserBridgeCandidate(targetWindow) };
        },
        ({ result, targetWindow }) => result.ok === true && result.unregistered === true && !targetWindow.ShadowBridgeGuardedEntry
      ),
      runCase(
        'foreign_globals_preserved',
        'Foreign globals are preserved.',
        () => {
          const targetWindow = { ShadowBridgeGuardedEntry: { foreign: true } };
          return { targetWindow, result: BridgeCandidate.unregisterShadowBridgeBrowserBridgeCandidate(targetWindow) };
        },
        ({ result, targetWindow }) => result.ok === false && result.reason === 'global_not_owned_by_bridge_candidate' && targetWindow.ShadowBridgeGuardedEntry.foreign === true
      ),
      runCase(
        'no_runtime_save_ui_event_flags',
        'Protection flags remain false.',
        () => ({ result: BridgeCandidate.createShadowBridgeBrowserBridgeCandidate({ snapshotFactory: createCleanSnapshot }).runShadowBridgeGuardedEntry(null, { enabled: true, allowSnapshot: true }) }),
        ({ result }) => result.runtimeTouched === false && result.saveTouched === false && result.uiReplaced === false && result.eventActivated === false
      ),
      runCase(
        'missing_target_window_no_throw',
        'Missing targetWindow does not throw.',
        () => ({ result: BridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(null, { enabled: true, allowGlobalRegistration: true }) }),
        ({ result }) => result.ok === false && result.reason === 'invalid_target_window'
      ),
      runCase(
        'browser_context_exposes_api_container',
        'Browser-like script load exposes the passive API container.',
        () => {
          const targetWindow = runCandidateInBrowserLikeContext();
          return { result: { ok: Boolean(targetWindow.ShadowBridgeBrowserBridgeCandidate), safeToProceed: true, noop: true, legacyAuthoritative: true }, targetWindow };
        },
        ({ result, targetWindow }) => {
          const keys = Object.keys(targetWindow.ShadowBridgeBrowserBridgeCandidate || {}).sort();
          const expected = [
            'createShadowBridgeBrowserBridgeCandidate',
            'getAllowedGlobalKeys',
            'legacyAuthoritative',
            'metadata',
            'noop',
            'registerShadowBridgeBrowserBridgeCandidate',
            'unregisterShadowBridgeBrowserBridgeCandidate'
          ].sort();
          return result.ok === true && JSON.stringify(keys) === JSON.stringify(expected);
        }
      ),
      runCase(
        'browser_context_does_not_auto_register_guarded_entry',
        'Browser-like script load does not set ShadowBridgeGuardedEntry.',
        () => {
          const targetWindow = runCandidateInBrowserLikeContext();
          return { result: { ok: !targetWindow.ShadowBridgeGuardedEntry, safeToProceed: true, noop: true, legacyAuthoritative: true }, targetWindow };
        },
        ({ result }) => result.ok === true
      ),
      runCase(
        'browser_context_preserves_foreign_api_container',
        'Browser-like script load does not overwrite a foreign API container.',
        () => {
          const existingApi = { foreign: true };
          const targetWindow = runCandidateInBrowserLikeContext(existingApi);
          return { result: { ok: targetWindow.ShadowBridgeBrowserBridgeCandidate === existingApi, safeToProceed: true, noop: true, legacyAuthoritative: true }, targetWindow };
        },
        ({ result, targetWindow }) => result.ok === true && targetWindow.ShadowBridgeBrowserBridgeCandidate.foreign === true
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
    runBrowserBridgeCandidateTests
  });

  globalScope.ShadowBridgeBrowserBridgeCandidateTests = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : {});
