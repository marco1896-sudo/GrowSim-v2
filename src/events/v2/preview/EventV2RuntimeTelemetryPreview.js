'use strict';

const fs = require('fs');
const path = require('path');
const {
  runEventV2RuntimeAdapterPreview,
  createEventV2RuntimePreviewContext,
  prepareEventV2RuntimePreviewEvent,
} = require('./EventV2RuntimeAdapterPreview.js');

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function createStep(ok, extra) {
  return {
    ok: Boolean(ok),
    ...(extra || {}),
  };
}

function collectList(values) {
  return Array.isArray(values) ? values.map((value) => String(value)) : [];
}

function summarizeEventV2RuntimeTelemetry(runtimeResultInput) {
  const runtimeResult = isPlainObject(runtimeResultInput) ? runtimeResultInput : {};
  const context = createEventV2RuntimePreviewContext(runtimeResult.contextInput || {});
  const prepared = prepareEventV2RuntimePreviewEvent(runtimeResult.contextInput || {});

  const gate = isPlainObject(runtimeResult.gate) ? runtimeResult.gate : {};
  const resolveApply = isPlainObject(runtimeResult.resolveApply) ? runtimeResult.resolveApply : {};
  const saveShape = isPlainObject(runtimeResult.saveShape) ? runtimeResult.saveShape : {};
  const roundtrip = isPlainObject(runtimeResult.roundtrip) ? runtimeResult.roundtrip : {};
  const resultValidation = isPlainObject(runtimeResult.resultValidation) ? runtimeResult.resultValidation : {};

  const steps = {
    context: createStep(Boolean(context && context.mode === 'dev-only-runtime-preview')),
    prepareEvent: createStep(Boolean(prepared && prepared.ok), {
      eventId: prepared.openEvent && prepared.openEvent.eventId ? String(prepared.openEvent.eventId) : null,
      instanceId: prepared.openEvent && prepared.openEvent.instanceId ? String(prepared.openEvent.instanceId) : null,
    }),
    saveShapeBefore: createStep(Boolean(saveShape.before && saveShape.before.ok)),
    writeGate: createStep(Boolean(gate.ok), {
      gateMode: gate.gateMode || null,
      authority: gate.authority || null,
      v2CanWrite: Boolean(gate.v2CanWrite),
      v2CanDryRun: Boolean(gate.v2CanDryRun),
    }),
    resolveApply: createStep(Boolean(resolveApply.ok), {
      wouldWrite: false,
      reason: resolveApply.reason || null,
    }),
    saveShapeAfter: createStep(Boolean(saveShape.after && saveShape.after.ok)),
    roundtrip: createStep(Boolean(roundtrip.ok), {
      usedProductiveStorage: false,
    }),
    finalValidation: createStep(Boolean(resultValidation.ok)),
  };

  const warnings = collectList(runtimeResult.warnings).concat(collectList(gate.warnings)).concat(collectList(resolveApply.warnings));
  const errors = collectList(runtimeResult.errors).concat(collectList(gate.errors)).concat(collectList(resolveApply.errors));

  return {
    eventId: runtimeResult.eventId || context.eventId || 'unknown',
    steps,
    safety: {
      wouldWrite: Boolean(runtimeResult.wouldWrite),
      usedProductiveStorage: Boolean(runtimeResult.usedProductiveStorage),
      mutatedInputState: Boolean(runtimeResult.mutatedInputState),
      productiveCutover: false,
    },
    warnings: Array.from(new Set(warnings)),
    errors: Array.from(new Set(errors)),
  };
}

