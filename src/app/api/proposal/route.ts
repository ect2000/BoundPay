import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { body, errorResponse, AppError } from '@/lib/server/http';
import { ResearchStateSchema, TokenSchema } from '@/lib/server/contracts';
import { activate, fingerprint, seal, sessionId, unseal } from '@/lib/server/state';
import { evaluatePolicy } from '@/lib/policy';
import { audit } from '@/lib/domain';
import { llmProvider } from '@/lib/server/llm';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    const { token, productId } = await body(
      request,
      z.object({ token: TokenSchema, productId: z.string().max(180) }).strict(),
    );
    const session = await sessionId();
    const state = unseal(token, 'research', session, ResearchStateSchema);
    const product = state.products.find((p) => p.id === productId);
    if (!product) throw new AppError('Product is not in the server-verified research.', 403);
    const basket = { items: [{ product, quantity: state.mandate.quantity }] };
    const policy = evaluatePolicy(state.mandate, basket);
    const fp = fingerprint(state.mandate, basket);
    await activate(session, fp);
    let explanation =
      'Selected candidate checked against the confirmed mandate. Inspect the ranking, evidence and every policy check before approving.';
    if (policy.valid) {
      try {
        explanation = await llmProvider().explainRecommendation(
          state.mandate,
          basket,
          state.products.slice(0, 6),
        );
      } catch {
        explanation +=
          ' The AI explanation is unavailable; the deterministic policy checks remain authoritative.';
      }
    }
    const proposalToken = policy.valid
      ? seal('proposal', session, { mandate: state.mandate, basket, fingerprint: fp, explanation })
      : null;
    return Response.json({
      basket,
      policy,
      fingerprint: fp,
      explanation,
      token: proposalToken,
      paymentMandate: policy.valid
        ? {
            fingerprint: fp,
            amount: policy.total,
            currency: state.mandate.currency,
            missionId: state.mandate.missionId,
            expiresAt: new Date(Date.now() + 900000).toISOString(),
          }
        : null,
      audit: audit(
        'POLICY_ENGINE',
        policy.valid ? 'POLICY_VALIDATED' : 'PAYMENT_BLOCKED',
        policy.valid
          ? 'Purchase is safe to present for human approval.'
          : 'Hard constraints failed. No payment capability issued.',
        fp,
      ),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
