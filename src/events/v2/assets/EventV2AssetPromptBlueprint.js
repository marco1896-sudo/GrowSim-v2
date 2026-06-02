'use strict';

(function initEventV2AssetPromptBlueprint(globalScope) {
  const sharedBlocks = Object.freeze({
    buddyIdentity: [
      'Same Buddy character across all motifs.',
      'Stable silhouette, face, eye design and color family.',
      'Friendly coach tone; not aggressive, not uncanny, not too human.'
    ],
    styleComposition: [
      'Mobile-first hero composition with one dominant problem signal.',
      'Buddy must not cover the key symptom.',
      'Strong safe margins and clean scene density.'
    ],
    negativeNoDrift: [
      'No mascot redesign or style drift.',
      'No false symptoms or exaggerated catastrophe for mild events.',
      'No long text or clutter in-image.'
    ]
  });

  const batchOrder = Object.freeze([
    'shared_rootbound_warning',
    'outdoor_heatwave_dry_wind',
    'shared_early_pest_signs_mild',
    'outdoor_pot_dries_by_afternoon',
    'indoor_vpd_mismatch_veg',
    'outdoor_early_pest_pressure_leaf_underside',
    'indoor_light_burn_canopy_top',
    'indoor_soil_ph_out_of_range'
  ]);

  function getBlueprint() {
    return Object.freeze({
      sharedBlocks,
      batchOrder
    });
  }

  const api = Object.freeze({
    getBlueprint
  });

  globalScope.EventV2AssetPromptBlueprint = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
