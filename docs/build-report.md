# BoundPay build report

Verified 3 October 2026. This report separates shipped implementation from the remaining human payment and submission steps.

## Result

The Next.js app implements mission entry, reviewed structured mandates, bounded research, real product comparison, deterministic ranking, Policy Guard, merchant quote attestation, fingerprint-bound approval, Sandbox checkout/capture adapters, an attributed audit and JSON export. The premium responsive workspace and complete local development journey work. Actual OpenRouter parsing/planning and Channel3 discovery have been verified; PayPal Sandbox OAuth authentication succeeds. **Buyer-approved checkout and completed Sandbox capture are pending.** No payment completion is fabricated.

## Public URL and repository

- App: https://boundpay.vercel.app
- MIT source: https://github.com/ect2000/BoundPay

## AI and OpenRouter

Primary: `nvidia/nemotron-3-super-120b-a12b:free`. Fallback: `openrouter/free`. Catalog prompt/completion pricing is zero; inference also specifies zero maximum provider prices. The server allowlist rejects paid or unlisted routes before inference. Strict JSON schema plus Zod validate extraction, plans and explanations. Default retry limit is one, with finite timeouts.

The requested Gemma preference was evaluated. Its available free endpoint returned 404 for the required strict schema parameters. Nemotron successfully parsed the monitor mission in one real call, including quantity 12, total USD 3,000, USB-C, minimum display size/rating, Friday date and mandatory human approval. This is a tested suitability choice; no unsupported strongest-model benchmark claim is made.

## Agent and product data

The agent plans searches, executes Channel3 discovery, suppresses duplicate queries, normalizes/deduplicates offers, applies hard eligibility before ranking, and proposes a uniform basket only if every hard rule passes. Default limits: 10 steps, three searches, 30 retained candidates, 20 canonical products per search. Detail reads are bounded in batches of four within each search timeout, and SDK automatic retries are disabled.

Channel3 uses the official `@channel3/sdk` 4.x and environment-only authentication. Locale is passed through `config`; price and merchant filters constrain discovery. Free detail retrieval refreshes products before display. Failed detail refreshes exclude stale results. Offer prices convert into exact integer cents; missing rating, delivery, stock quantity and landed cost remain unknown.

A real bounded research run completed in about 17 seconds with two AI calls, 17 Channel3 API calls (one search plus 16 fresh detail reads), 30 candidates and 330 policy checks. All 30 were blocked because the catalog did not prove every required fact. The second repeated query was suppressed. No payment mandate was issued. These are observed results of one run, not a latency promise.

The `channel3-api` skill was installed with the requested `npx skills add channel3-ai/skills --skill channel3-api` workflow, globally for Codex. Its SDK and freshness guidance informed the integration.

## Policy Guard and security

Code independently checks integer-cent total/per-unit budgets, exact quantity, currency, product features, rating, deadline, merchants, available quantity and landed cost. Published ranking weights are 30/25/20/15/10; ranking cannot override eligibility. Unknown evidence fails closed. Human-reviewed quotes are labeled as user attestation, never as Channel3 guarantees.

The complete mandate and basket have a deterministic SHA-256 fingerprint. Purpose/session-bound HMAC envelopes prevent client edits and expire. Approval, order creation and capture recompute policy and bind to the current fingerprint. Edit/restart/reject invalidates browser context. No model receives payment tools. Product prose is untrusted data. Keys remain server-side, in ignored local environment files and Vercel secrets, with same-origin mutations, bounded input streams, security headers and Sandbox-only destinations.

This stateless MVP has no global durable authorization revocation, distributed abuse limiter or tamper-proof regulatory audit. These limits are documented; browser audit export is operational evidence.

## PayPal and agentic commerce

The server adapter uses `https://api-m.sandbox.paypal.com`, OAuth, Orders v2 CAPTURE intent, exact line-item amounts, approval redirects, fingerprint `custom_id`, stable creation/capture idempotency IDs, pre-capture order verification and completed-capture amount verification. PayPal credentials authenticate successfully. Actual buyer approval/capture remain unverified.

