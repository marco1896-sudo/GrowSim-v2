#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const APP_PATH = path.join(ROOT, 'app.js');

function main() {
  const source = fs.readFileSync(APP_PATH, 'utf8');

  assert.ok(source.includes('function animateRingValue('), 'animateRingValue function must exist');
  assert.ok(
    source.includes("ringNode.dataset.animating = 'true';"),
    'animateRingValue should set animating=true immediately before tween tick'
  );
  assert.ok(
    source.includes("ringNode.dataset.animating = 'false';"),
    'animateRingValue should set animating=false in settle paths'
  );
  assert.ok(
    source.includes('if (Math.abs(previousAnimatedValue - target) < 0.01)'),
    'animateRingValue should keep explicit no-delta branch'
  );

  const summary = {
    ok: true,
    mode: 'ui_animation_marker_audit_smoke',
    checks: {
      hasAnimateRingValue: true,
      hasImmediateAnimatingStartMarker: true,
      hasExplicitAnimatingEndMarker: true,
      hasNoDeltaBranch: true,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
