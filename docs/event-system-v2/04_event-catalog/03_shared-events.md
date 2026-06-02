# 03 · Shared Events — Grow Simulator V2

> **Codex-Zuweisung #005D** · Stand: 2026-05-07
> 31 Events für Indoor und Outdoor (🌐 Beide Modi).
> Keine bestehenden Dateien ändern · Keine Logik · Keine Locales

---

## Shared-Event-Philosophie — Pflanzenlesen statt Blind-Reagieren

Shared Events modellieren die universelle Biologie der Pflanze. Sie entstehen aus Zustand, Entscheidungshistorie und Stressakkumulation — nicht aus zufälligen Auslösern.

**Drei Dinge die Shared Events lehren sollen:**

**1. Nicht jede Abweichung ist eine Krise.**
Gelbe Unterblätter in Woche 6 der Blüte sind normal. Ein leicht hängendes Blatt am Nachmittag ist Thermoregulation, kein Trockenstress. Das System muss dem Spieler beibringen, Signale zu kalibrieren — und die häufigste Fehlreaktion ist Überintervention.

**2. Geduld ist eine Wachstumskompetenz.**
Viele Probleme lösen sich selbst wenn der Spieler nichts tut. Wer nach jedem Event sofort eingreift, akkumuliert Folgefehler. Shared Events modellieren diese Dynamik aktiv — manche Events belohnen Inaktivität.

**3. Pflanzen kommunizieren — der Spieler muss zuhören lernen.**
Runoff-pH, Blattposition, Internodalabstand, Stängelfarbe — das sind Signale die lesbar sind. Shared Events nutzen diese Signale als primäre Diagnose-Grundlage.

**Neue Event-Typen in diesem Dokument:**

| Typ | Symbol | Beschreibung |
|-----|--------|--------------|
| Crisis Event | 🔴 | Echte Gefahr, sofortige Reaktion nötig |
| Observation Event | 🔵 | Kein akuter Schaden — Diagnose und Beobachtung gefragt |
| Recovery Event | 🟢 | Positive Wendung; Pflanze erholt sich |
| Learning Moment | 🟡 | Kein Schaden, reiner Lerninhalt |
| Near-Miss Event | 🟠 | Spieler war kurz davor einen Fehler zu machen |

---

## CAT-1 · Wasser / Gießen — Beide Modi (5 Events)

---

#### W-B-01 · Panik-Gießen — Überreaktion auf hängende Blätter

🌐 Beide | 🟠 Near-Miss | **Cat:** CAT-1 | **Schwere:** 2

**Stages:** S1–S5

**Trigger-Logik:**
```
plant.leavesHanging === true
AND soil.moisture > 0.65
AND climate.tempDay > 26
AND player.wateringAction === true (innerhalb letzter 2h nach Hanging-Signal)
```
*(Event triggert wenn Spieler bei hängenden Blättern gießt obwohl Erde bereits feucht ist)*

**Typische Ursachen:**
- Spieler sieht hängende Blätter am Nachmittag und interpretiert es als Trockenstress
- Versteht nicht dass Pflanzen bei hoher Temperatur/VPD kurzfristig hängen um Transpiration zu reduzieren
- Handelt reflexartig statt zu diagnostizieren

**Sichtbare Symptome (vor der Fehlreaktion):**
- Blätter hängen leicht ab ca. 13–15 Uhr
- Morgens war Pflanze aufrecht und gesund
- Substrat-Oberfläche fühlt sich noch leicht feucht an

**Häufige Fehlinterpretation:**
„Pflanze hängt = Durst." Das ist die häufigste Fehl-Assoziation im Grow. Tatsächlich kann ein nachmittägliches Hängen bei >26°C und hohem VPD völlig normal sein.

**Gegenmaßnahme (Coach-Intervention vor dem Gießen):**
1. Lift-Test zuerst: Topf anheben — schwer = noch feucht
2. Finger 2–3 cm ins Substrat — nass? Nicht gießen.
3. Warten bis 18–19 Uhr — erholt sich die Pflanze von selbst? → normales Thermoregulationsverhalten
4. Erst dann entscheiden

**Eskalation bei Fehlentscheidung (Panik-Gießen):**
- Überwässerung bei bereits feuchtem Substrat
- Nächster Kaskaden-Kandidat: W-I-01/W-O-01 (Staunässe)
- Sauerstoffverdrängung in Wurzelzone

**Lerninhalt:**
Pflanzen regulieren Wasserverlust durch Stomata-Schluss bei hoher VPD. Ein kurzes Nachmittagshängen ist aktives Management — kein Notsignal. Der Lift-Test und der Finger-Test sind die einzige zuverlässige Entscheidungsgrundlage. Optik täuscht.

**Coach-Hinweis-Stil:** Bremsend, investigativ. „Stop — bevor du gießt: heb den Topf an. Schwer? Dann hat sie genug Wasser. Was du siehst ist Thermoregulation, kein Durst."

**Asset-Tag:** `img:afternoon-wilt-normal`
**Cooldown:** 5 Tage
**Ausschluss:** W-I-01, W-I-02
**Recovery:** Automatisch — kein Eingriff nötig wenn Pflanze sich erholt
**Telemetry:** `event.trigger=panic_watering_prevented`, `player.wateringIntervention`, `soil.moisture.value`

---

#### W-B-02 · Runoff-pH als stille Diagnose — Substrat treibt ab

🌐 Beide | 🔵 Observation | **Cat:** CAT-1 | **Schwere:** 2

**Stages:** S2–S6

**Trigger-Logik:**
```
abs(water.phIn - soil.phRunoff) > 0.8
AND player.runoffPhMeasured === false
AND daysSinceGrow > 14
AND plant.symptoms.mild === true
```

**Typische Ursachen:**
- Spieler misst nur Eingabe-pH, nie Runoff-pH
- Substrat-pH driftet nach oben (Kalkanreicherung) oder unten (Säure-Aufbau durch Dünger)
- Discrepanz zwischen Eingabe und Runoff bleibt unbemerkt weil Symptome noch mild sind

**Sichtbare Symptome:**
- Leichte, unklare Mangelzeichen — nicht eindeutig einem Nährstoff zuordenbar
- Pflanze wächst, aber unter Potenzial
- „Irgendwas stimmt nicht" — diffuse Unruhe ohne klares Bild

**Häufige Fehlinterpretation:**
Spieler sieht milde Symptome, bleibt aber passiv. Oder interpretiert sie als Sortencharakter. Die einfachste Diagnose (Runoff-pH messen) wird nicht durchgeführt.

**Gegenmaßnahme:**
1. Nach dem Gießen: Runoff auffangen und pH messen
2. Differenz > 0.5 = Substrat reagiert aktiv; Handlungsbedarf
3. Bei zu hohem Runoff: pH-Down im Gießwasser; ggf. Flush
4. Bei zu niedrigem Runoff: pH-Up oder pH-korrigiertes Wasser

**Eskalation:**
Unbemerkt → Lockout (N-B-03), Calcium-Mangel (N-I-02/N-O-01)

**Lerninhalt:**
Der Runoff-pH ist die ehrlichste Aussage deines Substrats. Eingabe-pH ist was du gibst — Runoff-pH ist was wirklich im Boden passiert. Wer nur Eingabe misst, sieht nur die Hälfte des Bildes.

**Coach-Hinweis-Stil:** Diagnostisch-entdeckend. „Deine Pflanze sendet ein schwaches Signal. Bevor du irgendetwas änderst: Miss den Runoff-pH. Der erzählt dir die Wahrheit."

**Asset-Tag:** `img:runoff-ph-measurement`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** Nach pH-Korrektur 3–5 Tage
**Telemetry:** `event.trigger=runoff_ph_drift`, `soil.phRunoff`, `water.phIn`, `player.runoffPhMeasured`

---

#### W-B-03 · Salzaufbau — EC-Runoff steigt unbemerkt

🌐 Beide | 🔴 Crisis | **Cat:** CAT-1 | **Schwere:** 3

**Stages:** S2–S6

**Trigger-Logik:**
```
soil.ecRunoff > soil.ecFeed + 0.8
AND player.flushCount === 0
AND daysSinceGrow > 21
AND nutrient.weeklyDoseAvg > recommended * 1.1
```

**Typische Ursachen:**
- Mineraldünger akkumuliert Salze ohne regelmäßiges Flushen
- Gießmenge zu gering — Wasser trägt nicht alle gelösten Stoffe aus dem Substrat
- Spieler misst EC im Eingabewasser aber nicht im Runoff
- Automatische Düngerprogramme auf zu hoher Dosis

**Sichtbare Symptome:**
- Blattränder beginnend braun und trocken (Nährstoff-Burn-Muster)
- Substrat-Oberfläche zeigt weiße Salzablagerungen
- Runoff-EC liegt deutlich über Feed-EC
- Pflanze wirkt trotz Düngung schwach

**Häufige Fehlinterpretation:**
Braune Ränder → Spieler gibt weniger Dünger aber flusht nicht. Salze bleiben. Problem verschiebt sich statt sich zu lösen.

