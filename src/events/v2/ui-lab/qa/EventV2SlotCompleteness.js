'use strict';

(function initEventV2SlotCompleteness(globalScope) {
  function hasValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  function evaluateSlotCompleteness(uiModel, slotContractApi) {
    const contract = (slotContractApi && slotContractApi.SLOT_CONTRACT) || {};
    const requiredMissing = [];
    const recommendedMissing = [];
    const optionalMissing = [];

    const slotChecks = {
      hero: hasValue(uiModel && uiModel.hero && uiModel.hero.src),
      heroAlt: hasValue(uiModel && uiModel.hero && uiModel.hero.alt),
      title: hasValue(uiModel && uiModel.title),
      symptom: hasValue(uiModel && uiModel.symptom),
      setup: hasValue(uiModel && uiModel.setup),
      stage: hasValue(uiModel && uiModel.stage),
      severity: hasValue(uiModel && uiModel.severity),
      category: hasValue(uiModel && uiModel.category),
      coachSummary: hasValue(uiModel && uiModel.coach && uiModel.coach.summary),
      coachWhy: hasValue(uiModel && uiModel.coach && uiModel.coach.why),
      coachActions: hasValue(uiModel && uiModel.coach && uiModel.coach.actions),
      decisions: hasValue(uiModel && uiModel.decisions) && uiModel.decisions.length >= 2,
      learningCard: hasValue(uiModel && uiModel.learningCard),
      aftermath: hasValue(uiModel && uiModel.aftermath)
    };

    Object.keys(contract).forEach((slotName) => {
      const slotDef = contract[slotName] || {};
      const ok = Boolean(slotChecks[slotName]);
      if (ok) return;
      if (slotDef.scope === 'required') requiredMissing.push(slotName);
      else if (slotDef.scope === 'recommended') recommendedMissing.push(slotName);
      else optionalMissing.push(slotName);
    });

    return {
      slotChecks,
      requiredMissing,
      recommendedMissing,
      optionalMissing,
      requiredComplete: requiredMissing.length === 0
    };
  }

  const api = Object.freeze({
    evaluateSlotCompleteness
  });

  globalScope.EventV2SlotCompleteness = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

