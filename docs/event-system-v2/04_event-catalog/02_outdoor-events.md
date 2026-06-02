# 02 · Outdoor Events — Grow Simulator V2

> **Codex-Zuweisung #005C** · Stand: 2026-05-07
> 30 Outdoor-spezifische Events in 9 Kategorien.
> Keine bestehenden Dateien ändern · Keine Logik · Keine Locales

---

## Outdoor-Philosophie — Wie sich diese Events anfühlen sollen

Outdoor-Grow ist kein Indoor-Grow ohne Steckdose. Es ist ein grundlegend anderes Verhältnis zwischen Spieler und Pflanze.

**Indoor:** Der Spieler kontrolliert alles. Fehler kommen von schlechten Entscheidungen.
**Outdoor:** Die Natur hat das letzte Wort. Fehler kommen von mangelnder Vorbereitung und schlechtem Lesen der Umgebung.

Outdoor-Events sollen drei Gefühle erzeugen:

1. **Ehrfurcht vor der Natur** — Ein Hagelgewitter, ein früher Frost, eine Hitzewelle. Der Spieler ist nicht Gott seiner Pflanze, sondern ihr Beschützer in einer unkontrollierten Welt.

2. **Beobachtung als Kernkompetenz** — Outdoor lernt man nicht durch Einstellungen, sondern durch Lesen. Wetter-Vorhersage, Bodenfeuchte, Tierzeichen, Blattverhalten — das sind die Signale.

3. **Saisonales Denken** — Outdoor ist kein 70-Tage-Zyklus. Es ist Frühling → Sommer → Herbst. Entscheidungen im Mai beeinflussen die Ernte im Oktober.

**Trigger-Besonderheit Outdoor:**
Zusätzlich zu Pflanzenvariablen reagieren Outdoor-Events auf:
- `weather.forecast.*` — Wettervorhersage (1–5 Tage)
- `season.month`, `season.week` — Saisonkalender
- `location.microclimate.*` — Standort-Eigenschaften (Hanglage, Windexposition, Beschattung)
- `soil.fieldCapacity`, `soil.drainage` — Bodeneigenschaften
- `wildlife.pressure.*` — Tierdruck

---

## Format-Legende

Identisch mit `01_indoor-events.md`. Zusatzfelder für Outdoor:

| Feld | Bedeutung |
|------|-----------|
| **Wetter-Fenster** | Wetterbedingungen die das Event ermöglichen |
| **Saison-Kontext** | In welchem Teil der Outdoor-Saison relevant |
| **Schutzmaßnahmen** | Präventive Aktionen die das Event verhindern können |

---

## CAT-3 · Klima / Wetter — Outdoor (5 Events)

> Outdoor-Klima ist keine Variable die man einstellt — sie ist eine Kraft die man liest.
> Diese Events lehren den Spieler Wettervorhersagen als strategisches Werkzeug zu nutzen.

---

#### K-O-01 · Hitzewelle — Mehrere Tage über 35°C

🌿 Outdoor | **Cat:** CAT-3 | **Schwere:** 4

**Stages:** S2–S5 | **Saison-Kontext:** Juni–August

**Trigger-Logik:**
```
weather.tempMax > 35 AND weather.heatwaveDays >= 3
AND location.shade === "none"
AND player.heatProtectionApplied === false
```

**Wetter-Fenster:** Ankündigung 2–3 Tage vorher über Wetter-Vorhersage-System. Spieler hat Zeit zu reagieren bevor Schäden eintreten.

**Typische Ursachen:**
- Hochdruckgebiet bringt anhaltende Hitze
- Pflanze steht ohne Beschattungsmöglichkeit auf südexponiertem Standort
- Spieler ignoriert Wettervorhersage oder hat kein Schattiergewebe parat
- Bodenfeuchtigkeit zu gering → Pflanze kann nicht ausreichend verdunsten

**Sichtbare Symptome:**
- Blätter rollen sich tagsüber stark ein (Taco-Form)
- Wachstum pausiert; Pflanze wirkt am Nachmittag kollabiert
- Blätter an der Südseite bleichen aus (Sonnenbrand auf Blattoberfläche)
- Stängel und Blütenansätze zeigen Wärmeschäden: verfärbte, stumpfe Zonen
- Boden trocknet 2× schneller aus als normal

**Häufige Fehlinterpretation:**
Spieler sieht hängende Pflanze und gießt sofort viel → Substrat ist oft noch feucht (Verdunstung hoch aber Aufnahme durch Hitzestress gestört). Problem verschlimmert sich nicht durch Wassermangel allein.

**Gegenmaßnahme:**
1. Schattiergewebe (30–50% Schatten) über Pflanze spannen
2. Morgens intensiv gießen (bevor Hitze einsetzt)
3. Abends nachgießen wenn Temperatur gefallen
4. Mulch auf Boden (10–15 cm) für Feuchtigkeitsspeicherung
5. Pflanzen in Töpfen in schattige Position bewegen (wenn möglich)

**Eskalation bei Fehlentscheidung:**
- Tag 1–2: Stress, Verlangsamung, kein permanenter Schaden
- Tag 3: Stomata kollabieren, Terpenverlust beginnt
- Tag 4+: Zelltod an exponierten Blütenansätzen, Ertragsverlust 20–40%
- Kombination Hitze + Trockenstress: → EC-06

**Folge-Events / Chains:** → EC-06 (Hitzewelle-Kette), W-O-02 (Trockenstress)

**Schutzmaßnahmen (präventiv):**
Schattiergewebe immer vorrätig haben. Wettervorhersage täglich prüfen. Südexponierte Standorte mit Nachmittagsbeschattung planen.

**Lerninhalt:**
Cannabis übersteht kurze Hitzespitzen. Mehrtägige Hitzewellen über 35°C sind etwas anderes — sie treffen Enzymaktivität, Terpensynthese und Wasserhaushalt gleichzeitig. Outdoor-Grows in warmen Regionen müssen Hitzeschutz als Standard-Ausrüstung betrachten.

**Coach-Hinweis-Stil:** Wetterlesend-strategisch. „Die Vorhersage zeigt 37°C für die nächsten 4 Tage. Das ist keine Warnung mehr — das ist dein Handlungsaufruf. Schatten her, jetzt."

**Asset-Tag:** `img:heatwave-wilting-outdoor`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 48–72h nach Temperaturrückgang und ausreichend Wasser
**Telemetry:** `event.trigger=outdoor_heatwave`, `weather.tempMax`, `plant.heatStressDays`

---

#### K-O-02 · Kälteschock — Unerwartete Frostnacht im Frühjahr

🌿 Outdoor | **Cat:** CAT-3 | **Schwere:** 4

**Stages:** S0–S2 | **Saison-Kontext:** April–Mai (Spätfrost)

**Trigger-Logik:**
```
weather.tempNight < 2
AND season.month <= 5
AND plant.stage <= "early_veg"
AND player.coldProtectionApplied === false
AND weather.frostWarning === true
```

**Wetter-Fenster:** Wetter-Vorhersage zeigt Frostwarnung 24h vorher. Spieler hat eine Nacht Zeit zu reagieren.

**Typische Ursachen:**
- Pflanze zu früh nach draußen gestellt (Mitte April statt Ende Mai)
- Spätfrost nach einer Warm-Phase (klassischer Bauernkalender-Fehler)
- Spieler ignoriert Frost-Warnung im Vorhersage-System
- Keimling ungeschützt auf der Terrasse übernachtet

**Sichtbare Symptome:**
- Morgens: Blätter wirken glasig, dunkel und frostgebissen
- Nach Erwärmen: Gewebe kollabiert, Blätter werden weich und braun-schwarz
- Wachstumsspitzen zeigen Nekrose
- Bei leichtem Frost: nur Blattränder betroffen
- Bei starkem Frost: gesamte Pflanze kollabiert

**Häufige Fehlinterpretation:**
Spieler sieht die glasige Pflanze und gießt sofort mit warmem Wasser. Das macht es schlimmer — gefrorenes Gewebe muss langsam auftauen. Schnelles Erwärmen sprengt die Zellen.

**Gegenmaßnahme (präventiv — vor Frost):**
1. Pflanze hineinholen (Topf) oder mit Vlies abdecken
2. Mehrere Lagen Zeitungspapier als Notfallschutz
3. Erde gut wässern (feuchte Erde speichert Wärme besser als trockene)

**Gegenmaßnahme (nach Frost):**
1. Pflanze im Schatten langsam auftauen lassen
2. Beschädigtes Gewebe erst nach 48h entfernen (vorher unklar was überlebt)
3. Gießen erst wenn Substrat aufgetaut

**Eskalation bei Fehlentscheidung:**
- Leichter Frost (0–2°C): Blattschäden, Pflanze überlebt, Wachstumsverlust 5–10 Tage
- Mittlerer Frost (-2 bis -4°C): Wachstumspunkte sterben ab; Erholung unsicher
- Starker Frost (< -4°C): Pflanzentod in S0–S1

**Folge-Events / Chains:** → EC-07 (Frühfrost-Notfall-Kette)

**Schutzmaßnahmen:** Eisheiligen-Kalender beachten (11.–15. Mai in Mitteleuropa). Nie vor Ende Mai ohne Frostschutz-Option nach draußen.

**Lerninhalt:**
Pflanzen können nicht flüchten. Outdoor-Grow bedeutet Verantwortung für das Wetter zu übernehmen das man nicht kontrollieren kann. Die Eisheiligen sind kein Mythos — Spätfrost im Mai ist in Mitteleuropa statistisch normal. Wer das weiß, wird nicht überrascht.

**Coach-Hinweis-Stil:** Kalender-bewusst. „Frostwarnung heute Nacht. Deine Pflanze ist draußen. Du hast jetzt eine Stunde. Rein damit oder einpacken."

**Asset-Tag:** `img:frost-damage-outdoor`
**Cooldown:** 14 Tage
**Ausschluss:** K-O-05 (nicht zwei Frost-Events parallel)
**Recovery:** 5–14 Tage je nach Schwere; leichte Fröste sind vollständig reversibel
**Telemetry:** `event.trigger=late_frost`, `weather.tempNight.min`, `plant.frostDamageLevel`

---

#### K-O-03 · Regenperiode — Anhaltende Nässe, Schimmel und Stagnation

🌿 Outdoor | **Cat:** CAT-3 | **Schwere:** 4

**Stages:** S2–S6 | **Saison-Kontext:** Juli–September (Regenperioden)

**Trigger-Logik:**
```
weather.rainDays >= 5
AND weather.avgRainMm > 10 (pro Tag)
AND soil.saturation > 0.85
AND climate.rh > 75
AND plant.stage >= "veg"
```

**Wetter-Fenster:** Regenperioden sind meist 3–7 Tage vorher im Vorhersage-System sichtbar.

**Typische Ursachen:**
- Atlantische Tiefdruckgebiete bringen Dauernässeperioden
- Standort ohne natürliche Drainage (flache Fläche, Lehmboden)
- Keine Regenplane oder Überdachung vorhanden
- Pflanze in Topf ohne Unterstandsmöglichkeit