**Gegenmaßnahme:**
1. Flush: 2–3× Topfvolumen pH-korrigiertes Wasser ohne Nährstoffe
2. Runoff-EC nach Flush messen — Ziel: < 1.0 mS/cm
3. Düngerneuaufbau mit 50% Ausgangsdosis
4. Wöchentliche Runoff-EC-Kontrolle etablieren

**Eskalation:** → R-I-03 / Wurzelschäden durch osmotischen Dauerstress

**Lerninhalt:**
EC-Runoff ist das Substrat-Gedächtnis. Es speichert alle Fehler der letzten Wochen. Regelmäßiges Flushen (alle 4–6 Wochen) ist kein Notsignal — es ist Hygiene. Wer nie flusht, baut auf einem Salz-Fundament.

**Coach-Hinweis-Stil:** Proaktiv-mahnend. „Wann hast du zuletzt geflusht? Dein Runoff-EC sagt [X]. Das Substrat sammelt. Ein Flush jetzt verhindert Schlimmeres."

**Asset-Tag:** `img:salt-buildup-substrate`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 3–5 Tage nach Flush
**Telemetry:** `event.trigger=salt_buildup`, `soil.ecRunoff.value`, `player.flushCount`

---

#### W-B-04 · Überwässern in der Blüte — Langsamer Qualitätsverlust

🌐 Beide | 🔵 Observation | **Cat:** CAT-1 | **Schwere:** 2

**Stages:** S4–S6

**Trigger-Logik:**
```
plant.wateringFrequency > recommended * 1.4
AND plant.stage >= "early_flower"
AND soil.moistureAvg > 0.72
AND plant.terpeneAccumulationRate < expected * 0.7
```

**Typische Ursachen:**
- Spieler behält Veg-Gießrhythmus in der Blüte bei
- Meint gut zu tun — mehr Wasser = mehr Wachstum (falsche Übertragung)
- Bemerkt nicht dass Blüte-Pflanze weniger Wasser braucht als Veg-Pflanze (weniger Blattmasse)

**Sichtbare Symptome:**
- Kein dramatisches Symptom — das ist die Tücke
- Buds wachsen, aber weniger dicht als erwartet
- Aroma ist schwächer als bei vorangegangenem Grow
- Pflanze gelbelt früher (Stickstoff-Verdünnung durch zu viel Wasseraufnahme)

**Häufige Fehlinterpretation:**
Kein sichtbares Problem → Spieler macht weiter. Erst beim Riechen der Ernte fällt der Unterschied auf.

**Gegenmaßnahme:**
1. Gießintervall verlängern — erst gießen wenn Substrat tiefer als 3–4 cm trocken ist
2. Lift-Test häufiger: Topf soll sich deutlich leichter anfühlen vor dem Gießen
3. Terpensynthese braucht leichten Trockenstress als Stressor

**Lerninhalt:**
Leichter Trockenstress in der Blüte triggert die Pflanze zur Terpensynthese als Überlebensmechanismus. Das ist keine Grausamkeit — es ist Botanik. Die Pflanze produziert mehr Aromastoffe wenn sie glaubt dass Trockenheit droht. Outdoor-Züchter nutzen diesen Effekt gezielt.

**Coach-Hinweis-Stil:** Subtil-enthüllend. „Deine Buds wachsen — aber riech mal daran. Weniger aromatisch als erwartet? Du gießt zu oft. Blüte mag leichten Durst."

**Asset-Tag:** `img:overwatered-bloom`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** Kontinuierlich nach Reduktion; keine sofortige Verbesserung
**Telemetry:** `event.trigger=overwatering_bloom`, `plant.wateringFrequency`, `plant.terpeneRate`

---

#### W-B-05 · Erholung nach Trockenstress — Recovery-Beobachtung

🌐 Beide | 🟢 Recovery | **Cat:** CAT-1 | **Schwere:** 1

**Stages:** S1–S5

**Trigger-Logik:**
```
plant.wiltingIndex.previous > 0.6
AND player.wateringAction === true (korrekt re-hydriert)
AND hoursSinceWatering > 4
AND plant.wiltingIndex.current < 0.2
```
*(Event triggert wenn Spieler Trockenstress korrekt behoben hat und Pflanze sich erholt)*

**Typische Ursachen:** Vorangegangener Trockenstress wurde korrekt behandelt (W-I-02 oder W-O-02 gelöst).

**Sichtbare Symptome (positiv):**
- Pflanze richtet sich innerhalb von 4–6h vollständig auf
- Blätter kehren in normale Position zurück
- Neue Triebe erscheinen lebhafter
- Wachstum normalisiert sich innerhalb 24h

**Häufige Fehlinterpretation:**
Spieler wartet nicht lange genug. Gibt nach 1h auf und gießt erneut (Panik-Gießen-Rückfall). Oder denkt die Erholung sei zu langsam und interveniert.

**Coach-Botschaft:**
„Sieh her — sie erholt sich. Das ist die Pflanze bei der Arbeit. Nichts weiter tun. Geduld."

**Gegenmaßnahme:** Keine! Das ist ein positives Event — der Spieler soll beobachten und nicht eingreifen.

**Lerninhalt:**
Pflanzen haben bemerkenswerte Regenerationskräfte. Trockenstress der innerhalb von 6–12h behoben wird hinterlässt in frühen Stages meist keinen permanenten Schaden. Die Erholungsphase zu beobachten lehrt: die Pflanze kommuniziert Verbesserung genauso klar wie Stress.

**Coach-Hinweis-Stil:** Bestätigend, ruhig. „Genau richtig reagiert. Sie kommt zurück. Jetzt beobachten — nicht eingreifen. Das ist der Grow-Rhythmus."

**Asset-Tag:** `img:recovery-from-wilt`
**Cooldown:** 7 Tage
**Ausschluss:** keine
**Recovery:** Dieses Event IS die Recovery
**Telemetry:** `event.trigger=drought_recovery`, `player.correctAction=true`, `plant.recoveryTime`

---

## CAT-2 · Nährstoffe — Beide Modi (5 Events)

---

#### N-B-01 · Alte Blätter gelbeln — Normal oder Alarm?

🌐 Beide | 🟠 Near-Miss | **Cat:** CAT-2 | **Schwere:** 1

**Stages:** S4–S7

**Trigger-Logik:**
```
plant.lowerLeaves.yellowing === true
AND plant.stage >= "early_flower"
AND plant.overallHealth > 0.75
AND nutrient.nitrogenBalance >= "adequate"
```
*(Event triggert wenn Pflanze in Blüte untere Blätter gelb zieht — was normal ist)*

**Typische Ursachen:**
- Pflanze mobilisiert Stickstoff aus alten Unterblättern für die Blütenentwicklung
- Biologischer Prozess: in der Blüte ist Blattmasse weniger wichtig als Bud-Energie
- Lichtmangel in den unteren Etagen (kein Licht = kein Chlorophyll-Erhalt)

**Sichtbare Symptome:**
- Untere 20–30% der Blätter gelbeln gleichmäßig
- Obere Blätter und Buds sind vollständig grün und gesund
- Pflanze wächst normal; Buds entwickeln sich

**Häufige Fehlinterpretation:**
Spieler sieht gelbe Blätter → sofort Stickstoff-Notversorgung → N-Überdosierung (N-I-01) → Blüte verzögert sich. Überreaktion auf normales Pflanzenverhalten.

**Gegenmaßnahme:**
Nichts tun. Beobachten. Gelbe Unterblätter in der Blüte sind physiologisch normal und zeigen ein gesund arbeitendes System.

**Lerninhalt:**
Seneszenz der Unterblätter in der Blüte ist kein Mangel — es ist die Pflanze die Ressourcen strategisch umverteilt. Stickstoff wird aus alten Blättern in die wachsenden Buds mobilisiert. Wer hier eingreift, stört diesen Prozess. Das Gegenteil von Handeln kann die richtige Entscheidung sein.

**Coach-Hinweis-Stil:** Bremsend-lehrend. „Stopp. Bevor du Dünger gibst: schau genauer. Obere Blätter und Buds grün und gesund? Dann ist das keine Krise — das ist die Pflanze beim Umschichten."

**Asset-Tag:** `img:normal-senescence-bloom`
**Cooldown:** 14 Tage
**Ausschluss:** N-B-02 (echter Stickstoffmangel)
**Recovery:** Keine nötig — normaler Verlauf
**Telemetry:** `event.trigger=normal_senescence_recognized`, `player.interventionPrevented`, `plant.stage`

---

#### N-B-02 · Stickstoff-Mangel — Echter vs. normaler Seneszenz

🌐 Beide | 🔴 Crisis | **Cat:** CAT-2 | **Schwere:** 3

**Stages:** S2–S5

**Trigger-Logik:**
```
plant.nitrogenDeficiency.confirmed === true
AND plant.yellowing.pattern === "bottom_up_spreading"
AND plant.stage < "late_flower"
AND plant.overallHealth < 0.65
```

**Typische Ursachen:**
- Echter N-Mangel in Veg oder Early Flower (unterscheidbar von normaler Seneszenz durch Stage und Geschwindigkeit)
- pH-Drift verhindert N-Aufnahme trotz Düngung (Lockout)
- Substrat zu arm (kein N-haltiger Grunddünger)
- Flush ohne anschließende Düngung

