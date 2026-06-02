#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-event-v2-release-gate-snapshot.json');
const CHECKLIST_PATH = path.join(ROOT, 'docs', 'event-system-v2', 'phase-event-v2-manual-release-checklist.md');

function readJsonSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function main() {
  const snapshot = readJsonSafe(SNAPSHOT_PATH);
  const snapshotSummary = snapshot
    ? {
      ok: snapshot.ok === true,
      gate: String(snapshot.gate || 'unknown'),
      reportType: String(snapshot.reportType || ''),
      livePilotEvents: Array.isArray(snapshot.livePilotEvents) ? snapshot.livePilotEvents.slice() : [],
      blockers: Array.isArray(snapshot.blockers) ? snapshot.blockers.slice() : [],
      warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings.slice() : [],
    }
    : {
      ok: false,
      gate: 'missing',
      reportType: '',
      livePilotEvents: [],
      blockers: ['release_gate_snapshot_missing'],
      warnings: [],
    };

  const summary = {
    ok: snapshotSummary.ok,
    reportType: 'event-v2-release-checklist-summary',
    releaseGateSnapshot: snapshotSummary,
    manualChecklistPath: CHECKLIST_PATH,
    seedCommands: [
      '__resetEventV2Pilot({ clearHistory: true, resetStatus: true })',
      '__seedEventV2PilotIndoorDryRootball()',
      '__seedEventV2PilotSharedPanicWateringMisread()',
      '__getEventV2PilotState()',
    ],
    goCriteria: [
      'beide Pilot-Events sichtbar korrekt',
      'keine Legacy-/Cooldown-/Rohkey-Texte im V2-Pfad',
      'Resolve funktioniert',
      'Reload idempotent',
      'keine kritischen Console Errors',
    ],
    noGoCriteria: [
      'V1-Look im V2-Pfad',
      'falsche alte Visuals/Slots',
      'doppelte History oder Double-Apply',
      'kritische Console Errors',
      'Mobile Layout-Break',
    ],
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
