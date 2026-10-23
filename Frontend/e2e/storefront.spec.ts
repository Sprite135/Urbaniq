import { expect, test } from '@playwright/test';

const expectBasicAccessibility = async (page: import('@playwright/test').Page) => {
  const audit = await page.evaluate(() => {
    const getName = (element: Element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledText = labelledBy
        ?.split(/\s+/)
        .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
        .join(' ')
        .trim();
      const labels = 'labels' in element
        ? Array.from((element as HTMLInputElement).labels ?? []).map(label => label.textContent?.trim() ?? '').join(' ').trim()
        : '';
      return (
        element.getAttribute('aria-label')?.trim()
        || labelledText
        || labels
        || element.getAttribute('title')?.trim()
        || element.textContent?.trim()
        || element.querySelector('img')?.getAttribute('alt')?.trim()
        || ''
      );
    };

    const controls = Array.from(document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea'))
      .filter(element => element.getAttribute('aria-hidden') !== 'true' && !element.hasAttribute('disabled'))
      .filter(element => !getName(element))
      .map(element => element.outerHTML.slice(0, 180));
    const imagesWithoutAlt = Array.from(document.querySelectorAll('img:not([alt])'))
      .map(element => element.outerHTML.slice(0, 180));

    return {
      language: document.documentElement.lang,
      title: document.title.trim(),
      unnamedControls: controls,
      imagesWithoutAlt,
    };
  });

  expect(audit.language).toBe('es');
  expect(audit.title.length).toBeGreaterThan(0);
  expect(audit.unnamedControls).toEqual([]);
  expect(audit.imagesWithoutAlt).toEqual([]);
};

const publicRoutes = [
  { path: '/', name: 'inicio' },
  { path: '/catalog', name: 'catalogo' },
  { path: '/help', name: 'ayuda' },
  { path: '/legal/terms', name: 'terminos' },
  { path: '/login', name: 'inicio-sesion' },
  { path: '/register', name: 'registro' },
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
    await expectBasicAccessibility(page);

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
