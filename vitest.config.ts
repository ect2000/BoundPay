import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      'server-only': path.resolve(import.meta.dirname, 'tests/server-only.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: {
      BOUND_PAY_STATE_SECRET: 'test-secret-with-at-least-32-characters',
      LLM_MODE: 'mock',
      PRODUCT_PROVIDER: 'mock',
      PAYPAL_MODE: 'mock',
    },
  },
});
