# Merchant-operable without application code

The Foundation is complete enough that a Merchant deploys it, signs in to the Merchant Portal, sets up pages and configuration, and goes to production without writing application code. Developers may still extend it, but going live must not depend on that. This is a finished Independent Station in source form, not a skeleton framework.

**Status:** accepted

**Considered Options:** developer-first kit that requires code before the first sale; merchant-operable station with optional developer extension

**Consequences:** `chanpin/` prototypes must show a Merchant Portal path to a shoppable Storefront. Feature gaps that block “deploy → configure → sell” are product bugs, not later plugins.
