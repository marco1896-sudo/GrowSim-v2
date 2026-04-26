# Plant Asset Lab

This folder is a staging area for future Grow Simulator plant assets. It is not live production and should not be referenced by gameplay, UI, service worker caches, or app manifests until assets pass QA and are intentionally promoted.

## Purpose

The lab defines a scalable asset production pipeline for cannabis plants without pots: base growth stages, stress states, deficiencies, excess and lockout states, pests, diseases, overlays, diagnostic leaves, and educational diagrams. The goal is a premium mobile-readable game asset library that remains biologically plausible and easy to expand.

## Generate New Assets

1. Choose an entry from `ASSET_INDEX.json`.
2. Copy the matching prompt from `generation_prompt` or from `prompts/`.
3. Generate at the requested canvas size. Use transparent PNG for plant, leaf, and overlay assets.
4. Save the PNG into the matching `output/` folder using the exact filename.
5. Update status from `pending_generation` or `prompt_ready` to `generated` only after the file exists.
6. Run QA using `QUALITY_CHECKLIST.md` and the files in `QA/`.

## Naming

Use lowercase snake_case only. Include plant type, stage or asset type, condition, severity when relevant, and version.

Examples:

- `cannabis_seedling_healthy_v001.png`
- `cannabis_mid_flower_magnesium_deficiency_medium_v001.png`
- `leaf_calcium_deficiency_v001.png`
- `diagram_nutrient_antagonism_v001.png`
- `overlay_powdery_mildew_light_v001.png`

## QA

Use `QUALITY_CHECKLIST.md` for broad checks and `QA/` for detailed alignment, naming, anchor, and mobile readability rules. A file should not move into production until it has a real PNG, matching metadata, consistent anchor behavior, and symptom logic that fits gameplay conditions.

## Promotion To Production

Approved assets can later be copied from this lab into the production asset tree. Promotion should be a separate task with explicit UI/cache integration, file references, and regression testing. Do not wire lab assets directly into live screens by accident.
