'use strict';

(function initEventV2CoachPanel(globalScope) {
  function shorten(text, maxLength, compactText) {
    if (!compactText || typeof text !== 'string' || text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 1).trimEnd() + '…';
  }

  function renderCoachPanel(scenario, isOpen, compactText) {
    if (!isOpen) {
      return '<button class="ui-btn subtle" data-action="toggle-coach">Coach anzeigen</button>';
    }

    const summary = shorten(scenario.coach.summary, 170, compactText);
    const why = shorten(scenario.coach.why, 240, compactText);

    return (
      '<section class="event-v2-panel coach">' +
      '<header><h3>Warum relevant?</h3><button class="ui-btn subtle" data-action="toggle-coach">Ausblenden</button></header>' +
      '<p class="summary">' + summary + '</p>' +
      '<p class="why">' + why + '</p>' +
      '<ul><li>' + scenario.coach.actions[0] + '</li><li>' + scenario.coach.actions[1] + '</li></ul>' +
      '</section>'
    );
  }

  globalScope.EventV2CoachPanel = Object.freeze({ renderCoachPanel });
})(typeof globalThis !== 'undefined' ? globalThis : window);
