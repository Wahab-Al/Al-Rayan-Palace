import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../core/config/app-config';
import type { Product } from '../../../shared/models/product';
import type { ProductListResponse } from '../../../shared/models/product-list-response';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${inject(APP_CONFIG).apiBaseUrl}/products`;

  getProducts(
    page = 1,
    limit = 10,
    category = 'all',
    featured: boolean | 'all' = 'all',
  ): Observable<ProductListResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);

    if (category !== 'all') {
      params = params.set('category', category);
    }

    if (featured !== 'all') {
      params = params.set('featured', String(featured));
    }

    return this.http.get<ProductListResponse>(this.apiUrl, { params });
  }

  getProduct(id: string): Observable<{ item: Product }> {
    return this.http.get<{ item: Product }>(`${this.apiUrl}/${id}`);
  }
}
