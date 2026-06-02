# Phase 80 Asset Batch 1 Prompt Blueprint

## Scope
- prompt and QA blueprint only
- no image generation
- no asset file creation
- no runtime integration

## Shared Buddy Identity Block (Mandatory)
Use this block in every Batch-1 prompt:
- Same Buddy character in every motif.
- Stable base silhouette, same body proportions, same face and eye design.
- Stable Buddy color family (green mascot), no random recolor drift.
- Friendly coach personality, warm and supportive.
- Not too human, not uncanny, not creepy, not aggressive.
- No species drift, no alternate mascot replacement.
- No full outfit changes; only small role accessories allowed (magnifier, light meter cue, airflow cue, water-check cue).
- Keep Buddy readable at mobile size and never let Buddy hide the key plant symptom.

## Shared Style + Composition Block (Mandatory)
Use this block in every Batch-1 prompt:
- Mobile-first event hero composition.
- One primary problem signal per motif.
- Clear silhouette and clear focal hierarchy.
- Plant symptom remains visible even in small crop.
- Buddy must not cover the diagnostic symptom area.
- Strong safe margins; avoid edge clipping.
- Clean scene density; avoid crowded growroom noise.
- No heavy text in image.
- Botanically plausible symptom presentation.
- Mild events must remain mild; no disaster exaggeration.
- Prefer transparent-ready or clean-background composition that can map to UI-Lab hero framing.

## Shared Negative Prompt / No-Drift Block (Mandatory)
Use this block in every Batch-1 prompt:
- No different Buddy style, no mascot redesign.
- No random cartoon substitute or photoreal human mascot.
- No false cannabis symptoms.
- No catastrophic dying plant for mild events.
- No monster-like pest exaggeration.
- No text clutter, no long speech bubbles.
- No clipped Buddy body parts, tools, or plant focus area.
- No unreadable tiny symptom details as the only signal.
- No overcrowded scene with many competing causes.
- No logos, brand marks, or legal-risk symbols.
- No style drift across the eight motifs.

## Shared Output Requirement Block
- Target path plan per event:
  - `assets/events/v2/{eventId}/hero.webp`
  - `assets/events/v2/{eventId}/hero@2x.webp`
  - `assets/events/v2/{eventId}/fallback.webp`
- Keep hero crop safe for compact mobile modal framing.
- Preserve fallback compatibility.

## Prompt Package 1/8
Event-ID: `shared_rootbound_warning`
Bildtyp: `problem_closeup_with_buddy`
Buddy-Pose: `buddy_root_check`
Sprechblase: `yes`
Sprechblasen-Text: `Wurzelraum prüfen!`
Hauptsymptom: roots pressing near pot boundary, constrained root room
Pflanzensituation: plant shows growth pressure and reduced uptake stability
Setting: neutral shared context, pot edge visible, medium detail readable
Komposition: close-up on pot rim and root-zone clue, Buddy pointing to root-space limit
Wichtige Details:
- root pressure visible but not grotesque
- keep symptom readable at small size
- Buddy cue should guide diagnosis, not block evidence
Was vermeiden:
- dramatic root explosion
- generic overwatering look without pot-limit cue
- unrelated pest signs
Output-Pfad-Idee: `assets/events/v2/shared_rootbound_warning/hero.webp`
QA-Kriterien:
- root-space limit clearly visible
- Buddy points to cause, not symptom confusion
- mild-to-warning tone only
- mobile readability intact

## Prompt Package 2/8
Event-ID: `indoor_vpd_mismatch_veg`
Bildtyp: `buddy_explains_system`
Buddy-Pose: `buddy_measuring`
Sprechblase: `yes`
Sprechblasen-Text: `Klima checken!`
Hauptsymptom: mild canopy stress from climate mismatch
Pflanzensituation: no dramatic damage, subtle stress posture
Setting: indoor grow corner, humidity-airflow context hints
Komposition: Buddy in explanation role, plant visible with soft stress cue and simple climate context markers
Wichtige Details:
- keep concept human-readable and calm
- avoid abstract chaos overlays
- visible relation between air/temperature/humidity context and plant response
Was vermeiden:
- turning into heatwave event
- turning into nutrient deficiency event
- overloaded technical diagram clutter
Output-Pfad-Idee: `assets/events/v2/indoor_vpd_mismatch_veg/hero.webp`
QA-Kriterien:
- VPD mismatch implication is visible without jargon
- symptom stays subtle and plausible
- Buddy supports understanding, not panic

## Prompt Package 3/8
Event-ID: `outdoor_heatwave_dry_wind`
Bildtyp: `outdoor_situation_with_buddy`
Buddy-Pose: `buddy_warning`
Sprechblase: `yes`
Sprechblasen-Text: `Zu heiß!`
Hauptsymptom: hot, dry wind stress on foliage
Pflanzensituation: leaves show dry-heat pressure, not catastrophic collapse
Setting: outdoor garden scene with clear sun and wind direction cues
Komposition: plant foreground, wind and heat context readable, Buddy warning cue on side
Wichtige Details:
- distinguish from generic midday drydown
- wind + heat combined cause should be legible
- keep scene clean, one dominant problem
Was vermeiden:
- storm-level chaos
- severe death imagery
- rain/waterlogging signals
Output-Pfad-Idee: `assets/events/v2/outdoor_heatwave_dry_wind/hero.webp`
QA-Kriterien:
- heat and dry wind both readable
- not confused with pest or pH event
- warning tone, still plausible

