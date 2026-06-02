#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'data', 'events', 'catalog', '_planning');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'phase-event-v1-write-isolation-report.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'phase-event-v1-write-isolation-report.md');

function lineIndexFromNeedle(text, needle) {
  const idx = text.indexOf(needle);
  if (idx < 0) return null;
  let line = 1;
  for (let i = 0; i < idx; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function readText(fileRel) {
  const abs = path.join(ROOT, fileRel);
  return fs.readFileSync(abs, 'utf8');
}

const ENTRIES = [
  {
    id: 'events-create-active-event',
    file: 'events.js',
    category: 'W1',
    purpose: 'Produktiver V1-Create setzt activeEvent State-Machine-Felder.',
    anchor: 'state.events.machineState = \'activeEvent\';',
    risk: 'high',
    writeType: 'runtime_productive',
    isolationStage: 'R1.3',
    blockability: 'later',
    requiredBeforeBlock: [
      'V2 muss Event-Create fuer alle runtime-enabled Events stabil uebernehmen.',
      'Bridge/Create-Gate muss in allen Tick-Eintrittspfaden verbindlich sein.'
    ]
  },
  {
    id: 'events-resolve-enter-resolving',
    file: 'events.js',
    category: 'W2',
    purpose: 'Produktiver V1-Resolve setzt resolving/pendingOutcome.',
    anchor: 'state.events.machineState = \'resolving\';',
    risk: 'high',
    writeType: 'runtime_productive',
    isolationStage: 'R1.4',
    blockability: 'later',
    requiredBeforeBlock: [
      'V2-Resolve muss fuer aktive V2-Events vollstaendig und reload-idempotent sein.',
      'Legacy-Events muessen defensiv read-only bleiben.'
    ]
  },
  {
    id: 'events-resolve-finalize',
    file: 'events.js',
    category: 'W2',
    purpose: 'Produktiver V1-Resolve finalisiert history/resolvedOutcome.',
    anchor: 'state.events.history.push(historyEntry);',
    risk: 'high',
    writeType: 'runtime_productive',
    isolationStage: 'R1.4',
    blockability: 'later',
    requiredBeforeBlock: [
      'V2-History-Struktur muss fuer alle live Events vorhanden sein.',
      'Tests fuer Resolve/History muessen auf V2-First umgestellt sein.'
    ]
  },
  {
    id: 'events-cooldown-write',
    file: 'events.js',
    category: 'W3',
    purpose: 'V1 schreibt Cooldown- und Timer-Felder produktiv.',
    anchor: 'state.events.machineState = \'cooldown\';',
    risk: 'high',
    writeType: 'runtime_productive',
    isolationStage: 'R1.4',
    blockability: 'needs-adapter',
    requiredBeforeBlock: [
      'V2 muss eigenen Cooldown/Timing-Kanal besitzen.',
      'UI und sim Tick duerfen nicht mehr auf V1-Cooldown angewiesen sein.'
    ]
  },
  {
    id: 'events-scheduler-projection',
    file: 'events.js',
    category: 'W3',
    purpose: 'V1 synchronisiert eventCooldowns/eventCooldownsSim und Deadlines.',
    anchor: 'scheduler.eventCooldowns = Object.fromEntries(',
    risk: 'high',
    writeType: 'runtime_productive',
    isolationStage: 'R1.5',
    blockability: 'needs-adapter',
    requiredBeforeBlock: [
      'Save/Restore darf Legacy-Cooldown nur noch als Read-Mirror behandeln.',
      'Migration-Gate fuer alte Saves muss definiert sein.'
    ]
  },
  {
    id: 'storage-legacy-migration',
    file: 'storage.js',
    category: 'W4',
    purpose: 'Save/Restore erzeugt und normalisiert V1-Felder fuer alte Saves.',
    anchor: 'function migrateLegacyStateIntoCanonical(saved, targetState) {',
    risk: 'high',
    writeType: 'persistence_compat',
    isolationStage: 'R1.5',
    blockability: 'no',
    requiredBeforeBlock: [
      'Versionierte Save-Migration mit klaren Backward-Regeln.',
      'Alt-Save Testmatrix (fresh/old/missing-fields) muss gruen sein.'
    ]
  },
  {
    id: 'storage-legacy-mirror-sync',
    file: 'storage.js',
    category: 'W4',
    purpose: 'Canonical->Legacy Spiegel fuer Kompatibilitaet im Save-Zyklus.',
    anchor: 'function syncLegacyMirrorsFromCanonical(snapshot) {',
    risk: 'high',
    writeType: 'persistence_compat',
    isolationStage: 'R1.5',
    blockability: 'later',
    requiredBeforeBlock: [
      'Alle produktiven Leser muessen auf eventV2/canonical umgestellt sein.',
      'Legacy-Read darf nur noch fuer explizite Alt-Save-Pfade bestehen.'
    ]
  },
  {
    id: 'ui-fallback-resolve-write',
    file: 'ui.js',
    category: 'W5',
    purpose: 'UI-Fallback schreibt V1-Resolving-State bei Legacy-Pfad.',
    anchor: 'state.events.machineState = \'resolving\';',
    risk: 'medium',
    writeType: 'ui_fallback',
    isolationStage: 'R1.4',
    blockability: 'later',
    requiredBeforeBlock: [
      'V2-Sheet muss fuer alle runtime-enabled Events als primaerer Action-Pfad aktiv sein.',
      'Legacy UI fallback nur noch read-only.'
    ]
  },
  {
    id: 'sim-event-timer-write',
    file: 'sim.js',
    category: 'W3',
    purpose: 'Sim aktualisiert V1 Event-Timer/Cooldown bei Zeitbooster-Pfaden.',
    anchor: 'state.events.scheduler.nextEventRealTimeMs = Math.max(nowMs, state.events.scheduler.nextEventRealTimeMs - BOOST_ADVANCE_MS);',
    risk: 'medium',
    writeType: 'runtime_productive',
    isolationStage: 'R1.4',
    blockability: 'needs-adapter',
    requiredBeforeBlock: [
      'Timer-Quelle muss zentral auf V2/canonical verlagert sein.',
      'Boost-/Offline-Regressionen muessen danach weiterhin gruen sein.'
    ]
  },
  {
    id: 'app-legacy-reset-write',
    file: 'app.js',
    category: 'W5',
    purpose: 'App-Resetpfade setzen V1 Event-Felder explizit zurueck.',
    anchor: 'state.events.machineState = \'idle\';',
    risk: 'medium',
    writeType: 'ui_runtime_fallback',
    isolationStage: 'R1.2',
    blockability: 'yes',
    requiredBeforeBlock: [
      'Nur in dev/reporting beobachten, noch nicht blockieren.',
      'Vor produktiver Sperre klaeren, ob noch Legacy-UI-Zweige davon leben.'
    ]
  },
  {
    id: 'tests-and-dev-v1-writes',
    file: 'test/event-flow-integration.test.js',
    category: 'W6',
    purpose: 'Tests/Dev schreiben V1 absichtlich fuer Kompatibilitaetsabdeckung.',
    anchor: 'state.events',
    risk: 'low',
    writeType: 'test_dev_only',
    isolationStage: 'R1.2',
    blockability: 'no',
    requiredBeforeBlock: [
      'Testmigration auf V2-first Assertions vorbereiten.',
      'Legacy-Kompatibilitaet bis zur finalen Migrationsphase weiterhin pruefen.'
    ]
  }
];

function buildReport() {
  const byCategory = { W1: 0, W2: 0, W3: 0, W4: 0, W5: 0, W6: 0 };
  const byStage = { 'R1.2': 0, 'R1.3': 0, 'R1.4': 0, 'R1.5': 0 };
  const byBlockability = { yes: 0, no: 0, later: 0, 'needs-adapter': 0 };
  const findings = [];
  const warnings = [];

  for (const entry of ENTRIES) {
    const text = readText(entry.file);
    const line = lineIndexFromNeedle(text, entry.anchor);
    if (line == null) {
      warnings.push({
        id: entry.id,
        file: entry.file,
        warning: `anchor_not_found: ${entry.anchor}`
      });
    }
    findings.push({
      ...entry,
      line
    });
    byCategory[entry.category] += 1;
    byStage[entry.isolationStage] = (byStage[entry.isolationStage] || 0) + 1;
    byBlockability[entry.blockability] = (byBlockability[entry.blockability] || 0) + 1;
  }

  const productiveWrites = findings.filter((f) => ['W1', 'W2', 'W3', 'W5'].includes(f.category)).length;

  return {
    ok: warnings.length === 0,
    reportType: 'event-v1-write-isolation-report',
    generatedAt: new Date().toISOString(),
    summary: {
      totalFindings: findings.length,
      productiveWrites,
      categoryCounts: byCategory,
      stageCounts: byStage,
      blockabilityCounts: byBlockability
    },
    findings,
    warnings,
    recommendation: {
      deleteV1Now: false,
      blockWritesNow: false,
      nextPhase: 'R1.2 dev-only write observability and targeted gate contract draft'
    }
  };
}

function writeMd(report) {
  const lines = [];
  lines.push('# Event V1 Write-Isolation Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total findings: ${report.summary.totalFindings}`);
  lines.push(`- Productive write findings (W1/W2/W3/W5): ${report.summary.productiveWrites}`);
  lines.push(`- W1: ${report.summary.categoryCounts.W1}`);
  lines.push(`- W2: ${report.summary.categoryCounts.W2}`);
  lines.push(`- W3: ${report.summary.categoryCounts.W3}`);
  lines.push(`- W4: ${report.summary.categoryCounts.W4}`);
  lines.push(`- W5: ${report.summary.categoryCounts.W5}`);
  lines.push(`- W6: ${report.summary.categoryCounts.W6}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  for (const finding of report.findings) {
    lines.push(`- \`${finding.id}\` | ${finding.category} | ${finding.file}:${finding.line || '?'} | risk=${finding.risk} | stage=${finding.isolationStage} | blockability=${finding.blockability}`);
    lines.push(`  - ${finding.purpose}`);
  }
  lines.push('');
  lines.push('## Warnings');
  lines.push('');
  if (!report.warnings.length) {
    lines.push('- none');
  } else {
    for (const warning of report.warnings) {
      lines.push(`- ${warning.id} (${warning.file}): ${warning.warning}`);
    }
  }
  lines.push('');
  lines.push('## Recommendation');
  lines.push('');
  lines.push(`- deleteV1Now: ${String(report.recommendation.deleteV1Now)}`);
  lines.push(`- blockWritesNow: ${String(report.recommendation.blockWritesNow)}`);
  lines.push(`- nextPhase: ${report.recommendation.nextPhase}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const report = buildReport();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUTPUT_MD, writeMd(report), 'utf8');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();

