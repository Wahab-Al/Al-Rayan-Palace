import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { Products } from './products';
import type { ProductListResponse } from '../../../../shared/models/product-list-response';

describe('Products', () => {
  let fixture: ComponentFixture<Products>;
  let component: Products;
  let httpTesting: HttpTestingController;

  const response: ProductListResponse = {
    items: [],
    total: 0,
    page: 1,
    pages: 1,
    categories: ['Dining Rooms', 'Sofas'],
    categoryPreviews: [],
    allPreview: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Products],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Products);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpTesting.expectOne((request) => request.url.endsWith('/admin/products')).flush(response);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads products and category choices', () => {
    expect(component).toBeTruthy();
    expect(component.categories()).toEqual(['Dining Rooms', 'Sofas']);
  });

  it('searches partial text as the user types', async () => {
    vi.useFakeTimers();

    try {
      component.setSearchQuery('ayan');
      await vi.advanceTimersByTimeAsync(300);

      const request = httpTesting.expectOne(
        (candidate) =>
          candidate.url.endsWith('/admin/products') && candidate.params.get('search') === 'ayan',
      );
      request.flush(response);
    } finally {
      vi.useRealTimers();
    }
  });

  it('applies category, media, and featured filters', () => {
    component.setCategoryFilter('Dining Rooms');
    const categoryRequest = httpTesting.expectOne(
      (candidate) => candidate.params.get('category') === 'Dining Rooms',
    );
    categoryRequest.flush(response);

    component.setMediaTypeFilter('video');
    const mediaRequest = httpTesting.expectOne(
      (candidate) =>
        candidate.params.get('category') === 'Dining Rooms' &&
        candidate.params.get('mediaType') === 'video',
    );
    mediaRequest.flush(response);

    component.setFeaturedFilter('true');
    const featuredRequest = httpTesting.expectOne(
      (candidate) =>
        candidate.params.get('category') === 'Dining Rooms' &&
        candidate.params.get('mediaType') === 'video' &&
        candidate.params.get('featured') === 'true',
    );
    featuredRequest.flush(response);
  });

  it('keeps the newest results when an older filter request completes later', async () => {
    vi.useFakeTimers();
    component.setSearchQuery('older');
    await vi.advanceTimersByTimeAsync(260);
    const olderRequest = httpTesting.expectOne(
      (candidate) =>
        candidate.url.endsWith('/admin/products') && candidate.params.get('search') === 'older',
    );

    component.setSearchQuery('newer');
    await vi.advanceTimersByTimeAsync(260);
    const newerRequest = httpTesting.expectOne(
      (candidate) =>
        candidate.url.endsWith('/admin/products') && candidate.params.get('search') === 'newer',
    );

    const newestProduct = {
      id: 'newest',
      title: 'Newest result',
      category: 'Sofas',
      mediaUrl: 'https://example.com/newest.jpg',
      mediaType: 'image' as const,
      featured: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    newerRequest.flush({ ...response, items: [newestProduct] });

    expect(olderRequest.cancelled).toBe(true);
    expect(component.products()).toEqual([newestProduct]);
    vi.useRealTimers();
  });

  it('clears filters and displays the empty state after a no-match search', async () => {
    vi.useFakeTimers();
    component.setSearchQuery('missing product');
    await vi.advanceTimersByTimeAsync(260);

    const searchRequest = httpTesting.expectOne(
      (candidate) =>
        candidate.url.endsWith('/admin/products') &&
        candidate.params.get('search') === 'missing product',
    );
    searchRequest.flush({ ...response, categories: [], items: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No products match the current filters.');

    component.clearFilters();

    const clearRequest = httpTesting.expectOne(
      (candidate) =>
        candidate.url.endsWith('/admin/products') &&
        candidate.params.get('page') === '1' &&
        candidate.params.get('search') === null,
    );
    clearRequest.flush(response);

    expect(component.searchQuery()).toBe('');
    expect(component.selectedCategory()).toBe('all');
    expect(component.selectedMediaType()).toBe('all');
    expect(component.selectedFeatured()).toBe('all');
    vi.useRealTimers();
  });
});
