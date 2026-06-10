# Buddy Transparent Assets Sorting Report

## Summary
- Assets found: 59
- Canonical sorted assets: 55
- Exact duplicate source files mapped onto canonical assets: 4
- Unclear assets moved to review: 0
- Shared source format: PNG, 500x500, transparent background detected on all inspected files

## New Folder Structure
```text
assets/buddy/transparent/
  _source_unsorted/
  emotions/angry/
  emotions/concerned/
  emotions/confused/
  emotions/happy/
  emotions/love/
  emotions/neutral/
  emotions/proud/
  emotions/sad/
  emotions/sleepy/
  emotions/surprised/
  emotions/worried/
  gameplay/clipboard/
  gameplay/magnifier/
  gameplay/nutrients/
  gameplay/pointing/
  gameplay/thumbs_down/
  gameplay/thumbs_up/
  gameplay/watering/
  gameplay/waving/
  rewards/celebrate/
  rewards/chest/
  rewards/coins/
  rewards/gift/
  rewards/premium/
  rewards/shop/
  rewards/star/
  rewards/trophy/
  review/
```

## Naming Scheme
- `buddy_<category>_<state_or_action>_<variant>_v001.png`
- lowercase only
- underscores only
- canonical assets grouped by emotion, gameplay, and reward intent
- no animation folders were populated because no reliable frame sequences were identifiable

## Key Decisions
- Original root PNGs were preserved in `assets/buddy/transparent/_source_unsorted/` before any renaming.
- Canonical working copies were created in categorized folders so later integration can target stable names without losing the raw exports.
- Four exact duplicate pairs were collapsed onto shared canonical asset paths via the rename map.
- Text-bearing assets such as `PREMIUM OFFER`, `VOUCHER`, `REWARD`, and `NUTRIENT` were kept, but marked with medium confidence because their baked-in text limits reuse.
- Inspection assets with leaf props were kept as gameplay variants and marked medium confidence for future product-context review.

## Review List
- None. All files could be categorized after filename plus visual inspection.

## Recommended Next Steps
- Decide whether text-bearing reward/shop assets should stay as final UI-ready art or be regenerated without embedded text.
- If Buddy idle or wave animations are needed, generate true frame-matched variants instead of forcing these still poses into pseudo-animations.
- When integration starts, wire the app against `buddy_asset_manifest.json` instead of hardcoding individual filenames.

