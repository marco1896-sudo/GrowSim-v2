'use strict';

const CombinedHarness = require('../src/events/v2/shadow-bridge/ShadowBridgeCombinedReportHarness.js');
const ContractTests = require('../src/events/v2/shadow-bridge/ShadowBridgeGuardedEntryContractTests.js');
const ReadinessChecklist = require('../src/events/v2/shadow-bridge/ShadowBridgeHookReadinessChecklist.js');

const combinedReport = CombinedHarness.runShadowBridgeCombinedReportHarness({
  projectRoot: process.cwd(),
  locale: 'de',
  fallbackLocale: 'en',
  writeReports: false
});
const contractTests = ContractTests.runGuardedEntryContractTests();
const readiness = ReadinessChecklist.evaluateShadowBridgeHookReadiness({
  combinedReport,
  contractTests,
  fileStatus: {
    appJsChanged: false,
    packageJsonChanged: false,
    savePersistenceChanged: false,
    existingEventsChanged: false,
    uiChanged: false
  }
});

console.log(JSON.stringify({
  ok: combinedReport.ok && contractTests.ok && readiness.ok,
  combinedReport: {
    ok: combinedReport.ok,
    safeToProceed: combinedReport.safeToProceed,
    combinedStatus: combinedReport.combinedStatus,
    blocker: combinedReport.blocker,
    error: combinedReport.error,
    warning: combinedReport.warning
  },
  contractTests: {
    ok: contractTests.ok,
    total: contractTests.total,
    passed: contractTests.passed,
    failed: contractTests.failed
  },
  readiness: {
    ok: readiness.ok,
    readyForHookProposal: readiness.readyForHookProposal,
    passed: readiness.passed,
    failed: readiness.failed,
    failedCheckIds: readiness.failedCheckIds
  }
}, null, 2));

if (!combinedReport.ok || !contractTests.ok || !readiness.ok) {
  process.exitCode = 1;
}

