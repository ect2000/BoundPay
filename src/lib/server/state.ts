import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { config } from './config';
import { AppError } from './http';
import type { Basket, SpendingMandate } from '../domain';
const devSecret = randomBytes(32).toString('hex');
function secret() {
  const value = process.env.BOUND_PAY_STATE_SECRET;
  if (value && value.length >= 32) return value;
  if (config().local) return devSecret;
  throw new AppError('Secure state signing is not configured. Set BOUND_PAY_STATE_SECRET.', 503);
}
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export function fingerprint(mandate: SpendingMandate, basket: Basket) {
  return createHash('sha256').update(stable({ mandate, basket })).digest('hex');
}
export function seal(kind: string, session: string, data: unknown, ttlSeconds = 900): string {
  const payload = Buffer.from(
    JSON.stringify({ kind, session, data, expires: Date.now() + ttlSeconds * 1000 }),
  ).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}
export function unseal<T>(token: string, kind: string, session: string, schema: z.ZodType<T>): T {
  if (token.length > 150_000) throw new AppError('Invalid state size.', 403);
  const [payload, sig, extra] = token.split('.');
  if (!payload || !sig || extra) throw new AppError('Invalid signed state.', 403);
  const expected = createHmac('sha256', secret()).update(payload).digest();
  const actual = Buffer.from(sig, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new AppError('Signed state could not be verified.', 403);
  const envelope = z
    .object({ kind: z.string(), session: z.string(), expires: z.number(), data: z.unknown() })
    .parse(JSON.parse(Buffer.from(payload, 'base64url').toString()));
  if (envelope.kind !== kind || envelope.session !== session || envelope.expires <= Date.now())
    throw new AppError('State expired or belongs to another session. Run the mission again.', 403);
  return schema.parse(envelope.data);
}
const cookieOptions = () => ({
  httpOnly: true,
  secure: !config().local,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 3600,
});
export async function sessionId() {
  const jar = await cookies();
  const existing = jar.get('bp_session')?.value;
  if (existing) {
    try {
      return unseal(existing, 'session', 'browser', z.string().uuid());
    } catch {
      /* rotate invalid sessions */
    }
  }
  const id = crypto.randomUUID();
  jar.set('bp_session', seal('session', 'browser', id, 3600), cookieOptions());
  return id;
}
export async function activate(session: string, fp: string) {
  (await cookies()).set(
    'bp_active',
    seal('active', session, { fingerprint: fp }, 900),
    cookieOptions(),
  );
}
export async function requireActive(session: string, fp: string) {
  const token = (await cookies()).get('bp_active')?.value;
  if (
    !token ||
    unseal(token, 'active', session, z.object({ fingerprint: z.string() })).fingerprint !== fp
  )
    throw new AppError('Approval invalidated. Review the current basket again.', 403);
}
export async function invalidateActive() {
  (await cookies()).delete('bp_active');
  (await cookies()).delete('bp_checkout');
}
