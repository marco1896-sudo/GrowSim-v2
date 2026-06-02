'use strict';

(function initShadowBridgeUiMappingProbe(globalScope) {
  const Matrix = (globalScope && globalScope.EventV2AdapterMatrix) ||
    (typeof require !== 'undefined' ? require('../ui-lab/qa/EventV2AdapterMatrix.js') : null);
  const DiagnosticsSummary = (globalScope && globalScope.ShadowBridgeDiagnosticsSummary) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeDiagnosticsSummary.js') : null);

  function runUiMappingProbe(options) {
    const matrixResult = Matrix.runFullAdapterMatrix({
      projectRoot: options && options.projectRoot ? options.projectRoot : process.cwd(),
      locale: options && options.locale ? options.locale : 'de',
      fallbackLocale: options && options.fallbackLocale ? options.fallbackLocale : 'en',
      compactMode: true
    });
    const diagnostics = DiagnosticsSummary.summarizeMatrix(matrixResult);
    const ok = diagnostics.eventCount > 0 &&
      diagnostics.bridgePass === diagnostics.eventCount &&
      diagnostics.blocker === 0 &&
      diagnostics.error === 0 &&
      diagnostics.warning === 0 &&
      diagnostics.budgetWarnings === 0;

    return {
      ok,
      probe: 'ui_mapping',
      expectedCatalogCount: diagnostics.eventCount,
      eventsMapped: diagnostics.eventCount,
      matrixResult,
      diagnostics
    };
  }

  const api = Object.freeze({
    runUiMappingProbe
  });

  globalScope.ShadowBridgeUiMappingProbe = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
