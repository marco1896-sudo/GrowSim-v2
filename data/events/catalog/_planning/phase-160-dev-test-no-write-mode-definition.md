# Phase 160 Dev/Test No-Write Mode Definition

## Modusname
`Event V2 Dev/Test No-Write Mode`

## Zweck
- Event V2 im Event-Center-Kontext intern testbar machen.
- Candidate List -> Detail Flow fuer Dev/Test nutzbar halten.
- Runtime Shadow sichtbar machen.
- Ohne echte Eventausloesung, ohne Resolve, ohne Save, ohne RuntimeWrite.

## Erlaubte Funktionen
- Candidate List anzeigen
- 3 Fixture-Gruppen anzeigen
- 15 Candidate Items anzeigen
- Detailansicht oeffnen
- Back/Close
- Multi-Candidate Preview-Session
- Safety Labels anzeigen

## Verbotene Funktionen
- Resolve/Apply/Reward/Trigger
- RuntimeWrite
- Save/Storage Writes
- Event-V1-Ersetzung
- Production Default

## Guards
- Dev/Test Guard bleibt verpflichtend
- Runtime Shadow Toggle bleibt dev/test-only
- No-Write-/No-Resolve-Flags bleiben hart erzwungen

## Rollback
- Dev/Test Guard deaktivieren
- Runtime Shadow Toggle deaktivieren
- Dev/Test No-Write Mode unsichtbar
- Event V2 Module bleiben ungenutzt
- Keine Migration notwendig

## Bekannte Watchpoints
- `scoring_watch_vpd_vs_dry_rootball` (nicht blockierend)
- Copy/Label-Technikgrad (P1)

## Abgrenzung zu Production
- Status: `dev_test_soft_activation_ready_with_watch`
- Nicht production-ready
- Keine echten Eventausloesungen, kein Write-Pfad
