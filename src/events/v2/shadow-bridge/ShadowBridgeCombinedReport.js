'use strict';

(function initShadowBridgeCombinedReport(globalScope) {
  const JsonReport = (globalScope && globalScope.ShadowBridgeCombinedJsonReport) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedJsonReport.js') : null);
  const MarkdownReport = (globalScope && globalScope.ShadowBridgeCombinedMarkdownReport) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedMarkdownReport.js') : null);

  function formatCombinedReports(combinedResult, options) {
    const opts = options || {};
    const formats = Array.isArray(opts.formats) && opts.formats.length > 0 ? opts.formats : ['json', 'markdown'];
    const reports = {};

    if (formats.indexOf('json') >= 0) {
      reports.json = JsonReport.toJsonObject(combinedResult);
      reports.jsonString = JsonReport.toJsonString(combinedResult);
    }
    if (formats.indexOf('markdown') >= 0) {
      reports.markdown = MarkdownReport.toMarkdown(combinedResult);
    }

    return reports;
  }

  const api = Object.freeze({
    formatCombinedReports
  });

  globalScope.ShadowBridgeCombinedReport = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

