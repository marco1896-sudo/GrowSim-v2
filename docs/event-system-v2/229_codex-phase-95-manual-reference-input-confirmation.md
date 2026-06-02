# Phase 95 Manual Reference Input Confirmation

## Scope
Manual handoff preparation for exactly one motif:

`shared_rootbound_warning`

No image generation was executed by Codex.

## Required Uploads
Upload these three images into the chosen generator as active image references:

1. Buddy identity reference:
   `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
2. Buddy side/profile reference:
   `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
3. Scene/problem reference:
   `assets/events/v2/_generated/backgrounds/review/shared_rootbound_warning/candidate_bg_01.png`

Optional supporting Buddy expression reference:
`assets/buddy referenz/emotions/buddy_emotion_confused_head_scratch_v1.png`

## Active Reference Rules
- The two Buddy images must be visible as active image inputs.
- The Buddy images must be treated as character identity references.
- The background image is a scene/composition reference, not a final target.
- Text-only fallback is forbidden.
- Exactly one candidate may be generated.
- No speech bubble, no text, no logo.
- Output is review-only.

## Recommended Workflow
Primary:
ChatGPT Image Generation with all required images uploaded in the user-facing workflow.

Alternative:
Vertex / Imagen Subject Reference only if billing/account constraints are explicitly acceptable.

Rejected:
Text-only prompting, generic overlays, and any workflow that cannot accept image references.

## Manual Stop Condition
If the tool does not show the Buddy references as active image inputs, stop and record:

`blocked_tool_does_not_accept_reference_images`
