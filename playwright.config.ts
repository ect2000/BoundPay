import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3007',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3007',
    url: 'http://127.0.0.1:3007',
    reuseExistingServer: false,
    timeout: 90000,
    env: {
      LLM_MODE: 'mock',
      PRODUCT_PROVIDER: 'mock',
      PAYPAL_MODE: 'mock',
      APP_URL: 'http://127.0.0.1:3007',
      NEXT_TELEMETRY_DISABLED: '1',
      BOUND_PAY_STATE_SECRET: 'local-playwright-state-secret-32-characters',
    },
  },
});
