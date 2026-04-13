'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(ROOT, 'storage.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function getFunctionBody(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  assert(start >= 0, `Missing function ${functionName}`);

  const argsOpenIndex = source.indexOf('(', start);
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

assert(
  indexSource.includes('id="insufficientCoinsSheet"'),
  'Insufficient coins sheet shell should exist in index.html'
);
for (const id of [
  'insufficientCoinsCurrentValue',
  'insufficientCoinsRequiredValue',
  'insufficientCoinsMissingValue',
  'insufficientCoinsOpenShopBtn',
  'insufficientCoinsCancelBtn'
]) {
  assert(indexSource.includes(`id="${id}"`), `Missing insufficient coins node: ${id}`);
}

assert(
  appSource.includes('function openInsufficientCoinsFlow('),
  'App runtime should expose a centralized insufficient coins flow entry'
);
assert(
  appSource.includes("openSheet('insufficientCoins')"),
  'Central insufficient coins flow should open the dedicated sheet'
);
assert(
  appSource.includes('openInsufficientCoinsFlow({'),
  'Reward action runtime should route blocked coin costs through the central flow'
);
assert(
  appSource.includes("openSheet('coinShop');"),
  'Insufficient coins sheet should route primary CTA into existing coin shop flow'
);

const renderInsufficientBody = getFunctionBody(appSource, 'renderInsufficientCoinsSheet');
assert(
  renderInsufficientBody.includes('const showRewarded = rewardedOption.available;'),
  'Rewarded CTA must be gated by actual provider availability'
);
assert(
  renderInsufficientBody.includes("rewardedBtn.classList.toggle('hidden', !showRewarded);"),
  'Rewarded CTA should be hidden when unavailable'
);

assert(
  storageSource.includes("validSheets.add('insufficientCoins');"),
  'Storage normalization should accept insufficientCoins sheet state'
);

const uiRenderSheetsBody = getFunctionBody(uiSource, 'renderSheets');
assert(
  uiRenderSheetsBody.includes("toggleSheet(ui.insufficientCoinsSheet, activeSheet === 'insufficientCoins');"),
  'UI fallback renderSheets must toggle insufficient coins sheet'
);

console.log('insufficient-coins-flow-runtime.test.js passed');
