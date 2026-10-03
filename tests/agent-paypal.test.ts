import { describe, it, expect, vi, afterEach } from 'vitest';
import { demoMandate, demoProducts } from '../src/lib/demo';
import { research } from '../src/lib/server/agent';
import { DemoProductProvider } from '../src/lib/server/products';
import { MockLLMProvider } from '../src/lib/server/llm';
import { PayPalSandboxAdapter } from '../src/lib/server/paypal';
import { fingerprint } from '../src/lib/server/state';
afterEach(() => vi.unstubAllEnvs());
describe('bounded research', () => {
  it('runs a multi-search loop, deduplicates and emits real events', async () => {
    const events: unknown[] = [];
    const result = await research(demoMandate(), (e) => events.push(e));
    expect(result.candidates).toHaveLength(8);
    expect(result.metrics.toolCalls).toBe(2);
    expect(result.metrics.llmCalls).toBe(0);
    expect(result.steps.length).toBeLessThanOrEqual(10);
    expect(result.basket).not.toBeNull();
    expect(result.policy?.valid).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });
  it('returns a truthful empty state', async () => {
    const products = new DemoProductProvider();
    vi.spyOn(products, 'searchProducts').mockResolvedValue([]);
    const result = await research(demoMandate(), () => {}, {
      llm: new MockLLMProvider(),
      products,
    });
    expect(result.basket).toBeNull();
    expect(result.candidates).toEqual([]);
    expect(result.fingerprint).toBeNull();
  });
  it('propagates tool failure instead of manufacturing candidates', async () => {
    const products = new DemoProductProvider();
    vi.spyOn(products, 'searchProducts').mockRejectedValue(new Error('provider offline'));
    await expect(
      research(demoMandate(), () => {}, { llm: new MockLLMProvider(), products }),
    ).rejects.toThrow('provider offline');
  });
  it('honors the configured search limit', async () => {
    vi.stubEnv('MAX_PRODUCT_SEARCHES', '1');
    const result = await research(demoMandate());
    expect(result.metrics.toolCalls).toBe(1);
  });
  it('fails closed when the step budget is too small', async () => {
    vi.stubEnv('MAX_AGENT_STEPS', '1');
    await expect(research(demoMandate())).rejects.toThrow('step limit');
  });
});
function paymentSetup() {
  const mandate = demoMandate();
  const product = { ...demoProducts()[0], source: 'channel3' as const };
  const basket = { items: [{ product, quantity: 12 }] };
  const fp = fingerprint(mandate, basket);
  const approval = {
    fingerprint: fp,
    reviewed: true as const,
    approvedAt: new Date().toISOString(),
    nonce: crypto.randomUUID(),
  };
  return { mandate, basket, fp, approval };
}
const response = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
describe('PayPal Sandbox adapter', () => {
  it('uses Sandbox only, exact signed amount and repeatable idempotency', async () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'test-id');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'test-secret');
    const { mandate, basket, approval } = paymentSetup();
    const fetcher = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.endsWith('/token')
          ? response({ access_token: 'test-token' })
          : response({
              id: 'ORDER-1',
              status: 'PAYER_ACTION_REQUIRED',
              links: [
                {
                  rel: 'payer-action',
                  href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1',
                },
              ],
            }),
      );
    const adapter = new PayPalSandboxAdapter(fetcher);
    await adapter.create(mandate, basket, approval, 'https://boundpay.example');
    await adapter.create(mandate, basket, approval, 'https://boundpay.example');
    expect(
      fetcher.mock.calls.every(([url]) => url.startsWith('https://api-m.sandbox.paypal.com')),
    ).toBe(true);
    const requests = fetcher.mock.calls.filter(([url]) => url.endsWith('/orders'));
    const bodies = requests.map(([, init]) => JSON.parse(init.body));
    expect(bodies[0].purchase_units[0].amount.value).toBe('2639.40');
    expect(requests[0][1].headers['PayPal-Request-Id']).toBe(
      requests[1][1].headers['PayPal-Request-Id'],
    );
    expect(bodies[0].payment_source.paypal.experience_context.return_url).toBe(
      'https://boundpay.example/mission?checkout=return',
    );
  });
  it('rejects missing approval and fixtures before calling the network', async () => {
    const { mandate, basket, approval } = paymentSetup();
    const fetcher = vi.fn();
    const adapter = new PayPalSandboxAdapter(fetcher);
    await expect(
      adapter.create(mandate, basket, { ...approval, fingerprint: 'wrong' }, 'https://example.com'),
    ).rejects.toThrow();
    await expect(
      adapter.create(
        mandate,
        { items: [{ product: demoProducts()[0], quantity: 12 }] },
        approval,
        'https://example.com',
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('verifies fingerprint, amount and real PayPal approval before capture', async () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'test-id');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'test-secret');
    const { mandate, basket, approval, fp } = paymentSetup();
    const fetcher = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.endsWith('/token')
          ? response({ access_token: 'token' })
          : response({
              id: 'O',
              status: 'APPROVED',
              purchase_units: [{ custom_id: fp, amount: { currency_code: 'USD', value: '1.00' } }],
            }),
      );
    await expect(
      new PayPalSandboxAdapter(fetcher).capture('O', mandate, basket, approval),
    ).rejects.toThrow('does not match');
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('/capture'))).toBe(false);
  });
  it('only reports completion for a completed capture of the approved amount', async () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'test-id');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'test-secret');
    const { mandate, basket, approval, fp } = paymentSetup();
    const unit = { custom_id: fp, amount: { currency_code: 'USD', value: '2639.40' } };
    const fetcher = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.endsWith('/token')
          ? response({ access_token: 'token' })
          : url.endsWith('/capture')
            ? response({
                id: 'O',
                status: 'COMPLETED',
                purchase_units: [
                  {
                    ...unit,
                    payments: { captures: [{ id: 'C', status: 'COMPLETED', amount: unit.amount }] },
                  },
                ],
              })
            : response({ id: 'O', status: 'APPROVED', purchase_units: [unit] }),
      );
    const result = await new PayPalSandboxAdapter(fetcher).capture('O', mandate, basket, approval);
    expect(result).toEqual({ id: 'O', status: 'COMPLETED', captureId: 'C', mode: 'sandbox' });
  });
  it('repeat capture retrieves completion without issuing another capture', async () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'test-id');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'test-secret');
    const { mandate, basket, approval, fp } = paymentSetup();
    const amount = { currency_code: 'USD', value: '2639.40' };
    const fetcher = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.endsWith('/token')
          ? response({ access_token: 'token' })
          : response({
              id: 'O',
              status: 'COMPLETED',
              purchase_units: [
                {
                  custom_id: fp,
                  amount,
                  payments: { captures: [{ id: 'C', status: 'COMPLETED', amount }] },
                },
              ],
            }),
      );
    await new PayPalSandboxAdapter(fetcher).capture('O', mandate, basket, approval);
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('/capture'))).toBe(false);
  });
  it('rejects a live PayPal redirect even if a provider supplies one', async () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'test-id');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'test-secret');
    const { mandate, basket, approval } = paymentSetup();
    const fetcher = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.endsWith('/token')
          ? response({ access_token: 'token' })
          : response({
              id: 'O',
              status: 'CREATED',
              links: [{ rel: 'approve', href: 'https://www.paypal.com/checkoutnow' }],
            }),
      );
    await expect(
      new PayPalSandboxAdapter(fetcher).create(mandate, basket, approval, 'https://example.com'),
    ).rejects.toThrow('valid Sandbox');
  });
});
