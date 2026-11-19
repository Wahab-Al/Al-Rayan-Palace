import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';

import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import { Hero } from '../../components/hero/hero';
import { CategoryFilter } from '../../components/category-filter/category-filter';
import { ProductCard } from '../../components/product-card/product-card';
import { Pagination } from '../../components/pagination/pagination';

import { CatalogStore } from '../../state/catalog.store';

@Component({
  selector: 'app-home',
  imports: [Hero, CategoryFilter, ProductCard, Pagination],
  providers: [CatalogStore],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly catalogStore = inject(CatalogStore);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly title = inject(Title);

  private readonly meta = inject(Meta);

  readonly products = this.catalogStore.products;
  readonly categories = this.catalogStore.categories;
  readonly allPreview = this.catalogStore.allPreview;
  readonly featuredProducts = this.catalogStore.featuredProducts;
  readonly selectedCategory = this.catalogStore.selectedCategory;
  readonly currentPage = this.catalogStore.currentPage;
  readonly totalPages = this.catalogStore.totalPages;
  readonly loading = this.catalogStore.isLoading;
  readonly error = this.catalogStore.loadError;

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

    this.catalogStore.loadFeaturedProducts();

    this.route.queryParamMap
      .pipe(
        map((params) => {
          const rawPage = Number.parseInt(params.get('page') ?? '1', 10);
          return {
            category: params.get('category') || 'all',
            page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
          };
        }),
        distinctUntilChanged(
          (previous, current) =>
            previous.page === current.page && previous.category === current.category,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((query) => this.catalogStore.loadProducts(query));
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
    this.router.navigate([], {
      queryParams: {
        category: category === 'all' ? null : category,
        page: 1,
      },
      queryParamsHandling: 'merge',
    });
  }
}
