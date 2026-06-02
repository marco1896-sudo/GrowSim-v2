# 04 · Learning & Story Beats — Grow Simulator V2

> **Codex-Zuweisung #005E** · Stand: 2026-05-07
> Die emotionale Seele des Event-Systems.
> Keine bestehenden Dateien ändern · Keine Logik · Keine Locales

---

## 1. Ziel der Learning- und Story-Beats

Learning- und Story-Beats sind keine Herausforderungen. Sie sind Momente des Innehalten.

In einem Spiel das aus Problemen, Entscheidungen und Konsequenzen besteht, braucht es Atemraum. Momente wo die Pflanze einfach wächst. Wo der Coach sagt: „Schau hin — hier ist etwas Schönes passiert." Wo der Spieler nicht handeln muss, sondern beobachten darf.

Drei Ziele:

**1. Kompetenz sichtbar machen.**
Der Spieler lernt kontinuierlich — aber er merkt es oft nicht. Story-Beats markieren Kompetenzsprünge explizit. „Du hast das gerade richtig gemacht, weißt du warum?" Das erzeugt kein Gefühl von Belohnung durch externe Punkte — sondern durch das Verstehen selbst.

**2. Emotionale Bindung an die Pflanze aufbauen.**
Ein Spiel bei dem der Spieler seine Pflanze nie wirklich kennt, verliert nach 2 Wochen seine Anziehungskraft. Story-Beats schaffen Bindung durch kleine Entdeckungsmomente: der erste Blick durch das Mikroskop, die erste sichtbare Erholung nach Stress, der Geruch der reifen Buds.

**3. Grower-Reife langfristig vermitteln.**
Grow-Kompetenz ist kein Sprint. Es ist Erfahrung die sich über Monate und Grows aufbaut. Learning-Beats modellieren diesen Reifeprozess — von der Unsicherheit des ersten Keimlings bis zur ruhigen Sicherheit des erfahrenen Growers.

---

## 2. Unterschied zu normalen Events

| Dimension | Normale Events | Learning/Story Beats |
|-----------|---------------|----------------------|
| Auslöser | Problem, Schwellenwert, Druck | Meilenstein, erste Erfahrung, Kompetenzsprung |
| Grundgefühl | Dringlichkeit, Handlungszwang | Ruhe, Entdeckung, Bestätigung |
| Konsequenz | Positive oder negative Auswirkung | Keine negativen Auswirkungen — nur Lerngewinn |
| Coach-Ton | Diagnostisch, direktiv, warnend | Reflektierend, ermutigend, fragend |
| Spieler-Rolle | Reaktiver Entscheider | Aktiver Beobachter, Reflektierender |
| Visuell | UI-Alarm, farbige Warnanzeige | Sanfte Animation, warme Farbtöne |
| Audio | Warnsignal, Dringlichkeitstone | Ruhige Atmosphäre, Naturgeräusche |
| Retention-Wirkung | Verhindert Abbruch durch Krise | Erzeugt emotionale Anhaftung |
| Zeitpunkt | Wenn Schwellenwert überschritten | Wenn etwas zum ersten Mal gut läuft |

**Faustregel:** Ein normales Event fragt „Was tust du jetzt?" Ein Story Beat fragt „Hast du das bemerkt?"

---

## 3. Coach-Tonalität für Beats

Der Coach hat in normalen Events eine klare, handlungsorientierte Stimme. In Story-Beats wechselt er die Rolle — er wird zum Mentor, Begleiter und manchmal zum Spiegel.

**Drei Beat-Tonalitäten:**

**Tonalität A: Staunen zulassen**
„Schau dir das an." — Kurze Aufforderung zur Beobachtung. Kein Expertenwissen, kein Druck. Nur Aufmerksamkeit lenken auf etwas das schon da ist.

Beispiel: *„Die Pistillen sind heute Morgen erschienen. Weiß, dünn, kaum sichtbar. Und doch ist das der Beginn von allem was du in den nächsten acht Wochen anstreben wirst."*

**Tonalität B: Verstehen bestätigen**
„Du hast das gerade richtig gemacht — und hier ist warum." — Kein Jubel, keine übertriebene Gratulation. Sachliche Anerkennung kombiniert mit der Erklärung des Mechanismus. Der Spieler soll verstehen, nicht nur fühlen.

Beispiel: *„Du hast nicht gegossen obwohl die Pflanze hing. Und sie hat sich erholt. Das war das richtige Lesen — nicht jedes Hängen ist Durst."*

**Tonalität C: Innehalten einladen**
„Das hier ist ein Moment." — Narrative Einladung zur Reflexion. Was ist gerade passiert? Was bedeutet das im größeren Bild? Keine Information, nur Präsenz.

Beispiel: *„Erster Harvest. Die Buds in deiner Hand. Alles was die letzten sieben Wochen passiert ist — die Fehler, die Korrekturen, die Geduld — hat dazu geführt."*

---

## 4. Trigger-Philosophie

Story-Beats werden nicht durch Druck ausgelöst — sie werden durch Präzision ausgelöst.

**Drei Trigger-Typen:**

**Erstes Mal (First-Time-Trigger):**
Der mächtigste Trigger. Jede Handlung die der Spieler zum ersten Mal ausführt ist ein Fenster für Lernen. Das erste Mal topppen, das erste Mal eine Diagnose stellen, das erste Mal flushen. Diese Momente sind einmalig und unvergesslich.
```
player.action.firstTime === true
```

**Richtige Entscheidung bei schwieriger Situation (Decision-Quality-Trigger):**
Wenn der Spieler eine schwierige Entscheidung korrekt trifft — besonders wenn sie kontra-intuitiv ist (nicht gießen obwohl Pflanze hängt, nichts tun nach Umtopfen).
```
player.correctActionOnDifficultEvent === true
AND player.interventionResisted === true
```

**Sichtbare Verbesserung (Observation-Trigger):**
Wenn die Simulation zeigt dass eine Pflanze sich erholt oder verbessert hat — und der Spieler die Möglichkeit bekommt das zu beobachten statt es nur zu registrieren.
```
plant.healthDelta > 0.2 (letzte 48h)
AND plant.previousStressEvent === true
AND player.interactionPause > 24h
```

---

## 5. Lernrhythmus

Story-Beats sollten in einem natürlichen Rhythmus auftreten — nicht zu häufig, nicht zu selten.

**Verteilung über einen 70-tägigen Grow:**

| Phase | Tage | Erwartete Beats | Schwerpunkt |
|-------|------|-----------------|-------------|
| Seedling/Early Veg | 1–18 | 3–4 | Erste Erfahrungen, Grundverständnis |
| Veg | 19–35 | 2–3 | Training, Klima, Diagnose-Kompetenz |
| Preflower/Early Flower | 36–49 | 2–3 | Blütenverständnis, Qualitätsfokus |
| Mid/Late Flower | 50–63 | 2–3 | Trichome, Reife, Geduld |
| Harvest Window | 64–70 | 1–2 | Ernte, Reflexion, Abschluss |
| **Gesamt** | **70** | **10–15** | |

**Wichtig:** Story-Beats unterbrechen keine aktiven Krisen-Events. Der Story Curator prüft ob gerade ein aktives Event mit Handlungsdruck läuft — wenn ja, wird der Beat 24–48h zurückgestellt.

---

## 6. Progressionslogik

Story-Beats sind nicht random — sie folgen einer Kompetenz-Kurve.

**Drei Progressionsstufen:**

**Stufe 1 — Orientierung (Grow 1, Weeks 1–3):**
Beats fokussieren auf das Elementare: Pflanze wächst, erste Beobachtungen, erste Diagnosen. Der Coach ist noch führend, erklärend.

**Stufe 2 — Kompetenzaufbau (Grow 1–2, Mid-Game):**
Beats bestätigen Lernfortschritte, stellen komplexere Zusammenhänge her. Der Coach wird reflektierender — stellt öfter Fragen statt Antworten zu geben.

**Stufe 3 — Grower-Identität (Grow 2+):**
Beats adressieren den Spieler als erfahrenen Grower. Coach wechselt von Führung zu Gleichrangigkeit. Der Spieler hat Selbstvertrauen — Beats spiegeln das.

---

## 7. Zusammenhang mit KnowledgeProfile und CompetenceMap

Jeder Story-Beat trägt zu einem persistenten **KnowledgeProfile** des Spielers bei. Das KnowledgeProfile ist eine unsichtbare Kompetenz-Karte die folgendes trackt:

```json
{
  "knowledgeProfile": {
    "watering": 0.0–1.0,
    "nutrients": 0.0–1.0,
    "climate_vpd": 0.0–1.0,
    "light_ppfd": 0.0–1.0,
    "rootzone": 0.0–1.0,
    "pests": 0.0–1.0,
    "training": 0.0–1.0,
    "harvest": 0.0–1.0,
    "patience": 0.0–1.0,
    "observation": 0.0–1.0
  }
}
```

