# Phase 116 - Non-Mutating Export Script Draft

## Draft-Datei
- `dev/event-v2-export-trial-assets-to-webp.draft.js`

## Designprinzip
- Standard: `dryRun: true`
- Keine finalen Writes ohne explizites `--write`.
- Kein Schreiben in `assets/events/v2/final/` ohne zusätzliche harte Freigabe (`--allow-final-write`).
- Für sichere Tests kann optional nur in `_trial_export` geschrieben werden.

## Input-Quellen
- Primär: `data/events/catalog/_planning/phase-112-trial-asset-set-v1.json`
- Alternativ: `data/events/catalog/_planning/phase-113-safe-assetref-draft.json`

## Geplante Funktionen
- Source-Datei prüfen (Existenz, Hash, Größe, Dimensionen)
- Wide-Hero-Ratio prüfen
- Export-Ziele planen (`hero.webp`, `fallback.webp`, optional `hero@2x.webp`)
- Zielkonflikte prüfen (existiert bereits)
- Report ausgeben (JSON)
- In diesem Draft keine echte WebP-Konvertierung ausführen

## CLI (Draft)
- `--input <path>`
- `--write`
- `--target trial|final` (default `trial`)
- `--allow-final-write` (zusätzliche Safety-Schranke)
- `--overwrite`
- `--report <path>`

## Warum Non-Mutating zuerst
- Ermöglicht Prüf- und Gate-Logik vor Tooling-Aktivierung.
- Verhindert versehentliche produktive Writes.
