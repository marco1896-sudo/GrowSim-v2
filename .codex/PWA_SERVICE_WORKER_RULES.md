# PWA and Service Worker Rules

PWA and service worker behavior are core stability areas.

Do not modify service worker, cache strategy, manifest behavior, update flow, or offline behavior without explicit reason and approval.

Before PWA changes:

* identify current cache/update strategy
* explain expected player impact
* preserve save data
* avoid trapping users on stale builds
* define rollback behavior

Test relevant changes with:

* first load
* reload
* offline or poor network scenario, if feasible
* update from previous cached version, if feasible

If full PWA testing is not possible, report that clearly.