## Prompt Package 4/8
Event-ID: `shared_early_pest_signs_mild`
Bildtyp: `problem_closeup_with_buddy`
Buddy-Pose: `buddy_magnifier`
Sprechblase: `yes`
Sprechblasen-Text: `Unterseite checken!`
Hauptsymptom: mild early pest traces under leaves
Pflanzensituation: early evidence stage, not infestation crisis
Setting: close-up underside inspection scene
Komposition: leaf underside detail as primary focus, Buddy magnifier cue secondary
Wichtige Details:
- tiny signs visible but not oversized horror pests
- maintain trust through realistic evidence scale
- keep close-up clean and legible
Was vermeiden:
- giant cartoon pests
- catastrophic infestation look
- hidden underside cue
Output-Pfad-Idee: `assets/events/v2/shared_early_pest_signs_mild/hero.webp`
QA-Kriterien:
- underside evidence readable on mobile
- mild stage preserved
- Buddy supports inspection behavior

## Prompt Package 5/8
Event-ID: `outdoor_pot_dries_by_afternoon`
Bildtyp: `outdoor_situation_with_buddy`
Buddy-Pose: `buddy_water_check`
Sprechblase: `yes`
Sprechblasen-Text: `Topfgewicht prüfen!`
Hauptsymptom: pot dries too fast by afternoon
Pflanzensituation: plant shows daytime stress rhythm, recovers partially later
Setting: sunny outdoor placement with small pot context
Komposition: pot and substrate dryness cue visible; Buddy water-check cue anchors diagnosis-first behavior
Wichtige Details:
- emphasize rhythm and context, not panic watering
- separate from heatwave crisis tone
- keep pot size and sun exposure readable
Was vermeiden:
- generic severe drought collapse
- nutrient-tox visual confusion
- over-detailed background clutter
Output-Pfad-Idee: `assets/events/v2/outdoor_pot_dries_by_afternoon/hero.webp`
QA-Kriterien:
- afternoon drydown context visible
- pot-volume and timing implication readable
- calm coach tone retained

## Prompt Package 6/8
Event-ID: `indoor_soil_ph_out_of_range`
Bildtyp: `plant_problem_with_buddy`
Buddy-Pose: `buddy_measuring`
Sprechblase: `yes`
Sprechblasen-Text: `Erst messen!`
Hauptsymptom: subtle uptake-related stress, not dramatic physical damage
Pflanzensituation: mild mismatch signs compatible with pH uptake issues
Setting: clean indoor context, measurement-friendly cue
Komposition: plant symptom subtle in foreground, Buddy measuring cue clarifies diagnosis path
Wichtige Details:
- keep subtle, trustworthy, non-lab-cluttered
- avoid fake hard symptom claims
- reinforce measure-first behavior
Was vermeiden:
- over-technical overlay spam
- severe deficiency look that implies certainty
- visual conflict with light-burn event
Output-Pfad-Idee: `assets/events/v2/indoor_soil_ph_out_of_range/hero.webp`
QA-Kriterien:
- subtle but meaningful symptom
- no false definitive diagnosis visual
- measuring action clearly signaled

## Prompt Package 7/8
Event-ID: `outdoor_early_pest_pressure_leaf_underside`
Bildtyp: `problem_closeup_with_buddy`
Buddy-Pose: `buddy_magnifier`
Sprechblase: `yes`
Sprechblasen-Text: `Früh erkannt!`
Hauptsymptom: early pest pressure on underside
Pflanzensituation: outdoor context, first pressure signs before escalation
Setting: outdoor underside close-up with natural light
Komposition: underside detail primary, Buddy magnifier secondary, outdoor context hint tertiary
Wichtige Details:
- differentiate from shared mild pest event using outdoor context cues
- keep signs visible without exaggeration
- preserve early-stage coaching tone
Was vermeiden:
- duplicated look identical to shared pest motif
- advanced infestation drama
- loss of underside focus
Output-Pfad-Idee: `assets/events/v2/outdoor_early_pest_pressure_leaf_underside/hero.webp`
QA-Kriterien:
- outdoor-specific context readable
- early pressure level maintained
- inspection action intuitive

## Prompt Package 8/8
Event-ID: `indoor_light_burn_canopy_top`
Bildtyp: `plant_problem_with_buddy`
Buddy-Pose: `buddy_light_check`
Sprechblase: `yes`
Sprechblasen-Text: `Abstand prüfen!`
Hauptsymptom: canopy-top light stress
Pflanzensituation: top leaves stressed from distance/intensity mismatch
Setting: indoor canopy-light relation scene
Komposition: canopy-top evidence first, light-source relation second, Buddy light-check cue third
Wichtige Details:
- separate from heat stress by top-light focus
- keep nutrient-misread risk visible as false path, not primary cue
- maintain realistic warning severity
Was vermeiden:
- vague whole-plant stress without top focus
- turning into pure heat event
- overexposed abstract glow with no leaf detail
Output-Pfad-Idee: `assets/events/v2/indoor_light_burn_canopy_top/hero.webp`
QA-Kriterien:
- canopy-top symptom is dominant
- light-distance context clear
- action implication is distance/intensity check, not blind feeding

## Batch Order Recommendation
Phase 80 planning order for future generation:

First 3 (highest lift now):
1. `shared_rootbound_warning`
2. `outdoor_heatwave_dry_wind`
3. `shared_early_pest_signs_mild`

Then remaining 5:
4. `outdoor_pot_dries_by_afternoon`
5. `indoor_vpd_mismatch_veg`
6. `outdoor_early_pest_pressure_leaf_underside`
7. `indoor_light_burn_canopy_top`
8. `indoor_soil_ph_out_of_range`

Reasoning:
- first trio hits highest current watch-clarity bottlenecks with strongest trust impact
- second wave covers system explanation and context differentiation
- last motif kept as lower-payoff but still useful measurement-aligned visual
