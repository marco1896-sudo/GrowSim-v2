# Phase 81 Asset Generation Readiness Review

## Scope
- readiness review and trial planning only
- no image generation
- no asset files
- no runtime or UI integration

## Readiness Legend
- `ready`: prompt and QA are strong enough for controlled trial
- `needs_prompt_fix`: proceed after targeted prompt adjustment
- `hold`: do not start generation yet

## Motif Readiness (8/8)

### 1) `shared_rootbound_warning`
- Prompt fully defined: yes
- Buddy identity protection: strong
- Symptom clarity: medium-high
- Setting clarity: high
- Bubble length risk: medium (`Wurzelraum prüfen!` is fine but language-bound)
- Negative prompt coverage: high
- QA clarity: high
- Output path idea: yes
- Drift risk: medium
- Wrong symptom risk: medium
- Text overload risk: low
- Mobile readability risk: medium
- Status: `ready`
- Note: keep root-pressure cue subtle to avoid overdrama.

### 2) `indoor_vpd_mismatch_veg`
- Prompt fully defined: yes
- Buddy identity protection: strong
- Symptom clarity: medium (abstract event)
- Setting clarity: medium-high
- Bubble length risk: low
- Negative prompt coverage: high
- QA clarity: high
- Output path idea: yes
- Drift risk: medium
- Wrong symptom risk: high (can drift into heat or deficiency)
- Text overload risk: low
- Mobile readability risk: medium
- Status: `needs_prompt_fix`
- Fix: strengthen "what not to resemble" guard and require one concrete climate cue + one concrete plant cue.

### 3) `outdoor_heatwave_dry_wind`
- Prompt fully defined: yes
- Buddy identity protection: strong
- Symptom clarity: high
- Setting clarity: high
- Bubble length risk: low
- Negative prompt coverage: high
- QA clarity: high
- Output path idea: yes
- Drift risk: low-medium
- Wrong symptom risk: medium
- Text overload risk: low
- Mobile readability risk: medium
- Status: `ready`
- Note: keep wind readability without storm-chaos visual noise.

### 4) `shared_early_pest_signs_mild`
- Prompt fully defined: yes
- Buddy identity protection: strong
- Symptom clarity: high (close-up driven)
- Setting clarity: high
- Bubble length risk: low
- Negative prompt coverage: high
- QA clarity: high
- Output path idea: yes
- Drift risk: medium
- Wrong symptom risk: medium
- Text overload risk: low
- Mobile readability risk: medium-high (tiny details)
- Status: `ready`
- Note: force visible-but-mild evidence scale.

### 5) `outdoor_pot_dries_by_afternoon`
- Prompt fully defined: yes
- Buddy identity protection: strong
- Symptom clarity: medium-high
- Setting clarity: high
- Bubble length risk: medium (`Topfgewicht prüfen!` can fail in model text)
- Negative prompt coverage: high
- QA clarity: high
- Output path idea: yes
- Drift risk: medium
- Wrong symptom risk: medium-high (can look like generic drought)
- Text overload risk: low
- Mobile readability risk: medium
- Status: `needs_prompt_fix`
- Fix: require explicit pot-size and afternoon-light context in first visual layer.

### 6) `indoor_soil_ph_out_of_range`
- Prompt fully defined: yes
- Buddy identity protection: strong
- Symptom clarity: medium-low
- Setting clarity: medium
- Bubble length risk: low
- Negative prompt coverage: high
- QA clarity: high
- Output path idea: yes
- Drift risk: medium
- Wrong symptom risk: high (easily misread as other stress)
- Text overload risk: low
- Mobile readability risk: medium
- Status: `hold`
- Reason: lowest visual payoff and high ambiguity; better after first trial calibration.

### 7) `outdoor_early_pest_pressure_leaf_underside`
- Prompt fully defined: yes
- Buddy identity protection: strong
- Symptom clarity: high
- Setting clarity: high
- Bubble length risk: low
- Negative prompt coverage: high
- QA clarity: high
- Output path idea: yes
- Drift risk: medium
- Wrong symptom risk: medium
- Text overload risk: low
- Mobile readability risk: medium-high
- Status: `ready`
- Note: enforce outdoor differentiation vs shared mild pest motif.

### 8) `indoor_light_burn_canopy_top`
- Prompt fully defined: yes
- Buddy identity protection: strong
- Symptom clarity: high
- Setting clarity: high
- Bubble length risk: low
- Negative prompt coverage: high
- QA clarity: high
- Output path idea: yes
- Drift risk: low-medium
- Wrong symptom risk: medium
- Text overload risk: low
- Mobile readability risk: medium
- Status: `ready`
- Note: top-canopy dominance must stay stronger than whole-plant stress cues.

## Readiness Totals
- `ready`: 5
- `needs_prompt_fix`: 2
- `hold`: 1

## Tool / Workflow Evaluation

### 1) Vertex / Imagen
- Buddy consistency: medium-high (with strong reference discipline)
- style control: high
- alpha/transparency: usually post-processed
- mobile hero fitness: high after curation
- text-bubble error risk: high if text rendered in-image
- post effort: medium
- cost/limits: medium
- recommendation: strong primary option for controlled trial

### 2) ChatGPT / Image Generation
- Buddy consistency: medium (good with strict identity block + references)
- style control: medium-high
- alpha/transparency: varies, often needs post
- mobile hero fitness: medium-high
- text-bubble risk: high in-image
- post effort: medium
- cost/limits: medium
- recommendation: valid secondary option for fast iteration

### 3) Runway / Reference Workflow
- Buddy consistency: medium-high with references
- style control: medium
- alpha/transparency: mixed
- mobile hero fitness: medium
- text-bubble risk: medium-high
- post effort: medium-high
- cost/limits: medium-high
- recommendation: useful when style transfer is needed, not first choice for initial trial

### 4) Manual Post-Edit after Generation
- Buddy consistency: high (if controlled)
- style control: high
- alpha/transparency: high
- mobile hero fitness: high
- text-bubble risk: very low if bubble moved to overlay
- post effort: high
- cost/limits: time-heavy
- recommendation: mandatory finishing step for accepted trial outputs

### 5) SVG/2D style workflow later
- Buddy consistency: very high
- style control: very high
- alpha/transparency: high
- mobile hero fitness: high
- text-bubble risk: low
- post effort: high upfront
- cost/limits: initial setup cost
- recommendation: strong long-term direction, not required for first 3-motif trial

### 6) Delay start, consolidate references first
- Buddy consistency: very high
- style control: very high
- alpha/transparency: N/A
- mobile hero fitness: N/A
- text-bubble risk: N/A
- post effort: delayed
- cost/limits: low spend, high delay
- recommendation: fallback if first 3 trial fails consistency gate

## Speech Bubble Decision
Recommended for first controlled generation: `Option B`.
- Generate base hero images without fixed text bubbles.
- Add speech bubbles later as localized overlay assets or UI-layered elements.

Why:
- best multilingual flexibility
- lowest text-error risk
- better visual consistency
- allows per-locale phrasing without regenerating art

Backup:
- `Option C` for close-up motifs if bubbles hurt evidence clarity.

## Output Path Plan (finalized, planning-only)
Working flow:
- `assets/events/v2/_generated/raw/{eventId}/`
- `assets/events/v2/_generated/review/{eventId}/`
- `assets/events/v2/{eventId}/hero.webp`
- `assets/events/v2/{eventId}/hero@2x.webp`
- `assets/events/v2/{eventId}/fallback.webp`

Format strategy:
- master export: transparent PNG (intermediate)
- shipping target: WebP (+ `@2x` variant)
- fallback: required for each event
