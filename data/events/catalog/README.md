# `data/events/catalog/` — Event-System V2 Katalog

**Status:** Konzeptphase. Noch nicht in den Build eingebunden.
**Spezifikation:** `docs/event-system-v2/02_data-model.md`

## Struktur

```
catalog/
  _schema/      ← JSON-Schemas (Draft-07) für Events, Chains, Lernkarten
  _examples/    ← schemakonforme Beispiel-Dokumente, nicht im Live-Katalog
  water/        ← (geplant) Live-Events der Kategorie water
  nutrition/    ← (geplant) ...
  environment/
  pest/
  disease/
  positive/
  special/
  story_beats/
  chains/
  learning_cards/
```

## Wichtige Hinweise

1. Die existierenden Dateien `data/events.json` und `data/events.v2.json` bleiben als Legacy-Quelle erhalten und werden **nicht** in diesen Katalog verschoben. Eine Migrations-Schicht (siehe `02_data-model.md` §10) übernimmt das Mapping zur Laufzeit.
2. Eine Datei = ein Event / eine Kette / eine Lernkarte.
3. Live-Events werden erst durch die V2-Engine geladen (Codex-Auftrag #005). Bis dahin ist dieser Ordner reine Authoring- und Reviewzone.
4. Vor jedem Promotion-Schritt zu `approved` läuft der Schema-Validator (Codex-Auftrag #004) sowie die Content-Quality-Checks aus `02_data-model.md` §9.
