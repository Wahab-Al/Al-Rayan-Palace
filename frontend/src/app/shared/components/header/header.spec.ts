import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Header } from './header';
import { AuthStore } from '../../../core/state/auth.store';
import { ThemeStore } from '../../../core/state/theme.store';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([
          { path: '', component: Header },
          { path: 'admin/products', component: Header },
        ]),
        {
          provide: AuthStore,
          useValue: {
            isAuthenticated: signal(false),
            logout: vi.fn(() => of(undefined)),
          },
        },
        {
          provide: ThemeStore,
          useValue: {
            theme: signal('light'),
            toggle: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('navigates home when the brand logo is clicked', async () => {
    await router.navigateByUrl('/admin/products');
    fixture.detectChanges();

    const brand = fixture.nativeElement.querySelector('a.brand') as HTMLAnchorElement;
    expect(brand.querySelector('img.brand-logo')).toBeTruthy();
    expect(brand.getAttribute('href')).toBe('/');

    brand.click();
    await fixture.whenStable();

    expect(router.url).toBe('/');
  });
});
