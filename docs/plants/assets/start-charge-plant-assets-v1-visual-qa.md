# Start-Charge Plant Assets v1 Visual QA

## Kurzfazit

Die 11 PNGs sind als reine Einzelbilder weitgehend sauber freigestellt: kein Topf, kein Substrat, kein Text, keine UI, keine Fremdobjekte. Die Start-Charge ist aber als Serie noch nicht stabil genug fuer direkte Integration. Hauptgruende sind uneinheitliche Canvas-/Seitenverhaeltnisse, unruhige Stage-Spruenge in der Healthy-Linie und zu schwache Morphologie-Treue der Mid-Flower-Condition-Assets gegen die Mid-Flower-Baseline.

Integrationsfreigabe: **nein**

## Einzelpruefung

### `stage_02_seedling/healthy_none.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Stil/Lesbarkeit: sauber, klar, gut lesbar
- Stage-Lesbarkeit: klarer Seedling
- QA-Status: `needs_review`
- Hauptproblem: sehr langer nackter Stamm und nicht normierte Canvas-Groesse
- Re-Render-Hinweis: Stamm etwas kuerzer und kompakterer Seedling-Anker; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_03_early_veg/healthy_none.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Stil/Lesbarkeit: klar, aber zu hochgewachsen
- Stage-Lesbarkeit: eher spaetes early veg / fast mid veg
- QA-Status: `rerender_required`
- Hauptproblem: zu viele Nodien, zu hoher Wuchs, zu nah an Stretch/Mid Veg
- Re-Render-Hinweis: weniger Nodien, juengere juvenile Pflanze, mehr Abstand zu Mid Veg; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_04_mid_veg/healthy_none.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Stil/Lesbarkeit: stark
- Stage-Lesbarkeit: gutes Mid Veg
- QA-Status: `needs_review`
- Hauptproblem: quadratisches Canvas weicht von grossen Teilen der Serie ab
- Re-Render-Hinweis: gleiche Morphologie beibehalten, aber auf serienkonformes Canvas/Anchor normalisieren; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_05_late_veg/healthy_none.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Stil/Lesbarkeit: hochwertig
- Stage-Lesbarkeit: klares Late Veg
- QA-Status: `needs_review`
- Hauptproblem: harter Dichtesprung gegenueber Mid Veg und danach harter Formsprung zu Stretch
- Re-Render-Hinweis: Kronendichte etwas zuegeln und Uebergang zu Stretch vorbereiten; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_07_stretch/healthy_none.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Stil/Lesbarkeit: sauber
- Stage-Lesbarkeit: Stretch prinzipiell lesbar
- QA-Status: `needs_review`
- Hauptproblem: Late-Veg-zu-Stretch-Uebergang wirkt als Serienwechsel statt als organische Weiterentwicklung
- Re-Render-Hinweis: mehr sichtbare Baseline-Verwandtschaft zu Late Veg, aber laengere Internodien; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_08_early_flower/healthy_none.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Stil/Lesbarkeit: gut
- Stage-Lesbarkeit: fruehe Flower lesbar
- QA-Status: `needs_review`
- Hauptproblem: Serie wirkt ab hier wieder anders als die quadratischen Veg-Assets; Canvas-/Stilkontinuitaet fehlt
- Re-Render-Hinweis: gleiche Bloom-Stufe behalten, aber Serienanchor und Baseline-Verwandtschaft schaerfen; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_09_mid_flower/healthy_none.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Stil/Lesbarkeit: als Einzelbild gut
- Stage-Lesbarkeit: Mid Flower lesbar
- QA-Status: `rerender_required`
- Hauptproblem: als Referenz fuer Conditions nicht stabil genug, weil mehrere Condition-Assets deutlich andere Grundmorphologien haben
- Re-Render-Hinweis: klare Referenzpflanze mit definierter Silhouette, gleicher Serienanchor und mittlerer Bud-Masse fuer spaetere Ableitungen; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_09_mid_flower/underwatered_medium.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Condition-Lesbarkeit: trocken/welk lesbar, aber zu stark vergilbt
- QA-Status: `rerender_required`
- Hauptproblem: liest teilweise wie Defizienz/Fade statt medium underwatered; Grundmorphologie weicht von Healthy ab
- Re-Render-Hinweis: mehr Turgorverlust und trockene Hae ngehaltung, weniger Vergilbung, gleiche Baseline-Morphologie erzwingen; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_09_mid_flower/overwatered_medium.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Condition-Lesbarkeit: Overwatering klar lesbar
- QA-Status: `rerender_required`
- Hauptproblem: zu schwere, zu dunkle, zu fremde Pflanze; Wirkung eher severe als medium
- Re-Render-Hinweis: gleiche Healthy-Silhouette erzwingen, nur schwerere dunklere Blattmasse und sanfteres Downclawing; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_09_mid_flower/heat_stress_medium.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Condition-Lesbarkeit: Heat Stress prinzipiell erkennbar
- QA-Status: `rerender_required`
- Hauptproblem: Top-Taco gut, aber restliche Pflanze wirkt wie anderes Modell; Silhouette nicht baseline-treu genug
- Re-Render-Hinweis: obere Canopy-Spannung und Taco-Blatter auf exakter Healthy-Morphologie aufsetzen, Bud-Masse unveraendert lassen; Asset-ID gleich lassen; als `v002` neu rendern

