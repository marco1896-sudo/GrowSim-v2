# AGENTS.md

Grow Simulator – Autonomous Development Rules for Codex / OpenClaw

---

## 📌 PROJECT CONTEXT FILES

Before starting any work, read the project context files in:

`.codex/`

Especially:

- `.codex/ARCHITECTURE_MAP.md`
- `.codex/CODEX_MASTER.md`
- `.codex/PRODUCT_VISION.md`
- `.codex/IDEA_WORKFLOW.md`
- `.codex/GAME_DESIGN_RULES.md`
- `.codex/UI_STYLEGUIDE.md`
- `.codex/FEATURE_CONCEPT_TEMPLATE.md`
- `.codex/IMPLEMENTATION_RULES.md`
- `.codex/ASSET_PIPELINE.md`
- `.codex/SAVE_AND_MIGRATION_RULES.md`
- `.codex/I18N_RULES.md`
- `.codex/BACKEND_ADMIN_RULES.md`
- `.codex/MONETIZATION_RULES.md`
- `.codex/PWA_SERVICE_WORKER_RULES.md`
- `.codex/MINIGAME_RULES.md`
- `.codex/TESTING_AND_QA.md`
- `.codex/PROMPT_LIBRARY.md`

These files define the required product vision, idea workflow, UI quality rules, asset rules, implementation rules, and QA behavior.

If there is a conflict between this `AGENTS.md` and a file in `.codex/`, follow the stricter rule.

---

## 🎯 PRIMARY OBJECTIVE

Evolve this project into a realistic, modular, premium-feeling, and expandable plant growth simulation game.

The system must feel:

- logical
- biologically plausible
- consistent
- progressively deep
- cleanly structured
- premium on mobile
- emotionally supported by Buddy where useful

This is NOT a prototype.

This is a long-term scalable simulation system and product.

---

## ⚙️ CORE WORKING PRINCIPLE

You MUST work in iterative development loops, not feature dumping.

For EVERY approved feature:

1. ANALYZE current system
2. DESIGN the feature
3. PLAN implementation
4. IMPLEMENT carefully
5. TEST logic and gameplay
6. IMPROVE weak points
7. VERIFY stability
8. ONLY THEN move to the next feature

---

## 🧠 IDEA-FIRST WORKFLOW

For any new, rough, creative, gameplay, UI, monetization, asset, or feature idea:

DO NOT implement immediately.

First use the workflow defined in:

`.codex/IDEA_WORKFLOW.md`

You must:

1. summarize the idea
2. identify affected systems
3. create 3 possible versions:
   - Safe version
   - Premium version
   - Experimental version
4. compare player value, risk, effort, and technical impact
5. recommend one version
6. create a structured feature concept using `.codex/FEATURE_CONCEPT_TEMPLATE.md` by default
7. stop and wait for explicit approval

Implementation is only allowed after the user clearly says:

- `Freigabe`
- `Build this`
- `Implement this`
- `Setze Variante X um`
- `Jetzt bauen`

Until approval is given, do not edit project files.

Approval must refer to a specific concept or a specific variant.

If approval is unclear, ask one short clarifying question before editing files.

Bugfixes, investigations, reviews, tests, and explicitly requested small maintenance changes may be performed without a feature concept.

Exception: if such work changes gameplay, economy, persistence/save behavior, monetization, assets, service worker behavior, backend authority, or user-facing product direction, Codex must use the Idea-First Workflow and wait for explicit approval.

---

## 🧱 FEATURE SIZING RULE

Each approval may change at most one primary system.

If an idea affects multiple large systems, split it into smaller implementation steps and ask for approval per step.

Examples of primary systems:

- core simulation
- event system
- economy / progression
- UI flow
- assets
- save / migration
- PWA / service worker
- backend / admin
- monetization
- minigames

---

## 🚫 FORBIDDEN BEHAVIOR

You are NOT allowed to:

- implement multiple major systems at once
- implement rough ideas immediately without concept approval
- leave features half-finished
- create placeholder logic and mark it as done
- ignore existing architecture
- duplicate logic instead of extending it
- connect UI without real functionality
- skip testing and refinement
- add complexity without purpose
- jump to the next feature before stabilizing the current one
- silently delete existing behavior
- introduce a second system when an existing one should be extended
- change monetization, economy, storage, service worker, or event authority casually

---

## ✅ DEFINITION OF DONE

A feature is ONLY considered complete when:

- it works technically
- it is logically correct
- it fits the current game stage
- it integrates with existing systems
- it does not create side effects
- it is tested in multiple scenarios
- it is consistent with realism goals
- it is stored correctly, if persistent
- UI reflects real state, if visible
- mobile layout remains stable
- i18n behavior remains intact
- relevant documentation or notes are updated

---

## 🧠 DEVELOPMENT PRIORITY ORDER

This order is the default product roadmap priority, not an absolute blocker.

Later areas such as minigames or monetization may be implemented when explicitly approved.

However, later-area work must never weaken, bypass, or destabilize earlier core systems.

### 1. CORE STABILITY

- state management
- save system
- simulation tick
- event system integrity
- service worker / PWA update safety
- runtime stability

### 2. CORE SIMULATION

- water system
- nutrients
- plant growth stages
- root development
- pot size logic
- basic stress system

### 3. ENVIRONMENT SYSTEM

- temperature
- humidity
- indoor vs outdoor
- simple climate effects
- seasonal logic
- PPFD / light logic where applicable
- VPD logic where applicable

### 4. PLAYER ACTIONS

- watering
- feeding
- repotting
- training
- defoliation
- treatment actions
- care boosts

### 5. PROGRESSION SYSTEM

- player profile
- XP system
- coin system
- level system
- statistics tracking
- achievements
- daily tasks
- streaks

### 6. ADVANCED DEPTH

- complex events
- rare conditions
- strain differences
- quality system
- yield system
- minigames
- reward actions
- monetization hooks

---

## 🌱 REALISM RULES

The simulation must follow realistic logic:

- no advanced events in early stages
- no repot warnings without root pressure
- no deficiencies without cause
- no stress without conditions
- no growth jumps without reason
- no rewards that break the simulation fantasy
- no random plant reactions without explainable cause

Everything must be explainable like in real plant care.

---

## 🔄 EVENT SYSTEM RULES

All events MUST:

- have clear conditions
- depend on plant stage
- depend on environment
- depend on player actions
- avoid early triggering
- avoid contradictions
- respect existing event authority and persistence

Add conditions like:

- minStage
- minDay
- rootMassThreshold
- plantSize
- environmentState
- previous actions
- cooldowns
- contradiction guards
- pressure thresholds

---

## 🎮 GAMEPLAY AND ECONOMY RULES

Gameplay must support long-term retention without feeling cheap.

Preferred reward types:

- coins
- small boosts
- cosmetic unlocks
- temporary care advantages
- Buddy reactions
- knowledge feedback
- progression feedback

Avoid:

- meaningless grinding
- random rewards without explanation
- too many currencies
- intrusive monetization
- rewards that make core simulation irrelevant
- mechanics disconnected from plant care

---

## 🎨 UI AND PREMIUM FEEL RULES

Follow:

`.codex/UI_STYLEGUIDE.md`

The UI must feel:

- mobile-first
- compact
- premium
- readable
- warm
- responsive
- safe-area aware

Avoid:

- oversized cards
- browser-default feeling
- layout overlap
- cluttered popups
- unnecessary visual noise
- untested narrow viewport behavior

Buddy may be used for emotion, guidance, reward, and onboarding, but should not be overused.

---

## 🖼️ ASSET RULES

Follow:

`.codex/ASSET_PIPELINE.md`

Generated or integrated assets must match the existing visual direction.

Buddy must remain recognizable and consistent.

Plant assets must be clean, centered, uncropped, and compatible with the simulation renderer.

Do not integrate generated assets into code without checking naming, scale, purpose, and consistency.

---

## 🧪 TESTING REQUIREMENTS

Every implemented feature must be tested in:

