'use strict';

(function initEventV2ScenarioSwitcher(globalScope) {
  function renderScenarioSwitcher(scenarios, activeScenarioId, viewportModes, activeViewportModeId) {
    const options = scenarios.map((scenario) => {
      const selected = scenario.id === activeScenarioId ? ' selected' : '';
      return '<option value="' + scenario.id + '"' + selected + '>' + scenario.title + '</option>';
    }).join('');

    const viewportOptions = (viewportModes || []).map((mode) => {
      const selected = mode.id === activeViewportModeId ? ' selected' : '';
      return '<option value="' + mode.id + '"' + selected + '>' + mode.label + ' (' + mode.width + 'px)</option>';
    }).join('');

    const activeMode = (viewportModes || []).find((mode) => mode.id === activeViewportModeId);
    const activeLabel = activeMode ? activeMode.label + ' ' + activeMode.width + 'px' : 'Viewport n/a';

    return (
      '<div class="event-v2-scenario-switcher">' +
      '<div class="switch-grid">' +
      '<div class="field">' +
      '<label for="event-v2-scenario-select">Scenario</label>' +
      '<select id="event-v2-scenario-select" data-action="change-scenario">' + options + '</select>' +
      '</div>' +
      '<div class="field">' +
      '<label for="event-v2-viewport-select">Viewport</label>' +
      '<select id="event-v2-viewport-select" data-action="change-viewport">' + viewportOptions + '</select>' +
      '</div>' +
      '</div>' +
      '<div class="active-viewport-chip">Aktiv: ' + activeLabel + '</div>' +
      '</div>'
    );
  }

  globalScope.EventV2ScenarioSwitcher = Object.freeze({ renderScenarioSwitcher });
})(typeof globalThis !== 'undefined' ? globalThis : window);
