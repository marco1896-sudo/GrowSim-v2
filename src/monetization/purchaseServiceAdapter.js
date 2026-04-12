(function initGrowSimPurchaseServiceAdapter(global) {
  const DEFAULT_CONFIG = Object.freeze({
    debugCoinPurchaseEnabled: false,
    provider: 'none'
  });

  function readConfig() {
    const runtimeConfig = global.GROWSIM_COIN_PURCHASE_CONFIG;
    if (runtimeConfig && typeof runtimeConfig === 'object') {
      return {
        ...DEFAULT_CONFIG,
        ...runtimeConfig
      };
    }
    return { ...DEFAULT_CONFIG };
  }

  function getPurchaseMode() {
    const config = readConfig();
    return config.debugCoinPurchaseEnabled ? 'debug_fake' : 'disabled';
  }

  function canPurchaseCoinPacks() {
    return getPurchaseMode() === 'debug_fake';
  }

  async function purchaseCoinPack(pack, context = {}) {
    const safePack = pack && typeof pack === 'object' ? pack : null;
    if (!safePack || !safePack.id) {
      return {
        ok: false,
        reason: 'invalid_pack',
        mode: getPurchaseMode()
      };
    }

    const mode = getPurchaseMode();
    if (mode !== 'debug_fake') {
      return {
        ok: false,
        reason: 'purchase_disabled',
        mode
      };
    }

    return {
      ok: true,
      reason: 'debug_fake_success',
      mode,
      packId: String(safePack.id),
      coins: Math.max(0, Math.trunc(Number(safePack.coins) || 0)),
      context: context && typeof context === 'object' ? { ...context } : {}
    };
  }

  global.GrowSimPurchaseService = Object.freeze({
    getPurchaseMode,
    canPurchaseCoinPacks,
    purchaseCoinPack,
    readConfig
  });
})(window);
