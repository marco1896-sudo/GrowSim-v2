# Phase 84 Buddy-Separated Event Asset Workflow Plan

## Decision
Full-scene Buddy generation is rejected for current batch due repeated identity drift.

Workflow decision:
`full_scene_buddy_workflow_rejected`
`buddy_separated_workflow_selected`

## A) Failure Analysis (Phase 82/83)
1. Why failed despite usable scenes:
- Plant/problem rendering was partially good, but Buddy identity failed hard-gate.
- Acceptance is blocked when Buddy reference consistency < 2/2.

2. Repeated drift fields:
- head shape
- leaf-crown geometry
- eye-language
- body compactness
- base palette tone
- overall brand character

3. Why stronger prompts were insufficient:
- Model keeps blending generic mascot priors into full-scene generation.
- Scene complexity competes with identity lock.
- Prompt-only control cannot guarantee exact brand silhouette fidelity.

4. Why separated Buddy overlay is safer:
- Buddy identity can be controlled as dedicated brand asset.
- Plant/problem generation can optimize only botanical clarity.
- QA can isolate failures by layer (background vs buddy vs composite).

5. Reusable parts from existing candidates:
- reusable: plant symptom readability, setting mood, composition ideas, lighting direction.
- not reusable: generated Buddy character identity.

## B) New Separated Workflow
1. Generate Event Background only:
- no Buddy
- no speech bubble
- plant/problem/setting only
- mobile hero composition

2. Prepare Buddy Overlay separately:
- use official reference-derived Buddy assets
- transparent PNG/WebP overlay asset
- brand identity locked

3. Composite pass:
- overlay Buddy into background
- tune scale, position, gaze direction, shadow/light
- keep symptom visible
- preserve safe margins

4. Final QA:
- event symptom clarity
- buddy reference consistency
- composite realism/cohesion
- mobile hero readability

## C) Workflow Options and Recommendation
Option 1: Background generated + existing official Buddy overlay
- Buddy consistency: very high
- effort: low-medium
- scalability: high
- mobile hero: high
- style risk: low
- rework: low
- recommendation: yes (short-term primary)

Option 2: Buddy poses generated separately from references
- Buddy consistency: medium-high
- effort: medium
- scalability: medium-high
- style risk: medium
- recommendation: yes (mid-term)

Option 3: Buddy 2D/SVG/sticker system from references
- Buddy consistency: very high
- effort: high upfront
- scalability: very high
- style risk: low
- recommendation: yes (long-term)

Option 4: Continue full-scene generation
- Buddy consistency: low
- recommendation: no (current block)

Option 5: Event image without Buddy, Buddy in UI side slot
- Buddy consistency: very high
- effort: medium
- recommendation: fallback yes

Recommended path:
- now: Option 1
- next: Option 2
- strategic: Option 3
- blocked: Option 4
- fallback: Option 5

## D) Planned Folder Structure (no file creation in this phase)
- `assets/events/v2/_generated/backgrounds/raw/{eventId}/`
- `assets/events/v2/_generated/backgrounds/review/{eventId}/`
- `assets/events/v2/_generated/composites/review/{eventId}/`
- `assets/events/v2/_generated/composites/accepted/{eventId}/`
- `assets/events/v2/{eventId}/hero.webp`
- `assets/events/v2/{eventId}/hero@2x.webp`
- `assets/events/v2/{eventId}/fallback.webp`

Buddy overlays:
- `assets/buddy/overlays/{poseId}/buddy_{poseId}.png`
- `assets/buddy/overlays/{poseId}/buddy_{poseId}@2x.png`

## E) Planned Base Buddy Overlay Poses
1. `buddy_pointing`
- source: front master + happy/open-arms reference
- usage: diagnosis cues, general pointing

2. `buddy_magnifier`
- source: confused/head-scratch + neutral front
- usage: pest inspection, close-up diagnostics

3. `buddy_warning`
- source: surprised/raised-hands reference
- usage: heat/wind/stress warnings

4. `buddy_measuring`
- source: neutral front + relaxed three-quarter
- usage: pH, VPD, climate checks

5. `buddy_root_check`
- source: neutral front + side profile
- usage: rootbound/drainage/rootzone events

All five require transparent overlay assets. Shadow can be added in composite layer.

## I) Phase 85 Proposal
`Background-only Trial Generation (3 motifs)`
- generate only event backgrounds for:
  - `shared_rootbound_warning`
  - `outdoor_heatwave_dry_wind`
  - `shared_early_pest_signs_mild`
- no Buddy overlay yet
- no integration
- background QA only
- Phase 86 then: Buddy Overlay Source Selection + Composite Trial
