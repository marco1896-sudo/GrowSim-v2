# 01 · Indoor Events — Grow Simulator V2

> **Codex-Zuweisung #005B** · Stand: 2026-05-07
> 37 Indoor-spezifische Events in 9 Kategorien.
> Keine bestehenden Dateien ändern · Keine Logik · Keine Locales

---

## Format-Legende

| Feld | Bedeutung |
|------|-----------|
| **Trigger-Logik** | Simulationsvariablen + Schwellenwerte die das Event freischalten |
| **Schwere** | 1 (mild) – 5 (kritisch) |
| **Dauer** | Wie lange das Event aktiv bleibt ohne Spielereingriff |
| **Recovery** | Wie schnell sich die Pflanze nach korrekter Lösung erholt |
| **Telemetry** | Marker die beim Auftreten ins Analytics-System geschrieben werden |

---

## CAT-7 · Technik / Setup (8 Events)

> Alle Technik-Events sind ausschließlich Indoor. Sie modellieren Geräteausfälle, Messfehler und Setup-Nachlässigkeit.
> Technik-Events sind oft der **Auslöser für Ketten-Events** — ein Lüfterausfall führt zu Temperaturanstieg, der zu VPD-Shift führt, der zu Schimmelrisiko führt.

---

#### T-I-01 · Lüfterausfall — Zirkulationsluft fehlt

🏠 Indoor | **Cat:** CAT-7 | **Schwere:** 4

**Stages:** S1–S6 (kann in jeder aktiven Wachstumsphase auftreten)

**Trigger-Logik:**
```
equipment.circulationFan.status === "failed"
OR equipment.circulationFan.rpm < equipment.circulationFan.minRpm * 0.3
AND daysSinceLastCheck > 3
```

**Typische Ursachen:**
- Lüftermotor verschlissen (kein Maintenance-Event wurde gelöst)
- Verstopfte Lüfterflügel durch Staub oder Haare
- Überhitzung des Lüftermotors bei dauerhaft 100% Betrieb

**Sichtbare Symptome:**
- Blätter bewegen sich nicht mehr (kein visueller Luftzug-Effekt)
- Temperatur beginnt zu steigen (+2°C/Session ohne Gegenmaßnahme)
- Luftfeuchtigkeit sammelt sich in Hotspots
- Blätter in der Mitte des Canopys beginnen leicht zu drücken

**Häufige Fehlinterpretation:**
Anfänger merken den Lüfterausfall nicht sofort — die Pflanze sieht noch „okay" aus. Sie deuten steigende Temperatur als Lampen-Problem und verändern den Lampenabstand, lösen aber die eigentliche Ursache nicht.

**Gegenmaßnahme:**
1. Lüfter prüfen und reinigen oder ersetzen
2. Temporär: Tent-Tür öffnen um Luftzirkulation manuell zu ermöglichen
3. Temperatur-Log der letzten 24h prüfen

**Eskalation bei Fehlentscheidung:**
- Tag 1 ohne Lüfter: Temperatur +2°C, Luftfeuchte +8%
- Tag 2: VPD verlässt Zielbereich, Hot Spots entstehen
- Tag 3: Trigger für **K-I-02** (VPD zu niedrig) oder **K-I-03** (Hitzestress) wahrscheinlich
- In Blüte (S4–S6): **Botrytis-Risiko** steigt auf kritisches Niveau

**Folge-Events / Chains:** → EC-10 (Technikausfall-Kette), K-I-02, K-I-03

**Lerninhalt:**
Zirkulationsluft ist keine Komfortfunktion — sie verhindert feuchte Stagnationszonen, stärkt Stängel durch Mikrobe-Widerstand und hält CO₂-Schichten im Canopy in Bewegung. Ein Lüfter ist lebensnotwendig.

**Coach-Hinweis-Stil:** Direktiv-sachlich. „Dein Zirkulationslüfter dreht sich nicht mehr. Das ist kein kosmetisches Problem — check ihn jetzt."

**Asset-Tag:** `img:broken-fan-wilting`
**Cooldown:** 14 Tage
**Ausschluss:** T-I-05 (nicht gleichzeitig zwei Technikfehler im selben System)
**Recovery:** 1–2 Sessions nach Lüfteraustausch, sofort wenn Temperatur fällt
**Telemetry:** `event.trigger=fan_failure`, `plant.stressAccumulation+15`

---

#### T-I-02 · pH-Meter nicht kalibriert — Stille Fehlerquelle

🏠 Indoor | **Cat:** CAT-7 | **Schwere:** 3

**Stages:** S1–S6 (besonders kritisch in S4–S5 wenn Nährstoffbalance eng ist)

**Trigger-Logik:**
```
equipment.phMeter.daysSinceCalibration > 14
AND player.phMeasurementCount > 5
AND plantHealth.phDriftDetected === false
```

**Typische Ursachen:**
- Spieler kalibriert Meter nie (Tutorial-Information nicht verinnerlicht)
- Kalibrierpuffer aufgebraucht und nicht nachgekauft
- Meter nicht in Aufbewahrungslösung gelagert → Elektrode trocken

**Sichtbare Symptome:**
- Keine direkt sichtbaren Pflanzensymptome zunächst
- pH-Anzeige in UI zeigt scheinbar normale Werte
- Subtile Nährstoff-Anomalien: leichte Chlorose die nicht zu einem klaren Mangel passt
- „Komische" Runoff-Werte die nicht zur Eingabe passen

**Häufige Fehlinterpretation:**
Spieler vertraut dem pH-Meter blind. Wenn die Pflanze Mangelerscheinungen zeigt, sucht er im Dünger-System nach der Ursache. Er gibt mehr Nährstoffe, verschlimmert aber tatsächlich den Lockout.

**Gegenmaßnahme:**
1. pH-Meter sofort mit Kalibrierpuffer 4.0 und 7.0 neu kalibrieren
2. Alle pH-Messungen der letzten Woche als unzuverlässig markieren
3. Kontrollmessung von Runoff pH nach Kalibrierung

**Eskalation bei Fehlentscheidung:**
- Angehäufte falsche pH-Werte führen zu unbemerktem Lockout
- Nach 7 Tagen: Mangelerscheinungen werden sichtbar (triggert N-B-03 oder N-I-02)
- Spieler beginnt blind zu düngen → EC steigt → Nährstoff-Burn möglich

**Folge-Events / Chains:** → N-B-03 (pH-Lockout), N-I-02 (Ca-Mangel), W-B-01 (EC-Anstieg)

**Lerninhalt:**
Ein pH-Meter ist ein Präzisionswerkzeug, kein einfaches Messgerät. Drift von ±0.5 pH kann alle Nährstoffe aus dem Aufnahmefenster schieben. Kalibrierung alle 7–14 Tage ist Grundpflege.

**Coach-Hinweis-Stil:** Investigativ. „Wann hast du deinen pH-Meter zuletzt kalibriert? Deine Werte sehen verdächtig konsistent aus — echte Messungen variieren."

**Asset-Tag:** `img:ph-meter-calibration`
**Cooldown:** 10 Tage
**Ausschluss:** T-I-04 (nicht beide Meter-Events gleichzeitig)
**Recovery:** Sofort nach Kalibrierung; Pflanzenrecover je nach akkumuliertem Lockout 3–5 Tage
**Telemetry:** `event.trigger=ph_meter_drift`, `equipment.phMeter.calibrationMissed=true`

---

#### T-I-03 · Zeitschaltuhr-Fehler — Lichtleck in Dunkelphase

🏠 Indoor | **Cat:** CAT-7 | **Schwere:** 5 (in Blüte: kritisch)

**Stages:** S3–S6 (in S0–S2 vernachlässigbar; in Blüte existenzbedrohend)

**Trigger-Logik:**
```
equipment.timer.driftMinutes > 15
OR equipment.timer.failedCycles > 0
AND plant.stage >= "preflower"
AND setup.photoperiod === "12/12"
```

**Typische Ursachen:**
- Analoge Zeitschaltuhr driftet (Sommerzeit-Umstellung vergessen)
- Digitale Uhr nach Stromausfall nicht neu eingestellt
- Defekte Zeitschaltuhr schaltet Licht nicht ab
- Reflektierende Oberflächen leiten Licht aus Nebenraum in Tent

**Sichtbare Symptome:**
- Pflanze erhält Licht während Dunkelphase (Simulation zeigt roten Indikator)
- Nach 2–3 Zyklen: Wachstumsmuster unregelmäßig
- Nach 5+ Zyklen: Erste Anzeichen von **Reveg** (runde Einzelblätter erscheinen)
- In schweren Fällen: Hermaphroditen-Entwicklung (triggert B-I-02)

**Häufige Fehlinterpretation:**
Anfänger erkennen Reveg-Zeichen nicht. Sie interpretieren die „komischen kleinen Blätter" als Sortencharakteristik. Das Lichtleck wird wochenlang ignoriert.

**Gegenmaßnahme:**
1. Zeitschaltuhr sofort prüfen und neu einstellen
2. Tent auf externe Lichtquellen prüfen (alle Lücken abdichten)
3. Bei Reveg-Anzeichen: 48h komplette Dunkelheit zur Reset-Unterstützung
4. Hermaphroditen-Check durchführen

**Eskalation bei Fehlentscheidung:**
- 1 Woche Lichtleck: Blüte verzögert sich um 5–10 Tage
- 2 Wochen: Reveg tritt ein, Grow-Zeit verlängert sich massiv
- 3+ Wochen: Hermaphrodit-Pollensäcke möglich → gesamter Grow gefährdet

**Folge-Events / Chains:** → B-I-02 (Hermaphrodit-Erkennung), Reveg-Story-Beat

**Lerninhalt:**
Cannabis-Blüte ist photoperiodisch gesteuert. Jede Unterbrechung der Dunkelphase — auch kurz — sendet der Pflanze das Signal „Sommer kommt zurück". 12/12 bedeutet: 12 Stunden absolut dunkel, ohne Ausnahme.

**Coach-Hinweis-Stil:** Alarmierend-klar. „Deine Pflanze bekommt Licht während der Dunkelphase. Das ist kein kleines Problem — in der Blüte kann das deinen Grow ruinieren."

**Asset-Tag:** `img:light-leak-timer`
**Cooldown:** 20 Tage (seltenes aber schweres Event)
**Ausschluss:** B-I-02 (Hermaphrodit-Event wird als Folge getriggert, nicht gleichzeitig)
**Recovery:** Nach Behebung: 5–14 Tage bis Blüte sich normalisiert; bei Reveg länger
**Telemetry:** `event.trigger=light_leak`, `plant.revegRisk=true`, `event.severity=critical`

---

#### T-I-04 · EC-Meter-Drift — Falsche Nährstoffkonzentration

🏠 Indoor | **Cat:** CAT-7 | **Schwere:** 3

**Stages:** S2–S6

**Trigger-Logik:**
```
equipment.ecMeter.daysSinceCalibration > 21
AND player.ecMeasurementCount > 8
AND nutrient.ecDeviation > 0.4
```

**Typische Ursachen:**
- EC-Meter nie kalibriert seit Spielbeginn
- Referenzlösung alt oder verschmutzt
- Elektroden-Beschichtung durch Kalkablagerung verfälscht

**Sichtbare Symptome:**
- Angezeigter EC-Wert weicht von tatsächlichem Wert ab
- Pflanze zeigt Nährstoff-Burn-Symptome obwohl EC „normal" angezeigt wird
- Oder: Pflanzenmangel obwohl EC „zu hoch" angezeigt wird
- Runoff-EC und Feed-EC passen nicht logisch zusammen

**Häufige Fehlinterpretation:**
Spieler korrigiert EC nach Messung — bewegt sich aber in die falsche Richtung weil der Messwert invertiert ist. Nährstoff-Burn verschlimmert sich.

**Gegenmaßnahme:**
1. EC-Meter mit Referenzlösung (1.413 mS/cm) kalibrieren
2. Aktuelle Nährstofflösung nachträglich prüfen
3. Bei Unsicherheit: kleinen Flush durchführen und neu aufbauen

**Eskalation bei Fehlentscheidung:** → W-B-01 (EC-Anstieg/Burn), N-I-01 (N-Überdosierung durch falsche EC-Einschätzung)

**Lerninhalt:**
EC-Meter messen elektrische Leitfähigkeit — jede Ablagerung auf den Elektroden verfälscht das Ergebnis. Monatliche Kalibrierung mit einer zertifizierten Referenzlösung ist Pflicht.

**Coach-Hinweis-Stil:** Technisch-erklärend. „Dein EC-Meter zeigt Werte die nicht zur Pflanzenreaktion passen. Kalibriere ihn — das ist kein Gerät das du blind vertrauen kannst."

**Asset-Tag:** `img:ec-meter-calibration`
**Cooldown:** 12 Tage
**Ausschluss:** T-I-02
**Recovery:** Sofort nach Kalibrierung; 2–4 Tage für Pflanzenrecover
**Telemetry:** `event.trigger=ec_meter_drift`, `equipment.ecMeter.calibrationMissed=true`

