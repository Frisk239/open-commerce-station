# Zero stock cannot be bought

When a buyable combination’s stock is 0, the Shopper cannot add it to the cart or check out. Backorder waits. The owner restocks in the Portal.

**Status:** accepted

**Considered Options:** allow oversell; waitlist; block at zero

**Consequences:** Product page and cart must refuse a 0-stock item. Checkout re-checks stock. `chanpin/` shows sold-out, not a preorder button.
