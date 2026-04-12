'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(ROOT, 'storage.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const missionCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'missions.json'), 'utf8'));

for (const apiName of [
  'function grantCoins(',
  'function spendCoins(',
  'function canAfford(',
  'function getCoins(',
  'function ensureCurrencyState(',
  'function emitCoinTelemetry('
]) {
  assert(appSource.includes(apiName), `Missing central coin API member: ${apiName}`);
}

assert(
  appSource.includes("type: 'coin_grant'"),
  'grantCoins should emit coin_grant telemetry'
);
assert(
  appSource.includes("type: 'coin_spend'"),
  'spendCoins should emit coin_spend telemetry'
);
assert(
  appSource.includes("type: 'coin_spend_blocked'"),
  'blocked spends should emit coin_spend_blocked telemetry'
);
assert(
  appSource.includes("type: 'coin_pack_attempt'") && appSource.includes("type: 'coin_pack_success'"),
  'coin pack purchase flow should emit attempt and success telemetry'
);
assert(
  appSource.includes("openSheet('coinShop')"),
  'insufficient coin flows should be able to open the coin shop'
);

assert(
  storageSource.includes('function ensureStorageCurrencyState('),
  'storage should normalize currency state during restore and integrity passes'
);
assert(
  storageSource.includes("validSheets.add('coinShop')"),
  'storage should preserve the coin shop sheet as a valid UI state'
);

assert(
  indexSource.includes('id="coinShopSheet"') && indexSource.includes('id="menuCoinShopBtn"'),
  'coin shop UI shell should exist in the document'
);
assert(
  !indexSource.includes('playerGemValue') && !indexSource.includes('playerStarValue'),
  'legacy gem/star HUD fields should be removed from the document'
);

for (const mission of missionCatalog) {
  const reward = mission && mission.reward ? mission.reward : {};
  assert(!Object.prototype.hasOwnProperty.call(reward, 'gems'), `Mission ${mission.id} still grants gems`);
  assert(!Object.prototype.hasOwnProperty.call(reward, 'stars'), `Mission ${mission.id} still grants stars`);
}

console.log('coin-economy-source-regression.test.js passed');
