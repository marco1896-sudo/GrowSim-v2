'use strict';

(function attachGrowSimBuddyCarePhaseEngine(globalScope) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  const PHASES = Object.freeze([
    'seedling',
    'early_veg',
    'veg',
    'stretch',
    'flower',
    'ripening',
    'harvest_window',
    'unknown'
  ]);

  function normalizePlantType(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    if (safeValue === 'auto' || safeValue === 'autoflower') {
      return 'auto';
    }
    if (safeValue === 'photoperiod' || safeValue === 'photo') {
      return 'photoperiod';
    }
    return 'unknown';
  }

  function normalizeEnvironment(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    if (safeValue === 'indoor' || safeValue === 'outdoor' || safeValue === 'greenhouse') {
      return safeValue;
    }
    return 'unknown';
  }

  function normalizeDateInput(value) {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }
    const safeValue = value.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(safeValue);
    if (!match) {
      const parsed = Date.parse(safeValue);
      return Number.isFinite(parsed) ? parsed : null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    return Date.UTC(year, month - 1, day);
  }

  function getDaySinceStart(startDate, options = {}) {
    const startMs = normalizeDateInput(startDate);
    if (!Number.isFinite(startMs)) {
      return null;
    }
    const nowSource = options && Object.prototype.hasOwnProperty.call(options, 'now')
      ? options.now
      : Date.now();
    const nowDate = new Date(nowSource);
    const nowMs = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());
    const diffMs = nowMs - startMs;
    if (!Number.isFinite(diffMs) || diffMs < 0) {
      return null;
    }
    return Math.floor(diffMs / DAY_MS) + 1;
  }

  function getAutoPhase(daySinceStart) {
    const day = Number(daySinceStart);
    if (!Number.isFinite(day) || day <= 0) {
      return 'unknown';
    }
    if (day <= 14) return 'seedling';
    if (day <= 28) return 'early_veg';
    if (day <= 42) return 'veg';
    if (day <= 70) return 'flower';
    if (day <= 84) return 'ripening';
    return 'harvest_window';
  }

  function getPhotoPhase(daySinceStart, environment) {
    const day = Number(daySinceStart);
    const safeEnvironment = normalizeEnvironment(environment);
    if (!Number.isFinite(day) || day <= 0) {
      return 'unknown';
    }
    if (safeEnvironment === 'unknown') {
      return 'unknown';
    }
    if (day <= 14) return 'seedling';
    if (day <= 42) return 'early_veg';
    if (day <= 70) return 'veg';
    if (safeEnvironment === 'indoor') {
      return 'veg';
    }
    if (day <= 95) return 'stretch';
    if (day <= 140) return 'flower';
    if (day <= 165) return 'ripening';
    return 'harvest_window';
  }

  function getPlantPhase(plant, options = {}) {
    const safePlant = plant && typeof plant === 'object' ? plant : {};
    const plantType = normalizePlantType(safePlant.plantType || safePlant.type);
    const daySinceStart = getDaySinceStart(safePlant.startDate, options);
    if (!Number.isFinite(daySinceStart)) {
      return 'unknown';
    }
    if (plantType === 'auto') {
      return getAutoPhase(daySinceStart);
    }
    if (plantType === 'photoperiod') {
      return getPhotoPhase(daySinceStart, safePlant.environment);
    }
    return 'unknown';
  }

  function getPhaseLabel(phase, locale = 'en') {
    const safePhase = PHASES.includes(String(phase || '').trim().toLowerCase())
      ? String(phase || '').trim().toLowerCase()
      : 'unknown';
    const language = String(locale || 'en').trim().toLowerCase().startsWith('de')
      ? 'de'
      : (String(locale || 'en').trim().toLowerCase().startsWith('es') ? 'es' : 'en');
    const labels = {
      de: {
        seedling: 'Keimling',
        early_veg: 'Fruehe Vegi',
        veg: 'Vegetative Phase',
        stretch: 'Stretch',
        flower: 'Bluete',
        ripening: 'Reifephase',
        harvest_window: 'Erntefenster',
        unknown: 'Unbekannt'
      },
      en: {
        seedling: 'Seedling',
        early_veg: 'Early veg',
        veg: 'Vegetative',
        stretch: 'Stretch',
        flower: 'Flower',
        ripening: 'Ripening',
        harvest_window: 'Harvest window',
        unknown: 'Unknown'
      },
      es: {
        seedling: 'Plantula',
        early_veg: 'Vegetativo temprano',
        veg: 'Vegetativo',
        stretch: 'Stretch',
        flower: 'Floracion',
        ripening: 'Maduracion',
        harvest_window: 'Ventana de cosecha',
        unknown: 'Desconocido'
      }
    };
    return labels[language][safePhase] || labels.en[safePhase] || labels.en.unknown;
  }

  const api = Object.freeze({
    PHASES,
    normalizePlantType,
    normalizeEnvironment,
    getDaySinceStart,
    getAutoPhase,
    getPhotoPhase,
    getPlantPhase,
    getPhaseLabel
  });

  globalScope.GrowSimBuddyCarePhaseEngine = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
