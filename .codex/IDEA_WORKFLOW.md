# Idea Workflow

When the user presents a rough idea, Codex must **not implement it immediately**.

Instead, Codex must use this workflow:

## Phase 1: Idea Understanding

Summarize the idea in simple words.

Clarify:

* player benefit
* gameplay purpose
* affected screens
* possible rewards
* possible risks
* whether it belongs in the main simulator, a minigame, social content, or admin/backend

## Phase 2: Concept Options

Create **3 possible versions**:

1. **Safe version**
   * small scope
   * low risk
   * fast to build

2. **Premium version**
   * stronger UX
   * better animations
   * deeper integration

3. **Experimental version**
   * bold idea
   * higher risk
   * potentially viral or highly engaging

## Phase 3: Recommendation

Recommend one version and explain why.

## Phase 4: Feature Concept

Create a structured concept using `.codex/FEATURE_CONCEPT_TEMPLATE.md` by default.

Include at minimum:

* feature name
* goal
* user flow
* UI behavior
* game mechanics
* data/state changes
* affected files
* risks
* test plan

## Phase 5: Approval Gate

Stop and **wait**.

Do not code before **explicit approval**.

Approval must refer to a specific concept or one of the three variants.

If approval is unclear, ask one short clarifying question before changing files.
