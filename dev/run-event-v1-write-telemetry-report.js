#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'data', 'events', 'catalog', '_planning');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'phase-event-v1-write-telemetry-report.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'phase-event-v1-write-telemetry-report.md');

const telemetryApi = require(path.join(ROOT, 'src', 'events', 'legacy', 'EventV1WriteTelemetry.js'));

const REQUIRED_TYPES = Object.freeze(['W1', 'W2', 'W3', 'W4', 'W5', 'W6']);
const HOOK_CHECKS = Object.freeze([
  { file: 'events.js', needle: "source: 'events.js:activate_event'", category: 'W1' },
  { file: 'events.js', needle: "source: 'events.js:resolve_enter_resolving'", category: 'W2' },
  { file: 'events.js', needle: "source: 'events.js:resolve_finalize_history'", category: 'W2' },
  { file: 'events.js', needle: "source: 'events.js:enter_cooldown'", category: 'W3' },
  { file: 'sim.js', needle: "source: 'sim.js:boost_event_timer_adjust'", category: 'W3' },
  { file: 'storage.js', needle: "source: 'storage.js:migrate_legacy_state_into_canonical'", category: 'W4' },
  { file: 'storage.js', needle: "source: 'storage.js:sync_legacy_mirrors_from_canonical'", category: 'W4' },
  { file: 'ui.js', needle: "source: 'ui.js:legacy_dismiss_fallback'", category: 'W5' },
  { file: 'app.js', needle: "source: 'app.js:dismiss_active_event_legacy_resolve'", category: 'W2' },
  { file: 'app.js', needle: "source: 'app.js:clear_event_state_for_authoritative_activation'", category: 'W5' }
]);

function readFile(fileRel) {
  return fs.readFileSync(path.join(ROOT, fileRel), 'utf8');
}

function lineOfNeedle(text, needle) {
  const idx = text.indexOf(needle);
  if (idx < 0) return null;
  let line = 1;
  for (let i = 0; i < idx; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function hasNoBlockingTokens(text) {
  const suspicious = [
    'shouldBlockLegacyCreate',
    'shouldBlockLegacyResolve',
    'blockLegacyWrite',
    'denyLegacyWrite'
  ];
  return !suspicious.some((token) => text.includes(token));
}

function buildReport() {
  delete globalThis.__GS_FORCE_EVENT_V1_WRITE_TELEMETRY;
  delete globalThis.__getEventV1WriteTelemetry;
  delete globalThis.__resetEventV1WriteTelemetry;
  delete globalThis.__GS_EVENT_V1_WRITE_TELEMETRY_STATE;

  const requiredFns = [
    'isEventV1WriteTelemetryEnabled',
    'recordEventV1WriteHit',
    'getEventV1WriteTelemetrySnapshot',
    'resetEventV1WriteTelemetry',
    'summarizeEventV1WriteTelemetry'
  ];
  const moduleChecks = requiredFns.map((name) => ({
    fn: name,
    ok: typeof telemetryApi[name] === 'function'
  }));

  const trackedTypes = Array.isArray(telemetryApi.EVENT_V1_WRITE_TYPES)
    ? telemetryApi.EVENT_V1_WRITE_TYPES.slice()
    : [];
  const typeCoverage = REQUIRED_TYPES.every((type) => trackedTypes.includes(type));

  const telemetrySource = readFile('src/events/legacy/EventV1WriteTelemetry.js');
  const staticNoNetworkWrites = !/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|apiFetch\s*\(/.test(telemetrySource);

  const hookResults = HOOK_CHECKS.map((check) => {
    const text = readFile(check.file);
    const line = lineOfNeedle(text, check.needle);
    return {
      file: check.file,
      category: check.category,
      needle: check.needle,
      present: line != null,
      line
    };
  });

  const hooksPresent = hookResults.every((entry) => entry.present === true);

  const disabledEnabled = telemetryApi.isEventV1WriteTelemetryEnabled({
    hostname: 'example.com',
    search: '',
    mode: 'prod'
  });
  const disabledInstall = telemetryApi.installEventV1WriteTelemetryDevHelpers(globalThis);
  const helpersHiddenWhenDisabled = disabledEnabled === false
    && disabledInstall.enabled === false
    && typeof globalThis.__getEventV1WriteTelemetry === 'undefined'
    && typeof globalThis.__resetEventV1WriteTelemetry === 'undefined';

  globalThis.__GS_FORCE_EVENT_V1_WRITE_TELEMETRY = true;
  telemetryApi.resetEventV1WriteTelemetry();
  telemetryApi.recordEventV1WriteHit('W1', { source: 'report:sample' });
  const sampleSnapshot = telemetryApi.getEventV1WriteTelemetrySnapshot();
  const sampleRecordOk = sampleSnapshot && sampleSnapshot.snapshot && sampleSnapshot.snapshot.totals.W1 === 1;

  const noBlockingBehavior = hasNoBlockingTokens(telemetrySource);

  delete globalThis.__GS_FORCE_EVENT_V1_WRITE_TELEMETRY;
  delete globalThis.__getEventV1WriteTelemetry;
  delete globalThis.__resetEventV1WriteTelemetry;
  delete globalThis.__GS_EVENT_V1_WRITE_TELEMETRY_STATE;

  const ok = moduleChecks.every((entry) => entry.ok)
    && typeCoverage
    && hooksPresent
    && helpersHiddenWhenDisabled
    && sampleRecordOk
    && staticNoNetworkWrites
    && noBlockingBehavior;

  return {
    ok,
    reportType: 'event-v1-write-telemetry-report',
    generatedAt: new Date().toISOString(),
    modulePresent: true,
    moduleChecks,
    supportedTypes: trackedTypes,
    typeCoverage,
    hookResults,
    hooksPresent,
    devOnlyGuard: {
      disabledEnabled,
      disabledInstallEnabled: disabledInstall.enabled === true,
      helpersHiddenWhenDisabled
    },
    safety: {
      noBlockingBehavior,
      staticNoNetworkWrites
    },
    sampleRecordOk,
    warnings: []
  };
}

function writeMarkdown(report) {
  const lines = [];
  lines.push('# Event V1 Write Telemetry Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- ok: ${String(report.ok)}`);
  lines.push(`- modulePresent: ${String(report.modulePresent)}`);
  lines.push(`- typeCoverage W1-W6: ${String(report.typeCoverage)}`);
  lines.push(`- hooksPresent: ${String(report.hooksPresent)}`);
  lines.push(`- helpersHiddenWhenDisabled: ${String(report.devOnlyGuard.helpersHiddenWhenDisabled)}`);
  lines.push(`- noBlockingBehavior: ${String(report.safety.noBlockingBehavior)}`);
  lines.push(`- staticNoNetworkWrites: ${String(report.safety.staticNoNetworkWrites)}`);
  lines.push('');
  lines.push('## Hook Results');
  lines.push('');
  for (const hook of report.hookResults) {
    lines.push(`- \`${hook.file}\` ${hook.category} present=${String(hook.present)} line=${hook.line == null ? '-' : String(hook.line)}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const report = buildReport();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUTPUT_MD, writeMarkdown(report), 'utf8');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