**Sichtbare Symptome:**
- Blätter dauerhaft nass; keine Trocknungszeit zwischen Regenschauern
- Erde riecht nach Schimmel/Fäulnis
- Untere Blätter beginnen abzufallen (Stressreaktion)
- In Blüte (S4–S6): erste graue Flecken im Bud-Inneren (Botrytis-Frühzeichen)
- Boden sinkt unter der Pflanze ein (Sättigung)

**Häufige Fehlinterpretation:**
„Es regnet viel — die Pflanze bekommt sicher genug Wasser." Zu viel Wasser ist das Problem, nicht zu wenig. Spieler unternimmt nichts.

**Gegenmaßnahme:**
1. Regenplane aufspannen (oben, mit seitlicher Luftzirkulation — nicht rundum abschließen)
2. Drainage-Gräben um Pflanze anlegen
3. Bei Topfpflanze: vor Regen unter Überdachung stellen
4. Nach Regen: Blätter und Buds vorsichtig trocken schütteln
5. Schimmelschutz-Spray (Kaliumbicarbonat-Lösung) präventiv auf Buds

**Eskalation bei Fehlentscheidung:**
- 3 Tage Regen ohne Schutz: Wurzelzone gesättigt, Nährstoffauswaschung beginnt
- 5 Tage: Botrytis-Risiko in Blüte kritisch
- 7+ Tage: Stagnationsschimmel auf Blättern und Buds; in S5–S6 Ernteverlust

**Folge-Events / Chains:** → P-O-03 (Botrytis), N-O-02 (Nährstoffauswaschung), EC-02

**Schutzmaßnahmen:** Wettervorhersage 5 Tage im Voraus lesen. Regenplane immer verfügbar halten.

**Lerninhalt:**
Outdoor-Cannabis ist nicht wasserfest. Dauerhaft nasse Buds sind Botrytis-Einladungen. Der Unterschied zwischen einem gesunden und einem verlorenen Outdoor-Grow in Regenperioden ist oft nichts anderes als eine 10€-Regenplane und der Wille sie rechtzeitig aufzuspannen.

**Coach-Hinweis-Stil:** Wetterlesend-präventiv. „5 Tage Regen in der Vorhersage. In der Blüte ist das kein normales Wetter mehr — das ist ein Schimmel-Risiko. Was hast du zum Schutz?"

**Asset-Tag:** `img:rain-soaked-outdoor-plant`
**Cooldown:** 10 Tage
**Ausschluss:** W-O-02
**Recovery:** 48h nach Trockenphase; Botrytis-Schäden nicht reversibel
**Telemetry:** `event.trigger=rain_period`, `weather.rainDays`, `climate.rh.avg`, `plant.botrytisPressure`

---

#### K-O-04 · Windstress — Mechanische Belastung und Transpirationsschock

🌿 Outdoor | **Cat:** CAT-3 | **Schwere:** 3

**Stages:** S1–S6 | **Saison-Kontext:** ganzjährig (besonders Frühling und Herbst)

**Trigger-Logik:**
```
weather.windSpeedAvg > 40 (km/h)
AND weather.windGustMax > 60
AND location.windExposure === "high"
AND plant.trainingSupport === false
```

**Wetter-Fenster:** Sturm-Warnungen 12–24h vorher sichtbar.

**Typische Ursachen:**
- Exponierter Standort ohne natürlichen Windschutz (Mauer, Hecke, Hang)
- Pflanze zu groß und unverstützt für ihren Standort
- Stängel zu weich weil zu wenig Luftbewegung in der Veg-Phase (Paradox: zu viel schützt, zu wenig schwächt)
- Topfpflanze ohne Sicherung

**Sichtbare Symptome:**
- Stängel biegen sich stark oder brechen (Topf-Pflanzen können umfallen)
- Blätter zeigen mechanische Risse und Einschnitte durch Reibung
- Blätter rollen sich durch erhöhte Verdunstung (VPD-ähnlicher Effekt durch Windaustausch)
- Wachstumspunkte beschädigt oder abgebrochen

**Häufige Fehlinterpretation:**
Leichter Wind = positiv (Stärkung der Stängel durch mechanoreceptors). Starker Wind = Stressfaktor. Spieler unterscheidet nicht und handelt bei keinem.

**Gegenmaßnahme:**
1. Stützstäbe einschlagen und Pflanze anbinden
2. Windschutzgewebe aufspannen (60–70% Porosität — nicht dicht, sonst Verwirbelung)
3. Gebrochene Äste mit Pfropfband stabilisieren (oft erholen sie sich)
4. Bei Topfpflanzen: in geschützten Bereich bringen

**Eskalation bei Fehlentscheidung:**
- Leicht: Blattschäden, leichte Stressverlangsamung
- Mittel: Gebrochener Ast (TR-O-01)
- Schwer: Pflanze bricht am Hauptstängel → Ernte-Notfall

**Folge-Events / Chains:** → TR-O-01 (Sturmschaden/gebrochener Ast)

**Schutzmaßnahmen:** Standortwahl mit Windschutz-Analyse. Pflanze von Beginn an stärken durch moderaten Luftzug in Veg.

**Lerninhalt:**
Wind ist zweischneidig: moderate Bewegung stärkt Stängel durch Thigmomorphogenese (mechanische Reaktion). Sturm bricht sie. Outdoor-Standortwahl bedeutet auch Windanalyse — Süd-Exposition schön, aber windexponiert riskant.

**Coach-Hinweis-Stil:** Strukturell-schützend. „Sturm-Warnung für morgen. Hast du deine Pflanze abgestützt? Ein gebrochener Stängel im Herbst ist ein Desaster kurz vor der Ernte."

**Asset-Tag:** `img:wind-damaged-stem`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** 3–7 Tage; gebrochene Äste erholen sich mit Stütze in 1–2 Wochen
**Telemetry:** `event.trigger=wind_stress`, `weather.windGustMax`, `plant.stemDamageLevel`

---

#### K-O-05 · Frühfrost im Herbst — Ernte-Entscheidungsmoment

🌿 Outdoor | **Cat:** CAT-3 | **Schwere:** 5

**Stages:** S5–S7 | **Saison-Kontext:** September–Oktober

**Trigger-Logik:**
```
weather.tempNight < 2
AND season.month >= 9
AND plant.stage >= "mid_flower"
AND plant.trichomeRipeness < 0.7
AND weather.frostWarning === true
```

**Wetter-Fenster:** Frost-Warnung 24–48h vorher. Das ist der kritischste Entscheidungsmoment im Outdoor-Grow.

**Typische Ursachen:**
- Frühzeitiger Herbsteinbruch nach warmem Sommer
- Sorte mit langer Blütezeit (10–14 Wochen) kann September-Frost nicht umgehen
- Spieler hat keine Spätsorte gewählt für seine Region
- Gewächshaus fehlt für letzte Reife-Wochen

**Sichtbare Symptome:**
- Frost-Warnung erscheint im Vorhersage-System (Spieler muss aktiv reagieren)
- Pflanze noch nicht erntereif (Trichome klar/trüb, nicht amber)
- Nach Frost: Blätter glasig und zusammenbrechend
- Buds können Feuchtigkeit einfrieren — nach Auftauen Botrytis-Einstieg

**Häufige Fehlinterpretation:**
„Die Pflanze sieht morgens gut aus — Frost hat nichts gemacht." Schaden ist oft erst Stunden nach dem Auftauen sichtbar. Zweiter Fehler: zu früh ernten weil man Angst hat, aber Trichome noch nicht reif.

**Gegenmaßnahme — Entscheidungsbaum:**
1. **Option A (Trichome < 50% trüb):** Pflanze mit Vlies abdecken und weiter reifen lassen. Frost-Schutz bis Reife.
2. **Option B (Trichome 50–70% trüb):** Abwägen — wenn weiterer Frost droht, lieber jetzt ernten als riskieren.
3. **Option C (Trichome > 70% trüb/amber):** Sofort ernten. Pflanze ist akzeptabel reif.

**Eskalation bei Fehlentscheidung:**
- Zu spät reagiert + weiterer Frost: Buds frieren durch → Botrytis-Explosion in 24–48h
- Zu früh geerntet: Wirkstoffgehalt 20–30% unter Maximum
- Vlies falsch aufgespannt: Kondensation auf Buds → Schimmelgefahr unter Vlies

**Folge-Events / Chains:** → EC-07 (Frühfrost-Kette), P-O-03 (Botrytis)

**Schutzmaßnahmen:** Sortenauswahl nach Klimazone und Reifzeit. Gewächshaus für Oktober-Reife. Vlies-Material immer vorrätig.

**Lerninhalt:**
Der Herbstfrost ist der finale Boss des Outdoor-Grows. Wer ihn meistert — durch gute Sortenauswahl, Schutzausrüstung und Trichom-Beurteilung — erntet sicher. Wer unvorbereitet ist, verliert Wochen Arbeit in einer Nacht. Ernte-Entscheidung bei Frost: Trichome entscheiden, nicht der Kalender.

**Coach-Hinweis-Stil:** Entscheidungs-orientiert, ruhig aber ernst. „Frost-Warnung heute Nacht. Deine Trichome sagen [X]%. Das ist dein Entscheidungsmoment — kein falscher mehr möglich. Was machst du?"

**Asset-Tag:** `img:frost-warning-harvest-decision`
**Cooldown:** — (einmaliges Event pro Saison)
**Ausschluss:** K-O-02
**Recovery:** Nur wenn rechtzeitig geschützt; nach Frost-Schaden begrenzt
**Telemetry:** `event.trigger=autumn_frost`, `weather.tempNight`, `plant.trichomeRipeness`, `event.severity=critical`

---

## CAT-6 · Schädlinge / Krankheiten — Outdoor (6 Events)

> Outdoor-Schädlinge kommen von außen und haben natürliche Populationsdynamiken.
> Sie folgen Saisons, Witterung und Ökosystem-Mustern.
> Das Spiel soll lehren: Schädlingsdruck vorhersagen, nicht nur reagieren.

---

#### P-O-01 · Raupen — Nacht-Fraßschäden an Blüten

🌿 Outdoor | **Cat:** CAT-6 | **Schwere:** 4

**Stages:** S3–S6 | **Saison-Kontext:** Juli–September

**Trigger-Logik:**
```
season.month >= 7
AND plant.budDensity > 0.5
AND location.nearbyVegetation === true
AND weather.tempNight > 15
AND pestPressure.caterpillar > 0.25
```

**Typische Ursachen:**
- Nachtfalter (Heliothis armigera, Autographa gamma) legen Eier in Blüten
- Warme Spätsommernächte fördern Schmetterlings-Aktivität
- Nahes Gemüsebeet oder Wildpflanzen als Bruthabitat
- Kein präventiver Schutz (Insektennetz, BT-Spray)

**Sichtbare Symptome:**
- Morgens: frische Fraßspuren auf Blättern und Blüten (halbmondförmige Löcher)
- Schwarzer Kot zwischen Blütenknospen (deutlichstes Erkennungszeichen)
- Kleine Raupen im Bud-Inneren versteckt (nachts aktiv, tagsüber verborgen)
- Nach einigen Tagen: Fäulnis um Fraßwunden (Einstieg für Botrytis)

**Häufige Fehlinterpretation:**
Spieler sieht Fraßlöcher und denkt an Schimmel oder Mangel. Die Raupen selbst werden nicht gesucht weil sie tagsüber gut versteckt sind.

