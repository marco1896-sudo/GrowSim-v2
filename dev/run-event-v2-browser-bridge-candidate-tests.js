'use strict';

const BridgeCandidateTests = require('../src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidateTests.js');

const result = BridgeCandidateTests.runBrowserBridgeCandidateTests();

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

