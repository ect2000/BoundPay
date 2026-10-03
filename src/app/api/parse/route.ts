import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { body, errorResponse } from '@/lib/server/http';
import { llmProvider } from '@/lib/server/llm';
import { invalidateActive } from '@/lib/server/state';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    const { text } = await body(request, z.object({ text: z.string().min(10).max(4000) }).strict());
    await invalidateActive();
    const llm = llmProvider();
    return Response.json({ ...(await llm.parsePurchaseIntent(text)), mode: llm.mode });
  } catch (e) {
    return errorResponse(e);
  }
}
