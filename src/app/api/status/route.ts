import { config } from '@/lib/server/config';
export const dynamic = 'force-dynamic';
export async function GET() {
  const c = config();
  return Response.json(
    {
      llm: {
        mode: c.LLM_MODE,
        configured: !!process.env.OPENROUTER_API_KEY,
        model: c.LLM_MODEL,
        fallback: c.LLM_FALLBACK_MODEL,
        cost: '$0',
        status:
          c.LLM_MODE === 'mock'
            ? 'LOCAL PARSER — NO AI'
            : process.env.OPENROUTER_API_KEY
              ? 'CONFIGURED — NOT PROBED'
              : 'NOT CONFIGURED',
      },
      products: {
        mode: c.PRODUCT_PROVIDER,
        configured: !!process.env.CHANNEL3_API_KEY,
        status:
          c.PRODUCT_PROVIDER === 'mock'
            ? 'LOCAL FIXTURES'
            : process.env.CHANNEL3_API_KEY
              ? 'CONFIGURED — NOT PROBED'
              : 'NOT CONFIGURED',
      },
      paypal: {
        mode: c.PAYPAL_MODE,
        configured: !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET,
        status:
          c.PAYPAL_MODE === 'mock'
            ? 'LOCAL SIMULATION'
            : process.env.PAYPAL_CLIENT_SECRET
              ? 'CONFIGURED — NOT PROBED'
              : 'NOT CONFIGURED',
      },
      policy: 'READY',
      local: c.local,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
