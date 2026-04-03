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
  vm.runInContext(helpers, context, { filename: 'care-action-identity-phase5-helpers.js' });
  context.actionsById = new Map((Array.isArray(actionsPayload.actions) ? actionsPayload.actions : []).map((action) => [action.id, action]));
  return context;
}

(function testWateringIdentityHasSafeStandardAndTacticalProfiles() {
  const ctx = loadCareHelpers();
  ctx.state.status = { water: 30, nutrition: 72, health: 72, stress: 28, risk: 24, growth: 0 };
  ctx.state.plant.stageIndex = 6;

  const light = ctx.actionsById.get('watering_low_mist');
  const deep = ctx.actionsById.get('watering_medium_deep');
  const flush = ctx.actionsById.get('watering_high_flush');

  const lightProfile = ctx.buildActionExecutionProfile(light, ctx.getActionAvailability(light));
  const deepProfile = ctx.buildActionExecutionProfile(deep, ctx.getActionAvailability(deep));
  const flushProfile = ctx.buildActionExecutionProfile(flush, ctx.getActionAvailability(flush));

  assert.ok(lightProfile.benefitMultiplier < deepProfile.benefitMultiplier, 'low watering should be gentler than the standard deep watering');
  assert.ok(lightProfile.costMultiplier < deepProfile.costMultiplier, 'low watering should stay safer than medium deep watering');
  assert.ok(flushProfile.costMultiplier > deepProfile.costMultiplier, 'flush should be more expensive/risky than standard watering');
  assert.ok(flushProfile.sideEffectChanceMultiplier > deepProfile.sideEffectChanceMultiplier, 'flush should carry the clearest side-effect pressure');
})();

(function testFertilizingIdentitySeparatesRecoveryStandardAndPush() {
  const ctx = loadCareHelpers();
  ctx.state.status = { water: 64, nutrition: 40, health: 82, stress: 16, risk: 14, growth: 0 };
  ctx.state.plant.stageIndex = 6;

  const micro = ctx.actionsById.get('fertilizing_low_microfeed');
  const balanced = ctx.actionsById.get('fertilizing_medium_balanced');
  const boost = ctx.actionsById.get('fertilizing_high_boost');

  const microScaled = ctx.scaleActionEffectsObject(micro.effects.immediate, ctx.buildActionExecutionProfile(micro, ctx.getActionAvailability(micro)));
  const balancedScaled = ctx.scaleActionEffectsObject(balanced.effects.immediate, ctx.buildActionExecutionProfile(balanced, ctx.getActionAvailability(balanced)));
  const boostScaled = ctx.scaleActionEffectsObject(boost.effects.immediate, ctx.buildActionExecutionProfile(boost, ctx.getActionAvailability(boost)));

  assert.ok(Number(microScaled.nutrition) < Number(balancedScaled.nutrition), 'low microfeed should stay smaller than the standard balanced feed');
  assert.ok(Number(microScaled.risk) <= Number(balancedScaled.risk), 'low microfeed should stay safer than the balanced feed');
  assert.ok(Number(boostScaled.nutrition) > Number(balancedScaled.nutrition), 'high boost should push nutrition harder than the balanced feed');
  assert.ok(Number(boostScaled.risk) > Number(balancedScaled.risk), 'high boost should carry more immediate downside than the balanced feed');
})();

(function testCalMagActsAsRecoveryToolNotGenericMainFeed() {
  const ctx = loadCareHelpers();
  ctx.state.status = { water: 46, nutrition: 54, health: 56, stress: 56, risk: 58, growth: 0 };
  ctx.state.plant.stageIndex = 4;

  const calmag = ctx.actionsById.get('fertilizing_medium_calmag');
  const balanced = ctx.actionsById.get('fertilizing_medium_balanced');

  const calmagScaled = ctx.scaleActionEffectsObject(calmag.effects.immediate, ctx.buildActionExecutionProfile(calmag, ctx.getActionAvailability(calmag)));
  const balancedScaled = ctx.scaleActionEffectsObject(balanced.effects.immediate, ctx.buildActionExecutionProfile(balanced, ctx.getActionAvailability(balanced)));

  assert.ok(Number(calmagScaled.health) > Number(balancedScaled.health), 'CalMag should stabilize health more strongly than the generic balanced feed');
  assert.ok(Number(calmagScaled.stress) < Number(balancedScaled.stress), 'CalMag should function as a clearer stress-recovery tool than the generic balanced feed');
  assert.ok(Number(calmagScaled.nutrition) < Number(balancedScaled.nutrition), 'CalMag should not replace the main-feed role of balanced feeding');
})();

(function testEnvironmentIdentitySeparatesSafeRoutineAndAggressiveOptimization() {
  const ctx = loadCareHelpers();
  ctx.state.status = { water: 68, nutrition: 68, health: 86, stress: 14, risk: 12, growth: 0 };
  ctx.state.plant.stageIndex = 6;

  const airflow = ctx.actionsById.get('environment_low_airflow');
  const climate = ctx.actionsById.get('environment_medium_climate');
  const co2 = ctx.actionsById.get('environment_high_co2');

  const airflowProfile = ctx.buildActionExecutionProfile(airflow, ctx.getActionAvailability(airflow));
  const climateProfile = ctx.buildActionExecutionProfile(climate, ctx.getActionAvailability(climate));
  const co2Scaled = ctx.scaleActionEffectsObject(co2.effects.immediate, ctx.buildActionExecutionProfile(co2, ctx.getActionAvailability(co2)));
  const climateScaled = ctx.scaleActionEffectsObject(climate.effects.immediate, climateProfile);

  assert.ok(airflowProfile.costMultiplier < climateProfile.costMultiplier, 'low airflow should remain the safer small correction');
  assert.ok(Number(co2Scaled.growth) > Number(climateScaled.growth), 'high CO2 should be the strongest optimization push');
  assert.ok(Number(co2.effects.overTime.waterPerHour) < Number(climate.effects.overTime.waterPerHour || 0), 'high CO2 should consume clearly more water than routine climate care');
})();

console.log('care action identity phase 5 tests passed');
