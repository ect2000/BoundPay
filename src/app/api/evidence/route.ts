import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { ProductSchema, audit } from '@/lib/domain';
import { body, errorResponse, AppError } from '@/lib/server/http';
import { ResearchStateSchema, TokenSchema } from '@/lib/server/contracts';
import { invalidateActive, seal, sessionId, unseal } from '@/lib/server/state';
import { minorUnits } from '@/lib/money';
import { rankProducts } from '@/lib/policy';
export async function POST(request: NextRequest) {
  try {
    const input = await body(
      request,
      z
        .object({
          token: TokenSchema,
          productId: z.string(),
          unitLandedPrice: z.string(),
          rating: z.number().min(0).max(5),
          displaySize: z.number().positive(),
          usbC: z.boolean(),
          deliveryDate: z.string(),
          stock: z.number().int().nonnegative(),
          quoteUrl: z
            .string()
            .url()
            .refine((u) => u.startsWith('https://')),
          reviewed: z.literal(true),
        })
        .strict(),
    );
    const session = await sessionId();
    const state = unseal(input.token, 'research', session, ResearchStateSchema);
    const product = state.products.find((p) => p.id === input.productId);
    if (!product) throw new AppError('Unknown candidate.', 403);
    const updated = ProductSchema.parse({
      ...product,
      unitPrice: minorUnits(input.unitLandedPrice),
      rating: input.rating,
      displaySize: input.displaySize,
      usbC: input.usbC,
      deliveryDate: input.deliveryDate,
      stock: input.stock,
      evidence: {
        ...product.evidence,
        observedAt: new Date().toISOString(),
        landedCostVerified: true,
        notes: [
          ...product.evidence.notes,
          `USER ATTESTATION: merchant quote checked by the user at ${input.quoteUrl}. Price includes taxes and shipping. Rating, features, quantity and delivery manually reviewed.`,
        ],
      },
    });
    state.products = state.products.map((p) => (p.id === updated.id ? updated : p));
    await invalidateActive();
    return Response.json({
      token: seal('research', session, state),
      candidates: rankProducts(state.products, state.mandate),
      audit: audit(
        'USER',
        'PRODUCT_EVIDENCE_REVIEWED',
        'User explicitly attested merchant quote evidence; this is not a Channel3 guarantee.',
      ),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
