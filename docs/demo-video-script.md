# BoundPay — 2:50 demo script

Use **live integrations** for the final recording. Confirm an eligible, evidence-backed merchant quote beforehand. Use a separate Sandbox buyer. Hide secrets and login credentials. Aim for 2:50 so the video stays below the official three-minute limit. This file is a script, not a produced video.

| Time      | Screen                                                    | Narration                                                                                                                                                                        |
| --------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:12 | Landing and authority diagram                             | “AI can research a purchase. But giving an AI purchasing power raises a different question: who controls what it's allowed to spend?”                                            |
| 0:12–0:22 | Mission workspace                                         | “BoundPay separates intelligence from authority. The AI recommends. Your rules and your approval govern money movement.”                                                         |
| 0:22–0:38 | Prefilled 12-person monitor mission; Extract mandate      | “I need twelve 27-inch USB-C monitors, a $3,000 ceiling, a 4.5 minimum rating, and delivery by Friday. Nothing can be purchased without me.”                                     |
| 0:38–0:52 | Review and confirm explicit mandate                       | “The AI extracts a draft. I confirm the exact budget, quantity and requirements before they become the agent's boundaries.”                                                      |
| 0:52–1:09 | Actual streamed research and trace                        | “The bounded agent plans searches and gathers Channel3 candidates. Its tool calls, limits and actual research results stay visible.”                                             |
| 1:09–1:29 | AG Grid sorting/filtering and rejected candidates         | “Hard eligibility comes before ranking. Unknown evidence fails closed. I can inspect every source and explicitly review a current merchant quote where the catalog lacks facts.” |
| 1:29–1:43 | Recommended basket and Why this drawer                    | “This basket ranks highest among eligible options. Here are the score components, alternatives and evidence—no unexplained AI score.”                                            |
| 1:43–1:57 | Select genuinely over-budget candidate, blocked inspector | “An attractive alternative exceeds the budget. Payment is blocked by the server. The AI can recommend; it cannot override policy.”                                               |
| 1:57–2:13 | Restore compliant basket; Payment mandate                 | “The payment mandate shows merchant, items, final amount, headroom and policy. This fingerprint binds the approval to the complete purchase.”                                    |
| 2:13–2:27 | Explicit review checkbox, approval, create Sandbox order  | “I review and approve this exact purchase. Changing the basket requires a new review. Only now can BoundPay create a PayPal Sandbox order.”                                      |
| 2:27–2:40 | PayPal Sandbox buyer approval; return and capture         | “PayPal handles buyer approval. BoundPay rechecks the signed state and exact order amount before capturing. This is Sandbox settlement to our test merchant.”                    |
| 2:40–2:50 | Actual capture ID and audit, closing brand                | “The audit shows what happened and who authorized it. AI decides what to recommend. Policy decides what's allowed. You decide when money moves. BoundPay.”                       |

## Recording checklist

- Keep actual API waits visible or edit the recording with an obvious cut; do not invent product arrival, API calls or completion.
- Show OpenRouter attribution and Channel3 source links. Local fixture modes are development only.
- If ratings/delivery/stock/landed cost require review, use a real quote and show the **user attestation** provenance.
- Choose an actually over-budget returned product; do not change the client display to simulate a failure.
- Capture a real PayPal Sandbox approval and completed capture. Development screenshot `09-paypal.png` is a local simulation, not sufficient final evidence.
- End on a real order/capture ID and attributed audit. Export the JSON if useful.
- Use original narration, permitted branding and no unlicensed music. Publish the video on YouTube and paste the URL into Devpost.
