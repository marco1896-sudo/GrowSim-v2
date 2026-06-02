'use strict';

(function initEventV2BuddyAssetPriorityMap(globalScope) {
  const PRIORITY_MAP = Object.freeze({
    high: Object.freeze([
      'indoor_heat_stress_air',
      'indoor_light_burn_canopy_top',
      'indoor_overwatering_early',
      'outdoor_early_pest_pressure_leaf_underside',
      'outdoor_heatwave_dry_wind',
      'outdoor_wind_exposure_stem_stress',
      'shared_early_pest_signs_mild',
      'shared_observation_recovery_after_stress',
      'shared_panic_watering_misread'
    ]),
    medium: Object.freeze([
      'indoor_dry_rootball',
      'indoor_fan_failure_airflow_drop',
      'indoor_light_nutrient_tox_early',
      'indoor_overtraining_stall_mild',
      'indoor_rootzone_airless_medium',
      'indoor_vpd_mismatch_veg',
      'outdoor_cold_night_stress',
      'outdoor_heavy_rain_waterlogging_risk',
      'outdoor_pot_dries_by_afternoon',
      'shared_light_distance_error',
      'shared_rootbound_warning',
      'shared_substrate_drainage_compaction'
    ]),
    low: Object.freeze([
      'indoor_soil_ph_out_of_range'
    ])
  });

  function getPriorityMap() {
    return PRIORITY_MAP;
  }

  function getPriorityForEvent(eventId) {
    if (PRIORITY_MAP.high.indexOf(eventId) >= 0) return 'high';
    if (PRIORITY_MAP.medium.indexOf(eventId) >= 0) return 'medium';
    if (PRIORITY_MAP.low.indexOf(eventId) >= 0) return 'low';
    return 'unknown';
  }

  const api = Object.freeze({
    getPriorityMap,
    getPriorityForEvent
  });

  globalScope.EventV2BuddyAssetPriorityMap = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
