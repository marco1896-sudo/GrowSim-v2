'use strict';

(function initShadowBridgeCombinedMarkdownReport(globalScope) {
  function boolText(value) {
    return value ? 'true' : 'false';
  }

  function toMarkdown(combinedResult) {
    const result = combinedResult || {};
    const dryRun = result.dryRun || {};
    const snapshot = result.snapshot || {};
    const gateFailures = result.gate && Array.isArray(result.gate.failures) ? result.gate.failures : [];
    const status = result.ok && result.safeToProceed ? 'PASS' : 'BLOCKED';
    const failureLines = gateFailures.length
      ? gateFailures.map((failure) => '- ' + failure.code + ': ' + failure.message)
      : ['- none'];

    return [
      '# Event V2 Shadow-Bridge Combined Report',
      '',
      'Gesamtentscheidung: `' + status + '`',
      '- combinedStatus: `' + (result.combinedStatus || 'blocked') + '`',
      '- ok: `' + boolText(result.ok) + '`',
      '- safeToProceed: `' + boolText(result.safeToProceed) + '`',
      '',
      '## Dry-Run Status',
      '- ok: `' + boolText(dryRun.ok) + '`',
      '- safeToProceed: `' + boolText(dryRun.safeToProceed) + '`',
      '- eventsMapped: `' + Number(dryRun.eventsMapped || 0) + '`',
      '- bridgePass: `' + Number(dryRun.bridgePass || 0) + '`',
      '- bridgeWarning: `' + Number(dryRun.bridgeWarning || 0) + '`',
      '- bridgeBlocked: `' + Number(dryRun.bridgeBlocked || 0) + '`',
      '',
      '## Snapshot Status',
      '- ok: `' + boolText(snapshot.ok) + '`',
      '- safeToProceed: `' + boolText(snapshot.safeToProceed) + '`',
      '- noop: `' + boolText(snapshot.noop) + '`',
      '- legacyAuthoritative: `' + boolText(snapshot.legacyAuthoritative) + '`',
      '',
      '## Guardrail Status',
      '- runtimeTouched: `' + boolText(result.runtimeTouched) + '`',
      '- saveTouched: `' + boolText(result.saveTouched) + '`',
      '- uiReplaced: `' + boolText(result.uiReplaced) + '`',
      '- featureFlagsTouched: `' + boolText(result.featureFlagsTouched) + '`',
      '- legacyEventsTouched: `' + boolText(result.legacyEventsTouched) + '`',
      '- eventActivated: `' + boolText(result.eventActivated) + '`',
      '',
      '## Diagnostics',
      '- blocker: `' + Number(result.blocker || 0) + '`',
      '- error: `' + Number(result.error || 0) + '`',
      '- warning: `' + Number(result.warning || 0) + '`',
      '- info: `' + Number(result.info || 0) + '`',
      '- abortReason: `' + (result.abortReason || 'null') + '`',
      '',
      '## Safety Gate Failures',
      failureLines.join('\n')
    ].join('\n');
  }

  const api = Object.freeze({
    toMarkdown
  });

  globalScope.ShadowBridgeCombinedMarkdownReport = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

