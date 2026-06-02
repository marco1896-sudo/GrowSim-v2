# 39 — Codex Phase 25 Shadow-Bridge Contract Mapping

## 1. UI-Slot-Matrix
| UI-Slot | Pflichtgrad | Quelle | Verhalten bei Fehlen |
|---|---|---|---|
| Hero | recommended | `assets.cover.src` / `assets.cover.fallback` | Fallback-Bild + Diagnostic warning |
| Hero-Alt | recommended | `assets.cover.altKey` -> Locale | Titel oder generischer Alt-Text |
| Titel | required | `title.key` | blocker bei fehlendem Titel |
| Symptom | required | `shortSymptom.key` | Fallback-Text + warning |
| Setup/Mode | required | `triggers.setup.modeIn` | `shared` als Default |
| Stage | recommended | `triggers.stage.min/max` | `S?-S?` |
| Severity | recommended | `severity.level` | `warning` |
| Category | required | `category` | `unknown` + warning |
| Coach Summary | recommended | `coach.summary.key` | ruhiger Coach-Fallback |
| Coach Why | recommended | `coach.why.key` | ruhiger Why-Fallback |
| Decisions | required | `options[]` | blocker bei <2 Optionen |
| Learning Card | optional | `learningCard.ref` + Learning-Doc | Panel ausblendbar |
| Aftermath | recommended | `aftermathProfile.lesson.key` | neutraler Hinweis + warning |

## 2. V2-Datenfeld -> UI-Slot Mapping
- Hero: `assets.cover.src|fallback` -> `uiModel.hero.src`
- Hero Alt: `assets.cover.altKey` -> Locale -> `uiModel.hero.alt`
- Titel: `title.key` -> Locale -> `uiModel.title`
- Symptom: `shortSymptom.key` -> Locale -> `uiModel.symptom`
- Meta: `setup/stage/severity/category` -> `uiModel.setup/stage/severity/category`
- Coach: `coach.summary.key`, `coach.why.key`, `coach.actions[]` -> `uiModel.coach.*`
- Decisions: `options[]` -> `uiModel.decisions[]` (Label/Detail/Quality)
- Learning: `learningCard.ref` + Learning-Card-Doc -> `uiModel.learningCard`
- Aftermath: `aftermathProfile.lesson.key` -> `uiModel.aftermath`

## 3. Required / Recommended / Optional
- Required: `title`, `symptom`, `decisions`, `setup`, `category`
- Recommended: `hero`, `heroAlt`, `stage`, `severity`, `coachSummary`, `coachWhy`, `aftermath`
- Optional: `learningCard`, `coachActions`

## 4. Fallback-Regeln je Slot
- Hero fehlt: Asset-Fallback verwenden (`assets/events/event-stress-recovery.png`)
- Alt fehlt: Titel oder `Event visual fallback`
- Coach fehlt: ruhiger generischer Hinweis
- Decision quality fehlt: `situational`
- Learning fehlt: Panel ausblendbar
- Aftermath fehlt: neutrales Fallback oder ausblendbar (pro UI-Regel)

## 5. Textbudget-Regeln je Slot
- Titel: 36–48
- Symptom: 120–180
- Coach Summary: 120–180
- Coach Why: 180–260
- Decision Label: 18–32
- Decision Detail: 70–120
- Aftermath: 100–160
- Learning-Bullet: 20–90

## 6. Compact-Mode-Regeln je Slot
- Kuerzbar: `symptom`, `coachSummary`, `coachWhy`, `decisionDetail`, `aftermath`
- Nicht kuerzbar: `title`, `decisionLabel`
- 360px Regel: `decisionDetail <= 95` Zeichen

## 7. Asset-Resolver-Regeln
- Dev-Pfadnormalisierung: `assets/...` -> `../assets/...`
- Hero-Prioritaet: `cover.src` -> `cover.fallback` -> globales Placeholder-Asset
- Kein Dateisystem-Schreiben, nur read-only Aufloesung

## 8. Locale-Resolver-Regeln
- Unterstuetzt beide Formen:
  - nested (`events.v2.foo.title` als Objektpfad)
  - flat-key lookup (`"events.v2.foo.title"`)
- Fallback-Kette: aktive Locale -> fallback Locale (`en`) -> Fallback-Text

## 9. Diagnostics-Regeln
- fehlender Titel: `blocker`
- fehlende Decisions (<2): `blocker`
- fehlender Hero: `warning` (Fallback aktiv)
- fehlende LearningCard: `warning` (optional, ausblendbar)
- fehlender Aftermath: `warning`
- zu langer Text: `warning`
- zu kurzer Text: `info`
- fehlende i18n in kritischen Slots: `error` + Fallback

## 10. Watchlist aus Phase 24
- `indoor_dry_rootball`: Symptom/Why
- `indoor_soil_ph_out_of_range`: Why/Aftermath
- `indoor_heat_stress_air`: Why
- `shared_early_pest_signs_mild`: Why/Aftermath

## 11. Risiken vor echter Runtime-Bridge
- Locale-Inhalte sind technisch aufloesbar, aber semantische Qualitaet je Slot muss vor Bridge nochmals manuell geprueft werden.
- Einige Decision-Detail-Texte benoetigen bei echten Runtime-Daten ggf. zusätzliche kuerzere Varianten fuer 360px.
- Learning-Panel-Verhalten braucht finalen Produktentscheid (immer zeigen vs. nur bei Ref).
- Asset-Fallback ist robust, aber echtes Runtime-Asset-Monitoring fehlt noch.
