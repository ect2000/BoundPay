import 'server-only';
import { z } from 'zod';
import { Channel3 } from '@channel3/sdk';
import { ProductSchema, type ProductCandidate, type SpendingMandate } from '../domain';
import { minorUnits } from '../money';
import { demoProducts } from '../demo';
import { config } from './config';
import { AppError, boundedJson, timeoutSignal } from './http';
export interface ProductProvider {
  name: string;
  calls?: number;
  searchProducts(query: string, mandate: SpendingMandate): Promise<ProductCandidate[]>;
  getProduct(id: string, mandate: SpendingMandate): Promise<ProductCandidate | null>;
}
export class DemoProductProvider implements ProductProvider {
  name = 'Local fixtures';
  async searchProducts(_query: string, mandate: SpendingMandate) {
    return /monitor/i.test(mandate.category)
      ? demoProducts(mandate.deliveryDeadline ?? undefined).slice(0, config().MAX_PRODUCT_RESULTS)
      : [];
  }
  async getProduct(id: string, mandate: SpendingMandate) {
    return demoProducts(mandate.deliveryDeadline ?? undefined).find((p) => p.id === id) ?? null;
  }
}
const PriceSchema = z.object({
  amount: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string(),
});
const ChannelProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.object({ slug: z.string() }).nullable().optional(),
  description: z.string().nullable().optional(),
  images: z
    .array(z.object({ url: z.string(), cleaned_url: z.string().nullable().optional() }))
    .optional(),
  key_features: z.array(z.string()).nullable().optional(),
  structured_attributes: z.record(z.string(), z.unknown()).optional(),
  offers: z.array(
    z.object({ domain: z.string(), url: z.string(), price: PriceSchema, availability: z.string() }),
  ),
});
export function normalizeChannelProduct(raw: unknown): ProductCandidate[] {
  const p = ChannelProductSchema.parse(raw);
  const attrs = p.structured_attributes ?? {};
  const scalar = (value: unknown) =>
    Array.isArray(value) && value.length === 1 ? value[0] : value;
  const display = String(scalar(attrs.display_size ?? attrs.screen_size) ?? '').match(
    /^(\d+(?:\.\d+)?)\s*(?:inch|in|\")?$/i,
  );
  // Structured feature metadata is evidence; marketing prose is never authority.
  const usb = scalar(attrs.usb_c ?? attrs.usb_c_required);
  return p.offers.flatMap((offer, index) => {
    try {
      const amount = offer.price.amount ?? offer.price.price;
      if (amount === undefined) return [];
      return [
        ProductSchema.parse({
          id: `${p.id}::${index}`,
          title: p.title.slice(0, 250),
          category: p.category?.slug ?? null,
          merchant: offer.domain.slice(0, 100),
          url: offer.url,
          unitPrice: minorUnits(String(amount)),
          currency: offer.price.currency.toUpperCase(),
          rating: null,
          reviewCount: null,
          deliveryDate: null,
          stock: offer.availability === 'OutOfStock' ? 0 : null,
          displaySize: display ? Number(display[1]) : null,
          usbC:
            typeof usb === 'boolean'
              ? usb
              : /^(true|yes)$/i.test(String(usb))
                ? true
                : /^(false|no)$/i.test(String(usb))
                  ? false
                  : null,
          features: (p.key_features ?? []).slice(0, 30).map((f) => f.slice(0, 120)),
          image: p.images?.[0]?.cleaned_url ?? p.images?.[0]?.url ?? null,
          source: 'channel3',
          evidence: {
            observedAt: new Date().toISOString(),
            description: (p.description ?? '').slice(0, 2000),
            notes: [
              'Live Channel3 category, merchant and catalog price. Rating, committed delivery, exact stock and landed cost are not provided.',
            ],
            landedCostVerified: false,
          },
        }),
      ];
    } catch {
      return [];
    }
  });
}
export class Channel3ProductProvider implements ProductProvider {
  name = 'Channel3';
  calls = 0;
  constructor(private fetcher: typeof fetch = fetch) {}
  private client() {
    const key = process.env.CHANNEL3_API_KEY;
    if (!key)
      throw new AppError(
        'Product research is unavailable. Configure CHANNEL3_API_KEY on the server.',
        503,
      );
    return new Channel3({
      apiKey: key,
      maxRetries: 0,
      timeoutInSeconds: config().TOOL_TIMEOUT_MS / 1000,
      fetch: async (input, init) => {
        this.calls++;
        const response = await this.fetcher(input, { ...init, cache: 'no-store' });
        const data = await boundedJson(response);
        const headers = new Headers(response.headers);
        headers.delete('content-length');
        headers.delete('content-encoding');
        return new Response(JSON.stringify(data), { status: response.status, headers });
      },
    });
  }
  private locale(mandate: SpendingMandate) {
    return {
      country:
        mandate.currency === 'USD'
          ? ('US' as const)
          : mandate.currency === 'GBP'
            ? ('GB' as const)
            : ('ES' as const),
      currency: mandate.currency,
      language: 'en' as const,
    };
  }
  private failed(): never {
    throw new AppError(
      'Channel3 product research is temporarily unavailable. Retry or narrow your query.',
      503,
    );
  }
  async searchProducts(query: string, mandate: SpendingMandate) {
    const client = this.client();
    const signal = timeoutSignal(config().TOOL_TIMEOUT_MS);
    try {
      const page = await client.products.search(
        {
          query,
          limit: Math.min(20, config().MAX_PRODUCT_RESULTS),
          config: { ...this.locale(mandate), mode: 'default' },
          filters: {
            ...(mandate.executionScope === 'sandbox_catalog'
              ? {}
              : {
                  price: {
                    max_price:
                      Math.min(mandate.maxUnit ?? Infinity, mandate.maxTotal / mandate.quantity) /
                      100,
                  },
                }),
            ...(mandate.merchantPolicy.allow.length
              ? { website_ids: mandate.merchantPolicy.allow }
              : {}),
            ...(mandate.merchantPolicy.block.length
              ? { exclude_website_ids: mandate.merchantPolicy.block }
              : {}),
          },
        },
        { abortSignal: signal },
      );
      // Detail reads are free. Refresh before display; never reuse stale affiliate URLs.
      const fresh: ProductCandidate[] = [];
      for (let i = 0; i < page.data.length; i += 4) {
        const details = await Promise.allSettled(
          page.data
            .slice(i, i + 4)
            .map((p) =>
              client.products.retrieve(
                { product_id: p.id, ...this.locale(mandate) },
                { abortSignal: signal },
              ),
            ),
        );
        for (const detail of details) {
          if (detail.status === 'fulfilled') {
            try {
              fresh.push(...normalizeChannelProduct(detail.value));
            } catch {
              /* malformed listing is excluded */
            }
          }
        }
        if (signal.aborted || fresh.length >= config().MAX_PRODUCT_RESULTS) break;
      }
      return fresh.slice(0, config().MAX_PRODUCT_RESULTS);
    } catch {
      return this.failed();
    }
  }
  async getProduct(id: string, mandate: SpendingMandate) {
    const client = this.client();
    try {
      const result = await client.products.retrieve(
        { product_id: id.split('::')[0], ...this.locale(mandate) },
        { abortSignal: timeoutSignal(config().TOOL_TIMEOUT_MS) },
      );
      return normalizeChannelProduct(result).find((p) => p.id === id) ?? null;
    } catch {
      return this.failed();
    }
  }
}
export function productProvider(): ProductProvider {
  return config().PRODUCT_PROVIDER === 'mock'
    ? new DemoProductProvider()
    : new Channel3ProductProvider();
}
