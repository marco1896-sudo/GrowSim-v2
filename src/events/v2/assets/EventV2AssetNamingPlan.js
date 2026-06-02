'use strict';

(function initEventV2AssetNamingPlan(globalScope) {
  const PLAN = Object.freeze({
    baseDir: 'assets/events/v2',
    files: Object.freeze([
      'hero.webp',
      'hero@2x.webp',
      'fallback.webp'
    ]),
    preferredFormat: 'webp_transparent',
    heroRatio: '4:3',
    safeMarginPercent: 10,
    notes: Object.freeze([
      'Keep Buddy and primary symptom inside central safe area.',
      'Avoid clipping near modal crop edges.',
      'Preserve fallback compatibility with existing asset resolver behavior.'
    ])
  });

  function buildEventPaths(eventId) {
    const root = PLAN.baseDir + '/' + String(eventId || 'unknown');
    return Object.freeze({
      hero: root + '/hero.webp',
      hero2x: root + '/hero@2x.webp',
      fallback: root + '/fallback.webp'
    });
  }

  const api = Object.freeze({
    PLAN,
    buildEventPaths
  });

  globalScope.EventV2AssetNamingPlan = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
