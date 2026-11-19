import { Component, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

import { ActivatedRoute, RouterLink } from '@angular/router';

import { ProductService } from '../../services/product';

import type { Product } from '../../models/product';

@Component({
  selector: 'app-product-details',
  imports: [RouterLink],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);

  private readonly productService = inject(ProductService);

  private readonly title = inject(Title);

  private readonly meta = inject(Meta);

  private readonly document = inject(DOCUMENT);

  readonly product = signal<Product | null>(null);

  readonly activeImageIndex = signal(0);

  readonly linkCopied = signal(false);

  readonly loading = signal(false);

  readonly error = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadProduct(id);
    } else {
      this.error.set('Product not found');
    }
  }

  private loadProduct(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.productService.getProduct(id).subscribe({
      next: (response) => {
        this.product.set({
          ...response.item,
          images:
            response.item.mediaType === 'image'
              ? response.item.images?.length
                ? response.item.images
                : [response.item.mediaUrl]
              : [],
        });
        this.activeImageIndex.set(0);

        const product = response.item;
        const pageTitle = `${product.title} | Al Rayan Palace`;
        const description = (
          product.description || `${product.title} furniture at Al Rayan Palace.`
        )
          .replace(/\s+/g, ' ')
          .slice(0, 160);
        const language = /[\u0600-\u06ff]/.test(`${product.title} ${product.description ?? ''}`)
          ? 'ar'
          : 'en';
        const canonicalUrl = new URL(
          this.document.location?.href || `/products/${id}`,
          this.document.baseURI,
        ).toString();

        this.title.setTitle(pageTitle);
        this.meta.updateTag({ name: 'description', content: description });
        this.meta.updateTag({ property: 'og:type', content: 'product' });
        this.meta.updateTag({ property: 'og:title', content: pageTitle });
        this.meta.updateTag({ property: 'og:description', content: description });
        this.meta.updateTag({ property: 'og:image', content: product.mediaUrl });
        this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
        this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.document.documentElement.lang = language;

        let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonical) {
          canonical = this.document.createElement('link');
          canonical.rel = 'canonical';
          this.document.head.appendChild(canonical);
        }
        canonical.href = canonicalUrl;

        let structuredData = this.document.querySelector<HTMLScriptElement>(
          'script[data-product-jsonld]',
        );
        if (!structuredData) {
          structuredData = this.document.createElement('script');
          structuredData.type = 'application/ld+json';
          structuredData.dataset['productJsonld'] = 'true';
          this.document.head.appendChild(structuredData);
        }
        structuredData.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          description,
          category: product.category,
          image: product.mediaUrl,
          url: canonicalUrl,
          brand: { '@type': 'Brand', name: 'Al Rayan Palace' },
        }).replace(/</g, '\\u003c');

        this.loading.set(false);
      },

      error: (error) => {
        this.loading.set(false);

        this.error.set(error?.error?.message ?? 'Product not found');
      },
    });
  }

  selectImage(index: number): void {
    this.activeImageIndex.set(index);
  }

  async copyProductLink(): Promise<void> {
    const product = this.product();
    if (!product) return;

    const productUrl = new URL(
      `/products/${product.id}`,
      this.document.location?.origin ?? this.document.baseURI,
    );

    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('Clipboard is unavailable');
      await clipboard.writeText(productUrl.toString());
      this.linkCopied.set(true);
    } catch {
      this.error.set('Unable to copy the link. Copy the product page URL from your browser.');
    }
  }
}
