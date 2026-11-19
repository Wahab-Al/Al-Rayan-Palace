import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ProductService } from '../../services/product';
import type { Product } from '../../models/product';
import { ProductDetail } from './product-details';

describe('ProductDetail', () => {
  let fixture: ComponentFixture<ProductDetail>;

  const product: Product = {
    id: 'gallery-product',
    title: 'Three image sofa',
    category: 'Sofas',
    mediaUrl: 'https://example.com/sofa-1.jpg',
    images: [
      'https://example.com/sofa-1.jpg',
      'https://example.com/sofa-2.jpg',
      'https://example.com/sofa-3.jpg',
    ],
    mediaType: 'image',
    featured: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => product.id } } },
        },
        { provide: ProductService, useValue: { getProduct: () => of({ item: product }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    fixture.detectChanges();
  });

  it('shows the main image on the left and two selectable thumbnails', () => {
    const element = fixture.nativeElement as HTMLElement;
    const thumbnails = element.querySelectorAll<HTMLButtonElement>('.gallery-thumbnail');
    const mainImage = element.querySelector<HTMLImageElement>('.gallery-main img');

    expect(thumbnails).toHaveLength(2);
    expect(mainImage?.src).toBe(product.images?.[0]);

    thumbnails[0].click();
    fixture.detectChanges();

    expect(mainImage?.src).toBe(product.images?.[1]);
  });

  it('shows contact and copy-link actions when the product has no Instagram post', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Contact us on Instagram');
    expect(element.textContent).toContain('Copy product link');
    expect(element.querySelector('a.contact-button')?.getAttribute('href')).toContain(
      'instagram.com',
    );
  });
});
