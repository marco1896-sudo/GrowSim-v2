'use strict';

const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CATALOG_ROOT = path.join(ROOT, 'data', 'events', 'catalog');

const CatalogPaths = Object.freeze({
  ROOT,
  CATALOG_ROOT,
  SCHEMA_DIR: path.join(CATALOG_ROOT, '_schema'),
  EXAMPLES_DIR: path.join(CATALOG_ROOT, '_examples')
});

module.exports = CatalogPaths;
