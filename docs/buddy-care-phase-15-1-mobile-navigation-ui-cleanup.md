# Buddy Care+ Phase 15.1 – Mobile Navigation & UI Cleanup

## 1. Ursache der mitscrollenden Navigation

`#buddyCareScreen` war zugleich Care+-Screen und vertikaler Scrollcontainer. Die Bottom Navigation lag innerhalb von `.buddy-care-shell` und wurde dort mit `position: sticky` behandelt. Dadurch blieb sie Teil des langen Inhaltsstroms, konnte zwischen Karten erscheinen und benötigte kompensierendes Bottom-Padding in jeder View.

## 2. Neue DOM- und Scrollstruktur

Der Screen besitzt jetzt zwei getrennte Geschwisterbereiche:

```text
buddyCareScreen
├── buddyCareScrollContent
│   └── buddy-care-shell mit genau einer aktiven View
└── buddyCareViewNav
```

Nur `buddyCareScrollContent` scrollt vertikal. Der Screen selbst ist ein begrenzter Flex-Container mit `overflow: hidden`. Die Navigation wird genau einmal gerendert, reserviert ihre eigene Höhe und bleibt beim View-Wechsel bestehen. Der bestehende lokale Scroll-Reset zielt jetzt auf den neuen Scrollbereich.

## 3. Safe Area und erreichbare Inhalte

Die Navigation nutzt `max(10px, env(safe-area-inset-bottom))`. Der Scrollbereich endet oberhalb der Navigation und besitzt eigenes unteres Padding sowie `scroll-padding`. Dadurch bleiben Setup-Felder und der letzte Submit-Button auch auf kurzen Displays erreichbar, ohne globale `html`-/`body`-Overflow-Regeln zu ändern.

## 4. Bereinigte deutsche Copy

Sichtbare Buddy-Care-Fallbacks und deutsche Buddy-Care-Übersetzungen verwenden wieder echte Umlaute und ß, unter anderem „Übersicht“, „für“, „können“, „zurück“, „Blätter“, „Schädlinge“, „Höhe“ und „Wochenrückblick“. Technische Keys, IDs und Dateinamen blieben unverändert.

Die Risiko-Gesamttexte in DE, EN und ES beginnen nicht länger erneut mit „Buddy sagt / Buddy says / Buddy dice“, wenn der umgebende Block diese Überschrift bereits zeigt.

## 5. Vereinfachte Empty States

- Heute zeigt ohne Pflanzen nur noch den zentralen Buddy-Hero mit einer Coach-Aussage und dem CTA „Erste Pflanze anlegen“.
- Der alte Dashboard-Platzhalter, die Kennzahlen-Zusammenfassung und eine zweite Empty-State-Karte bleiben in diesem Zustand verborgen.
- Der CTA öffnet direkt die Pflanzenansicht und den bestehenden Setup-Bereich.
- Pflanzenfilter bleiben bei null Pflanzen verborgen und erscheinen ab der ersten Pflanze wieder.
- Das Pflanzen-Setup öffnet bei null Pflanzen erst über den eindeutigen Setup-CTA.

## 6. Buddy-Darstellung

Die leere Heute-Ansicht verwendet genau ein dominantes Empty-Buddy-Asset. Auf Mobile stehen Buddy und Coach-Text kompakt zusammen. Sekundäre Empty-State-Buddys sind kleiner begrenzt; das zusätzliche Pflanzenbild im mobilen Heute-Hero wird ausgeblendet, damit Buddy und Priorität den Fokus behalten.

## 7. Getestete Viewports

Der vollständige Care+-Browserflow wurde bei folgenden Größen geprüft:

- 320 × 568
- 375 × 667
- 390 × 844
- 430 × 932

Geprüft wurden Navigation außerhalb des Scrollbereichs, kein horizontaler Overflow, genau eine aktive View, erreichbares Pflanzen-Setup, View-Wechsel, Daily Check, Tagebuch, Pflanzendetail und Reload/Persistenz.

## 8. Tests

Ergänzt wurde `test/buddy-care-mobile-ui-cleanup.test.js`. Bestehende Navigation-, Shell- und E2E-Tests wurden auf die getrennte Scroll-/Navigationsstruktur, die neue Zähler-Copy und korrekte Umlaute aktualisiert.

Bestanden sind:

- alle geforderten `node --check`-Prüfungen
- `node scripts/i18n-audit.js` ohne fehlende oder zusätzliche Locale-Keys
- State-, UI-Shell-, Navigation-, View-Architektur- und Mobile-Cleanup-Tests
- Phase-, Task-, Daily-Check-, Wizard-, Tagebuch-, Risiko- und Trendtests
- Paywall-, Aktivierungs-, Monetarisierungs-, External-Test- und Product-Hardening-Tests
- `buddy-care-e2e-smoke.test.js` bei 320 × 568, 375 × 667, 390 × 844 und 430 × 932
- `ui-runtime-wiring.test.js`
- `ui-onboarding-settings-smoke.test.js`

Der zusätzliche generische Browserlauf zeigte ausschließlich die bekannte lokale CORS-Abweisung des externen Save-Endpunkts. Dieser Remote-Zugriff gehört nicht zur Care+-Navigationsänderung; der vollständige lokale Care+-E2E-Flow bestand.

## 9. Verbleibende visuelle Risiken

- Transparente Buddy-PNGs besitzen unterschiedlich große interne Ränder; die CSS-Größen sind vereinheitlicht, einzelne Assets können optisch dennoch leicht verschieden wirken.
- Mobile Browser-Toolbars und reale Bildschirmtastaturen unterscheiden sich je Gerät. Die Struktur ist dafür ausgelegt, ein kurzer manueller Check in Safari/PWA-Standalone bleibt vor einem externen Test sinnvoll.
- Globale Simulator-Toasts können kurzfristig über dem unteren App-Bereich erscheinen; ihre globale Positionierung wurde in dieser begrenzten Care+-Phase nicht verändert.
