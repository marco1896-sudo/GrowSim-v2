'use strict';

const { buildCatalogCoverageMatrix } = require('./CatalogCoverageMatrix');

function computeCoverageReport(parsedEntries) {
  const matrix = buildCatalogCoverageMatrix(parsedEntries);
  const totalEventLike = Number(matrix.counts.event || 0);

  return Object.freeze({
    counts: matrix.counts,
    coverage: Object.freeze({
      stageCount: matrix.stages.length,
      modes: matrix.modes,
      categoryCount: matrix.categories.length,
      assetTagCount: matrix.assetTags.length,
      learningRefCount: matrix.learningRefs.length
    }),
    matrix,
    hints: Object.freeze([
      totalEventLike === 0 ? 'No event entries available.' : null,
      matrix.modes.length === 0 ? 'No mode coverage detected.' : null,
      matrix.categories.length === 0 ? 'No category coverage detected.' : null
    ].filter(Boolean))
  });
}

module.exports = Object.freeze({
  computeCoverageReport
});
