#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

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
        memory: { events: [], decisions: [], pendingChains: {} },
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

function buildRunReport(kind) {
  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();

  if (kind === 'stable') {
    const state = createStateLike();
    engine.setQaScenarioLabelForTesting(state, 'stable_allowed');
    for (let index = 0; index < 6; index += 1) {
      engine.routeTick(Date.now() + index, state);
    }
  } else if (kind === 'blocked') {
    const state = createStateLike({
      events: {
        machineState: 'activeEvent',
        activeEventId: 'legacy_other_issue',
        activeCategory: 'environment'
      }
    });
    engine.setQaScenarioLabelForTesting(state, 'guardrail_blocked');
    for (let index = 0; index < 6; index += 1) {
      engine.routeTick(Date.now() + index, state);
    }
  } else if (kind === 'mixed') {
    const state = createStateLike();
    engine.setQaScenarioLabelForTesting(state, 'mixed_fluctuating');
    for (let index = 0; index < 3; index += 1) {
      engine.routeTick(Date.now() + index, state);
    }
    state.events.machineState = 'activeEvent';
    state.events.activeEventId = 'legacy_other_issue';
    state.events.activeCategory = 'environment';
    for (let index = 0; index < 3; index += 1) {
      engine.routeTick(Date.now() + 100 + index, state);
    }
  } else if (kind === 'restore') {
    const pre = createStateLike();
    engine.setQaScenarioLabelForTesting(pre, 'restore_resume_heavy');
    engine.routeTick(Date.now(), pre);
    const payload = engine.exportShadowRuntimeState(pre);
    const restored = createStateLike({
      simulation: { simDay: 7, simTimeMs: 25 * 60 * 60 * 1000, tickCount: 70, isDaytime: true }
    });
    engine.setQaScenarioLabelForTesting(restored, 'restore_resume_heavy');
    engine.restoreShadowRuntimeState(restored, payload);
    for (let index = 0; index < 5; index += 1) {
      engine.routeTick(Date.now() + 100 + index, restored);
    }
  }

  const report = engine.exportQaScenarioReport();
  featureFlag.resetModeForTesting();
  return report;
}

(function testRepeatedRunAggregationShape() {
  const reports = [buildRunReport('stable'), buildRunReport('blocked'), buildRunReport('mixed')];
  const combined = engine.aggregateQaScenarioReports(reports);

  assert.strictEqual(combined.kind, 'internal-soft-cutover-qa-multi-run-report');
  assert.strictEqual(combined.runCount, 3);
  assert.ok(combined.scenarioRollups.stable_allowed);
  assert.ok(combined.scenarioRollups.guardrail_blocked);
  assert.ok(combined.scenarioRollups.mixed_fluctuating);
  assert.ok(combined.mostStableScenario);
  assert.ok(combined.mostFallbackDominantScenario);
})();

(function testCombinedComparisonOutput() {
  const reports = [buildRunReport('stable'), buildRunReport('blocked'), buildRunReport('restore')];
  const combined = engine.aggregateQaScenarioReports(reports);

  assert.ok(combined.assessmentCounts.stable_for_current_scope >= 1);
  assert.ok(combined.assessmentCounts.fallback_dominant >= 1 || combined.assessmentCounts.insufficient_data >= 1);
  assert.ok(combined.restoreHeavySummary);
  assert.ok(Object.prototype.hasOwnProperty.call(combined.restoreHeavySummary, 'materiallyDifferentCount'));
})();

(function testCompactMarkdownReportOutput() {
  const reports = [buildRunReport('stable'), buildRunReport('blocked')];
  const markdown = engine.buildQaMultiRunMarkdownReport(reports);

  assert.ok(markdown.includes('# Internal Soft-Cutover Multi-Run Report'));
  assert.ok(markdown.includes('stable_allowed'));
  assert.ok(markdown.includes('guardrail_blocked'));
  assert.ok(markdown.includes('Repeated stability still does not justify broad cutover by itself.'));
})();

(function testScriptWrapperOutputsJsonAndMarkdown() {
  const reportA = buildRunReport('stable');
  const reportB = buildRunReport('blocked');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'growsim-qa-'));
  const fileA = path.join(tempDir, 'report-a.json');
  const fileB = path.join(tempDir, 'report-b.json');
  fs.writeFileSync(fileA, JSON.stringify(reportA, null, 2));
  fs.writeFileSync(fileB, JSON.stringify(reportB, null, 2));

  const jsonOut = execFileSync(process.execPath, ['scripts/compare-soft-cutover-qa-runs.js', fileA, fileB], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const markdownOut = execFileSync(process.execPath, ['scripts/compare-soft-cutover-qa-runs.js', '--format', 'markdown', fileA, fileB], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });

  const parsed = JSON.parse(jsonOut);
  assert.strictEqual(parsed.kind, 'internal-soft-cutover-qa-multi-run-report');
  assert.strictEqual(parsed.internalOnly, true);
  assert.ok(markdownOut.includes('# Internal Soft-Cutover Multi-Run Report'));
})();

(function testInternalOnlyVisibilityAndLegacyAuthorityRemainUnchanged() {
  const stableReport = buildRunReport('stable');
  assert.strictEqual(stableReport.internalOnly, true);

  engine.resetQaSamplingForTesting();
  featureFlag.setModeForTesting('internal-soft-cutover');
  registerLegacyRuntime();
  const state = createStateLike();
  engine.setQaScenarioLabelForTesting(state, 'stable_allowed');
  const before = JSON.stringify(state.events);
  const result = engine.routeChoice('drain_pot', state);
  const after = JSON.stringify(state.events);

  const status = engine.getRuntimeStatus(state);
  assert.ok(status.qaScenariosInternal);
  assert.ok(status.qaScenarioComparisonInternal);
  assert.ok(!Object.prototype.hasOwnProperty.call(status, 'playerFacingQaMultiRun'));
  assert.strictEqual(result.delegated, 'legacy');
  assert.strictEqual(before, after);

  featureFlag.resetModeForTesting();
})();

(function testDocsExplainRepeatedRunUsage() {
  const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'internal-soft-cutover-qa.md'), 'utf8');
  assert.ok(doc.includes('compare-soft-cutover-qa-runs.js'));
  assert.ok(doc.includes('Repeated stability'));
})();

console.log('event-phase10e-multi-run-comparator tests passed');
