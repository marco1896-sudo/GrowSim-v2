'use strict';

(function initEventV2AssetResolver(globalScope) {
  function normalizeDevAssetPath(src) {
    if (typeof src !== 'string' || src.length === 0) return src;
    if (src.indexOf('assets/') === 0) return '../' + src;
    return src;
  }

  function resolveHeroAsset(eventDoc, options) {
    const placeholder = (options && options.placeholder) || 'assets/events/event-stress-recovery.png';
    const assetRefs = eventDoc && eventDoc.assetRefs ? eventDoc.assetRefs : {};
    const cover = eventDoc && eventDoc.assets && eventDoc.assets.cover ? eventDoc.assets.cover : {};
    const heroSrc = assetRefs.hero || cover.src || cover.fallback || placeholder;
    const fallbackSrc = cover.fallback || placeholder;
    const altKey = cover.altKey || null;
    const sourceType = assetRefs.hero ? 'assetRefs.hero' : (cover.src ? 'assets.cover.src' : (cover.fallback ? 'assets.cover.fallback' : 'placeholder'));

    return {
      src: heroSrc,
      srcNormalized: normalizeDevAssetPath(heroSrc),
      fallbackSrc,
      fallbackNormalized: normalizeDevAssetPath(fallbackSrc),
      altKey,
      hasHero: Boolean(assetRefs.hero || cover.src),
      usedFallback: !(assetRefs.hero || cover.src),
      usesAssetRefHero: Boolean(assetRefs.hero),
      sourceType
    };
  }

  const api = Object.freeze({
    normalizeDevAssetPath,
    resolveHeroAsset
  });

  globalScope.EventV2AssetResolver = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
