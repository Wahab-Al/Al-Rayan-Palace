import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Home } from './home';
import { ProductService } from '../../services/product';
import type { ProductListResponse } from '../../models/product-list-response';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

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
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: ProductService, useValue: { getProducts: vi.fn(() => of(response)) } },
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
  });
});