**Gegenmaßnahme:**
1. Abends mit Taschenlampe inspizieren — Raupen sind nachts aktiv und sichtbar
2. Bacillus thuringiensis (Bt, var. kurstaki) als biologisches Mittel sprühen — wirkt spezifisch gegen Raupen
3. Raupen manuell entfernen und vernichten
4. Spinosad als Alternative bei starkem Befall
5. Fraßwunden nach Entfernung trocknen lassen, Botrytis-Check

**Eskalation bei Fehlentscheidung:**
- Woche 1: lokaler Fraßschaden, tolerierbar
- Woche 2: Fraßwunden werden zu Botrytis-Einstiegspunkten; Buds faulen von innen
- Mehrere Raupen gleichzeitig: gesamte Buds können verloren gehen

**Folge-Events / Chains:** → P-O-03 (Botrytis durch Fraßwunden)

**Schutzmaßnahmen:** Präventiv Bt-Spray alle 7–10 Tage ab Juli. Abendkontrolle als Routine.

**Lerninhalt:**
Raupen sind unsichtbare Zerstörer — sie fressen nachts im Bud-Inneren und sind tagsüber kaum zu finden. Ihr Kot ist die wichtigste Spur. Bt (Bacillus thuringiensis) ist das einzige biologische Mittel das spezifisch gegen Lepidopteren-Larven wirkt ohne Bienen zu schädigen.

**Coach-Hinweis-Stil:** Spurenlesend. „Siehst du schwarzen Kot zwischen den Buds? Das sind Raupen-Exkremente. Geh heute Abend mit einer Taschenlampe raus — sie sind da."

**Asset-Tag:** `img:caterpillar-bud-damage`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** Fraßwunden: 5–7 Tage; Botrytis-Folgeschäden nicht reversibel
**Telemetry:** `event.trigger=caterpillar_infestation`, `pestPressure.caterpillar.level`, `plant.budDamage`

---

#### P-O-02 · Blattläuse — Kolonieaufbau und Honigtau

🌿 Outdoor | **Cat:** CAT-6 | **Schwere:** 3

**Stages:** S1–S4 | **Saison-Kontext:** Mai–August

**Trigger-Logik:**
```
season.month >= 5 AND season.month <= 8
AND weather.tempAvg > 18
AND plant.newGrowthRate > 0.7
AND pestPressure.aphid > 0.2
AND location.nearbyRoses OR location.nearbyBeans
```

