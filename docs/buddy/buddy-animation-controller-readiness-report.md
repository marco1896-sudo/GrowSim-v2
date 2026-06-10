# Buddy Animation Controller Readiness Report

## Zusammenfassung

- Der aktuelle Buddy-Bestand ist gut geeignet fuer spaetere CSS-Microanimations auf bestehenden PNGs.
- Der aktuelle Bestand ist nur eingeschraenkt fuer echte Frame-Animationen geeignet, weil keine verlaesslichen Frame-Serien vorhanden sind.
- Die sicherste spaetere Architektur ist ein optionaler Animation-Layer ueber dem bestehenden statischen Resolver, nicht ein Ersatz davon.

## Gelesene Dateien

- `src/ui/buddy/buddyVisualMap.js`
- `src/ui/buddy/buddyAssetResolver.js`
- `assets/buddy/transparent/buddy_asset_manifest.json`
- `docs/buddy/buddy-transparent-assets-sorting-report.md`

## Asset-Bestand

- Gesamtbestand laut Manifest: 55 Assets
- Kategorien:
  - `emotion`: 28
  - `gameplay`: 16
  - `reward`: 11
- Alle geprueften Kernassets liegen als `500x500` PNG mit Transparenz vor
- Der Sorting-Report bestaetigt: keine belastbaren Frame-Sequenzen vorhanden

## Geeignete Assets

- Idle / neutral:
  - `buddy_emotion_neutral_standing_v001`
  - `buddy_emotion_neutral_seated_idle_v001`
- Happy / positive:
  - `buddy_emotion_happy_big_smile_v001`
  - `buddy_emotion_happy_open_arms_v001`
  - `buddy_emotion_happy_raised_hands_v001`
  - `buddy_emotion_happy_cheering_fists_v001`
  - `buddy_emotion_proud_confident_stance_v001`
- Wave / hello:
  - `buddy_gameplay_wave_hello_v001`
  - `buddy_gameplay_clipboard_wave_v001`
- Thinking / analysis:
  - `buddy_emotion_confused_head_scratch_v001`
  - `buddy_emotion_worried_hand_to_chin_v001`
- Warning:
  - `buddy_emotion_surprised_hands_out_v001`
  - `buddy_emotion_surprised_palms_up_v001`
  - `buddy_emotion_worried_hand_to_chin_v001`
- Reward / coins:
  - `buddy_reward_coins_celebrating_v001`
  - `buddy_reward_coins_holding_v001`
  - `buddy_reward_celebrate_peace_sign_v001`

## Ungeeignete Assets

- Texttragende Assets nicht fuer normale UI-Animationen:
  - `buddy_reward_premium_offer_sign_v001`
  - `buddy_reward_shop_voucher_v001`
  - `buddy_reward_trophy_surprised_v001`
  - `buddy_gameplay_nutrients_bottle_v001`
- Stilistisch nur eingeschraenkt wiederverwendbar:
  - `buddy_reward_premium_cool_shades_v001`
- Keine gute Basis fuer Frame-Serien:
  - Einzelposen wie `buddy_emotion_happy_joyful_step_v001` ohne passende Nachbarframes

## Beste Start-Animationen

### 1. idle_breathing
- Zweck: ruhige Standardpraesenz in stabilen UI-Zustaenden
- UI-Stellen: Care Studio stabil, Home/Daily stable, neutrale Missionshinweise
- Vorhandene Assets: `buddy_emotion_neutral_standing_v001`, optional `buddy_emotion_happy_big_smile_v001`
- Benoetigte Frames: keine zwingend, CSS-Scale/Translate reicht
- Fehlende Assets: keine
- Risiko: low
- Empfehlung: sofort geeignet

### 2. thinking_idle
- Zweck: Analyse-, Unsicherheits- oder Beobachtungszustand
- UI-Stellen: Care Studio Diagnose, Coin-Tip mit Nachdenken, Monitoring-Kontexte
- Vorhandene Assets: `buddy_emotion_confused_head_scratch_v001`, `buddy_emotion_worried_hand_to_chin_v001`
- Benoetigte Frames: keine zwingend, leichte CSS-Rotation/Float reicht
- Fehlende Assets: keine
- Risiko: low
- Empfehlung: sofort geeignet

### 3. warning_stop
- Zweck: Risiko oder zu fruehe/riskante Aktion markieren
- UI-Stellen: Care Studio Warning, Coin-Action Warning, kritische Missionshinweise
- Vorhandene Assets: `buddy_emotion_surprised_hands_out_v001`, `buddy_emotion_worried_hand_to_chin_v001`
- Benoetigte Frames: keine zwingend, CSS-Pulse reicht
- Fehlende Assets: keine
- Risiko: low
- Empfehlung: sofort geeignet

### 4. happy_bounce
- Zweck: sanft positive Reaktion ohne Reward-Overkill
- UI-Stellen: Home stable_day, leichte positive Care-Kontexte
- Vorhandene Assets: `buddy_emotion_happy_big_smile_v001`, `buddy_emotion_proud_confident_stance_v001`
- Benoetigte Frames: keine zwingend, CSS-Translate/Scale reicht
- Fehlende Assets: keine
- Risiko: low
- Empfehlung: sofort geeignet

### 5. celebrate_reward
- Zweck: claimbar/claimed/reward-positive Momente
- UI-Stellen: Mission claimable, Reward claimed, Coin-Action Reward
- Vorhandene Assets: `buddy_reward_coins_celebrating_v001`, `buddy_emotion_happy_cheering_fists_v001`, `buddy_reward_celebrate_peace_sign_v001`
- Benoetigte Frames: fuer Phase 1 keine; fuer echte Celebrate-Sequenz spaeter 2-4 abgestimmte Frames
- Fehlende Assets: konsistente Celebrate-Frame-Serie
- Risiko: medium
- Empfehlung: Phase 1 nur als CSS-Microanimation, echte Sequenz erst nach neuen Frames

