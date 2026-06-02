'use strict';

(function initEventV2AftermathPanel(globalScope) {
  function shorten(text, maxLength, compactText) {
    if (!compactText || typeof text !== 'string' || text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 1).trimEnd() + '…';
  }

  function renderAftermathPanel(scenario, selectedDecision, isOpen, compactText) {
    if (!isOpen) {
      return '<button class="ui-btn subtle" data-action="toggle-aftermath">Nachwirkung anzeigen</button>';
    }

    const decisionText = selectedDecision ? selectedDecision.label : 'Noch keine Entscheidung gewaehlt.';
    const detailText = selectedDecision && selectedDecision.detail
      ? selectedDecision.detail
      : 'Waehle eine Option, um Folgen klarer einzuordnen.';

    return (
      '<section class="event-v2-panel aftermath">' +
      '<header><h3>Was passiert danach?</h3><button class="ui-btn subtle" data-action="toggle-aftermath">Ausblenden</button></header>' +
      '<p class="decision-context"><strong>Auswahl:</strong> ' + decisionText + '</p>' +
      '<p class="decision-detail">' + shorten(detailText, 120, compactText) + '</p>' +
      '<p>' + shorten(scenario.aftermath, 160, compactText) + '</p>' +
      '</section>'
    );
  }

  globalScope.EventV2AftermathPanel = Object.freeze({ renderAftermathPanel });
})(typeof globalThis !== 'undefined' ? globalThis : window);
