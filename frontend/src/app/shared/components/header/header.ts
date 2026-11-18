import { Component, computed, inject, signal } from '@angular/core';

import { NavigationEnd, Router, RouterLink } from '@angular/router';

import { filter } from 'rxjs';

import { AuthService } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  readonly theme = this.themeService.theme;
  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly currentUrl = signal(this.router.url);

  readonly isManagePage = computed(() => this.currentUrl().startsWith('/admin/products'));

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigateByUrl('/');
      },

      error: () => {
        this.authService.clearSession();

        this.router.navigateByUrl('/');
      },
    });
  }
}
