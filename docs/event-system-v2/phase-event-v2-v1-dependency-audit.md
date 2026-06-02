# Eventsystem V2 – Phase: V1 Dependency Audit

## Ziel

Diese Phase dokumentiert ausschließlich V1-Abhängigkeiten für einen kontrollierten späteren Rückbau.  
Es wurden keine V1-Dateien gelöscht, keine Save-Felder entfernt und kein Runtime-Cutover erweitert.

## Audit-Scope

- `app.js`
- `ui.js`
- `sim.js`
- `storage.js`
- `events.js`
- `src/events/`
- `test/`
- `dev/`

Gesucht wurde nach:

- `state.events`
- `events.active`
- `events.history`
- `activeEvent`
- `eventCooldown`
- `legacy` / `Legacy` / `V1`
- `resolveEvent` / `triggerEvent`
- `eventQueue` / `eventHistory`

## Gefundene V1-Abhängigkeiten

### 1) `app.js` – Event Runtime Wiring und Legacy-State-Sync

- Zweck: Laufzeit-Delegation Event-Tick/Resolve + UI-Wiring.
- Liest V1: Ja (`state.events.*`, aktive Event-Metadaten, Maschinenstatus).
- Schreibt V1: Ja (mehrere `state.events.*` Felder im Laufzeitfluss).
- UI-Abhängigkeit: Ja (Event-Sheet-Wiring, Legacy/Modern-Root-Verhalten).
- Save-Abhängigkeit: Indirekt (V1-Felder werden über Storage-Zyklus persistiert).
- Test-Abhängigkeit: Ja (mehrere Smoke-/UI-Tests erwarten dieses Verhalten).
- Kategorie: `C` produktiver V1-Write + `B` UI-Fallback.
- Risiko: Hoch.
- Empfehlung: Vorerst behalten; später nur nach expliziter Adapter-Stufe entkoppeln.

### 2) `ui.js` – Legacy Event-Sheet Fallback-Routen

- Zweck: Darstellung Eventzustand inkl. Fallback-Pfade.
- Liest V1: Ja (`state.events.machineState`, `activeEventTitle`, `activeEventText`, `activeOptions`, Cooldown-Infos).
- Schreibt V1: Ja (z. B. Fallback-Resolve-Pfad setzt Legacy-Resolve-Zustand).
- UI-Abhängigkeit: Ja (zentral für sichtbaren Fallback, wenn kein V2-OpenEvent aktiv ist).
- Save-Abhängigkeit: Indirekt.
- Test-Abhängigkeit: Hoch (UI-/Smoke-Suite).
- Kategorie: `B` UI-Fallback + `C` produktiver V1-Write.
- Risiko: Hoch.
- Empfehlung: Behalten; erst nach nachweislich vollständigem V2-Sheet-Fallback-Ersatz schrittweise zurückbauen.

### 3) `sim.js` – Scheduler-/Tick-Integration mit Legacy-Events

- Zweck: Simulations-Tick, Deadlines, Timing- und Eventzustandskonsistenz.
- Liest V1: Ja (`state.events.machineState`, Scheduler-Felder).
- Schreibt V1: Ja (z. B. Scheduler-Deadlines, Event-Timer-Anpassungen).
- UI-Abhängigkeit: Indirekt.
- Save-Abhängigkeit: Ja (Felder werden persistiert).
- Test-Abhängigkeit: Ja (Runtime-/Timer-Regressionen).
- Kategorie: `C` produktiver V1-Write + `D` Save-/Restore-Abhängigkeit.
- Risiko: Hoch.
- Empfehlung: Behalten; Rückbau erst nach isoliertem V2-Tick-Pfad mit identischer Stabilität.

### 4) `storage.js` – Legacy Migration/Normalization/Mirror

- Zweck: Backward-Kompatibilität alter Saves, Canonical/Legacy-Sync.
- Liest V1: Ja (alte Save-Strukturen).
- Schreibt V1: Ja (normalisiert/synchronisiert `state.events.*` Spiegel).
- UI-Abhängigkeit: Indirekt.
- Save-Abhängigkeit: Sehr hoch.
- Test-Abhängigkeit: Sehr hoch (Save/Load/Migration-Smokes).
- Kategorie: `A` sicherer Legacy-Read + `D` Save-/Restore-Abhängigkeit.
- Risiko: Hoch.
- Empfehlung: Behalten; als letzter Rückbaukandidat nach dedizierter Migrationsphase.

### 5) `events.js` – Legacy Event Engine

