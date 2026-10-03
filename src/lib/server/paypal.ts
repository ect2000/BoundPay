import 'server-only';
import { z } from 'zod';
import type { Basket, HumanApproval, PayPalOrder, SpendingMandate } from '../domain';
import { basketTotal, decimalAmount } from '../money';
import { authorizeToolCall } from '../policy';
import { config } from './config';
import { AppError, boundedJson, timeoutSignal } from './http';
import { fingerprint } from './state';
const API = 'https://api-m.sandbox.paypal.com';
const OrderSchema = z.object({
  id: z.string(),
  status: z.string(),
  links: z.array(z.object({ rel: z.string(), href: z.string() })).optional(),
  purchase_units: z
    .array(
      z.object({
        custom_id: z.string().optional(),
        amount: z.object({ value: z.string(), currency_code: z.string() }).optional(),
        payments: z
          .object({
            captures: z.array(
              z.object({
                id: z.string(),
                status: z.string(),
                amount: z.object({ value: z.string(), currency_code: z.string() }),
              }),
            ),
          })
          .optional(),
      }),
    )
    .optional(),
});
export type RawOrder = z.infer<typeof OrderSchema>;
export class PayPalSandboxAdapter {
  constructor(private fetcher: typeof fetch = fetch) {}
  private async token() {
    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    if (!id || !secret)
      throw new AppError(
        'PayPal Sandbox is unavailable. Configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
        503,
      );
    const response = await this.fetcher(`${API}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: timeoutSignal(config().TOOL_TIMEOUT_MS),
    });
    if (!response.ok) throw new AppError('PayPal Sandbox authentication failed.', 502);
    return z.object({ access_token: z.string() }).parse(await boundedJson(response)).access_token;
  }
  private async call(
    path: string,
    method: string,
    payload?: unknown,
    requestId?: string,
  ): Promise<RawOrder> {
    const token = await this.token();
    const response = await this.fetcher(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
      },
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
      signal: timeoutSignal(config().TOOL_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new AppError(
        method === 'POST' && path.endsWith('/capture')
          ? 'PayPal Sandbox could not capture this order. Check approval and retry.'
          : 'PayPal Sandbox could not complete the order request.',
        502,
      );
    return OrderSchema.parse(await boundedJson(response));
  }
  async create(
    mandate: SpendingMandate,
    basket: Basket,
    approval: HumanApproval,
    origin: string,
  ): Promise<PayPalOrder> {
    const fp = fingerprint(mandate, basket);
    if (!authorizeToolCall('createPayPalOrder', { mandate, basket, fingerprint: fp, approval }))
      throw new AppError('Payment blocked by Policy Guard or missing approval.', 403);
    if (basket.items.some((i) => i.product.source === 'fixture'))
      throw new AppError('Fixture products cannot create a real PayPal order.', 403);
    const raw = await this.call(
      '/v2/checkout/orders',
      'POST',
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: mandate.missionId,
            custom_id: fp,
            description: `BoundPay Sandbox procurement: ${mandate.title}`.slice(0, 127),
            amount: {
              currency_code: mandate.currency,
              value: decimalAmount(basketTotal(basket)),
              breakdown: {
                item_total: {
                  currency_code: mandate.currency,
                  value: decimalAmount(basketTotal(basket)),
                },
              },
            },
            items: basket.items.map((i) => ({
              name: i.product.title.slice(0, 127),
              quantity: String(i.quantity),
              unit_amount: {
                currency_code: mandate.currency,
                value: decimalAmount(i.product.unitPrice),
              },
              category: 'PHYSICAL_GOODS',
            })),
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'BoundPay Sandbox',
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
              return_url: `${origin}/mission?checkout=return`,
              cancel_url: `${origin}/mission?checkout=cancel`,
            },
          },
        },
      },
      `bp-create-${approval.nonce}`,
    );
    const approvalUrl = raw.links?.find((l) => ['payer-action', 'approve'].includes(l.rel))?.href;
    if (
      !approvalUrl ||
      new URL(approvalUrl).hostname !== 'www.sandbox.paypal.com' ||
      !approvalUrl.startsWith('https://')
    )
      throw new AppError('PayPal did not provide a valid Sandbox approval link.', 502);
    return {
      id: raw.id,
      status: raw.status === 'PAYER_ACTION_REQUIRED' ? 'PAYER_ACTION_REQUIRED' : 'CREATED',
      approvalUrl,
      mode: 'sandbox',
    };
  }
  async get(id: string) {
    return this.call(`/v2/checkout/orders/${encodeURIComponent(id)}`, 'GET');
  }
  async capture(
    id: string,
    mandate: SpendingMandate,
    basket: Basket,
    approval: HumanApproval,
  ): Promise<PayPalOrder> {
    const fp = fingerprint(mandate, basket);
    if (!authorizeToolCall('capturePayment', { mandate, basket, fingerprint: fp, approval }))
      throw new AppError('Payment blocked: approval does not match the purchase fingerprint.', 403);
    const before = await this.get(id);
    this.verify(before, fp, mandate.currency, decimalAmount(basketTotal(basket)));
    if (before.status === 'COMPLETED') return this.completed(before, mandate, basket);
    if (before.status !== 'APPROVED')
      throw new AppError('This order is not approved in PayPal Sandbox.', 409);
    const captured = await this.call(
      `/v2/checkout/orders/${encodeURIComponent(id)}/capture`,
      'POST',
      {},
      `bp-capture-${id}`,
    );
    return this.completed(captured, mandate, basket);
  }
  private verify(raw: RawOrder, fp: string, currency: string, value: string) {
    if (
      raw.purchase_units?.length !== 1 ||
      raw.purchase_units[0].custom_id !== fp ||
      raw.purchase_units[0].amount?.currency_code !== currency ||
      raw.purchase_units[0].amount?.value !== value
    )
      throw new AppError('PayPal order does not match the approved fingerprint and amount.', 403);
  }
  private completed(raw: RawOrder, mandate: SpendingMandate, basket: Basket): PayPalOrder {
    const captures = raw.purchase_units?.flatMap((u) => u.payments?.captures ?? []) ?? [];
    if (
      raw.status !== 'COMPLETED' ||
      captures.length !== 1 ||
      captures[0].status !== 'COMPLETED' ||
      captures[0].amount.currency_code !== mandate.currency ||
      captures[0].amount.value !== decimalAmount(basketTotal(basket))
    )
      throw new AppError(
        'PayPal has not confirmed a completed capture for the approved amount.',
        409,
      );
    return { id: raw.id, status: 'COMPLETED', captureId: captures[0].id, mode: 'sandbox' };
  }
}
