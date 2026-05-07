# `_schema/` — JSON-Schemas für Event System V2

**Status:** Neutrale Gerüste, **noch nicht final**, **noch nicht im Build**.
**Quelle:** `docs/event-system-v2/02_data-model.md`
**Konsumiert von:** geplante V2-Engine (`src/events/v2/`), Codex-Auftrag #004 (Validator).

## Inhalt

- `event.schema.json` — Events, Story-Beats, Reward-Beats
- `chain.schema.json` — Event-Ketten
- `learning-card.schema.json` — Mikro-Lektionen
- `common-defs.schema.json` — geteilte Sub-Definitionen (LocalizedRef, Effect, TriggerCondition, …)

## Wichtige Konventionen

1. JSON-Schema Draft-07.
2. **Kein** `additionalProperties: false`. Erweiterbarkeit hat Priorität.
3. Felder im Schema werden **beschrieben**, aber nur an Pflichtstellen typisiert.
4. Validator-Skript (Auftrag #004) prüft zusätzliche Regeln, die nicht ausdrucksfähig im Schema sind (Referenz-Integrität, Asset-Existenz, i18n-Vollständigkeit).
5. Keine direkte Verwendung in `app.js` oder bestehenden Modulen — die V2-Engine ist der einzige Konsument.

## Lifecycle

- `draft` (jetzt): Konzept, kann sich täglich ändern.
- `review`: Reviewer hat über das Schema geschaut, Inhalte sind stabil.
- `approved`: Engine V2 darf gegen dieses Schema laden.
- `frozen`: Spätere Schemaversion (v4) erforderlich für Breaking Changes.
