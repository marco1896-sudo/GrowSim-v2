# Phase 77 Copy Tightening Notes

## Dirty Worktree Safety Boundary
- `app.js`, `index.html`, `sw.js`, `package.json` were not touched.
- The worktree was already dirty before Phase 77, including the three locale files.
- Phase 77 only changed:
  - five Event V2 catalog event files to add event-local `uiDetail` refs
  - targeted text keys for those five events in `de.json`, `en.json`, `es.json`
  - isolated UI-Lab review matrix data
- No unrelated formatting, sorting, or structural cleanup was performed in the locale files.

## Events Tightened
1. `shared_rootbound_warning`
- problem before: root-pressure lesson still sounded too close to generic watering advice
- improvement: title, symptom, summary, why, aftermath, and three option details now point clearly to pot size, root room, and repot timing
- review shift: `revise -> watch`

2. `indoor_vpd_mismatch_veg`
- problem before: VPD framing was technically correct but too abstract on compact screens
- improvement: climate relationship now reads in plainer language with temperature, humidity, and leaf water-loss context
- review shift: `revise -> watch`

3. `indoor_soil_ph_out_of_range`
- problem before: pH topic felt too lab-like and summary/why were dense
- improvement: uptake block is explained in simpler language and the corrective path now starts with measurement, not blind feeding
- review shift: `revise -> watch`

4. `outdoor_heatwave_dry_wind`
- problem before: several dense slots stacked on phone widths and the cause-effect rhythm was too busy
- improvement: heat plus dry wind is now framed as one combined load with calmer symptom and aftermath phrasing
- review shift: `revise -> watch`

5. `shared_early_pest_signs_mild`
- problem before: symptom and aftermath were too long and the tone leaned more dramatic than needed
- improvement: calm monitoring language, clearer underside-check framing, shorter aftermath, and tighter option details
- review shift: `revise -> watch`

## Event-local Option Detail Strategy
- Phase 77 did not modify global option-detail pools.
- Each of the five event JSON files now uses event-local `uiDetail` keys for its three decision options.
- This keeps copy tightening isolated and avoids side effects on unrelated events.

## Buddy / Asset Impact
- No asset priorities were changed.
- Copy now sharpens later visual direction for:
  - `shared_rootbound_warning`: root-bound pot / crowded root-zone visual
  - `outdoor_heatwave_dry_wind`: plant + hot airflow / shade relief visual
  - `shared_early_pest_signs_mild`: underside-check / inspection close-up visual
- No asset files were created.