**Typische Ursachen:**
- Blattläuse wandern von Nachbarpflanzen (Rosen, Bohnen, Tomaten)
- Ameisen fördern Blattlaus-Kolonien (sie „melken" Honigtau und schützen Läuse vor Fressfeinden)
- Kein natürlicher Feind-Habitat vorhanden (keine Blühpflanzen für Marienkäfer, Schwebfliegen)
- Trockenes, warmes Wetter beschleunigt Reproduktion massiv

**Sichtbare Symptome:**
- Kleine grüne, gelbe oder schwarze Insekten in Gruppen auf Blattrückseiten und Triebspitzen
- Klebrige Substanz (Honigtau) auf Blättern und Boden
- Schwarzer Rußtau-Pilz wächst auf dem Honigtau (sekundäre Folge)
- Wachstumsspitzen deformiert oder gekräuselt
- Ameisen-Straßen auf Stängeln nach oben = sicheres Zeichen für Blattlaus-Kolonien

**Häufige Fehlinterpretation:**
Klebrige Blätter werden mit Harzproduktion verwechselt. Spieler freut sich statt zu handeln.

**Gegenmaßnahme:**
1. Ameisen von Pflanze fernhalten (Leimring um Stängelbasis oder Topf)
2. Blattläuse mit Wasserstrahl abspritzen (morgens, damit Pflanze trocknet)
3. Kaliseife-Spray (2% Lösung) auf Blattrückseiten
4. Nützlinge fördern: Marienkäfer, Schlupfwespen
5. Bei starkem Befall: Pyrethrin-Spray (nicht in Blüte)

**Eskalation bei Fehlentscheidung:**
- Woche 1: geringe Koloniegröße, leichte Wachstumsverlangsamung
- Woche 2: Honigtau-Rußtau blockiert Photosynthese
- Woche 3: Kolonie-Explosion, Viren-Übertragung möglich (CMV, TSWV)

**Lerninhalt:**
Blattläuse sind das beste Argument für Biodiversität im Grow-Umfeld. Ein Marienkäfer frisst bis zu 200 Blattläuse pro Tag. Wer Blühpflanzen neben seinem Outdoor-Grow hat, hat kostenlose Schädlingsbekämpfung. Ameisen auf dem Stängel = Blattlaus-Indiz auf den ersten Blick.

**Coach-Hinweis-Stil:** Ökosystem-bewusst. „Ameisen auf dem Stängel? Schau auf die Blattunterseiten — dort sitzen die Blattläuse. Die Ameisen züchten sie. Trenne die Verbindung zuerst."

**Asset-Tag:** `img:aphid-colony-stems`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** 1–2 Wochen nach Behandlung
**Telemetry:** `event.trigger=aphid_infestation`, `pestPressure.aphid.level`, `plant.honeydewPresent`

---

#### P-O-03 · Botrytis — Grauschimmel in Outdoor-Blüten

🌿 Outdoor | **Cat:** CAT-6 | **Schwere:** 5

**Stages:** S4–S7 | **Saison-Kontext:** August–Oktober

**Trigger-Logik:**
```
climate.rh > 70 AND climate.rh < 95
AND weather.rainDays >= 3
AND plant.budDensity > 0.6
AND plant.stage >= "early_flower"
AND climate.tempAvg > 15 AND climate.tempAvg < 25
```

**Wetter-Fenster:** Botrytis braucht feuchte, mäßig warme Bedingungen. Kritischstes Risikofenster: August–September nach Regenperioden.

**Typische Ursachen:**
- Regenperiode (K-O-03) ohne Schutzdach
- Dichte Bud-Struktur ohne Luftzirkulation (besonders bei Indica-dominierten Sorten)
- Fraßwunden durch Raupen (P-O-01) als Einstiegspunkte
- Taupunkt-Schwankungen durch kalte Nächte + warme Tage
- Automatische Bewässerung lässt Wasser auf Buds tropfen

**Sichtbare Symptome:**
- Grauer, staubiger Schimmelbelag auf Buds (deutlichstes Zeichen)
- Braune, matschige Zonen im Bud-Inneren bei aufgebrochenen Blüten
- Einzelne Buds oder Äste welken trotz intakter Erde
- Befallene Zonen riechen nach Faulheit

**Häufige Fehlinterpretation:**
Frühe Botrytis sieht von außen harmlos aus — ein leicht brauner Bud, der „etwas schlechter aussieht". Spieler zögert. Im Inneren hat Botrytis bereits den Ast durchzogen.

**Gegenmaßnahme:**
1. Befallene Buds sofort und vollständig entfernen — großzügig schneiden (2–3 cm Sicherheitsabstand)
2. Schnittstelle trocknen lassen (keine Nässe danach)
3. Werkzeuge nach jedem Schnitt desinfizieren (70% Isopropanol)
4. Luftzirkulation maximieren: untere Äste entfernen, Blätter öffnen
5. Kaliumbicarbonat-Spray auf verbleibende Buds
6. Bei > 20% Befall: Notfall-Ernte erwägen

**Eskalation bei Fehlentscheidung:**
- 24h: Pilz-Myzel durchzieht 2–5 cm Stängelgewebe
- 48h: benachbarte Buds befallen
- 5 Tage: gesamter Ast verloren; Ausbreitung auf alle Pflanzen

**Folge-Events / Chains:** → Ernte-Notfall-Event (wenn > 30% befallen)

**Schutzmaßnahmen:** Regenplane in Blüte. Defoliation für Luftzirkulation. Präventiv-Spray ab August.

**Lerninhalt:**
Botrytis cinerea ist der meistgefürchtete Outdoor-Pilz bei Cannabis. Er braucht feuchtes, totes oder gestresstes Pflanzengewebe als Einstiegspunkt. Präventiv: Luft durch Buds zirkulieren lassen. Reaktiv: radikal und ohne Zögern entfernen. Wer wartet verliert alles.

**Coach-Hinweis-Stil:** Ernst, keine Verharmlosung. „Das ist Botrytis. Schneide großzügig. Alles was braun und weich ist kommt weg — mit 3 cm Sicherheitsabstand. Jetzt. Nicht in einer Stunde."

**Asset-Tag:** `img:botrytis-gray-mold-bud`
**Cooldown:** 12 Tage
**Ausschluss:** keine
**Recovery:** Befallenes Gewebe nicht reversibel; gesunde Buds können gerettet werden
**Telemetry:** `event.trigger=botrytis_outdoor`, `climate.rh.avg`, `plant.botrytisCoverage`, `event.severity=critical`

---

#### P-O-04 · Echter Mehltau — Trocken-Warme Bedingungen

🌿 Outdoor | **Cat:** CAT-6 | **Schwere:** 3

**Stages:** S2–S5 | **Saison-Kontext:** Juli–August

**Trigger-Logik:**
```
climate.rh > 50 AND climate.rh < 70
AND weather.tempDay > 25
AND weather.dewNight === true
AND location.airCirculation === "poor"
AND season.month >= 7
```

*(Unterschied zu Indoor P-I-03: Outdoor-Mehltau entsteht durch Tau-Trocknung-Zyklen, nicht durch stagnante Innenluft)*

**Typische Ursachen:**
- Nachts feuchter Tau → tagsüber trockenes, warmes Wetter = Mehltau-Paradies
- Pflanze steht zu eng an Wand oder Zaun ohne Luftzirkulation
- Sorte mit Mehltau-Anfälligkeit (viele Landrace-Sorten, bestimmte Indicas)
- Keine präventiven Sprays

**Sichtbare Symptome:**
- Weißer pudriger Belag auf Blattoberflächen (Oberseite — anders als Spinnmilben auf der Unterseite)
- Beginnt auf oberen jungen Blättern
- Betroffene Blätter gelbeln und sterben ab
- Im Gegensatz zu Indoor: Mehltau-Ausbreitung durch Wind auf benachbarte Pflanzen möglich

**Häufige Fehlinterpretation:**
Morgentau-Tropfen werden mit Mehltau verwechselt. Unterschied: Tau verschwindet nach Erwärmen. Mehltau bleibt.

**Gegenmaßnahme:**
1. Befallene Blätter entfernen (nicht kompostieren — verbrennen)
2. Natriumbicarbonat-Spray (Backpulver + Wasser + Öl)
3. Milch-Wasser-Spray (1:10) — wissenschaftlich nachgewiesene Wirksamkeit
4. Schwefel-basierte Mittel (nicht in Blüte, > 30°C Hitze vermeiden)
5. Luftzirkulation verbessern: beschneiden, Standort prüfen

**Eskalation bei Fehlentscheidung:** → Buds in Blüte befallen; Ernte-Qualitätsverlust

**Lerninhalt:**
Outdoor-Mehltau liebt den Übergang von kühler Nacht zu warmem Tag — der Tau-Trocknung-Zyklus ist sein Lebensraum. Er überträgt sich durch Wind-Sporen. Resistente Sorten wählen und Luft zirkulieren lassen sind die wichtigsten Präventionsmaßnahmen.

**Coach-Hinweis-Stil:** Erkennungs-differenzierend. „Weißer Puder der nach dem Aufwärmen bleibt? Das ist Mehltau, kein Tau. Backpulver-Spray heute — Ausbreitung stoppen bevor der Wind hilft."

**Asset-Tag:** `img:powdery-mildew-outdoor`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 2–3 Wochen konsequente Behandlung
**Telemetry:** `event.trigger=powdery_mildew_outdoor`, `weather.dewNight`, `pestPressure.pm.outdoor`

---

#### P-O-05 · Schnecken — Nacht-Fraß an jungen Trieben

🌿 Outdoor | **Cat:** CAT-6 | **Schwere:** 3

**Stages:** S0–S2 | **Saison-Kontext:** April–Juni (feuchte Frühlingsperioden)

**Trigger-Logik:**
```
season.month >= 4 AND season.month <= 6
AND weather.rainDays >= 2
AND plant.stage <= "early_veg"
AND location.nearbyGarden === true
AND pestPressure.slug > 0.3
```

**Typische Ursachen:**
- Frühling + Regen = Schnecken-Hochsaison
- Junge Keimlinge und Stecklinge sind besonders gefährdet (weiches, saftiges Gewebe)
- Kein Schneckenschutz um Töpfe oder Beete
- Mulch und feuchte Erde als Schnecken-Lebensraum direkt neben Pflanze

**Sichtbare Symptome:**
- Morgens: Silberne Schleimspuren auf Boden und Pflanze
- Große, unregelmäßige Fraßlöcher in Blättern (anders als Raupen: nicht halbmondförmig)
- Junge Triebe vollständig abgefressen
- Kleine Sämlinge können über Nacht komplett verschwinden

**Häufige Fehlinterpretation:**
Fraßlöcher durch Schnecken werden für Schmetterlings- oder Käfer-Fraß gehalten. Die Schleimspuren werden nicht bemerkt.

**Gegenmaßnahme:**
1. Schneckenbarriere: Kupferband um Töpfe oder Beete (Kupfer wirkt als schwacher elektrischer Schock)
2. Schneckenkorn (Eisenphosphat — nicht Metaldehyd, giftig für andere Tiere)
3. Abends Kontrollgang mit Taschenlampe; Schnecken manuell sammeln
4. Mulch entfernen (Versteckplatz)
5. Bierfallen aufstellen

**Eskalation bei Fehlentscheidung:**
- Junge Pflanze: kann in einer Nacht vernichtet werden
- Ältere Pflanze: Blattschäden, Stressverlangsamung

**Lerninhalt:**
Schnecken fressen nachts und verschwinden vor dem Morgengrauen. Wer seine Keimlinge nach draußen stellt ohne Schutz, lädt zum Fressen ein. Kupferband ist passiver Dauerschutz — einmal anlegen, kein weiterer Aufwand.

**Coach-Hinweis-Stil:** Praktisch-direkt. „Schleimspuren am Morgen und Fraßlöcher in den Blättern — Schnecken. Kupferband um den Topf ist die einfachste Lösung. Heute Abend kontrollieren."

**Asset-Tag:** `img:slug-damage-seedling`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** Fraßschäden heilen; abgefressene Triebe regenerieren in 5–10 Tagen
**Telemetry:** `event.trigger=slug_damage`, `pestPressure.slug.level`, `plant.stage`

---

#### P-O-06 · Wildtiere — Vögel, Wühlmäuse und Rehe

🌿 Outdoor | **Cat:** CAT-6 | **Schwere:** 3

**Stages:** S0–S3 | **Saison-Kontext:** ganzjährig

**Trigger-Logik:**
```
location.ruralArea === true
AND plant.stage <= "veg"
AND setup.protection.netting === false
AND wildlife.pressure.deer OR wildlife.pressure.vole OR wildlife.pressure.bird > 0.3
```

**Typische Ursachen:**
- Rehe fressen junge Triebe und Blüten (Lieblingspflanze im Frühjahr)
- Wühlmäuse/Maulwürfe graben Wurzelsystem aus
- Vögel picken an Samen und Stecklingen
- Standort nahe Wald oder Feldrand erhöht Wildtier-Druck massiv

**Sichtbare Symptome:**
- Abgebissene Triebe auf Fraßhöhe (Reh: 50–80 cm, sauber geschnitten)
- Erde um Pflanze aufgewühlt (Wühlmaus/Maulwurf)
- Löcher neben Pflanze; Wurzeln teilweise freigelegt
- Vogelspuren und Schalen von Samen

**Häufige Fehlinterpretation:**
Abgebissene Triebe werden für Schädlings-Fraß oder Wind-Schäden gehalten. Fraßhöhe und Schnittmuster verraten den Verursacher.

**Gegenmaßnahme:**
1. Stabiles Schutzgitter um Pflanze (mind. 80 cm hoch gegen Rehe)
2. Feinmaschiges Netz über Keimlinge (Vogelschutz)
3. Wühlmausschutz: Maschendrahtkorb unter Topf oder Beet
4. Geruchsabwehr: Wildtierduftzäune (Hundehaare, Menschenhaar in Netzen)

**Eskalation bei Fehlentscheidung:**
- Reh-Fraß: Pflanzenverlust möglich; bei Topping-Ersatz durch Fraß kann überraschend gut erholen
- Wühlmaus: Wurzelsystem beschädigt; Pflanze welkt ohne erkennbare oberirdische Ursache

**Lerninhalt:**
Outdoor-Cannabis hat keine natürliche Verteidigungs-Nische gegen Wildtiere. Physische Barrieren sind der einzig zuverlässige Schutz. Standortanalyse vor dem Grow sollte immer die Frage beinhalten: Welche Tiere sind hier aktiv?

**Coach-Hinweis-Stil:** Standort-realistisch. „Wald in 200 Meter Entfernung? Rehe sind aktiv. Ein einfaches Gitter von Anfang an spart viel Ärger."

**Asset-Tag:** `img:wildlife-damage-plant`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** Stark abhängig von Fraßausmaß; Reh-Topping kann sogar positiv sein
**Telemetry:** `event.trigger=wildlife_damage`, `wildlife.pressure.type`, `plant.damageSeverity`


---

## CAT-1 · Wasser / Gießen — Outdoor (3 Events)

> Outdoor-Wassermanagement ist reaktiv, nicht kontrolliert.
> Regen übernimmt die Bewässerung — aber nicht immer zum richtigen Zeitpunkt oder in der richtigen Menge.

---

#### W-O-01 · Staunässe nach Starkregen — Überfluteter Wurzelraum

🌿 Outdoor | **Cat:** CAT-1 | **Schwere:** 4

**Stages:** S2–S6 | **Saison-Kontext:** Juli–September

**Trigger-Logik:**
```
weather.rainTotal24h > 50 (mm)
AND soil.drainage === "poor"
AND soil.saturation > 0.90
AND plant.isInGround === true
```

**Typische Ursachen:**
- Starkregen-Ereignis auf Standort mit Lehm- oder Tonboden ohne Drainage
- Pflanze steht in natürlicher Mulde oder am Fuß eines Hangs (Wasseransammlung)
- Beet ohne Drainage-Substrat angelegt
- Mehrere Regentage in Folge (K-O-03) auf bereits gesättigtem Boden

**Sichtbare Symptome:**
- Wasser steht sichtbar auf Boden um Pflanze
- Pflanze hängt trotz nasser Erde (Sauerstoff-Mangel-Signal — identisch wie Indoor)
- Erde riecht sumpfig-faulig
- Untere Blätter fallen gelb ab
- In schweren Fällen: Stängelbasis weich (Fäulnis beginnt)

**Häufige Fehlinterpretation:**
„Es hat geregnet — der Pflanze geht's sicher gut." Spieler handelt nicht weil er Staunässe nicht als Problem erkennt.

**Gegenmaßnahme:**
1. Drainage-Graben um Pflanze anlegen (V-Graben, 20 cm tief)
2. Pflanze in Topf umpflanzen wenn Boden nicht drainiert (langfristig)
3. Regenplane für künftige Niederschläge aufspannen
4. Substrat um Pflanze lockern um Wasserabfluss zu ermöglichen
5. Mulch vorübergehend entfernen (hält zusätzliche Feuchtigkeit)

**Eskalation bei Fehlentscheidung:**
- 24h: Wurzeln beginnen zu ersticken
- 48h: Pythium-Risiko steigt (wie R-I-03, aber im Freiland)
- 3+ Tage: Pflanze kollabiert wenn Drainage nicht verbessert

**Folge-Events / Chains:** → N-O-02 (Nährstoffauswaschung), P-O-03 (Botrytis)

**Schutzmaßnahmen:** Standortwahl mit Drainage-Analyse. Beet immer mit 30% Perlite oder Kies-Drainage anlegen.

**Lerninhalt:**
Outdoor-Standortwahl ist die wichtigste Entscheidung des Grows. Boden-Drainage ist nicht korrigierbar ohne Umgraben. Wer auf einem wasserdurchlässigen Standort pflanzt, baut Resilienz gegen Regenperioden von Anfang an ein.

**Coach-Hinweis-Stil:** Standort-analytisch. „Der Boden unter deiner Pflanze ist gesättigt. Wasser steht. Das ist Staunässe — nicht normaler Regen. Lege jetzt einen Drainage-Graben an."

**Asset-Tag:** `img:flooded-outdoor-bed`
**Cooldown:** 12 Tage
**Ausschluss:** W-O-02
**Recovery:** 48h nach Drainage-Verbesserung
**Telemetry:** `event.trigger=outdoor_waterlogging`, `weather.rainTotal24h`, `soil.saturation`

---

#### W-O-02 · Trockenperiode — Verdunstungsstress und Boden-Austrocknung

🌿 Outdoor | **Cat:** CAT-1 | **Schwere:** 3

**Stages:** S2–S5 | **Saison-Kontext:** Juni–August

**Trigger-Logik:**
```
weather.rainDays === 0 AND consecutive > 10
AND weather.tempMax > 30
AND soil.moisture < 0.30
AND plant.irrigationCount < 1 (pro Tag)
```

**Typische Ursachen:**
- Spieler verlässt sich auf Regen der ausbleibt (Hochdruckphase)
- Boden ohne Mulch verliert Feuchtigkeit durch Verdunstung schnell
- Pflanze in freistehendem Topf trocknet 3× schneller aus als Gartenbeet
- Kombination Hitze + Trockenheit (K-O-01 + W-O-02 als Doppel-Stress)

**Sichtbare Symptome:**
- Boden reißt auf (Trockenrisse sichtbar)
- Pflanze hängt täglich ab ca. 13 Uhr
- Blätter rollen sich nach innen
- Morgens erholt sich Pflanze (Nacht-Tautropfen), nachmittags kollabiert sie wieder
- Wachstum stoppt vollständig

**Häufige Fehlinterpretation:**
„Es ist heiß — die Pflanze hängt, das ist normal im Sommer." Ein kurzes Nachmittagshängen ist tolerierbar; dauerhaftes Hängen durch den ganzen Tag ist Trockenstress.

**Gegenmaßnahme:**
1. Sofort tief gießen (langsam, viel Wasser — Boden darf bis 30 cm Tiefe nass werden)
2. Mulch aufbringen (10–15 cm Strohschicht oder Holzspäne) für Feuchtigkeitsspeicherung
3. Schattiernetz 30% für Nachmittagsstunden aufspannen
4. Gießrhythmus erhöhen: bei Hitze täglich morgens

**Eskalation bei Fehlentscheidung:**
- 3 Tage ohne ausreichend Wasser: Stomata-Schäden, Terpenverlust beginnt
- 5 Tage: Wachstumsstillstand, Zellschäden an Leitgeweben
- Blüte: irreversibler Ertragsverlust

**Lerninhalt:**
Mulch ist die unterschätzteste Outdoor-Technik. Eine 10 cm Schicht Stroh reduziert die Bodenverdunstung um bis zu 70%. Das ist das Äquivalent von jeden zweiten Tag Gießen — kostenlos.

**Coach-Hinweis-Stil:** Ressourcen-orientiert. „10 Tage ohne Regen in der Vorhersage. Dein Boden trocknet aus. Mulch jetzt und tief gießen — das ist günstiger als Ernte-Verluste."

**Asset-Tag:** `img:cracked-dry-soil-outdoor`
**Cooldown:** 10 Tage
**Ausschluss:** W-O-01
**Recovery:** 24–48h nach ausreichender Bewässerung
**Telemetry:** `event.trigger=drought_outdoor`, `weather.dryStreak`, `soil.moisture.value`

---

#### W-O-03 · Sonnenbrand nach Wetterwechsel — Lichtschock

🌿 Outdoor | **Cat:** CAT-1 | **Schwere:** 2

**Stages:** S1–S5 | **Saison-Kontext:** Frühjahr und nach Regenperioden

**Trigger-Logik:**
```
weather.sunIntensityChange > 60% (innerhalb 24h)
AND plant.acclimatizationDays < 5
OR plant.wasIndoorRecently === true
AND weather.uvIndex > 7
```

**Typische Ursachen:**
- Pflanze von Indoor nach Outdoor ohne Akklimatisierung gestellt
- Nach mehrtägiger Regenperiode plötzlich intensive Sonneneinstrahlung
- Frühjahr: erste Sonnentage mit hoher UV-Intensität trotz niedriger Temperatur
- Pflanze die bisher im Halbschatten stand plötzlich in Vollsonne

**Sichtbare Symptome:**
- Hellgelbe bis weiße Flecken auf Blättern (ähnlich wie Indoor-Lichtbrand, aber diffuser)
- Flecken auf Blattober- und -unterseite (Unterschied zu Indoor: UV trifft von allen Seiten)
- Nur exponierte Seite betroffen (Sonnenseite der Pflanze)
- Junge Blätter stärker betroffen als alte (dünnere Kutikula)

**Häufige Fehlinterpretation:**
Sonnenbrand-Flecken werden mit Pilzkrankheiten oder Nährstoffmangel verwechselt. Die räumliche Verteilung (nur Sonnenseite) wird nicht beachtet.

**Gegenmaßnahme:**
1. Pflanze graduell an Sonne gewöhnen (Hardening-Off): 2h → 4h → 6h → Vollsonne über 7–10 Tage
2. Nach Regenperiode: erst Halbschatten-Tag, dann wieder Vollsonne
3. Bei frisch gesetzter Pflanze: erste Woche Mittagsschatten (11–15 Uhr)

**Lerninhalt:**
Sonnenlicht ist nicht gleich Sonnenlicht. Nach Bewölkung oder Indoor-Aufenthalt muss die Pflanze die UV-Schutz-Pigmente (Flavonoide, Anthocyane) erst neu aufbauen. Hardening-Off ist der Akklimatisierungsprozess — Pflanzen die diesen Schritt bekommen wachsen nach 2 Wochen besser als Direktsetzer.

**Coach-Hinweis-Stil:** Übergangs-bewusst. „Deine Pflanze war nicht bereit für dieses Sonnenlicht. Nach Regen immer 1 Tag Schatten-Pause. Die Sonne kommt morgen auch noch."

**Asset-Tag:** `img:sunscald-outdoor`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 3–5 Tage; beschädigte Blätter erholen sich nicht, neue wachsen gesund
**Telemetry:** `event.trigger=sunscald`, `weather.uvIndex`, `plant.acclimatizationStatus`

---

## CAT-2 · Nährstoffe — Outdoor (3 Events)

> Outdoor-Nährstoffmanagement ist Bodenchemie, nicht Flaschendosierung.
> Wer Outdoor wächst, lernt hier: Boden lesen, Ökologie verstehen, langfristig denken.

---

#### N-O-01 · Boden-pH-Drift — Saurer Boden blockiert Nährstoffe

🌿 Outdoor | **Cat:** CAT-2 | **Schwere:** 3

**Stages:** S1–S5 | **Saison-Kontext:** ganzjährig (besonders nach sauren Niederschlägen)

**Trigger-Logik:**
```
soil.pH < 5.8 OR soil.pH > 7.2
AND plant.stage >= "early_veg"
AND player.soilPhTestCount < 2
AND weather.acidRainIndex > 0.5 OR soil.organicMatter > 0.4
```

**Typische Ursachen:**
- Natürlich saurer Waldboden (Nadelwald-Standorte: pH 4.5–5.5)
- Torf-haltiges Substrat senkt pH über Zeit
- Saurer Regen akkumuliert über Wochen
- Zu viel Kompost oder organischer Dünger ohne pH-Ausgleich
- Kalkhaltige Böden (Süddeutschland, Kalkstein-Regionen): pH > 7.5

**Sichtbare Symptome:**
- Gleichzeitige Mangelzeichen an verschiedenen Nährstoffen trotz gedüngter Erde
- Eisenchlorose (junge Blätter gelb, Adern grün) bei alkalischem Boden
- Mangan-Flecken und allgemeine Verfärbungen bei saurem Boden
- Dünger wirkt nicht trotz Anwendung

**Häufige Fehlinterpretation:**
Spieler kauft mehr Dünger wenn Nährstoffmangel-Zeichen erscheinen. Gibt mehr — ohne Effekt. pH ist der eigentliche Filter.

**Gegenmaßnahme bei saurem Boden (< 5.8):**
1. Dolomitkalk oder Gartenkalk einarbeiten (50–100 g/m²)
2. pH steigt langsam — 2–4 Wochen für sichtbare Wirkung
3. pH-korrigiertes Gießwasser verwenden

**Gegenmaßnahme bei alkalischem Boden (> 7.2):**
1. Schwefel einarbeiten (absäuernd, langsam wirkend)
2. Torf beimengen
3. pH-Down im Gießwasser (schneller Effekt)

**Lerninhalt:**
Im Outdoor-Grow ist der Boden-pH die Basis aller Nährstoffverfügbarkeit. Cannabis braucht pH 6.0–7.0 im Boden. Außerhalb dieses Fensters sind es nicht Nährstoffe die fehlen — es ist die Fähigkeit der Pflanze sie aufzunehmen. Bodentest vor dem Grow ist Pflicht, nicht Option.

**Coach-Hinweis-Stil:** Bodenchemisch-grundlegend. „Düngen ohne Bodentest ist wie Autofahren ohne Benzin-Anzeige. Teste deinen pH — alles andere ist Raten."

**Asset-Tag:** `img:soil-ph-test-outdoor`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** 2–4 Wochen nach Bodenkorrektur
**Telemetry:** `event.trigger=soil_ph_drift`, `soil.pH.value`, `player.soilPhTestCount`

---

#### N-O-02 · Nährstoff-Auswaschung — Starkregen laugt Boden aus

🌿 Outdoor | **Cat:** CAT-2 | **Schwere:** 3

**Stages:** S2–S5 | **Saison-Kontext:** Juli–September

**Trigger-Logik:**
```
weather.rainTotal72h > 80 (mm)
AND soil.leachingRate > 0.6
AND fertilizer.lastApplication > 5 (Tage)
AND soil.organicMatterContent < 0.03
```

**Typische Ursachen:**
- Heftiger Regen wäscht lösliche Mineraldünger-Nährstoffe aus dem Wurzelbereich
- Sandiger Boden ohne organische Substanz hat kaum Pufferwirkung
- Mineraldünger wurde kurz vor dem Regen gegeben (100% ausgewaschen)
- Kein Mulch → Oberflächenabfluss verstärkt Auswaschung

**Sichtbare Symptome:**
- 3–5 Tage nach Regenperiode: allgemeine Gelbfärbung älterer Blätter (Stickstoffmangel-Bild)
- Wachstum verlangsamt sich nach scheinbar ausreichend Wasser
- Boden wirkt ausgewaschen (heller, strukturloser)
- Düngung die kurz vor dem Regen gegeben wurde wirkt nicht

**Häufige Fehlinterpretation:**
„Es hat geregnet, die Pflanze hat genug — warum wird sie gelb?" Spieler versteht nicht dass Regen Nährstoffe entfernt statt bringt.

**Gegenmaßnahme:**
1. Nach starkem Regen: Nährstoffe neu dosieren (halbe Dosis zum Einstieg)
2. Organische Dünger bevorzugen (humusgebundene Nährstoffe werden nicht so schnell ausgewaschen)
3. Mulch aufbringen (reduziert Oberflächenabfluss um bis zu 60%)
4. Kompost einarbeiten (verbessert Kationenaustauschkapazität des Bodens)

**Lerninhalt:**
Mineralische Nährstoffe sind im Wasser löslich — das ist ihre Stärke und ihre Schwäche. Bei starkem Regen folgen sie dem Wasserfluss tief in den Boden wo Cannabis-Wurzeln sie nicht mehr erreichen. Organische Dünger binden Nährstoffe in Bodenorganismen und Humus — natürlicher Puffer.

**Coach-Hinweis-Stil:** Nach-dem-Regen-bewusst. „3 Tage Starkregen waren. Jetzt braucht deine Pflanze Nachschub — der Regen hat die löslichen Nährstoffe mitgenommen."

**Asset-Tag:** `img:rain-leached-outdoor`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** 3–5 Tage nach Neudüngung
**Telemetry:** `event.trigger=nutrient_leaching`, `weather.rainTotal72h`, `soil.leachingRate`

---

#### N-O-03 · Organik-Timing — Zu spät gegebener Kompost in der Blüte

🌿 Outdoor | **Cat:** CAT-2 | **Schwere:** 2

**Stages:** S3–S5 | **Saison-Kontext:** August

**Trigger-Logik:**
```
player.compostApplication > 0
AND plant.stage >= "preflower"
AND daysUntilCompostEffect < plant.bloomWeeksRemaining
AND nutrient.nitrogenReleaseDelay > 14
```

**Typische Ursachen:**
- Spieler gibt Kompost oder organische Volldünger am Beginn der Blüte
- Versteht nicht dass organische Nährstoffe 2–4 Wochen Mikrobentätigkeit brauchen bis sie verfügbar sind
- Gibt Stickstoff in den Boden der erst in Mitte/Late Flower freigesetzt wird — zu spät und zu viel

**Sichtbare Symptome:**
- Blüte läuft zunächst normal
- In S5 (Mid Flower): plötzlich dunkles Grün, clawende Blätter (verzögerter N-Überschuss)
- Blütenentwicklung verlangsamt sich
- Reife verzögert sich

**Häufige Fehlinterpretation:**
Spieler sieht zunächst keine Reaktion und denkt der Kompost wirkt nicht. Gibt mehr. Weeks later: N-Tox.

**Gegenmaßnahme:**
1. Organische Düngung ab Blütebeginn: nur noch schnell verfügbare Formen (Flüssigdünger, Wurmtee)
2. Fester Kompost/organischer Volldünger: spätestens 4 Wochen vor Blütebeginn

**Lerninhalt:**
Organische Dünger sind kein Direktfutter für Pflanzen — sie sind Futter für Bodenmikroorganismen die dann Nährstoffe für Pflanzen verfügbar machen. Dieser Umweg dauert 2–4 Wochen. Wer in der Blüte organisch düngt ohne diesen Delay zu kennen, gibt Nährstoffe die zu spät kommen oder zu stark werden.

**Coach-Hinweis-Stil:** Timing-edukativ. „Kompost jetzt in der Blüte? Der Stickstoff kommt erst in 3–4 Wochen an — das ist zu spät für Gutes und zu früh fürs Ende. Wechsel auf Flüssigdünger."

**Asset-Tag:** `img:organic-timing-outdoor`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** Langsam — N-Überschuss baut sich über Wochen ab
**Telemetry:** `event.trigger=organic_timing_error`, `nutrient.nitrogenReleaseDelay`, `plant.stage`

---

## CAT-5 · Wurzelzone / Boden — Outdoor (3 Events)

> Outdoor-Wurzeln haben theoretisch unbegrenzten Raum — aber Boden-Qualität, Kompaktierung und Drainage bestimmen wie weit sie wirklich kommen.

---

#### R-O-01 · Bodenverdichtung — Schlechte Drainage, erstickende Wurzeln

🌿 Outdoor | **Cat:** CAT-5 | **Schwere:** 3

**Stages:** S1–S4 | **Saison-Kontext:** ganzjährig

**Trigger-Logik:**
```
soil.compaction > 0.80
AND soil.drainage === "poor"
AND soil.clayContent > 0.40
AND plant.rootPenetrationDepth < expected * 0.5
```

**Typische Ursachen:**
- Lehm- oder Tonboden ohne Auflockerung
- Frühere maschinelle Verdichtung (Fahrzeuge, Traktoren)
- Begehung des Beetes wenn nass (Struktur kollabiert)
- Kein Tieflockerung vor dem Pflanzen

**Sichtbare Symptome:**
- Pflanze wächst langsamer als erwartet trotz gutem Standort
- Wasser steht nach Regen lange auf der Oberfläche
- Stechender Schritt in Bodennähe: Boden springt nicht zurück (kein Luftvolumen)
- Pflanze reagiert überproportional auf Trockenheit und Nässe (kein Puffer)

**Häufige Fehlinterpretation:**
Langsames Wachstum wird auf Nährstoffmangel zurückgeführt. Spieler düngt mehr ohne Effekt.

**Gegenmaßnahme:**
1. Bodenlockerung mit Grabgabel (40–50 cm tief)
2. Perlite, Bims oder Sand einarbeiten (30% des Volumens)
3. Kompost einarbeiten (verbessert Struktur langfristig)
4. Beete nie betreten wenn nass
5. Raised Bed als Alternative für stark verdichteten Boden

**Lerninhalt:**
Cannabis-Wurzeln können Lehmboden nicht durchdringen wenn dieser verdichtet ist. Eine Testmethode: Drahtbügel 30 cm in den Boden drücken — wenn er bei 15 cm Widerstand spürt, ist der Boden zu dicht. Bodenstruktur ist Wurzelstruktur.

**Coach-Hinweis-Stil:** Bodenstruktur-lehrend. „Druck deinen Finger in die Erde. Wie weit kommst du? Unter 5 cm ohne Widerstand ist gut. Wenn nicht, lockere auf."

**Asset-Tag:** `img:compacted-outdoor-soil`
**Cooldown:** 21 Tage
**Ausschluss:** keine
**Recovery:** Langsam — Bodenstruktur verbessert sich über Wochen
**Telemetry:** `event.trigger=soil_compaction_outdoor`, `soil.compaction.value`, `soil.drainage`

---

#### R-O-02 · Heißer Untergrund — Wurzel-Hitzestress in Töpfen

🌿 Outdoor | **Cat:** CAT-5 | **Schwere:** 3

**Stages:** S2–S5 | **Saison-Kontext:** Juni–August

**Trigger-Logik:**
```
setup.potPlacement === "concrete_or_asphalt"
AND weather.tempMax > 30
AND soil.rootZoneTemp > 28
AND plant.isInPot === true
```

**Typische Ursachen:**
- Topf auf Betonterrasse oder Asphalt bei sommerlicher Hitze
- Dunkler Topf absorbiert Wärme → Wurzelzone überhitzt
- Kein Abstand zwischen Topf und Untergrund (keine Luftzirkulation unten)
- Südexponierte Terrasse mit voller Nachmittagssonne auf Topf

**Sichtbare Symptome:**
- Pflanze hängt trotz feuchter Erde (Hitzeschock der Wurzeln)
- Erde im oberen Bereich trocken, Topfboden heiß anzufassen
- Wachstum stoppt am Nachmittag
- Wurzeln an Topfinnenwand braun verbrannt (sichtbar bei Umtopfen)

**Häufige Fehlinterpretation:**
Spieler denkt an Trockenstress und gießt mehr. Das Wasser ist zu heiß → schädigt die Wurzeln zusätzlich.

**Gegenmaßnahme:**
1. Topf in hellen Untersetzer stellen (reflektiert Wärme)
2. Topf auf Holzlatte oder Ziegelsteine stellen (Luftzirkulation unten)
3. Topf mit heller Farbe umwickeln oder in Jutebeutel stellen
4. Nachmittagsschatten für Topf

**Lerninhalt:**
Schwarzer Kunststofftopf auf Betonterasse = Backrohr für Wurzeln. Auf heißem Untergrund kann die Temperatur im unteren Topfdrittel 40–45°C erreichen. Enzyme die Nährstoffaufnahme regulieren denaturieren ab 35°C. Heller Topf oder Isolation ist keine Ästhetik — es ist Wurzelschutz.

**Coach-Hinweis-Stil:** Thermisch-praktisch. „Leg deine Hand auf den Topf. Zu heiß zum Anfassen? Dann sind es deine Wurzeln auch. Heb den Topf hoch."

**Asset-Tag:** `img:hot-pot-concrete`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** Sofort nach Isolierung / Beschattung
**Telemetry:** `event.trigger=root_heat_stress`, `soil.rootZoneTemp`, `setup.potPlacement`

---

#### R-O-03 · Falsche Erde — Zu schwerer Lehmboden ohne Vorbereitung

🌿 Outdoor | **Cat:** CAT-5 | **Schwere:** 2

**Stages:** S0–S2 | **Saison-Kontext:** Pflanzungsphase April–Mai

**Trigger-Logik:**
```
soil.clayContent > 0.50
AND soil.perliteContent < 0.10
AND plant.rootGrowthRate < expected * 0.4
AND daysSinceTransplant < 14
```

**Typische Ursachen:**
- Spieler pflanzt direkt in unvorbereiteten Gartenboden
- Kauferde mit hohem Ton-Anteil ohne Lockerungsmittel
- Kein Substrat-Mix erstellt vor dem Pflanzen
- „Boden ist Boden" — Spieler unterscheidet nicht zwischen Bodentypen

**Sichtbare Symptome:**
- Pflanze wächst nach Auspflanzen nicht weiter (kein Anwachsen)
- Wurzeln zirkulieren im kleinen Pflanzloch ohne in Boden einzuwachsen
- Erde nach Regen komplett verdichtet, bei Trockenheit steinhart
- Pflanze kommt nie über Anfangsgröße hinaus

**Häufige Fehlinterpretation:**
Spieler denkt die Pflanze hat Steckling-Stress oder Transplantierschock. Wartet 2 Wochen. Ursache ist das Substrat.

**Gegenmaßnahme:**
1. Pflanzloch 50×50×50 cm mit verbessertem Substrat befüllen (30% Perlite + 30% Kompost + 40% leichte Erde)
2. Bestehende Pflanze vorsichtig umsetzen wenn möglich
3. Langfristig: Raised Bed anlegen

**Lerninhalt:**
Cannabis braucht keine perfekte Erde — aber sie braucht eine die Luft, Wasser und Wurzeln durchlässt. Der Unterschied zwischen gutem und schlechtem Outdoor-Boden entscheidet über 50–100% Ertragsunterschied. Ein 50×50 cm Pflanzloch mit richtigem Mix ist die beste Investition vor dem Grow.

**Coach-Hinweis-Stil:** Substrat-grundlegend. „Deine Pflanze wächst nicht an. Schau dir die Erde an: klebt sie zusammen? Dann ist sie zu schwer. Baue ein besseres Pflanzloch."

**Asset-Tag:** `img:clay-soil-outdoor`
**Cooldown:** — (einmaliges Diagnose-Event beim Pflanzen)
**Ausschluss:** keine
**Recovery:** Nur mit Umpflanzen vollständig lösbar
**Telemetry:** `event.trigger=wrong_soil_type`, `soil.clayContent`, `plant.rootGrowthRate`

---

## CAT-8 · Training / Pflanzenstruktur — Outdoor (3 Events)

---

#### TR-O-01 · Sturmschaden — Gebrochener Ast

🌿 Outdoor | **Cat:** CAT-8 | **Schwere:** 3

**Stages:** S2–S5 | **Saison-Kontext:** ganzjährig (Sommer- und Herbststürme)

**Trigger-Logik:**
```
weather.windGustMax > 70 (km/h)
AND plant.stemDiameter < 2.5 (cm)
AND plant.trainingSupport === false
AND weather.storm === true
```

**Typische Ursachen:**
- Sturm-Event ohne vorherige Stützmaßnahmen
- Ast zu lang und unverstützt; Hebelwirkung durch Windlast
- Pflanze zu hoch und schlank ohne Seitenverankerung
- Bewässerung direkt vor Sturm macht Boden weich → Pflanze kippt

**Sichtbare Symptome:**
- Ast hängt nach unten, verbunden nur noch durch Rinde
- Grünes, saftiges Gewebe sichtbar an Bruchstelle
- Blätter des betroffenen Astes welken innerhalb von Stunden

**Häufige Fehlinterpretation:**
„Der Ast ist gebrochen — ab damit." Aber halbgebrochene Äste (Bark-Bridge) können sich mit richtiger Stütze vollständig erholen.

**Gegenmaßnahme:**
1. Ast vorsichtig in Ausgangsposition zurückführen
2. Pfropfband (Teflon-Tape, Paketklebeband) um Bruchstelle wickeln
3. Ast mit Stab stützen bis Verwachsung eintritt (7–14 Tage)
4. Bruchstelle feucht halten in den ersten 48h

**Eskalation bei Fehlentscheidung:**
- Ast komplett entfernt: Ertragsverlust dieses Astes (10–25%)
- Ungestützter Ast bricht weiter: Rinde reißt → kein Wachstum mehr möglich

**Lerninhalt:**
Pflanzen haben bemerkenswerte Selbstheilungskräfte. Ein halbgebrochener Ast der in Position gehalten wird bildet in 10–14 Tagen Kallusgewebe und verwächst. Wer das weiß, rettet Äste statt sie zu entfernen. Pflanzenpflaster aus Pfropfband ist eine der wichtigsten Outdoor-Skills.

**Coach-Hinweis-Stil:** Reparatur-optimistisch. „Halbgebrochener Ast? Nicht abschneiden! Bring ihn in Position, wickle ihn ein. In 10 Tagen ist er stärker als vorher."

**Asset-Tag:** `img:broken-branch-repair`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** 7–14 Tage bis vollständige Verwachsung
**Telemetry:** `event.trigger=storm_branch_break`, `weather.windGustMax`, `plant.branchDamageCount`

---

#### TR-O-02 · Lichtkonkurrenz — Beschattung durch Nachbarpflanzen

🌿 Outdoor | **Cat:** CAT-8 | **Schwere:** 2

**Stages:** S2–S4 | **Saison-Kontext:** Juli–August

**Trigger-Logik:**
```
location.nearbyPlants === true
AND location.nearbyPlantHeight > plant.height
AND plant.canopyLightReceived < 0.6 (anteil direkter Sonne)
AND season.month >= 7
```

**Typische Ursachen:**
- Nachbarliche Tomaten, Mais oder andere Hochgewächse beschatten Cannabis
- Pflanze zu nah an Zaun oder Gebäude die Nachmittagssonne blockieren
- Mehrere Cannabis-Pflanzen zu eng gesetzt (Inter-Canopy-Beschattung)
- Wildpflanzen/Unkraut wächst sich zu Konkurrenz

**Sichtbare Symptome:**
- Pflanze wächst asymmetrisch zur Lichtseite hin
- Schattenbereich der Pflanze produziert dünne, schwache Triebe
- Wachstum verlangsamt sich obwohl Standort scheinbar sonnig ist
- In Blüte: Lichtmangel-Buds (airy, keine Dichte)

**Gegenmaßnahme:**
1. Nachbarpflanze beschneiden oder umsetzen
2. Cannabis-Pflanze anheben (auf Tisch, Palette)
3. Pflanze drehen — Schattenseite täglich rotieren
4. Defoliation der beschatteten Seite um Energie zu konzentrieren

**Lerninhalt:**
Standortplanung ist Jahres-Planung. Was im Mai noch keine Konkurrenz ist, kann im August 2 Meter hoch sein. Wer pflanzt, sollte die Höhe aller Nachbarpflanzen im August kennen und planen.

**Coach-Hinweis-Stil:** Standort-analytisch. „Deine Pflanze wächst schräg. Folge der Richtung — da ist die Sonne. Was beschattet die andere Seite?"

**Asset-Tag:** `img:shading-competition`
**Cooldown:** 14 Tage
**Ausschluss:** keine
**Recovery:** Kontinuierlich mit Rotation und Beschnitt der Konkurrenz
**Telemetry:** `event.trigger=light_competition`, `plant.canopyLightReceived`

---

#### TR-O-03 · Überstrecken — Zu wenig Licht in Veg führt zu instabiler Struktur

🌿 Outdoor | **Cat:** CAT-8 | **Schwere:** 2

**Stages:** S1–S3 | **Saison-Kontext:** Mai–Juni

**Trigger-Logik:**
```
plant.internodeLength > 8 (cm)
AND plant.stemDiameter < 1.0
AND plant.canopyLightReceived < 0.5
AND plant.stage <= "preflower"
```

**Typische Ursachen:**
- Pflanze steht im Halbschatten und streckt sich zur Lichtquelle
- Zu früh nach draußen gestellt (Mai: Tageslänge noch kurz, Sonne flach)
- Standort mit Morgenbeschattung → Pflanze streckt am Morgen stark

**Sichtbare Symptome:**
- Internodale Abstände > 8 cm (bei gutem Licht: 3–5 cm)
- Stängel dünn und fragil
- Pflanze neigt sich ständig zur Lichtquelle hin
- Schwacher Halt im Boden; kippt bei leichtem Wind

**Gegenmaßnahme:**
1. Pflanze an sonnigerem Standort umsetzen
2. Stab als Stütze einsetzen
3. LST: Stängel biegen und befestigen statt ihn nach oben wachsen zu lassen
4. Stängel stärken durch moderaten Wind (Ventilator in Nähe oder offene Position)

**Lerninhalt:**
Etiolierung ist ein Licht-Suchprozess. Die Pflanze investiert Ressourcen in Strecken statt in Stängeldicke. Das resultiert in einer schwachen Struktur die kaum Blütengewicht tragen kann. Licht ist die wichtigste Standortvariable — noch vor Nährstoffen.

**Coach-Hinweis-Stil:** Struktur-fokussiert. „Lange Internodien und dünner Stängel — deine Pflanze sucht Licht. Umsetzen oder LST, bevor sie unter ihrem eigenen Gewicht in Blüte bricht."

**Asset-Tag:** `img:etiolated-outdoor`
**Cooldown:** 12 Tage
**Ausschluss:** keine
**Recovery:** Struktur verbessert sich mit besserem Licht in 2–3 Wochen
**Telemetry:** `event.trigger=etiolation`, `plant.internodeLength`, `plant.canopyLightReceived`

---

## CAT-9 · Blüte / Erntequalität — Outdoor (4 Events)

> Outdoor-Blüte ist Saison-Biologie. Der Spieler lernt hier: Tageslichtstunden lesen, Trichome beurteilen, Erntezeitpunkt gegen Wetter abwägen.

---

#### B-O-01 · Erntezeitpunkt verpasst — Überreife und Terpenverlust

🌿 Outdoor | **Cat:** CAT-9 | **Schwere:** 3

**Stages:** S7 | **Saison-Kontext:** Oktober

**Trigger-Logik:**
```
plant.trichomeRipeness > 0.90
AND plant.harvestWindowDaysElapsed > 10
AND player.harvestAction === false
AND season.month === 10
```

**Typische Ursachen:**
- Spieler wartet zu lange in der Hoffnung auf mehr Masse
- Weiß nicht wie man Trichome beurteilt und verlässt sich auf Optik
- Wetter schien schlecht → Ernte aufgeschoben → Trichome überreifen

**Sichtbare Symptome:**
- Trichome haben > 80% amber (Lupe/Mikroskop)
- Buds wirken schlaff und verlieren Struktur
- Pistillen fast alle braun/orange (kein weißer mehr sichtbar)
- Aroma beginnt sich zu verändern (von fruchtig/blumig zu schwerer, erdiger Note)

**Häufige Fehlinterpretation:**
Spieler sieht dicke, dunkle Buds und denkt „noch eine Woche macht es fetter". Überreife kostet Terpen-Qualität, nicht Masse.

**Gegenmaßnahme:**
1. Sofort ernten wenn >70–80% amber und alle anderen Signale auf Reife stehen
2. Trichom-Wertung als primäres Ernte-Signal etablieren

**Lerninhalt:**
Das Ernte-Fenster ist real und begrenzt — typisch 5–10 Tage. Danach bauen THC-Moleküle zu CBN ab (sedierender Effekt). Terpene oxidieren und verlieren Qualität. Der Spieler muss lernen: Reife = jetzt ernten, nicht morgen.

**Coach-Hinweis-Stil:** Timing-eindeutig. „Deine Trichome sind [X]% amber. Das Ernte-Fenster schließt sich. Warte noch eine Woche und du verpasst den Höhepunkt."

**Asset-Tag:** `img:overripe-trichomes`
**Cooldown:** — (einmaliges Event pro Grow)
**Ausschluss:** keine
**Recovery:** Ernte jetzt; Qualitätsverlust partiell aber nicht reversibel
**Telemetry:** `event.trigger=harvest_window_missed`, `plant.trichomeRipeness`, `plant.terpeneQuality`

---

#### B-O-02 · Herbstfeuchtigkeit — Schimmel kurz vor der Ernte

🌿 Outdoor | **Cat:** CAT-9 | **Schwere:** 5

**Stages:** S6–S7 | **Saison-Kontext:** September–Oktober

**Trigger-Logik:**
```
season.month >= 9
AND climate.rh > 75
AND weather.morningDew === true
AND plant.budDensity > 0.7
AND plant.trichomeRipeness > 0.5
```

**Wetter-Fenster:** Herbst-Hochdruck-Wetter mit kalten Nächten und warmen Tagen = maximaler Taupunkt-Wechsel = Botrytis-Hochsaison.

**Typische Ursachen:**
- Herbstliches Mikroklima: kalte Nächte kondensieren Feuchtigkeit in Buds
- Dichte Bud-Struktur hält Morgentau bis in den Nachmittag
- Pflanze steht in Mulde oder an Gebäude ohne Luftzirkulation
- Kein Regenschutz in kritischen Herbstwochen

**Sichtbare Symptome:**
- Graue, staubige Stellen an Bud-Außenseiten
- Inneres der Buds braun und matschig bei aufgebrechen
- Ein ganzer Ast welkt plötzlich (Botrytis-Leitgewebe durchzogen)
- Aroma von betroffenen Buds muffig-pilzig

**Häufige Fehlinterpretation:**
Herbst = Blätter sehen sowieso schlechter aus. Spieler führt Bud-Verfärbungen auf normale Alterung zurück.

**Gegenmaßnahme:**
1. Sofortige Notfall-Ernte wenn >20% betroffen
2. Befallene Teile abtrennen (großzügig, 3 cm Sicherheitsabstand)
3. Verbleibende Pflanze unter Regenschutz stellen
4. Morgens Buds trocken schütteln (Taukondensation entfernen)
5. Schutzspray (Kaliumbicarbonat) auf verbleibende gesunde Buds

**Eskalation bei Fehlentscheidung:** → Gesamtverlust innerhalb 3–5 Tage möglich

**Folge-Events / Chains:** → EC-07 (Frühfrost + Schimmel als Doppelbedrohung)

**Lerninhalt:**
September und Oktober sind der kritischste Monat des Outdoor-Grows. Dichter Nebel, Tau, Regen, Kälte — alles arbeitet gegen den Züchter. Präventiv: Regenschutz von Anfang September, tägliche Sicht-Inspektion, Luft durch Defoliation öffnen.

**Coach-Hinweis-Stil:** Herbst-alarm. „September-Nebel und hohe Luftfeuchtigkeit: Botrytis-Hochsaison hat begonnen. Inspiziere täglich. Was braun und matschig ist — weg damit."

**Asset-Tag:** `img:autumn-bud-rot`
**Cooldown:** — (Saison-spezifisch)
**Ausschluss:** keine
**Recovery:** Befallenes nicht reversibel; gesunde Buds rettbar mit Sofortmaßnahmen
**Telemetry:** `event.trigger=autumn_botrytis`, `climate.rh.morning`, `plant.botrytisCoverage`, `event.severity=critical`

---

#### B-O-03 · Reifeverzögerung — Kalte Septembernächte bremsen die Blüte

🌿 Outdoor | **Cat:** CAT-9 | **Schwere:** 2

**Stages:** S5–S6 | **Saison-Kontext:** September

**Trigger-Logik:**
```
climate.tempNight < 14
AND plant.stage === "mid_flower"
AND plant.trichomeRipeness < 0.4
AND season.month === 9
AND plant.bloomWeeksCurrent > 8
```

**Typische Ursachen:**
- Sorte mit langer Blütezeit (> 10 Wochen) kommt mit September-Temperaturen in Konflikt
- Standort mit frühem Schatten (Wald, Gebäude) verliert Wärme schneller
- Kein Gewächshaus für die letzten Reife-Wochen
- Sortenauswahl nicht an Klimazone angepasst (tropische Sorte in Mitteleuropa)

**Sichtbare Symptome:**
- Trichome entwickeln sich langsamer als erwartet
- Buds pausieren im Aufbau
- Blätter beginnen zu herbsten (sich verfärben) obwohl Buds noch nicht reif
- Pflanze hat weniger Energie für Bud-Reife als für Leaf Senescence

**Häufige Fehlinterpretation:**
Pflanze „stirbt ab" weil die Blätter sich verfärben. Spieler erntet zu früh.

**Gegenmaßnahme:**
1. Gewächshaus oder Folientunnel für Nachtwärme
2. Tagsüber maximale Sonnenstunden ausnutzen
3. Vliesabdeckung für Nächte unter 10°C
4. Bei Sorte mit > 12 Wochen Blüte: in nächster Saison früher blühende Sorte wählen

**Lerninhalt:**
Trichom-Reife ist temperaturabhängig. Unter 14°C nachts verlangsamt sich die Enzymkaskade die Cannabinoide synthetisiert. Herbstliches Blattsterben ist genetisch programmiert und unabhängig von Bud-Reife. Ein gelbes Blatt bedeutet nicht eine reife Pflanze.

**Coach-Hinweis-Stil:** Saison-realistisch. „Deine Blätter verfärben sich — das ist Herbst, keine Reife. Schau die Trichome an. Die Blüte braucht noch Zeit. Schütze die Nächte."

**Asset-Tag:** `img:autumn-slow-ripening`
**Cooldown:** — (Saison-spezifisch)
**Ausschluss:** keine
**Recovery:** Mit Wärme-Schutz 1–3 zusätzliche Wochen Reife möglich
**Telemetry:** `event.trigger=cold_ripening_delay`, `climate.tempNight`, `plant.trichomeRipeness`

---

#### B-O-04 · Sonnenbrand an Buds — UV-Schäden in der Reife

🌿 Outdoor | **Cat:** CAT-9 | **Schwere:** 2

**Stages:** S5–S6 | **Saison-Kontext:** August

**Trigger-Logik:**
```
weather.uvIndex > 8
AND plant.budDensity > 0.6
AND plant.canopyProtection === "none"
AND weather.sunIntensityChange > 40% (verglichen mit Vorwoche)
```

**Typische Ursachen:**
- Plötzliche Intensivierung der Sonnenstrahlung nach Regenperiode
- Buds in S5 haben dünnere Schutzschicht als Blätter
- Pflanze nach langer Innenphase (Gewächshaus) plötzlich in Direktsonne gestellt

**Sichtbare Symptome:**
- Weiße, ausgebleichte Flecken auf Bud-Oberflächen
- Trichome auf exponierten Stellen teilweise abgebaut
- Nur Sonnenseite betroffen (Ostseite am Morgen, Westseite am Nachmittag)

**Häufige Fehlinterpretation:**
Weiße Stellen auf Buds werden für Mehltau gehalten. Unterschied: UV-Schäden sind flach und gleichmäßig; Mehltau ist puderartig und wächst.

**Gegenmaßnahme:**
1. Schattiergewebe 20–30% aufspannen für Mittagsstunden
2. Pflanze drehen sodass beschädigte Seite in Schatten kommt
3. Keine weiteren UV-Schocks; graduell akklimatisieren

**Lerninhalt:**
Trichome sind lichtempfindlich — das ist ihr Wesen, aber auch ihre Schwäche. Zu intensive UV-Strahlung baut Terpene und Cannabinoide direkt an der Oberfläche ab. Schattiergewebe in der Blüte ist nicht nur Hitzeschutz sondern auch Qualitätssicherung.

**Coach-Hinweis-Stil:** Qualitätsorientiert. „Weiße Stellen auf den Buds — kein Mehltau, Sonnenbrand. Schattiergewebe jetzt schützt deine Trichome."

**Asset-Tag:** `img:bud-sunscald`
**Cooldown:** 10 Tage
**Ausschluss:** keine
**Recovery:** UV-Schäden nicht reversibel; neue Trichome wachsen geschützt nach
**Telemetry:** `event.trigger=bud_sunscald`, `weather.uvIndex`, `plant.trichomeDamage`

---

## CAT-4 · Licht / Standort — Outdoor (1 Event)

---

#### L-O-01 · Standort-Beschattung — Zu wenig Direktsonne durch Umgebung

🌿 Outdoor | **Cat:** CAT-4 | **Schwere:** 3

**Stages:** S1–S6 | **Saison-Kontext:** ganzjährig

**Trigger-Logik:**
```
plant.directSunHours < 6
AND location.shadingSource !== "none"
AND plant.dliActual < 25
AND plant.stage >= "early_veg"
```

**Typische Ursachen:**
- Pflanze steht neben hohem Gebäude (Nordseite oder Westseite)
- Baum oder Hecke wirft nachmittags Schatten
- Standort in Tallage (Sonne scheint erst ab 10 Uhr, weg ab 15 Uhr)
- Andere Pflanzen sind gewachsen und beschatten jetzt Cannabis

**Sichtbare Symptome:**
- Pflanze wächst langsam und streckt stark zur Lichtquelle
- Buds locker und wenig dicht (Lichtmangel-Buds)
- DLI deutlich unter 30 mol/m²/d (für Blüte: 40+ optimal)
- Pflanze blüht spät oder bleibt klein

**Häufige Fehlinterpretation:**
Spieler denkt die Sorte ist langsam oder die Erde ist schlecht. Der Standort als Ursache wird nicht in Betracht gezogen.

**Gegenmaßnahme:**
1. Pflanze an besseren Standort umsetzen (wenn in Topf)
2. Beschattende Pflanzen beschneiden
3. Reflexionsflächen aufstellen (Folie hinter Pflanze) um Licht zu lenken
4. Für nächste Saison: Standort mit Sonnentracking planen (mind. 8h Direktsonne)

**Lerninhalt:**
8 Stunden Direktsonne ist das Minimum für einen erfolgreichen Outdoor-Grow. Diffuses Licht zählt nicht — Cannabis braucht direkte Photonen. Standortanalyse vor dem Grow bedeutet: einen Tag lang beobachten wann die Sonne wo scheint. Diese Stunde ist die beste Investition des Jahres.

**Coach-Hinweis-Stil:** Standort-analytisch. „Deine Pflanze bekommt weniger als 6 Stunden Direktsonne. Das reicht nicht für gute Buds. Steh heute mal daneben und beobachte den Schattenverlauf."

**Asset-Tag:** `img:shaded-outdoor-location`
**Cooldown:** 21 Tage
**Ausschluss:** keine
**Recovery:** Nur durch Standortwechsel vollständig lösbar
**Telemetry:** `event.trigger=location_shading`, `plant.directSunHours`, `plant.dliActual`

---

## CAT-10 · Story / Saison-Beats — Outdoor (2 Events)

> Diese Events sind keine Probleme — sie sind Meilensteine die dem Outdoor-Spieler das Gefühl von Saison, Natur und Fortschritt geben.
> Vollständige Specs aller 10 Story-Beats in `04_learning-story-beats.md`.

---

#### S-O-01 · Outdoor-Saisonstart — Erste Pflanze nach draußen

🌿 Outdoor | **Cat:** CAT-10 | **Schwere:** — (Story Beat)

**Stages:** S1–S2 | **Saison-Kontext:** Mai (nach den Eisheiligen)

**Trigger-Logik:**
```
player.firstOutdoorTransplant === true
AND season.month === 5
AND weather.frostRisk === false
```

**Event-Typ:** Milestone Beat — narrativ, kein Stress
**Lerninhalt:** Outdoor-Grow beginnt mit einem Akt der Freiheit — und der Verantwortung. Die Pflanze verlässt die geschützte Umgebung und tritt in die Natur. Mit ihr geht die vollständige Kontrolle.

**Coach-Hinweis-Stil:** Feierlich-einleitend. „Sie ist draußen. Die Sonne, der Wind, der Regen — das sind jetzt deine Partner. Beobachte täglich. Die Natur kommuniziert."

**Asset-Tag:** `img:plant-going-outside`
**Telemetry:** `event.trigger=outdoor_season_start`, `milestone.firstOutdoor=true`

---

#### S-O-02 · Erster Outdoor-Erntemonat — Oktober-Reflexion

🌿 Outdoor | **Cat:** CAT-10 | **Schwere:** — (Story Beat)

**Stages:** S7 | **Saison-Kontext:** Oktober

**Trigger-Logik:**
```
player.firstOutdoorHarvest === true
AND season.month === 10
AND plant.harvestCompleted === true
```

**Event-Typ:** Achievement Beat — narrativ, Abschluss der Saison
**Lerninhalt:** Von Mai bis Oktober — 5 Monate Geduld, Beobachtung und Lernen. Outdoor-Grow ist keine Aktivität, es ist eine Saison.

**Coach-Hinweis-Stil:** Würdigend-reflektierend. „Eine ganze Saison. Du hast Frost, Hitze, Regen und Schädlinge überlebt. Was hast du gelernt — und was machst du nächstes Jahr anders?"

**Asset-Tag:** `img:october-outdoor-harvest`
**Telemetry:** `event.trigger=outdoor_season_complete`, `milestone.firstOutdoorHarvest=true`

---

## Zusammenfassung: 02_outdoor-events.md

| Kategorie | Events | Schwere Ø | Saison-Schwerpunkt |
|-----------|--------|-----------|-------------------|
| CAT-3 Klima/Wetter | 5 | 3.8 | Ganzjährig |
| CAT-6 Schädlinge | 6 | 3.5 | Mai–Oktober |
| CAT-1 Wasser | 3 | 3.0 | Juni–September |
| CAT-2 Nährstoffe | 3 | 2.7 | April–September |
| CAT-5 Wurzelzone | 3 | 2.7 | Pflanzungsphase |
| CAT-8 Training | 3 | 2.3 | Mai–August |
| CAT-9 Blüte/Ernte | 4 | 3.0 | August–Oktober |
| CAT-4 Licht | 1 | 3.0 | Ganzjährig |
| CAT-10 Story | 2 | — | Mai + Oktober |
| **Gesamt** | **30** | **3.0** | |

**Kritische Events (Schwere 5):** K-O-05 (Herbstfrost), P-O-03 (Botrytis), B-O-02 (Herbst-Schimmel)

**Saison-Kalender der Events:**
- April–Mai: K-O-02, P-O-05, R-O-03, S-O-01
- Juni–August: K-O-01, W-O-02, P-O-02, P-O-04, R-O-02, TR-O-02, TR-O-03, B-O-04
- Juli–September: K-O-03, W-O-01, N-O-02, P-O-01, TR-O-01, L-O-01
- September–Oktober: K-O-05, P-O-03, B-O-01, B-O-02, B-O-03, N-O-01, S-O-02

**Chain-Anker-Events:** K-O-03 → P-O-03 → EC-02; K-O-05 → EC-07; K-O-04 → TR-O-01

---

*Nächste Datei: `03_shared-events.md` — 31 Events für beide Modi*
