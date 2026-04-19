#!/usr/bin/env node
'use strict';

const assert = require('assert');

const originalNavigator = global.navigator;
const originalFetch = global.fetch;
const originalWindow = global.window;
const originalDocument = global.document;
const originalCustomEvent = global.CustomEvent;

(async () => {
  global.window = global;
  global.document = {
    documentElement: { lang: 'en' },
    querySelectorAll: () => []
  };
  global.CustomEvent = function CustomEvent(name, options) {
    this.type = name;
    this.detail = options ? options.detail : undefined;
  };
  global.dispatchEvent = () => {};

  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: {
      languages: ['es-MX', 'de-DE'],
      language: 'es-MX'
    }
  });

  global.fetch = async (path) => {
    const payloads = {
      './src/i18n/locales/de.json': {
        common: {
          ok: 'OK-DE'
        }
      },
      './src/i18n/locales/en.json': {
        common: {
          ok: 'OK-EN',
          fallback_only: 'FALLBACK-EN'
        }
      },
      './src/i18n/locales/es.json': {
        common: {
          ok: 'OK-ES'
        }
      }
    };

    const payload = payloads[String(path)];
    return {
      ok: Boolean(payload),
      status: payload ? 200 : 404,
      async json() {
        return payload || {};
      }
    };
  };

  require('../src/i18n/index.js');
  const i18n = global.GrowSimI18n;
  assert(i18n, 'GrowSimI18n must be available');

  assert.strictEqual(i18n.normalizeLanguage('de-DE'), 'de');
  assert.strictEqual(i18n.normalizeLanguage('en-GB'), 'en');
  assert.strictEqual(i18n.normalizeLanguage('es-AR'), 'es');
  assert.strictEqual(i18n.normalizeLanguage('fr-FR'), 'en');
  assert.strictEqual(i18n.detectLanguage(), 'es');

  await i18n.init();
  i18n.setLanguage('de');
  assert.strictEqual(i18n.getCurrentLanguage(), 'de');
  assert.strictEqual(i18n.t('common.ok'), 'OK-DE');
  assert.strictEqual(i18n.t('common.fallback_only'), 'FALLBACK-EN');
  assert.strictEqual(i18n.t('missing.key'), 'missing.key');
  assert.strictEqual(i18n.hasTranslation('common.ok', 'es'), true);
  assert.strictEqual(i18n.hasTranslation('missing.key', 'es'), false);
  console.log('i18n-runtime.test.js passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: originalNavigator
  });
  global.fetch = originalFetch;
  global.window = originalWindow;
  global.document = originalDocument;
  global.CustomEvent = originalCustomEvent;
});
