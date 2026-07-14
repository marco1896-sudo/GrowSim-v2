#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

const screenStart = indexHtml.indexOf('<main id="buddyCareScreen"');
const screenEnd = indexHtml.indexOf('</main>', screenStart);
const screenMarkup = indexHtml.slice(screenStart, screenEnd);
const panels = Array.from(screenMarkup.matchAll(/data-buddy-care-view-panel="(today|plants|diary|more)"/g), (match) => match[1]);

assert.deepStrictEqual(panels, ['today', 'plants', 'diary', 'more'], 'Care+ should expose the four ordered main views exactly once');
assert.strictEqual((screenMarkup.match(/id="buddyCareViewNav"/g) || []).length, 1, 'Care+ should render one persistent bottom navigation');
assert.ok(screenMarkup.indexOf('id="buddyCareViewNav"') > screenMarkup.indexOf('id="buddyCareScrollContent"'), 'navigation should follow the scroll content');
assert.match(appJs, /let buddyCareActiveView = 'today';/, 'Today should remain the non-persistent default view');
assert.match(appJs, /panel\.hidden = !ageGateAccepted \|\| normalizeBuddyCareView\(panel\.dataset\.buddyCareViewPanel\) !== activeView;/, 'runtime should show only the active main view');
assert.match(appJs, /const scrollTarget = ui\.buddyCareScrollContent \|\| ui\.buddyCareScreen;/, 'view changes should reset only the internal Care scroll region');

console.log('buddy-care-view-architecture.test.js passed');
