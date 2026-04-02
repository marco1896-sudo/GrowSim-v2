const assert = require('assert');
const fs = require('fs');
const path = require('path');

const storageSource = fs.readFileSync(path.join(__dirname, '..', 'storage.js'), 'utf8');

const validSheetsMatch = storageSource.match(/const validSheets = new Set\(\[(.*?)\]\);/s);
assert(validSheetsMatch, 'syncCanonicalStateShape should define validSheets');

const validSheets = [...validSheetsMatch[1].matchAll(/'([^']*)'/g)].map((match) => match[1]);

assert(
  validSheets.includes('statDetail'),
  'stat detail sheet should remain a canonical openSheet target after UI state sync'
);

console.log('ui sheet state regression test passed');
