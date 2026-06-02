# Phase 123 - Sharp Dependency Decision Gate

## Current State (read-only)
- `sharp` in `package.json`: no
- Existing image/asset dependencies: none for WebP export pipeline
- Existing draft exporter: `dev/event-v2-export-trial-assets-to-webp.draft.js` (dry-run oriented, no real conversion yet)
- Local shell tools from prior phases: `magick`/`cwebp` not available

## Decision Options

### Option 1: Add `sharp` (recommended)
- Windows compatibility: high
- Reproducibility: high
- Codex/CI suitability: high
- Maintainability: high (single Node pipeline)
- `package.json` risk: medium (new dependency, lockfile changes)
- Future build risk: low to medium (native binary install path must stay stable)
- Effort: medium
- Recommendation: preferred

### Option 2: External tools (`cwebp` / ImageMagick)
- Windows compatibility: medium
- Reproducibility: medium to low (machine-level tool variance)
- Codex/CI suitability: medium
- Maintainability: medium to low
- `package.json` risk: low
- Future build risk: medium to high (external tool provisioning burden)
- Effort: medium
- Recommendation: fallback only

### Option 3: Manual WebP conversion outside repo
- Windows compatibility: high
- Reproducibility: low
- Codex/CI suitability: low
- Maintainability: low
- `package.json` risk: none
- Future build risk: high (human process drift)
- Effort: low upfront, high long-term
- Recommendation: not recommended for 22-asset pipeline

### Option 4: Keep PNG and defer WebP
- Windows compatibility: high
- Reproducibility: high
- Codex/CI suitability: high
- Maintainability: medium
- `package.json` risk: none
- Future build risk: medium (deferred performance optimization debt)
- Effort: low
- Recommendation: valid temporary holding pattern only

## Decision Recommendation
Preferred path: **Option 1 (`sharp`)**.

Gate rule:
- no install in Phase 123
- no `package.json` mutation in Phase 123
- proceed only after explicit Marco approval in next phase
