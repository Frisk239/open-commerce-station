# Global Station payment evidence sources

Each provider confirms payment through a different trusted channel, and the adapter seam reflects that. PayPal Orders v2 moves money only when this server calls capture, so the capture response is the authoritative evidence; the browser return merely triggers it, and closing an approved-but-uncaptured order captures rather than voids, because an approved buyer agreed to pay. Stripe Checkout settles independently of this server, so evidence comes from a session retrieved server-side or from the `checkout.session.completed` webhook verified with the account's HMAC signing secret; a return-page read alone is never confirmation. Alipay evidence is the signature-verified notify or an active query. All three must identify the Payment Attempt (custom id, client reference, or out-trade-no), match the amount and currency exactly, and pass through the same once-only confirmation with reservation conversion.

**Status:** accepted

**Considered Options:** trust provider browser returns; webhook-only confirmation; server-capture-only confirmation; per-provider evidence adapters on a shared seam

**Consequences:** `packages/plugins` adapters own provider-specific verification (`capture`, `verifyWebhook`, `verifyNotification`) behind the shared `PaymentProviderAdapter` interface. Application return pages only orchestrate; they never treat arrival as payment. Provider-owned object ids persist on the Payment Attempt (`providerOrderId`) so recovery and reconciliation can always address the provider object.
