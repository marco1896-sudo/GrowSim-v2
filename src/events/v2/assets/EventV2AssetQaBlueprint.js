'use strict';

(function initEventV2AssetQaBlueprint(globalScope) {
  const universalChecklist = Object.freeze([
    'buddy_consistent',
    'problem_visible',
    'botanically_plausible',
    'mobile_readable',
    'hero_frame_safe',
    'tone_correct',
    'no_text_clutter',
    'cause_correct',
    'no_dominant_wrong_problem',
    'bubble_valid_or_omitted',
    'learning_tone_aligned'
  ]);

  function createEmptyScorecard(eventId) {
    const checks = {};
    universalChecklist.forEach((id) => {
      checks[id] = null;
    });
    return Object.freeze({
      eventId: String(eventId || ''),
      checks
    });
  }

  const api = Object.freeze({
    universalChecklist,
    createEmptyScorecard
  });

  globalScope.EventV2AssetQaBlueprint = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
