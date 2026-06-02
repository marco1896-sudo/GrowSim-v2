'use strict';

(function initEventV2UiLabRenderer(globalScope) {
  function getScenarioById(scenarios, id) {
    return scenarios.find((item) => item.id === id) || scenarios[0] || null;
  }

  function getViewportMode(viewportModes, id) {
    return viewportModes.find((item) => item.id === id) || viewportModes[0] || { width: 390, label: 'Default' };
  }

  function renderBudgetInfo(budgets, compactText) {
    return (
      '<details class="budget-panel"' + (compactText ? '' : ' open') + '>' +
      '<summary>Textbudgets</summary>' +
      '<ul>' +
      '<li>Titel: ' + budgets.eventTitle + '</li>' +
      '<li>Symptom: ' + budgets.situationSymptom + '</li>' +
      '<li>Coach Summary: ' + budgets.coachSummary + '</li>' +
      '<li>Why/Learning: ' + budgets.whyLearningShort + '</li>' +
      '<li>Decision Label: ' + budgets.decisionLabel + '</li>' +
      '<li>Decision Detail: ' + budgets.decisionDetail + '</li>' +
      '<li>Aftermath: ' + budgets.aftermath + '</li>' +
      '</ul>' +
      '</details>'
    );
  }

  function render(root, model) {
    if (!root) return;

    const scenario = getScenarioById(model.scenarios, model.state.scenarioId);
    if (!scenario) {
      root.innerHTML = '<div class="event-v2-ui-lab empty">Keine Scenarios verfuegbar.</div>';
      return;
    }

    const selectedDecision = scenario.decisions.find((item) => item.id === model.state.decisionId) || null;
    const viewportMode = getViewportMode(model.viewportModes, model.state.viewportModeId);

    const isSmall360 = viewportMode.width <= 360;
    const isPhone390 = viewportMode.width <= 390;
    const compactHero = isPhone390;
    const detailMaxLength = isSmall360 ? 95 : 120;

    const metaBar = globalScope.EventV2MetaBar.renderMetaBar(scenario);
    const coach = globalScope.EventV2CoachPanel.renderCoachPanel(scenario, model.state.showCoach, model.state.compactText);
    const decisions = globalScope.EventV2DecisionList.renderDecisionList(
      scenario,
      model.state.decisionId,
      detailMaxLength,
      model.state.compactText
    );
    const learning = globalScope.EventV2LearningCard.renderLearningCard(scenario, model.state.showLearning, model.state.compactText);
    const aftermath = globalScope.EventV2AftermathPanel.renderAftermathPanel(scenario, selectedDecision, model.state.showAftermath, model.state.compactText);
    const switcher = globalScope.EventV2ScenarioSwitcher.renderScenarioSwitcher(
      model.scenarios,
      model.state.scenarioId,
      model.viewportModes,
      model.state.viewportModeId
    );

    const modal = globalScope.EventV2Modal.renderEventV2Modal(
      scenario,
      metaBar + coach + decisions + learning + aftermath
    );

    root.innerHTML =
      '<section class="event-v2-ui-lab viewport-' + viewportMode.id + (compactHero ? ' compact-hero' : '') + '">' +
      '<header class="event-v2-lab-top">' +
      '<h2>Event V2 UI-Lab</h2>' +
      '<div class="toggles">' +
      '<button class="ui-btn subtle" data-action="toggle-coach">Coach</button>' +
      '<button class="ui-btn subtle" data-action="toggle-learning">Learning</button>' +
      '<button class="ui-btn subtle" data-action="toggle-aftermath">Aftermath</button>' +
      '<button class="ui-btn subtle" data-action="toggle-compact">Text</button>' +
      '</div>' +
      '</header>' +
      switcher +
      renderBudgetInfo(model.textBudgets, model.state.compactText) +
      '<div class="mobile-frame" style="max-width:' + viewportMode.width + 'px">' + modal + '</div>' +
      '</section>';
  }

  globalScope.EventV2UiLabRenderer = Object.freeze({ render });
})(typeof globalThis !== 'undefined' ? globalThis : window);
