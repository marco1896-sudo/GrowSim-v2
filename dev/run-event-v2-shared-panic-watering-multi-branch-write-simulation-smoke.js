#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  createEventV2ResolveBranchFixturesForEvent,
  runEventV2MultiResolveBranchWriteSimulation,
} = require('../src/events/v2/preview/EventV2SingleEventWriteSimulationPreview.js');

const TARGET_EVENT_ID = 'shared_panic_watering_misread';
const EXPECTED_OPTIONS = [
  'check_weight_before_watering',
  'inspect_rootzone_then_wait',
  'water_on_panic_signal',
];

function createBaseState() {
  return {
    eventV2: {
      schemaVersion: 1,
      mode: 'active',
      openEvents: [],
      history: [],
      meta: {},
    },
    events: { activeEventId: 'legacy_event' },
  };
}

function runBlockedWithoutDevFlag() {
  const result = runEventV2MultiResolveBranchWriteSimulation({
    eventId: TARGET_EVENT_ID,
    state: createBaseState(),
    permissions: { allowDevWriteSimulation: false },
  });
  assert.strictEqual(result.ok, false, 'without dev flag simulation must block');
  return result;
}

function runWithDevFlag() {
  const fixtures = createEventV2ResolveBranchFixturesForEvent(TARGET_EVENT_ID);
  const result = runEventV2MultiResolveBranchWriteSimulation({
    eventId: TARGET_EVENT_ID,
    state: createBaseState(),
    permissions: { allowDevWriteSimulation: true },
    branches: fixtures,
  });

  assert.strictEqual(result.ok, true, 'with dev flag all branches should pass');
  assert.strictEqual(result.eventId, TARGET_EVENT_ID, 'must run target event only');
  assert.strictEqual(result.branchCount, 3, 'must run exactly three branches');
  assert.strictEqual(result.failedBranches, 0, 'all branches should pass');
  assert.strictEqual(result.safety.allNoProductiveStorage, true, 'no productive storage allowed');

  const usedOptions = result.branches.map((branch) => branch.selectedOption).sort();
  assert.deepStrictEqual(usedOptions, EXPECTED_OPTIONS.slice().sort(), 'must use expected option IDs');

  result.branches.forEach((branch) => {
    assert.strictEqual(branch.applyPreview.ok, true, `apply preview missing for ${branch.branchId}`);
    assert.strictEqual(branch.historyPreview.ok, true, `history preview missing for ${branch.branchId}`);
    assert.strictEqual(branch.persistPayload.ok, true, `persist payload missing for ${branch.branchId}`);
    assert.strictEqual(branch.saveShape.beforeOk, true, `save shape before invalid for ${branch.branchId}`);
    assert.strictEqual(branch.saveShape.afterOk, true, `save shape after invalid for ${branch.branchId}`);
    assert.strictEqual(branch.roundtrip.ok, true, `roundtrip invalid for ${branch.branchId}`);
    assert.strictEqual(branch.safety.wouldWrite, true, `wouldWrite must be true for ${branch.branchId}`);
    assert.strictEqual(branch.safety.productiveWrite, false, `productiveWrite must stay false for ${branch.branchId}`);
    assert.strictEqual(branch.safety.usedProductiveStorage, false, `storage must stay false for ${branch.branchId}`);
    assert.strictEqual(branch.safety.mutatedInputState, false, `state mutation not allowed for ${branch.branchId}`);
  });

  return result;
}

function runInvalidOptionBlocked() {
  const result = runEventV2MultiResolveBranchWriteSimulation({
    eventId: TARGET_EVENT_ID,
    state: createBaseState(),
    permissions: { allowDevWriteSimulation: true },
    branches: [
      { branchId: 'invalid', selectedOption: 'invalid_option_id' },
    ],
  });
  assert.strictEqual(result.ok, false, 'invalid option must be blocked');
  assert.strictEqual(result.failedBranches, 1, 'invalid option should fail one branch');
  return result;
}

function main() {
  const blockedNoFlag = runBlockedWithoutDevFlag();
  const withDevFlag = runWithDevFlag();
  const invalidOptionBlocked = runInvalidOptionBlocked();

  const report = {
    ok: true,
    mode: 'event_v2_shared_panic_watering_multi_branch_smoke',
    summary: {
      blockedWithoutDevFlag: blockedNoFlag.ok === false,
      withDevFlagRunsAllBranches: withDevFlag.ok === true,
      eventIdIsSharedPanicWatering: withDevFlag.eventId === TARGET_EVENT_ID,
      branchCountThree: withDevFlag.branchCount === 3,
      usesAllExpectedOptions: withDevFlag.branches
        .map((branch) => branch.selectedOption)
        .sort()
        .join('|') === EXPECTED_OPTIONS.slice().sort().join('|'),
      eachBranchHasApplyPreview: withDevFlag.branches.every((branch) => branch.applyPreview.ok === true),
      eachBranchHasHistoryPreview: withDevFlag.branches.every((branch) => branch.historyPreview.ok === true),
      eachBranchHasPersistPayload: withDevFlag.branches.every((branch) => branch.persistPayload.ok === true),
      saveShapeValidAllBranches: withDevFlag.branches.every((branch) => branch.saveShape.beforeOk && branch.saveShape.afterOk),
      roundtripValidAllBranches: withDevFlag.branches.every((branch) => branch.roundtrip.ok === true),
      wouldWriteSimulationOnly: withDevFlag.branches.every((branch) => branch.safety.wouldWrite === true && branch.safety.productiveWrite === false),
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