---

#### T-I-05 · Abluft-Engpass — Aktivkohlefilter verstopft

🏠 Indoor | **Cat:** CAT-7 | **Schwere:** 3

**Stages:** S2–S7 (in S5–S6 zusätzlich Geruchsproblem)

**Trigger-Logik:**
```
equipment.carbonFilter.weeksSinceReplacement > 16
AND equipment.exhaustFan.cfmActual < equipment.exhaustFan.cfmRated * 0.6
AND setup.ventilation.negative_pressure === false
```

**Typische Ursachen:**
- Aktivkohlefilter nach 4 Monaten Betrieb nicht gewechselt
- Filter durch hohe Luftfeuchtigkeit vorzeitig gesättigt
- Lüfter zu schwach für Tent-Volumen (falsches Sizing beim Setup)

**Sichtbare Symptome:**
- Negativdruck im Tent lässt nach (Zeltwände drücken nach außen statt innen)
- Temperatur und Luftfeuchtigkeit steigen trotz laufendem Lüfter
- In S5–S6: Aroma-Intensität „steigt merklich" (Geruchsindikator-Event)
- CO₂-Erneuerung sinkt

**Häufige Fehlinterpretation:**
Spieler denkt die Temperatur steigt weil die Lampe zu heiß ist. Verstellt den Lampenabstand, ändert nichts an der eigentlichen Ursache.

**Gegenmaßnahme:**
1. Aktivkohlefilter prüfen und ggf. ersetzen
2. Verbindungsschläuche auf Knicke und Dichtheit prüfen
3. Lüfter-Drehzahl temporär erhöhen
4. Tent-Dichtheit testen (Papierteststreifen an Öffnungen)

**Eskalation bei Fehlentscheidung:** → K-I-01 (VPD zu hoch), K-I-02 (VPD zu niedrig je nach Saison), P-I-03 (Schimmelpilz durch Luftstau)

**Lerninhalt:**
Ein Aktivkohlefilter hat eine begrenzte Kapazität — er sättigt sich mit Geruchs- und Feuchtigkeitspartikeln. Wer ihn zu lange nutzt, verliert nicht nur Geruchskontrolle, sondern auch die Luftzirkulation.

**Coach-Hinweis-Stil:** Praktisch-warnend. „Dein Abluft-System arbeitet nicht mehr effizient. Überprüfe den Filter und die Verbindungen — bevor das Klima eskaliert."

**Asset-Tag:** `img:carbon-filter-blocked`
**Cooldown:** 21 Tage
**Ausschluss:** T-I-01
**Recovery:** Sofort nach Filteraustausch
**Telemetry:** `event.trigger=exhaust_restriction`, `equipment.filter.saturation=high`

---

#### T-I-06 · Bewässerungspumpe defekt — Manuelle Notbewässerung

🏠 Indoor | **Cat:** CAT-7 | **Schwere:** 4

**Stages:** S2–S6 (bei automatischen Bewässerungs-Setups)

**Trigger-Logik:**
```
setup.irrigationType === "automated"
AND equipment.pump.status === "failed"
AND plant.soilMoisture < 0.35
```

**Typische Ursachen:**
- Pumpe läuft trocken (Reservoir leer, Pumpe nicht abgeschaltet)
- Rohr verstopft oder geknickt
- Pumpe überhitzt durch Dauerbetrieb ohne Pause

**Sichtbare Symptome:**
- Bewässerungs-Icon zeigt Fehler
- Substrat-Feuchte sinkt progressiv
- Pflanze zeigt nach 12–24h erste Trockenstress-Zeichen (W-I-02 kann folgen)

**Häufige Fehlinterpretation:**
Spieler denkt zunächst an ein Substrat-Problem. Gießt manuell einmal nach, ignoriert den Pump-Alarm. Pumpe bleibt defekt.

**Gegenmaßnahme:**
1. Pump-Status direkt prüfen
2. Reservoir-Füllstand sicherstellen
3. Manuell gießen bis Pumpe repariert
4. Rohre auf Verstopfung prüfen

**Eskalation bei Fehlentscheidung:** → W-I-02 (Trockenstress), in extremen Fällen Pflanzenverlust

**Lerninhalt:**
Automatisierung ist kein Freifahrtschein. Jedes automatisierte System braucht tägliche Sichtkontrolle — besonders Pumpen, weil Ausfälle schnell eskalieren.

**Coach-Hinweis-Stil:** Handlungsorientiert. „Deine Pumpe arbeitet nicht. Greife jetzt manuell ein — deine Pflanze kann nicht warten."

**Asset-Tag:** `img:pump-failure`
**Cooldown:** 18 Tage
**Ausschluss:** W-I-02 (wird als Folge getriggert)
**Recovery:** Sofort nach Pumpenaustausch + manuellem Gießen
**Telemetry:** `event.trigger=pump_failure`, `equipment.pump.status=failed`

---

#### T-I-07 · LED-Treiber-Überhitzung — Leistungsabfall

🏠 Indoor | **Cat:** CAT-7 | **Schwere:** 3

**Stages:** S2–S6

**Trigger-Logik:**
```
equipment.light.driverTemp > 75
AND equipment.light.ppfdActual < equipment.light.ppfdRated * 0.75
AND setup.ventilation.heatExtraction < required
```

**Typische Ursachen:**
- LED-Treiber hängt zu nah an Zeltwand ohne Luftstrom
- Treiber zu nah an Lampe montiert
- Umgebungstemperatur im Raum über 30°C
- Kühler des Treibers staubverschmutzt

**Sichtbare Symptome:**
- PPFD sinkt unter Zielwert ohne manuelle Änderung
- Lampen-Icon zeigt Temperatursymbol
- Bei schwereren Fällen: Lampe geht kurz aus (Thermoschutz löst aus)

**Häufige Fehlinterpretation:**
Spieler erhöht Lampenhöhe wegen vermutetem Lichtbrand — tatsächlich ist das PPFD schon zu niedrig.

**Gegenmaßnahme:**
1. Treiber-Temperatur messen
2. Treiber in kühlere Position verlegen oder besser belüften
3. Treiber-Kühlkörper reinigen
4. Umgebungstemperatur im Raum prüfen

**Eskalation bei Fehlentscheidung:** → L-I-02 (Lichtmangel durch dauerhaft reduziertes PPFD)

**Lerninhalt:**
LED-Effizienz ist temperaturabhängig. Ein heißer Treiber liefert weniger Licht bei gleichem Stromverbrauch. LED-Pflege bedeutet auch Kühler-Pflege.

**Coach-Hinweis-Stil:** Technisch-informativ. „Dein LED-Treiber überhitzt und drosselt die Leistung. Das kostet dich PPFD — und damit Ertrag."

**Asset-Tag:** `img:led-driver-overheat`
**Cooldown:** 14 Tage
**Ausschluss:** L-I-01
**Recovery:** Sofort nach Temperaturkorrektur
**Telemetry:** `event.trigger=led_driver_overheat`, `equipment.light.efficiency=reduced`

---

#### T-I-08 · Fehlmessung durch schlechten Hygrometer-Standort

🏠 Indoor | **Cat:** CAT-7 | **Schwere:** 2

**Stages:** S1–S6

**Trigger-Logik:**
```
equipment.hygrometer.placement === "suboptimal"
AND abs(equipment.hygrometer.readingDelta - plant.actualVpdEstimate) > 0.3
AND daysSinceSetup > 7
```

**Typische Ursachen:**
- Hygrometer direkt unter Lampe (zu heiß → Luftfeuchtigkeit zu niedrig angezeigt)
- Hygrometer direkt hinter Lüfter (zu kühl und trocken)
- Hygrometer zu nah am Gießwasser (zu feucht angezeigt)

**Sichtbare Symptome:**
- VPD-Berechnung ergibt unplausible Werte
- Spieler korrigiert Luftfeuchte, aber Pflanzensymptome zeigen keine Verbesserung
- Hygrometer zeigt stabile Werte ohne Tagesschwankung (Realität: immer Schwankung)

**Häufige Fehlinterpretation:**
Spieler vertraut dem Display. Trifft Entscheidungen für Luftfeuchte-Anpassung auf falscher Datenbasis.

**Gegenmaßnahme:**
1. Hygrometer an Canopy-Höhe der Pflanze platzieren (ca. 20 cm über Blüten)
2. Abseits von direktem Luftstrom und Wärmequellen
3. Vergleichsmessung mit zweitem Sensor

**Eskalation bei Fehlentscheidung:** → K-I-01 oder K-I-02 (VPD falsch eingestellt durch Fehlmessung)

**Lerninhalt:**
Die Sensorposition ist genauso wichtig wie der Sensor selbst. Der Messpunkt bestimmt, welche Realität du siehst. Cannabis-Canopy und Tent-Ecke haben völlig andere Mikroklimata.

**Coach-Hinweis-Stil:** Aufklärerisch. „Dein Hygrometer misst nicht das was deine Pflanze erlebt. Platzierung entscheidet über Messqualität."

**Asset-Tag:** `img:hygrometer-placement`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** Sofort nach Neupositionierung
**Telemetry:** `event.trigger=sensor_placement_error`, `equipment.hygrometer.placement=suboptimal`

---

## CAT-4 · Licht / PPFD — Indoor (6 Events)

> PPFD (Photosynthetisch aktive Photonenflussdichte) und DLI (Daily Light Integral) sind die primären Licht-Metriken.
> Lichtstress ist Indoor besonders häufig weil der Spieler volle Kontrolle — und damit volle Verantwortung — hat.

---

#### L-I-01 · Lichtbrand — Lampe zu nah am Canopy

🏠 Indoor | **Cat:** CAT-4 | **Schwere:** 3

**Stages:** S2–S5 (wenn Stretch schnell ist und Abstand nicht angepasst wird)

**Trigger-Logik:**
```
equipment.light.distanceCm < plant.stage.minLightDistance
AND equipment.light.ppfdAtCanopy > 1100
AND plant.canopyGrowthCm > 5 (letzte 3 Tage)
```

**Typische Ursachen:**
- Pflanze wächst schnell in Preflower-Stretch und Lampe wurde nicht nachgeführt
- Spieler setzt Lampe bewusst tiefer um PPFD zu erhöhen ohne Abstand zu prüfen
- Nach Topping wächst Haupttrieb in die Lampe hinein

**Sichtbare Symptome:**
- Obere Blätter zeigen gelbe bis weiße Bleaching-Flecken
- Blätter nahe Lampe rollen sich nach oben (heat taco)
- Blattoberfläche fühlt sich trocken und brüchig an
- Wachstum der oberen Triebe verlangsamt sich trotz hohem PPFD

**Häufige Fehlinterpretation:**
Bleaching wird mit Nährstoffmangel verwechselt. Spieler gibt Cal-Mag oder erhöht Düngung. Das hilft nicht.

**Gegenmaßnahme:**
1. Lampe sofort anheben (mind. 5–10 cm mehr Abstand)
2. PPFD am Canopy messen — Ziel: 600–900 µmol/m²/s in Veg, 800–1000 in Blüte
3. Beschädigte Blätter entfernen (können nicht repariert werden)

**Eskalation bei Fehlentscheidung:**
- Obere Triebe sterben ab → Ertragsverlust der Top-Buds
- Bei sehr langem Lichtbrand: Pflanze hört auf nach oben zu wachsen → flaches Canopy

**Folge-Events:** → Keine direkten Chains; kann L-I-02 maskieren (Pflanze kompensiert oben mit weniger Licht unten)

**Lerninhalt:**
PPFD ist nicht „je mehr desto besser". Cannabis hat einen Lichtsättigungspunkt — darüber hinaus wird Licht zur Waffe. Lampenabstand ist täglich zu prüfen wenn die Pflanze stark streckt.

**Coach-Hinweis-Stil:** Visuell-diagnostisch. „Sieh dir die oberen Blätter an — dieses Ausbleichen ist kein Mangel. Das ist Lichtbrand. Heb die Lampe."

**Asset-Tag:** `img:light-burn-bleaching`
**Cooldown:** 10 Tage
**Ausschluss:** L-I-02
**Recovery:** 3–5 Tage nach Korrektur (neue Blätter wachsen gesund nach)
**Telemetry:** `event.trigger=light_burn`, `plant.ppfdOverload=true`

---

#### L-I-02 · Lichtmangel in der Blüte — PPFD zu gering

🏠 Indoor | **Cat:** CAT-4 | **Schwere:** 3

**Stages:** S4–S6

**Trigger-Logik:**
```
plant.dli < 35
AND plant.stage >= "early_flower"
AND equipment.light.ppfdAtCanopy < 600
AND plant.budDensityGrowthRate < expected * 0.6
```

