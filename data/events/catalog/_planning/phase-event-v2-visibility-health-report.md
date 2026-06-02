# Event V2 Visibility Health Report

Status: PASS

## Checked Scripts
- combinedVisibleBrowser: passed
- combinedVisibleMobile: passed
- pilotOptionsMatrix: passed
- sharedPilot: passed
- browserReload: passed

## Checked Events
- indoor_dry_rootball
- shared_panic_watering_misread

## Outcome Coverage
- apply_delta: true
- no_delta: true
- guardrail_only: true
- diagnostic_weight_check: true
- diagnostic_rootzone_check: true
- panic_reaction_guardrail: true

## Safety
- reloadIdempotent: true
- noDoubleApply: true
- noUnexpectedStatusMutation: true
- v1ParallelWriteBlocked: true
- noLegacyCopyVisible: true

## Known Non-Critical Noise
- service-worker-register-log
- dev-404-resource-log

## Blockers
- none

## Warnings
- none
