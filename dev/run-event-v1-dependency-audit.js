#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'data', 'events', 'catalog', '_planning');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'phase-event-v1-dependency-audit.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'phase-event-v1-dependency-audit.md');

const TARGETS = [
  'app.js',
  'ui.js',
  'sim.js',
  'storage.js',
  'events.js',
  path.join('src', 'events'),
  'test',
  'dev'
];

const PATTERNS = [
  /state\.events/g,
  /events\.active/g,
  /events\.history/g,
  /activeEvent/g,
  /eventCooldown/g,
  /\blegacy\b/gi,
  /\bLegacy\b/g,
  /\bV1\b/g,
  /Event Center/g,
  /resolveEvent/g,
  /triggerEvent/g,
  /eventQueue/g,
  /eventHistory/g
];

const CATEGORY_HINTS = {
  A: [/migrateLegacyStateIntoCanonical/, /syncLegacyMirrorsFromCanonical/, /legacy-read/],
  B: [/eventSheetLegacyRoot/, /legacy-suppressed/, /machineState/],
  C: [/machineState\s*=/, /history\.push/, /activeEventId\s*=/, /pendingOutcome\s*=/],
  D: [/restore/, /save/, /persist/, /migrateLegacyStateIntoCanonical/, /syncLegacyMirrorsFromCanonical/],
  E: [/test\//, /dev\//]
};

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(abs));
      continue;
    }
    if (!abs.endsWith('.js') && !abs.endsWith('.md') && !abs.endsWith('.html') && !abs.endsWith('.css')) continue;
    out.push(abs);
  }
  return out;
}

function lineNumberOfIndex(text, idx) {
  let line = 1;
  for (let i = 0; i < idx; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function scanFile(absPath) {
  const text = fs.readFileSync(absPath, 'utf8');
  const matches = [];
  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    let m = pattern.exec(text);
    while (m) {
      matches.push({
        pattern: pattern.toString(),
        value: m[0],
        line: lineNumberOfIndex(text, m.index)
      });
      m = pattern.exec(text);
    }
  }
  return { text, matches };
}

function classify(fileRel, text) {
  const tags = new Set();
  const joined = `${fileRel}\n${text}`;
  for (const [category, hints] of Object.entries(CATEGORY_HINTS)) {
    if (hints.some((rx) => rx.test(joined))) tags.add(category);
  }
  if (tags.size === 0) {
    if (/state\.events/.test(text)) tags.add('A');
    if (fileRel.startsWith('test/') || fileRel.startsWith('dev/')) tags.add('E');
  }
  return Array.from(tags).sort();
}

function riskFromCategories(categories) {
  if (categories.includes('C') || categories.includes('D')) return 'high';
  if (categories.includes('B') || categories.includes('A')) return 'medium';
  return 'low';
}

function main() {
  const files = [];
  for (const target of TARGETS) {
    const abs = path.join(ROOT, target);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      files.push(...walk(abs));
    } else {
      files.push(abs);
    }
  }

  const findings = [];
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const { text, matches } = scanFile(abs);
    if (!matches.length) continue;
    const categories = classify(rel, text);
    findings.push({
      file: rel,
      hitCount: matches.length,
      sampleLines: matches.slice(0, 12).map((m) => m.line),
      categories,
      risk: riskFromCategories(categories)
    });
  }

  findings.sort((a, b) => b.hitCount - a.hitCount || a.file.localeCompare(b.file));

  const totals = findings.reduce((acc, item) => {
    for (const cat of item.categories) {
      acc.categoryCounts[cat] = (acc.categoryCounts[cat] || 0) + 1;
    }
    acc.totalHits += item.hitCount;
    return acc;
  }, { totalHits: 0, categoryCounts: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 } });

  const summary = {
    ok: true,
    reportType: 'event-v1-dependency-audit',
    generatedAt: new Date().toISOString(),
    scannedFileCount: files.length,
    filesWithFindings: findings.length,
    totalPatternHits: totals.totalHits,
    categoryCounts: totals.categoryCounts,
    topFindings: findings.slice(0, 20)
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  const md = [
    '# Event V1 Dependency Audit Report',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `- Scanned files: ${summary.scannedFileCount}`,
    `- Files with findings: ${summary.filesWithFindings}`,
    `- Total pattern hits: ${summary.totalPatternHits}`,
    '',
    '## Category Counts',
    '',
    `- A (Legacy-Read): ${summary.categoryCounts.A}`,
    `- B (UI-Fallback): ${summary.categoryCounts.B}`,
    `- C (Productive Write): ${summary.categoryCounts.C}`,
    `- D (Save/Restore): ${summary.categoryCounts.D}`,
    `- E (Test/Dev): ${summary.categoryCounts.E}`,
    `- F (Delete Candidate): ${summary.categoryCounts.F}`,
    '',
    '## Top Findings',
    ''
  ];

  for (const finding of summary.topFindings) {
    md.push(`- \`${finding.file}\` hits=${finding.hitCount} categories=${finding.categories.join(',') || '-'} risk=${finding.risk}`);
  }

  fs.writeFileSync(OUTPUT_MD, `${md.join('\n')}\n`, 'utf8');

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();

