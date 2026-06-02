'use strict';

(function initEventV2UiTokenContract(globalScope) {
  const UI_TOKENS = Object.freeze({
    spacing: Object.freeze({
      space1: 4,
      space2: 8,
      space3: 10,
      space4: 12,
      space5: 16
    }),
    radius: Object.freeze({
      chip: 999,
      panel: 12,
      modal: 16,
      frame: 20
    }),
    hero: Object.freeze({
      standardHeight: 190,
      compactHeight: 144,
      fallbackHeightSmall: 150
    }),
    chips: Object.freeze({
      standardFontSize: 11,
      standardPaddingY: 4,
      standardPaddingX: 9,
      compactFontSize: 10,
      compactPaddingY: 3,
      compactPaddingX: 7
    }),
    tapTargets: Object.freeze({
      buttonMinHeight: 36,
      decisionCardMinHeight: 70
    }),
    ctaHierarchy: Object.freeze({
      recommended: 'high',
      situational: 'medium',
      risky: 'visible_risk_without_alarm'
    })
  });

  const api = Object.freeze({
    UI_TOKENS
  });

  globalScope.EventV2UiTokenContract = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

