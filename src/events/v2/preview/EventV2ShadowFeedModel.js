'use strict';

function toFeedStatus(item) {
  const revision = item && item.revisionStatus ? item.revisionStatus : 'unknown';
  if (!item || !item.imageExists) return 'shadow_feed_blocked';
  if (revision === 'temporary_usable_needs_revision') return 'shadow_feed_polish_later';
  if (revision === 'usable_with_watch') return 'shadow_feed_watch_asset';
  return 'shadow_feed_ready';
}

function normalizeSeverity(value) {
  return value || 'unknown';
}

function toShadowFeedItem(item, index) {
  const feedStatus = toFeedStatus(item);
  return {
    id: 'shadow-feed-' + String(index + 1),
    eventId: item && item.id ? item.id : 'unknown_event',
    title: item && item.title ? item.title : (item && item.id ? item.id : 'unknown_event'),
    category: item && item.category ? item.category : 'unknown',
    environment: item && item.environment ? item.environment : 'shared',
    severity: normalizeSeverity(item && item.severity),
    revisionStatus: item && item.revisionStatus ? item.revisionStatus : 'unknown',
    imageSrc: item && item.imageSrc ? item.imageSrc : '',
    imageFallback: item && item.imageFallback ? item.imageFallback : 'assets/events/event-stress-recovery.png',
    feedStatus,
    source: 'event_v2_catalog_shadow',
    canActivateGameplay: false,
    canMutateSave: false,
    debug: {
      previewReady: Boolean(item && item.previewReady),
      imageExists: Boolean(item && item.imageExists),
      hasRequiredFields: Boolean(item && item.hasRequiredFields),
      adapterPreviewStatus: item && item.status ? item.status : 'unknown',
      sourceCandidate: item && item.sourceCandidate ? item.sourceCandidate : null,
      previewImageSource: item && item.debug ? item.debug.previewImageSource || null : null,
    },
  };
}

function sortDeterministically(items) {
  return items.slice().sort((a, b) => {
    const aa = String(a.eventId || '');
    const bb = String(b.eventId || '');
    return aa.localeCompare(bb);
  });
}

function filterShadowFeed(items, filters) {
  const list = Array.isArray(items) ? items : [];
  const opts = filters || {};
  return list.filter((item) => {
    const envOk = !opts.environment || opts.environment === 'all' || item.environment === opts.environment;
    const statusOk = !opts.feedStatus || opts.feedStatus === 'all' || item.feedStatus === opts.feedStatus;
    const revisionOk = !opts.revisionStatus || opts.revisionStatus === 'all' || item.revisionStatus === opts.revisionStatus;
    return envOk && statusOk && revisionOk;
  });
}

function createShadowFeed(previewItems, options) {
  const source = Array.isArray(previewItems) ? previewItems : [];
  const mapped = source.map((item, index) => toShadowFeedItem(item, index));
  const sorted = sortDeterministically(mapped);
  const opts = options || {};
  const filtered = filterShadowFeed(sorted, opts.filters || {});

  return {
    items: filtered,
    summary: {
      totalSourceItems: source.length,
      totalFeedItems: filtered.length,
      statusCounts: {
        shadow_feed_ready: filtered.filter((x) => x.feedStatus === 'shadow_feed_ready').length,
        shadow_feed_watch_asset: filtered.filter((x) => x.feedStatus === 'shadow_feed_watch_asset').length,
        shadow_feed_polish_later: filtered.filter((x) => x.feedStatus === 'shadow_feed_polish_later').length,
        shadow_feed_blocked: filtered.filter((x) => x.feedStatus === 'shadow_feed_blocked').length,
      },
      canActivateGameplayFalse: filtered.filter((x) => x.canActivateGameplay === false).length,
      canMutateSaveFalse: filtered.filter((x) => x.canMutateSave === false).length,
      deterministicOrder: true,
    },
  };
}

module.exports = Object.freeze({
  createShadowFeed,
  filterShadowFeed,
});
