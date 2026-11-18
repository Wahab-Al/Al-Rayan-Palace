import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';

import { ProductForm } from './product-form';
import { AdminProductService } from '../../services/admin-product';
import type { Product } from '../../../catalog/models/product';

describe('ProductForm Instagram reference', () => {
  let fixture: ComponentFixture<ProductForm>;
  let component: ProductForm;
  let productId: string | null;
  let service: {
    getProducts: ReturnType<typeof vi.fn>;
    getProduct: ReturnType<typeof vi.fn>;
    createProduct: ReturnType<typeof vi.fn>;
    updateProduct: ReturnType<typeof vi.fn>;
    deleteProduct: ReturnType<typeof vi.fn>;
  };

  const product: Product = {
    id: 'product-1',
    title: 'Sofa',
    description: 'A sofa',
    category: 'Living Rooms',
    mediaUrl: 'https://example.com/sofa.jpg',
    mediaType: 'image',
    featured: false,
    instagramUrl: 'https://www.instagram.com/p/original/',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    productId = null;
    service = {
      getProducts: vi.fn(() =>
        of({
          items: [product],
          total: 1,
          page: 1,
          pages: 1,
          categories: ['Living Rooms'],
          categoryPreviews: [],
          allPreview: null,
        }),
      ),
      getProduct: vi.fn((_id: string) => of({ item: product })),
      createProduct: vi.fn((_formData: FormData) => NEVER),
      updateProduct: vi.fn((_id: string, _formData: FormData) => NEVER),
      deleteProduct: vi.fn((_id: string) => of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [ProductForm],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => productId,
              },
            },
          },
        },
        { provide: AdminProductService, useValue: service },
      ],
    }).compileComponents();
  });

  function createFixture(): void {
    fixture = TestBed.createComponent(ProductForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillValidForm(instagramUrl: string): void {
    component.form.setValue({
      title: 'Sofa',
      description: 'A comfortable sofa',
      category: 'Living Rooms',
      featured: false,
      instagramUrl,
    });
  }

  it('includes an Instagram reference when creating a product', () => {
    createFixture();
    fillValidForm('https://www.instagram.com/p/new-reference/');
    component.selectedFile.set(new File(['image'], 'sofa.jpg', { type: 'image/jpeg' }));

    component.submit();

    expect(service.createProduct).toHaveBeenCalledOnce();
    const formData = service.createProduct.mock.calls[0][0] as FormData;
    expect(formData.get('instagramUrl')).toBe('https://www.instagram.com/p/new-reference/');
  });

  it('loads and updates an existing Instagram reference when editing', () => {
    productId = 'product-1';
    createFixture();

    expect(component.form.controls.instagramUrl.value).toBe(product.instagramUrl);

    fillValidForm('https://www.instagram.com/p/updated-reference/');
    component.submit();

    expect(service.updateProduct).toHaveBeenCalledOnce();
    expect(service.updateProduct.mock.calls[0][0]).toBe('product-1');
    const formData = service.updateProduct.mock.calls[0][1] as FormData;
    expect(formData.get('instagramUrl')).toBe('https://www.instagram.com/p/updated-reference/');
  });

  it('rejects URLs outside Instagram before submitting', () => {
    createFixture();
    fillValidForm('https://example.com/not-instagram');
    component.selectedFile.set(new File(['image'], 'sofa.jpg', { type: 'image/jpeg' }));

    component.submit();

    expect(component.form.controls.instagramUrl.invalid).toBe(true);
    expect(service.createProduct).not.toHaveBeenCalled();
  });
});
