#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

(function testHomeHudOrderKeepsPlayerCardAsTopAnchor() {
  const playerIdx = indexSource.indexOf('class="home-player-panel"');
  const harvestIdx = indexSource.indexOf('id="harvestForecastWidget"');
  const climateIdx = indexSource.indexOf('id="homeClimateCard"');

  assert(playerIdx !== -1, 'home player panel should exist');
  assert(harvestIdx !== -1, 'harvest mini card should exist');
  assert(climateIdx !== -1, 'home climate card should exist');
  assert(playerIdx < harvestIdx, 'player panel should stay above harvest widget in home markup');
  assert(harvestIdx < climateIdx, 'harvest widget should stay above climate card in home markup');
})();

(function testCompactPlayerCardOverrideKeepsTightVerticalSpacing() {
  const compactStart = cssSource.indexOf('/* Compact premium top module override */');
  assert(compactStart !== -1, 'compact premium override block should exist');
  const compactBlock = cssSource.slice(compactStart, compactStart + 5200);

  assert(
    compactBlock.includes('.home-player-panel {') &&
      compactBlock.includes('gap: 2px;') &&
      compactBlock.includes('padding: 5px 9px 4px;'),
    'player panel compact override should reduce vertical spacing and padding'
  );

  assert(
    compactBlock.includes('.home-player-header {') &&
      compactBlock.includes('grid-template-columns: 38px minmax(0, 1fr) auto;') &&
      compactBlock.includes('gap: 5px;'),
    'header should use a tighter avatar and column gap layout'
  );

  assert(
    compactBlock.includes('.home-meta-strip {') &&
      compactBlock.includes('min-height: 18px;') &&
      compactBlock.includes('padding: 1px 0 0;') &&
      compactBlock.includes('gap: 3px;'),
    'meta strip should remain readable while reducing reserved vertical height'
  );

  assert(
    compactBlock.includes('@media (max-width: 420px) {') &&
      compactBlock.includes('.home-player-panel {') &&
      compactBlock.includes('padding: 5px 7px 4px;') &&
      compactBlock.includes('grid-template-columns: 36px minmax(0, 1fr) auto;'),
    'mobile override should preserve compact layout on narrow screens'
  );
})();

(function testCoinPillKeepsCompactHeightInFinalEconomyOverride() {
  const coinBlockStart = cssSource.indexOf('/* Coin economy final UI overrides */');
  assert(coinBlockStart !== -1, 'coin economy final override block should exist');
  const coinBlock = cssSource.slice(coinBlockStart, coinBlockStart + 1800);

  assert(
    coinBlock.includes('.home-currency-row {') &&
      coinBlock.includes('min-height: 18px;') &&
      coinBlock.includes('padding: 2px 6px;'),
    'final coin override should keep compact currency row height'
  );
})();

console.log('home player card compactness regression test passed');
