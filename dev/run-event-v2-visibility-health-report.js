#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ActivationRegistryApi = require('../src/events/v2/runtime/EventV2ActivationRegistry.js');

const ROOT = path.resolve(__dirname, '..');
const REPORT_JSON_PATH = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-event-v2-visibility-health-report.json');
const REPORT_MD_PATH = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-event-v2-visibility-health-report.md');

const BASE_CHECKS = Object.freeze([
  { key: 'combinedVisibleBrowser', script: 'dev/run-event-center-v2-combined-visible-matrix-smoke.js' },
  { key: 'combinedVisibleMobile', script: 'dev/run-event-center-v2-combined-visible-mobile-matrix-smoke.js' },
  { key: 'pilotOptionsMatrix', script: 'dev/run-event-center-v2-pilot-options-matrix-smoke.js' },
  { key: 'sharedPilot', script: 'dev/run-event-center-v2-shared-panic-watering-pilot-smoke.js' },
  { key: 'browserReload', script: 'dev/run-event-center-v2-browser-reload-smoke.js' },
]);

const OPTIONAL_CHECKS = Object.freeze([
  { key: 'realBrowserVisible', script: 'dev/run-event-center-v2-real-browser-visible-smoke.js' },
  { key: 'mobileQa', script: 'dev/run-event-center-v2-mobile-qa-smoke.js' },
]);

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  return {
    withExtended: args.includes('--with-extended'),
    writeFiles: !args.includes('--no-write-files'),
  };
}

function extractLastJsonObject(text) {
  const safeText = String(text || '').trim();
  if (!safeText) return null;
  const lines = safeText.split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines[index].trim();
    if (!candidate.startsWith('{')) continue;
    try {
      return JSON.parse(candidate);
    } catch (_error) {
      // Continue searching.
    }
  }
  try {
    return JSON.parse(safeText);
  } catch (_error) {
    return null;
  }
}

