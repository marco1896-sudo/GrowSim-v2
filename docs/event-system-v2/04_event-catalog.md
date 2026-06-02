# 04 · Premium Event Catalog — Grow Simulator V2

> **Codex-Zuweisung #005** · Autor: AI Product Architect · Stand: 2026-05-07
> Keine bestehenden Dateien verändern. Keine Logik-Änderungen. Kein Locale-Code.
> Dieser Katalog ist die inhaltliche Grundlage für schemaVersion 3 unter `data/events/catalog/`.

---

## 1. Ziele dieses Dokuments

- **98 konkrete Event-Ideen** in 10 Kategorien, bereit zur Implementierung als JSON-Dateien
- Jedes Event folgt dem Coach-First-Prinzip: erst lehren, dann herausfordern
- Klare Indoor/Outdoor-Trennung als primärer Filter
- Mindestens **25 Indoor-spezifisch**, **25 Outdoor-spezifisch**, **20 beide Modi**, **10 Story/Lern-Beats**
- **10 Event-Ketten** (sequentielle Ursache→Nachwirkung-Narrative)
- **20 wiederverwendbare Asset-Gruppen** (Bild-Tags)
- Kein Event ist ein "Random Punishment" — jedes hat Ursache, Signal, Lerninhalt

---

## 2. Indoor vs. Outdoor — Primärer Event-Filter

| Symbol | Bedeutung | Beispiel-Bedingung |
|--------|-----------|--------------------|
| 🏠 | Nur Indoor | `setup.type === "indoor"` |
| 🌿 | Nur Outdoor | `setup.type === "outdoor"` |
| 🌐 | Beide Modi | kein Setup-Filter |

Indoor-Events drehen sich um Kontrolle, Technik und Konsistenz.
Outdoor-Events spiegeln Natur, Saison und Unkontrollierbarkeit.
Both-Events betreffen universelle Pflanzenbiologie.

---

## 3. Kategorie-Übersicht

| ID | Kategorie | Events | 🏠 | 🌿 | 🌐 |
|----|-----------|--------|----|----|----|
| CAT-1 | Wasser / Gießen | 12 | 4 | 3 | 5 |
| CAT-2 | Nährstoffe | 10 | 2 | 3 | 5 |
| CAT-3 | Klima / VPD | 12 | 5 | 5 | 2 |
| CAT-4 | Licht / PPFD | 8 | 6 | 1 | 1 |
| CAT-5 | Wurzelzone / Medium | 8 | 3 | 3 | 2 |
| CAT-6 | Schädlinge / Krankheiten | 14 | 3 | 6 | 5 |
| CAT-7 | Technik / Setup | 8 | 8 | 0 | 0 |
| CAT-8 | Training / Pflanzenstruktur | 8 | 3 | 3 | 2 |
| CAT-9 | Blüte / Erntequalität | 8 | 3 | 4 | 1 |
| CAT-10 | Story / Lern-Beats | 10 | 0 | 2 | 8 |
| **Σ** | | **98** | **37** | **30** | **31** |

---

## 4. Stage-Matrix

Jede Zeile zeigt, in welchen Wachstumsphasen ein Event auftreten kann.

| Stage-ID | Name | Tage (typisch) |
|----------|------|----------------|
| S0 | Seedling | 1–7 |
| S1 | Early Veg | 8–18 |
| S2 | Veg | 19–35 |
| S3 | Preflower | 36–42 |
| S4 | Early Flower | 43–49 |
| S5 | Mid Flower | 50–56 |
| S6 | Late Flower | 57–63 |
| S7 | Harvest Window | 64–70 |

---

## 5. Event-Katalog

### Format-Legende

