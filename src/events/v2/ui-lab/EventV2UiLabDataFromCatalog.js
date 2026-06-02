'use strict';

(function initEventV2UiLabDataFromCatalog(globalScope) {
  const adapter = globalScope.EventV2CatalogToUiAdapter || null;

  function normalizeCoachActions(actions) {
    const list = Array.isArray(actions) ? actions.filter(Boolean) : [];
    if (list.length >= 2) {
      return list.slice(0, 2);
    }
    if (list.length === 1) {
      return [list[0], list[0]];
    }
    return ['Beobachten und ruhig bleiben.', 'Kleine Korrekturen statt Hektik.'];
  }

  function toUiLabScenario(uiModel) {
    const hero = uiModel && uiModel.hero ? uiModel.hero : {};
    return {
      id: uiModel && uiModel.id,
      setup: uiModel && uiModel.setup,
      category: uiModel && uiModel.category,
      stage: uiModel && uiModel.stage,
      severity: uiModel && uiModel.severity,
      image: hero.src || hero.fallbackSrc || '',
      hero: hero,
      title: uiModel && uiModel.title,
      symptom: uiModel && uiModel.symptom,
      coach: {
        summary: uiModel && uiModel.coach ? uiModel.coach.summary : '',
        why: uiModel && uiModel.coach ? uiModel.coach.why : '',
        actions: normalizeCoachActions(uiModel && uiModel.coach ? uiModel.coach.actions : [])
      },
      decisions: Array.isArray(uiModel && uiModel.decisions) ? uiModel.decisions.slice(0, 3) : [],
      learningCard: uiModel && uiModel.learningCard ? uiModel.learningCard : {
        title: '',
        subtitle: '',
        bullets: []
      },
      aftermath: uiModel && uiModel.aftermath ? uiModel.aftermath : ''
    };
  }

  function mapCatalogEntriesToScenarios(entries, learningCardById, localeBundle, options) {
    if (!adapter || typeof adapter.mapEventToUiLabModel !== 'function') {
      return { scenarios: [], diagnostics: [{ code: 'ui_lab_adapter_unavailable', severity: 'error', message: 'Adapter not available' }] };
    }

    const sourceEntries = Array.isArray(entries) ? entries : [];
    const scenarioResults = sourceEntries.map((eventDoc) => {
      const ref = eventDoc && eventDoc.learningCard && eventDoc.learningCard.ref;
      const learningDoc = ref && learningCardById ? learningCardById[ref] : null;
      return adapter.mapEventToUiLabModel(eventDoc, learningDoc, localeBundle, options || {});
    });

    const scenarios = scenarioResults.map((result) => toUiLabScenario(result.uiModel));
    const diagnostics = scenarioResults.reduce((acc, result) => acc.concat(result.diagnostics || []), []);
    return { scenarios, diagnostics };
  }

  const api = Object.freeze({
    mapCatalogEntriesToScenarios
  });

  globalScope.EventV2UiLabDataFromCatalog = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
