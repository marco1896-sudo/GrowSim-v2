'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const uiSource = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

function getFunctionBody(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  assert(start >= 0, `Missing function ${functionName}`);
  const argsOpenIndex = source.indexOf('(', start);
  assert(argsOpenIndex >= 0, `Missing argument list for ${functionName}`);

  let argDepth = 0;
  let argsCloseIndex = -1;
  for (let index = argsOpenIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      argDepth += 1;
    } else if (char === ')') {
      argDepth -= 1;
      if (argDepth === 0) {
        argsCloseIndex = index;
        break;
      }
    }
  }
  assert(argsCloseIndex >= 0, `Missing closing parenthesis for ${functionName}`);

  const openBrace = source.indexOf('{', argsCloseIndex);
  assert(openBrace >= 0, `Missing opening brace for ${functionName}`);

  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openBrace + 1, index);
      }
    }
  }
  throw new Error(`Unclosed function body for ${functionName}`);
}

const uiRenderSheetsBody = getFunctionBody(uiSource, 'renderSheets');
assert(
  uiRenderSheetsBody.includes("toggleSheet(ui.coinShopSheet, activeSheet === 'coinShop');"),
  'ui fallback renderSheets should toggle the coin shop sheet'
);

assert(
  uiSource.includes("if (state && state.ui && state.ui.openSheet === 'coinShop') {"),
  'coin shop menu click should verify open-state before skipping fallback'
);
assert(
  uiSource.includes("openSheet('coinShop');"),
  'coin shop menu click should always have a direct open fallback'
);

const triggerRewardActionBody = getFunctionBody(appSource, 'triggerRewardAction');
const spendIndex = triggerRewardActionBody.indexOf('spendCoins(');
const executeIndex = triggerRewardActionBody.indexOf('executeRewardAction(');
assert(spendIndex >= 0, 'triggerRewardAction should spend coins through spendCoins');
assert(executeIndex >= 0, 'triggerRewardAction should execute reward actions');
assert(
  spendIndex < executeIndex,
  'triggerRewardAction should resolve coin spend before action execution to avoid free effects'
);
assert(
  triggerRewardActionBody.includes('reward_action_refund:'),
  'triggerRewardAction should refund spent coins when action execution fails'
);

const coinPackPurchaseBody = getFunctionBody(appSource, 'onCoinPackPurchaseClick');
assert(
  coinPackPurchaseBody.includes('Coin-Shop derzeit nicht verfügbar'),
  'coin pack purchase should provide visible feedback when purchase services are unavailable'
);

const renderCoinShopSheetBody = getFunctionBody(appSource, 'renderCoinShopSheet');
assert(
  renderCoinShopSheetBody.includes('coinUiRuntime.renderRetryQueued = true;'),
  'coin shop rendering should retry once when nodes are not ready yet'
);

console.log('coin-shop-runtime-fix.test.js passed');
