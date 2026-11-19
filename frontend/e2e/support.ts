import { expect, type Page } from '@playwright/test';

export interface TestProduct {
  id: string;
  title: string;
  description?: string;
  category: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  images?: string[];
  featured: boolean;
  instagramUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const product: TestProduct = {
  id: 'living-room-set',
  title: 'Modern Living Room Set',
  description: 'A comfortable contemporary furniture collection.',
  category: 'Sofas',
  mediaUrl: 'https://assets.test/living-room-main.jpg',
  mediaType: 'image',
  images: [
    'https://assets.test/living-room-main.jpg',
    'https://assets.test/living-room-side.jpg',
    'https://assets.test/living-room-detail.jpg',
  ],
  featured: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export function makeProduct(overrides: Partial<TestProduct> = {}): TestProduct {
  return { ...product, ...overrides };
}

export async function mockPublicApi(
  page: Page,
  options: { product?: TestProduct; products?: TestProduct[] } = {},
): Promise<void> {
  const detailProduct = options.product ?? product;
  const products = options.products ?? [detailProduct];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith('/auth/logout') && request.method() === 'POST') {
      await route.fulfill({ status: 200, json: { message: 'Logged out' } });
      return;
    }

    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
      return;
    }

    if (pathname.endsWith('/products') && request.method() === 'GET') {
      const items = url.searchParams.get('featured') === 'true' ? [] : products;
      await route.fulfill({
        status: 200,
        json: {
          items,
          total: items.length,
          page: Number(url.searchParams.get('page') || 1),
          pages: 1,
          categories: ['Sofas'],
          categoryPreviews: [],
          allPreview: null,
        },
      });
      return;
    }

    const productId = pathname.match(/\/products\/([^/]+)$/)?.[1];
    if (productId && request.method() === 'GET') {
      const requested = products.find((item) => item.id === productId) ?? detailProduct;
      await route.fulfill({ status: 200, json: { item: requested } });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'Not found' } });
  });
}

export async function expectProductPage(page: Page, title: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}
