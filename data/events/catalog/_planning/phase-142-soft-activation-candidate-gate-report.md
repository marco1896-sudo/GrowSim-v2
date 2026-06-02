# Phase 142 - Soft Activation Candidate Gate Report

- gateStatus: ready_with_scoring_watch
- fixturesChecked: 3
- candidateFeedsGenerated: 3
- selectedCandidateAlwaysNull: true
- actionsAlwaysEmpty: true
- canActivateGameplayFalse: true
- canMutateStateFalse: true
- canMutateSaveFalse: true
- runtimeWriteEnabledFalse: true
- productionEnabledFalse: true

## Gate Matrix
- assetCatalog: gate_pass
- previewUiLab: gate_pass
- runtimeShadowSnapshot: gate_pass_with_watch
- safety: gate_pass
- featureFlags: gate_pass

## fixture_indoor_veg_vpd_mismatch
- plausibility: gate_pass_with_watch
- watch: scoring_watch_vpd_vs_dry_rootball
- notes: indoor_vpd_mismatch_veg_in_top5
- top5:
  - #1 indoor_dry_rootball (155)
  - #2 indoor_vpd_mismatch_veg (131.56)
  - #3 outdoor_heatwave_dry_wind (127.49)
  - #4 indoor_rootzone_airless_medium (127)
  - #5 shared_rootbound_warning (127)

## fixture_outdoor_heat_dry_wind
- plausibility: gate_pass
- watch: none
- notes: outdoor_heat_family_in_top3
- top5:
  - #1 outdoor_heatwave_dry_wind (149.49)
  - #2 indoor_dry_rootball (149)
  - #3 outdoor_pot_dries_by_afternoon (135)
  - #4 outdoor_heavy_rain_waterlogging_risk (124.5)
  - #5 outdoor_wind_exposure_stem_stress (124)

## fixture_stable_healthy_baseline
- plausibility: gate_pass
- watch: none
- notes: healthy_baseline_without_aggressive_escalation
- top5:
  - #1 indoor_dry_rootball (105)
  - #2 indoor_rootzone_airless_medium (105)
  - #3 outdoor_pot_dries_by_afternoon (105)
  - #4 shared_panic_watering_misread (105)
  - #5 shared_rootbound_warning (105)

