#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

(function testHomeHudOrderKeepsPlayerCardAsTopAnchor() {
  const playerIdx = indexSource.indexOf('class="home-player-panel player-card premium-playercard"');
  const harvestIdx = indexSource.indexOf('id="harvestForecastWidget"');
  const climateIdx = indexSource.indexOf('id="homeClimateCard"');

  assert(playerIdx !== -1, 'home player panel should exist');
  assert(harvestIdx !== -1, 'harvest mini card should exist');
  assert(climateIdx !== -1, 'home climate card should exist');
  assert(playerIdx < harvestIdx, 'player panel should stay above harvest widget in home markup');
  assert(harvestIdx < climateIdx, 'harvest widget should stay above climate card in home markup');
})();

(function testProductivePlayerCardUsesPreviewStructure() {
  assert(indexSource.includes('class="premium-playercard__inner"'), 'productive player card should use the premium preview inner structure');
  assert(indexSource.includes('class="premium-playercard__avatar-art"'), 'productive player card should use the premium avatar PNG slot');
  assert(indexSource.includes('class="premium-playercard__coin-icon"'), 'productive player card should use the premium coin PNG slot');
  assert(!indexSource.includes('class="player-card-inner"'), 'old visible player-card inner structure should not remain in home markup');
  assert(!indexSource.includes('class="player-avatar"'), 'old visible player avatar structure should not remain in home markup');
  assert(!indexSource.includes('class="player-coins"'), 'old visible coin capsule structure should not remain in home markup');
})();

(function testCompactPlayerCardOverrideKeepsTightVerticalSpacing() {
  const compactStart = cssSource.indexOf('/* Playercard reference HUD: single source of truth */');
  assert(compactStart !== -1, 'playercard reference override block should exist');
  const compactBlock = cssSource.slice(compactStart);

  assert(
    compactBlock.includes('.home-player-panel.player-card.premium-playercard {') &&
      compactBlock.includes('height: 122px;') &&
      compactBlock.includes('max-height: 122px;'),
    'premium player card should keep the preview desktop height'
  );

  assert(
    compactBlock.includes('.premium-playercard__top {') &&
      compactBlock.includes('grid-template-columns: 75px minmax(0, 1fr) 146px;') &&
      compactBlock.includes('gap: 7px;'),
    'top row should preserve preview avatar, identity, and utilities columns'
  );

  assert(
    compactBlock.includes('.premium-playercard__bottom {') &&
      compactBlock.includes('grid-template-columns: minmax(0, 1fr) minmax(126px, 38%);') &&
      compactBlock.includes('padding-top: 7px;'),
    'bottom row should keep preview run and daily information in the card height'
  );

  assert(
    compactBlock.includes('@media (max-width: 350px) {') &&
      compactBlock.includes('.premium-playercard__top {') &&
      compactBlock.includes('grid-template-columns: 62px minmax(0, 1fr) 124px;'),
    'mobile override should preserve compact layout on narrow screens'
  );
})();

(function testCoinPillKeepsCompactHeightInPlayerCardSourceOfTruth() {
  const compactStart = cssSource.indexOf('/* Playercard reference HUD: single source of truth */');
  assert(compactStart !== -1, 'playercard reference override block should exist');
  const compactBlock = cssSource.slice(compactStart);

  assert(
    compactBlock.includes('.premium-playercard__coins {') &&
      compactBlock.includes('height: 34px;') &&
      compactBlock.includes('padding: 0 12px 0 8px;') &&
      compactBlock.includes('.premium-playercard__coin-frame {'),
    'player card source of truth should keep the premium coin pill compact and framed'
  );
})();

console.log('home player card compactness regression test passed');
