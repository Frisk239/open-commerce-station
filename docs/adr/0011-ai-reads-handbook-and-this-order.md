# AI reads the store handbook and this order, not a giant prompt

AI Support has two inputs. Lasting copy (policies, FAQ, pages) is a Store Handbook the Merchant maintains; the model looks it up instead of stuffing everything into one prompt. The live Shopper and the order they are talking about are injected or fetched for that conversation only, after sign-in. Those are not handbook documents. AI still cannot refund.

**Status:** accepted

**Considered Options:** prompt-only; handbook only; live order only; handbook plus this-order context

**Consequences:** The handbook is the same pages and FAQ the Merchant already writes for the Storefront—not a second document center and not PDF dumps. Chat must know which signed-in Shopper and which order. Do not clone Dify as the product; Chatwoot / RAGFlow / AnythingLLM are study material.
