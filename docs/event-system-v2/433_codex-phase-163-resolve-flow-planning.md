# Phase 163 - Resolve Flow Planning (Still No Write)

## V1-Analyse (read-only)
Der bestehende V1-Flow liegt primär in `events.js` mit Zustandsübergängen, Outcome-Berechnung und Effektanwendung. Persistenzpfade liegen in `storage.js` (inkl. Event-/Resolve-bezogener Felder). In `sim.js` gibt es zustandsabhängige Verhaltenszweige für Event-Machine-States.

## Kritische V1-Punkte
- Event-Machine-State und Pending-Resolution-Pfade.
- Outcome-/Choice-Effekte mit potenzieller Mutation.
- Save/Restore inkl. Eventstatus und Metadaten.
- Reward/Mission/Notification-nahe Kopplungen.

## Abgrenzung V2 in Phase 163
- Reine Planung und Draft-Artefakte.
- Keine Resolve-Implementation.
- Kein Write, kein Save, keine Runtime-Aktivierung.

## Ergebnis
Ein vollständiges Zielbild, Datenmodell-Draft, Taxonomie, UI-Flow und Risikoanalyse für den späteren Resolve-Schritt wurde erstellt.
