'use strict';

const path = require('path');

function normalizeFamily(eventDoc, sourcePath) {
  if (eventDoc && Array.isArray(eventDoc.tags)) {
    if (eventDoc.tags.includes('mode_indoor')) return 'indoor';
    if (eventDoc.tags.includes('mode_outdoor')) return 'outdoor';
  }
  if (typeof sourcePath === 'string') {
    if (sourcePath.includes('/events/indoor/')) return 'indoor';
    if (sourcePath.includes('/events/outdoor/')) return 'outdoor';
    if (sourcePath.includes('/events/shared/')) return 'shared';
  }
  return 'shared';
}

function pickPreviewPath(eventDoc, placeholderPath) {
  const placeholder = placeholderPath || 'assets/events/event-stress-recovery.png';
  const assetRefs = eventDoc && eventDoc.assetRefs ? eventDoc.assetRefs : {};
  const cover = eventDoc && eventDoc.assets && eventDoc.assets.cover ? eventDoc.assets.cover : {};

  if (typeof assetRefs.hero === 'string' && assetRefs.hero.trim()) {
    return { path: assetRefs.hero, source: 'assetRefs.hero' };
  }
  if (typeof cover.src === 'string' && cover.src.trim()) {
    return { path: cover.src, source: 'assets.cover.src' };
  }
  if (typeof cover.fallback === 'string' && cover.fallback.trim()) {
    return { path: cover.fallback, source: 'assets.cover.fallback' };
  }
  return { path: placeholder, source: 'placeholder' };
}

function createEventPreviewModel(eventDoc, options) {
  const opts = options || {};
  const sourcePath = opts.sourcePath || null;
  const preview = pickPreviewPath(eventDoc, opts.placeholderPath);

  return {
    eventId: eventDoc && eventDoc.id ? eventDoc.id : null,
    titleKey: eventDoc && eventDoc.title && eventDoc.title.key ? eventDoc.title.key : null,
    category: eventDoc && eventDoc.category ? eventDoc.category : 'unknown',
    family: normalizeFamily(eventDoc, sourcePath),
    severity: eventDoc && eventDoc.severity && eventDoc.severity.level ? eventDoc.severity.level : 'unknown',
    coverSrc: eventDoc && eventDoc.assets && eventDoc.assets.cover ? eventDoc.assets.cover.src || null : null,
    coverFallback: eventDoc && eventDoc.assets && eventDoc.assets.cover ? eventDoc.assets.cover.fallback || null : null,
    assetRefHero: eventDoc && eventDoc.assetRefs ? eventDoc.assetRefs.hero || null : null,
    assetRefFallback: eventDoc && eventDoc.assetRefs ? eventDoc.assetRefs.fallback || null : null,
    revisionStatus: eventDoc && eventDoc.assetRefs ? eventDoc.assetRefs.revisionStatus || null : null,
    status: eventDoc && eventDoc.assetRefs ? eventDoc.assetRefs.status || null : null,
    previewImagePath: preview.path,
    previewImageSource: preview.source,
    sourcePath: sourcePath,
  };
}

function createPreviewDataset(eventDocs, options) {
  const docs = Array.isArray(eventDocs) ? eventDocs : [];
  return docs.map((entry) => createEventPreviewModel(entry.eventDoc, {
    sourcePath: entry.sourcePath,
    placeholderPath: options && options.placeholderPath,
  }));
}

module.exports = Object.freeze({
  createEventPreviewModel,
  createPreviewDataset,
});
