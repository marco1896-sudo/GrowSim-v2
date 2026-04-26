# Generation Plan

## Recommended Order

1. Create the healthy base growth stage lineup.
2. Lock scale, centerline, and bottom anchor rules.
3. Generate core mid_flower stress states.
4. Generate mid_flower deficiencies and excess/lockout states.
5. Generate pest and disease states.
6. Generate leaf details for diagnosis screens.
7. Generate overlays for runtime compositing.
8. Generate diagrams after gameplay concepts are stable.

## Why Base Stages Come First

Base stages define the visual grammar of the plant: size, branching, leaf density, bud development, and anchor behavior. If symptoms are generated before this baseline exists, later assets will drift in scale and morphology.

## Why Symptoms Start On Mid Flower

Mid flower is the best first diagnostic baseline because it has mature leaves, visible buds, and enough canopy structure to show most stress, deficiency, pest, and disease patterns. It is also a high-value gameplay stage where diagnosis matters.

## Expansion Strategy

After mid_flower assets are approved, expand symptoms to mid_veg, late_veg, early_flower, and late_flower. Only generate seedling-specific conditions for problems that realistically occur in seedlings, such as damping off, overwatering, underwatering, and early pest pressure.

## Avoiding Inconsistent Plants

- Reuse the same master style prompt and negative prompt.
- Keep canvas size stable.
- Use the same virtual bottom anchor.
- Generate condition variants from the closest approved healthy baseline.
- QA each batch as a lineup, not only as individual images.
- Increment versions when regenerating instead of overwriting approved files.
