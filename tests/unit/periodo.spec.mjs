import { expect, test } from '@playwright/test';

test('encerra a campanha exatamente no limite final', async ({ page }) => {
  await page.goto('/participante/index.html');
  const estados = await page.evaluate(() => {
    const campanha = { start: 1000, end: 2000, closedAt: null };
    return [999, 1000, 1999, 2000].map(instante => ensaio.state(campanha, instante));
  });

  expect(estados).toEqual(['scheduled', 'open', 'open', 'closed']);
});
