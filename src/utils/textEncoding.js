/* global window */
(function attachTextEncoding(globalScope) {
  'use strict';

  const MOJIBAKE_REPLACEMENTS = Object.freeze([
    ['\u00C3\u201E', 'Ä'],
    ['\u00C3\u201C', 'Ö'],
    ['\u00C3\u0152', 'Ü'],
    ['\u00C3\u00A4', 'ä'],
    ['\u00C3\u00B6', 'ö'],
    ['\u00C3\u00BC', 'ü'],
    ['\u00C3\u0178', 'ß'],
    ['\u00E2\u20AC\u201C', '–'],
    ['\u00E2\u20AC\u201D', '—'],
    ['\u00E2\u20AC\u017E', '„'],
    ['\u00E2\u20AC\u0153', '“'],
    ['\u00E2\u20AC\u009D', '”'],
    ['\u00E2\u20AC\u02DC', '‘'],
    ['\u00E2\u20AC\u2122', '’'],
    ['\u00E2\u20AC\u00A6', '…']
  ]);

  function repairMojibakeText(value) {
    if (typeof value !== 'string') {
      return value;
    }

    let repaired = value;
    for (const [broken, fixed] of MOJIBAKE_REPLACEMENTS) {
      if (repaired.includes(broken)) {
        repaired = repaired.split(broken).join(fixed);
      }
    }
    return repaired;
  }

  function deepRepairMojibake(value) {
    if (typeof value === 'string') {
      return repairMojibakeText(value);
    }

    if (Array.isArray(value)) {
      return value.map((entry) => deepRepairMojibake(entry));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, deepRepairMojibake(entry)])
    );
  }

  globalScope.GrowSimTextEncoding = Object.freeze({
    repairMojibakeText,
    deepRepairMojibake
  });
})(window);
