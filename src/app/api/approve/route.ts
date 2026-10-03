import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { audit } from '@/lib/domain';
import { evaluatePolicy } from '@/lib/policy';
import { body, errorResponse, AppError } from '@/lib/server/http';
import { ProposalStateSchema, TokenSchema } from '@/lib/server/contracts';
import { fingerprint, requireActive, seal, sessionId, unseal } from '@/lib/server/state';
export async function POST(request: NextRequest) {
  try {
    const input = await body(
      request,
      z.object({ token: TokenSchema, reviewed: z.literal(true) }).strict(),
    );
    const session = await sessionId();
    const state = unseal(input.token, 'proposal', session, ProposalStateSchema);
    const fp = fingerprint(state.mandate, state.basket);
    await requireActive(session, fp);
    if (fp !== state.fingerprint || !evaluatePolicy(state.mandate, state.basket).valid)
      throw new AppError('Purchase is blocked by Policy Guard.', 403);
    const hash = createHash('sha256').update(input.token).digest('hex');
    const nonce = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const approval = {
      fingerprint: fp,
      approvedAt: new Date().toISOString(),
      reviewed: true as const,
      nonce,
    };
    return Response.json({
      token: seal('approved', session, { ...state, approval }, 600),
      approval,
      audit: audit(
        'USER',
        'USER_APPROVED',
        'User reviewed and approved this exact basket fingerprint.',
        fp,
      ),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
