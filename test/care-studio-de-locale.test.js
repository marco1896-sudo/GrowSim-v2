#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const localePath = path.resolve(__dirname, '..', 'src', 'i18n', 'locales', 'de.json');
const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));

function walkStrings(value, visit) {
  if (typeof value === 'string') {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => walkStrings(entry, visit));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => walkStrings(entry, visit));
  }
}

assert.strictEqual(locale.care.water, 'Gie\u00DFen', 'care water label should use proper umlauts');
assert.strictEqual(locale.care.feed, 'D\u00FCngen', 'care feed label should use proper umlauts');
assert.strictEqual(locale.careStudio.tabs.water, 'Gie\u00DFen', 'care studio water tab should use proper umlauts');
assert.strictEqual(locale.careStudio.tabs.feed, 'D\u00FCngen', 'care studio feed tab should use proper umlauts');
assert.strictEqual(locale.careStudio.water.surface, 'Oberfl\u00E4che', 'surface label should use proper umlauts');
assert.strictEqual(locale.careStudio.diagnosis.next_focus, 'N\u00E4chster Fokus', 'next focus label should use proper umlauts');
assert.strictEqual(locale.careStudio.diagnosis.next_observation, 'N\u00E4chste Beobachtung', 'next observation label should use proper umlauts');
assert.strictEqual(locale.careStudio.diagnosis.next_check, 'Sp\u00E4ter pr\u00FCfen', 'follow-up label should stay human and use proper umlauts');

const bannedAsciiForms = [
  'Giessen',
  'Duengen',
  'Ueberwaesser',
  'naech',
  'verfueg',
  'waehle',
  'Blaett',
  'Naehr',
  'schaetz',
  'Oberflae',
  'Naehrloes',
  'pruef',
  'erhoeht'
];

const careStrings = [];
walkStrings(locale.care, (value) => careStrings.push(value));
walkStrings(locale.careStudio, (value) => careStrings.push(value));
walkStrings(locale.careMethod, (value) => careStrings.push(value));

assert.strictEqual(locale.careMethod.water.moistenSurface.label, 'Oberfl\u00E4che befeuchten', 'care methods should use proper umlauts');
assert.strictEqual(locale.careMethod.feed.phaseSupply.label, 'Phasengerechte Versorgung', 'care method feed labels should stay UTF-8 clean');
assert.strictEqual(locale.careMethod.routine.estimatePotWeight.label, 'Topfgewicht sch\u00E4tzen', 'care method routine labels should use proper umlauts');
assert.strictEqual(locale.careMethod.routine.checkLeaves.description, 'Hilft dir, die Pflanze zu lesen, bevor kleine Probleme groß werden.', 'routine descriptions should use proper umlauts');
assert.strictEqual(locale.careMethod.routine.estimatePotWeight.description, 'Verbindet Wassergefühl, Topfgewicht und Feuchtebild.', 'pot weight description should use proper umlauts');
assert.strictEqual(locale.careStudio.actionPanel.routine_title, 'Pflege-Methoden', 'routine panel should use method language');
assert.strictEqual(locale.careStudio.actionPanel.routine_subtitle, 'Sanfte Routinen und Stabilisierungsschritte bleiben hier gebündelt.', 'routine panel subtitle should use the new care-method wording');

assert.ok(/Wurzelzone/.test(locale.careStudio.feedback.rootZoneRelief), 'root-zone aftercare should keep the method wording in German');
assert.ok(/Aufnahme/.test(locale.careStudio.feedback.uptakeStabilized), 'uptake aftercare should keep the method wording in German');
assert.ok(/Umgebung/.test(locale.careStudio.feedback.hygieneSettled), 'hygiene aftercare should keep the method wording in German');

for (const text of careStrings) {
  for (const banned of bannedAsciiForms) {
    assert.ok(
      !text.includes(banned),
      `care locale text should not contain legacy ASCII substitute "${banned}": ${text}`
    );
  }
}

console.log('care studio de locale test passed');
