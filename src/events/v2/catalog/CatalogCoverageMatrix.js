'use strict';

function pushUnique(map, key, value) {
  if (!value && value !== 0) return;
  if (!map[key]) map[key] = new Set();
  map[key].add(String(value));
}

function buildCatalogCoverageMatrix(parsedEntries) {
  const entries = Array.isArray(parsedEntries) ? parsedEntries : [];
  const matrix = {
    counts: { event: 0, chain: 0, 'learning-card': 0, unknown: 0 },
    stages: new Set(),
    modes: new Set(),
    categories: new Set(),
    assetTags: new Set(),
    learningRefs: new Set()
  };

  entries.forEach((entry) => {
    const kind = matrix.counts[entry.kind] !== undefined ? entry.kind : 'unknown';
    matrix.counts[kind] += 1;

    const data = entry && entry.data ? entry.data : {};
    if (data.triggers && data.triggers.stage) {
      pushUnique({ s: matrix.stages }, 's', data.triggers.stage.min);
      pushUnique({ s: matrix.stages }, 's', data.triggers.stage.max);
    }
    if (data.triggers && data.triggers.setup && Array.isArray(data.triggers.setup.modeIn)) {
      data.triggers.setup.modeIn.forEach((mode) => matrix.modes.add(String(mode)));
    }
    if (typeof data.category === 'string' && data.category) matrix.categories.add(data.category);
    if (Array.isArray(data.tags)) data.tags.forEach((tag) => matrix.assetTags.add(String(tag)));
    if (data.learningCard && typeof data.learningCard.ref === 'string') matrix.learningRefs.add(data.learningCard.ref);
  });

  return Object.freeze({
    counts: Object.freeze(matrix.counts),
    stages: Object.freeze(Array.from(matrix.stages.values()).sort()),
    modes: Object.freeze(Array.from(matrix.modes.values()).sort()),
    categories: Object.freeze(Array.from(matrix.categories.values()).sort()),
    assetTags: Object.freeze(Array.from(matrix.assetTags.values()).sort()),
    learningRefs: Object.freeze(Array.from(matrix.learningRefs.values()).sort())
  });
}

module.exports = Object.freeze({
  buildCatalogCoverageMatrix
});
