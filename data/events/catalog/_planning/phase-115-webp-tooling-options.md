# Phase 115 - WebP Tooling Options

## Current State
- `magick` not available in local shell
- `cwebp` not available in local shell
- `sharp` not present in `package.json`
- no npm script for event WebP export found
- Python/Pillow-based scripts exist in repo utilities but are not guaranteed as reproducible project dependency for this flow

## Options
1. **sharp-based Node exporter (recommended target)**
- Pros: reproducible in Node/CI, good Windows support, deterministic script behavior
- Cons: requires dependency decision (`package.json` impact), not done in this phase

2. **cwebp external tool**
- Pros: fast and established output quality
- Cons: external install requirement, weaker CI portability unless standardized

3. **ImageMagick (`magick`)**
- Pros: flexible conversion pipeline
- Cons: external install dependency and environment drift risk

4. **Manual external conversion**
- Pros: no repo dependency changes
- Cons: lowest reproducibility, harder audit trail

## Recommendation
Use a **sharp-based exporter** as the preferred long-term path, but decide/install only in a dedicated tooling phase.
