#!/usr/bin/env node
'use strict';

const assert = require('assert');
const progression = require('../src/progression/progression.js');

(function testExplicitLevelThresholds() {
  assert.strictEqual(progression.getLevelForXp(0), 1, '0 XP should remain level 1');
  assert.strictEqual(progression.getLevelForXp(149), 1, 'threshold should not trigger early');
  assert.strictEqual(progression.getLevelForXp(150), 2, '150 XP should unlock level 2');
  assert.strictEqual(progression.getLevelForXp(649), 3, '649 XP should still be level 3');
  assert.strictEqual(progression.getLevelForXp(650), 4, '650 XP should unlock level 4');
})();

(function testGoalAssignmentAndEvaluation() {
  const profile = progression.getDefaultProfile();
  const run = {
    id: 1,
    status: 'active',
    endReason: null,
    startedAtRealMs: 10,
    endedAtRealMs: null,
    finalizedAtRealMs: null,
    setupSnapshot: { mode: 'indoor', light: 'medium', medium: 'soil', potSize: 'small', genetics: 'hybrid' }
  };
  const goal = progression.chooseRunGoal(profile, run);
  assert.ok(goal && goal.id, 'run start should assign a goal');
  assert.ok(goal.title && goal.description, 'assigned goal should be readable');

  const floweringGoal = progression.evaluateRunGoal(
    { id: 'reach_flowering' },
    { simulation: { simDay: 18 }, plant: { stageIndex: 7, phase: 'flowering' }, status: { stress: 18 } },
    { finalize: false, endReason: 'death' }
  );
  assert.strictEqual(floweringGoal.status, 'completed', 'goal should complete once flowering is reached');
  assert.ok(floweringGoal.progressText.length > 0, 'goal should expose readable progress');
})();

(function testFragileBuildGoalsStayConservativeEarly() {
  const profile = progression.getDefaultProfile();
  profile.totalXp = 150;
  profile.level = progression.getLevelForXp(profile.totalXp);
  const fragileRun = {
    id: 1,
    status: 'active',
    setupSnapshot: { mode: 'indoor', light: 'high', medium: 'soil', potSize: 'small', genetics: 'sativa' }
  };
  const safeRun = {
    id: 1,
    status: 'active',
    setupSnapshot: { mode: 'indoor', light: 'medium', medium: 'soil', potSize: 'small', genetics: 'indica' }
  };

  const fragileGoals = new Set();
  const safeGoals = new Set();
  for (let runId = 1; runId <= 8; runId += 1) {
    fragileRun.id = runId;
    safeRun.id = runId;
    fragileGoals.add(progression.chooseRunGoal(profile, fragileRun).id);
    safeGoals.add(progression.chooseRunGoal(profile, safeRun).id);
  }

  assert.deepStrictEqual(
    [...fragileGoals].sort(),
    ['clean_finish', 'reach_flowering', 'survive_day_20'],
    'fragile early builds should rotate through conservative goals only'
  );
  assert.ok(safeGoals.has('stable_grow'), 'safer builds can still receive the harder stability goal early');
})();

(function testBuildPresentationAndSetupTradeoffs() {
  const safeBuild = progression.getRunBuildPresentation({
    mode: 'indoor',
    light: 'medium',
    medium: 'soil',
    genetics: 'indica'
  });
  const fastBuild = progression.getRunBuildPresentation({
    mode: 'indoor',
    light: 'medium',
    medium: 'soil',
    genetics: 'sativa'
  });
  const riskyBuild = progression.getRunBuildPresentation({
    mode: 'indoor',
    light: 'high',
    medium: 'coco',
    genetics: 'hybrid'
  });

  assert.strictEqual(safeBuild.tag, 'Sicher', 'indica should resolve into a safe build archetype');
  assert.strictEqual(fastBuild.tag, 'Schnell', 'sativa should resolve into a fast build archetype');
  assert.strictEqual(riskyBuild.tag, 'Riskant', 'high output light should resolve into a risky build archetype');
  assert.notStrictEqual(safeBuild.title, fastBuild.title, 'different strategic starts should not collapse into the same identity');
})();

