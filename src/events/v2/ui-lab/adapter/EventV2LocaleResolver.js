'use strict';

(function initEventV2LocaleResolver(globalScope) {
  function getByPath(target, dottedPath) {
    if (!target || !dottedPath) return null;
    const parts = String(dottedPath).split('.');
    let cursor = target;
    for (let i = 0; i < parts.length; i += 1) {
      const key = parts[i];
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return null;
      cursor = cursor[key];
    }
    return cursor;
  }

  function resolveKey(localeObject, key) {
    if (!localeObject || !key) return null;
    if (Object.prototype.hasOwnProperty.call(localeObject, key)) {
      return localeObject[key];
    }
    return getByPath(localeObject, key);
  }

  function resolveText(valueOrKey, localeBundle, options) {
    const fallbackText = options && options.fallbackText ? options.fallbackText : '';
    const locale = (options && options.locale) || 'de';
    const fallbackLocale = (options && options.fallbackLocale) || 'en';

    if (typeof valueOrKey === 'string') {
      return { text: valueOrKey, usedKey: false, missing: false };
    }

    if (!valueOrKey || typeof valueOrKey !== 'object' || !valueOrKey.key) {
      return { text: fallbackText, usedKey: false, missing: true };
    }

    const key = valueOrKey.key;
    const localeMap = (localeBundle && localeBundle[locale]) || null;
    const fallbackMap = (localeBundle && localeBundle[fallbackLocale]) || null;
    const direct = resolveKey(localeMap, key);
    if (typeof direct === 'string' && direct.length > 0) {
      return { text: direct, usedKey: true, key, missing: false, locale };
    }

    const secondary = resolveKey(fallbackMap, key);
    if (typeof secondary === 'string' && secondary.length > 0) {
      return { text: secondary, usedKey: true, key, missing: false, locale: fallbackLocale };
    }

    return { text: fallbackText || key, usedKey: true, key, missing: true, locale };
  }

  const api = Object.freeze({
    resolveKey,
    resolveText
  });

  globalScope.EventV2LocaleResolver = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