```
#### [ID] · [Name]
[Modus-Symbol] [Modus] | Stage: [Gültige Stages]
**Ursache:** Warum passiert das?
**Symptom:** Was sieht der Spieler in der UI?
**Anfängerfalle:** Häufigster Fehler
**Gegenmaßnahme:** Was soll der Spieler tun?
**Folge bei Fehler:** Was passiert bei falschem Entscheid?
**Lerninhalt:** Coach-Kernbotschaft
**Asset-Tag:** `img:tag-name`
**Stages:** [S0–S7 Auswahl]
```

---

## CAT-1 · Wasser / Gießen

#### W-I-01 · Staunässe — Topf ohne Drainage

🏠 Indoor | Stage: S0–S2

**Ursache:** Topf hat kein Loch oder Untersetzer ist zu voll; Substrat kann nicht austrocknen.
**Symptom:** Blätter hängen obwohl Erde feucht; Wurzeln beginnen zu faulen; braune Flecken an Blatträndern.
**Anfängerfalle:** „Die Pflanze hängt → also mehr gießen" — das verschlimmert das Problem.
**Gegenmaßnahme:** Gießen sofort pausieren; Topf leicht kippen damit Wasser abläuft; nächste Session erst gießen wenn Substrat-Oberfläche trocken.
**Folge bei Fehler:** Wurzelfäule setzt ein; Pflanzenwachstum stoppt für 2–3 Tage; Anfälligkeit für Fungus Gnats steigt.
**Lerninhalt:** Feucht ≠ nass. Cannabis braucht Trocken-Nass-Zyklen. Der Topf soll sich zwischen den Gießen leicht anfühlen.
**Asset-Tag:** `img:waterlogged-pot`
**Stages:** S0, S1, S2

---

#### W-I-02 · Trockenstress — Substrat zu komplett ausgetrocknet

🏠 Indoor | Stage: S1–S5

