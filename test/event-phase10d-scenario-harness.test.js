#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const featureFlag = require('../src/events/eventFeatureFlag.js');
const engine = require('../src/events/eventEngine.js');

function createStateLike(overrides = {}) {
  return {
    status: {
      water: 86,
      nutrition: 58,
      health: 78,
      stress: 34,
      risk: 28,
      growth: 32,
      ...(overrides.status || {})
    },
    plant: {
      phase: 'vegetative',
      stageIndex: 3,
      stageProgress: 0.4,
      ...(overrides.plant || {})
    },
    simulation: {
      simDay: 6,
      simTimeMs: 24 * 60 * 60 * 1000,
      tickCount: 60,
      isDaytime: true,
      ...(overrides.simulation || {})
    },
    setup: {
      growMode: 'indoor',
      ...(overrides.setup || {})
    },
    environmentControls: {
      temperatureC: 24,
      humidityPercent: 58,
      airflowPercent: 58,
      ph: 6.0,
      ec: 1.4,
      ...(overrides.environmentControls || {})
    },
    climate: {
      tent: {
        temperatureC: 24,
        humidityPercent: 58,
        vpdKpa: 1.1,
        airflowScore: 58,
        instabilityScore: 12,
        ...((overrides.climate && overrides.climate.tent) || {})
      },
      runtime: {
        eventTelemetry: {
          instabilityScore: 12,
          ...(((overrides.climate && overrides.climate.runtime) || {}).eventTelemetry || {})
        }
      }
    },
    events: {
      machineState: 'idle',
      activeEventId: null,
      activeCategory: 'generic',
      history: [],
      foundation: {
        flags: {},
        memory: {
          events: [],
          decisions: [],
          pendingChains: {}
        },
        analysis: []
      },
      scheduler: {
        eventCooldownsSim: {},
        categoryCooldownsSim: {},
        eventCooldowns: {},
        categoryCooldowns: {},
        ...((overrides.events && overrides.events.scheduler) || {})
      },
      catalog: [{
        id: 'v2_water_overwater_warning',
        category: 'water',
        options: [
          { id: 'drain_pot', effects: { stress: -3, risk: -5, health: 1 } },
          { id: 'ignore_moist', effects: { stress: 3, risk: 5, health: -2 } }
        ],
        triggers: {
          all: [{ field: 'status.water', op: '>=', value: 80 }]
        }
      }],
      ...(overrides.events || {})
    }
  };
}

function registerLegacyRuntime() {
  engine.registerLegacyRuntime({
    runEventStateMachine() { return 'legacy-tick'; },
    onEventOptionClick(optionId) { return `legacy-choice:${optionId}`; }
  });
}

(function testPerScenarioAggregationExists() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  const stableState = createStateLike();
  engine.setQaScenarioLabelForTesting(stableState, 'stable_allowed');
  for (let index = 0; index < 6; index += 1) {
    stableState.simulation.tickCount += 1;
    stableState.simulation.simTimeMs += 1000;
    engine.routeTick(Date.now() + index, stableState);
  }

  const blockedState = createStateLike({
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_other_issue',
      activeCategory: 'environment'
    }
  });
  engine.setQaScenarioLabelForTesting(blockedState, 'guardrail_blocked');
  for (let index = 0; index < 6; index += 1) {
    blockedState.simulation.tickCount += 1;
    blockedState.simulation.simTimeMs += 1000;
    engine.routeTick(Date.now() + 100 + index, blockedState);
  }

  const scenarios = engine.getQaScenarioSummaries();
  assert.ok(scenarios.stable_allowed);
  assert.ok(scenarios.guardrail_blocked);
  assert.strictEqual(scenarios.stable_allowed.totalObservations, 6);
  assert.strictEqual(scenarios.guardrail_blocked.totalObservations, 6);
  assert.strictEqual(scenarios.stable_allowed.assessment, 'stable_for_current_scope');
  assert.strictEqual(scenarios.guardrail_blocked.assessment, 'fallback_dominant');

  featureFlag.resetModeForTesting();
})();

