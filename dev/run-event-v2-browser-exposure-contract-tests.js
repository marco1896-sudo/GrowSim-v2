'use strict';

const ExposureTests = require('../src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureContractTests.js');

const result = ExposureTests.runBrowserExposureContractTests();

console.log(JSON.stringify({
  ok: result.ok,
  total: result.total,
  passed: result.passed,
  failed: result.failed,
  failedCaseIds: result.cases.filter((item) => !item.passed).map((item) => item.id)
}, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

