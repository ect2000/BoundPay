import {
  BasketSchema,
  MandateSchema,
  type Basket,
  type HumanApproval,
  type PolicyEvaluation,
  type PolicyResult,
  type ProductCandidate,
  type RankedProduct,
  type SpendingMandate,
} from './domain';
import { basketTotal, lineTotal, money } from './money';

function productRules(p: ProductCandidate, m: SpendingMandate): PolicyEvaluation[] {
  const rows: PolicyEvaluation[] = [];
  const check = (rule: string, label: string, pass: boolean, expected: string, observed: string) =>
    rows.push({
      rule,
      label,
      status: pass ? 'PASS' : 'FAIL',
      expected,
      observed,
      explanation: pass
        ? `${label} matches your confirmed mandate.`
        : `${label} is outside your mandate or lacks verified evidence.`,
    });
  check('CURRENCY', 'Currency', p.currency === m.currency, m.currency, p.currency);
  if (m.maxUnit)
    check(
      'ITEM_BUDGET',
      'Per-item budget',
      p.unitPrice <= m.maxUnit,
      money(m.maxUnit, m.currency),
      money(p.unitPrice, p.currency),
    );
  for (const [i, c] of m.hardConstraints.entries()) {
    if (c.type === 'display_size')
      check(
        `DISPLAY_SIZE_${i}`,
        'Display size',
        p.displaySize !== null && p.displaySize >= Number(c.value),
        `At least ${c.value} inches`,
        p.displaySize === null ? 'Unknown' : `${p.displaySize} inches`,
      );
    if (c.type === 'usb_c')
      check(
        `USB_C_${i}`,
        'USB-C',
        p.usbC !== null && p.usbC === c.value,
        c.value ? 'Required' : 'Not required',
        p.usbC === null ? 'Unknown' : p.usbC ? 'Included' : 'Missing',
      );
    if (c.type === 'rating')
      check(
        `MINIMUM_RATING_${i}`,
        'Minimum rating',
        p.rating !== null && p.rating >= Number(c.value),
        `${c.value} / 5`,
        p.rating === null ? 'Unknown' : `${p.rating} / 5`,
      );
    if (c.type === 'feature')
      check(
        `FEATURE_${i}`,
        String(c.value),
        p.features.some((f) => f.toLowerCase() === String(c.value).toLowerCase()),
        String(c.value),
        p.features.join(', ') || 'Unknown',
      );
  }
  if (m.deliveryDeadline)
    check(
      'DELIVERY_DEADLINE',
      'Delivery',
      p.deliveryDate !== null && p.deliveryDate <= m.deliveryDeadline,
      `By ${m.deliveryDeadline}`,
      p.deliveryDate ?? 'Unknown',
    );
  const merchant = p.merchant.trim().toLowerCase();
  check(
    'MERCHANT_POLICY',
    'Merchant policy',
    (!m.merchantPolicy.allow.length ||
      m.merchantPolicy.allow.some((s) => s.trim().toLowerCase() === merchant)) &&
      !m.merchantPolicy.block.some((s) => s.trim().toLowerCase() === merchant),
    m.merchantPolicy.allow.join(', ') || 'Any non-blocked merchant',
    p.merchant,
  );
  check(
    'LANDED_COST',
    'Final cost evidence',
    p.evidence.landedCostVerified,
    'Taxes and shipping included / verified',
    p.evidence.landedCostVerified
      ? 'Verified total quote'
      : 'Retail price only; taxes/shipping unknown',
  );
  return rows;
}
export function evaluatePolicy(mandate: SpendingMandate, basket: Basket): PolicyResult {
  const m = MandateSchema.parse(mandate);
  const b = BasketSchema.parse(basket);
  const total = basketTotal(b);
  const quantity = b.items.reduce((sum, i) => sum + i.quantity, 0);
  const evaluations: PolicyEvaluation[] = [
    {
      rule: 'TOTAL_BUDGET',
      label: 'Total budget',
      status: total <= m.maxTotal ? 'PASS' : 'FAIL',
      expected: money(m.maxTotal, m.currency),
      observed: money(total, m.currency),
      explanation:
        total <= m.maxTotal
          ? 'Basket stays inside the authorized ceiling.'
          : 'Basket exceeds the authorized ceiling. Payment is blocked.',
    },
    {
      rule: 'QUANTITY',
      label: 'Quantity',
      status: quantity === m.quantity ? 'PASS' : 'FAIL',
      expected: `${m.quantity} units`,
      observed: `${quantity} units`,
      explanation:
        quantity === m.quantity
          ? 'Exactly the requested quantity.'
          : 'Quantity differs from the mandate.',
    },
  ];
  for (const item of b.items) {
    evaluations.push(
      ...productRules(item.product, m).map((r) => ({
        ...r,
        explanation: `${item.product.title}: ${r.explanation}`,
      })),
    );
    evaluations.push({
      rule: 'STOCK',
      label: 'Availability',
      status: item.product.stock !== null && item.product.stock >= item.quantity ? 'PASS' : 'FAIL',
      expected: `${item.quantity} available`,
      observed: item.product.stock === null ? 'Unknown' : `${item.product.stock} available`,
      explanation: 'Available quantity must be verified before payment.',
    });
  }
  evaluations.push({
    rule: 'APPROVAL_REQUIRED',
    label: 'Human approval',
    status: 'REQUIRES_APPROVAL',
    expected: 'Explicit review of this fingerprint',
    observed: 'Required before checkout',
    explanation: 'The agent cannot grant spending authority.',
  });
  return {
    valid: evaluations.every((e) => e.status !== 'FAIL'),
    evaluations,
    total,
    headroom: m.maxTotal - total,
  };
}
export function rankProducts(
  products: ProductCandidate[],
  mandate: SpendingMandate,
): RankedProduct[] {
  return products
    .map((product) => {
      const policy = evaluatePolicy(mandate, { items: [{ product, quantity: mandate.quantity }] });
      const scores = {
        value: Math.max(
          0,
          100 - (lineTotal(product.unitPrice, mandate.quantity) / mandate.maxTotal) * 60,
        ),
        quality: ((product.rating ?? 0) / 5) * 100,
        delivery:
          product.deliveryDate && mandate.deliveryDeadline
            ? Math.min(
                100,
                Math.max(
                  0,
                  70 +
                    ((Date.parse(mandate.deliveryDeadline) - Date.parse(product.deliveryDate)) /
                      86400000) *
                      10,
                ),
              )
            : 50,
        preference: mandate.softPreferences.length
          ? (100 *
              mandate.softPreferences.filter((pref) =>
                product.features.some((f) => f.toLowerCase().includes(pref.toLowerCase())),
              ).length) /
            mandate.softPreferences.length
          : 50,
        merchant: mandate.merchantPolicy.allow.length
          ? mandate.merchantPolicy.allow.includes(product.merchant)
            ? 100
            : 0
          : 50,
      };
      return {
        product,
        eligible: policy.valid,
        failures: policy.evaluations
          .filter((r) => r.status === 'FAIL')
          .map((r) => `${r.label}: ${r.observed}`),
        score: Math.round(
          scores.value * 0.3 +
            scores.quality * 0.25 +
            scores.delivery * 0.2 +
            scores.preference * 0.15 +
            scores.merchant * 0.1,
        ),
        scores,
      };
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.score - a.score ||
        a.product.unitPrice - b.product.unitPrice ||
        a.product.id.localeCompare(b.product.id),
    );
}
export function optimizeBasket(ranked: RankedProduct[], mandate: SpendingMandate): Basket | null {
  const first = ranked.find((p) => p.eligible);
  return first ? { items: [{ product: first.product, quantity: mandate.quantity }] } : null;
}
export function authorizeToolCall(
  tool: string,
  state: {
    mandate: SpendingMandate;
    basket?: Basket;
    fingerprint?: string;
    approval?: HumanApproval;
  },
): boolean {
  if (['searchProducts', 'compareProducts', 'buildBasket'].includes(tool)) return true;
  if (
    !['createPayPalOrder', 'capturePayment'].includes(tool) ||
    !state.basket ||
    !state.fingerprint
  )
    return false;
  if (!evaluatePolicy(state.mandate, state.basket).valid) return false;
  return state.approval?.reviewed === true && state.approval.fingerprint === state.fingerprint;
}
