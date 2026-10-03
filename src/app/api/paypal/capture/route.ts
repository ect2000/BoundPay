import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { audit } from '@/lib/domain';
import { body, errorResponse, AppError } from '@/lib/server/http';
import { CheckoutStateSchema, TokenSchema } from '@/lib/server/contracts';
import { fingerprint, requireActive, sessionId, unseal } from '@/lib/server/state';
import { PayPalSandboxAdapter } from '@/lib/server/paypal';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    const input = await body(
      request,
      z
        .object({
          orderId: z.string().max(100),
          checkoutToken: TokenSchema,
          cancel: z.boolean().optional(),
        })
        .strict(),
    );
    const session = await sessionId();
    const token = (await cookies()).get('bp_checkout')?.value;
    if (!token) throw new AppError('No approved checkout exists in this session.', 403);
    const link = unseal(
      token,
      'checkout-link',
      session,
      z.object({ orderId: z.string(), fingerprint: z.string() }),
    );
    const state = unseal(input.checkoutToken, 'checkout', session, CheckoutStateSchema);
    await requireActive(session, fingerprint(state.mandate, state.basket));
    if (
      input.orderId !== state.orderId ||
      link.orderId !== state.orderId ||
      link.fingerprint !== state.fingerprint
    )
      throw new AppError('Order does not match this checkout.', 403);
    if (input.cancel) {
      (await cookies()).delete('bp_checkout');
      return Response.json({
        order: { id: state.orderId, status: 'CANCELLED', mode: state.mode },
        audit: audit(
          'USER',
          'PAYMENT_CANCELLED',
          'User returned through the PayPal cancellation flow.',
          state.fingerprint,
        ),
      });
    }
    if (state.mode === 'mock')
      throw new AppError('Local simulation cannot report a real completed payment.', 403);
    const order = await new PayPalSandboxAdapter().capture(
      state.orderId,
      state.mandate,
      state.basket,
      state.approval,
    );
    return Response.json({
      order,
      audit: audit(
        'PAYPAL',
        'PAYMENT_CAPTURED',
        `Sandbox capture ${order.captureId} confirmed by PayPal.`,
        state.fingerprint,
      ),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