**Unterschied zu N-B-01 (normaler Seneszenz):**
| Signal | Normal (N-B-01) | Echte Krise (N-B-02) |
|--------|-----------------|----------------------|
| Stage | S4–S6 | S2–S4 |
| Ausbreitung | Langsam, untere Etage | Schnell, breitet sich aus |
| Gesamtzustand | Pflanze sonst gesund | Pflanze gesamt schwach |
| Blattmuster | Gleichmäßig alt → jung | Mosaikartiges Vergilben |

**Gegenmaßnahme:**
1. pH prüfen (Lockout ausschließen)
2. EC im Runoff prüfen (Substrat-Zustand)
3. Stickstoffreichen Dünger zugeben (Grow-Dünger, Guano-Tee, Wurmtee)
4. Reaktion über 5–7 Tage beobachten

**Eskalation bei Fehlentscheidung:** → Verlangsamtes Wachstum; in S3 kritisch für Blütenentwicklung

**Lerninhalt:**
Das Muster des Vergilbens ist die Diagnose. Von unten, langsam, gleichmäßig = normal. Von unten, schnell, auf jüngere Blätter übergreifend = echter Mangel. Tempo und Ausbreitung sind die entscheidenden Unterschiede.

**Coach-Hinweis-Stil:** Differenzierend-analytisch. „Das Vergilben breitet sich aus — das ist kein normales Herbsten. pH prüfen, dann Stickstoff zugeben. Aber langsam."

**Asset-Tag:** `img:nitrogen-deficiency-spreading`
**Cooldown:** 12 Tage
**Ausschluss:** N-B-01
**Recovery:** 5–7 Tage nach Düngung
**Telemetry:** `event.trigger=nitrogen_deficiency_real`, `plant.yellowing.spreadRate`, `plant.overallHealth`

---

#### N-B-03 · Nährstoff-Lockout — pH-Kollaps, alle Nährstoffe blockiert

🌐 Beide | 🔴 Crisis | **Cat:** CAT-2 | **Schwere:** 4

**Stages:** S1–S6

**Trigger-Logik:**
```
(soil.pH < 5.5 OR soil.pH > 7.5)
AND plant.multipleDeficiencySymptoms === true
AND player.nutrientIncreaseAction > 2 (Spieler hat 2x nachgedüngt ohne pH zu prüfen)
```

**Typische Ursachen:**
- pH drift unbemerkt über Wochen
- Spieler reagiert auf Mangelzeichen mit mehr Dünger statt pH-Check
- Mehrere Nährstoffe gleichzeitig außerhalb des Aufnahmefensters

**Sichtbare Symptome:**
- Mehrere unterschiedliche Mangelbilder gleichzeitig — chaotisches, nicht klassifizierbares Muster
- Jede Nährstoffgabe macht es schlimmer (steigert EC ohne pH zu lösen)
- Neue Blätter deformiert, alle Altersstufen zeigen verschiedene Symptome

**Häufige Fehlinterpretation:**
Spieler sucht den einen fehlenden Nährstoff. Gibt spezifischen Dünger. Keine Wirkung. Gibt mehr. EC steigt. Pflanze verschlechtert sich trotz Düngung.

**Gegenmaßnahme:**
1. Sofort Flush — alle weiteren Düngergaben stoppen
2. pH des Gießwassers auf 6.2–6.4 (Substrate) oder 6.5–6.8 (Erde) korrigieren
3. 48h warten, dann leichte Düngergabe
4. Runoff-pH täglich messen bis stabil

**Eskalation:** → Wurzelschäden durch chronischen Lockout; Pflanze in schwerem Lockout kann dauerhaft geschwächt bleiben

**Lerninhalt:**
Lockout ist ein pH-Problem, kein Nährstoffproblem. Mehr Dünger bei Lockout ist wie lauter schreien wenn jemand kein Deutsch spricht — es hilft nicht. Erst pH reparieren, dann kommunizieren. Diagnose vor Therapie.

**Coach-Hinweis-Stil:** Unterbrechend-klar. „Hör auf zu düngen. Sofort. Das Problem ist nicht was du gibst — es ist dass die Pflanze nichts davon aufnehmen kann. Prüf den pH."

**Asset-Tag:** `img:lockout-multi-symptom`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 5–10 Tage nach pH-Korrektur und Flush
**Telemetry:** `event.trigger=nutrient_lockout`, `soil.pH.value`, `player.nutrientIncreaseCount`

---

#### N-B-04 · Magnesium-Mangel — Interveinal Chlorose

🌐 Beide | 🔴 Crisis | **Cat:** CAT-2 | **Schwere:** 3

**Stages:** S2–S6

**Trigger-Logik:**
```
plant.magnesiumDeficiency.pattern === "interveinal_chlorosis"
AND water.hardness < 120
AND nutrient.calMagSupplemented === false
AND plant.stage >= "veg"
```

**Typische Ursachen:**
- Weiches Wasser ohne Mg-Supplement (besonders bei RO-Wasser)
- pH zu hoch blockiert Mg-Aufnahme
- Calcium-Antagonismus: zu viel Ca verdrängt Mg aus der Aufnahme
- Schnelles Wachstum in Veg erhöht Mg-Bedarf

**Sichtbare Symptome:**
- Gelbliche Felder zwischen grünen Blattadern (interveinal) — beginnt an alten Blättern
- Muster ist charakteristisch und verwechslungssicher wenn man es einmal kennt
- Fortgeschritten: Nekrose an gelben Stellen

**Häufige Fehlinterpretation:**
Mit Eisen-Chlorose verwechselt (bei Fe: junge Blätter zuerst; bei Mg: alte Blätter zuerst). Falscher Dünger gewählt.

**Gegenmaßnahme:**
1. Epsom Salt (MgSO₄): 1–2 g/L als Gießlösung, auch als Blattspray (schnellere Wirkung)
2. pH auf 6.2–6.4 prüfen und korrigieren
3. Cal-Mag-Supplement als Basisergänzung einführen

**Lerninhalt:**
Die Mobilität von Mg in der Pflanze macht die Diagnose einfach: Mg wandert von alten zu jungen Blättern wenn knapp. Alte Blätter zeigen Mangel zuerst. Das ist der Lese-Schlüssel: alt = mobiles Element (N, P, K, Mg); jung = immobiles Element (Ca, Fe, Mn, B).

**Coach-Hinweis-Stil:** Diagnostisch-merkhilfe. „Gelbe Felder zwischen grünen Adern, beginnend an alten Blättern — das ist Magnesium. Epsom Salt. Heute noch."

**Asset-Tag:** `img:magnesium-deficiency`
**Cooldown:** 12 Tage
**Ausschluss:** keine
**Recovery:** 5–7 Tage (alte Schäden bleiben, neue Blätter wachsen gesund)
**Telemetry:** `event.trigger=magnesium_deficiency`, `water.hardness`, `plant.interveinalChlorosis`

---

#### N-B-05 · Düngerpause nach Stress — Weniger ist mehr

🌐 Beide | 🟡 Learning Moment | **Cat:** CAT-2 | **Schwere:** 1

**Stages:** S1–S5

**Trigger-Logik:**
```
plant.stressAccumulation > 50
AND player.nutrientFeedLast3Days > 2
AND plant.recoveryIndicator < 0.4
AND event.recentStressEvent === true
```
*(Triggert wenn Spieler nach einem Stress-Event weiter düngt und Pflanze nicht erholt)*

**Typische Ursachen:**
- Spieler will „helfen" nach Stressereignis (Hitzewelle, Schädlings-Treatment, Transplant)
- Düngt extra Nährstoffe für die „Erholung"
- Versteht nicht dass gestresste Pflanzen primär Ruhe und Wasser brauchen, nicht Nährstoffe

**Sichtbare Symptome:**
- Pflanze erholt sich langsamer als erwartet trotz Düngung
- Möglicherweise leichte N-Burn-Zeichen (Blattspitzen braun) zusätzlich zum Stress
- Coach-Indikator zeigt keine Verbesserung nach 3 Düngertagen

**Gegenmaßnahme:**
1. Düngerpause: 5–7 Tage nur mit pH-korrigiertem Wasser gießen
2. Pflanze beobachten ohne zu intervenieren
3. Erst wenn sichtbare Erholung einsetzt: leichte Düngergabe (50% Normaldosis)

**Lerninhalt:**
Eine gestresste Pflanze hat temporär reduzierte Nährstoffaufnahme. Ihre Energie geht in Reparatur, nicht in Wachstum. Dünger den sie nicht aufnehmen kann sammelt sich im Substrat als Salt-Buildup. Ruhe + Wasser ist die erste Behandlung nach jedem Stress. Geduld ist die unterschätzteste Grow-Kompetenz.

**Coach-Hinweis-Stil:** Entschleunigend-lehrend. „Deine Pflanze braucht jetzt keine Nährstoffe — sie braucht Ruhe. Leg den Dünger weg. Gib ihr sauberes Wasser und 5 Tage Zeit."

**Asset-Tag:** `img:rest-after-stress`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** Pflanze erholt sich schneller ohne Dünger-Intervention
**Telemetry:** `event.trigger=overfeeding_during_stress`, `player.nutrientFeedCount`, `plant.stressAccumulation`


---

## CAT-3 · Klima / VPD — Beide Modi (2 Events)

---

