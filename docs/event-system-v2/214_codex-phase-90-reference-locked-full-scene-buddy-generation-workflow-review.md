# Phase 90 Reference-Locked Full-Scene Buddy Generation Workflow Review

## Scope
Planning-only review for a corrected workflow direction:
`reference_locked_full_scene_buddy_event_image`

No generation, no integration, no assetRef changes.

## Dirty Worktree Safety Snapshot
Pre-existing local changes exist in sensitive files (`app.js`, `index.html`, `src/i18n/locales/*.json`).
Phase 90 therefore uses documentation-only edits to avoid unrelated diff risk.

## Mandatory Inputs Check
- required repo path `.codex/skills/buddy-asset-skill/`: **not present**
- checked fallback skill: `C:/Users/Marco/.codex/skills/grow-simulator-plant-asset-factory/SKILL.md`
- checked project asset policy: `.codex/ASSET_PIPELINE.md`
- checked official Buddy index: `assets/buddy referenz/BUDDY_REFERENCE_INDEX.md`

## Correction of Previous Assumption
Previous assumption `full_scene_buddy_workflow_rejected` is replaced by:
`full_scene_viable_only_with_strict_reference_locked_skill_workflow`

Meaning:
- Full-scene is valid as a target.
- Generic text-only prompting is invalid for Buddy identity stability.
- Overlay-only as universal target is also invalid.

## Why Earlier Trials Failed
Phase 82/83 showed repeated hard-rejects despite usable scene context.
Primary failure mode was Buddy identity drift:
- head shape
- leaf-crown geometry
- eye language
- body silhouette/proportion
- color-family character drift

Root cause:
- prompts allowed too much creative reinterpretation
- no enforceable character-image conditioning pipeline at generation time

## Full-Scene Hard Requirements (updated)
1. Buddy identity must be locked against official references.
2. Buddy must perform situational action in-scene (not passive side placement).
3. Buddy and scene must look natively co-authored (no sticker feel).
4. Event symptom must remain primary and biologically plausible.
5. No speech bubbles baked into image.
6. No long text or typographic artifacts.

## Per-Motif Reference Selection (Phase 90 review)

### `shared_rootbound_warning`
- primary refs:
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
  - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
- situational action target:
  - downward inspection/pointing to root-zone/top-rim pressure
- rejection trigger:
  - neutral front pose without interaction

### `outdoor_heatwave_dry_wind`
- primary refs:
  - `assets/buddy referenz/emotions/buddy_emotion_surprised_raised_hands_v1.png`
  - `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`
- situational action target:
  - coach warning posture reacting to wind/heat direction
- rejection trigger:
  - panic caricature or generic mascot stance

### `shared_early_pest_signs_mild`
- primary refs:
  - `assets/buddy referenz/emotions/buddy_emotion_confused_head_scratch_v1.png`
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
- situational action target:
  - inspect/pointing attention toward underside symptom area
- rejection trigger:
  - no directed inspection behavior

## Skill-Prompt Structure to Enforce
Use a strict block pattern (adapted to available skill assets):
1. Buddy Identity Lock Block (reference filenames + immutable attributes)
2. Situational Action Block (event-specific posture/attention)
3. Event Symptom Block (single primary symptom)
4. Scene Integration Block (shared lighting/composition/no sticker feel)
5. Negative/No-Drift Block (explicit forbidden deviations)
6. Output Requirements Block (mobile hero readability, no text)
7. QA Gate Block (hard reject rules)

## Generator Capability Reality Check
Current local image tool path in this session does not provide a reliable, explicit reference-image conditioning contract from repo images into generation.
Therefore text-only full-scene regeneration must **not** be treated as Buddy-safe.

Decision status:
`blocked_until_reference_image_generation_workflow_available`

## What Must Exist Before New Full-Scene Attempts
1. A generator workflow with explicit image-reference input support.
2. Repeatable reference handoff from `assets/buddy referenz/...` files.
3. Reference-strength controls strong enough to protect silhouette/crown/eyes/palette.
4. QA loop with side-by-side reference validation per candidate.

## Phase 90 QA Framework (full-scene)
Each candidate must pass all gates:
- Buddy reference consistency (hard gate)
- Situational action
- Scene integration
- Event symptom clarity
- Mobile hero readability
- Brand consistency
- No text artifacts
- No overdramatization

Hard-reject when any of:
- Buddy not exact official identity
- Buddy only approximately similar
- Buddy generic or passively detached
- sticker-composite feel
- wrong or unclear plant symptom
- mobile hero unreadable

## Recommendation for Next Step
`Phase 91: Reference-Image Generation Capability Setup`

Goal of Phase 91:
- establish or confirm a generator path that truly accepts official Buddy reference images as conditioning input,
- validate one technical dry-run with no integration,
- then proceed to controlled full-scene trial for the same 3 motifs.