**Typische Ursachen:**
- Lampe nach Lichtbrand-Event zu hoch gehängt und nicht nachkorrigiert
- LED-Treiber-Überhitzung reduziert Ausgangsleistung (T-I-07)
- Zu viele Pflanzen auf gleicher Fläche → PPFD pro Pflanze zu gering
- Lampe zu schwach für Tent-Größe (falsches Setup)

**Sichtbare Symptome:**
- Buds bleiben klein und locker (airy buds)
- Untere Blätter gelbeln früher als normal
- Internodale Abstände bleiben kurz aber Buds entwickeln sich nicht
- Blätter strecken sich zur Lampe hin (Etiolierung)

**Häufige Fehlinterpretation:**
Spieler denkt die Sorte produziert einfach wenige Erträge. Erkennt den Zusammenhang zwischen PPFD und Bud-Dichte nicht.

**Gegenmaßnahme:**
1. PPFD am Canopy messen → Ziel Blüte: 800–1000 µmol/m²/s
2. Lampe tiefer hängen oder Ausgangsleistung erhöhen
3. Reflektionsflächen prüfen und optimieren

**Eskalation bei Fehlentscheidung:** Geringer Ertrag, locker strukturierte Buds mit niedrigem Wirkstoffgehalt

**Lerninhalt:**
DLI (Daily Light Integral) bestimmt die Photosynthesekapazität eines Tages. In der Blüte braucht Cannabis DLI 40–50 mol/m²/d. Zu wenig Licht in dieser Phase bedeutet direkt weniger Ertrag.

**Coach-Hinweis-Stil:** Zahlen-orientiert. „Dein DLI liegt bei [X]. Für diese Stage brauchst du mindestens 40. Bring die Lampe näher."

**Asset-Tag:** `img:airy-buds-low-light`
**Cooldown:** 14 Tage
**Ausschluss:** L-I-01
**Recovery:** Langsam — Buds die bereits locker sind verdichten sich nicht mehr stark
**Telemetry:** `event.trigger=ppfd_deficit`, `plant.budDensity=low`

---

#### L-I-03 · Lichtleck — Dunkelphase unterbrochen

🏠 Indoor | **Cat:** CAT-4 | **Schwere:** 5 (in Blüte kritisch)

**Stages:** S3–S6

**Trigger-Logik:**
```
setup.lightLeak.detected === true
AND plant.stage >= "preflower"
AND setup.photoperiod === "12/12"
AND lightLeakDuration > 10 (Minuten pro Dunkelphase)
```

*(Hinweis: Eng verwandt mit T-I-03 Zeitschaltuhr-Fehler — aber hier durch bauliche Lichtlecks, nicht Gerätefehler)*

**Typische Ursachen:**
- Reisverschluss des Tents schließt nicht dicht
- Kabel-Öffnungen im Tent ohne Abdichtung
- Fenster im Grow-Raum ohne Verdunkelung
- Reflexionen von Licht aus angrenzenden Räumen

**Sichtbare Symptome:**
- Gleiches Bild wie T-I-03, aber kein Gerätefehler-Alarm
- Reveg-Zeichen: einzelne runde Blätter an neuen Trieben
- Unregelmäßige Blütenentwicklung

**Häufige Fehlinterpretation:**
Spieler überprüft die Zeitschaltuhr und findet keinen Fehler. Das eigentliche Lichtleck (Bau) bleibt unentdeckt.

**Gegenmaßnahme:**
1. Tent bei ausgeschaltetem Licht von innen prüfen (Augen 5 Min adaptieren)
2. Alle Kabel-Öffnungen mit schwarzem Stoff abdichten
3. Tent-Reisverschluss mit schwarzem Tape abdichten

**Eskalation:** Identisch T-I-03 → Reveg, Hermaphroditen

**Lerninhalt:**
Cannabis-Blüte ist sensibler als viele denken. Selbst Mondlicht durch einen Ritz kann in bestimmten Forschungen als störend gemessen werden. Absolute Dunkelheit bedeutet: kein Licht, nicht „fast kein Licht".

**Coach-Hinweis-Stil:** Detektiv-Modus. „Es gibt kein Geräteproblem — aber deine Pflanze bekommt Licht in der Dunkelphase. Such nach dem Leck."

**Asset-Tag:** `img:tent-light-leak`
**Cooldown:** 21 Tage
**Ausschluss:** T-I-03 (nicht beide Lichtleck-Events gleichzeitig)
**Recovery:** 5–14 Tage nach Behebung
**Telemetry:** `event.trigger=light_leak_structural`, `plant.revegRisk=true`

---

#### L-I-04 · Zu hoher DLI für Seedling — Stressstart

🏠 Indoor | **Cat:** CAT-4 | **Schwere:** 2

**Stages:** S0–S1

**Trigger-Logik:**
```
plant.stage === "seedling"
AND plant.dli > 20
AND equipment.light.ppfdAtCanopy > 400
```

**Typische Ursachen:**
- Spieler nutzt die volle Blüte-Lichtleistung bereits für Keimlinge
- Lampe hängt zu niedrig in der Seedling-Phase
- Spieler weiß nicht dass Keimlinge weniger Licht brauchen als ausgewachsene Pflanzen

**Sichtbare Symptome:**
- Keimling wirkt geduckt, Blätter liegen flach (Defensivhaltung gegen Licht)
- Blätter leicht eingerollt
- Hypokotyl bleibt sehr kurz (Pflanze streckt sich nicht)
- Ggf. leichtes Ausbleichen der Keimblätter

**Häufige Fehlinterpretation:**
Spieler denkt mehr Licht = schnelleres Wachstum. Das Gegenteil tritt ein.

**Gegenmaßnahme:**
1. Lampe auf 40–50 cm Abstand anheben
2. Lichtleistung auf 30–40% dimmen
3. DLI-Ziel Seedling: 10–15 mol/m²/d

**Eskalation bei Fehlentscheidung:** Verlangsamtes Wachstum in S1; Keimling erholt sich aber meist vollständig

**Lerninhalt:**
Keimlinge haben noch keine ausgereifte Photosynthese-Maschinerie. Zu viel Licht überwältigt das System. Der optimale DLI steigt mit dem Pflanzenalter — Seedling braucht weniger als die Hälfte des Blüte-DLI.

**Coach-Hinweis-Stil:** Sanft-erklärend. „Dein Keimling bekommt zu viel Licht. Mehr Licht hilft jetzt nicht — dreh zurück und lass ihn in Ruhe wachsen."

**Asset-Tag:** `img:seedling-light-stress`
**Cooldown:** — (nur in S0–S1 möglich, kann nur einmal auftreten)
**Ausschluss:** L-I-01
**Recovery:** 2–3 Tage nach Korrektur
**Telemetry:** `event.trigger=seedling_dli_excess`, `plant.stage=seedling`

---

#### L-I-05 · Spektrum-Wechsel vergessen — Veg-Licht in Blüte

🏠 Indoor | **Cat:** CAT-4 | **Schwere:** 2

**Stages:** S3–S5

**Trigger-Logik:**
```
setup.lightSpectrum === "veg_spectrum"
AND plant.stage >= "preflower"
AND daysSinceStageChange > 5
```

**Typische Ursachen:**
- Spieler hat Full-Spectrum-LED auf Veg-Modus belassen
- Weiß nicht wann er auf „Bloom"-Schalter umstellen soll
- Hat vergessen dass Spektrum-Wechsel manuell erfolgen muss

**Sichtbare Symptome:**
- Pflanze streckt überdurchschnittlich (zu viel blaues Licht fördert Vegetationswachstum)
- Blütenansätze wachsen langsam
- Pflanze produziert mehr Blätter als Buds

**Häufige Fehlinterpretation:**
Spieler freut sich über starkes Wachstum ohne zu merken dass die Blütenentwicklung darunter leidet.

**Gegenmaßnahme:**
1. Spektrum auf Bloom/Rot-dominantes Spektrum umstellen
2. Lichtintensität gleichzeitig auf Blüte-Niveau anpassen

**Eskalation bei Fehlentscheidung:** Gestreckter, dünner Aufbau; lockere Buds; leicht reduzierter Ertrag

**Lerninhalt:**
Rotes Licht (620–700 nm) stimuliert Blütenentwicklung. Blaues Licht (400–500 nm) fördert vegetatives Wachstum. Cannabis braucht in der Blüte ein rot-dominantes Spektrum um Energie effizient in Buds umzusetzen.

**Coach-Hinweis-Stil:** Erinnerungsbasiert. „Du hast auf 12/12 umgestellt — aber das Spektrum noch nicht gewechselt. Deine Pflanze denkt noch sie ist im Sommer."

**Asset-Tag:** `img:spectrum-switch`
**Cooldown:** — (einmaliges Ereignis pro Grow)
**Ausschluss:** keine
**Recovery:** 3–5 Tage bis Blüte anzieht
**Telemetry:** `event.trigger=spectrum_not_switched`, `setup.lightMode=veg_in_bloom`

---

#### L-I-06 · Ungleichmäßige Ausleuchtung — Canopy-Hotspot

🏠 Indoor | **Cat:** CAT-4 | **Schwere:** 2

**Stages:** S2–S5

**Trigger-Logik:**
```
equipment.light.ppfdVariance > 30%
AND plant.canopyBalance < 0.7
AND setup.lightCount === 1
AND plant.canopyArea > equipment.light.coverageArea
```

**Typische Ursachen:**
- Eine Lampe für zu große Fläche
- Reflektionsstreifen im Tent beschädigt oder fehlen
- Pflanzen am Rand erhalten deutlich weniger PPFD als Mitte
- LST oder Topping erzeugt ungleichen Canopy der nicht gleichmäßig ausgeleuchtet wird

**Sichtbare Symptome:**
- Mittlere Buds entwickeln sich deutlich stärker als Rand-Buds
- Seitentriebe in Tent-Ecken bleiben dünn und klein
- Unterschied in Reifegrad zwischen Mitte und Rand

**Häufige Fehlinterpretation:**
Spieler denkt die Sorte hat ungleichmäßige Genetik. Training wird als Lösung nicht in Betracht gezogen.

**Gegenmaßnahme:**
1. Pflanze regelmäßig drehen (180°/2 Tage)
2. Canopy durch LST/Defoliation verflachen
3. Reflektions-Streifen an Tent-Wänden prüfen und ausbessern

**Eskalation bei Fehlentscheidung:** Ungleichmäßige Ernte; Außenbuds deutlich kleiner und leichter

**Lerninhalt:**
PPFD fällt mit dem Quadrat der Entfernung (Inverse Square Law). Eine Pflanze die breiter als die optimale Lichtverteilung ist, hat immer Schattenbereiche. Rotation und Training sind die Lösung, nicht mehr Licht.

**Coach-Hinweis-Stil:** Visuell-analytisch. „Sieh dir deinen Canopy von oben an. Die Mitte ist gut — aber die Seiten bekommen zu wenig Licht. Dreh und flatten."

**Asset-Tag:** `img:canopy-hotspot`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** Kontinuierlich mit Rotation
**Telemetry:** `event.trigger=ppfd_variance_high`, `plant.canopyBalance=low`


---

## CAT-3 · Klima / VPD — Indoor (5 Events)

> VPD (Vapour Pressure Deficit) ist die kritischste Klima-Variable im Indoor-Grow.
> Sie ergibt sich aus Temperatur und relativer Luftfeuchtigkeit und bestimmt wie viel Wasser die Pflanze transpiriert.
> VPD-Fenster: Seedling 0.4–0.8 kPa · Veg 0.8–1.2 kPa · Blüte 1.0–1.6 kPa

---

#### K-I-01 · VPD zu hoch — Stomata schließen sich, Transpiration stoppt

🏠 Indoor | **Cat:** CAT-3 | **Schwere:** 3

**Stages:** S1–S6

**Trigger-Logik:**
```
climate.vpd > 1.8 AND plant.stage === "veg"
OR climate.vpd > 2.0 AND plant.stage >= "early_flower"
AND duration > 4h
```

**Typische Ursachen:**
- Luftfeuchtigkeit fällt durch Abluft-Überdimensionierung unter 40%
- Temperatur steigt durch Lampen-Abwärme (besonders HPS/CMH)
- Heizperiode im Winter: trockene Heizungsluft senkt RH massiv
- Lüfter zu direkt auf Pflanze gerichtet → lokale Austrocknung

**Sichtbare Symptome:**
- Blätter rollen sich tagsüber nach innen (leichte Taco-Form)
- Wachstum verlangsamt sich trotz guter Nährstoff- und Lichtwerte
- Blätter wirken leicht stumpf/matt statt glänzend
- Stomata-Schlusskondition: Pflanze hört auf Wasser aufzunehmen

**Häufige Fehlinterpretation:**
Spieler sieht eingerollte Blätter und denkt sofort an Wassermangel. Gießt nach → Substrat bereits nass → Überwässerung entsteht. Das VPD-Problem bleibt ungelöst.

