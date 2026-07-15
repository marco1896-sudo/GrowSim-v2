#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const de = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/locales/de.json'), 'utf8'));

(function testIntelligenceModulesLoadBeforeAppRuntime() {
  const modulePaths = [
    'src/buddy-care/intelligence/contextBuilder.js',
    'src/buddy-care/intelligence/trendAnalyzer.js',
    'src/buddy-care/intelligence/causeScorer.js',
    'src/buddy-care/intelligence/priorityEngine.js',
    'src/buddy-care/intelligence/questionEngine.js',
    'src/buddy-care/intelligence/actionTracker.js',
    'src/buddy-care/intelligence/profileLearner.js',
    'src/buddy-care/intelligence/safetyRules.js',
    'src/buddy-care/intelligence/insightEngine.js'
  ];
  modulePaths.forEach((modulePath) => {
    assert.ok(indexHtml.includes(`{ src: '${modulePath}' }`), `${modulePath} should be loaded by the existing boot list`);
  });
})();

(function testDashboardUsesOneIntelligenceMainTask() {
  assert.ok(appJs.includes("careInsight.priority === 'urgent_check'"), 'new urgent evidence should outrank an older effect follow-up');
  assert.ok(appJs.includes('const effectiveTodayTasks = urgentIntelligenceTask'), 'urgent checks, effect follow-ups, and intelligence tasks should share one Today priority source');
  assert.ok(appJs.includes('mainTask: effectiveTodayTasks[0] || null'), 'each plant should expose one main task');
  assert.ok(appJs.includes('renderBuddyCareIntelligenceWhy(primaryCard)'), 'Today should expose a transparent Why view');
  assert.ok(appJs.includes('renderBuddyCareIntelligenceQuestion(primaryCard)'), 'Today should expose the targeted question');
})();

(function testQuestionAndActionControlsAreWired() {
  assert.ok(uiJs.includes('[data-buddy-care-answer-question]'), 'question answers should be delegated through the Care+ screen');
  assert.ok(uiJs.includes('[data-buddy-care-confirm-action]'), 'recommendations should require explicit confirmation');
  assert.ok(uiJs.includes('[data-buddy-care-mark-action-performed]'), 'confirmed actions should require explicit completion');
  assert.ok(uiJs.includes('[data-buddy-care-action-outcome]'), 'effect outcomes should be wired');
  assert.ok(appJs.includes('window.__gsAnswerBuddyCareIntelligenceQuestion'), 'question runtime handler should be exposed');
  assert.ok(appJs.includes('window.__gsRecordBuddyCareIntelligenceActionOutcome'), 'effect runtime handler should be exposed');
})();

(function testGermanCopyUsesCorrectCharactersAndNoDiagnosisPromise() {
  const intelligence = de.buddyCare.intelligence;
  assert.ok(intelligence.summary.worsening.includes('Verschlechterung'), 'German worsening copy should use proper spelling');
  assert.ok(intelligence.action.avoid_watering_today.includes('gießen'), 'German action copy should use ß');
  assert.ok(intelligence.cause.possible_overfeeding.includes('Überdüngung'), 'German cause copy should use umlauts');
  assert.ok(intelligence.cause.possible_nutrient_shortage.startsWith('mögliche'), 'cause wording should remain explicitly uncertain');
  assert.ok(!JSON.stringify(intelligence).includes('Stickstoffmangel.'), 'Care+ must not claim a hard nutrient diagnosis');
})();

(function testCompactDetailStylesExist() {
  assert.ok(stylesCss.includes('.buddy-care-intelligence-question'), 'targeted question should have a compact visual module');
  assert.ok(stylesCss.includes('.buddy-care-intelligence-why'), 'transparent detail disclosure should be styled');
  assert.ok(stylesCss.includes('@media (max-width: 390px)'), 'narrow mobile layout should be covered');
})();

console.log('buddy-care-intelligence-ui.test.js passed');
