# Phase 124 - Sharp Install and Export Script

## Ergebnis
- `sharp` wurde als freigegebene Tooling-Dependency installiert.
- Ein kontrolliertes Final-Export-Script wurde implementiert:
  - `dev/run-event-v2-final-asset-export.js`
- Script läuft standardmäßig im Dry-Run.
- Ohne `--write` werden keine finalen Assets geschrieben.

## Dependency-Änderung
- `package.json`: `devDependencies.sharp` hinzugefügt.
- `package-lock.json`: entsprechend aktualisiert.

## Script-Highlights
- Input-Draft (Default):
  - `data/events/catalog/_planning/phase-122-safe-assetref-draft-normalized-v2.json`
- Output-Basis (Default):
  - `assets/events/v2/final`
- Flags:
  - `--draft <path>`
  - `--out <path>`
  - `--write`
  - `--overwrite`
  - `--include-2x`
  - `--stdout-only`
- Reports (wenn nicht `--stdout-only`):
  - `data/events/catalog/_planning/phase-124-final-export-dry-run-report.json`
  - `data/events/catalog/_planning/phase-124-final-export-dry-run-report.md`

## Safety
- Keine Event-Datei-Mutation.
- Keine AssetRef-Aktivierung.
- Kein Überschreiben ohne `--overwrite`.
- Keine Ausgabe ohne explizites `--write`.

## Dry-Run (Phase 124)
- eventsChecked: 22
- sourceCandidatesChecked: 22
- plannedHero: 22
- plannedFallback: 22
- writtenFiles: 0
- conflicts: 0
- missingSources: 0
- invalidFormats: 0
- sharpVersion: 0.34.5
