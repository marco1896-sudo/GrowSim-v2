# Save and Migration Rules

Save data is a core stability system.

Do not change save structure casually.

Before changing persistence:

* identify current save format and storage location
* identify whether existing saves need migration
* preserve backward compatibility where possible
* define fallback behavior for missing or old fields

Migration rules:

* migrations must be deterministic
* never delete player progress silently
* initialize new fields with realistic safe defaults
* document any unavoidable reset or incompatibility

Test relevant changes with:

* fresh save
* existing save
* reload after change
* missing-field edge case
