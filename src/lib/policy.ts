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
  const check = (
    rule: string,
    label: string,
    pass: boolean,
    expected: string,
    observed: string,
    missing = false,
  ) =>
    rows.push({
      rule,
      label,
      status: missing ? 'NEEDS_EVIDENCE' : pass ? 'PASS' : 'FAIL',
      expected,
      observed,
      explanation: missing
        ? `${label} cannot be verified from available evidence.`
        : pass
          ? `${label} matches your confirmed mandate.`
          : `${label} is outside your mandate or lacks verified evidence.`,
    });
  if (m.requiredCategory)
    check(
      'CATEGORY',
      'Product category',
      p.category === m.requiredCategory,
      m.requiredCategory,
      p.category ?? 'Not provided by source',
      p.category === null,
    );
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
        p.displaySize === null ? 'Not provided by source' : `${p.displaySize} inches`,
        p.displaySize === null,
      );
    if (c.type === 'usb_c')
      check(
        `USB_C_${i}`,
        'USB-C',
        p.usbC !== null && p.usbC === c.value,
        c.value ? 'Required' : 'Not required',
        p.usbC === null ? 'Not provided by source' : p.usbC ? 'Included' : 'Missing',
        p.usbC === null,
      );
    if (c.type === 'rating')
      check(
        `MINIMUM_RATING_${i}`,
        'Minimum rating',
        p.rating !== null && p.rating >= Number(c.value),
        `${c.value} / 5`,
        p.rating === null ? 'Not provided by source' : `${p.rating} / 5`,
        p.rating === null,
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
      p.deliveryDate ?? 'No committed date from source',
      p.deliveryDate === null,
    );
  if (m.executionScope === 'sandbox_catalog')
    check(
      'CATALOG_AMOUNT',
      'Sandbox catalog subtotal',
      true,
      'Exact listed price × requested quantity; no retail fulfillment',
      `${money(p.unitPrice, p.currency)} per unit from ${p.merchant}`,
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
  if (m.executionScope === 'verified_purchase')
    check(
      'LANDED_COST',
      'Final cost evidence',
      p.evidence.landedCostVerified,
      'Taxes and shipping included / verified',
      p.evidence.landedCostVerified
        ? 'Verified total quote'
        : 'Retail price only; taxes/shipping unknown',
      !p.evidence.landedCostVerified,
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
    if (m.executionScope === 'verified_purchase')
      evaluations.push({
        rule: 'STOCK',
        label: 'Availability',
        status:
          item.product.stock === null
            ? 'NEEDS_EVIDENCE'
            : item.product.stock >= item.quantity
              ? 'PASS'
              : 'FAIL',
        expected: `${item.quantity} available`,
        observed:
          item.product.stock === null
            ? 'Exact quantity not provided by source'
            : `${item.product.stock} available`,
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
    valid: evaluations.every((e) => e.status === 'PASS' || e.status === 'REQUIRES_APPROVAL'),
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
        status: policy.valid
          ? ('eligible' as const)
          : policy.evaluations.some((r) => r.status === 'FAIL')
            ? ('rejected' as const)
            : ('needs_evidence' as const),
        missingEvidence: policy.evaluations
          .filter((r) => r.status === 'NEEDS_EVIDENCE')
          .map((r) => `${r.label}: ${r.observed}`),
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
        Number(a.status === 'rejected') - Number(b.status === 'rejected') ||
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