- Zweck: Event-Auswahl, Aktivierung, Resolving, Cooldowns, History.
- Liest V1: Ja (vollständig).
- Schreibt V1: Ja (vollständig, inklusive `history`, `machineState`, `activeEvent*`).
- UI-Abhängigkeit: Indirekt (liefert Zustände für UI-Fallback).
- Save-Abhängigkeit: Ja.
- Test-Abhängigkeit: Sehr hoch.
- Kategorie: `C` produktiver V1-Write.
- Risiko: Hoch.
- Empfehlung: Behalten; später nur über klaren Gate-Plan (Bridge + Deaktivierungs-Matrix) isolieren.

### 6) `src/events/EventSystemRuntimeBridge.js` – Bridge mit Legacy-Read/Fallback-Semantik

- Zweck: Autoritätsentscheidung zwischen V2 und Legacy.
- Liest V1: Ja (für Fallback-/Guard-Entscheidungen).
- Schreibt V1: Kein direkter Kern-Write, aber steuert Write-Gates.
- UI-Abhängigkeit: Indirekt (entscheidet erlaubte Pfade).
- Save-Abhängigkeit: Indirekt.
- Test-Abhängigkeit: Hoch (Bridge-Smokes).
- Kategorie: `A` sicherer Legacy-Read + `E` Test-/Dev-Abhängigkeit.
- Risiko: Mittel.
- Empfehlung: Behalten; später Legacy-Read nur reduzieren, wenn Save-/Fallback-Risiken abgefangen sind.

### 7) `test/` – Breite Legacy-Schema-Erwartungen

- Zweck: Regression-Schutz für Runtime, UI, Save, Migration.
- Liest V1: Ja (stark).
- Schreibt V1: In Test-Setups ja.
- UI-Abhängigkeit: Ja.
- Save-Abhängigkeit: Ja.
- Test-Abhängigkeit: N/A (selbst Testbasis).
- Kategorie: `E` Test-/Dev-Abhängigkeit.
- Risiko: Mittel bis hoch bei Rückbau ohne Testmigration.
- Empfehlung: Vor V1-Rückbau zuerst Testmigration planen (parallel zur Runtime-Entkopplung).

### 8) `dev/` – Legacy-Kompatibilitäts- und Audit-Scripts

- Zweck: Diagnose/Smokes, inkl. Legacy-Fallback-Checks.
- Liest V1: Ja.
- Schreibt V1: Teilweise in kontrollierten Smokes.
- UI-Abhängigkeit: Teilweise.
- Save-Abhängigkeit: Teilweise.
- Test-Abhängigkeit: Ja (Release-/Health-Reports).
- Kategorie: `E` Test-/Dev-Abhängigkeit.
- Risiko: Mittel.
- Empfehlung: Behalten; später stufenweise auf V2-only Varianten spiegeln.

## Kategorisierte Zusammenfassung

### A: sicherer Legacy-Read

- `storage.js` Migration/Normalize/Sync
- `EventSystemRuntimeBridge.js` Guard-/Fallback-Entscheidungen

### B: UI-Fallback

- `ui.js` Legacy Event-Sheet-Fallback bei fehlendem V2-OpenEvent
- `app.js` Legacy/Modern Root-Wiring

### C: produktiver V1-Write

- `events.js` (zentral)
- `app.js` (Event-State-Flüsse)
- `sim.js` (Scheduler-/Timer-Felder)
- Teile von `ui.js` (Legacy-Resolve-Fallback)

### D: Save-/Restore-Abhängigkeit

- `storage.js` (hoch)
- `sim.js`/`events.js` indirekt durch persistierte Felder

### E: Test-/Dev-Abhängigkeit

- große Teile von `test/` und `dev/` mit V1-Schemaannahmen

### F: Löschkandidat

- Aktuell keine klar sicheren produktiven Löschkandidaten ohne Vorarbeit identifiziert.

## Vorläufige Rückbauempfehlung (nur Planung)

1. V1-Reads für alte Saves beibehalten.
2. Produktive V1-Writes schrittweise über Bridge-gesteuerte No-Write-Gates minimieren.
3. UI-Fallback erst entfernen, wenn V2-Pfad alle relevanten Event-Sheet-Zustände abdeckt.
4. Testsuite von V1-Schemaabhängigkeiten auf V2-kompatible Assertions migrieren.
5. Erst danach Save-Migration mit klarer Versionierung planen.
6. V1-Dateien erst ganz am Ende löschen (separate Freigabephase).

