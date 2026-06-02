'use strict';

function hasNestedPath(obj, dottedPath) {
  if (!obj || typeof dottedPath !== 'string') {
    return false;
  }
  const segments = dottedPath.split('.').filter(Boolean);
  let cursor = obj;
  for (let i = 0; i < segments.length; i += 1) {
    const key = segments[i];
    if (!cursor || !Object.prototype.hasOwnProperty.call(cursor, key)) {
      return false;
    }
    cursor = cursor[key];
  }
  return true;
}

function hasFlatKey(obj, key) {
  return Boolean(obj && typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key));
}

function resolveLocaleKey(localeObject, keyPath) {
  const nested = hasNestedPath(localeObject, keyPath);
  const flat = hasFlatKey(localeObject, keyPath);
  return Object.freeze({
    matched: nested || flat,
    strategy: nested ? 'nested' : (flat ? 'flat' : 'none')
  });
}

module.exports = Object.freeze({
  hasNestedPath,
  hasFlatKey,
  resolveLocaleKey
});

