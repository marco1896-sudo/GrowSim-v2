# Implementation Rules

Before coding:

* inspect relevant files
* identify existing patterns
* preserve current architecture
* avoid unnecessary rewrites
* avoid large refactors unless explicitly requested
* briefly name affected systems
* briefly name persistence / save impact
* briefly name i18n impact
* briefly name relevant test areas

Feature sizing:

* change at most one primary system per approval
* split ideas that affect multiple large systems into smaller approved steps
* do not combine gameplay, economy, persistence, backend, assets, or service worker changes unless explicitly approved as one scoped step

During implementation:

* make minimal, targeted changes
* keep existing behavior intact
* use existing state/storage patterns
* use existing i18n patterns
* use existing UI components/styles where possible
* do not introduce a second system if one already exists

After implementation:

* list changed files
* explain what changed
* explain why it changed
* list tests run
* list tests the user should run manually
* mention remaining risks

Never:

* silently delete existing features
* replace a working system without approval
* add new dependencies without justification
* change monetization/economy logic casually
* modify service worker/cache behavior without explicit reason
