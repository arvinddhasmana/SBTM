import { test } from '@playwright/test';

test('diag: dump page content', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', (msg) => consoleLogs.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (err) => consoleLogs.push(`PAGEERROR: ${err.message}`));
  await page.goto('/');
  await page.waitForTimeout(10000);
  const inputCount = await page.locator('input').count();
  const allDataTestIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    ),
  );
  console.log('INPUT_COUNT=' + inputCount);
  console.log('DATA_TESTIDS=' + JSON.stringify(allDataTestIds));
  consoleLogs.forEach((l) => console.log('LOG:' + l));
});
