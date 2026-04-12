'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const catalogSource = fs.readFileSync(path.join(ROOT, 'src', 'monetization', 'coinPackCatalog.js'), 'utf8');
const adapterSource = fs.readFileSync(path.join(ROOT, 'src', 'monetization', 'purchaseServiceAdapter.js'), 'utf8');

function bootPurchaseRuntime(config = {}) {
  const context = {
    window: {
      GROWSIM_COIN_PURCHASE_CONFIG: config
    },
    console,
    setTimeout,
    clearTimeout
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(catalogSource, context, { filename: 'coinPackCatalog.js' });
  vm.runInContext(adapterSource, context, { filename: 'purchaseServiceAdapter.js' });
  return context.window;
}

(async () => {
  const disabledWindow = bootPurchaseRuntime();
  const disabledCatalog = disabledWindow.GrowSimCoinPackCatalog;
  const disabledAdapter = disabledWindow.GrowSimPurchaseService;

  const packs = disabledCatalog.listCoinPacks();
  assert.strictEqual(packs.length, 4, 'coin catalog should expose four packs');
  assert.strictEqual(
    JSON.stringify(packs.map((pack) => pack.coins)),
    JSON.stringify([500, 1200, 3000, 7000]),
    'coin catalog should expose the agreed pack sizes'
  );
  assert.strictEqual(
    disabledCatalog.getCoinPackById('value_pack').priceLabel,
    '4,99 €',
    'value pack pricing should match the product spec'
  );
  assert.strictEqual(disabledAdapter.getPurchaseMode(), 'disabled', 'purchase adapter should default to disabled');
  const disabledResult = await disabledAdapter.purchaseCoinPack(packs[0], { source: 'test' });
  assert.strictEqual(disabledResult.ok, false, 'disabled purchase adapter must reject purchases');

  const debugWindow = bootPurchaseRuntime({ debugCoinPurchaseEnabled: true });
  const debugCatalog = debugWindow.GrowSimCoinPackCatalog;
  const debugAdapter = debugWindow.GrowSimPurchaseService;
  assert.strictEqual(debugAdapter.getPurchaseMode(), 'debug_fake', 'debug flag should enable fake purchases');
  const debugResult = await debugAdapter.purchaseCoinPack(debugCatalog.getCoinPackById('value_pack'), { source: 'test' });
  assert.strictEqual(debugResult.ok, true, 'debug purchases should resolve successfully');
  assert.strictEqual(debugResult.mode, 'debug_fake', 'debug purchase mode should be reported explicitly');

  console.log('coin-pack-catalog-adapter.test.js passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
