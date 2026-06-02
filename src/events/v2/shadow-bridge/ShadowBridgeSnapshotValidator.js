'use strict';

(function initShadowBridgeSnapshotValidator(globalScope) {
  const REQUIRED_GUARDRAIL_FALSE_FLAGS = Object.freeze([
    'runtimeTouched',
    'saveTouched',
    'uiReplaced',
    'featureFlagsTouched',
    'legacyEventsTouched',
    'eventActivated'
  ]);

  function diagnostic(severity, code, message, path) {
    return {
      severity,
      code,
      message,
      path: path || null,
      source: 'shadow_bridge_snapshot_validator'
    };
  }

  function hasRequiredMeta(meta) {
    return Boolean(meta && meta.createdAt && meta.source && meta.mode && meta.phase && meta.locale && meta.fallbackLocale);
  }

  function validateShadowBridgeSnapshot(snapshot) {
    const diagnostics = [];
    const guardrails = snapshot && snapshot.guardrails ? snapshot.guardrails : {};
    const v2Diagnostics = snapshot && snapshot.v2Diagnostics ? snapshot.v2Diagnostics : {};
    const quality = snapshot && snapshot.snapshotQuality ? snapshot.snapshotQuality : {};

    if (!snapshot || typeof snapshot !== 'object') {
      diagnostics.push(diagnostic('blocker', 'snapshot_missing', 'Snapshot object is missing.', 'snapshot'));
    }
    if (!hasRequiredMeta(snapshot && snapshot.meta)) {
      diagnostics.push(diagnostic('blocker', 'snapshot_meta_missing', 'Snapshot meta is incomplete.', 'meta'));
    }
    if (!snapshot || !snapshot.readOnlyContext) {
      diagnostics.push(diagnostic('blocker', 'snapshot_context_missing', 'Read-only context is missing.', 'readOnlyContext'));
    }
    REQUIRED_GUARDRAIL_FALSE_FLAGS.forEach((flag) => {
      if (guardrails[flag] !== false) {
        diagnostics.push(diagnostic('blocker', 'snapshot_guardrail_failed', `${flag} must be false.`, `guardrails.${flag}`));
      }
    });
    if (guardrails.noop !== true) {
      diagnostics.push(diagnostic('blocker', 'snapshot_noop_missing', 'Snapshot must confirm noop=true.', 'guardrails.noop'));
    }
    if (guardrails.legacyAuthoritative !== true) {
      diagnostics.push(diagnostic('blocker', 'snapshot_legacy_authority_missing', 'Snapshot must confirm legacyAuthoritative=true.', 'guardrails.legacyAuthoritative'));
    }
    if (Number(v2Diagnostics.blocker || 0) > 0 || Number(v2Diagnostics.error || 0) > 0 || Number(v2Diagnostics.warning || 0) > 0) {
      diagnostics.push(diagnostic('blocker', 'snapshot_v2_diagnostics_not_green', 'Snapshot diagnostics contain blocker/error/warning counts.', 'v2Diagnostics'));
    }
    if (quality.hasNoLiveReferences !== true) {
      diagnostics.push(diagnostic('blocker', 'snapshot_live_reference_risk', 'Snapshot quality did not confirm no live references.', 'snapshotQuality.hasNoLiveReferences'));
    }
    if (quality.isFrozenOrCloneSafe !== true) {
      diagnostics.push(diagnostic('blocker', 'snapshot_clone_safety_missing', 'Snapshot quality did not confirm clone/freeze safety.', 'snapshotQuality.isFrozenOrCloneSafe'));
    }

    const blockerCount = diagnostics.filter((item) => item.severity === 'blocker').length;
    const safeToProceed = blockerCount === 0;
    return {
      ok: safeToProceed,
      safeToProceed,
      abortReason: safeToProceed ? null : 'snapshot_validation_failed',
      diagnostics,
      checks: {
        hasRequiredMeta: hasRequiredMeta(snapshot && snapshot.meta),
        hasReadOnlyContext: Boolean(snapshot && snapshot.readOnlyContext),
        hasGuardrails: Boolean(snapshot && snapshot.guardrails),
        hasNoLiveReferences: quality.hasNoLiveReferences === true,
        isFrozenOrCloneSafe: quality.isFrozenOrCloneSafe === true
      }
    };
  }

  const api = Object.freeze({
    validateShadowBridgeSnapshot
  });

  globalScope.ShadowBridgeSnapshotValidator = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

