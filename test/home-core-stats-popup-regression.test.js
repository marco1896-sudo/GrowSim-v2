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
  cssSource.includes('bottom: calc(82px + env(safe-area-inset-bottom));'),
  'core stats bar should be positioned visibly deeper in the lower home area'
);

assert(
  cssSource.includes('bottom: calc(74px + env(safe-area-inset-bottom));'),
  'small-screen core stats bar should preserve the deeper lower anchoring'
);

assert(
  cssSource.includes('.home-core-stats-bar > .home-core-stat {'),
  'all four core stat slots should share a scoped structural baseline inside the core bar'
);

assert(
  cssSource.includes('.home-core-stats-bar > .home-core-stat::after {'),
  'all four core stat slots should disable stray legacy pseudo-element effects inside the core bar'
);

console.log('home core stats popup regression test passed');
