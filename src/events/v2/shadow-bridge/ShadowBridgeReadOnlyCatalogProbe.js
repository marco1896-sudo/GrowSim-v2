'use strict';

(function initShadowBridgeReadOnlyCatalogProbe(globalScope) {
  const fs = typeof require !== 'undefined' ? require('fs') : null;
  const path = typeof require !== 'undefined' ? require('path') : null;

  function countJsonFiles(dir, suffix) {
    if (!fs || !path || !fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter((name) => name.endsWith(suffix)).length;
  }

  function runReadOnlyCatalogProbe(options) {
    const projectRoot = options && options.projectRoot ? options.projectRoot : process.cwd();
    const catalogRoot = path.join(projectRoot, 'data', 'events', 'catalog');
    const eventDirs = ['indoor', 'outdoor', 'shared'];

    const eventCounts = eventDirs.reduce((acc, dirName) => {
      acc[dirName] = countJsonFiles(path.join(catalogRoot, 'events', dirName), '.event.json');
      return acc;
    }, {});

    const eventsFound = Object.keys(eventCounts).reduce((sum, key) => sum + eventCounts[key], 0);
    const learningCardsFound = countJsonFiles(path.join(catalogRoot, 'learning-cards'), '.learning-card.json');

    return {
      ok: eventsFound >= 12 && learningCardsFound >= 3,
      probe: 'read_only_catalog',
      catalogRoot,
      eventCounts,
      eventsFound,
      learningCardsFound,
      wroteFiles: false,
      mutatedData: false
    };
  }

  const api = Object.freeze({
    runReadOnlyCatalogProbe
  });

  globalScope.ShadowBridgeReadOnlyCatalogProbe = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

