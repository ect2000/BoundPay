import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { body, errorResponse } from '@/lib/server/http';
import { invalidateActive } from '@/lib/server/state';
export async function POST(request: NextRequest) {
  try {
    await body(request, z.object({}).strict());
    await invalidateActive();
    return Response.json({ invalidated: true });
  } catch (e) {
    return errorResponse(e);
  }
}
