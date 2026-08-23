# Plugins

Home for true external adapters such as Alipay, PayPal, Stripe and Notice Mail transports. A seam is introduced only when a production adapter and a deterministic test adapter both exist; this prevents speculative pass-through interfaces.

Adapters depend on shared Core contracts. Provider behavior never leaks into Core or sideways into the other Station application.
