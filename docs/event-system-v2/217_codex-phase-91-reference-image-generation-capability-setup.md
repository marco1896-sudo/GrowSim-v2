# Phase 91 Reference-Image Generation Capability Setup

## Scope
Phase 91 is setup and review only. No image generation, no final assets, no event or locale changes, and no runtime changes.

## Skill Situation
- Repo-local `.codex/skills/buddy-asset-skill/` did not exist at phase start.
- A repo-local skill was created so future phases can load the same Buddy-specific rules.
- The existing global plant asset skill remains useful for plant realism, but it does not replace Buddy identity locking.

## Buddy Reference Folder
Reference folder checked:

`assets/buddy referenz/`

Current groups:
- `master`: 3 files
- `emotions`: 5 files
- `poses`: 2 files
- index: `BUDDY_REFERENCE_INDEX.md`

Important identity references:
- `master/buddy_master_front_neutral_arms_down_v1.png`
- `master/buddy_master_front_happy_open_arms_v1.png`
- `master/buddy_master_side_neutral_profile_v1.png`

Best pose/action references:
- `emotions/buddy_emotion_surprised_raised_hands_v1.png`
- `emotions/buddy_emotion_confused_head_scratch_v1.png`
- `emotions/buddy_emotion_relaxed_smirk_head_tilt_v1.png`
- `poses/buddy_pose_happy_open_arms_v1.png`

Reference index status:
- current enough for Phase 91 planning
- missing future groups: tools, closeups, action poses, rear/three-quarter views

## Generator Workflow Review

### ChatGPT Image Generation with uploaded references
- real image reference support: yes in ChatGPT user workflow
- character-lock ability: plausible, but must be manually verified
- multiple references: possible in user-facing workflow
- cost/limit risk: lower for Plus-style manual workflow than API billing
- recommendation: yes for manual controlled trial, if references can be uploaded as image inputs

### Vertex / Imagen reference workflow
- real image reference support: yes, official docs describe subject/style/control reference images
- character-lock ability: strong candidate when subject references are used
- multiple references: yes, same reference ID can group images for same subject
- cost/limit risk: requires Google Cloud / Vertex setup and likely billing
- recommendation: technically strong, but not preferred if "no API billing ever" remains binding

### Runway reference workflow
- real image reference support: yes, Gen-4 References supports saved/uploaded references
- character-lock ability: promising for consistent characters
- cost/limit risk: paid-plan/credit workflow
- recommendation: possible, but secondary unless it fits budget/account constraints

### Compositing / editing workflow
- real image reference support: depends on editor
- character-lock ability: useful for preserving Buddy if editing around official Buddy
- scene integration: weaker than native full-scene if overused
- recommendation: fallback or polish path, not the primary target

### Text-only prompting
- real image reference support: no
- drift risk: high
- recommendation: no

## Decision
Reference-capable workflows exist in the market, but this Codex turn did not execute or verify a concrete generator handoff with official Buddy image inputs.

Status:
`reference_image_workflow_available_in_principle_but_not_verified_locally`

No full-scene generation should run until a specific workflow can receive the selected Buddy reference images.

Sources:
- OpenAI image docs: https://platform.openai.com/docs/guides/image-generation
- ChatGPT Images help: https://help.openai.com/en/articles/9055440-images-in-chatgpt
- Vertex Imagen customization: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api-customization
- Vertex subject customization: https://cloud.google.com/vertex-ai/generative-ai/docs/image/subject-customization
- Runway Gen-4 References guide: https://help.runwayml.com/hc/en-us/articles/40042718905875-References-Guide
