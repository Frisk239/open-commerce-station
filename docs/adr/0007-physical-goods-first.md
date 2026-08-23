# Physical goods first

The Independent Station sells shippable products first. Digital downloads wait. Checkout collects an address and a Shipping Rate the Merchant configured. After payment, Fulfillment is: mark shipped and paste a tracking number. Carrier APIs (快递100 电子面单, EasyPost, Shopify Shipping labels) are later.

**Status:** accepted

**Considered Options:** digital-only; physical and digital in the first product; physical first with manual tracking

**Consequences:** `chanpin/` checkout must include address + shipping choice. Portal orders must include fulfill + tracking. Do not prototype a download vault or a carrier console in the first pass.