### 6. wave_hello
- Zweck: Begruessung, freundlicher Einstieg, leichte positive Aufmerksamkeit
- UI-Stellen: Home/Daily teaser, Buddy intro, seltene Header-Kontexte
- Vorhandene Assets: `buddy_gameplay_wave_hello_v001`, `buddy_gameplay_clipboard_wave_v001`
- Benoetigte Frames: fuer echte Welle mindestens 2-3 eng verwandte Frames
- Fehlende Assets: passende Wellenserie
- Risiko: medium
- Empfehlung: erst neue Frames generieren oder nur sehr dezente CSS-Microanimation auf Einzelpose

## Technische Empfehlung

- Spaetere Dateien:
  - `src/ui/buddy/buddyAnimationController.js`
  - `src/ui/buddy/buddyAnimationMap.js`
- Architektur:
  - bestehender `buddyAssetResolver` bleibt Quelle fuer statisches Basisauswahlverhalten
  - Animation Controller ist optionaler Layer, der aus einem bereits aufgeloesten statischen Buddy-Kontext eine Animation waehlt
  - wenn Animation unzulaessig oder nicht verfuegbar:
    - statisches Bild bleibt sichtbar
  - keine Save-Daten
  - keine Simulationseinwirkung
  - keine Pflicht-Initialisierung beim App-Start

## Empfohlenes Animationsformat

### CSS-Keyframe auf einzelner PNG
- sicherste Phase-1-Loesung
- keine neuen Assets noetig
- geringstes Performance- und Integrationsrisiko

### Frame-Sequenz mit mehreren PNGs
- gut fuer spaetere Celebrate/Wave-Verbesserung
- braucht bewusst erzeugte, stilistisch gematchte Frames

### Sprite-Sheet
- spaeter sinnvoll, aber aktuell zu frueh
- lohnt erst bei mehreren stabilen Sequenzen

### Canvas
- aktuell nicht empfohlen
- zu viel Runtime-Komplexitaet fuer den Nutzen

## Mapping-Konzept

- Care Studio stabil -> `idle_breathing` oder `happy_bounce`
- Care Studio hohes Risiko -> `warning_stop`
- Care Studio Diagnose / unsicher -> `thinking_idle`
- Home Daily `stable_day` -> `idle_breathing`
- Home Daily positive Starter-/Welcome-Kontexte -> `wave_hello`
- Mission claimable -> `celebrate_reward`
- Reward claimed -> `celebrate_reward`
- Coin action warning -> `warning_stop`
- Coin action tip / analysis -> `thinking_idle`
- Coin action reward/timeboost -> `happy_bounce` oder `celebrate_reward`

## Performance- und Risikoanalyse

- Mobile Performance:
  - CSS-Transform/Opacity ist unkritisch
  - Frame-Sequenzen koennen auf vielen Buddy-Instanzen schnell teuer werden
- Layout Shift:
  - gering, wenn bestehende feste Buddy-Frames weiterverwendet werden
- Manifest-/Fallback:
  - aktueller statischer Resolver ist bereits gute Fallback-Basis
  - Animation darf niemals Voraussetzung fuer Bildanzeige sein
- Offline/PWA:
  - fuer Phase 1 unkritisch, weil bestehende PNGs weitergenutzt werden
  - spaetere Frame-Sequenzen brauchen eigene Cache-Pruefung
- Speicherbedarf:
  - CSS-Phase gering
  - mehrere PNG-Frames pro Animation koennen schnell wachsen
- Uneinheitliche PNG-Proportionen:
  - trotz 500x500 koennen Motivgroesse und transparente Raender variieren
  - das ist fuer Frame-Sequenzen problematisch
- Transparente Raender:
  - koennen optisches Springen erzeugen, besonders bei Reward-Assets
- `prefers-reduced-motion`:
  - muss spaeter zwingend respektiert werden
- Barrierefreiheit:
  - keine permanenten auffaelligen Bewegungen
  - Reward-/Warning-Motion nur kurz und selten

## Konkrete naechste Implementierungsphase

- Phase 1 nur CSS-Microanimations auf bestehenden PNGs:
  - `idle_breathing`
  - `happy_bounce`
  - `warning_pulse`
  - `reward_pop`
- Keine neuen Frame-Assets
- Kein Manifest-Umbau
- Keine Save-/Runtime-/Simulationseingriffe
- Zuerst nur auf 1-2 bestehenden Buddy-Surfaces testen

## Spaeter wahrscheinlich betroffene Dateien

- neu: `src/ui/buddy/buddyAnimationController.js`
- neu: `src/ui/buddy/buddyAnimationMap.js`
- spaeter moeglich: Buddy-spezifische CSS-Datei oder kleiner Buddy-Animationsblock in bestehendem Styling
- spaeter moeglich: bestehende Buddy-Renderstellen fuer optionale `data-buddy-animation`

## No-Go-Liste

- keine Animation als Pflicht fuer Buddy-Darstellung
- keine Canvas-Einfuehrung in Phase 1
- keine Nutzung texttragender Reward-/Shop-Assets als Standardanimation
- keine Frame-Sequenzen aus unpassenden Einzelposen erzwingen
- keine Animationen ohne `prefers-reduced-motion`-Fallback
- keine Save-, Event-, Coin-, Reward- oder Service-Worker-Kopplung