#### K-B-01 · Temperaturstress durch Tag-Nacht-Schwankung — Purple-Stiele als Fehlalarm

🌐 Beide | 🟠 Near-Miss | **Cat:** CAT-3 | **Schwere:** 1

**Stages:** S3–S6

**Trigger-Logik:**
```
climate.tempDeltaDayNight > 12
AND plant.stemColorChange === "purple"
AND plant.overallHealth > 0.80
AND nutrient.phosphorusBalance >= "adequate"
```
*(Event triggert wenn Pflanze durch Temperaturwechsel lila Stiele/Blattadern entwickelt — und der Spieler einzugreifen versucht)*

**Typische Ursachen:**
- Kühlere Nächte (besonders Outdoor Herbst, Indoor Winterkeller)
- Temperaturwechsel > 12°C zwischen Tag und Nacht
- Manche Sorten sind genetisch anfällig für Anthocyan-Produktion bei Kälte

**Sichtbare Symptome:**
- Stiele und Blattadern färben sich lila-violett
- Pflanze ist ansonsten vollkommen gesund
- Buds wirken lebendig und wachsen normal
- Kein Nährstoff-Mangelbild — nur Farbe

**Häufige Fehlinterpretation:**
„Lila = Phosphormangel" — das ist die häufigste Fehlinformation. Spieler gibt Phosphor-Booster. Tatsächlich ist die Ursache Kälte-induzierte Anthocyanin-Produktion, kein Mangel.

**Diagnose-Unterschied:**
| Signal | Kälte-Anthocyan | Echter P-Mangel |
|--------|-----------------|-----------------|
| Gesundheit | Pflanze robust | Pflanze schwach |
| Verteilung | Gleichmäßig, alle Stiele | Beginnt an Blatträndern |
| Stage | S3–S6 | S3–S5 |
| Temp-Kontext | Kalte Nächte | Irrelevant |
| Buds | Normal | Langsam |

**Gegenmaßnahme:**
Nichts tun. Anthocyane sind natürliche Farbpigmente — kein Stress-Signal. Optional: Nachttemperaturen leicht anheben wenn Sorte auf Kälte empfindlich reagiert.

**Lerninhalt:**
Viele Cannabis-Sorten produzieren bei Kälte Anthocyane — lila, rote und blaue Pigmente die als UV-Schutz dienen. Das ist Genetik, kein Mangel. Die Pflanze sagt: „Es ist kalt, ich schütze mich." Wer das als Phosphormangel behandelt, erzeugt Nährstoffungleichgewicht aus einem Nicht-Problem.

**Coach-Hinweis-Stil:** Entlastend-aufklärend. „Die lila Stiele sehen beeindruckend aus — und das sind sie auch. Das ist Genetik und Kälte-Reaktion, kein Phosphormangel. Deine Pflanze ist gesund."

**Asset-Tag:** `img:purple-stems-cold`
**Cooldown:** 14 Tage
**Ausschluss:** N-B-01 (Phosphormangel)
**Recovery:** Automatisch bei wärmeren Nächten; oder bleibt als sortenspezifisches Merkmal
**Telemetry:** `event.trigger=purple_stems_misdiagnosis_prevented`, `climate.tempDeltaDayNight`, `player.interventionPrevented`

---

#### K-B-02 · VPD-Fenster gefunden — Erster optimaler Klimatag

🌐 Beide | 🟢 Recovery / Learning | **Cat:** CAT-3 | **Schwere:** 1

**Stages:** S2–S5

**Trigger-Logik:**
```
climate.vpd >= 0.9 AND climate.vpd <= 1.3
AND plant.stage >= "veg"
AND climate.vpdOptimalDays === 3
AND player.climateAdjustmentCount >= 2
```
*(Event triggert wenn Spieler nach mehreren Anpassungen erstmals 3 Tage im VPD-Fenster bleibt)*

**Typische Ursachen:** Spieler hat gezielt Temperatur und Luftfeuchtigkeit angepasst.

**Sichtbare Symptome (positiv):**
- Pflanze zeigt sichtbar lebhafteres Wachstum
- Neue Triebe erscheinen täglich
- Blätter haben gesunde Ausrichtung ohne Einrollungen
- VPD-Anzeige im grünen Bereich

**Gegenmaßnahme:** Keine — stabilisieren und beibehalten. Das ist ein Erfolgsmoment.

**Lerninhalt:**
VPD ist keine akademische Variable — es ist das Wohlbefinden der Pflanze in einer Zahl ausgedrückt. Wenn die Pflanze bei optimalem VPD plötzlich schneller wächst, ist das kein Zufall. Das direkte Feedback zwischen Klimaeinstellung und Pflanzenreaktion zu erleben ist der wichtigste VPD-Lernmoment.

**Coach-Hinweis-Stil:** Bestätigend, enthusiastisch aber sachlich. „3 Tage optimales VPD. Siehst du den Unterschied im Wachstum? Das ist was eine Pflanze kann wenn sie atmen darf."

**Asset-Tag:** `img:vpd-optimal-growth`
**Cooldown:** 21 Tage
**Ausschluss:** K-I-01, K-I-02
**Recovery:** Dieses Event zeigt bereits den Recovery-Zustand
**Telemetry:** `event.trigger=vpd_optimal_achieved`, `climate.vpd.value`, `player.climateAdjustmentCount`

---

## CAT-4 · Licht — Beide Modi (1 Event)

---

#### L-B-01 · Erste Blütenanzeichen — Photoperiod-Erkennung

🌐 Beide | 🟡 Learning Moment | **Cat:** CAT-4 | **Schwere:** 1

**Stages:** S3

**Trigger-Logik:**
```
plant.firstPistils === true
AND plant.stage === "preflower"
AND player.firstBloomObservation === false
```
*(Triggert beim ersten Mal dass eine Pflanze des Spielers Pistillen zeigt)*

**Typische Ursachen:** Normale Pflanzenentwicklung — Photoperiod-Signal hat die Blüte ausgelöst.

**Sichtbare Symptome (positiv):**
- Erste weiße Pistillen erscheinen an Wachstumspunkten
- Charakteristischer Blütenanfang je nach Sorte (Pistillen-Cluster, Calyx-Entwicklung)
- Indoor: nach 12/12-Umstellung; Outdoor: Tage werden kürzer als 14h

**Lerninhalt:**
Cannabis ist eine photoperiodische Pflanze — sie misst die Dunkelperiode, nicht die Lichtperiode. Sobald die Dunkelphase lang genug ist (>12h), sendet die Pflanze das Signal zum Blühen. Die ersten Pistillen sind weiße Haar-ähnliche Strukturen — das sind die weiblichen Blütenorgane die auf Pollen warten. Eine Pflanze ohne Pollen bleibt sinsemilla (ohne Samen) und produziert maximale Harzmenge.

**Coach-Hinweis-Stil:** Entdeckend, lehrreich. „Siehst du die weißen Haare? Das sind Pistillen — deine Pflanze blüht jetzt offiziell. Ab hier beginnt die spannendste Phase des Grows."

**Asset-Tag:** `img:first-pistils`
**Cooldown:** — (einmaliges Milestone-Event)
**Ausschluss:** keine
**Recovery:** Nicht anwendbar
**Telemetry:** `event.trigger=first_bloom_observed`, `player.firstBloomObservation=true`, `milestone.bloomStart`

---

## CAT-5 · Wurzelzone / Medium — Beide Modi (2 Events)

---

#### R-B-01 · Umtopf-Schock — Pflanze pausiert nach Transplant

🌐 Beide | 🟠 Near-Miss | **Cat:** CAT-5 | **Schwere:** 2

**Stages:** S1–S3

**Trigger-Logik:**
```
player.repottingAction === true (letzte 48h)
AND plant.growthRate < plant.preRepotGrowthRate * 0.3
AND plant.stressIndicator > 0.4
AND player.interventionAfterRepot > 0
```
*(Event triggert wenn Spieler nach Umtopfen eingreift weil er die normale Pause für ein Problem hält)*

**Typische Ursachen:**
- Normaler Transplant-Schock wird als Krankheit fehlgedeutet
- Spieler gibt Nährstoffe nach dem Umtopfen statt zu warten
- Mehrere Interventionen nach Umtopfen akkumulieren Stress

**Sichtbare Symptome (normal, kein echter Schaden):**
- Pflanze wächst 1–3 Tage kaum
- Blätter leicht hängend aber nicht wirklich welk
- Keine neuen Triebe sichtbar

**Häufige Fehlinterpretation:**
„Das Umtopfen hat die Pflanze geschädigt." Spieler gibt Dünger, ändert Licht, gießt extra — und verlängert damit den Schock.

**Gegenmaßnahme:**
Nichts tun außer: leicht gießen (kein Dünger), optimales Klima halten, Pflanze in Ruhe lassen. Nach 3–5 Tagen ist Transplant-Schock vorbei.

**Eskalation bei Fehlentscheidung:**
Jede weitere Intervention verlängert den Schock. Dünger kurz nach Transplant → Wurzel-Reizung an frischen Enden → R-I-03 möglich.

**Folge-Events / Chains:** → W-B-05 (Recovery-Beobachtung) als positiver Folge-Beat

