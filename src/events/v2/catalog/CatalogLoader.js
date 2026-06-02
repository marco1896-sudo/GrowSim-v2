'use strict';

const fs = require('fs');
const path = require('path');
const CatalogPaths = require('./CatalogPaths');
const { CatalogSourceMode } = require('./CatalogSourceMode');
const FullCatalogLoader = require('./FullCatalogLoader');

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .map((name) => path.join(dirPath, name));
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
  return files.map((filePath) => {
    const fileName = path.basename(filePath);
    return Object.freeze({
      filePath,
      fileName,
      data: readJsonFile(filePath)
    });
  });
}

function loadCatalogReadOnly() {
  return Object.freeze({
    paths: CatalogPaths,
    sourceMode: CatalogSourceMode.EXAMPLES_ONLY,
    schemas: loadSchemas(),
    examples: loadExamples()
  });
}

function loadCatalogByMode(mode, options) {
  if (mode === CatalogSourceMode.FULL_CATALOG) {
    return FullCatalogLoader.loadCatalogByMode(mode, options || {});
  }
  return loadCatalogReadOnly();
}

module.exports = Object.freeze({
  loadCatalogReadOnly,
  loadCatalogByMode,
  loadSchemas,
  loadExamples,
  listJsonFiles
});