**Ursache:** Gießintervall zu lang; kleiner Topf trocknet schneller aus als erwartet; Hitzephase.
**Symptom:** Blätter rollen sich nach innen („taco"); Pflanze wirkt schlaff; Substrat zieht sich vom Topfrand zurück.
**Anfängerfalle:** Zu schnell zu viel gießen → Schockreaktion; besser langsam re-hydrieren.
**Gegenmaßnahme:** Vorsichtig mit kleinen Mengen wässern; Topf in Schüssel mit Wasser stellen (Bottom Watering) für 10 Minuten.
**Folge bei Fehler:** Terpenverlust in Blüte; verringerter Ertrag; bleibende Blattschäden möglich.
**Lerninhalt:** Der „Lift-Test" — ein leichter Topf signalisiert Gießbedarf, kein visueller Check allein.
**Asset-Tag:** `img:wilting-tacoed-leaves`
**Stages:** S1, S2, S3, S4, S5

---

#### W-I-03 · Ungleichmäßige Bewässerung — Trockenflecken im Substrat

🏠 Indoor | Stage: S1–S3

**Ursache:** Wasser immer nur an einer Stelle eingegossen; hydrophobe Stellen im Substrat.
**Symptom:** Eine Seite der Pflanze wächst besser als die andere; pH-Messung variiert je nach Topfseite.
**Anfängerfalle:** Das Problem wird spät erkannt weil die Pflanze insgesamt noch „okay" aussieht.
**Gegenmaßnahme:** Gießen am Rand des Topfes in mehreren kleinen Schritten; Topf nach jeder Gießrunde drehen.
**Folge bei Fehler:** Nährstoff-Verteilung ungleich; ein Wurzelbereich verkümmert dauerhaft.
**Lerninhalt:** Wasser gleichmäßig verteilen schafft ein gesundes, symmetrisches Wurzelbild.
**Asset-Tag:** `img:dry-pocket-substrate`
**Stages:** S1, S2, S3

---

#### W-I-04 · Leitungswasser pH-Drift

🏠 Indoor | Stage: S1–S6

**Ursache:** Ungecheckt verwendetes Leitungswasser hat pH 7.5+; Chlor blockiert Nährstoffaufnahme.
**Symptom:** Leichte Chlorose trotz Nährstoffgabe; pH-Runoff weicht stark ab.
**Anfängerfalle:** „Leitungswasser ist doch sauber" — aber Cannabis braucht pH 6.0–6.5 im Substrat.
**Gegenmaßnahme:** pH-Wert messen und mit pH-Down auf 6.2–6.4 korrigieren; 24h stehen lassen für Chlor-Ausgasung.
**Folge bei Fehler:** Calcium- und Magnesium-Lockout; sichtbare Mangelerscheinungen innerhalb von 5 Tagen.
**Lerninhalt:** pH ist das Schlüssel-Tool — ohne pH-Meter arbeitet man blind.
**Asset-Tag:** `img:ph-meter-reading`
**Stages:** S1, S2, S3, S4, S5, S6

---

#### W-O-01 · Starkregen / Wurzelstau im Freiland

🌿 Outdoor | Stage: S2–S6

**Ursache:** Mehrtägiger Regen; Boden ohne Drainage; Pflanze steht in Pfütze.
**Symptom:** Blätter hängen trotz nasser Erde; Boden riecht modrig; Erde ist schwer und klebrig.
**Anfängerfalle:** „Es regnet — die Pflanze wird schon trinken" → kein Handlungsbedarf gefühlt.
**Gegenmaßnahme:** Pflanze in Topf umsetzen falls möglich; Drainage-Gräben anlegen; Mulch entfernen; Regenplane über Pflanze spannen.
**Folge bei Fehler:** Wurzelfäule, Botrytis-Risiko steigt massiv; Pflanze kann in 3 Tagen sterben.
**Lerninhalt:** Outdoor-Boden muss drainfähig sein. Bei Dauerregen ist aktiver Schutz nötig.
**Asset-Tag:** `img:flooded-outdoor-bed`
**Stages:** S2, S3, S4, S5, S6

---

#### W-O-02 · Sommerhitze / Trockenstress Outdoor

🌿 Outdoor | Stage: S2–S5

**Ursache:** Temperaturen >35°C mehrere Tage; Verdunstung übersteigt Wasserzufuhr.
**Symptom:** Blätter rollen sich; Wachstum stoppt; Pflanze wirkt erschöpft am Nachmittag.
**Anfängerfalle:** Morgens gießen reicht nicht — bei Hitze muss abends nachgegossen werden.
**Gegenmaßnahme:** Morgens UND abends gießen; Schattiergewebe 30% aufhängen; Mulch auf Erde für Feuchtigkeitsspeicher.
**Folge bei Fehler:** Dauerhafter Hitzeschaden an Stomata; Terpenprofil verschlechtert sich; Ertragsverlust.
**Lerninhalt:** Bei Hitze über 32°C setzt sich Cannabis-Stress fort — proaktive Bewässerung entscheidet.
**Asset-Tag:** `img:heat-stressed-outdoor`
**Stages:** S2, S3, S4, S5

---

#### W-O-03 · Falsche Gießzeit — Mittagshitze

🌿 Outdoor | Stage: S1–S5

**Ursache:** Gießen in der prallen Mittagssonne; Wassertropfen auf Blättern wirken wie Lupe.
**Symptom:** Kleine kreisrunde Verbrennungsflecken auf Blättern; sonst gesunde Pflanze.
**Anfängerfalle:** „Wasser ist Wasser — wann ich gieße ist egal."
**Gegenmaßnahme:** Nur morgens oder abends gießen; Blätter beim Gießen möglichst trocken lassen.
**Folge bei Fehler:** Kosmetische Blattschäden; bei Wiederholung Stressakkumulation.
**Lerninhalt:** Gießzeitpunkt ist Strategie. Morgens = beste Nährstoffaufnahme. Abends = Verdunstungsschutz.
**Asset-Tag:** `img:leaf-burn-spots`
**Stages:** S1, S2, S3, S4, S5

---

#### W-B-01 · EC-Anstieg / Osmotischer Stress

🌐 Beide | Stage: S2–S6

**Ursache:** Zu konzentrierte Nährstofflösung; EC >3.5 im Substrat; Salz-Aufbau ohne Flush.
**Symptom:** Blattränder verbrennen; Blätter wirken dunkelgrün und starr; Wachstum verlangsamt.
**Anfängerfalle:** „Mehr Dünger = mehr Wachstum" — falsch, Cannabis hat ein optimales EC-Fenster.
**Gegenmaßnahme:** Flush mit 2–3x Topfvolumen pH-korrigiertem Wasser; dann Nährstoffe halbieren.
**Folge bei Fehler:** Wurzelspitzen sterben ab; Erholung dauert 5–7 Tage; in Blüte kritisch.
**Lerninhalt:** EC messen und im Ziel-Fenster halten (Veg: 1.2–1.8, Blüte: 1.8–2.4).
**Asset-Tag:** `img:nutrient-burn-tips`
**Stages:** S2, S3, S4, S5, S6

---

#### W-B-02 · Kaltes Gießwasser — Wurzelschock

🌐 Beide | Stage: S0–S4

**Ursache:** Wasser aus kalter Leitung direkt genutzt; Wassertemperatur <15°C trifft warme Wurzelzone.
**Symptom:** Pflanze zieht sich kurz zusammen; vorübergehender Wachstumsstop; Blätter leicht welk.
**Anfängerfalle:** Kein sichtbares Problem sofort → Spieler ignoriert es → Stress akkumuliert sich.
**Gegenmaßnahme:** Wasser auf Raumtemperatur bringen (18–22°C) bevor gießen; im Sommer schatten.
**Folge bei Fehler:** Verzögertes Wachstum; Nährstoffaufnahme temporär reduziert.
**Lerninhalt:** Wurzeln mögen keine Temperaturschocks. Zimmerwarmes Wasser ist Pflege, nicht Luxus.
**Asset-Tag:** `img:water-temperature`
**Stages:** S0, S1, S2, S3, S4

---

#### W-B-03 · Finger-Test vernachlässigt — Gießroutine statt Pflanzenbedarf

🌐 Beide | Stage: S1–S5

**Ursache:** Spieler gießt nach fester Routine statt nach Pflanzensignal; Substrat zu nass oder zu trocken.
**Symptom:** Pflanze reagiert träge; leichtes Über- oder Unterwässern-Muster erkennbar.
**Anfängerfalle:** „Ich gieße jeden 2. Tag" — aber das Substrat bestimmt den Rhythmus, nicht der Kalender.
**Gegenmaßnahme:** Vor jedem Gießen Finger 2 cm tief ins Substrat drücken; erst gießen wenn oben trocken.
**Folge bei Fehler:** Chronische Unter- oder Überwässerung; schlechtes Wurzelwachstum.
**Lerninhalt:** Die Pflanze kommuniziert — der Spieler muss lesen lernen, nicht tippen.
**Asset-Tag:** `img:finger-soil-test`
**Stages:** S1, S2, S3, S4, S5

---

#### W-B-04 · Überwässern in der Blüte — Terpenverlust

🌐 Beide | Stage: S4–S6

**Ursache:** Zu häufiges Gießen in der Blüte; Wurzeln bekommen zu wenig Sauerstoff.
**Symptom:** Buds wirken weniger aromatisch; Blätter gelbeln früher als normal; leichter Stickstoff-Überschuss.
**Anfängerfalle:** In der Blüte denken, mehr Wasser fördert die Bud-Entwicklung.
**Gegenmaßnahme:** Gießintervall verlängern; sicherstellen dass Substrat tiefer als 3 cm trockener ist vor dem Gießen.
**Folge bei Fehler:** Deutlicher Terpenverlust; Botrytis-Risiko erhöht; geringere Wirkstoffkonzentration.
**Lerninhalt:** In der Blüte leichter Trockenstress = mehr Terpenproduktion. Weniger gießen kann mehr bedeuten.
**Asset-Tag:** `img:overwatered-bloom`
**Stages:** S4, S5, S6

---

#### W-B-05 · Unterversorgung bei Hitzewelle — Kombistress

🌐 Beide | Stage: S2–S5

**Ursache:** Hitzewelle + normales Gießintervall → Substrat trocknet 2× schneller aus als erwartet.
**Symptom:** Blätter hängen am Nachmittag; Pflanze erholt sich kaum über Nacht; Wachstum stoppt.
**Anfängerfalle:** Spieler hält an Gießplan fest obwohl Umgebungsbedingungen sich geändert haben.
**Gegenmaßnahme:** Gießmenge erhöhen; Gießfrequenz erhöhen; Topf nach Möglichkeit in Schatten stellen.
**Folge bei Fehler:** Zellschaden an Leitgeweben; Hitzestress kombiniert mit Wasserstress = kritischer Zustand.
**Lerninhalt:** Umgebungsvariablen ändern den Pflanzenbedarf. Gießen ist dynamisch, nicht statisch.
**Asset-Tag:** `img:heat-drought-combo`
**Stages:** S2, S3, S4, S5

---

## CAT-2 · Nährstoffe

#### N-I-01 · Stickstoff-Überdosierung — Claw-Leaves

🏠 Indoor | Stage: S1–S3

**Ursache:** Zu hohe N-Konzentration; N-reicher Dünger weiter in Blüte genutzt.
**Symptom:** Blätter „clawen" sich nach unten; dunkelgrüne Farbe; verzögerte Blütenentwicklung.
**Anfängerfalle:** Dünger aus Veg in Blüte weiternutzen ohne Anpassung.
**Gegenmaßnahme:** N-Anteil sofort reduzieren; leichten Flush durchführen; auf Bloom-Dünger wechseln.
**Folge bei Fehler:** Blüte verzögert sich um 3–5 Tage; Ertrag reduziert; Aroma beeinflusst.
**Lerninhalt:** N-P-K-Verhältnis muss sich mit dem Stadium ändern. In Blüte: weniger N, mehr P+K.
**Asset-Tag:** `img:nitrogen-claw`
**Stages:** S1, S2, S3

---

#### N-I-02 · Calcium-Mangel Indoor — Necrotic Spots

🏠 Indoor | Stage: S2–S5

**Ursache:** Zu weiches Wasser (unter 150 ppm); kein Cal-Mag zugesetzt; pH ungünstig für Ca-Aufnahme.
**Symptom:** Kleine braune Nekrosen auf jungen Blättern; neue Blätter wirken verformt; Blattränder kupferfarben.
**Anfängerfalle:** Mit Nährstoffmangel verwechseln → falscher Dünger zugegeben.
**Gegenmaßnahme:** Cal-Mag-Supplement hinzufügen; pH auf 6.2–6.4 korrigieren; osmotisches Wasser vermeiden.
**Folge bei Fehler:** Strukturelle Blattschäden; Wachstumspunkte können absterben.
**Lerninhalt:** Hartes Wasser enthält Ca/Mg — weiches Wasser braucht Ca-Mg-Supplement. Leitungswasser-Analyse lohnt sich.
**Asset-Tag:** `img:calcium-deficiency`
**Stages:** S2, S3, S4, S5

---

#### N-O-01 · Boden-pH-Drift Outdoor — Lockout

🌿 Outdoor | Stage: S1–S5

**Ursache:** Saurer Regen, Kompost oder Torf senkt Boden-pH unter 5.8; Nährstoffe werden unlöslich.
**Symptom:** Mehrere Mangelerscheinungen gleichzeitig trotz Düngung; Blätter mosaikartig verfärbt.
**Anfängerfalle:** Mehr Dünger geben obwohl das Problem Lockout ist, kein echter Mangel.
**Gegenmaßnahme:** Boden-pH messen; Kalk (Dolomit) einarbeiten; pH-korrigiertes Wasser gießen.
**Folge bei Fehler:** Alle Nährstoffgaben verpuffen; Pflanze verhungert trotz Dünger.
**Lerninhalt:** Im Freiland ist Boden-pH die Basis. Ohne Messung arbeitet man im Dunkeln.
**Asset-Tag:** `img:soil-ph-test`
**Stages:** S1, S2, S3, S4, S5

---

#### N-O-02 · Nährstoff-Auswaschung nach Starkregen

🌿 Outdoor | Stage: S2–S5

**Ursache:** Heftiger Regen wäscht lösliche Nährstoffe tief aus dem Wurzelbereich.
**Symptom:** 2–3 Tage nach Regen leichte Gelbfärbung älterer Blätter; allgemeiner Mangel-Look.
**Anfängerfalle:** Pflanze hat doch Dünger bekommen — warum zieht sie Blätter ein?
**Gegenmaßnahme:** Nach starkem Regen neu düngen; organische Dünger bevorzugen da sie langsamer ausgewaschen werden.
**Folge bei Fehler:** Wachstumsverlangsamung; erhöhter Stresslevel; in Blüte Ertragsverlust.
**Lerninhalt:** Regen ist kein Ersatz für kontrollierte Düngung. Organisch = puffernd gegen Auswaschung.
**Asset-Tag:** `img:rain-leached-soil`
**Stages:** S2, S3, S4, S5

---

#### N-O-03 · Organik-Boost in Blüte — Timing

🌿 Outdoor | Stage: S3–S5

**Ursache:** Kompost oder organischer Dünger zu spät in der Saison zugegeben; Mikroben brauchen Wochen um N freizusetzen.
**Symptom:** In Mid Flower plötzlicher N-Überschuss; Blätter zu dunkel; Blütenentwicklung stockt.
**Anfängerfalle:** „Organisch ist immer gut" — aber Timing ist entscheidend.
**Gegenmaßnahme:** Organische Gaben spätestens 3 Wochen vor Blüte; in Blüte auf flüssige organische Dünger wechseln.
**Folge bei Fehler:** Verspätete Reife; schlechteres Aroma; längere Erntezeit.
**Lerninhalt:** Organik hat einen zeitversetzten Effekt. Planung ist wichtiger als spontane Nachdüngung.
**Asset-Tag:** `img:organic-compost-timing`
**Stages:** S3, S4, S5

---

#### N-B-01 · Phosphor-Mangel — Lila Stiele

🌐 Beide | Stage: S3–S5

**Ursache:** Zu geringer P-Anteil in Blüte; pH außerhalb des P-Aufnahmefensters (6.0–7.0); Kälte blockiert P-Transport.
**Symptom:** Stiele und Blattadern färben sich lila; Blätter entwickeln blaustichige Unterseite; Buds wachsen langsamer.
**Anfängerfalle:** Lila = cool → das ist doch eine Sorte so — Nein, oft ein echtes P-Signal.
**Gegenmaßnahme:** Bloom-Booster mit erhöhtem P zugeben; pH prüfen; Temperatur sicherstellen (>18°C).
**Folge bei Fehler:** Signifikant geringerer Bud-Aufbau; kleinere Buds; weniger Trichome.
**Lerninhalt:** Lila Stiele = Phosphor-Alarm. Blüte braucht P mehr als jedes andere Nährelement.
**Asset-Tag:** `img:phosphorus-deficiency`
**Stages:** S3, S4, S5

---

#### N-B-02 · Eisen-Chlorose — Neue Blätter gelb

🌐 Beide | Stage: S1–S4

**Ursache:** pH zu hoch (>7.0); Fe wird unlöslich; oder echter Fe-Mangel bei armer Erde.
**Symptom:** Neue Blätter (junge Triebe) gelblich-weiß mit grünen Adern; alte Blätter noch grün.
**Anfängerfalle:** Verwechslung mit N-Mangel → falscher Dünger verschlimmert Lockout.
**Gegenmaßnahme:** pH auf 6.0–6.2 senken; Chelated Iron Supplement; Fe-reichen Dünger verwenden.
**Folge bei Fehler:** Wachstumspunkte betroffen; neue Triebe können absterben.
**Lerninhalt:** Interveinal Chlorose = Eisen oder Mangan. pH ist fast immer die Ursache — kein echter Mangel.
**Asset-Tag:** `img:iron-chlorosis`
**Stages:** S1, S2, S3, S4

---

#### N-B-03 · Nährstoff-Lockout — pH-Kollaps

🌐 Beide | Stage: S1–S6

**Ursache:** pH drift unter 5.5 oder über 7.5; mehrere Nährstoffe werden gleichzeitig unverfügbar.
**Symptom:** Chaotisches Mangelbild quer durch alle Nährstoffe; Düngergaben helfen nicht.
**Anfängerfalle:** Mehr und mehr düngen ohne pH zu prüfen.
**Gegenmaßnahme:** Sofort pH des Gießwassers und Substrats messen; Flush; pH neu einstellen; dann erst wieder düngen.
**Folge bei Fehler:** Pflanze verarmt trotz Dünger; Wachstum stoppt für 1–2 Wochen.
**Lerninhalt:** Lockout ist kein Mangel — es ist ein pH-Problem. Erst pH reparieren, dann Nährstoffe.
**Asset-Tag:** `img:lockout-multi-symptom`
**Stages:** S1, S2, S3, S4, S5, S6

---

#### N-B-04 · Flushing-Timing — Zu früh oder zu spät

🌐 Beide | Stage: S6–S7

**Ursache:** Flushing zu früh (2 Wochen vor Ernte) → Pflanze verhungert; zu spät → Salze bleiben im Produkt.
**Symptom:** Zu früh: Blätter gelbeln stark, Buds entwickeln sich nicht weiter. Zu spät: Ernte hat chemischen Beigeschmack.
**Anfängerfalle:** „Flush = immer gut" ohne Timing zu beachten.
**Gegenmaßnahme:** Flushing 7–10 Tage vor Ernte starten; Trichome als primäre Erntereferenz verwenden.
**Folge bei Fehler:** Qualitätsverlust im Endprodukt; unnötige Ertragsreduktion.
**Lerninhalt:** Flushing ist Präzisionsarbeit. Trichome zeigen Reifegrad — Flush wenn 10–20% amber.
**Asset-Tag:** `img:flush-timing`
**Stages:** S6, S7

---

#### N-B-05 · Magnesium-Mangel — Interveinal Yellowing

🌐 Beide | Stage: S2–S6

**Ursache:** Zu weiches Wasser ohne Mg; pH-Drift; zu viel Calcium verdrängt Mg (Antagonismus).
**Symptom:** Ältere Blätter zeigen gelbe Felder zwischen grünen Adern; beginnt an unteren Blättern.
**Anfängerfalle:** Denken es sei N-Mangel und N geben → macht Mg-Problem schlimmer durch Antagonismus.
**Gegenmaßnahme:** Epsom Salt (MgSO4) als Blattspray und Gießlösung; pH 6.2–6.4 sicherstellen.
**Folge bei Fehler:** Photosynthese leidet; untere Hälfte der Pflanze vergilbt; Ertragsverlust.
**Lerninhalt:** Mg ist Zentralatom des Chlorophylls. Epsom Salt ist die schnellste und günstigste Lösung.
**Asset-Tag:** `img:magnesium-deficiency`
**Stages:** S2, S3, S4, S5, S6

