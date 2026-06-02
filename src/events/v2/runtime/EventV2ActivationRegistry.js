'use strict';

(function initEventV2ActivationRegistry(globalScope) {
  const ACTIVATION_REGISTRY = Object.freeze({
    indoor_dry_rootball: Object.freeze({
      eventId: 'indoor_dry_rootball',
      runtimeEnabled: true,
      category: 'care',
      severity: 'warning',
      title: 'Trockener Wurzelballen',
      description: 'Der Wurzelballen trocknet ungleichmaessig aus. Reagiere ruhig und waehle eine passende Massnahme.',
      optionIds: Object.freeze(['stabilize', 'inspect', 'overreact']),
      defaultOptionId: 'stabilize',
      visualTone: 'warning',
    }),
    shared_panic_watering_misread: Object.freeze({
      eventId: 'shared_panic_watering_misread',
      runtimeEnabled: true,
      category: 'care',
      severity: 'warning',
      title: 'Panikgiessen vermeiden',
      description: 'Haengende Blaetter sind nicht automatisch ein Giesssignal. Erst pruefen, dann handeln.',
      optionIds: Object.freeze([
        'check_weight_before_watering',
        'inspect_rootzone_then_wait',
        'water_on_panic_signal',
      ]),
      defaultOptionId: 'check_weight_before_watering',
      visualTone: 'warning',
    }),
    shared_light_distance_error: Object.freeze({
      eventId: 'shared_light_distance_error',
      runtimeEnabled: true,
      category: 'environment',
      severity: 'warning',
      title: 'Lichtdistanz nicht optimal',
      description: 'Die Lichtdistanz erzeugt vermeidbaren Stress. Kleine, gezielte Korrekturen sind hier am sichersten.',
      optionIds: Object.freeze(['adjust_light_distance_stepwise', 'measure_then_wait_24h', 'move_light_extreme']),
      defaultOptionId: 'adjust_light_distance_stepwise',
      visualTone: 'warning',
    }),
    shared_observation_recovery_after_stress: Object.freeze({
      eventId: 'shared_observation_recovery_after_stress',
      runtimeEnabled: true,
      category: 'care',
      severity: 'info',
      title: 'Erholung wird sichtbar',
      description: 'Die Pflanze erholt sich. Beobachtung und ruhiges Handeln sind jetzt wichtiger als Aktionismus.',
      optionIds: Object.freeze(['observe_24h_without_new_action', 'note_recovery_signs_and_hold', 'water_again_just_in_case']),
      defaultOptionId: 'observe_24h_without_new_action',
      visualTone: 'info',
    }),
    shared_rootbound_warning: Object.freeze({
      eventId: 'shared_rootbound_warning',
      runtimeEnabled: true,
      category: 'water',
      severity: 'warning',
      title: 'Wurzelraum wird knapp',
      description: 'Der Topf begrenzt die Wurzelzone. Plane den naechsten Schritt kontrolliert statt hektisch.',
      optionIds: Object.freeze(['plan_repot_next_window', 'optimize_watering_until_repot', 'force_heavy_feed_now']),
      defaultOptionId: 'plan_repot_next_window',
      visualTone: 'warning',
    }),
    shared_substrate_drainage_compaction: Object.freeze({
      eventId: 'shared_substrate_drainage_compaction',
      runtimeEnabled: true,
      category: 'water',
      severity: 'warning',
      title: 'Substrat verdichtet sich',
      description: 'Drainage und Luftaustausch im Medium lassen nach. Eine ruhige Korrektur hilft mehr als reflexhaftes Giessen.',
      optionIds: Object.freeze(['improve_drainage_surface', 'plan_repot_next_window', 'keep_watering_same_volume']),
      defaultOptionId: 'improve_drainage_surface',
      visualTone: 'warning',
    }),
    indoor_fan_failure_airflow_drop: Object.freeze({
      eventId: 'indoor_fan_failure_airflow_drop',
      runtimeEnabled: true,
      category: 'environment',
      severity: 'warning',
      title: 'Airflow faellt ab',
      description: 'Die Luftbewegung im Blätterdach ist zu schwach. Stabilisierung vor Schnellreaktion.',
      optionIds: Object.freeze(['improve_airflow_canopy', 'open_canopy_air_channel', 'raise_humidity_without_airflow']),
      defaultOptionId: 'improve_airflow_canopy',
      visualTone: 'warning',
    }),
    indoor_heat_stress_air: Object.freeze({
      eventId: 'indoor_heat_stress_air',
      runtimeEnabled: true,
      category: 'environment',
      severity: 'warning',
      title: 'Hitzedruck ueber dem Canopy',
      description: 'Zu viel Waerme erzeugt Stress. Kleine Klima-Korrekturen sind sicherer als hektische Gegenreaktionen.',
      optionIds: Object.freeze(['lower_canopy_temp', 'increase_air_exchange', 'raise_light_intensity']),
      defaultOptionId: 'lower_canopy_temp',
      visualTone: 'warning',
    }),
    indoor_light_burn_canopy_top: Object.freeze({
      eventId: 'indoor_light_burn_canopy_top',
      runtimeEnabled: true,
      category: 'environment',
      severity: 'warning',
      title: 'Lichtstress an der Spitze',
      description: 'Die oberen Bereiche reagieren auf zu hohe Lichtlast. Schrittweise Anpassung ist hier entscheidend.',
      optionIds: Object.freeze(['adjust_light_distance_stepwise', 'measure_then_wait_24h', 'feed_more_for_pale_top']),
      defaultOptionId: 'adjust_light_distance_stepwise',
      visualTone: 'warning',
    }),
    indoor_light_nutrient_tox_early: Object.freeze({
      eventId: 'indoor_light_nutrient_tox_early',
      runtimeEnabled: true,
      category: 'nutrition',
      severity: 'warning',
      title: 'Fruehe Naehrstoffspitze',
      description: 'Licht und Futter greifen unguenstig ineinander. Erst stabilisieren, dann fein nachjustieren.',
      optionIds: Object.freeze(['reduce_feed_strength', 'observe_24h_then_rebalance', 'increase_feed_again']),
      defaultOptionId: 'reduce_feed_strength',
      visualTone: 'warning',
    }),
    indoor_overtraining_stall_mild: Object.freeze({
      eventId: 'indoor_overtraining_stall_mild',
      runtimeEnabled: true,
      category: 'care',
      severity: 'warning',
      title: 'Training zu dicht getaktet',
      description: 'Mehrere Reize hintereinander bremsen die Erholung. Plane den naechsten Schritt mit Abstand.',
      optionIds: Object.freeze(['pause_training_for_recovery_window', 'stabilize_climate_then_wait', 'stack_more_training_now']),
      defaultOptionId: 'pause_training_for_recovery_window',
      visualTone: 'warning',
    }),
    indoor_overwatering_early: Object.freeze({
      eventId: 'indoor_overwatering_early',
      runtimeEnabled: true,
      category: 'water',
      severity: 'warning',
      title: 'Fruehes Ueberwaessern',
      description: 'Die Wurzelzone ist zu nass. Ruhe und gezielte Entlastung sind hier wichtiger als mehr Wasser.',
      optionIds: Object.freeze(['pause_watering_24h', 'improve_airflow_canopy', 'water_again_immediately']),
      defaultOptionId: 'pause_watering_24h',
      visualTone: 'warning',
    }),
    indoor_rootzone_airless_medium: Object.freeze({
      eventId: 'indoor_rootzone_airless_medium',
      runtimeEnabled: true,
      category: 'water',
      severity: 'warning',
      title: 'Wurzelzone bekommt zu wenig Luft',
      description: 'Im Medium fehlt Luftaustausch. Stabilisierung und Beobachtung sind sicherer als Nachschieben.',
      optionIds: Object.freeze(['pause_watering_24h', 'improve_drainage_surface', 'feed_through_the_soggy_medium']),
      defaultOptionId: 'pause_watering_24h',
      visualTone: 'warning',
    }),
    indoor_soil_ph_out_of_range: Object.freeze({
      eventId: 'indoor_soil_ph_out_of_range',
      runtimeEnabled: true,
      category: 'nutrition',
      severity: 'warning',
      title: 'pH ausserhalb des Zielbereichs',
      description: 'Die Aufnahme wird ausgebremst. Kontrollierte Anpassung ist sicherer als starke Sofortkorrekturen.',
      optionIds: Object.freeze(['adjust_ph_gradual', 'verify_runoff_then_adjust', 'add_more_nutrients_now']),
      defaultOptionId: 'adjust_ph_gradual',
      visualTone: 'warning',
    }),
    indoor_vpd_mismatch_veg: Object.freeze({
      eventId: 'indoor_vpd_mismatch_veg',
      runtimeEnabled: true,
      category: 'environment',
      severity: 'warning',
      title: 'VPD passt nicht zur Vegetationsphase',
      description: 'Temperatur und Luftfeuchte laufen auseinander. Kleine Klima-Korrekturen zuerst.',
      optionIds: Object.freeze(['rebalance_temp_humidity', 'stabilize_then_monitor', 'chase_with_random_changes']),
      defaultOptionId: 'rebalance_temp_humidity',
      visualTone: 'warning',
    }),
    outdoor_cold_night_stress: Object.freeze({
      eventId: 'outdoor_cold_night_stress',
      runtimeEnabled: true,
      category: 'environment',
      severity: 'warning',
      title: 'Kalte Nacht belastet die Pflanze',
      description: 'Naechtliche Kaelte bremst den Stoffwechsel. Schutz und Timing sind wichtiger als Aktionismus.',
      optionIds: Object.freeze(['insulate_root_zone_night', 'reduce_evening_watering', 'late_night_heavy_water']),
      defaultOptionId: 'insulate_root_zone_night',
      visualTone: 'warning',
    }),
    outdoor_early_pest_pressure_leaf_underside: Object.freeze({
      eventId: 'outdoor_early_pest_pressure_leaf_underside',
      runtimeEnabled: true,
      category: 'pest',
      severity: 'warning',
      title: 'Fruehe Schaedigungszeichen am Blatt',
      description: 'Unten am Blatt zeigen sich erste Hinweise. Zielgerichtetes Pruefen ist der sicherste Start.',
      optionIds: Object.freeze(['targeted_inspection_isolation', 'increase_monitoring_frequency', 'spray_everything_blindly']),
      defaultOptionId: 'targeted_inspection_isolation',
      visualTone: 'warning',
    }),
    outdoor_heatwave_dry_wind: Object.freeze({
      eventId: 'outdoor_heatwave_dry_wind',
      runtimeEnabled: true,
      category: 'environment',
      severity: 'critical',
      title: 'Hitzewelle mit trockenem Wind',
      description: 'Sonne und Wind ziehen stark Wasser. Standortentlastung zuerst, keine hektischen Extremreaktionen.',
      optionIds: Object.freeze(['shade_and_windbreak', 'water_timing_adjust_dawn', 'defoliate_midday']),
      defaultOptionId: 'shade_and_windbreak',
      visualTone: 'warning',
    }),
    outdoor_heavy_rain_waterlogging_risk: Object.freeze({
      eventId: 'outdoor_heavy_rain_waterlogging_risk',
      runtimeEnabled: true,
      category: 'water',
      severity: 'warning',
      title: 'Starkregen und Staunaesse-Risiko',
      description: 'Zu viel Wasser kann in der Wurzelzone stehen bleiben. Jetzt zaehlt kontrolliertes Entlasten.',
      optionIds: Object.freeze(['improve_drainage_surface', 'pause_watering_monitor', 'water_extra_after_rain']),
      defaultOptionId: 'improve_drainage_surface',
      visualTone: 'warning',
    }),
    outdoor_pot_dries_by_afternoon: Object.freeze({
      eventId: 'outdoor_pot_dries_by_afternoon',
      runtimeEnabled: true,
      category: 'water',
      severity: 'warning',
      title: 'Topf trocknet am Nachmittag stark aus',
      description: 'Sonne und Wind ziehen schnell Wasser aus dem Topf. Timing und Standort sind hier entscheidend.',
      optionIds: Object.freeze(['water_timing_adjust_dawn', 'shade_and_windbreak', 'double_feed_in_heat']),
      defaultOptionId: 'water_timing_adjust_dawn',
      visualTone: 'warning',
    }),
    outdoor_wind_exposure_stem_stress: Object.freeze({
      eventId: 'outdoor_wind_exposure_stem_stress',
      runtimeEnabled: true,
      category: 'environment',
      severity: 'warning',
      title: 'Windbelastung auf Stamm und Triebe',
      description: 'Zu starker Luftzug ueberfordert die Stabilitaet. Schrittweise Entlastung ist sicherer.',
      optionIds: Object.freeze(['stake_and_reduce_sway', 'harden_off_in_steps', 'strip_leaves_during_gusts']),
      defaultOptionId: 'stake_and_reduce_sway',
      visualTone: 'warning',
    }),
    shared_early_pest_signs_mild: Object.freeze({
      eventId: 'shared_early_pest_signs_mild',
      runtimeEnabled: true,
      category: 'pest',
      severity: 'warning',
      title: 'Fruehe Schaedlingsspuren',
      description: 'Die Hinweise sind noch mild. Gezieltes Pruefen verhindert unnoetig harte Reaktionen.',
      optionIds: Object.freeze(['targeted_inspection_isolation', 'increase_monitoring_frequency', 'spray_everything_blindly']),
      defaultOptionId: 'targeted_inspection_isolation',
      visualTone: 'warning',
    }),
  });

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function getEventV2ActivationEntry(eventId) {
    const safeEventId = String(eventId || '').trim();
    const entry = ACTIVATION_REGISTRY[safeEventId];
    return entry ? cloneJson(entry) : null;
  }

  function isEventV2RuntimeEnabled(eventId) {
    const entry = getEventV2ActivationEntry(eventId);
    return Boolean(entry && entry.runtimeEnabled === true);
  }

  function getEventV2RuntimeEnabledEvents() {
    return Object.keys(ACTIVATION_REGISTRY).filter((eventId) => ACTIVATION_REGISTRY[eventId].runtimeEnabled === true);
  }

  function validateEventV2ActivationRegistry() {
    const errors = [];
    const warnings = [];
    const seen = new Set();
    Object.keys(ACTIVATION_REGISTRY).forEach((eventId) => {
      const entry = ACTIVATION_REGISTRY[eventId];
      if (seen.has(eventId)) errors.push(`duplicate_event_id:${eventId}`);
      seen.add(eventId);
      if (!Array.isArray(entry.optionIds) || !entry.optionIds.length) errors.push(`missing_options:${eventId}`);
      if (entry.runtimeEnabled === true && !entry.defaultOptionId) warnings.push(`missing_default_option:${eventId}`);
    });
    return {
      ok: errors.length === 0,
      errors,
      warnings,
      runtimeEnabledEvents: getEventV2RuntimeEnabledEvents(),
    };
  }

  const api = Object.freeze({
    ACTIVATION_REGISTRY,
    isEventV2RuntimeEnabled,
    getEventV2RuntimeEnabledEvents,
    getEventV2ActivationEntry,
    validateEventV2ActivationRegistry,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  globalScope.GrowSimEventV2ActivationRegistry = api;
})(typeof window !== 'undefined' ? window : globalThis);