**Gegenmaßnahme:**
1. RH erhöhen: Luftbefeuchter installieren oder Schüssel Wasser im Tent
2. Temperatur senken: Lampen-Timer anpassen, Abluft reduzieren
3. VPD-Tabelle prüfen: Ziel-VPD für aktuelle Stage
4. Hygrometer-Position prüfen (T-I-08 als mögliche Ursache)

**Eskalation bei Fehlentscheidung:**
- Tag 1–2: Wachstumsverlangsamung, kein permanenter Schaden
- Tag 3–5: Stress akkumuliert, Pflanze investiert Energie in Stressreaktion statt Wachstum
- Blüte: Terpenverlust, Trichomproduktion sinkt
- Kombination mit Hitzestress: → K-I-03

**Folge-Events / Chains:** → EC-06 (Hitzewelle), K-I-03 (Hitzestress)

**Lerninhalt:**
VPD beschreibt das Wasseraufnahme-Potential der Luft. Zu hoher VPD = Luft saugt Wasser aus den Blättern schneller als die Wurzeln liefern können. Stomata schließen sich als Schutzreaktion — und damit stoppt auch die CO₂-Aufnahme für die Photosynthese.

**Coach-Hinweis-Stil:** Erklärend-kausal. „Dein VPD liegt bei [X] — das ist zu hoch. Die Stomata deiner Pflanze sind geschlossen. Sie wächst gerade nicht, sie verteidigt sich."

**Asset-Tag:** `img:vpd-high-leaf-curl`
**Cooldown:** 7 Tage
**Ausschluss:** K-I-02
**Recovery:** 6–12h nach VPD-Korrektur
**Telemetry:** `event.trigger=vpd_high`, `climate.vpd.value`, `plant.stomataState=closed`

---

#### K-I-02 · VPD zu niedrig — Schimmelgefahr und stockende Nährstoffaufnahme

🏠 Indoor | **Cat:** CAT-3 | **Schwere:** 4 (in S5–S6: kritisch)

**Stages:** S1–S6

**Trigger-Logik:**
```
climate.vpd < 0.4 AND plant.stage <= "veg"
OR climate.vpd < 0.6 AND plant.stage >= "early_flower"
AND climate.rh > 70
AND duration > 6h
```

**Typische Ursachen:**
- Lüfterausfall (T-I-01): Feuchtigkeit staut sich
- Abluft-Engpass (T-I-05): Feuchte wird nicht abgeführt
- Zu viele Pflanzen auf kleiner Fläche: Transpiration übersteigt Abluftkapazität
- Falscher Humidifier-Einsatz ohne VPD-Messung
- Temperatur zu kühl bei gleichzeitig hoher RH

**Sichtbare Symptome:**
- Wasserfilm auf Blättern und Blüten (Kondensation in Blüte = Notfall)
- Blätter wirken fett und dunkel-glänzend
- Wachstum stockt (Transpiration = Nährstofftransport; kein Transport = kein Wachstum)
- In Blüte: erste Anzeichen von Botrytis (gräuliche Stellen im Bud-Inneren)

**Häufige Fehlinterpretation:**
Spieler sieht gesund aussehende, glänzende Pflanze und handelt nicht. Schimmel wächst zuerst im Bud-Inneren — von außen nicht sofort sichtbar.

**Gegenmaßnahme:**
1. Abluft sofort auf Maximum
2. Luftfeuchtigkeit senken: Dehumidifier, weniger gießen
3. Luftzirkulation verbessern (interne Lüfter)
4. In Blüte: Buds auf Grauschimmel-Anzeichen prüfen (P-B-03 als Folge)

**Eskalation bei Fehlentscheidung:**
- Veg: Verlangsamtes Wachstum, kein permanenter Schaden wenn korrigiert
- Blüte S5–S6: Botrytis kann sich in 24–48h von einer Bud-Stelle auf gesamten Ast ausbreiten
- Unbehandelt in S6: gesamte Ernte kann verloren gehen

**Folge-Events / Chains:** → EC-02 (Schimmel-Invasion), P-B-03 (Botrytis), EC-10 (nach T-I-01)

**Lerninhalt:**
Botrytis (Grauschimmel) braucht drei Dinge: Feuchtigkeit, Wärme, tote Pflanzenmaterial. Indoor-Blüte mit RH > 65% über Nacht ist ein Botrytis-Einladungsschreiben. VPD zu niedrig = Schimmelfenster offen.

**Coach-Hinweis-Stil:** Alarmierend, besonders in Blüte. „RH über 70% in der Blüte ist gefährlich. Schimmel wächst dort wo du ihn nicht siehst — im Bud-Inneren. Handle jetzt."

**Asset-Tag:** `img:high-humidity-bud-rot-risk`
**Cooldown:** 7 Tage
**Ausschluss:** K-I-01
**Recovery:** 12–24h nach RH-Korrektur (Schimmelschäden nicht reversibel)
**Telemetry:** `event.trigger=vpd_low`, `climate.rh.value`, `plant.botrytisPressure`

---

#### K-I-03 · Hitzestress — Temperatur über 30°C am Canopy

🏠 Indoor | **Cat:** CAT-3 | **Schwere:** 3

**Stages:** S2–S6

**Trigger-Logik:**
```
climate.tempCanopy > 30
AND duration > 3h
AND (equipment.light.type === "hps" OR equipment.exhaustFan.status !== "optimal")
```

**Typische Ursachen:**
- HPS/CMH-Lampen erzeugen erhebliche Strahlungswärme
- Außentemperatur steigt im Sommer und Grow-Raum wird zu warm
- Abluft-System überlastet oder ausgefallen (T-I-01, T-I-05)
- Lampe zu nah am Canopy (Kombination mit L-I-01)

**Sichtbare Symptome:**
- Blätter zeigen „praying" Verhalten (zeigen nach oben, schmal) oder Taco-Curl
- Wachstumspunkte wirken verbrannt oder verfärbt
- Blütenentwicklung stoppt (Enzyme denaturieren über 32°C)
- Terpene verdampfen sichtbar (weniger Aroma in späteren Stages)

**Häufige Fehlinterpretation:**
Spieler glaubt die Pflanze „betet" (praying) sei ein gutes Zeichen. In Maßen ist es normal — aber stark nach oben gerichtete Blätter bei gleichzeitig hoher Temperatur ist Hitzestress.

**Gegenmaßnahme:**
1. Temperatur sofort senken: Abluft maximieren, Lampe dimmen oder anheben
2. CO₂-Level prüfen: über 1000 ppm kann Hitzegrenze auf 32°C verschieben
3. Nachttemperatur prüfen: Tag-Nacht-Differenz > 10°C vermeiden
4. Für HPS: auf LED wechseln (langfristig)

**Eskalation bei Fehlentscheidung:**
- 30–32°C: Verlangsamtes Wachstum, Terpenverlust
- 32–35°C: Blüte stoppt, permanente Enzymschäden möglich
- >35°C: Akuter Zellschaden, Ertragsausfall bis 40%

**Folge-Events / Chains:** → EC-06 (Hitzewelle-Kette), W-B-05 (Kombistress Hitze + Dürre)

**Lerninhalt:**
Cannabis-Enzyme (Terpensynthasen, Cannabinoid-Synthasen) haben ein Temperaturoptimum von 24–28°C. Über 30°C beginnen diese Proteine ihre Konformation zu verlieren. Hohe Temperaturen kosten direkt Qualität und Quantität.

**Coach-Hinweis-Stil:** Sachlich-dringend. „[X]°C am Canopy ist zu heiß. Cannabis-Enzyme arbeiten optimal bei 24–28°C. Jede Stunde über 30°C kostet dich Terpene."

**Asset-Tag:** `img:heat-stress-praying`
**Cooldown:** 8 Tage
**Ausschluss:** keine
**Recovery:** 12–24h nach Temperaturkorrektur
**Telemetry:** `event.trigger=heat_stress`, `climate.tempCanopy.peak`, `plant.terpeneRisk=elevated`

---

#### K-I-04 · CO₂-Mangel in der Blüte — Photosynthese unter Potential

🏠 Indoor | **Cat:** CAT-3 | **Schwere:** 2

**Stages:** S4–S6

**Trigger-Logik:**
```
climate.co2Ppm < 600
AND plant.stage >= "early_flower"
AND equipment.light.ppfdAtCanopy > 700
AND setup.ventilation.airExchangeRate > 60 (Luftwechsel/h)
```

**Typische Ursachen:**
- Sehr hohe Abluftrate erneuert Luft so schnell, dass CO₂ nicht auf natürliches Niveau steigt
- Geschlossener Raum ohne Frischluftzufuhr
- Kein CO₂-Supplement bei hochintensivem Licht-Setup

**Sichtbare Symptome:**
- Wachstum plateaut trotz optimaler Licht-, Nährstoff- und Klimawerte
- Pflanze reagiert nicht auf erhöhtes PPFD (Lichtsättigung tritt früher ein)
- Blätter wirken „gelangweilt" — keine dynamische Reaktion auf Lichtzyklen

**Häufige Fehlinterpretation:**
Spieler sucht das Problem bei Nährstoffen oder Licht. CO₂ wird als Variable oft vergessen weil es unsichtbar ist.

**Gegenmaßnahme:**
1. Außenluft-Zufuhr sicherstellen (passives Intake öffnen)
2. Bei High-Performance-Setup: CO₂-Supplement (Beutel, Generator oder Flasche)
3. Abluftrate leicht reduzieren um CO₂ länger im Tent zu halten
4. CO₂-Pegel messen (350–450 ppm = Außenluft, Ziel mit Supplement: 1000–1200 ppm)

**Eskalation bei Fehlentscheidung:**
Kein dramatischer Schaden — aber 10–20% Ertragspotential bleibt ungenutzt bei High-PPFD-Setup

**Lerninhalt:**
CO₂ ist das Substrat der Photosynthese. Mehr Licht ohne ausreichend CO₂ ist wie ein größerer Motor ohne Benzin. Das Liebig'sche Minimumgesetz gilt: das knappste Element limitiert das Wachstum.

**Coach-Hinweis-Stil:** Bildungsorientiert. „Dein PPFD ist gut, aber dein CO₂-Level limitiert die Photosynthese. Das ist wie Gas geben mit der Handbremse."

**Asset-Tag:** `img:co2-supplementation`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** Sofort nach CO₂-Verbesserung
**Telemetry:** `event.trigger=co2_deficit`, `climate.co2Ppm.value`

---

#### K-I-05 · Kalte Nachttemperaturen — Wurzelzone friert durch

🏠 Indoor | **Cat:** CAT-3 | **Schwere:** 3

**Stages:** S0–S4 (in Blüte auch Purpling-Effekte sichtbar)

**Trigger-Logik:**
```
climate.tempNight < 17
AND setup.room.insulation === "poor"
AND season === "winter"
AND plant.rootZoneTemp < 18
```

**Typische Ursachen:**
- Grow im Keller oder unbeheiztem Raum im Winter
- Tent nicht isoliert, Außenwände kalt
- Nacht-Lüftung kühlt zu stark aus
- Wurzeln auf kaltem Betonfußboden (Wärmeleitfähigkeit)

**Sichtbare Symptome:**
- Wachstum am Morgen verlangsamt (Pflanze braucht 2–3h um hochzukommen)
- Blätter lila-violett gefärbt (Anthocyan-Produktion als Kälteschutz — kann auch Sorte sein)
- Phosphoraufnahme sinkt (P-Transport verlangsamt sich unter 18°C in der Wurzelzone)
- In S0: Keimverzögerung oder Keimstop

**Häufige Fehlinterpretation:**
Lila Farbe wird als Sortencharakter gefeiert. Der zugrundeliegende Phosphormangel durch kalte Wurzelzone wird nicht erkannt.

**Gegenmaßnahme:**
1. Heizmatte unter Topf (Rootzone auf 20–22°C halten)
2. Tent besser isolieren (Noppenfolie innen)
3. Nachttemperatur auf min. 18°C anheben
4. Kaltes Gießwasser vermeiden (W-B-02 als Kombistress)

**Eskalation bei Fehlentscheidung:**
- Unter 15°C Wurzelzone: Phosphor-Lockout, Wachstumsstopp
- Wiederholt: Chronischer Stress, schlechtes Wurzelbild
- In Blüte: N-B-01 (Phosphormangel) kann ausgelöst werden

**Folge-Events / Chains:** → N-B-01 (Phosphormangel durch kalte Wurzelzone), W-B-02

**Lerninhalt:**
Pflanzenenzyme und Nährstofftransport-Mechanismen sind temperaturabhängig. Unter 18°C in der Wurzelzone verlangsamen sich Ionenpumpen. Die Pflanze kann Nährstoffe physisch nicht aufnehmen — egal wie viel Dünger im Substrat ist.

**Coach-Hinweis-Stil:** Jahreszeit-bewusst. „Wintergrow? Dann ist die Wurzelzone dein Schwachpunkt. Check die Temperatur unterm Topf — nicht nur im Tent."

