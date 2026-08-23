# Store identity is one settings page

Store name, logo, tab icon, footer line, and (China only) filing numbers live on Settings → Store identity. The same values appear on the Storefront header, checkout header, notice mail, and footer. Empty logo falls back to the store name. Empty filing numbers are omitted, never faked. Filing numbers that exist must link to the official query sites.

**Status:** accepted

**Considered Options:** theme-only logo; separate checkout branding; owner pastes footer HTML; one settings page

**Consequences:** `chanpin/` has one Store identity form. Changing name or logo updates header, checkout, and mail together. China footer can show ICP / 公安; Global does not show those fields.
