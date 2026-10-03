# Activate and verify live integrations

All four provider variables are configured locally and in Vercel Production. OpenRouter parsing, Channel3 research and PayPal Sandbox OAuth have been verified. No additional API key is currently missing. The remaining payment step requires a personal Sandbox buyer to review and approve the actual order. Do not put keys or buyer passwords in chat. Credentials already shared in chat should be rotated privately, then replaced in these environment variables.

| Required credential               | Official page                                                                            | Environment variable   |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| OpenRouter API key                | [OpenRouter keys](https://openrouter.ai/settings/keys)                                   | `OPENROUTER_API_KEY`   |
| Channel3 participant key          | [Channel3 developers](https://trychannel3.com/developers)                                | `CHANNEL3_API_KEY`     |
| PayPal Sandbox REST app client ID | [PayPal Apps & Credentials](https://developer.paypal.com/dashboard/applications/sandbox) | `PAYPAL_CLIENT_ID`     |
| PayPal Sandbox REST app secret    | Same Sandbox app page                                                                    | `PAYPAL_CLIENT_SECRET` |

Use Channel3 promo **PAYPAL-HACKATHON-2026** from the [official sponsor offer](https://paypalaihackathon.devpost.com/details/channel3). This is a free sponsor resource; do not enable paid overages. Use separate [Sandbox personal buyer and business merchant accounts](https://developer.paypal.com/dashboard/accounts). PayPal credentials must belong to the Sandbox REST app.

## Locally

Copy `.env.example` into `.env.local` (preserve any existing private entries) and enter credentials in your local editor. Set `LLM_MODE=openrouter`, `PRODUCT_PROVIDER=channel3`, `PAYPAL_MODE=sandbox`. Generate `BOUND_PAY_STATE_SECRET` with the command in `.env.example`. Set `APP_URL=http://localhost:3000` and use that exact origin. Restart `npm run dev`.

## Vercel

Open the [BoundPay environment settings](https://vercel.com/3eemiliocastejon-gmailcoms-projects/boundpay/settings/environment-variables), add the four provider variables to **Production** as secrets, and redeploy. Alternatively use `vercel env add NAME production` with the interactive prompt. No need to copy secrets into command arguments.

State signing and default free-model settings have already been added to the created project. Production uses `APP_URL=https://boundpay.vercel.app`. Never enable public mock modes. Free catalog entries can change; if the primary disappears or cannot provide strict structured output, choose another currently verified allowlisted free model and redeploy. The app intentionally refuses an unverified paid route.

## Live verification checklist

1. Open integration status. **Configured** means a key is present, not that the connection was tested.
2. Parse the demo mission. Check that attribution says OpenRouter, every extracted field is right, and unresolved questions are reviewed. Confirm the mandate.
3. Confirm real Channel3 candidates and source URLs. Unknown evidence should reject them. Open a candidate's merchant listing and current quote, personally verify the missing rating/features/delivery/quantity and tax/shipping-inclusive per-unit amount, then record the quote attestation.
4. Confirm the resulting basket and policy pass. Select a genuinely over-budget alternative: no payment proposal token should be issued. Restore the verified basket.
5. Open payment mandate. Leave review unchecked: approval remains disabled. Check and approve. Change the basket: another review must be required.
6. Reapprove and create the real Sandbox order. The redirect must go to `www.sandbox.paypal.com`. Sign in with the **personal Sandbox buyer**, not a real-money account or the merchant.
7. Approve in PayPal. Return to BoundPay and click **Verify approval & capture**. A successful receipt must show a real PayPal capture ID and `COMPLETED`.
8. Check that exact amount/currency in the [Sandbox test account](https://www.sandbox.paypal.com). Export the audit. Exercise cancellation once and retry/error states if practical.
9. Replace development screenshots with the live evidence and record the video. Never show API keys, merchant secrets or buyer login credentials in screenshots/video.

A test payment settles to your Sandbox merchant; it does not procure goods from Channel3 retailers. If there is no eligible verified quote, keep the payment blocked. Do not fabricate evidence to finish a demo.
