#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const engine = require('../src/events/eventEngine.js');

function printUsage() {
  console.error('Usage: node scripts/compare-soft-cutover-qa-runs.js [--format json|markdown] <report1.json> <report2.json> [...reportN.json]');
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice() : [];
  let format = 'json';
  const files = [];

  for (let index = 0; index < args.length; index += 1) {
    const value = String(args[index] || '');
    if (value === '--format') {
      format = String(args[index + 1] || 'json').trim().toLowerCase();
      index += 1;
      continue;
    }
    files.push(value);
  }

  return { format, files };
}

function loadReport(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(raw);
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.files.length) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const reports = parsed.files.map(loadReport);
  if (parsed.format === 'markdown' || parsed.format === 'md') {
    process.stdout.write(`${engine.buildQaMultiRunMarkdownReport(reports)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(engine.aggregateQaScenarioReports(reports), null, 2)}\n`);
}

main();
