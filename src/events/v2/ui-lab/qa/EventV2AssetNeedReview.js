'use strict';

(function initEventV2AssetNeedReview(globalScope) {
  const ASSET_REVIEW = Object.freeze({
    indoor_dry_rootball: {
      priority: 'medium',
      imageType: 'problem close-up',
      buddyPose: 'concerned crouch',
      speechBubble: 'yes',
      visibleSituation: 'dry rootball edge and uneven water uptake',
      note: 'Works well with a close root-zone cue and a short Buddy hint.'
    },
    indoor_fan_failure_airflow_drop: {
      priority: 'medium',
      imageType: 'plant + Buddy',
      buddyPose: 'pointing at fan',
      speechBubble: 'yes',
      visibleSituation: 'still canopy and inactive or weak fan',
      note: 'Buddy can explain that airflow is about exchange, not just temperature.'
    },
    indoor_heat_stress_air: {
      priority: 'high',
      imageType: 'plant + Buddy',
      buddyPose: 'warning hand fan',
      speechBubble: 'yes',
      visibleSituation: 'leaf curl and hot dry air impression',
      note: 'A premium image here would help separate heat from light or dryback.'
    },
    indoor_light_burn_canopy_top: {
      priority: 'high',
      imageType: 'problem close-up',
      buddyPose: 'measuring light distance',
      speechBubble: 'yes',
      visibleSituation: 'top leaves bleaching or edging near the light source',
      note: 'Very strong visual teaching candidate.'
    },
    indoor_light_nutrient_tox_early: {
      priority: 'medium',
      imageType: 'plant + Buddy',
      buddyPose: 'coach explain',
      speechBubble: 'yes',
      visibleSituation: 'leaf tips and color cues that suggest excess, not only deficiency',
      note: 'Needs careful visual direction to avoid looking like generic nutrient stress.'
    },
    indoor_overtraining_stall_mild: {
      priority: 'medium',
      imageType: 'Buddy explains',
      buddyPose: 'calm stop gesture',
      speechBubble: 'yes',
      visibleSituation: 'slowed plant after stacked training actions',
      note: 'Best served by Buddy tone and recovery framing.'
    },
    indoor_overwatering_early: {
      priority: 'high',
      imageType: 'plant + Buddy',
      buddyPose: 'hold and observe',
      speechBubble: 'yes',
      visibleSituation: 'drooping leaves with visibly wet medium',
      note: 'A core teaching image with strong premium value.'
    },
    indoor_rootzone_airless_medium: {
      priority: 'medium',
      imageType: 'problem close-up',
      buddyPose: 'none',
      speechBubble: 'no',
      visibleSituation: 'dense medium texture and water-logged root-zone cue',
      note: 'Can stay more technical, with Buddy optional in future.'
    },
    indoor_soil_ph_out_of_range: {
      priority: 'low',
      imageType: 'plant-only fallback',
      buddyPose: 'none',
      speechBubble: 'no',
      visibleSituation: 'subtle leaf signals that do not scream one single cause',
      note: 'Hard to visualize cleanly; copy and diagram support matter more.'
    },
    indoor_vpd_mismatch_veg: {
      priority: 'medium',
      imageType: 'Buddy explains',
      buddyPose: 'system diagram gesture',
      speechBubble: 'yes',
      visibleSituation: 'soft plant stress plus humidity or airflow context',
      note: 'Buddy can make this abstract topic feel more human.'
    },
    outdoor_cold_night_stress: {
      priority: 'medium',
      imageType: 'plant + Buddy',
      buddyPose: 'jacket or shiver cue',
      speechBubble: 'yes',
      visibleSituation: 'cool morning aftermath on the plant',
      note: 'A subtle morning scene would sell the event well.'
    },
    outdoor_early_pest_pressure_leaf_underside: {
      priority: 'high',
      imageType: 'problem close-up',
      buddyPose: 'inspection pose',
      speechBubble: 'yes',
      visibleSituation: 'underside inspection and first pest marks',
      note: 'This wants a clear close-up to teach monitoring fast.'
    },
    outdoor_heatwave_dry_wind: {
      priority: 'high',
      imageType: 'chain/story visual',
      buddyPose: 'brace against wind',
      speechBubble: 'yes',
      visibleSituation: 'dry hot gusts and stressed foliage',
      note: 'Good flagship asset for climate chain premium feel.'
    },
    outdoor_heavy_rain_waterlogging_risk: {
      priority: 'medium',
      imageType: 'plant + Buddy',
      buddyPose: 'umbrella or shelter cue',
      speechBubble: 'yes',
      visibleSituation: 'heavy wet pot after rain and droop risk',
      note: 'Readable even with fallback, but premium art would help a lot.'
    },
    outdoor_pot_dries_by_afternoon: {
      priority: 'medium',
      imageType: 'plant-only fallback',
      buddyPose: 'pointing at pot',
      speechBubble: 'yes',
      visibleSituation: 'small pot in hot sun with dry surface by late day',
      note: 'More useful as context image than as dramatic hero.'
    },
    outdoor_wind_exposure_stem_stress: {
      priority: 'high',
      imageType: 'plant + Buddy',
      buddyPose: 'steadying support',
      speechBubble: 'yes',
      visibleSituation: 'leaning stem or flapping branches in open wind',
      note: 'Distinct wind silhouette would separate this nicely from heat events.'
    },
    shared_early_pest_signs_mild: {
      priority: 'high',
      imageType: 'problem close-up',
      buddyPose: 'inspection pose',
      speechBubble: 'yes',
      visibleSituation: 'small marks and early visual evidence before escalation',
      note: 'A close-up would greatly improve clarity and trust.'
    },
    shared_light_distance_error: {
      priority: 'medium',
      imageType: 'Buddy explains',
      buddyPose: 'measuring height',
      speechBubble: 'yes',
      visibleSituation: 'distance between light and canopy with stress cues',
      note: 'Shared setup can work if the visual remains neutral enough.'
    },
    shared_observation_recovery_after_stress: {
      priority: 'high',
      imageType: 'Buddy explains',
      buddyPose: 'supportive thumbs-up',
      speechBubble: 'yes',
      visibleSituation: 'plant recovering with calmer posture and reassuring coach tone',
      note: 'One of the best Buddy-positive beats in the set.'
    },
    shared_panic_watering_misread: {
      priority: 'high',
      imageType: 'plant + Buddy',
      buddyPose: 'stop and think',
      speechBubble: 'yes',
      visibleSituation: 'confusing droop that could tempt overreaction',
      note: 'A perfect Buddy teaching moment with strong product personality.'
    },
    shared_rootbound_warning: {
      priority: 'medium',
      imageType: 'problem close-up',
      buddyPose: 'pointing at pot',
      speechBubble: 'yes',
      visibleSituation: 'pot limit and root pressure cue',
      note: 'Useful later, but not as urgent as water or climate flagships.'
    },
    shared_substrate_drainage_compaction: {
      priority: 'medium',
      imageType: 'problem close-up',
      buddyPose: 'none',
      speechBubble: 'no',
      visibleSituation: 'dense substrate texture and poor drainage cue',
      note: 'Can stay technical. Best if paired with a simple close-up.'
    }
  });

  function buildAssetNeedReview() {
    return Object.keys(ASSET_REVIEW).sort().map((eventId) => {
      return Object.assign({ eventId }, ASSET_REVIEW[eventId]);
    });
  }

  const api = Object.freeze({
    buildAssetNeedReview
  });

  globalScope.EventV2AssetNeedReview = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