**Wie Story-Beats das KnowledgeProfile beeinflussen:**
- Jeder Beat der einem Bereich zugeordnet ist erhöht den entsprechenden Score um 0.05–0.15
- Korrekte Entscheidungen bei schwierigen Events erhöhen `observation` und `patience`
- Das KnowledgeProfile beeinflusst welche Events zukünftig angeboten werden (Schwierigkeitsanpassung)
- Höheres `observation`-Profil: mehr subtile Frühwarn-Events, weniger offensichtliche Krisen

**CompetenceMap** (geplantes UI-Element):
Visuelle Darstellung des KnowledgeProfile — zeigt dem Spieler seinen Wissensstand über Wachstumsphasen und Kategorien. Story-Beats leuchten die entsprechenden Felder der Map auf.

---

## 8. Zusammenhang mit Journal und Achievement-System

Jeder Story-Beat hinterlässt einen **Journal-Eintrag**. Das Journal ist ein persistentes Wachstumstagebuch das über alle Grows gespeichert wird.

**Journal-Eintrag-Format:**
```
[Tag X, Grow Y] — [Beat-Name]
[Coach-Text des Beats]
[Pflanzenstatus-Snapshot: Stage, Health, Key-Variables]
[Player-Notiz: optionales Textfeld]
```

**Achievement-System-Verknüpfung:**
Bestimmte Kombinationen von Beats schalten Achievement-Badges frei:

| Achievement | Bedingung | Badge-Idee |
|-------------|-----------|------------|
| Stille Beobachter | 5 Observation-Beats ohne Fehlintervention | Auge mit Blatt |
| Gedulds-Grower | 3× nicht gegossen wenn Pflanze hing + Recovery | Sanduhr mit Blatt |
| Diagnose-Talent | 5 korrekte First-Diagnosen | Lupe mit Tropfen |
| Resilienz | Pflanze nach Schädling UND Hitzewelle gerettet | Pflanze mit Schild |
| Trichom-Kenner | Trichom-Check vor jeder Ernte genutzt | Kristall-Trichom |
| Ruhige Hand | Ernte erst entschieden als Trichome richtig | Schere mit Tropfen |

---

## 9. Zusammenhang mit Event-Ketten

Story-Beats können **Enden von Event-Ketten** markieren — der emotionale Abschluss nach einer Krise.

**Beispiel: Kette EC-01 (Wurzelfäule-Spirale)**
- Akt 1: W-I-01 (Staunässe erkannt) — Crisis Event
- Akt 2: R-I-03 (Wurzelfäule) — Crisis Event
- Akt 3: Spieler rettet Pflanze durch korrektes Handeln
- **Abschluss-Beat:** SB-17 „Ich habe diese Pflanze gerettet" — Recovery Story Beat

**Beispiel: Kette EC-05 (Spinnmilben-Ausbruch)**
- Drei Behandlungsrunden erfolgreich abgeschlossen
- **Abschluss-Beat:** SB-23 „Schädling überstanden" — Resilienz Beat

Die Verknüpfung von Krisen-Ketten mit Story-Beat-Abschlüssen erzeugt narrative Bögen statt einfacher Ereignis-Listen.

---

## 10. Die 27 Learning- und Story-Beats

### Legende

| Feld | Bedeutung |
|------|-----------|
| **Beat-Typ** | Milestone / Learning / Observation / Reflection / Recovery / Mastery |
| **Tonalität** | A (Staunen) / B (Verstehen) / C (Innehalten) |
| **KP-Bereich** | Welcher KnowledgeProfile-Bereich erhöht wird |

---

#### SB-01 · Erster Keimling — Das Versprechen

🌐 | **Typ:** Milestone | **Tonalität:** A | **Stage:** S0

**Trigger:**
```
plant.germination === true AND player.totalGrows === 1 AND player.totalSeedlings === 1
```

**Coach-Text:**
*„Da ist er. Ein paar Millimeter grünes Leben das vor zwei Tagen noch ein Samen war. Er weiß noch nicht dass du da bist. Aber das ist okay — du hast Zeit, ihn kennenzulernen."*

**Lernziel:** Keimling als lebendiges System einführen; erste Brücke zwischen Spieler und Pflanze bauen.

**Beobachtungsfokus:** Kotelydonen (Keimblätter), Hypokotyl-Länge, erster Orientierungsimpuls zur Lichtquelle.

**KP-Bereich:** `observation +0.05`

**Folgefreischaltungen:** Unlock Grundpflege-Tipps in Coach-Library. Journal-Eintrag Tag 1.

**Audio-Idee:** Erster Tau-Tropfen-Sound; ruhige, helle Synthesizer-Note.

**Haptik-Idee:** Kurze sanfte Vibration — nicht als Alarm, sondern als Begrüßung.

**Journal-Verknüpfung:** „Mein erster Keimling" — vorausgefüllter Journal-Eintrag mit Platz für Notiz.

**Achievement-Verknüpfung:** Erster Schritt zu „Gedulds-Grower".

**Event-Ketten-Verbindung:** Auftakt für alle späteren First-Time-Beats.

**Asset-Idee:** `img:first-seedling-tender` — Makroaufnahme eines Keimlings mit Wassertropfen auf Kotyledonen.

---

#### SB-02 · Erstes echtes Hinschauen — Die Pflanze wirklich sehen

🌐 | **Typ:** Observation | **Tonalität:** A | **Stage:** S1

**Trigger:**
```
player.plantInspectionDuration > 30s AND player.totalInspections === 3
AND plant.stage === "early_veg"
```
*(Spieler schaut sich die Pflanze zum dritten Mal genau an — Hinweis auf entstehende Beobachtungsroutine)*

**Coach-Text:**
*„Du schaust wieder. Das ist wichtiger als du vielleicht denkst. Nicht jeder Grower macht das. Die meisten prüfen Nummern — pH, EC, VPD. Aber Pflanzen kommunizieren in Bildern, nicht in Zahlen. Was siehst du heute das gestern noch nicht da war?"*

**Lernziel:** Beobachtung als primäre Grow-Kompetenz einführen. Unterschied zwischen Daten lesen und Pflanze lesen.

**Beobachtungsfokus:** Neue Triebe seit gestern, Blattorientierung, Stängelfarbe, Internodalabstand.

**KP-Bereich:** `observation +0.10`

**Folgefreischaltungen:** Unlock „Tägliche Sichtkontrolle"-Routine in Coach-Library.

**Audio-Idee:** Stille mit leichtem Windgeräusch. Kein Effekt-Sound — bewusste Ruhe.

**Journal-Verknüpfung:** „Was ich heute zum ersten Mal gesehen habe" — offener Eintrag.

**Asset-Idee:** `img:close-inspection-leaves` — Draufsicht Blatt mit sichtbaren Blattadern und Trichomansatz.

---

#### SB-03 · Das Lift-Gefühl — Gießen mit Händen statt Kalender

🌐 | **Typ:** Learning | **Tonalität:** B | **Stage:** S1–S3

**Trigger:**
```
player.liftTestPerformed === true AND player.wateringDecisionCorrect === true
AND player.calendarBasedWateringPrevented === true
```
*(Spieler hat Lift-Test gemacht und auf Basis des Ergebnisses korrekt entschieden, nicht zu gießen)*

**Coach-Text:**
*„Du hast den Topf angehoben, gespürt dass er noch schwer ist — und die Kanne weggelegt. Das klingt nach nichts. Aber genau das unterscheidet einen Grower der seine Pflanze kennt von einem der einem Zeitplan folgt. Deine Hände wissen jetzt etwas dein Kopf noch nicht wusste."*

**Lernziel:** Lift-Test als körperliches Diagnosewerkzeug internalisieren. Sensorik statt Routine.

**Beobachtungsfokus:** Topfgewicht vor und nach dem Gießen; Substrat-Feuchte-Rhythmus.

**KP-Bereich:** `watering +0.10`, `observation +0.05`

**Folgefreischaltungen:** Unlock „Trocken-Nass-Zyklus"-Erklärung in Coach-Library.

**Audio-Idee:** Kurzes Wasser-Plätschern das dann aufhört. Stille danach.

**Journal-Verknüpfung:** „Das erste Mal nicht gegossen" — Eintrag mit Substrat-Snapshot.

**Achievement-Verknüpfung:** Zählt zu „Gedulds-Grower".

**Asset-Idee:** `img:lifting-pot-both-hands` — Hände heben Topf, ruhige Komposition.

---

#### SB-04 · Erste richtige Diagnose — Das Muster erkannt

🌐 | **Typ:** Learning | **Tonalität:** B | **Stage:** S1–S4

**Trigger:**
```
player.correctDiagnosis === true AND player.firstDiagnosisEvent === true
AND event.diagnosisCategory !== "obvious"
```
*(Erste nicht-offensichtliche Diagnose korrekt gestellt — nicht nur Trockenstress)*

**Coach-Text:**
*„Du hast nicht gegossen. Du hast nicht einfach mehr Dünger gegeben. Du hast geschaut, gemessen, nachgedacht — und dann die richtige Ursache identifiziert. Das ist keine Kleinigkeit. Die meisten Fehler entstehen dadurch dass man das Symptom behandelt statt die Ursache. Du hast heute die Ursache gefunden."*

