# 66 - Codex Phase 40 Script Loading Strategy

## 1. Gelesene Dateien
- `docs/event-system-v2/64_codex-phase-39-app-noop-hook-implementation-review.md`
- `docs/event-system-v2/65_codex-phase-39-result.md`
- `docs/event-system-v2/62_codex-phase-38-minimal-app-noop-hook-proposal.md`
- `docs/event-system-v2/55_codex-phase-35-runtime-hook-design-review.md`
- `docs/event-system-v2/47_codex-phase-29-shadow-bridge-guardrails.md`
- `index.html`
- `app.js` read-only ueber Suchkontext
- `sw.js`
- `manifest.webmanifest`
- `package.json`
- `.codex/PWA_SERVICE_WORKER_RULES.md`
- `.codex/ARCHITECTURE_MAP.md`

## 2. Aktuelle Script-/Global-Struktur
Die App nutzt eine klassische Browser-Script-Struktur.

In `index.html` gibt es:
- Build-Meta ueber `window.GrowSimBuild`.
- versionierte Head-Links.
- einen eigenen Loader `loadVersionedScripts()`.
- eine `coreScriptList`, die lokale Scripts mit `?v=<buildId>` laedt.
- `app.js` steht am Ende der Core-Script-Liste.

Relevanter Ausschnitt:
- `src/events/eventEngine.js` wird vor `events.js`, `ui.js` und `app.js` geladen.
- `app.js` nutzt viele globale Namespaces, z. B. `window.GrowSimEventEngine`, `window.GrowSimEvents`, `window.GrowSimStorage`, `window.GrowSimI18n`.

Die V2-Shadow-Bridge ist aktuell nicht in `index.html` eingetragen.

## 3. Service-Worker-/PWA-Status
`sw.js`:
- precached nur `index.html`, `manifest.webmanifest` und Icons.
- nutzt Runtime-Cache fuer weitere GET-Requests.
- Core JSON wird network-first behandelt.
- JS/CSS/HTML ohne Version-Query werden beim Aktivieren bereinigt.

Folge:
- Ein neuer Script-Eintrag in `index.html` waere PWA-relevant, weil `index.html` als Shell aktualisiert werden muss.
- Der Scriptpfad wuerde durch `?v=<buildId>` versioniert geladen.
- Eine Service-Worker-Aenderung ist fuer die Strategie nicht noetig und in Phase 40 verboten.

## 4. Build-/Vite-Status
Es wurde keine Vite-Konfiguration gefunden.

`package.json` nutzt Node-Scripts fuer Dev, Tests, Syntaxchecks und Audits.

Folge:
- Eine Bundle-/Import-Loesung passt aktuell nicht zur bestehenden Browser-Script-Struktur.
- Ein direkter `require` oder ESM-Import in `app.js` ist nicht empfohlen.

## 5. Loading-Optionen

### Option A: Kein Laden, Hook bleibt immer no-op
Risiko: sehr niedrig.
Reversibilitaet: sehr hoch.
PWA-/Cache-Auswirkung: keine.
Runtime-Risiko: keine.
Debugbarkeit: niedrig, weil kein Browser-Global existiert.
Kompatibilitaet mit Phase-38-Hook: technisch kompatibel, aber der Lookup bleibt immer leer.
Empfehlung: Ja fuer aktuellen Stand, aber nicht als finaler Integrationsschritt.

### Option B: Separates Script in `index.html` vor `app.js`
Risiko: mittel.
Reversibilitaet: mittel.
PWA-/Cache-Auswirkung: ja, weil `index.html`/Shell aktualisiert werden muss.
Runtime-Risiko: niedrig bis mittel, wenn Script nur Global registriert und default-off bleibt.
Debugbarkeit: gut.
Kompatibilitaet mit Phase-38-Hook: hoch.
Empfehlung: Spaeter moeglich, aber nicht vor einem isolierten Browser-Exposure-Stub.

### Option C: Separates Script in `index.html` nach `app.js`
Risiko: mittel.
Reversibilitaet: mittel.
PWA-/Cache-Auswirkung: ja.
Runtime-Risiko: niedrig, aber Phase-38-Hook wuerde beim App-Start den Global noch nicht sehen.
Debugbarkeit: mittel.
Kompatibilitaet mit Phase-38-Hook: schwach.
Empfehlung: Nein fuer den geplanten Hook.

