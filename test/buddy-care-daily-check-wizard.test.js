#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(rootDir, 'ui.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');

(function testWizardMarkupExists() {
  assert.match(indexHtml, /id="buddyCareDailyCheckWizard"/, 'daily check should expose the guided wizard container');
  assert.match(indexHtml, /class="buddy-care-daily-compat" hidden aria-hidden="true"/, 'legacy form fields should stay as hidden compatibility fields');
  assert.match(indexHtml, /id="buddyCareDailyCheckMoistureSelect"/, 'medium compatibility select should remain available');
  assert.match(indexHtml, /id="buddyCareDailyCheckSubmitBtn"/, 'legacy submit button should remain available for compatibility');
})();

(function testWizardStepArchitectureExists() {
  assert.match(appJs, /let buddyCareDailyCheckStep = 0;/, 'wizard step should be local non-persistent UI state');
  assert.match(appJs, /const BUDDY_CARE_DAILY_CHECK_STEPS = Object\.freeze\(\[/, 'wizard should define a controlled step sequence');
  ['medium', 'leaves', 'growth', 'environment', 'pests', 'notes', 'result'].forEach((step) => {
    assert.ok(appJs.includes(`key: '${step}'`), `wizard should include the ${step} step`);
  });
  assert.match(appJs, /function moveBuddyCareDailyCheckStep\(delta\)/, 'wizard should support forward and backward movement');
  assert.match(appJs, /function selectBuddyCareDailyCheckWizardOption\(field, value\)/, 'wizard should support option selection');
})();

(function testWizardDoesNotPersistBeforeResult() {
  assert.match(
    appJs,
    /normalizeBuddyCareDailyCheckStep\(buddyCareDailyCheckStep\) !== getBuddyCareDailyCheckLastStepIndex\(\)[\s\S]*return \{ ok: false, reason: 'wizard_in_progress' \};/,
    'submit handler should refuse persistence before the result step'
  );
  assert.match(
    appJs,
    /function closeBuddyCareDailyCheck\(\)[\s\S]*buddyCareDailyCheckDraft = null;[\s\S]*buddyCareDailyCheckStep = 0;/,
    'cancel/close should discard the draft and reset the wizard step'
  );
})();

(function testWizardUiWiringExists() {
  assert.match(uiJs, /buddyCareDailyCheckWizard = document\.getElementById\('buddyCareDailyCheckWizard'\)/, 'ui cache should include the wizard node');
  assert.match(uiJs, /data-buddy-care-wizard-option-field/, 'ui click wiring should handle wizard option buttons');
  assert.match(uiJs, /__gsMoveBuddyCareDailyCheckStep/, 'ui click wiring should move wizard steps');
  assert.match(uiJs, /__gsSelectBuddyCareDailyCheckWizardOption/, 'ui click wiring should select wizard answers');
})();

(function testWizardStylesExist() {
  assert.ok(stylesCss.includes('.buddy-care-daily-wizard'), 'wizard should have dedicated layout styles');
  assert.ok(stylesCss.includes('.buddy-care-wizard-progress'), 'wizard should show progress');
  assert.ok(stylesCss.includes('.buddy-care-wizard-option.is-selected'), 'selected answers should be visually clear');
  assert.ok(stylesCss.includes('.buddy-care-daily-compat[hidden]'), 'hidden compatibility fields should not be visible');
})();

console.log('buddy-care-daily-check-wizard.test.js passed');
