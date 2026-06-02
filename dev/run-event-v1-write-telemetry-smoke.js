#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');

const telemetryApi = require(path.resolve(__dirname, '..', 'src', 'events', 'legacy', 'EventV1WriteTelemetry.js'));

function cleanupGlobals() {
  delete globalThis.__GS_FORCE_EVENT_V1_WRITE_TELEMETRY;
  delete globalThis.__getEventV1WriteTelemetry;
  delete globalThis.__resetEventV1WriteTelemetry;
  delete globalThis.__GS_EVENT_V1_WRITE_TELEMETRY_STATE;
}

function run() {
  cleanupGlobals();

  const disabledCheck = telemetryApi.isEventV1WriteTelemetryEnabled({
    hostname: 'example.com',
    search: '',
    mode: 'prod'
  });
  assert.strictEqual(disabledCheck, false, 'telemetry must be disabled for non-dev context');

  const disabledInstall = telemetryApi.installEventV1WriteTelemetryDevHelpers(globalThis);
  assert.strictEqual(disabledInstall.enabled, false, 'dev helpers must not install in disabled context');
  assert.strictEqual(typeof globalThis.__getEventV1WriteTelemetry, 'undefined', 'disabled context must not expose __get helper');
  assert.strictEqual(typeof globalThis.__resetEventV1WriteTelemetry, 'undefined', 'disabled context must not expose __reset helper');

  globalThis.__GS_FORCE_EVENT_V1_WRITE_TELEMETRY = true;
  const enabledCheck = telemetryApi.isEventV1WriteTelemetryEnabled();
  assert.strictEqual(enabledCheck, true, 'telemetry must enable with force flag');

  telemetryApi.resetEventV1WriteTelemetry();
  const emptySnapshot = telemetryApi.getEventV1WriteTelemetrySnapshot();
  assert.strictEqual(emptySnapshot.ok, true);
  assert.strictEqual(emptySnapshot.snapshot.totals.all, 0, 'initial snapshot should be empty');

  telemetryApi.recordEventV1WriteHit('W1', { source: 'smoke:w1', eventId: 'ev_a', mode: 'smoke' });
  telemetryApi.recordEventV1WriteHit('W1', { source: 'smoke:w1', eventId: 'ev_a', mode: 'smoke' });
  telemetryApi.recordEventV1WriteHit('W2', { source: 'smoke:w2', eventId: 'ev_b', mode: 'smoke' });
  telemetryApi.recordEventV1WriteHit('W3', { source: 'smoke:w3', eventId: null, mode: 'smoke' });
  telemetryApi.recordEventV1WriteHit('unknown_type', { source: 'smoke:unknown', mode: 'smoke' });
  telemetryApi.recordEventV1WriteHit('W4', null);

  const snapshot = telemetryApi.getEventV1WriteTelemetrySnapshot();
  assert.strictEqual(snapshot.ok, true);
  assert.strictEqual(snapshot.enabled, true);
  assert.strictEqual(snapshot.snapshot.totals.all, 6, 'all hits should be counted');
  assert.strictEqual(snapshot.snapshot.totals.W1, 2, 'W1 hits should aggregate');
  assert.strictEqual(snapshot.snapshot.totals.W2, 1, 'W2 hit missing');
  assert.strictEqual(snapshot.snapshot.totals.W3, 1, 'W3 hit missing');
  assert.strictEqual(snapshot.snapshot.totals.W4, 1, 'W4 hit missing');
  assert.strictEqual(snapshot.snapshot.totals.UNKNOWN, 1, 'unknown type should be tracked defensively');

  const summary = telemetryApi.summarizeEventV1WriteTelemetry();
  assert.strictEqual(summary.ok, true);
  assert.strictEqual(summary.enabled, true);
  assert(Array.isArray(summary.trackedTypes) && summary.trackedTypes.length === 6, 'tracked types list should expose W1-W6');

  const jsonRoundtrip = JSON.parse(JSON.stringify(snapshot));
  assert.strictEqual(jsonRoundtrip.snapshot.totals.all, 6, 'snapshot must be JSON-compatible');

  telemetryApi.recordEventV1WriteHit('W5', { source: 'smoke:blocking_check' });
  assert.doesNotThrow(() => telemetryApi.recordEventV1WriteHit('W6', { source: 'smoke:no_throw' }), 'record should never throw');

  const afterReset = telemetryApi.resetEventV1WriteTelemetry();
  assert.strictEqual(afterReset.ok, true);
  const resetSnapshot = telemetryApi.getEventV1WriteTelemetrySnapshot();
  assert.strictEqual(resetSnapshot.snapshot.totals.all, 0, 'reset must clear counters');

  const enabledInstall = telemetryApi.installEventV1WriteTelemetryDevHelpers(globalThis);
  assert.strictEqual(enabledInstall.enabled, true, 'dev helpers must install in enabled context');
  assert.strictEqual(typeof globalThis.__getEventV1WriteTelemetry, 'function', '__get helper missing');
  assert.strictEqual(typeof globalThis.__resetEventV1WriteTelemetry, 'function', '__reset helper missing');

  cleanupGlobals();

  const result = {
    ok: true,
    mode: 'event_v1_write_telemetry_smoke',
    checks: {
      disabledContextGuarded: true,
      enabledContextRecordsHits: true,
      unknownTypeHandledDefensively: true,
      jsonCompatibleSnapshot: true,
      resetClearsState: true,
      noBlockingBehavior: true,
      devHelpersOnlyWhenEnabled: true
    }
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

run();

