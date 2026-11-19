import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProductCard } from './product-card';
import type { Product } from '../../../../shared/models/product';

describe('ProductCard', () => {
  let component: ProductCard;
  let fixture: ComponentFixture<ProductCard>;

  const product: Product = {
    id: 'product-1',
    title: 'Modern Sofa',
    category: 'Living Rooms',
    mediaUrl: 'https://example.com/sofa.jpg',
    mediaType: 'image',
    featured: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
  });

  it('renders the product details and route links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component).toBeTruthy();
    expect(compiled.textContent).toContain('Modern Sofa');
    expect(compiled.querySelector('a.media-link')?.getAttribute('href')).toBe(
      '/products/product-1',
    );
  });

  it('autoplays product videos muted so browsers allow playback', () => {
    fixture.componentRef.setInput('product', {
      ...product,
      mediaType: 'video',
      mediaUrl: 'https://example.com/sofa.mp4',
    });
    fixture.detectChanges();

    const video = (fixture.nativeElement as HTMLElement).querySelector('video');
    expect(video?.hasAttribute('autoplay')).toBe(true);
    expect(video?.hasAttribute('muted')).toBe(true);
    expect(video?.hasAttribute('loop')).toBe(true);
  });
});
