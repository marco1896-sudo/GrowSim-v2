'use strict';

(function initEventV2UiAdapterDiagnostics(globalScope) {
  const SEVERITY = Object.freeze({
    blocker: 'blocker',
    error: 'error',
    warning: 'warning',
    info: 'info'
  });

  function createDiagnostic(code, severity, message, meta) {
    return {
      code: code || 'ui_adapter_unknown',
      severity: severity || SEVERITY.info,
      message: message || 'No message',
      meta: meta || {}
    };
  }

  function summarizeDiagnostics(diagnostics) {
    const summary = { blocker: 0, error: 0, warning: 0, info: 0, total: 0 };
    (diagnostics || []).forEach((entry) => {
      const key = entry && entry.severity;
      if (summary[key] === undefined) return;
      summary[key] += 1;
      summary.total += 1;
    });
    return summary;
  }

  const api = Object.freeze({
    SEVERITY,
    createDiagnostic,
    summarizeDiagnostics
  });

  globalScope.EventV2UiAdapterDiagnostics = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

