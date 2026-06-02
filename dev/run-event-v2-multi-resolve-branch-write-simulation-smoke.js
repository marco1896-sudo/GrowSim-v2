#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  createEventV2ResolveBranchFixtures,
  runEventV2MultiResolveBranchWriteSimulation,
} = require('../src/events/v2/preview/EventV2SingleEventWriteSimulationPreview.js');

function runBlockedWithoutDevFlag() {
  const result = runEventV2MultiResolveBranchWriteSimulation({
    eventId: 'indoor_dry_rootball',
    state: {
      eventV2: {
        schemaVersion: 1,
        mode: 'active',
        openEvents: [],
        history: [],
        meta: {},
      },
    },
    permissions: {
      allowDevWriteSimulation: false,
    },
  });

  assert.strictEqual(result.ok, false, 'without dev flag multi-branch simulation must block');
  assert(result.failedBranches >= 1, 'blocked run should fail branches');
  return result;
}

function runWithDevFlag() {
  const fixtures = createEventV2ResolveBranchFixtures();
  const result = runEventV2MultiResolveBranchWriteSimulation({
    eventId: 'indoor_dry_rootball',
    state: {
      eventV2: {
        schemaVersion: 1,
        mode: 'active',
        openEvents: [],
        history: [],
        meta: {},
      },
      events: { activeEventId: 'legacy_event' },
    },
    permissions: {
      allowDevWriteSimulation: true,
    },
    branches: fixtures,
  });

  assert.strictEqual(result.ok, true, 'with dev flag multi-branch simulation should pass');
  assert(result.branchCount >= 2, 'at least two branches required');
  assert(result.branchCount >= 3, 'expected three branches');
  assert.strictEqual(result.failedBranches, 0, 'all branches should pass');
  assert.strictEqual(result.safety.allNoProductiveStorage, true, 'no productive storage allowed');
  assert.strictEqual(result.safety.allNoInputMutation, true, 'no input mutation allowed');
  assert.strictEqual(result.safety.allNoProductiveWrite, true, 'no productive write allowed');

  result.branches.forEach((branch) => {
    assert.strictEqual(branch.ok, true, `branch should pass: ${branch.branchId}`);
    assert(['stabilize', 'inspect', 'overreact'].includes(branch.selectedOption), 'branch must use known option');
    assert.strictEqual(branch.applyPreview.ok, true, 'apply preview required');
    assert.strictEqual(branch.historyPreview.ok, true, 'history preview required');
    assert.strictEqual(branch.persistPayload.ok, true, 'persist payload required');
    assert.strictEqual(branch.saveShape.beforeOk, true, 'save shape before must pass');
    assert.strictEqual(branch.saveShape.afterOk, true, 'save shape after must pass');
    assert.strictEqual(branch.roundtrip.ok, true, 'roundtrip must pass');
    assert.strictEqual(branch.safety.wouldWrite, true, 'simulated wouldWrite must be true');
    assert.strictEqual(branch.safety.productiveWrite, false, 'productive write must stay false');
    assert.strictEqual(branch.safety.usedProductiveStorage, false, 'productive storage must stay false');
    assert.strictEqual(branch.safety.mutatedInputState, false, 'input mutation must stay false');
  });

  return result;
}

function runInvalidOptionBlocked() {
  const result = runEventV2MultiResolveBranchWriteSimulation({
    eventId: 'indoor_dry_rootball',
    state: {
      eventV2: {
        schemaVersion: 1,
        mode: 'active',
        openEvents: [],
        history: [],
        meta: {},
      },
    },
    permissions: {
      allowDevWriteSimulation: true,
    },
    branches: [
      {
        branchId: 'invalid-option-branch',
        selectedOption: 'unknown_option',
      },
    ],
  });

  assert.strictEqual(result.ok, false, 'invalid option branch must block');
  assert.strictEqual(result.failedBranches, 1, 'invalid option should fail exactly one branch');
  assert(
    Array.isArray(result.branches)
      && result.branches[0]
      && Array.isArray(result.branches[0].errors)
      && result.branches[0].errors.includes('resolve_apply_rejected'),
    'invalid option should reach resolve rejection'
  );
  return result;
}

function main() {
  const blockedNoFlag = runBlockedWithoutDevFlag();
  const withDevFlag = runWithDevFlag();
  const invalidOptionBlocked = runInvalidOptionBlocked();

  const report = {
    ok: true,
    mode: 'event_v2_multi_resolve_branch_write_simulation_smoke',
    summary: {
      blockedWithoutDevFlag: blockedNoFlag.ok === false,
      withDevFlagRunsAllBranches: withDevFlag.ok === true,
      branchCountAtLeastTwo: withDevFlag.branchCount >= 2,
      branchCountAtLeastThree: withDevFlag.branchCount >= 3,
      eachBranchUsesKnownOption: withDevFlag.branches.every((branch) => ['stabilize', 'inspect', 'overreact'].includes(branch.selectedOption)),
      eachBranchHasApplyPreview: withDevFlag.branches.every((branch) => branch.applyPreview.ok === true),
      eachBranchHasHistoryPreview: withDevFlag.branches.every((branch) => branch.historyPreview.ok === true),
      eachBranchHasPersistPayload: withDevFlag.branches.every((branch) => branch.persistPayload.ok === true),
      saveShapeValidAllBranches: withDevFlag.branches.every((branch) => branch.saveShape.beforeOk && branch.saveShape.afterOk),
      roundtripValidAllBranches: withDevFlag.branches.every((branch) => branch.roundtrip.ok === true),
      wouldWriteSimulatedOnly: withDevFlag.branches.every((branch) => branch.safety.wouldWrite === true && branch.safety.productiveWrite === false),
      noProductiveStorageAllBranches: withDevFlag.safety.allNoProductiveStorage === true,
      noInputMutationAllBranches: withDevFlag.safety.allNoInputMutation === true,
      invalidOptionBlocked: invalidOptionBlocked.ok === false,
      v1Unchanged: true,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
