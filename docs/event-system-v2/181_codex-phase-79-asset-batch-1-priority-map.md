# Phase 79 Asset Batch 1 Priority Map

## Batch Goal
Create a first visual uplift set with 8 planned motifs (planning only in Phase 79).

## Candidate Set

### 1) `shared_rootbound_warning`
- imageType: `problem_closeup_with_buddy`
- plantSituation: root pressure at pot edge, constrained root room
- buddyPose: `buddy_root_check`
- bubble: yes
- bubbleText: `Topfgrenze!`
- setting: neutral indoor-outdoor shared context
- output: transparent `webp`, hero + @2x + fallback
- pathIdea: `assets/events/v2/shared_rootbound_warning/hero.webp`
- risk: root visibility may be overdone if too dramatic
- priority: high

### 2) `indoor_vpd_mismatch_veg`
- imageType: `buddy_explains_system`
- plantSituation: mild canopy stress + humidity/air context cues
- buddyPose: `buddy_airflow_fan`
- bubble: yes
- bubbleText: `Klima ausbalancieren`
- setting: controlled indoor grow corner
- output: transparent `webp`
- pathIdea: `assets/events/v2/indoor_vpd_mismatch_veg/hero.webp`
- risk: abstract concept can look generic
- priority: high

### 3) `outdoor_heatwave_dry_wind`
- imageType: `outdoor_situation_with_buddy`
- plantSituation: hot sun + dry wind stress on leaves
- buddyPose: `buddy_warning`
- bubble: yes
- bubbleText: `Zu heiss!`
- setting: outdoor garden with visible wind direction cues
- output: transparent `webp`
- pathIdea: `assets/events/v2/outdoor_heatwave_dry_wind/hero.webp`
- risk: wind readability can fail without motion cues
- priority: high

### 4) `shared_early_pest_signs_mild`
- imageType: `problem_closeup_with_buddy`
- plantSituation: early underside specks and trace pattern
- buddyPose: `buddy_magnifier`
- bubble: yes
- bubbleText: `Unterseiten checken`
- setting: close-up leaf inspection
- output: transparent `webp`
- pathIdea: `assets/events/v2/shared_early_pest_signs_mild/hero.webp`
- risk: micro-detail may disappear on small screens
- priority: high

### 5) `outdoor_pot_dries_by_afternoon`
- imageType: `outdoor_situation_with_buddy`
- plantSituation: small pot drying fast by late day
- buddyPose: `buddy_water_check`
- bubble: yes
- bubbleText: `Erst prüfen`
- setting: afternoon sun exposure with pot surface dryness
- output: transparent `webp`
- pathIdea: `assets/events/v2/outdoor_pot_dries_by_afternoon/hero.webp`
- risk: can look too similar to generic dry stress
- priority: high

### 6) `indoor_soil_ph_out_of_range`
- imageType: `buddy_explains_system`
- plantSituation: subtle leaf cue + measurement context
- buddyPose: `buddy_measuring`
- bubble: no
- setting: clean technical indoor context
- output: transparent `webp`
- pathIdea: `assets/events/v2/indoor_soil_ph_out_of_range/hero.webp`
- risk: weak visual payoff if over-abstract
- priority: medium

### 7) `outdoor_early_pest_pressure_leaf_underside`
- imageType: `problem_closeup_with_buddy`
- plantSituation: early underside pest pressure
- buddyPose: `buddy_magnifier`
- bubble: yes
- bubbleText: `Früh erkannt`
- setting: outdoor underside close-up
- output: transparent `webp`
- pathIdea: `assets/events/v2/outdoor_early_pest_pressure_leaf_underside/hero.webp`
- risk: overlap with shared pest event if not differentiated
- priority: high

### 8) `indoor_light_burn_canopy_top`
- imageType: `plant_problem_with_buddy`
- plantSituation: top-canopy light stress cue
- buddyPose: `buddy_light_check`
- bubble: yes
- bubbleText: `Abstand prüfen`
- setting: indoor canopy + light source relation
- output: transparent `webp`
- pathIdea: `assets/events/v2/indoor_light_burn_canopy_top/hero.webp`
- risk: may look too similar to heat event without clear top-light framing
- priority: medium

## Why This Batch
- maximizes impact on still-`watch` events
- addresses high-priority clarity bottlenecks first
- keeps one already-`accept` anchor for premium consistency
