# Disease Prompts

## powdery_mildew
- Affected area: leaves
- Visual logic: white powdery patches on leaf surfaces
- Notes: humid airflow issue visual, not frost or trichomes
- Target folder: output/plants/diseases/
- Prompt:
```text
Cannabis plant app/game asset, no pot, no soil, no background, transparent PNG, full plant visible, front-facing centered composition, consistent virtual bottom anchor, clean premium mobile game asset style, realistic but slightly stylized, botanically plausible leaf structure, strong silhouette readability at phone size, clean soft studio lighting, transparent padding around all leaves and buds, no text, no UI, no watermark, no extra objects, no hands, no tools, no lamp, no grow tent. Render cannabis disease state: powdery mildew. Show white powdery patches on leaf surfaces. Respect stage validity and avoid exaggerated damage. Avoid: pot, soil, ground plane, grow tent, lamp, tools, hands, people, labels, UI, watermarks, background scenery, cropped leaves, cropped buds, impossible cannabis morphology, random flowers, cartoon exaggeration, noisy photorealistic clutter, text inside the image, duplicate plants, malformed leaves, severe symptoms that contradict requested severity.
```
- QA notes: verify disease is stage-appropriate and climate/event logic can support it.

## bud_rot
- Affected area: buds
- Visual logic: brown and grey dead areas inside dense buds, late flower risk
- Notes: show diseased bud detail without gore or exaggeration
- Target folder: output/plants/diseases/
- Prompt:
```text
Cannabis plant app/game asset, no pot, no soil, no background, transparent PNG, full plant visible, front-facing centered composition, consistent virtual bottom anchor, clean premium mobile game asset style, realistic but slightly stylized, botanically plausible leaf structure, strong silhouette readability at phone size, clean soft studio lighting, transparent padding around all leaves and buds, no text, no UI, no watermark, no extra objects, no hands, no tools, no lamp, no grow tent. Render cannabis disease state: bud rot. Show brown and grey dead areas inside dense buds, late flower risk. Respect stage validity and avoid exaggerated damage. Avoid: pot, soil, ground plane, grow tent, lamp, tools, hands, people, labels, UI, watermarks, background scenery, cropped leaves, cropped buds, impossible cannabis morphology, random flowers, cartoon exaggeration, noisy photorealistic clutter, text inside the image, duplicate plants, malformed leaves, severe symptoms that contradict requested severity.
```
- QA notes: verify disease is stage-appropriate and climate/event logic can support it.

## root_rot
- Affected area: root-zone/whole plant
- Visual logic: wilt despite wet root issue, yellowing and limp posture
- Notes: pair with root-zone diagram for diagnosis
- Target folder: output/plants/diseases/
- Prompt:
```text
Cannabis plant app/game asset, no pot, no soil, no background, transparent PNG, full plant visible, front-facing centered composition, consistent virtual bottom anchor, clean premium mobile game asset style, realistic but slightly stylized, botanically plausible leaf structure, strong silhouette readability at phone size, clean soft studio lighting, transparent padding around all leaves and buds, no text, no UI, no watermark, no extra objects, no hands, no tools, no lamp, no grow tent. Render cannabis disease state: root rot. Show wilt despite wet root issue, yellowing and limp posture. Respect stage validity and avoid exaggerated damage. Avoid: pot, soil, ground plane, grow tent, lamp, tools, hands, people, labels, UI, watermarks, background scenery, cropped leaves, cropped buds, impossible cannabis morphology, random flowers, cartoon exaggeration, noisy photorealistic clutter, text inside the image, duplicate plants, malformed leaves, severe symptoms that contradict requested severity.
```
- QA notes: verify disease is stage-appropriate and climate/event logic can support it.

## leaf_spot_septoria
- Affected area: leaves
- Visual logic: circular necrotic spots with yellow halos
- Notes: avoid confusing with random dirt or pest dots
- Target folder: output/plants/diseases/
- Prompt:
```text
Cannabis plant app/game asset, no pot, no soil, no background, transparent PNG, full plant visible, front-facing centered composition, consistent virtual bottom anchor, clean premium mobile game asset style, realistic but slightly stylized, botanically plausible leaf structure, strong silhouette readability at phone size, clean soft studio lighting, transparent padding around all leaves and buds, no text, no UI, no watermark, no extra objects, no hands, no tools, no lamp, no grow tent. Render cannabis disease state: leaf spot septoria. Show circular necrotic spots with yellow halos. Respect stage validity and avoid exaggerated damage. Avoid: pot, soil, ground plane, grow tent, lamp, tools, hands, people, labels, UI, watermarks, background scenery, cropped leaves, cropped buds, impossible cannabis morphology, random flowers, cartoon exaggeration, noisy photorealistic clutter, text inside the image, duplicate plants, malformed leaves, severe symptoms that contradict requested severity.
```
- QA notes: verify disease is stage-appropriate and climate/event logic can support it.

