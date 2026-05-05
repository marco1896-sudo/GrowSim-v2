# Backend and Admin Rules

Backend and admin behavior affect authority, security, and trust.

Do not add or change backend/admin flows without explicit concept approval unless it is a narrow bugfix.

Before backend/admin changes:

* identify the source of truth
* identify permission boundaries
* avoid collecting unnecessary personal data
* avoid exposing secrets, tokens, admin credentials, or private user data
* define failure behavior

Admin tools should be:

* minimal
* auditable where relevant
* protected by existing auth/role patterns
* separated from normal player flows

Never move game authority from one system to another without approval.
