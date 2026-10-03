# Two truthful BoundPay demos

These missions authorize different actions. Both retain exact budgets, signed state, complete purchase fingerprints, mandatory human approval and Sandbox-only execution. Changing authorization scope changes the fingerprint. Unknown evidence never passes a required rule.

## A: live Sandbox catalog subtotal

Open `/mission?demo=1`. Ask for 12 computer monitors, a USD 3,000 ceiling, exact Channel3 category `computer-monitors`, USD catalog prices and an identified merchant. IPS is only a preference. Explicitly authorize a **PayPal Sandbox catalog-subtotal test**, with no retail order or fulfillment. Review this scope in the extracted mandate.

| Hard requirement           | Evidence and deterministic check                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Computer monitors          | Fresh Channel3 product `category.slug` must equal `computer-monitors`; absent category blocks authorization.                                                      |
| Price                      | Fresh offer `price.price` is parsed into positive integer cents; malformed prices are excluded.                                                                   |
| Currency                   | Offer `price.currency` must equal the mandate's USD.                                                                                                              |
| Identified merchant        | Offer `domain` is required; explicit allow/block lists are enforced. This identifies the catalog source, not the Sandbox payee.                                   |
| Exactly 12 units           | Basket line quantities must sum to the reviewed quantity. This proves basket arithmetic, not merchant inventory.                                                  |
| Subtotal at most USD 3,000 | Integer-cent listed unit price times basket quantity must not exceed 300,000 cents. This scope does not authorize shipping, taxes or a delivered retail purchase. |
| Human approval             | All policy checks must pass; the person reviews the exact fingerprint before order creation.                                                                      |

Experimental checks found category, offer price, currency and merchant on all nine sampled fresh monitor products. Some structured attributes were available, but rating, committed delivery, exact available quantity and a verified tax/shipping-inclusive quote were not. A product title or descriptive claim is never parsed into authoritative evidence. Returned values can change; every run refreshes details and checks its own results.

A live predeployment run produced 30 candidates, 14 eligible and 16 rejected, with a USD 2,363.88 recommendation. The subsequent public production run produced 30 candidates, 3 eligible and 27 rejected. Its recommended Sharp Multisync Desktop Monitor from `staples.com` was USD 245.89 per unit, 12 units, **USD 2,950.68**, leaving USD 49.32. All six hard checks passed. Different search results and prices are observed provider behavior; these figures are evidence of specific runs, not fixed catalog guarantees.

## B: insufficient evidence blocks payment

Open `/mission?demo=trust`. The strict 12-monitor mission requires display size, USB-C, minimum 4.5 rating, a committed delivery deadline, exact inventory and verified final cost. The default `verified_purchase` scope continues to require stock and landed-cost evidence.

Unavailable mandatory facts get `NEEDS_EVIDENCE`; a proved violation gets `FAIL`. Both prevent a signed payment capability and order creation. The inspector names each fact that cannot be verified and displays **EVIDENCE INSUFFICIENT — PAYMENT BLOCKED**. A review action may collect an explicitly labeled human attestation, but neither demo fabricates it.

A public API run with the manually confirmed strict mandate produced 30 candidates: 21 needed evidence, nine had a proved failure, zero were eligible. There were 17 Channel3 calls, two real AI planning calls and 330 rule evaluations in 13.064 seconds. The selected candidate lacked display-size, USB-C, rating, delivery, landed-cost and quantity evidence; the server issued no payment token. [Sanitized run evidence](live-trust-evidence.json). A separate strict AI extraction attempt failed safely when the free provider was unavailable; no provider was switched and no output was invented.

A subsequent public browser run completed real AI extraction. The draft omitted the Friday date, so the mandatory review corrected it to 2026-10-09 before research. The resulting run produced 23 needing evidence, seven proved failures and zero eligible in 10.65 seconds, with 17 Channel3 calls, two AI planning calls and 330 checks. [Actual UI evidence](live-trust-ui.txt). The visible inspector explains all six unavailable facts and disables the payment mandate.

## Deliberate budget violation

The local deterministic test retains the genuine calculation **12 × USD 260 = USD 3,120**, against USD 3,000: USD 120 over the mandate, payment blocked. This price belongs to an explicitly labeled synthetic fixture, not Channel3.

The public run instead selected a real LG monitor offer from `bestbuy.com`, **12 × USD 300.13 = USD 3,601.56**, USD 601.56 over budget. The server withheld the payment capability. The UI states: “AI recommendations cannot override spending policy.” Restore the compliant recommendation before human review and checkout. Never change a live price to force the fixture's USD 3,120 example.

## Payment evidence status

The public USD 2,950.68 mandate has fingerprint `5b2eb7e719b0ac17651edf429e044883cd76bf6d9def1ed84321e5e0a42f41a6`. The first order `4J8275956R087763E` was cancelled after PayPal rejected a seller-account login; it had no captures. The user reviewed the same basket again at 16:33:51 Europe/Madrid, creating **`4ER995653J590745D`**, then approved with another Sandbox buyer and completed capture **`8JG393861X927505V`** at 16:34:44. Authenticated PayPal capture lookup and Orders v2 GET confirmed **COMPLETED**, exactly **USD 2,950.68**, one completed capture and matching fingerprint. The UI recorded `PAYMENT_CAPTURED`. [Sanitized completed-payment evidence](live-payment-completed.json) · [Actual audit](live-audit-ui.txt).
