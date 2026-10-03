# Architecture and integrity boundaries

One server/browser application. No database and no server-memory transaction store. Provider calls never happen in the browser.

## State transitions

| Transition                  | Server authority                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Parse request → draft       | JSON schema + Zod; no signed purchasing capability                                                                                                     |
| User confirms → research    | Strict mandate, always-human-approval invariant; bounded planning/search                                                                               |
| Research → signed results   | Server normalized candidates in a session/purpose-bound HMAC envelope                                                                                  |
| Select candidate → proposal | Product ID must exist in signed research; policy recomputed; no token if any failure                                                                   |
| Proposal → approval         | User explicitly submits `reviewed: true`; fingerprint and active session context checked                                                               |
| Approval → PayPal order     | Policy recomputed, approval fingerprint checked, stable request id, fixtures forbidden in real adapter                                                 |
| PayPal return → capture     | Signed checkout payload + small HttpOnly order-link cookie + active fingerprint; GET order details verifies real approval, custom_id, currency, amount |
| Capture → completed         | Completed capture for exact approved amount required; repeat capture reads existing completed order                                                    |

Tokens carry research/proposal data in the response, not oversized cookies. Cookies contain only session, active fingerprint and the order link. Session storage holds the signed checkout envelope to resume after redirect. A lost browser session cannot fabricate a completed capture.

## Payment destination

Catalog merchants are research sources. The PayPal Sandbox merchant is the owner's configured REST app business test account. Retailer URLs are never interpreted as payee IDs. The UI states this before checkout. There is no fulfillment and no transfer to arbitrary retailers. Production real-money endpoints do not exist.

## Evidence boundary

Price, currency, merchant, category and offer URLs come from freshly retrieved Channel3 data. The default `verified_purchase` scope requires stock and landed-cost evidence, as well as all user requirements. The explicitly reviewed `sandbox_catalog` scope authorizes only an exact Sandbox catalog subtotal; it does not assert inventory or retail fulfillment. Any explicitly requested rating/delivery/product fact must still pass. Missing mandatory facts get `NEEDS_EVIDENCE`; proved violations get `FAIL`. Both withhold the payment capability. Scope is included in the purchase fingerprint; the AI cannot silently switch it without an explicit catalog-test request and mandate review.

A user may add an explicit quote attestation. Its field values are validated, its provenance is visible, and it changes the signed snapshot/fingerprint. BoundPay does not claim to independently verify a user-entered quote. Marketing descriptions cannot set budget, features, shipping guarantees, approval or permissions. [Exact demo requirements and evidence](demo-scenarios.md).

## No-database tradeoffs

Capabilities are signed immutable snapshots. Re-selecting a basket updates the browser's active fingerprint; editing/rejecting/restarting deletes active checkout context. Previously issued snapshots expire. There is no global server-side revocation, durable nonce ledger, distributed rate limiter or synchronized cross-device mission state. Simultaneous competing browser operations must be avoided; UI mutation actions are disabled while an operation runs.

Idempotency is delegated to PayPal's request-id behavior within the same proposal/approval. A deliberately new approval of a newly issued proposal represents a new purchase. This is a hackathon Sandbox architecture, not approval for operating real-money procurement.

The audit trail is generated from actual events and returned provider results. It lives in the browser, can be exported and can be edited by the browser owner. It is not a cryptographically immutable journal. Payment truth comes from the PayPal API, not exported audit text or browser state.

## Timeouts and zero-cost enforcement

Every LLM instance fetches the current catalog before inference. Both configured model entries must exist with zero pricing. Provider maximum prompt/completion prices are zero. Models are allowlisted at startup and each config access. Strict-schema incompatibility is handled with a finite free fallback; the app does not weaken validation or route to a paid model.

The agent exposes only product search or finish to the LLM. It ranks and builds baskets deterministically. Default limits: 10 agent steps, 3 searches, 30 results, 12-second AI attempt, one retry, 10-second tool request. Route maximum durations accommodate these bounds.
