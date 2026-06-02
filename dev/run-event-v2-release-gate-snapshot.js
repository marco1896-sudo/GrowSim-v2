#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HEALTH_REPORT_SCRIPT = path.join(ROOT, 'dev', 'run-event-v2-visibility-health-report.js');
const SNAPSHOT_JSON_PATH = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-event-v2-release-gate-snapshot.json');
const SNAPSHOT_MD_PATH = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-event-v2-release-gate-snapshot.md');

const REQUIRED_EVENTS = Object.freeze([
  'indoor_dry_rootball',
  'shared_panic_watering_misread',
]);

const REQUIRED_OUTCOME_COVERAGE_KEYS = Object.freeze([
  'apply_delta',
  'no_delta',
  'guardrail_only',
  'diagnostic_weight_check',
  'diagnostic_rootzone_check',
  'panic_reaction_guardrail',
]);

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
      // Continue scanning.
    }
  }
  try {
    return JSON.parse(safeText);
  } catch (_error) {
    return null;
  }
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runHealthReport() {
  const result = spawnSync(process.execPath, [HEALTH_REPORT_SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const parsed = extractLastJsonObject(stdout);
  return {
    statusCode: Number.isInteger(result.status) ? result.status : -1,
    stdout,
    stderr,
    parsed,
  };
}

function buildNoGoSnapshot(healthRun, blockers, warnings) {
  return {
    ok: false,
    gate: 'no-go',
    reportType: 'event-v2-release-gate-snapshot',
    livePilotEvents: [],
    liveOutcomeModes: [],
    visibleCoverage: {
      browser: false,
      mobile: false,
      reload: false,
    },
    safety: {
      reloadIdempotent: false,
      noDoubleApply: false,
      noUnexpectedStatusMutation: false,
      v1ParallelWriteBlocked: false,
      noLegacyCopyVisible: false,
    },
    knownNonCriticalNoise: [],
    blockers: blockers.concat(
      healthRun && healthRun.stderr ? [`health_report_stderr: ${healthRun.stderr.trim().slice(0, 500)}`] : []
    ),
    warnings,
    nextAllowedSteps: [],
    notAllowedYet: [
      'delete V1 files',
      'activate broad V2 catalog',
      'add negative status deltas broadly',
      'remove legacy save fields',
    ],
  };
}

function writeSnapshotFiles(snapshot) {
  ensureDirForFile(SNAPSHOT_JSON_PATH);
  fs.writeFileSync(SNAPSHOT_JSON_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  const lines = [
    '# Event V2 Release-Gate Snapshot',
    '',
    `Gesamtentscheidung: **${snapshot.gate.toUpperCase()}**`,
    '',
    '## Live V2-Pilot-Events',
    ...(snapshot.livePilotEvents.length ? snapshot.livePilotEvents.map((eventId) => `- ${eventId}`) : ['- none']),
    '',
    '## Gepruefte Outcome-Modi',
    ...(snapshot.liveOutcomeModes.length ? snapshot.liveOutcomeModes.map((mode) => `- ${mode}`) : ['- none']),
    '',
    '## Sichtbarkeitsabdeckung',
    `- Browser: ${snapshot.visibleCoverage.browser ? 'true' : 'false'}`,
    `- Mobile: ${snapshot.visibleCoverage.mobile ? 'true' : 'false'}`,
    `- Reload: ${snapshot.visibleCoverage.reload ? 'true' : 'false'}`,
    '',
    '## Safety',
    `- Reload idempotent: ${snapshot.safety.reloadIdempotent ? 'true' : 'false'}`,
    `- No Double-Apply: ${snapshot.safety.noDoubleApply ? 'true' : 'false'}`,
    `- Keine unerwartete Statusmutation: ${snapshot.safety.noUnexpectedStatusMutation ? 'true' : 'false'}`,
    `- V1-Parallelwrite blockiert: ${snapshot.safety.v1ParallelWriteBlocked ? 'true' : 'false'}`,
    `- Keine Legacy-Copy sichtbar: ${snapshot.safety.noLegacyCopyVisible ? 'true' : 'false'}`,
    '',
    '## Bekannte nicht-kritische Noise',
    ...(snapshot.knownNonCriticalNoise.length ? snapshot.knownNonCriticalNoise.map((noise) => `- ${noise}`) : ['- none']),
    '',
    '## Blocker',
    ...(snapshot.blockers.length ? snapshot.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
    '',
    '## Naechste erlaubte Schritte',
    ...(snapshot.nextAllowedSteps.length ? snapshot.nextAllowedSteps.map((step) => `- ${step}`) : ['- none']),
    '',
    '## Noch nicht erlaubte Schritte',
    ...(snapshot.notAllowedYet.length ? snapshot.notAllowedYet.map((step) => `- ${step}`) : ['- none']),
    '',
  ];
  fs.writeFileSync(SNAPSHOT_MD_PATH, lines.join('\n'), 'utf8');
}

function main() {
  const healthRun = runHealthReport();
  const blockers = [];
  const warnings = [];

  if (healthRun.statusCode !== 0) {
    blockers.push(`health_report_exit_code_${healthRun.statusCode}`);
  }
  if (!healthRun.parsed || healthRun.parsed.reportType !== 'event-v2-visibility-health-report') {
    blockers.push('health_report_missing_or_invalid_json');
  }

  if (blockers.length) {
    const snapshot = buildNoGoSnapshot(healthRun, blockers, warnings);
    writeSnapshotFiles(snapshot);
    console.log(JSON.stringify(snapshot, null, 2));
    process.exitCode = 1;
    return;
  }

  const health = healthRun.parsed;
  if (health.ok !== true) {
    blockers.push('visibility_health_report_not_ok');
  }

  const checkedEvents = Array.isArray(health.checkedEvents) ? health.checkedEvents : [];
  for (const requiredEvent of REQUIRED_EVENTS) {
    if (!checkedEvents.includes(requiredEvent)) {
      blockers.push(`missing_live_event:${requiredEvent}`);
    }
  }

  const outcomeCoverage = health.outcomeCoverage && typeof health.outcomeCoverage === 'object'
    ? health.outcomeCoverage
    : {};
  for (const key of REQUIRED_OUTCOME_COVERAGE_KEYS) {
    if (outcomeCoverage[key] !== true) {
      blockers.push(`missing_outcome_coverage:${key}`);
    }
  }

  const safety = health.safety && typeof health.safety === 'object' ? health.safety : {};
  if (safety.reloadIdempotent !== true) blockers.push('safety_reload_idempotent_false');
  if (safety.noDoubleApply !== true) blockers.push('safety_no_double_apply_false');
  if (safety.noUnexpectedStatusMutation !== true) blockers.push('safety_unexpected_status_mutation_false');
  if (safety.v1ParallelWriteBlocked !== true) blockers.push('safety_v1_parallel_write_blocked_false');
  if (safety.noLegacyCopyVisible !== true) blockers.push('safety_legacy_copy_visible');

  const healthBlockers = Array.isArray(health.blockers) ? health.blockers : [];
  if (healthBlockers.length) {
    for (const item of healthBlockers) blockers.push(`health_report_blocker:${String(item)}`);
  }

  const combinedVisibleBrowserPassed = health.checks && health.checks.combinedVisibleBrowser === 'passed';
  const combinedVisibleMobilePassed = health.checks && health.checks.combinedVisibleMobile === 'passed';
  const browserReloadPassed = health.checks && health.checks.browserReload === 'passed';

  const snapshot = {
    ok: blockers.length === 0,
    gate: blockers.length === 0 ? 'go' : 'no-go',
    reportType: 'event-v2-release-gate-snapshot',
    livePilotEvents: REQUIRED_EVENTS.slice(),
    liveOutcomeModes: ['apply_delta', 'no_delta', 'guardrail_only'],
    visibleCoverage: {
      browser: combinedVisibleBrowserPassed,
      mobile: combinedVisibleMobilePassed,
      reload: browserReloadPassed,
    },
    safety: {
      reloadIdempotent: safety.reloadIdempotent === true,
      noDoubleApply: safety.noDoubleApply === true,
      noUnexpectedStatusMutation: safety.noUnexpectedStatusMutation === true,
      v1ParallelWriteBlocked: safety.v1ParallelWriteBlocked === true,
      noLegacyCopyVisible: safety.noLegacyCopyVisible === true,
    },
    knownNonCriticalNoise: Array.isArray(health.knownNonCriticalNoise)
      ? health.knownNonCriticalNoise.slice()
      : [],
    blockers,
    warnings,
    nextAllowedSteps: [
      'prepare V2 release checkpoint',
      'plan cautious V1 dependency audit',
      'plan next event activation only after approval',
    ],
    notAllowedYet: [
      'delete V1 files',
      'activate broad V2 catalog',
      'add negative status deltas broadly',
      'remove legacy save fields',
    ],
  };

  writeSnapshotFiles(snapshot);
  console.log(JSON.stringify(snapshot, null, 2));
  if (!snapshot.ok) {
    process.exitCode = 1;
  }
}

main();
