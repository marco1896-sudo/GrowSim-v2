---
name: buddy-asset-skill
description: Reference-locked Grow Simulator Buddy asset workflow. Use when planning, prompting, generating, editing, reviewing, or integrating Buddy images, Buddy event images, Buddy poses, Buddy overlays, or any asset where the official Grow Simulator Buddy identity must be preserved against reference images.
---

# Buddy Asset Skill

## Purpose
Protect the official Grow Simulator Buddy identity while planning or reviewing Buddy assets.

Use this skill before any Buddy prompt, generation, edit, overlay, composite, or QA step. The skill is especially required for event images where Buddy appears in the same scene as a plant problem.

## Required Sources
Always inspect the official Buddy references before deciding prompts or QA:

- `assets/buddy referenz/BUDDY_REFERENCE_INDEX.md`
- `assets/buddy referenz/master/`
- `assets/buddy referenz/emotions/`
- `assets/buddy referenz/poses/`

If these files are unavailable, stop and document `blocked_missing_buddy_reference_source`.

## Non-Negotiable Rules
- Do not use text-only prompting as proof of Buddy identity lock.
- Do not accept a generic plant mascot, even if it is cute or polished.
- Do not accept Buddy as a passive sticker when the event needs situational action.
- Do not bake speech bubbles or long text into Buddy event images.
- Do not set final assets or assetRefs before QA acceptance.

## Workflow
1. Read `reference_usage.md`.
2. Select concrete Buddy reference images for identity and pose.
3. Use `prompt_patterns.md` to build the prompt package.
4. Require a generator workflow that can receive the selected reference images as image inputs.
5. Use `quality_checklist.md` for hard-gate QA.
6. Use `output_naming.md` before writing or proposing output paths.

## Full-Scene Event Image Standard
A valid Buddy event image must show Buddy as part of the scene:

- Buddy reacts to the concrete event problem.
- Buddy points, checks, warns, or explains visibly through pose and attention.
- Buddy keeps the same head shape, leaf-crown, eyes, body form, palette, and friendly coach character as the official references.
- The plant symptom remains biologically plausible and mobile-readable.

If real reference-image conditioning is not available, document `blocked_until_reference_image_generation_workflow_available`.
