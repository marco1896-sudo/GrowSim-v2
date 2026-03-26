# Premium UI Asset Pack Pipeline

This folder contains a reproducible generation pipeline for the Grow Simulator premium cannabis-themed UI pack.

## Files
- `style_spec.md`: visual lock rules.
- `jobs/mandatory.jsonl`: calibration + core + component generation jobs.
- `jobs/optional.jsonl`: optional expansion board.
- `config/board_slices.json`: board-to-icon extraction mapping.
- `split_boards.py`: crops generated boards into final icon files.
- `sync_pests.py`: mirrors selected pest/disease icons into `assets/gameplay/pests/`.
- `qc_icons.py`: validates square PNG + alpha.
- `build_sprite_sheet.py`: creates `assets/sprites/ui_icon_sheet.png` + `.json`.
- `run_pipeline.ps1`: one-command execution script.

## Budget guardrails
- Mandatory run count: `23` renders.
- Optional run count: `+1` render.
- Hard stop rule from plan: do not exceed `32` total renders.

## Run
1. Set `OPENAI_API_KEY`.
2. Run:
   - `powershell -ExecutionPolicy Bypass -File dev/asset_pack/run_pipeline.ps1`
3. If budget headroom remains, uncomment optional lines in `run_pipeline.ps1` and rerun optional section.
