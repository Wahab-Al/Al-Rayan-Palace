import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withState, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, finalize, pipe, switchMap, tap } from 'rxjs';

import { getApiErrorMessage } from '../../../core/errors/api-error-message';
import { ProductService } from '../services/product';
import type { Product } from '../../../shared/models/product';

interface ProductDetailState {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  activeImageIndex: number;
}

const initialState: ProductDetailState = {
  product: null,
  isLoading: false,
  error: null,
  activeImageIndex: 0,
};

export const ProductDetailStore = signalStore(
  withState(initialState),
  withComputed(({ product }) => ({
    images: computed(() => product()?.images ?? []),
  })),
  withMethods((store, productService = inject(ProductService)) => ({
    loadProduct: rxMethod<string>(
      pipe(
        switchMap((id) => {
          patchState(store, { isLoading: true, error: null, product: null, activeImageIndex: 0 });

          return productService.getProduct(id).pipe(
            tap(({ item }) => {
              const product: Product = {
                ...item,
                images:
                  item.mediaType === 'image'
                    ? item.images?.length
                      ? item.images
                      : [item.mediaUrl]
                    : [],
              };
              patchState(store, { product });
            }),
            catchError((error: unknown) => {
              patchState(store, {
                error: getApiErrorMessage(error, 'Product not found'),
              });
              return EMPTY;
            }),
            finalize(() => patchState(store, { isLoading: false })),
          );
        }),
      ),
    ),
    selectImage(index: number): void {
      const images = store.images();
      if (index >= 0 && index < images.length) {
        patchState(store, { activeImageIndex: index });
      }
    },
    setNotFound(): void {
      patchState(store, { product: null, isLoading: false, error: 'Product not found' });
    },
  })),
);
