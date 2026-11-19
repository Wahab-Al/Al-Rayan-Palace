import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NavigationEnd, Router, RouterLink } from '@angular/router';

import { filter } from 'rxjs';

import { AuthStore } from '../../../core/state/auth.store';
import { ThemeStore } from '../../../core/state/theme.store';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authStore = inject(AuthStore);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly themeStore = inject(ThemeStore);

  readonly theme = this.themeStore.theme;
  readonly isAuthenticated = this.authStore.isAuthenticated;

  private readonly currentUrl = signal(this.router.url);

  readonly isManagePage = computed(() => this.currentUrl().startsWith('/admin/products'));

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  toggleTheme(): void {
    this.themeStore.toggle();
  }

  logout(): void {
    this.authStore
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.router.navigateByUrl('/');
      });
  }
}
