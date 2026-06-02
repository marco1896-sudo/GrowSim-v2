'use strict';

(function initShadowBridgeIndexPatchPreflightChecklist(moduleScope) {
  const INDEX_PATCH_PREFLIGHT_CHECKLIST = Object.freeze({
    phase: 'phase-49',
    status: 'review_only',
    targetFile: 'index.html',
    proposedPatch: Object.freeze({
      insertBefore: "{ src: 'app.js' }",
      line: "{ src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js' }"
    }),
    phase50PostPatchChecks: Object.freeze([
      'First Load im Browser',
      'Reload',
      'Hard Reload',
      'PWA / installierte App, falls testbar',
      'Boot-Error-Banner bleibt aus',
      'Candidate-Datei wird mit ?v=<buildId> geladen',
      'App startet weiterhin',
      'Combined Report bleibt gruen',
      'Bundle Candidate Tests bleiben gruen',
      'Kein window.ShadowBridgeGuardedEntry, falls Candidate nicht explizit registriert',
      'Kein Event-V2-Hook aktiv',
      'Kein Save',
      'Keine UI',
      'Legacy laeuft normal'
    ]),
    rollback: Object.freeze([
      'Remove the single bundle candidate script line.',
      'Ship a shell update with a new build id.',
      'Run bundle candidate tests.',
      'Run comparison smoke.',
      'Run combined report.',
      'Run guarded entry contract tests.',
      'Repeat browser first-load/reload checks.'
    ])
  });

  const api = Object.freeze({
    INDEX_PATCH_PREFLIGHT_CHECKLIST
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
})(typeof module !== 'undefined' ? module : null);

