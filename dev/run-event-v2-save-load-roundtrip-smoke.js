#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  EVENT_V2_SAVE_SCHEMA_VERSION,
  validateEventV2SaveShape,
} = require('../src/events/v2/preview/EventV2SaveShapePreview.js');
const {
  createEventV2RoundtripFixture,
  serializeEventV2PreviewShape,
  deserializeEventV2PreviewShape,
  validateEventV2Roundtrip,
  runEventV2SaveLoadRoundtripPreview,
} = require('../src/events/v2/preview/EventV2SaveLoadRoundtripPreview.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertNoWrite(result) {
  assert.strictEqual(result.wouldWrite, false, 'wouldWrite must stay false');
  assert.strictEqual(result.usedProductiveStorage, false, 'usedProductiveStorage must stay false');
}

function runValidFixtureRoundtrip() {
  const fixture = createEventV2RoundtripFixture();
  const fixtureBefore = clone(fixture);

  const fixtureValidation = validateEventV2SaveShape(fixture);
  assert.strictEqual(fixtureValidation.ok, true, 'fixture should pass save-shape validation');

  const serializeResult = serializeEventV2PreviewShape(fixture);
  assert.strictEqual(serializeResult.ok, true, 'fixture should serialize');
  assert.strictEqual(typeof serializeResult.serialized, 'string', 'serialized should be string');

  const deserializeResult = deserializeEventV2PreviewShape(serializeResult.serialized);
  assert.strictEqual(deserializeResult.ok, true, 'serialized fixture should deserialize');
  assert.strictEqual(deserializeResult.shape.schemaVersion, EVENT_V2_SAVE_SCHEMA_VERSION, 'schemaVersion should survive roundtrip');
  assert.strictEqual(deserializeResult.shape.mode, 'dry-run', 'mode should survive roundtrip');

  const roundtripResult = validateEventV2Roundtrip(fixture, deserializeResult.shape);
  assert.strictEqual(roundtripResult.ok, true, 'roundtrip validation should pass');

  assert.strictEqual(deserializeResult.shape.openEvents[0].eventId, fixture.openEvents[0].eventId, 'openEvents eventId should survive');
  assert.strictEqual(deserializeResult.shape.openEvents[0].instanceId, fixture.openEvents[0].instanceId, 'openEvents instanceId should survive');
  assert.strictEqual(deserializeResult.shape.history[0].eventId, fixture.history[0].eventId, 'history eventId should survive');
  assert.strictEqual(deserializeResult.shape.history[0].instanceId, fixture.history[0].instanceId, 'history instanceId should survive');

  assert.deepStrictEqual(fixture, fixtureBefore, 'fixture must not mutate');
  assertNoWrite(serializeResult);
  assertNoWrite(deserializeResult);
  assertNoWrite(roundtripResult);

  return {
    fixtureValidation,
    serializeResult,
    deserializeResult,
    roundtripResult,
  };
}

function runInvalidJson() {
  const result = deserializeEventV2PreviewShape('{ bad_json');
  assert.strictEqual(result.ok, false, 'invalid JSON should fail');
  assert(result.errors.includes('deserialize_invalid_json'), 'deserialize_invalid_json expected');
  assertNoWrite(result);
  return result;
}

function runInvalidSchemaVersion() {
  const fixture = createEventV2RoundtripFixture();
  const serialized = JSON.stringify({
    ...fixture,
    schemaVersion: 999,
  });
  const result = deserializeEventV2PreviewShape(serialized);

  assert.strictEqual(result.ok, false, 'unknown schema version should fail');
  assert(result.errors.includes('unknown_schema_version'), 'unknown_schema_version expected');
  assertNoWrite(result);
  return result;
}

function runHarnessResult() {
  const harness = runEventV2SaveLoadRoundtripPreview();
  assert.strictEqual(harness.ok, true, 'harness should pass on valid fixture');
  assert.strictEqual(harness.inputMutated, false, 'harness fixture input must not mutate');
  assertNoWrite(harness);
  assert.strictEqual(harness.before.openEvents[0].eventId, 'indoor_dry_rootball', 'fixture eventId expected');
  assert.strictEqual(harness.after.history[0].instanceId, 'evt_v2_test_indoor_dry_rootball_001', 'fixture history instance expected');
  return harness;
}

function main() {
  const valid = runValidFixtureRoundtrip();
  const invalidJson = runInvalidJson();
  const invalidSchema = runInvalidSchemaVersion();
  const harness = runHarnessResult();

  const report = {
    ok: true,
    mode: 'event_v2_save_load_roundtrip_smoke',
    summary: {
      fixtureCreated: true,
      fixtureValidationPassed: valid.fixtureValidation.ok,
      serialized: valid.serializeResult.ok,
      deserialized: valid.deserializeResult.ok,
      revalidatedAfterLoad: valid.roundtripResult.ok,
      openEventIdRetained: harness.after.openEvents[0].eventId === harness.before.openEvents[0].eventId,
      openEventInstanceRetained: harness.after.openEvents[0].instanceId === harness.before.openEvents[0].instanceId,
      historyEventIdRetained: harness.after.history[0].eventId === harness.before.history[0].eventId,
      historyInstanceRetained: harness.after.history[0].instanceId === harness.before.history[0].instanceId,
      schemaVersionRetained: harness.after.schemaVersion === harness.before.schemaVersion,
      modeRetained: harness.after.mode === harness.before.mode,
      invalidJsonRejected: invalidJson.ok === false,
      invalidSchemaRejected: invalidSchema.ok === false,
      inputMutated: harness.inputMutated,
      usedProductiveStorage: harness.usedProductiveStorage,
      wouldWrite: harness.wouldWrite,
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

