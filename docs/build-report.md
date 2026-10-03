# BoundPay final demo build report

Verified 3 October 2026. Public app: https://boundpay.vercel.app · MIT source: https://github.com/ect2000/BoundPay

## Result

**A real buyer-approved PayPal Sandbox capture is completed.** Both deliberate demos are implemented, with explicit authorization scope, missing-evidence status, deterministic ranking, genuine budget blocking, fingerprint-bound human approval, actual PayPal execution and attributed audit. No database, authentication, unrelated integrations, new LLM provider or architecture rewrite was added.

## Exact live evidence

| Check                        | Observed evidence                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenRouter                   | Actual Nemotron extraction produced the reviewed Sandbox catalog-subtotal mandate; real planning/explanation calls completed.                                                                              |
| Channel3, Demo A             | Public run: 30 candidates, 3 eligible, 27 rejected, 0 needing evidence, 20 API calls, 3 AI requests, 13.92 seconds. Prices/details refreshed through official SDK 4.x.                                     |
| Compliant basket             | 12 Sharp Multisync Desktop Monitors from catalog source staples.com, USD 245.89 each, **USD 2,950.68**, USD 49.32 headroom.                                                                                |
| Policy Guard                 | Six hard checks passed: budget, quantity, exact category, currency, catalog subtotal and merchant. Human approval remained required.                                                                       |
| Mandate fingerprint          | `5b2eb7e719b0ac17651edf429e044883cd76bf6d9def1ed84321e5e0a42f41a6`                                                                                                                                         |
| Genuine live block           | LG monitor offer from bestbuy.com: 12 × USD 300.13 = **USD 3,601.56**, USD 601.56 over the USD 3,000 ceiling; no payment capability.                                                                       |
| Human approval               | User review recorded at 16:33:51 Europe/Madrid after the first attempt was cancelled.                                                                                                                      |
| PayPal order                 | **`4ER995653J590745D`**, created after approval at 16:33:53.                                                                                                                                               |
| Buyer approval and capture   | User completed Sandbox checkout with another buyer account; app recorded capture at 16:34:44. Adapter requires PayPal `APPROVED` before capture.                                                           |
| Completed capture            | **`8JG393861X927505V`**, `COMPLETED`, **USD 2,950.68**.                                                                                                                                                    |
| Independent API verification | Authenticated capture lookup and Orders v2 GET confirmed the completed order, matching fingerprint, exact currency/amount and exactly one completed capture. Private payer/payee details were excluded.    |
| Audit                        | Actual `USER_APPROVED`, `PAYPAL_ORDER_CREATED` and `PAYMENT_CAPTURED` events displayed with the same fingerprint.                                                                                          |
| Channel3, Demo B             | Public strict-mandate API run: 30 candidates, 21 needing evidence, 9 proved failures, 0 eligible, 17 product API calls, 2 real planning calls, 330 rule checks in 13.064 seconds; no payment token issued. |

[Sanitized PayPal evidence](live-payment-completed.json) · [Strict-mission evidence](live-trust-evidence.json) · [Actual audit UI text](live-audit-ui.txt) · [Screenshot provenance](screenshots/README.md).

The first order, `4J8275956R087763E`, was cancelled by the user after a seller-account checkout error. Its API status remained `PAYER_ACTION_REQUIRED` with no captures. It is not counted as completion. A strict AI-extraction attempt also failed safely during free-provider unavailability; the strict API validation used an explicitly confirmed manual mandate, with real AI planning and Channel3 research. A later public browser run successfully extracted the strict draft; review restored its omitted Friday deadline before confirmation. It then produced 23 candidates needing evidence, seven proved failures and zero eligible, with 17 Channel3 calls, two planning calls and 330 checks in 10.65 seconds. [Actual strict UI evidence](live-trust-ui.txt). No output or payment was simulated in these live checks.

## Why both demos are truthful

Demo A explicitly authorizes only a Sandbox catalog subtotal. Fresh Channel3 category, positive offer price, currency and merchant are available; code proves exact quantity arithmetic and total. This does not assert ratings, stock, shipping, tax, delivery or retail fulfillment. Nine sampled fresh monitor products consistently exposed category, price, currency and merchant. Returned catalogs can change, so every run validates its own evidence.

Demo B keeps the default `verified_purchase` scope, including exact inventory and landed-cost evidence, plus display size, USB-C, rating and deadline. Missing mandatory facts get `NEEDS_EVIDENCE`; actual violations get `FAIL`. Both block authorization. The UI says **EVIDENCE INSUFFICIENT — PAYMENT BLOCKED** and identifies the missing facts. Unknown is never true. Any additionally requested hard requirement remains mandatory even in Sandbox catalog scope. Scope changes invalidate approval through the complete purchase fingerprint.

[Exact requirements and machine-verifiable evidence](demo-scenarios.md).

## UX and authority

The compact diagram shows AI Recommend ✓ / Spend ✕; Policy Guard Validate ✓ / Approve ✕; Human Approve ✓; PayPal Execute ✓. The visible flow is AI recommendation → Policy Guard → Human Approval → PayPal Sandbox.

The genuine local budget test uses a clearly labeled fixture: USD 3,000 authorized, USD 3,120 proposed, USD 120 over, PAYMENT BLOCKED. The same block UI uses actual values for a returned live offer and restores the compliant recommendation. No live price was changed to force USD 3,120.

## Security and execution boundaries

Integer cents, server policy recomputation, session/purpose/expiry-bound HMAC state, current fingerprint context, explicit human review, stable PayPal idempotency IDs, validated Sandbox redirect, pre-capture order checks and exact completed-capture verification remain enforced. Keys stay in ignored environment variables and private Vercel settings. The AI has only research/finish tools. Untrusted product prose grants no permissions.

PayPal Sandbox settlement goes to the configured test merchant; it does not order or deliver Channel3 goods. There is no real-money endpoint. Browser audit is operational evidence, not an immutable regulatory ledger. This stateless MVP has no durable global revocation or distributed abuse limiter.

## Validation

- **74 unit/adapter tests passed**, covering policy, evidence, both scopes, scope-bound approval, exact money, signed state, agent bounds, provider contracts and PayPal amount/idempotency/completion.
- **Four Playwright tests passed**, covering local complete journey, exact USD 3,120 rejection and restore, review gates, responsive layouts, keyboard controls, forged/stale state and same-origin protections.
- **Lint, typecheck and production build passed.** Local tests use clearly labeled fixtures; live provider evidence above is separate.
- Production runs real OpenRouter, Channel3 and PayPal Sandbox. Final deployment `dpl_EsNTFjzgeFdVYL2KcuHJezDcN7X9` is READY and aliased to https://boundpay.vercel.app; `/api/status` returned HTTP 200 with real provider modes. The Channel3 skill is installed, and the official SDK/freshness guidance is used.
- Runtime dependency audit previously reported zero advisories. The development ESLint toolchain retains a transitive braces advisory; no incompatible downgrade was made.

## Submission artifacts

README, Devpost copy, the 2:50 video script, scenario evidence and screenshot notes are updated. The script prioritizes problem → mission → AI mandate → real research → comparison → policy → deliberate block → compliant basket → human approval → real Sandbox completion → audit → authority model. Captured live screenshots show budget block, mandate, approval, compliant policy, agent trace and actual completion/audit. Local simulated payment images remain explicitly labeled.

The remaining submission steps are recording the video, public YouTube upload and entering the actual video URL in Devpost. No produced video or submitted Devpost entry is claimed. No additional API key is missing.