**Asset-Tag:** `img:cold-root-zone`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** 24–48h nach Erwärmung der Wurzelzone
**Telemetry:** `event.trigger=cold_rootzone`, `climate.rootZoneTemp.value`, `season=winter`

---

## CAT-1 · Wasser / Gießen — Indoor (4 Events)

> Indoor-Gießfehler entstehen fast immer durch Routine statt Reaktion.
> Der Spieler hat volle Kontrolle über Gießmenge und -zeitpunkt — das macht Fehler hier unverzeihlicher und lehrreicher.

---

#### W-I-01 · Staunässe — Topf ohne ausreichende Drainage

🏠 Indoor | **Cat:** CAT-1 | **Schwere:** 3

**Stages:** S0–S3

**Trigger-Logik:**
```
soil.moisture > 0.85
AND soil.drainageRate < 0.2
AND hours > 8
AND equipment.pot.drainageHoles === false OR soil.compaction > 0.7
```

**Typische Ursachen:**
- Topf ohne Drainage-Löcher (Anfängerfehler)
- Untersetzer zu voll — Wasser staut sich zurück
- Substrat zu dicht gepackt ohne Perlite (Luftporosität fehlt)
- Überwässerung ohne Trocken-Nass-Zyklus

**Sichtbare Symptome:**
- Blätter hängen obwohl Erde nass
- Substrat-Oberfläche wirkt grün (Algenwachstum durch dauerhafte Nässe)
- Braune, weiche Flecken an Blatträndern
- Stängelbasis wirkt weich und feucht

**Häufige Fehlinterpretation:**
Hängende Blätter = Wassermangel. Spieler gießt mehr → macht Staunässe schlimmer. Klassisches Anfänger-Paradox.

**Gegenmaßnahme:**
1. Sofort aufhören zu gießen
2. Topf auf Seite legen um Wasser abzuleiten
3. Ggf. Substrat-Wechsel in besser drainierenden Mix (30% Perlite)
4. Nächstes Gießen erst wenn Substrat oben 2–3 cm trocken ist

**Eskalation bei Fehlentscheidung:**
- 24h: Beginn von Sauerstoffmangel an Wurzeln
- 48h: Wurzelfäule (R-I-03) wird wahrscheinlich
- Parallel: Fungus Gnats (P-I-02) nutzen nasses Substrat als Brutstätte

**Folge-Events / Chains:** → R-I-03 (Wurzelfäule), P-I-02 (Fungus Gnats), EC-01 (Wurzelfäule-Spirale)

**Lerninhalt:**
Cannabis-Wurzeln brauchen Sauerstoff genauso wie Wasser. Dauerhaft nasses Substrat verdrängt Luftporen → Wurzeln ersticken. Der Trocken-Nass-Zyklus ist kein optionaler Luxus.

**Coach-Hinweis-Stil:** Klärend. „Deine Pflanze hängt — aber nicht weil sie Durst hat. Das Substrat ist zu nass. Mehr gießen würde sie töten."

**Asset-Tag:** `img:waterlogged-pot`
**Cooldown:** 12 Tage
**Ausschluss:** W-I-02
**Recovery:** 3–5 Tage nach Trocknungsphase
**Telemetry:** `event.trigger=waterlogging`, `soil.moisture.value`, `soil.oxygenLevel=low`

---

#### W-I-02 · Trockenstress — Substrat vollständig ausgetrocknet

🏠 Indoor | **Cat:** CAT-1 | **Schwere:** 3

**Stages:** S1–S5

**Trigger-Logik:**
```
soil.moisture < 0.25
AND plant.wiltingIndex > 0.6
AND hoursSinceLastWatering > 72
```

**Typische Ursachen:**
- Gießintervall zu lang; Spieler gießt nach Kalender statt nach Pflanzensignal
- Kleiner Topf trocknet schneller aus als erwartet (Sommer, hohe VPD)
- Pumpenausfall (T-I-06) → kein automatisches Gießen
- Pflanze im Stretch wächst schnell → Wasserverbrauch steigt schneller als erwartet

**Sichtbare Symptome:**
- Blätter rollen sich nach innen (Taco-Curl)
- Pflanze wirkt schlaff, Stängel hängen
- Substrat zieht sich vom Topfrand zurück (Luftspalt sichtbar)
- Topf fühlt sich sehr leicht an (Lift-Test)

**Häufige Fehlinterpretation:**
Spieler gießt sofort und zu viel → Substrat das sich vom Rand zurückgezogen hat leitet Wasser schlecht → Wasser läuft an den Seiten durch ohne Substrat zu erreichen.

**Gegenmaßnahme:**
1. Bottom-Watering: Topf in Schüssel Wasser stellen für 15–20 Min
2. Alternativ: Langsam und in kleinen Mengen mehrfach gießen
3. Lift-Test etablieren: regelmäßig Topfgewicht prüfen

**Eskalation bei Fehlentscheidung:**
- Terpenverlust in Blüte (Zellen können sich nicht erholen)
- Dauerhafter Schaden an Leitgeweben bei schwerem Stress
- Wachstumsrückstand von 2–4 Tagen

**Lerninhalt:**
Der Lift-Test ist die zuverlässigste Methode: ein frisch gegossener Topf ist schwer, ein trockener Topf leicht. Diese einfache Methode übertrifft jeden Blick-Check weil Substrat-Oberflächen täuschen können.

**Coach-Hinweis-Stil:** Methodenvermittelnd. „Heb den Topf. Fühlt er sich leicht an? Dann ist Gießen fällig. Vertraue deinen Händen, nicht deinen Augen."

**Asset-Tag:** `img:wilting-tacoed-leaves`
**Cooldown:** 8 Tage
**Ausschluss:** W-I-01
**Recovery:** 3–6h nach korrektem Re-Hydrieren
**Telemetry:** `event.trigger=drought_stress`, `soil.moisture.value`, `plant.wiltingIndex`

---

#### W-I-03 · pH-Drift durch ungechecktes Leitungswasser

🏠 Indoor | **Cat:** CAT-1 | **Schwere:** 3

**Stages:** S1–S6

**Trigger-Logik:**
```
water.source === "tap"
AND water.phChecked === false
AND water.ph > 7.2
AND player.phAdjustmentCount < 3
AND daysSinceGrow > 7
```

**Typische Ursachen:**
- Spieler nutzt Leitungswasser ohne pH-Check
- Leitungs-pH schwankt saisonal (Frühjahr/Herbst oft höher)
- Spieler hat pH-Meter aber wendet es nicht konsequent an
- Kalkhaltige Leitungen → pH steigt über Zeit

**Sichtbare Symptome:**
- Subtile Chlorose die sich nicht einem klaren Nährstoff zuordnen lässt
- pH-Runoff liegt deutlich über Eingabe-pH
- Nährstoffgaben helfen nicht (Lockout durch pH-Fehler)
- Über Zeit: Substrat alkalisiert sich → Lockout wird breiter

**Häufige Fehlinterpretation:**
Spieler sieht Mangelzeichen und sucht nach dem fehlenden Nährstoff. Düngt mehr → verschlimmert EC-Situation ohne pH-Problem zu lösen.

**Gegenmaßnahme:**
1. Gießwasser sofort messen und auf 6.2–6.4 korrigieren
2. pH-Down (Phosphorsäure) dosiert einsetzen
3. 24h stehen lassen für Chlor-Ausgasung bei Leitungswasser
4. Runoff-pH messen um Substrat-pH zu beurteilen

**Eskalation bei Fehlentscheidung:** → N-B-03 (Nährstoff-Lockout), N-I-02 (Calcium-Mangel)

**Lerninhalt:**
pH 7.5 Leitungswasser klingt harmlos — aber im Substrat akkumuliert jeder Gießvorgang Alkalität. Cannabis kann bei pH > 7.0 kein Eisen, Mangan oder Zink aufnehmen. Jeder Gießvorgang ist ein pH-Eingriff — aktiv oder passiv.

**Coach-Hinweis-Stil:** Systemisch-erklärend. „Du gießt jeden Tag — aber prüfst du jeden Tag den pH? Leitungswasser ist keine Konstante. Messe es."

**Asset-Tag:** `img:ph-meter-reading`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** 3–5 Tage nach pH-Korrektur und Flush
**Telemetry:** `event.trigger=tap_water_ph_drift`, `water.ph.value`, `water.phChecked=false`

---

#### W-I-04 · Salzaufbau im Substrat — EC-Buildup durch Überdüngung

🏠 Indoor | **Cat:** CAT-1 | **Schwere:** 3

**Stages:** S2–S6

**Trigger-Logik:**
```
soil.ecRunoff > soil.ecFeed + 1.0
AND player.flushCount === 0
AND daysSinceGrow > 21
AND nutrient.weeklyDoseAvg > recommended * 1.2
```

**Typische Ursachen:**
- Zu hohe Nährstoffdosen über mehrere Wochen ohne Flush
- Bewässerung zu knapp → nicht genug Wasser spült Salze aus
- Verwendung von Mineraldünger der schnell Salze aufbaut
- Spieler liest Runoff-EC nicht

**Sichtbare Symptome:**
- Runoff-EC deutlich höher als Eingabe-EC (Salze akkumulieren)
- Weiße Salzablagerungen auf Substrat-Oberfläche oder Topfrand
- Blattränder braun und trocken (Nährstoff-Burn ohne neue Düngung)
- Wurzelspitzen braun (mikroskopisch)

**Häufige Fehlinterpretation:**
Spieler sieht Blattränder und denkt er muss mehr düngen. Das Gegenteil ist richtig — zu viel Salz im Substrat entzieht Wasser osmotisch aus den Wurzeln.

**Gegenmaßnahme:**
1. Flush mit dem 2–3-fachen Topfvolumen pH-korrigiertem Wasser
2. Runoff-EC nach Flush messen → Ziel: unter 1.0
3. Düngung neu aufbauen mit 50% der bisherigen Dosis
4. Zukünftig: wöchentlich Runoff-EC messen

**Eskalation bei Fehlentscheidung:** → W-B-01 (EC-Anstieg), R-I-03 (Wurzelschäden durch osmotischen Stress)

**Lerninhalt:**
Osmotischer Stress durch Salz-Buildup ist reversibel — aber nur wenn rechtzeitig geflushst wird. Die Pflanze verliert Wasser an das Substrat (umgekehrte Osmose), weil die Salzkonzentration außen höher ist als in der Wurzel. Das ist wie Durst beim Meerwassertrinken.

**Coach-Hinweis-Stil:** Chemisch-anschaulich. „Dein Runoff-EC ist [X], aber du gibst nur [Y]. Das bedeutet Salze sammeln sich. Ein Flush jetzt verhindert dauerhaften Wurzelschaden."

**Asset-Tag:** `img:salt-buildup-substrate`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 3–5 Tage nach Flush und Neuaufbau
**Telemetry:** `event.trigger=salt_buildup`, `soil.ecRunoff.value`, `nutrient.accumulationScore`

---

## CAT-2 · Nährstoffe — Indoor (2 Events)

> Die Indoor-spezifischen Nährstoff-Events drehen sich um Fehler die durch direkte Kontrolle entstehen:
> zu viel, zur falschen Zeit, mit dem falschen Messwerkzeug.
> Allgemeine Nährstoff-Events (Lockout, Mg-Mangel etc.) sind in `03_shared-events.md`.

---

#### N-I-01 · Stickstoff-Überdosierung — Claw-Leaves und Blüteverzögerung

🏠 Indoor | **Cat:** CAT-2 | **Schwere:** 3

**Stages:** S1–S4

**Trigger-Logik:**
```
nutrient.nitrogenRatio > 2.5
AND plant.stage >= "preflower"
AND player.nutrientProfileChanged === false
AND daysSinceStageChange > 5
```

**Typische Ursachen:**
- Spieler verwendet Veg-Dünger weiter in der Blüte
- Hochstickstoffhaltige Erde in Kombination mit Flüssigdünger
- Spieler erhöht Düngerdosis linear ohne N-P-K-Ratio zu berücksichtigen
- „Grow" und „Bloom" Dünger werden verwechselt

**Sichtbare Symptome:**
- Blätter „clawen" sich nach unten (klassisches N-Tox-Zeichen)
- Extrem dunkelgrüne, glänzende Blätter
- Blütenentwicklung verlangsamt sich oder stoppt
- Neue Triebe wachsen schnell aber produzieren keine Blütenknospen

**Häufige Fehlinterpretation:**
Dunkles Grün = gesunde Pflanze. Spieler ist stolz auf das intensive Grün und erkennt das Problem nicht.

**Gegenmaßnahme:**
1. Sofort auf Bloom-Dünger mit niedrigem N-Anteil wechseln
2. Leichten Flush durchführen um Stickstoffsalze zu reduzieren
3. Düngepause 3–5 Tage und Pflanze beobachten

**Eskalation bei Fehlentscheidung:**
- Blüte verzögert sich 5–10 Tage
- Buds bleiben klein und wenig aromatisch
- Haarknospen entwickeln sich kaum weiter

