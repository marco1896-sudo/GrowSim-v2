# Phase 97 Full-Scene Generation Handoff Ready

## Manual Handoff Protocol
Use a reference-capable image generator. Do not run text-only.

1. Upload the three required reference images:
   - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
   - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
   - `assets/events/v2/_generated/backgrounds/review/shared_rootbound_warning/candidate_bg_01.png`
2. Optionally upload:
   - `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`
3. Confirm all uploaded images are active references.
4. Paste the final generator prompt.
5. Generate exactly one candidate.
6. Save it only as:
   `assets/events/v2/_generated/full-scene/review/shared_rootbound_warning/candidate_full_scene_01.png`
7. Do not integrate. Do not create final hero files. Do not update assetRefs.

## Final Generator Prompt

```text
Use the uploaded Buddy reference images as strict character identity references.

The character must remain the official Grow Simulator Buddy: same rounded compact body silhouette, same leaf crown structure, same large eyes and facial language, same green color palette, same friendly coach personality. Do not redesign Buddy. Do not create a generic plant mascot.

Create one mobile game event hero image for the event `shared_rootbound_warning`.

Scene:
A cannabis plant in a pot with a clearly visible rootbound/root-space warning. The pot/root area should show dense roots or limited root space, similar to the uploaded rootbound background reference. The plant should look stressed only mildly or moderately, not dying or catastrophic.

Buddy action:
Buddy is directly part of the scene, placed on the right or lower-right near the pot/rootzone. Buddy calmly looks at the root area and points/checks/explains the rootbound issue like a friendly coach. Buddy must interact with the rootzone problem, not just stand randomly beside it.

Composition:
Mobile-first event hero image. Clear readable rootzone problem. Buddy must not cover the important roots or pot edge. Keep safe margins for mobile UI. Premium Grow Simulator look. No speech bubble. No text. No logos.

Negative constraints:
No different Buddy design. No changed eyes. No changed leaf crown. No changed body shape. No generic mascot. No sticker/overlay look. No text artifacts. No speech bubble. No dying plant. No unrelated symbols. No extra characters.
```

## Phase 98 Entry Condition
Exactly one candidate exists at the review path.
