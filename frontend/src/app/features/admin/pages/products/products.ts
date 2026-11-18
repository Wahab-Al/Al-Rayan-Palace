import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { AdminProductService } from '../../services/admin-product';
import type { Product } from '../../../catalog/models/product';

@Component({
  selector: 'app-admin-products',
  imports: [RouterLink, SlicePipe],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products {
  private readonly productService = inject(AdminProductService);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<string[]>([]);
  readonly searchQuery = signal('');
  readonly selectedCategory = signal('all');
  readonly selectedMediaType = signal<'all' | 'image' | 'video'>('all');
  readonly selectedFeatured = signal<'all' | 'true' | 'false'>('all');
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly productToDelete = signal<Product | null>(null);

  private loadRequestId = 0;
  private lastAppliedSearch = '';
  private readonly searchChanges = new Subject<string>();

  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  constructor() {
    this.searchChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        if (this.searchQuery() !== this.lastAppliedSearch) {
          this.applyFilters();
        }
      });

    this.loadProducts();
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
    this.searchChanges.next(value);
  }

  setCategoryFilter(value: string): void {
    this.selectedCategory.set(value || 'all');
    this.applyFilters();
  }

  setMediaTypeFilter(value: string): void {
    this.selectedMediaType.set(value === 'image' || value === 'video' ? value : 'all');
    this.applyFilters();
  }

  setFeaturedFilter(value: string): void {
    this.selectedFeatured.set(value === 'true' || value === 'false' ? value : 'all');
    this.applyFilters();
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    this.applyFilters();
  }

  applyFilters(): void {
    this.lastAppliedSearch = this.searchQuery();
    this.currentPage.set(1);
    this.loadProducts();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.selectedMediaType.set('all');
    this.selectedFeatured.set('all');
    this.applyFilters();
  }

  loadProducts(): void {
    const requestId = ++this.loadRequestId;
    this.loading.set(true);
    this.error.set(null);

    this.productService
      .getProducts(this.currentPage(), 20, {
        search: this.searchQuery(),
        category: this.selectedCategory(),
        mediaType: this.selectedMediaType(),
        featured: this.selectedFeatured(),
      })
      .subscribe({
        next: (response) => {
          if (requestId !== this.loadRequestId) {
            return;
          }

          this.products.set(response.items);
          this.categories.set(response.categories);
          this.totalPages.set(response.pages);
          this.loading.set(false);
        },
        error: (error) => {
          if (requestId !== this.loadRequestId) {
            return;
          }

          this.loading.set(false);
          this.error.set(error?.error?.message ?? 'Failed to load products');
        },
      });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }

    this.currentPage.set(page);
    this.loadProducts();
  }

  openDeleteModal(product: Product): void {
    this.productToDelete.set(product);
  }

  closeDeleteModal(): void {
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const product = this.productToDelete();

    if (!product) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.productToDelete.set(null);

        if (this.products().length === 1 && this.currentPage() > 1) {
          this.currentPage.update((page) => page - 1);
        }

        this.loadProducts();
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(error?.error?.message ?? 'Failed to delete product');
      },
    });
  }
}