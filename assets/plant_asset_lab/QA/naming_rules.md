# Naming Rules

Use lowercase snake_case filenames with a version suffix.

## Patterns

- Full plant base: `cannabis_{growth_stage}_healthy_v001.png`
- Full plant condition: `cannabis_{growth_stage}_{condition}_{severity}_v001.png`
- Leaf detail: `leaf_{condition}_v001.png`
- Pest card: `pest_card_{pest_name}_v001.png`
- Disease card/detail: `disease_{condition}_v001.png`
- Diagram: `diagram_{topic}_v001.png`
- Overlay: `overlay_{effect}_{severity}_v001.png`

## Rules

- Do not overwrite prior versions.
- Increment `v002`, `v003`, and so on for revisions.
- Filename must match `ASSET_INDEX.json`.
- Avoid vague words like `bad`, `sick`, or `damage` when a specific cause is known.
