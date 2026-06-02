# Phase 150 - Runtime Shadow Dev/Test Toggle

Implemented a dev-only runtime-shadow toggle path with strict no-write guardrails.

Core additions:
- Runtime shadow toggle guard
- Runtime shadow dev controller
- Dev report script (default + enabled modes)
- Dev browser smoke script for runtime-shadow toggle behavior

Safety remains unchanged: no gameplay activation, no state/save/storage writes, no production default.