**Lerninhalt:**
Transplant-Schock ist biologisch programmiert. Die Pflanze muss ihr Wurzelsystem neu orientieren. Das kostet Energie die sonst ins Wachstum geht. 3–5 Tage Pause sind normal und unvermeidlich. Der beste Umtopf-Nachfolgeplan: kein Plan außer Ruhe und Wasser.

**Coach-Hinweis-Stil:** Beruhigend-stoisch. „Sie pausiert — das ist normal. Umtopfen ist Stress. Lass ihr 3 Tage. Kein Dünger, kein Licht-Stress, keine Eingriffe. Vertrauen."

**Asset-Tag:** `img:transplant-shock-pause`
**Cooldown:** — (einmaliges Event pro Umtopfvorgang)
**Ausschluss:** keine
**Recovery:** Automatisch in 3–5 Tagen
**Telemetry:** `event.trigger=transplant_overintervention`, `player.repottingAction=true`, `player.postRepotInterventions`

---

#### R-B-02 · Weiße Wurzeln sichtbar — Gesundheitscheck

🌐 Beide | 🟢 Recovery / Positive | **Cat:** CAT-5 | **Schwere:** 1

**Stages:** S1–S4

**Trigger-Logik:**
```
plant.rootHealth > 0.85
AND player.repottingAction === true (letzte 7 Tage)
AND plant.rootColor === "white"
AND player.rootInspection === true
```
*(Triggert wenn Spieler beim Umtopfen oder Inspizieren weiße, gesunde Wurzeln sieht)*

**Typische Ursachen:** Pflanze in gutem Gesundheitszustand — positive Bestätigung.

**Sichtbare Symptome (positiv):**
- Wurzeln weiß, fest und verzweigt
- Kein fauliger Geruch
- Substrate ist locker und gut belüftet

**Lerninhalt:**
Weiße, fest strukturierte Wurzeln sind der beste Beweis für eine gesunde Pflanze. Braune, schleimige, fade riechende Wurzeln zeigen das Gegenteil. Das Wurzelbild ist der ehrlichste Gesundheitsmarker überhaupt — nur ist es normalerweise unsichtbar. Wer die Pflanze umtopft hat ein seltenes diagnostisches Fenster.

**Coach-Hinweis-Stil:** Bestätigend, freudig. „Weiße Wurzeln. Das ist das Zeichen einer glücklichen Pflanze. Alles was du siehst über der Erde beginnt hier unten."

**Asset-Tag:** `img:white-healthy-roots`
**Cooldown:** — (einmaliges positives Event pro Umtopfen)
**Ausschluss:** R-I-03
**Recovery:** Dieses Event zeigt Gesundheit, keine Recovery nötig
**Telemetry:** `event.trigger=healthy_roots_confirmed`, `plant.rootHealth`, `milestone.rootInspection`

---

## CAT-6 · Schädlinge / Krankheiten — Beide Modi (5 Events)

---

#### P-B-01 · Thripse — Silbrige Fraßspuren, frühe Erkennung

🌐 Beide | 🔴 Crisis | **Cat:** CAT-6 | **Schwere:** 3

**Stages:** S2–S5

**Trigger-Logik:**
```
pestPressure.thrips > 0.25
AND plant.leafSilveringSigns === true
AND daysSinceLastInspection > 5
```

**Typische Ursachen:**
- Thripse sind winzig (1–2 mm) und kommen von außen oder durch Fenster/Lufteinlass rein
- Warme Temperaturen beschleunigen Vermehrung
- Neue Pflanzen ohne Quarantäne eingebracht
- Outdoor: natürliche Thrips-Population in Umgebung

**Sichtbare Symptome:**
- Silbrig-weiße Flecken auf Blattoberfläche (Raspierspuren, da Thripse Zellsaft rasieren)
- Schwarze Kotpunkte auf Blättern
- Unter Lupe: kleine schlanke Insekten die sich schnell bewegen
- Bei starkem Befall: Blätter deformiert, Wachstumspunkte befallen

**Häufige Fehlinterpretation:**
Silbrige Flecken werden für Nährstoffmangel (Calcium?) oder mechanische Schäden gehalten. Thripse selbst sind zu klein um ohne Lupe sicher identifiziert zu werden.

**Gegenmaßnahme:**
1. Blaue Klebesticker (Thripse werden von Blau angezogen — anders als Weiße Fliegen die Gelb bevorzugen)
2. Neem-Öl-Spray (systemisch abstoßend)
3. Spinosad (biologisch, sehr wirksam gegen Thripse)
4. Räuber-Milben Amblyseius cucumeris als Nützling
5. 3 Behandlungsrunden wegen Eierzyklus

**Eskalation bei Fehlentscheidung:**
- Blüte: Thripse können Buds direkt befallen — Ernte-Qualität sinkt
- Viren-Übertragung (TSWV) durch Thripse möglich

**Lerninhalt:**
Thripse legen Eier ins Pflanzengewebe — daher ist eine Behandlung nie ausreichend. Der Lebenszyklus dauert 12–15 Tage: Ei → Larve → Puppe → Erwachsene. Drei Behandlungen im 5-Tage-Abstand schließen alle Generationen ab. Blaue Sticker sind sowohl Falle als auch Frühwarnsystem.

**Coach-Hinweis-Stil:** Spurenlesend-präzise. „Silbrige Raspelspuren und schwarze Punkte auf den Blättern — das sind Thripse. Nimm eine Lupe und schau genau hin. Dann: Spinosad, 3 Runden."

**Asset-Tag:** `img:thrips-silver-damage`
**Cooldown:** 12 Tage
**Ausschluss:** keine
**Recovery:** 2–3 Wochen konsequente Behandlung
**Telemetry:** `event.trigger=thrips_infestation`, `pestPressure.thrips.level`

---

#### P-B-02 · Botrytis in Blüte — Innen fault was außen gesund wirkt

🌐 Beide | 🔴 Crisis | **Cat:** CAT-6 | **Schwere:** 5

**Stages:** S5–S7

**Trigger-Logik:**
```
climate.rh > 65
AND plant.budDensity > 0.65
AND plant.stage >= "mid_flower"
AND climate.tempNight < 18
AND plant.budBotrytisPressure > 0.5
```

**Typische Ursachen:**
- Hohe nächtliche Luftfeuchtigkeit kondensiert in dichten Buds
- Stagnante Luft ohne Zirkulation
- Kein Schutz vor Regen oder Feuchtigkeitsansammlungen
- Toter Pflanzenmaterial (abgestorbene Pistillen, Blätter) im Bud als Einstiegspunkt

**Sichtbare Symptome:**
- Von außen: ein Ast welkt plötzlich obwohl Wurzel und Erde gesund
- Auf Druck: Bud-Inneres braun, matschig, grau bestäubt
- Charakteristischer muffiger Geruch
- Grauer Sporennebel bei Berühren des befallenen Materials

**Häufige Fehlinterpretation:**
Spieler sieht welkenden Ast und sucht nach Gieß- oder Nährstoffursache. Schaut nicht in den Bud hinein. Verschleppt Sporen durch weitere Inspektion ohne Reinigung.

**Gegenmaßnahme:**
1. Befallenen Bud/Ast sofort und vollständig entfernen — Schnitt 3 cm unten im gesunden Gewebe
2. Werkzeug nach JEDEM Schnitt desinfizieren (Isopropanol 70%)
3. Nicht schütteln oder pusten — Sporen verbreiten sich durch Luft
4. Schnittflächen sofort trocknen
5. RH sofort senken; Luftzirkulation maximieren
6. Bei > 20% Befall: Notfall-Ernte aller gesunden Teile erwägen

**Eskalation bei Fehlentscheidung:**
- Sporen breiten sich in 24h auf Nachbar-Buds aus
- Unbehandelt: gesamte Pflanze verlierbar in 5–7 Tagen

**Folge-Events / Chains:** → EC-02 (Schimmel-Invasion)

**Lerninhalt:**
Botrytis cinerea ist der Schrecken aller Spät-Grower. Er wächst im Verborgenen — der erste sichtbare Schaden ist oft schon weit fortgeschritten. Prävention durch Luftzirkulation ist 100× effektiver als Behandlung. Aber wenn er da ist: keine Zögerlichkeit. Radikal und schnell.

**Coach-Hinweis-Stil:** Notfall-Ton, klar und ruhig. „Ein Ast welkt ohne erkennbaren Grund — check das Bud-Innere. Braun und matschig? Botrytis. Messer desinfizieren. Großzügig schneiden. Jetzt."

**Asset-Tag:** `img:botrytis-inside-bud`
**Cooldown:** 12 Tage
**Ausschluss:** keine
**Recovery:** Gesunde Teile können gerettet werden; befallene nicht
**Telemetry:** `event.trigger=botrytis_bloom`, `climate.rh.night`, `plant.budBotrytisCoverage`, `event.severity=critical`

---

#### P-B-03 · Mehltau-Verdacht — Trichome statt Pilz

🌐 Beide | 🟠 Near-Miss | **Cat:** CAT-6 | **Schwere:** 1

**Stages:** S4–S6

**Trigger-Logik:**
```
plant.trichomeDensity > 0.6
AND player.pestTreatmentAction === true (Spieler hat Spray eingesetzt)
AND pestPressure.powderyMildew < 0.1
AND plant.stage >= "early_flower"
```
*(Event triggert wenn Spieler Trichome für Mehltau hält und behandelt)*

