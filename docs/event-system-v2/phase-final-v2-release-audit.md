# Eventsystem V2 - Final Release Audit

## Scope

Dieses Audit bewertet Eventsystem V2 als Release-Candidate-Abschlussphase. Ziel ist Stabilisierung und klare Abgrenzung, nicht ein neuer Feature-Ausbau.

## Aktueller Stand

Eventsystem V2 ist aktuell **dev-only / preview-only / no-write**. Der reale Gameplay-Cutover ist nicht erfolgt.

Der aktive Stand aus Phase 169 lautet:

- `resolve_preview_no_write_ready_with_watch`
- kein RuntimeWrite
- keine Save-Writes
- kein echter Apply/Resolve
- keine Event-V1-Ersetzung
- kein produktiver Blind-Cutover

Der aktive Katalog enthält:

- 22 Event-Dateien
- 2 Chain-Dateien
- 9 Learning-Card-Dateien

Die vorhandenen V2-Module decken bereits Katalog, Preview, Shadow-Auswertung, Event-Center-Preview-Bridge, Resolve-Preview und Dev-Smokes ab. Der Kern ist aber bewusst noch nicht als produktiver Runtime-Event-Writer aktiviert.

## Bereits fertige Komponenten

- V2-Katalogstruktur unter `data/events/catalog/`
- JSON-Schema-Dateien unter `data/events/catalog/_schema/`
- aktive Event-, Chain- und Learning-Card-Dateien
- AssetRef-/Cover-Pfade fuer aktive Katalogevents
- Preview-Dataset und Preview-Gallery
- Event-Center-Preview-Bridge fuer V2-Candidates
- Shadow Runtime Evaluator mit No-Write-Garantien
- Snapshot-basierte Shadow-Scoring-Hilfen
- Dev-Test Candidate Feed
- Single-Candidate Detail Preview
- Resolve Preview Model
- Resolve Preview UI Model
- Resolve Preview Interaction Controller
- Event-spezifische Feedback-Copy fuer Preview
- Dev-Smokes fuer Preview, Candidate Flow, Multi-Candidate Flow und Resolve Preview
- Feature-Flag-Modell mit `eventV2RuntimeWriteEnabled: false` und `eventV2ProductionEnabled: false`

## Halbfertige Komponenten

- echter Resolve Apply/Write-Pfad
- Persistenz offener V2-Events im produktiven Savegame
- produktive Queue fuer offene V2-Events
- Dedupe-/History-Regeln fuer geloeste V2-Events
- kontrollierter V1/V2-Write-Uebergang
- vollstaendige produktive Event-Center-Einbindung
- produktionsreife Resolve-Feedback-Ausleitung nach echter Aktion
- flaechenweite event-spezifische Feedback-Abdeckung
- abschliessender Save/Load-Smoke fuer V2-Write-Felder

## Blockierende Restpunkte

Diese Punkte blockieren einen produktiven V2-Cutover:

- V2 erzeugt aktuell keine echten offenen Events im Runtime-State.
- V2 speichert aktuell keine offenen Events in Saves.
- Resolve ist aktuell Preview-only und setzt keine echten Effekte um.
- V2 hat noch keinen finalen Save-Migrationsvertrag fuer fehlende oder alte Felder.
- V1/V2-Parallelbetrieb ist vor Write-Aktivierung weiterhin kritisch.
- Existing Documentation markiert Phase 169 explizit als nicht write-ready.

## Nicht-blockierende Restpunkte

Diese Punkte duerfen in eine spaetere Mini-Phase:

- perfektes Balancing aller Scores
- feinere botanische Gewichtung
- finaler Text-Polish fuer `plannedEffectsPreview`
- vollstaendige Premium-Lernkarten-Tiefe
- finale Asset-Abdeckung ueber den aktuellen stabilen Satz hinaus
- neue Eventarten oder neue Folgeketten
- Monetarisierungs-, Push- oder Retention-Hooks

## Risiken fuer Runtime

- Ein direkter Write-Cutover wuerde V2 in eine Runtime fuehren, die bisher auf No-Write-Smokes optimiert ist.
- Eventdichte, Cooldowns und Wiederholschutz sind im produktiven V2-Pfad noch nicht final gegen echte Spieltage abgesichert.
- Shadow-Scoring ist deterministisch genug fuer Preview/Dev, aber nicht als finale Gameplay-Autoritaet freigegeben.
- App-nahe Entry Points existieren, duerfen aber nicht als produktive Aktivierung missverstanden werden.

## Risiken fuer Savegames

- Neue V2-State-Felder ohne defensive Initialisierung koennten alte Saves brechen.
- Offene V2-Events brauchen eine stabile, versionierte Save-Form.
- Geloeste V2-Events brauchen History/Dedupe-Regeln, bevor Write aktiviert wird.
- Ungueltige oder entfernte Katalogeintraege muessen beim Laden fallbackfaehig sein.

## Risiken fuer UI / Event Center

- Die Event-Center-Anbindung ist aktuell Preview-/Dev-Test-orientiert.
- Fehlende produktive Resolve-Aktion darf nicht als klickbarer echter Abschluss erscheinen.
- Fallbacks fuer Titel, Beschreibung, Kategorie, Severity, Assets und Feedback sind vorhanden bzw. teilweise vorhanden, muessen aber im Abschluss-Smoke nochmals geprueft werden.
- Mobile Stabilitaet wurde in Preview-Smokes geprueft, aber ein produktiver Event-Center-Cutover bleibt ausserhalb dieser Abschlussphase riskant.

## Risiken durch altes Eventsystem / V1-Kompatibilitaet

- V1 ist weiterhin die produktive Event-Autoritaet.
- V2 darf V1 nicht ersetzen, solange Write, Save, Dedupe und Resolve nicht final implementiert und getestet sind.
- Beide Systeme duerfen nicht gleichzeitig echte Events schreiben.
- V2 sollte fuer diese Abschlussphase als kontrolliertes dev-only/no-write System dokumentiert bleiben, sofern kein kleiner, sicherer Write-Adapter bereits beweisbar vorhanden ist.

## Konkrete Abschlussstrategie

1. Katalog validieren und nur kleine eindeutige Datenfehler korrigieren.
2. Bestehende V2-Engine/Preview-Smokes ausfuehren und den Status anhand realer Ergebnisse festhalten.
3. Keine produktive Write-Aktivierung erzwingen, wenn Save/Resolve noch nicht abgesichert sind.
4. Feature-Flags und Dev-only-Grenzen dokumentieren und gegen versehentliche Aktivierung schuetzen.
5. Falls produktive Write-Faehigkeit fehlt, Status auf **dev-only mit konkretem Restblocker** setzen.
6. Abschlussbericht mit klarer Grenze schreiben: fertig fuer Dev-/Preview-/No-Write, nicht fertig fuer produktiven Cutover.

## Audit-Entscheidung

Der sichere Release-Candidate-Abschluss fuer diese Phase ist:

**Eventsystem V2 bleibt dev-only/no-write und wird als stabiler Preview-/Shadow-Kern abgeschlossen.**

Ein produktiver Cutover ist erst nach einer separaten Mini-Phase fuer Resolve Apply, Save/Load und V1/V2-Write-Gating verantwortbar.
