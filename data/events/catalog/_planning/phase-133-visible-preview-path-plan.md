# Phase 133 - Visible Preview Path Plan

## Chosen Integration Point
`src/events/v2/preview/EventV2PreviewModel.js` + dev-only report script.

## Why this is lowest risk
- no runtime import into app shell
- no app UI replacement
- no event activation
- leverages existing UI-Lab + shadow infrastructure

## Data Shape per Event
- eventId
- category
- family (indoor/outdoor/shared)
- severity
- cover src/fallback
- assetRefs hero/fallback
- effective preview image path/source
- status + revisionStatus
- file-existence flags
- preview status