**Lernziel:** Ursache-Wirkung-Denken als Grundmuster etablieren. Diagnose vor Therapie.

**Beobachtungsfokus:** Welche Schritte hat der Spieler unternommen? Was war der entscheidende Hinweis?

**KP-Bereich:** `observation +0.15`, je nach Kategorie +0.10 im spezifischen Bereich.

**Folgefreischaltungen:** Unlock erweitertes Diagnose-Schema in Coach-Library. CompetenceMap zeigt ersten aufgeleuchteten Bereich.

**Journal-Verknüpfung:** „Meine erste richtige Diagnose" — Eintrag mit Event-Kategorie, Symptom und Lösung.

**Achievement-Verknüpfung:** Erster Schritt zu „Diagnose-Talent".

**Asset-Idee:** `img:diagnosis-moment-lamp` — Lupe über Blatt, Licht von oben.

---

#### SB-05 · Geduld statt Überreaktion — Pflanze erholt sich von selbst

🌐 | **Typ:** Observation | **Tonalität:** B | **Stage:** S1–S5

**Trigger:**
```
player.interventionResisted === true
AND plant.selfRecovery === true
AND plant.healthDelta > 0.15 (ohne Spielereingriff, letzte 24h)
```
*(Pflanze hat sich erholt ohne dass der Spieler eingegriffen hat — obwohl er es wollte)*

**Coach-Text:**
*„Du wolltest eingreifen. Ich habe dich aufgehalten. Und jetzt siehst du das Ergebnis: die Pflanze hat sich selbst geholfen. Sie hing gestern nachmittags — heute morgen steht sie. Das ist keine Magie. Das ist Biologie. Und das wichtigste was du heute gelernt hast: nicht jedes Signal braucht eine Antwort von dir."*

**Lernziel:** Selbstheilungskraft der Pflanze erleben. Geduld als aktive Entscheidung verstehen.

**Beobachtungsfokus:** Vorher-nachher-Blattposition. Zeitspanne der Erholung. Was hat die Pflanze gebraucht?

**KP-Bereich:** `patience +0.15`, `observation +0.10`

**Folgefreischaltungen:** Unlock „Thermoregulation und natürliches Hängen"-Erklärung.

**Audio-Idee:** Zeitraffer-artiger Sound — leises Wachsen, dann Stille.

**Journal-Verknüpfung:** „Das Mal wo ich nichts getan habe" — Eintrag, der später Referenz für ähnliche Situationen ist.

**Achievement-Verknüpfung:** Zählt zu „Stille Beobachter" und „Gedulds-Grower".

**Asset-Idee:** `img:plant-recovery-timelapse` — Pflanze vorher hängend, nachher aufrecht, sanfter Split-Screen.

---

#### SB-06 · Weiße Wurzeln — Das unsichtbare Fundament

🌐 | **Typ:** Discovery | **Tonalität:** A | **Stage:** S1–S3

**Trigger:**
```
player.repottingAction === true AND plant.rootHealth > 0.85
AND player.rootInspection === true
```

**Coach-Text:**
*„Heb sie mal an. Schau da unten hin. Weiß. Fest. Verzweigt. Das ist was unter jeder gesunden Pflanze steckt — und das siehst du fast nie. Diese Wurzeln haben die ganze Zeit gearbeitet während du die Blätter angeschaut hast. Merk dir wie das aussieht. Denn wenn Wurzeln braun und schleimig sind, weißt du was nicht stimmt."*

**Lernziel:** Wurzelgesundheit als primärer Gesundheitsmarker einführen. Weißes Wurzelbild als Referenzpunkt etablieren.

**Beobachtungsfokus:** Farbe, Festigkeit, Geruch, Verzweigungsgrad.

**KP-Bereich:** `rootzone +0.15`, `observation +0.05`

**Folgefreischaltungen:** Unlock Wurzelgesundheits-Indikator in Pflanzen-UI. Referenz für R-I-03-Diagnose.

**Audio-Idee:** Stille mit leisem Erdgeruch-Assoziation (kein Audio, aber Haptik).

**Haptik-Idee:** Leichte Rumble-Vibration — Erde, Substrat, Verwurzelung.

**Journal-Verknüpfung:** „Meine ersten gesunden Wurzeln" — Foto-Slot im Journal (Screenshot-Feature).

**Asset-Idee:** `img:white-roots-close` — Makroaufnahme weißer Wurzeln auf dunklem Substrat.

---

#### SB-07 · VPD verstehen — Die unsichtbare Variable

🌐 | **Typ:** Learning | **Tonalität:** B | **Stage:** S2–S3

**Trigger:**
```
player.vpdAdjustmentCorrect === true
AND plant.vpdOptimalDays >= 2
AND player.firstVpdConceptEngagement === true
```

**Coach-Text:**
*„Zwei Tage optimales VPD. Merkst du den Unterschied im Wachstum? Neue Triebe täglich. Blätter ausgerichtet. Das ist kein Zufall — das ist das Ergebnis einer unsichtbaren Variable die du jetzt siehst. VPD ist nicht kompliziert. Es ist die Frage: hat meine Pflanze gerade Durst auf Luft — oder erstickt sie in Feuchtigkeit? Du weißt die Antwort jetzt."*

**Lernziel:** VPD von abstraktem Konzept zu erlebbarem Zusammenhang machen. Klima und Wachstum direkt verknüpfen.

**Beobachtungsfokus:** Wachstumsrate vor/nach VPD-Optimierung. Blattorientierung. Transpirationsverhalten.

**KP-Bereich:** `climate_vpd +0.20`

**Folgefreischaltungen:** Unlock VPD-Echtzeitmessung in Klima-UI. VPD-Tabelle dauerhaft verfügbar.

**Journal-Verknüpfung:** „Das Mal wo ich VPD verstanden habe" — mit VPD-Wert-Snapshot.

**Achievement-Verknüpfung:** „Klima-Kenner" — VPD-Verständnis bestätigt.

**Asset-Idee:** `img:vpd-learning-moment` — Pflanze mit Wasserdampf-Visualisierung, ruhige Szene.

---

#### SB-08 · Erste Blütenanzeichen — Der Beschluss der Pflanze

🌐 | **Typ:** Milestone | **Tonalität:** C | **Stage:** S3

**Trigger:**
```
plant.firstPistils === true AND player.totalGrows <= 2
```

**Coach-Text:**
*„Sieh dir das an. Weiße Pistillen. Kaum sichtbar, zart wie Fäden. Die Pflanze hat gerade einen Beschluss gefasst — einen den du nicht rückgängig machen kannst. Sie hat entschieden zu blühen. Nicht weil du es gesagt hast. Weil die Dunkelheit lang genug war. Ab jetzt arbeitet jede Zelle dieser Pflanze auf die Buds hin. Alles andere ist Vergangenheit."*

**Lernziel:** Photoperiodischen Blühauslöser emotional verankern. Übergang Veg → Blüte als Wendepunkt markieren.

**Beobachtungsfokus:** Position der ersten Pistillen, Calyx-Bildung, Sortenspezifische Unterschiede.

**KP-Bereich:** `harvest +0.05`, `observation +0.10`

**Folgefreischaltungen:** Unlock Blüten-Phasen-Übersicht. Trichom-Tutorial freigeschaltet.

**Audio-Idee:** Tiefer, warmer Ton — Übergang, kein Alarm. Eher wie eine Glocke in der Ferne.

**Journal-Verknüpfung:** „Der erste Blütenanfang" — automatischer Stage-Eintrag.

**Event-Ketten-Verbindung:** Startpunkt für alle Blüten-spezifischen Events (CAT-9).

**Asset-Idee:** `img:first-pistils-golden` — Erste Pistillen in warmem Licht, Makro.

---

#### SB-09 · Das erste Topping — Mut als Kompetenz

🌐 | **Typ:** Milestone | **Tonalität:** B | **Stage:** S1–S2

**Trigger:**
```
player.firstToppingAction === true AND training.toppingNodeCount >= 5
```
*(Korrekt getimtes Topping — nach dem 5. Nodenpaar)*

**Coach-Text:**
*„Das sah brutal aus. Eine intakte Pflanze anschneiden ist ein Vertrauensakt — du musst darauf vertrauen dass sie zurückkommt. Und sie wird es. In 5 Tagen werden an genau dieser Schnittstelle zwei neue Triebe stehen. Die Pflanze antwortet auf Verlust mit Wachstum. Das ist einer der elegantesten Mechanismen der Botanik."*

**Lernziel:** Apikale Dominanz und ihre Überwindung durch Topping verstehen. Vertrauen in Pflanzenreaktion aufbauen.

**Beobachtungsfokus:** Auxin-Umverteilung beobachten: Seitentriebe beginnen sich aufzurichten.

**KP-Bereich:** `training +0.15`

**Folgefreischaltungen:** Unlock FIM-Technik-Tutorial. Canopy-Management-Guide.

**Audio-Idee:** Kurzes, scharfes Klick-Geräusch (Schere) — dann Stille. Dann leises Wachsen.

**Journal-Verknüpfung:** „Mein erstes Topping" mit Knoten-Zahl und Ergebnis-Beobachtung 5 Tage später.

