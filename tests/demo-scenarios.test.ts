import { describe, it, expect } from 'vitest';
import { liveDemoMandate, demoMandate, demoProducts } from '../src/lib/demo';
import { MandateSchema, type ProductCandidate } from '../src/lib/domain';
import { evaluatePolicy, rankProducts, authorizeToolCall } from '../src/lib/policy';
import { fingerprint } from '../src/lib/server/state';
import { normalizeChannelProduct } from '../src/lib/server/products';
const raw = {
  id: 'catalog-test',
  title: 'Business monitor',
  category: { slug: 'computer-monitors' },
  offers: [
    {
      domain: 'shop.example',
      url: 'https://shop.example/p',
      price: { price: 149.99, currency: 'USD' },
      availability: 'InStock',
    },
  ],
};
const product = () => normalizeChannelProduct(raw)[0];
describe('two truthful demo mandates', () => {
  it('defaults unspecified scope to verified purchase; unknown evidence is never eligibility', () => {
    const mandate = demoMandate();
    const old: Record<string, unknown> = { ...mandate };
    delete old.executionScope;
    expect(MandateSchema.parse(old).executionScope).toBe('verified_purchase');
    const policy = evaluatePolicy(mandate, { items: [{ product: product(), quantity: 12 }] });
    expect(policy.valid).toBe(false);
    for (const rule of ['MINIMUM_RATING_2', 'DELIVERY_DEADLINE', 'STOCK', 'LANDED_COST'])
      expect(policy.evaluations.find((x) => x.rule === rule)?.status).toBe('NEEDS_EVIDENCE');
    expect(rankProducts([product()], mandate)[0].status).toBe('needs_evidence');
  });
  it('authorizes catalog subtotal only with real category, currency and amount evidence', () => {
    const mandate = liveDemoMandate();
    const p = product();
    const policy = evaluatePolicy(mandate, { items: [{ product: p, quantity: 12 }] });
    expect(policy.valid).toBe(true);
    expect(policy.total).toBe(179988);
    expect(p).toMatchObject({
      stock: null,
      rating: null,
      deliveryDate: null,
      evidence: { landedCostVerified: false },
    });
    expect(policy.evaluations.some((x) => ['STOCK', 'LANDED_COST'].includes(x.rule))).toBe(false);
    expect(policy.evaluations.find((x) => x.rule === 'CATEGORY')?.status).toBe('PASS');
  });
  it.each([{ category: null }, { category: 'laptops' }, { currency: 'EUR' }, { unitPrice: 26000 }])(
    'still blocks catalog scope with mismatch %j',
    (patch) => {
      expect(
        evaluatePolicy(liveDemoMandate(), {
          items: [{ product: { ...product(), ...patch } as ProductCandidate, quantity: 12 }],
        }).valid,
      ).toBe(false);
    },
  );
  it('an explicitly required fact must pass even in catalog scope', () => {
    const mandate = {
      ...liveDemoMandate(),
      hardConstraints: demoMandate().hardConstraints,
      deliveryDeadline: demoMandate().deliveryDeadline,
    };
    expect(evaluatePolicy(mandate, { items: [{ product: product(), quantity: 12 }] }).valid).toBe(
      false,
    );
  });
  it('scope changes invalidate financial approval fingerprint', () => {
    const catalog = liveDemoMandate();
    const basket = { items: [{ product: product(), quantity: 12 }] };
    const fp = fingerprint(catalog, basket);
    const approval = {
      fingerprint: fp,
      reviewed: true as const,
      nonce: crypto.randomUUID(),
      approvedAt: new Date().toISOString(),
    };
    expect(
      authorizeToolCall('createPayPalOrder', {
        mandate: catalog,
        basket,
        fingerprint: fp,
        approval,
      }),
    ).toBe(true);
    const strict = { ...catalog, executionScope: 'verified_purchase' as const };
    expect(fingerprint(strict, basket)).not.toBe(fp);
    expect(
      authorizeToolCall('capturePayment', { mandate: strict, basket, fingerprint: fp, approval }),
    ).toBe(false);
  });
  it('separates a proved over-budget failure from pending evidence', () => {
    const mandate = demoMandate();
    const p = { ...product(), unitPrice: 26000 };
    const row = rankProducts([p], mandate)[0];
    expect(row.status).toBe('rejected');
    expect(row.missingEvidence.length).toBeGreaterThan(0);
    expect(evaluatePolicy(mandate, { items: [{ product: p, quantity: 12 }] }).headroom).toBe(
      -12000,
    );
    expect(demoProducts().find((p) => p.id === 'summit-27')?.unitPrice).toBe(26000);
  });
});
