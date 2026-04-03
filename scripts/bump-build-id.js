#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');

function formatNowAsBuildId() {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mi = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

const explicitBuildId = process.argv[2] ? String(process.argv[2]).trim() : '';
const buildId = explicitBuildId || formatNowAsBuildId();
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const buildIdPattern = /const buildId = '[^']+';/;
if (!buildIdPattern.test(indexHtml)) {
  console.error('[build-id] failed to update index.html (buildId marker not found)');
  process.exit(1);
}

const updatedHtml = indexHtml.replace(
  buildIdPattern,
  `const buildId = '${buildId}';`
);

fs.writeFileSync(indexPath, updatedHtml, 'utf8');
console.log(`[build-id] updated index.html to ${buildId}`);
