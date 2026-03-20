'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');
const targetDirectories = [
  path.join(projectRoot, 'src', 'ui', 'screens'),
  path.join(projectRoot, 'src', 'ui', 'components')
];

const blockedPatterns = [
  {
    id: 'state-mutation',
    regex: /\bstate\.[A-Za-z0-9_$.]+\s*=[^=]/g,
    message: 'Direct state mutation detected in UI layer.'
  },
  {
    id: 'logic-mutator-call',
    regex: /\b(applyAction|resetRun|runEventStateMachine|persistState|schedulePersistState)\s*\(/g,
    message: 'Direct logic mutator call detected in UI layer.'
  }
];

function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function runChecks() {
  const files = targetDirectories.flatMap((dirPath) => listFilesRecursive(dirPath));
  const violations = [];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');

    for (const blocked of blockedPatterns) {
      const matches = source.match(blocked.regex);
      if (!matches || !matches.length) {
        continue;
      }
      violations.push({
        filePath,
        rule: blocked.id,
        message: blocked.message,
        count: matches.length
      });
    }
  }

  if (!violations.length) {
    console.log('UI architecture guard passed.');
    return 0;
  }

  console.error('UI architecture guard failed.');
  for (const violation of violations) {
    console.error(`- ${violation.rule}: ${violation.filePath} (${violation.count})`);
  }
  return 1;
}

process.exitCode = runChecks();
