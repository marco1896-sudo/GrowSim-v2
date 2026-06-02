'use strict';

(function initEventV2SlotQaBaseline(globalScope) {
  function buildSlotQaBaseline(matrixRows) {
    const rows = Array.isArray(matrixRows) ? matrixRows : [];
    const summary = {
      totalEvents: rows.length,
      requiredCompleteEvents: 0,
      eventsWithRecommendedFallbacks: 0,
      eventsWithOptionalMissing: 0,
      budgetWarningsTotal: 0,
      bridgePass: 0,
      bridgeWarning: 0,
      bridgeBlocked: 0
    };

    rows.forEach((row) => {
      if (row.requiredComplete) summary.requiredCompleteEvents += 1;
      if ((row.recommendedMissing || []).length > 0) summary.eventsWithRecommendedFallbacks += 1;
      if ((row.optionalMissing || []).length > 0) summary.eventsWithOptionalMissing += 1;
      summary.budgetWarningsTotal += Number(row.budgetWarnings || 0);

      if (row.bridgeReadiness === 'pass') summary.bridgePass += 1;
      else if (row.bridgeReadiness === 'warning') summary.bridgeWarning += 1;
      else summary.bridgeBlocked += 1;
    });

    return summary;
  }

  const api = Object.freeze({
    buildSlotQaBaseline
  });

  globalScope.EventV2SlotQaBaseline = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

