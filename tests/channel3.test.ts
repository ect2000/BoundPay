import { describe, it, expect, vi, afterEach } from 'vitest';
import { Channel3ProductProvider } from '../src/lib/server/products';
import { demoMandate } from '../src/lib/demo';
import { evaluatePolicy } from '../src/lib/policy';
afterEach(() => vi.unstubAllEnvs());
const listing = (price = 199.99, url = 'https://merchant.com/fresh') => ({
  id: 'live-product',
  title: 'Monitor',
  structured_attributes: { screen_size: ['27 inch'], usb_c: ['yes'] },
  offers: [
    { domain: 'merchant.com', url, price: { price, currency: 'EUR' }, availability: 'InStock' },
  ],
});
describe('Channel3 SDK contract', () => {
  it('uses server auth, locale config, price filters and refreshed details before display', async () => {
    vi.stubEnv('CHANNEL3_API_KEY', 'unit-test-key');
    const fetcher = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      if (String(url).endsWith('/search')) {
        const input = JSON.parse(String(init.body));
        expect(input.config).toMatchObject({
          currency: 'EUR',
          country: 'ES',
          language: 'en',
          mode: 'default',
        });
        expect(input.filters.price.max_price).toBe(250);
        expect(new Headers(init.headers).get('x-api-key')).toBe('unit-test-key');
        return Response.json({ products: [listing(190, 'https://merchant.com/stale')] });
      }
      expect(String(url)).toContain('/products/live-product');
      return Response.json(listing());
    });
    const provider = new Channel3ProductProvider(fetcher);
    const mandate = { ...demoMandate(), currency: 'EUR' as const };
    const products = await provider.searchProducts('27 inch USB-C monitor', mandate);
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      source: 'channel3',
      currency: 'EUR',
      unitPrice: 19999,
      displaySize: 27,
      usbC: true,
      url: 'https://merchant.com/fresh',
    });
    expect(provider.calls).toBe(2);
    expect(evaluatePolicy(mandate, { items: [{ product: products[0], quantity: 12 }] }).valid).toBe(
      false,
    );
  });
  it('excludes failed detail refreshes rather than returning stale search data', async () => {
    vi.stubEnv('CHANNEL3_API_KEY', 'unit-test-key');
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ products: [listing()] }))
      .mockResolvedValue(Response.json({ error: 'unavailable' }, { status: 503 }));
    const provider = new Channel3ProductProvider(fetcher);
    expect(await provider.searchProducts('monitor', demoMandate())).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('reports provider failure without exposing auth or enabling SDK retries', async () => {
    vi.stubEnv('CHANNEL3_API_KEY', 'unit-test-key');
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ error: 'unavailable' }, { status: 429 }));
    await expect(
      new Channel3ProductProvider(fetcher).searchProducts('monitor', demoMandate()),
    ).rejects.toThrow('temporarily unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
