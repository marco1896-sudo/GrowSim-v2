#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json']);
const SKIP_SEGMENTS = ['node_modules', '.git', 'test-results'];

function shouldScan(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) return false;
  return !SKIP_SEGMENTS.some((segment) => filePath.includes(`${path.sep}${segment}${path.sep}`));
}

function walk(dirPath, bucket = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_SEGMENTS.includes(entry.name)) continue;
      walk(fullPath, bucket);
      continue;
    }
    if (shouldScan(fullPath)) {
      bucket.push(fullPath);
    }
  }
  return bucket;
}

const allowedMojibakeFiles = new Set([
  path.join(ROOT, 'src', 'utils', 'textEncoding.js')
]);

const MOJIBAKE_MARKER = '\u00C3';

function main() {
  const files = walk(ROOT);
  const offending = [];

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.includes('\uFFFD')) {
      offending.push(`${path.relative(ROOT, filePath)} contains replacement characters`);
    }
    if (!allowedMojibakeFiles.has(filePath) && raw.includes(MOJIBAKE_MARKER)) {
      offending.push(`${path.relative(ROOT, filePath)} still contains mojibake marker ${MOJIBAKE_MARKER}`);
    }
  }

  assert.deepStrictEqual(offending, [], offending.join('\n'));

  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('<meta charset="UTF-8">'), 'index.html should declare UTF-8 explicitly');
  assert.ok(indexHtml.includes('src/utils/textEncoding.js'), 'index.html should load the text encoding guard');

  const swSource = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.ok(swSource.includes('utf8-fix-v2'), 'service worker cache version should be bumped for UTF-8 fix');
  assert.ok(swSource.includes("appPath('src/utils/textEncoding.js')"), 'service worker should cache the text encoding helper');
}

main();
console.log('utf8 encoding regression test passed');