**Typische Ursachen:**
- Spieler sieht weiß-schimmernde Buds in der Blüte und denkt an Mehltau
- Kennt das Aussehen von reifen Trichomen noch nicht
- Handelt aus Vorsicht — mit Schaden

**Sichtbare Symptome (die falsch interpretiert wurden):**
- Buds in S5–S6 glänzend-weiß bestäubt
- Kristalline, glitzernde Struktur
- Kein flacher Puder-Effekt wie echter Mehltau

**Unterschied Mehltau vs. Trichome:**
| Merkmal | Echter Mehltau | Trichome |
|---------|----------------|---------|
| Struktur | Flach, matt, wie Puder | Kristallin, dreidimensional |
| Verteilung | Auf Blättern zuerst | Auf Buds konzentriert |
| Wuchs | Wächst täglich | Bleibt stabil |
| Geruch | Pilzig, muffig | Aromatisch, intensiv |
| Wischtest | Verteilt sich, lässt Fleck | Bleibt nicht am Finger |

**Konsequenz der Fehlbehandlung:**
Mehltau-Spray (oft Schwefel oder Bicarbonat) auf reife Trichome beschädigt die Terpene und kann Rückstände hinterlassen.

**Lerninhalt:**
Trichome sind Harzdrüsen — die Terpene und Cannabinoide produzieren. Ihr Glänzen und Schimmern in der Blüte ist das schönste Signal im Grow: Reife kommt. Wer das als Mehltau bekämpft, bekämpft seinen eigenen Erfolg.

**Coach-Hinweis-Stil:** Erleichtert-lehrend. „Das ist kein Mehltau — das sind Trichome. Rieche daran. Kristalline Struktur, intensives Aroma — das ist Harz, kein Pilz. Leg das Spray weg."

**Asset-Tag:** `img:trichomes-vs-mildew`
**Cooldown:** — (einmaliges Near-Miss Event)
**Ausschluss:** P-I-03, P-O-04
**Recovery:** Kein Schaden wenn Spieler rechtzeitig gestoppt wird
**Telemetry:** `event.trigger=trichome_misdiagnosis_prevented`, `player.sprayAction`, `plant.trichomeDensity`

---

#### P-B-04 · Septoria-Blattflecken — Natürliche Alterung vs. Krankheit

🌐 Beide | 🔵 Observation | **Cat:** CAT-6 | **Schwere:** 2

**Stages:** S3–S6

**Trigger-Logik:**
```
plant.septoriaPresence > 0.2
AND climate.rh > 60
AND plant.lowerLeavesAffected === true
AND weather.recentRain === true OR climate.highHumidityDays > 4
```

**Typische Ursachen:**
- Septoria cannabis (Blattfleckenpilz) befällt ältere Blätter bei hoher Luftfeuchtigkeit
- Sporen überleben im Boden und werden bei Regen/Bewässerung hochgespritzt
- Oft kombiniert mit Stickstoffmangel (schwächere Zellwände)

**Sichtbare Symptome:**
- Kleine, kreisrunde bis ovale Flecken mit gelbem Rand und braunem Zentrum
- Nur auf älteren, unteren Blättern
- Bei Fortschreiten: Blätter sterben komplett ab
- Anders als Mg-Mangel: Flecken kreisrund mit definiertem Rand

**Häufige Fehlinterpretation:**
Septoria-Flecken als Nährstoffmangel oder normales Herbsten identifiziert. Pilz breitet sich unbemerkt aus.

**Gegenmaßnahme:**
1. Befallene Blätter sofort entfernen (nicht kompostieren)
2. Kupfer-basierter Pilzschutz (Bordeaux-Brühe) auf verbleibende Blätter
3. Luftzirkulation verbessern
4. Bodennässe reduzieren (Splash-Infektion verhindern: Mulch auf Substrat)

**Eskalation bei Fehlentscheidung:**
- Untere Blätter fallen ab — kein direkter Bud-Schaden
- Starke Septoira schwächt Pflanze, erhöht Anfälligkeit

**Lerninhalt:**
Septoria ist ein Boden-Pilz. Seine Sporen kommen von unten, nicht von oben. Mulch verhindert, dass Bewässerungs-Splash Sporen auf die unteren Blätter trägt. Das ist der eleganteste Schutz.

**Coach-Hinweis-Stil:** Differenzierend-ruhig. „Runde Flecken mit gelbem Rand — das ist Septoria, kein Mangel. Untere Blätter entfernen, Mulch aufbringen. Kein Notfall, aber handle jetzt."

**Asset-Tag:** `img:septoria-spots`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** Neue Blätter wachsen gesund; befallene nicht reversibel
**Telemetry:** `event.trigger=septoria`, `climate.rh.avg`, `plant.lowerLeavesAffected`

---

#### P-B-05 · Erster Schädling überstanden — Resilienz-Beat

🌐 Beide | 🟢 Recovery | **Cat:** CAT-6 | **Schwere:** 1

**Stages:** S2–S5

**Trigger-Logik:**
```
event.recentPestEvent === true
AND pestPressure.overall < 0.15
AND plant.pesticideTreatmentSuccess === true
AND player.treatmentRoundCount >= 2
```
*(Triggert nach erfolgreicher Schädlingsbekämpfung über 2+ Behandlungsrunden)*

**Typische Ursachen:** Vorangegangenes Schädlings-Event wurde korrekt und konsequent behandelt.

**Sichtbare Symptome (positiv):**
- Neue Triebe wachsen ohne Schäden aus
- Keine neuen Fraßspuren oder Schädlingszeichen auf Klebestickern
- Pflanze zeigt beschleunigtes Wachstum nach Stress-Phase

**Lerninhalt:**
Eine Pflanze die einen Schädlingsbefall überlebt und behandelt wurde kommt oft stärker zurück. Das Immunsystem (Sekundärstoffwechsel) ist nach Stress aktiver. Konsequenz bei der Behandlung zu beweisen — mehrere Runden, Eierzyklus abdecken — ist die Kern-Kompetenz.

**Coach-Hinweis-Stil:** Anerkennend, motivierend. „Du hast die Behandlung durchgehalten — alle Runden. Deine Pflanze ist sauber. Das war echtes Grow-Handwerk."

**Asset-Tag:** `img:pest-overcome-recovery`
**Cooldown:** 21 Tage (nur nach vorangegangenem Pest-Event)
**Ausschluss:** keine
**Recovery:** Dieses Event ist das Recovery-Signal
**Telemetry:** `event.trigger=pest_overcome`, `player.treatmentRoundCount`, `pestPressure.afterTreatment`


---

## CAT-8 · Training / Pflanzenstruktur — Beide Modi (2 Events)

---

#### TR-B-01 · Übertraining — Stressakkumulation durch zu viele Eingriffe

🌐 Beide | 🔴 Crisis | **Cat:** CAT-8 | **Schwere:** 3

**Stages:** S1–S3

**Trigger-Logik:**
```
plant.stressAccumulation > 75
AND training.interventionCount > 4 (letzte 10 Tage)
AND plant.growthRate < expected * 0.25
AND player.trainingPauseAction === false
```

**Typische Ursachen:**
- Spieler macht LST, Topping, Defoliation und Fim in zu kurzen Abständen
- Versteht nicht dass jeder Eingriff Stress akkumuliert und Erholungszeit braucht
- Versucht aggressiv zu formen wie eine Bonsai-Pflanze statt wie eine Nutzpflanze
- Jede Reaktion der Pflanze wird mit einem weiteren Eingriff beantwortet

**Sichtbare Symptome:**
- Wachstum pausiert vollständig — keine neuen Triebe sichtbar
- Blätter wirken matt und hängen leicht
- Stängel-Wunden von mehrfachem Biegen sichtbar
- Pflanze „reveggt" fast — zeigt einzelne einfache Blätter (Stressreaktion)

**Häufige Fehlinterpretation:**
„Mehr Training = mehr Ertrag." Spieler gibt nicht nach, fügt weiteren Eingriff hinzu. Pflanze antwortet mit Wachstumsstopp.

**Gegenmaßnahme:**
1. Sofortiger vollständiger Eingriffsstopp — kein Training für 7–10 Tage
2. Optimale Klimabedingungen sicherstellen
3. Leichte Düngung (50% Dosis) — Pflanze braucht Baumaterial für Reparatur
4. Erst wenn neue Triebe sichtbar sind: sehr behutsam weiter

**Eskalation bei Fehlentscheidung:**
- Weiteres Training: Pflanze kann in Reveg wechseln (verliert Blütephase)
- Wachstumsstopp verlängert sich auf 2–3 Wochen
- Wenn in Preflower: Blütenentwicklung stark verzögert

**Lerninhalt:**
Training-Pause ist genauso wichtig wie Training selbst. Jeder Schnitt, jedes Biegen, jede Defoliation ist ein Stresssignal das die Pflanze verarbeiten muss. Sie antwortet mit Hormonen, Reparaturproteinen, Geweberegeneration — das kostet Zeit. Der Grow-Kalender sollte Eingriffs-Tage und Erholungs-Tage zeigen, nicht nur Eingriffs-Tage.

