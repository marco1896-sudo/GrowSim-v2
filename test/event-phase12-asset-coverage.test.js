#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const eventAssets = require('../src/events/eventAssets.js');

const registry = require('../data/event-assets.registry.json');
const gapList = require('../data/event-assets.gaps.json');

eventAssets.setDraftRegistry(registry);
eventAssets.setGapListDraft(gapList);

(function testRegistryCoverageForPrioritizedEvents() {
  const cases = [
    ['drooping_leaves_warning', 'event-overwatering'],
    ['root_stress_followup', 'event-root-explosion'],
    ['stable_growth_reward', 'event-perfect-watering'],
    ['v2_water_dry_pot', 'event-drought-stress'],
    ['v2_water_late_watering_pattern', 'event-drought-stress'],
    ['v2_water_poor_dryback', 'event-overwatering'],
    ['v2_water_root_oxygen_debt', 'event-root-explosion'],
    ['v2_water_borderline_irrigation', 'event-drought-stress'],
    ['v2_water_uneven_dryback', 'event-overwatering'],
    ['v2_water_rootzone_recovery_check', 'event-stress-recovery'],
    ['v2_root_zone_cold_warning', 'event-cold-night'],
    ['v2_nutrition_ph_drift_slow', 'event-nutrient-lockout'],
    ['v2_nutrition_salt_buildup', 'event-nutrient-lockout'],
    ['v2_nutrition_post_correction_instability', 'event-nutrient-lockout'],
    ['v2_nutrition_uptake_stabilizing', 'event-stress-recovery'],
    ['v2_climate_rh_night_high', 'event-fungus-infection'],
    ['v2_climate_weak_air_movement', 'event-fungus-infection'],
    ['v2_climate_bud_microclimate_pocket', 'event-fungus-infection'],
    ['v2_climate_microclimate_relief', 'event-stress-recovery'],
    ['v2_light_lamp_too_close', 'event-light-burn'],
    ['v2_structure_stretch_surge', 'event-rapid-growth-surge'],
    ['v2_structure_defoliation_window', 'event-rapid-growth-surge'],
    ['v2_structure_top_load_shift', 'event-rapid-growth-surge'],
    ['v2_structure_support_settled', 'event-stress-recovery'],
    ['v2_pest_thrips_wave', 'event-pest-invasion'],
    ['v2_disease_root_warning', 'event-fungus-infection'],
    ['v2_outdoor_rain_series', 'event-fungus-outbreak'],
    ['fungus_gnat_wave', 'event-pest-invasion'],
    ['root_bound_warning', 'event-root-explosion'],
    ['late_flower_humidity', 'event-fungus-infection']
  ];

  cases.forEach(([eventId, expectedAssetId]) => {
    const media = eventAssets.buildMediaModel({
      eventId,
      category: 'generic',
      title: eventId,
      stateTone: 'active'
    });

    assert.strictEqual(media.fallbackOrigin, 'explicit_event_mapping', `${eventId} should use explicit mapping`);
    assert.strictEqual(media.assetId, expectedAssetId, `${eventId} should resolve to ${expectedAssetId}`);
  });
})();

(function testExplicitIconsResolveForMappedStates() {
  const thrips = eventAssets.buildMediaModel({
    eventId: 'v2_pest_thrips_wave',
    category: 'pest',
    title: 'Thrips',
    stateTone: 'warning',
    preferredKind: 'icon'
  });
  const rootFollowup = eventAssets.buildMediaModel({
    eventId: 'root_stress_followup',
    category: 'disease',
    title: 'Root Follow-up',
    stateTone: 'followup',
    preferredKind: 'icon'
  });

  assert.strictEqual(thrips.fallbackOrigin, 'explicit_event_mapping');
  assert.strictEqual(thrips.assetId, 'thrips_early');
  assert.strictEqual(rootFollowup.fallbackOrigin, 'explicit_event_mapping');
  assert.strictEqual(rootFollowup.assetId, 'root_bound_warning');
})();

(function testFallbackStillWorksForUnmappedStates() {
  const media = eventAssets.buildMediaModel({
    eventId: 'unknown_pest_issue',
    category: 'pest',
    title: 'Unknown Pest',
    stateTone: 'warning'
  });

  assert.ok(['category_fallback', 'generic_placeholder'].includes(media.fallbackOrigin));
})();

(function testGapListNoLongerFlagsCoveredEvents() {
  const coveredIds = [
    'drooping_leaves_warning',
    'root_stress_followup',
    'stable_growth_reward',
    'v2_outdoor_rain_series',
    'v2_water_late_watering_pattern',
    'v2_water_poor_dryback',
    'v2_water_root_oxygen_debt',
    'v2_water_borderline_irrigation',
    'v2_climate_microclimate_relief',
    'v2_structure_support_settled'
  ];

  coveredIds.forEach((eventId) => {
    const gap = gapList.gaps.find((entry) => entry && entry.eventId === eventId);
    assert.strictEqual(gap, undefined, `${eventId} should not remain in the gap list after explicit coverage`);
  });
})();

(function testRegistryMappingsPointToRealAssets() {
  const assetIds = [
    'event-root-explosion',
    'event-fungus-infection',
    'event-pest-invasion',
    'event-drought-stress',
    'event-light-burn',
    'event-rapid-growth-surge',
    'event-cold-night',
    'root_bound_warning',
    'thrips_early',
    'topsoil_mold',
    'late_flower_humidity'
  ];

  assetIds.forEach((assetId) => {
    const asset = registry.assets[assetId];
    assert.ok(asset, `${assetId} should exist in the registry`);
    const absolute = path.join(__dirname, '..', asset.path);
    assert.ok(fs.existsSync(absolute), `${assetId} file should exist on disk`);
  });
})();

(function testRegistrySummaryMatchesActualAssetCount() {
  assert.strictEqual(
    Number(registry.inventorySummary && registry.inventorySummary.totalAssets || 0),
    Object.keys(registry.assets || {}).length
  );
})();

console.log('event-phase12-asset-coverage tests passed');
