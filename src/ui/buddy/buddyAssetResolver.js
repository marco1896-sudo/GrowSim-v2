'use strict';

(function attachGrowSimBuddyAssetResolver(globalScope) {
  const MANIFEST_PATH = 'assets/buddy/transparent/buddy_asset_manifest.json';
  const DEFAULT_BUDDY_ASSET = 'assets/ui/care-studio/buddy/care-buddy-base.png';

  let manifestPromise = null;
  let manifestData = null;
  let didWarnFetchFailure = false;
  let didWarnManifestShape = false;

  const registry = createEmptyRegistry();

  function createEmptyRegistry() {
    return {
      assets: [],
      assetsById: Object.create(null),
      assetsByCategory: Object.create(null),
      assetsByState: Object.create(null),
      assetsByAction: Object.create(null),
      assetsByTag: Object.create(null)
    };
  }

  function appendVersion(path) {
    const buildId = globalScope.GrowSimBuild && globalScope.GrowSimBuild.id
      ? String(globalScope.GrowSimBuild.id)
      : '';
    if (!buildId) {
      return String(path || '');
    }
    const separator = String(path || '').includes('?') ? '&' : '?';
    return `${path}${separator}v=${encodeURIComponent(buildId)}`;
  }

  function toArray(value) {
    return Array.isArray(value) ? value : (value ? [value] : []);
  }

  function normalizeAssetPath(basePath, assetPath) {
    const safeBasePath = String(basePath || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
    const safeAssetPath = String(assetPath || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!safeAssetPath) {
      return '';
    }
    return safeBasePath ? `${safeBasePath}/${safeAssetPath}` : safeAssetPath;
  }

  function pushGrouped(group, key, asset) {
    const safeKey = String(key || '').trim().toLowerCase();
    if (!safeKey) {
      return;
    }
    if (!group[safeKey]) {
      group[safeKey] = [];
    }
    group[safeKey].push(asset);
  }

  function registerManifest(rawManifest) {
    const safeManifest = rawManifest && typeof rawManifest === 'object' ? rawManifest : {};
    const assets = Array.isArray(safeManifest.assets) ? safeManifest.assets : [];
    const nextRegistry = createEmptyRegistry();
    const basePath = String(safeManifest.basePath || '').trim();

    assets.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const id = String(entry.id || '').trim();
      const path = normalizeAssetPath(basePath, entry.path);
      if (!id || !path) {
        return;
      }
      const asset = Object.freeze({
        id,
        category: String(entry.category || '').trim().toLowerCase(),
        state: String(entry.state || '').trim().toLowerCase(),
        action: String(entry.action || '').trim().toLowerCase(),
        path,
        tags: Object.freeze(toArray(entry.tags).map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean)),
        recommendedUse: Object.freeze(toArray(entry.recommendedUse).map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)),
        confidence: String(entry.confidence || '').trim().toLowerCase()
      });
      nextRegistry.assets.push(asset);
      nextRegistry.assetsById[asset.id] = asset;
      pushGrouped(nextRegistry.assetsByCategory, asset.category, asset);
      pushGrouped(nextRegistry.assetsByState, asset.state, asset);
      pushGrouped(nextRegistry.assetsByAction, asset.action, asset);
      asset.tags.forEach((tag) => pushGrouped(nextRegistry.assetsByTag, tag, asset));
      asset.recommendedUse.forEach((tag) => pushGrouped(nextRegistry.assetsByTag, tag, asset));
    });

    manifestData = Object.freeze({
      version: Number.isFinite(Number(safeManifest.version)) ? Number(safeManifest.version) : 1,
      basePath,
      assets: Object.freeze(nextRegistry.assets.slice())
    });

    registry.assets = nextRegistry.assets;
    registry.assetsById = nextRegistry.assetsById;
    registry.assetsByCategory = nextRegistry.assetsByCategory;
    registry.assetsByState = nextRegistry.assetsByState;
    registry.assetsByAction = nextRegistry.assetsByAction;
    registry.assetsByTag = nextRegistry.assetsByTag;

    return manifestData;
  }

  async function loadBuddyAssetManifest() {
    if (manifestData) {
      return manifestData;
    }
    if (manifestPromise) {
      return manifestPromise;
    }

    manifestPromise = fetch(appendVersion(MANIFEST_PATH), { cache: 'default' })
      .then((response) => {
        if (!response || !response.ok) {
          throw new Error(`buddy_manifest_http_${response ? response.status : 'unknown'}`);
        }
        return response.json();
      })
      .then((payload) => {
        if (!payload || typeof payload !== 'object' || !Array.isArray(payload.assets)) {
          if (!didWarnManifestShape) {
            didWarnManifestShape = true;
            console.warn('[buddy-assets] Manifest is missing an assets array. Falling back to default Buddy.');
          }
          return null;
        }
        return registerManifest(payload);
      })
      .catch(() => {
        if (!didWarnFetchFailure) {
          didWarnFetchFailure = true;
          console.warn('[buddy-assets] Manifest unavailable. Falling back to default Buddy.');
        }
        return null;
      })
      .finally(() => {
        manifestPromise = null;
      });

    return manifestPromise;
  }

  function getFallbackBuddyAsset() {
    return DEFAULT_BUDDY_ASSET;
  }

  function getBuddyAssetPathById(id) {
    const safeId = String(id || '').trim();
    if (!safeId) {
      return '';
    }
    const asset = registry.assetsById[safeId];
    return asset ? asset.path : '';
  }

  function dedupeAssets(assets) {
    const seen = new Set();
    return assets.filter((asset) => {
      if (!asset || !asset.id || seen.has(asset.id)) {
        return false;
      }
      seen.add(asset.id);
      return true;
    });
  }

  function collectAssetsByTag(tags) {
    const matches = [];
    toArray(tags).forEach((tag) => {
      const safeTag = String(tag || '').trim().toLowerCase();
      if (!safeTag) {
        return;
      }
      toArray(registry.assetsByTag[safeTag]).forEach((asset) => matches.push(asset));
    });
    return matches;
  }

  function findAssets(criteria = {}) {
    const safeCriteria = criteria && typeof criteria === 'object' ? criteria : {};
    const matches = [];

    if (safeCriteria.assetId) {
      const asset = registry.assetsById[String(safeCriteria.assetId || '').trim()];
      if (asset) {
        matches.push(asset);
      }
    }

    toArray(safeCriteria.assetIds).forEach((assetId) => {
      const asset = registry.assetsById[String(assetId || '').trim()];
      if (asset) {
        matches.push(asset);
      }
    });

    if (safeCriteria.category) {
      toArray(registry.assetsByCategory[String(safeCriteria.category || '').trim().toLowerCase()]).forEach((asset) => matches.push(asset));
    }

    if (safeCriteria.state) {
      toArray(registry.assetsByState[String(safeCriteria.state || '').trim().toLowerCase()]).forEach((asset) => matches.push(asset));
    }

    if (safeCriteria.action) {
      toArray(registry.assetsByAction[String(safeCriteria.action || '').trim().toLowerCase()]).forEach((asset) => matches.push(asset));
    }

    collectAssetsByTag(safeCriteria.tags).forEach((asset) => matches.push(asset));
    return dedupeAssets(matches);
  }

  function resolveMappedCandidates(context = {}) {
    const visualMap = globalScope.GrowSimBuddyVisualMap;
    if (!visualMap || typeof visualMap.resolveBuddyVisualCandidates !== 'function') {
      return { candidateIds: [] };
    }
    return visualMap.resolveBuddyVisualCandidates(context);
  }

  function resolveBuddyAsset(context = {}) {
    if (!manifestData && !manifestPromise) {
      loadBuddyAssetManifest();
    }

    const safeContext = context && typeof context === 'object' ? context : {};
    const mapped = resolveMappedCandidates(safeContext);
    const directMatches = findAssets({
      assetId: safeContext.assetId,
      assetIds: mapped.candidateIds,
      category: safeContext.category,
      state: safeContext.state,
      action: safeContext.action,
      tags: safeContext.tags
    });

    if (directMatches[0] && directMatches[0].path) {
      return directMatches[0].path;
    }

    const fallbackAssetId = String(mapped.fallbackAssetId || '').trim();
    const fallbackPath = fallbackAssetId ? getBuddyAssetPathById(fallbackAssetId) : '';
    return fallbackPath || getFallbackBuddyAsset();
  }

  const api = Object.freeze({
    MANIFEST_PATH,
    loadBuddyAssetManifest,
    resolveBuddyAsset,
    getBuddyAssetPathById,
    getFallbackBuddyAsset,
    findAssets
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.GrowSimBuddyAssets = api;
  loadBuddyAssetManifest();
})((typeof window !== 'undefined') ? window : globalThis);
