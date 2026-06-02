#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const ActivationRegistryApi = require('../src/events/v2/runtime/EventV2ActivationRegistry.js');

const ROOT = process.cwd();
const FINAL_ROOT = path.join(ROOT, 'assets', 'events', 'v2', 'final');
const LIVE_PILOT_EVENTS = Object.freeze(
  ActivationRegistryApi && typeof ActivationRegistryApi.getEventV2RuntimeEnabledEvents === 'function'
    ? ActivationRegistryApi.getEventV2RuntimeEnabledEvents()
    : ['indoor_dry_rootball', 'shared_panic_watering_misread']
);

function toBrowserPath(eventId, fileName) {
  return `assets/events/v2/final/${eventId}/${fileName}`;
}

function existsFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile();
  } catch (_error) {
    return false;
  }
}

function auditEventDir(eventId) {
  const dir = path.join(FINAL_ROOT, eventId);
  const heroPath = path.join(dir, 'hero.webp');
  const fallbackPath = path.join(dir, 'fallback.webp');
  const folderExists = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  const heroExists = folderExists && existsFile(heroPath);
  const fallbackExists = folderExists && existsFile(fallbackPath);

  const warnings = [];
  const errors = [];

  if (!folderExists) warnings.push('folder_missing');
  if (folderExists && !heroExists) warnings.push('hero_missing');
  if (folderExists && !fallbackExists) warnings.push('fallback_missing');
  if (LIVE_PILOT_EVENTS.includes(eventId) && !heroExists && !fallbackExists) {
    errors.push('live_event_missing_hero_and_fallback');
  }

  return {
    eventId,
    folderExists,
    hero: {
      exists: heroExists,
      extensionOk: heroPath.toLowerCase().endsWith('.webp'),
      browserPath: toBrowserPath(eventId, 'hero.webp'),
    },
    fallback: {
      exists: fallbackExists,
      extensionOk: fallbackPath.toLowerCase().endsWith('.webp'),
      browserPath: toBrowserPath(eventId, 'fallback.webp'),
    },
    warnings,
    errors,
  };
}

function main() {
  const result = {
    ok: true,
    reportType: 'event-v2-final-assets-audit',
    finalAssetsRoot: 'assets/events/v2/final',
    livePilotEvents: LIVE_PILOT_EVENTS.slice(),
    events: [],
    warnings: [],
    errors: [],
  };

  if (!fs.existsSync(FINAL_ROOT)) {
    result.ok = false;
    result.errors.push('final_assets_root_missing');
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const eventDirs = fs.readdirSync(FINAL_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const eventId of eventDirs) {
    const audit = auditEventDir(eventId);
    result.events.push(audit);
    if (audit.warnings.length) {
      result.warnings.push({ eventId, warnings: audit.warnings.slice() });
    }
    if (audit.errors.length) {
      result.errors.push({ eventId, errors: audit.errors.slice() });
    }
  }

  for (const liveEventId of LIVE_PILOT_EVENTS) {
    if (!eventDirs.includes(liveEventId)) {
      result.errors.push({ eventId: liveEventId, errors: ['live_event_folder_missing'] });
    }
  }

  result.ok = result.errors.length === 0;
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main();
