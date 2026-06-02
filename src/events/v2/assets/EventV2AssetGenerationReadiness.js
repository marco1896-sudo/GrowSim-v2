'use strict';

(function initEventV2AssetGenerationReadiness(globalScope) {
  const READINESS = Object.freeze({
    shared_rootbound_warning: 'ready',
    indoor_vpd_mismatch_veg: 'needs_prompt_fix',
    outdoor_heatwave_dry_wind: 'ready',
    shared_early_pest_signs_mild: 'ready',
    outdoor_pot_dries_by_afternoon: 'needs_prompt_fix',
    indoor_soil_ph_out_of_range: 'hold',
    outdoor_early_pest_pressure_leaf_underside: 'ready',
    indoor_light_burn_canopy_top: 'ready'
  });

  function getReadiness(eventId) {
    return READINESS[String(eventId || '')] || 'unknown';
  }

  function getSummary() {
    const out = { ready: 0, needs_prompt_fix: 0, hold: 0, unknown: 0 };
    Object.keys(READINESS).forEach((id) => {
      const value = READINESS[id];
      out[value] = (out[value] || 0) + 1;
    });
    return Object.freeze(out);
  }

  const api = Object.freeze({
    READINESS,
    getReadiness,
    getSummary
  });

  globalScope.EventV2AssetGenerationReadiness = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
