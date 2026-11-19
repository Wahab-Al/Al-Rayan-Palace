import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Home } from './home';
import { ProductService } from '../../services/product';
import type { ProductListResponse } from '../../../../shared/models/product-list-response';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let getProducts: ReturnType<typeof vi.fn>;

  const response: ProductListResponse = {
    items: [],
    total: 0,
    page: 1,
    pages: 1,
    categories: [],
    categoryPreviews: [],
    allPreview: null,
  };

  beforeEach(async () => {
    getProducts = vi.fn(() => of(response));
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) },
        },
        { provide: ProductService, useValue: { getProducts } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the catalog and featured products', () => {
    expect(component).toBeTruthy();
    expect(component.products()).toEqual([]);
    expect(component.totalPages()).toBe(1);
    expect(getProducts).toHaveBeenCalledWith(1, 12, 'all');
  });
});