(function testScenarioComparisonShape() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  const stableState = createStateLike();
  engine.setQaScenarioLabelForTesting(stableState, 'stable_allowed');
  for (let index = 0; index < 6; index += 1) {
    engine.routeTick(Date.now() + index, stableState);
  }

  const mixedState = createStateLike();
  engine.setQaScenarioLabelForTesting(mixedState, 'mixed_fluctuating');
  for (let index = 0; index < 3; index += 1) {
    engine.routeTick(Date.now() + 100 + index, mixedState);
  }
  mixedState.events.machineState = 'activeEvent';
  mixedState.events.activeEventId = 'legacy_other_issue';
  mixedState.events.activeCategory = 'environment';
  for (let index = 0; index < 3; index += 1) {
    engine.routeTick(Date.now() + 200 + index, mixedState);
  }

  const comparison = engine.compareQaScenarioSummaries();
  assert.ok(Array.isArray(comparison.scenarioLabels));
  assert.ok(comparison.scenarioLabels.includes('stable_allowed'));
  assert.ok(comparison.scenarioLabels.includes('mixed_fluctuating'));
  assert.ok(comparison.highestFallbackRateScenario);
  assert.ok(Array.isArray(comparison.stableScenarios));
  assert.ok(Array.isArray(comparison.insufficientDataScenarios) || Array.isArray(comparison.unstableGuardrailScenarios));

  featureFlag.resetModeForTesting();
})();

(function testCompactExportAndMarkdownHelpers() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  const stableState = createStateLike();
  engine.setQaScenarioLabelForTesting(stableState, 'stable_allowed');
  for (let index = 0; index < 5; index += 1) {
    engine.routeTick(Date.now() + index, stableState);
  }

  const report = engine.exportQaScenarioReport();
  const markdown = engine.buildQaScenarioMarkdownReport();

  assert.strictEqual(report.kind, 'internal-soft-cutover-qa-report');
  assert.strictEqual(report.internalOnly, true);
  assert.ok(report.overall);
  assert.ok(report.scenarios);
  assert.ok(report.comparison);
  assert.ok(markdown.includes('# Internal Soft-Cutover Scenario Report'));
  assert.ok(markdown.includes('stable_allowed'));
  assert.ok(markdown.includes('internal-only'));

  featureFlag.resetModeForTesting();
})();

(function testRestoreResumeHeavyScenarioHandling() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  const preRestoreState = createStateLike();
  engine.setQaScenarioLabelForTesting(preRestoreState, 'restore_resume_heavy');
  engine.routeTick(Date.now(), preRestoreState);
  const payload = engine.exportShadowRuntimeState(preRestoreState);

  const restoredState = createStateLike({
    simulation: {
      simDay: 7,
      simTimeMs: 25 * 60 * 60 * 1000,
      tickCount: 70,
      isDaytime: true
    }
  });
  engine.setQaScenarioLabelForTesting(restoredState, 'restore_resume_heavy');
  engine.restoreShadowRuntimeState(restoredState, payload);
  for (let index = 0; index < 5; index += 1) {
    restoredState.simulation.tickCount += 1;
    restoredState.simulation.simTimeMs += 1000;
    engine.routeTick(Date.now() + 100 + index, restoredState);
  }

  const scenarios = engine.getQaScenarioSummaries();
  const comparison = engine.compareQaScenarioSummaries();
  assert.ok(scenarios.restore_resume_heavy);
  assert.ok(Object.keys(scenarios.restore_resume_heavy.restoreResumeNotes).length >= 1);
  assert.ok(comparison.restoreHeavyComparison);
  assert.strictEqual(comparison.restoreHeavyComparison.label, 'restore_resume_heavy');

  featureFlag.resetModeForTesting();
})();

(function testRuntimeStatusKeepsScenarioHarnessInternalOnly() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  const state = createStateLike();
  engine.setQaScenarioLabelForTesting(state, 'stable_allowed');
  engine.routeTick(Date.now(), state);

  const status = engine.getRuntimeStatus(state);
  assert.ok(status.qaScenariosInternal);
  assert.ok(status.qaScenarioComparisonInternal);
  assert.ok(!Object.prototype.hasOwnProperty.call(status, 'playerFacingQaScenarios'));

  featureFlag.resetModeForTesting();
})();

(function testLegacyAuthorityRemainsUnchangedDuringScenarioHarnessUse() {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  const state = createStateLike();
  engine.setQaScenarioLabelForTesting(state, 'stable_allowed');
  const before = JSON.stringify(state.events);
  const result = engine.routeChoice('drain_pot', state);
  const after = JSON.stringify(state.events);

  assert.strictEqual(result.result, 'legacy-choice:drain_pot');
  assert.strictEqual(result.delegated, 'legacy');
  assert.strictEqual(before, after);

  featureFlag.resetModeForTesting();
})();

(function testDocsExplainScenarioLabelsAndLimits() {
  const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'internal-soft-cutover-qa.md'), 'utf8');
  assert.ok(doc.includes('stable_allowed'));
  assert.ok(doc.includes('guardrail_blocked'));
  assert.ok(doc.includes('restore_resume_heavy'));
  assert.ok(doc.includes('still does not justify broad cutover'));
})();

console.log('event-phase10d-scenario-harness tests passed');
