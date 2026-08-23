# Three notice emails; no SMS in v1

First version sends email only: paid, shipped with tracking, new order to the owner. SMS waits (cost). The owner configures the send-from mailbox; this project does not run a mail host. Marketing mail and card-secret delivery mail are not this product.

**Status:** accepted

**Considered Options:** email plus SMS in v1; email-only three letters; no mail

**Consequences:** Checkout and Fulfillment must trigger those three letters. Portal has mailbox settings. `chanpin/` should show the three letters as copy, not a campaign editor.