**Lerninhalt:**
N-P-K ist kein festes Verhältnis — es ändert sich mit dem Stadium. Veg: hohes N für Blattmasse. Blüte: niedriges N, hohes P und K für Bud-Entwicklung. Derselbe Dünger in beiden Phasen ist einer der häufigsten Anfängerfehler.

**Coach-Hinweis-Stil:** Direkt-korrigierend. „Deine Pflanze nimmt zu viel Stickstoff auf — erkennbar an den nach-unten-geclawten Blättern. Wechsel jetzt auf Bloom-Dünger."

**Asset-Tag:** `img:nitrogen-claw`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 5–7 Tage nach Düngerwechsel
**Telemetry:** `event.trigger=nitrogen_toxicity`, `nutrient.nitrogenRatio.value`

---

#### N-I-02 · Calcium-Mangel bei weichem Wasser — Strukturschäden

🏠 Indoor | **Cat:** CAT-2 | **Schwere:** 3

**Stages:** S2–S5

**Trigger-Logik:**
```
water.hardness < 150 (ppm CaCO3)
AND nutrient.calMagSupplement === false
AND plant.stage >= "veg"
AND climate.co2Ppm > 700
```

**Typische Ursachen:**
- Osmosewasser oder sehr weiches Leitungswasser ohne Ca/Mg-Supplement
- Spieler nutzt generischen Flüssigdünger ohne Ca-Anteil
- Erhöhter Ca-Bedarf bei hohem CO₂ und PPFD (schnelleres Wachstum = mehr Ca)
- pH zu niedrig (unter 6.0) blockiert Ca-Aufnahme trotz Verfügbarkeit

**Sichtbare Symptome:**
- Junge Blätter (neue Triebe) zeigen braune Nekrose-Punkte
- Blattkanten verformen sich und rollen sich ein
- Neue Blätter bleiben klein und verformt (Wachstumspunkte betroffen)
- Stängel wirken weniger stabil (Ca ist Zellwand-Bestandteil)

**Häufige Fehlinterpretation:**
Braune Punkte auf neuen Blättern werden mit Schädlingen verwechselt. Spieler sucht nach Insekten statt den Nährstoffstatus zu prüfen.

**Gegenmaßnahme:**
1. Cal-Mag-Supplement zugeben (1–3 ml/L je nach Wasserhärte)
2. pH auf 6.2–6.4 korrigieren für optimale Ca-Aufnahme
3. Bei Osmosewasser: immer Cal-Mag als Basisergänzung

**Eskalation bei Fehlentscheidung:**
- Wachstumspunkte werden dauerhaft beschädigt
- In Blüte: Bud-Struktur leidet (Ca ist für Zellwandaufbau wichtig)
- Kombination mit hohem CO₂: Bedarf steigt weiter ohne Deckung

**Lerninhalt:**
Calcium ist ein mobiles Element im Wasser, aber immobil in der Pflanze — einmal eingebaut bleibt es. Neue Blätter zeigen Mangel weil Ca nicht aus alten Blättern umverteilt werden kann. Weiches Wasser ist per se gut für Cannabis — aber nur mit Cal-Mag-Supplement.

**Coach-Hinweis-Stil:** Diagnostisch-präzise. „Neue Blätter zeigen Nekrosen — das ist fast immer Calcium. Prüf dein Wasser: unter 150 ppm Wasserhärte bedeutet Cal-Mag ist Pflicht."

**Asset-Tag:** `img:calcium-deficiency`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 5–7 Tage (alte Schäden bleiben, neue Blätter wachsen gesund)
**Telemetry:** `event.trigger=calcium_deficiency`, `water.hardness.value`, `nutrient.calMag=false`


---

## CAT-5 · Wurzelzone / Medium — Indoor (3 Events)

> Indoor-Wurzelprobleme entstehen durch begrenzte Topfgröße, falsches Substrat und mangelnde Hygiene.
> Die Wurzel ist unsichtbar — aber der Spieler lernt hier, aus indirekten Signalen zu schließen.

---

#### R-I-01 · Rootbound — Topf zu klein, Wurzeln ohne Raum

🏠 Indoor | **Cat:** CAT-5 | **Schwere:** 3

**Stages:** S2–S4

**Trigger-Logik:**
```
plant.rootMass > pot.volume * 0.85
AND plant.growthRate < plant.expectedGrowthRate * 0.5
AND player.repotCount === 0
AND daysSinceGrow > 25
```

**Typische Ursachen:**
- Spieler startet Grow in zu kleinem Topf und vergisst das Umtopfen
- Vergisst dass Topfgröße direkten Einfluss auf Pflanzengröße hat
- Preflower-Stretch trifft auf vollgefüllten Wurzelraum

**Sichtbare Symptome:**
- Wachstum verlangsamt sich plötzlich ohne erkennbare Ursache
- Pflanze muss täglich gegossen werden (Wurzeln verbrauchen gesamte Feuchtigkeit sehr schnell)
- Runoff kommt sehr schnell (Substrat bereits zu kompakt für Wasserspeicherung)
- Sichtbare Wurzeln aus Topfboden-Löchern

**Häufige Fehlinterpretation:**
Spieler denkt die Pflanze wächst langsam weil sie krank ist. Erhöht Düngung oder Licht — ohne Effekt.

**Gegenmaßnahme:**
1. Umtopfen in 2× größeren Topf
2. Frisches, lockeres Substrat verwenden
3. Nach Umtopfen: Gieß-Stress gering halten, 2–3 Tage kein Dünger

**Eskalation bei Fehlentscheidung:**
- Pflanze bleibt deutlich kleiner als Potential
- Ertrag 30–50% unter Sortenpotential
- Stress durch Rootbound erhöht Anfälligkeit für andere Events

**Lerninhalt:**
Cannabis-Wurzeln suchen aktiv nach Raum. Wenn sie keinen finden, stoppen sie das Signal ans Canopy für weiteres Wachstum. Topfgröße ist Wachstumspotential — ein 5L-Topf macht aus jeder Sorte eine Zwergpflanze.

**Coach-Hinweis-Stil:** Pragmatisch-handlungsorientiert. „Deine Pflanze hat keinen Platz mehr. Schau unten aus dem Topf — siehst du Wurzeln? Dann ist jetzt Umtopfen."

**Asset-Tag:** `img:rootbound-circling`
**Cooldown:** — (einmalig pro Grow, dann Pot-Upgrade)
**Ausschluss:** keine
**Recovery:** 3–5 Tage Wachstumsbeschleunigung nach Umtopfen
**Telemetry:** `event.trigger=rootbound`, `plant.rootMassRatio`, `player.repotCount`

---

#### R-I-02 · Substrat verdichtet — Luftporosität verloren

🏠 Indoor | **Cat:** CAT-5 | **Schwere:** 2

**Stages:** S2–S5

**Trigger-Logik:**
```
soil.compaction > 0.75
AND soil.airPorosity < 0.15
AND plant.rootGrowthRate < expected * 0.4
AND setup.substrateType === "heavy_soil"
```

**Typische Ursachen:**
- Substrat ohne Perlite oder andere Auflockerungsmittel
- Zu häufiges Gießen verdichtet Substrat über Zeit
- Substrat wurde beim Befüllen zu stark gedrückt
- Schweres Substrat (hoher Ton-Anteil) ohne Drainage-Zusatz

**Sichtbare Symptome:**
- Wasser läuft langsam durch (dauert länger als 60 Sekunden bis Runoff erscheint)
- Substrat trocknet sehr langsam (anaerobe Zonen entstehen)
- Pflanzenwachstum zieht sich in die Breite statt in die Tiefe
- Substrat-Oberfläche hart und verkrustet

**Häufige Fehlinterpretation:**
Langsamer Runoff wird als „gute Wasserhaltefähigkeit" interpretiert. Spieler freut sich über weniger Gießen — ohne zu wissen dass die Wurzeln ersticken.

**Gegenmaßnahme:**
1. Oberfläche vorsichtig lockern (nur 1–2 cm tief)
2. Beim nächsten Umtopfen: 20–30% Perlite beimengen
3. Gieß-Frequenz senken um Kompaktierung zu verlangsamen
4. Kurzfristig: Stabhygrometer verwenden um Feuchtigkeit in verschiedenen Tiefen zu messen

**Eskalation bei Fehlentscheidung:** → W-I-01 (Staunässe durch schlechte Drainage), R-I-03 (Wurzelfäule)

**Lerninhalt:**
Cannabis-Wurzeln brauchen Luft. Das ideale Substrat hat 25–30% Luftporosität. Verdichtetes Substrat hat weniger als 10%. Der Unterschied ist der zwischen aktiven, weißen Wurzeln und braunen, erstickenden Wurzeln.

**Coach-Hinweis-Stil:** Substrat-edukativ. „Wie lange dauert es bis Wasser unten rauskommt? Über 60 Sekunden bedeutet dein Substrat ist zu dicht. Perlite ist die Lösung."

**Asset-Tag:** `img:compacted-soil`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** Langsam — erst beim nächsten Umtopfen vollständig lösbar
**Telemetry:** `event.trigger=soil_compaction`, `soil.airPorosity.value`

---

#### R-I-03 · Wurzelfäule (Pythium) — Stille Katastrophe

🏠 Indoor | **Cat:** CAT-5 | **Schwere:** 5

**Stages:** S1–S5

**Trigger-Logik:**
```
soil.moisture > 0.80 AND duration > 24h
AND soil.oxygenLevel < 0.15
AND climate.rootZoneTemp > 24
OR rootHealth.pythiumPressure > 0.7
```

*(Häufig als Folge von W-I-01 oder R-I-02)*

**Typische Ursachen:**
- Chronische Staunässe (W-I-01 unbehandelt)
- Zu hohe Wassertemperatur im Reservoir (Hydro)
- Kontaminiertes Substrat oder Werkzeug
- Pythium-Sporen überleben in ungereinigten Töpfen

**Sichtbare Symptome:**
- Pflanze hängt trotz nasser Erde (klassisches Signal)
- Wurzeln braun, schleimig und riechen faulig (Sauerstoffmangel + Pilzbefall)
- Stängelbasis kann braun und weich werden
- In fortgeschrittenem Stadium: Pflanze kollabiert

**Häufige Fehlinterpretation:**
Spieler sucht Problem oberhalb des Substrats. Untersucht Blätter, prüft Nährstoffe, misst pH. Die Wurzeln werden nicht kontrolliert weil „man sie nicht sieht".

**Gegenmaßnahme:**
1. Pflanze aus Topf nehmen und Wurzeln untersuchen
2. Braune Wurzelbereiche abschneiden (sterile Schere)
3. Wasserstoffperoxid-Lösung (3%) auf Wurzeln auftragen
4. In frisches, trockenes Substrat umtopfen
5. Trichoderma-Supplement (biologischer Gegenspieler von Pythium)
6. Gießmenge radikal reduzieren

**Eskalation bei Fehlentscheidung:**
- Unbehandelt: Pflanze stirbt innerhalb 3–5 Tage nach sichtbaren Symptomen
- Pythtium ist hochkontagiös — kann auf benachbarte Pflanzen überspringen
- Werkzeug und Töpfe müssen desinfiziert werden

**Folge-Events / Chains:** → EC-01 (Wurzelfäule-Spirale), Pflanzentod möglich

**Lerninhalt:**
Pythium ist ein Oomycet (Schimmelpilz-ähnlicher Organismus) der bei warmem, nassen, sauerstoffarmen Substrat explosionsartig wächst. Prävention durch Trocken-Nass-Zyklen ist 100× einfacher als Behandlung. Gesunde Wurzeln sind weiß und fest — das ist das Ziel.

**Coach-Hinweis-Stil:** Ernst und direkt. „Braune, schleimige Wurzeln bedeuten Pythium-Befall. Das ist eine der schlimmsten Diagnosen im Indoor-Grow. Handl sofort — Minuten können entscheidend sein."

**Asset-Tag:** `img:root-rot-pythium`
**Cooldown:** 21 Tage
**Ausschluss:** keine
**Recovery:** Nur wenn früh erkannt — 7–14 Tage intensive Pflege; spät = Verlust wahrscheinlich
**Telemetry:** `event.trigger=root_rot`, `rootHealth.pythiumPressure`, `event.severity=critical`

---

## CAT-6 · Schädlinge / Krankheiten — Indoor (3 Events)

> Indoor-Schädlinge sind gefährlicher als Outdoor-Schädlinge weil sie keine natürlichen Feinde haben.
> Einmal im Tent = Ausbruch ohne externe Kontrolle.
> Früherkennung und schnelles Handeln sind entscheidend.

---

#### P-I-01 · Spinnmilben — Unsichtbarer Feind

🏠 Indoor | **Cat:** CAT-6 | **Schwere:** 4

**Stages:** S2–S6

**Trigger-Logik:**
```
climate.rh < 40 AND climate.temp > 26
AND daysSinceLastInspection > 7
AND pestPressure.spiderMite > 0.3
```

