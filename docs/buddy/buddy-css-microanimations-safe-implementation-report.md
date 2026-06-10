# Buddy CSS Microanimations Safe Implementation Report

## Zusammenfassung

- Bestehende Buddy-PNGs bekommen jetzt optionale, subtile CSS-Microanimations.
- Die Umsetzung bleibt rein visuell: keine Aenderung an Save, Eventsystem, Simulation, Coin-, Mission- oder Reward-Logik.
- Die Motion-Klassen haengen nur an bereits integrierten Buddy-Bildern.

## Dateien gelesen

- `docs/buddy/buddy-animation-controller-readiness-report.md`
- `src/ui/buddy/buddyVisualMap.js`
- `src/ui/buddy/buddyAssetResolver.js`
- `app.js`
- `styles.css`

## Dateien geaendert / erstellt

- Geaendert: `src/ui/buddy/buddyVisualMap.js`
- Geaendert: `app.js`
- Geaendert: `styles.css`
- Erstellt: `docs/buddy/buddy-css-microanimations-safe-implementation-report.md`

## Motion-Klassen

- `buddy-motion-idle-breathing`
- `buddy-motion-happy-bounce`
- `buddy-motion-warning-pulse`
- `buddy-motion-reward-pop`

## UI-Stellen mit Motion-Klassen

- Home-/Daily-Teaser Buddy
- Missions-Sheet Buddy-Hinweis
- Weekly-Mission Buddy
- Coin-Action Buddy im Missions-Sheet
- Care Studio Buddy

## Mapping-Regeln

- Warning / Risk / Stress / unsafe:
  - `buddy-motion-warning-pulse`
- Claimable / reward_focus / reward_claimable / coin_action_reward / starter:
  - `buddy-motion-reward-pop`
- Stable / positive / ready / mission completed / reward claimed / timeboost:
  - `buddy-motion-happy-bounce`
- Default / progress / neutral UI-Kontexte:
  - `buddy-motion-idle-breathing`
- Wenn Kontext unerwartet oder Mapping nicht verfuegbar:
  - keine neue Logik
  - leeres Ergebnis oder defensive Idle-Zuordnung

## Fallback-Verhalten

- Bildpfade und Asset-Resolver bleiben unveraendert
- Wenn keine Motion-Klasse gefunden wird, bleibt das Bild statisch
- Wenn der Visual-Map-Helfer nicht verfuegbar ist, wird keine Motion-Klasse gesetzt
- Bestehende Bild-Fallbacks auf das Basis-Buddy-Bild bleiben unveraendert

## prefers-reduced-motion

- Alle vier Motion-Klassen werden bei `prefers-reduced-motion: reduce` deaktiviert
- Keine alternative heftige Ersatzanimation

## Bewusst nicht umgesetzt

- Keine Frame-Sequenzen
- Kein Sprite-Sheet
- Kein Canvas
- Keine neuen Assets
- Keine Service-Worker-/Offline-Cache-Aenderung
- Kein Animation-Controller als neue Runtime-Schicht
- Keine Einmal-Trigger-Logik fuer Reward-Pop

## Tests

- `node --check app.js`
- `node --check src/ui/buddy/buddyVisualMap.js`
- `node --check src/ui/buddy/buddyAssetResolver.js`
- `node test/ui-runtime-wiring.test.js`
- `node test/home-core-stats-popup-regression.test.js`
- `node test/weekly-missions.test.js`
- `node test/daily-tasks-ui-state.test.js`

## Risiken / manuelle Pruefungen

- Reward-Pop ist absichtlich sehr dezent als Loop geloest, nicht als einmaliger Trigger
- Mobile-Visuell pruefen, ob Care Studio und Coin-Action Buddy nicht zu lebhaft wirken
- Sehr kleine Buddy-Frames koennen je nach Asset unterschiedliche Bewegungswirkung haben

## Naechste Empfehlung

- Browser-/Mobile-Visual-QA fuer alle Buddy-Surfaces
- danach optional Offline Asset Cache Readiness nur als Analyse
- echte Frame-Animationen erst spaeter mit bewusst erzeugten Frame-Serien
