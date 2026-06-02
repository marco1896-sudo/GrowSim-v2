'use strict';

(function initShadowBridgeReportFormatter(globalScope) {
  const JsonReport = (globalScope && globalScope.ShadowBridgeJsonReport) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeJsonReport.js') : null);
  const MarkdownReport = (globalScope && globalScope.ShadowBridgeMarkdownReport) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeMarkdownReport.js') : null);
  const CombinedReport = (globalScope && globalScope.ShadowBridgeCombinedReport) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedReport.js') : null);

  function formatReports(dryRunResult, options) {
    const opts = options || {};
    const formats = Array.isArray(opts.formats) && opts.formats.length > 0 ? opts.formats : ['json', 'markdown'];
    const reports = {};

    if (formats.indexOf('json') >= 0) {
      reports.json = JsonReport.toJsonObject(dryRunResult);
      reports.jsonString = JsonReport.toJsonString(dryRunResult);
    }
    if (formats.indexOf('markdown') >= 0) {
      reports.markdown = MarkdownReport.toMarkdown(dryRunResult);
    }

    return reports;
  }

  function formatCombinedReports(combinedResult, options) {
    return CombinedReport.formatCombinedReports(combinedResult, options || {});
  }

  const api = Object.freeze({
    formatReports,
    formatCombinedReports
  });

  globalScope.ShadowBridgeReportFormatter = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