(function testFinalizeRunGrantsXpAndUnlocksOnce() {
  const state = {
    profile: progression.getDefaultProfile(),
    run: {
      id: 3,
      status: 'downed',
      endReason: null,
      startedAtRealMs: 10,
      endedAtRealMs: null,
      finalizedAtRealMs: null,
      setupSnapshot: { mode: 'indoor', light: 'medium', medium: 'soil', potSize: 'small', genetics: 'hybrid' },
      goal: { id: 'reach_flowering' }
    },
    simulation: { simDay: 24 },
    plant: {
      stageIndex: 5,
      stageKey: 'stage_06',
      phase: 'vegetative',
      lifecycle: { qualityScore: 78 }
    },
    status: { health: 72, stress: 24, risk: 18 },
    history: {
      actions: [{ id: 'water' }, { id: 'feed' }],
      events: [{ id: 'heat_warning' }]
    },
    meta: {
      rescue: {
        used: true
      }
    },
    setup: { mode: 'indoor', light: 'medium', medium: 'soil', potSize: 'small', genetics: 'hybrid' }
  };

  const finalized = progression.finalizeRunState(state, 'death', 1234);
  assert.strictEqual(finalized.finalized, true, 'first finalization should succeed');
  assert.strictEqual(state.run.status, 'ended', 'run should switch to ended');
  assert.ok(state.profile.totalXp > 0, 'run should grant XP');
  assert.ok(state.profile.lastRunSummary, 'summary should be stored on the profile');
  assert.strictEqual(state.profile.lastRunSummary.endReason, 'death', 'summary should record death reason');
  assert.ok(state.profile.lastRunSummary.rating && state.profile.lastRunSummary.rating.title, 'summary should contain a readable rating');
  assert.ok(Array.isArray(state.profile.lastRunSummary.highlights) && state.profile.lastRunSummary.highlights.length >= 1, 'summary should contain highlights');
  assert.ok(Array.isArray(state.profile.lastRunSummary.mistakes) && state.profile.lastRunSummary.mistakes.length >= 1, 'bad run should explain mistakes');
  assert.ok(state.profile.lastRunSummary.goal, 'summary should include mission-light goal state');
  assert.strictEqual(state.profile.lastRunSummary.goal.status, 'failed', 'unfinished goal should fail on death finalization');
  assert.strictEqual(state.profile.lastRunSummary.xpBreakdown.goal, 0, 'failed goal should not grant bonus xp');
  assert.ok(state.profile.lastRunSummary.build && state.profile.lastRunSummary.build.title, 'summary should include the chosen run build');

  const xpAfterFirst = state.profile.totalXp;
  const finalizedAgain = progression.finalizeRunState(state, 'death', 9999);
  assert.strictEqual(finalizedAgain.alreadyFinalized, true, 'second finalization should be ignored');
  assert.strictEqual(state.profile.totalXp, xpAfterFirst, 'xp must not be granted twice');
})();

(function testUnlockProgressionAcrossThresholds() {
  const state = {
    profile: progression.getDefaultProfile(),
    run: {
      id: 4,
      status: 'active',
      endReason: null,
      startedAtRealMs: 20,
      endedAtRealMs: null,
      finalizedAtRealMs: null,
      setupSnapshot: { mode: 'indoor', light: 'high', medium: 'soil', potSize: 'large', genetics: 'hybrid' },
      goal: { id: 'reach_harvest' }
    },
    simulation: { simDay: 84 },
    plant: {
      stageIndex: 11,
      stageKey: 'stage_12',
      phase: 'harvest',
      lifecycle: { qualityScore: 92 }
    },
    status: { health: 94, stress: 8, risk: 4 },
    history: { actions: new Array(9).fill({ id: 'care' }), events: new Array(5).fill({ id: 'event' }) },
    meta: { rescue: { used: false } },
    setup: { mode: 'indoor', light: 'high', medium: 'soil', potSize: 'large', genetics: 'hybrid' }
  };

  state.profile.totalXp = 340;
  state.profile.level = progression.getLevelForXp(state.profile.totalXp);
  const result = progression.finalizeRunState(state, 'harvest', 5000);

  assert.strictEqual(result.summary.endReason, 'harvest', 'harvest summary should be recorded');
  assert.ok(result.summary.awardedXp >= 150, 'harvest run should grant a meaningful xp reward');
  assert.ok(state.profile.level >= 4, 'harvest should level the player up');
  assert.ok(state.profile.unlocks.media.includes('coco'), 'level 4 unlock should be granted');
  assert.ok(Array.isArray(result.summary.unlockedThisRun) && result.summary.unlockedThisRun.length >= 1, 'summary should list new unlocks');
  assert.ok(result.summary.rating && /Starker|Nahezu/.test(result.summary.rating.title), 'good harvest should receive a strong rating');
  assert.ok(Array.isArray(result.summary.positives) && result.summary.positives.length >= 1, 'good run should contain positive feedback');
  assert.ok(Array.isArray(result.summary.xpNotices) && result.summary.xpNotices.length >= 1, 'summary should include xp notices');
  assert.strictEqual(result.summary.goal.status, 'completed', 'harvest goal should complete');
  assert.ok(result.summary.xpBreakdown.goal > 0, 'completed goal should grant bonus xp');
  assert.ok(
    result.summary.highlights.some((entry) => /High Output|Fast Genetics|Hardy Genetics/.test(String(entry.text || '')))
    || result.summary.positives.some((entry) => /High Output|Fast Genetics|Hardy Genetics/.test(String(entry.text || '')))
    || result.summary.mistakes.some((entry) => /High Output|Fast Genetics|Hardy Genetics/.test(String(entry.text || ''))),
    'summary feedback should reference the chosen strategic setup when relevant'
  );
})();

