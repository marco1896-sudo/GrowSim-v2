#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

const manifest = read('manifest.webmanifest');
const readme = read('README.md');
const appJs = read('app.js');
const uiJs = read('ui.js');
const indexHtml = read('index.html');
const deLocale = read('src/i18n/locales/de.json');
const enLocale = read('src/i18n/locales/en.json');
const esLocale = read('src/i18n/locales/es.json');
const legalSliceStart = indexHtml.indexOf('<section id="imprint-sheet"');
const legalSliceEnd = indexHtml.indexOf('<section id="leaderboardSheet"');
const legalHtml = legalSliceStart >= 0 && legalSliceEnd > legalSliceStart
  ? indexHtml.slice(legalSliceStart, legalSliceEnd)
  : '';
const publicSurface = [
  manifest,
  readme,
  indexHtml,
  deLocale,
  enLocale,
  esLocale
].join('\n');

assert.doesNotMatch(
  publicSurface,
  /\b(MVP|prototype)\b|CARESTUDIO\.PREVIEW/i,
  'public-facing copy should avoid prototype and placeholder wording'
);

assert.doesNotMatch(
  uiJs,
  /Grow Simulator MVP|Weitere Infos folgen/i,
  'menu placeholder copy should avoid old about-sheet placeholders'
);

assert.doesNotMatch(
  `${appJs}\n${indexHtml}`,
  /Kein aktiver Schattenhinweis verfuegbar|Kein aktiver Schattenhinweis verfügbar|Legacy bleibt autoritativ/i,
  'event and analysis surfaces should avoid the old technical wording'
);

assert.doesNotMatch(
  indexHtml,
  /Event-System|Analysezentrum|Kein Dateiexport/i,
  'event and analysis shell copy should avoid technical labels'
);

assert.match(
  indexHtml,
  /ohne Konto|lokal auf diesem Geraet/i,
  'privacy copy should explain that local play works without a required login'
);

assert.match(
  indexHtml,
  /beim Loeschen von Browserdaten verloren gehen|an diesen Browser bzw\. dieses Geraet gebunden/i,
  'privacy copy should explain the local-save browser-data risk'
);

assert.match(
  indexHtml,
  /Cloud Sync bleibt optional|optionale Konto- oder Cloud-Funktionen|optionale Cloud-Sicherung/i,
  'public legal and account copy should frame cloud sync as optional'
);

assert.doesNotMatch(
  legalHtml,
  /TODO|TBD|Placeholder|Weitere Infos folgen/i,
  'public legal and info surfaces should avoid obvious placeholder wording'
);

assert.match(
  deLocale,
  /Cloud Sync bleibt optional|Lokales Spielen funktioniert auch ohne Konto/,
  'German guest/account copy should frame cloud sync as optional'
);

assert.match(
  enLocale,
  /Local play works without an account|Cloud sync stays optional/,
  'English guest/account copy should frame cloud sync as optional'
);

assert.match(
  esLocale,
  /Puedes jugar en local sin cuenta|Cloud Sync sigue siendo opcional/,
  'Spanish guest/account copy should frame cloud sync as optional'
);

console.log('public text readiness test passed');
