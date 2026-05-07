'use strict';

const fs = require('fs');
const path = require('path');
const { normalizeProjectRelative, toPosixPath } = require('./pathUtils');

const OUTPUT_DIR = path.join('tools', 'growsim-dev-center', 'generated', 'test-states');

function basePreset(id, label, description) {
  const now = Date.now();
  return {
    presetMeta: {
      id,
      label,
      description,
      generatedBy: 'GrowSim Dev Control Center',
      generatedAt: new Date(now).toISOString(),
      safeMode: true,
      note: 'Analysis preset only. Do not overwrite real saves without validating against storage.js migrations.'
    },
    schemaVersion: '1.0.0',
    seed: `dev-center-${id}`,
    plantId: `dev-${id}`,
    setup: {
      mode: 'indoor',
      light: 'medium',
      medium: 'soil',
      potSize: 'medium',
      genetics: 'auto',
      createdAtReal: now
    },
    simulation: {
      startRealTimeMs: now,
      lastTickRealTimeMs: now,
      simTimeMs: 0,
      simDay: 0,
      simHour: 8,
      simMinute: 0,
      timeCompression: 12,
      baseSpeed: 12,
      dayWindow: { startHour: 6, endHour: 22 },
      isDaytime: true
    },
    plant: {
      stageIndex: 1,
      stageKey: 'stage_01',
      stageStartSimDay: 0,
      lifecycle: {
        totalSimDays: 56,
        qualityTier: 'normal',
        qualityScore: 75
      },
      assets: {}
    },
    status: {
      water: 70,
      nutrition: 70,
      health: 85,
      stress: 10,
      risk: 8,
      growth: 35
    },
    progression: {
      playerLevel: 1,
      xp: 0,
      coins: 100
    },
    events: {
      scheduler: {
        nextEventRealTimeMs: now + 45 * 60 * 1000,
        lastEventRealTimeMs: 0,
        lastEventId: null,
        deferredUntilDaytime: false
      },
      active: null,
      history: []
    },
    retention: {
      dailyTasks: {
        tasks: [],
        completedIds: [],
        lastRefreshDay: 0
      },
      streak: {
        count: 0,
        lastClaimDay: null
      }
    },
    history: {
      actions: [],
      events: [],
      system: []
    },
    ui: {},
    debug: {
      source: 'dev-center-preset'
    }
  };
}

function createPresetDefinitions() {
  return [
    {
      id: 'new-player',
      label: 'New player',
      description: 'Fresh onboarding-adjacent state with safe default plant conditions.',
      mutate: () => ({})
    },
    {
      id: 'many-coins',
      label: 'Player with many coins',
      description: 'Economy UI test state with high coins and mid-level progression.',
      mutate: (preset) => {
        preset.progression.playerLevel = 8;
        preset.progression.xp = 4200;
        preset.progression.coins = 25000;
      }
    },
    {
      id: 'stressed-plant',
      label: 'Stressed plant',
      description: 'Bad-conditions state for care feedback and recovery testing.',
      mutate: (preset) => {
        preset.simulation.simDay = 14;
        preset.plant.stageIndex = 4;
        preset.plant.stageKey = 'stage_04';
        preset.status.water = 22;
        preset.status.nutrition = 31;
        preset.status.health = 48;
        preset.status.stress = 76;
        preset.status.risk = 67;
        preset.status.growth = 18;
      }
    },
    {
      id: 'event-active',
      label: 'Event active',
      description: 'State with a synthetic active event object for UI shape testing.',
      mutate: (preset) => {
        preset.simulation.simDay = 21;
        preset.events.active = {
          id: 'dev_center_active_event',
          title: 'Dev Center Test Event',
          description: 'Synthetic event payload for UI testing only.',
          options: [
            { id: 'inspect', label: 'Inspect', effect: 'No automatic effect in preset.' }
          ]
        };
        preset.events.history.push({ type: 'event', id: 'dev_center_active_event', atRealTimeMs: Date.now() });
      }
    },
    {
      id: 'daily-tasks-open',
      label: 'Daily tasks open',
      description: 'Retention test state with unfinished daily tasks.',
      mutate: (preset) => {
        preset.retention.dailyTasks.tasks = [
          { id: 'water_check', label: 'Check water level', completed: false },
          { id: 'inspect_leafs', label: 'Inspect leaf health', completed: false },
          { id: 'open_timeline', label: 'Review timeline', completed: false }
        ];
      }
    },
    {
      id: 'near-harvest',
      label: 'Near harvest',
      description: 'Late-stage plant with healthy conditions and harvest proximity.',
      mutate: (preset) => {
        preset.simulation.simDay = 52;
        preset.plant.stageIndex = 11;
        preset.plant.stageKey = 'stage_11';
        preset.plant.lifecycle.qualityTier = 'perfect';
        preset.plant.lifecycle.qualityScore = 91;
        preset.status = { water: 74, nutrition: 78, health: 91, stress: 14, risk: 10, growth: 88 };
      }
    },
    {
      id: 'high-level',
      label: 'High level',
      description: 'Progression-heavy state for locked/unlocked UI testing.',
      mutate: (preset) => {
        preset.progression.playerLevel = 32;
        preset.progression.xp = 88000;
        preset.progression.coins = 12000;
        preset.simulation.simDay = 35;
      }
    },
    {
      id: 'low-resources',
      label: 'Low resources',
      description: 'Resource scarcity state for affordability and warning flows.',
      mutate: (preset) => {
        preset.progression.coins = 5;
        preset.status.water = 18;
        preset.status.nutrition = 24;
        preset.status.health = 62;
        preset.status.stress = 45;
        preset.status.risk = 52;
      }
    }
  ];
}

function buildPreset(definition) {
  const preset = basePreset(definition.id, definition.label, definition.description);
  definition.mutate(preset);
  return preset;
}

function ensureOutputDir(projectRoot) {
  const normalized = normalizeProjectRelative(projectRoot, OUTPUT_DIR);
  fs.mkdirSync(normalized.absolutePath, { recursive: true });
  return normalized;
}

function listPresetDefinitions() {
  return createPresetDefinitions().map(({ id, label, description }) => ({ id, label, description }));
}

function generatePreset(projectRoot, presetId) {
  const definition = createPresetDefinitions().find((item) => item.id === presetId);
  if (!definition) {
    const error = new Error('Unknown preset id.');
    error.code = 'UNKNOWN_PRESET';
    throw error;
  }
  const outputDir = ensureOutputDir(projectRoot);
  const preset = buildPreset(definition);
  const fileName = `${definition.id}.json`;
  const absolutePath = path.join(outputDir.absolutePath, fileName);
  fs.writeFileSync(absolutePath, `${JSON.stringify(preset, null, 2)}\n`, 'utf8');
  return {
    preset,
    file: toPosixPath(path.relative(projectRoot, absolutePath)),
    generatedAt: preset.presetMeta.generatedAt
  };
}

function generateAllPresets(projectRoot) {
  return createPresetDefinitions().map((definition) => generatePreset(projectRoot, definition.id));
}

module.exports = {
  generateAllPresets,
  generatePreset,
  listPresetDefinitions
};
