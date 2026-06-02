#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const PresentationApi = require('../src/events/v2/ui/EventV2PresentationMap.js');

function main() {
  const mapped = PresentationApi.getEventV2Presentation('indoor_dry_rootball');
  assert.strictEqual(mapped.title, 'Trockener Wurzelballen', 'mapped title should be localized');
  assert.strictEqual(mapped.categoryLabel, 'Pflege', 'mapped category should be localized');
  assert.strictEqual(mapped.severityLabel, 'Warnung', 'mapped severity should be localized');
  assert.strictEqual(Array.isArray(mapped.insights), true, 'mapped insights should exist');
  assert(mapped.insights.length >= 3, 'mapped insights should contain at least 3 blocks');

  const optionIds = ['stabilize', 'inspect', 'overreact'];
  for (const optionId of optionIds) {
    const option = PresentationApi.getEventV2OptionPresentation('indoor_dry_rootball', optionId);
    assert.strictEqual(Boolean(option.label), true, `${optionId} should have label`);
    assert.strictEqual(Boolean(option.description), true, `${optionId} should have description`);
    assert.strictEqual(option.label.includes('.'), false, `${optionId} should not expose key-like label`);
  }

  const normalized = PresentationApi.normalizeEventV2Presentation('indoor_dry_rootball', {
    options: [{ id: 'stabilize' }, { id: 'inspect' }, { id: 'overreact' }]
  });
  assert.strictEqual(Array.isArray(normalized.options), true, 'normalized options should be array');
  assert.strictEqual(normalized.options.length, 3, 'normalized options should keep pilot options');
  assert.strictEqual(normalized.options.every((entry) => entry.label && entry.description), true, 'normalized options should include mapped copy');

  const fallback = PresentationApi.getEventV2Presentation('unknown_event_id');
  assert.strictEqual(fallback.title, 'Unbekanntes Ereignis', 'fallback title should be neutral');
  assert.strictEqual(
    fallback.description.includes('finale Darstellung'),
    true,
    'fallback description should be neutral and non-technical'
  );

  const sharedPrepared = PresentationApi.getEventV2Presentation('shared_panic_watering_misread');
  assert.strictEqual(sharedPrepared.title, 'Panikgiessen vermeiden', 'second event mapping should be prepared');
  assert.strictEqual(sharedPrepared.hasDedicatedMapping, true, 'second event should be marked as mapped');

  const summary = {
    ok: true,
    mode: 'event_v2_presentation_map_smoke',
    mappedEventId: 'indoor_dry_rootball',
    preparedEventId: 'shared_panic_watering_misread',
    optionCount: normalized.options.length,
    fallbackTitle: fallback.title
  };
  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}

