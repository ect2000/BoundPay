import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { audit } from '@/lib/domain';
import { authorizeToolCall } from '@/lib/policy';
import { body, errorResponse, AppError } from '@/lib/server/http';
import { ApprovedStateSchema, TokenSchema } from '@/lib/server/contracts';
import { fingerprint, requireActive, seal, sessionId, unseal } from '@/lib/server/state';
import { PayPalSandboxAdapter } from '@/lib/server/paypal';
import { config } from '@/lib/server/config';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    const input = await body(request, z.object({ token: TokenSchema }).strict());
    const session = await sessionId();
    const state = unseal(input.token, 'approved', session, ApprovedStateSchema);
    const fp = fingerprint(state.mandate, state.basket);
    await requireActive(session, fp);
    if (!authorizeToolCall('createPayPalOrder', { ...state, fingerprint: fp }))
      throw new AppError('Order creation is not authorized.', 403);
    const c = config();
    const origin = process.env.APP_URL
      ? new URL(process.env.APP_URL).origin
      : request.nextUrl.origin;
    const order =
      c.PAYPAL_MODE === 'mock'
        ? {
            id: `LOCAL-${state.approval.nonce}`,
            status: 'SIMULATED' as const,
            mode: 'mock' as const,
          }
        : await new PayPalSandboxAdapter().create(
            state.mandate,
            state.basket,
            state.approval,
            origin,
          );
    const checkout = seal(
      'checkout',
      session,
      { ...state, orderId: order.id, mode: order.mode },
      600,
    );
    (await cookies()).set(
      'bp_checkout',
      seal('checkout-link', session, { orderId: order.id, fingerprint: fp }, 600),
      { httpOnly: true, secure: !c.local, sameSite: 'lax', path: '/', maxAge: 600 },
    );
    return Response.json({
      order,
      checkoutToken: checkout,
      audit: audit(
        order.mode === 'mock' ? 'USER' : 'PAYPAL',
        order.mode === 'mock' ? 'LOCAL_CHECKOUT_SIMULATED' : 'PAYPAL_ORDER_CREATED',
        order.mode === 'mock'
          ? 'Local checkout simulation. No PayPal API called; no money moved.'
          : 'Real PayPal Sandbox order created for the approved basket.',
        fp,
      ),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
