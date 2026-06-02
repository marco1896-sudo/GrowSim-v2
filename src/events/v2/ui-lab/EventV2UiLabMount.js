'use strict';

(function initEventV2UiLabMount(globalScope) {
  function applyHeroFallbackStates(root) {
    const heroes = root.querySelectorAll('.hero');
    heroes.forEach((hero) => {
      const img = hero.querySelector('img[data-hero-image]');
      if (!img) {
        hero.classList.add('missing');
        return;
      }

      img.addEventListener('load', function onLoad() {
        hero.classList.add('loaded');
      }, { once: true });

      img.addEventListener('error', function onError() {
        hero.classList.remove('loaded');
        hero.classList.add('missing');
      }, { once: true });

      if (img.complete && img.naturalWidth > 0) {
        hero.classList.add('loaded');
      }
      if (img.complete && img.naturalWidth === 0) {
        hero.classList.add('missing');
      }
    });
  }

  function mount(rootSelector) {
    const root = typeof rootSelector === 'string'
      ? document.querySelector(rootSelector)
      : rootSelector;
    if (!root) return null;

    const scenarios = globalScope.EventV2UiLabData.getScenarios();
    const viewportModes = globalScope.EventV2UiLabData.getViewportModes();
    const textBudgets = globalScope.EventV2UiLabData.getTextBudgets();
    const state = globalScope.EventV2UiLabState.createState(scenarios, viewportModes);

    function render() {
      globalScope.EventV2UiLabRenderer.render(root, {
        scenarios,
        viewportModes,
        textBudgets,
        state: state.get()
      });
      applyHeroFallbackStates(root);
    }

    root.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      const action = target.getAttribute('data-action');
      if (action === 'toggle-coach') state.toggleCoach();
      if (action === 'toggle-learning') state.toggleLearning();
      if (action === 'toggle-aftermath') state.toggleAftermath();
      if (action === 'toggle-compact') state.toggleCompactText();
      if (action === 'select-decision') state.setDecision(target.getAttribute('data-decision-id'));
      render();
    });

    root.addEventListener('change', (event) => {
      const target = event.target;
      if (!target || !target.getAttribute) return;
      const action = target.getAttribute('data-action');
      if (action === 'change-scenario') {
        state.setScenario(target.value);
        render();
      }
      if (action === 'change-viewport') {
        state.setViewportMode(target.value);
        render();
      }
    });

    render();
    return Object.freeze({ rerender: render });
  }

  globalScope.EventV2UiLabMount = Object.freeze({ mount });
})(typeof globalThis !== 'undefined' ? globalThis : window);
