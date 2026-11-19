import { expect, test } from '@playwright/test';

import { expectProductPage, makeProduct, mockPublicApi } from './support';

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
  await expect(page.getByRole('link', { name: 'View Modern Living Room Set' })).toHaveCount(1);

  await page.getByRole('link', { name: 'View Modern Living Room Set' }).click();
  await expectProductPage(page, 'Modern Living Room Set');
  await expect(page.getByRole('button', { name: /^Show product image/ })).toHaveCount(2);

  await page.getByRole('button', { name: 'Show product image 2' }).click();
  await expect(page.getByRole('img', { name: 'Modern Living Room Set' }).first()).toHaveAttribute(
    'src',
    'https://assets.test/living-room-side.jpg',
  );
});

test('two-image gallery keeps both images full-sized on tablet and phone widths', async ({
  page,
}) => {
  const mainImage = 'https://assets.test/living-room-main.jpg';
  await mockPublicApi(page, {
    product: makeProduct({
      mediaUrl: mainImage,
      images: [mainImage, 'https://assets.test/living-room-side.jpg'],
    }),
  });

  for (const width of [650, 390]) {
    await page.setViewportSize({ width, height: 864 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'View Modern Living Room Set' }).click();
    await expectProductPage(page, 'Modern Living Room Set');

    const mainImageBox = await page
      .getByRole('img', { name: 'Modern Living Room Set', exact: true })
      .boundingBox();
    const secondImageBox = await page
      .getByRole('button', { name: 'Show product image 2' })
      .boundingBox();

    if (!mainImageBox || !secondImageBox) {
      throw new Error('Both product images must be visible at mobile widths.');
    }

    expect(Math.abs(mainImageBox.width - secondImageBox.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(mainImageBox.height - secondImageBox.height)).toBeLessThanOrEqual(2);

    await page.goBack();
  }
});