### `stage_09_mid_flower/nutrient_burn_medium.png`

- Alpha/Freistellung: sauber
- Inhalt: kein Topf, kein Substrat, kein Hintergrund, kein Text, keine UI
- Pflanze voll sichtbar: ja
- Condition-Lesbarkeit: Spitzen-/Randverbrennung gut lesbar
- QA-Status: `rerender_required`
- Hauptproblem: Burn ist klar, aber Gesamtpflanze wirkt zu weit von Healthy entfernt und fast spaeter/starker als medium
- Re-Render-Hinweis: nur Spitzen und Raender belasten, Bud-Struktur und Grundsilhouette dichter an Healthy halten; Asset-ID gleich lassen; als `v002` neu rendern

## Serienpruefung der Healthy-Baselines

- Transparenz, Freistellung und Ausschluss von Topf/Substrat/UI/Text: durchgehend gut
- Perspektive und Licht: grob konsistent, aber nicht streng genug fuer eine Serienproduktion
- Natuerlicher Wachstumsverlauf: **nicht sauber genug**
- Hauptprobleme:
  - uneinheitliche Bildformate (`1024x1536` vs `1254x1254`)
  - Early Veg ist zu nah an Mid Veg
  - Late Veg zu Stretch wirkt wie Stil-/Modellbruch statt organischer Uebergang
  - Mid Flower ist als Einzelbild okay, aber nicht stark genug als spaetere Referenzbaseline
- Klare Stage-Unterschiede:
  - Seedling: ja
  - Early Veg: nur eingeschraenkt
  - Mid Veg: ja
  - Late Veg: ja
  - Stretch: ja, aber zu stark abgesetzt
  - Early Flower: ja
  - Mid Flower: ja

## Vergleich der 4 Condition-Assets mit Mid-Flower-Healthy

- Gemeinsame Grundprobleme:
  - Silhouetten und Bud-Verteilung sind nicht baseline-streng genug abgeleitet
  - Anchor-/Canvas-Konsistenz ist nicht verlässlich
  - Conditions lesen zwar unterschiedlich, aber nicht wie dieselbe Pflanze mit anderem Zustand

### `underwatered_medium`

- Unterscheidung zu Healthy: sichtbar
- Unterscheidung zu Overwatered: sichtbar
- Problem: zu viel Vergilbung, zu wenig reine Trockenheitslogik

### `overwatered_medium`

- Unterscheidung zu Underwatered: klar
- Problem: zu dunkel und zu stark haengend fuer medium; wirkt wie schwerere Severity

### `heat_stress_medium`

- Unterscheidung zu Wasserstress: vorhanden
- Problem: Taco-Topzone ist gut, aber die Gesamtpflanze ist nicht eng genug an Healthy gekoppelt

### `nutrient_burn_medium`

- Lesbarkeit als Spitzen-/Randverbrennung: gut
- Problem: Gesamtzustand wirkt zu weit fortgeschritten und zu unabhaengig von Healthy

