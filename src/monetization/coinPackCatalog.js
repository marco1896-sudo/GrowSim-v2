(function initGrowSimCoinPackCatalog(global) {
  const PACKS = Object.freeze([
    Object.freeze({
      id: 'small_pack',
      title: 'Small Pack',
      coins: 500,
      priceEur: 0.99,
      priceLabel: '0,99 €',
      badge: '',
      highlight: false
    }),
    Object.freeze({
      id: 'starter_pack',
      title: 'Starter',
      coins: 1200,
      priceEur: 1.99,
      priceLabel: '1,99 €',
      badge: '',
      highlight: false
    }),
    Object.freeze({
      id: 'value_pack',
      title: 'Value Pack',
      coins: 3000,
      priceEur: 4.99,
      priceLabel: '4,99 €',
      badge: 'Best Value',
      highlight: true
    }),
    Object.freeze({
      id: 'big_pack',
      title: 'Big Pack',
      coins: 7000,
      priceEur: 9.99,
      priceLabel: '9,99 €',
      badge: '',
      highlight: false
    })
  ]);

  function listCoinPacks() {
    return PACKS.slice();
  }

  function getCoinPackById(id) {
    const safeId = String(id || '').trim();
    return PACKS.find((entry) => entry.id === safeId) || null;
  }

  global.GrowSimCoinPackCatalog = Object.freeze({
    listCoinPacks,
    getCoinPackById
  });
})(window);
