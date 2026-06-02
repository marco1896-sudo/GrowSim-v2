# Phase 90 Skill/Reference Workflow Matrix

## Workflow Options Review

### Option A — Text-only Full-Scene Prompting
- Buddy consistency: low
- situational action reliability: medium-low
- scene integration potential: medium
- drift risk: high
- recommendation: no

### Option B — Generic Overlay Workflow
- Buddy consistency: medium-high
- situational relevance: low-medium
- scene integration quality: low-medium
- brand feel risk: medium
- recommendation: no (as default target)

### Option C — Reference-Locked Full-Scene with True Image Conditioning
- Buddy consistency: high (if reference control is real)
- situational relevance: high
- scene integration quality: high
- drift risk: medium-low (with strict QA)
- recommendation: yes (target workflow)

### Option D — Background + Situational Overlay Hybrid (fallback only)
- Buddy consistency: high
- situational relevance: medium (depends on pose quality)
- scene integration quality: medium
- recommendation: fallback path only

## Required Buddy-Skill Artifacts
Requested files were checked at `.codex/skills/buddy-asset-skill/` and are currently missing:
- `SKILL.md`
- `prompt_patterns.md`
- `reference_usage.md`
- `quality_checklist.md`
- `output_naming.md`

Interim source used:
- `C:/Users/Marco/.codex/skills/grow-simulator-plant-asset-factory/SKILL.md`
- `.codex/ASSET_PIPELINE.md`
- `assets/buddy referenz/BUDDY_REFERENCE_INDEX.md`

## Motif-Level Input Specification (3 motifs)

### 1) `shared_rootbound_warning`
- reference inputs:
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
  - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
- required action:
  - calm root-zone inspection + downward directional gesture
- scene cue:
  - root-pressure area must stay visible

### 2) `outdoor_heatwave_dry_wind`
- reference inputs:
  - `assets/buddy referenz/emotions/buddy_emotion_surprised_raised_hands_v1.png`
  - `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`
- required action:
  - warning/protective coach reaction toward heat/wind
- scene cue:
  - plant and weather-stress context remain unobstructed

### 3) `shared_early_pest_signs_mild`
- reference inputs:
  - `assets/buddy referenz/emotions/buddy_emotion_confused_head_scratch_v1.png`
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
- required action:
  - focused inspection behavior toward mild underside traces
- scene cue:
  - symptom dots/traces remain primary, no panic framing

## Gating Decision
Until a generator path with explicit image-reference conditioning is available and verified:
`blocked_until_reference_image_generation_workflow_available`

## Phase 91 entry criteria
1. Confirm available tool with image-reference input support.
2. Confirm repo file references can be passed as conditioning inputs.
3. Define fixed QA worksheet with side-by-side Buddy identity checks.
4. Run one non-integrated technical smoke generation.
