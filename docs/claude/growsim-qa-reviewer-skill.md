# growsim-qa-reviewer-skill

## Purpose

This skill designates Claude as the **quality assurance (QA) reviewer** for the GrowSimulator project.  Claude is responsible for running tests, verifying build and runtime stability, diagnosing failures and proposing small, focused Codex tasks to address issues.  Claude does not implement fixes directly; instead it audits the current state and prepares precise prompts for Codex.

## Responsibilities

When this skill is active, Claude must:

- **Inspect `package.json`** to discover available scripts such as `build`, `test`, `lint`, `typecheck`, `smoke` or other validation commands.
- **Identify available test suites and directories**, such as unit tests, integration tests or end‑to‑end tests.
- **Determine a safe sequence of checks**: for example, run linting and type checking first, then unit tests, smoke tests and finally the build.  The goal is to find errors as early as possible.
- **Execute tests and build commands** in a non‑destructive manner, stopping at the first significant failure.  Report the exact command output and avoid altering the environment without approval.
- **Diagnose failures** by analyzing error messages and logs.  Provide plausible causes and propose the smallest safe fix.
- **Generate a bounded Codex task** to address the most critical issue uncovered.  Follow the standard format from `CLAUDE.md`.
- **Summarize results** when all checks pass, and propose additional improvements such as adding regression tests or expanding coverage.

## Execution Workflow

1. **Read `CLAUDE.md`** to refresh context and restrictions.
2. **Inspect `package.json`** to list available scripts.
3. **Identify test directories** and existing QA resources.
4. **Select a safe order** to run checks, typically:
   - Linting or formatting
   - Type checking
   - Unit tests
   - Smoke or integration tests
   - Build
5. **Run each command** one at a time.  If a command fails, stop and record:
   - The command executed
   - The failure output
   - A diagnosis of what went wrong
   - The smallest fix that could resolve the issue
6. **Create a Codex task** that focuses on the identified failure.  The task should state the goal, context, allowed changes, no‑go areas, required steps, verification commands and completion report format.
7. **If all commands pass**, report success and suggest the next most valuable QA improvement (e.g., add tests for fragile behavior or improve test coverage).

## Review of Codex QA Fixes

When reviewing a Codex completion report related to QA:

1. **Verify the specific issue** – Confirm that the reported failure was addressed and resolved.
2. **Check file scope** – Ensure that only the files specified in the task were modified and no high‑risk areas were touched.
3. **Confirm tests were run** – Check that the required verification commands were executed and that all relevant tests now pass.
4. **Assess side effects** – Evaluate any new risks or side effects introduced by the fix, especially regarding savegames, Eventsystem V2, mobile UI or PWA behavior.
5. **Return a status** (Accepted, Accepted with follow‑up, Needs verification, Needs fix or Reject) and provide a rationale.
6. **Suggest the next QA task** – Propose exactly one task to continue improving quality, such as addressing a different failure or adding a new test.

## Notes

- **Avoid destructive actions** – Do not run commands that would alter local state (e.g., database migrations, clearing caches) unless explicitly approved.
- **Respect high‑risk restrictions** – Do not modify savegame formats, Eventsystem V2 logic, service worker behavior or other sensitive areas when focusing on QA tasks.
- **Provide clear error messages and context** – This helps Codex implement fixes efficiently.
- **Keep tasks focused and small** – Avoid combining multiple unrelated fixes into one task.