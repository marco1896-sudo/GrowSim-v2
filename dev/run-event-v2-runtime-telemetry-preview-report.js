#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  runEventV2RuntimeTelemetryPreview,
} = require('../src/events/v2/preview/EventV2RuntimeTelemetryPreview.js');

function writeReportArtifacts(rootDir, report) {
  const planningDir = path.join(rootDir, 'data', 'events', 'catalog', '_planning');
  fs.mkdirSync(planningDir, { recursive: true });

  const jsonPath = path.join(planningDir, 'phase-next-v2-runtime-telemetry-preview-report.json');
  const mdPath = path.join(planningDir, 'phase-next-v2-runtime-telemetry-preview-report.md');

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const markdown = [
    '# Event V2 Runtime Telemetry Preview Report',
    '',
    `- ok: ${report.ok}`,
    `- status: ${report.status}`,
    `- readiness: ${report.readiness}`,
    `- eventId: ${report.eventId}`,
    `- gateMode: ${report.steps.writeGate.gateMode}`,
    `- authority: ${report.steps.writeGate.authority}`,
    `- wouldWrite: ${report.safety.wouldWrite}`,
    `- usedProductiveStorage: ${report.safety.usedProductiveStorage}`,
    `- mutatedInputState: ${report.safety.mutatedInputState}`,
    `- blockers: ${report.blockers.length}`,
    `- warnings: ${report.warnings.length}`,
    `- errors: ${report.errors.length}`,
    '',
  ].join('\n');
  fs.writeFileSync(mdPath, markdown, 'utf8');

  return {
    jsonPath,
    mdPath,
  };
}

function runHappyPath() {
  const report = runEventV2RuntimeTelemetryPreview({
    eventId: 'indoor_dry_rootball',
    selectedOption: 'stabilize',
    state: {
      eventV2: {
        schemaVersion: 1,
        mode: 'dry-run',
        openEvents: [],
        history: [],
        meta: {},
      },
    },
  });

  assert.strictEqual(report.reportType, 'event-v2-runtime-telemetry-preview');
  assert.strictEqual(report.steps.context.ok, true);
  assert.strictEqual(report.steps.prepareEvent.ok, true);
  assert.strictEqual(report.steps.saveShapeBefore.ok, true);
  assert.strictEqual(report.steps.writeGate.ok, true);
  assert.strictEqual(report.steps.writeGate.gateMode, 'v2-dry-run');
  assert.strictEqual(report.steps.resolveApply.ok, true);
  assert.strictEqual(report.steps.saveShapeAfter.ok, true);
  assert.strictEqual(report.steps.roundtrip.ok, true);
  assert.strictEqual(report.safety.wouldWrite, false);
  assert.strictEqual(report.safety.usedProductiveStorage, false);
  assert.strictEqual(report.safety.mutatedInputState, false);
  assert.notStrictEqual(report.readiness, 'blocked');
  assert.strictEqual(typeof JSON.stringify(report), 'string');
  return report;
}

function runBlockedMode() {
  const report = runEventV2RuntimeTelemetryPreview({
    eventId: 'indoor_dry_rootball',
    selectedOption: 'stabilize',
    state: {
      eventV2: {
        schemaVersion: 1,
        mode: 'dry-run',
        openEvents: [],
        history: [],
        meta: {},
      },
    },
    gateMode: 'invalid-mode',
  });

  assert.strictEqual(report.status, 'blocked');
  assert.strictEqual(report.readiness, 'blocked');
  assert.strictEqual(report.steps.writeGate.ok, false);
  assert(report.errors.length > 0, 'blocked report should contain errors');
  assert.strictEqual(report.safety.wouldWrite, false);
  assert.strictEqual(report.safety.usedProductiveStorage, false);
  assert.strictEqual(report.safety.mutatedInputState, false);
  return report;
}

function main() {
  const rootDir = process.cwd();
  const happy = runHappyPath();
  const blocked = runBlockedMode();
  const artifacts = writeReportArtifacts(rootDir, happy);

  const output = {
    ok: true,
    mode: 'event_v2_runtime_telemetry_preview_report',
    summary: {
      telemetryReportCreated: true,
      runtimeAdapterUsed: Boolean(happy.runtimeResult && happy.runtimeResult.mode === 'dev-only-runtime-preview'),
      allStepsPresent: Boolean(happy.steps && happy.steps.context && happy.steps.writeGate && happy.steps.roundtrip),
      gateStatusCaptured: happy.steps.writeGate.ok === true && happy.steps.writeGate.gateMode === 'v2-dry-run',
      resolveStatusCaptured: happy.steps.resolveApply.ok === true,
      saveShapeCaptured: happy.steps.saveShapeBefore.ok === true && happy.steps.saveShapeAfter.ok === true,
      roundtripCaptured: happy.steps.roundtrip.ok === true,
      safetyPresent: Boolean(happy.safety),
      wouldWriteFalse: happy.safety.wouldWrite === false,
      usedProductiveStorageFalse: happy.safety.usedProductiveStorage === false,
      mutatedInputStateFalse: happy.safety.mutatedInputState === false,
      readinessNotBlocked: happy.readiness !== 'blocked',
      invalidModeBlocked: blocked.readiness === 'blocked',
      jsonSerializable: typeof JSON.stringify(happy) === 'string',
    },
    artifacts,
  };

  console.log(JSON.stringify(output, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}

