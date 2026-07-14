#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const de = require(path.join(ROOT, 'src/i18n/locales/de.json'));
const en = require(path.join(ROOT, 'src/i18n/locales/en.json'));
const es = require(path.join(ROOT, 'src/i18n/locales/es.json'));

const screenStart = indexHtml.indexOf('<main id="buddyCareScreen"');
const screenEnd = indexHtml.indexOf('</main>', screenStart);
const screenMarkup = indexHtml.slice(screenStart, screenEnd);
const scrollStart = screenMarkup.indexOf('id="buddyCareScrollContent"');
const scrollEnd = screenMarkup.indexOf('</section>\n      </div>', scrollStart);
const navIndex = screenMarkup.indexOf('id="buddyCareViewNav"');

assert.ok(screenStart >= 0 && screenEnd > screenStart, 'Buddy Care screen markup should exist');
assert.strictEqual((screenMarkup.match(/id="buddyCareViewNav"/g) || []).length, 1, 'bottom navigation should render exactly once');
assert.ok(scrollStart >= 0 && scrollEnd > scrollStart, 'Buddy Care should expose a bounded scroll region');
assert.ok(navIndex > scrollEnd, 'bottom navigation should be a sibling after the scroll region');
assert.match(stylesCss, /\.buddy-care-screen\s*\{[\s\S]*overflow:\s*hidden;/, 'Care screen should contain its internal layout');
assert.match(stylesCss, /\.buddy-care-scroll-content\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*overflow-y:\s*auto;/, 'only Care scroll content should own vertical scrolling');
assert.match(stylesCss, /\.buddy-care-nav\s*\{[\s\S]*flex:\s*0 0 auto;/, 'bottom navigation should reserve its own layout height');
assert.match(stylesCss, /padding:\s*8px 10px max\(10px, env\(safe-area-inset-bottom\)\);/, 'bottom navigation should include iOS safe-area padding');
assert.match(uiJs, /ui\.buddyCareScrollContent = document\.getElementById\('buddyCareScrollContent'\)/, 'UI runtime should bind the dedicated scroll region');
assert.match(appJs, /const scrollTarget = ui\.buddyCareScrollContent \|\| ui\.buddyCareScreen;/, 'view switches should reset the dedicated scroll region');

const forbiddenGermanFallbacks = /\b(?:UEBERSICHT|fuer|koennen|ueberblick|zurueck)\b/i;
assert.doesNotMatch(screenMarkup, forbiddenGermanFallbacks, 'Buddy Care HTML fallbacks should use proper German characters');
assert.doesNotMatch(JSON.stringify(de.buddyCare), forbiddenGermanFallbacks, 'German Buddy Care translations should not expose ASCII umlaut replacements');

for (const locale of [de, en, es]) {
  const aggregate = locale.buddyCare.risk.aggregate;
  for (const value of Object.values(aggregate)) {
    assert.doesNotMatch(value, /^(?:Buddy sagt|Buddy says|Buddy dice):\s*/i, 'Buddy summary copy should not repeat its visible label');
  }
}

const todayRenderer = appJs.slice(
  appJs.indexOf('function renderBuddyCareTodayList'),
  appJs.indexOf('function renderBuddyCarePlantList')
);
const plantRenderer = appJs.slice(
  appJs.indexOf('function renderBuddyCarePlantList'),
  appJs.indexOf('function renderBuddyCarePlantDetailOverview')
);
assert.strictEqual((todayRenderer.match(/data-buddy-care-open-setup/g) || []).length, 1, 'empty Today should expose one setup CTA');
assert.doesNotMatch(todayRenderer, /buddy-care-empty-state--buddy/, 'empty Today should not render a second Buddy card');
assert.match(todayRenderer, /buddyCareTodayCard\.classList\.toggle\('is-empty', !safeCards\.length\)/, 'Today should expose a focused empty layout state');
assert.match(plantRenderer, /buddyCarePlantFilters\.hidden = safeCards\.length === 0;/, 'plant filters should be hidden without plants');
assert.match(plantRenderer, /buddyCarePlantSetupOpen \? '' : `<button[^`]+data-buddy-care-open-setup/, 'plant empty state should expose one setup CTA until setup opens');
assert.match(stylesCss, /\.buddy-care-filter-row\[hidden\]\s*\{\s*display:\s*none !important;/, 'hidden plant filters should stay out of layout');
assert.match(stylesCss, /\.buddy-care-today-hero-asset\s*\{[\s\S]*width:\s*clamp\(110px, 34vw, 170px\);/, 'Today Buddy should use the focused hero size');
assert.match(stylesCss, /\.buddy-care-empty-asset\s*\{[\s\S]*width:\s*clamp\(72px, 22vw, 110px\);/, 'secondary empty Buddy assets should stay compact');
assert.match(appJs, /buddyCareSummaryCard\.hidden = !ageGateAccepted \|\| activeView !== 'today' \|\| plantCount === 0;/, 'empty Today should hide the metric summary');
assert.match(appJs, /buddyCarePlaceholderCard\.hidden = true;/, 'legacy Today placeholder should remain hidden');

console.log('buddy-care-mobile-ui-cleanup.test.js passed');
