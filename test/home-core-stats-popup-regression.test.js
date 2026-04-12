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
  cssSource.includes('.home-core-stats-bar {\n  position: relative;'),
  'core stats bar should participate in the shared bottom cluster instead of anchoring separately'
);

assert(
  cssSource.includes('top: auto;'),
  'bottom cluster should stop using the scroll-flow top anchor'
);

assert(
  cssSource.includes('padding-bottom: calc(8px + env(safe-area-inset-bottom));'),
  'bottom cluster should reserve only a small final safe-area gap at the lower edge'
);

assert(
  cssSource.includes('display: flex;') &&
    cssSource.includes('flex-direction: column;') &&
    cssSource.includes('gap: 12px;'),
  'home content container should act as a stacked bottom cluster'
);

assert(
  cssSource.includes('.home-content-scroll .home-progress-panel {') &&
    cssSource.includes('margin-top: 0;'),
  'progress card should no longer depend on scroll-offset overlap spacing'
);

assert(
  cssSource.includes('position: relative;') &&
    cssSource.includes('bottom: auto;') &&
    cssSource.includes('width: 100%;'),
  'core stats bar should live inside the shared bottom cluster instead of anchoring separately'
);

assert(
  !cssSource.includes('padding-bottom: calc(196px + env(safe-area-inset-bottom));'),
  'bottom cluster should no longer keep the old oversized lower reserve that pushed it upward'
);

assert(
  cssSource.includes('--home-content-offset: clamp(444px, calc(var(--home-layout-height) * 0.566), 474px);'),
  'progress cluster should move up together with the core stats bar to keep the phase card fully visible'
);

assert(
  cssSource.includes('--home-side-utility-top: calc(100% - 400px);'),
  'side utility icons should share a dedicated vertical reference line'
);

assert(
  cssSource.includes('@keyframes home-hero-breathe') &&
    cssSource.includes('@keyframes premium-orb-ready'),
  'home screen should define the premium ambient and orb-ready motion hooks'
);

assert(
  cssSource.includes('#boostActionBtn {') &&
    cssSource.includes('top: var(--home-side-utility-top);') &&
    cssSource.includes('.home-action-panel #skipNightActionBtn {'),
  'boost and night shift icons should use the same shared top anchor'
);

assert(
  cssSource.includes('.home-player-panel::before') &&
    cssSource.includes('.home-player-panel::after') &&
    cssSource.includes('.home-progress-panel:hover,') &&
    cssSource.includes('#boostActionBtn::after') &&
    cssSource.includes('.home-action-panel #skipNightActionBtn::after'),
  'premium polish should keep card sheen and matched orb surface treatments for x24 and night shift'
);

assert(
  cssSource.includes('/* Final orb-family normalization: x24 + Night Shift as a matched premium pair. */') &&
    cssSource.includes('#boostActionBtn::before,') &&
    cssSource.includes('.home-action-panel #skipNightActionBtn::before {') &&
    cssSource.includes('.home-action-panel #skipNightActionBtn::after {'),
  'x24 and night shift should share the same premium orb material family'
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
