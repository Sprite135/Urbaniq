import { expect, test } from '@playwright/test';

const publicRoutes = [
  { path: '/', name: 'inicio' },
  { path: '/catalog', name: 'catalogo' },
  { path: '/help', name: 'ayuda' },
  { path: '/legal/terms', name: 'terminos' },
];

for (const route of publicRoutes) {
  test(`${route.name} carga sin errores ni desbordamiento horizontal`, async ({ page }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const response = await page.goto(route.path, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).toContainText(/Urbaniq/i);

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(pageErrors).toEqual([]);

    const screenshot = await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`${route.name}.png`),
    });
    await testInfo.attach(`${route.name}-${testInfo.project.name}`, {
      body: screenshot,
      contentType: 'image/png',
    });
  });
}

test('API pública entrega productos válidos', async ({ request }) => {
  const response = await request.get('/api/v1/Product/All?pageNumber=1&pageSize=200');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.items.length).toBeGreaterThan(0);
  expect(body.totalCount).toBeGreaterThan(0);
  expect(body.items[0]).toEqual(expect.objectContaining({
    id: expect.any(String),
    productName: expect.any(String),
    price: expect.any(Number),
  }));

  const imagePaths = [...new Set<string>(body.items.map((item: { image: string }) => item.image))];
  const imageResponses = await Promise.all(imagePaths.map(path => request.get(path)));
  expect(imageResponses.every(image => image.status() === 200)).toBe(true);
});
