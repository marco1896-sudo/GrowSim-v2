# Buddy Prompt Patterns

## Full-Scene Reference-Locked Pattern

Use this structure only when the generator accepts Buddy reference images as image inputs.

```text
Buddy identity references:
- [official master reference path]
- [official pose/emotion reference path]

Reference lock:
Use the referenced Grow Simulator Buddy as the same character. Preserve the exact head shape, compact body silhouette, leaf-crown shape, eye language, green color family, soft arms/hands, and friendly coach personality.

Event scene:
[Describe the plant/event problem with one primary visual signal.]

Situational Buddy action:
[Describe how Buddy reacts to the exact problem: pointing, inspecting, warning, measuring, or calmly explaining.]

Composition:
Mobile-first event hero. Buddy is integrated into the same scene lighting and perspective, not pasted on. Keep safe margins. Buddy must not hide the symptom.

No-drift constraints:
No different mascot. No new leaf-crown. No new eye style. No new body shape. No clothing. No text. No speech bubble. No logo. No overdramatic plant damage.
```

## Reference Input Package

Every prompt package must include:

- `event_id`
- `generator`
- `buddy_identity_references`
- `buddy_pose_references`
- `scene_or_background_reference`
- `plant_problem_requirements`
- `situational_action_requirements`
- `composition_requirements`
- `negative_prompt`
- `output_target`
- `qa_gate`

## Text-Only Block Rule

If the generator cannot receive the selected Buddy images as reference inputs, do not run the prompt. Return:

`blocked_until_reference_image_generation_workflow_available`