**Typische Ursachen:**
- Neue Pflanze oder Steckling ohne Quarantäne eingebracht
- Werkzeug oder Hände von anderen Pflanzen kontaminiert
- Trockenes, heißes Klima begünstigt schnelle Vermehrung (ideal: < 40% RH, > 26°C)
- Grow-Raum nicht ausreichend gereinigt nach letztem Run

**Sichtbare Symptome:**
- Kleine gelbe oder weiße Punkte auf Blättern (Stippling)
- Feine Spinnweben zwischen Blättern und Stängeln
- Blätter wirken stumpf und verfärben sich gelblich
- Pflanzenkraft sinkt merklich

**Häufige Fehlinterpretation:**
Gelbe Punkte werden als Nährstoffmangel (Magnesium?) interpretiert. Spieler düngt nach. Spinnmilbenpopulation wächst unbehelligt.

**Gegenmaßnahme:**
1. Sofort isolieren: andere Pflanzen schützen
2. Blattunterseiten prüfen (Milben leben dort)
3. Behandlung: Neem-Öl, Räuber-Milben (Phytoseiidae), oder Kaliseife-Spray
4. Mehrere Behandlungsrunden (7-Tage-Intervall um Eier zu erfassen)
5. RH erhöhen auf > 50% (verhindert schnelle Vermehrung)

**Eskalation bei Fehlentscheidung:**
- Woche 1: lokaler Befall
- Woche 2: Kolonie explodiert; gesamtes Canopy befallen
- Woche 3: Pflanzenschäden kritisch; in Blüte: Ernte gefährdet
- → EC-05 (Spinnmilben-Ausbruch-Kette)

**Folge-Events / Chains:** → EC-05

**Lerninhalt:**
Eine Spinnmilbe legt bis zu 200 Eier in 2 Wochen. Die Eier sind resistenter gegen Behandlung als Erwachsene. Deshalb: 3 Behandlungsrunden im 5–7-Tage-Abstand um alle Generationen zu erfassen. Prävention durch Quarantäne neuer Pflanzen ist der einzige sichere Schutz.

**Coach-Hinweis-Stil:** Biologisch-strategisch. „Siehst du Stippling? Schau auf die Blattunterseite. Spinnmilben sind klein — aber ihre Schäden sind groß wenn du wartest. Eine Behandlung reicht nie."

**Asset-Tag:** `img:spider-mite-webbing`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 2–3 Wochen konsequente Behandlung
**Telemetry:** `event.trigger=spider_mite_infestation`, `pestPressure.spiderMite.level`

---

#### P-I-02 · Fungus Gnats / Trauermücken — Larvenschaden an Wurzeln

🏠 Indoor | **Cat:** CAT-6 | **Schwere:** 3

**Stages:** S0–S4 (Larven befallen junge Wurzeln; schlimmer bei kleinen Pflanzen)

**Trigger-Logik:**
```
soil.moisture > 0.75 AND soil.moistureSurface > 0.60
AND plant.stage <= "veg"
AND pestPressure.fungusGnat > 0.2
```

**Typische Ursachen:**
- Chronisch nasses Substrat (W-I-01 begünstigt stark)
- Kontaminiertes Substrat aus der Tüte (Eier bereits drin)
- Oberfläche des Substrats trocknet nie aus
- Substrat mit hohem organischen Anteil (Kompost)

**Sichtbare Symptome:**
- Kleine schwarze Fliegen um die Topf-Oberfläche
- Pflanze wächst langsamer als erwartet (Larven fressen Wurzelspitzen)
- Gelbliche untere Blätter ohne klaren Nährstoffmangel-Grund
- Gelbe Klebesticker zeigen Fliegen-Fang

**Häufige Fehlinterpretation:**
„Ein paar Fliegen, kein Problem." Die Fliegen selbst sind harmlos — die Larven im Substrat sind das eigentliche Problem.

**Gegenmaßnahme:**
1. Oberfläche trocknen lassen (2–3 cm sandige Schicht auf Substrat)
2. Bacillus thuringiensis israelensis (Bti) als Gießlösung (tötet Larven biologisch)
3. Gelbe Klebesticker aufhängen
4. Nematoden (Steinernema feltiae) bei starkem Befall
5. Gießvolumen reduzieren

**Eskalation bei Fehlentscheidung:**
- Leichter Befall: verlangsamtes Wurzelwachstum
- Starker Befall: Wachstumsstopp, Anfälligkeit für R-I-03 (Pythium)
- Kombination nasses Substrat + Gnats: klassischer Spiralabstieg

**Lerninhalt:**
Fungus Gnats brauchen nasses Substrat. Das ist ihre einzige Bedingung. Die einfachste Prävention: Substrat-Oberfläche immer austrocknen lassen. Keine Nässe oben = kein Lebensraum für Eiablage.

**Coach-Hinweis-Stil:** Pragmatisch-biologisch. „Die Fliegen selbst sind kein Problem. Aber ihre Larven fressen deine Wurzeln. Bekämpfe sie im Boden, nicht in der Luft."

**Asset-Tag:** `img:fungus-gnat-larvae`
**Cooldown:** 12 Tage
**Ausschluss:** keine
**Recovery:** 2–3 Wochen bis Larvenpopulation abgebaut
**Telemetry:** `event.trigger=fungus_gnats`, `soil.moisture.surface`, `pestPressure.gnat.level`

---

#### P-I-03 · Echter Mehltau Indoor — Weißer Puder auf Blättern

🏠 Indoor | **Cat:** CAT-6 | **Schwere:** 3

**Stages:** S2–S5

**Trigger-Logik:**
```
climate.rh > 60 AND climate.rh < 80
AND climate.tempDay > 20 AND climate.tempDay < 26
AND climate.airCirculation === "poor"
AND daysSinceLastInspection > 5
```

**Typische Ursachen:**
- Stagnante Luft ohne Zirkulation (T-I-01 als Ursache)
- RH in Mehltau-Komfortzone (60–80%)
- Sporen eingeschleppt durch Kleidung oder Werkzeug
- Dichte Blattmasse ohne Defoliation → schlechte Luftzirkulation im Canopy

**Sichtbare Symptome:**
- Weißer, pudriger Belag auf Blattoberflächen (sieht aus wie Mehl)
- Beginnt auf oberen Blättern, breitet sich aus
- Befallene Blätter gelbeln darunter
- Nicht zu verwechseln mit Trichomen (Trichome sind auf Blütennähe konzentriert)

**Häufige Fehlinterpretation:**
Weißer Puder = „Das sind doch schon Trichome?" Spieler handelt nicht. Mehltau breitet sich aus.

**Gegenmaßnahme:**
1. Befallene Blätter sofort entfernen und entsorgen (nicht im Tent)
2. Kaliumbicarbonat-Spray (Natriumbicarbonat funktioniert auch)
3. Luftzirkulation massiv erhöhen
4. RH unter 50% senken
5. Alternativ: verdünntes Wasserstoffperoxid-Spray

**Eskalation bei Fehlentscheidung:**
- Woche 1: lokaler Befall auf einigen Blättern
- Woche 2: Befall greift auf Buds über → kritisch (Ernte nicht mehr verwertbar)
- Unbehandelt in S5–S6: gesamte Ernte kontaminiert

**Lerninhalt:**
Echter Mehltau (Podosphaera xanthii bei Cannabis) ist ein Ascomycet der Luft braucht und Wasser liebt. Er wächst auf der Blattoberfläche, nicht im Gewebe — daher ist er gut behandelbar wenn früh erkannt. Prävention: Luft bewegen, Canopy öffnen, RH kontrollieren.

**Coach-Hinweis-Stil:** Erkennungs-orientiert. „Siehst du weißen Puder? Reib einen Fleck mit dem Finger — wenn er sich verteilt, ist es Mehltau. Handle jetzt bevor er die Buds erreicht."

**Asset-Tag:** `img:powdery-mildew`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 1–2 Wochen konsequente Behandlung
**Telemetry:** `event.trigger=powdery_mildew`, `climate.rh.value`, `pestPressure.pm.level`

---

## CAT-8 · Training / Pflanzenstruktur — Indoor (3 Events)

> Indoor-Training ist Investition mit Risiko. Zu wenig Training → schlechte Lichtausnutzung.
> Zu viel → Stressakkumulation und Wachstumsstop.
> Events modellieren die Konsequenzen beider Extrema.

---

#### TR-I-01 · LST-Stress nach aggressivem Biegen

🏠 Indoor | **Cat:** CAT-8 | **Schwere:** 2

**Stages:** S1–S3

**Trigger-Logik:**
```
training.lstEventCount > 0
AND training.bendAngle > 60
AND plant.stressAccumulation > 40
AND plant.recoveryDays < 2
```

**Typische Ursachen:**
- Haupttrieb zu stark gebogen (über 60° in einem Zug)
- Zu viele LST-Maßnahmen in zu kurzer Zeit ohne Erholungspause
- Stängel noch nicht dick genug für starkes Biegen

**Sichtbare Symptome:**
- Wachstum pausiert für 1–2 Tage nach aggressivem Biegen
- Gebogener Stängel zeigt leichte Stressverfärbung
- Pflanze „schaut" kurz nach unten statt nach oben
- Neue Triebe brauchen einen Tag länger bis sie die Lichtrichtung anpassen

**Häufige Fehlinterpretation:**
Spieler denkt er hat die Pflanze irreparabel beschädigt. Gibt zu früh auf oder macht alles rückgängig.

**Gegenmaßnahme:**
1. Keine weiteren Training-Aktionen für 2–3 Tage
2. Gebogenen Stängel unterstützen wenn er stark unter Druck steht
3. Normales Gießen und Klima beibehalten — keine weitere Intervention

**Eskalation bei Fehlentscheidung:**
Weiteres Training während Erholung → Stressakkumulation wächst → TR-B-01 (Übertraining)

**Folge-Events / Chains:** → TR-B-01 (bei Fortsetzung)

**Lerninhalt:**
LST ist keine einmalige Aktion — es ist ein Dialog mit der Pflanze. Sie reagiert auf jede Biegung mit Hormonsignalen die 24–48h brauchen um zu verarbeiten. Geduld nach LST ist genauso wichtig wie die LST selbst.

**Coach-Hinweis-Stil:** Beruhigend-erklärend. „Deine Pflanze pausiert kurz — das ist normal nach starkem Biegen. Lass ihr 2 Tage. Sie erholt sich. Mach jetzt nichts anderes."

**Asset-Tag:** `img:lst-stress-recovery`
**Cooldown:** 7 Tage
**Ausschluss:** keine
**Recovery:** 2–3 Tage automatisch
**Telemetry:** `event.trigger=lst_stress`, `training.bendAngle`, `plant.stressAccumulation`

---

#### TR-I-02 · Topping-Timing falsch — Zu früh oder zu spät

🏠 Indoor | **Cat:** CAT-8 | **Schwere:** 2

**Stages:** S1–S2 (zu früh: S0–S1) / S3 (zu spät)

**Trigger-Logik:**
```
(training.toppingPerformed AND plant.nodeCount < 4)
OR (training.toppingPerformed AND plant.stage >= "preflower")
```

**Typische Ursachen:**
- Zu frühes Topping: Spieler toppt bereits beim 3. Nodenpaar → Pflanze hat zu wenig Reserve
- Zu spätes Topping: Spieler toppt in Preflower → Pflanze ist zu stressiert für Erholung vor Blüte

**Sichtbare Symptome bei zu frühem Topping:**
- Sehr langsame Erholung; Pflanze wirkt mehrere Tage stagniert
- Neues Wachstum klein und schwach

**Sichtbare Symptome bei zu spätem Topping:**
- Pflanze streckt stark; Buds auf Haupt- und Seitentrieben ungleich
- Recovery-Stress verlängert Blüte

**Häufige Fehlinterpretation:**
„Toppen ist toppen — egal wann." Timing ist jedoch entscheidend für den Outcome.

**Gegenmaßnahme bei zu frühem Topping:**
1. Pflanze in Ruhe lassen; Extra Pflege; kein weiterer Eingriff
2. Wachstum wird sich in 5–7 Tagen normalisieren

**Gegenmaßnahme bei zu spätem Topping:**
1. Schere zurücklegen — in Preflower ist Topping meistens zu spät
2. LST als Kompromiss: Haupttrieb biegen statt abschneiden

**Lerninhalt:**
Topping-Fenster ist 5.–7. Nodenpaar. Früher = zu wenig Wurzel- und Energiereserven. Später = zu nah an Blüte für vollständige Erholung. Dieses Fenster existiert weil die Pflanze in diesem Stadium gerade genug Masse hat um den Stress zu kompensieren.

**Coach-Hinweis-Stil:** Timing-bewusst. „Topping ist mächtig — aber nur zum richtigen Zeitpunkt. Das Fenster ist das 5.–7. Nodenpaar. Außerhalb davon kostet es mehr als es bringt."

