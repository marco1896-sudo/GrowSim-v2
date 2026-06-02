'use strict';

(function initEventV2UiSlotContract(globalScope) {
  const REQUIRED = 'required';
  const RECOMMENDED = 'recommended';
  const OPTIONAL = 'optional';

  const SLOT_CONTRACT = Object.freeze({
    hero: Object.freeze({
      scope: RECOMMENDED,
      sourcePaths: ['assets.cover.src', 'assets.cover.fallback'],
      fallbackPolicy: 'hero_visual_fallback'
    }),
    heroAlt: Object.freeze({
      scope: RECOMMENDED,
      sourcePaths: ['assets.cover.altKey', 'title.key', 'id'],
      fallbackPolicy: 'hero_alt_from_title_or_generic'
    }),
    title: Object.freeze({
      scope: REQUIRED,
      sourcePaths: ['title.key', 'title']
    }),
    symptom: Object.freeze({
      scope: REQUIRED,
      sourcePaths: ['shortSymptom.key', 'shortSymptom', 'longDescription.key', 'longDescription']
    }),
    setup: Object.freeze({
      scope: REQUIRED,
      sourcePaths: ['triggers.setup.modeIn', 'tags']
    }),
    stage: Object.freeze({
      scope: RECOMMENDED,
      sourcePaths: ['triggers.stage.min', 'triggers.stage.max', 'stage']
    }),
    severity: Object.freeze({
      scope: RECOMMENDED,
      sourcePaths: ['severity.level']
    }),
    category: Object.freeze({
      scope: REQUIRED,
      sourcePaths: ['category']
    }),
    coachSummary: Object.freeze({
      scope: RECOMMENDED,
      sourcePaths: ['coach.summary.key', 'coach.summary']
    }),
    coachWhy: Object.freeze({
      scope: RECOMMENDED,
      sourcePaths: ['coach.why.key', 'coach.why', 'cause.explanation.key']
    }),
    coachActions: Object.freeze({
      scope: OPTIONAL,
      sourcePaths: ['coach.actions']
    }),
    decisions: Object.freeze({
      scope: REQUIRED,
      sourcePaths: ['options']
    }),
    learningCard: Object.freeze({
      scope: OPTIONAL,
      sourcePaths: ['learningCard.ref']
    }),
    aftermath: Object.freeze({
      scope: RECOMMENDED,
      sourcePaths: ['aftermathProfile.lesson.key', 'aftermathProfile.lesson']
    })
  });

  const SLOT_GROUPS = Object.freeze({
    neverHide: Object.freeze(['title', 'symptom', 'decisions']),
    hideWhenMissing: Object.freeze(['learningCard', 'aftermath']),
    compactAllowed: Object.freeze(['symptom', 'coachSummary', 'coachWhy', 'decisionDetail', 'aftermath']),
    compactDisallowed: Object.freeze(['title', 'decisionLabel'])
  });

  const api = Object.freeze({
    REQUIRED,
    RECOMMENDED,
    OPTIONAL,
    SLOT_CONTRACT,
    SLOT_GROUPS
  });

  globalScope.EventV2UiSlotContract = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

