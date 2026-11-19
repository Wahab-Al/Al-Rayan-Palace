import { expect, test } from '@playwright/test';

import { expectProductPage, makeProduct, mockPublicApi } from './support';

test('video products are configured to autoplay silently and loop', async ({ page }) => {
  await mockPublicApi(page, {
    product: makeProduct({
      mediaType: 'video',
      mediaUrl: 'https://assets.test/living-room-tour.mp4',
      images: [],
    }),
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'View Modern Living Room Set' }).click();

  await expectProductPage(page, 'Modern Living Room Set');
  const video = page.getByTestId('product-detail-video');
  await expect(video).toHaveAttribute('autoplay', '');
  await expect(video).toHaveAttribute('muted', '');
  await expect(video).toHaveAttribute('loop', '');
  await expect(video).toHaveAttribute('playsinline', '');
});
