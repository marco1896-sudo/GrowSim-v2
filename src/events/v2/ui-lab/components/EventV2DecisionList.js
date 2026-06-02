'use strict';

(function initEventV2DecisionList(globalScope) {
  function qualityLabel(kind) {
    if (kind === 'recommended') return 'Empfohlen';
    if (kind === 'risky') return 'Riskant';
    return 'Situativ';
  }

  function qualityHint(kind) {
    if (kind === 'recommended') return 'Primaerer Pfad';
    if (kind === 'risky') return 'Mehr Risiko';
    return 'Abhaengig vom Kontext';
  }

  function shorten(text, maxLength, compactText) {
    if (!compactText || typeof text !== 'string' || text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 1).trimEnd() + '…';
  }

  function renderDecisionList(scenario, selectedDecisionId, detailMaxLength, compactText) {
    const maxLen = typeof detailMaxLength === 'number' ? detailMaxLength : 120;
    const rows = scenario.decisions.map((decision) => {
      const activeClass = decision.id === selectedDecisionId ? ' active' : '';
      const recommendedClass = decision.quality === 'recommended' ? ' recommended' : '';
      const riskyClass = decision.quality === 'risky' ? ' risky' : '';
      return (
        '<button class="decision-item' + activeClass + recommendedClass + riskyClass + '" data-action="select-decision" data-decision-id="' + decision.id + '">' +
        '<span class="label-row">' +
        '<span class="label">' + decision.label + '</span>' +
        '<span class="quality q-' + decision.quality + '">' + qualityLabel(decision.quality) + '</span>' +
        '</span>' +
        '<span class="detail">' + shorten((decision.detail || qualityHint(decision.quality)), maxLen, compactText) + '</span>' +
        '</button>'
      );
    }).join('');

    return (
      '<section class="event-v2-panel decisions">' +
      '<header><h3>Was kannst du tun?</h3></header>' +
      '<div class="decision-list">' + rows + '</div>' +
      '</section>'
    );
  }

  globalScope.EventV2DecisionList = Object.freeze({ renderDecisionList });
})(typeof globalThis !== 'undefined' ? globalThis : window);
