# Phase 91 Reference Image Generation Setup

## Status
`reference_image_generation_capability_setup_ready`

## Skill Decision
Create repo-local Buddy skill:
`.codex/skills/buddy-asset-skill/`

Reason:
- Phase 90 expected this path.
- Future phases need stable, local, project-specific Buddy identity rules.
- Global plant asset skill is useful but not Buddy-specific enough.

## Reference Folder Summary
- master: identity and proportions
- emotions: expression/gesture cues
- poses: social/idle pose cues
- missing future groups: tools, closeups, action poses

## Workflow Recommendation
Use a reference-image capable generator only.

Preferred practical path:
ChatGPT Image Generation with uploaded official Buddy references, if available in the user's Plus workflow.

Blocked path:
Text-only full-scene prompting.
