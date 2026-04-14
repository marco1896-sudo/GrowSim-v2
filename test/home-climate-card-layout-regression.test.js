#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

(function testHomeClimateMarkupRemainsInRightColumn() {
  const rightColumnIdx = indexSource.indexOf('class="home-right-column"');
  const climateCardIdx = indexSource.indexOf('id="homeClimateCard"');

  assert(rightColumnIdx !== -1, 'home right column container should exist');
  assert(climateCardIdx !== -1, 'home climate card trigger should exist');
  assert(rightColumnIdx < climateCardIdx, 'home climate card should remain anchored in the right column');
})();

(function testRightColumnAndClimateCardUseCompactAnchoredSizing() {
  assert(
    cssSource.includes('.home-right-column {') &&
      cssSource.includes('top: var(--home-right-climate-top);') &&
      cssSource.includes('right: var(--home-right-side-inset);') &&
      cssSource.includes('width: var(--home-top-mini-card-width);'),
    'right column should keep top-right anchor and follow shared mini-card width'
  );

  assert(
    cssSource.includes('.home-climate-card {') &&
      cssSource.includes('width: var(--home-top-mini-card-width, 112px) !important;') &&
      cssSource.includes('height: var(--home-top-mini-card-height, 60px) !important;') &&
      cssSource.includes('padding: 5px 6px;') &&
      cssSource.includes('gap: 3px;'),
    'climate card should follow shared harvest-size variables with compact internals'
  );

  assert(
    cssSource.includes('.harvest-mini-card {') &&
      cssSource.includes('width: var(--home-top-mini-card-width, 112px);') &&
      cssSource.includes('height: var(--home-top-mini-card-height, 60px);'),
    'harvest card should define the shared mini-card footprint used by climate card'
  );

  assert(
    cssSource.includes('--home-right-climate-top: var(--home-left-harvest-top);') &&
      cssSource.includes('--home-right-actions-top: calc(var(--home-right-climate-top) + var(--home-top-mini-card-height) + 10px);'),
    'climate and right-side action anchors should keep stable non-overlapping ordering based on shared card height'
  );

  assert(
    cssSource.includes('--home-top-card-gap: 5px;') &&
      cssSource.includes('--home-left-harvest-top: calc(var(--home-player-panel-bottom, calc(var(--home-safe-top) + var(--home-panel-offset) + 98px)) + var(--home-top-card-gap));'),
    'harvest top should be derived from player-panel bottom plus exact 5px gap'
  );
})();

(function testCompactMetricLegibilityHooksRemain() {
  assert(
    cssSource.includes('.home-climate-card__hero-value {') &&
      cssSource.includes('font-size: 14px;'),
    'hero VPD value should remain emphasized after compacting the card'
  );

  assert(
    cssSource.includes('.home-climate-card__metrics {') &&
      cssSource.includes('gap: 2px 4px;') &&
      cssSource.includes('.home-climate-metric {') &&
      cssSource.includes('grid-template-columns: 7px minmax(0, 1fr);'),
    'metric grid should be compact without collapsing into unreadable density'
  );

  assert(
    cssSource.includes('@media (max-width: 390px), (max-height: 760px) {') &&
      cssSource.includes('--home-top-mini-card-width: 106px;') &&
      cssSource.includes('--home-top-mini-card-height: 58px;'),
    'narrow mobile viewport should keep synchronized mini-card sizing for harvest and climate'
  );
})();

console.log('home climate card layout regression test passed');
