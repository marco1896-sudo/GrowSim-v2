'use strict';

(function attachGrowSimBuddyCareAssets(globalScope) {
  const ASSETS = Object.freeze({
    header: 'assets/buddy/transparent/gameplay/clipboard/buddy_gameplay_clipboard_wave_v001.png',
    empty: 'assets/buddy/transparent/gameplay/waving/buddy_gameplay_wave_hello_v001.png',
    today: 'assets/buddy/transparent/gameplay/magnifier/buddy_gameplay_magnifier_leaf_inspection_v001.png',
    success: 'assets/buddy/transparent/gameplay/thumbs_up/buddy_gameplay_thumbs_up_approval_v001.png',
    attention: 'assets/buddy/transparent/gameplay/clipboard/buddy_gameplay_clipboard_concerned_checkin_v001.png'
  });

  function getBuddyCareAsset(kind) {
    const safeKind = String(kind || '').trim().toLowerCase();
    return ASSETS[safeKind] || ASSETS.header;
  }

  const api = Object.freeze({
    ASSETS,
    getBuddyCareAsset
  });

  globalScope.GrowSimBuddyCareAssets = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
