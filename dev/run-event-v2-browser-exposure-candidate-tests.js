'use strict';

const CandidateTests = require('../src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidateTests.js');

const result = CandidateTests.runBrowserExposureCandidateTests();

console.log(JSON.stringify({
  ok: result.ok,
  total: result.total,
  passed: result.passed,
  failed: result.failed,
  failedCaseIds: result.cases.filter((item) => item.passed !== true).map((item) => item.id)
}, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