## Entscheidungsmatrix

| Asset-Datei | Stage | Condition | QA-Status | Hauptproblem | Empfehlung | Integration erlaubt | Re-Render-Prioritaet |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `stage_02_seedling/healthy_none.png` | seedling | healthy | `needs_review` | zu langer nackter Stamm, Canvas nicht normiert | `v002` kompakter rendern | nein | P2 |
| `stage_03_early_veg/healthy_none.png` | early_veg | healthy | `rerender_required` | zu hochgewachsen, zu nah an Mid Veg | neu rendern | nein | P0 |
| `stage_04_mid_veg/healthy_none.png` | mid_veg | healthy | `needs_review` | Serien-/Canvas-Bruch | mit Serienanchor neu rendern | nein | P1 |
| `stage_05_late_veg/healthy_none.png` | late_veg | healthy | `needs_review` | harter Dichtesprung | Serienuebergang glaetten | nein | P1 |
| `stage_07_stretch/healthy_none.png` | stretch | healthy | `needs_review` | zu starker Bruch zu Late Veg | Morphologie enger an Late Veg binden | nein | P1 |
| `stage_08_early_flower/healthy_none.png` | early_flower | healthy | `needs_review` | Stil-/Canvas-Kontinuitaet unruhig | auf Serienstandard ziehen | nein | P1 |
| `stage_09_mid_flower/healthy_none.png` | mid_flower | healthy | `rerender_required` | Referenzbaseline fuer Conditions nicht stabil genug | Referenzbild neu rendern | nein | P0 |
| `stage_09_mid_flower/underwatered_medium.png` | mid_flower | underwatered | `rerender_required` | zu gelb, zu weit weg von Healthy | Trockenstress ohne Defizienzlook neu rendern | nein | P0 |
| `stage_09_mid_flower/overwatered_medium.png` | mid_flower | overwatered | `rerender_required` | zu dunkel/schwer, Severity zu hoch | medium sauberer neu rendern | nein | P0 |
| `stage_09_mid_flower/heat_stress_medium.png` | mid_flower | heat_stress | `rerender_required` | nicht baseline-treu genug | Taco-Topzone auf Healthy-Morphologie setzen | nein | P0 |
| `stage_09_mid_flower/nutrient_burn_medium.png` | mid_flower | nutrient_burn | `rerender_required` | Burn klar, aber Gesamtpflanze zu weit weg | nur Tip-/Margin-Burn auf Healthy neu rendern | nein | P0 |

## Re-Render-Empfehlungen

- Alle Re-Renders sollen dieselbe Asset-ID behalten.
- Alle problematischen Assets sollten als `v002` im Asset-Lab neu erzeugt werden.
- Wichtigste Reihenfolge:
  1. `cannabis_mid_flower_healthy_v001`
  2. die 4 Mid-Flower-Condition-Assets
  3. `cannabis_early_veg_healthy_v001`
  4. danach die restliche Healthy-Linie fuer Anchor-/Canvas-Normalisierung
- Prompt-Schaerfung fuer alle Re-Renders:
  - feste `2048x2048` Serienleinwand
  - identischer Bottom Anchor
  - identische Kameradistanz
  - Condition-Assets strikt als Ableitung derselben Healthy-Pflanze
  - keine zusaetzliche Reife, keine zusaetzliche Bud-Masse, keine neue Silhouette

## Integrationsentscheidung

- In die Simulation uebernehmen: **keine Assets in dieser Phase**
- Vorher neu rendern: `early_veg`, `mid_flower healthy`, alle 4 Mid-Flower-Conditions
- Nur im Asset-Lab behalten: die komplette aktuelle Start-Charge, bis die Referenzbaseline und Serienkonsistenz stabil sind
- Ist die Mid-Flower-Baseline gut genug als Referenz fuer spaetere Conditions: **nein**

## Naechste empfohlene Phase

Gezielter Re-Render-Pass `v002` fuer `mid_flower healthy` plus die 4 Mid-Flower-Condition-Assets, danach ein zweiter kurzer Serien-QA-Pass vor jeder Integrationsentscheidung.
