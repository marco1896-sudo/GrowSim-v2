# 62 - Codex Phase 38 Minimal app.js No-Op Hook Proposal

## 1. Entscheidung
`app.js` wurde in Phase 38 nicht geaendert.

Grund:
- `app.js` hat bereits unrelatierte Worktree-Aenderungen.
- Der erste Hook waere Tick-nah.
- Die App nutzt im Browser keine klare Modul-Import-Struktur fuer diesen Pfad.
- Ein echter Hook ist nicht absolut noetig, um Phase 38 sinnvoll abzuschliessen.

Phase 38 liefert deshalb den exakten minimalen Patch-Vorschlag, aber setzt ihn noch nicht um.

## 2. Preflight vor der Entscheidung
Ausgefuehrt:

```bash
node dev/run-event-v2-shadow-bridge-combined-report.js
node dev/run-event-v2-guarded-entry-contract-tests.js
```

Ergebnis Combined Report:
- `ok=true`
- `safeToProceed=true`
- `combinedStatus=pass`
- `blocker=0`
- `error=0`
- `warning=0`

Ergebnis Contract Tests:
- `contractTests.total=8`
- `contractTests.passed=8`
- `contractTests.failed=0`
- `readiness.ok=true`

## 3. Exakter Hook-Ort
Zielbereich in `app.js`:

```js
function runEventStateMachine(nowMs) {
  const eventEngine = window.GrowSimEventEngine;
  if (eventEngine && typeof eventEngine.routeTick === 'function') {
    return eventEngine.routeTick(nowMs, state).result;
  }
  return callCanonicalEventsRuntime('runEventStateMachine', nowMs);
}
```

Aktuelle Position:
- direkt bei `runEventStateMachine(nowMs)`.
- in der Naehe von Zeile `6732` im aktuellen Arbeitsstand.

## 4. Minimaler Patch-Vorschlag
Der sicherste erste No-Op-Hook waere ein optionaler globaler Lookup statt eines Imports:

```diff
 function runEventStateMachine(nowMs) {
+  runEventV2ShadowBridgeNoopPreflight();
   const eventEngine = window.GrowSimEventEngine;
   if (eventEngine && typeof eventEngine.routeTick === 'function') {
     return eventEngine.routeTick(nowMs, state).result;
   }
   return callCanonicalEventsRuntime('runEventStateMachine', nowMs);
 }
+
+function runEventV2ShadowBridgeNoopPreflight() {
+  const bridge = window.ShadowBridgeGuardedEntry;
+  if (!bridge || typeof bridge.runShadowBridgeGuardedEntry !== 'function') {
+    return null;
+  }
+  try {
+    return bridge.runShadowBridgeGuardedEntry(null, { enabled: false });
+  } catch (error) {
+    return null;
+  }
+}
```

## 5. Welcher Import waere noetig?
Empfehlung fuer den ersten Hook:
- kein direkter Import in `app.js`.
- nur optionaler globaler Lookup auf `window.ShadowBridgeGuardedEntry`.

Warum:
- `app.js` laeuft als Browser-Runtime-Script.
- Ein `require(...)` oder ESM-Import waere in diesem Kontext riskanter.
- Ein globaler Lookup bleibt default-off, wenn das V2-Bridge-Script nicht geladen ist.
- Kein tiefer UI-Lab-/QA-Import wird benoetigt.

Hinweis:
- Das Laden von `ShadowBridgeGuardedEntry.js` in die App waere eine eigene spaetere Phase.
- Phase 38 schlaegt nur die Call-Seam vor.

## 6. Welche Funktion wuerde aufgerufen?
Vorgeschlagen:

```js
window.ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: false });
```

Eigenschaften:
- `input=null`
- `enabled=false`
- kein Snapshot.
- keine State-Daten.
- keine Save-Daten.
- keine UI-Daten.
- Return-Wert wird nicht fuer Spielsteuerung genutzt.

## 7. Warum Legacy authoritative bleibt
Der vorgeschlagene Call:
- laeuft vor der bestehenden Legacy-Route.
- veraendert keine Variablen.
- gibt kein Ergebnis in die Eventsteuerung zurueck.
- blockiert den bestehenden `routeTick`-/Canonical-Runtime-Pfad nicht.
- ist in `try/catch` gekapselt.

Legacy laeuft immer weiter:
- `eventEngine.routeTick(nowMs, state).result`
- oder `callCanonicalEventsRuntime('runEventStateMachine', nowMs)`

## 8. Warum default-off/no-op
Der Call nutzt:

```js
{ enabled: false }
```

Dadurch liefert der Guarded Entry nur:
- `mode=guarded_read_only_noop`
- `snapshot=null`
- `noop=true`
- Schutzflags bleiben false.

## 9. Warum keine State-Mutation entsteht
Der Vorschlag uebergibt:
- kein `state`.
- kein `nowMs`.
- keine Runtime-Referenz.
- keine Callback-Funktion.

Der Return-Wert wird ignoriert.

## 10. Warum keine Snapshot-Erzeugung entsteht
Snapshot-Erzeugung setzt voraus:

```js
{ enabled: true, allowSnapshot: true }
```

Der Vorschlag nutzt explizit:

```js
{ enabled: false }
```

Damit bleibt `snapshot=null`.

## 11. Rollback
Rollback ist trivial:
- die eine Zeile `runEventV2ShadowBridgeNoopPreflight();` entfernen.
- die kleine Helper-Funktion `runEventV2ShadowBridgeNoopPreflight` entfernen.

Kein Save-Rollback noetig.
Kein UI-Rollback noetig.
Kein Daten-Rollback noetig.

## 12. Warum nicht in Phase 38 implementiert
Nicht implementiert, weil:
- die Aufgabe erlaubt ausdruecklich, bei Zweifel nur zu dokumentieren.
- `app.js` ist bereits dirty durch unrelatierte Aenderungen.
- der Hook waere Tick-nah.
- das Script-Laden von `ShadowBridgeGuardedEntry.js` in der App ist noch nicht final entschieden.
- kein unmittelbarer Produktwert entsteht, solange der Entry default-off bleibt.

## 13. Empfehlung fuer Phase 39
`Phase 39: Minimal app.js No-Op Hook Implementation Review`

Empfohlen:
- vorab erneut Combined Report und Contract Tests ausfuehren.
- dann entscheiden, ob der dokumentierte Patch exakt so umgesetzt wird.
- falls Umsetzung: nur optionaler globaler Lookup, kein Import, kein State, kein Snapshot.