(function testHarvestGuard() {
  const state = {
    run: {
      id: 5,
      status: 'active',
      finalizedAtRealMs: null
    },
    plant: {
      phase: 'harvest',
      stageIndex: 11,
      stageKey: 'stage_12'
    }
  };
  assert.strictEqual(progression.shouldAutoFinalizeHarvest(state), true, 'harvest-ready active run should finalize');
  state.run.finalizedAtRealMs = 100;
  assert.strictEqual(progression.shouldAutoFinalizeHarvest(state), false, 'finalized run must not auto-finalize again');
})();

(function testCleanFinishCannotCompleteOnDeath() {
  const state = {
    profile: progression.getDefaultProfile(),
    run: {
      id: 6,
      status: 'downed',
      endReason: null,
      startedAtRealMs: 30,
      endedAtRealMs: null,
      finalizedAtRealMs: null,
      setupSnapshot: { mode: 'indoor', light: 'medium', medium: 'soil', potSize: 'medium', genetics: 'hybrid' },
      goal: { id: 'clean_finish' }
    },
    simulation: { simDay: 26 },
    plant: {
      stageIndex: 5,
      stageKey: 'stage_06',
      phase: 'vegetative',
      lifecycle: { qualityScore: 88 }
    },
    status: { health: 0, stress: 66, risk: 54 },
    history: { actions: [{ id: 'water' }], events: [] },
    meta: { rescue: { used: false } },
    setup: { mode: 'indoor', light: 'medium', medium: 'soil', potSize: 'medium', genetics: 'hybrid' }
  };

  const result = progression.finalizeRunState(state, 'death', 6200);
  assert.strictEqual(result.summary.goal.status, 'failed', 'clean finish must fail on death runs');
  assert.strictEqual(result.summary.xpBreakdown.goal, 0, 'failed clean finish must not grant goal xp');
})();

(function testDeathXpIsLowerForWeakFailRuns() {
  const weakDeathXp = progression.computeXpBreakdown({
    endReason: 'death',
    simDay: 9,
    stageIndex: 2,
    qualityScore: 60,
    goal: { status: 'failed', rewardXp: 45 }
  });
  const cleanHarvestXp = progression.computeXpBreakdown({
    endReason: 'harvest',
    simDay: 84,
    stageIndex: 11,
    qualityScore: 88,
    goal: { status: 'completed', rewardXp: 90 }
  });

  assert.strictEqual(weakDeathXp.base, 24, 'death runs should grant reduced base xp');
  assert.strictEqual(weakDeathXp.outcome, 0, 'death runs should no longer receive outcome xp');
  assert.ok(weakDeathXp.total < 130, 'weak death runs should land below the old fail-run xp band');
  assert.ok(cleanHarvestXp.total > weakDeathXp.total, 'successful harvests must stay clearly ahead of death runs');
})();

(function testSummaryInsightsForBadAndGoodRuns() {
  const badInsights = progression.buildSummaryInsights({
    endReason: 'death',
    simDay: 12,
    stageIndex: 2,
    qualityScore: 34,
    finalHealth: 18,
    finalStress: 84,
    finalRisk: 79,
    finalWater: 22,
    finalNutrition: 28,
    eventsCount: 1,
    rescueUsed: false,
    xpBreakdown: { base: 40, outcome: 20 }
  });
  assert.strictEqual(badInsights.rating.title, 'Instabiler Grow', 'weak run should receive an unstable rating');
  assert.ok(badInsights.highlights.length >= 1, 'weak run should still expose highlights');
  assert.ok(badInsights.mistakes.length >= 1, 'weak run should list mistakes');

  const goodInsights = progression.buildSummaryInsights({
    endReason: 'harvest',
    simDay: 84,
    stageIndex: 11,
    qualityScore: 91,
    finalHealth: 88,
    finalStress: 14,
    finalRisk: 12,
    finalWater: 60,
    finalNutrition: 58,
    eventsCount: 5,
    rescueUsed: false,
    xpBreakdown: { base: 40, survival: 80, stage: 132, quality: 15, outcome: 90 }
  });
  assert.ok(goodInsights.positives.length >= 1, 'good run should list positives');
  assert.ok(/Starker Durchgang|Nahezu perfekt/.test(goodInsights.rating.title), 'good run should receive a strong rating');
})();

console.log('progression-logic tests passed');
