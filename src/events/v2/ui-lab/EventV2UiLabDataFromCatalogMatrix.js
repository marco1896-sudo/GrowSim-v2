'use strict';

(function initEventV2UiLabDataFromCatalogMatrix(globalScope) {
  const matrixApi = globalScope.EventV2AdapterMatrix || null;

  function buildScenarioListFromMatrix(options) {
    if (!matrixApi || typeof matrixApi.runFullAdapterMatrix !== 'function') {
      return { scenarios: [], baseline: null, error: 'matrix_api_unavailable' };
    }

    const result = matrixApi.runFullAdapterMatrix(options || {});
    const scenarios = (result.rows || []).map((row) => ({
      id: row.eventId,
      setup: row.setup,
      category: row.category,
      stage: row.stage,
      severity: row.warning > 0 ? 'warning' : 'info',
      title: row.eventId,
      symptom: '',
      coach: { summary: '', why: '', actions: [] },
      decisions: [],
      learningCard: null,
      aftermath: ''
    }));

    return { scenarios, baseline: result.baseline };
  }

  const api = Object.freeze({
    buildScenarioListFromMatrix
  });

  globalScope.EventV2UiLabDataFromCatalogMatrix = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

