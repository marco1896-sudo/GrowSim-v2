# Phase 93 Reference-Image Workflow Handoff Test

## Scope
Phase 93 prepares a concrete handoff test for one reference-image-capable generator workflow.

No image generation was executed in this phase.

Trial motif:
`shared_rootbound_warning`

## Tool Handoff Options

### 1. ChatGPT Image Generation with uploaded references
- accepts real image references: yes, via uploaded image inputs / editing workflow
- multiple reference images: yes in conversation workflow, but exact character-lock strength must be tested
- Buddy character lock: plausible, not guaranteed
- scene/background reference: possible as additional uploaded input
- Buddy-drift risk: medium
- cost/limit risk: low relative to API billing when used through Plus-style UI
- practical recommendation: primary manual handoff workflow

### 2. Vertex / Imagen Subject or Image Reference
- accepts real image references: yes
- multiple reference images: yes, subject references can share reference IDs
- Buddy character lock: strong candidate
- scene/background reference: yes, depending on customization/edit mode
- Buddy-drift risk: low-medium if references are configured correctly
- cost/limit risk: high for this project constraint because it likely requires Cloud/API billing
- practical recommendation: technically strong, but not preferred while "no API billing ever" is binding

### 3. Runway Reference Workflow
- accepts real image references: yes
- multiple reference images: yes, Runway documents up to three references for a single generation
- Buddy character lock: strong candidate for consistent characters
- scene/background reference: possible, but must be tested for Buddy + event scene balance
- Buddy-drift risk: medium-low
- cost/limit risk: paid-plan/credit risk
- practical recommendation: secondary option if account/credit constraints are acceptable

### 4. Other local reference-image workflow
- accepts real image references: unknown
- multiple reference images: unknown
- Buddy character lock: unknown
- scene/background reference: unknown
- Buddy-drift risk: unknown
- cost/limit risk: unknown
- practical recommendation: hold until a concrete tool is named and verified

### 5. Codex-only / text-only
- accepts real image references: no verified handoff in current tool context
- multiple reference images: no
- Buddy character lock: no
- scene/background reference: no
- Buddy-drift risk: high
- practical recommendation: no

## Recommended Handoff Workflow
Use ChatGPT Image Generation manually with uploaded references first, because it best matches the no-API-billing constraint and can accept uploaded images in the user-facing workflow.

Do not treat this as accepted until the tool UI confirms the uploaded Buddy images and scene reference are active inputs.

## Manual Test Protocol
1. Open the chosen reference-capable image tool.
2. Upload the Buddy identity references.
3. Upload the scene/background reference if supported.
4. Paste the Phase 93 handoff prompt.
5. Confirm references are active inputs, not just text filenames.
6. Generate exactly one candidate.
7. Save only to the review path:
   `assets/events/v2/_generated/full-scene/review/shared_rootbound_warning/candidate_full_scene_01.png`
8. Run side-by-side QA against the selected Buddy references.
9. Do not integrate, do not write final hero files, and do not update assetRefs.

## Block Conditions
Abort with `blocked_tool_does_not_accept_reference_images` if:
- references cannot be uploaded
- references are not active image inputs
- only text prompt is available
- the tool cannot keep output review-only
- candidate cannot be checked against Buddy references

## Phase 94 Gate
Phase 94 may generate only after a concrete tool confirms real image reference input for the selected Buddy references.

Sources:
- OpenAI ChatGPT Images help: https://help.openai.com/en/articles/9055440-editing-your-images-with-dall-e%23.class
- OpenAI image inputs FAQ: https://help.openai.com/en/articles/8400551-chatgpt-image-inputs-faq/
- Vertex Imagen customization: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api-customization
- Runway Gen-4 References: https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References
