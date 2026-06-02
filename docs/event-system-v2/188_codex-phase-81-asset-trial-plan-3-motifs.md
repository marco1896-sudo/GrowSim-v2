# Phase 81 Asset Trial Plan (3 Motifs)

## Trial Scope
Controlled generation readiness for:
1. `shared_rootbound_warning`
2. `outdoor_heatwave_dry_wind`
3. `shared_early_pest_signs_mild`

No generation in Phase 81; this is execution planning only.

## Trial Workflow Recommendation
- primary tool path: Vertex / Imagen (or equivalent high-control image model)
- speech bubbles: `Option B` (overlay later)
- review cadence: 3 rounds max per motif before hold/rework decision

## Motif 1: `shared_rootbound_warning`
- prompt status: ready
- preferred tool: Vertex / Imagen
- Buddy reference needed: yes
- plant/problem reference needed: yes (pot edge + root pressure examples)
- speech bubble in image: no (overlay later)
- output goal: one clean hero candidate + two alternates
- QA steps:
  1. Buddy identity gate
  2. root-space visibility gate
  3. mobile readability gate
  4. wrong-cause rejection gate
- hard rejection reasons:
  - root cue unreadable
  - looks like generic overwatering only
  - Buddy drift
- revision strategy:
  - tighten composition to pot-edge close-up
  - reduce scene noise
  - re-anchor Buddy pose to root-check cue

## Motif 2: `outdoor_heatwave_dry_wind`
- prompt status: ready
- preferred tool: Vertex / Imagen
- Buddy reference needed: yes
- plant/problem reference needed: yes (dry wind + sun stress cues)
- speech bubble in image: no (overlay later)
- output goal: one hero with clear dual-cause readability
- QA steps:
  1. heat + wind dual-cause gate
  2. mild-warning plausibility gate
  3. outdoor context gate
  4. mobile crop gate
- hard rejection reasons:
  - looks like storm disaster
  - reads as rain/waterlogging
  - cause ambiguity too high
- revision strategy:
  - simplify wind cues
  - reduce dramatic damage
  - strengthen midday heat context markers

## Motif 3: `shared_early_pest_signs_mild`
- prompt status: ready
- preferred tool: Vertex / Imagen
- Buddy reference needed: yes
- plant/problem reference needed: yes (underside mild evidence)
- speech bubble in image: no (overlay later)
- output goal: close-up with clear mild evidence at mobile scale
- QA steps:
  1. underside evidence visibility gate
  2. mild-stage gate
  3. no-monster-pest gate
  4. Buddy support-not-overlap gate
- hard rejection reasons:
  - infestation exaggerated
  - evidence too tiny to read
  - Buddy blocks key symptom
- revision strategy:
  - increase evidence contrast subtly
  - crop tighter to underside
  - reduce secondary clutter

## Trial Go/No-Go Gate For Phase 82 Execution
Proceed only if all are true:
- 3 motif prompts score `ready`
- shared Buddy identity lock accepted
- bubble strategy fixed to B (or C for close-up edge cases)
- QA scoring sheet agreed
- output folder contract agreed
