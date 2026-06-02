# Phase 113 - Safe Promotion Rules

1. Only candidates from `trial_asset_set_v1` may enter promotion planning.
2. `reject` assets are not promotable.
3. `temporary_usable_needs_revision` is allowed for trial/preview, but must be re-reviewed before soft-launch sign-off.
4. No final WebP path can be activated without a verified source candidate and existence checks.
5. No AssetRef update without existing final files and a dry hash report.
6. Never overwrite existing final assets without explicit approval and backup/hash diff report.
7. Keep watch/revision annotations attached to each event through all wiring phases.
