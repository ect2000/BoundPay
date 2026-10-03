# Devpost submission copy

Status note: the following describes the implemented product. Real OpenRouter parsing/planning, Channel3 search/detail and PayPal Sandbox authentication have been verified. Buyer approval and completed Sandbox capture remain pending. Do not submit screenshots of a simulation as real integration evidence.

## Project name

BoundPay

## Tagline

AI procurement that can spend — but only inside your rules.

## Inspiration

An AI can compare monitors in seconds. But who decides what it is allowed to spend? We built BoundPay around a simple separation: the AI recommends, deterministic policy enforces, and a person authorizes money movement. Small teams get purchasing help without giving a model financial authority.

## What it does

Describe a purchasing mission, review the structured spending mandate, and let a bounded agent research candidates. Compare offers in AG Grid, inspect rejected requirements and transparent ranking, and select a basket. Policy Guard checks budget, quantity, currency, features, ratings, delivery, merchants and evidence. A valid basket becomes a payment mandate. Human approval binds to its fingerprint, and only then can the server initiate PayPal Sandbox checkout. An attributed audit explains each decision and payment result.

## How we built it

One Next.js App Router application combines React, TypeScript, Tailwind, Radix, Motion, Zod, React Hook Form, AG Grid Community and Recharts. There is no database or login. Provider adapters stay server-side. Signed, short-lived state holds verified research and purchase proposals; integer minor units make financial calculations deterministic.

## How AI and OpenRouter are used

OpenRouter provides draft intent extraction, bounded next-action planning and concise recommendation explanations. The default is `nvidia/nemotron-3-super-120b-a12b:free`, falling back only to `openrouter/free`. Startup allowlists, current catalog checks and zero maximum provider prices prevent paid routing. Schema-constrained output is validated with Zod. Every financial rule is enforced by code independently of AI text. Local development uses an explicitly labeled deterministic parser rather than pretending to call AI.

## How PayPal is used

PayPal Sandbox is the purchase execution boundary. BoundPay's Orders v2 adapter creates an order only after policy and human approval, validates the Sandbox approval redirect, checks the returned order's fingerprint and exact amount, and captures after real PayPal buyer approval. Stable request IDs support retry safety. Completion requires PayPal's actual completed capture. Sandbox settlement is to our configured test merchant and does not fulfill a retailer order.

## How Agentic Commerce is used

The agent plans and executes product research, evaluates coverage and proposes a purchase. A deterministic authorization layer governs the transition from recommendation to transaction. Human control and cryptographic approval binding make the intelligence/authority boundary visible. This standalone flow uses PayPal Orders v2; it does not claim ACP/UCP or PayPal Agent Ready network integration.

## How AG Grid is used

The comparison workspace makes procurement decisions inspectable: sortable/filterable offers, exact basket totals, feature and rating comparison, pinned policy status, row selection and constraint failure details. Selecting a row recomputes Policy Guard on the server. Rejected offers remain visible so judges can see why they cannot be purchased. Mobile uses compact rows with the same data.

## How Channel3 is used

The official TypeScript SDK calls product search and freshly retrieves details before display and normalizes retailer offers into provider-independent candidates. Unavailable facts stay unknown. A current merchant quote can be explicitly reviewed by the user; its provenance remains labeled as user attestation. Authenticated search and detail retrieval have been verified with real merchant listings; the API key is stored only in server environment variables.

## Challenges we ran into

Free inference must fail safely when rate-limited or incompatible with strict structured output. Product catalogs often omit committed delivery, exact stock quantity and landed costs. We chose explicit missing-evidence rejection and reviewed quotes over invented guarantees. Stateless storage also required short-lived signed snapshots and browser-context invalidation rather than pretending there was a durable authorization database.

## Accomplishments

A complete local workflow genuinely blocks over-budget purchases, keeps injection text outside policy, binds approvals to the complete purchase, and tests PayPal amount/idempotency boundaries. The UI exposes research, reasoning, policy and human authority in one coherent experience. No model receives a payment tool.

## What we learned

The most valuable part of agentic procurement is the boundary between a suggestion and authority. A score is not permission. Missing evidence is a meaningful result. Payment completion belongs to the payment provider, not a loading animation.

## What's next

Complete authenticated live demo evidence, integrate verified merchant quotes and checkout amounts directly, extend to mixed baskets, and add durable authorization revocation and an immutable ledger before considering real-money use.

## Built with

Next.js, React, TypeScript, Tailwind CSS, Radix UI, shadcn-style components, Motion, Lucide, React Hook Form, Zod, OpenRouter free models, PayPal Sandbox Orders v2, Channel3, AG Grid Community, Recharts, Vitest, Playwright, Vercel.

## Public URL

https://boundpay.vercel.app

## Public repository

https://github.com/ect2000/BoundPay

## Video URL

Owner must record and upload the live demo publicly to YouTube. Add the actual URL here; no video URL is fabricated.