**Coach-Hinweis-Stil:** Bremsend, kategorisch. „Stopp. Keine weiteren Eingriffe. Deine Pflanze ist im Stress-Overflow. Leg das Werkzeug weg und beobachte. 7 Tage. Erst dann wieder anfassen."

**Asset-Tag:** `img:overtraining-stunted`
**Cooldown:** 14 Tage
**Ausschluss:** TR-B-02
**Recovery:** 7–14 Tage Erholung je nach Schwere
**Telemetry:** `event.trigger=overtraining`, `plant.stressAccumulation`, `training.interventionCount`

---

#### TR-B-02 · Defoliation-Timing — Wann weniger mehr ist

🌐 Beide | 🟡 Learning Moment | **Cat:** CAT-8 | **Schwere:** 1

**Stages:** S4–S5

**Trigger-Logik:**
```
plant.stage === "early_flower"
AND player.defoliationAction === true
AND plant.defoliationTiming === "optimal"
AND plant.lowerCanopyAirflow < 0.5
```
*(Triggert wenn Spieler in Early Flower Defoliation korrekt durchführt)*

**Typische Ursachen:** Spieler handelt proaktiv um Luftzirkulation im Canopy zu verbessern.

**Sichtbare Symptome (nach korrekter Defoliation):**
- Licht dringt tiefer in den Canopy
- Luftzirkulation im unteren Bereich verbessert sich sichtbar
- Nach 48–72h: Wachstum der verbliebenen Triebe beschleunigt sich

**Lerninhalt:**
Defoliation in Early Flower (Woche 1–3 der Blüte) hat ein klar definiertes Zeitfenster. Zu früh: Pflanze verliert zu viel Photosynthesekapazität. Zu spät (S5+): zu nahe an Ernte, Stressrisiko zu hoch. Das Fenster öffnet sich einmal. Wer es trifft, verbessert Luftzirkulation und Lichtpenetration gleichzeitig.

**Coach-Hinweis-Stil:** Bestätigend-lehrend. „Genau der richtige Zeitpunkt. Early Flower, gezielt defoliert — Licht und Luft kommen jetzt besser durch. Das ist präzises Grow-Handwerk."

**Asset-Tag:** `img:defoliation-timing`
**Cooldown:** — (einmaliges Event pro korrekte Defoliation)
**Ausschluss:** TR-B-01
**Recovery:** Keine nötig — positives Ergebnis
**Telemetry:** `event.trigger=defoliation_optimal`, `player.defoliationTiming`, `plant.canopyAirflow`

---

## CAT-9 · Blüte / Erntequalität — Beide Modi (1 Event)

---

#### B-B-01 · Trichom-Diagnose — Lupe und Mikroskop als Entscheidungswerkzeug

🌐 Beide | 🟡 Learning Moment | **Cat:** CAT-9 | **Schwere:** 1

**Stages:** S6–S7

**Trigger-Logik:**
```
plant.stage >= "late_flower"
AND player.trichomeMicroscopeUse === false
AND plant.trichomeRipeness > 0.4
AND daysUntilHarvestWindow < 14
```
*(Triggert wenn Spieler in Late Flower kein Trichom-Werkzeug eingesetzt hat)*

**Typische Ursachen:**
- Spieler erntet nach Kalender statt nach Trichomreife
- Hat Lupe/Mikroskop im Inventar aber nutzt es nicht
- Unterschätzt die Bedeutung der Trichom-Beurteilung

**Sichtbare Symptome (Lerninhalt-Fokus):**

**Trichom-Reife-Tabelle:**

| Trichom-Status | Farbe | Wirkung | Empfehlung |
|----------------|-------|---------|------------|
| Klar/Transparent | Wasserklar | Noch nicht reif — psychoaktiv unreif | Warten |
| Trüb/Milchig | Weiß-opak | Peak THC-Produktion | Ernte-Fenster öffnet sich |
| Amber | Bernsteinfarben | THC → CBN-Abbau, sedierend | Ernte oder überschritten |
| Gemischt (10–30% amber) | Trüb + wenig amber | Ausgewogenes Profil | Optimaler Erntepunkt |

**Gegenmaßnahme:**
1. Lupe (30×) oder Mikroskop (60–100×) einsetzen
2. Verschiedene Bud-Stellen inspizieren (oben und unten — reifen unterschiedlich)
3. Trichom-Verhältnis schätzen und dokumentieren
4. Ernte-Entscheidung basierend auf gewünschtem Profil treffen

**Lerninhalt:**
Der Trichom-Check ist das präziseste Werkzeug im Grow-Arsenal. Kein Kalender, kein Pistillen-Anteil, keine Sortenangabe ist so zuverlässig wie ein 60× Blick auf die Trichome. Klar = warten. Trüb = fast fertig. Amber = jetzt oder bald. Das ist der Code der Ernte.

**Coach-Hinweis-Stil:** Werkzeug-empfehlend, neugierig. „Du bist in Late Flower. Hast du schon unter die Lupe geschaut? Was du dort siehst ist nicht nur schön — es ist die einzig zuverlässige Ernte-Entscheidung."

**Asset-Tag:** `img:trichome-microscope-view`
**Cooldown:** — (einmaliges Lernmoment-Event pro Grow)
**Ausschluss:** keine
**Recovery:** Nicht anwendbar — Lernmoment
**Telemetry:** `event.trigger=trichome_inspection_first`, `player.trichomeMicroscopeUse=true`, `milestone.trichomeKnowledge`

---

## CAT-10 · Story / Lern-Beats — Beide Modi (8 Events)

> Story-Beats sind keine Problemereignisse. Sie haben keinen negativen Druck, keine Konsequenz bei Fehlentscheidung.
> Sie markieren Meilensteine, Kompetenz-Sprünge und emotionale Ankerpunkte des Grows.
> Story-Beats werden vom Story Curator Layer gesteuert, nicht vom Pressure-Scoring.

---

#### SB-01 · Erster Keimling — Der Anfang von allem

🌐 Beide | Story Beat | **Cat:** CAT-10

**Stages:** S0

**Trigger-Logik:**
```
plant.germination === true AND player.totalGrows === 1
```

**Event-Typ:** Milestone — erster Keimling des ersten Grows

**Inhalt:**
Der Coach begrüßt den Spieler beim ersten Keimling. Kurze Einführung in das, was jetzt kommt: Pflanzenphasen, die wichtigsten Variablen, das Coach-Prinzip.

**Lerninhalt:** Ein Keimling hat keine Blätter, keinen Geschmack, keinen Wert — und trotzdem ist er das Wichtigste. In ihm steckt das gesamte genetische Potenzial der Sorte. Was du aus den nächsten 70 Tagen machst, entscheidet was am Ende davon sichtbar wird.

**Coach-Hinweis-Stil:** Einladend, ruhig. „Da ist er. Dein erster Keimling. Alles andere beginnt hier."

**Asset-Tag:** `img:first-seedling-sprout`
**Telemetry:** `milestone.firstSeedling=true`, `player.growNumber=1`

---

#### SB-02 · Das erste Topping — Mut zum Schnitt

🌐 Beide | Story Beat | **Cat:** CAT-10

**Stages:** S1–S2

**Trigger-Logik:**
```
player.firstToppingAction === true
```

**Event-Typ:** Skill Unlock — erster Training-Eingriff

**Inhalt:**
Kurzes narratives Feedback wenn Spieler zum ersten Mal toppt. Coach erklärt was gerade passiert ist und was die Pflanze jetzt machen wird.

**Lerninhalt:** Das sah endgültig aus — aber Topping ist kein Schaden. Es ist ein Signal. Die Pflanze antwortet auf den Verlust des Apikaltriebs mit erhöhter Auxin-Produktion in den Seitentrieben. Was jetzt als zwei neue Haupttriebe wächst, war vorher unterdrückt. Du hast gerade die Hierachie dieser Pflanze verändert.

**Coach-Hinweis-Stil:** Ermutigend, biologisch. „Gut gemacht. Es wirkt brutal — aber schau in 5 Tagen wie viele neue Triebe hochkommen. Das ist die Antwort der Pflanze."

**Asset-Tag:** `img:first-topping-two-tops`
**Telemetry:** `milestone.firstTopping=true`

---

#### SB-03 · VPD entdecken — Die unsichtbare Variable sichtbar machen

🌐 Beide | Story Beat | **Cat:** CAT-10

**Stages:** S1–S3

**Trigger-Logik:**
```
player.vpdMeterFirstUse === true
OR player.firstClimateAdjustmentForVpd === true
```

**Event-Typ:** Learning Card — Konzept-Einführung

**Inhalt:**
Erklärung von VPD als Konzept mit praktischer Tabelle und Anleitung zur Messung.

**Lerninhalt:** VPD — Vapour Pressure Deficit — ist die Druckdifferenz zwischen der Feuchtigkeit in der Luft und der Feuchtigkeit in den Blättern. Hoher VPD = Luft ist trocken, Pflanze verliert viel Wasser. Niedriger VPD = Luft ist fast gesättigt, Pflanze transpiriert kaum. Der Süßpunkt ist das Fenster wo Transpiration fließt ohne Stress — und damit auch Nährstoffaufnahme, Wachstum, Photosynthese.

