'use strict';

(function initEventV2UiLabState(globalScope) {
  function createState(scenarios, viewportModes) {
    const list = Array.isArray(scenarios) ? scenarios : [];
    const modes = Array.isArray(viewportModes) ? viewportModes : [];
    const firstId = list[0] ? list[0].id : null;
    const firstViewport = modes[1] ? modes[1].id : (modes[0] ? modes[0].id : null);

    const state = {
      scenarioId: firstId,
      decisionId: null,
      showCoach: true,
      showLearning: false,
      showAftermath: false,
      viewportModeId: firstViewport,
      compactText: true
    };

    return Object.freeze({
      get() {
        return Object.assign({}, state);
      },
      setScenario(scenarioId) {
        state.scenarioId = scenarioId;
        state.decisionId = null;
        state.showCoach = true;
        state.showLearning = false;
        state.showAftermath = false;
      },
      setDecision(decisionId) {
        state.decisionId = decisionId;
        state.showAftermath = true;
      },
      setViewportMode(viewportModeId) {
        state.viewportModeId = viewportModeId;
      },
      toggleCoach() {
        state.showCoach = !state.showCoach;
      },
      toggleLearning() {
        state.showLearning = !state.showLearning;
      },
      toggleAftermath() {
        state.showAftermath = !state.showAftermath;
      },
      toggleCompactText() {
        state.compactText = !state.compactText;
      }
    });
  }

  globalScope.EventV2UiLabState = Object.freeze({ createState });
})(typeof globalThis !== 'undefined' ? globalThis : window);
