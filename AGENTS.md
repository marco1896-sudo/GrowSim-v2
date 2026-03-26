# AGENTS.md
Grow Simulator – Autonomous Development Rules for OpenClaw

---

## 🎯 PRIMARY OBJECTIVE

Evolve this project into a **realistic, modular, and expandable plant growth simulation game**.

The system must feel:
- logical
- biologically plausible
- consistent
- progressively deep
- cleanly structured

This is NOT a prototype.  
This is a long-term scalable simulation system.

---

## ⚙️ CORE WORKING PRINCIPLE

You MUST work in **iterative development loops**, not feature dumping.

For EVERY feature:

1. ANALYZE current system
2. DESIGN the feature (logic + structure)
3. PLAN implementation
4. IMPLEMENT carefully (modular)
5. TEST (logic + gameplay)
6. IMPROVE (refine + fix issues)
7. VERIFY stability
8. ONLY THEN move to next feature

---

## 🚫 FORBIDDEN BEHAVIOR

You are NOT allowed to:

- implement multiple major systems at once
- leave features half-finished
- create placeholder logic and mark as done
- ignore existing architecture
- duplicate logic instead of extending it
- connect UI without real functionality
- skip testing and refinement
- add complexity without purpose
- jump to next feature before stabilizing current one

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
- it is stored correctly (if persistent)
- UI reflects real state (if visible)

---

## 🧠 DEVELOPMENT PRIORITY ORDER

Always follow this order:

### 1. CORE STABILITY
- state management
- save system
- simulation tick
- event system integrity

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

### 4. PLAYER ACTIONS
- watering
- feeding
- repotting
- training
- defoliation
- treatment actions

### 5. PROGRESSION SYSTEM
- player profile
- XP system
- level system
- statistics tracking
- achievements

### 6. ADVANCED DEPTH
- complex events
- rare conditions
- strain differences
- quality system
- yield system

---

## 🌱 REALISM RULES

The simulation must follow realistic logic:

- No advanced events in early stages
- No repot warnings without root pressure
- No deficiencies without cause
- No stress without conditions
- Growth must follow believable progression

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

Add conditions like:
- minStage
- minDay
- rootMassThreshold
- plantSize
- environmentState
- previous actions

---

## 🧪 TESTING REQUIREMENTS

Every feature must be tested in:

- normal playthrough
- bad conditions (stress)
- extreme values
- edge cases
- early game
- late game

---

## 🧩 MODULAR DESIGN RULE

All systems must be:

- extendable
- readable
- isolated where possible
- reusable
- non-destructive to existing logic

---

## 🧭 FEATURE EXECUTION PROTOCOL

When starting a feature:

1. Explain current system briefly
2. Define feature logic
3. Identify dependencies
4. Create implementation plan
5. Implement in steps
6. Test and simulate
7. Improve weak points
8. Confirm stability

---

## 🧾 DOCUMENTATION RULE

After completing a feature:

- describe what was added
- list changed files
- explain logic briefly
- list possible improvements
- suggest next logical step

---

## 🔁 CONTINUOUS IMPROVEMENT LOOP

Always ask:

- Does this feel realistic?
- Does this feel logical?
- Does this improve gameplay?
- Does this integrate cleanly?

If not → refine before continuing.

---

## 🧠 FINAL DIRECTIVE

You are not just writing code.

You are building a **coherent simulation system**.

Every decision must support:
- realism
- structure
- scalability
- gameplay depth

Never rush.
Always refine.
Always think system-first.
