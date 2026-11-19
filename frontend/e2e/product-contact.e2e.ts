import { expect, test } from '@playwright/test';

import { expectProductPage, makeProduct, mockPublicApi } from './support';

test('product with an Instagram post link shows only the view-on-Instagram action', async ({
  page,
}) => {
  const instagramUrl = 'https://www.instagram.com/p/example-post/';
  await mockPublicApi(page, {
    product: makeProduct({ instagramUrl }),
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'View Modern Living Room Set' }).click();

  await expectProductPage(page, 'Modern Living Room Set');
  const instagramLink = page.getByRole('link', { name: 'View Product on Instagram' });
  await expect(instagramLink).toHaveAttribute('href', instagramUrl);
  await expect(page.getByRole('link', { name: 'Contact us on Instagram' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy product link' })).toHaveCount(0);
});

test('product without an Instagram post link offers chat and product-link actions', async ({
  page,
}) => {
  await mockPublicApi(page, {
    product: makeProduct({ instagramUrl: undefined }),
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'View Modern Living Room Set' }).click();

  await expectProductPage(page, 'Modern Living Room Set');
  await expect(page.getByRole('link', { name: 'Contact us on Instagram' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy product link' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View Product on Instagram' })).toHaveCount(0);
});
