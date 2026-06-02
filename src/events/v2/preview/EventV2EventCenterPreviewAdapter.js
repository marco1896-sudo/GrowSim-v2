'use strict';

const { createPreviewDataset } = require('./EventV2PreviewModel.js');

function normalizeEnvironment(value) {
  if (value === 'indoor' || value === 'outdoor' || value === 'shared') return value;
  return 'shared';
}

function humanizeEventId(eventId) {
  return String(eventId || 'unknown_event')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toReadableTitle(previewItem) {
  if (!previewItem) return 'Unknown Event';
  const fallback = humanizeEventId(previewItem.eventId);
  if (!previewItem.titleKey) return fallback;
  const parts = String(previewItem.titleKey).split('.');
  const lastPart = parts[parts.length - 1] || '';
  if (!lastPart || lastPart === 'title') return fallback;
  return humanizeEventId(lastPart);
}

function createPreviewCard(previewItem) {
  const imageSrc = previewItem.previewImagePath || previewItem.coverSrc || previewItem.coverFallback || '';
  return {
    id: previewItem.eventId || 'unknown_event',
    title: toReadableTitle(previewItem),
    subtitle: previewItem.titleKey || '',
    category: previewItem.category || 'unknown',
    environment: normalizeEnvironment(previewItem.family),
    severity: previewItem.severity || 'unknown',
    revisionStatus: previewItem.revisionStatus || 'unknown',
    imageSrc: imageSrc,
    imageFallback: previewItem.coverFallback || 'assets/events/event-stress-recovery.png',
    sourceCandidate: previewItem.sourcePath || null,
    assetStatus: previewItem.status || 'unknown',
    previewReady: Boolean(previewItem.previewExists),
    tags: [previewItem.category || 'unknown', normalizeEnvironment(previewItem.family), previewItem.revisionStatus || 'unknown'],
    debug: {
      previewImageSource: previewItem.previewImageSource || 'unknown',
      assetRefHero: previewItem.assetRefHero || null,
      coverSrc: previewItem.coverSrc || null,
      coverFallback: previewItem.coverFallback || null,
      previewStatus: previewItem.previewStatus || 'unknown',
    },
  };
}

function createEventCenterPreviewItems(previewDataset) {
  const list = Array.isArray(previewDataset) ? previewDataset : [];
  return list.map(createPreviewCard);
}

function createEventCenterPreviewItemsFromCatalogEntries(catalogEntries, options) {
  const entries = Array.isArray(catalogEntries) ? catalogEntries : [];
  const dataset = createPreviewDataset(entries, options || {});
  return createEventCenterPreviewItems(dataset);
}

module.exports = Object.freeze({
  createEventCenterPreviewItems,
  createEventCenterPreviewItemsFromCatalogEntries,
});
