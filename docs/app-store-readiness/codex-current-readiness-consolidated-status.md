# Grow Simulator - Current Readiness Consolidated Status

## 1. Kurzfazit

Der aktuelle Gesamtstatus ist **technisch weitgehend go**, mit einem klaren Vorbehalt bei der juristischen Endfreigabe und den letzten echten Store-Formalia. Die produktseitigen Blocker aus den fruehen Readiness-Phasen sind geschlossen: Gastmodus ist Standard, lokaler Start ohne Session funktioniert, lokale Saves bleiben erhalten, Logout fuehrt zurueck in den lokalen Gastmodus, Public-Texte sind bereinigt, Event-/Analyse- und Care-Studio-Flows sind ruhiger und die mobile Settings-Ansicht ist stabilisiert.

Ein **kontrollierter Preview-Deploy** ist damit aus heutiger Sicht **ja** sinnvoll, sofern er klar als Preview kommuniziert wird und die offene juristische Endpruefung nicht umgangen wird. Eine **breite oeffentliche Bewerbung** ist noch **nein**. Ein **echter App-Store-Release** ist ebenfalls noch **nicht final freigabereif**, weil die letzten rechtlichen und storeseitigen Endschritte noch manuell abgesichert werden muessen.

## 2. Geschlossene Blocker

- Der blockierende Startup-Login-/Cloud-Gate-Flow ist durch den Gastmodus als Standardstart geschlossen.
- Der lokale Start ohne Session ist freigeschaltet und laeuft ohne Pflicht-Login an.
- Lokaler Save und Reload sind stabil und bleiben im Gastmodus erhalten.
- Logout fuehrt wieder in den lokalen Gastmodus statt in ein Startup-Gate.
- Alte Saves mit `authGateActive` wurden neutralisiert und blockieren den Reload nicht mehr.
- Cloud Sync, Login, Push und Leaderboard sind sprachlich als optional eingeordnet.
- Privacy-, About- und Store-Texte wurden von MVP-/Dev-/Legacy-Sprache bereinigt.
- Public-Text-Readiness ist abgesichert.
- Event Center und Analyse sind spielerischer und coachiger formuliert.
- Der Buddy-Kurzcheck im Analyse-Sheet ist visuell verdichtet und lesbarer.
- Der erste Run ist ruhiger gefuehrt und zeigt schneller die naechste sinnvolle Aktion.
- Care Studio ist fuer den Erstbesuch klarer, ruhiger und stabiler.
- Die stabile Care-Empfehlung erklaert jetzt besser, warum Warten reichen kann.
- Die mobilen Settings-Layouts sind auf schmale Breiten verbessert.
- Der blockierende `mission-reward`-Dialog nach Guest-Reload ist im Restore-Fall entschaerft.

## 3. Aktuelle GO-Bereiche

- **Gastmodus / Startup / Reload**: go. Der App-Start ohne Session ist technisch und produkthaft entblockt.
- **Lokaler Save / Logout / Gast-Rueckfall**: go. Der lokale Spielstand bleibt die Basis, Logout bricht ihn nicht mehr.
- **Menu / Settings / Cloud-Kommunikation**: go. Cloud und Login werden als optional beschrieben, nicht als Pflicht.
- **Public Texts / Privacy / Store Copy**: go im produktsprachlichen Sinn. Sichtbare Texte widersprechen dem Gastmodus nicht mehr.
- **Event Center + Analyse UX**: go. Der Bereich wirkt weniger technisch und besser coachbar.
- **Buddy Brief / Analyse-Hierarchie**: go. Die Kurzuebersicht ist klarer und scanbarer.
- **First-Run Core Loop**: go. Der erste echte Run fuehlt sich gefuehrter und weniger ueberladen an.
- **Care Studio First Visit + Stable Advice**: go. Erstbesuch und stabile Empfehlungen sind nutzerfreundlicher.
- **Mobile Visual Premium QA fuer Settings**: go. Der Settings-Block ist auf schmalen Viewports deutlich stabiler.
- **Mission-Reward-Restore-Fix**: go. Der Guest-Reload-Fall ist wieder gruen.
- **Technische Release-Gates**: go. Die zuletzt genannten Gates liefen gruen.

## 4. Aktuelle CAUTION-Bereiche

- **Juristische Endfreigabe**: offen. Die sichtbaren Texte wirken konsistent, ersetzen aber keine externe oder formale Rechtspruefung.
- **App-Store-Formulare / Privacy-Claims**: offen. Die Store-Angaben muessen noch manuell gegen die tatsaechlich erhobenen Daten und Fluesse gespiegelt werden.
- **DE-only-Rechtstexte**: vorsichtig. Es muss geklaert sein, ob das fuer die Zielmaerkte ausreicht oder noch lokalisierte Rechtstexte noetig sind.
- **Echte Geraete-QA**: offen. Browser-/Playwright-Smokes sind gut, ersetzen aber keine kurze echte Mobilgeraete-Pruefung.
- **Wrapper-/Installationskontext**: vorsichtig, falls fuer den Releaseweg relevant. PWA- und Shell-Artefakte sind gruen, aber eine reale Install-/Update-Probe ist vor Finalrelease sinnvoll.
- **Server-/Account-Datenbeschreibung**: offen. Die datenschutzrechtliche Detaillierung von Account-, Cloud-, Leaderboard- und Push-Daten sollte final abgesichert werden.

