'use strict';

(function initEventV2BudgetQa(globalScope) {
  function evaluateBudgets(uiModel, textBudgetContractApi, options) {
    const compactMode = Boolean(options && options.compactMode);
    const contract = textBudgetContractApi || {};
    const validate = contract.validateTextLength;
    const compact = (contract.COMPACT_MODE || {});
    const findings = [];

    if (typeof validate !== 'function') {
      return { findings, warningCount: 0, infoCount: 0 };
    }

    function push(slotName, textValue, maxOverride) {
      const result = validate(slotName, textValue, maxOverride ? { maxOverride } : null);
      if (!result || result.status === 'ok' || result.status === 'unknown') return;
      findings.push({
        slot: slotName,
        status: result.status,
        length: result.length,
        budget: result.budget || null,
        severity: result.status === 'long' ? 'warning' : 'info'
      });
    }

    push('title', uiModel && uiModel.title);
    push('symptom', uiModel && uiModel.symptom);
    push('coachSummary', uiModel && uiModel.coach && uiModel.coach.summary);
    push('coachWhy', uiModel && uiModel.coach && uiModel.coach.why);
    push('aftermath', uiModel && uiModel.aftermath);

    const decisionMax = compactMode ? compact.decisionDetailMax360 : null;
    (uiModel && uiModel.decisions ? uiModel.decisions : []).forEach((decision) => {
      push('decisionLabel', decision.label);
      push('decisionDetail', decision.detail, decisionMax);
    });

    (uiModel && uiModel.learningCard && Array.isArray(uiModel.learningCard.bullets) ? uiModel.learningCard.bullets : [])
      .forEach((bullet) => push('learningBullet', bullet));

    const warningCount = findings.filter((entry) => entry.severity === 'warning').length;
    const infoCount = findings.filter((entry) => entry.severity === 'info').length;
    return { findings, warningCount, infoCount };
  }

  const api = Object.freeze({
    evaluateBudgets
  });

  globalScope.EventV2BudgetQa = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

