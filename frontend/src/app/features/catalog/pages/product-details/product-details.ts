import { Component, inject, signal } from '@angular/core';

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

  readonly product = signal<Product | null>(null);

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
        this.product.set(response.item);

        this.loading.set(false);
      },

      error: (error) => {
        this.loading.set(false);

        this.error.set(error?.error?.message ?? 'Product not found');
      },
    });
  }
}
