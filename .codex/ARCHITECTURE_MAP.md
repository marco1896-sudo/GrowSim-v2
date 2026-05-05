# Architecture Map Rules

This file defines how Codex should approach architecture without inventing a new map.

Before changing code, inspect the existing project structure and identify the current owner files for:

* state management
* simulation tick
* event authority
* save/load behavior
* i18n
* UI components
* assets
* PWA/service worker
* backend/admin, if relevant

Do not create parallel systems when an existing system can be extended.

When architecture is unclear, explain the uncertainty and choose the smallest reversible step.

After implementation, mention which existing systems were touched.
