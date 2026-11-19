import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withState, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, finalize, pipe, switchMap, tap } from 'rxjs';

import { getApiErrorMessage } from '../../../core/errors/api-error-message';
import { ProductService } from '../services/product';
import type { AllPreview, CategoryPreview } from '../../../shared/models/product-list-response';
import type { Product } from '../../../shared/models/product';

interface CatalogQuery {
  page: number;
  category: string;
}

interface CatalogState {
  products: Product[];
  featuredProducts: Product[];
  categories: CategoryPreview[];
  allPreview: AllPreview | null;
  selectedCategory: string;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  loadError: string | null;
  isFeaturedLoading: boolean;
  featuredError: string | null;
}

const initialState: CatalogState = {
  products: [],
  featuredProducts: [],
  categories: [],
  allPreview: null,
  selectedCategory: 'all',
  currentPage: 1,
  totalPages: 1,
  isLoading: false,
  loadError: null,
  isFeaturedLoading: false,
  featuredError: null,
};

export const CatalogStore = signalStore(
  withState(initialState),
  withComputed(({ products, totalPages }) => ({
    isEmpty: computed(() => products().length === 0),
    hasMultiplePages: computed(() => totalPages() > 1),
  })),
  withMethods((store, productService = inject(ProductService)) => {
    const loadProducts = rxMethod<CatalogQuery>(
      pipe(
        switchMap(({ page, category }) => {
          patchState(store, {
            selectedCategory: category,
            currentPage: page,
            isLoading: true,
            loadError: null,
          });

          return productService.getProducts(page, 12, category).pipe(
            tap((response) =>
              patchState(store, {
                products: response.items,
                categories: response.categoryPreviews,
                allPreview: response.allPreview,
                totalPages: response.pages,
              }),
            ),
            catchError((error: unknown) => {
              patchState(store, {
                loadError: getApiErrorMessage(error, 'Unable to load products. Please try again.'),
              });
              return EMPTY;
            }),
            finalize(() => patchState(store, { isLoading: false })),
          );
        }),
      ),
    );

    const loadFeaturedProducts = rxMethod<void>(
      pipe(
        switchMap(() => {
          patchState(store, { isFeaturedLoading: true, featuredError: null });

          return productService.getProducts(1, 4, 'all', true).pipe(
            tap((response) => patchState(store, { featuredProducts: response.items })),
            catchError((error: unknown) => {
              patchState(store, {
                featuredError: getApiErrorMessage(error, 'Unable to load featured products.'),
              });
              return EMPTY;
            }),
            finalize(() => patchState(store, { isFeaturedLoading: false })),
          );
        }),
      ),
    );

    return { loadProducts, loadFeaturedProducts };
  }),
);