function classifyEventV2RuntimeReadiness(reportInput) {
  const report = isPlainObject(reportInput) ? reportInput : {};
  const steps = isPlainObject(report.steps) ? report.steps : {};
  const safety = isPlainObject(report.safety) ? report.safety : {};

  const hardBlocked = Array.isArray(report.errors) && report.errors.length > 0
    ? true
    : Object.keys(steps).some((key) => steps[key] && steps[key].ok === false)
      || safety.wouldWrite !== false
      || safety.usedProductiveStorage !== false
      || safety.mutatedInputState !== false;

  if (hardBlocked) {
    return {
      status: 'blocked',
      readiness: 'blocked',
      blockers: collectList(report.errors).length > 0 ? collectList(report.errors) : ['runtime_preview_step_failed'],
      nextRecommendedStep: 'fix-blocked-step-before-any-write-simulation',
    };
  }

  const gateMode = steps.writeGate && steps.writeGate.gateMode ? String(steps.writeGate.gateMode) : '';
  if (gateMode === 'v2-dry-run') {
    return {
      status: 'preview-stable',
      readiness: 'write-simulation-ready',
      blockers: [],
      nextRecommendedStep: 'single-event-write-simulation-dev-flag',
    };
  }

  return {
    status: 'preview-stable',
    readiness: 'not-write-ready',
    blockers: [],
    nextRecommendedStep: 'keep-no-write-and-expand-preview-coverage',
  };
}

function validateEventV2RuntimeTelemetryReport(reportInput) {
  const report = isPlainObject(reportInput) ? reportInput : {};
  const errors = [];

  if (report.reportType !== 'event-v2-runtime-telemetry-preview') errors.push('invalid_report_type');
  if (report.mode !== 'dev-only') errors.push('invalid_mode');
  if (!isPlainObject(report.steps)) errors.push('missing_steps');
  if (!isPlainObject(report.safety)) errors.push('missing_safety');
  if (report.safety && report.safety.wouldWrite !== false) errors.push('would_write_must_be_false');
  if (report.safety && report.safety.usedProductiveStorage !== false) errors.push('used_productive_storage_must_be_false');
  if (report.safety && report.safety.mutatedInputState !== false) errors.push('mutated_input_state_must_be_false');
  if (!Array.isArray(report.blockers)) errors.push('missing_blockers');
  if (!Array.isArray(report.warnings)) errors.push('missing_warnings');
  if (!Array.isArray(report.errors)) errors.push('missing_errors');

  return {
    ok: errors.length === 0,
    errors,
    warnings: [],
  };
}

function createEventV2RuntimeTelemetryReport(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const runtimeResult = runEventV2RuntimeAdapterPreview(safeInput);
  const summary = summarizeEventV2RuntimeTelemetry({
    ...runtimeResult,
    contextInput: safeInput,
  });
  const readiness = classifyEventV2RuntimeReadiness(summary);

  const report = {
    ok: runtimeResult.ok,
    reportType: 'event-v2-runtime-telemetry-preview',
    mode: 'dev-only',
    eventId: summary.eventId,
    status: readiness.status,
    readiness: readiness.readiness,
    steps: summary.steps,
    safety: {
      wouldWrite: false,
      usedProductiveStorage: false,
      mutatedInputState: Boolean(runtimeResult.mutatedInputState),
      productiveCutover: false,
    },
    blockers: readiness.blockers.slice(),
    warnings: summary.warnings.slice(),
    errors: summary.errors.slice(),
    nextRecommendedStep: readiness.nextRecommendedStep,
    runtimeResult: cloneJson(runtimeResult),
  };

  const reportValidation = validateEventV2RuntimeTelemetryReport(report);
  return {
    ...report,
    ok: report.ok && reportValidation.ok,
    validation: reportValidation,
  };
}

function runEventV2RuntimeTelemetryPreview(input) {
  return createEventV2RuntimeTelemetryReport(input);
}

module.exports = Object.freeze({
  createEventV2RuntimeTelemetryReport,
  summarizeEventV2RuntimeTelemetry,
  classifyEventV2RuntimeReadiness,
  validateEventV2RuntimeTelemetryReport,
  runEventV2RuntimeTelemetryPreview,
});