### Option D: Dynamische Registrierung ueber bestehenden V2-Dev-Harness
Risiko: niedrig fuer Dev, hoch fuer Runtime-Konzept.
Reversibilitaet: hoch.
PWA-/Cache-Auswirkung: keine, solange Dev-only.
Runtime-Risiko: keine, solange nicht produktiv geladen.
Debugbarkeit: gut in Dev.
Kompatibilitaet mit Phase-38-Hook: nicht ausreichend fuer echte App.
Empfehlung: Nur fuer Dev-Smoke, nicht fuer produktive Bridge.

### Option E: Bundle-/Import-Loesung
Risiko: hoch.
Reversibilitaet: mittel.
PWA-/Cache-Auswirkung: wahrscheinlich ja.
Runtime-Risiko: mittel.
Debugbarkeit: mittel.
Kompatibilitaet mit Phase-38-Hook: konzeptionell moeglich, aber nicht passend zur aktuellen Struktur.
Empfehlung: Nein fuer die naechsten Phasen.

### Option F: Globaler Namespace-Stub im isolierten V2-Bereich
Risiko: niedrig, solange nicht geladen.
Reversibilitaet: hoch.
PWA-/Cache-Auswirkung: keine, solange nicht in `index.html`.
Runtime-Risiko: keine, solange nicht geladen.
Debugbarkeit: gut.
Kompatibilitaet mit Phase-38-Hook: hoch, sobald spaeter bewusst geladen.
Empfehlung: Ja, als naechster Schritt.

## 6. Empfohlene Strategie
Empfohlen:
1. Noch kein Script in `index.html`.
2. Noch kein `app.js`-Hook.
3. Noch keine Service-Worker-/PWA-Aenderung.
4. In Phase 41 einen isolierten Browser Exposure Stub planen oder anlegen.
5. Dieser Stub duerfte spaeter theoretisch `window.ShadowBridgeGuardedEntry` setzen.
6. Default bleibt `enabled=false`.
7. Keine Feature-Flags.
8. Keine Eventaktivierung.
9. Keine UI.
10. Kein Save.

Warum:
- Das trennt Global-Registration von Runtime-Hook.
- Der Stub kann isoliert getestet werden.
- PWA-/Cache-Risiko wird nicht vorzeitig eingefuehrt.
- Der Phase-38-Hook-Vorschlag bleibt kompatibel.

## 7. Warum kein `app.js`-Hook gesetzt wurde
- Phase 40 ist nur Script-Loading-Strategie.
- `app.js` ist Tick-nah.
- `app.js` hat bereits unrelatierte Worktree-Aenderungen.
- Ohne geklaertes Script Loading waere der Hook nur ein leerer Lookup.

## 8. Warum noch kein Script geladen wurde
- Ein Script-Eintrag in `index.html` waere eine produktive Ladepfad-Aenderung.
- Das betrifft PWA/Shell-Update-Verhalten.
- Es gibt noch keinen dedizierten Browser-Exposure-Stub.
- Das Guarded Entry selbst ist aktuell ein UMD-artiges Modul, aber das Laden seiner Abhaengigkeiten im Browser muss separat geplant werden.

## 9. PWA-/Cache-Risiken
- Neue Script-Eintraege in `index.html` koennen bei bestehenden installierten PWAs durch Shell-Cache/Build-Versionierung relevant werden.
- Fehlender Scriptpfad koennte Boot-Error-Banner ausloesen.
- Reihenfolgefehler koennten `window.ShadowBridgeGuardedEntry` leer lassen.
- Service Worker darf fuer diesen Schritt nicht angepasst werden.

## 10. Rollback-Plan
Aktuell:
- Kein Rollback noetig, weil kein Script geladen wurde.

Wenn spaeter Script geladen wird:
- einzelne Script-Zeile in `index.html` entfernen.
- Build-ID/Shell aktualisieren.
- Combined Report und Contract Tests erneut ausfuehren.
- PWA Reload/Update manuell pruefen.

## 11. Go/No-Go fuer Phase 41
Go:
- `Guarded Entry Browser Exposure Stub`
- nur isolierter Stub.
- kein `index.html`.
- kein `app.js`.
- kein Service Worker.
- kein Save.
- keine UI.
- keine Eventaktivierung.

No-Go:
- kein produktives Script Loading.
- kein Hook.
- keine Feature-Flags.

## 12. Empfehlung fuer Phase 41
`Phase 41: Guarded Entry Browser Exposure Stub`

Empfohlen:
- isolierte Datei unter `src/events/v2/shadow-bridge/`.
- theoretische `window.ShadowBridgeGuardedEntry`-Registrierung vorbereiten.
- noch nicht automatisch laden.
- Contract Tests fuer Default-off/no-op Exposure ergaenzen.
