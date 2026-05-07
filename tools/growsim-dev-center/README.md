# GrowSim Dev Control Center

Local-only developer dashboard for Grow Simulator.

Start from the project root:

```bash
npm run dev:center
```

Then open:

```text
http://localhost:5179
```

## What V1 Does

- Shows project path, detected app structure, Node version, package scripts, local tool status, and recent script checks.
- Reads root `package.json` scripts and runs only those known scripts through safe buttons.
- Scans project asset folders, detects common image formats, reads file sizes and dimensions, detects PNG/WebP transparency where practical, and previews images.
- Scans `src/i18n/locales/*.json`, compares keys, reports missing/extra/empty values, and never edits translations.
- Generates safe JSON test-state presets under `tools/growsim-dev-center/generated/test-states/`.
- Builds structured Codex prompts for future GrowSim tasks.

## Safety Notes

- This tool is not imported by the public app.
- The server does not accept arbitrary shell commands.
- Script execution is limited to scripts present in the root `package.json`.
- Asset and i18n checks are read-only.
- Test-state generation writes only inside this tool folder.
- Generated presets are not real savegame migrations. Validate against `storage.js` before using them in the app.

## Manual Checks

1. Start `npm run dev:center`.
2. Open `http://localhost:5179`.
3. Confirm Overview loads.
4. Run a low-risk script such as `check:i18n` or `check:syntax`.
5. Refresh Assets and i18n tabs.
6. Generate one Test State and confirm the JSON file appears under `generated/test-states`.
7. Build and copy a Codex prompt.

## Storage / Savegame Integration Notes

Current V1 presets are intentionally detached from real browser storage. The app currently uses `storage.js` with localStorage/IndexedDB restore logic and migration/normalization. A future integration should:

- import presets only through a reviewed dev-only path
- run the same normalization/migration functions used by app startup
- never overwrite real player state without an explicit backup and confirmation
- document the exact storage key and IndexedDB behavior before writing anything
