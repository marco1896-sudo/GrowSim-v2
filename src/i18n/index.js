'use strict';

(function attachGrowSimI18n(globalScope) {
  const SUPPORTED_LANGUAGES = Object.freeze(['de', 'en', 'es']);
  const DEFAULT_LANGUAGE = 'en';
  const LOCALE_PATHS = Object.freeze({
    de: './src/i18n/locales/de.json',
    en: './src/i18n/locales/en.json',
    es: './src/i18n/locales/es.json'
  });

  const localeCache = {
    de: null,
    en: null,
    es: null
  };

  const runtime = {
    language: DEFAULT_LANGUAGE,
    initialized: false,
    initPromise: null,
    listeners: new Set(),
    missingWarnings: new Set(),
    persistenceAdapter: null
  };

  function normalizeLanguage(input) {
    const raw = String(input || '').trim().toLowerCase();
    if (!raw) {
      return DEFAULT_LANGUAGE;
    }

    if (raw === 'de' || raw.startsWith('de-')) {
      return 'de';
    }
    if (raw === 'en' || raw.startsWith('en-')) {
      return 'en';
    }
    if (raw === 'es' || raw.startsWith('es-')) {
      return 'es';
    }
    return DEFAULT_LANGUAGE;
  }

  function getNavigatorLanguageCandidates() {
    if (typeof navigator === 'undefined' || !navigator) {
      return [];
    }

    const candidates = [];
    if (Array.isArray(navigator.languages)) {
      for (const value of navigator.languages) {
        const normalized = String(value || '').trim();
        if (normalized) {
          candidates.push(normalized);
        }
      }
    }

    if (navigator.language) {
      const fallback = String(navigator.language || '').trim();
      if (fallback) {
        candidates.push(fallback);
      }
    }

    return candidates;
  }

  function detectLanguage() {
    const candidates = getNavigatorLanguageCandidates();
    for (const candidate of candidates) {
      const normalized = normalizeLanguage(candidate);
      if (SUPPORTED_LANGUAGES.includes(normalized)) {
        return normalized;
      }
    }
    return DEFAULT_LANGUAGE;
  }

  function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES.slice();
  }

  function getCurrentLanguage() {
    return runtime.language;
  }

  function getNestedValue(source, keyPath) {
    if (!source || typeof source !== 'object') {
      return undefined;
    }
    const segments = String(keyPath || '').split('.').filter(Boolean);
    if (!segments.length) {
      return undefined;
    }
    let cursor = source;
    for (const segment of segments) {
      if (!cursor || typeof cursor !== 'object' || !(segment in cursor)) {
        return undefined;
      }
      cursor = cursor[segment];
    }
    return cursor;
  }

  function interpolate(template, vars) {
    const safeTemplate = String(template == null ? '' : template);
    if (!vars || typeof vars !== 'object') {
      return safeTemplate;
    }

    return safeTemplate.replace(/\{\s*([a-zA-Z0-9_.$-]+)\s*\}/g, (match, token) => {
      if (!Object.prototype.hasOwnProperty.call(vars, token)) {
        return match;
      }
      const value = vars[token];
      return value == null ? '' : String(value);
    });
  }

  function warnMissingTranslation(lang, key) {
    const warningKey = `${String(lang)}:${String(key)}`;
    if (runtime.missingWarnings.has(warningKey)) {
      return;
    }
    runtime.missingWarnings.add(warningKey);
    console.warn(`[i18n] missing translation for "${key}" in "${lang}"`);
  }

  function resolveRawTranslation(key, lang) {
    const safeLang = normalizeLanguage(lang || runtime.language);
    const locale = localeCache[safeLang];
    return getNestedValue(locale, key);
  }

  function hasTranslation(key, lang) {
    return typeof resolveRawTranslation(key, lang || runtime.language) === 'string';
  }

  function tOrNull(key, vars) {
    const safeKey = String(key || '').trim();
    if (!safeKey) {
      return null;
    }

    const activeLang = runtime.language;
    const activeValue = resolveRawTranslation(safeKey, activeLang);
    if (typeof activeValue === 'string') {
      return interpolate(activeValue, vars);
    }

    const fallbackValue = resolveRawTranslation(safeKey, DEFAULT_LANGUAGE);
    if (typeof fallbackValue === 'string') {
      warnMissingTranslation(activeLang, safeKey);
      return interpolate(fallbackValue, vars);
    }

    if (!localeCache[DEFAULT_LANGUAGE]) {
      return null;
    }

    warnMissingTranslation(activeLang, safeKey);
    warnMissingTranslation(DEFAULT_LANGUAGE, safeKey);
    return null;
  }

  function t(key, vars) {
    const resolved = tOrNull(key, vars);
    if (resolved !== null) {
      return resolved;
    }
    return String(key || '');
  }

  function applyTranslationsToDOM(root) {
    if (typeof document === 'undefined') {
      return;
    }

    const targetRoot = root && typeof root.querySelectorAll === 'function' ? root : document;

    const textNodes = targetRoot.querySelectorAll('[data-i18n]');
    for (const node of textNodes) {
      const key = node.getAttribute('data-i18n');
      if (!key) {
        continue;
      }
      const translated = t(key);
      if (node.textContent !== translated) {
        node.textContent = translated;
      }
    }

    const titleNodes = targetRoot.querySelectorAll('[data-i18n-title]');
    for (const node of titleNodes) {
      const key = node.getAttribute('data-i18n-title');
      if (!key) {
        continue;
      }
      node.setAttribute('title', t(key));
    }

    const placeholderNodes = targetRoot.querySelectorAll('[data-i18n-placeholder]');
    for (const node of placeholderNodes) {
      const key = node.getAttribute('data-i18n-placeholder');
      if (!key) {
        continue;
      }
      node.setAttribute('placeholder', t(key));
    }

    const ariaLabelNodes = targetRoot.querySelectorAll('[data-i18n-aria-label]');
    for (const node of ariaLabelNodes) {
      const key = node.getAttribute('data-i18n-aria-label');
      if (!key) {
        continue;
      }
      node.setAttribute('aria-label', t(key));
    }
  }

  async function loadLocale(lang) {
    const safeLang = normalizeLanguage(lang);
    if (localeCache[safeLang] && typeof localeCache[safeLang] === 'object') {
      return localeCache[safeLang];
    }

    const localePath = LOCALE_PATHS[safeLang] || LOCALE_PATHS[DEFAULT_LANGUAGE];
    try {
      if (typeof fetch !== 'function') {
        throw new Error('fetch unavailable');
      }
      const response = await fetch(localePath, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      localeCache[safeLang] = payload && typeof payload === 'object' ? payload : {};
    } catch (error) {
      console.warn(`[i18n] locale load failed for ${safeLang}:`, error && error.message ? error.message : error);
      localeCache[safeLang] = {};
    }

    return localeCache[safeLang];
  }

  async function init(options = {}) {
    if (runtime.initPromise) {
      return runtime.initPromise;
    }

    runtime.initPromise = (async () => {
      await Promise.all(SUPPORTED_LANGUAGES.map((lang) => loadLocale(lang)));
      runtime.initialized = true;
      if (options && options.language) {
        setLanguage(options.language, { skipNotify: true });
      }
      return runtime.language;
    })();

    return runtime.initPromise;
  }

  function notifyLanguageChanged(language, previousLanguage) {
    for (const listener of runtime.listeners) {
      try {
        listener({ language, previousLanguage });
      } catch (error) {
        console.warn('[i18n] listener failed:', error);
      }
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('growsim:language-changed', {
        detail: {
          language,
          previousLanguage
        }
      }));
    }
  }

  function setLanguage(input, options = {}) {
    const previousLanguage = runtime.language;
    const nextLanguage = normalizeLanguage(input);
    runtime.language = SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : DEFAULT_LANGUAGE;

    if (runtime.persistenceAdapter && typeof runtime.persistenceAdapter.set === 'function') {
      try {
        runtime.persistenceAdapter.set(runtime.language);
      } catch (error) {
        console.warn('[i18n] persistence adapter set failed:', error);
      }
    }

    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = runtime.language;
    }

    if (options && options.skipNotify === true) {
      return runtime.language;
    }

    notifyLanguageChanged(runtime.language, previousLanguage);
    return runtime.language;
  }

  function onLanguageChange(listener) {
    if (typeof listener !== 'function') {
      return () => undefined;
    }
    runtime.listeners.add(listener);
    return () => {
      runtime.listeners.delete(listener);
    };
  }

  function registerLanguagePersistence(adapter) {
    runtime.persistenceAdapter = adapter && typeof adapter === 'object' ? adapter : null;
  }

  const api = Object.freeze({
    init,
    initialize: init,
    detectLanguage,
    normalizeLanguage,
    getCurrentLanguage,
    setLanguage,
    getSupportedLanguages,
    t,
    tOrNull,
    hasTranslation,
    applyTranslationsToDOM,
    onLanguageChange,
    registerLanguagePersistence,
    DEFAULT_LANGUAGE
  });

  globalScope.GrowSimI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
