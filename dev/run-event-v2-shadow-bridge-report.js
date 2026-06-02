'use strict';

const harness = require('../src/events/v2/shadow-bridge/ShadowBridgeReportHarness.js');

const args = new Set(process.argv.slice(2));
const result = harness.runShadowBridgeReportHarness({
  projectRoot: process.cwd(),
  locale: 'de',
  fallbackLocale: 'en',
  writeReports: args.has('--write'),
  allowOverwrite: args.has('--overwrite')
});

if (args.has('--markdown')) {
  console.log(result.reports.markdown);
} else {
  console.log(JSON.stringify(result.reports.json, null, 2));
}

if (result.writeResult && result.writeResult.wrote) {
  console.log(JSON.stringify({ wroteReports: result.writeResult.files }, null, 2));
}

