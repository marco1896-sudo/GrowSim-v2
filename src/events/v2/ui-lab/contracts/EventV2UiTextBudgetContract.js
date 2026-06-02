'use strict';

(function initEventV2UiTextBudgetContract(globalScope) {
  const TEXT_BUDGET = Object.freeze({
    title: Object.freeze({ min: 36, max: 48 }),
    symptom: Object.freeze({ min: 120, max: 180 }),
    coachSummary: Object.freeze({ min: 120, max: 180 }),
    coachWhy: Object.freeze({ min: 180, max: 260 }),
    decisionLabel: Object.freeze({ min: 18, max: 32 }),
    decisionDetail: Object.freeze({ min: 70, max: 120 }),
    aftermath: Object.freeze({ min: 100, max: 160 }),
    learningBullet: Object.freeze({ min: 20, max: 90 })
  });

  const COMPACT_MODE = Object.freeze({
    decisionDetailMax360: 95,
    shrinkableSlots: Object.freeze(['symptom', 'coachSummary', 'coachWhy', 'decisionDetail', 'aftermath']),
    nonShrinkableSlots: Object.freeze(['title', 'decisionLabel'])
  });

  function validateTextLength(slotName, textValue, options) {
    const value = String(textValue || '');
    const length = value.length;
    const budget = TEXT_BUDGET[slotName];
    if (!budget) {
      return { slotName, length, ok: true, status: 'unknown', budget: null };
    }

    const min = budget.min;
    const max = budget.max;
    const maxOverride = options && typeof options.maxOverride === 'number' ? options.maxOverride : max;
    if (length === 0) return { slotName, length, ok: false, status: 'missing', budget };
    if (length < min) return { slotName, length, ok: true, status: 'short', budget: { min, max: maxOverride } };
    if (length > maxOverride) return { slotName, length, ok: false, status: 'long', budget: { min, max: maxOverride } };
    return { slotName, length, ok: true, status: 'ok', budget: { min, max: maxOverride } };
  }

  const api = Object.freeze({
    TEXT_BUDGET,
    COMPACT_MODE,
    validateTextLength
  });

  globalScope.EventV2UiTextBudgetContract = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