function runNodeScript(scriptRelPath) {
  const fullPath = path.join(ROOT, scriptRelPath);
  const result = spawnSync(process.execPath, [fullPath], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const parsed = extractLastJsonObject(stdout);
  const okFromJson = parsed && parsed.ok === true;
  const ok = result.status === 0 && okFromJson;

  return {
    script: scriptRelPath,
    ok,
    statusCode: Number.isInteger(result.status) ? result.status : -1,
    signal: result.signal || null,
    parsed,
    stdout,
    stderr,
  };
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeReportFiles(summary) {
  ensureDirForFile(REPORT_JSON_PATH);
  fs.writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  const lines = [
    '# Event V2 Visibility Health Report',
    '',
    `Status: ${summary.ok ? 'PASS' : 'FAIL'}`,
    '',
    '## Checked Scripts',
    ...summary.executedScripts.map((entry) => `- ${entry.key}: ${entry.status}`),
    '',
    '## Checked Events',
    ...summary.checkedEvents.map((eventId) => `- ${eventId}`),
    '',
    '## Outcome Coverage',
    ...Object.entries(summary.outcomeCoverage).map(([key, value]) => `- ${key}: ${value ? 'true' : 'false'}`),
    '',
    '## Safety',
    ...Object.entries(summary.safety).map(([key, value]) => `- ${key}: ${value ? 'true' : 'false'}`),
    '',
    '## Known Non-Critical Noise',
    ...(summary.knownNonCriticalNoise.length ? summary.knownNonCriticalNoise.map((entry) => `- ${entry}`) : ['- none']),
    '',
    '## Blockers',
    ...(summary.blockers.length ? summary.blockers.map((entry) => `- ${entry}`) : ['- none']),
    '',
    '## Warnings',
    ...(summary.warnings.length ? summary.warnings.map((entry) => `- ${entry}`) : ['- none']),
    '',
  ];
  fs.writeFileSync(REPORT_MD_PATH, lines.join('\n'), 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const checks = args.withExtended ? BASE_CHECKS.concat(OPTIONAL_CHECKS) : BASE_CHECKS.slice();
  const results = checks.map((entry) => ({ key: entry.key, ...runNodeScript(entry.script) }));

  const checkStatus = {};
  for (const result of results) {
    checkStatus[result.key] = result.ok ? 'passed' : 'failed';
  }

  const blockers = [];
  const warnings = [];
  for (const result of results) {
    if (!result.ok) {
      blockers.push(`${result.key} failed (${result.script})`);
    }
  }

  const combinedVisibleBrowser = results.find((entry) => entry.key === 'combinedVisibleBrowser');
  const combinedVisibleMobile = results.find((entry) => entry.key === 'combinedVisibleMobile');
  const pilotOptionsMatrix = results.find((entry) => entry.key === 'pilotOptionsMatrix');
  const sharedPilot = results.find((entry) => entry.key === 'sharedPilot');
  const browserReload = results.find((entry) => entry.key === 'browserReload');

  const checkedEvents = Array.from(new Set([
    ...(combinedVisibleBrowser && combinedVisibleBrowser.parsed && Array.isArray(combinedVisibleBrowser.parsed.visibleEventsChecked)
      ? combinedVisibleBrowser.parsed.visibleEventsChecked
      : []),
    ...(pilotOptionsMatrix && pilotOptionsMatrix.parsed && Array.isArray(pilotOptionsMatrix.parsed.events)
      ? pilotOptionsMatrix.parsed.events
      : []),
  ])).filter(Boolean);

  const outcomeCoverage = {
    apply_delta: Boolean(pilotOptionsMatrix && pilotOptionsMatrix.parsed && Array.isArray(pilotOptionsMatrix.parsed.outcomeModes) && pilotOptionsMatrix.parsed.outcomeModes.includes('apply_delta')),
    no_delta: Boolean(pilotOptionsMatrix && pilotOptionsMatrix.parsed && Array.isArray(pilotOptionsMatrix.parsed.outcomeModes) && pilotOptionsMatrix.parsed.outcomeModes.includes('no_delta')),
    guardrail_only: Boolean(pilotOptionsMatrix && pilotOptionsMatrix.parsed && Array.isArray(pilotOptionsMatrix.parsed.outcomeModes) && pilotOptionsMatrix.parsed.outcomeModes.includes('guardrail_only')),
    diagnostic_weight_check: Boolean(sharedPilot && sharedPilot.parsed && sharedPilot.parsed.afterResolve && sharedPilot.parsed.afterResolve.appliedDeltaReason === 'diagnostic_weight_check'),
    diagnostic_rootzone_check: Boolean(pilotOptionsMatrix && pilotOptionsMatrix.parsed && Array.isArray(pilotOptionsMatrix.parsed.cases)
      && pilotOptionsMatrix.parsed.cases.some((entry) => entry.expectedReason === 'diagnostic_rootzone_check' && entry.ok === true)),
    panic_reaction_guardrail: Boolean(pilotOptionsMatrix && pilotOptionsMatrix.parsed && Array.isArray(pilotOptionsMatrix.parsed.cases)
      && pilotOptionsMatrix.parsed.cases.some((entry) => entry.expectedReason === 'panic_reaction_guardrail' && entry.ok === true)),
  };

  const safety = {
    reloadIdempotent: Boolean(
      (combinedVisibleBrowser && combinedVisibleBrowser.parsed && combinedVisibleBrowser.parsed.reloadIdempotent === true)
      && (combinedVisibleMobile && combinedVisibleMobile.parsed && combinedVisibleMobile.parsed.reloadIdempotent === true)
      && (pilotOptionsMatrix && pilotOptionsMatrix.parsed && pilotOptionsMatrix.parsed.reloadIdempotent === true)
      && (sharedPilot && sharedPilot.parsed && sharedPilot.parsed.reloadIdempotent === true)
      && (browserReload && browserReload.parsed && browserReload.parsed.deltaNotAppliedTwice === true)
    ),
    noDoubleApply: Boolean(browserReload && browserReload.parsed && browserReload.parsed.deltaNotAppliedTwice === true),
    noUnexpectedStatusMutation: Boolean(pilotOptionsMatrix && pilotOptionsMatrix.parsed && pilotOptionsMatrix.parsed.noUnexpectedStatusMutation === true),
    v1ParallelWriteBlocked: Boolean(
      (combinedVisibleBrowser && combinedVisibleBrowser.parsed && combinedVisibleBrowser.parsed.v1ParallelWriteBlocked === true)
      && (combinedVisibleMobile && combinedVisibleMobile.parsed && combinedVisibleMobile.parsed.v1ParallelWriteBlocked === true)
      && (pilotOptionsMatrix && pilotOptionsMatrix.parsed && pilotOptionsMatrix.parsed.v1ParallelWriteBlocked === true)
      && (sharedPilot && sharedPilot.parsed && sharedPilot.parsed.v1DidNotWriteParallel === true)
      && (browserReload && browserReload.parsed && browserReload.parsed.v1DidNotWriteParallel === true)
    ),
    noLegacyCopyVisible: Boolean(
      (combinedVisibleBrowser && combinedVisibleBrowser.parsed && combinedVisibleBrowser.parsed.noLegacyCopyVisible === true)
      && (combinedVisibleMobile && combinedVisibleMobile.parsed && combinedVisibleMobile.parsed.noLegacyCopyVisible === true)
    ),
  };

  const knownNonCriticalNoise = [];
  if (combinedVisibleMobile && combinedVisibleMobile.parsed && combinedVisibleMobile.parsed.hasConsoleErrors === true) {
    knownNonCriticalNoise.push('service-worker-register-log');
    knownNonCriticalNoise.push('dev-404-resource-log');
  }

  if (combinedVisibleMobile && combinedVisibleMobile.parsed && combinedVisibleMobile.parsed.hasCriticalConsoleErrors === true) {
    blockers.push('combinedVisibleMobile reported critical console errors');
  }

  const summary = {
    ok: blockers.length === 0,
    reportType: 'event-v2-visibility-health-report',
    checkedEvents,
    livePilotEvents: ['indoor_dry_rootball', 'shared_panic_watering_misread'],
    bulkRuntimeEnabledEvents: ActivationRegistryApi.getEventV2RuntimeEnabledEvents(),
    sampleVisibleEvents: [
      'indoor_heat_stress_air',
      'indoor_overwatering_early',
      'outdoor_heatwave_dry_wind',
      'shared_rootbound_warning',
      'shared_early_pest_signs_mild',
    ],
    checks: checkStatus,
    outcomeCoverage,
    safety,
    knownNonCriticalNoise: Array.from(new Set(knownNonCriticalNoise)),
    blockers,
    warnings,
    executedScripts: results.map((entry) => ({
      key: entry.key,
      script: toPosix(entry.script),
      status: entry.ok ? 'passed' : 'failed',
      statusCode: entry.statusCode,
    })),
  };

  if (args.writeFiles) {
    writeReportFiles(summary);
  }

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) {
    process.exitCode = 1;
  }
}

main();