The agent autonomously researches and proposes; policy and human approval govern the transaction. PayPal Orders v2 is the execution boundary. Toolkit/MCP, ACP/UCP, Braintree Agent Ready and network membership are not claimed. Sandbox settlement goes to the configured test merchant and does not fulfill a Channel3 retailer order or move real money.

## Sponsors and architecture

Real Channel3 discovery and fresh details; AG Grid Community sorting/filtering/pinning and candidate-policy linkage; OpenRouter free inference; implemented PayPal Sandbox Orders v2. AG Studio/Enterprise and paid model routes are not used.

One Next.js 16.3.8 App Router deployment, React 19.3, TypeScript, Tailwind 4, Radix, Motion, Lucide, React Hook Form, Zod, AG Grid, Recharts, Vitest and Playwright. No database or login. MIT source with CI instructions and environment template.

## Validation

- 68 unit/adapter tests passed: money, policy, schema, free routing, signed state, agent bounds, Channel3 SDK request/freshness/failure contracts and PayPal amount/idempotency/completion.
- Three Playwright browser tests passed: complete clearly labeled local journey, real server rejection of an over-budget candidate, review gates, responsive 1440/1024/390 layouts, keyboard dismissal and stale/forged/cross-origin rejection.
- ESLint, TypeScript and optimized production build passed. The [GitHub CI run for the application commit](https://github.com/ect2000/BoundPay/actions/runs/37127290226) also completed successfully on Ubuntu.
- Runtime dependency audit: zero advisories. The development ESLint toolchain retains a transitive `braces` advisory; no incompatible framework downgrade was applied.
- Authenticated live OpenRouter and Channel3 calls passed; Sandbox OAuth passed. These checks are distinct from local fixture browser tests.
- The public browser journey completed with no page errors or horizontal overflow; the payment-review control remained disabled for rejected candidates. Live comparison and agent-trace screenshots are included. Public landing/status return HTTP 200. A production OpenRouter parse returned the real Nemotron model; a production Channel3 research run returned 30 candidates, 17 product API calls, two LLM calls and 330 rule evaluations in 8.48 seconds. Public deployment uses real provider modes; integration status distinguishes configuration from connection testing.

## Demo, Devpost and screenshots

[Demo script](demo-video-script.md): 2:50 from mission, mandate and streamed research through comparison, policy rejection, exact payment mandate, human approval, Sandbox buyer approval/capture and attributed audit. [Devpost copy](devpost-submission.md) contains project name, tagline, inspiration, functionality, architecture, AI, PayPal/agentic commerce, sponsors, challenges, accomplishments, lessons, next steps and public links.

The screenshot pack covers landing, mission, mandate, pending research, grid, policy, rationale, payment mandate, honest local simulation, audit, rejection and responsive layouts. [Asset notes](screenshots/README.md) explicitly identify fixtures/simulation. Local payment screenshots are not final live payment evidence. No produced video or YouTube URL is claimed.

## Credentials, manual steps and blockers

All four API variables are configured locally and in Vercel Production. **No additional API key is missing.** The remaining steps are personal review of a real current merchant quote, human BoundPay approval, personal Sandbox buyer login/approval, completed capture verification, live payment screenshots, recording/public YouTube upload and Devpost submission. Do not share buyer passwords or new API secrets in chat. Rotate credentials previously shared in chat privately, and update local/Vercel variables.

The actual blockers to a fully verified hackathon submission are the human quote/payment approvals and produced video. [Exact activation/verification steps](credentials.md) are provided. Catalog evidence cannot be invented to bypass policy.

## Next improvements with submission value

1. Complete and record the real buyer-approved Sandbox capture and audit.
2. Replace local payment screenshots with that live evidence and upload the 2:50 video.
3. Obtain directly verified merchant quotes with landed cost, committed delivery and quantity to reduce manual attestation.
