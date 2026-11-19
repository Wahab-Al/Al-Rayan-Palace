import { expect, test } from '@playwright/test';

import { mockPublicApi } from './support';

test('unauthenticated visitors are redirected from admin products to sign in', async ({ page }) => {
  await mockPublicApi(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Admin' }).click();

  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});
