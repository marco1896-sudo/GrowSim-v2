# Eventsystem V2 - Real-Browser Visible Debug

## Marcos Befund
Im echten Dev-Browser wirkte das Event Center weiterhin wie V1/Legacy:

- alter Look bzw. alte Event-Bilder
- Legacy-/Cooldown-Anmutung
- kein eindeutig sichtbarer V2-Pilot
- Smokes waren gruen, obwohl die manuelle Browser-Wahrnehmung abwich

## Ursache
Es gab drei Unterschiede zwischen Smoke und echter Nutzung:

1. Der bestehende Reload-Smoke oeffnete das Event Sheet intern ueber `openSheet('event')` statt den sichtbaren Events-Button zu nutzen.
2. Die Build-ID war nach den letzten Dev-Tool-Aenderungen nicht erneut erhoeht. Im echten Browser konnten dadurch alte versionierte Scripts weiterleben.
3. Im aktiven V2-Pilot-Sheet wurde weiterhin der Legacy-History-Slot eingeblendet. Das war kein V1-Write, sah aber visuell wie alter V1-Kontext aus.

## State-/Seed-Befund
Im echten Browser sind die Dev-Helper verfuegbar:

- `__seedEventV2PilotIndoorDryRootball`
- `__resetEventV2Pilot`
- `__getEventV2PilotState`
- `GrowSimEventSystemRuntimeBridge`

Nach Reset und Seed enthaelt `eventV2.openEvents` genau ein `indoor_dry_rootball` OpenEvent.

## Event-Center-Open-Flow-Befund
Der neue Real-Browser-Smoke startet einen Run ueber die sichtbare Onboarding-UI, seedet ueber die Dev-Helper und klickt danach den echten `#eventsActionBtn`.

Damit wird derselbe sichtbare Buttonpfad getestet, den Marco im Browser nutzt.

## Cache-/SW-Befund
Die Build-ID wurde auf `20260527-ev2-real-visible` erhoeht. Dadurch laden `app.js`, `ui.js` und die V2-Dev-Tools mit neuer Query-Version.

Fuer manuelle QA bleibt empfohlen:

- Hard Reload
- bei hartnaeckigem Altzustand Application Storage / Service Worker fuer `127.0.0.1:5173` leeren
- danach mit Dev-Helper neu seeden

## Fix
- `index.html`: Build-ID gebumpt.
- `EventV2PilotSeedDevTools`: nach Seed/Reset wird bei offenem Event-Sheet explizit aktualisiert und ein Dev-Event dispatcht.
- `app.js`: aktiver V2-Pilot rendert keinen Legacy-History-Slot mehr.
- Neuer Real-Browser-Smoke prueft den sichtbaren Buttonpfad.

## Neue Smoke-Assertions
Der neue Smoke prueft:

- Dev-Helper existieren im Browser.
- Seed erzeugt ein OpenEvent.
- echter Events-Button oeffnet das Sheet.
- DOM-Marker sind V2:
  - `data-event-system="v2"`
  - `data-event-authority="v2"`
  - `data-event-id="indoor_dry_rootball"`
- keine Legacy-/Cooldown-Copy sichtbar.
- kein Legacy-Visual sichtbar.
- kein Legacy-History-Slot im aktiven V2-Pfad.
- `stabilize` resolved.
- Reload bleibt idempotent.

## Manuelle Pruefanleitung
1. Dev-App mit `?dev=1&gs_event_v2_dev_preview=unlock` oeffnen.
2. Falls alte UI sichtbar bleibt: Hard Reload.
3. Console:
   - `__resetEventV2Pilot({ clearHistory: true, resetStatus: true })`
   - `__seedEventV2PilotIndoorDryRootball()`
4. Event Center ueber den sichtbaren Events-Button oeffnen.
5. Erwartet: `V2 Pilot aktiv, Bridge-Pfad autoritativ.` und `Indoor dry rootball`.
6. `stabilize` ausloesen und Reload pruefen.
