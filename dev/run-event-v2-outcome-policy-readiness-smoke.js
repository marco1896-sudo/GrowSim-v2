#!/usr/bin/env node
'use strict';

const assert = require('assert');
const OutcomePolicy = require('../src/events/v2/runtime/EventV2OutcomePolicy.js');

function runSmoke() {
  assert.strictEqual(
    OutcomePolicy.isEventV2OutcomePolicyPrepared('indoor_dry_rootball'),
    true,
    'indoor_dry_rootball should be prepared'
  );
  assert.strictEqual(
    OutcomePolicy.isEventV2OutcomePolicyRuntimeEnabled('indoor_dry_rootball'),
    true,
    'indoor_dry_rootball should be runtime-enabled'
  );

  assert.strictEqual(
    OutcomePolicy.isEventV2OutcomePolicyPrepared('shared_panic_watering_misread'),
    true,
    'shared_panic_watering_misread should be prepared'
  );
  assert.strictEqual(
    OutcomePolicy.isEventV2OutcomePolicyRuntimeEnabled('shared_panic_watering_misread'),
    true,
    'shared_panic_watering_misread should be runtime-enabled'
  );

  const sharedOptionIds = [
    'check_weight_before_watering',
    'inspect_rootzone_then_wait',
    'water_on_panic_signal'
  ];
  const sharedPolicies = sharedOptionIds.map((optionId) => {
    const policy = OutcomePolicy.getEventV2OutcomePolicy('shared_panic_watering_misread', optionId);
    assert(policy, `${optionId} policy should exist`);
    assert(Array.isArray(policy.deltas), `${optionId} deltas should be array`);
    assert.strictEqual(policy.deltas.length, 0, `${optionId} should have no active deltas`);
    return { optionId, policy };
  });

  const panicPolicy = sharedPolicies.find((entry) => entry.optionId === 'water_on_panic_signal').policy;
  assert.strictEqual(panicPolicy.mode, 'guardrail_only', 'water_on_panic_signal should be guardrail_only');
  assert.strictEqual(panicPolicy.futureDeltasBlocked, true, 'water_on_panic_signal should block future deltas by default');

  const sharedResolve = OutcomePolicy.resolveEventV2OutcomePolicy(
    'shared_panic_watering_misread',
    'check_weight_before_watering'
  );
  assert.strictEqual(sharedResolve.ok, true, 'runtime-enabled shared event should resolve policy');
  assert.strictEqual(sharedResolve.policy.mode, 'no_delta', 'shared diagnostic path should stay no_delta');

  const unknownPrepared = OutcomePolicy.isEventV2OutcomePolicyPrepared('unknown_event');
  const unknownEnabled = OutcomePolicy.isEventV2OutcomePolicyRuntimeEnabled('unknown_event');
  const unknownResolve = OutcomePolicy.resolveEventV2OutcomePolicy('unknown_event', 'whatever');
  assert.strictEqual(unknownPrepared, false, 'unknown event should not be prepared');
  assert.strictEqual(unknownEnabled, false, 'unknown event should not be runtime-enabled');
  assert.strictEqual(unknownResolve.ok, false, 'unknown event should be blocked');
  assert.strictEqual(unknownResolve.reason, 'policy_not_found', 'unknown event should report policy_not_found');

  const summary = {
    ok: true,
    mode: 'event_v2_outcome_policy_readiness_smoke',
    preparedEvents: Object.keys(OutcomePolicy.OUTCOME_POLICY_MAP || {}),
    runtimeEnabledEvents: Array.isArray(OutcomePolicy.RUNTIME_ENABLED_EVENTS) ? OutcomePolicy.RUNTIME_ENABLED_EVENTS.slice() : [],
    sharedPolicy: {
      prepared: true,
      runtimeEnabled: true,
      optionPolicies: sharedPolicies.map((entry) => ({
        optionId: entry.optionId,
        mode: entry.policy.mode,
        reason: entry.policy.reason,
        deltaCount: entry.policy.deltas.length
      }))
    },
    unknownEventBlocked: true
  };

  console.log(JSON.stringify(summary, null, 2));
}

runSmoke();