**Event-Ketten-Verbindung:** Wenn danach TR-I-02 (Topping-Timing) aufgetreten ist, wird hier der Lernbogen geschlossen.

**Asset-Idee:** `img:topping-cut-new-growth` — Schnittstelle mit zwei neuen Trieben sichtbar.

---

#### SB-10 · Pflanze erholt sich sichtbar — Sehen wie Leben zurückkommt

🌐 | **Typ:** Recovery | **Tonalität:** A | **Stage:** S1–S5

**Trigger:**
```
plant.healthRecovery > 0.25 (letzte 48h)
AND event.previousStressEvent.severity >= 3
AND player.correctActionTaken === true
```

**Coach-Text:**
*„Schau sie dir an. Gestern hing sie. Heute steht sie wieder. Nicht perfekt — aber sie steht. Das ist Resilienz. Das ist was Pflanzen tun wenn sie die Möglichkeit bekommen: sie kämpfen zurück. Du hast ihnen den Raum gegeben dazu. Das ist dein Anteil."*

**Lernziel:** Resilienz der Pflanze als Partnerschaft erleben: Spieler-Aktion + Pflanzen-Reaktion.

**Beobachtungsfokus:** Blattorientierung, Stängelaufrichtung, neue Triebe nach Stress.

**KP-Bereich:** `observation +0.10`, `patience +0.10`

**Audio-Idee:** Sanfter Aufwärts-Ton. Nicht triumphierend — eher ein erleichtertes Aufatmen.

**Journal-Verknüpfung:** „Sie ist zurückgekommen" — Eintrag mit Before/After-Snapshot.

**Achievement-Verknüpfung:** Zählt zu „Resilienz".

**Asset-Idee:** `img:plant-rising-recovery` — Pflanze die sich aufrichtet, Blätter angehoben, warmes Licht.

---

#### SB-11 · pH verstehen als System — Der Filter hinter allem

🌐 | **Typ:** Learning | **Tonalität:** B | **Stage:** S2–S4

**Trigger:**
```
player.phCorrectionCorrect === true AND plant.nutrientLockoutResolved === true
AND player.phUnderstandingScore === 0 (erster pH-Lernmoment)
```

**Coach-Text:**
*„Du hast nicht mehr Dünger gegeben. Du hast den pH korrigiert — und die Pflanze hat angefangen aufzunehmen. Das ist der wichtigste Mechanismus im Grow. pH ist kein Parameter unter vielen. pH ist der Filter durch den alle Nährstoffe müssen. Falsch eingestellt, egal was du gibst — es kommt nicht an. Richtig eingestellt, funktioniert alles andere besser. Das hast du heute verstanden."*

**Lernziel:** pH als systemischen Filter verstehen, nicht als einzelnen Parameter.

**Beobachtungsfokus:** Symptomveränderung nach pH-Korrektur. Welche Mangelzeichen haben sich verbessert?

**KP-Bereich:** `nutrients +0.15`, `watering +0.05`

**Folgefreischaltungen:** Unlock pH-Aufnahme-Fenster-Tabelle in Coach-Library.

**Journal-Verknüpfung:** „Der Tag wo pH alles erklärt hat" — dauerhafter Eintrag als Referenz.

**Asset-Idee:** `img:ph-system-diagram` — Einfache Grafik: pH-Fenster mit Nährstoff-Verfügbarkeit.

---

#### SB-12 · Stressakkumulation erkennen — Kleine Fehler addieren sich

🌐 | **Typ:** Learning | **Tonalität:** C | **Stage:** S2–S4

**Trigger:**
```
plant.stressAccumulation > 60
AND player.multipleSmallErrors === true (mind. 3 suboptimale Entscheidungen letzte 7 Tage)
AND plant.overallHealth < 0.60
```

**Coach-Text:**
*„Keiner dieser Fehler war groß genug um allein zu schaden. pH um 0.3 zu hoch. VPD gelegentlich außerhalb des Fensters. Ein extra Gießvorgang. Jeder einzeln — vernachlässigbar. Zusammen — siehst du das Ergebnis. Stress akkumuliert sich nicht dramatisch. Er schleicht sich ein. Diese Pflanze ist nicht krank. Sie ist erschöpft. Das ist ein anderes Problem mit einer anderen Lösung: Ruhe."*

**Lernziel:** Kumulativen Stress als eigene Kategorie verstehen. Differenzieren zwischen akuter Krise und chronischem Stress.

**Beobachtungsfokus:** Welche der kleinen Fehler hatten die meiste Auswirkung?

**KP-Bereich:** `patience +0.15`, `observation +0.10`

**Folgefreischaltungen:** Unlock Stress-Akkumulations-Indikator in Pflanzen-UI.

**Journal-Verknüpfung:** „Woche X — Warum kleine Fehler zählen" — Eintrag mit Fehler-Liste.

**Asset-Idee:** `img:stress-accumulation-subtle` — Pflanze die leicht, aber insgesamt geschwächt aussieht. Kein offensichtlicher Schaden.

---

#### SB-13 · Ursache → Wirkung zum ersten Mal verstanden

🌐 | **Typ:** Learning | **Tonalität:** B | **Stage:** S2–S5

**Trigger:**
```
player.causationChainIdentified === true
AND event.diagnosisDepth >= 2 (Spieler hat zweistufige Ursache identifiziert)
```
*(z.B.: Lüfterausfall → Temperaturanstieg → VPD-Shift; oder: Staunässe → Sauerstoffmangel → Wurzelfäule)*

**Coach-Text:**
*„Du hast nicht nur das Symptom gesehen. Du hast die Kette gelesen: was hat zu was geführt, und was davon war der eigentliche Anfang. Das ist eine Fähigkeit die viele Grower nie entwickeln. Sie behandeln Symptome ihr Leben lang. Du fängst an, Systeme zu verstehen."*

**Lernziel:** Kausales Systemdenken im Grow-Kontext verankern. Unterschied zwischen Symptom und Ursache.

**Beobachtungsfokus:** Welche Variable war die ursprüngliche Ursache? Wie viele Schritte lagen zwischen Ursache und sichtbarem Symptom?

**KP-Bereich:** `observation +0.20`

**Folgefreischaltungen:** Unlock Event-Ketten-Ansicht in Coach-Library. Zeigt welche Events miteinander verknüpft sein können.

**Journal-Verknüpfung:** „Die Kette die ich heute gelesen habe" — mit Ursache-Wirkung-Diagram.

**Event-Ketten-Verbindung:** Direkter Verweis auf aktive Event-Kette (EC-01 bis EC-10).

**Asset-Idee:** `img:cause-effect-chain` — Einfache visuelle Kette: drei verbundene Kreise.


---

### SB-14: Erste Schädlingskontrolle erfolgreich

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-14 |
| **Titel** | Erste Schädlingskontrolle erfolgreich |
| **Emoji** | 🛡️ |
| **Typ** | Kompetenz-Bestätigung |
| **Tonalität** | B – Verstehen |
| **Setup** | both |
| **Stage** | S4–S6 (Stretch bis Reife) |
| **Trigger** | Pest-Event vollständig gelöst (P-B-05 / P-I-01 / P-O-01) ohne Schwere-5-Eskalation |
| **Voraussetzung** | Schädlings-Event mindestens 72h aktiv, dann korrekt behandelt |
| **KnowledgeProfile-Effekt** | `pest_management +0.15`, `observation +0.08` |
| **Coach-Nachricht** | „Du hast früh genug hingeschaut — das war der entscheidende Unterschied. Schädlinge verlieren immer gegen Grower, die ihre Pflanzen wirklich beobachten." |
| **Visuelles Element** | Vorher/Nachher-Vergleich: befallenes Blatt → sauberes Blatt mit neuem Trieb |
| **Journal-Eintrag** | „[Datum]: Befall erkannt, behandelt, überstanden. Ich habe gelernt: [Schädlingsname] erkennt man an [Symptom]." |
| **Achievement** | „Wachsamer Grower" – erstes Schädlings-Event ohne Pflanzenverlust gelöst |

**Ursache → Wirkung-Brücke:**
Schädlinge kommen — das ist keine Frage von Können oder Pech. Die Frage ist nur: Wann siehst du sie? Ein Grower, der regelmäßig unter die Blätter schaut, sieht den Befall bei 3 Milben — nicht erst bei 3.000.

**Lernmoment-Text (UI-Overlay):**
> *„Früherkennung ist keine Fähigkeit, die man lernt — es ist eine Gewohnheit, die man aufbaut. Du hast heute diese Gewohnheit ein Stück gefestigt."*

---

