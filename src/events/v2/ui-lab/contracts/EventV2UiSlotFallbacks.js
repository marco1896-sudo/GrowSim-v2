'use strict';

(function initEventV2UiSlotFallbacks(globalScope) {
  const FALLBACKS = Object.freeze({
    hero: Object.freeze({
      src: 'assets/events/event-stress-recovery.png',
      alt: 'Event visual fallback'
    }),
    title: 'Unbenanntes Event',
    symptom: 'Aktuell fehlen Symptomdetails. Bitte Eventdaten pruefen.',
    coachSummary: 'Bleib ruhig und geh in kleinen Schritten vor.',
    coachWhy: 'Pruefe zuerst die Ursache, dann waehle die kleinste wirksame Korrektur.',
    coachActions: Object.freeze(['Status ruhig pruefen.', 'Kleine Korrektur setzen.']),
    decisionLabel: 'Option',
    decisionDetail: 'Details folgen nach Datenpruefung.',
    decisionQuality: 'situational',
    learning: Object.freeze({
      hidePanelWhenMissing: true,
      title: 'Learning nicht verfuegbar',
      subtitle: 'Optionaler Bereich',
      bullets: Object.freeze([])
    }),
    aftermath: Object.freeze({
      hidePanelWhenMissing: false,
      text: 'Kein Aftermath-Text vorhanden. Wirkung spaeter nachreichen.'
    })
  });

  function getFallback(slotName) {
    return FALLBACKS[slotName];
  }

  const api = Object.freeze({
    FALLBACKS,
    getFallback
  });

  globalScope.EventV2UiSlotFallbacks = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

