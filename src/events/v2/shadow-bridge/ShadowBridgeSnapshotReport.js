'use strict';

(function initShadowBridgeSnapshotReport(globalScope) {
  function createSnapshotReportData(snapshotResult) {
    const result = snapshotResult || {};
    const snapshot = result.snapshot || {};
    const guardrails = snapshot.guardrails || {};
    return {
      ok: Boolean(result.ok),
      safeToProceed: Boolean(result.safeToProceed),
      noop: Boolean(result.noop),
      legacyAuthoritative: Boolean(result.legacyAuthoritative),
      runtimeTouched: Boolean(guardrails.runtimeTouched),
      saveTouched: Boolean(guardrails.saveTouched),
      uiReplaced: Boolean(guardrails.uiReplaced),
      featureFlagsTouched: Boolean(guardrails.featureFlagsTouched),
      legacyEventsTouched: Boolean(guardrails.legacyEventsTouched),
      eventActivated: Boolean(guardrails.eventActivated),
      blocker: Number(result.blocker || 0),
      error: Number(result.error || 0),
      warning: Number(result.warning || 0),
      info: Number(result.info || 0),
      abortReason: result.abortReason || null,
      meta: snapshot.meta || null,
      snapshotQuality: snapshot.snapshotQuality || null
    };
  }

  function formatSnapshotMarkdown(snapshotResult) {
    const data = createSnapshotReportData(snapshotResult);
    const status = data.ok && data.safeToProceed ? 'PASS' : 'BLOCKED';
    return [
      `# Shadow Bridge Snapshot Report`,
      ``,
      `Status: ${status}`,
      ``,
      `- ok: ${data.ok}`,
      `- safeToProceed: ${data.safeToProceed}`,
      `- noop: ${data.noop}`,
      `- legacyAuthoritative: ${data.legacyAuthoritative}`,
      `- runtimeTouched: ${data.runtimeTouched}`,
      `- saveTouched: ${data.saveTouched}`,
      `- uiReplaced: ${data.uiReplaced}`,
      `- featureFlagsTouched: ${data.featureFlagsTouched}`,
      `- legacyEventsTouched: ${data.legacyEventsTouched}`,
      `- eventActivated: ${data.eventActivated}`,
      `- blocker/error/warning/info: ${data.blocker}/${data.error}/${data.warning}/${data.info}`,
      `- abortReason: ${data.abortReason || 'none'}`
    ].join('\n');
  }

  function createSnapshotJsonString(snapshotResult) {
    return JSON.stringify(createSnapshotReportData(snapshotResult), null, 2);
  }

  const api = Object.freeze({
    createSnapshotReportData,
    createSnapshotJsonString,
    formatSnapshotMarkdown
  });

  globalScope.ShadowBridgeSnapshotReport = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
