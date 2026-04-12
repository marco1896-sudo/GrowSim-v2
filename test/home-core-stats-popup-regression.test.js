#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

assert(
  !indexSource.includes('id="dataVizHud"'),
  'legacy home status panel should no longer be rendered in default home composition'
);

assert(
  indexSource.includes('id="coreStatsBar"'),
  'core stats bar container should exist on home screen'
);

const statKeyMatches = [...indexSource.matchAll(/data-core-stat-key="([^"]+)"/g)].map((match) => match[1]);
assert.deepStrictEqual(
  statKeyMatches,
  ['water', 'nutrients', 'stress', 'risk'],
  'home should expose exactly four core stat slots in the expected order'
);

assert(
  indexSource.includes('id="homeStatPopup"'),
  'home stat popup container should exist'
);

assert(
  indexSource.includes('id="careBoostActionBtn" class="home-action-btn hidden"'),
  'care boost icon should be hidden in home markup by default'
);

assert(
  indexSource.includes('id="climateStabilizeActionBtn" class="home-action-btn hidden"'),
  'climate stabilize icon should be hidden in home markup by default'
);

assert(
  appSource.includes('activeStatPopup: null'),
  'ui state should track activeStatPopup'
);

assert(
  appSource.includes('const HOME_STAT_POPUP_KEYS = new Set([\'water\', \'nutrients\', \'stress\', \'risk\']);'),
  'app should define the canonical set of popup stat keys'
);

assert(
  appSource.includes('state.ui.activeStatPopup = state.ui.activeStatPopup === normalized ? null : normalized;'),
  'stat press handler should toggle the popup state'
);

assert(
  appSource.includes('const popupParent = popupNode.offsetParent instanceof Element ? popupNode.offsetParent : popupNode.parentElement;'),
  'popup positioning should resolve against its positioned parent container'
);

assert(
  appSource.includes('const popupParentRect = popupParent.getBoundingClientRect();'),
  'popup positioning should clamp against the popup parent bounds'
);

assert(
  appSource.includes('const topOffset = 8;'),
  'popup offset should be calibrated to the deeper core-stats bar position'
);

assert(
  appSource.includes("stressRingNode.removeAttribute('data-stress-visual');"),
  'stress core slot should not keep stress-visual state decorations from legacy ring styling'
);

assert(
  appSource.includes("riskRingNode.removeAttribute('data-risk-visual');"),
  'risk core slot should not keep risk-visual state decorations from legacy ring styling'
);

assert(
  !appSource.includes("applyRingVisualState(uiNode('stressRing', 'stressRing'), 'stressVisual', vm.motion && vm.motion.stressVisual);"),
  'stress visual-state application should not target the core stat slot'
);

assert(
  !appSource.includes("applyRingVisualState(uiNode('riskRing', 'riskRing'), 'riskVisual', vm.motion && vm.motion.riskVisual);"),
  'risk visual-state application should not target the core stat slot'
);

assert(
  !appSource.includes('state.ui.statDetailKey = statKey;\n  openSheet(\'statDetail\');'),
  'stat press should no longer open the heavy stat detail sheet directly'
);

assert(
  uiSource.includes("{ node: ui.stressRing, key: 'stress' }"),
  'home bindings should include stress in core stat interactions'
);

assert(
  !uiSource.includes("{ node: ui.growthRing, key: 'growth' }"),
  'growth should not be part of the default core stats interaction bar'
);

assert(
  cssSource.includes('bottom: calc(80px + env(safe-area-inset-bottom));'),
  'core stats bar should stay clear of the progress card after the bottom-cluster correction'
);

assert(
  cssSource.includes('bottom: calc(72px + env(safe-area-inset-bottom));'),
  'small-screen core stats bar should keep the corrected non-overlapping anchoring'
);

assert(
  cssSource.includes('--home-content-offset: clamp(444px, calc(var(--home-layout-height) * 0.566), 474px);'),
  'progress cluster should move up together with the core stats bar to keep the phase card fully visible'
);

assert(
  cssSource.includes('top: calc(var(--home-right-watering-top) + (var(--home-right-actions-gap) * 0.86));'),
  'night shift icon should use the calibrated right-column position after home icon cleanup'
);

assert(
  appSource.includes('[REWARD_ACTION_TYPES.NIGHT_SHIFT]: \'direct\','),
  'night shift should run in direct mode without rewarded-ad dependency'
);

assert(
  appSource.includes('showCareBoost: false,'),
  'care boost icon should be removed from the home action panel'
);

assert(
  appSource.includes('showClimateStabilize: false'),
  'climate stabilize icon should be removed from the home action panel'
);

assert(
  cssSource.includes('#coreStatsBar > .home-core-stat {'),
  'all four core stat slots should share a scoped structural baseline inside the core bar'
);

assert(
  cssSource.includes('#coreStatsBar > .home-core-stat::after {'),
  'all four core stat slots should disable stray legacy pseudo-element effects inside the core bar'
);

assert(
  !cssSource.includes('#stressRing {\n  position: absolute;'),
  'legacy global stress ring positioning should no longer affect the core stats bar'
);

assert(
  !cssSource.includes('#stressRing {\n  box-shadow:'),
  'legacy global stress ring shadows should no longer distort the core stats bar slot'
);

assert(
  cssSource.includes('width: 100%;') &&
    cssSource.includes('justify-self: stretch;') &&
    cssSource.includes('box-sizing: border-box;') &&
    cssSource.includes('position: relative;'),
  'core stat slots should explicitly fill equal tracks with a stable shared box model'
);

console.log('home core stats popup regression test passed');
