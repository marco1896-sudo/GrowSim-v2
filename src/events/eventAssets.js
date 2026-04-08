'use strict';

(function initEventAssetsModule(globalScope) {
  const DEFAULT_PLACEHOLDER = Object.freeze({
    kind: 'placeholder',
    assetId: 'placeholder',
    src: null,
    alt: 'Ereignisplatzhalter',
    label: 'Platzhalter',
    badge: null,
    fallbackOrigin: 'generic_placeholder',
    title: 'Event Visual',
    subtitle: 'Kein spezifisches Motiv verfügbar.',
    devNotes: []
  });

  let draftRegistry = null;
  let gapList = null;
  let registryLoadPromise = null;
  let gapLoadPromise = null;

  function clonePlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...value }
      : {};
  }

  function normalizeAssetKind(value) {
    const kind = String(value || '').trim().toLowerCase();
    if (kind === 'image' || kind === 'icon' || kind === 'placeholder') {
      return kind;
    }
    return 'placeholder';
  }

  function setDraftRegistry(registry) {
    draftRegistry = registry && typeof registry === 'object' ? registry : null;
    return draftRegistry;
  }

  function setGapListDraft(payload) {
    gapList = payload && typeof payload === 'object' ? payload : null;
    return gapList;
  }

  function getDraftRegistry() {
    return draftRegistry;
  }

  function getGapListDraft() {
    return gapList;
  }

  function describeContract() {
    return Object.freeze({
      phase: 'ui-shadow-integration',
      responsibility: 'explicit registry-backed event media model resolution for popup/detail/event-center presentation',
      mediaKinds: ['image', 'icon', 'placeholder']
    });
  }

  function ensureRegistryLoaded() {
    if (draftRegistry) {
      return Promise.resolve(draftRegistry);
    }
    if (registryLoadPromise) {
      return registryLoadPromise;
    }

    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try {
        registryLoadPromise = Promise.resolve(require('../../data/event-assets.registry.json'))
          .then((payload) => {
            setDraftRegistry(payload);
            return draftRegistry;
          });
        return registryLoadPromise;
      } catch (error) {
        return Promise.resolve(null);
      }
    }

    if (typeof fetch !== 'function') {
      return Promise.resolve(null);
    }

    registryLoadPromise = fetch('data/event-assets.registry.json')
      .then((response) => (response && response.ok ? response.json() : null))
      .then((payload) => {
        setDraftRegistry(payload);
        return draftRegistry;
      })
      .catch(() => null);

    return registryLoadPromise;
  }

  function ensureGapListLoaded() {
    if (gapList) {
      return Promise.resolve(gapList);
    }
    if (gapLoadPromise) {
      return gapLoadPromise;
    }

    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try {
        gapLoadPromise = Promise.resolve(require('../../data/event-assets.gaps.json'))
          .then((payload) => {
            setGapListDraft(payload);
            return gapList;
          });
        return gapLoadPromise;
      } catch (error) {
        return Promise.resolve(null);
      }
    }

    if (typeof fetch !== 'function') {
      return Promise.resolve(null);
    }

    gapLoadPromise = fetch('data/event-assets.gaps.json')
      .then((response) => (response && response.ok ? response.json() : null))
      .then((payload) => {
        setGapListDraft(payload);
        return gapList;
      })
      .catch(() => null);

    return gapLoadPromise;
  }

  function getRegistrySections() {
    const registry = draftRegistry && typeof draftRegistry === 'object' ? draftRegistry : {};
    return {
      assets: registry.assets && typeof registry.assets === 'object' ? registry.assets : {},
      eventMappings: registry.eventMappings && typeof registry.eventMappings === 'object' ? registry.eventMappings : {},
      categoryFallbacks: registry.categoryFallbacks && typeof registry.categoryFallbacks === 'object' ? registry.categoryFallbacks : {},
      placeholder: registry.placeholder && typeof registry.placeholder === 'object' ? registry.placeholder : {}
    };
  }

  function getGapEntry(eventId) {
    const safeEventId = String(eventId || '').trim();
    if (!safeEventId || !gapList || !Array.isArray(gapList.gaps)) {
      return null;
    }
    return gapList.gaps.find((entry) => entry && String(entry.eventId || '').trim() === safeEventId) || null;
  }

  function getAssetEntry(assetId) {
    const sections = getRegistrySections();
    const safeId = String(assetId || '').trim();
    if (!safeId) {
      return null;
    }
    const entry = sections.assets[safeId];
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    return {
      assetId: safeId,
      path: String(entry.path || '').trim(),
      assetKind: normalizeAssetKind(entry.assetKind),
      width: Number(entry.width || 0),
      height: Number(entry.height || 0),
      tokens: Array.isArray(entry.tokens) ? entry.tokens.map((token) => String(token || '')).filter(Boolean) : [],
      tags: Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag || '')).filter(Boolean) : []
    };
  }

  function buildBadgeFromState(input) {
    const stateTone = String(input && input.stateTone || '').trim().toLowerCase();
    const map = {
      warning: 'Warnung',
      active: 'Aktiv',
      escalating: 'Eskalation',
      escalated: 'Kritisch',
      reward: 'Belohnung',
      followup: 'Folgepfad',
      history: 'Analyse',
      resolved: 'Verlauf'
    };
    return map[stateTone] || null;
  }

  function buildFallbackOriginLabel(origin) {
    const map = {
      explicit_event_mapping: 'Event Visual',
      category_fallback: 'Kategorie Visual',
      generic_placeholder: 'Standard Visual',
      legacy_active_image: 'Legacy Bild'
    };
    return map[String(origin || '')] || 'Event Visual';
  }

  function buildTitleParts(input) {
    const title = String(input && input.title || input && input.eventTitle || 'Event').trim() || 'Event';
    const category = String(input && input.category || 'generic').trim();
    return {
      title,
      subtitle: category && category !== 'generic'
        ? `${buildFallbackOriginLabel(input && input.fallbackOrigin)} · ${category}`
        : buildFallbackOriginLabel(input && input.fallbackOrigin)
    };
  }

  function pickMappedAsset(mapping, fallbackCategory, preferredKind) {
    const sections = getRegistrySections();
    const kind = normalizeAssetKind(preferredKind === 'icon' ? 'icon' : 'image');
    const fallback = sections.categoryFallbacks[String(fallbackCategory || 'generic')] || sections.categoryFallbacks.generic || {};
    const placeholder = sections.placeholder || {};

    const primaryAssetId = kind === 'icon'
      ? String(mapping && mapping.primaryIcon || '').trim()
      : String(mapping && mapping.primaryImage || '').trim();
    if (primaryAssetId) {
      const asset = getAssetEntry(primaryAssetId);
      if (asset) {
        return { asset, fallbackOrigin: 'explicit_event_mapping' };
      }
    }

    const categoryAssetId = kind === 'icon'
      ? String(fallback.icon || '').trim()
      : String(fallback.image || '').trim();
    if (categoryAssetId) {
      const asset = getAssetEntry(categoryAssetId);
      if (asset) {
        return { asset, fallbackOrigin: 'category_fallback' };
      }
    }

    const placeholderAssetId = kind === 'icon'
      ? String(placeholder.icon || '').trim()
      : String(placeholder.image || '').trim();
    if (placeholderAssetId) {
      const asset = getAssetEntry(placeholderAssetId);
      if (asset) {
        return { asset, fallbackOrigin: 'generic_placeholder' };
      }
    }

    return null;
  }

  function buildMediaModel(input) {
    const eventState = input && typeof input === 'object' ? input : {};
    const eventId = String(eventState.eventId || eventState.activeEventId || '').trim();
    const category = String(eventState.category || eventState.activeCategory || 'generic').trim().toLowerCase() || 'generic';
    const title = String(eventState.title || eventState.activeEventTitle || 'Event').trim() || 'Event';
    const preferredKind = String(eventState.preferredKind || 'image').trim().toLowerCase() === 'icon' ? 'icon' : 'image';
    const legacyImagePath = String(eventState.activeImagePath || eventState.legacyImagePath || '').trim();
    const sections = getRegistrySections();
    const mapping = eventId ? (sections.eventMappings[eventId] || null) : null;
    const preferredAsset = pickMappedAsset(mapping, mapping && mapping.fallbackCategory ? mapping.fallbackCategory : category, preferredKind)
      || pickMappedAsset(mapping, mapping && mapping.fallbackCategory ? mapping.fallbackCategory : category, preferredKind === 'image' ? 'icon' : 'image');
    const badge = buildBadgeFromState(eventState);
    const gapEntry = getGapEntry(eventId);

    if (preferredAsset && preferredAsset.asset) {
      const asset = preferredAsset.asset;
      const titleParts = buildTitleParts({
        title,
        category,
        fallbackOrigin: preferredAsset.fallbackOrigin
      });
      return {
        kind: normalizeAssetKind(asset.assetKind),
        assetId: asset.assetId,
        src: asset.path || null,
        alt: `${title} – ${asset.assetKind === 'icon' ? 'Ereignisicon' : 'Ereignisvisual'}`,
        label: buildFallbackOriginLabel(preferredAsset.fallbackOrigin),
        badge,
        fallbackOrigin: preferredAsset.fallbackOrigin,
        title: titleParts.title,
        subtitle: titleParts.subtitle,
        devNotes: gapEntry ? [String(gapEntry.reason || '')] : []
      };
    }

    if (legacyImagePath) {
      const titleParts = buildTitleParts({
        title,
        category,
        fallbackOrigin: 'legacy_active_image'
      });
      return {
        kind: 'image',
        assetId: null,
        src: legacyImagePath,
        alt: `${title} – Ereignisvisual`,
        label: 'Legacy Bild',
        badge,
        fallbackOrigin: 'legacy_active_image',
        title: titleParts.title,
        subtitle: titleParts.subtitle,
        devNotes: gapEntry ? [String(gapEntry.reason || '')] : []
      };
    }

    const titleParts = buildTitleParts({
      title,
      category,
      fallbackOrigin: 'generic_placeholder'
    });
    return {
      ...DEFAULT_PLACEHOLDER,
      badge,
      title: titleParts.title,
      subtitle: titleParts.subtitle,
      devNotes: gapEntry ? [String(gapEntry.reason || '')] : []
    };
  }

  const api = Object.freeze({
    describeContract,
    DEFAULT_PLACEHOLDER,
    setDraftRegistry,
    getDraftRegistry,
    setGapListDraft,
    getGapListDraft,
    ensureRegistryLoaded,
    ensureGapListLoaded,
    buildMediaModel,
    getAssetEntry
  });

  globalScope.GrowSimEventAssetsModule = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
