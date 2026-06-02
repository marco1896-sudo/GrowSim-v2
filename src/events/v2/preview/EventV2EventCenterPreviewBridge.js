'use strict';

function toBridgeStatus(feedStatus) {
  if (feedStatus === 'shadow_feed_blocked') return 'event_center_preview_bridge_blocked';
  if (feedStatus === 'shadow_feed_watch_asset' || feedStatus === 'shadow_feed_polish_later') {
    return 'event_center_preview_bridge_ready_with_watch';
  }
  return 'event_center_preview_bridge_ready';
}

function toBridgeItem(feedItem, index) {
  const item = feedItem && typeof feedItem === 'object' ? feedItem : {};
  return {
    id: item.id || `event-v2-ec-preview-${index + 1}`,
    eventId: item.eventId || 'unknown_event',
    title: item.title || item.eventId || 'unknown_event',
    subtitle: item.revisionStatus || 'unknown',
    description: item.feedStatus || 'shadow_feed_unknown',
    category: item.category || 'unknown',
    environment: item.environment || 'shared',
    severity: item.severity || 'unknown',
    imageSrc: item.imageSrc || '',
    imageFallback: item.imageFallback || 'assets/events/event-stress-recovery.png',
    feedStatus: item.feedStatus || 'shadow_feed_unknown',
    revisionStatus: item.revisionStatus || 'unknown',
    isEventV2Preview: true,
    isShadowOnly: true,
    canActivateGameplay: false,
    canMutateSave: false,
    actions: [],
    debug: {
      bridgeStatus: toBridgeStatus(item.feedStatus),
      source: item.source || 'event_v2_catalog_shadow',
      previewReady: Boolean(item && item.debug && item.debug.previewReady),
      imageExists: Boolean(item && item.debug && item.debug.imageExists),
      hasRequiredFields: Boolean(item && item.debug && item.debug.hasRequiredFields),
      sourceCandidate: item && item.debug ? item.debug.sourceCandidate || null : null,
    },
  };
}

function createEventCenterPreviewBridgeItems(shadowFeedItems) {
  const input = Array.isArray(shadowFeedItems) ? shadowFeedItems : [];
  return input.map(toBridgeItem);
}

module.exports = Object.freeze({
  createEventCenterPreviewBridgeItems,
  toBridgeStatus,
});
