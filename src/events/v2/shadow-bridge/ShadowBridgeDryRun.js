'use strict';

(function initShadowBridgeDryRun(globalScope) {
  const CatalogProbe = (globalScope && globalScope.ShadowBridgeReadOnlyCatalogProbe) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeReadOnlyCatalogProbe.js') : null);
  const MappingProbe = (globalScope && globalScope.ShadowBridgeUiMappingProbe) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeUiMappingProbe.js') : null);
  const SafetyReport = (globalScope && globalScope.ShadowBridgeSafetyReport) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeSafetyReport.js') : null);
  const DryRunResult = (globalScope && globalScope.ShadowBridgeDryRunResult) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeDryRunResult.js') : null);
  const NoopResult = (globalScope && globalScope.ShadowBridgeNoopResult) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeNoopResult.js') : null);

  function runShadowBridgeDryRun(options) {
    try {
      const catalogProbe = CatalogProbe.runReadOnlyCatalogProbe(options || {});
      const mappingProbe = MappingProbe.runUiMappingProbe(options || {});
      const safetyReport = SafetyReport.createSafetyReport({
        runtimeTouched: false,
        saveTouched: false,
        uiReplaced: false,
        featureFlagsTouched: false,
        legacyEventsTouched: false
      });

      return DryRunResult.createShadowBridgeDryRunResult({
        catalogOk: catalogProbe.ok,
        mappingOk: mappingProbe.ok,
        eventsMapped: mappingProbe.eventsMapped,
        diagnostics: mappingProbe.diagnostics,
        catalogProbe,
        mappingProbe: {
          ok: mappingProbe.ok,
          eventsMapped: mappingProbe.eventsMapped,
          diagnostics: mappingProbe.diagnostics
        },
        safetyReport
      });
    } catch (error) {
      const noop = NoopResult.createShadowBridgeNoopResult('dry_run_exception', {
        message: error && error.message ? error.message : String(error)
      });
      return Object.assign({}, noop, {
        ok: false,
        safeToProceed: false,
        abortReason: 'dry_run_exception',
        featureFlagsTouched: false,
        legacyEventsTouched: false
      });
    }
  }

  const api = Object.freeze({
    runShadowBridgeDryRun
  });

  globalScope.ShadowBridgeDryRun = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

