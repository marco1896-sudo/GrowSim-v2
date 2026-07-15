#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

require('../src/buddy-care/types.js');
const buddyCareState = require('../src/buddy-care/state.js');
const monetization = require('../src/buddy-care/monetizationReadiness.js');

const ROOT = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const de = require(path.join(ROOT, 'src/i18n/locales/de.json'));
const en = require(path.join(ROOT, 'src/i18n/locales/en.json'));

const careStart = indexHtml.indexOf('<main id="buddyCareScreen"');
const careEnd = indexHtml.indexOf('</main>', careStart);
const careMarkup = indexHtml.slice(careStart, careEnd);

(function testGuestMarkupContainsNoForeignIdentity() {
  const visibleFallbackText = careMarkup.replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(visibleFallbackText, /\b(?:Marco|Max Mustergrower|Max)\b/i, 'Care+ guest markup must not contain a foreign or example user name');
  assert.match(appJs, /getUserGreeting\(\{\s*guestGreeting:/s, 'Care+ greeting should use the authenticated greeting resolver with a neutral guest fallback');
})();

(function testAgeGateIsAModalWithRealBackgroundLocking() {
  assert.match(careMarkup, /id="buddyCareAgeGateCard"[^>]+role="dialog"[^>]+aria-modal="true"/, 'age gate should be exposed as a modal dialog');
  assert.match(appJs, /node\.inert = shouldLock;/, 'age gate should make its background inert');
  assert.match(appJs, /document\.body\.classList\.toggle\('buddy-care-age-gate-open', shouldLock\)/, 'age gate should lock background scrolling');
  assert.match(uiJs, /event\.key === 'Escape'/, 'age gate should define Escape behavior');
  assert.match(uiJs, /event\.key !== 'Tab'/, 'age gate should trap keyboard focus');
})();

(function testFormValidationIsLocalizedAndInline() {
  assert.ok(careMarkup.includes('id="buddyCarePlantNameError"'), 'plant name should have an inline error target');
  assert.ok(careMarkup.includes('id="buddyCarePlantStartDateError"'), 'start date should have an inline error target');
  assert.match(appJs, /function validateBuddyCarePlantSetup\(\)/, 'plant setup should run explicit validation');
  assert.match(appJs, /reason: 'invalid_height'/, 'invalid height should expose a stable non-saving result');
  assert.deepStrictEqual(Object.keys(de.buddyCare.validation).sort(), Object.keys(en.buddyCare.validation).sort(), 'German and English validation keys should stay in parity');
})();

(function testKnownGermanFallbacksAreGone() {
  const germanCareCopy = JSON.stringify(de.buddyCare);
  for (const forbidden of [
    'Root zone stable',
    'Observe the plant and choose the cleanest next step.',
    'Water actions',
    'Existing watering actions stay available here.',
    'Airflow Good',
    'Balanced Control',
    '"Photo"'
  ]) {
    assert.ok(!germanCareCopy.includes(forbidden), `German Care+ copy should not contain fallback: ${forbidden}`);
  }
})();

(function testAccessStatusHasOneCentralDerivation() {
  const freeRoot = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  assert.strictEqual(monetization.getCarePlusAccessStatus(freeRoot).id, 'test_available', 'free users should receive one test-available status while the mock is enabled');
  buddyCareState.activateBuddyCarePlusMock(freeRoot);
  assert.strictEqual(monetization.getCarePlusAccessStatus(freeRoot).id, 'test_active', 'activated users should receive one test-active status');
  assert.strictEqual(monetization.getCarePlusAccessStatus({ buddyCare: buddyCareState.createDefaultBuddyCareState() }, { CARE_PLUS_MOCK_ENABLED: false }).id, 'free_active', 'disabled tests should resolve to one free-active status');
  assert.match(appJs, /buddyCareMockCard\.hidden = true;/, 'legacy duplicate test-access card should remain hidden');
  assert.match(appJs, /buddyCareMockHintCard\.hidden = true;/, 'legacy duplicate active hint should remain hidden');
})();

console.log('buddy-care-audit-regressions.test.js passed');
