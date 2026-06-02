'use strict';

const fs = require('fs');
const path = require('path');
const CatalogPaths = require('./CatalogPaths');

const FIXTURE_DIR = path.join(CatalogPaths.CATALOG_ROOT, '_fixtures');

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .map((name) => path.join(dirPath, name));
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadFixtureRecords() {
  return listJsonFiles(FIXTURE_DIR).map((filePath) => Object.freeze({
    sourceMode: 'fullCatalog',
    sourceGroup: '_fixtures',
    filePath,
    fileName: path.basename(filePath),
    data: readJsonFile(filePath)
  }));
}

module.exports = Object.freeze({
  FIXTURE_DIR,
  loadFixtureRecords
});
