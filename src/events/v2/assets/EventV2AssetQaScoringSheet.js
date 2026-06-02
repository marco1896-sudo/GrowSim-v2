'use strict';

(function initEventV2AssetQaScoringSheet(globalScope) {
  const CRITERIA = Object.freeze([
    'buddy_consistency',
    'event_problem_clarity',
    'botanical_plausibility',
    'mobile_readability',
    'ui_hero_composition',
    'no_wrong_cause',
    'no_overdramatization',
    'no_text_or_bubble_errors',
    'no_artifacts',
    'premium_overall_impact'
  ]);

  const RULES = Object.freeze({
    acceptMin: 18,
    reviseMin: 14,
    rejectBelow: 14,
    hardReject: Object.freeze([
      'buddy_wrong',
      'symptom_wrong',
      'text_clutter_or_corruption',
      'not_event_specific',
      'hero_unusable'
    ])
  });

  function classify(totalScore) {
    const score = Number(totalScore || 0);
    if (score >= RULES.acceptMin) return 'accept';
    if (score >= RULES.reviseMin) return 'revise';
    return 'reject';
  }

  const api = Object.freeze({
    CRITERIA,
    RULES,
    classify
  });

  globalScope.EventV2AssetQaScoringSheet = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
