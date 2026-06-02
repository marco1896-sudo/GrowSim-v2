# Phase 134 - Event Center Preview Adapter

## Integration Decision
Safest integration point is an isolated preview adapter under `src/events/v2/preview/`, independent from app runtime wiring.

## Implemented
- `src/events/v2/preview/EventV2EventCenterPreviewAdapter.js`
- Uses `EventV2PreviewModel` output and maps it into Event-Center-card-compatible preview objects.

## Adapter Output Fields
- `id`, `title`, `subtitle`
- `category`, `environment`, `severity`
- `revisionStatus`, `assetStatus`
- `imageSrc`, `imageFallback`
- `sourceCandidate`, `previewReady`
- `tags`, `debug`

## Safety
- No runtime mutation.
- No save reads/writes.
- No event triggering.
- No app shell integration.
