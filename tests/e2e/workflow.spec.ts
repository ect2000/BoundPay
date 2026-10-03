import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const shots = 'docs/screenshots';
async function screenshot(page: Page, name: string) {
  await mkdir(shots, { recursive: true });
  if (await page.locator('.flow-visual').count())
    await expect
      .poll(() => page.locator('.guard-node').evaluate((el) => getComputedStyle(el).opacity))
      .toBe('1');
  if (await page.locator('.desktop-grid').isVisible())
    await page.locator('.ag-root-wrapper').waitFor();
  await page.screenshot({
    path: `${shots}/${name}.png`,
    fullPage: !(await page.getByRole('dialog').isVisible()),
    animations: 'disabled',
  });
}
async function research(page: Page) {
  await page.goto('/mission?demo=1');
  await page.getByRole('button', { name: 'Extract mandate' }).click();
  await expect(page.getByRole('heading', { name: 'I understood your request as:' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm mandate & research' }).click();
  await expect(page.getByText('RESEARCH COMPLETE', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review payment mandate' })).toBeEnabled();
}
test('complete honest local demo with genuine policy blocking, approval and audit', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI procurement');
  await screenshot(page, '01-landing');
  await page.getByRole('link', { name: 'Run demo', exact: true }).click();
  await expect(page.getByLabel('Purchasing request')).toContainText('12-person');
  await screenshot(page, '02-mission');
  await page.getByRole('button', { name: 'Extract mandate' }).click();
  await expect(page.getByRole('heading', { name: 'I understood your request as:' })).toBeVisible();
  await screenshot(page, '03-mandate');
  // Hold the local test request to capture its real pending UI; no application delay.
  let releaseResearch!: () => void;
  const pending = new Promise<void>((resolve) => {
    releaseResearch = resolve;
  });
  await page.route('**/api/research', async (route) => {
    await pending;
    await route.continue();
  });
  await page.getByRole('button', { name: 'Confirm mandate & research' }).click();
  await expect(page.getByRole('heading', { name: 'Research, within your rules.' })).toBeVisible();
  await screenshot(page, '04-agent-research');
  releaseResearch();
  await expect(page.getByText('FIXTURE RESEARCH COMPLETE')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review payment mandate' })).toBeEnabled();
  await screenshot(page, '05-product-grid');
  await page.getByRole('button', { name: 'Policy Guard', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Every hard rule passed.' })).toBeVisible();
  await screenshot(page, '06-policy-guard');
  await page.getByRole('button', { name: 'Inspect selection rationale' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await screenshot(page, '07-why-this');
  await page.getByRole('button', { name: 'Close review' }).click();
  await page.getByRole('button', { name: 'Compare products' }).click();
  await page
    .locator('.ag-row')
    .filter({ hasText: 'Summit Pro 27 4K' })
    .locator('.ag-cell')
    .first()
    .click();
  await expect(page.getByText('PAYMENT BLOCKED', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review payment mandate' })).toBeDisabled();
  await screenshot(page, '11-payment-blocked');
  await page
    .locator('.ag-row')
    .filter({ hasText: 'Northstar View 27 USB-C' })
    .locator('.ag-cell')
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Review payment mandate' })).toBeEnabled();
  await page.getByRole('button', { name: 'Review payment mandate' }).click();
  await screenshot(page, '08-payment-mandate');
  await expect(page.getByRole('button', { name: 'Approve this purchase' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I reviewed this purchase' }).check();
  await page.getByRole('button', { name: 'Approve this purchase' }).click();
  await expect(page.getByText('Human approval recorded.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to local checkout simulation' }).click();
  await expect(page.getByRole('heading', { name: 'Local checkout simulated' })).toBeVisible();
  await screenshot(page, '09-paypal');
  await screenshot(page, '10-audit-trail');
  await expect(page.getByText('No PayPal API was called and no payment was made.')).toBeVisible();
  await page.getByRole('button', { name: 'Agent trace', exact: true }).last().click();
  await expect(page.getByText('Products evaluated', { exact: true })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
test('responsive layout and keyboard review at tablet and mobile widths', async ({ page }) => {
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await screenshot(page, `responsive-${width}-landing`);
    await research(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await screenshot(page, `responsive-${width}-workspace`);
    await page.getByRole('button', { name: 'Review payment mandate' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await screenshot(page, `responsive-${width}-payment`);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  }
});
test('server rejects forged policy, cross-origin writes, stale approval and missing capture authority', async ({
  page,
}) => {
  await page.goto('/mission?demo=1');
  const badOrigin = await page.request.post('/api/approve', {
    headers: { Origin: 'https://untrusted.example' },
    data: { token: 'fake', reviewed: true },
  });
  expect(badOrigin.status()).toBe(403);
  const missing = await page.request.post('/api/paypal/capture', {
    headers: { Origin: 'http://127.0.0.1:3007' },
    data: { orderId: 'arbitrary', checkoutToken: 'forged' },
  });
  expect(missing.status()).toBe(403);
  const forged = await page.request.post('/api/approve', {
    headers: { Origin: 'http://127.0.0.1:3007' },
    data: { token: 'forged', reviewed: true, policy: { valid: true } },
  });
  expect(forged.status()).toBe(400);
  await research(page);
  const result = await page.evaluate(async () => {
    const send = async (path: string, data: unknown) => {
      const r = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return { status: r.status, data: await r.json() };
    };
    const parse = await send('/api/parse', {
      text: 'Equip 12-person team with 27-inch USB-C monitors. Maximum budget $3000. Minimum rating 4.5. Delivery before Friday.',
    });
    const r = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mandate: parse.data.mandate, confirmed: true }),
    });
    const stream = await r.text();
    const found = stream
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
      .find((e) => e.type === 'result').result;
    const proposal = await send('/api/proposal', { token: found.token, productId: 'northstar-27' });
    const approval = await send('/api/approve', { token: proposal.data.token, reviewed: true });
    const approvalRetry = await send('/api/approve', {
      token: proposal.data.token,
      reviewed: true,
    });
    await send('/api/proposal', { token: found.token, productId: 'summit-27' });
    const blocked = await send('/api/paypal/order', { token: approval.data.token });
    return {
      blocked: blocked.status,
      nonce: approval.data.approval.nonce,
      retryNonce: approvalRetry.data.approval.nonce,
    };
  });
  expect(result.blocked).toBe(403);
  expect(result.nonce).toBe(result.retryNonce);
});
