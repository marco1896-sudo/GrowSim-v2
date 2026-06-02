'use strict';

const report = require('../src/events/v2/shadow-bridge/ShadowBridgeRuntimeBoundaryConsolidatedReport.js');

const result = report.runShadowRuntimeBoundaryReport({
  projectRoot: process.cwd()
});

console.log(JSON.stringify({
  ok: result.ok,
  status: result.status,
  mode: result.mode,
  diagnosticsReport: result.diagnosticsReport,
  hookAwareStaticCheck: result.hookAwareStaticCheck,
  isolatedHookUnitHarness: result.isolatedHookUnitHarness,
  shadowOnlyRuntimeBoundaryHarness: result.shadowOnlyRuntimeBoundaryHarness,
  browserGlobalRegistrationSmoke: result.browserGlobalRegistrationSmoke,
  legacySmoke: result.legacySmoke,
  combinedReport: result.combinedReport,
  guardedEntryContractTests: result.guardedEntryContractTests,
  browserBridgeCandidateTests: result.browserBridgeCandidateTests,
  legacyPreHookCheck: result.legacyPreHookCheck,
  labels: result.labels,
  forbiddenSideEffects: result.forbiddenSideEffects
}, null, 2));
