import { Component, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { ActivatedRoute, Router } from '@angular/router';

import { Hero } from '../../components/hero/hero';
import { CategoryFilter } from '../../components/category-filter/category-filter';
import { ProductCard } from '../../components/product-card/product-card';
import { Pagination } from '../../components/pagination/pagination';

import { ProductService } from '../../services/product';
import { Product } from '../../models/product';
import type { CategoryPreview, AllPreview } from '../../models/product-list-response';

@Component({
  selector: 'app-home',
  imports: [Hero, CategoryFilter, ProductCard, Pagination],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly productService = inject(ProductService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly title = inject(Title);

  private readonly meta = inject(Meta);

  products = signal<Product[]>([]);
  readonly categories = signal<CategoryPreview[]>([]);
  readonly allPreview = signal<AllPreview | null>(null);
  featuredProducts = signal<Product[]>([]);

  selectedCategory = signal('all');
  currentPage = signal(1);
  totalPages = signal(1);

  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.title.setTitle('Al Rayan Palace | Furniture and Interior Decor');
    this.meta.updateTag({
      name: 'description',
      content:
        'Discover furniture, furnishings, and interior decor collections from Al Rayan Palace in Qatar.',
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: 'Al Rayan Palace' });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Furniture, furnishings, and interior decor in Qatar.',
    });

    this.loadFeaturedProducts();

    this.route.queryParams.subscribe((params) => {
      const category = typeof params['category'] === 'string' ? params['category'] : 'all';

      const parsedPage = Number.parseInt(
        typeof params['page'] === 'string' ? params['page'] : '1',
        10,
      );

      const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      this.selectedCategory.set(category);
      this.currentPage.set(page);

      this.loadProducts();
    });
  }

  loadFeaturedProducts(): void {
    this.productService.getProducts(1, 4, 'all', true).subscribe({
      next: (response) => {
        this.featuredProducts.set(response.items);
      },

      error: (error) => {
        console.error('Failed to load featured products', error);
      },
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productService.getProducts(this.currentPage(), 12, this.selectedCategory()).subscribe({
      next: (response) => {
        this.products.set(response.items);

        this.categories.set(response.categoryPreviews);

        this.allPreview.set(response.allPreview);

        this.totalPages.set(response.pages);

        this.loading.set(false);
      },

      error: (error) => {
        console.error('Failed to load products', error);

        this.error.set('Unable to load products. Please try again.');

        this.loading.set(false);
      },
    });
  }

  selectCategory(category: string): void {
    this.router.navigate([], {
      queryParams: {
        category: category === 'all' ? null : category,
        page: 1,
      },
    });
  }

  changePage(page: number): void {
    this.router.navigate([], {
      queryParams: {
        page,
      },
      queryParamsHandling: 'merge',
    });
  }

  onCategoryChange(category: string): void {
    this.currentPage.set(1);
    this.selectedCategory.set(category);

    this.router.navigate([], {
      queryParams: {
        category: category === 'all' ? null : category,
        page: 1,
      },
      queryParamsHandling: 'merge',
    });
  }
}
