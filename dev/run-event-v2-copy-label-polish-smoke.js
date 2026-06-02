#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const SOURCE_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-160-dev-test-no-write-mode-smoke-report.json');
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-162-copy-label-polish-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-162-copy-label-polish-smoke-report.md');

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Failed step: node ${args.join(' ')}`);
}

function toMarkdown(report) {
  return [
    '# Phase 162 - Copy Label Polish Smoke',
    '',
    `- ok: ${report.ok}`,
    `- modeReachable: ${report.summary.modeReachable}`,
    `- candidateListVisible: ${report.summary.candidateListVisible}`,
    `- detailOpenFlow: ${report.summary.detailOpenFlow}`,
    `- friendlyLabelsVisible: ${report.summary.friendlyLabelsVisible}`,
    `- techLabelsReduced: ${report.summary.techLabelsReduced}`,
    '',
  ].join('\n');
}

function hasAny(text, terms) {
  const hay = String(text || '');
  return terms.some((term) => hay.toLowerCase().includes(String(term).toLowerCase()));
}

function main() {
  run(['dev/run-event-v2-dev-test-no-write-mode-smoke.js']);
  const base = JSON.parse(fs.readFileSync(SOURCE_JSON, 'utf8'));

  const statusText = String(base.viewportResults?.[0]?.statusText || '');
  const detailTexts = (base.viewportResults?.[0]?.opened || []).map((entry) => String(entry.statusText || '') + ' ' + JSON.stringify(entry));
  const combined = statusText + '\n' + detailTexts.join('\n');

  const friendlyTerms = [
    'Testmodus',
    'Event-Vorschau',
    'Nur Vorschau · nichts wird gespeichert',
    'Keine Entscheidung möglich',
    'Kein Einfluss auf deinen Spielstand',
    'Trefferstärke',
    'Warum dieser Hinweis erscheint',
  ];

  const legacyTerms = [
    'Runtime Shadow',
    'Candidate Only',
    'No Write',
    'No Resolve',
    'Reason:',
  ];

  const summary = {
    modeReachable: base.summary?.modeReachable === true,
    candidateListVisible: base.summary?.candidateListVisible === true && base.summary?.fixturesVisible === true && base.summary?.candidateItemsVisible === 15,
    detailOpenFlow: base.summary?.candidateDetailsOpened >= 4 && base.summary?.backWorks === true && base.summary?.closeWorks === true,
    friendlyLabelsVisible: hasAny(combined, friendlyTerms),
    techLabelsReduced: !hasAny(statusText, legacyTerms),
    actionsEmpty: base.summary?.actionsEmpty === true,
    canResolveFalse: base.summary?.canResolveFalse === true,
    selectedCandidateNull: base.summary?.selectedCandidateNull === true,
    persistedSelectedCandidateNull: base.summary?.persistedSelectedCandidateNull === true,
    runtimeWriteFalse: base.summary?.runtimeWriteFalse === true,
    productionFalse: base.summary?.productionFalse === true,
    saveStorageWrites: base.summary?.saveStorageWrites ?? 0,
    brokenImages: base.summary?.brokenImages ?? -1,
    horizontalOverflow: base.summary?.horizontalOverflow ?? true,
    jsErrors: Array.isArray(base.summary?.jsErrors) ? base.summary.jsErrors.length : 1,
  };

  const report = {
    ok: summary.modeReachable
      && summary.candidateListVisible
      && summary.detailOpenFlow
      && summary.friendlyLabelsVisible
      && summary.techLabelsReduced
      && summary.actionsEmpty
      && summary.canResolveFalse
      && summary.selectedCandidateNull
      && summary.persistedSelectedCandidateNull
      && summary.runtimeWriteFalse
      && summary.productionFalse
      && summary.saveStorageWrites === 0
      && summary.brokenImages === 0
      && summary.horizontalOverflow === false
      && summary.jsErrors === 0,
    baseSmokeSource: SOURCE_JSON,
    summary,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, toMarkdown(report), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}

