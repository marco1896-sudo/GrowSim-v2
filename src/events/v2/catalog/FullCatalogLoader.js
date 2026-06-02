'use strict';

const fs = require('fs');
const path = require('path');
const CatalogPaths = require('./CatalogPaths');
const { CatalogSourceMode, normalizeCatalogSourceMode } = require('./CatalogSourceMode');
const FixtureLoader = require('./CatalogFixtureLoader');

function listJsonFiles(dirPath, recursive) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const recurse = recursive === true;
  const out = [];
  fs.readdirSync(dirPath, { withFileTypes: true }).forEach((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (recurse) {
        listJsonFiles(entryPath, true).forEach((childPath) => out.push(childPath));
      }
      return;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      out.push(entryPath);
    }
  });
  return out;
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function loadSchemas() {
  const files = listJsonFiles(CatalogPaths.SCHEMA_DIR);
  const schemas = Object.create(null);
  files.forEach((filePath) => {
    const fileName = path.basename(filePath);
    schemas[fileName] = readJsonFile(filePath);
  });
  return Object.freeze(schemas);
}

function loadExamples() {
  const files = listJsonFiles(CatalogPaths.EXAMPLES_DIR);
  return files.map((filePath) => Object.freeze({
    sourceMode: CatalogSourceMode.EXAMPLES_ONLY,
    sourceGroup: '_examples',
    filePath,
    fileName: path.basename(filePath),
    data: readJsonFile(filePath)
  }));
}

function loadFullCatalogRecords() {
  const roots = [
    path.join(CatalogPaths.CATALOG_ROOT, 'events'),
    path.join(CatalogPaths.CATALOG_ROOT, 'chains'),
    path.join(CatalogPaths.CATALOG_ROOT, 'learning-cards')
  ];

  const records = [];
  roots.forEach((dirPath) => {
    listJsonFiles(dirPath, true).forEach((filePath) => {
      const relativeDir = path.relative(CatalogPaths.CATALOG_ROOT, path.dirname(filePath)).replace(/\\/g, '/');
      records.push(Object.freeze({
        sourceMode: CatalogSourceMode.FULL_CATALOG,
        sourceGroup: relativeDir || path.basename(dirPath),
        filePath,
        fileName: path.basename(filePath),
        data: readJsonFile(filePath)
      }));
    });
  });

  return records;
}

function loadCatalogByMode(mode, options) {
  const opts = options || {};
  const sourceMode = normalizeCatalogSourceMode(mode);
  let examples = sourceMode === CatalogSourceMode.FULL_CATALOG
    ? loadFullCatalogRecords()
    : loadExamples();
  if (opts.includeFixtures === true) {
    examples = examples.concat(FixtureLoader.loadFixtureRecords());
  }

  return Object.freeze({
    paths: CatalogPaths,
    sourceMode,
    includeFixtures: opts.includeFixtures === true,
    schemas: loadSchemas(),
    examples
  });
}

module.exports = Object.freeze({
  loadCatalogByMode,
  loadSchemas,
  loadExamples,
  loadFullCatalogRecords,
  listJsonFiles,
  readJsonFile
});
