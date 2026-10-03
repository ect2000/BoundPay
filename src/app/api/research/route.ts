import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { MandateSchema } from '@/lib/domain';
import { body, errorResponse } from '@/lib/server/http';
import { research } from '@/lib/server/agent';
import { invalidateActive, seal, sessionId } from '@/lib/server/state';
export const maxDuration = 180;
export async function POST(request: NextRequest) {
  try {
    const { mandate } = await body(
      request,
      z.object({ mandate: MandateSchema, confirmed: z.literal(true) }).strict(),
    );
    await invalidateActive();
    const session = await sessionId();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const send = (value: unknown) => {
          if (!closed) {
            try {
              controller.enqueue(new TextEncoder().encode(`${JSON.stringify(value)}\n`));
            } catch {
              closed = true;
            }
          }
        };
        try {
          const result = await research(mandate, send);
          const token = seal('research', session, {
            mandate,
            products: result.candidates.map((p) => p.product),
          });
          send({ type: 'result', result: { ...result, token } });
        } catch (e) {
          const response = errorResponse(e);
          send({ type: 'error', ...(await response.json()) });
        } finally {
          if (!closed) controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
