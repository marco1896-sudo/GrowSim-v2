'use strict';

const CatalogSourceMode = Object.freeze({
  EXAMPLES_ONLY: 'examplesOnly',
  FULL_CATALOG: 'fullCatalog'
});

function normalizeCatalogSourceMode(value) {
  const raw = String(value || '').trim();
  return raw === CatalogSourceMode.FULL_CATALOG
    ? CatalogSourceMode.FULL_CATALOG
    : CatalogSourceMode.EXAMPLES_ONLY;
}

function isFullCatalogMode(value) {
  return normalizeCatalogSourceMode(value) === CatalogSourceMode.FULL_CATALOG;
}

module.exports = Object.freeze({
  CatalogSourceMode,
  normalizeCatalogSourceMode,
  isFullCatalogMode
});
