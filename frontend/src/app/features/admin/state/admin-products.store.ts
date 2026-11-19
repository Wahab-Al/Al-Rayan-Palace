import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  catchError,
  exhaustMap,
  finalize,
  map,
  of,
  pipe,
  switchMap,
  tap,
  timer,
} from 'rxjs';

import { getApiErrorMessage } from '../../../core/errors/api-error-message';
import { AdminProductService } from '../services/admin-product';
import type { Product } from '../../../shared/models/product';
import type { AdminFeaturedFilter, AdminMediaTypeFilter } from '../services/admin-product';

interface AdminProductsState {
  products: Product[];
  categories: string[];
  currentProduct: Product | null;
  searchQuery: string;
  selectedCategory: string;
  selectedMediaType: AdminMediaTypeFilter;
  selectedFeatured: AdminFeaturedFilter;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  error: string | null;
}

const initialState: AdminProductsState = {
  products: [],
  categories: [],
  currentProduct: null,
  searchQuery: '',
  selectedCategory: 'all',
  selectedMediaType: 'all',
  selectedFeatured: 'all',
  currentPage: 1,
  totalPages: 1,
  isLoading: false,
  isSaving: false,
  isDeleting: false,
  saveStatus: 'idle',
  error: null,
};

interface SaveProductRequest {
  id: string | null;
  formData: FormData;
}

export const AdminProductsStore = signalStore(
  withState(initialState),
  withComputed(({ totalPages }) => ({
    pageNumbers: computed(() => Array.from({ length: totalPages() }, (_, index) => index + 1)),
  })),
  withMethods((store, productService = inject(AdminProductService)) => {
    const loadProducts = rxMethod<void>(
      pipe(
        switchMap(() => {
          patchState(store, { isLoading: true, error: null });
          return productService
            .getProducts(store.currentPage(), 20, {
              search: store.searchQuery(),
              category: store.selectedCategory(),
              mediaType: store.selectedMediaType(),
              featured: store.selectedFeatured(),
            })
            .pipe(
              tap((response) =>
                patchState(store, {
                  products: response.items,
                  categories: response.categories,
                  totalPages: response.pages,
                }),
              ),
              catchError((error: unknown) => {
                patchState(store, {
                  error: getApiErrorMessage(error, 'Failed to load products.'),
                });
                return EMPTY;
              }),
              finalize(() => patchState(store, { isLoading: false })),
            );
        }),
      ),
    );

    const loadCategories = rxMethod<void>(
      pipe(
        switchMap(() =>
          productService.getProducts(1, 1).pipe(
            tap((response) => patchState(store, { categories: response.categories })),
            catchError((error: unknown) => {
              patchState(store, {
                error: getApiErrorMessage(error, 'Failed to load product categories.'),
              });
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    const loadProduct = rxMethod<string>(
      pipe(
        switchMap((id) => {
          patchState(store, { isLoading: true, error: null, currentProduct: null });
          return productService.getProduct(id).pipe(
            tap(({ item }) => patchState(store, { currentProduct: item })),
            catchError((error: unknown) => {
              patchState(store, {
                error: getApiErrorMessage(error, 'Failed to load product.'),
              });
              return EMPTY;
            }),
            finalize(() => patchState(store, { isLoading: false })),
          );
        }),
      ),
    );

    const saveProduct = rxMethod<SaveProductRequest>(
      pipe(
        exhaustMap(({ id, formData }) => {
          patchState(store, { isSaving: true, saveStatus: 'idle', error: null });
          const request = id
            ? productService.updateProduct(id, formData)
            : productService.createProduct(formData);

          return request.pipe(
            tap(() => patchState(store, { saveStatus: 'success' })),
            catchError((error: unknown) => {
              patchState(store, {
                saveStatus: 'error',
                error: getApiErrorMessage(error, 'Failed to save product.'),
              });
              return EMPTY;
            }),
            finalize(() => patchState(store, { isSaving: false })),
          );
        }),
      ),
    );

    const deleteProduct = rxMethod<string>(
      pipe(
        exhaustMap((id) => {
          patchState(store, { isDeleting: true, error: null });
          return productService.deleteProduct(id).pipe(
            tap(() => {
              if (store.products().length === 1 && store.currentPage() > 1) {
                patchState(store, { currentPage: store.currentPage() - 1 });
              }
              loadProducts();
            }),
            catchError((error: unknown) => {
              patchState(store, {
                error: getApiErrorMessage(error, 'Failed to delete product.'),
              });
              return EMPTY;
            }),
            finalize(() => patchState(store, { isDeleting: false })),
          );
        }),
      ),
    );

    const searchInput = rxMethod<{ value: string; immediate: boolean }>(
      pipe(
        switchMap(({ value, immediate }) =>
          immediate ? of(value) : timer(250).pipe(map(() => value)),
        ),
        tap((searchQuery) => patchState(store, { searchQuery, currentPage: 1 })),
        tap(() => loadProducts()),
      ),
    );

    return {
      loadProducts,
      loadCategories,
      loadProduct,
      saveProduct,
      deleteProduct,
      setSearchQuery(value: string): void {
        patchState(store, { searchQuery: value });
        searchInput({ value, immediate: false });
      },
      applySearch(): void {
        searchInput({ value: store.searchQuery(), immediate: true });
      },
      setCategory(value: string): void {
        patchState(store, { selectedCategory: value || 'all', currentPage: 1 });
        loadProducts();
      },
      setMediaType(value: string): void {
        const mediaType: AdminMediaTypeFilter =
          value === 'image' || value === 'video' ? value : 'all';
        patchState(store, { selectedMediaType: mediaType, currentPage: 1 });
        loadProducts();
      },
      setFeatured(value: string): void {
        const featured: AdminFeaturedFilter = value === 'true' || value === 'false' ? value : 'all';
        patchState(store, { selectedFeatured: featured, currentPage: 1 });
        loadProducts();
      },
      clearFilters(): void {
        patchState(store, {
          searchQuery: '',
          selectedCategory: 'all',
          selectedMediaType: 'all',
          selectedFeatured: 'all',
          currentPage: 1,
        });
        searchInput({ value: '', immediate: true });
      },
      setPage(page: number): void {
        if (page < 1 || page > store.totalPages() || page === store.currentPage()) return;
        patchState(store, { currentPage: page });
        loadProducts();
      },
      resetSaveStatus(): void {
        patchState(store, { saveStatus: 'idle', error: null });
      },
    };
  }),
);
