import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type AuthResponse = {
  accessToken: string;
  user: {
    userId: string;
    email: string;
    name: string;
    role: string;
    isBlocked: boolean;
    isPhoneNumberVerified: boolean;
    isEmailVerified: boolean;
  };
};

type Product = {
  id: string;
  productName: string;
  slug: string;
  quantity: number;
  variants: Array<{ id: string; quantity: number }>;
};

const provisionCustomerCheckout = async (request: APIRequestContext, projectName: string) => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `urbaniq-e2e-${projectName}-${unique}@example.com`;
  const password = 'Urbaniq2026!';

  const registration = await request.post('/api/v1/Auth/register', {
    data: { name: 'Cliente Prueba', email, password },
  });
  expect(registration.ok(), await registration.text()).toBeTruthy();

  const login = await request.post('/api/v1/Auth/login', { data: { email, password } });
  expect(login.ok(), await login.text()).toBeTruthy();
  const auth = await login.json() as AuthResponse;
  const headers = { Authorization: `Bearer ${auth.accessToken}` };

  const productsResponse = await request.get('/api/v1/Product/All?pageNumber=1&pageSize=200');
  expect(productsResponse.ok()).toBeTruthy();
  const productsBody = await productsResponse.json() as { items: Product[] };
  let product: Product | undefined;
  for (const candidate of productsBody.items.filter(item => item.quantity > 0)) {
    const detailResponse = await request.get(`/api/v1/Product/slug/${encodeURIComponent(candidate.slug)}`);
    if (!detailResponse.ok()) continue;
    const detail = await detailResponse.json() as Product;
    if (detail.variants.some(variant => variant.quantity > 0)) {
      product = detail;
      break;
    }
  }
  expect(product, 'El catálogo necesita al menos un producto con stock para validar una compra').toBeTruthy();
  const variant = product!.variants.find(item => item.quantity > 0)!;

  const address = await request.post('/api/v1/Address/add', {
    headers,
    data: {
      fullName: 'Cliente Prueba',
      phoneNumber: '987654321',
      department: 'Lima',
      province: 'Lima',
      district: 'Miraflores',
      deliveryZone: 'LimaMetropolitana',
      houseName: 'Av. Larco 123',
      place: 'Miraflores',
      reference: 'Lima',
      landMark: 'Cerca del parque Kennedy',
    },
  });
  expect(address.ok(), await address.text()).toBeTruthy();

  const cart = await request.post('/api/v1/Cart/add', {
    headers,
    data: { productId: product!.id, productVariantId: variant.id, quantity: 1 },
  });
  expect(cart.ok(), await cart.text()).toBeTruthy();

  return auth;
};

const authenticateBrowser = async (page: Page, auth: AuthResponse) => {
  await page.addInitScript((session: AuthResponse) => {
    localStorage.setItem('ecommerce.auth', JSON.stringify({
      user: session.user,
      token: session.accessToken,
    }));
  }, auth);
};

test('cliente completa una compra contra entrega y queda fuera del panel administrativo', async ({ page, request }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const auth = await provisionCustomerCheckout(request, testInfo.project.name);
  await authenticateBrowser(page, auth);

  await page.goto('/checkout', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Selecciona la dirección de entrega' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar al resumen del pedido' }).click();
  await expect(page.getByRole('heading', { name: /Artículos del pedido/ })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar al pago' }).click();

  await expect(page.getByText('Solo métodos disponibles')).toBeVisible();
  await page.getByText('Pago contra entrega', { exact: true }).click();
  const orderResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/v1/Order/place-order') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Realizar pedido (Pago contra entrega)' }).click();
  const orderResponse = await orderResponsePromise;
  const orderBody = await orderResponse.json() as { orderId: string; message?: string };
  expect(orderResponse.ok(), orderBody.message ?? 'No se pudo crear el pedido E2E').toBeTruthy();
  const { orderId } = orderBody;
  await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Pago Contra Entrega')).toBeVisible();

  await page.goto('/admin', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('body')).toContainText(/Urbaniq/i);
  expect(pageErrors).toEqual([]);

  const cleanup = await request.post(`/api/v1/Order/${orderId}/cancel`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { reason: 'Limpieza automática de prueba E2E' },
  });
  expect(cleanup.ok(), await cleanup.text()).toBeTruthy();
});