**Coach-Hinweis-Stil:** Entdeckend, systematisch. „Willkommen im fortgeschrittenen Grow. VPD ist die Variable die Anfänger ignorieren und Profis täglich messen."

**Asset-Tag:** `img:vpd-chart-display`
**Telemetry:** `milestone.vpdLearned=true`

---

#### SB-04 · Erste Blütenanzeichen — Pistillen erscheinen

🌐 Beide | Story Beat | **Cat:** CAT-10

**Stages:** S3

**Trigger-Logik:**
```
plant.firstPistils === true AND player.totalGrows === 1
```

*(Separates Event von L-B-01 — das hier ist der narrative Story-Beat, L-B-01 ist die mechanische Trigger-Version)*

**Event-Typ:** Milestone

**Inhalt:** Emotionaler Wendepunkt des Grows. Visuell dramatischer Moment: erste Pistillen sichtbar. Coach markiert den Übergang von Veg zu Blüte als Charakter-Wechsel der Pflanze.

**Lerninhalt:** Die Pflanze hat gerade einen Beschluss gefasst. Ab jetzt geht keine Energie mehr in Blattmasse — alles fließt in die Blütenproduktion. Dieser Moment ist unumkehrbar. Was in den nächsten 8–10 Wochen passiert, bestimmt alles.

**Coach-Hinweis-Stil:** Feierlich-ernst. „Sieh dir das an. Weiße Pistillen. Deine Pflanze blüht. Jetzt zählt jede Entscheidung doppelt."

**Asset-Tag:** `img:first-pistils-milestone`
**Telemetry:** `milestone.firstBloom=true`, `player.growNumber=1`

---

#### SB-05 · Der Trichom-Moment — Mikroskop zum ersten Mal

🌐 Beide | Story Beat | **Cat:** CAT-10

**Stages:** S5–S6

**Trigger-Logik:**
```
player.trichomeMicroscopeFirstUse === true
```

**Event-Typ:** Discovery Moment

**Inhalt:** Wenn Spieler zum ersten Mal das Mikroskop auf einen Bud richtet. Coach beschreibt was er sieht: Köpfchen-Trichome, Stalk, Kapitulum. Die mikroskopische Welt der Blüte.

**Lerninhalt:** Was du gerade siehst, nennt sich Kapitätstrichom — eine Drüse auf einem Stiel, gefüllt mit Terpenen und Cannabinoiden. Diese winzigen Strukturen sind das Ziel von 70+ Tagen Arbeit. Ihre Farbe zeigt dir den Reifegrad: klar, trüb, amber. Kein Kalender der Welt ist so präzise wie dieser Blick.

**Coach-Hinweis-Stil:** Staunen erlaubt. „Das ist ein Trichom. Manche Züchter nennen sie Diamanten. Nach allem was du investiert hast — weißt du jetzt warum."

**Asset-Tag:** `img:trichome-microscope-wonder`
**Telemetry:** `milestone.trichomeMicroscopeFirstUse=true`

---

#### SB-06 · Ersten Grow abschließen — Ernte und Reflexion

🌐 Beide | Story Beat | **Cat:** CAT-10

**Stages:** S7

**Trigger-Logik:**
```
player.firstHarvestCompleted === true
```

**Event-Typ:** Achievement — Abschluss Grow 1

**Inhalt:** Der erste abgeschlossene Grow ist ein vollständiger Lernzyklus. Coach lässt Spieler auf den Grow zurückblicken — was war schwer, was lief gut, welche Events wurden falsch bewertet.

**Lerninhalt:** Du hast 70 Tage eine Pflanze durch alle Phasen begleitet. Du hast Fehler gemacht — jeder macht das beim ersten Grow. Aber du hast auch Entscheidungen getroffen, Signale gelesen, Eingriffe vorgenommen. Der nächste Grow ist schon besser. Nicht weil die Pflanze anders ist — sondern weil du es bist.

**Coach-Hinweis-Stil:** Würdigend, vorausblickend. „Erster Grow, abgeschlossen. Was würdest du beim nächsten Mal anders machen? Genau das ist die Frage die dich besser macht."

**Asset-Tag:** `img:first-harvest-complete`
**Telemetry:** `milestone.firstHarvestComplete=true`, `player.growsCompleted=1`

---

#### SB-07 · Schädling überstanden — Resilienz als Erfahrung

🌐 Beide | Story Beat | **Cat:** CAT-10

**Stages:** S2–S5

**Trigger-Logik:**
```
event.pestEventResolved === true
AND player.treatmentSuccess === true
AND player.totalPestEventsDefeated === 1
```

**Event-Typ:** Resilience Beat

**Inhalt:** Erster erfolgreich bekämpfter Schädling. Coach würdigt die Konsequenz und leitet zur Prävention weiter.

**Lerninhalt:** Du hast einen Schädlingsbefall erkannt, behandelt und drei Runden durchgehalten. Das ist nicht trivial — viele Anfänger geben nach der ersten Behandlung auf und wundern sich wenn der Befall zurückkommt. Jetzt weißt du: Schädlingsbekämpfung ist ein Prozess, kein einmaliger Eingriff. Und du hast den Prozess abgeschlossen.

**Coach-Hinweis-Stil:** Anerkennend, konkret. „Drei Behandlungsrunden. Konsequent. Das ist was funktioniert. Merke dir den Rhythmus — du wirst ihn wieder brauchen."

**Asset-Tag:** `img:pest-victory`
**Telemetry:** `milestone.firstPestDefeated=true`

---

#### SB-10 · Coach-Level-Up — 5 Events korrekt gelöst

🌐 Beide | Story Beat | **Cat:** CAT-10

**Stages:** S1–S6

**Trigger-Logik:**
```
player.correctEventResolutionCount === 5
```

**Event-Typ:** Progression Milestone

**Inhalt:** Spieler hat 5 Events in Folge korrekt diagnostiziert und behoben. Coach gibt Feedback über den Lernfortschritt und schaltet erweiterte Diagnose-Informationen frei.

**Lerninhalt:** Fünf Events, fünf richtige Entscheidungen. Das klingt nach wenig — aber jede richtige Diagnose bedeutet: du hast ein Signal gelesen, eine Ursache identifiziert, eine Maßnahme gewählt und das Ergebnis beobachtet. Das ist der vollständige Grow-Denk-Zyklus. Du wiederholst ihn jetzt intuitiv.

**Coach-Hinweis-Stil:** Progressions-markierend. „5 Events, 5 richtige Entscheidungen. Du liest diese Pflanze. Das war das Ziel von Anfang an."

**Asset-Tag:** `img:coach-level-up`
**Telemetry:** `milestone.correctEvents=5`, `player.coachLevel=2`

---

## Zusammenfassung: 03_shared-events.md

| Kategorie | Events | Event-Typen |
|-----------|--------|-------------|
| CAT-1 Wasser | 5 | 1× Crisis, 2× Observation, 1× Near-Miss, 1× Recovery |
| CAT-2 Nährstoffe | 5 | 2× Crisis, 1× Near-Miss, 1× Observation, 1× Learning |
| CAT-3 Klima/VPD | 2 | 1× Near-Miss, 1× Recovery/Learning |
| CAT-4 Licht | 1 | 1× Learning Moment |
| CAT-5 Wurzel | 2 | 1× Near-Miss, 1× Recovery/Positive |
| CAT-6 Schädlinge | 5 | 2× Crisis, 2× Near-Miss/Observation, 1× Recovery |
| CAT-8 Training | 2 | 1× Crisis, 1× Learning Moment |
| CAT-9 Blüte | 1 | 1× Learning Moment |
| CAT-10 Story | 8 | 8× Story/Milestone Beats |
| **Gesamt** | **31** | |

**Event-Typ-Verteilung:**

| Typ | Anzahl | Anteil |
|-----|--------|--------|
| 🔴 Crisis | 5 | 16% |
| 🔵 Observation | 4 | 13% |
| 🟢 Recovery / Positiv | 4 | 13% |
| 🟡 Learning Moment | 4 | 13% |
| 🟠 Near-Miss | 5 | 16% |
| Story Beat | 9 | 29% |

**Design-Absicht:** Nur 16% echte Krisen. 45% der Events sind positiv, neutral oder lehrreich ohne Schaden. Das Verhältnis verhindert Dauerkrisen-Feeling und unterstützt die Coach-First-Philosophie.

**Kritische Events:** P-B-02 (Botrytis Bloom, Schwere 5), N-B-03 (Lockout, Schwere 4), TR-B-01 (Übertraining, Schwere 3)

**Near-Miss-Events (besonders pädagogisch wertvoll):**
- W-B-01 (Panik-Gießen) — häufigster Anfängerfehler
- K-B-01 (Purple = Phosphormangel-Verdacht) — häufigste Fehlinformation
- P-B-03 (Trichome für Mehltau gehalten) — gefährlichste Überreaktion
- R-B-01 (Transplant-Schock) — häufigste unnötige Intervention
- N-B-01 (normale Seneszenz = Alarm) — Geduld vs. Panik

---

*Nächste Datei: `04_learning-story-beats.md` — Erweiterte Story-Beat-Specs*
*Dann: `05_event-chains.md` — 10 Event-Ketten mit Akt-Struktur*
