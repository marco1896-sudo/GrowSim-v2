#!/usr/bin/env node
'use strict';

const assert = require('assert');
const OutcomePolicy = require('../src/events/v2/runtime/EventV2OutcomePolicy.js');

function runSmoke() {
  const stabilize = OutcomePolicy.getEventV2OutcomePolicy('indoor_dry_rootball', 'stabilize');
  assert(stabilize, 'stabilize policy should exist');
  assert.strictEqual(stabilize.mode, 'apply_delta', 'stabilize mode should be apply_delta');
  assert.strictEqual(stabilize.reason, 'stabilizing_action', 'stabilize reason should match policy');
  assert(Array.isArray(stabilize.deltas), 'stabilize deltas should be array');
  assert.strictEqual(stabilize.deltas.length, 2, 'stabilize should define exactly two deltas');
  assert.strictEqual(stabilize.deltas.some((entry) => entry.path === 'status.stress' && Number(entry.value) === -1), true, 'stabilize should include stress -1');
  assert.strictEqual(stabilize.deltas.some((entry) => entry.path === 'status.risk' && Number(entry.value) === -1), true, 'stabilize should include risk -1');

  const inspect = OutcomePolicy.getEventV2OutcomePolicy('indoor_dry_rootball', 'inspect');
  assert(inspect, 'inspect policy should exist');
  assert.strictEqual(inspect.mode, 'no_delta', 'inspect mode should be no_delta');
  assert.strictEqual(inspect.reason, 'diagnostic_only', 'inspect reason should be diagnostic_only');
  assert.deepStrictEqual(inspect.deltas, [], 'inspect should not define active deltas');

  const overreact = OutcomePolicy.getEventV2OutcomePolicy('indoor_dry_rootball', 'overreact');
  assert(overreact, 'overreact policy should exist');
  assert.strictEqual(overreact.mode, 'guardrail_only', 'overreact mode should be guardrail_only');
  assert.strictEqual(overreact.reason, 'guardrail_only', 'overreact reason should be guardrail_only');
  assert.deepStrictEqual(overreact.deltas, [], 'overreact should not define active deltas');
  assert.strictEqual(overreact.futureDeltasBlocked, true, 'overreact should mark future deltas blocked');

  const unknown = OutcomePolicy.resolveEventV2OutcomePolicy('indoor_dry_rootball', 'unknown_option');
  assert.strictEqual(unknown.ok, false, 'unknown option should be blocked');
  assert.strictEqual(unknown.reason, 'policy_not_found', 'unknown option should report policy_not_found');

  const summary = {
    ok: true,
    mode: 'event_v2_outcome_policy_smoke',
    eventId: 'indoor_dry_rootball',
    policies: {
      stabilize: { mode: stabilize.mode, reason: stabilize.reason, deltaCount: stabilize.deltas.length },
      inspect: { mode: inspect.mode, reason: inspect.reason, deltaCount: inspect.deltas.length },
      overreact: { mode: overreact.mode, reason: overreact.reason, deltaCount: overreact.deltas.length, futureDeltasBlocked: overreact.futureDeltasBlocked }
    },
    unknownOptionBlocked: true
  };

  console.log(JSON.stringify(summary, null, 2));
}

runSmoke();

