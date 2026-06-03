# Homescreen/Care Studio Status Consistency Fix

## Root Cause

The Homescreen bottom status cards still rendered visible water and risk from legacy summary fields `state.status.water` and `state.status.risk`.
Care Studio already rendered its visible moisture and risk from the derived care summary, especially `displayMoisture` and `riskScore`.
That split made screenshot states like `Homescreen water = 5` while `Care Studio moisture = 81%` possible.

## Changed Files

- `app.js`
- `src/ui/mappings/homeMapping.js`
- `test/care-studio-moisture-risk-consistency.test.js`

## Tested Scenario

- Raw global status forced low: `status.water = 8`, `status.risk = 3`
- Care moisture profile set to:
  - `surfaceMoisture = 77`
  - `rootZoneMoisture = 84`
  - `substrateMoisture = 78`
- Expected derived values:
  - `displayMoisture ~= 81`
  - `riskScore ~= 46`

## Result

Homescreen and Care Studio now use the same player-facing derived source for visible moisture/water and risk.
The regression test now verifies that the Homescreen water/risk rings match the Care Studio moisture/risk chips for the wet-root scenario above.
Event System V2, save format, and simulation/event trigger logic were not changed.

## Follow-up Refactor

Extracted shared player-facing display derivation into `src/ui/mappings/playerFacingStatus.js`.
That helper now owns the visible fallback chain for:

- moisture / water
- nutrition / supply
- stress
- risk
- surface moisture
- root-zone moisture
- dryback
- root risk
- drought stress

This reduces future mismatch risk because Homescreen and Care Studio no longer maintain separate display fallback logic.

Changed files:

- `src/ui/mappings/playerFacingStatus.js`
- `src/ui/mappings/homeMapping.js`
- `src/ui/mappings/careMapping.js`
- `app.js`
- `index.html`
- `sw.js`

Tests run:

- `node --check app.js`
- `node --check src/ui/mappings/homeMapping.js`
- `node --check src/ui/mappings/playerFacingStatus.js`
- `node test/care-studio-moisture-risk-consistency.test.js`
- `node test/ui-feedback-phase7.test.js`
- `npm run test:smoke`