**Asset-Tag:** `img:topping-timing`
**Cooldown:** — (einmaliges Event pro Topping-Aktion)
**Ausschluss:** keine
**Recovery:** 5–10 Tage je nach Zeitpunkt
**Telemetry:** `event.trigger=topping_mistimed`, `plant.nodeCount`, `plant.stage`

---

#### TR-I-03 · Lollipopping zu spät — Beschattung und Energieverlust

🏠 Indoor | **Cat:** CAT-8 | **Schwere:** 2

**Stages:** S4–S5

**Trigger-Logik:**
```
plant.lowerCanopy.shadingIndex > 0.70
AND plant.stage >= "early_flower"
AND training.lollipopPerformed === false
AND daysSinceFlowerStart > 14
```

**Typische Ursachen:**
- Spieler hat nie Lollipopping gemacht oder es zu lange aufgeschoben
- Zu viele untere Äste die niemals Licht bekommen → verbrauchen Energie ohne Ertrag
- Spieler macht Lollipopping in S5+ → Defoliation in der Hauptblütephase zu stressig

**Sichtbare Symptome:**
- Untere Äste produzieren kleine, schwache „Popcorn-Buds"
- Hauptbuds wachsen langsamer als erwartet (Energie wird verteilt)
- Luft im Canopy schlecht → erhöhtes Schimmelrisiko unten

**Häufige Fehlinterpretation:**
Spieler sieht viele Buds und denkt mehr ist besser. Kleine unbelichtete Buds sind aber Energie-Sinks, keine Ertragsquellen.

**Gegenmaßnahme:**
1. Wenn noch in S4: Lollipopping durchführen (untere 30% der Pflanze entlasten)
2. In S5: nur selektive Entnahme einzelner blockierender Blätter — keine radikale Defoliation
3. Zukünftig: Lollipopping im letzten Drittel der Veg-Phase oder zu Beginn S4

**Eskalation bei Fehlentscheidung:**
- Popcorn-Buds verbrauchen 15–25% der verfügbaren Pflanzenergie
- Schimmelrisiko durch schlechte Luftzirkulation unten steigt

**Lerninhalt:**
Lollipopping folgt dem Prinzip: Energie fokussieren statt verteilen. Untere Äste die nie direkt beleuchtet werden produzieren nie hochwertige Buds — sie verbrauchen nur. Wer früh lollipopped investiert in die Qualität der oberen Buds.

**Coach-Hinweis-Stil:** Strategisch-sachlich. „Sieh nach unten — diese kleinen Äste kosten dich Energie die deine Top-Buds brauchen. Lollipopping jetzt ist noch sinnvoll. Warte nicht auf S5."

**Asset-Tag:** `img:lollipopping-popcorn`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 3–5 Tage nach korrekter Defoliation
**Telemetry:** `event.trigger=lollipopping_late`, `plant.lowerCanopy.shadingIndex`

---

## CAT-9 · Blüte / Erntequalität — Indoor (3 Events)

> Indoor-Ernte-Events drehen sich um Timing, Qualitätssicherung und die erste Verarbeitungsphase.
> Fehler hier sind besonders schmerzhaft weil 60+ Grow-Tage auf dem Spiel stehen.

---

#### B-I-01 · Vorzeitiger Flush — Pflanze verhungert vor der Ernte

🏠 Indoor | **Cat:** CAT-9 | **Schwere:** 3

**Stages:** S5–S6

**Trigger-Logik:**
```
player.flushStarted === true
AND plant.trichomeRipeness < 0.6
AND plant.stage === "mid_flower"
AND daysUntilOptimalHarvest > 14
```

**Typische Ursachen:**
- Spieler liest Sortenangabe (z.B. „8 Wochen Blüte") und flushed exakt am Tag 56
- Versteht nicht dass Flush-Start sich nach Trichomreife richtet, nicht nach Kalender
- Verwechslung von „8 Wochen Blütezeit" mit „Gesamtgrow-Dauer"

**Sichtbare Symptome:**
- Blätter gelbeln aggressiv und früher als erwartet
- Buds hören auf zu wachsen obwohl Trichome noch nicht reif sind
- Pflanze „kannibaliert" sich selbst: baut Chlorophyll ab weil keine Nährstoffe mehr kommen

**Häufige Fehlinterpretation:**
Starkes Vergilben = Ernte steht unmittelbar bevor. Spieler erntet — aber Trichome sind noch trüb/klar, nicht amber.

**Gegenmaßnahme:**
1. Sofort leichte Nährstoffdosis geben (halbe Konzentration) um Vergilben zu stoppen
2. Trichome unter Mikroskop oder Lupe prüfen — Entscheidungsgrundlage für Ernte
3. Flush erst wenn 10–20% amber Trichome sichtbar

**Eskalation bei Fehlentscheidung:**
- Ernte zu früh: 20–40% weniger Wirkstoffgehalt; Aroma nicht vollständig entwickelt
- Buds bauen Masse ab statt auf

**Lerninhalt:**
Flush ist Vorbereitung auf Ernte — nicht der Startschuss. Die Pflanze soll in den letzten 7–10 Tagen Nährstoffreserven abbauen um ein saubereres Endprodukt zu haben. Aber erst wenn die Trichome Reife zeigen. Mikroskop > Kalender.

**Coach-Hinweis-Stil:** Timing-korrigierend. „Du hast zu früh geflusht. Deine Trichome sagen noch nicht 'Erntezeit'. Gib eine leichte Nährstoffdosis und prüfe in 7 Tagen wieder."

**Asset-Tag:** `img:premature-flush`
**Cooldown:** — (einmaliges Event pro Grow)
**Ausschluss:** keine
**Recovery:** Partiell — Buds können weiter reifen aber mit reduzierter Effizienz
**Telemetry:** `event.trigger=premature_flush`, `plant.trichomeRipeness.value`, `event.harvestRisk=true`

---

#### B-I-02 · Hermaphroditen-Entwicklung — Pollensäcke in Blüten

🏠 Indoor | **Cat:** CAT-9 | **Schwere:** 5

**Stages:** S4–S6

**Trigger-Logik:**
```
plant.stressAccumulation > 80
OR setup.lightLeak.detected === true
OR plant.geneticHermRisk === "high"
AND plant.stage >= "early_flower"
```

**Typische Ursachen:**
- Lichtleck in Dunkelphase (T-I-03 oder L-I-03 unbehandelt)
- Massive Stressakkumulation (Hitze, Überdüngung, Übertraining)
- Genetische Prädisposition (feminisierte Samen unter Stress)
- pH-Extremwerte über längere Zeit

**Sichtbare Symptome:**
- Kleine, bananenförmige gelbe Gebilde zwischen Blütenblättern (Nanners/Bananen)
- Kleine grüne Pollensäcke die sich von echten Blütenkelchen unterscheiden
- Pollenwolke bei mechanischer Berührung

**Häufige Fehlinterpretation:**
Gelbe Bananen werden für normale Blütenentwicklung gehalten. Pollensäcke werden nicht als solche erkannt.

**Gegenmaßnahme:**
1. Sofort: Pollensäcke und Nanners mit einer Pinzette entfernen (ohne zu drücken!)
2. Lichtleck prüfen und beheben wenn vorhanden
3. Stress-Quellen identifizieren und eliminieren
4. Bei massivem Befall: Ernte-Notfall erwägen um Fremdbestäubung zu verhindern

**Eskalation bei Fehlentscheidung:**
- Offene Pollensäcke bestäuben eigene Blüten → Samen-Produktion beginnt
- Samen reduzieren Qualität und Wirkstoffgehalt massiv
- In Grow-Raum mit mehreren Pflanzen: alle Pflanzen gefährdet

**Lerninhalt:**
Hermaphrodismus ist ein evolutionärer Überlebensmechanismus. Cannabis wird zum Hermaphroditen wenn es glaubt, dass es nicht überleben wird (Stress, falsches Licht). Die Pflanze versucht, sich selbst zu bestäuben um die Genetik weiterzugeben. Stress-Management ist die beste Prävention.

**Coach-Hinweis-Stil:** Alarmierend-ruhig. „Das sind Pollensäcke — deine Pflanze entwickelt Hermaphrodismus. Handle präzise und ruhig: Entferne sie mit einer Pinzette ohne sie zu drücken. Dann beseitige die Stressursache."

**Asset-Tag:** `img:hermaphrodite-nanners`
**Cooldown:** — (einmaliges Event pro Grow)
**Ausschluss:** keine
**Recovery:** Mit konsequenter Entfernung kontrollierbar; Qualitätsverlust bleibt
**Telemetry:** `event.trigger=hermaphrodite`, `plant.stressAccumulation`, `event.severity=critical`

---

#### B-I-03 · Trocknungsfehler nach der Ernte — Schimmel oder Heu-Aroma

🏠 Indoor | **Cat:** CAT-9 | **Schwere:** 3

**Stages:** S7 (Post-Harvest)

**Trigger-Logik:**
```
harvest.completed === true
AND (drying.rh > 65 OR drying.rh < 45)
AND (drying.temp > 24 OR drying.temp < 15)
OR drying.airflow === "direct"
```

**Typische Ursachen:**
- Trocknung bei zu hoher RH (> 65%) → Schimmelrisiko
- Trocknung bei zu niedriger RH (< 40%) oder zu hoher Temperatur → Heu-Aroma, Terpenabbau
- Direkter Luftstrom auf Buds → zu schnelle Außentrocknung bei noch feuchtem Kern
- Buds nicht getrimmt vor Trocknung → schlechtere Luftzirkulation

**Sichtbare Symptome:**
- Schimmel: gräuliche Stellen im Bud-Inneren nach 5–7 Tagen Trocknung
- Heu: Buds trocknen in 3–4 Tagen und riechen nach Heu statt Terpenen
- Außen trocken, innen noch feucht: Buds fühlen sich knusprig an aber der Stängel bricht nicht sauber

**Häufige Fehlinterpretation:**
„Schnell trocknen = früher fertig." Zu schnelle Trocknung zerstört Terpene. Die optimale Trocknung dauert 10–14 Tage.

**Gegenmaßnahme:**
- Ziel: 18–21°C, 55–60% RH, sanfte Luftzirkulation (nicht direkt auf Buds)
- Trocknungszeit: 10–14 Tage bis Stängel sauber bricht (nicht biegt)
- Nach Trocknung: Curing in luftdichten Behältern (2–4 Wochen) für optimales Aroma

**Lerninhalt:**
Trocknung und Curing sind keine Nachgedanken — sie sind der letzte und wichtigste Schritt. Chlorophyll baut sich in der Trocknung ab (deshalb schmeckt langsam getrocknetes Cannabis besser). Terpene sind flüchtig und verschwinden bei zu hoher Temperatur. Der Stängelbruch-Test ist die zuverlässigste Trockenmethode.

**Coach-Hinweis-Stil:** Abschluss-orientiert. „60+ Tage Arbeit stecken in diesen Buds. Verpass die Trocknung nicht. 10–14 Tage bei 18–21°C und 55–60% RH. Dann erst Curing."

**Asset-Tag:** `img:drying-room-setup`
**Cooldown:** — (einmaliges Event pro Grow)
**Ausschluss:** keine
**Recovery:** Schimmel: betroffene Buds entsorgen. Heu: Curing kann teilweise helfen
**Telemetry:** `event.trigger=drying_error`, `drying.rh.value`, `drying.temp.value`, `harvest.qualityRisk`

---

## Zusammenfassung: 01_indoor-events.md

| Kategorie | Events | Schwere Ø | Häufigste Trigger-Variable |
|-----------|--------|-----------|---------------------------|
| CAT-7 Technik | 8 | 3.1 | `equipment.*` |
| CAT-4 Licht | 6 | 2.8 | `ppfd`, `dli`, `photoperiod` |
| CAT-3 Klima/VPD | 5 | 3.2 | `vpd`, `temp`, `rh` |
| CAT-1 Wasser | 4 | 3.0 | `soil.moisture`, `ph`, `ec` |
| CAT-2 Nährstoffe | 2 | 3.0 | `nutrient.*`, `water.hardness` |
| CAT-5 Wurzel | 3 | 3.3 | `rootHealth`, `soil.compaction` |
| CAT-6 Schädlinge | 3 | 3.3 | `pestPressure.*`, `climate.*` |
| CAT-8 Training | 3 | 2.0 | `training.*`, `plant.stress` |
| CAT-9 Blüte | 3 | 3.7 | `trichome.*`, `plant.stress` |
| **Gesamt** | **37** | **3.1** | |

**Kritische Events (Schwere 5):** T-I-03 (Zeitschaltuhr), K-I-02 (VPD niedrig in Blüte), R-I-03 (Wurzelfäule), B-I-02 (Hermaphrodit)

**Chain-Anker-Events:** W-I-01 → EC-01; K-I-02 → EC-02; T-I-01 → EC-10; P-I-01 → EC-05

---

*Nächste Datei: `02_outdoor-events.md` — 30 Outdoor-spezifische Events*
