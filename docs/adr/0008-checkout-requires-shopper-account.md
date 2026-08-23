# Checkout requires a Shopper Account

The Storefront is public for browsing. Checkout is not. The Shopper must sign in (or register) before paying. Guest checkout is out. A Shopper Account is login + addresses + orders, not membership points or tiers.

**Status:** accepted

**Considered Options:** guest checkout; login-required checkout; browse and checkout both gated

**Consequences:** `chanpin/` cart-to-pay must hit a login/register step. Do not prototype a pay-as-guest path. Do not dress the account as 会员中心 until membership is a real concept.
