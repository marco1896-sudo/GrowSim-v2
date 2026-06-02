# Phase 94 Reference-Locked Full-Scene Single-Motif Generation

## Scope
Single-motif generation gate for:

`shared_rootbound_warning`

## Gate Result
`blocked_reference_image_input_not_active`

## Gate Checklist
- Buddy reference images active as real image inputs: no / not verified
- at least 2 Buddy references used: selected, but not active in a verified generator
- background / scene reference active: selected, but not active in a verified generator
- generator is not text-only: not verified
- output remains review-only: yes, if generation later runs
- only 1 candidate would be generated: yes, if generation later runs

## Decision
No image generation was executed.

The current Codex image generation path does not expose an active reference-image input handoff for the local Buddy reference files. Running the Phase 93 prompt as text-only would violate the Buddy skill and Phase 94 guardrails.

## Required References
Buddy identity:
- `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
- `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`

Scene / problem:
- `assets/events/v2/_generated/backgrounds/review/shared_rootbound_warning/candidate_bg_01.png`

## Review Path Reserved
If a later verified workflow passes the gate, write exactly one candidate to:

`assets/events/v2/_generated/full-scene/review/shared_rootbound_warning/candidate_full_scene_01.png`

## No Integration
- no final `hero.webp`
- no `hero@2x.webp`
- no `fallback.webp`
- no assetRefs
- no event files
- no locale files
- no runtime changes
