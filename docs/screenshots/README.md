# Screenshot pack

Captured with Playwright at **1440px** plus **1024px / 390px** responsive checks.

The landing depicts the product's architecture and contains no provider data. Workflow assets 02–11 and the responsive images show **local development**, a deterministic parser, explicitly synthetic product prices and checkout simulation. **12-live-channel3.png** and **13-live-agent-trace.png** were captured from the public production app after real OpenRouter parsing and Channel3 research; it shows genuine merchant listings and missing-evidence policy rejection. They are useful design/setup assets, **not evidence of real AI calls, live products or a real Sandbox capture**. Replace the final judge-facing integration screenshots after [live verification](../credentials.md).

| Asset | Content |
| --- | --- |
| `01-landing.png` | Landing and trust model |
| `02-mission.png` | Prefilled purchasing mission |
| `03-mandate.png` | Editable structured mandate |
| `04-agent-research.png` | Actual pending research request UI, held by the test transport for capture |
| `05-product-grid.png` | AG Grid comparison and policy inspector |
| `06-policy-guard.png` | Deterministic policy results |
| `07-why-this.png` | Scoring, evidence and alternatives |
| `08-payment-mandate.png` | Exact purchase review document |
| `09-paypal.png` | **Local checkout simulation, not PayPal completion** |
| `10-audit-trail.png` | Attributed audit events |
| `11-payment-blocked.png` | Real deterministic over-budget rejection |
| `12-live-channel3.png` | **Real production Channel3 comparison; missing evidence blocks payment** |
| `13-live-agent-trace.png` | **Real production bounded agent trace and actual API-call metrics** |
| `responsive-*-landing.png` | Tablet/mobile landing |
| `responsive-*-workspace.png` | Tablet/mobile comparison |
| `responsive-*-payment.png` | Tablet/mobile review drawer |

Regenerate with `npm run test:e2e`. Application processing has no artificial delays. The test holds one network request only to capture the real pending interface.