### SB-15: Das vollständige Gieß-Gefühl

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-15 |
| **Titel** | Das vollständige Gieß-Gefühl |
| **Emoji** | 💧 |
| **Typ** | Intuitions-Milestone |
| **Tonalität** | A – Staunen |
| **Setup** | both |
| **Stage** | S2–S4 (nach mindestens 3 erfolgreichen Gieß-Zyklen) |
| **Trigger** | 5 aufeinanderfolgende korrekte Gießentscheidungen (Lift-Test + Runoff-Check + richtiger Zeitpunkt) ohne Wasser-Event |
| **Voraussetzung** | W-B-02 oder W-I-01 bereits erlebt |
| **KnowledgeProfile-Effekt** | `watering +0.20`, `observation +0.05` |
| **Coach-Nachricht** | „Weißt du, was du gerade getan hast? Du hast fünfmal hintereinander richtig gegossen — nicht nach Kalender, sondern nach Pflanze. Das ist echter Fortschritt." |
| **Visuelles Element** | Animiertes Wasser-Ikon wird zu einem leuchtenden Tropfen; Lift-Test-Piktogramm erhält Häkchen |
| **Journal-Eintrag** | „[Datum]: Ich gieße jetzt nach dem Lift-Test, nicht mehr nach dem Kalender. Die Pflanze zeigt mir selbst, wann sie Durst hat." |
| **Achievement** | „Wasser-Intuition" – 5 korrekte Gießentscheidungen in Folge |

**Ursache → Wirkung-Brücke:**
Gießen ist die häufigste Fehlerquelle für Anfänger — zu viel, zu wenig, zu regelmäßig. Das Gegenmittel ist nicht Wissen, sondern Fühlen. Der Topf in der Hand ist ein Sensor. Wer das einmal wirklich versteht, überwässert nie wieder chronisch.

**Lernmoment-Text (UI-Overlay):**
> *„Du bist vom Kalender-Grower zum Pflanzen-Grower geworden. Das ist ein echter Schritt."*

---

### SB-16: Fehler gemacht — Pflanze überlebt trotzdem

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-16 |
| **Titel** | Fehler gemacht — Pflanze überlebt trotzdem |
| **Emoji** | 🌿 |
| **Typ** | Resilienz-Beat |
| **Tonalität** | C – Innehalten |
| **Setup** | both |
| **Stage** | S2–S6 (nach Recovery-Event) |
| **Trigger** | Schwere-3- oder Schwere-4-Event gelöst, nachdem Spieler zunächst falsch reagiert hat (falsche erste Antwort, dann korrigiert) |
| **Voraussetzung** | Mindestens 1 Fehlentscheidung im Event-Verlauf |
| **KnowledgeProfile-Effekt** | `stress_management +0.12`, allgemein +0.04 in aktivem Bereich |
| **Coach-Nachricht** | „Du hast einen Fehler gemacht. Die Pflanze hat es überlebt. Das sagt dir etwas Wichtiges: Pflanzen sind nicht zerbrechlich — und Fehler sind nicht das Ende." |
| **Visuelles Element** | Pflanze mit leichter Narbe am Blatt, aber frischem Austrieb an der Spitze |
| **Journal-Eintrag** | „[Datum]: Ich habe [Fehler] gemacht. Die Pflanze hat es mir verziehen. Nächstes Mal würde ich früher [Korrekturmaßnahme] tun." |
| **Achievement** | „Gelernt durch Fehler" – erstes Event mit Fehlentscheidung trotzdem abgeschlossen |

**Ursache → Wirkung-Brücke:**
Perfektion ist keine Voraussetzung für gutes Gärtnern. Pflanzen haben Puffersysteme. Die wichtigste Lektion ist nicht „mach keine Fehler", sondern „erkenne Fehler früh genug, um gegenzusteuern". Wer zu perfektionistisch ist, reagiert zu langsam — aus Angst, den falschen Zug zu machen.

**Lernmoment-Text (UI-Overlay):**
> *„Pflanzenwachstum ist kein Glaskunstwerk. Es ist ein lebendiges System mit Toleranz. Du darfst Fehler machen — solange du hinschaust."*

---

### SB-17: „Ich habe diese Pflanze gerettet"

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-17 |
| **Titel** | Ich habe diese Pflanze gerettet |
| **Emoji** | 🏆 |
| **Typ** | Emotional-Peak-Beat |
| **Tonalität** | A – Staunen (mit emotionaler Tiefe) |
| **Setup** | both |
| **Stage** | S3–S6 (nach dramatischer Recovery) |
| **Trigger** | Schwere-5-Event gelöst OHNE Pflanzenverlust |
| **Voraussetzung** | Event-Severity war 5, Plant-Health < 30%, dann Recovery auf > 60% |
| **KnowledgeProfile-Effekt** | +0.20 in betroffenem Bereich, `confidence +0.15` (hidden stat) |
| **Coach-Nachricht** | „Das war knapp. Wirklich knapp. Aber du hast es geschafft. Diese Pflanze lebt — weil du nicht aufgegeben hast und die richtigen Entscheidungen getroffen hast. Das vergisst du nicht." |
| **Visuelles Element** | Full-screen Moment: Pflanze in sattem Grün, leichte Bloom-Partikelanimation, Kamerafahrt von unten nach oben |
| **Journal-Eintrag** | „[Datum]: Schwere Krise. Ich dachte, sie stirbt. Aber ich habe [Maßnahme] und [Maßnahme] gemacht — und sie hat es geschafft. Mein bisher stolzester Moment." |
| **Achievement** | „Lebensretter" – Schwere-5-Event ohne Pflanzenverlust abgeschlossen |

**Ursache → Wirkung-Brücke:**
Dieser Moment passiert selten — aber wenn er kommt, verändert er die Beziehung zur Pflanze. Man realisiert: Gärtnern ist nicht nur Technik. Es ist Ausdauer, Aufmerksamkeit, Verantwortung. Dieser Beat ist der emotionale Höhepunkt des frühen Spielverlaufs.

**Lernmoment-Text (UI-Overlay):**
> *„Manche Pflanzen überleben nicht. Diese hier schon — weil du da warst."*


---

### SB-18: Trichom-Beobachtung — Das erste Mal wirklich sehen

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-18 |
| **Titel** | Trichom-Beobachtung — Das erste Mal wirklich sehen |
| **Emoji** | 🔬 |
| **Typ** | Erkenntnismoment |
| **Tonalität** | A – Staunen |
| **Setup** | both |
| **Stage** | S6 (späte Blüte, Woche 7–9) |
| **Trigger** | Spieler öffnet erstmals Trichom-Lupe-Feature + verweilt > 10 Sekunden |
| **Voraussetzung** | Stage S6 erreicht, Trichom-Minispiel verfügbar |
| **KnowledgeProfile-Effekt** | `harvest_timing +0.20`, `observation +0.10` |
| **Coach-Nachricht** | „Du siehst sie jetzt — die kleinen Kristallkugeln, die alles enthalten. Klar, wolkig, bernsteinfarben. Das ist nicht nur Biologie. Das ist der Kalender deiner Pflanze." |
| **Visuelles Element** | Makro-Zoom-Animation auf Trichomfeld: klar → wolkig → bernsteinfarben in Zeitraffer |
| **Journal-Eintrag** | „[Datum]: Erste echte Trichom-Beobachtung. [X]% klar, [Y]% wolkig. Die Pflanze zeigt mir selbst, wann sie fertig ist." |
| **Achievement** | „Mikroskop-Grower" – Trichom-Analyse erstmals erfolgreich durchgeführt |

**Ursache → Wirkung-Brücke:**
Der häufigste Ernte-Fehler ist zu frühes oder zu spätes Ernten — nicht wegen fehlendem Wissen, sondern wegen fehlender Beobachtung. Die Trichome sind ein biologischer Ernte-Kalender. Wer sie lesen kann, braucht keinen Countdown-Timer.

**Trichom-Referenz-Tabelle (im Beat angezeigt):**

| Zustand | Farbe | Bedeutung |
|---------|-------|-----------|
| Klar | Transparent | Zu früh — Potenzial noch nicht voll |
| Wolkig | Milchweiß | Reife — mehr körperliche Wirkung |
| Bernstein | Gelb-braun | Überreife — abbauend, sedativer |
| Mix 70% wolkig / 30% bernstein | — | Optimales Ernte-Fenster für die meisten Sorten |

**Lernmoment-Text (UI-Overlay):**
> *„Die Pflanze kann dir nicht sprechen. Aber sie zeigt dir alles — wenn du genau genug hinschaust."*

---

### SB-19: Pflanzen lesen statt Zahlen folgen

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-19 |
| **Titel** | Pflanzen lesen statt Zahlen folgen |
| **Emoji** | 📖 |
| **Typ** | Paradigmenwechsel-Beat |
| **Tonalität** | B – Verstehen |
| **Setup** | both |
| **Stage** | S3–S6 |
| **Trigger** | Spieler ignoriert Sensor-Alarm, diagnostiziert per Pflanzenbild korrekt, Event löst sich ohne Technik-Intervention |
| **Voraussetzung** | Mindestens 3 Events ohne technische Diagnose-Hilfsmittel gelöst |
| **KnowledgeProfile-Effekt** | `observation +0.18`, `intuition +0.12` |
| **Coach-Nachricht** | „Du hast den Alarm ignoriert — und trotzdem recht gehabt. Das ist der Moment, wo aus einem Technik-Nutzer ein echter Grower wird. Zahlen sind Hinweise. Die Pflanze ist die Wahrheit." |
| **Visuelles Element** | Sensor-Dashboard verblasst, Pflanze tritt in den Vordergrund — Fokus-Shift-Animation |
| **Journal-Eintrag** | „[Datum]: Der Sensor sagte X. Aber die Pflanze sah aus wie Y. Ich habe auf die Pflanze gehört — und sie hatte recht." |
| **Achievement** | „Pflanzen-Leser" – Event ohne technische Hilfsmittel korrekt diagnostiziert |

