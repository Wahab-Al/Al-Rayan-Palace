import { Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import type { Product } from '../../../../shared/models/product';
import { AdminProductsStore } from '../../state/admin-products.store';

@Component({
  selector: 'app-admin-products',
  imports: [RouterLink, SlicePipe],
  providers: [AdminProductsStore],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products {
  private readonly productStore = inject(AdminProductsStore);

  readonly products = this.productStore.products;
  readonly categories = this.productStore.categories;
  readonly searchQuery = this.productStore.searchQuery;
  readonly selectedCategory = this.productStore.selectedCategory;
  readonly selectedMediaType = this.productStore.selectedMediaType;
  readonly selectedFeatured = this.productStore.selectedFeatured;
  readonly currentPage = this.productStore.currentPage;
  readonly totalPages = this.productStore.totalPages;
  readonly pageNumbers = this.productStore.pageNumbers;
  readonly loading = this.productStore.isLoading;
  readonly error = this.productStore.error;
  readonly productToDelete = signal<Product | null>(null);

  constructor() {
    this.productStore.loadProducts();
  }

  setSearchQuery(value: string): void {
    this.productStore.setSearchQuery(value);
  }

  setSearchQueryFromEvent(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.setSearchQuery(event.target.value);
    }
  }

  setCategoryFilter(value: string): void {
    this.productStore.setCategory(value);
  }

  setCategoryFilterFromEvent(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.setCategoryFilter(event.target.value);
    }
  }

  setMediaTypeFilter(value: string): void {
    this.productStore.setMediaType(value);
  }

  setMediaTypeFilterFromEvent(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.setMediaTypeFilter(event.target.value);
    }
  }

  setFeaturedFilter(value: string): void {
    this.productStore.setFeatured(value);
  }

  setFeaturedFilterFromEvent(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.setFeaturedFilter(event.target.value);
    }
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    this.productStore.applySearch();
  }

  clearFilters(): void {
    this.productStore.clearFilters();
  }

  changePage(page: number): void {
    this.productStore.setPage(page);
  }

  openDeleteModal(product: Product): void {
    this.productToDelete.set(product);
  }

  closeDeleteModal(): void {
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const product = this.productToDelete();
    if (!product) return;

    this.productStore.deleteProduct(product.id);
    this.productToDelete.set(null);
  }
}
