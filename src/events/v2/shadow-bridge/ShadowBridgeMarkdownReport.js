'use strict';

(function initShadowBridgeMarkdownReport(globalScope) {
  function boolText(value) {
    return value ? 'true' : 'false';
  }

  function toMarkdown(dryRunResult) {
    const result = dryRunResult || {};
    const state = result.ok && result.safeToProceed ? 'PASS' : 'BLOCKED';
    return [
      '# Event V2 Shadow-Bridge Dry-Run Report',
      '',
      'Status: `' + state + '`',
      '',
      '## No-Op Flags',
      '- ok: `' + boolText(result.ok) + '`',
      '- safeToProceed: `' + boolText(result.safeToProceed) + '`',
      '- runtimeTouched: `' + boolText(result.runtimeTouched) + '`',
      '- saveTouched: `' + boolText(result.saveTouched) + '`',
      '- uiReplaced: `' + boolText(result.uiReplaced) + '`',
      '- featureFlagsTouched: `' + boolText(result.featureFlagsTouched) + '`',
      '- legacyEventsTouched: `' + boolText(result.legacyEventsTouched) + '`',
      '',
      '## Mapping',
      '- eventsMapped: `' + Number(result.eventsMapped || 0) + '`',
      '- bridgePass: `' + Number(result.bridgePass || 0) + '`',
      '- bridgeWarning: `' + Number(result.bridgeWarning || 0) + '`',
      '- bridgeBlocked: `' + Number(result.bridgeBlocked || 0) + '`',
      '',
      '## Diagnostics',
      '- blocker: `' + Number(result.blocker || 0) + '`',
      '- error: `' + Number(result.error || 0) + '`',
      '- warning: `' + Number(result.warning || 0) + '`',
      '- info: `' + Number(result.info || 0) + '`',
      '- infoDensity: `' + Number(result.infoDensity || 0).toFixed(2) + '`',
      '- budgetWarnings: `' + Number(result.budgetWarnings || 0) + '`',
      '- abortReason: `' + (result.abortReason || 'null') + '`'
    ].join('\n');
  }

  function toCombinedMarkdown(combinedResult) {
    const CombinedMarkdown = (globalScope && globalScope.ShadowBridgeCombinedMarkdownReport) ||
      (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedMarkdownReport.js') : null);
    return CombinedMarkdown.toMarkdown(combinedResult);
  }

  const api = Object.freeze({
    toMarkdown,
    toCombinedMarkdown
  });

  globalScope.ShadowBridgeMarkdownReport = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