**Ursache → Wirkung-Brücke:**
Anfänger vertrauen Geräten, weil sie der Pflanze noch nicht vertrauen. Erfahrene Grower nutzen Geräte zur Bestätigung — nicht zur Erstdiagnose. Dieser Beat markiert den Übergang von reaktivem zu intuitivem Gärtnern.

**Lernmoment-Text (UI-Overlay):**
> *„Sensoren messen Luftfeuchte. Pflanzen leben darin. Die beste Diagnose kommt immer aus der direkten Beobachtung."*

---

### SB-20: Die ruhige Ernteentscheidung

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-20 |
| **Titel** | Die ruhige Ernteentscheidung |
| **Emoji** | ✂️ |
| **Typ** | Reife-Milestone |
| **Tonalität** | C – Innehalten |
| **Setup** | both |
| **Stage** | S7 (Harvest Window) |
| **Trigger** | Spieler wählt Erntezeitpunkt innerhalb des optimalen Trichom-Fensters, ohne Druck-Event aktiv |
| **Voraussetzung** | SB-18 abgeschlossen, keine aktiven Krisen-Events |
| **KnowledgeProfile-Effekt** | `harvest_timing +0.15`, `patience +0.10` |
| **Coach-Nachricht** | „Kein Alarm. Keine Panik. Du hast einfach hingeschaut — und gewusst, dass es Zeit ist. Das ist Erfahrung. Das kann dir niemand nehmen." |
| **Visuelles Element** | Zeitlupe-Animation der Schere, Gegenlicht durch Buds, ruhige Atmosphäre |
| **Journal-Eintrag** | „[Datum]: Ernte. Keine Eile, kein Zweifel. Die Trichome haben mir gezeigt: jetzt. Und ich habe vertraut." |
| **Achievement** | „Ruhige Hand" – erster Erntevorgang ohne aktive Druck-Events |

**Ursache → Wirkung-Brücke:**
Die Ernte ist der emotionale Abschluss eines Grows. Wer zu früh erntet, verliert Potenzial. Wer zu spät erntet, riskiert Qualitätsverlust. Aber wer den Zeitpunkt ruhig und bewusst wählt — weil er seine Pflanze kennt — erlebt den schönsten Moment des Grows.

**Lernmoment-Text (UI-Overlay):**
> *„Manche Grower ernten, wenn sie nervös werden. Du hast gewartet, bis die Pflanze bereit war. Das ist der Unterschied."*


---

### SB-21: Zweiter Grow — Mit Wissen starten

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-21 |
| **Titel** | Zweiter Grow — Mit Wissen starten |
| **Emoji** | 🌱🔁 |
| **Typ** | Neustart-Beat |
| **Tonalität** | B – Verstehen |
| **Setup** | both |
| **Stage** | S0 (Zweiter Grow-Zyklus) |
| **Trigger** | Spieler startet zweiten Grow nach abgeschlossenem erstem Harvest |
| **Voraussetzung** | Erster vollständiger Grow-Zyklus abgeschlossen |
| **KnowledgeProfile-Effekt** | Basis-Boost +0.05 auf alle Kategorien, `meta_learning +0.20` |
| **Coach-Nachricht** | „Dieses Mal beginnst du anders. Nicht weil die Samen neu sind — sondern weil du es bist. Du weißt jetzt, was die Pflanze braucht, bevor sie es dir zeigt." |
| **Visuelles Element** | Split-Screen: erster Keimling (pixelig, unsicher) vs. zweiter Keimling (gleich, aber Spieler-Perspektive ist ruhiger) |
| **Journal-Eintrag** | „Zweiter Grow gestartet. Ich nehme mit: [Liste aus KnowledgeProfile-Highlights]. Diesmal mache ich [X] anders." |
| **Achievement** | „Zweiter Anlauf" – zweiten Grow-Zyklus gestartet |

**Ursache → Wirkung-Brücke:**
Der zweite Grow ist der Beweis, dass Lernen stattgefunden hat. Wissen ist abstrakt — aber das Gefühl, den zweiten Keimling ruhiger zu beobachten als den ersten, ist konkret. Dieser Beat feiert nicht den Erfolg, sondern den Wachstum.

**Lernmoment-Text (UI-Overlay):**
> *„Erster Grow: Überleben lernen. Zweiter Grow: Wachsen lernen. Du bist jetzt beim zweiten."*

---

### SB-22: Selbstvertrauen als Grower

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-22 |
| **Titel** | Selbstvertrauen als Grower |
| **Emoji** | 💪 |
| **Typ** | Identitäts-Beat |
| **Tonalität** | A – Staunen (selbstbezogen) |
| **Setup** | both |
| **Stage** | S4–S6 (zweiter oder späterer Grow) |
| **Trigger** | Spieler diagnostiziert Event korrekt in < 30 Sekunden, ohne Hint-System zu nutzen |
| **Voraussetzung** | Zweiter Grow-Zyklus, mindestens 10 Events total gelöst |
| **KnowledgeProfile-Effekt** | `confidence +0.20` (hidden), `observation +0.08` |
| **Coach-Nachricht** | „Kein Tipp. Keine Suche. Du hast einfach gewusst, was das ist. Das ist nicht Glück — das ist Erfahrung." |
| **Visuelles Element** | CompetenceMap-Overlay: ein Skill-Bereich leuchtet kurz auf, zeigt Fortschritt |
| **Journal-Eintrag** | „[Datum]: [Event-Name] — sofort erkannt. Kein Hint nötig. Ich weiß, wie meine Pflanze aussieht, wenn sie [Problem] hat." |
| **Achievement** | „Scharfer Blick" – Event ohne Hint-Nutzung korrekt gelöst (zweiter Grow) |

**Ursache → Wirkung-Brücke:**
Selbstvertrauen als Grower entsteht nicht durch Theorie, sondern durch wiederholtes Erkennen. Wer zehnmal gesehen hat, wie Überwatering aussieht, erkennt es beim elften Mal ohne nachzudenken. Dieser Beat macht diesen Moment sichtbar und feierlich.

**Lernmoment-Text (UI-Overlay):**
> *„Du bist kein Anfänger mehr. Du bist jetzt ein Grower, der seine Pflanzen kennt."*

---

### SB-23: Die Pflanze braucht manchmal einfach Zeit

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-23 |
| **Titel** | Die Pflanze braucht manchmal einfach Zeit |
| **Emoji** | ⏳ |
| **Typ** | Gedulds-Beat |
| **Tonalität** | C – Innehalten |
| **Setup** | both |
| **Stage** | S2–S5 |
| **Trigger** | Spieler hat 3+ Tage kein aktives Event UND kein Eingriff — Pflanze wächst ruhig |
| **Voraussetzung** | Mindestens 10 Tage Spielverlauf ohne Schwere-4/5-Event |
| **KnowledgeProfile-Effekt** | `patience +0.15` |
| **Coach-Nachricht** | „Siehst du? Manchmal ist das Beste, was du tun kannst — nichts. Die Pflanze arbeitet. Du musst ihr nur Raum lassen." |
| **Visuelles Element** | Zeitraffer 3-Tage-Wachstum, ruhige Musik, Tageslichtwechsel im Hintergrund |
| **Journal-Eintrag** | „[Datum]: Drei Tage ohne Eingriff. Die Pflanze wächst. Ich lerne gerade das Schwierigste: abwarten." |
| **Achievement** | „Ruhiger Grower" – 72 Stunden ohne unnötigen Eingriff |

**Ursache → Wirkung-Brücke:**
Anfänger greifen zu oft ein — aus Sorge, aus Ungeduld, aus dem Gefühl, „etwas tun zu müssen". Viele der häufigsten Fehler (Überdüngung, Überwässerung, zu frühes Topping) entstehen aus Überengagement. Nichtstun ist eine Fertigkeit.

**Lernmoment-Text (UI-Overlay):**
> *„Pflanzenwachstum ist kein Notfall, der ständige Aufmerksamkeit braucht. Es ist ein Prozess, der Vertrauen braucht."*

---

### SB-24: Erster vollständiger Trocknungs-Zyklus

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-24 |
| **Titel** | Erster vollständiger Trocknungs-Zyklus |
| **Emoji** | 🌡️ |
| **Typ** | Post-Harvest-Lernbeat |
| **Tonalität** | B – Verstehen |
| **Setup** | both |
| **Stage** | Post-Harvest (nach S7) |
| **Trigger** | Trocknungs-Minispiel erfolgreich abgeschlossen (Temp 15–21°C, RH 45–55%, 10–14 Tage) |
| **Voraussetzung** | Erstes Harvest abgeschlossen, Trocknungs-Feature freigeschaltet |
| **KnowledgeProfile-Effekt** | `post_harvest +0.20`, `patience +0.08` |
| **Coach-Nachricht** | „Viele Grower denken, mit der Ernte ist es vorbei. Aber was jetzt passiert — in diesem Raum, in dieser Stille — entscheidet über alles, was du angebaut hast." |
| **Visuelles Element** | Hängende Buds im Trocknungsraum, Hygrometer-Anzeige, langsame Tages-Zeitraffer |
| **Journal-Eintrag** | „[Datum]: Tag [X] der Trocknung. RH: [X]%. Temperatur: [X]°C. Der Stem-Snap-Test zeigt [Ergebnis]. Noch [X] Tage." |
| **Achievement** | „Erster Harvest vollständig" – Ernte + Trocknung korrekt abgeschlossen |

