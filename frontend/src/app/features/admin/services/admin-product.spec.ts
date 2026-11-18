import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminProductService } from './admin-product';

describe('AdminProductService', () => {
  let service: AdminProductService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdminProductService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('sends search and selected filters to the admin endpoint', () => {
    service
      .getProducts(2, 20, {
        search: 'dining',
        category: 'Dining Rooms',
        mediaType: 'video',
        featured: 'true',
      })
      .subscribe();

    const request = httpTesting.expectOne((candidate) => candidate.url.endsWith('/admin/products'));

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('search')).toBe('dining');
    expect(request.request.params.get('category')).toBe('Dining Rooms');
    expect(request.request.params.get('mediaType')).toBe('video');
    expect(request.request.params.get('featured')).toBe('true');
    request.flush({
      items: [],
      total: 0,
      page: 2,
      pages: 1,
      categories: [],
      categoryPreviews: [],
      allPreview: null,
    });
  });

  it('omits inactive filters', () => {
    service.getProducts().subscribe();

    const request = httpTesting.expectOne((candidate) => candidate.url.endsWith('/admin/products'));

    expect(request.request.params.get('search')).toBeNull();
    expect(request.request.params.get('category')).toBeNull();
    expect(request.request.params.get('mediaType')).toBeNull();
    expect(request.request.params.get('featured')).toBeNull();
    request.flush({
      items: [],
      total: 0,
      page: 1,
      pages: 1,
      categories: [],
      categoryPreviews: [],
      allPreview: null,
    });
  });
});
