'use strict';

(function initEventV2PreviewGallery(globalScope) {
  function normalizeImageSrc(input) {
    const src = typeof input === 'string' ? input.trim() : '';
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('/') || src.startsWith('../')) {
      return src;
    }
    if (src.startsWith('assets/')) {
      return '../' + src;
    }
    return src;
  }

  function createFilterState() {
    return {
      mode: 'preview',
      revisionStatus: 'all',
      feedStatus: 'all',
      environment: 'all',
      fixtureId: 'all',
    };
  }

  function filterItems(items, filters) {
    const list = Array.isArray(items) ? items : [];
    return list.filter((item) => {
      const revisionOk = filters.mode === 'shadow'
        ? true
        : (filters.revisionStatus === 'all' || item.revisionStatus === filters.revisionStatus);
      const feedOk = filters.mode === 'shadow'
        ? (filters.feedStatus === 'all' || item.feedStatus === filters.feedStatus)
        : true;
      const envOk = filters.environment === 'all' || item.environment === filters.environment;
      const fixtureOk = filters.mode === 'candidate'
        ? (filters.fixtureId === 'all' || item.fixtureId === filters.fixtureId)
        : true;
      return revisionOk && feedOk && envOk && fixtureOk;
    });
  }

  function renderCard(item) {
    const safeTitle = item.title || item.id || 'unknown';
    const safeSubtitle = item.subtitle || '';
    const safeCategory = item.category || 'unknown';
    const safeEnvironment = item.environment || 'shared';
    const safeRevision = item.revisionStatus || 'unknown';
    const safeImage = normalizeImageSrc(item.imageSrc || item.imageFallback || '');
    const ready = item.previewReady ? 'ready' : 'missing';
    const safeFeedStatus = item.feedStatus || 'n/a';
    const safeRank = Number.isFinite(Number(item.rank)) ? Number(item.rank) : null;
    const safeScore = Number.isFinite(Number(item.score)) ? Number(item.score) : null;
    const safeReason = item.reason || '';
    const safeActivationStatus = item.activationStatus || '';
    const fixtureLabel = item.fixtureLabel || item.fixtureId || '';
    const watchTokens = Array.isArray(item.watchpoints) ? item.watchpoints : [];
    const watchText = watchTokens.join(', ');
    const gameplaySafe = item.canActivateGameplay === false ? 'false' : String(item.canActivateGameplay);
    const stateSafe = item.canMutateState === false ? 'false' : String(item.canMutateState);
    const saveSafe = item.canMutateSave === false ? 'false' : String(item.canMutateSave);
    const runtimeWriteSafe = item.runtimeWriteEnabled === false ? 'false' : String(item.runtimeWriteEnabled);
    const prodSafe = item.productionEnabled === false ? 'false' : String(item.productionEnabled);

    const fixtureAttr = item.fixtureId ? ' data-fixture-id="' + String(item.fixtureId) + '"' : '';
    const itemAttr = item.id ? ' data-item-id="' + String(item.id) + '"' : '';
    return (
      '<article class="event-v2-preview-card"' + fixtureAttr + itemAttr + '>' +
      '<img class="event-v2-preview-image" src="' + safeImage + '" alt="' + safeTitle + '">' +
      '<div class="event-v2-preview-content">' +
      '<h3 class="event-v2-preview-title">' + safeTitle + '</h3>' +
      '<p class="event-v2-preview-subtitle">' + safeSubtitle + '</p>' +
      '<p class="event-v2-preview-meta">' + item.id + ' | ' + safeCategory + ' | ' + safeEnvironment + '</p>' +
      '<p class="event-v2-preview-meta">revision: ' + safeRevision + ' | status: ' + ready + '</p>' +
      '<p class="event-v2-preview-meta">feed: ' + safeFeedStatus + '</p>' +
      (fixtureLabel ? '<p class="event-v2-preview-meta">Testszenario: ' + fixtureLabel + '</p>' : '') +
      (safeRank !== null ? '<p class="event-v2-preview-meta">Rang: ' + safeRank + ' | Trefferstärke: ' + safeScore + '</p>' : '') +
      (safeReason ? '<p class="event-v2-preview-meta">Warum dieser Hinweis erscheint: ' + safeReason + '</p>' : '') +
      (safeActivationStatus ? '<p class="event-v2-preview-meta">Vorschlagskarte: ' + safeActivationStatus + '</p>' : '') +
      (safeActivationStatus === 'candidate_only' ? '<p class="event-v2-preview-meta">Vorschau: Details ansehen</p>' : '') +
      (watchText ? '<p class="event-v2-preview-meta">Beobachtungspunkt: ' + watchText + '</p>' : '') +
      '<p class="event-v2-preview-meta">gameplay: ' + gameplaySafe + ' | state: ' + stateSafe + ' | save: ' + saveSafe + '</p>' +
      '<p class="event-v2-preview-meta">runtimeWrite: ' + runtimeWriteSafe + ' | production: ' + prodSafe + '</p>' +
      '</div>' +
      '</article>'
    );
  }

  function renderInto(root, items, filters) {
    if (!root) return;
    const visible = filterItems(items, filters);
    const cards = visible.map(renderCard).join('');
    root.innerHTML = cards || '<p class="event-v2-preview-empty">Keine Preview-Items fuer die aktuelle Filterung.</p>';
  }

  function mount(selector, items) {
    const root = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!root) {
      return { ok: false, reason: 'missing_root' };
    }

    const filters = createFilterState();
    const state = { items: Array.isArray(items) ? items : [], filters: filters };
    renderInto(root, state.items, state.filters);

    return {
      ok: true,
      setRevisionStatus(value) {
        state.filters.revisionStatus = value || 'all';
        renderInto(root, state.items, state.filters);
      },
      setFeedStatus(value) {
        state.filters.feedStatus = value || 'all';
        renderInto(root, state.items, state.filters);
      },
      setEnvironment(value) {
        state.filters.environment = value || 'all';
        renderInto(root, state.items, state.filters);
      },
      setMode(value) {
        if (value === 'shadow' || value === 'candidate') {
          state.filters.mode = value;
        } else {
          state.filters.mode = 'preview';
        }
        renderInto(root, state.items, state.filters);
      },
      setFixtureId(value) {
        state.filters.fixtureId = value || 'all';
        renderInto(root, state.items, state.filters);
      },
      setItems(nextItems) {
        state.items = Array.isArray(nextItems) ? nextItems : [];
        renderInto(root, state.items, state.filters);
      },
      getState() {
        return {
          count: state.items.length,
          filters: Object.assign({}, state.filters),
          visibleCount: filterItems(state.items, state.filters).length,
        };
      },
      getVisibleItems() {
        return filterItems(state.items, state.filters).slice();
      },
    };
  }

  const api = Object.freeze({
    mount,
    filterItems,
  });

  globalScope.EventV2PreviewGallery = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
