#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const ActivationRegistryApi = require('../src/events/v2/runtime/EventV2ActivationRegistry.js');
const PresentationMapApi = require('../src/events/v2/ui/EventV2PresentationMap.js');
const OutcomePolicyApi = require('../src/events/v2/runtime/EventV2OutcomePolicy.js');
const BridgeApi = require('../src/events/EventSystemRuntimeBridge.js');
const SeedDevToolsApi = require('../src/events/v2/dev/EventV2PilotSeedDevTools.js');

const SAMPLE_EVENT_IDS = Object.freeze([
  'indoor_heat_stress_air',
  'indoor_overwatering_early',
  'outdoor_heatwave_dry_wind',
  'shared_rootbound_warning',
  'shared_early_pest_signs_mild',
]);

function createState() {
  return {
    status: { stress: 20, risk: 20, water: 60 },
    events: { history: [] },
    eventV2: null,
  };
}

function main() {
  const activationValidation = ActivationRegistryApi.validateEventV2ActivationRegistry();
  assert.strictEqual(activationValidation.ok, true, 'activation registry must validate');
  const runtimeEnabledEvents = ActivationRegistryApi.getEventV2RuntimeEnabledEvents();
  assert.ok(runtimeEnabledEvents.length >= 2, 'runtime-enabled list should not be empty');

  const perEventChecks = [];
  let safeDefaultNoDeltaCount = 0;
  let mutatingCases = 0;

  for (const eventId of runtimeEnabledEvents) {
    const entry = ActivationRegistryApi.getEventV2ActivationEntry(eventId);
    assert.ok(entry, `activation entry missing for ${eventId}`);
    assert.ok(Array.isArray(entry.optionIds) && entry.optionIds.length > 0, `options missing for ${eventId}`);

    const presentation = PresentationMapApi.getEventV2Presentation(eventId);
    const visual = PresentationMapApi.getEventV2VisualPresentation(eventId);
    assert.ok(presentation && presentation.title, `presentation title missing for ${eventId}`);
    assert.strictEqual(visual.type, 'image', `visual type must be image for ${eventId}`);
    assert.strictEqual(Boolean(visual.imagePath), true, `hero image path missing for ${eventId}`);
    assert.strictEqual(Boolean(visual.fallbackImagePath), true, `fallback image path missing for ${eventId}`);

    for (const optionId of entry.optionIds) {
      const policy = OutcomePolicyApi.getEventV2OutcomePolicy(eventId, optionId);
      assert.ok(policy, `policy missing for ${eventId}/${optionId}`);
      if (policy.mode === 'apply_delta') mutatingCases += 1;
      if (policy.mode === 'no_delta' && policy.reason === 'safe_default_review') safeDefaultNoDeltaCount += 1;
    }

    const seedState = createState();
    const seeded = SeedDevToolsApi.seedEventV2PilotEvent(seedState, eventId, { clearHistory: true });
    assert.strictEqual(seeded.ok, true, `generic seed failed for ${eventId}`);
    const seededOptionId = seedState.eventV2.openEvents[0].options[0];
    const resolveResult = BridgeApi.resolveEventCenterV2PilotEvent(seedState, seededOptionId, { now: Date.now() });
    assert.strictEqual(resolveResult.ok, true, `resolve failed for ${eventId}/${seededOptionId}`);
    assert.strictEqual(seedState.eventV2.openEvents.length, 0, `open events should be empty after resolve for ${eventId}`);
    assert.strictEqual(seedState.eventV2.history.length, 1, `history should contain one resolved item for ${eventId}`);

    perEventChecks.push({
      eventId,
      optionCount: entry.optionIds.length,
      firstOption: seededOptionId,
      resolvedReason: resolveResult.appliedDelta ? resolveResult.appliedDelta.reason : null,
      applied: Boolean(resolveResult.appliedDelta && resolveResult.appliedDelta.applied === true),
    });
  }

  for (const eventId of SAMPLE_EVENT_IDS) {
    assert.strictEqual(runtimeEnabledEvents.includes(eventId), true, `sample event not runtime-enabled: ${eventId}`);
  }

  const summary = {
    ok: true,
    mode: 'event_v2_bulk_activation_smoke',
    runtimeEnabledEventCount: runtimeEnabledEvents.length,
    runtimeEnabledEvents,
    sampleEventIds: SAMPLE_EVENT_IDS.slice(),
    safeDefaultNoDeltaCount,
    mutatingCases,
    onlyKnownMutatingCase: mutatingCases === 1,
    checks: perEventChecks,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
