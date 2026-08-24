# Paid provider evidence outranks local expiry

A Payment Attempt expires, but money already captured cannot. When Alipay evidence with a valid signature, matching merchant, reference, amount, and currency says `paid`, the attempt is confirmed even if `expiresAt` has passed; the Order is created and the reserved stock is permanently decremented. Local expiry can never cancel money. In the other direction, expiry releases stock only through trusted provider evidence: the Shopper return/status/cancel paths and the Portal reconciliation action all query or close the trade at the provider before releasing a reservation, so a late payment is confirmed rather than double-released. A future automatic sweeper must follow the same rule — provider fact first, local state second.

**Status:** accepted

**Considered Options:** reject paid evidence after expiry; confirm paid evidence regardless of expiry; automatic timer-based release without provider query

**Consequences:** `confirmPaymentAttempt` deliberately does not consult `expiresAt`. Reservation release always requires closed provider evidence, never a clock alone. Merchants hold the explicit recovery path (Portal reconciliation) until any scheduled sweeping exists.
