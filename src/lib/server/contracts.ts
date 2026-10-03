import { z } from 'zod';
import { BasketSchema, MandateSchema, ProductSchema } from '../domain';
export const ResearchStateSchema = z
  .object({ mandate: MandateSchema, products: z.array(ProductSchema).max(50) })
  .strict();
export const ProposalStateSchema = z
  .object({
    mandate: MandateSchema,
    basket: BasketSchema,
    fingerprint: z.string().length(64),
    explanation: z.string().max(2000),
  })
  .strict();
export const ApprovalSchema = z
  .object({
    fingerprint: z.string().length(64),
    approvedAt: z.string().datetime(),
    reviewed: z.literal(true),
    nonce: z.string().uuid(),
  })
  .strict();
export const ApprovedStateSchema = ProposalStateSchema.extend({ approval: ApprovalSchema });
export const CheckoutStateSchema = ApprovedStateSchema.extend({
  orderId: z.string(),
  mode: z.enum(['sandbox', 'mock']),
});
export const TokenSchema = z.string().min(1).max(150_000);
