'use strict';

function buildCatalogIndex(parsedExamples) {
  const byKind = {
    event: [],
    chain: [],
    'learning-card': [],
    unknown: []
  };

  parsedExamples.forEach((entry) => {
    const kind = byKind[entry.kind] ? entry.kind : 'unknown';
    byKind[kind].push(entry);
  });

  const byId = Object.create(null);
  parsedExamples.forEach((entry) => {
    const id = entry && entry.data && typeof entry.data.id === 'string' ? entry.data.id : null;
    if (id && !byId[id]) {
      byId[id] = entry;
    }
  });

  return Object.freeze({
    total: parsedExamples.length,
    byId: Object.freeze(byId),
    byKind: Object.freeze({
      event: Object.freeze(byKind.event.slice()),
      chain: Object.freeze(byKind.chain.slice()),
      'learning-card': Object.freeze(byKind['learning-card'].slice()),
      unknown: Object.freeze(byKind.unknown.slice())
    })
  });
}

module.exports = Object.freeze({
  buildCatalogIndex
});
