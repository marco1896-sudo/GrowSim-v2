#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

(function testBuddyCareNavigationMarkupExists() {
  assert.strictEqual((indexHtml.match(/id="buddyCareViewNav"/g) || []).length, 1, 'Buddy Care should render its internal navigation exactly once');
  assert.match(indexHtml, /id="buddyCareScrollContent"[^>]+class="buddy-care-scroll-content"/, 'Buddy Care should expose a dedicated scroll region');
  assert.match(indexHtml, /data-buddy-care-view="today"/, 'today view button should exist');
  assert.match(indexHtml, /data-buddy-care-view="plants"/, 'plants view button should exist');
  assert.match(indexHtml, /data-buddy-care-view="diary"/, 'diary view button should exist');
  assert.match(indexHtml, /data-buddy-care-view="more"/, 'more view button should exist');
  assert.match(indexHtml, /id="buddyCareTodayView"/, 'today view container should exist');
  assert.match(indexHtml, /id="buddyCarePlantsView"/, 'plants view container should exist');
  assert.match(indexHtml, /id="buddyCareDiaryView"[^>]+data-buddy-care-view-panel="diary"/, 'diary view container should expose the existing Care diary surface');
  assert.match(indexHtml, /id="buddyCareMoreView"/, 'more view container should exist');
})();

(function testBuddyCareViewStateHelpersExist() {
  assert.match(appJs, /let buddyCareActiveView = 'today';/, 'today should stay the default Buddy Care view');
  assert.match(appJs, /function getActiveBuddyCareView\(\)/, 'Buddy Care should expose a getter for the active view');
  assert.match(appJs, /function setActiveBuddyCareView\(view, options = \{\}\)/, 'Buddy Care should expose a setter for the active view');
  assert.match(appJs, /function renderBuddyCareViewNavigation\(ageGateAccepted\)/, 'Buddy Care should render exactly one active view navigation state');
  assert.match(appJs, /const panelHidden = !ageGateAccepted \|\| normalizeBuddyCareView\(panel\.dataset\.buddyCareViewPanel\) !== activeView;/, 'only one Buddy Care main view should stay visible at a time');
  assert.match(appJs, /panel\.inert = panelHidden;/, 'inactive Buddy Care views should not stay interactive');
})();

(function testBuddyCareDeepLinksStayLocal() {
  assert.match(appJs, /function openBuddyCarePlantDetails\(plantId, section = 'overview'\)/, 'plant detail deep links should stay local to Buddy Care');
  assert.match(appJs, /function openBuddyCareDailyCheck\(plantId, options = \{\}\)/, 'daily check deep links should stay local to Buddy Care');
  assert.match(appJs, /setActiveBuddyCareView\('more'\)/, 'Care+ and feedback links should route into the more view');
  assert.match(appJs, /setActiveBuddyCareView\('diary', \{ preserveDiaryComposer: true \}\)/, 'diary composer should open inside the diary view');
})();

(function testReferenceUiStateAndTabsExist() {
  assert.match(appJs, /let buddyCarePlantFilter = 'all';/, 'plant status filter should remain local view state');
  assert.match(appJs, /let buddyCareHistoryMode = 'timeline';/, 'history mode should remain local view state');
  assert.match(appJs, /function setBuddyCarePlantFilter\(filterValue = 'all'\)/, 'plant filters should have a dedicated setter');
  assert.match(appJs, /function setBuddyCareHistoryMode\(mode = 'timeline'\)/, 'history modes should have a dedicated setter');
  assert.match(appJs, /role="tab" aria-selected=/, 'plant detail tabs should expose aria-selected state');
  assert.match(appJs, /BUDDY_CARE_PLANT_ASSETS/, 'Care+ should resolve existing cannabis plant assets centrally');
  assert.match(appJs, /buildBuddyCareTimelineEntries/, 'history should be built from existing checks and diary entries');
})();

(function testNavigationStylesSupportBottomNavAndDetailShell() {
  assert.match(stylesCss, /\.buddy-care-scroll-content\s*\{[\s\S]*overflow-y:\s*auto;/, 'Buddy Care content should own vertical scrolling');
  assert.match(stylesCss, /\.buddy-care-nav\s*\{[\s\S]*position:\s*relative;[\s\S]*flex:\s*0 0 auto;/, 'Buddy Care navigation should stay outside the scrolling content');
  assert.ok(stylesCss.includes('.buddy-care-segment-nav'), 'plant detail segments should have dedicated styling');
  assert.ok(stylesCss.includes('.buddy-care-filter-row'), 'diary filters should have dedicated styling');
  assert.ok(stylesCss.includes('.buddy-care-plant-profile-card'), 'plant overview should use reference-style profile cards');
  assert.ok(stylesCss.includes('.buddy-care-week-hero'), 'diary should expose the weekly report hero');
  assert.ok(stylesCss.includes('.buddy-care-status-modules'), 'plant detail should expose compact status modules');
})();

console.log('buddy-care-navigation.test.js passed');
