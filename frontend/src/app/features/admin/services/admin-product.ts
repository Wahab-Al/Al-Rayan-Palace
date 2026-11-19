import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../core/config/app-config';
import type { Product } from '../../../shared/models/product';
import type { ProductListResponse } from '../../../shared/models/product-list-response';

export type AdminMediaTypeFilter = 'all' | 'image' | 'video';
export type AdminFeaturedFilter = 'all' | 'true' | 'false';

export interface AdminProductFilters {
  search?: string;
  category?: string;
  mediaType?: AdminMediaTypeFilter;
  featured?: AdminFeaturedFilter;
}

@Injectable({
  providedIn: 'root',
})
export class AdminProductService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiBaseUrl + '/admin/products';

  getProducts(
    page = 1,
    limit = 20,
    filters: AdminProductFilters = {},
  ): Observable<ProductListResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    const search = filters.search?.trim();

    if (search) {
      params = params.set('search', search);
    }

    if (filters.category && filters.category !== 'all') {
      params = params.set('category', filters.category);
    }

    if (filters.mediaType && filters.mediaType !== 'all') {
      params = params.set('mediaType', filters.mediaType);
    }

    if (filters.featured && filters.featured !== 'all') {
      params = params.set('featured', filters.featured);
    }

    return this.http.get<ProductListResponse>(this.apiUrl, {
      params,
      withCredentials: true,
    });
  }

  getProduct(id: string): Observable<{ item: Product }> {
    return this.http.get<{ item: Product }>(this.apiUrl + '/' + id, {
      withCredentials: true,
    });
  }

  createProduct(formData: FormData): Observable<{ item: Product }> {
    return this.http.post<{ item: Product }>(this.apiUrl, formData, {
      withCredentials: true,
    });
  }

  updateProduct(id: string, formData: FormData): Observable<{ item: Product }> {
    return this.http.patch<{ item: Product }>(this.apiUrl + '/' + id, formData, {
      withCredentials: true,
    });
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(this.apiUrl + '/' + id, {
      withCredentials: true,
    });
  }
}