- normal playthrough
- bad conditions
- extreme values
- edge cases
- early game
- late game
- reload / persistence scenarios, if relevant
- mobile layout scenarios, if UI is affected

Relevant test areas include:

- runtime tests
- smoke tests
- i18n audit
- build test
- save/load migration
- event system audit
- economy ledger
- daily/streak system
- PWA/service worker behavior

Report clearly:

- tests run
- tests passed
- tests failed
- tests not run
- manual checks recommended

---

## 🧩 MODULAR DESIGN RULE

All systems must be:

- extendable
- readable
- isolated where possible
- reusable
- non-destructive to existing logic
- consistent with existing patterns

Prefer extending existing systems over creating new parallel systems.

---

## 🧭 APPROVED FEATURE EXECUTION PROTOCOL

When starting an approved feature:

1. Explain current system briefly
2. Define feature logic
3. Identify dependencies
4. Name affected systems
5. Name persistence / save impact
6. Name i18n impact
7. Name relevant test areas
8. Create implementation plan
9. Implement in careful steps
10. Test and simulate
11. Improve weak points
12. Confirm stability

---

## 🧾 DOCUMENTATION RULE

After completing a feature:

- describe what was added
- list changed files
- explain logic briefly
- list tests run
- list tests not run
- list possible improvements
- suggest the next logical step

---

## 🔁 CONTINUOUS IMPROVEMENT LOOP

Always ask:

- Does this feel realistic?
- Does this feel logical?
- Does this improve gameplay?
- Does this integrate cleanly?
- Does this feel premium?
- Does this preserve stability?

If not, refine before continuing.

---

## 🧠 FINAL DIRECTIVE

You are not just writing code.

You are building a coherent simulation system and a scalable mobile game product.

Every decision must support:

- realism
- structure
- scalability
- gameplay depth
- premium user experience
- long-term maintainability

Never rush.

Always refine.

Always think system-first.

Stop after the concept.

Wait for explicit approval.

26. REPORTING FORMAT AFTER IMPLEMENTATION

After completing approved work, report in this format:

## Completed

Short explanation of what was implemented.

## Changed Files

- path/to/file
- path/to/file

## What Changed

- concise point
- concise point
- concise point

## Tests Run

- command or check
- result

## Tests Not Run

- reason

## Risks / Notes

- concise risk or note

## Recommended Manual Checks

- check in browser/mobile
- check reload
- check relevant UI flow

## Next Logical Step

One recommended next step.

Be honest about what was not tested.

Do not claim success without evidence.

27. COMMUNITY-DRIVEN DEVELOPMENT RULE

Grow Simulator is built with community involvement.

When a feature could be useful for Instagram, player feedback, or voting, mention it during the concept phase.

Consider:

Can this become a community poll?
Can Buddy explain this feature?
Can this become a carousel or reel?
Can this feature increase trust in the project?
Can this idea be tested publicly before full implementation?

Do not turn every feature into marketing.

Only suggest it when it fits naturally.

28. SECURITY AND PRIVACY RULES

Do not expose:

secrets
API keys
tokens
private user data
admin credentials
deployment credentials
payment credentials

Do not commit secrets.

If secret handling is needed, use environment variables and document required configuration.

For analytics, admin, backend, or monetization work, avoid collecting unnecessary personal data.

29. PERFORMANCE RULES

The game must remain fast on mobile devices.

Avoid:

heavy DOM updates
unnecessary re-renders
large blocking scripts
uncompressed assets
oversized images
expensive loops in simulation ticks
animation jank
memory leaks

When adding visual effects:

keep them lightweight
test mobile performance mentally or practically
prefer CSS transforms/opacity for animation
avoid layout thrashing
30. FINAL DIRECTIVE

You are building a coherent simulation system and a scalable premium mobile game product.

Every decision must support:

realism
structure
scalability
gameplay depth
Buddy identity
mobile polish
long-term maintainability
player trust

Never rush.

Never feature-dump.

Never implement rough ideas without concept approval.

Always think system-first.

Always protect the existing game.

Always refine before moving on.
