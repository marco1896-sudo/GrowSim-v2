'use strict';

(function initEventV2LearningCard(globalScope) {
  function shorten(text, maxLength, compactText) {
    if (!compactText || typeof text !== 'string' || text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 1).trimEnd() + '…';
  }

  function renderLearningCard(scenario, isOpen, compactText) {
    if (!isOpen) {
      return '<button class="ui-btn subtle" data-action="toggle-learning">Learning Card anzeigen</button>';
    }

    const subtitle = shorten(scenario.learningCard.subtitle, 130, compactText);
    const bullets = scenario.learningCard.bullets
      .map((item) => '<li>' + shorten(item, 100, compactText) + '</li>')
      .join('');

    return (
      '<section class="event-v2-panel learning">' +
      '<header><h3>Was lernst du daraus?</h3><button class="ui-btn subtle" data-action="toggle-learning">Ausblenden</button></header>' +
      '<p class="subtitle">' + subtitle + '</p>' +
      '<ul>' + bullets + '</ul>' +
      '</section>'
    );
  }

  globalScope.EventV2LearningCard = Object.freeze({ renderLearningCard });
})(typeof globalThis !== 'undefined' ? globalThis : window);
