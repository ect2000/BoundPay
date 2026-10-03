import 'server-only';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function boundedJson(response: Response, maxBytes = 1_500_000): Promise<unknown> {
  if (!response.body) throw new AppError('Provider returned an empty response.', 502);
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AppError('Response exceeded the allowed size.', 413);
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
export async function body<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const origin = request.headers.get('origin');
  const expectedOrigin = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : request.nextUrl.origin;
  if (
    !origin ||
    origin !== expectedOrigin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new AppError('Request origin is not allowed.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new AppError('JSON content type required.', 415);
  return schema.parse(await boundedJson(new Response(request.body), 160_000));
}
export function errorResponse(error: unknown) {
  const message =
    error instanceof z.ZodError
      ? 'The request is invalid. Check your mandate and try again.'
      : error instanceof AppError
        ? error.message
        : 'The operation could not complete. Please try again.';
  return Response.json(
    { error: message },
    { status: error instanceof AppError ? error.status : error instanceof z.ZodError ? 400 : 500 },
  );
}
export function timeoutSignal(ms: number) {
  return AbortSignal.timeout(ms);
}
