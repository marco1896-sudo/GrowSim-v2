# i18n Rules

User-facing text must follow the existing i18n pattern.

Do not hardcode new visible UI text unless the existing project explicitly does so in that area.

Before changing UI text:

* find the existing translation structure
* add keys consistently
* preserve fallback behavior
* keep Buddy text warm, short, and context-aware

Avoid:

* duplicate translation keys
* inconsistent tone between languages
* untranslated new buttons, labels, rewards, errors, or notifications

Test relevant changes by checking all supported languages or documenting which languages were not checked.
