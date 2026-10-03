import 'server-only';
import { z } from 'zod';
export const ALLOWED_FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'qwen/qwen3.8-27b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openrouter/free',
] as const;
export function assertFreeModels(primary: string, fallback: string) {
  if (![primary, fallback].every((m) => (ALLOWED_FREE_MODELS as readonly string[]).includes(m)))
    throw new Error('BoundPay is configured to use a non-free LLM model.');
}
export function config() {
  const local =
    process.env.NODE_ENV !== 'production' ||
    (process.env.BOUNDPAY_LOCAL_TEST === '1' && !process.env.VERCEL);
  const env = z
    .object({
      LLM_MODEL: z.string().default('nvidia/nemotron-3-super-120b-a12b:free'),
      LLM_FALLBACK_MODEL: z.string().default('openrouter/free'),
      LLM_MODE: z
        .enum(['openrouter', 'mock'])
        .default(local && !process.env.OPENROUTER_API_KEY ? 'mock' : 'openrouter'),
      PRODUCT_PROVIDER: z
        .enum(['channel3', 'mock'])
        .default(local && !process.env.CHANNEL3_API_KEY ? 'mock' : 'channel3'),
      PAYPAL_MODE: z
        .enum(['sandbox', 'mock'])
        .default(local && !process.env.PAYPAL_CLIENT_SECRET ? 'mock' : 'sandbox'),
      LLM_MAX_RETRIES: z.coerce.number().int().min(0).max(2).default(1),
      LLM_TIMEOUT_MS: z.coerce.number().int().min(100).max(20000).default(12000),
      MAX_AGENT_STEPS: z.coerce.number().int().min(1).max(12).default(10),
      MAX_PRODUCT_SEARCHES: z.coerce.number().int().min(1).max(3).default(3),
      MAX_PRODUCT_RESULTS: z.coerce.number().int().min(1).max(50).default(30),
      TOOL_TIMEOUT_MS: z.coerce.number().int().min(100).max(15000).default(10000),
    })
    .parse(process.env);
  assertFreeModels(env.LLM_MODEL, env.LLM_FALLBACK_MODEL);
  if (!local && [env.LLM_MODE, env.PRODUCT_PROVIDER, env.PAYPAL_MODE].includes('mock'))
    throw new Error('Mock integrations are restricted to local development and tests.');
  return { ...env, local };
}