**Post-Harvest-Lern-Tabelle (im Beat angezeigt):**

| Phase | Dauer | Ziel | Fehler |
|-------|-------|------|--------|
| Schnelltrocknung | 3–5 Tage | – | Chlorophyll bleibt, rauer Geschmack |
| Idealtrocknung | 10–14 Tage | Terpene erhalten, Chlorophyll abbaut | Schimmel bei >60% RH |
| Stem-Snap-Test | Am Ende | Stiel knackt = trocken genug | Zu früh in Glas = Schimmelgefahr |

**Lernmoment-Text (UI-Overlay):**
> *„Der Grow endet nicht mit der Schere. Er endet mit dem ersten Öffnen des Glases."*


---

### SB-25: Outdoor-Saisonstart — Die Natur übernimmt

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-25 |
| **Titel** | Outdoor-Saisonstart — Die Natur übernimmt |
| **Emoji** | 🌞 |
| **Typ** | Saisonaler Eröffnungs-Beat |
| **Tonalität** | A – Staunen |
| **Setup** | outdoor |
| **Stage** | S0–S1 (Mai/Anfang Outdoor-Saison) |
| **Trigger** | Erster Outdoor-Grow gestartet, Keimling ins Freiland gesetzt |
| **Voraussetzung** | Outdoor-Setup gewählt, Saison-Start im Spiel (Mai–Juni) |
| **KnowledgeProfile-Effekt** | `outdoor_awareness +0.20`, `observation +0.10` |
| **Coach-Nachricht** | „Du gibst die Kontrolle ab — und das ist gut so. Drinnen hast du alles in der Hand. Draußen arbeitet die Sonne für dich. Deine Aufgabe ist jetzt eine andere: beobachten, schützen, respektieren." |
| **Visuelles Element** | Weitwinkel-Panorama: Pflanze im Garten, Blauer Himmel, Sonnenstrahlen, Bienen im Hintergrund |
| **Journal-Eintrag** | „[Datum/Monat]: Outdoor-Saison gestartet. [Sortenname] steht jetzt im Freiland. Standort: [X]. Erwartetes Ernte-Fenster: [Monat]." |
| **Achievement** | „Outdoor-Premiere" – erster Outdoor-Grow gestartet |

**Outdoor vs. Indoor — Philosophie-Kontrast (im Beat angezeigt):**

| Indoor | Outdoor |
|--------|---------|
| Volle Kontrolle | Kooperation mit der Natur |
| Technik-abhängig | Beobachtungs-abhängig |
| 24/7 Eingriff möglich | Wetterfenster respektieren |
| Konstante Bedingungen | Saisonale Rhythmen |
| Du bist der Taktgeber | Die Sonne ist der Taktgeber |

**Lernmoment-Text (UI-Overlay):**
> *„Outdoor-Gärtnern ist kein Indoor-Gärtnern ohne Stecker. Es ist eine andere Beziehung zur Pflanze — und zur Zeit."*

---

### SB-26: Verständnis für Sortenwahl

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-26 |
| **Titel** | Verständnis für Sortenwahl |
| **Emoji** | 🧬 |
| **Typ** | Genetik-Lernbeat |
| **Tonalität** | B – Verstehen |
| **Setup** | both |
| **Stage** | S0 (Grow-Vorbereitung / Sorten-Auswahl) |
| **Trigger** | Spieler wählt zweite Sorte mit anderem Phänotyp (z. B. Indica nach Sativa, Autoflower nach Photoperiod) |
| **Voraussetzung** | Erster Grow abgeschlossen, Sorten-Bibliothek freigeschaltet |
| **KnowledgeProfile-Effekt** | `genetics +0.15`, `planning +0.10` |
| **Coach-Nachricht** | „Jede Sorte ist ein anderes Gespräch. Dieselben Gieß-Regeln, dieselben Nährstoff-Pläne — aber die Pflanze antwortet anders. Das ist keine Schwäche. Das ist Biologie." |
| **Visuelles Element** | Seite-an-Seite: Indica-Blatt (breit, dunkel) vs. Sativa-Blatt (schmal, hell), Blüte-Timelines im Vergleich |
| **Journal-Eintrag** | „Neue Sorte: [Name]. Typ: [Indica/Sativa/Hybrid/Auto]. Erwartete Blütezeit: [X] Wochen. Stärken: [X]. Achten auf: [X]." |
| **Achievement** | „Sorten-Kenner" – zweite Sorte mit anderem Phänotyp erfolgreich gestartet |

**Sortenwahl-Referenz (im Beat angezeigt):**

| Merkmal | Indica-dominant | Sativa-dominant | Autoflower |
|---------|----------------|----------------|------------|
| Wuchs | Kompakt, buschig | Hoch, schlank | Kompakt |
| Blütezeit | 7–9 Wochen | 9–14 Wochen | 8–10 Wochen total |
| Lichtabhängig | Ja | Ja | Nein |
| VPD-Toleranz | Mittel | Höher | Ähnlich Indica |
| Anfänger-geeignet | Gut | Mittel | Sehr gut |

**Lernmoment-Text (UI-Overlay):**
> *„Es gibt keine universellen Regeln — nur universelle Prinzipien. Wasser, Licht, Nährstoffe. Aber wie viel, wann und wie — das bestimmt die Sorte."*

---

### SB-27: Der erfahrene Blick — Mastery-Beat

| Feld | Inhalt |
|------|--------|
| **Beat-ID** | SB-27 |
| **Titel** | Der erfahrene Blick |
| **Emoji** | 🌟 |
| **Typ** | Mastery-Beat (Abschluss-Marker) |
| **Tonalität** | C – Innehalten (feierlich) |
| **Setup** | both |
| **Stage** | S6–S7 (zweiter oder späterer Grow) |
| **Trigger** | Alle KnowledgeProfile-Bereiche ≥ 0.60, kein Schwere-5-Event in letztem Grow |
| **Voraussetzung** | Mindestens 2 vollständige Grows, 25+ Events gelöst |
| **KnowledgeProfile-Effekt** | `mastery_marker = true` (flag gesetzt), CompetenceMap zeigt vollen Fortschritt |
| **Coach-Nachricht** | „Du schaust jetzt anders auf deine Pflanzen, als du es am Anfang getan hast. Du weißt es noch nicht mal — weil es sich normal anfühlt. Aber das ist Können. Das bist du." |
| **Visuelles Element** | CompetenceMap vollständig sichtbar, alle Bereiche beleuchtet; Coach-Avatar-Animation (lächelt, nickt) |
| **Journal-Eintrag** | „[Datum]: Zweiter vollständiger Grow. Ich habe [X] Events gelöst. Was ich jetzt kann, hätte ich mir am Anfang nicht vorgestellt. [Freitext-Feld für persönlichen Rückblick]." |
| **Achievement** | „Erfahrener Grower" – alle KnowledgeProfile-Bereiche ≥ 0.60 |

**Rückblick-Karte (im Beat angezeigt):**
Coach zeigt eine personalisierte Zusammenfassung:
- „Dein häufigster Fehler am Anfang: [Kategorie mit niedrigstem Start]"
- „Dein stärkster Bereich heute: [Kategorie mit höchstem Wert]"
- „Dein unvergesslichstes Event: [Event mit höchster Severity, das gelöst wurde]"
- „Anzahl Pflanzen gerettet: [X]"

**Lernmoment-Text (UI-Overlay):**
> *„Es gibt immer noch mehr zu lernen. Aber du hast eine Basis, auf der du stehen kannst. Das ist genug, um weiterzumachen."*


---

## 10. Beat-Übersicht: Vollständige Tabelle (SB-01 – SB-27)

