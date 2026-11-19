import { expect, test } from '@playwright/test';

import { expectProductPage, mockPublicApi } from './support';

test('catalog opens a product and its image gallery switches the main image', async ({ page }) => {
  await mockPublicApi(page);

  const productsRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/products') && url.searchParams.get('featured') !== 'true';
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const request = await productsRequest;

  await expect(page.getByRole('heading', { name: 'Our Products' })).toBeVisible();
  expect(new URL(request.url()).searchParams.get('limit')).toBe('12');
  await expect(page.getByRole('heading', { name: 'Modern Living Room Set' })).toBeVisible();
  await expect(page.locator('.products-grid .product-card')).toHaveCount(1);

  await page.getByRole('link', { name: 'View Modern Living Room Set' }).click();
  await expectProductPage(page, 'Modern Living Room Set');
  await expect(page.locator('.gallery-thumbnail')).toHaveCount(2);

  await page.getByRole('button', { name: 'Show product image 2' }).click();
  await expect(page.locator('.gallery-main img')).toHaveAttribute(
    'src',
    'https://assets.test/living-room-side.jpg',
  );
});
