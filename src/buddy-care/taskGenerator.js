'use strict';

(function attachGrowSimBuddyCareTaskGenerator(globalScope) {
  const phaseEngine = globalScope.GrowSimBuddyCarePhaseEngine
    || (typeof require === 'function' ? require('./phaseEngine.js') : null);

  function getTodayDateString(options = {}) {
    const nowSource = options && Object.prototype.hasOwnProperty.call(options, 'now')
      ? options.now
      : Date.now();
    const nowDate = new Date(nowSource);
    const year = nowDate.getUTCFullYear();
    const month = String(nowDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(nowDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function buildTask(plant, partialTask, options = {}) {
    const safePlant = plant && typeof plant === 'object' ? plant : {};
    const safePartial = partialTask && typeof partialTask === 'object' ? partialTask : {};
    const dueDate = safePartial.dueDate || getTodayDateString(options);
    return {
      id: String(safePartial.id || `${String(safePlant.id || 'plant')}:${String(safePartial.category || 'other')}:${String(safePartial.title || 'task')}`),
      plantId: String(safePlant.id || ''),
      title: String(safePartial.title || '').trim(),
      description: String(safePartial.description || '').trim(),
      category: String(safePartial.category || 'other').trim(),
      priority: String(safePartial.priority || 'medium').trim(),
      dueDate,
      source: String(safePartial.source || 'buddy_care_phase_generator').trim()
    };
  }

  function createSeedlingTasks(plant, options) {
    return [
      buildTask(plant, {
        id: 'seedling-observe',
        title: 'Zustand kurz pruefen',
        description: 'Beobachte Haltung, Farbe und allgemeine Stabilitaet.',
        category: 'observe',
        priority: 'medium'
      }, options),
      buildTask(plant, {
        id: 'seedling-water-check',
        title: 'Medium nicht dauerhaft nass halten',
        description: 'Pruefe, ob das Medium zwischen den Checks wieder Luft bekommt.',
        category: 'water_check',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'seedling-photo',
        title: 'Foto fuer Verlauf machen',
        description: 'Ein ruhiges Vergleichsfoto hilft dir spaeter beim Einordnen.',
        category: 'photo',
        priority: 'low'
      }, options)
    ];
  }

  function createEarlyVegTasks(plant, options) {
    return [
      buildTask(plant, {
        id: 'early-veg-water-check',
        title: 'Bodenfeuchte pruefen',
        description: 'Kontrolliere, ob die Routine noch zur aktuellen Entwicklung passt.',
        category: 'water_check',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'early-veg-observe',
        title: 'Blattfarbe beobachten',
        description: 'Achte auf ruhige, gleichmaessige Entwicklung.',
        category: 'observe',
        priority: 'medium'
      }, options),
      buildTask(plant, {
        id: 'early-veg-photo',
        title: 'Foto machen',
        description: 'Ein neues Vergleichsbild macht Veraenderungen leichter sichtbar.',
        category: 'photo',
        priority: 'low'
      }, options)
    ];
  }

  function createVegTasks(plant, options) {
    const environment = phaseEngine && typeof phaseEngine.normalizeEnvironment === 'function'
      ? phaseEngine.normalizeEnvironment(plant && plant.environment)
      : String(plant && plant.environment || 'unknown').trim().toLowerCase();
    const tasks = [
      buildTask(plant, {
        id: 'veg-observe',
        title: 'Wachstum beobachten',
        description: 'Pruefe, ob die Pflanze ruhig und gleichmaessig weiterarbeitet.',
        category: 'observe',
        priority: 'medium'
      }, options),
      buildTask(plant, {
        id: 'veg-water-check',
        title: 'Bodenfeuchte pruefen',
        description: 'Halte die aktuelle Routine sauber im Blick.',
        category: 'water_check',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'veg-document-height',
        title: 'Hoehe dokumentieren',
        description: 'Kurze Hoehen-Notiz schafft Ueberblick fuer die naechsten Tage.',
        category: 'document',
        priority: 'medium'
      }, options)
    ];
    if (environment === 'outdoor' || environment === 'greenhouse') {
      tasks[2] = buildTask(plant, {
        id: 'veg-weather-stress',
        title: 'Wetterstress beobachten',
        description: 'Achte auf Hitze, Wind oder andere Wetterspitzen.',
        category: 'environment',
        priority: 'medium'
      }, options);
    }
    return tasks;
  }

  function createStretchTasks(plant, options) {
    return [
      buildTask(plant, {
        id: 'stretch-height',
        title: 'Hoehe dokumentieren',
        description: 'Im Stretch hilft dir ein kurzer Zahlenvergleich jeden Tag.',
        category: 'document',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'stretch-space',
        title: 'Platzbedarf pruefen',
        description: 'Behalte Abstand und Bewegungsraum ruhig im Blick.',
        category: 'safety',
        priority: 'medium'
      }, options),
      buildTask(plant, {
        id: 'stretch-photo',
        title: 'Fotovergleich machen',
        description: 'Vergleichsfotos zeigen Stretch-Verlauf oft klarer als das Gefuehl.',
        category: 'photo',
        priority: 'medium'
      }, options)
    ];
  }

  function createFlowerTasks(plant, options) {
    const environment = phaseEngine && typeof phaseEngine.normalizeEnvironment === 'function'
      ? phaseEngine.normalizeEnvironment(plant && plant.environment)
      : String(plant && plant.environment || 'unknown').trim().toLowerCase();
    const tasks = [
      buildTask(plant, {
        id: 'flower-visual-check',
        title: 'Bluetenbereich visuell pruefen',
        description: 'Kontrolliere ruhig Struktur und allgemeine Entwicklung.',
        category: 'observe',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'flower-environment',
        title: 'Luftfeuchte und Umgebung beobachten',
        description: 'Achte auf ein ruhiges Klima ohne hektische Gegensteuerung.',
        category: 'environment',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'flower-photo',
        title: 'Fotoverlauf dokumentieren',
        description: 'Ein neues Foto hilft dir, Unterschiede frueher zu erkennen.',
        category: 'photo',
        priority: 'medium'
      }, options)
    ];
    if (environment === 'greenhouse') {
      tasks[1] = buildTask(plant, {
        id: 'flower-greenhouse-humidity',
        title: 'Feuchte und Luftbewegung beobachten',
        description: 'Im Gewaechshaus lohnt sich ein ruhiger Blick auf Feuchte und Luftfluss.',
        category: 'environment',
        priority: 'high'
      }, options);
    }
    return tasks;
  }

  function createRipeningTasks(plant, options) {
    return [
      buildTask(plant, {
        id: 'ripening-observe',
        title: 'Reifezeichen beobachten',
        description: 'Halte den aktuellen Stand ruhig und ohne Vorgriff fest.',
        category: 'observe',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'ripening-flower-check',
        title: 'Bluetenbereich kontrollieren',
        description: 'Behalte Stabilitaet und Auffaelligkeiten im Blick.',
        category: 'safety',
        priority: 'medium'
      }, options),
      buildTask(plant, {
        id: 'ripening-notes',
        title: 'Abschlussnotizen vorbereiten',
        description: 'Kurze Notizen helfen dir spaeter beim Rueckblick.',
        category: 'document',
        priority: 'low'
      }, options)
    ];
  }

  function createHarvestWindowTasks(plant, options) {
    return [
      buildTask(plant, {
        id: 'harvest-window-check',
        title: 'Erntefenster pruefen',
        description: 'Beobachte das Zeitfenster ruhig statt ueberstuerzt zu handeln.',
        category: 'observe',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'harvest-photo',
        title: 'Abschlussfoto machen',
        description: 'Ein Abschlussfoto gibt dir einen klaren Vergleich fuer spaeter.',
        category: 'photo',
        priority: 'medium'
      }, options),
      buildTask(plant, {
        id: 'harvest-report',
        title: 'Grow-Bericht vorbereiten',
        description: 'Sammle kurz, was du aus diesem Verlauf mitnehmen willst.',
        category: 'weekly_review',
        priority: 'medium'
      }, options)
    ];
  }

  function createUnknownTasks(plant, options) {
    return [
      buildTask(plant, {
        id: 'unknown-complete-data',
        title: 'Pflanzendaten vervollstaendigen',
        description: 'Typ, Umgebung und Startdatum machen die Schaetzung deutlich brauchbarer.',
        category: 'other',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'unknown-start-date',
        title: 'Startdatum pruefen',
        description: 'Ohne Startdatum bleibt die Phase nur schwer einschaetzbar.',
        category: 'document',
        priority: 'high'
      }, options),
      buildTask(plant, {
        id: 'unknown-first-check',
        title: 'Ersten Check vorbereiten',
        description: 'Ein kurzer Ausgangscheck schafft Ruhe fuer die naechsten Tage.',
        category: 'observe',
        priority: 'medium'
      }, options)
    ];
  }

  function getPlantPhase(plant, options) {
    if (phaseEngine && typeof phaseEngine.getPlantPhase === 'function') {
      return phaseEngine.getPlantPhase(plant, options);
    }
    return 'unknown';
  }

  function generateTodayTasksForPlant(plant, options = {}) {
    const phase = String(options.phase || getPlantPhase(plant, options) || 'unknown').trim().toLowerCase();
    let tasks;
    switch (phase) {
      case 'seedling':
        tasks = createSeedlingTasks(plant, options);
        break;
      case 'early_veg':
        tasks = createEarlyVegTasks(plant, options);
        break;
      case 'veg':
        tasks = createVegTasks(plant, options);
        break;
      case 'stretch':
        tasks = createStretchTasks(plant, options);
        break;
      case 'flower':
        tasks = createFlowerTasks(plant, options);
        break;
      case 'ripening':
        tasks = createRipeningTasks(plant, options);
        break;
      case 'harvest_window':
        tasks = createHarvestWindowTasks(plant, options);
        break;
      default:
        tasks = createUnknownTasks(plant, options);
        break;
    }
    return tasks.slice(0, 3);
  }

  function generateWeeklyTasksForPlant(plant, options = {}) {
    const phase = String(options.phase || getPlantPhase(plant, options) || 'unknown').trim().toLowerCase();
    const weeklyTasks = [
      buildTask(plant, {
        id: `weekly-review:${phase}`,
        title: 'Wochenrueckblick machen',
        description: 'Halte kurz fest, was stabil lief und was du weiter beobachten willst.',
        category: 'weekly_review',
        priority: 'medium',
        source: 'buddy_care_weekly_generator'
      }, options)
    ];
    if (phase === 'flower' || phase === 'ripening' || phase === 'harvest_window') {
      weeklyTasks.push(buildTask(plant, {
        id: `weekly-photo:${phase}`,
        title: 'Wochenfoto vergleichen',
        description: 'Ein ruhiger Wochenvergleich hilft beim Einordnen ohne Aktionismus.',
        category: 'photo',
        priority: 'low',
        source: 'buddy_care_weekly_generator'
      }, options));
    }
    return weeklyTasks.slice(0, 2);
  }

  function normalizeTasksByPlant(tasksByPlant) {
    if (!tasksByPlant || typeof tasksByPlant !== 'object') {
      return {};
    }
    return tasksByPlant;
  }

  function generateBuddyTodaySummary(plants, tasksByPlant) {
    const safePlants = Array.isArray(plants) ? plants : [];
    const safeTasksByPlant = normalizeTasksByPlant(tasksByPlant);
    let totalTasks = 0;
    let hasUnknownPhase = false;
    let hasFloweringFocus = false;

    for (const plant of safePlants) {
      const phase = getPlantPhase(plant, {});
      const tasks = Array.isArray(safeTasksByPlant[String(plant && plant.id || '')])
        ? safeTasksByPlant[String(plant && plant.id || '')]
        : [];
      totalTasks += tasks.length;
      if (phase === 'unknown') {
        hasUnknownPhase = true;
      }
      if (phase === 'flower' || phase === 'ripening' || phase === 'harvest_window') {
        hasFloweringFocus = true;
      }
    }

    let messageKey = 'buddyCare.summary.observe_and_document';
    if (hasUnknownPhase) {
      messageKey = 'buddyCare.summary.complete_data';
    } else if (hasFloweringFocus) {
      messageKey = 'buddyCare.summary.stay_observant';
    }

    return {
      totalPlants: safePlants.length,
      totalTasks,
      messageKey
    };
  }

  const api = Object.freeze({
    generateTodayTasksForPlant,
    generateWeeklyTasksForPlant,
    generateBuddyTodaySummary
  });

  globalScope.GrowSimBuddyCareTaskGenerator = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
