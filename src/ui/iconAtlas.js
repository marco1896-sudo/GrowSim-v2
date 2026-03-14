/* global window */
(function () {
  'use strict';

  const ICON_ATLAS_JSON = 'assets/sprites/ui_icon_sheet.json';
  const ICON_ATLAS_IMAGE_PRIMARY = 'assets/sprites/ui_icon_sheet.webp';
  const ICON_ATLAS_IMAGE_FALLBACK = 'assets/sprites/ui_icon_sheet.png';

  const atlasState = {
    ready: false,
    loading: null,
    data: null,
    image: null,
  };

  async function loadAtlas() {
    if (atlasState.ready) return atlasState;
    if (atlasState.loading) return atlasState.loading;

    atlasState.loading = (async () => {
      const jsonResp = await fetch(ICON_ATLAS_JSON, { cache: 'no-cache' });
      if (!jsonResp.ok) {
        throw new Error(`Failed to load icon atlas JSON: ${jsonResp.status}`);
      }
      const data = await jsonResp.json();
      const img = new Image();
      img.decoding = 'async';
      try {
        img.src = ICON_ATLAS_IMAGE_PRIMARY;
        await img.decode();
      } catch (_primaryError) {
        img.src = ICON_ATLAS_IMAGE_FALLBACK;
        await img.decode();
      }

      atlasState.data = data;
      atlasState.image = img;
      atlasState.ready = true;
      return atlasState;
    })();

    return atlasState.loading;
  }

  function resolveIconRect(iconName) {
    if (!atlasState.data || !atlasState.data.icons) return null;
    const icons = atlasState.data.icons;
    if (icons[iconName]) return icons[iconName];

    const aliases = atlasState.data.meta && atlasState.data.meta.aliases ? atlasState.data.meta.aliases : {};
    const mapped = aliases[iconName];
    if (mapped && icons[mapped]) return icons[mapped];
    return null;
  }

  function drawIcon(ctx, iconName, x, y, size) {
    if (!ctx || !iconName || !atlasState.ready) return false;
    const rect = resolveIconRect(iconName);
    if (!rect) return false;
    const drawSize = Number.isFinite(size) ? size : rect.w;
    ctx.drawImage(
      atlasState.image,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      x,
      y,
      drawSize,
      drawSize
    );
    return true;
  }

  window.GrowSimIconAtlas = {
    loadAtlas,
    drawIcon,
  };
})();
