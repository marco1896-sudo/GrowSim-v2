'use strict';

const fs = require('fs');
const path = require('path');
const { toPosixPath } = require('./pathUtils');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function flattenEntries(obj, prefix = '', out = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenEntries(value, next, out);
    } else {
      out[next] = value;
    }
  }
  return out;
}

function findLocaleDir(projectRoot) {
  const candidates = [
    path.join(projectRoot, 'src', 'i18n', 'locales'),
    path.join(projectRoot, 'i18n'),
    path.join(projectRoot, 'locales')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) || null;
}

function scanI18n(projectRoot) {
  const localeDir = findLocaleDir(projectRoot);
  if (!localeDir) {
    return {
      localeDir: null,
      languages: [],
      baseLanguage: null,
      totals: { languages: 0, unionKeys: 0, warnings: 1 },
      issues: [{ type: 'missing-structure', message: 'No locale directory detected.' }],
      scannedAt: new Date().toISOString()
    };
  }

  const files = fs.readdirSync(localeDir)
    .filter((name) => /\.json$/i.test(name))
    .sort();
  const languages = [];
  const keyMaps = {};
  const issues = [];

  for (const fileName of files) {
    const language = path.basename(fileName, '.json');
    const absolutePath = path.join(localeDir, fileName);
    try {
      const json = readJson(absolutePath);
      const flat = flattenEntries(json);
      keyMaps[language] = flat;
      const emptyKeys = Object.entries(flat)
        .filter(([, value]) => value === '' || value === null || typeof value === 'undefined')
        .map(([key]) => key);
      languages.push({
        language,
        file: toPosixPath(path.relative(projectRoot, absolutePath)),
        keys: Object.keys(flat).length,
        emptyKeys
      });
    } catch (error) {
      issues.push({ type: 'invalid-json', file: toPosixPath(path.relative(projectRoot, absolutePath)), message: error.message });
    }
  }

  const baseLanguage = keyMaps.de ? 'de' : (keyMaps.en ? 'en' : Object.keys(keyMaps)[0] || null);
  const unionKeys = new Set();
  for (const flat of Object.values(keyMaps)) {
    for (const key of Object.keys(flat)) unionKeys.add(key);
  }

  const comparisons = {};
  if (baseLanguage) {
    const baseKeys = new Set(Object.keys(keyMaps[baseLanguage] || {}));
    for (const [language, flat] of Object.entries(keyMaps)) {
      const keys = new Set(Object.keys(flat));
      comparisons[language] = {
        missingVsBase: [...baseKeys].filter((key) => !keys.has(key)).sort(),
        extraVsBase: [...keys].filter((key) => !baseKeys.has(key)).sort(),
        missingVsUnion: [...unionKeys].filter((key) => !keys.has(key)).sort(),
        emptyKeys: Object.entries(flat)
          .filter(([, value]) => value === '' || value === null || typeof value === 'undefined')
          .map(([key]) => key)
          .sort()
      };
    }
  }

  let warnings = issues.length;
  for (const comparison of Object.values(comparisons)) {
    if (comparison.missingVsBase.length || comparison.extraVsBase.length || comparison.emptyKeys.length) {
      warnings += 1;
    }
  }

  return {
    localeDir: toPosixPath(path.relative(projectRoot, localeDir)),
    languages,
    baseLanguage,
    totals: {
      languages: languages.length,
      unionKeys: unionKeys.size,
      warnings
    },
    comparisons,
    issues,
    scannedAt: new Date().toISOString()
  };
}

module.exports = {
  scanI18n
};
