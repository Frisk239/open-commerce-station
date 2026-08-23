# Email and password first; OAuth later

Shopper Account sign-up and login are email plus password in the first version, for both China Station and Global Station. SMS login waits. Google and other OAuth wait for a later version. Password reset goes by Notice Mail.

**Status:** accepted

**Considered Options:** SMS in China v1; Google in Global v1; email and password only

**Consequences:** `chanpin/` login and register are email forms. Checkout redirects there. Do not prototype WeChat or Google buttons in v1.
