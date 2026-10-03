# BoundPay — 2:50 live demo script

Record actual provider calls and actual Sandbox completion. Hide buyer credentials and account details. This is a recording script, not a produced video. [Scenario definitions and verifiable constraints](demo-scenarios.md).

The observed happy path completed order `4ER995653J590745D` and capture `8JG393861X927505V`, exactly USD 2,950.68, with matching mandate fingerprint. [Authenticated, sanitized confirmation](live-payment-completed.json).

| Time      | Screen                                                         | Narration                                                                                                                                                                         |
| --------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:12 | Landing                                                        | “An AI can research a purchase. But a recommendation should never become permission to spend your budget.”                                                                        |
| 0:12–0:26 | Natural-language Demo A mission                                | “Twelve computer monitors, USD 3,000 maximum. This explicitly authorizes a Sandbox catalog-subtotal test. No retail fulfillment. My approval is always required.”                 |
| 0:26–0:39 | Real OpenRouter extraction; review scope and rules             | “The AI drafts a mandate. I review the exact category, currency, quantity and ceiling. Ratings, stock and delivery are unverified and are not requirements for this test amount.” |
| 0:39–0:55 | Real Channel3 research and trace                               | “The bounded agent searches Channel3 and refreshes product details. Every API call and research limit is visible.”                                                                |
| 0:55–1:10 | Product comparison, ranking and source                         | “Eligibility comes first. Ranking is deterministic. The evidence proves the listed price, source category and merchant; integer-cent math proves the basket amount.”              |
| 1:10–1:23 | Demo B missing-evidence inspector, prepared separate recording | “For a delivered purchase requiring rating, committed delivery, stock and final cost, missing evidence blocks authorization. Unknown is never treated as true.”                   |
| 1:23–1:39 | Demo A real over-budget offer                                  | “This real offer totals USD 3,601.56 against USD 3,000. Payment is blocked. AI recommendations cannot override spending policy.”                                                  |
| 1:39–1:53 | Restore compliant recommendation                               | “We restore the compliant basket: twelve Sharp monitors, USD 2,950.68. Six hard checks pass. The remaining headroom is USD 49.32.”                                                |
| 1:53–2:08 | Payment mandate and human review                               | “The complete mandate and basket have one fingerprint. I review and approve this exact amount. A changed basket needs a new approval.”                                            |
| 2:08–2:30 | Real PayPal Sandbox order, buyer approval, return and capture  | “Only after human approval is a PayPal Sandbox order created. The buyer approves privately. BoundPay rechecks the fingerprint and exact amount before capture.”                   |
| 2:30–2:42 | Actual COMPLETED status, capture ID, audit                     | “Completion comes from PayPal's completed capture. The audit attributes the recommendation, policy, human approval and payment execution.”                                        |
| 2:42–2:50 | Compact authority model                                        | “AI recommends. Policy validates. You approve. PayPal executes. Intelligence with boundaries.”                                                                                    |

## Recording requirements

- The amounts above belong to the observed public run on 3 October 2026. A fresh run can return different prices/products. Narrate the actual values on screen.
- The exact USD 3,120 / USD 120 over-budget example is covered by a genuine local policy calculation on a labeled fixture. Do not present its synthetic price as live Channel3 evidence. The live blocked offer used USD 3,601.56.
- Capture Demo B separately before recording the payment journey; starting another mission invalidates the active checkout context. Use an obvious cut between scenarios.
- Preserve real waits or edit with clear cuts. Never fabricate API results, missing catalog evidence, human approval or payment completion.
- Show the actual order ID, capture ID, currency, amount and audit after successful capture. Until then, keep completion marked pending and do not record a simulated success as real.
- Hide login, Sandbox buyer contact details, passwords, API keys, cookies and signed capability tokens.
- Sandbox settlement goes to the configured test merchant and does not buy or deliver Channel3 products.
- Upload the produced video publicly to YouTube and enter its actual URL in Devpost.
