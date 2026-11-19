import { Component, computed, effect, inject, Renderer2, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { Product } from '../../../../shared/models/product';
import { ProductDetailStore } from '../../state/product-detail.store';

@Component({
  selector: 'app-product-details',
  imports: [RouterLink],
  providers: [ProductDetailStore],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);

  private readonly productStore = inject(ProductDetailStore);

  private readonly title = inject(Title);

  private readonly meta = inject(Meta);

  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);

  readonly product = this.productStore.product;
  readonly activeImageIndex = this.productStore.activeImageIndex;
  readonly linkCopied = signal(false);
  private readonly copyError = signal<string | null>(null);
  readonly loading = this.productStore.isLoading;
  readonly error = computed(() => this.copyError() ?? this.productStore.error());

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        if (id) this.productStore.loadProduct(id);
        else this.productStore.setNotFound();
      });

    effect(() => {
      const product = this.product();
      if (product) this.updateMetadata(product);
    });
  }

  selectImage(index: number): void {
    this.productStore.selectImage(index);
  }

  async copyProductLink(): Promise<void> {
    const product = this.product();
    if (!product) return;
    this.copyError.set(null);
    this.linkCopied.set(false);

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
      this.copyError.set('Unable to copy the link. Copy the product page URL from your browser.');
    }
  }

  private updateMetadata(product: Product): void {
    const pageTitle = `${product.title} | Al Rayan Palace`;
    const description = (product.description || `${product.title} furniture at Al Rayan Palace.`)
      .replace(/\s+/g, ' ')
      .slice(0, 160);
    const language = /[\u0600-\u06ff]/.test(`${product.title} ${product.description ?? ''}`)
      ? 'ar'
      : 'en';
    const canonicalUrl = new URL(
      `/products/${encodeURIComponent(product.id)}`,
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
    this.renderer.setAttribute(this.document.documentElement, 'lang', language);

    let canonical = this.document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.renderer.createElement('link');
      this.renderer.setAttribute(canonical, 'rel', 'canonical');
      this.renderer.appendChild(this.document.head, canonical);
    }
    this.renderer.setAttribute(canonical, 'href', canonicalUrl);

    let structuredData = this.document.querySelector('script[data-product-jsonld]');
    if (!structuredData) {
      structuredData = this.renderer.createElement('script');
      this.renderer.setAttribute(structuredData, 'type', 'application/ld+json');
      this.renderer.setAttribute(structuredData, 'data-product-jsonld', 'true');
      this.renderer.appendChild(this.document.head, structuredData);
    }
    this.renderer.setProperty(
      structuredData,
      'textContent',
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description,
        category: product.category,
        image: product.mediaUrl,
        url: canonicalUrl,
        brand: { '@type': 'Brand', name: 'Al Rayan Palace' },
      }).replace(/</g, '\\u003c'),
    );
  }
}
