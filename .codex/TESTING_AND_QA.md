# Testing and QA

After every implementation, Codex must determine **which tests are relevant**.

## Common Test Areas

* runtime tests
* smoke tests
* i18n audit
* build test
* PWA/service worker behavior
* mobile layout checks
* onboarding flow
* save/load migration
* economy ledger
* event system audit
* daily/streak system

## Reporting

Codex must report:

* tests run
* tests passed
* tests failed
* tests not run
* manual checks recommended

If a test fails:

* do not hide it
* explain the likely cause
* suggest the safest next fix
