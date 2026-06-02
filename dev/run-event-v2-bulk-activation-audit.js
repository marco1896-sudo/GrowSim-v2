#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const ActivationRegistryApi = require('../src/events/v2/runtime/EventV2ActivationRegistry.js');
const PresentationMapApi = require('../src/events/v2/ui/EventV2PresentationMap.js');
const OutcomePolicyApi = require('../src/events/v2/runtime/EventV2OutcomePolicy.js');

const ROOT = path.resolve(__dirname, '..');
const FINAL_ROOT = path.join(ROOT, 'assets', 'events', 'v2', 'final');
const CATALOG_ROOT = path.join(ROOT, 'data', 'events', 'catalog', 'events');
const REPORT_JSON_PATH = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-event-v2-bulk-activation-audit.json');
const REPORT_MD_PATH = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-event-v2-bulk-activation-audit.md');

function toBrowserPath(eventId, fileName) {
  return `assets/events/v2/final/${eventId}/${fileName}`;
}

function collectCatalogEvents() {
  const map = new Map();
  const dirs = fs.readdirSync(CATALOG_ROOT, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const dir of dirs) {
    const dirPath = path.join(CATALOG_ROOT, dir.name);
    const files = fs.readdirSync(dirPath).filter((fileName) => fileName.endsWith('.event.json'));
    for (const fileName of files) {
      const filePath = path.join(dirPath, fileName);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      map.set(String(raw.id), raw);
    }
  }
  return map;
}

function ensureReportDirs() {
  fs.mkdirSync(path.dirname(REPORT_JSON_PATH), { recursive: true });
}

function main() {
  const catalogEvents = collectCatalogEvents();
  const finalEventIds = fs.readdirSync(FINAL_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const runtimeEnabledEvents = ActivationRegistryApi.getEventV2RuntimeEnabledEvents();
  const audits = [];
  const blocked = [];

  for (const eventId of finalEventIds) {
    const heroPath = path.join(FINAL_ROOT, eventId, 'hero.webp');
    const fallbackPath = path.join(FINAL_ROOT, eventId, 'fallback.webp');
    const hasHero = fs.existsSync(heroPath);
    const hasFallback = fs.existsSync(fallbackPath);
    const catalog = catalogEvents.get(eventId) || null;
    const activation = ActivationRegistryApi.getEventV2ActivationEntry(eventId);
    const options = catalog && Array.isArray(catalog.options) ? catalog.options.map((entry) => String(entry.id || '')).filter(Boolean) : [];
    const presentation = PresentationMapApi.getEventV2Presentation(eventId);
    const visual = PresentationMapApi.getEventV2VisualPresentation(eventId);
    const policyChecks = options.map((optionId) => ({
      optionId,
      policy: OutcomePolicyApi.getEventV2OutcomePolicy(eventId, optionId),
    }));
    const hasSafePolicies = policyChecks.every((entry) => Boolean(entry.policy));

    const status = hasHero && hasFallback && catalog && options.length > 0 && hasSafePolicies
      ? 'ready'
      : 'blocked';
    if (status === 'blocked') {
      blocked.push(eventId);
    }

    audits.push({
      eventId,
      status,
      runtimeEnabled: runtimeEnabledEvents.includes(eventId),
      activationEntryPresent: Boolean(activation),
      catalogPresent: Boolean(catalog),
      optionCount: options.length,
      heroExists: hasHero,
      fallbackExists: hasFallback,
      heroBrowserPath: toBrowserPath(eventId, 'hero.webp'),
      fallbackBrowserPath: toBrowserPath(eventId, 'fallback.webp'),
      presentationMapped: Boolean(presentation && presentation.title),
      visualMapped: Boolean(visual && visual.imagePath && visual.fallbackImagePath),
      policyPrepared: hasSafePolicies,
      defaultSafePolicyOnly: policyChecks.every((entry) => {
        if (!entry.policy) return false;
        return ['no_delta', 'guardrail_only', 'apply_delta'].includes(String(entry.policy.mode || ''));
      }),
      notes: status === 'ready' ? [] : ['missing_required_prerequisite'],
    });
  }

  const report = {
    ok: blocked.length === 0,
    reportType: 'event-v2-bulk-activation-audit',
    finalEventCount: finalEventIds.length,
    runtimeEnabledCount: runtimeEnabledEvents.length,
    runtimeEnabledEvents,
    blockedEvents: blocked,
    audits,
  };

  ensureReportDirs();
  fs.writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const mdLines = [
    '# Event V2 Bulk Activation Audit',
    '',
    `Status: ${report.ok ? 'PASS' : 'WARN'}`,
    '',
    `Final Event Count: ${report.finalEventCount}`,
    `Runtime Enabled Count: ${report.runtimeEnabledCount}`,
    '',
    '## Runtime Enabled Events',
    ...runtimeEnabledEvents.map((eventId) => `- ${eventId}`),
    '',
    '## Blocked Events',
    ...(blocked.length ? blocked.map((eventId) => `- ${eventId}`) : ['- none']),
    '',
  ];
  fs.writeFileSync(REPORT_MD_PATH, mdLines.join('\n'), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

main();