## 5. Aktuelle NO-GO-Bereiche

Fuer den aktuellen technischen Produktstand gibt es **keinen verbleibenden harten No-go-Blocker** mehr, der den kontrollierten Preview-Deploy stoppen wuerde.

Als praktische Grenze gilt aber weiterhin: **ohne juristische Endfreigabe, Store-Metadaten-Abgleich und echte Geraete-QA kein finaler App-Store-Release**. Das ist aktuell eher ein Caution- als ein technischer No-go-Status.

## 6. Test-/Gate-Stand

Zuletzt gruen waren insbesondere:

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/public-text-readiness.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `node test/menu-ui-presentation.test.js`
- `node test/push-ui-presentation.test.js`
- `node test/gameover-flow-runtime.test.js`
- `node test/stability-top5-regression.test.js`
- `node test/care-studio-runtime.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-visibility-health-report.js`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`
- `node test/encoding-utf8-regression.test.js`

Die letzten Berichte nennen fuer die relevanten Event-V2- und Release-Gates jeweils `ok: true` und/oder `gate: go`. Der Follow-up-Fix fuer den Guest-Reload-Missionsdialog hat den zuvor roten Guest-Mode-Flow wieder auf `go` gehoben.

## 7. Manuelle Checks vor Preview-Deploy

- Frischer Gaststart ohne Session im normalen Browser einmal durchklicken.
- Lokalen Run starten, speichern und per Reload bestaetigen.
- Logout pruefen und verifizieren, dass der lokale Run sichtbar bleibt.
- Settings oeffnen und auf schmalem Viewport auf Ueberschneidungen achten.
- Privacy- und About-Flaechen kurz oeffnen und auf Pflicht-Login-Sprache pruefen.
- Einmal Event Center, Analyse und Care Studio aus einem echten Run heraus ansehen.
- Kurz gegenpruefen, ob EN/DE/ES in den sichtbaren Hauptflaechen keine harten Sprachreste zeigen.

## 8. Manuelle Checks vor App-Store-Release

- Echte Mobilgeraete pruefen, mindestens ein iPhone- und ein Android-Referenzgeraet.
- PWA-Installationsweg und Update-/Reload-Verhalten auf realen Geraeten pruefen.
- Offline- bzw. eingeschraenktes Netzverhalten kurz gegenpruefen, falls PWA-Auslieferung relevant ist.
- Store-Metadaten, Screenshots und Kurzbeschreibungen gegen die tatsachliche In-App-Kommunikation spiegeln.
- Datenschutzangaben und Account-/Cloud-/Push-Claims final manuell oder extern absichern.
- Alters-/Inhaltsklassifizierung und Support-/Datenschutzkontakt final gegenpruefen.
- Falls ein Wrapper oder nativer Releasekanal genutzt wird, dessen Update- und Startweg separat testen.

## 9. Empfohlene naechste Entwicklungsphasen

1. **Juristische Endfreigabe und Store-Metadaten-Pass**
   - Klein, risikoarm und hoch priorisiert.
   - Fokus auf Datenschutz, Impressum, Privacy-Formulare, Support-Links und Store-Texte.

2. **Echte Geraete-QA fuer Preview**
   - Ein kurzer Pass auf echten Mobilgeraeten, ohne neue Features anzufassen.
   - Fokus auf Start, Reload, Logout, Settings und die Hauptfluesse.

3. **Release-Kommunikation und Screenshot-Paket**
   - Screenshots, Kurzbeschreibung und Preview-Kommunikation auf den bereits erreichbaren Produktstand abstimmen.
   - Kann auch fuer Community-Feedback oder eine kleine geschlossene Testgruppe genutzt werden.

4. **Sehr kleine Premium-Polish-Folgen nur bei klarem Nutzen**
   - Falls noch etwas angefasst wird, dann nur winzige, risikoarme Lesbarkeits- oder Tonalitaetsverbesserungen.
   - Keine neuen grossen Systeme, keine Save-/Auth-/Event-Umbauten.

## 10. Nicht jetzt anfassen

- Auth-, Save- und Cloud-Architektur.
- Event-System-Logik oder Scheduler-/Resolve-Mechanik.
- Neue Features fuer Monetarisierung, Shop oder Rewards.
- Groessere Analyse-, Care- oder HUD-Refactors.
- Service-Worker- oder PWA-Architekturumbauten.
- Neue Gameplay-Systeme, solange die Release-Freigabe noch nicht final steht.

## 11. Finale Empfehlung

- **Kontrollierter Preview-Deploy:** ja
- **Breite oeffentliche Bewerbung:** nein
- **App-Store-Release:** noch nicht final
- **Naechster sinnvoller Schritt:** juristische Endfreigabe plus Store-/Geraete-Validierung, ohne am bestehenden Kernsystem weiter zu drehen

Der aktuelle Stand ist produktseitig deutlich reifer und technisch stabil genug fuer einen kontrollierten Preview-Kanal. Fuer einen echten Store-Release fehlen vor allem die finale rechtliche Absicherung und die letzten manuellen Endpruefungen.
