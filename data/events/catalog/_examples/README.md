# `_examples/` — Beispielmaterial zum Event-System V2

**Status:** Reine Demo-Dateien, **nicht** Teil des Live-Katalogs.
**Quelle:** `docs/event-system-v2/02_data-model.md`, Abschnitte 6–8.
**Zweck:** Codex und Reviewer haben hier konkrete, schemakonforme Vorlagen, an denen sie das v3-Format greifen können.

## Enthalten

- `water_dry_pot.event.json` — einfaches Krisen-Event mit einer Eskalationsstufe.
- `late_flower_humidity_risk.event.json` — typisches Krisen-Event mit Diagnostics, Ketten-Hook und mehreren Eskalationsstufen.
- `story_first_trichomes.event.json` — Story-Beat mit Lern-Layer.
- `chain_late_flower_humidity_risk.chain.json` — Beispiel einer Event-Kette.
- `learning_water_basics.learning-card.json` — Beispiel-Lernkarte.

## Wichtige Hinweise

1. Diese Dateien werden **nicht** vom Spiel geladen. Die Engine liest später nur aus `data/events/catalog/<kategorie>/`.
2. Die Beispiele referenzieren teilweise Asset- oder Lernkarten-IDs, die noch nicht existieren — `fallback`-Werte sind gesetzt.
3. Vor jeder Verwendung als Vorlage: gegen `_schema/event.schema.json` etc. validieren. Validator-Skript folgt in Codex-Auftrag #004.
4. `authoring.status` ist hier immer `draft`. Vor Promotion in den Live-Katalog: Status auf `review` setzen, Asset/Locale-Lücken schließen, Migration-Tabelle füllen.
