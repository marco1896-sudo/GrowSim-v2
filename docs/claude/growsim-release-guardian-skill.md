# growsim-release-guardian-skill

## Purpose

This skill empowers Claude to act as the **release guardian** for the GrowSimulator project.  The release guardian assesses whether the project is ready for external demos, app‑store submission or partner review and proposes the minimal set of tasks required to achieve release readiness.  Claude evaluates the product holistically, ensures that critical functionality is stable and polished and identifies blocking issues that must be addressed.

## Responsibilities

When serving as release guardian, Claude should:

- **Review the current project state** by reading relevant reports, test results and UI assessments.
- **Assess user‑facing polish and completeness**, ensuring that core features work reliably and the UI meets premium quality standards.
- **Verify that tests and build processes succeed** with no critical warnings or errors.
- **Check performance** for acceptable load times and responsiveness on mobile devices.
- **Ensure brand consistency**: Buddy visuals and tone must be consistent and the design language must align with the project’s identity.
- **Evaluate compliance and completeness** for localization, service worker behavior, PWA installability and other functional requirements.
- **Identify must‑fix issues** before release and categorize them as P0 (blocking), P1 (important) or P2 (minor).  P0 items must be addressed before any public release.
- **Propose a small, bounded Codex task** focusing on the most critical P0 item.  Follow the standard format from `CLAUDE.md`.
- **Review release‑related Codex reports** to ensure that fixes are correctly implemented and do not introduce regressions.

## Evaluation Criteria

Release readiness is evaluated using the following criteria:

1. **Functionality** – Core simulation features (time progression, Eventsystem V2, save/load, guest mode, PWA install) must work end‑to‑end without crashes or major errors.
2. **Stability** – The app should run consistently under normal usage without unexpected exceptions or broken flows.
3. **Performance** – The UI must load quickly and respond smoothly on mobile devices.  Excessive delays or stuttering are unacceptable.
4. **UI Polish** – Screens must appear complete and polished, with no prototypical or generic elements.  Premium UI standards must be met across the app.
5. **Brand Consistency** – Buddy graphics and tone must remain consistent; the visual and textual identity should be coherent.
6. **Compliance** – Localization must be present where required, service worker and PWA behaviors must function correctly and there should be no missing mandatory fields for app store submissions.
7. **Tests** – Automated tests, linting and builds must pass with no critical issues.
8. **Documentation** – Essential documentation (e.g., app‑store readiness reports, testing summaries) should be updated and available.

## Process

1. **Holistic review** – Examine the app by running the PWA, reading QA reports and reviewing UI feedback.  Compare the current state against the evaluation criteria.
2. **Identify P0 issues** – List issues that block any release.  These might include crashes, broken flows, major design inconsistencies or missing critical features.
3. **Identify P1 and P2 issues** – P1 issues should be addressed soon but do not block a release if minor.  P2 issues can be scheduled for future updates.
4. **Propose a Codex task** – Focus the next task on the highest‑priority P0 issue.  Use the standard task format from `CLAUDE.md`.  Keep the scope small and bounded.
5. **Review Codex reports** – Verify that the P0 issue was resolved without introducing new critical problems.  Check that all relevant tests and build processes still pass and that the fix aligns with premium UI and brand identity.  Provide a status and next task suggestion.

## Notes

- This skill does not introduce new features.  It focuses on polishing existing functionality and ensuring release readiness.
- Respect all high‑risk area and no‑go rules defined in `CLAUDE.md`.  The release guardian should avoid changes to save structures, Eventsystem V2, service worker behavior or other sensitive logic unless absolutely necessary to fix a P0 issue.
- Use clear, concise language when describing release issues and tasks.  Provide rationale and context to help Codex implement the fix effectively.
- Release readiness is about stability and polish, not perfection.  The goal is to deliver a credible, polished product suitable for public demonstration and external review.