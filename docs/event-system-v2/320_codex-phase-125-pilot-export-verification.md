# Phase 125 - Pilot Export Verification

Source report:
- `data/events/catalog/_planning/phase-125-pilot-final-export-report.json`

## Verification Summary
- All 6 expected outputs exist and were written.
- Output format: WebP for all 6 files.
- No overwrite occurred.
- Aspect ratio preserved for all outputs.
- Width constraints satisfied:
  - `hero.webp` width = 1280 for all pilot events
  - `fallback.webp` width = 960 for all pilot events

## Per-Event Verification

### indoor_light_burn_canopy_top
- hero.webp: 1280x731, sha256 `61dd64232abd682837d50889f779b9400cd2ecb2f0b70b860570b00b8fa00d13`
- fallback.webp: 960x549, sha256 `1838ad0d4cac67c043c2e41a1d9ac258f0e7c0d2402e613993c8ea13c124d414`

### shared_early_pest_signs_mild
- hero.webp: 1280x703, sha256 `b6a013f0004f2e97a0f522522130b92e74057438ea150e22e41b71f90a6a2bdb`
- fallback.webp: 960x527, sha256 `6dd4190efdf60d7662e6e9012ea283e14f41525fdf98ca146e68bce6e2710b8f`

### shared_rootbound_warning
- hero.webp: 1280x704, sha256 `561a52941906d7e3944ff01030dd1caa10836c5bc295a35c749c96d6770d2cce`
- fallback.webp: 960x528, sha256 `9fe19b0e9d56b45fa94dcd43ba30424eb4a32690c3bf62e9da13dc9da3e2630e`

## AssetRef Preview Status
- Preview file created:
  - `data/events/catalog/_planning/phase-125-pilot-assetref-existence-preview.json`
- All 3 pilot events now have existing final `hero` and `fallback` targets.
- No productive AssetRef changes were made.
