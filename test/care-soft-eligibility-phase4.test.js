#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractFunction(source, functionName) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`Function not found: ${functionName}`);
  }
  const paramsEnd = source.indexOf(')', start);
  const braceStart = source.indexOf('{', paramsEnd);
  let depth = 0;
  let end = braceStart;
  for (; end < source.length; end += 1) {
    const char = source[end];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }
  return source.slice(start, end);
}

function loadCareHelpers() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const actionsPayload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'actions.json'), 'utf8'));
  const helpers = [
    'validateActionTrigger',
    'getActionSoftPolicy',
    'analyzeActionPrerequisites',
    'buildActionExecutionProfile',
    'scaleActionEffectsObject',
    'getActionAvailability'
  ].map((name) => extractFunction(appSource, name)).join('\n\n');

  const context = {
    console,
    Math,
    Number,
    String,
    Set,
    round2: (value) => Math.round((Number(value) || 0) * 100) / 100,
    clamp: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0)),
    state: {
      status: { water: 50, nutrition: 50, health: 70, stress: 20, risk: 20, growth: 0 },
      plant: { stageIndex: 3 },
      simulation: { isDaytime: true }
    }
  };

  vm.createContext(context);
  vm.runInContext(helpers, context, { filename: 'care-soft-helpers.js' });
  context.actionsById = new Map((Array.isArray(actionsPayload.actions) ? actionsPayload.actions : []).map((action) => [action.id, action]));
  return context;
}

(function testCriticalRunStillKeepsLowMediumFeedAvailable() {
  const ctx = loadCareHelpers();
  ctx.state.status = { water: 22, nutrition: 34, health: 18, stress: 74, risk: 78, growth: 0 };
  ctx.state.plant.stageIndex = 3;

  const microfeed = ctx.actionsById.get('fertilizing_low_microfeed');
  const balanced = ctx.actionsById.get('fertilizing_medium_balanced');

  const microAvailability = ctx.getActionAvailability(microfeed);
  const balancedAvailability = ctx.getActionAvailability(balanced);

  assert.strictEqual(microAvailability.ok, true, 'light recovery feed should stay available in a critical but salvageable run');
  assert.strictEqual(microAvailability.soft, true, 'light recovery feed should use soft eligibility in a critical state');
  assert.strictEqual(balancedAvailability.ok, true, 'medium balanced feed should remain a recovery attempt instead of a hard lockout');
  assert.strictEqual(balancedAvailability.soft, true, 'medium balanced feed should surface as soft-available under bad conditions');
})();

(function testAggressiveActionsRemainHarderToUse() {
  const ctx = loadCareHelpers();
  ctx.state.status = { water: 30, nutrition: 38, health: 22, stress: 70, risk: 76, growth: 0 };
  ctx.state.plant.stageIndex = 6;

  const boost = ctx.actionsById.get('fertilizing_high_boost');
  const co2 = ctx.actionsById.get('environment_high_co2');

  assert.strictEqual(ctx.getActionAvailability(boost).ok, false, 'high boost feed should still hard-block in a bad state');
  assert.strictEqual(ctx.getActionAvailability(co2).ok, false, 'high CO2 should still demand a near-perfect setup');
})();

(function testGoodStateGetsBetterFeedEfficiency() {
  const ctx = loadCareHelpers();
  const balanced = ctx.actionsById.get('fertilizing_medium_balanced');

  ctx.state.status = { water: 66, nutrition: 46, health: 84, stress: 18, risk: 12, growth: 0 };
  const goodProfile = ctx.buildActionExecutionProfile(balanced, ctx.getActionAvailability(balanced));

  ctx.state.status = { water: 24, nutrition: 74, health: 24, stress: 72, risk: 78, growth: 0 };
  const badAvailability = ctx.getActionAvailability(balanced);
  const badProfile = ctx.buildActionExecutionProfile(balanced, badAvailability);

  assert.ok(goodProfile.benefitMultiplier > badProfile.benefitMultiplier, 'good state should get better action efficiency');
  assert.ok(goodProfile.costMultiplier < badProfile.costMultiplier, 'bad state should pay more downside for the same feed');
  assert.ok(goodProfile.sideEffectChanceMultiplier < badProfile.sideEffectChanceMultiplier, 'bad state should increase side-effect pressure');
})();

(function testSoftAvailabilityDoesNotCreateFreeHealing() {
  const ctx = loadCareHelpers();
  const balanced = ctx.actionsById.get('fertilizing_medium_balanced');
  const baseEffects = balanced.effects.immediate;

  ctx.state.status = { water: 24, nutrition: 74, health: 24, stress: 72, risk: 78, growth: 0 };
  const softAvailability = ctx.getActionAvailability(balanced);
  const profile = ctx.buildActionExecutionProfile(balanced, softAvailability);
  const scaled = ctx.scaleActionEffectsObject(baseEffects, profile);

  assert.strictEqual(softAvailability.ok, true, 'balanced feed should be soft-available here');
  assert.ok(Number(scaled.nutrition) < Number(baseEffects.nutrition), 'soft recovery feed should add less nutrition than in a clean state');
  assert.ok(Number(scaled.risk) > Number(baseEffects.risk), 'soft recovery feed should carry higher risk than the base action');
})();

console.log('care soft eligibility phase 4 tests passed');
