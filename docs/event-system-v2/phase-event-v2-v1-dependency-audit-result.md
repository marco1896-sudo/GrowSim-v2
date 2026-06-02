# Eventsystem V2 – Phase: V1 Dependency Audit (Result)

## Executive Summary

Das Audit zeigt: V1 ist weiterhin in produktiven Laufzeit-, UI-Fallback- und Save/Restore-Pfaden verankert.  
Ein sofortiger V1-Delete wäre aktuell riskant und nicht freigabefähig.  
Empfohlen ist ein schrittweiser Rückbau mit klarer Reihenfolge und separater Freigabe je Schritt.

## Anzahl gefundener V1-Abhängigkeiten

- Hohe Relevanz (produktive Pfade): 5 Kernbereiche
  - `app.js`
  - `ui.js`
  - `sim.js`
  - `storage.js`
  - `events.js`
- Zusätzliche Abhängigkeiten:
  - `src/events/EventSystemRuntimeBridge.js`
  - zahlreiche `test/` und `dev/` Pfade

## Kritische Abhängigkeiten

1. `storage.js` Legacy-Migration und Spiegelung (`migrateLegacyStateIntoCanonical`, `syncLegacyMirrorsFromCanonical`)
2. `events.js` produktive V1-State-Machine inklusive Resolve/History/Cooldown
3. `ui.js` Event-Center-Fallback auf V1-MachineStates
4. `sim.js` Scheduler-/Timing-Verzahnung mit `state.events.*`

## Produktive Writes (V1)

- Ja, weiterhin vorhanden.
- Hauptsächlich in:
  - `events.js`
  - `app.js`
  - `sim.js`
  - Teilen von `ui.js` (Fallback-Resolve-Verhalten)

## Legacy-Read-Pfade

- Bridge- und Storage-Layer lesen V1 defensiv für:
  - Save-Kompatibilität
  - Fallback-Sicherheit
  - Altsave-Stabilität

## UI-Fallback-Pfade

- Legacy-Fallback ist weiterhin aktiv, wenn kein passendes V2-OpenEvent gerendert wird.
- Das ist aktuell stabilitätsrelevant und testrelevant.

## Save-/Restore-Pfade

- V1-Felder werden weiterhin normalisiert, gespiegelt und persistiert.
- Alte Saves bleiben dadurch kompatibel.

## Sichere Löschkandidaten

- Aktuell keine eindeutig sicheren produktiven Löschkandidaten identifiziert.
- Eventuelle Kandidaten liegen eher in späteren Dev-/Test-Hilfsrouten, aber nicht ohne Begleitmigration.

## Nicht sichere Löschkandidaten

- `events.js` V1-State-Machine
- `storage.js` Legacy-Migration/Sync
- `ui.js` Legacy-Fallback-Branches
- `sim.js` Legacy-Scheduler-Interlocks

## Empfohlene Reihenfolge für Rückbau

1. **Phase R1 – Write-Isolation:**  
   Produktive V1-Writes weiter reduzieren (Bridge-gesteuert), ohne Legacy-Read abzuschalten.
2. **Phase R2 – UI-Fallback-Minimierung:**  
   V2-UI-Zustände vollständig abdecken, danach Legacy-Renderpfade abschalten.
3. **Phase R3 – Testmigration:**  
   Test-/Smoke-Suite von V1-Schemaannahmen auf V2-first Assertions umstellen.
4. **Phase R4 – Save/Migration-Gate:**  
   Versionierte Save-Strategie definieren, Legacy-Spiegel optional machen.
5. **Phase R5 – Deletion Candidate Pass:**  
   Erst dann V1-Dateien/Felder als Löschkandidaten markieren und separat freigeben.

## Entscheidung

- V1 löschen: **Nein** (aktuell nicht sicher).
- V1 weiter Legacy: **Ja** (weiterhin erforderlich als Fallback/Kompatibilität).
- Nächster Rückbau-Schritt: **R1 Write-Isolation-Plan** mit expliziter Freigabe.