| Beat-ID | Titel | Typ | Tonalität | Setup | Stage | Achievement |
|---------|-------|-----|-----------|-------|-------|-------------|
| SB-01 | Erster Keimling | Erstkontakt | A | both | S0 | „Erster Keimling" |
| SB-02 | Erstes echtes Hinschauen | Beobachtungs-Awakening | B | both | S1 | „Wachsames Auge" |
| SB-03 | Das Lift-Gefühl | Intuitions-Milestone | A | both | S1–S2 | „Lift-Test meistern" |
| SB-04 | Erste richtige Diagnose | Diagnose-Milestone | B | both | S2–S4 | „Erste Diagnose" |
| SB-05 | Geduld statt Überreaktion | Gedulds-Beat | C | both | S2–S5 | „Ruhige Hand I" |
| SB-06 | Weiße Wurzeln entdeckt | Erkenntnis | A | both | S2–S3 | „Wurzel-Beobachter" |
| SB-07 | VPD verstehen | Kompetenz-Sprung | B | indoor | S2–S5 | „VPD-Versteher" |
| SB-08 | Erste Blütenanzeichen | Emotionaler Meilenstein | A | both | S4–S5 | „Blüten-Zeuge" |
| SB-09 | Das erste Topping | Entscheidungs-Beat | C | both | S2–S3 | „Erste Schere" |
| SB-10 | Pflanze erholt sich sichtbar | Recovery-Beat | A | both | S3–S6 | „Wiedergeborene" |
| SB-11 | pH als Systemfilter | Konzept-Beat | B | both | S2–S5 | „pH-Versteher" |
| SB-12 | Stressakkumulation erkennen | Muster-Beat | B | both | S3–S6 | „Muster-Erkenner" |
| SB-13 | Ursache → Wirkung verstanden | Kausalitäts-Beat | B | both | S3–S6 | „Kausal-Denker" |
| SB-14 | Erste Schädlingskontrolle | Kompetenz-Bestätigung | B | both | S4–S6 | „Wachsamer Grower" |
| SB-15 | Das vollständige Gieß-Gefühl | Intuitions-Milestone | A | both | S2–S4 | „Wasser-Intuition" |
| SB-16 | Fehler gemacht — Pflanze überlebt | Resilienz-Beat | C | both | S2–S6 | „Gelernt durch Fehler" |
| SB-17 | Ich habe diese Pflanze gerettet | Emotional-Peak-Beat | A | both | S3–S6 | „Lebensretter" |
| SB-18 | Trichom-Beobachtung | Erkenntnismoment | A | both | S6 | „Mikroskop-Grower" |
| SB-19 | Pflanzen lesen statt Zahlen | Paradigmenwechsel | B | both | S3–S6 | „Pflanzen-Leser" |
| SB-20 | Die ruhige Ernteentscheidung | Reife-Milestone | C | both | S7 | „Ruhige Hand II" |
| SB-21 | Zweiter Grow starten | Neustart-Beat | B | both | S0 (2.) | „Zweiter Anlauf" |
| SB-22 | Selbstvertrauen als Grower | Identitäts-Beat | A | both | S4–S6 | „Scharfer Blick" |
| SB-23 | Pflanze braucht Zeit | Gedulds-Beat | C | both | S2–S5 | „Ruhiger Grower" |
| SB-24 | Erster Trocknungs-Zyklus | Post-Harvest-Beat | B | both | Post-S7 | „Erster Harvest vollständig" |
| SB-25 | Outdoor-Saisonstart | Saisonaler Eröffnungs-Beat | A | outdoor | S0–S1 | „Outdoor-Premiere" |
| SB-26 | Verständnis für Sortenwahl | Genetik-Lernbeat | B | both | S0 | „Sorten-Kenner" |
| SB-27 | Der erfahrene Blick | Mastery-Beat | C | both | S6–S7 | „Erfahrener Grower" |

---

## 11. Verteilung nach Tonalität

| Tonalität | Beats | Anteil | Ziel |
|-----------|-------|--------|------|
| A – Staunen | SB-01, 03, 06, 08, 10, 15, 17, 18, 22, 25 | 10 (37%) | Emotionaler Sog, Begeisterung erzeugen |
| B – Verstehen | SB-02, 04, 07, 11, 12, 13, 14, 19, 21, 24, 26 | 11 (41%) | Kompetenz aufbauen, Konzepte festigen |
| C – Innehalten | SB-05, 09, 16, 20, 23, 27 | 6 (22%) | Reflektion, Geduld, Reifezeichen |

**Ziel-Rhythmus:** Nie mehr als 2 gleiche Tonalitäten hintereinander. Coach-Story-Curator beachtet Tonalitätswechsel aktiv.

---

## 12. KnowledgeProfile — Maximale Wachstumspfade

Die folgende Tabelle zeigt, welche Beats welchen Skill-Bereich am stärksten entwickeln. Codex kann diese nutzen, um sicherzustellen, dass alle Bereiche im normalen Spielverlauf erreichbar sind.

| KnowledgeProfile-Bereich | Primäre Beats | Max. Boost durch Beats |
|--------------------------|---------------|------------------------|
| `watering` | SB-03, SB-05, SB-15, SB-16 | +0.62 |
| `nutrients` | SB-04, SB-11, SB-12, SB-13 | +0.52 |
| `climate_vpd` | SB-07, SB-12, SB-13 | +0.42 |
| `observation` | SB-02, SB-06, SB-14, SB-19, SB-25 | +0.65 |
| `pest_management` | SB-14, SB-17 | +0.30 |
| `harvest_timing` | SB-18, SB-20 | +0.35 |
| `training` | SB-09, SB-10 | +0.30 |
| `patience` | SB-05, SB-16, SB-20, SB-23, SB-24 | +0.60 |
| `post_harvest` | SB-24 | +0.20 |
| `genetics` | SB-26 | +0.15 |
| `outdoor_awareness` | SB-25 | +0.20 |
| `meta_learning` | SB-21, SB-27 | +0.30 |

> **Hinweis für Codex:** Beats müssen nicht alle in einem einzigen Grow erreichbar sein. Der normale Spielverlauf über 2–3 Grows sollte alle KnowledgeProfile-Bereiche auf ≥ 0.60 bringen (Voraussetzung für SB-27).

---

## 13. Codex-Auftrag #005D — Learning-Story-Beats implementieren

**Scope:** Neues Beat-System auf Basis dieser Spec

**Dateien (neu erstellen):**
```
src/systems/story/
  LearnBeatCurator.ts          # Beat-Trigger-Prüfung + Dispatch
  LearnBeatStore.ts            # Zustand: welche Beats gesehen, welche pending
  learnBeats.catalog.ts        # Typisierte Beat-Objekte (aus diesem Dokument)

data/story-beats/
  sb-01.json … sb-27.json      # JSON-Instanzen der Beats (Schema unten)

src/ui/beats/
  StoryBeatOverlay.tsx         # Overlay-Komponente (Tonalität A/B/C → Theme)
  JournalEntryCard.tsx         # Journal-Eintrag nach Beat
  AchievementToast.tsx         # Achievement-Toast (falls noch nicht vorhanden)
```

**Beat-JSON-Schema (schemaVersion 1):**
```json
{
  "beatId": "SB-01",
  "title": "Erster Keimling",
  "emoji": "🌱",
  "type": "first_contact",
  "tonality": "A",
  "setup": "both",
  "stageRange": ["S0"],
  "triggerCondition": {
    "type": "first_time",
    "event": "seedling_visible",
    "minHealthPercent": 70
  },
  "knowledgeProfileEffect": {
    "observation": 0.10,
    "watering": 0.05
  },
  "coachMessage": "...",
  "visualAsset": "seedling_emerge_animation",
  "journalTemplate": "...",
  "achievement": {
    "id": "ACH_SB01",
    "title": "Erster Keimling",
    "icon": "seedling"
  },
  "blockedBy": [],
  "schemaVersion": 1
}
```

**Trigger-Logik (LearnBeatCurator.ts):**
```typescript
// Pseudo-Code
function checkBeatTriggers(gameState: GameState): LearnBeat | null {
  const pendingBeats = beatCatalog
    .filter(b => !beatStore.isSeen(b.beatId))
    .filter(b => b.setup === "both" || b.setup === gameState.setup)
    .filter(b => b.stageRange.includes(gameState.currentStage))
    .filter(b => evaluateTrigger(b.triggerCondition, gameState))
    .filter(b => b.blockedBy.every(dep => beatStore.isSeen(dep)));
  
  // Nur 1 Beat gleichzeitig, Tonalität wechseln
  return pendingBeats[0] ?? null;
}
```

**UI-Regeln:**
- Beat-Overlay erscheint NICHT während aktiver Events (wartet auf ruhige Spielmomente)
- Tonalität A: warme Farben (Amber/Orange), Bloom-Partikel
- Tonalität B: kühle Farben (Blau/Teal), Diagramm-Overlay möglich
- Tonalität C: Neutraltöne (Grau/Weich), langsamere Animation
- Journal-Eintrag: automatisch nach Beat-Bestätigung, editierbar
- Achievement-Toast: 3s nach Beat-Overlay, non-blocking

**Quality-Check für Codex:**
- [ ] Kein Beat blockiert durch Bug (alle `blockedBy`-Referenzen korrekt)
- [ ] Alle 27 Beat-JSONs validieren gegen Schema
- [ ] Beat-Curator feuert nie während Schwere-4/5-Event aktiv
- [ ] KnowledgeProfile-Update transaktional (kein Teilupdate bei Crash)
- [ ] Journal-Einträge im i18n-System (DE/EN Basis)

---

*Datei: `docs/event-system-v2/04_event-catalog/04_learning-story-beats.md`*
*Stand: Vollständig — 27 Beats, 13 Sektionen*
*Erstellt als Teil von Event System V2 Spec — schemaVersion 3*