## damping_off_seedling
- Affected area: seedling stem
- Visual logic: thin collapsed seedling stem at base, plant toppled
- Notes: only valid early seedling stage
- Target folder: output/plants/diseases/
- Prompt:
```text
Cannabis plant app/game asset, no pot, no soil, no background, transparent PNG, full plant visible, front-facing centered composition, consistent virtual bottom anchor, clean premium mobile game asset style, realistic but slightly stylized, botanically plausible leaf structure, strong silhouette readability at phone size, clean soft studio lighting, transparent padding around all leaves and buds, no text, no UI, no watermark, no extra objects, no hands, no tools, no lamp, no grow tent. Render cannabis disease state: damping off seedling. Show thin collapsed seedling stem at base, plant toppled. Respect stage validity and avoid exaggerated damage. Avoid: pot, soil, ground plane, grow tent, lamp, tools, hands, people, labels, UI, watermarks, background scenery, cropped leaves, cropped buds, impossible cannabis morphology, random flowers, cartoon exaggeration, noisy photorealistic clutter, text inside the image, duplicate plants, malformed leaves, severe symptoms that contradict requested severity.
```
- QA notes: verify disease is stage-appropriate and climate/event logic can support it.

## general_fungal_pressure
- Affected area: canopy
- Visual logic: soft humid plant look, early warning state, slight dullness
- Notes: pre-disease risk state without fake symptoms
- Target folder: output/plants/diseases/
- Prompt:
```text
Cannabis plant app/game asset, no pot, no soil, no background, transparent PNG, full plant visible, front-facing centered composition, consistent virtual bottom anchor, clean premium mobile game asset style, realistic but slightly stylized, botanically plausible leaf structure, strong silhouette readability at phone size, clean soft studio lighting, transparent padding around all leaves and buds, no text, no UI, no watermark, no extra objects, no hands, no tools, no lamp, no grow tent. Render cannabis disease state: general fungal pressure. Show soft humid plant look, early warning state, slight dullness. Respect stage validity and avoid exaggerated damage. Avoid: pot, soil, ground plane, grow tent, lamp, tools, hands, people, labels, UI, watermarks, background scenery, cropped leaves, cropped buds, impossible cannabis morphology, random flowers, cartoon exaggeration, noisy photorealistic clutter, text inside the image, duplicate plants, malformed leaves, severe symptoms that contradict requested severity.
```
- QA notes: verify disease is stage-appropriate and climate/event logic can support it.

## Disease Card Prompts

Disease cards are separate from full-plant disease states and can use a clean neutral background when transparency reduces readability. Use 2048 x 2048 canvas, no paragraphs, no UI chrome, and no watermark.

### disease_card_powdery_mildew_v001.png
- Target folder: output/diseases/
- Affected area: leaves
- Prompt:
```text
Premium mobile game disease identification card image for powdery mildew. Show white powdery patches on cannabis leaf surfaces. Clean neutral background or transparent version if readable, no paragraphs, no UI chrome, no watermark, biologically plausible and not exaggerated.
```
- QA notes: should clarify the disease visually without replacing gameplay condition checks.

### disease_card_bud_rot_v001.png
- Target folder: output/diseases/
- Affected area: buds
- Prompt:
```text
Premium mobile game disease identification card image for bud rot. Show brown and grey dead areas inside a dense cannabis bud. Clean neutral background or transparent version if readable, no paragraphs, no UI chrome, no watermark, biologically plausible and not exaggerated.
```
- QA notes: should clarify the disease visually without replacing gameplay condition checks.

### disease_card_root_rot_v001.png
- Target folder: output/diseases/
- Affected area: root-zone
- Prompt:
```text
Premium mobile game disease identification card image for root rot. Show wet unhealthy root-zone concept and wilt context, no pot. Clean neutral background or transparent version if readable, no paragraphs, no UI chrome, no watermark, biologically plausible and not exaggerated.
```
- QA notes: should clarify the disease visually without replacing gameplay condition checks.

### disease_card_leaf_spot_septoria_v001.png
- Target folder: output/diseases/
- Affected area: leaves
- Prompt:
```text
Premium mobile game disease identification card image for leaf spot septoria. Show circular necrotic spots with yellow halos on cannabis leaves. Clean neutral background or transparent version if readable, no paragraphs, no UI chrome, no watermark, biologically plausible and not exaggerated.
```
- QA notes: should clarify the disease visually without replacing gameplay condition checks.

### disease_card_damping_off_seedling_v001.png
- Target folder: output/diseases/
- Affected area: seedling stem
- Prompt:
```text
Premium mobile game disease identification card image for damping off seedling. Show collapsed seedling stem at base, early-stage disease concept. Clean neutral background or transparent version if readable, no paragraphs, no UI chrome, no watermark, biologically plausible and not exaggerated.
```
- QA notes: should clarify the disease visually without replacing gameplay condition checks.

### disease_card_general_fungal_pressure_v001.png
- Target folder: output/diseases/
- Affected area: canopy
- Prompt:
```text
Premium mobile game disease identification card image for general fungal pressure. Show humid fungal pressure warning concept with soft dull cannabis foliage. Clean neutral background or transparent version if readable, no paragraphs, no UI chrome, no watermark, biologically plausible and not exaggerated.
```
- QA notes: should clarify the disease visually without replacing gameplay condition checks.

