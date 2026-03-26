#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const payload = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'actions.json'), 'utf8')
);

const actions = Array.isArray(payload.actions) ? payload.actions : [];
const byId = new Map(actions.map((action) => [action.id, action]));

(function testFertilizingActionsRemainDistinctAndReadable() {
  const lightFeed = byId.get('fertilizing_low_microfeed');
  const balancedFeed = byId.get('fertilizing_medium_balanced');
  const calmag = byId.get('fertilizing_medium_calmag');
  const boost = byId.get('fertilizing_high_boost');

  assert.ok(lightFeed && balancedFeed && calmag && boost, 'expected all redesigned fertilizing actions to exist');

  assert.ok(/Leichte F/i.test(lightFeed.label), 'light feed should read as a gentle feed');
  assert.ok(/Ausgewogene F/i.test(balancedFeed.label), 'balanced feed should read as the main feed');
  assert.ok(/CalMag/i.test(calmag.label), 'calmag should stay distinct as a supplement');
  assert.ok(/Boost|Starke F/i.test(boost.label), 'strong feed should read as the high-upside option');

  assert.ok(Number(lightFeed.effects.immediate.nutrition || 0) < Number(balancedFeed.effects.immediate.nutrition || 0), 'balanced feed should add more nutrition than light feed');
  assert.ok(Number(boost.effects.immediate.nutrition || 0) > Number(balancedFeed.effects.immediate.nutrition || 0), 'strong feed should add the most nutrition pressure');
  assert.ok(Number(calmag.effects.immediate.nutrition || 0) < Number(balancedFeed.effects.immediate.nutrition || 0), 'calmag should not behave like a full feed');

  assert.ok(Number(lightFeed.rootZoneInfluence.ecDelta || 0) > 0, 'light feed should gently raise EC direction');
  assert.ok(Number(balancedFeed.rootZoneInfluence.ecDelta || 0) > Number(lightFeed.rootZoneInfluence.ecDelta || 0), 'balanced feed should raise EC direction more than light feed');
  assert.ok(Number(boost.rootZoneInfluence.ecDelta || 0) > Number(balancedFeed.rootZoneInfluence.ecDelta || 0), 'strong feed should raise EC direction most strongly');
  assert.ok(Number(calmag.rootZoneInfluence.ecDelta || 0) < Number(balancedFeed.rootZoneInfluence.ecDelta || 0), 'calmag should have a smaller EC push than a full balanced feed');

  assert.strictEqual(Object.keys(calmag.climateInfluence || {}).length, 0, 'calmag should not fake climate effects');
  assert.strictEqual(Object.keys(lightFeed.climateInfluence || {}).length, 0, 'feeding actions should stay root-zone centric in this patch');
})();

console.log('care fertilizing regression tests passed');
