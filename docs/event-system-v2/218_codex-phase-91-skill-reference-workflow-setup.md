# Phase 91 Skill Reference Workflow Setup

## Local Skill Created
Path:

`.codex/skills/buddy-asset-skill/`

Files:
- `SKILL.md`
- `prompt_patterns.md`
- `reference_usage.md`
- `quality_checklist.md`
- `output_naming.md`
- `agents/openai.yaml`

The skill is intentionally documentation-only. It contains no images, no binary assets, no generator scripts, and no runtime code.

## Skill Purpose
The skill exists to prevent future Buddy generation phases from relying on memory or text-only descriptions.

It requires:
- official Buddy reference inspection
- concrete reference-file selection
- reference-image conditioning before full-scene generation
- hard QA against official Buddy identity

## Reference Input Package for First Trial

Event-ID:
`shared_rootbound_warning`

Generator:
To be selected in Phase 92 only after real reference image input is confirmed.

Buddy identity references:
- `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
- `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`

Buddy pose references:
- `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
- optional: `assets/buddy referenz/emotions/buddy_emotion_confused_head_scratch_v1.png`

Scene/background reference:
- `assets/events/v2/_generated/backgrounds/review/shared_rootbound_warning/candidate_bg_01.png`

Plant/problem requirements:
- rootbound / pot boundary / root-room pressure visible
- plant not catastrophically wilted
- no false overwatering-only signal

Composition requirements:
- Buddy right or side-right near pot/root area
- Buddy looks toward root zone
- Buddy calmly points/checks
- symptom remains visible
- mobile hero safe margins

No-drift constraints:
- exact official Buddy identity
- no changed leaf-crown
- no changed eyes
- no changed head/body shape
- no clothing
- no speech bubble
- no text

Output target:
`assets/events/v2/_generated/full-scene/review/shared_rootbound_warning/candidate_01.png`

QA gate:
Full-scene Buddy QA scorecard from Phase 91.

## Trial Gates
A full-scene trial can run only if:
- generator accepts real Buddy reference images as image input
- exact reference files are passed to the generator
- output is review-only
- no assetRefs or event files are changed
- QA is side-by-side against the selected references

Hard block:
`blocked_until_reference_image_generation_workflow_verified`
