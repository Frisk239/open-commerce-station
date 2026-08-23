# Owner picks languages and currencies; software ships zh and en

Do not hardcode UI copy as one language. Software strings are keyed and we ship Chinese and English packs. Merchant content is written per language the owner enables; missing copy falls back to the store’s primary language. Language and currency switch separately. One accounting currency; extra currencies use owner-typed rates in v1. China defaults to Chinese + CNY; Global defaults to English + USD; the owner may add more.

**Status:** accepted

**Considered Options:** hardcode Chinese; ship zh+en only as storefront languages; owner-selected languages with zh+en software packs

**Consequences:** `chanpin/` has a language/currency settings page and a storefront switcher. Product forms have extra translation fields when a second language is on. No live FX API in v1.
