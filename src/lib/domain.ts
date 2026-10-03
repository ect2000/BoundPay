import { z } from 'zod';

export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP']);
export type Currency = z.infer<typeof CurrencySchema>;
export const ConstraintSchema = z
  .object({
    type: z.enum(['display_size', 'usb_c', 'rating', 'feature']),
    operator: z.enum(['>=', '=']),
    value: z.union([z.number().finite().nonnegative(), z.boolean(), z.string().min(1).max(120)]),
  })
  .strict()
  .superRefine((c, ctx) => {
    const valid =
      c.type === 'usb_c'
        ? typeof c.value === 'boolean' && c.operator === '='
        : c.type === 'feature'
          ? typeof c.value === 'string' && c.operator === '='
          : typeof c.value === 'number' &&
            c.operator === '>=' &&
            (c.type !== 'rating' || c.value <= 5);
    if (!valid)
      ctx.addIssue({
        code: 'custom',
        message: 'Constraint type, operator and value do not agree.',
      });
  });
export type Constraint = z.infer<typeof ConstraintSchema>;
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    'Invalid calendar date',
  );
export const MandateSchema = z
  .object({
    missionId: z.string().uuid(),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(4000),
    category: z.string().min(1).max(100),
    currency: z.preprocess((v) => (typeof v === 'string' ? v.toUpperCase() : v), CurrencySchema),
    quantity: z.number().int().min(1).max(100),
    maxTotal: z.number().int().min(1).max(100_000_000),
    maxUnit: z.number().int().min(1).max(100_000_000).nullable(),
    deliveryDeadline: dateSchema.nullable(),
    hardConstraints: z.array(ConstraintSchema).max(20),
    softPreferences: z.array(z.string().min(1).max(120)).max(10),
    merchantPolicy: z
      .object({
        allow: z.array(z.string().min(1).max(100)).max(20),
        block: z.array(z.string().min(1).max(100)).max(20),
      })
      .strict(),
    approval: z.object({ required: z.literal(true) }).strict(),
  })
  .strict();
export type SpendingMandate = z.infer<typeof MandateSchema>;
export type PurchaseMission = Pick<SpendingMandate, 'missionId' | 'title' | 'description'>;
export const ProductSchema = z
  .object({
    id: z.string().min(1).max(180),
    title: z.string().min(1).max(250),
    merchant: z.string().min(1).max(100),
    url: z
      .string()
      .url()
      .refine((u) => u.startsWith('https://')),
    unitPrice: z.number().int().positive().max(100_000_000),
    currency: CurrencySchema,
    rating: z.number().min(0).max(5).nullable(),
    reviewCount: z.number().int().nonnegative().nullable(),
    deliveryDate: dateSchema.nullable(),
    stock: z.number().int().nonnegative().nullable(),
    displaySize: z.number().positive().nullable(),
    usbC: z.boolean().nullable(),
    features: z.array(z.string().max(120)).max(30),
    image: z.string().url().nullable(),
    source: z.enum(['channel3', 'fixture']),
    evidence: z
      .object({
        observedAt: z.string().datetime(),
        description: z.string().max(2000),
        notes: z.array(z.string().max(300)).max(20),
        landedCostVerified: z.boolean(),
      })
      .strict(),
  })
  .strict();
export type ProductCandidate = z.infer<typeof ProductSchema>;
export type ProductEvidence = ProductCandidate['evidence'];
export const BasketSchema = z
  .object({
    items: z
      .array(
        z.object({ product: ProductSchema, quantity: z.number().int().min(1).max(100) }).strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();
export type Basket = z.infer<typeof BasketSchema>;
export type PolicyEvaluation = {
  rule: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'REQUIRES_APPROVAL';
  expected: string;
  observed: string;
  explanation: string;
};
export type PolicyResult = {
  valid: boolean;
  evaluations: PolicyEvaluation[];
  total: number;
  headroom: number;
};
export type RankedProduct = {
  product: ProductCandidate;
  eligible: boolean;
  failures: string[];
  score: number;
  scores: {
    value: number;
    quality: number;
    delivery: number;
    preference: number;
    merchant: number;
  };
};
export type AgentStep = {
  id: string;
  step: number;
  action: string;
  summary: string;
  durationMs: number;
  timestamp: string;
};
export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: 'USER' | 'AGENT' | 'POLICY_ENGINE' | 'PAYPAL';
  action: string;
  summary: string;
  fingerprint?: string;
  metadata?: Record<string, string | number | boolean>;
};
export type PurchaseProposal = {
  mandate: SpendingMandate;
  basket: Basket;
  policy: PolicyResult;
  fingerprint: string;
  explanation: string;
};
export type PaymentMandate = {
  fingerprint: string;
  amount: number;
  currency: Currency;
  missionId: string;
  expiresAt: string;
};
export type HumanApproval = {
  fingerprint: string;
  approvedAt: string;
  reviewed: true;
  nonce: string;
};
export type PayPalOrder = {
  id: string;
  status:
    | 'CREATED'
    | 'PAYER_ACTION_REQUIRED'
    | 'APPROVED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'FAILED'
    | 'SIMULATED';
  approvalUrl?: string;
  captureId?: string;
  mode: 'sandbox' | 'mock';
};
export type ResearchResult = {
  mandate: SpendingMandate;
  candidates: RankedProduct[];
  basket: Basket | null;
  policy: PolicyResult | null;
  fingerprint: string | null;
  explanation: string;
  steps: AgentStep[];
  audit: AuditEvent[];
  metrics: {
    durationMs: number;
    llmCalls: number;
    toolCalls: number;
    evaluated: number;
    rejected: number;
    eligible: number;
    constraintsChecked: number;
  };
  provider: string;
  token: string;
};
export type IntegrationStatus = {
  llm: {
    mode: string;
    configured: boolean;
    model: string;
    fallback: string;
    cost: '$0';
    status: string;
  };
  products: { mode: string; configured: boolean; status: string };
  paypal: { mode: string; configured: boolean; status: string };
  policy: 'READY';
  local: boolean;
};
export function audit(
  actor: AuditEvent['actor'],
  action: string,
  summary: string,
  fingerprint?: string,
): AuditEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    summary,
    ...(fingerprint ? { fingerprint } : {}),
  };
}
