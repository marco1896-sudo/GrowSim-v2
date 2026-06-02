'use strict';

(function initShadowBridgeCombinedSafetyGate(globalScope) {
  function makeFailure(code, message) {
    return { code, message };
  }

  function evaluateCombinedSafetyGate(input) {
    const data = input || {};
    const dryRun = data.dryRun || {};
    const snapshot = data.snapshot || {};
    const failures = [];

    if (dryRun.ok !== true) failures.push(makeFailure('dry_run_not_ok', 'Dry-run did not return ok=true.'));
    if (dryRun.safeToProceed !== true) failures.push(makeFailure('dry_run_not_safe', 'Dry-run did not return safeToProceed=true.'));
    if (snapshot.ok !== true) failures.push(makeFailure('snapshot_not_ok', 'Snapshot did not return ok=true.'));
    if (snapshot.safeToProceed !== true) failures.push(makeFailure('snapshot_not_safe', 'Snapshot did not return safeToProceed=true.'));

    [
      'runtimeTouched',
      'saveTouched',
      'uiReplaced',
      'featureFlagsTouched',
      'legacyEventsTouched',
      'eventActivated'
    ].forEach((flag) => {
      if (Boolean(dryRun[flag]) === true || Boolean(snapshot[flag]) === true) {
        failures.push(makeFailure(`${flag}_true`, `${flag} must remain false in both dry-run and snapshot.`));
      }
    });

    if (snapshot.legacyAuthoritative !== true) {
      failures.push(makeFailure('legacy_authority_missing', 'Snapshot must confirm legacyAuthoritative=true.'));
    }
    if (snapshot.noop !== true) {
      failures.push(makeFailure('noop_missing', 'Snapshot must confirm noop=true.'));
    }

    const blocker = Number(dryRun.blocker || 0) + Number(snapshot.blocker || 0);
    const error = Number(dryRun.error || 0) + Number(snapshot.error || 0);
    const warning = Number(dryRun.warning || 0) + Number(snapshot.warning || 0);
    if (blocker > 0 || error > 0 || warning > 0) {
      failures.push(makeFailure('diagnostics_not_green', 'Combined blocker/error/warning counts must remain 0.'));
    }

    return {
      ok: failures.length === 0,
      safeToProceed: failures.length === 0,
      combinedStatus: failures.length === 0 ? 'pass' : 'blocked',
      failures,
      blocker,
      error,
      warning,
      info: Number(dryRun.info || 0) + Number(snapshot.info || 0)
    };
  }

  const api = Object.freeze({
    evaluateCombinedSafetyGate
  });

  globalScope.ShadowBridgeCombinedSafetyGate = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

