'use strict';

(function initShadowBridgeDiagnosticsSummary(globalScope) {
  function summarizeMatrix(matrixResult) {
    const rows = Array.isArray(matrixResult && matrixResult.rows) ? matrixResult.rows : [];
    const totals = rows.reduce((acc, row) => {
      acc.blocker += Number(row.blocker || 0);
      acc.error += Number(row.error || 0);
      acc.warning += Number(row.warning || 0);
      acc.info += Number(row.info || 0);
      acc.budgetWarnings += Number(row.budgetWarnings || 0);
      if (row.bridgeReadiness === 'pass') acc.bridgePass += 1;
      else if (row.bridgeReadiness === 'warning') acc.bridgeWarning += 1;
      else if (row.bridgeReadiness === 'blocked') acc.bridgeBlocked += 1;
      return acc;
    }, {
      blocker: 0,
      error: 0,
      warning: 0,
      info: 0,
      budgetWarnings: 0,
      bridgePass: 0,
      bridgeWarning: 0,
      bridgeBlocked: 0
    });

    return Object.assign({}, totals, {
      eventCount: rows.length,
      infoDensity: rows.length > 0 ? totals.info / rows.length : 0
    });
  }

  const api = Object.freeze({
    summarizeMatrix
  });

  globalScope.ShadowBridgeDiagnosticsSummary = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

