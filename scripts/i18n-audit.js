'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LOCALE_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const LOCALES = ['de', 'en', 'es'];
const CODE_GLOBS = [
  path.join(ROOT, 'app.js'),
  path.join(ROOT, 'events.js'),
  path.join(ROOT, 'index.html'),
  path.join(ROOT, 'src')
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function flattenKeys(obj, prefix = '', out = []) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, next, out);
    } else {
      out.push(next);
    }
  }
  return out;
}

function walkFiles(entryPath, acc = []) {
  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    if (/\.(js|html)$/i.test(entryPath)) acc.push(entryPath);
    return acc;
  }
  for (const name of fs.readdirSync(entryPath)) {
    if (name === 'node_modules' || name === '.git') continue;
    walkFiles(path.join(entryPath, name), acc);
  }
  return acc;
}

function extractUsedKeysFromContent(content) {
  const keys = new Set();
  const patterns = [
    /i18nT\(\s*['"`]([^'"`]+)['"`]/g,
    /resolveI18nText\(\s*['"`]([^'"`]+)['"`]/g,
    /data-i18n(?:-title|-placeholder|-aria-label)?=["']([^"']+)["']/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) {
      if (isStaticI18nKey(match[1])) keys.add(match[1]);
    }
  }
  return keys;
}

function isStaticI18nKey(value) {
  const key = String(value || '').trim();
  if (!key) return false;
  if (key.includes('${')) return false;
  if (/[()\s+|?:]/.test(key)) return false;
  return /^[a-z0-9_.-]+$/i.test(key);
}

function main() {
  const localeMaps = {};
  const localeKeySets = {};
  for (const locale of LOCALES) {
    const json = readJson(path.join(LOCALE_DIR, `${locale}.json`));
    localeMaps[locale] = json;
    localeKeySets[locale] = new Set(flattenKeys(json));
  }

  const baseKeys = localeKeySets.de;
  const missing = {};
  for (const locale of LOCALES) {
    if (locale === 'de') continue;
    missing[locale] = [...baseKeys].filter((key) => !localeKeySets[locale].has(key));
  }
  const missingInDe = {};
  for (const locale of LOCALES) {
    if (locale === 'de') continue;
    missingInDe[locale] = [...localeKeySets[locale]].filter((key) => !baseKeys.has(key));
  }

  const codeFiles = [];
  for (const entry of CODE_GLOBS) {
    if (!fs.existsSync(entry)) continue;
    if (fs.statSync(entry).isDirectory()) {
      walkFiles(entry, codeFiles);
    } else {
      codeFiles.push(entry);
    }
  }

  const usedKeys = new Set();
  for (const filePath of codeFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const key of extractUsedKeysFromContent(content)) usedKeys.add(key);
  }

  const missingUsedInDe = [...usedKeys].filter((key) => !baseKeys.has(key));
  const unusedInDe = [...baseKeys].filter((key) => !usedKeys.has(key));

  const hasMissingLocales = Object.values(missing).some((arr) => arr.length > 0)
    || Object.values(missingInDe).some((arr) => arr.length > 0);

  console.log('[i18n-audit] locale keys', {
    de: localeKeySets.de.size,
    en: localeKeySets.en.size,
    es: localeKeySets.es.size
  });
  console.log('[i18n-audit] missing in en/es vs de', {
    en: missing.en.length,
    es: missing.es.length
  });
  console.log('[i18n-audit] extra in en/es (not in de)', {
    en: missingInDe.en.length,
    es: missingInDe.es.length
  });
  console.log('[i18n-audit] missing used keys in de', missingUsedInDe.length);
  console.log('[i18n-audit] unused de keys (heuristic)', unusedInDe.length);

  if (missing.en.length) {
    console.error('[i18n-audit] Missing in en:', missing.en.slice(0, 50));
  }
  if (missing.es.length) {
    console.error('[i18n-audit] Missing in es:', missing.es.slice(0, 50));
  }
  if (missingInDe.en.length || missingInDe.es.length) {
    console.warn('[i18n-audit] Extra keys not present in de:', {
      en: missingInDe.en.slice(0, 20),
      es: missingInDe.es.slice(0, 20)
    });
  }
  if (missingUsedInDe.length) {
    console.error('[i18n-audit] Used keys missing in de:', missingUsedInDe.slice(0, 50));
  }
  if (unusedInDe.length) {
    console.warn('[i18n-audit] Unused keys (heuristic):', unusedInDe.slice(0, 40));
  }

  if (hasMissingLocales || missingUsedInDe.length) {
    process.exitCode = 1;
  }
}

main();
