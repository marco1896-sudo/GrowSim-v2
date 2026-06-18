# 44 — Codex Phase 28 Locale QA Lock

## 1) Info-Density Grenzwerte (Mini-Katalog)
- Zielwert: `<= 4.0` Infos/Event
- Warnbereich: `> 4.0` bis `6.0`
- Bridge-Prep blockierend: `> 8.0`

Formel:
- `infoDensity = infoCount / eventCount`

## 2) Erlaubte Info-Typen
- `budget_short` bei optionalen oder nicht-kritischen Slots ist zulaessig.
- kurze Titel sind nur zulaessig, wenn Lesbarkeit und Klarheit im UI erhalten bleiben.
- `long`-Budget-Warnings sind nicht zulaessig.

## 3) Locale-Qualitaetsregeln
- Deutsch (`de`) ist Master-Copy und Referenz fuer Tiefe/Tonalitaet.
- Englisch (`en`) und Spanisch (`es`) duerfen einfacher sein, aber nicht leer oder generisch.
- Keine Panik-Sprache.
- Keine Bro-Science.
- Maximal zwei dichte Fachbegriffe pro Abschnitt.
- Coach-Ton bleibt ruhig, hilfreich und handlungsorientiert.

## 4) Bridge-Prep Regel
Bridge-Prep darf starten, wenn alle Punkte erfuellt sind:
- `blocker = 0`
- `error = 0`
- `warning = 0`
- `budgetWarnings = 0`
- `bridge pass = 12/12`
- `infoDensity <= 4.0` oder als Ausnahme sauber begruendet

## 5) Lock-Interpretation
- Der Lock ist ein QA-Geländer fuer Copy-Qualitaet, kein Ersatz fuer inhaltliche Review.
- Bei Grenzwertverletzung gilt zuerst: gezieltes Slot-Refinement statt breiter Rewrites.
